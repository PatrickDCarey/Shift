/**
 * TEST-ONLY helper for the scene lane: build a Level from grid rows through
 * the real parser. Never imported by game code. The world defaults to the
 * number in the id (`w1-98` is world 1), so world 0 is a test room.
 */
import { parseLevel, type Level } from '../core';

export function gridLevel(rows: readonly string[], id = 'w0-98'): Level {
  const world = Number(/^w(\d+)-/.exec(id)?.[1] ?? 0);
  const text = [`id: ${id}`, 'title: test', `world: ${world}`, 'teaches: test', 'version: 1', '---', ...rows].join('\n');
  const parsed = parseLevel(text, id);
  if (!parsed.ok) throw new Error(parsed.errors.join('; '));
  return parsed.value;
}
