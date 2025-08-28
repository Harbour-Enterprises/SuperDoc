/**
 * Auto-assign a prefix for a given target namespace.
 * @param {string} tns - The target namespace
 * @param {Object} nsMap - The namespace map
 * @returns {string} - The assigned prefix
 */
export const autoPrefix = (tns, nsMap) => {
  if (!tns) return 'unknown';
  if (nsMap[tns]) return nsMap[tns];
  const newPrefix = 'g' + Object.keys(nsMap).length;
  nsMap[tns] = newPrefix;
  return newPrefix;
};
