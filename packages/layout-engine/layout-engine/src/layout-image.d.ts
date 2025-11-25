import type { ImageBlock, ImageMeasure } from '@superdoc/contracts';
export type NormalizedColumns = {
  width: number;
  gap: number;
  count: number;
};
export type PageState = {
  page: { fragments: unknown[] };
  columnIndex: number;
  cursorY: number;
  topMargin: number;
  contentBottom: number;
};

export type ImageLayoutContext = {
  block: ImageBlock;
  measure: ImageMeasure;
  columns: NormalizedColumns;
  ensurePage: () => PageState;
  advanceColumn: (state: PageState) => PageState;
  columnX: (columnIndex: number) => number;
};
export declare function layoutImageBlock({
  block,
  measure,
  columns,
  ensurePage,
  advanceColumn,
  columnX,
}: ImageLayoutContext): void;
