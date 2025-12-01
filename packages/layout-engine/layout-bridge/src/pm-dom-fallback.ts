/**
 * ProseMirror DOM Fallback
 *
 * Provides cursor positioning using ProseMirror's native DOM coordinate system
 * when layout data is stale. Transforms PM's coordinates into paginated space.
 *
 * This is a fallback mechanism used when:
 * - Layout is currently being recalculated
 * - Layout version is behind PM document version
 * - Need immediate cursor positioning before layout completes
 *
 * @module pm-dom-fallback
 */

/**
 * Cursor position rectangle for rendering.
 */
export interface CursorRect {
  /** Page index where cursor is located */
  pageIndex: number;
  /** X position within the page */
  x: number;
  /** Y position within the page */
  y: number;
  /** Height of the cursor line */
  height: number;
}

/**
 * Page transformation information for converting coordinates.
 */
export interface PageTransform {
  /** Index of the page */
  pageIndex: number;
  /** X offset of the page in container */
  x: number;
  /** Y offset of the page in container */
  y: number;
  /** Scale factor applied to the page */
  scale: number;
}

/**
 * Minimal interface for ProseMirror EditorView.
 * Only includes the methods we need for fallback positioning.
 */
export interface PmEditorView {
  /**
   * Get DOM coordinates for a PM position.
   * Returns null if position is not currently rendered.
   */
  coordsAtPos(pos: number): { left: number; top: number; bottom: number } | null;

  /**
   * Get the DOM node for the editor.
   */
  dom: HTMLElement;
}

/**
 * PmDomFallback provides cursor positioning using ProseMirror's DOM
 * coordinate system when layout is stale.
 *
 * This class bridges between PM's viewport-relative coordinates and
 * the paginated layout coordinate system.
 *
 * Usage:
 * ```typescript
 * const fallback = new PmDomFallback(pmView, getPageTransforms);
 *
 * // When layout is stale, use DOM-based positioning
 * const cursorRect = fallback.getCursorRect(pmPos);
 * if (cursorRect) {
 *   renderer.render(cursorRect);
 * }
 * ```
 */
export class PmDomFallback {
  private pmView: PmEditorView;
  private getPageTransforms: () => PageTransform[];

  /**
   * Creates a new PmDomFallback instance.
   *
   * @param pmView - ProseMirror editor view
   * @param getPageTransforms - Function to get current page transformations
   */
  constructor(pmView: PmEditorView, getPageTransforms: () => PageTransform[]) {
    this.pmView = pmView;
    this.getPageTransforms = getPageTransforms;
  }

  /**
   * Get cursor rect using PM's coordsAtPos, transformed to page space.
   * Use when layout is stale.
   *
   * @param pmPos - ProseMirror position
   * @returns Cursor rectangle in page space, or null if position not rendered
   */
  getCursorRect(pmPos: number): CursorRect | null {
    // Get DOM coordinates from ProseMirror
    const coords = this.pmView.coordsAtPos(pmPos);
    if (!coords) {
      return null;
    }

    // Transform to page space
    return this.mapToPageSpace(coords);
  }

  /**
   * Map PM coords to page-local coordinates.
   *
   * Takes viewport-relative coordinates from PM and transforms them
   * into page-local coordinates accounting for:
   * - Page positioning in the layout
   * - Zoom/scale transformations
   * - Multi-page layout
   *
   * @param coords - PM viewport coordinates
   * @returns Cursor rectangle in page space, or null if outside all pages
   */
  mapToPageSpace(coords: { left: number; top: number; bottom: number }): CursorRect | null {
    // Get editor container bounding box
    const editorRect = this.pmView.dom.getBoundingClientRect();

    // Convert viewport coords to container-relative coords
    const containerX = coords.left - editorRect.left;
    const containerY = coords.top - editorRect.top;
    const height = coords.bottom - coords.top;

    // Get page transforms
    const pageTransforms = this.getPageTransforms();

    // Find which page contains this Y coordinate
    for (const transform of pageTransforms) {
      const pageTop = transform.y;
      const pageBottom = transform.y + 1000 / transform.scale; // Assume standard page height

      if (containerY >= pageTop && containerY < pageBottom) {
        // Found the page containing this cursor
        return {
          x: (containerX - transform.x) / transform.scale,
          y: (containerY - transform.y) / transform.scale,
          height: height / transform.scale,
          pageIndex: transform.pageIndex,
        };
      }
    }

    // Cursor is outside all pages - use first page as fallback
    if (pageTransforms.length > 0) {
      const firstPage = pageTransforms[0];
      return {
        x: (containerX - firstPage.x) / firstPage.scale,
        y: (containerY - firstPage.y) / firstPage.scale,
        height: height / firstPage.scale,
        pageIndex: 0,
      };
    }

    return null;
  }

  /**
   * Check if a PM position is currently visible in the viewport.
   *
   * @param pmPos - ProseMirror position
   * @returns True if position is rendered and visible
   */
  isPositionVisible(pmPos: number): boolean {
    const coords = this.pmView.coordsAtPos(pmPos);
    if (!coords) {
      return false;
    }

    // Check if coords are within viewport
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    return coords.top >= 0 && coords.top <= viewportHeight && coords.left >= 0 && coords.left <= viewportWidth;
  }

  /**
   * Get selection rectangles using PM's DOM for a range.
   *
   * @param from - Start PM position
   * @param to - End PM position
   * @returns Array of cursor rectangles for the selection
   */
  getSelectionRects(from: number, to: number): CursorRect[] {
    if (from === to) {
      return [];
    }

    // Ensure from < to
    if (from > to) {
      [from, to] = [to, from];
    }

    const rects: CursorRect[] = [];

    // Sample positions along the range to generate selection rectangles
    // For now, just get start and end positions
    // A more sophisticated implementation could sample more positions

    const startRect = this.getCursorRect(from);
    if (startRect) {
      rects.push(startRect);
    }

    // If selection spans significant distance, add intermediate points
    const distance = to - from;
    if (distance > 10) {
      // Sample a few points in the middle
      const sampleCount = Math.min(5, Math.floor(distance / 10));
      for (let i = 1; i < sampleCount; i++) {
        const samplePos = from + Math.floor((distance * i) / sampleCount);
        const rect = this.getCursorRect(samplePos);
        if (rect) {
          rects.push(rect);
        }
      }
    }

    const endRect = this.getCursorRect(to);
    if (endRect) {
      rects.push(endRect);
    }

    return rects;
  }
}
