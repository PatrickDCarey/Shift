/**
 * TEST-ONLY helper for the scene lane: build a Level from grid rows through
 * the real parser. Never imported by game code.
 */
import { parseLevel, type Level } from '../core';

export function gridLevel(rows: readonly string[], id = 'w0-98'): Level {
  const text = [`id: ${id}`, 'title: test', 'world: 0', 'teaches: test', 'version: 1', '---', ...rows].join('\n');
  const parsed = parseLevel(text, id);
  if (!parsed.ok) throw new Error(parsed.errors.join('; '));
  return parsed.value;
}
