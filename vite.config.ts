import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf-8'));

export default defineConfig({
  base: './',
  plugins: [react()],
  define: {
    '__APP_VERSION__': JSON.stringify(pkg.version),
  },
  root: 'client',
  server: {
    allowedHosts: true,
    watch: {
      ignored: ['**/www/**', '**/output_apks/**', '**/android/**'],
    },
  },
  build: {
    outDir: '../dist/public',
    emptyOutDir: true,
    target: 'es2020',
    rollupOptions: {
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'client/src'),
      '@shared': path.resolve(__dirname, 'shared'),
      '@assets': path.resolve(__dirname, 'attached_assets'),
      '@lib': path.resolve(__dirname, 'client/src/lib'),
    },
  },
});
