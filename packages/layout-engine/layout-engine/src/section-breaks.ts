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
 * This function is pure with respect to inputs/outputs and does not mutate external variables.
 */
export function scheduleSectionBreak(
  block: SectionBreakBlock,
  state: SectionState,
  baseMargins: { top: number; bottom: number; left: number; right: number },
): { decision: BreakDecision; state: SectionState } {
  const next = { ...state };

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
      next.activeTopMargin = Math.max(baseMargins.top, headerDistance);
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
  next.pendingTopMargin = typeof headerPx === 'number' ? Math.max(baseMargins.top, headerPx) : nextTop;
  next.pendingBottomMargin = typeof footerPx === 'number' ? Math.max(baseMargins.bottom, footerPx) : nextBottom;
  next.pendingHeaderDistance = typeof headerPx === 'number' ? Math.max(0, headerPx) : nextHeader;
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
