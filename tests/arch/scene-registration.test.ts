/**
 * Every scene the menus can reach is registered in `src/main.ts` (B6-24,
 * batch 5 review U3), the overlays are registered after the game scene
 * (ui-engineer's launch contract), and Boot keeps the `?level=` deep link.
 * Owner: tech-lead.
 *
 * Text-based: `main.ts` and the scene classes import Phaser and Vite asset
 * URLs, so they are read as source, not imported. `keys.ts` is imported for
 * `SCENE_KEYS` and `bootTarget` (pure).
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SCENE_KEYS, bootTarget } from '../../src/scenes/keys';
import { stripComments } from './sourceText';

const SRC_DIR = resolve(import.meta.dirname, '..', '..', 'src');
const MAIN_FILE = join(SRC_DIR, 'main.ts');
const MENU_FILE = join(SRC_DIR, 'scenes', 'menuScenes.ts');
const NAV_FILES = [join(SRC_DIR, 'ui', 'menuNav.ts'), join(SRC_DIR, 'ui', 'menuFlow.ts')];
const KEY_USE_DIRS = [join(SRC_DIR, 'scenes'), join(SRC_DIR, 'ui')];

type KeyName = keyof typeof SCENE_KEYS;

/**
 * Keys added ahead of their scene so another lane can build against them
 * (B7-04: `settings` for B7-11). Nothing may use one yet: the "menus can jump
 * to" check below still fails on any `SCENE_KEYS.<reserved>` in scenes or ui,
 * so the scene must be registered in the same change that first uses its key.
 * Once it is registered the entry is harmless; tech-lead removes it at review
 * (ui-engineer does not edit this file).
 */
const RESERVED_KEYS: readonly string[] = ['settings'];

const read = (file: string): string => stripComments(readFileSync(file, 'utf8'));

/** Names inside `<anchor> [ ... ]`, spreads kept as `...NAME`. */
function arrayNames(source: string, anchor: RegExp): readonly string[] {
  const m = new RegExp(`${anchor.source}\\s*\\[([^\\]]*)\\]`).exec(source);
  if (m === null) return [];
  return (m[1] ?? '').split(',').map((s) => s.trim()).filter((s) => s !== '');
}

/** The file a class name is imported from, resolved against `file`. */
function importPath(file: string, source: string, name: string): string | null {
  const re = new RegExp(`import\\s*\\{[^}]*\\b${name}\\b[^}]*\\}\\s*from\\s*['"](\\.[^'"]+)['"]`);
  const m = re.exec(source);
  return m === null ? null : `${resolve(dirname(file), m[1] ?? '')}.ts`;
}

/** `SCENE_KEYS.<name>` passed to `super(...)` in a scene class file. */
function constructorKey(source: string): string | null {
  return /super\(\s*SCENE_KEYS\.(\w+)\s*\)/.exec(source)?.[1] ?? null;
}

/** Scene class names in registration order, `...MENU_SCENES` expanded. */
function registeredClasses(): ReadonlyArray<{ readonly name: string; readonly file: string }> {
  const main = read(MAIN_FILE);
  const menu = read(MENU_FILE);
  return arrayNames(main, /\bscene\s*:/).flatMap((entry) => {
    if (entry !== '...MENU_SCENES') return [{ name: entry, file: importPath(MAIN_FILE, main, entry) ?? '' }];
    return arrayNames(menu, /MENU_SCENES\s*=/).map((name) => ({ name, file: importPath(MENU_FILE, menu, name) ?? '' }));
  });
}

function registeredKeys(): readonly string[] {
  return registeredClasses().map(({ name, file }) => {
    if (file === '') return `unresolved:${name}`;
    return constructorKey(read(file)) ?? `no-key:${name}`;
  });
}

/** String members of `export type <name> = 'a' | 'b';`. */
function unionMembers(source: string, typeName: string): readonly string[] {
  const m = new RegExp(`export\\s+type\\s+${typeName}\\s*=([^;]*);`).exec(source);
  return m === null ? [] : [...(m[1] ?? '').matchAll(/'(\w+)'/g)].map((x) => x[1] ?? '');
}

/** Every `SCENE_KEYS.<name>` used in scene and ui source (tests excluded). */
function usedKeyNames(): readonly string[] {
  const files = KEY_USE_DIRS.flatMap((dir) =>
    readdirSync(dir)
      .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))
      .map((f) => join(dir, f)),
  );
  return [...new Set(files.flatMap((f) => [...read(f).matchAll(/SCENE_KEYS\.(\w+)/g)].map((m) => m[1] ?? '')))];
}

describe('scene registration (B6-24)', () => {
  const registered = registeredKeys();

  it('main.ts registers Boot first, then Game, then every menu scene, each with its own key', () => {
    expect(registered[0]).toBe('boot');
    expect(registered).toContain('game');
    expect(new Set(registered).size).toBe(registered.length);
    expect(registered.every((k) => k in SCENE_KEYS)).toBe(true);
  });

  it('every SCENE_KEYS entry is registered, except keys reserved for a scene still being built', () => {
    const unregistered = Object.keys(SCENE_KEYS).filter((k) => !registered.includes(k));
    expect(unregistered.filter((k) => !RESERVED_KEYS.includes(k))).toEqual([]);
  });

  it('every reserved key is a real SCENE_KEYS entry', () => {
    expect(RESERVED_KEYS.every((k) => k in SCENE_KEYS)).toBe(true);
  });

  it('every scene the menus can jump to is registered (menuNav SceneTarget, menuFlow FlowTarget, SCENE_KEYS uses)', () => {
    const targets = [
      ...unionMembers(read(NAV_FILES[0] ?? ''), 'SceneTarget'),
      ...unionMembers(read(NAV_FILES[1] ?? ''), 'FlowTarget'),
      ...usedKeyNames(),
    ];
    expect(targets.length).toBeGreaterThan(4);
    expect([...new Set(targets)].filter((t) => !registered.includes(t))).toEqual([]);
  });

  it('Pause and Results are registered after Game, so the overlays draw on top', () => {
    const at = (k: KeyName): number => registered.indexOf(k);
    expect(at('pause')).toBeGreaterThan(at('game'));
    expect(at('results')).toBeGreaterThan(at('game'));
  });
});

describe('bootTarget: title on a plain load, the game on a deep link', () => {
  it.each([
    ['', 'Title'],
    ['?', 'Title'],
    ['?level=', 'Title'],
    ['?level=%20', 'Title'],
    ['?debug', 'Title'],
    ['?replay=0', 'Title'],
    ['?level=w1-01', 'Game'],
    ['?level=w0-02&debug', 'Game'],
    ['?level=w1-01&replay=1&speed=60', 'Game'],
    ['?replay=1', 'Game'],
    ['?replay=true', 'Game'],
  ])('%j starts %s', (search, scene) => {
    expect(bootTarget(search)).toBe(scene);
  });
});

describe('scene-registration self-check', () => {
  it('reads arrays, constructor keys and unions', () => {
    expect(arrayNames('scene: [A, B, ...C],', /\bscene\s*:/)).toEqual(['A', 'B', '...C']);
    expect(constructorKey('super(SCENE_KEYS.levelSelect);')).toBe('levelSelect');
    expect(constructorKey("super('Title');")).toBeNull();
    expect(unionMembers("export type T = 'game' | 'title';", 'T')).toEqual(['game', 'title']);
  });
});
