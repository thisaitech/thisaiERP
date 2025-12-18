import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// import { VitePWA } from 'vite-plugin-pwa' // COMPLETELY DISABLED TO FIX CACHING ISSUE

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  plugins: [
    react()
    // PWA COMPLETELY REMOVED - WAS CAUSING AGGRESSIVE CACHING ISSUES
  ],
  define: {
    '__DEFINES__': {}
  },
  resolve: {
    dedupe: ['react', 'react-dom']
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
    force: true
  },
  server: {
    port: 3000,
    open: true
  }
})
