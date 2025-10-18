/**
 * Translate a vertical coordinate by a page baseline offset.
 *
 * @param {number} value Coordinate value to normalise.
 * @param {number} offset Baseline offset in pixels.
 * @returns {number} Normalised coordinate.
 */
export function normalizeVerticalBounds(value, offset) {
  if (!Number.isFinite(value)) return value;
  return value - offset;
}
