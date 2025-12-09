import type { SectionBreakBlock } from '@superdoc/contracts';

export type SectionState = {
  activeTopMargin: number;
  activeBottomMargin: number;
  pendingTopMargin: number | null;
  pendingBottomMargin: number | null;
  activeHeaderDistance: number;
  activeFooterDistance: number;
  pendingHeaderDistance: number | null;
  pendingFooterDistance: number | null;
  activePageSize: { w: number; h: number };
  pendingPageSize: { w: number; h: number } | null;
  activeColumns: { count: number; gap: number };
  pendingColumns: { count: number; gap: number } | null;
  activeOrientation: 'portrait' | 'landscape' | null;
  pendingOrientation: 'portrait' | 'landscape' | null;
  hasAnyPages: boolean;
};

export type BreakDecision = {
  forcePageBreak: boolean;
  forceMidPageRegion: boolean;
  requiredParity?: 'even' | 'odd';
};

/**
 * Schedule section break effects by updating pending/active state and returning a break decision.
 *
 * This function analyzes a section break block to determine what layout changes should occur
 * (e.g., page break, column changes) and schedules the new section properties (margins, page size,
 * columns) to be applied at the appropriate boundary. It is pure with respect to inputs/outputs
 * and does not mutate external variables.
 *
 * The function handles special cases like the first section (applied immediately to active state)
 * and accounts for header content height to prevent header/body overlap.
 *
 * @param block - The section break block with margin/page/column settings
 * @param state - Current section state containing active and pending layout properties
 * @param baseMargins - Base document margins in pixels (top, bottom, left, right)
 * @param maxHeaderContentHeight - Maximum header content height in pixels across all header variants.
 *        When provided (> 0), ensures body content starts below header content by adjusting top margin
 *        to be at least headerDistance + maxHeaderContentHeight. Defaults to 0 (no header overlap prevention).
 * @returns Object containing:
 *   - decision: Break decision with flags for page breaks, mid-page regions, and parity requirements
 *   - state: Updated section state with scheduled pending properties
 * @example
 * ```typescript
 * // Schedule a next-page section break with new margins
 * const { decision, state: newState } = scheduleSectionBreak(
 *   {
 *     kind: 'sectionBreak',
 *     type: 'nextPage',
 *     margins: { top: 72, bottom: 72, header: 36, footer: 36 },
 *     columns: { count: 2, gap: 24 }
 *   },
 *   currentState,
 *   { top: 72, bottom: 72, left: 72, right: 72 },
 *   48 // header content height
 * );
 * // decision.forcePageBreak === true
 * // newState.pendingTopMargin === Math.max(72, 36 + 48) = 84
 * ```
 */
