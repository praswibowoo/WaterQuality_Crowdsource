import { useState, useEffect } from 'react';

/**
 * Debounce a value by a specified delay.
 * Returns a debounced version of the input value that only updates
 * after the specified delay has passed without changes.
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
