/**
 * Floating-object manager for text wrapping around anchored images.
 *
 * This module handles:
 * - Registration of anchored images as exclusion zones
 * - Computing available line width based on image positions
 * - Managing exclusion zones per page/column
 *
 * Architecture:
 * - Layout Pass 1: Registers all anchored images before laying out paragraphs
 * - Layout Pass 2: Queries exclusions during paragraph layout to reduce line widths
 * - Supports rectangular wrapping (Square/TopAndBottom) in Phase 4A
 * - Polygon wrapping (Tight/Through) deferred to Phase 4B
 */
import type { ImageBlock, ImageMeasure, ExclusionZone, DrawingBlock, DrawingMeasure } from '@superdoc/contracts';
export type FloatingObjectManager = {
  /**
   * Register an anchored drawing as an exclusion zone.
   * Should be called during Layout Pass 1 before laying out paragraphs.
   */
  registerDrawing(
    drawingBlock: ImageBlock | DrawingBlock,
    measure: ImageMeasure | DrawingMeasure,
    anchorParagraphY: number,
    columnIndex: number,
    pageNumber: number,
  ): void;
  /**
   * Get all exclusion zones that vertically overlap the given line.
   * Used during paragraph layout to detect affected lines.
   */
  getExclusionsForLine(lineY: number, lineHeight: number, columnIndex: number, pageNumber: number): ExclusionZone[];
  /**
   * Compute available width for a line considering exclusion zones.
   * Returns reduced width and horizontal offset if exclusions present.
   */
  computeAvailableWidth(
    lineY: number,
    lineHeight: number,
    baseWidth: number,
    columnIndex: number,
    pageNumber: number,
  ): {
    width: number;
    offsetX: number;
  };
  /**
   * Get all floating images for a page (for debugging/painting).
   */
  getAllFloatsForPage(pageNumber: number): ExclusionZone[];
  /**
   * Clear all registered exclusion zones.
   */
  clear(): void;
};
type ColumnLayout = {
  width: number;
  gap: number;
  count: number;
};
export declare function createFloatingObjectManager(
  columns: ColumnLayout,
  margins?: {
    left?: number;
    right?: number;
  },
  pageWidth?: number,
): FloatingObjectManager;
/**
 * Compute horizontal position of anchored image based on alignment and offsets.
 */
export declare function computeAnchorX(
  anchor: NonNullable<ImageBlock['anchor']>,
  columnIndex: number,
  columns: ColumnLayout,
  imageWidth: number,
  margins?: {
    left?: number;
    right?: number;
  },
  pageWidth?: number,
): number;
export {};
