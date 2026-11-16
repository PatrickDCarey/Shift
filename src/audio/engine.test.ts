import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  MAX_VOICES,
  createAudioEngine,
  type AudioContextLike,
  type AudioEngine,
} from './engine';

// ---- Minimal mocked Web Audio graph (no real audio in Vitest) ----

class MockParam {
  value: number;
  targets: number[] = [];
  constructor(initial: number) {
    this.value = initial;
  }
  setValueAtTime(v: number): void {
    this.value = v;
    this.targets.push(v);
  }
  setTargetAtTime(v: number): void {
    this.value = v;
    this.targets.push(v);
  }
  linearRampToValueAtTime(v: number): void {
    this.value = v;
  }
  exponentialRampToValueAtTime(v: number): void {
    this.value = v;
  }
  cancelScheduledValues(): void {}
}

class MockNode {
  connections: MockNode[] = [];
  disconnected = false;
  connect(n: MockNode): MockNode {
    this.connections.push(n);
    return n;
  }
  disconnect(): void {
    this.disconnected = true;
  }
}

class MockGain extends MockNode {
  gain = new MockParam(1);
}

class MockOsc extends MockNode {
  type = 'sine';
  frequency = new MockParam(440);
  started: number | null = null;
  stopped: number | null = null;
  onended: (() => void) | null = null;
  start(t?: number): void {
    this.started = t ?? 0;
  }
  stop(t?: number): void {
    this.stopped = t ?? 0;
  }
  end(): void {
    this.onended?.();
  }
}

class MockContext {
  state: string = 'suspended';
  onstatechange: (() => void) | null = null;
  /** Change state the way a browser does, firing `onstatechange` after it. */
  setState(state: string, fire = true): void {
    this.state = state;
    if (fire) this.onstatechange?.();
  }
  currentTime = 0;
  destination = new MockNode();
  gains: MockGain[] = [];
  oscs: MockOsc[] = [];
  resumeCalls = 0;
  resumeImpl: () => Promise<void> = () => {
    this.state = 'running';
    return Promise.resolve();
  };
  resume(): Promise<void> {
    this.resumeCalls += 1;
    return this.resumeImpl();
  }
  close(): Promise<void> {
    this.state = 'closed';
    return Promise.resolve();
  }
  createGain(): MockGain {
    const g = new MockGain();
    this.gains.push(g);
    return g;
  }
  createOscillator(): MockOsc {
    const o = new MockOsc();
    this.oscs.push(o);
    return o;
  }
}

function setup(): { engine: AudioEngine; ctx: MockContext; factory: ReturnType<typeof vi.fn> } {
  const ctx = new MockContext();
  const factory = vi.fn(() => ctx as unknown as AudioContextLike);
  const engine = createAudioEngine({ contextFactory: factory });
  return { engine, ctx, factory };
}

// Gains are created in order: master, music, sfx.
const MASTER = 0;
const MUSIC = 1;
const SFX = 2;

describe('audio engine: before a gesture', () => {
  it('does not create a context on construction or on any call', () => {
    const { engine, factory } = setup();
    expect(() => {
      engine.setMasterVolume(0.5);
      engine.setMusicVolume(0.5);
      engine.setSfxVolume(0.5);
      engine.setMuted(true);
      engine.setMuted(false);
      engine.tone({ freq: 440, duration: 0.1 });
    }).not.toThrow();
    expect(factory).not.toHaveBeenCalled();
    expect(engine.state).toBe('locked');
    expect(engine.getBuses()).toBeNull();
  });

  it('tone() returns false and plays nothing', () => {
    const { engine, ctx } = setup();
    expect(engine.tone({ freq: 440, duration: 0.1 })).toBe(false);
    expect(ctx.oscs).toHaveLength(0);
  });
});

