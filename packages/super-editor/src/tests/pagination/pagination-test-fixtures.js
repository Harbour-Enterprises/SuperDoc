/**
 * Test fixtures and builders for pagination tests
 * @module tests/pagination/pagination-test-fixtures
 */

/**
 * Standard page dimensions and spacing constants
 * Page dimensions based on Letter size (8.5" × 11") at 72 DPI
 * Margins based on 96 DPI (CSS pixels)
 */
export const PAGE_DIMENSIONS = {
  LETTER_HEIGHT_PX: 792, // 11 inches at 72 DPI
  LETTER_WIDTH_PX: 612, // 8.5 inches at 72 DPI
  MARGIN_1_INCH_PX: 96, // 1 inch at 96 DPI
};

/**
 * Helper to safely get numeric value or default to 0
 * @private
 */
const getNumericValue = (value, defaultValue = 0) => {
  return Number.isFinite(value) ? value : defaultValue;
};

/**
 * Calculate content dimensions based on page size and margins
 * @private
 */
const calculateContentDimensions = (pageSize, marginStart, marginEnd) => {
  return pageSize - marginStart - marginEnd;
};

/**
 * Default page metrics for testing
 */
const DEFAULT_PAGE_METRICS = {
  pageHeightPx: PAGE_DIMENSIONS.LETTER_HEIGHT_PX,
  pageWidthPx: PAGE_DIMENSIONS.LETTER_WIDTH_PX,
  marginTopPx: PAGE_DIMENSIONS.MARGIN_1_INCH_PX,
  marginBottomPx: PAGE_DIMENSIONS.MARGIN_1_INCH_PX,
  marginLeftPx: PAGE_DIMENSIONS.MARGIN_1_INCH_PX,
  marginRightPx: PAGE_DIMENSIONS.MARGIN_1_INCH_PX,
  contentHeightPx: calculateContentDimensions(
    PAGE_DIMENSIONS.LETTER_HEIGHT_PX,
    PAGE_DIMENSIONS.MARGIN_1_INCH_PX,
    PAGE_DIMENSIONS.MARGIN_1_INCH_PX,
  ), // 792 - (2 × 96) = 600px
  contentWidthPx: calculateContentDimensions(
    PAGE_DIMENSIONS.LETTER_WIDTH_PX,
    PAGE_DIMENSIONS.MARGIN_1_INCH_PX,
    PAGE_DIMENSIONS.MARGIN_1_INCH_PX,
  ), // 612 - (2 × 96) = 420px
  pageGapPx: 0,
};

/**
 * Build cell content with text and optional hard breaks
 * @private
 */
const buildCellContent = (rowIndex, columnIndex, extraLines) => {
  const content = [
    {
      type: 'text',
      text: `Row ${rowIndex + 1} - Cell ${columnIndex + 1}`,
    },
  ];

  if (extraLines > 0) {
    content.push(...Array(extraLines).fill({ type: 'hardBreak' }));
  }

  return content;
};

/**
 * Build a test table document with specified dimensions.
 * Creates a table with the given number of rows and columns, where each cell
 * contains a paragraph with text identifying the cell position.
 *
 * @param {number} rows - Number of table rows
 * @param {number} columns - Number of table columns
 * @param {number} [extraLines=0] - Number of hard breaks to add to each cell (for testing overflow)
 * @returns {Object} ProseMirror document JSON
 *
 * @example
 * // Create a 3x2 table
 * const doc = buildTableDoc(3, 2);
 *
 * @example
 * // Create a 5x3 table with extra line breaks to force page breaks
 * const doc = buildTableDoc(5, 3, 4);
 */
export const buildTableDoc = (rows, columns, extraLines = 0) => ({
  type: 'doc',
  content: [
    {
      type: 'table',
      content: Array.from({ length: rows }, (_, rowIndex) => ({
        type: 'tableRow',
        content: Array.from({ length: columns }, (_, columnIndex) => ({
          type: 'tableCell',
          content: [
            {
              type: 'paragraph',
              content: buildCellContent(rowIndex, columnIndex, extraLines),
            },
          ],
        })),
      })),
    },
  ],
});

/**
 * Build a pagination layout for testing.
 * Creates a multi-page layout with configurable break positions and metrics.
 *
 * @param {Object} options - Layout configuration
 * @param {number} options.breakPos - Document position where page break occurs
 * @param {number[]} options.cellPositions - Array of cell positions in the broken row
 * @param {Object} [options.page0] - Override metrics for page 0
 * @param {Object} [options.page1] - Override metrics for page 1
 * @returns {Object} Pagination layout object
 *
 * @example
 * // Create a 2-page layout with a break at position 100
 * const layout = buildPaginationLayout({
 *   breakPos: 100,
 *   cellPositions: [95, 96, 97],
 * });
 */
