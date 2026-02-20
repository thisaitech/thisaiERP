import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './main.css'
import './styles/tokens.css'
import './styles/mobile.css'
import { initializeTheme } from './services/themeService'

// If a PWA service worker was previously registered on this origin, it can keep serving
// stale cached assets even during local development. Ensure dev always uses the latest
// bundle from Vite.
const appEnv = (import.meta as any).env || {}

if (appEnv.DEV && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(async (registrations) => {
    if (registrations.length === 0) return

    try {
      await Promise.all(registrations.map((r) => r.unregister()))

      // Best-effort cache cleanup (Workbox precaches can otherwise linger).
      if ('caches' in window) {
        const keys = await caches.keys()
        await Promise.all(keys.map((k) => caches.delete(k)))
      }

      // Avoid infinite reload loops.
      if (!sessionStorage.getItem('dev-sw-cleaned')) {
        sessionStorage.setItem('dev-sw-cleaned', '1')
        window.location.reload()
      }
    } catch {
      // Non-fatal; dev still works without unregistering.
    }
  })
}

// Initialize festival theme on app start
initializeTheme()

const motionLevel = (appEnv.VITE_MOTION_LEVEL || 'balanced').toLowerCase()
const mobileDensity = (appEnv.VITE_MOBILE_DENSITY || 'compact').toLowerCase()
const premiumMobileEnabled = (appEnv.VITE_MOBILE_PREMIUM_UI ?? 'true') !== 'false'

document.documentElement.dataset.motionLevel = motionLevel
document.documentElement.dataset.mobileDensity = mobileDensity
document.documentElement.dataset.mobilePremiumUi = premiumMobileEnabled ? 'true' : 'false'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
