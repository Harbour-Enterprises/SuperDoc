import type { SectionBreakBlock } from '@superdoc/contracts';

export type SectionState = {
  activeTopMargin: number;
  activeBottomMargin: number;
  activeLeftMargin: number;
  activeRightMargin: number;
  pendingTopMargin: number | null;
  pendingBottomMargin: number | null;
  pendingLeftMargin: number | null;
  pendingRightMargin: number | null;
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
 * @param maxFooterContentHeight - Maximum footer content height in pixels across all footer variants.
 *        When provided (> 0), ensures body content ends above footer content by adjusting bottom margin
 *        to be at least footerDistance + maxFooterContentHeight. Defaults to 0 (no footer overlap prevention).
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
  maxFooterContentHeight: number = 0,
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

  // Helper to calculate required bottom margin that accounts for footer content height
  const calcRequiredBottomMargin = (footerDistance: number, baseBottom: number): number => {
    if (maxFooterContentHeight > 0) {
      // Body must end at least at footerDistance + footerContentHeight from page bottom
      return Math.max(baseBottom, footerDistance + maxFooterContentHeight);
    }
    return Math.max(baseBottom, footerDistance);
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
    const headerDistance =
      typeof block.margins?.header === 'number' ? Math.max(0, block.margins.header) : next.activeHeaderDistance;
    const footerDistance =
      typeof block.margins?.footer === 'number' ? Math.max(0, block.margins.footer) : next.activeFooterDistance;
    const sectionTop = typeof block.margins?.top === 'number' ? Math.max(0, block.margins.top) : baseMargins.top;
    const sectionBottom =
      typeof block.margins?.bottom === 'number' ? Math.max(0, block.margins.bottom) : baseMargins.bottom;
    if (block.margins?.header !== undefined) {
      next.activeHeaderDistance = headerDistance;
      next.pendingHeaderDistance = headerDistance;
    }
    if (block.margins?.footer !== undefined) {
      next.activeFooterDistance = footerDistance;
      next.pendingFooterDistance = footerDistance;
    }
    if (block.margins?.top !== undefined || block.margins?.header !== undefined) {
      next.activeTopMargin = calcRequiredTopMargin(headerDistance, sectionTop);
      next.pendingTopMargin = next.activeTopMargin;
    }
    if (block.margins?.bottom !== undefined || block.margins?.footer !== undefined) {
      next.activeBottomMargin = calcRequiredBottomMargin(footerDistance, sectionBottom);
      next.pendingBottomMargin = next.activeBottomMargin;
    }
    if (block.margins?.left !== undefined) {
      const leftMargin = Math.max(0, block.margins.left);
      next.activeLeftMargin = leftMargin;
      next.pendingLeftMargin = leftMargin;
    }
    if (block.margins?.right !== undefined) {
      const rightMargin = Math.max(0, block.margins.right);
      next.activeRightMargin = rightMargin;
      next.pendingRightMargin = rightMargin;
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
  const topPx = block.margins?.top;
  const bottomPx = block.margins?.bottom;
  const nextTop = next.pendingTopMargin ?? next.activeTopMargin;
  const nextBottom = next.pendingBottomMargin ?? next.activeBottomMargin;
  const nextLeft = next.pendingLeftMargin ?? next.activeLeftMargin;
  const nextRight = next.pendingRightMargin ?? next.activeRightMargin;
  const nextHeader = next.pendingHeaderDistance ?? next.activeHeaderDistance;
  const nextFooter = next.pendingFooterDistance ?? next.activeFooterDistance;

  // When header margin changes, recalculate top margin accounting for header content height
  if (typeof headerPx === 'number' || typeof topPx === 'number') {
    const newHeaderDist = typeof headerPx === 'number' ? Math.max(0, headerPx) : nextHeader;
    const sectionTop = typeof topPx === 'number' ? Math.max(0, topPx) : baseMargins.top;
    next.pendingHeaderDistance = newHeaderDist;
    next.pendingTopMargin = calcRequiredTopMargin(newHeaderDist, sectionTop);
  } else {
    next.pendingTopMargin = nextTop;
    next.pendingHeaderDistance = nextHeader;
  }

  // When footer margin changes, recalculate bottom margin accounting for footer content height
  if (typeof footerPx === 'number' || typeof bottomPx === 'number') {
    const newFooterDist = typeof footerPx === 'number' ? Math.max(0, footerPx) : nextFooter;
    const sectionBottom = typeof bottomPx === 'number' ? Math.max(0, bottomPx) : baseMargins.bottom;
    next.pendingFooterDistance = newFooterDist;
    next.pendingBottomMargin = calcRequiredBottomMargin(newFooterDist, sectionBottom);
  } else {
    next.pendingBottomMargin = nextBottom;
    next.pendingFooterDistance = nextFooter;
  }

  // Update pending left/right margins
  if (typeof block.margins?.left === 'number') {
    next.pendingLeftMargin = Math.max(0, block.margins.left);
  } else {
    next.pendingLeftMargin = nextLeft;
  }
  if (typeof block.margins?.right === 'number') {
    next.pendingRightMargin = Math.max(0, block.margins.right);
  } else {
    next.pendingRightMargin = nextRight;
  }

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
  if (next.pendingLeftMargin != null) {
    next.activeLeftMargin = next.pendingLeftMargin;
  }
  if (next.pendingRightMargin != null) {
    next.activeRightMargin = next.pendingRightMargin;
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
  next.pendingLeftMargin = null;
  next.pendingRightMargin = null;
  next.pendingHeaderDistance = null;
  next.pendingFooterDistance = null;
  next.pendingPageSize = null;
  next.pendingColumns = null;
  next.pendingOrientation = null;
  return next;
}