describe('audio engine: unlock', () => {
  it('creates the context lazily and resumes it', async () => {
    const { engine, ctx, factory } = setup();
    await engine.unlock();
    expect(factory).toHaveBeenCalledTimes(1);
    expect(ctx.resumeCalls).toBe(1);
    expect(engine.state).toBe('running');
    expect(engine.getBuses()).not.toBeNull();
  });

  it('builds master -> destination and music/sfx -> master', async () => {
    const { engine, ctx } = setup();
    await engine.unlock();
    const [master, music, sfx] = ctx.gains;
    expect(master?.connections).toEqual([ctx.destination]);
    expect(music?.connections).toEqual([master]);
    expect(sfx?.connections).toEqual([master]);
  });

  it('reuses the same context on repeated unlocks', async () => {
    const { engine, factory } = setup();
    await engine.unlock();
    await engine.unlock();
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('resumes a context that was suspended again (tab switch)', async () => {
    const { engine, ctx } = setup();
    await engine.unlock();
    ctx.state = 'suspended';
    await engine.unlock();
    expect(ctx.resumeCalls).toBe(2);
    expect(engine.state).toBe('running');
  });

  it('stays locked, without throwing, when resume() rejects', async () => {
    const { engine, ctx } = setup();
    ctx.resumeImpl = () => Promise.reject(new Error('NotAllowedError'));
    await expect(engine.unlock()).resolves.toBeUndefined();
    expect(engine.state).toBe('locked');
  });

  it('stays locked when resume() resolves but the context is still suspended', async () => {
    const { engine, ctx } = setup();
    ctx.resumeImpl = () => Promise.resolve();
    await engine.unlock();
    expect(engine.state).toBe('locked');
    expect(engine.tone({ freq: 440, duration: 0.1 })).toBe(false);
  });

  it('treats resume() throwing synchronously as locked', async () => {
    const { engine, ctx } = setup();
    ctx.resumeImpl = () => {
      throw new Error('boom');
    };
    await expect(engine.unlock()).resolves.toBeUndefined();
    expect(engine.state).toBe('locked');
  });
});

describe('audio engine: Web Audio missing or failing', () => {
  it('is unsupported when the factory returns null; nothing throws', async () => {
    const engine = createAudioEngine({ contextFactory: () => null });
    await expect(engine.unlock()).resolves.toBeUndefined();
    expect(engine.state).toBe('unsupported');
    expect(() => {
      engine.setMuted(true);
      engine.setMusicVolume(1);
      engine.setSfxVolume(1);
    }).not.toThrow();
    expect(engine.tone({ freq: 440, duration: 0.1 })).toBe(false);
    expect(engine.getBuses()).toBeNull();
  });

  it('is unsupported when the factory throws', async () => {
    const engine = createAudioEngine({
      contextFactory: () => {
        throw new Error('no audio device');
      },
    });
    await expect(engine.unlock()).resolves.toBeUndefined();
    expect(engine.state).toBe('unsupported');
  });

  it('is unsupported with the default factory when globals are absent', async () => {
    const engine = createAudioEngine();
    await expect(engine.unlock()).resolves.toBeUndefined();
    expect(engine.state).toBe('unsupported');
  });

  it('does not retry a context that failed to build', async () => {
    const factory = vi.fn(() => null);
    const engine = createAudioEngine({ contextFactory: factory });
    await engine.unlock();
    await engine.unlock();
    expect(factory).toHaveBeenCalledTimes(1);
  });
});

describe('audio engine: volume and mute', () => {
  it('applies volumes stored before the gesture once the context exists', async () => {
    const { engine, ctx } = setup();
    engine.setMasterVolume(0.5);
    engine.setMusicVolume(0.25);
    engine.setSfxVolume(0.75);
    await engine.unlock();
    expect(ctx.gains[MASTER]?.gain.value).toBeCloseTo(0.5);
    expect(ctx.gains[MUSIC]?.gain.value).toBeCloseTo(0.25);
    expect(ctx.gains[SFX]?.gain.value).toBeCloseTo(0.75);
  });

  it('updates bus gains live after unlock', async () => {
    const { engine, ctx } = setup();
    await engine.unlock();
    engine.setMusicVolume(0.1);
    engine.setSfxVolume(0.9);
    engine.setMasterVolume(0.4);
    expect(ctx.gains[MUSIC]?.gain.value).toBeCloseTo(0.1);
    expect(ctx.gains[SFX]?.gain.value).toBeCloseTo(0.9);
    expect(ctx.gains[MASTER]?.gain.value).toBeCloseTo(0.4);
  });

  it('clamps to 0..1 and ignores NaN and non-numbers', async () => {
    const { engine, ctx } = setup();
    await engine.unlock();
    engine.setSfxVolume(5);
    expect(ctx.gains[SFX]?.gain.value).toBe(1);
    engine.setSfxVolume(-3);
    expect(ctx.gains[SFX]?.gain.value).toBe(0);
    engine.setSfxVolume(0.6);
    engine.setSfxVolume(Number.NaN);
    engine.setSfxVolume(Number.POSITIVE_INFINITY);
    engine.setSfxVolume('loud' as unknown as number);
    expect(ctx.gains[SFX]?.gain.value).toBeCloseTo(0.6);
    expect(engine.getSettings().sfx).toBeCloseTo(0.6);
  });

  it('mute silences the master bus and unmute restores it', async () => {
    const { engine, ctx } = setup();
    engine.setMasterVolume(0.8);
    await engine.unlock();
    engine.setMuted(true);
    expect(ctx.gains[MASTER]?.gain.value).toBe(0);
    expect(engine.getSettings().muted).toBe(true);
    engine.setMuted(false);
    expect(ctx.gains[MASTER]?.gain.value).toBeCloseTo(0.8);
  });

  it('mute set before the gesture is honoured at creation', async () => {
    const { engine, ctx } = setup();
    engine.setMuted(true);
    await engine.unlock();
    expect(ctx.gains[MASTER]?.gain.value).toBe(0);
  });

  it('volume changes while muted do not unmute', async () => {
    const { engine, ctx } = setup();
    await engine.unlock();
    engine.setMuted(true);
    engine.setMasterVolume(1);
    expect(ctx.gains[MASTER]?.gain.value).toBe(0);
  });

  it('applySettings maps the save settings shape, muted optional', async () => {
    const { engine, ctx } = setup();
    await engine.unlock();
    engine.applySettings({ musicVolume: 0.3, sfxVolume: 0.6 });
    expect(ctx.gains[MUSIC]?.gain.value).toBeCloseTo(0.3);
    expect(ctx.gains[SFX]?.gain.value).toBeCloseTo(0.6);
    expect(engine.getSettings().muted).toBe(false);
    engine.applySettings({ musicVolume: 0.3, sfxVolume: 0.6, muted: true });
    expect(ctx.gains[MASTER]?.gain.value).toBe(0);
  });

  it('getSettings returns defaults with no calls', () => {
    const { engine } = setup();
    const s = engine.getSettings();
    expect(s.muted).toBe(false);
    expect(s.master).toBeGreaterThan(0);
    expect(s.music).toBeGreaterThan(0);
    expect(s.sfx).toBeGreaterThan(0);
  });
});

describe('audio engine: tone helper', () => {
  async function running(): Promise<{ engine: AudioEngine; ctx: MockContext }> {
    const s = setup();
    await s.engine.unlock();
    return s;
  }

  it('plays an oscillator through the sfx bus by default', async () => {
    const { engine, ctx } = await running();
    expect(engine.tone({ freq: 440, duration: 0.1, type: 'square' })).toBe(true);
    const osc = ctx.oscs[0];
    expect(osc?.type).toBe('square');
    expect(osc?.frequency.value).toBe(440);
    expect(osc?.started).not.toBeNull();
    expect(osc?.stopped).toBeGreaterThan(osc?.started ?? 0);
    // osc -> envelope gain -> sfx bus
    const env = osc?.connections[0] as MockGain;
    expect(env.connections).toEqual([ctx.gains[SFX]]);
  });

  it('can target the music bus', async () => {
    const { engine, ctx } = await running();
    engine.tone({ freq: 220, duration: 0.2, bus: 'music' });
    const env = ctx.oscs[0]?.connections[0] as MockGain;
    expect(env.connections).toEqual([ctx.gains[MUSIC]]);
  });

  it('glides to endFreq when given', async () => {
    const { engine, ctx } = await running();
    engine.tone({ freq: 800, endFreq: 200, duration: 0.1 });
    expect(ctx.oscs[0]?.frequency.value).toBe(200);
  });

  it('schedules with a delay', async () => {
    const { engine, ctx } = await running();
    ctx.currentTime = 1;
    engine.tone({ freq: 440, duration: 0.1, delay: 0.5 });
    expect(ctx.oscs[0]?.started).toBeCloseTo(1.5);
  });

  it('rejects bad input without throwing or playing', async () => {
    const { engine, ctx } = await running();
    expect(engine.tone({ freq: Number.NaN, duration: 0.1 })).toBe(false);
    expect(engine.tone({ freq: -5, duration: 0.1 })).toBe(false);
    expect(engine.tone({ freq: 440, duration: 0 })).toBe(false);
    expect(engine.tone({ freq: 440, duration: Number.NaN })).toBe(false);
    expect(ctx.oscs).toHaveLength(0);
  });

  it('caps very long durations', async () => {
    const { engine, ctx } = await running();
    engine.tone({ freq: 440, duration: 999 });
    const osc = ctx.oscs[0];
    expect((osc?.stopped ?? 0) - (osc?.started ?? 0)).toBeLessThan(10);
  });

  it('skips scheduling while muted or when the bus is at zero', async () => {
    const { engine, ctx } = await running();
    engine.setMuted(true);
    expect(engine.tone({ freq: 440, duration: 0.1 })).toBe(false);
    engine.setMuted(false);
    engine.setSfxVolume(0);
    expect(engine.tone({ freq: 440, duration: 0.1 })).toBe(false);
    expect(ctx.oscs).toHaveLength(0);
  });

  it('disconnects nodes when the voice ends and frees the voice slot', async () => {
    const { engine, ctx } = await running();
    engine.tone({ freq: 440, duration: 0.1 });
    const osc = ctx.oscs[0] as MockOsc;
    expect(engine.activeVoices()).toBe(1);
    osc.end();
    expect(osc.disconnected).toBe(true);
    expect(engine.activeVoices()).toBe(0);
  });

  it('limits concurrent voices', async () => {
    const { engine, ctx } = await running();
    for (let i = 0; i < MAX_VOICES; i += 1) {
      expect(engine.tone({ freq: 300 + i, duration: 1 })).toBe(true);
    }
    // At the cap a new SFX voice steals the oldest SFX voice instead of failing.
    expect(engine.tone({ freq: 999, duration: 1 })).toBe(true);
    expect(engine.activeVoices()).toBe(MAX_VOICES);
    expect(ctx.oscs[0]?.disconnected).toBe(true);
    expect(ctx.oscs[0]?.stopped).toBe(0);
    ctx.oscs[1]?.end();
    expect(engine.activeVoices()).toBe(MAX_VOICES - 1);
  });

  it('never steals a music voice and never exceeds the cap', async () => {
    const { engine, ctx } = await running();
    for (let i = 0; i < MAX_VOICES; i += 1) {
      expect(engine.tone({ freq: 300 + i, duration: 1, bus: 'music' })).toBe(true);
    }
    expect(engine.tone({ freq: 999, duration: 1 })).toBe(false);
    expect(engine.tone({ freq: 999, duration: 1, bus: 'music' })).toBe(false);
    expect(ctx.oscs.every((o) => !o.disconnected)).toBe(true);
    expect(engine.activeVoices()).toBe(MAX_VOICES);
  });

  it('30 SFX in one frame stay within the cap', async () => {
    const { engine, ctx } = await running();
    for (let i = 0; i < 30; i += 1) engine.tone({ freq: 300 + i, duration: 1 });
    expect(engine.activeVoices()).toBe(MAX_VOICES);
    expect(ctx.oscs.filter((o) => o.disconnected)).toHaveLength(6);
  });

  it('swallows errors thrown by the graph', async () => {
    const { engine, ctx } = await running();
    ctx.createOscillator = () => {
      throw new Error('graph exploded');
    };
    expect(() => engine.tone({ freq: 440, duration: 0.1 })).not.toThrow();
    expect(engine.tone({ freq: 440, duration: 0.1 })).toBe(false);
  });
});

describe('audio engine: gesture listeners', () => {
  class FakeTarget {
    handlers = new Map<string, Set<() => void>>();
    addEventListener(type: string, fn: () => void): void {
      const set = this.handlers.get(type) ?? new Set();
      set.add(fn);
      this.handlers.set(type, set);
    }
    removeEventListener(type: string, fn: () => void): void {
      this.handlers.get(type)?.delete(fn);
    }
    fire(type: string): void {
      for (const fn of [...(this.handlers.get(type) ?? [])]) fn();
    }
    count(): number {
      let n = 0;
      for (const s of this.handlers.values()) n += s.size;
      return n;
    }
  }

  const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

  afterEach(() => vi.restoreAllMocks());

  it('unlocks on the first key press and removes its listeners once running', async () => {
    const { engine, factory } = setup();
    const target = new FakeTarget();
    engine.installGestureUnlock(target);
    expect(target.count()).toBeGreaterThan(0);
    expect(factory).not.toHaveBeenCalled();

    target.fire('keydown');
    await flush();
    expect(factory).toHaveBeenCalledTimes(1);
    expect(engine.state).toBe('running');
    expect(target.count()).toBe(0);
  });

  it('unlocks on pointerdown too', async () => {
    const { engine } = setup();
    const target = new FakeTarget();
    engine.installGestureUnlock(target);
    target.fire('pointerdown');
    await flush();
    expect(engine.state).toBe('running');
  });

  it('keeps listening when the first gesture did not unlock (e.g. a bare Shift key)', async () => {
    const { engine, ctx } = setup();
    ctx.resumeImpl = () => Promise.resolve(); // stays suspended
    const target = new FakeTarget();
    engine.installGestureUnlock(target);
    target.fire('keydown');
    await flush();
    expect(engine.state).toBe('locked');
    expect(target.count()).toBeGreaterThan(0);

    ctx.resumeImpl = () => {
      ctx.state = 'running';
      return Promise.resolve();
    };
    target.fire('pointerdown');
    await flush();
    expect(engine.state).toBe('running');
    expect(target.count()).toBe(0);
  });

  it('returns a disposer that removes the listeners', () => {
    const { engine } = setup();
    const target = new FakeTarget();
    const dispose = engine.installGestureUnlock(target);
    dispose();
    expect(target.count()).toBe(0);
  });

  it('is a safe no-op with no target available', () => {
    const { engine } = setup();
    expect(() => engine.installGestureUnlock(null)()).not.toThrow();
    // node has no window/document: the default target resolves to nothing
    expect(() => engine.installGestureUnlock()()).not.toThrow();
  });

  it('does not install listeners when audio is unsupported', async () => {
    const engine = createAudioEngine({ contextFactory: () => null });
    const target = new FakeTarget();
    engine.installGestureUnlock(target);
    target.fire('keydown');
    await flush();
    expect(engine.state).toBe('unsupported');
    expect(target.count()).toBe(0);
  });
});

describe('audio engine: dispose', () => {
  it('closes the context and goes inert', async () => {
    const { engine, ctx } = setup();
    await engine.unlock();
    engine.dispose();
    expect(ctx.state).toBe('closed');
    expect(engine.tone({ freq: 440, duration: 0.1 })).toBe(false);
    expect(() => engine.setMuted(true)).not.toThrow();
  });
});

describe('audio engine: voice counters reset when the context leaves running (B10)', () => {
  async function playing(count: number) {
    const { engine, ctx } = setup();
    await engine.unlock();
    for (let i = 0; i < count; i += 1) engine.tone({ freq: 440 + i, duration: 1 });
    expect(engine.activeVoices()).toBe(count);
    return { engine, ctx };
  }

  it('onstatechange to suspended clears the voice counter and stops tracked SFX voices', async () => {
    const { engine, ctx } = await playing(5);
    ctx.setState('suspended');
    expect(engine.activeVoices()).toBe(0);
    expect(ctx.oscs.every((o) => o.stopped !== null)).toBe(true);
  });

  it('onstatechange to interrupted also clears', async () => {
    const { engine, ctx } = await playing(3);
    ctx.setState('interrupted');
    expect(engine.activeVoices()).toBe(0);
  });

  it('onstatechange to running keeps live voices', async () => {
    const { engine, ctx } = await playing(2);
    ctx.setState('running');
    expect(engine.activeVoices()).toBe(2);
  });

  it('a stale onended after the reset cannot drive the counter negative', async () => {
    const { engine, ctx } = await playing(2);
    const first = ctx.oscs[0]!;
    ctx.setState('suspended');
    first.onended?.();
    expect(engine.activeVoices()).toBe(0);
  });

  it('a context that never fires onstatechange is caught by the tone() check', async () => {
    const { engine, ctx } = await playing(4);
    ctx.setState('suspended', false);
    expect(engine.activeVoices()).toBe(4);
    expect(engine.tone({ freq: 440, duration: 0.1 })).toBe(false);
    expect(engine.activeVoices()).toBe(0);
  });

  it('after resume the full voice budget is available again', async () => {
    const { engine, ctx } = await playing(MAX_VOICES);
    ctx.setState('suspended');
    ctx.setState('running');
    for (let i = 0; i < MAX_VOICES; i += 1) expect(engine.tone({ freq: 300 + i, duration: 1 })).toBe(true);
    expect(engine.activeVoices()).toBe(MAX_VOICES);
  });

  it('a context that rejects the hook still resets through tone()', async () => {
    const ctx = new MockContext();
    Object.defineProperty(ctx, 'onstatechange', {
      set() {
        throw new Error('frozen');
      },
      get: () => null,
    });
    const engine = createAudioEngine({ contextFactory: () => ctx as unknown as AudioContextLike });
    await engine.unlock();
    engine.tone({ freq: 440, duration: 1 });
    ctx.state = 'suspended';
    expect(engine.tone({ freq: 440, duration: 1 })).toBe(false);
    expect(engine.activeVoices()).toBe(0);
  });
});
