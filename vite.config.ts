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
    minify: false,
    cssMinify: false,
    rollupOptions: {
      maxParallelFileOps: 1,
      cache: false,
      output: {
        manualChunks: undefined,
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      }
    },
    chunkSizeWarningLimit: 2000,
    reportCompressedSize: false,
    assetsInlineLimit: 4096, // Inline small assets to reduce requests
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@assets': path.resolve(__dirname, '../attached_assets'),
      '@shared': path.resolve(__dirname, '../shared'),
      '@lib': path.resolve(__dirname, 'src/lib'),
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
    exclude: ['@replit/vite-plugin-cartographer']
  },
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' }
  },
});