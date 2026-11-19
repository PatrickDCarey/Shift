// Licence notices that must ship inside the itch zip (`LICENSES.txt` at the zip root).
// Vite strips Phaser's licence comment from the bundle, and MIT requires the copyright and
// permission notice to travel with copies. Pure functions (no file system) so they are
// unit-tested; scripts/package.mjs reads the files. Owner: backend-engineer.

export const LICENSES_NAME = 'LICENSES.txt';
const MIT_GRANT = 'Permission is hereby granted, free of charge';
const MIT_WARRANTY = 'THE SOFTWARE IS PROVIDED "AS IS"';

/** What the generated file must name: one entry per shipped component. */
export const REQUIRED_NOTICES = [
  { label: 'Redshift (game code)', holder: 'Patrick Carey' },
  { label: 'Phaser', holder: 'Richard Davey' },
  { label: 'eventemitter3', holder: 'Arnout Kazemier' },
];

/** Build LICENSES.txt from the full text of the three licence files. */
export function buildLicensesText({ game, phaser, eventemitter3 }) {
  const section = (title, text) => `${'='.repeat(72)}\n${title}\n${'='.repeat(72)}\n\n${text.trim()}\n`;
  return [
    'Third-party and project licence notices for Redshift.\n',
    section('Redshift (this game)', game),
    section('Phaser 3.90.0 (https://phaser.io)', phaser),
    section('eventemitter3 (bundled by Phaser; https://github.com/primus/eventemitter3)', eventemitter3),
  ].join('\n');
}

/** Problems with the licence file among the zip `entries` ({ name, data }). Empty list = fine. */
export function checkLicenses(entries) {
  const entry = entries.find((e) => e.name === LICENSES_NAME);
  if (!entry) return [`${LICENSES_NAME} is missing from the zip root (MIT needs the notices to ship)`];
  const text = Buffer.from(entry.data).toString('utf8');
  const problems = [];
  for (const { label, holder } of REQUIRED_NOTICES) {
    if (!new RegExp(`Copyright \\(c\\) [\\d-]+ [^\\n]*${holder}`).test(text)) {
      problems.push(`${LICENSES_NAME}: no copyright line for ${label} (${holder})`);
    }
  }
  const grants = text.split(MIT_GRANT).length - 1;
  const warranties = text.split(MIT_WARRANTY).length - 1;
  if (grants < REQUIRED_NOTICES.length || warranties < REQUIRED_NOTICES.length) {
    problems.push(`${LICENSES_NAME}: needs the full MIT text ${REQUIRED_NOTICES.length} times (found ${Math.min(grants, warranties)})`);
  }
  return problems;
}
