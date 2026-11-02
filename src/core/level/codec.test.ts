import { describe, expect, it } from 'vitest';
import { EMPTY_INPUT, INPUT_BUTTONS, type InputFrame, type InputRun } from '../types';
import { encodeRuns, expandRuns } from './index';
import { formatRunToken, frameLetters, parseRunToken } from './tokens';

/** Regex copied from docs/tech/level-format.md section 4. */
const DOC_TOKEN_RE = /^[1-9][0-9]*(\.|(?=[LRJ+!-])L?R?J?\+?-?!?)$/;

/** Deterministic generator (mulberry32); the tests never touch Math.random. */
function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function frameFromBits(bits: number): InputFrame {
  const flags = INPUT_BUTTONS.map((_, i) => ((bits >> i) & 1) === 1);
  return {
    left: flags[0] ?? false,
    right: flags[1] ?? false,
    jump: flags[2] ?? false,
    shiftUp: flags[3] ?? false,
    shiftDown: flags[4] ?? false,
    restart: flags[5] ?? false,
  };
}

/** A log made of random-length stretches of random frames: many merges, some singletons. */
function randomLog(rng: () => number, maxStretches: number): InputFrame[] {
  const frames: InputFrame[] = [];
  const stretches = Math.floor(rng() * maxStretches);
  for (let i = 0; i < stretches; i++) {
    const frame = frameFromBits(Math.floor(rng() * 64));
    const length = 1 + Math.floor(rng() * (rng() < 0.2 ? 120 : 5));
    for (let k = 0; k < length; k++) frames.push(frame);
  }
  return frames;
}

const R: InputFrame = { ...EMPTY_INPUT, right: true };
const RJ: InputFrame = { ...EMPTY_INPUT, right: true, jump: true };
const SHIFT_UP: InputFrame = { ...EMPTY_INPUT, right: true, shiftUp: true };

describe('encodeRuns', () => {
  it('returns no runs for no frames', () => {
    expect(encodeRuns([])).toEqual([]);
  });

  it('merges adjacent identical frames into one run', () => {
    expect(encodeRuns([R, R, R])).toEqual([{ count: 3, frame: R }]);
  });

  it('keeps different frames apart and non-adjacent repeats separate', () => {
    expect(encodeRuns([R, SHIFT_UP, R, R, EMPTY_INPUT])).toEqual([
      { count: 1, frame: R },
      { count: 1, frame: SHIFT_UP },
      { count: 2, frame: R },
      { count: 1, frame: EMPTY_INPUT },
    ]);
  });

  it('treats frames equal by value, not by reference', () => {
    expect(encodeRuns([{ ...R }, { ...R }])).toEqual([{ count: 2, frame: R }]);
  });

  it('copies only the six buttons into the run frames', () => {
    const extra = { ...R, note: 'recorder extra' } as InputFrame;
    const [run] = encodeRuns([extra]);
    expect(Object.keys(run?.frame ?? {}).sort()).toEqual([...INPUT_BUTTONS].sort());
  });

  it('does not mutate its input', () => {
    const frames = [R, R, RJ];
    const copy = [...frames];
    encodeRuns(frames);
    expect(frames).toEqual(copy);
  });
});

describe('expandRuns', () => {
  it('returns no frames for no runs', () => {
    expect(expandRuns([])).toEqual([]);
  });

  it('repeats each run frame count times', () => {
    expect(expandRuns([{ count: 2, frame: R }, { count: 1, frame: RJ }])).toEqual([R, R, RJ]);
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])('rejects the invalid count %s', (count) => {
    expect(() => expandRuns([{ count, frame: R }])).toThrow(RangeError);
  });
});

describe('encodeRuns / expandRuns round trip', () => {
  it('round-trips 300 generated input logs and always emits canonical runs', () => {
    const rng = makeRng(20261102);
    for (let n = 0; n < 300; n++) {
      const log = randomLog(rng, 40);
      const runs = encodeRuns(log);
      expect(expandRuns(runs)).toEqual(log);
      expect(runs.reduce((sum, r) => sum + r.count, 0)).toBe(log.length);
      for (let i = 1; i < runs.length; i++) {
        expect(frameLetters(runs[i]?.frame ?? EMPTY_INPUT)).not.toBe(frameLetters(runs[i - 1]?.frame ?? EMPTY_INPUT));
      }
      expect(encodeRuns(expandRuns(runs))).toEqual(runs);
    }
  });

  it('round-trips every one of the 64 button combinations', () => {
    const all = Array.from({ length: 64 }, (_, bits) => frameFromBits(bits));
    expect(expandRuns(encodeRuns(all))).toEqual(all);
    expect(encodeRuns(all)).toHaveLength(64);
  });
});

