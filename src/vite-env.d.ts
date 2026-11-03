/// <reference types="vite/client" />

// Secrets: only the two Supabase values may ever reach the client (CLAUDE.md, "Secrets").
// Both are optional: the game runs fully offline without them.
// VITE_QA_HOOK is a build switch, not a secret: '1' installs `window.__redshift` in a
// production build. Only playwright.config.ts sets it; the itch.io build never does.
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_QA_HOOK?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
