import { useState, useCallback, useRef, useEffect } from 'react'
import { toast } from 'sonner'

interface AsyncToastOptions {
  loadingMessage: string
  successMessage: string | ((result: any) => string)
  errorMessage: string | ((error: any) => string)
}

/**
 * Custom hook for handling async operations with proper toast management
 * Prevents stuck toasts and handles multiple clicks gracefully
 *
 * Usage:
 * const { execute, isLoading } = useAsyncToast()
 *
 * const handleGenerateEwayBill = () => {
 *   execute(
 *     () => generateEwayBillAPI(invoiceId),
 *     {
 *       loadingMessage: 'Generating E-Way Bill...',
 *       successMessage: (result) => `E-Way Bill Generated! No: ${result.ewayBillNo}`,
 *       errorMessage: 'Failed to generate E-Way Bill'
 *     }
 *   )
 * }
 */
export const useAsyncToast = () => {
  const [isLoading, setIsLoading] = useState(false)
  const toastIdRef = useRef<string | number | null>(null)
  const isMountedRef = useRef(true)

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      // Dismiss any active toast on unmount
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current)
      }
    }
  }, [])

  const execute = useCallback(async <T>(
    asyncFn: () => Promise<T>,
    options: AsyncToastOptions
  ): Promise<T | null> => {
    // Prevent multiple clicks
    if (isLoading) {
      return null
    }

    setIsLoading(true)

    // Dismiss any previous toast from this hook
    if (toastIdRef.current) {
      toast.dismiss(toastIdRef.current)
    }

    // Show loading toast
    toastIdRef.current = toast.loading(options.loadingMessage)

    try {
      const result = await asyncFn()

      // Only update if still mounted
      if (isMountedRef.current && toastIdRef.current) {
        const successMsg = typeof options.successMessage === 'function'
          ? options.successMessage(result)
          : options.successMessage

        toast.success(successMsg, { id: toastIdRef.current })
      }

      return result
    } catch (error: any) {
      // Only update if still mounted
      if (isMountedRef.current && toastIdRef.current) {
        const errorMsg = typeof options.errorMessage === 'function'
          ? options.errorMessage(error)
          : (error?.message || options.errorMessage)

        toast.error(errorMsg, { id: toastIdRef.current })
      }

      return null
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false)
      }
      toastIdRef.current = null
    }
  }, [isLoading])

  // Simple version using toast.promise
  const executeWithPromise = useCallback(async <T>(
    asyncFn: () => Promise<T>,
    options: AsyncToastOptions
  ): Promise<T | null> => {
    if (isLoading) return null

    setIsLoading(true)

    try {
      const result = await toast.promise(asyncFn(), {
        loading: options.loadingMessage,
        success: typeof options.successMessage === 'function'
          ? (data) => options.successMessage(data)
          : options.successMessage,
        error: typeof options.errorMessage === 'function'
          ? (err) => options.errorMessage(err)
          : options.errorMessage
      })

      return result
    } catch (error) {
      return null
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false)
      }
    }
  }, [isLoading])

  return {
    execute,
    executeWithPromise,
    isLoading
  }
}

/**
 * Global loading state tracker to prevent multiple operations across components
 * Use this for operations that should be globally exclusive (like E-Way Bill generation)
 */
class GlobalLoadingTracker {
  private operations: Map<string, boolean> = new Map()

  isLoading(operationKey: string): boolean {
    return this.operations.get(operationKey) || false
  }

  setLoading(operationKey: string, loading: boolean): void {
    if (loading) {
      this.operations.set(operationKey, true)
    } else {
      this.operations.delete(operationKey)
    }
  }
}

export const globalLoadingTracker = new GlobalLoadingTracker()

/**
 * Helper function for one-off async toast operations
 *
 * Usage:
 * await asyncToast(
 *   () => api.generateEwayBill(invoiceId),
 *   'Generating E-Way Bill...',
 *   'E-Way Bill Generated!',
 *   'Failed to generate E-Way Bill'
 * )
 */
export const asyncToast = async <T>(
  asyncFn: () => Promise<T>,
  loadingMessage: string,
  successMessage: string,
  errorMessage: string
): Promise<T | null> => {
  try {
    const result = await toast.promise(asyncFn(), {
      loading: loadingMessage,
      success: successMessage,
      error: errorMessage
    })
    return result
  } catch {
    return null
  }
}

export default useAsyncToast
