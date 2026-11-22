import { describe, expect, it } from 'vitest';
import { parkedFlags } from './GearMeters';

const body = (home: boolean) => ({ home }) as never;

describe('parkedFlags', () => {
  it('flags the runner when it is home, independent of the twin', () => {
    expect(parkedFlags({ player: body(true), twin: body(false) })).toEqual({ runner: true, twin: false });
  });
  it('flags the twin when it is home', () => {
    expect(parkedFlags({ player: body(false), twin: body(true) })).toEqual({ runner: false, twin: true });
  });
  it('is all false in a single-runner level', () => {
    expect(parkedFlags({ player: body(false), twin: null })).toEqual({ runner: false, twin: false });
  });
});
