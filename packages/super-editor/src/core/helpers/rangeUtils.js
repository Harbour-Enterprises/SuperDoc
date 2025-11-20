/**
 * Merge overlapping or adjacent ranges
 * @param {Array<[number, number]>} ranges - Array of [from, to] ranges
 * @returns {Array<[number, number]>} Merged ranges sorted by start position
 */
export const mergeRanges = (ranges) => {
  if (ranges.length === 0) return [];

  // Sort ranges by start position and clone to avoid mutating callers
  const sorted = [...ranges].sort((a, b) => a[0] - b[0]).map((range) => [...range]);
  const merged = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const lastMerged = merged[merged.length - 1];

    // If current range overlaps or is adjacent to last merged range, merge them
    if (current[0] <= lastMerged[1]) {
      lastMerged[1] = Math.max(lastMerged[1], current[1]);
    } else {
      merged.push(current);
    }
  }

  return merged;
};

/**
 * Clamp a range to be within document bounds
 * @param {number} start - Start position
 * @param {number} end - End position
 * @param {number} docSize - Document size
 * @returns {[number, number]|null} Clamped [start, end] range, or null if range is invalid
 *
 * @description
 * Returns null when:
 * - The range is zero-length (start === end) after clamping
 * - The range is inverted (start > end) after clamping
 * - The range is completely outside document bounds
 *
 * Note: Zero-length ranges (point ranges) are considered invalid and will return null.
 * Use this function when you need ranges that span at least one position.
 *
 * @example
 * clampRange(10, 20, 100)   // => [10, 20] - valid range
 * clampRange(50, 50, 100)   // => null - zero-length range
 * clampRange(-10, 20, 100)  // => [0, 20] - start clamped to 0
 * clampRange(10, 150, 100)  // => [10, 100] - end clamped to docSize
 * clampRange(150, 200, 100) // => null - completely out of bounds
 */
export const clampRange = (start, end, docSize) => {
  const safeStart = Math.max(0, Math.min(start, docSize));
  const safeEnd = Math.max(0, Math.min(end, docSize));

  if (safeStart >= safeEnd) {
    return null;
  }

  return [safeStart, safeEnd];
};
