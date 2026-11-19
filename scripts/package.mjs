// npm run package: production build zipped for itch.io. Owner: backend-engineer.
//
//   npm run package                           -> release/redshift-<version>.zip (+ .sha256)
//   npm run package -- --out some/where.zip
//   npm run package -- --build-dir <empty dir>   keep the intermediate build there
//
// The build goes to a throwaway temp directory, never to `dist/` (the e2e suite rebuilds
// `dist/` with the QA hook), and the temp directory is deleted afterwards. The zip has
// index.html at its root, relative asset paths and no source maps, `.env` files or
// `window.__redshift` hook, and a LICENSES.txt (game, Phaser, eventemitter3 MIT notices). The script refuses to package if any of that is not true.
//
// Only the Supabase URL and anon key may be baked into the client (CLAUDE.md, "Secrets").
// Vite reads them from `.env` (or the environment) at build time, so for a build that has
// leaderboards, run this with `.env` filled in; without it the zip is an offline build.

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { build, loadEnv } from 'vite';
import { PackageError, checkEnv, scanFile } from './lib/checks.mjs';
import { LICENSES_NAME, buildLicensesText, checkLicenses } from './lib/licenses.mjs';
import { createZip, readZip } from './lib/zip.mjs';

const ROOT = resolve(import.meta.dirname, '..');

function out(text) {
  process.stdout.write(`${text}\n`);
}

function parseArgs(argv) {
  const opts = { out: undefined, buildDir: undefined };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const value = argv[i + 1];
    if (arg === '--out' || arg === '--build-dir') {
      if (value === undefined || value.startsWith('--')) throw new PackageError(`${arg} needs a value`);
      opts[arg === '--out' ? 'out' : 'buildDir'] = resolve(value);
      i++;
    } else {
      throw new PackageError(`unknown argument: ${arg}\nusage: npm run package -- [--out <file.zip>] [--build-dir <empty dir>]`);
    }
  }
  return opts;
}

/** Collect the VITE_ variables Vite would expose, then run the pure checks. */
function checkEnvironment() {
  const fromFiles = loadEnv('production', ROOT, 'VITE_');
  const fromShell = Object.fromEntries(Object.entries(process.env).filter(([k]) => k.startsWith('VITE_')));
  return checkEnv({ ...fromFiles, ...fromShell });
}

function listFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    return entry.isDirectory() ? listFiles(full) : [full];
  });
}

/** The generated LICENSES.txt: the game's LICENSE plus Phaser's and eventemitter3's (Vite strips their comments). */
function licensesEntry() {
  const read = (path) => readFileSync(join(ROOT, path), 'utf8');
  const text = buildLicensesText({
    game: read('LICENSE'),
    phaser: read('node_modules/phaser/LICENSE.md'),
    eventemitter3: read('node_modules/eventemitter3/LICENSE'),
  });
  return { name: LICENSES_NAME, data: Buffer.from(text, 'utf8') };
}

/** Inspect the finished build. Returns the entries to zip. */
function collectAndCheck(buildDir) {
  const problems = [];
  const entries = [];
  for (const file of listFiles(buildDir)) {
    const name = relative(buildDir, file).split(sep).join('/');
    const data = readFileSync(file);
    entries.push({ name, data });
    problems.push(...scanFile(name, data));
  }
  entries.push(licensesEntry());
  problems.push(...checkLicenses(entries));
  if (!entries.some((e) => e.name === 'index.html')) problems.push('index.html is not at the build root');
  if (problems.length > 0) throw new PackageError(`package check failed:\n  - ${problems.join('\n  - ')}`);
  return entries;
}

function prepareBuildDir(requested) {
  if (requested === undefined) return { dir: mkdtempSync(join(tmpdir(), 'redshift-package-')), temporary: true };
  if (existsSync(requested) && readdirSync(requested).length > 0) {
    throw new PackageError(`--build-dir ${requested} is not empty; the build empties its output folder, so pass a new or empty one.`);
  }
  mkdirSync(requested, { recursive: true });
  return { dir: requested, temporary: false };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const { version } = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  const zipPath = opts.out ?? join(ROOT, 'release', `redshift-${version}.zip`);
  const { leaderboards } = checkEnvironment();
  const { dir: buildDir, temporary } = prepareBuildDir(opts.buildDir);

  try {
    await build({
      root: ROOT,
      mode: 'production',
      logLevel: 'warn',
      build: { outDir: buildDir, emptyOutDir: true, sourcemap: false },
    });
    const entries = collectAndCheck(buildDir);
    const zip = createZip(entries);
    readZip(zip); // round-trip: every entry's checksum must verify
    mkdirSync(dirname(zipPath), { recursive: true });
    writeFileSync(zipPath, zip);
    const sha256 = createHash('sha256').update(zip).digest('hex');
    writeFileSync(`${zipPath}.sha256`, `${sha256}  ${zipPath.split(sep).pop()}\n`);

    const rawBytes = entries.reduce((sum, e) => sum + e.data.length, 0);
    out(`packaged ${entries.length} files (${(rawBytes / 1048576).toFixed(2)} MB) into ${zipPath}`);
    out(`zip size ${(statSync(zipPath).size / 1048576).toFixed(2)} MB, sha256 ${sha256}`);
    out(leaderboards ? 'leaderboards: Supabase URL and anon key are baked in' : 'leaderboards: not configured, this is an offline build');
  } finally {
    if (temporary) rmSync(buildDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  process.stderr.write(`package failed: ${error instanceof PackageError ? error.message : (error?.stack ?? error)}\n`);
  process.exit(1);
});
