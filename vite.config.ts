import { defineConfig } from 'vite';

export default defineConfig({
  root: 'demo',
  server: {
    port: 5173,
    open: false,
  },
  build: {
    outDir: '../demo-dist',
    emptyOutDir: true,
  },
});