export const buildPaginationLayout = ({ breakPos, cellPositions, page0 = {}, page1 = {} }) => {
  // Calculate spacing after page 0: footer + next header
  const footerReserved = page0.footerHeightPx ?? PAGE_DIMENSIONS.MARGIN_1_INCH_PX;
  const nextHeaderReserved = page1.headerHeightPx ?? 0;
  const spacingAfterPx = footerReserved + nextHeaderReserved;

  // Default break position to content height
  const defaultBreakY = DEFAULT_PAGE_METRICS.contentHeightPx;

  // Build page 0 metrics with defaults
  const page0Metrics = {
    ...DEFAULT_PAGE_METRICS,
    headerHeightPx: 0,
    footerHeightPx: PAGE_DIMENSIONS.MARGIN_1_INCH_PX,
    ...page0,
  };

  // Build page 1 metrics with defaults (no top margin, has header instead)
  const page1Metrics = {
    ...DEFAULT_PAGE_METRICS,
    marginTopPx: 0,
    contentHeightPx: calculateContentDimensions(
      PAGE_DIMENSIONS.LETTER_HEIGHT_PX,
      0, // No top margin
      PAGE_DIMENSIONS.MARGIN_1_INCH_PX,
    ), // 792 - 96 = 696px
    headerHeightPx: 0,
    footerHeightPx: 0,
    ...page1,
  };

  // Extract break dimensions with defaults
  const breakTop = page0.breakTop ?? defaultBreakY;
  const breakBottom = page0.breakBottom ?? defaultBreakY;
  const breakY = page0.breakY ?? defaultBreakY;

  return {
    pages: [
      {
        pageIndex: 0,
        break: {
          pos: breakPos,
          top: breakTop,
          bottom: breakBottom,
          fittedTop: breakTop,
          fittedBottom: breakBottom,
          breakY,
          startOffsetPx: 0,
        },
        metrics: page0Metrics,
        pageTopOffsetPx: 0,
        pageGapPx: 0,
        pageBottomSpacingPx: 0,
        spacingAfterPx,
        spacingSegments: cellPositions,
      },
      {
        pageIndex: 1,
        metrics: page1Metrics,
        pageTopOffsetPx: page1.pageTopOffsetPx ?? PAGE_DIMENSIONS.LETTER_HEIGHT_PX,
        pageGapPx: 0,
      },
    ],
  };
};

/**
 * Calculate the expected spacing height between pages based on pagination layout.
 * This replicates the production calculation logic for test assertions.
 *
 * Formula: pageBottomSpacing + footerReserved + nextHeaderReserved + nextPageGap
 * - footerReserved = max(footerHeight, marginBottom)
 * - nextHeaderReserved = max(headerHeight, marginTop)
 *
 * @param {Object} currentPage - The current page object from pagination layout
 * @param {Object} nextPage - The next page object from pagination layout
 * @returns {string} The expected spacing height in pixels as a string
 *
 * @example
 * const layout = buildPaginationLayout({ breakPos: 100, cellPositions: [95, 96, 97] });
 * const expectedHeight = calculateExpectedSpacing(layout.pages[0], layout.pages[1]);
 * // Returns "96" (footer reserved height + next header reserved height)
 */
export const calculateExpectedSpacing = (currentPage, nextPage) => {
  const currentMetrics = currentPage?.metrics ?? {};
  const nextMetrics = nextPage?.metrics ?? {};

  // Current page footer calculation
  const footerHeight = getNumericValue(currentMetrics.footerHeightPx);
  const footerMargin = getNumericValue(currentMetrics.marginBottomPx, footerHeight);
  const footerReserved = Math.max(footerHeight, footerMargin, 0);

  // Page bottom spacing
  const pageBottomSpacing = getNumericValue(currentPage?.pageBottomSpacingPx);

  // Next page header calculation
  const nextHeaderHeight = getNumericValue(nextMetrics.headerHeightPx);
  const nextHeaderMargin = getNumericValue(nextMetrics.marginTopPx, nextHeaderHeight);
  const nextHeaderReserved = Math.max(nextHeaderHeight, nextHeaderMargin, 0);

  // Next page gap
  const nextPageGap = getNumericValue(nextMetrics.pageGapPx);

  const totalSpacing = pageBottomSpacing + footerReserved + nextHeaderReserved + nextPageGap;
  return String(totalSpacing);
};
