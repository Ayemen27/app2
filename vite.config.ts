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
    minify: 'terser',
    cssMinify: 'lightningcss',
    terserOptions: {
      compress: {
        drop_console: false,
        drop_debugger: true,
      },
      format: {
        comments: false,
      },
    },
    cssCodeSplit: true,
    rollupOptions: {
      maxParallelFileOps: 1,
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('@radix-ui')) {
              return 'vendor-radix';
            }
            if (id.includes('recharts')) {
              return 'vendor-charts';
            }
            if (id.includes('exceljs')) {
              return 'vendor-excel';
            }
            return 'vendor';
          }
        },
        chunkFileNames: 'assets/[name]-[hash].js',
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
    chunkSizeWarningLimit: 2000,
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
    exclude: ['@replit/vite-plugin-cartographer']
  },
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' }
  },
});