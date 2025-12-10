import { toast } from 'sonner'

/**
 * Global Toast Manager for Sonner
 * Prevents stuck toasts by tracking toast IDs globally
 * Works exactly like react-toastify pattern but for sonner
 *
 * Usage:
 * import { toastManager } from '../utils/toastManager'
 *
 * // For E-Way Bill generation:
 * await toastManager.withLoading(
 *   'eway-bill',
 *   () => generateEwayBillAPI(invoiceId),
 *   {
 *     loading: 'Generating E-Way Bill...',
 *     success: (result) => `E-Way Bill Generated! No: ${result.ewayBillNo}`,
 *     error: 'Failed to generate E-Way Bill'
 *   }
 * )
 *
 * // Check if operation is in progress:
 * if (toastManager.isLoading('eway-bill')) {
 *   return // Already generating
 * }
 */

interface ToastMessages {
  loading: string
  success: string | ((result: any) => string)
  error: string | ((error: any) => string)
}

interface ActiveToast {
  id: string | number
  startTime: number
}

class ToastManager {
  private activeToasts: Map<string, ActiveToast> = new Map()

  /**
   * Check if an operation is currently in progress
   */
  isLoading(operationKey: string): boolean {
    return this.activeToasts.has(operationKey)
  }

  /**
   * Execute an async function with loading toast
   * Prevents multiple calls for the same operation
   * IMPORTANT: Dismisses ALL existing toasts first to prevent stuck toasts
   */
  async withLoading<T>(
    operationKey: string,
    asyncFn: () => Promise<T>,
    messages: ToastMessages
  ): Promise<T | null> {
    // If already loading, show info toast and return
    if (this.activeToasts.has(operationKey)) {
      toast.info('Operation already in progress...', { duration: 2000 })
      return null
    }

    // CRITICAL: Dismiss ALL existing toasts first to prevent stuck/multiple toasts
    toast.dismiss()
    this.dismissAll()

    // Show loading toast and track it
    const toastId = toast.loading(messages.loading)
    this.activeToasts.set(operationKey, {
      id: toastId,
      startTime: Date.now()
    })

    try {
      const result = await asyncFn()

      // Show success toast (replaces loading toast)
      const successMsg = typeof messages.success === 'function'
        ? messages.success(result)
        : messages.success

      toast.success(successMsg, { id: toastId, duration: 4000 })

      return result
    } catch (error: any) {
      // Show error toast (replaces loading toast)
      const errorMsg = typeof messages.error === 'function'
        ? messages.error(error)
        : (error?.message || messages.error)

      toast.error(errorMsg, { id: toastId, duration: 5000 })

      return null
    } finally {
      // Always clean up
      this.activeToasts.delete(operationKey)
    }
  }

  /**
   * Dismiss a specific operation's toast
   */
  dismiss(operationKey: string): void {
    const activeToast = this.activeToasts.get(operationKey)
    if (activeToast) {
      toast.dismiss(activeToast.id)
      this.activeToasts.delete(operationKey)
    }
  }

  /**
   * Dismiss all active toasts from this manager
   */
  dismissAll(): void {
    this.activeToasts.forEach((activeToast) => {
      toast.dismiss(activeToast.id)
    })
    this.activeToasts.clear()
  }

  /**
   * Get all active operation keys
   */
  getActiveOperations(): string[] {
    return Array.from(this.activeToasts.keys())
  }
}

// Export singleton instance
export const toastManager = new ToastManager()

/**
 * Quick helper for common operations
 *
 * Usage:
 * await generateWithToast('invoice-save', saveInvoice, 'Saving...', 'Saved!', 'Failed to save')
 */
export const generateWithToast = async <T>(
  operationKey: string,
  asyncFn: () => Promise<T>,
  loadingMsg: string,
  successMsg: string,
  errorMsg: string
): Promise<T | null> => {
  return toastManager.withLoading(operationKey, asyncFn, {
    loading: loadingMsg,
    success: successMsg,
    error: errorMsg
  })
}

/**
 * Example usage for E-Way Bill:
 *
 * // In your component:
 * import { toastManager } from '../utils/toastManager'
 *
 * const generateEwayBill = async (invoiceId: string) => {
 *   const result = await toastManager.withLoading(
 *     `eway-bill-${invoiceId}`, // Unique key per invoice
 *     async () => {
 *       const response = await fetch(`/api/ewaybill/generate/${invoiceId}`, {
 *         method: 'POST',
 *         headers: { 'Content-Type': 'application/json' }
 *       })
 *       if (!response.ok) throw new Error('API Error')
 *       return response.json()
 *     },
 *     {
 *       loading: 'Generating E-Way Bill...',
 *       success: (data) => `E-Way Bill Generated! No: ${data.ewayBillNo}`,
 *       error: (err) => err.message || 'Failed to generate E-Way Bill'
 *     }
 *   )
 *
 *   if (result) {
 *     // Success - do something with result
 *     console.log('E-Way Bill:', result)
 *   }
 * }
 *
 * // In your button:
 * <button
 *   onClick={() => generateEwayBill(invoice.id)}
 *   disabled={toastManager.isLoading(`eway-bill-${invoice.id}`)}
 * >
 *   {toastManager.isLoading(`eway-bill-${invoice.id}`)
 *     ? 'Generating...'
 *     : 'Generate E-Way Bill'
 *   }
 * </button>
 */

export default toastManager
