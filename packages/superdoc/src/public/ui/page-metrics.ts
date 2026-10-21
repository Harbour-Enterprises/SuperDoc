/** Existing page geometry, in CSS pixels. No document content is exposed. */
export interface PageMetricsPage {
  pageIndex: number;
  sectionId?: string;
  sectionIndex?: number;
  /** Unzoomed layout pixels. */
  base: {
    widthPx: number;
    heightPx: number;
    marginTopPx: number;
    marginRightPx: number;
    marginBottomPx: number;
    marginLeftPx: number;
  };
  /** Scaled stage coordinates, NOT browser client coordinates. */
  viewport: { xPx: number; yPx: number; widthPx: number; heightPx: number };
}

export interface PageMetricsSnapshot {
  editorVersion: 2;
  documentId: string;
  renderEpoch: number;
  layoutGeneration: number;
  zoom: { percent: number; scale: number; source: 'superdoc' };
  /** Empty before first paint and after disposal; includes unmounted pages. */
  pages: PageMetricsPage[];
  widestPageWidthPx: number;
  capabilities: { pageMetrics: true; zoom: true; marginEdit: { supported: boolean; disabledReason?: string } };
  provenance: {
    pageGeometry: 'pending-source-coverage' | 'default-fallback' | 'resolved-from-projected-section' | 'failed';
    sectionMetadata: 'pending-source-signals' | 'resolved-from-source-signals' | 'default-fallback' | 'failed';
    pageFurniture: 'pending' | 'resolved' | 'none' | 'failed';
  };
}

export interface PageBodyTarget {
  fragmentId?: string;
  paraId?: string;
  projectionBlockId?: string;
  sourcePathFingerprint?: string;
  bodyChildOrdinal?: number;
  blockOffset?: number;
}

/** Per-editor facade; release subscriptions before closing or replacing that editor. */
export interface PageMetricsHandle {
  getSnapshot(): PageMetricsSnapshot;
  subscribe(listener: (snapshot: PageMetricsSnapshot) => void): () => void;
  setZoom(percent: number): void;
  /** Requests navigation; true means admitted, not paint-complete. Index is zero-based. */
  scrollToPage(pageIndex: number): boolean;
  pageIndexForBodyTarget(input: PageBodyTarget): number | null;
  /** Resolves after the target is painted, or reports why it could not be revealed. */
  revealBodyTarget(input: PageBodyTarget): Promise<{
    status: 'revealed' | 'rejected';
    reason?: string;
    resolvedOrdinal: number | null;
    paintedParaId: string | null;
    covered: boolean;
    pinnedPageIndex: number | null;
  }>;
}
