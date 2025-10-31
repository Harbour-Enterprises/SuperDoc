export type MeasurementUnits = {
  unit: 'px';
  dpi: number;
};

export interface LayoutPackage {
  document: Object;
  units: MeasurementUnits;
  pages: PageLayout[];
};

export interface PageLayout {
  pageIndex: number;
  break: PageBreakInfo;
  metrics: PageMetrics;
  headerFooterAreas: HeadersFootersData;
  /** Visual top offset for page chrome positioning. Always calculated by the engine. */
  pageTopOffsetPx: number;
  /** Gap between this page and the next. Always calculated by the engine. */
  pageGapPx: number;
  /** Spacing from break position to bottom of usable content area. Null if not calculated. */
  pageBottomSpacingPx?: number | null;
  /** Total spacing after this page including footer, header of next page, and gap. Added during finalization. */
  spacingAfterPx?: number;
  /** Normalized content area bounds for the page. */
  contentArea?: {
    startPx: number | null;
    endPx: number | null;
    usableHeightPx: number | null;
  };
  /** Document positions at which spacing decorations should be rendered for this page. */
  spacingSegments?: number[];
};

export interface MeasurementEngine {
  applyLayoutOverride(layout: LayoutPackage, options?: { source?: string }): LayoutPackage | null;
}

export type PageMetrics = {
  pageHeightPx: number;
  pageWidthPx: number;
  marginTopPx: number;
  marginBottomPx: number;
  marginLeftPx: number;
  marginRightPx: number;
  contentHeightPx: number;
  contentWidthPx: number;
  headerHeightPx: number;
  footerHeightPx: number;
  pageGapPx?: number;
};

export type HeadersFootersData = {
  header: HeaderFooterData;
  footer: HeaderFooterData;
};

export type HeaderFooterData = {
  id?: string;
  sectionId?: string;
  kind?: "default" | "first" | "even" | "odd";
  heightPx: number;
  reservedHeightPx: number;
  metrics: HeaderFooterMetrics;
  slotTopPx: number;
  slotHeightPx: number;
  slotMaxHeightPx: number;
  slotLeftPx: number;
  slotRightPx: number;
};

export type HeaderFooterMetrics = {
  offsetPx: number;
  contentHeightPx: number;
  effectiveHeightPx: number;
};

export type PageBreakInfo = {
  startOffsetPx: number;
  pos: number;
  top?: number;
};
