import { defineConfig } from 'vite';

// itch.io serves the game from an unzipped folder inside an iframe, so every
// asset URL must be relative: base './'.
export default defineConfig({
  base: './',
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
