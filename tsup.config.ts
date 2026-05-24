import { defineConfig } from 'tsup';
import { copyFileSync } from 'node:fs';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  minify: false,
  outDir: 'dist',
  target: 'es2020',
  // Copy CSS to dist so consumers can `import '@connorburns/playbook/styles.css'`.
  onSuccess: async () => {
    copyFileSync('src/styles.css', 'dist/styles.css');
  },
});
