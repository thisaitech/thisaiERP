// Centralized Error Handling Service
import { toast } from 'sonner';

// Define a standard error structure
export interface AppError {
  message: string; // User-friendly message
  details?: string; // Technical details for logging
  code?: string; // Optional error code
}

/**
 * Handles errors consistently across the application.
 * Logs the error for debugging and shows a user-friendly toast notification.
 *
 * @param error The error object (can be of any type).
 * @param context A string providing context where the error occurred (e.g., 'AuthService.signIn').
 */
export const handleError = (error: unknown, context?: string) => {
  let appError: AppError;

  if (error instanceof Error) {
    appError = {
      message: error.message,
      details: error.stack,
    };
  } else if (typeof error === 'string') {
    appError = {
      message: error,
    };
  } else if (error && typeof error === 'object' && 'message' in error) {
    // Duck-typing for error-like objects
    appError = {
      message: String((error as any).message),
      details: JSON.stringify(error),
    };
  } else {
    appError = {
      message: 'An unknown error occurred.',
      details: JSON.stringify(error),
    };
  }

  // Log the detailed error for debugging
  console.error(`[Error] ${context ? `in ${context}` : ''}:`, {
    message: appError.message,
    details: appError.details,
    originalError: error,
  });

  // Show a user-friendly toast notification
  toast.error(appError.message);

  return appError;
};