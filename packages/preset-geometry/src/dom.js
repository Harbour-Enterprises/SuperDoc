/**
 * Creates a DOMParser instance if the environment provides one.
 *
 * @throws {Error} When DOMParser is not globally available.
 * @returns {DOMParser} A DOMParser implementation.
 */
export function ensureDomParser() {
  if (typeof DOMParser !== 'undefined') {
    return new DOMParser();
  }
  throw new Error('DOMParser is not available. In Node.js install @xmldom/xmldom and assign global.DOMParser.');
}

/**
 * Removes a UTF-8 byte order mark from the provided string, if present.
 *
 * @param {string|null|undefined} input Source string that may contain a BOM.
 * @returns {string} The sanitized string without a leading BOM.
 */
export function stripBom(input) {
  if (!input) return '';
  if (input.charCodeAt(0) === 0xfeff) {
    return input.slice(1);
  }
  return input;
}
