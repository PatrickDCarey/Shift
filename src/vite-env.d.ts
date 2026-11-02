/// <reference types="vite/client" />

// Only these two values may ever reach the client (CLAUDE.md, "Secrets").
// Both are optional: the game runs fully offline without them.
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
