// Unit tests for the licence-notice check. Owner: backend-engineer.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LICENSES_NAME, buildLicensesText, checkLicenses } from './licenses.mjs';

const mit = (holder: string, year: string): string =>
  `MIT License\n\nCopyright (c) ${year} ${holder}\n\nPermission is hereby granted, free of charge, to any person...\n\nTHE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.\n`;
const good = buildLicensesText({
  game: mit('Patrick Carey', '2026'),
  phaser: mit('Richard Davey, Phaser Studio Inc.', '2024'),
  eventemitter3: mit('Arnout Kazemier', '2014'),
});
const entry = (text: string) => ({ name: LICENSES_NAME, data: new TextEncoder().encode(text) });

describe('checkLicenses', () => {
  it('accepts the generated file', () => {
    expect(checkLicenses([entry(good)])).toEqual([]);
  });
  it('fails when the file is missing', () => {
    expect(checkLicenses([{ name: 'index.html', data: new Uint8Array() }])[0]).toMatch(/missing/);
  });
  it('fails when a copyright line is missing', () => {
    expect(checkLicenses([entry(good.replace(/Richard Davey/g, 'someone'))]).join()).toMatch(/Phaser/);
    expect(checkLicenses([entry(good.replace(/Arnout Kazemier/g, 'someone'))]).join()).toMatch(/eventemitter3/);
    expect(checkLicenses([entry(good.replace(/Patrick Carey/g, 'someone'))]).join()).toMatch(/Redshift/);
  });
  it('fails when the permission text is cut', () => {
    expect(checkLicenses([entry(good.replace('Permission is hereby granted, free of charge', ''))]).join()).toMatch(/full MIT text/);
    expect(checkLicenses([entry(good.replace('THE SOFTWARE IS PROVIDED "AS IS"', ''))]).join()).toMatch(/full MIT text/);
  });
  it('fails on an empty file', () => {
    expect(checkLicenses([entry('')]).length).toBeGreaterThan(0);
  });
});

describe('real licence files', () => {
  it('produce a file that passes the check', () => {
    const root = resolve(import.meta.dirname, '../..');
    const read = (p: string): string => readFileSync(resolve(root, p), 'utf8');
    const text = buildLicensesText({
      game: read('LICENSE'),
      phaser: read('node_modules/phaser/LICENSE.md'),
      eventemitter3: read('node_modules/eventemitter3/LICENSE'),
    });
    expect(checkLicenses([entry(text)])).toEqual([]);
  });
});
