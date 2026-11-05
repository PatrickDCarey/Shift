import { defineConfig } from 'vite';
import { envGuard } from './config/envGuard.ts';

// itch.io serves the game from an unzipped folder inside an iframe, so every
// asset URL must be relative: base './'.
export default defineConfig({
  base: './',
  // Fails build, dev and preview if .env or the shell would put a secret or an
  // unknown VITE_ variable into the client (config/envGuard.ts).
  plugins: [envGuard()],
  server: {
    port: 5173,
  },
  preview: {
    port: 4173,
  },
  build: {
    outDir: 'dist',
    target: 'es2022',
    assetsInlineLimit: 0,
    sourcemap: false,
    // Phaser alone is ~1.2 MB minified; that is expected for this project.
    chunkSizeWarningLimit: 1600,
  },
});
