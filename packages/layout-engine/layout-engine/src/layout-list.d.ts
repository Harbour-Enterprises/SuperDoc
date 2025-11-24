import type { ListBlock, ListMeasure } from '@superdoc/contracts';
import type { PageState } from './paginator.js';
export type ListLayoutContext = {
  block: ListBlock;
  measure: ListMeasure;
  columnWidth: number;
  contentBottom: number;
  ensurePage: () => PageState;
  advanceColumn: (state: PageState) => PageState;
  columnX: (columnIndex: number) => number;
};
export declare function layoutListBlock({
  block,
  measure,
  columnWidth,
  contentBottom,
  ensurePage,
  advanceColumn,
  columnX,
}: ListLayoutContext): void;
//# sourceMappingURL=layout-list.d.ts.map
