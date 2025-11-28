import type { FloatingObjectManager } from './floating-objects';
import type { PageState } from './paginator';
import type {
  PageMargins,
  ParagraphBlock,
  ParagraphMeasure,
  ParaFragment,
  ImageBlock,
  ImageMeasure,
  ImageFragment,
  ImageFragmentMetadata,
  DrawingBlock,
  DrawingMeasure,
  DrawingFragment,
} from '@superdoc/contracts';
import { computeFragmentPmRange, normalizeLines, sliceLines, extractBlockPmRange } from './layout-utils.js';
import { computeAnchorX } from './floating-objects.js';

const spacingDebugEnabled = false;
const anchorDebugEnabled = false;

const spacingDebugLog = (..._args: unknown[]): void => {
  if (!spacingDebugEnabled) return;
};

const anchorDebugLog = (...args: unknown[]): void => {
  if (!anchorDebugEnabled) return;
  console.log('[AnchorDebug]', ...args);
};

export type ParagraphLayoutContext = {
  block: ParagraphBlock;
  measure: ParagraphMeasure;
  columnWidth: number;
  ensurePage: () => PageState;
  advanceColumn: (state: PageState) => PageState;
  columnX: (columnIndex: number) => number;
  floatManager: FloatingObjectManager;
  remeasureParagraph?: (block: ParagraphBlock, maxWidth: number) => ParagraphMeasure;
};

export type AnchoredDrawingEntry = {
  block: ImageBlock | DrawingBlock;
  measure: ImageMeasure | DrawingMeasure;
};

export type ParagraphAnchorsContext = {
  anchoredDrawings?: AnchoredDrawingEntry[];
  pageWidth: number;
  pageMargins: PageMargins;
  columns: { width: number; gap: number; count: number };
  placedAnchoredIds: Set<string>;
};

