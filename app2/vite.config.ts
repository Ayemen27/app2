import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  root: 'client',
  build: {
    outDir: '../dist/public',
    emptyOutDir: true,
    target: 'es2020',
    minify: 'esbuild',
    cssMinify: 'esbuild',
    cssCodeSplit: true,
    rollupOptions: {
      maxParallelFileOps: 2,
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-select', '@radix-ui/react-toast'],
          charts: ['recharts'],
          excel: ['exceljs'],
          query: ['@tanstack/react-query'],
          router: ['wouter']
        },
        chunkFileNames: () => `assets/[name]-[hash].js`,
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name ?? 'asset';
          const info = name.split('.');
          const ext = info[info.length - 1];
          if (/\.(png|jpe?g|gif|svg|ico|webp)$/i.test(name)) {
            return `assets/img/[name]-[hash].${ext}`;
          }
          if (/\.(css)$/i.test(name)) {
            return `assets/css/[name]-[hash].${ext}`;
          }
          return `assets/[name]-[hash].${ext}`;
        }
      }
    },
    chunkSizeWarningLimit: 1000,
    reportCompressedSize: false,
    sourcemap: false
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
    allowedHosts: true,
    hmr: {
      host: undefined,
      port: undefined,
      protocol: 'ws',
    },
    fs: {
      allow: ['..'],
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
});