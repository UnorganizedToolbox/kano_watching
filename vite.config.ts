import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // Ensures relative asset paths, making it compatible with GitHub Pages sub-directories
  plugins: [],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
  },
  server: {
    port: 8080,
  }
});
