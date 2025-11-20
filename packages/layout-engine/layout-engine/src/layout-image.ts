import type { ImageBlock, ImageMeasure, ImageFragment } from '@superdoc/contracts';
import { extractBlockPmRange } from './layout-utils.js';

export type NormalizedColumns = { width: number; gap: number; count: number };

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

export function layoutImageBlock({
  block,
  measure,
  columns,
  ensurePage,
  advanceColumn,
  columnX,
}: ImageLayoutContext): void {
  // Anchored images are handled via paragraph anchoring pre-pass and paragraph processing.
  if (block.anchor?.isAnchored) {
    return;
  }

  const marginTop = Math.max(0, block.margin?.top ?? 0);
  const marginBottom = Math.max(0, block.margin?.bottom ?? 0);
  const marginLeft = Math.max(0, block.margin?.left ?? 0);
  const marginRight = Math.max(0, block.margin?.right ?? 0);

  const maxWidth = Math.max(0, columns.width - (marginLeft + marginRight));
  let width = measure.width;
  let height = measure.height;

  if (width > maxWidth && maxWidth > 0) {
    const scale = maxWidth / width;
    width = maxWidth;
    height *= scale;
  }

  let state = ensurePage();
  const pageContentHeight = Math.max(0, state.contentBottom - state.topMargin);
  if (height > pageContentHeight && pageContentHeight > 0) {
    const scale = pageContentHeight / height;
    height = pageContentHeight;
    width *= scale;
  }

  const requiredHeight = marginTop + height + marginBottom;

  // Inline/block images advance cursor normally
  if (state.cursorY + requiredHeight > state.contentBottom && state.cursorY > state.topMargin) {
    state = advanceColumn(state);
  }

  const pmRange = extractBlockPmRange(block);

  const fragment: ImageFragment = {
    kind: 'image',
    blockId: block.id,
    x: columnX(state.columnIndex) + marginLeft,
    y: state.cursorY + marginTop,
    width,
    height,
    pmStart: pmRange.pmStart,
    pmEnd: pmRange.pmEnd,
  };

  state.page.fragments.push(fragment);
  state.cursorY += requiredHeight;
}
