import { normalizeVerticalBounds } from './index.js';

/**
 * Normalize a single break entry relative to the provided page baseline.
 *
 * @param {{pos:number,top:number,bottom:number}|null} entry Break metadata to normalize.
 * @param {number} offset Baseline offset to subtract from the coordinates.
 * @returns {{pos:number,top:number,bottom:number}|null} Normalized entry or null when the input is falsy.
 */
export function normalizeBreakEntry(entry, offset) {
  if (!entry) return null;
  const top = normalizeVerticalBounds(entry.top, offset);
  const bottom = normalizeVerticalBounds(entry.bottom, offset);
  return {
    pos: entry.pos,
    top,
    bottom,
  };
}
