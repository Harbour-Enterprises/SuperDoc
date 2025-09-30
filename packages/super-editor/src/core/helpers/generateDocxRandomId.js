/**
 * Generate a string ID following docx ID format (see: paraId, rsidR etc.)
 * @returns {string} - 8 character random string
 */
export function generateDocxRandomId(length = 8) {
  const characters = '0123456789abcdef';

  let id = [];
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    id.push(characters[randomIndex]);
  }

  return id.join('');
}

/**
 * Generate a random signed 32-bit integer as a string.
 * @returns {string} A random signed 32-bit integer as a string
 */
export function generateRandomSigned32BitIntStrId() {
  const val = Math.floor(Math.random() * 0x7fffffff);
  return val.toString();
}

export function generateRandom32BitHex() {
  const val = Math.floor(Math.random() * 0x7fffffff);
  return val.toString(16).toUpperCase().padStart(8, '0');
}
