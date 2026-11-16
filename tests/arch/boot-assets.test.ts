/**
 * PX-4 guard: `BootScene` loads every committed pixel sheet, so a sheet the
 * art-director adds (and names in `PIXEL_KEYS`) cannot silently go unloaded.
 * Text-based, because BootScene imports Phaser, which needs a browser.
 * Owner: tech-lead.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(import.meta.dirname, '..', '..');
const PIXEL_DIR = join(ROOT, 'assets', 'art', 'pixel');
const BOOT = readFileSync(join(ROOT, 'src', 'scenes', 'BootScene.ts'), 'utf8');
const ATLAS_SOURCE = readFileSync(join(ROOT, 'src', 'fx', 'pixel', 'atlas.ts'), 'utf8');

/** Sheet base names (`pixel-player`, ...) from the PNGs on disk. */
const sheets = readdirSync(PIXEL_DIR)
  .filter((name) => /^pixel-[a-z]+\.png$/.test(name))
  .map((name) => name.slice(0, -'.png'.length));

/** `PIXEL_KEYS` entries as written in `src/fx/pixel/atlas.ts`: `player: 'pixel-player'`. */
function pixelKeys(): ReadonlyArray<readonly [string, string]> {
  const block = /export const PIXEL_KEYS = \{([\s\S]*?)\} as const;/.exec(ATLAS_SOURCE)?.[1] ?? '';
  return [...block.matchAll(/(\w+):\s*'([^']+)'/g)].map((m) => [m[1] ?? '', m[2] ?? ''] as const);
}

describe('BootScene loads the pixel sheets', () => {
  it('finds the sheets and the keys', () => {
    expect(sheets.length).toBeGreaterThanOrEqual(7);
    expect(pixelKeys().length).toBe(sheets.length);
  });

  it.each(pixelKeys())('PIXEL_KEYS.%s (%s) has a PNG and is loaded by BootScene', (key, file) => {
    expect(existsSync(join(PIXEL_DIR, `${file}.png`))).toBe(true);
    expect(BOOT).toContain(`PIXEL_KEYS.${key}`);
    expect(BOOT).toContain(`assets/art/pixel/${file}.png?url'`);
  });

  it.each(sheets)('%s: its data file is imported (atlas JSON as data, font XML as url)', (file) => {
    if (file === 'pixel-tileset') return; // `load.image`; its JSON is an index summary, not loaded
    const data = file === 'pixel-font' ? `${file}.xml?url'` : `${file}.json'`;
    expect(BOOT).toContain(`assets/art/pixel/${data}`);
  });
});
