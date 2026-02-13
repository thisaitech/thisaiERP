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
