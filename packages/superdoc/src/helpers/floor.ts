/**
 * Floors a number to a specified precision
 *
 * @param val - The value to floor
 * @param precision - The number of decimal places to round to (default: 0)
 * @returns The floored value with the specified precision
 *
 * @example
 * floor(3.456, 2) // Returns 3.45
 * floor(3.456, 1) // Returns 3.4
 * floor(3.456)    // Returns 3
 */
export const floor = (val: number, precision?: number): number => {
  const multiplier = 10 ** (precision || 0);
  return Math.floor(val * multiplier) / multiplier;
};
