/**
 * Clamp a number between a min and max value.
 * If the value is not a finite number, it will return the min value.
 * @param {number} value The value to clamp
 * @param {number} min The minimum value
 * @param {number} max The maximum value
 * @returns {number} The clamped value
 */
export function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}
