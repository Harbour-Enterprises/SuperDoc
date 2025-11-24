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
  DrawingBlock,
  DrawingMeasure,
  DrawingFragment,
} from '@superdoc/contracts';
import { computeFragmentPmRange, normalizeLines, sliceLines, extractBlockPmRange } from './layout-utils.js';
import { computeAnchorX } from './floating-objects.js';

// Temporary: keep spacing logging always on to diagnose paragraph spacing issues.
const spacingDebugEnabled = true;

const spacingDebugLog = (..._args: unknown[]): void => {
  if (!spacingDebugEnabled) return;
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

  // Register and place anchored images tied to this paragraph (pre-pass outcome)
  if (anchors?.anchoredDrawings?.length) {
    for (const entry of anchors.anchoredDrawings) {
      if (anchors.placedAnchoredIds.has(entry.block.id)) continue;
      const state = ensurePage();
      const anchorY = state.cursorY;

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
        const fragment: ImageFragment = {
          kind: 'image',
          blockId: entry.block.id,
          x: anchorX,
          y: anchorY + (entry.block.anchor?.offsetV ?? 0),
          width: entry.measure.width,
          height: entry.measure.height,
          isAnchored: true,
          zIndex: entry.block.anchor?.behindDoc ? 0 : 1,
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
  // Paragraph spacing (in px). Support both legacy keys and lineSpace* keys.
  const spacing = (block.attrs?.spacing ?? {}) as Record<string, unknown>;
  const spacingBefore = Math.max(0, Number(spacing.before ?? spacing.lineSpaceBefore ?? 0));
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

  let didRemeasureForFloats = false;
  while (fromLine < lines.length) {
    let state = ensurePage();
    if (state.trailingSpacing == null) state.trailingSpacing = 0;

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

    // Optional Phase 4B: float-aware re-measurement at reduced width
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

    if (measure.marker && fromLine === 0) {
      fragment.markerWidth = measure.marker.markerWidth;
    }

    if (process.env.NODE_ENV !== 'production' && measure.marker && fromLine === 0) {
      console.log('[layoutParagraphBlock] fragment marker info', {
        blockId: block.id,
        indent: block.attrs?.indent,
        markerWidth: fragment.markerWidth,
        textWidth: fragment.width,
        marker: measure.marker,
      });
    }

    if (fromLine > 0) fragment.continuesFromPrev = true;
    if (slice.toLine < lines.length) fragment.continuesOnNext = true;

    // Apply floating alignment (from OOXML w:framePr/@w:xAlign)
    // Used for positioned paragraphs like right-aligned page numbers in headers/footers
    const floatAlignment = block.attrs?.floatAlignment;
    if (floatAlignment && (floatAlignment === 'right' || floatAlignment === 'center')) {
      // Find the maximum line width in this fragment to determine actual content width
      let maxLineWidth = 0;
      for (let i = fromLine; i < slice.toLine; i++) {
        if (lines[i].width > maxLineWidth) {
          maxLineWidth = lines[i].width;
        }
      }

      // Adjust horizontal position based on alignment
      if (floatAlignment === 'right') {
        // Right-align: position so the right edge of content aligns with column boundary
        fragment.x = columnX(state.columnIndex) + offsetX + (effectiveColumnWidth - maxLineWidth);
      } else if (floatAlignment === 'center') {
        // Center: position so content is centered within the column
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
  }
}
