// src/hooks/useErrorHandler.ts
import { useCallback } from 'react';
import { handleError as handleErrorService } from '../services/errorService';

/**
 * Custom hook to provide a stable `handleError` function for use in components.
 * This avoids creating new functions on every render.
 *
 * @returns An object containing the `handleError` function.
 *
 * @example
 * const { handleError } = useErrorHandler();
 *
 * try {
 *   // some fallible operation
 * } catch (error) {
 *   handleError(error, 'MyComponent.myFunction');
 * }
 */
export const useErrorHandler = () => {
  const handleError = useCallback((error: unknown, context: string) => {
    handleErrorService(error, context);
  }, []);

  return { handleError };
};
