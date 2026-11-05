// Mocked Web Audio graph for audio tests (no real audio in Vitest). Test-only.
import { createAudioEngine, type AudioContextLike, type AudioEngine } from './engine';

export class MockParam {
  value: number;
  sets: number[] = [];
  ramps: number[] = [];
  /** Every ramp as (target, end time), linear or exponential, in call order. */
  rampLog: { value: number; time: number }[] = [];
  constructor(initial: number) {
    this.value = initial;
  }
  setValueAtTime(v: number): void {
    this.value = v;
    this.sets.push(v);
  }
  setTargetAtTime(v: number): void {
    this.value = v;
  }
  linearRampToValueAtTime(v: number, t = 0): void {
    this.value = v;
    this.rampLog.push({ value: v, time: t });
  }
  exponentialRampToValueAtTime(v: number, t = 0): void {
    this.value = v;
    this.ramps.push(v);
    this.rampLog.push({ value: v, time: t });
  }
  cancelScheduledValues(): void {}
}

export class MockNode {
  connect(n: MockNode): MockNode {
    return n;
  }
  disconnect(): void {}
}

export class MockGain extends MockNode {
  gain = new MockParam(1);
}

export class MockFilter extends MockNode {
  type = 'lowpass';
  frequency = new MockParam(350);
  Q = new MockParam(1);
}

export class MockOsc extends MockNode {
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
}

export class MockContext {
  state = 'suspended';
  currentTime = 0;
  destination = new MockNode();
  oscs: MockOsc[] = [];
  gains: MockGain[] = [];
  filters: MockFilter[] = [];
  resume(): Promise<void> {
    this.state = 'running';
    return Promise.resolve();
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
  createBiquadFilter(): MockFilter {
    const f = new MockFilter();
    this.filters.push(f);
    return f;
  }
  createOscillator(): MockOsc {
    const o = new MockOsc();
    this.oscs.push(o);
    return o;
  }
}

export function setupEngine(): { engine: AudioEngine; ctx: MockContext } {
  const ctx = new MockContext();
  const engine = createAudioEngine({ contextFactory: () => ctx as unknown as AudioContextLike });
  return { engine, ctx };
}