export function scheduleSectionBreak(
  block: SectionBreakBlock,
  state: SectionState,
  baseMargins: { top: number; bottom: number; left: number; right: number },
  maxHeaderContentHeight: number = 0,
): { decision: BreakDecision; state: SectionState } {
  const next = { ...state };

  // Helper to calculate required top margin that accounts for header content height
  const calcRequiredTopMargin = (headerDistance: number, baseTop: number): number => {
    if (maxHeaderContentHeight > 0) {
      // Body must start at least at headerDistance + headerContentHeight
      return Math.max(baseTop, headerDistance + maxHeaderContentHeight);
    }
    return Math.max(baseTop, headerDistance);
  };

  // Special handling for first section break (appears before any content)
  if (block.attrs?.isFirstSection && !next.hasAnyPages) {
    if (block.pageSize) {
      next.activePageSize = { w: block.pageSize.w, h: block.pageSize.h };
      next.pendingPageSize = null;
    }
    if (block.orientation) {
      next.activeOrientation = block.orientation;
      next.pendingOrientation = null;
    }
    if (block.margins?.header !== undefined) {
      const headerDistance = Math.max(0, block.margins.header);
      next.activeHeaderDistance = headerDistance;
      next.pendingHeaderDistance = headerDistance;
      // Account for actual header content height
      next.activeTopMargin = calcRequiredTopMargin(headerDistance, baseMargins.top);
      next.pendingTopMargin = next.activeTopMargin;
    }
    if (block.margins?.footer !== undefined) {
      const footerDistance = Math.max(0, block.margins.footer);
      next.activeFooterDistance = footerDistance;
      next.pendingFooterDistance = footerDistance;
      next.activeBottomMargin = Math.max(baseMargins.bottom, footerDistance);
      next.pendingBottomMargin = next.activeBottomMargin;
    }
    if (block.columns) {
      next.activeColumns = { count: block.columns.count, gap: block.columns.gap };
      next.pendingColumns = null;
    }
    return { decision: { forcePageBreak: false, forceMidPageRegion: false }, state: next };
  }

  // Update pending margins (take max to ensure header/footer space)
  const headerPx = block.margins?.header;
  const footerPx = block.margins?.footer;
  const nextTop = next.pendingTopMargin ?? next.activeTopMargin;
  const nextBottom = next.pendingBottomMargin ?? next.activeBottomMargin;
  const nextHeader = next.pendingHeaderDistance ?? next.activeHeaderDistance;
  const nextFooter = next.pendingFooterDistance ?? next.activeFooterDistance;

  // When header margin changes, recalculate top margin accounting for header content height
  if (typeof headerPx === 'number') {
    const newHeaderDist = Math.max(0, headerPx);
    next.pendingHeaderDistance = newHeaderDist;
    next.pendingTopMargin = calcRequiredTopMargin(newHeaderDist, baseMargins.top);
  } else {
    next.pendingTopMargin = nextTop;
    next.pendingHeaderDistance = nextHeader;
  }
  next.pendingBottomMargin = typeof footerPx === 'number' ? Math.max(baseMargins.bottom, footerPx) : nextBottom;
  next.pendingFooterDistance = typeof footerPx === 'number' ? Math.max(0, footerPx) : nextFooter;

  // Schedule page size change if present
  if (block.pageSize) {
    next.pendingPageSize = { w: block.pageSize.w, h: block.pageSize.h };
  }

  // Schedule orientation change if present
  if (block.orientation) {
    next.pendingOrientation = block.orientation;
  }

  // Determine section type
  const sectionType = block.type ?? 'continuous';

  // Detect column changes
  const isColumnsChanging =
    !!block.columns &&
    (block.columns.count !== next.activeColumns.count || block.columns.gap !== next.activeColumns.gap);

  // Word behavior parity override: require page boundary mid-page when necessary
  if (block.attrs?.requirePageBoundary) {
    if (block.columns) {
      next.pendingColumns = { count: block.columns.count, gap: block.columns.gap };
    }
    return { decision: { forcePageBreak: true, forceMidPageRegion: false }, state: next };
  }

  switch (sectionType) {
    case 'nextPage': {
      if (block.columns) {
        next.pendingColumns = { count: block.columns.count, gap: block.columns.gap };
      }
      return { decision: { forcePageBreak: true, forceMidPageRegion: false }, state: next };
    }
    case 'evenPage': {
      if (block.columns) {
        next.pendingColumns = { count: block.columns.count, gap: block.columns.gap };
      }
      return {
        decision: { forcePageBreak: true, forceMidPageRegion: false, requiredParity: 'even' },
        state: next,
      };
    }
    case 'oddPage': {
      if (block.columns) {
        next.pendingColumns = { count: block.columns.count, gap: block.columns.gap };
      }
      return {
        decision: { forcePageBreak: true, forceMidPageRegion: false, requiredParity: 'odd' },
        state: next,
      };
    }
    case 'continuous':
    default: {
      if (isColumnsChanging) {
        // Change columns mid-page
        return { decision: { forcePageBreak: false, forceMidPageRegion: true }, state: next };
      }
      if (block.columns) {
        next.pendingColumns = { count: block.columns.count, gap: block.columns.gap };
      }
      return { decision: { forcePageBreak: false, forceMidPageRegion: false }, state: next };
    }
  }
}

/**
 * Apply pending margins/pageSize/columns/orientation to active values at a page boundary and clear pending.
 */
export function applyPendingToActive(state: SectionState): SectionState {
  const next: SectionState = { ...state };
  if (next.pendingTopMargin != null) {
    next.activeTopMargin = next.pendingTopMargin;
  }
  if (next.pendingBottomMargin != null) {
    next.activeBottomMargin = next.pendingBottomMargin;
  }
  if (next.pendingHeaderDistance != null) {
    next.activeHeaderDistance = next.pendingHeaderDistance;
  }
  if (next.pendingFooterDistance != null) {
    next.activeFooterDistance = next.pendingFooterDistance;
  }
  if (next.pendingPageSize != null) {
    next.activePageSize = next.pendingPageSize;
  }
  if (next.pendingColumns != null) {
    next.activeColumns = next.pendingColumns;
  }
  if (next.pendingOrientation != null) {
    next.activeOrientation = next.pendingOrientation;
  }
  next.pendingTopMargin = null;
  next.pendingBottomMargin = null;
  next.pendingHeaderDistance = null;
  next.pendingFooterDistance = null;
  next.pendingPageSize = null;
  next.pendingColumns = null;
  next.pendingOrientation = null;
  return next;
}
