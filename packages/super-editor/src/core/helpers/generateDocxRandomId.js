/**
 * Generate a string ID following docx ID format (see: paraId, rsidR etc.)
 * @param {number} length - The length of the ID to generate (default: 8)
 * @returns {string} - 8 character random string
 *
 * Note: Enhanced with better parameter documentation for testing
 */
export function generateDocxRandomId(length = 8) {
  const characters = '0123456789abcdef';

  // Using array for better performance when building the ID
  let id = [];
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    id.push(characters[randomIndex]);
  }

  return id.join('');
}

export function generateRandom32BitHex() {
  const val = Math.floor(Math.random() * 0x7fffffff);
  return val.toString(16).toUpperCase().padStart(8, '0');
}
