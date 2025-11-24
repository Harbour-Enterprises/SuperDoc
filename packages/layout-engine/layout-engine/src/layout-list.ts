import type { FloatingObjectManager as _FloatingObjectManager } from './floating-objects';
import type { ListBlock, ListMeasure, ListItemFragment } from '@superdoc/contracts';
import type { PageState } from './paginator.js';
import { normalizeLines, sliceLines } from './layout-utils.js';

export type ListLayoutContext = {
  block: ListBlock;
  measure: ListMeasure;
  columnWidth: number;
  contentBottom: number;
  ensurePage: () => PageState;
  advanceColumn: (state: PageState) => PageState;
  columnX: (columnIndex: number) => number;
};

export function layoutListBlock({
  block,
  measure,
  columnWidth,
  contentBottom,
  ensurePage,
  advanceColumn,
  columnX,
}: ListLayoutContext): void {
  block.items.forEach((item) => {
    const itemMeasure = measure.items.find((entry) => entry.itemId === item.id);
    if (!itemMeasure) return;

    const paragraphMeasure = itemMeasure.paragraph;
    const lines = normalizeLines(paragraphMeasure);
    const spacing = item.paragraph.attrs?.spacing;
    const spacingBefore = Math.max(0, spacing?.before ?? 0);
    const spacingAfter = Math.max(0, spacing?.after ?? 0);
    let appliedSpacingBefore = spacingBefore === 0;
    const indentLeft = Math.min(columnWidth, Math.max(0, itemMeasure.indentLeft ?? 0));
    // Track B: Use markerWidth from measurement (no MIN_MARKER_GUTTER)
    const markerGutter = Math.min(columnWidth, Math.max(0, itemMeasure.markerWidth));
    const textWidth = Math.max(1, columnWidth - indentLeft - markerGutter);

    let fromLine = 0;
    while (fromLine < lines.length) {
      let state = ensurePage();
      if (!appliedSpacingBefore && spacingBefore > 0) {
        if (state.cursorY + spacingBefore > contentBottom) {
          state = advanceColumn(state);
        }
        state.cursorY += spacingBefore;
        appliedSpacingBefore = true;
      }
      if (state.cursorY >= contentBottom) {
        state = advanceColumn(state);
      }

      const availableHeight = contentBottom - state.cursorY;
      if (availableHeight <= 0) {
        state = advanceColumn(state);
      }

      const slice = sliceLines(lines, fromLine, contentBottom - state.cursorY);

      const fragment: ListItemFragment = {
        kind: 'list-item',
        blockId: block.id,
        itemId: item.id,
        fromLine,
        toLine: slice.toLine,
        x: columnX(state.columnIndex) + indentLeft + markerGutter,
        y: state.cursorY,
        width: textWidth,
        markerWidth: markerGutter,
      };

      if (fromLine > 0) fragment.continuesFromPrev = true;
      if (slice.toLine < lines.length) fragment.continuesOnNext = true;

      state.page.fragments.push(fragment);
      state.cursorY += slice.height;
      fromLine = slice.toLine;
    }

    if (spacingAfter > 0) {
      let state = ensurePage();
      if (state.cursorY + spacingAfter > contentBottom) {
        state = advanceColumn(state);
      }
      state.cursorY += spacingAfter;
    }
  });
}
