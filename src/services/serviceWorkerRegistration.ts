// Service Worker Registration
// Registers the service worker for offline support

export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      })
      
      console.log('✅ Service Worker registered successfully:', registration.scope)
      
      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content available, show update notification
              console.log('🔄 New content available, please refresh')
              // You can dispatch an event here to show an update banner
              window.dispatchEvent(new CustomEvent('sw-update-available'))
            }
          })
        }
      })

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SYNC_REQUESTED') {
          // Trigger sync
          window.dispatchEvent(new CustomEvent('sw-sync-requested'))
        }
      })

      return registration
    } catch (error) {
      console.error('❌ Service Worker registration failed:', error)
      return null
    }
  } else {
    console.warn('⚠️ Service Workers not supported in this browser')
    return null
  }
}

// Unregister service worker
export const unregisterServiceWorker = async (): Promise<boolean> => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready
      const success = await registration.unregister()
      console.log('Service Worker unregistered:', success)
      return success
    } catch (error) {
      console.error('Failed to unregister service worker:', error)
      return false
    }
  }
  return false
}

// Request background sync
export const requestBackgroundSync = async (tag: string = 'sync-pending-operations'): Promise<void> => {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    try {
      const registration = await navigator.serviceWorker.ready
      // @ts-ignore - SyncManager types not always available
      await registration.sync.register(tag)
      console.log('Background sync requested:', tag)
    } catch (error) {
      console.warn('Background sync not available:', error)
    }
  }
}

// Check if app is installed (PWA)
export const isAppInstalled = (): boolean => {
  // Check if running in standalone mode (installed PWA)
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone === true
}

// Prompt for PWA installation
export const promptInstall = async (): Promise<boolean> => {
  const deferredPrompt = (window as any).deferredPrompt
  if (deferredPrompt) {
    deferredPrompt.prompt()
    const result = await deferredPrompt.userChoice
    const outcome = result.outcome
    ;(window as any).deferredPrompt = null
    return outcome === 'accepted'
  }
  return false
}

// Store the install prompt for later
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  ;(window as any).deferredPrompt = e
  console.log('PWA install prompt stored')
  window.dispatchEvent(new CustomEvent('pwa-install-available'))
})

export default {
  register: registerServiceWorker,
  unregister: unregisterServiceWorker,
  requestSync: requestBackgroundSync,
  isInstalled: isAppInstalled,
  promptInstall
}

