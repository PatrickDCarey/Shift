import { describe, expect, it } from 'vitest';
import { DEV_LEVEL_ID, DEV_LEVEL_TEXT, devLevel } from './devLevel';
import type { Level } from '../core';
import { chooseLevel, DEFAULT_LEVEL_ID, loadLevelSet, nextLevelId, requestedLevelId, selectLevel } from './levelSelect';

function levelText(id: string, world = 0): string {
  return [`id: ${id}`, 'title: T', `world: ${world}`, 'teaches: t', 'version: 1', '---', '.@.E', '####'].join('\n');
}

const files = {
  '/levels/w0-01.txt': levelText('w0-01'),
  '/levels/w0-02.txt': levelText('w0-02'),
  '/levels/w1-01.txt': levelText('w1-01', 1),
};

describe('requestedLevelId', () => {
  it('reads ?level=', () => {
    expect(requestedLevelId('?level=w1-01')).toBe('w1-01');
    expect(requestedLevelId('?debug=1&level=w0-02')).toBe('w0-02');
  });

  it('is null when absent or blank', () => {
    expect(requestedLevelId('')).toBeNull();
    expect(requestedLevelId('?level=')).toBeNull();
    expect(requestedLevelId('?level=%20')).toBeNull();
  });
});

describe('devLevel', () => {
  it('parses and has a start and an exit', () => {
    const level = devLevel();
    expect(level.meta.id).toBe(DEV_LEVEL_ID);
    expect(level.width).toBe(40);
    expect(level.tiles.some((t) => t.kind === 'exit')).toBe(true);
    expect(DEV_LEVEL_TEXT.split('\n').slice(6).every((r) => r.length === 40)).toBe(true);
  });
});

describe('chooseLevel', () => {
  const levels = loadLevelSet(files).levels;

  it('prefers the requested id', () => {
    const c = chooseLevel(levels, 'w1-01');
    expect(c.level.meta.id).toBe('w1-01');
    expect(c.messages).toEqual([]);
  });

  it('defaults to w0-02 when present', () => {
    expect(chooseLevel(levels, null).level.meta.id).toBe(DEFAULT_LEVEL_ID);
  });

  it('falls back to the first level (world, then id order) when the default is missing', () => {
    const c = chooseLevel(levels.filter((l) => l.meta.id !== 'w0-02'), null);
    expect(c.level.meta.id).toBe('w0-01');
  });

  it('warns about an unknown requested id and still picks a level', () => {
    const c = chooseLevel(levels, 'nope');
    expect(c.level.meta.id).toBe(DEFAULT_LEVEL_ID);
    expect(c.messages[0]).toContain('nope');
  });

  it('uses the built-in dev level when there are no levels at all', () => {
    const c = chooseLevel([], null);
    expect(c.level.meta.id).toBe(DEV_LEVEL_ID);
    expect(c.messages[0]).toContain('No level files');
  });
});

describe('selectLevel', () => {
  it('uses the dev level for an empty bundle', () => {
    expect(selectLevel({}, '').level.meta.id).toBe(DEV_LEVEL_ID);
  });

  it('applies the URL parameter', () => {
    expect(selectLevel(files, '?level=w1-01').level.meta.id).toBe('w1-01');
  });

  it('reports a broken file but still plays the good ones', () => {
    const broken = { ...files, '/levels/w0-03.txt': 'id: w0-03\nnonsense' };
    const sel = selectLevel(broken, '');
    expect(sel.level.meta.id).toBe('w0-02');
    expect(sel.messages[0]).toContain('failed to parse');
    expect(sel.messages.length).toBeGreaterThan(1);
  });

  it('falls back to the dev level when every file is broken, with the errors shown', () => {
    const sel = selectLevel({ '/levels/w0-02.txt': 'garbage' }, '');
    expect(sel.level.meta.id).toBe(DEV_LEVEL_ID);
    expect(sel.messages.join('\n')).toContain('w0-02');
  });
});

describe('loadLevelSet', () => {
  it('ignores solution files', () => {
    const r = loadLevelSet({ ...files, '/levels/w0-02.solution.txt': 'not a level' });
    expect(r.errors).toEqual([]);
    expect(r.levels).toHaveLength(3);
  });
});

describe('nextLevelId (stand-in until the ui progress model lands)', () => {
  const lv = (id: string, world: number): Level => ({ ...devLevel(), meta: { ...devLevel().meta, id, world } });
  const order = [lv('w0-02', 0), lv('w1-01', 1), lv('w1-02', 1), lv('w2-01', 2)];

  it('goes to the next world 1+ level, crossing worlds', () => {
    expect(nextLevelId(order, 'w1-01')).toBe('w1-02');
    expect(nextLevelId(order, 'w1-02')).toBe('w2-01');
  });

  it('is null after the last level, for world 0 and for unknown ids', () => {
    expect(nextLevelId(order, 'w2-01')).toBeNull();
    expect(nextLevelId(order, 'w0-02')).toBeNull();
    expect(nextLevelId(order, 'nope')).toBeNull();
  });
});
