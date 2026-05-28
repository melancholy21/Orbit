import { useState, useCallback, useRef } from 'react';

/**
 * Custom hook to wrap async actions and prevent duplicate/concurrent executions.
 * Useful for form submissions, API requests, and button clicks.
 * 
 * @param {Function} asyncCallback - The asynchronous function to wrap
 * @returns {Array} [execute, isLoading, error]
 */
export function useAsyncAction(asyncCallback) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const isPendingRef = useRef(false);

  const execute = useCallback(async (...args) => {
    if (isPendingRef.current) return;
    
    isPendingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const result = await asyncCallback(...args);
      return result;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      isPendingRef.current = false;
      setIsLoading(false);
    }
  }, [asyncCallback]);

  return [execute, isLoading, error];
}

export default useAsyncAction;
