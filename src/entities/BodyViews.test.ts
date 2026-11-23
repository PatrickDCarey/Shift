import { describe, expect, it } from 'vitest';
import { bodyCentres, cameraBodies, snapBodies } from './BodyViews';

const at = (x: number, y: number, home = false) => ({ x, y, home });
const state = (twin: ReturnType<typeof at> | null) => ({ player: at(2, 3, true), twin }) as never;

describe('snapBodies', () => {
  it('rounds the runner feet to whole pixels and reports no twin in a single-runner level', () => {
    const s = state(null);
    expect(snapBodies(s, s, 1, 16)).toEqual({ runner: { px: 32, py: 48 }, twin: null });
  });
  it('snaps the twin too when the level has one', () => {
    const s = state(at(5.04, 1, false));
    expect(snapBodies(s, s, 1, 16).twin).toEqual({ px: 81, py: 16 });
  });
});

describe('cameraBodies', () => {
  const snapped = { runner: { px: 1, py: 2 }, twin: { px: 3, py: 4 } };
  it('follows the runner alone without a twin state', () => {
    expect(cameraBodies({ ...snapped, twin: null }, state(null))).toEqual([{ px: 1, py: 2, home: true }]);
  });
  it('adds the twin with its own home flag', () => {
    expect(cameraBodies(snapped, state(at(0, 0, true)))).toEqual([
      { px: 1, py: 2, home: true },
      { px: 3, py: 4, home: true },
    ]);
  });
});

describe('bodyCentres', () => {
  it('lifts each centre half a body above the feet', () => {
    expect(bodyCentres({ runner: { px: 10, py: 40 }, twin: { px: 20, py: 30 } }, 20)).toEqual({
      runner: { x: 10, y: 30 },
      twin: { x: 20, y: 20 },
    });
  });
  it('has no twin centre without a twin', () => {
    expect(bodyCentres({ runner: { px: 0, py: 0 }, twin: null }, 8).twin).toBeNull();
  });
});
