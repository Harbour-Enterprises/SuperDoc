import type { FlowBlock, Fragment, Layout, Measure, Page, PainterDOM, PageMargins } from '@superdoc/contracts';
import { DomPainter } from './renderer.js';
import type { PageStyles } from './styles.js';

// Re-export constants
export { DOM_CLASS_NAMES } from './constants.js';
export type { DomClassName } from './constants.js';

// Re-export utility functions for testing
export { sanitizeUrl, linkMetrics, applyRunDataAttributes } from './renderer.js';

// Re-export PM position validation utilities
export {
  assertPmPositions,
  assertFragmentPmPositions,
  validateRenderedElement,
  logValidationSummary,
  resetValidationStats,
  getValidationStats,
  globalValidationStats,
} from './pm-position-validation.js';
export type { PmPositionValidationStats } from './pm-position-validation.js';

export type LayoutMode = 'vertical' | 'horizontal' | 'book';
export type PageDecorationPayload = {
  fragments: Fragment[];
  height: number;
  /** Optional measured content height; when provided, footer content will be bottom-aligned within its box. */
  contentHeight?: number;
  offset?: number;
  marginLeft?: number;
  contentWidth?: number;
  headerId?: string;
  sectionType?: string;
  box?: { x: number; y: number; width: number; height: number };
  hitRegion?: { x: number; y: number; width: number; height: number };
};

export type PageDecorationProvider = (
  pageNumber: number,
  pageMargins?: PageMargins,
  page?: Page,
) => PageDecorationPayload | null;

export type DomPainterOptions = {
  blocks: FlowBlock[];
  measures: Measure[];
  pageStyles?: PageStyles;
  layoutMode?: LayoutMode;
  headerProvider?: PageDecorationProvider;
  footerProvider?: PageDecorationProvider;
  /**
   * Feature-flagged page virtualization.
   * When enabled (vertical mode only), the painter renders only a sliding window of pages
   * with top/bottom spacers representing offscreen content height.
   */
  virtualization?: {
    enabled?: boolean;
    /** Max number of pages in DOM at any time. Default: 5 */
    window?: number;
    /** Extra pages to render before/after the window (per side). Default: 0 */
    overscan?: number;
    /**
     * Gap between pages used for spacer math (px). When set, container gap is overridden
     * to this value during virtualization. Default approximates existing margin+gap look: 72.
     */
    gap?: number;
    /** Optional mount padding-top override (px) used in scroll mapping; defaults to computed style. */
    paddingTop?: number;
  };
};

export const createDomPainter = (
  options: DomPainterOptions,
): PainterDOM & {
  setProviders?: (header?: PageDecorationProvider, footer?: PageDecorationProvider) => void;
} => {
  const painter = new DomPainter(options.blocks, options.measures, {
    pageStyles: options.pageStyles,
    layoutMode: options.layoutMode,
    headerProvider: options.headerProvider,
    footerProvider: options.footerProvider,
    virtualization: options.virtualization,
  });

  return {
    paint(layout: Layout, mount: HTMLElement) {
      painter.paint(layout, mount);
    },
    setData(
      blocks: FlowBlock[],
      measures: Measure[],
      headerBlocks?: FlowBlock[],
      headerMeasures?: Measure[],
      footerBlocks?: FlowBlock[],
      footerMeasures?: Measure[],
    ) {
      painter.setData(blocks, measures, headerBlocks, headerMeasures, footerBlocks, footerMeasures);
    },
    // Non-standard extension for demo app to avoid re-instantiating on provider changes
    setProviders(header?: PageDecorationProvider, footer?: PageDecorationProvider) {
      painter.setProviders(header, footer);
    },
  };
};
