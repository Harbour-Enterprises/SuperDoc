// @ts-check
/**
 * Table border configuration
 * @typedef {Object} TableBorder
 * @property {number} [size=1] - Border width in pixels
 * @property {string} [color='#000000'] - Border color (hex or CSS color)
 * @property {string} [style='solid'] - Border style (solid, dashed, dotted)
 */

/**
 * Table borders object
 * @typedef {Object} TableBorders
 * @property {TableBorder} [top] - Top border configuration
 * @property {TableBorder} [right] - Right border configuration
 * @property {TableBorder} [bottom] - Bottom border configuration
 * @property {TableBorder} [left] - Left border configuration
 * @property {TableBorder} [insideH] - Inside horizontal borders
 * @property {TableBorder} [insideV] - Inside vertical borders
 */
/**
 * Border creation options
 * @typedef {Object} BorderOptions
 * @property {number} [size=0.66665] - Border width in pixels
 * @property {string} [color='#000000'] - Border color (hex)
 */

/**
 * Create table border configuration object
 * @private
 * @category Helper
 * @param {BorderOptions} [options] - Border options
 * @returns {TableBorders} Complete borders object for all sides
 * @example
 * // Using default values
 * const borders = createTableBorders()
 *
 * // Using custom values
 * const borders = createTableBorders({ size: 1, color: '#cccccc' })
 * @note Creates uniform borders for all sides including inside borders
 */
export const createTableBorders = ({ size = 0.66665, color = '#000000' } = {}) => {
  return {
    top: { size, color },
    left: { size, color },
    bottom: { size, color },
    right: { size, color },
    insideH: { size, color },
    insideV: { size, color },
  };
};
