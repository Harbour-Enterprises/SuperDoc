/**
 * Tab Stop Normalization Module
 *
 * Functions for normalizing OOXML tab stop specifications.
 */

import type { TabStop } from '@superdoc/contracts';
import { pickNumber } from '../utilities.js';

/**
 * Pass through OOXML tab stops with minimal normalization.
 * SuperConverter provides: { val, pos (in px), originalPos (in twips), leader }
 * We prefer originalPos (exact OOXML twips) when available, otherwise convert px→twips.
 */
export const normalizeOoxmlTabs = (tabs: unknown): TabStop[] | undefined => {
  if (!Array.isArray(tabs)) return undefined;
  const normalized: TabStop[] = [];

  for (const entry of tabs) {
    if (!entry || typeof entry !== 'object') continue;
    const source = entry as Record<string, unknown>;

    // Use originalPos (twips) if available, otherwise convert px to twips
    let posTwips: number | undefined;
    const originalPos = pickNumber(source.originalPos);
    if (originalPos != null) {
      posTwips = originalPos; // Already in twips from OOXML
    } else {
      const posPx = pickNumber(source.pos ?? source.position ?? source.offset);
      if (posPx != null) {
        // px → twips at 96 DPI: 1in = 96px, 1in = 1440 twips → 1px = 15 twips
        posTwips = Math.round(posPx * 15);
      }
    }
    if (posTwips == null) continue;

    const val = normalizeTabVal(source.val ?? source.align ?? source.alignment ?? source.type);
    if (!val) continue;

    const tab: TabStop = {
      val,
      pos: posTwips,
    };

    const leader = normalizeTabLeader(source.leader);
    if (leader) tab.leader = leader;

    normalized.push(tab);
  }

  return normalized.length > 0 ? normalized : undefined;
};

/**
 * Normalize tab alignment value to OOXML 'val' format.
 * Maps legacy 'left'/'right' to OOXML 'start'/'end' for RTL support.
 */
export const normalizeTabVal = (value: unknown): TabStop['val'] | undefined => {
  switch (value) {
    case 'start':
    case 'center':
    case 'end':
    case 'decimal':
    case 'bar':
    case 'clear':
      return value;
    case 'left':
      return 'start'; // Legacy mapping
    case 'right':
      return 'end'; // Legacy mapping
    case 'dec':
      return 'decimal';
    default:
      return undefined;
  }
};

/**
 * Normalize tab leader value to OOXML format.
 * Now supports 'heavy' directly (OOXML native).
 */
export const normalizeTabLeader = (value: unknown): TabStop['leader'] | undefined => {
  switch (value) {
    case 'none':
    case 'dot':
    case 'hyphen':
    case 'heavy':
    case 'underscore':
    case 'middleDot':
      return value;
    case 'thick':
      return 'heavy'; // Map legacy 'thick' to OOXML 'heavy'
    default:
      return undefined;
  }
};
