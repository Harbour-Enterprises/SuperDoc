import type { TableBlock, TableMeasure, TableFragment } from '@superdoc/contracts';

export type PageState = {
  page: { fragments: unknown[] };
  columnIndex: number;
  cursorY: number;
  contentBottom: number;
};

export type TableLayoutContext = {
  block: TableBlock;
  measure: TableMeasure;
  columnWidth: number;
  ensurePage: () => PageState;
  advanceColumn: (state: PageState) => PageState;
  columnX: (columnIndex: number) => number;
};
export declare function layoutTableBlock({
  block,
  measure,
  columnWidth,
  ensurePage,
  advanceColumn,
  columnX,
}: TableLayoutContext): void;
export declare function createAnchoredTableFragment(
  block: TableBlock,
  measure: TableMeasure,
  x: number,
  y: number,
): TableFragment;
