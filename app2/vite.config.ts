import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: 'client',
  build: {
    outDir: '../dist/public',
    emptyOutDir: true,
    target: 'es2020',
  },
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), 'client/src'),
      '@assets': path.resolve(process.cwd(), 'attached_assets'),
      '@shared': path.resolve(process.cwd(), 'shared'),
      '@lib': path.resolve(process.cwd(), 'client/src/lib'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5000,
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
});