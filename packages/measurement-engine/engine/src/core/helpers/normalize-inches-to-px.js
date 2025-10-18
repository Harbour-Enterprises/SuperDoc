import { MeasurementEngine } from '../measurement-engine';

/**
 * Convert inches to pixels
 * @param {number} value Value in inches
 * @returns {number|null} Value in pixels or null if invalid
 */
export const inchesToPixels = (value) => {
  if (!Number.isFinite(value)) return null;
  return value * MeasurementEngine.PIXELS_PER_INCH;
};

/**
 * Convert inches to pixels for an object of sizes
 * e.g. { top: 1, bottom: 1, left: 1, right: 1 }
 * If a value is not a finite number, it will be ignored and the fallback value will be used.
 * @param {Object} sizes Object with size values in inches
 * @returns {Object} Object with size values in pixels
 */
export const normalizeInchesToPx = (sizes = {}) => {
  const result = {};
  if (!sizes || typeof sizes !== 'object') {
    return result;
  }

  Object.entries(sizes).forEach(([key, value]) => {
    const px = inchesToPixels(value);
    if (px != null) {
      result[key] = px;
    }
  });

  return result;
};
