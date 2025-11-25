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
  activePageSize: {
    w: number;
    h: number;
  };
  pendingPageSize: {
    w: number;
    h: number;
  } | null;
  activeColumns: {
    count: number;
    gap: number;
  };
  pendingColumns: {
    count: number;
    gap: number;
  } | null;
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
export declare function scheduleSectionBreak(
  block: SectionBreakBlock,
  state: SectionState,
  baseMargins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  },
): {
  decision: BreakDecision;
  state: SectionState;
};
/**
 * Apply pending margins/pageSize/columns to active values at a page boundary and clear pending.
 */
export declare function applyPendingToActive(state: SectionState): SectionState;
