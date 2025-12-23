/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'ThisAI CRM - Billing Pro',
        short_name: 'ThisAI CRM',
        description: 'Complete CRM solution for managing sales, purchases, inventory, and business operations. Works offline!',
        theme_color: '#3b82f6',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        orientation: 'portrait-primary',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10 MB limit
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\./,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              }
            }
          }
        ]
      },
      // Disable PWA in development for faster builds
      disable: mode === 'development'
    })
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
          'firebase-vendor': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
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
