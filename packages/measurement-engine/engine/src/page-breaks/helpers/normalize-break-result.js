import { normalizeBreakEntry } from './index.js';

/**
 * Normalize a break result object so coordinates are relative to a page baseline.
 *
 * @param {{primary?:{pos:number,top:number,bottom:number},all?:Array<{pos:number,top:number,bottom:number}>}|{pos:number,top:number,bottom:number}|null} breakPoint Break definition from measurement routines.
 * @param {number} offset Baseline offset to subtract.
 * @returns {{primary:{pos:number,top:number,bottom:number}|null,rows:Array<{pos:number,top:number,bottom:number}>|null}}
 */
export function normalizeBreakResult(breakPoint, offset) {
  if (!breakPoint) {
    return { primary: null, rows: null };
  }

  const primary = 'primary' in breakPoint ? breakPoint.primary : breakPoint;
  const normalizedPrimary = normalizeBreakEntry(primary, offset);
  const rows =
    'all' in breakPoint && Array.isArray(breakPoint.all)
      ? breakPoint.all.map((entry) => normalizeBreakEntry(entry, offset)).filter(Boolean)
      : null;

  const normalizedRows = rows && rows.length ? rows : null;

  return {
    primary: normalizedPrimary,
    rows: normalizedRows,
  };
}
