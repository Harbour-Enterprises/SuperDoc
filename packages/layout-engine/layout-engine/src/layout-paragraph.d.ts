import type { FloatingObjectManager } from './floating-objects';
import type { PageState } from './paginator';
import type {
  PageMargins,
  ParagraphBlock,
  ParagraphMeasure,
  ImageBlock,
  ImageMeasure,
  DrawingBlock,
  DrawingMeasure,
} from '@superdoc/contracts';
export type ParagraphLayoutContext = {
  block: ParagraphBlock;
  measure: ParagraphMeasure;
  columnWidth: number;
  ensurePage: () => PageState;
  advanceColumn: (state: PageState) => PageState;
  columnX: (columnIndex: number) => number;
  floatManager: FloatingObjectManager;
  remeasureParagraph?: (block: ParagraphBlock, maxWidth: number, firstLineIndent?: number) => ParagraphMeasure;
};
export type AnchoredDrawingEntry = {
  block: ImageBlock | DrawingBlock;
  measure: ImageMeasure | DrawingMeasure;
};
export type ParagraphAnchorsContext = {
  anchoredDrawings?: AnchoredDrawingEntry[];
  pageWidth: number;
  pageMargins: PageMargins;
  columns: {
    width: number;
    gap: number;
    count: number;
  };
  placedAnchoredIds: Set<string>;
};
export declare function layoutParagraphBlock(ctx: ParagraphLayoutContext, anchors?: ParagraphAnchorsContext): void;
