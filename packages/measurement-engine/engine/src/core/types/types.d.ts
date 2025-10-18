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
  pageTopOffsetPx?: number;
  pageGapPx?: number;
};

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
  kind?: "default" | "first" | "even" | "odd";
  heightPx: number;
  metrics: HeaderFooterMetrics;
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
