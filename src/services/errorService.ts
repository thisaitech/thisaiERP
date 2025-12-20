// src/services/errorService.ts
import { toast } from 'sonner';

/**
 * Extracts a user-friendly error message from an unknown error type.
 * @param error The error object.
 * @param defaultMessage The message to return if the error is not an Error instance.
 * @returns A string containing the error message.
 */
const getErrorMessage = (error: unknown, defaultMessage: string = 'An unexpected error occurred.'): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return defaultMessage;
};

/**
 * A centralized function for handling and reporting errors.
 * It logs the full error to the console for debugging and shows a user-friendly
 * toast notification.
 *
 * @param error The error caught in a catch block (should be of type `unknown`).
 * @param context A string providing context where the error occurred (e.g., 'Component.functionName').
 */
export const handleError = (error: unknown, context: string) => {
  // Log the full error for debugging purposes
  console.error(`Error in ${context}:`, error);

  // Get a user-friendly message
  const message = getErrorMessage(error);

  // Show a toast notification to the user
  toast.error(message);
};
