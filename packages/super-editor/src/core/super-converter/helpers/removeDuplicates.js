/**
 * Removes duplicate values from an array, preserving the original order.
 *
 * Note: This method uses Array.prototype.includes for each element,
 * making it not performant for very large arrays (O(n^2) time complexity).
 * For large datasets, prefer using a more optimized approach.
 *
 * @param {Array} arr - The input array to filter for unique values.
 * @returns {Array} - A new array containing only unique values from the input.
 */
export const removeDuplicates = (arr) => {
  const uniqueValues = [];
  for (const item of arr) {
    if (!uniqueValues.includes(item)) {
      uniqueValues.push(item);
    }
  }
  return uniqueValues;
};
