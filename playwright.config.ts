import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
const isCI = Boolean(process.env['CI']);

/** The itch.io embed size (CLAUDE.md, "itch.io build"). */
const EMBED_VIEWPORT = { width: 960, height: 540 };

// E2E runs against the production build (vite preview) so it exercises the
// same relative-path bundle that ships to itch.io. The one difference is
// VITE_QA_HOOK=1, which keeps `window.__redshift` in this build only
// (docs/tech/architecture.md, "QA hook"); a plain `npm run build` has no hook.
export default defineConfig({
  testDir: 'tests/e2e',
  outputDir: 'test-results',
  fullyParallel: true,
  // Each worker runs Phaser's WebGL loop in a headless (software) Chromium.
  // The default (half the logical cores) starves the game on a busy machine
  // and makes the polls time out (BUG-3); 2 is stable locally and matches
  // GitHub's 2-4 vCPU runners.
  workers: 2,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  // The viewport goes after the device spread: a preset's own viewport
  // (1280x720) would otherwise win over a config-level one (BUG-2).
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: EMBED_VIEWPORT } }],
  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
    // Merged over process.env by Playwright; read by Vite at build time.
    env: { VITE_QA_HOOK: '1' },
    url: `http://localhost:${PORT}`,
    // Never reuse a running server: it could be a plain build without the
    // hook, or a stale one. Free port 4173 before running the suite.
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
