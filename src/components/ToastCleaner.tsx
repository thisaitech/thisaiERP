import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import { toastManager } from '../utils/toastManager'

/**
 * ToastCleaner component - Automatically dismisses all toasts when route changes
 * This prevents stuck loading toasts when navigating between pages
 *
 * Features:
 * - Dismisses all toasts on route change
 * - Prevents stuck loading toasts
 * - Clears toastManager active operations
 * - Works with both sonner and react-hot-toast
 */
const ToastCleaner = () => {
  const location = useLocation()
  const isFirstRender = useRef(true)

  useEffect(() => {
    // Skip first render to avoid dismissing toasts on initial load
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    // Dismiss all sonner toasts when route changes
    toast.dismiss()

    // Dismiss all toasts from toastManager
    toastManager.dismissAll()

    // Also try to dismiss react-hot-toast if available
    try {
      const hotToast = require('react-hot-toast')
      if (hotToast && hotToast.dismiss) {
        hotToast.dismiss()
      }
    } catch {
      // react-hot-toast not available, ignore
    }
  }, [location.pathname])

  // Cleanup on unmount - dismiss any remaining toasts
  useEffect(() => {
    return () => {
      toast.dismiss()
      toastManager.dismissAll()
    }
  }, [])

  return null
}

export default ToastCleaner
