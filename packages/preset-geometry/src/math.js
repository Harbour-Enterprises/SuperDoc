import { ANGLE_UNITS } from './constants.js';

/**
 * Normalizes non-finite numbers into zero for downstream calculations.
 *
 * @param {number} value Numeric value to sanitize.
 * @returns {number} Finite number or zero.
 */
export function sanitizeNumber(value) {
  if (Number.isNaN(value) || !Number.isFinite(value)) {
    return 0;
  }
  return value;
}

/**
 * Checks whether a token is a numeric literal recognised by DrawingML.
 *
 * @param {string|null|undefined} token Token to evaluate.
 * @returns {boolean} True when the token represents a number.
 */
export function isNumericToken(token) {
  return typeof token === 'string' && /^-?\d+(?:\.\d+)?$/.test(token.trim());
}

/**
 * Converts DrawingML angle units into radians.
 *
 * @param {number} angle Angle in DrawingML units (1/60000 of a degree).
 * @returns {number} Angle expressed in radians.
 */
export function angleToRadians(angle) {
  return (angle / ANGLE_UNITS) * (Math.PI / 180);
}

/**
 * Converts radians into DrawingML angle units.
 *
 * @param {number} radians Angle expressed in radians.
 * @returns {number} Angle expressed in DrawingML units.
 */
export function radiansToAngleUnits(radians) {
  return Math.round((radians * 180 * ANGLE_UNITS) / Math.PI);
}

/**
 * Calculates the Euclidean norm of a 2D vector (Pythagorean theorem).
 *
 * @param {number} a X component.
 * @param {number} b Y component.
 * @returns {number} Vector magnitude.
 */
export function hypot2(a, b) {
  return Math.sqrt(a * a + b * b);
}
