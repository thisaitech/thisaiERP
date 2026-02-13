/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: '/',
  plugins: [
    react(),
  ].filter(Boolean),
  define: {
    '__DEFINES__': {},
    // Production optimizations
    __PROD__: mode === 'production',
    __DEV__: mode === 'development'
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  },
  resolve: {
    dedupe: ['react', 'react-dom']
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
    force: true
  },
  build: {
    // Code splitting for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom'],
          'ui-vendor': ['framer-motion', 'react-router-dom', 'sonner'],
          'utils-vendor': ['clsx', 'tailwind-merge', 'date-fns']
        }
      }
    },
    // Source maps for production debugging
    sourcemap: mode === 'production',
    // Minify for production
    minify: mode === 'production' ? 'esbuild' : false,
    // Chunk size warnings
    chunkSizeWarningLimit: 1000,
    // Target modern browsers for better performance
    target: 'esnext',
    // CSS code splitting
    cssCodeSplit: true
  },
  server: {
    port: 3000,
    strictPort: true,
    open: true,
    // CORS for development
    cors: true
  },
  // Environment variables validation
  envPrefix: 'VITE_',
  // Preview server for testing production builds
  preview: {
    port: 4173,
    strictPort: true
  }
}))
