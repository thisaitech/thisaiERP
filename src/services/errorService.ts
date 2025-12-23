// Centralized Error Handling and Monitoring Service
import { toast } from 'sonner';

// Define a standard error structure
export interface AppError {
  message: string; // User-friendly message
  details?: string; // Technical details for logging
  code?: string; // Optional error code
  timestamp?: string; // When the error occurred
  userId?: string; // User who experienced the error
  context?: string; // Additional context
  severity?: 'low' | 'medium' | 'high' | 'critical'; // Error severity
}

// Error tracking for monitoring
interface ErrorMetrics {
  totalErrors: number;
  errorsByType: Record<string, number>;
  errorsByContext: Record<string, number>;
  recentErrors: AppError[];
}

let errorMetrics: ErrorMetrics = {
  totalErrors: 0,
  errorsByType: {},
  errorsByContext: {},
  recentErrors: []
};

const MAX_RECENT_ERRORS = 100;

// Get current user ID for error tracking
const getCurrentUserId = (): string | undefined => {
  try {
    const userRaw = localStorage.getItem('user');
    if (userRaw) {
      const user = JSON.parse(userRaw);
      return user.uid;
    }
  } catch {
    // Ignore parsing errors
  }
  return undefined;
};

/**
 * Enhanced error handling with monitoring and severity classification
 */
export const handleError = (error: unknown, context?: string, severity: AppError['severity'] = 'medium') => {
  const timestamp = new Date().toISOString();
  const userId = getCurrentUserId();

  let appError: AppError;

  if (error instanceof Error) {
    appError = {
      message: error.message,
      details: error.stack,
      code: (error as any).code,
      timestamp,
      userId,
      context,
      severity
    };
  } else if (typeof error === 'string') {
    appError = {
      message: error,
      timestamp,
      userId,
      context,
      severity
    };
  } else if (error && typeof error === 'object' && 'message' in error) {
    // Duck-typing for error-like objects
    appError = {
      message: String((error as any).message),
      details: JSON.stringify(error),
      code: (error as any).code,
      timestamp,
      userId,
      context,
      severity
    };
  } else {
    appError = {
      message: 'An unknown error occurred.',
      details: JSON.stringify(error),
      timestamp,
      userId,
      context,
      severity
    };
  }

  // Update error metrics
  updateErrorMetrics(appError);

  // Log the detailed error for debugging
  console.error(`[${severity.toUpperCase()}] ${context ? `in ${context}` : ''}:`, {
    message: appError.message,
    details: appError.details,
    code: appError.code,
    userId: appError.userId,
    timestamp: appError.timestamp
  });

  // Send to monitoring service in production
  if (process.env.NODE_ENV === 'production') {
    sendToMonitoring(appError);
  }

  // Show user-friendly notification based on severity
  if (severity === 'critical') {
    toast.error(`Critical error: ${appError.message}`);
  } else if (severity === 'high') {
    toast.error(appError.message);
  } else {
    toast.error(appError.message);
  }

  return appError;
};

/**
 * Update error metrics for monitoring
 */
const updateErrorMetrics = (error: AppError) => {
  errorMetrics.totalErrors++;

  // Track by error code/type
  const errorType = error.code || 'unknown';
  errorMetrics.errorsByType[errorType] = (errorMetrics.errorsByType[errorType] || 0) + 1;

  // Track by context
  const context = error.context || 'unknown';
  errorMetrics.errorsByContext[context] = (errorMetrics.errorsByContext[context] || 0) + 1;

  // Keep recent errors
  errorMetrics.recentErrors.unshift(error);
  if (errorMetrics.recentErrors.length > MAX_RECENT_ERRORS) {
    errorMetrics.recentErrors = errorMetrics.recentErrors.slice(0, MAX_RECENT_ERRORS);
  }
};

/**
 * Send error to monitoring service (placeholder for production monitoring)
 */
const sendToMonitoring = (error: AppError) => {
  // In production, integrate with services like Sentry, LogRocket, etc.
  // For now, just store locally for debugging
  try {
    const monitoringData = {
      ...error,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: error.timestamp
    };

    // Store in localStorage for debugging (in production, send to external service)
    const existingErrors = JSON.parse(localStorage.getItem('error_logs') || '[]');
    existingErrors.unshift(monitoringData);
    if (existingErrors.length > 50) { // Keep only last 50 errors
      existingErrors.splice(50);
    }
    localStorage.setItem('error_logs', JSON.stringify(existingErrors));
  } catch {
    // Ignore localStorage errors
  }
};

/**
 * Get error metrics for debugging/monitoring
 */
export const getErrorMetrics = (): ErrorMetrics => {
  return { ...errorMetrics };
};

/**
 * Clear error metrics (useful for testing)
 */
export const clearErrorMetrics = (): void => {
  errorMetrics = {
    totalErrors: 0,
    errorsByType: {},
    errorsByContext: {},
    recentErrors: []
  };
};

/**
 * Retry function with exponential backoff
 */
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  context?: string
): Promise<T> => {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const isLastAttempt = attempt === maxRetries;

      if (isLastAttempt) {
        handleError(error, context, 'high');
        throw error;
      }

      const delay = baseDelay * Math.pow(2, attempt);
      console.warn(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`, error);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error('Max retries exceeded');
};