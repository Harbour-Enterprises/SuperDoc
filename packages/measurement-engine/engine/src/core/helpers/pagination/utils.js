/**
 * Clamp a numeric value into a specified range.
 * @param {number} value - Candidate value.
 * @param {number} min - Lower bound.
 * @param {number} max - Upper bound.
 * @returns {number} Clamped value.
 */
export const clampNumber = (value, min, max) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    if (Number.isFinite(min)) return min;
    if (Number.isFinite(max)) return max;
    return value;
  }
  if (Number.isFinite(min) && numeric < min) {
    return min;
  }
  if (Number.isFinite(max) && numeric > max) {
    return max;
  }
  return numeric;
};

/**
 * Clamp a document position to a valid range.
 * @param {number} value - Document position candidate.
 * @param {number} docSize - Document size (content length).
 * @returns {number} Clamped position.
 */
export const clampToDoc = (value, docSize) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  if (Number.isFinite(docSize)) {
    if (numeric < 0) return 0;
    if (numeric > docSize) return docSize;
  }
  return numeric;
};
