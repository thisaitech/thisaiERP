import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './main.css'
import './styles/tokens.css'
import './styles/mobile.css'
import { initializeTheme } from './services/themeService'
import './services/firebase'
import { ErrorBoundary } from './components/ErrorBoundary'

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(async (registrations) => {
    if (registrations.length === 0) return

    try {
      await Promise.all(registrations.map((r) => r.unregister()))

      if ('caches' in window) {
        const keys = await caches.keys()
        await Promise.all(keys.map((k) => caches.delete(k)))
      }

      if (!sessionStorage.getItem('sw-cleaned')) {
        sessionStorage.setItem('sw-cleaned', '1')
        window.location.reload()
      }
    } catch {
      // Non-fatal
    }
  })
}

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason)
})

window.addEventListener('error', (event) => {
  console.error('Global error:', event.error)
})

initializeTheme()

const appEnv = (import.meta as any).env || {}
const motionLevel = (appEnv.VITE_MOTION_LEVEL || 'balanced').toLowerCase()
const mobileDensity = (appEnv.VITE_MOBILE_DENSITY || 'compact').toLowerCase()
const premiumMobileEnabled = (appEnv.VITE_MOBILE_PREMIUM_UI ?? 'true') !== 'false'

document.documentElement.dataset.motionLevel = motionLevel
document.documentElement.dataset.mobileDensity = mobileDensity
document.documentElement.dataset.mobilePremiumUi = premiumMobileEnabled ? 'true' : 'false'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