export function layoutParagraphBlock(ctx: ParagraphLayoutContext, anchors?: ParagraphAnchorsContext): void {
  const { block, measure, columnWidth, ensurePage, advanceColumn, columnX, floatManager } = ctx;
  const remeasureParagraph = ctx.remeasureParagraph;

  const frame = (block.attrs as { frame?: Record<string, unknown> } | undefined)?.frame as
    | {
        wrap?: string;
        x?: number;
        y?: number;
        xAlign?: 'left' | 'right' | 'center';
      }
    | undefined;

  if (anchors?.anchoredDrawings?.length) {
    for (const entry of anchors.anchoredDrawings) {
      if (anchors.placedAnchoredIds.has(entry.block.id)) continue;
      const state = ensurePage();
      const baseAnchorY = state.cursorY;

      // For vRelativeFrom="paragraph", MS Word positions relative to where text sits within the line,
      // not the paragraph top. Adjust anchor point by half the line height to better match Word's behavior.
      const firstLineHeight = measure.lines?.[0]?.lineHeight ?? 0;
      const vRelativeFrom = entry.block.anchor?.vRelativeFrom;
      const paragraphAdjustment = vRelativeFrom === 'paragraph' ? firstLineHeight / 2 : 0;
      const anchorY = baseAnchorY + paragraphAdjustment;

      anchorDebugLog('Positioning anchored image:', {
        blockId: entry.block.id,
        baseAnchorY,
        paragraphAdjustment,
        anchorY,
        offsetV: entry.block.anchor?.offsetV,
        finalY: anchorY + (entry.block.anchor?.offsetV ?? 0),
        measureHeight: entry.measure.height,
        measureWidth: entry.measure.width,
        pageNumber: state.page.number,
        vRelativeFrom,
      });

      floatManager.registerDrawing(entry.block, entry.measure, anchorY, state.columnIndex, state.page.number);

      const anchorX = entry.block.anchor
        ? computeAnchorX(
            entry.block.anchor,
            state.columnIndex,
            anchors.columns,
            entry.measure.width,
            { left: anchors.pageMargins.left, right: anchors.pageMargins.right },
            anchors.pageWidth,
          )
        : columnX(state.columnIndex);

      const pmRange = extractBlockPmRange(entry.block);
      if (entry.block.kind === 'image' && entry.measure.kind === 'image') {
        const pageContentHeight = Math.max(0, state.contentBottom - state.topMargin);
        const relativeFrom = entry.block.anchor?.hRelativeFrom ?? 'column';
        const marginLeft = anchors.pageMargins.left ?? 0;
        const marginRight = anchors.pageMargins.right ?? 0;
        let maxWidth: number;
        if (relativeFrom === 'page') {
          maxWidth = anchors.columns.count === 1 ? anchors.pageWidth - marginLeft - marginRight : anchors.pageWidth;
        } else if (relativeFrom === 'margin') {
          maxWidth = anchors.pageWidth - marginLeft - marginRight;
        } else {
          maxWidth = anchors.columns.width;
        }

        const aspectRatio =
          entry.measure.width > 0 && entry.measure.height > 0 ? entry.measure.width / entry.measure.height : 1.0;
        const minWidth = 20;
        const minHeight = minWidth / aspectRatio;

        const metadata: ImageFragmentMetadata = {
          originalWidth: entry.measure.width,
          originalHeight: entry.measure.height,
          maxWidth,
          maxHeight: pageContentHeight,
          aspectRatio,
          minWidth,
          minHeight,
        };

        const fragment: ImageFragment = {
          kind: 'image',
          blockId: entry.block.id,
          x: anchorX,
          y: anchorY + (entry.block.anchor?.offsetV ?? 0),
          width: entry.measure.width,
          height: entry.measure.height,
          isAnchored: true,
          zIndex: entry.block.anchor?.behindDoc ? 0 : 1,
          metadata,
        };
        if (pmRange.pmStart != null) fragment.pmStart = pmRange.pmStart;
        if (pmRange.pmEnd != null) fragment.pmEnd = pmRange.pmEnd;
        state.page.fragments.push(fragment);
      } else if (entry.block.kind === 'drawing' && entry.measure.kind === 'drawing') {
        const fragment: DrawingFragment = {
          kind: 'drawing',
          blockId: entry.block.id,
          drawingKind: entry.block.drawingKind,
          x: anchorX,
          y: anchorY + (entry.block.anchor?.offsetV ?? 0),
          width: entry.measure.width,
          height: entry.measure.height,
          geometry: entry.measure.geometry,
          scale: entry.measure.scale,
          isAnchored: true,
          zIndex: entry.block.anchor?.behindDoc ? 0 : 1,
          drawingContentId: entry.block.drawingContentId,
        };
        if (pmRange.pmStart != null) fragment.pmStart = pmRange.pmStart;
        if (pmRange.pmEnd != null) fragment.pmEnd = pmRange.pmEnd;
        state.page.fragments.push(fragment);
      }

      anchors.placedAnchoredIds.add(entry.block.id);
    }
  }

  let lines = normalizeLines(measure);
  let fromLine = 0;
  const spacing = (block.attrs?.spacing ?? {}) as Record<string, unknown>;
  const styleId = (block.attrs as Record<string, unknown>)?.styleId as string | undefined;
  const contextualSpacing = Boolean((block.attrs as Record<string, unknown>)?.contextualSpacing);
  let spacingBefore = Math.max(0, Number(spacing.before ?? spacing.lineSpaceBefore ?? 0));
  const spacingAfter = Math.max(0, Number(spacing.after ?? spacing.lineSpaceAfter ?? 0));
  let appliedSpacingBefore = spacingBefore === 0;
  let lastState: PageState | null = null;
  if (spacingDebugEnabled) {
    spacingDebugLog('paragraph spacing attrs', {
      blockId: block.id,
      spacingAttrs: spacing,
      spacingBefore,
      spacingAfter,
    });
  }

  const isPositionedFrame = frame?.wrap === 'none';
  if (isPositionedFrame) {
    let state = ensurePage();
    if (state.cursorY >= state.contentBottom) {
      state = advanceColumn(state);
    }

    const maxLineWidth = lines.reduce((max, line) => Math.max(max, line.width ?? 0), 0);
    const fragmentWidth = maxLineWidth || columnWidth;

    let x = columnX(state.columnIndex);
    if (frame.xAlign === 'right') {
      x += columnWidth - fragmentWidth;
    } else if (frame.xAlign === 'center') {
      x += (columnWidth - fragmentWidth) / 2;
    }
    if (typeof frame.x === 'number' && Number.isFinite(frame.x)) {
      x += frame.x;
    }

    const yOffset = typeof frame.y === 'number' && Number.isFinite(frame.y) ? frame.y : 0;
    const fragment: ParaFragment = {
      kind: 'para',
      blockId: block.id,
      fromLine: 0,
      toLine: lines.length,
      x,
      y: state.cursorY + yOffset,
      width: fragmentWidth,
      ...computeFragmentPmRange(block, lines, 0, lines.length),
    };

    if (measure.marker) {
      fragment.markerWidth = measure.marker.markerWidth;
    }

    state.page.fragments.push(fragment);
    state.trailingSpacing = 0;
    state.lastParagraphStyleId = styleId;
    return;
  }

  let didRemeasureForFloats = false;
  while (fromLine < lines.length) {
    let state = ensurePage();
    if (state.trailingSpacing == null) state.trailingSpacing = 0;
    if (contextualSpacing) {
      const prevStyle = state.lastParagraphStyleId;
      if (styleId && prevStyle && prevStyle === styleId) {
        spacingBefore = 0;
      }
    }
    if (contextualSpacing && state.lastParagraphStyleId && styleId && state.lastParagraphStyleId === styleId) {
      spacingBefore = 0;
    }

    if (!appliedSpacingBefore && spacingBefore > 0) {
      while (!appliedSpacingBefore) {
        const prevTrailing = state.trailingSpacing ?? 0;
        const neededSpacingBefore = Math.max(spacingBefore - prevTrailing, 0);
        if (spacingDebugEnabled) {
          spacingDebugLog('spacingBefore pending', {
            blockId: block.id,
            cursorY: state.cursorY,
            contentBottom: state.contentBottom,
            spacingBefore,
            prevTrailing,
            neededSpacingBefore,
            column: state.columnIndex,
            page: state.page.number,
          });
        }
        if (state.cursorY + neededSpacingBefore > state.contentBottom) {
          if (spacingDebugEnabled) {
            spacingDebugLog('spacingBefore triggers column advance', {
              blockId: block.id,
              cursorY: state.cursorY,
              spacingBefore,
              neededSpacingBefore,
              prevTrailing,
              column: state.columnIndex,
              page: state.page.number,
            });
          }
          state = advanceColumn(state);
          if (state.trailingSpacing == null) state.trailingSpacing = 0;
          continue;
        }

        if (neededSpacingBefore > 0) {
          state.cursorY += neededSpacingBefore;
          if (spacingDebugEnabled) {
            spacingDebugLog('spacingBefore applied', {
              blockId: block.id,
              added: neededSpacingBefore,
              prevTrailing,
              newCursorY: state.cursorY,
              column: state.columnIndex,
              page: state.page.number,
            });
          }
        } else if (spacingDebugEnabled && prevTrailing > 0) {
          spacingDebugLog('spacingBefore collapsed by trailing spacing', {
            blockId: block.id,
            prevTrailing,
            spacingBefore,
            column: state.columnIndex,
            page: state.page.number,
          });
        }
        state.trailingSpacing = 0;
        appliedSpacingBefore = true;
      }
    } else {
      state.trailingSpacing = 0;
    }
    if (state.cursorY >= state.contentBottom) {
      state = advanceColumn(state);
    }

    const availableHeight = state.contentBottom - state.cursorY;
    if (availableHeight <= 0) {
      state = advanceColumn(state);
    }

    const nextLineHeight = lines[fromLine].lineHeight || 0;
    const remainingHeight = state.contentBottom - state.cursorY;
    if (state.page.fragments.length > 0 && remainingHeight < nextLineHeight) {
      state = advanceColumn(state);
    }

    let effectiveColumnWidth = columnWidth;
    let offsetX = 0;
    if (!didRemeasureForFloats && typeof remeasureParagraph === 'function') {
      const firstLineY = state.cursorY;
      const firstLineHeight = lines[fromLine]?.lineHeight || 0;
      const { width: adjustedWidth, offsetX: computedOffset } = floatManager.computeAvailableWidth(
        firstLineY,
        firstLineHeight,
        columnWidth,
        state.columnIndex,
        state.page.number,
      );
      if (adjustedWidth < columnWidth) {
        const newMeasure = remeasureParagraph(block, adjustedWidth);
        lines = normalizeLines(newMeasure);
        didRemeasureForFloats = true;
        effectiveColumnWidth = adjustedWidth;
        offsetX = computedOffset;
      }
    }

    const slice = sliceLines(lines, fromLine, state.contentBottom - state.cursorY);
    const fragmentHeight = slice.height;

    const fragment: ParaFragment = {
      kind: 'para',
      blockId: block.id,
      fromLine,
      toLine: slice.toLine,
      x: columnX(state.columnIndex) + offsetX,
      y: state.cursorY,
      width: effectiveColumnWidth,
      ...computeFragmentPmRange(block, lines, fromLine, slice.toLine),
    };

    anchorDebugLog('Positioning paragraph fragment:', {
      blockId: block.id,
      fragmentY: state.cursorY,
      fragmentHeight,
      firstLineHeight: lines[fromLine]?.lineHeight,
      firstLineAscent: lines[fromLine]?.ascent,
      firstLineDescent: lines[fromLine]?.descent,
      pageNumber: state.page.number,
    });

    if (measure.marker && fromLine === 0) {
      fragment.markerWidth = measure.marker.markerWidth;
    }

    if (fromLine > 0) fragment.continuesFromPrev = true;
    if (slice.toLine < lines.length) fragment.continuesOnNext = true;

    const floatAlignment = block.attrs?.floatAlignment;
    if (floatAlignment && (floatAlignment === 'right' || floatAlignment === 'center')) {
      let maxLineWidth = 0;
      for (let i = fromLine; i < slice.toLine; i++) {
        if (lines[i].width > maxLineWidth) {
          maxLineWidth = lines[i].width;
        }
      }

      if (floatAlignment === 'right') {
        fragment.x = columnX(state.columnIndex) + offsetX + (effectiveColumnWidth - maxLineWidth);
      } else if (floatAlignment === 'center') {
        fragment.x = columnX(state.columnIndex) + offsetX + (effectiveColumnWidth - maxLineWidth) / 2;
      }
    }

    state.page.fragments.push(fragment);
    state.cursorY += fragmentHeight;
    lastState = state;
    fromLine = slice.toLine;
  }

  if (lastState) {
    if (spacingAfter > 0) {
      let targetState = lastState;
      let appliedSpacingAfter = spacingAfter;
      if (targetState.cursorY + spacingAfter > targetState.contentBottom) {
        if (spacingDebugEnabled) {
          spacingDebugLog('spacingAfter triggers column advance', {
            blockId: block.id,
            cursorY: targetState.cursorY,
            spacingAfter,
            column: targetState.columnIndex,
            page: targetState.page.number,
          });
        }
        targetState = advanceColumn(targetState);
        appliedSpacingAfter = 0;
      } else {
        targetState.cursorY += spacingAfter;
      }
      targetState.trailingSpacing = appliedSpacingAfter;
      if (spacingDebugEnabled) {
        spacingDebugLog('spacingAfter applied', {
          blockId: block.id,
          appliedSpacingAfter,
          newCursorY: targetState.cursorY,
          column: targetState.columnIndex,
          page: targetState.page.number,
        });
      }
    } else {
      lastState.trailingSpacing = 0;
    }
    lastState.lastParagraphStyleId = styleId;
  }
}
