/**
 * Error handling utilities for consistent error processing across the app
 */

/**
 * Extracts a user-friendly error message from an unknown error object
 * @param error - The caught error (unknown type)
 * @param fallbackMessage - Optional fallback message if error cannot be parsed
 * @returns A string error message safe to display to users
 */
export const getErrorMessage = (error: unknown, fallbackMessage = "An unexpected error occurred"): string => {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === "string") {
    return error;
  }
  
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }
  
  return fallbackMessage;
};

/**
 * Logs an error to the console with context information
 * @param context - Context string describing where the error occurred
 * @param error - The caught error
 */
export const logError = (context: string, error: unknown): void => {
  console.error(`[${context}]`, error);
};

/**
 * Handles an error by logging it and returning a user-friendly message
 * @param context - Context string describing where the error occurred
 * @param error - The caught error
 * @param fallbackMessage - Optional fallback message
 * @returns A string error message safe to display to users
 */
export const handleError = (
  context: string,
  error: unknown,
  fallbackMessage?: string
): string => {
  logError(context, error);
  return getErrorMessage(error, fallbackMessage);
};
