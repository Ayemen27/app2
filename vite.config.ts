import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],
  root: 'client',
  server: {
    allowedHosts: true,
  },
  build: {
    outDir: '../dist/public',
    emptyOutDir: true,
    target: 'es2020',
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