describe('frameLetters / formatRunToken', () => {
  it('writes . for nothing held and canonical letter order otherwise', () => {
    expect(frameLetters(EMPTY_INPUT)).toBe('.');
    expect(frameLetters(R)).toBe('R');
    expect(frameLetters(frameFromBits(63))).toBe('LRJ+-!');
    expect(frameLetters({ ...EMPTY_INPUT, restart: true, shiftUp: true, left: true })).toBe('L+!');
  });

  it('formats count then buttons', () => {
    expect(formatRunToken({ count: 40, frame: R })).toBe('40R');
    expect(formatRunToken({ count: 1, frame: SHIFT_UP })).toBe('1R+');
    expect(formatRunToken({ count: 30, frame: EMPTY_INPUT })).toBe('30.');
  });
});

describe('parseRunToken', () => {
  const run = (token: string): InputRun | string => {
    const r = parseRunToken(token);
    return r.ok ? r.run : r.message;
  };

  it('parses the documented examples', () => {
    expect(run('1R+')).toEqual({ count: 1, frame: SHIFT_UP });
    expect(run('40R')).toEqual({ count: 40, frame: R });
    expect(run('30.')).toEqual({ count: 30, frame: EMPTY_INPUT });
    expect(run('2LJ')).toEqual({ count: 2, frame: { ...EMPTY_INPUT, left: true, jump: true } });
    expect(run('1!')).toEqual({ count: 1, frame: { ...EMPTY_INPUT, restart: true } });
    expect(run('7LRJ+-!')).toEqual({ count: 7, frame: frameFromBits(63) });
  });

  it('accepts multi-digit counts', () => {
    expect(run('359R')).toEqual({ count: 359, frame: R });
  });

  it.each([
    ['R', "malformed run token 'R': start with a step count, for example '30R'"],
    ['', "malformed run token '': start with a step count, for example '30R'"],
    ['0R', "malformed run token '0R': the count must be a positive integer without leading zeros"],
    ['05R', "malformed run token '05R': the count must be a positive integer without leading zeros"],
    ['5', "malformed run token '5': add the buttons held (L R J + - !) or '.' for nothing held"],
    ['3.R', "malformed run token '3.R': '.' means nothing held and cannot be combined with buttons"],
    ['2R.', "malformed run token '2R.': '.' means nothing held and cannot be combined with buttons"],
    ['3X', "malformed run token '3X': unknown button 'X' (use L R J + - ! or '.')"],
    ['3r', "malformed run token '3r': unknown button 'r' (use L R J + - ! or '.')"],
    ['3RL', "malformed run token '3RL': buttons must appear at most once, in the order L R J + - !"],
    ['1++', "malformed run token '1++': buttons must appear at most once, in the order L R J + - !"],
    ['1!R', "malformed run token '1!R': buttons must appear at most once, in the order L R J + - !"],
    ['1!!', "malformed run token '1!!': buttons must appear at most once, in the order L R J + - !"],
    ['99999999R', 'run token \'99999999R\': count 99999999 is too large (a solution has at most 1000000 steps)'],
  ])('rejects %j with a clear message', (token, message) => {
    expect(run(token)).toBe(message);
  });

  it('agrees with the regex in the format doc on 20000 generated strings', () => {
    const rng = makeRng(7);
    const alphabet = '0123456789123456789.LRJ+-!!xr ';
    for (let n = 0; n < 20000; n++) {
      const length = 1 + Math.floor(rng() * 7);
      let token = '';
      for (let i = 0; i < length; i++) token += alphabet[Math.floor(rng() * alphabet.length)] ?? '';
      const parsed = parseRunToken(token);
      const bounded = !DOC_TOKEN_RE.test(token) || Number.parseInt(token, 10) <= 1_000_000;
      if (bounded) expect(parsed.ok, `token ${JSON.stringify(token)}`).toBe(DOC_TOKEN_RE.test(token));
    }
  });

  it('formats then parses back every generated run', () => {
    const rng = makeRng(99);
    for (let n = 0; n < 500; n++) {
      const r: InputRun = { count: 1 + Math.floor(rng() * 5000), frame: frameFromBits(Math.floor(rng() * 64)) };
      expect(parseRunToken(formatRunToken(r))).toEqual({ ok: true, run: r });
    }
  });
});
