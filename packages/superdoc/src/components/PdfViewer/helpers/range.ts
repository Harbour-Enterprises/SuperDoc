/**
 * Generate an array of numbers in a specified range
 *
 * Creates an array containing consecutive integers from start (inclusive)
 * to end (exclusive), similar to Python's range() or lodash's _.range().
 *
 * @param start - The starting number (inclusive)
 * @param end - The ending number (exclusive)
 * @returns Array of numbers from start to end-1
 *
 * @example
 * range(1, 5)   // Returns [1, 2, 3, 4]
 * range(0, 3)   // Returns [0, 1, 2]
 * range(5, 5)   // Returns []
 * range(10, 13) // Returns [10, 11, 12]
 */
export const range = (start: number, end: number): number[] => {
  const length = end - start;
  return Array.from({ length }, (_, i) => start + i);
};
