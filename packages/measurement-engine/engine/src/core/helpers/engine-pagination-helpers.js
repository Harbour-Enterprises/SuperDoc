import {
  computeNextVisualTop,
  calculateSpacingAfterPage,
  snapshotMeasurementDocument,
  createFallbackRect,
  resolvePageWidthPx,
  resolveContentWidthPx,
  getSafeNumber,
} from './pagination/common.js';
import {
  normalizeLayout,
  createHeaderFooterAreas,
  formatHeaderFooterArea,
  resolvePageLayoutForIndex,
} from './pagination/layout.js';
import { recordBreak, finalizePages, createPageEntry } from './pagination/state.js';
import { findTableRowOverflow } from './pagination/table-overflow.js';
import { checkForHardBreak } from './pagination/hard-breaks.js';
import { getExactBreakPosition } from './pagination/break-position.js';

export const ENGINE_PAGINATION_INTERNALS = {
  computeNextVisualTop,
  calculateSpacingAfterPage,
  getExactBreakPosition,
  findTableRowOverflow,
  recordBreak,
  finalizePages,
  createPageEntry,
  normalizeLayout,
  createHeaderFooterAreas,
  formatHeaderFooterArea,
  snapshotMeasurementDocument,
  createFallbackRect,
  resolvePageWidthPx,
  resolveContentWidthPx,
  getSafeNumber,
  resolvePageLayoutForIndex,
  checkForHardBreak,
};
