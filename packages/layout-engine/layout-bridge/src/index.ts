import type {
  FlowBlock,
  Layout,
  Measure,
  Fragment,
  DrawingFragment,
  ImageFragment,
  Run,
  Line,
} from '@superdoc/contracts';
import { findCharacterAtX, measureCharacterX } from './text-measurement.js';
import { clickToPositionDom } from './dom-mapping.js';

export type { HeaderFooterType } from '@superdoc/contracts';
export {
  extractIdentifierFromConverter,
  getHeaderFooterType,
  defaultHeaderFooterIdentifier,
  resolveHeaderFooterForPage,
} from './headerFooterUtils';
export type { HeaderFooterIdentifier } from './headerFooterUtils';
export { layoutHeaderFooterWithCache, type HeaderFooterBatchResult } from './layoutHeaderFooter';
export type { HeaderFooterBatch } from './layoutHeaderFooter';
export { findWordBoundaries, findParagraphBoundaries } from './text-boundaries';
export type { BoundaryRange } from './text-boundaries';
export { incrementalLayout, measureCache } from './incrementalLayout';
export type { HeaderFooterLayoutResult } from './incrementalLayout';
export { remeasureParagraph } from './remeasure';
export { measureCharacterX } from './text-measurement';
export { clickToPositionDom } from './dom-mapping';

export type Point = { x: number; y: number };
export type PageHit = { pageIndex: number; page: Layout['pages'][number] };
export type FragmentHit = {
  fragment: Fragment;
  block: FlowBlock;
  measure: Measure;
  pageIndex: number;
  pageY: number;
};

export type PositionHit = {
  pos: number;
  blockId: string;
  pageIndex: number;
  column: number;
  lineIndex: number;
};

export type Rect = { x: number; y: number; width: number; height: number; pageIndex: number };

type AtomicFragment = DrawingFragment | ImageFragment;

const isAtomicFragment = (fragment: Fragment): fragment is AtomicFragment => {
  return fragment.kind === 'drawing' || fragment.kind === 'image';
};

const logClickStage = (_level: 'log' | 'warn' | 'error', _stage: string, _payload: Record<string, unknown>) => {
  // Click logging has been removed
};

const blockPmRangeFromAttrs = (block: FlowBlock): { pmStart?: number; pmEnd?: number } => {
  const attrs = (block as { attrs?: Record<string, unknown> })?.attrs;
  const pmStart = typeof attrs?.pmStart === 'number' ? attrs.pmStart : undefined;
  const pmEnd = typeof attrs?.pmEnd === 'number' ? attrs.pmEnd : pmStart != null ? pmStart + 1 : undefined;
  return { pmStart, pmEnd };
};

const getAtomicPmRange = (fragment: AtomicFragment, block: FlowBlock): { pmStart?: number; pmEnd?: number } => {
  const pmStart = typeof fragment.pmStart === 'number' ? fragment.pmStart : blockPmRangeFromAttrs(block).pmStart;
  const pmEnd = typeof fragment.pmEnd === 'number' ? fragment.pmEnd : blockPmRangeFromAttrs(block).pmEnd;
  return { pmStart, pmEnd };
};

const rangesOverlap = (startA: number | undefined, endA: number | undefined, startB: number, endB: number): boolean => {
  if (startA == null) return false;
  const effectiveEndA = endA ?? startA + 1;
  return effectiveEndA > startB && startA < endB;
};

/**
 * Find the page hit given layout and a coordinate relative to the layout container.
 */
export function hitTestPage(layout: Layout, point: Point): PageHit | null {
  let cursorY = 0;
  for (let pageIndex = 0; pageIndex < layout.pages.length; pageIndex += 1) {
    const page = layout.pages[pageIndex];
    const top = cursorY;
    const bottom = top + layout.pageSize.h;
    if (point.y >= top && point.y < bottom) {
      return { pageIndex, page };
    }
    cursorY = bottom;
  }
  return null;
}

/**
 * Hit-test fragments within a page for a given point (page-relative coordinates).
 */
export function hitTestFragment(
  layout: Layout,
  pageHit: PageHit,
  blocks: FlowBlock[],
  measures: Measure[],
  point: Point,
): FragmentHit | null {
  const fragments = [...pageHit.page.fragments].sort((a, b) => {
    const ay = a.kind === 'para' ? a.y : 0;
    const by = b.kind === 'para' ? b.y : 0;
    if (Math.abs(ay - by) > 0.5) return ay - by;
    const ax = a.kind === 'para' ? a.x : 0;
    const bx = b.kind === 'para' ? b.x : 0;
    return ax - bx;
  });

  for (const fragment of fragments) {
    if (fragment.kind !== 'para') continue;
    const blockIndex = blocks.findIndex((block) => block.id === fragment.blockId);
    if (blockIndex === -1) continue;
    const block = blocks[blockIndex];
    const measure = measures[blockIndex];
    if (!block || block.kind !== 'paragraph' || measure?.kind !== 'paragraph') continue;

    // Calculate fragment's actual height from its lines, not measure.totalHeight
    const fragmentHeight = measure.lines
      .slice(fragment.fromLine, fragment.toLine)
      .reduce((sum, line) => sum + line.lineHeight, 0);

    const withinX = point.x >= fragment.x && point.x <= fragment.x + fragment.width;
    const withinY = point.y >= fragment.y && point.y <= fragment.y + fragmentHeight;
    if (!withinX || !withinY) {
      continue;
    }

    return {
      fragment,
      block,
      measure,
      pageIndex: pageHit.pageIndex,
      pageY: point.y - fragment.y,
    };
  }

  return null;
}

const hitTestAtomicFragment = (
  pageHit: PageHit,
  blocks: FlowBlock[],
  measures: Measure[],
  point: Point,
): FragmentHit | null => {
  for (const fragment of pageHit.page.fragments) {
    if (!isAtomicFragment(fragment)) continue;
    const withinX = point.x >= fragment.x && point.x <= fragment.x + fragment.width;
    const withinY = point.y >= fragment.y && point.y <= fragment.y + fragment.height;
    if (!withinX || !withinY) continue;

    const blockIndex = blocks.findIndex((block) => block.id === fragment.blockId);
    if (blockIndex === -1) continue;
    const block = blocks[blockIndex];
    const measure = measures[blockIndex];
    if (!block || !measure) continue;

    return {
      fragment,
      block,
      measure,
      pageIndex: pageHit.pageIndex,
      pageY: 0,
    };
  }
  return null;
};

/**
 * Map a coordinate click to a ProseMirror position.
 *
 * This function supports two mapping strategies:
 * 1. **DOM-based mapping** (preferred): Uses actual DOM elements with data attributes
 *    for pixel-perfect accuracy. Handles PM position gaps correctly.
 * 2. **Geometry-based mapping** (fallback): Uses layout geometry and text measurement
 *    when DOM is unavailable or mapping fails.
 *
 * To enable DOM mapping, provide the `domContainer` parameter and `clientX`/`clientY`
 * coordinates. The function will attempt DOM mapping first, falling back to geometry
 * if needed.
 *
 * @param layout - The layout data containing pages and fragments
 * @param blocks - Array of flow blocks from the document
 * @param measures - Array of text measurements for the blocks
 * @param containerPoint - Click point in layout container space (for geometry mapping)
 * @param domContainer - Optional DOM container element (enables DOM mapping)
 * @param clientX - Optional client X coordinate (required for DOM mapping)
 * @param clientY - Optional client Y coordinate (required for DOM mapping)
 * @returns Position hit with PM position and metadata, or null if mapping fails
 */
export function clickToPosition(
  layout: Layout,
  blocks: FlowBlock[],
  measures: Measure[],
  containerPoint: Point,
  domContainer?: HTMLElement,
  clientX?: number,
  clientY?: number,
): PositionHit | null {
  logClickStage('log', 'entry', {
    point: containerPoint,
    pages: layout.pages.length,
    hasDomContainer: domContainer != null,
  });

  // Try DOM-based mapping first if container and coordinates provided
  if (domContainer != null && clientX != null && clientY != null) {
    logClickStage('log', 'dom-attempt', { trying: 'DOM-based mapping' });
    const domPos = clickToPositionDom(domContainer, clientX, clientY);

    if (domPos != null) {
      // DOM mapping succeeded - we need to construct a PositionHit with metadata
      // Find the block containing this position to get blockId
      let blockId = '';
      let pageIndex = 0;
      let column = 0;
      let lineIndex = -1;

      // Search through layout to find the fragment containing this position
      for (let pi = 0; pi < layout.pages.length; pi++) {
        const page = layout.pages[pi];
        for (const fragment of page.fragments) {
          if (fragment.kind === 'para' && fragment.pmStart != null && fragment.pmEnd != null) {
            if (domPos >= fragment.pmStart && domPos <= fragment.pmEnd) {
              blockId = fragment.blockId;
              pageIndex = pi;
              column = determineColumn(layout, fragment.x);
              // Find line index if possible
              const blockIndex = blocks.findIndex((b) => b.id === fragment.blockId);
              if (blockIndex !== -1) {
                const measure = measures[blockIndex];
                if (measure && measure.kind === 'paragraph') {
                  for (let li = fragment.fromLine; li < fragment.toLine; li++) {
                    const line = measure.lines[li];
                    const range = computeLinePmRange(blocks[blockIndex], line);
                    if (range.pmStart != null && range.pmEnd != null) {
                      if (domPos >= range.pmStart && domPos <= range.pmEnd) {
                        lineIndex = li;
                        break;
                      }
                    }
                  }
                }
              }
              logClickStage('log', 'success', {
                blockId,
                pos: domPos,
                pageIndex,
                column,
                lineIndex,
                usedMethod: 'DOM',
              });
              return { pos: domPos, blockId, pageIndex, column, lineIndex };
            }
          }
        }
      }

      // Position found but couldn't locate in fragments - still return it
      logClickStage('log', 'success', {
        pos: domPos,
        usedMethod: 'DOM',
        note: 'position found but fragment not located',
      });
      return { pos: domPos, blockId: '', pageIndex: 0, column: 0, lineIndex: -1 };
    }

    logClickStage('log', 'dom-fallback', { reason: 'DOM mapping returned null, trying geometry' });
  }

  // Fallback to geometry-based mapping
  logClickStage('log', 'geometry-attempt', { trying: 'geometry-based mapping' });
  const pageHit = hitTestPage(layout, containerPoint);
  if (!pageHit) {
    logClickStage('warn', 'no-page', {
      point: containerPoint,
    });
    return null;
  }

  const pageRelativePoint: Point = {
    x: containerPoint.x,
    y: containerPoint.y - pageHit.pageIndex * layout.pageSize.h,
  };
  logClickStage('log', 'page-hit', {
    pageIndex: pageHit.pageIndex,
    pageRelativePoint,
  });

  const fragmentHit = hitTestFragment(layout, pageHit, blocks, measures, pageRelativePoint);
  if (fragmentHit) {
    const { fragment, block, measure, pageIndex, pageY } = fragmentHit;
    if (fragment.kind !== 'para' || measure.kind !== 'paragraph' || block.kind !== 'paragraph') {
      logClickStage('warn', 'fragment-type-mismatch', {
        fragmentKind: fragment.kind,
        measureKind: measure.kind,
        blockKind: block.kind,
      });
      return null;
    }
    const lineIndex = findLineIndexAtY(measure, pageY, fragment.fromLine, fragment.toLine);
    if (lineIndex == null) {
      logClickStage('warn', 'no-line', {
        blockId: fragment.blockId,
        pageIndex,
        pageY,
      });
      return null;
    }
    const line = measure.lines[lineIndex];

    const isRTL = isRtlBlock(block);
    const pos = mapPointToPm(block, line, pageRelativePoint.x - fragment.x, isRTL);
    if (pos == null) {
      logClickStage('warn', 'no-position', {
        blockId: fragment.blockId,
        lineIndex,
        isRTL,
      });
      return null;
    }

    const column = determineColumn(layout, fragment.x);
    logClickStage('log', 'success', {
      blockId: fragment.blockId,
      pos,
      pageIndex,
      column,
      lineIndex,
      origin: 'paragraph',
    });

    return {
      pos,
      blockId: fragment.blockId,
      pageIndex,
      column,
      lineIndex, // lineIndex is now already absolute (within measure.lines), no need to add fragment.fromLine
    };
  }

  const atomicHit = hitTestAtomicFragment(pageHit, blocks, measures, pageRelativePoint);
  if (atomicHit && isAtomicFragment(atomicHit.fragment)) {
    const { fragment, block, pageIndex } = atomicHit;
    const pmRange = getAtomicPmRange(fragment, block);
    const pos = pmRange.pmStart ?? pmRange.pmEnd ?? null;
    if (pos == null) {
      logClickStage('warn', 'atomic-without-range', {
        fragmentId: fragment.blockId,
      });
      return null;
    }

    logClickStage('log', 'success', {
      blockId: fragment.blockId,
      pos,
      pageIndex,
      column: determineColumn(layout, fragment.x),
      lineIndex: -1,
      origin: 'atomic',
    });

    return {
      pos,
      blockId: fragment.blockId,
      pageIndex,
      column: determineColumn(layout, fragment.x),
      lineIndex: -1,
    };
  }

  logClickStage('warn', 'no-fragment', {
    pageIndex: pageHit.pageIndex,
    pageRelativePoint,
  });
  return null;
}

/**
 * Given a PM range [from, to), return selection rectangles for highlighting.
 */
export function selectionToRects(
  layout: Layout,
  blocks: FlowBlock[],
  measures: Measure[],
  from: number,
  to: number,
): Rect[] {
  if (from === to) {
    return [];
  }

  const rects: Rect[] = [];
  layout.pages.forEach((page, pageIndex) => {
    page.fragments.forEach((fragment) => {
      if (fragment.kind === 'para') {
        const blockIndex = blocks.findIndex((block) => block.id === fragment.blockId);
        if (blockIndex === -1) return;
        const block = blocks[blockIndex];
        const measure = measures[blockIndex];
        if (!block || block.kind !== 'paragraph' || measure?.kind !== 'paragraph') {
          return;
        }

        const intersectingLines = findLinesIntersectingRange(block, measure, from, to);
        intersectingLines.forEach(({ line, index }) => {
          if (index < fragment.fromLine || index >= fragment.toLine) {
            return;
          }
          const range = computeLinePmRange(block, line);
          if (range.pmStart == null || range.pmEnd == null) return;
          const sliceFrom = Math.max(range.pmStart, from);
          const sliceTo = Math.min(range.pmEnd, to);
          if (sliceFrom >= sliceTo) return;

          const x1 = mapPmToX(block, line, sliceFrom - range.pmStart, fragment.width);
          const x2 = mapPmToX(block, line, sliceTo - range.pmStart, fragment.width);
          const rectX = fragment.x + Math.min(x1, x2);
          const rectWidth = Math.max(1, Math.abs(x2 - x1));
          const lineOffset = lineHeightBeforeIndex(measure, index) - lineHeightBeforeIndex(measure, fragment.fromLine);
          const rectY = fragment.y + lineOffset;
          rects.push({
            x: rectX,
            y: rectY + pageIndex * layout.pageSize.h,
            width: rectWidth,
            height: line.lineHeight,
            pageIndex,
          });
        });
        return;
      }

      if (isAtomicFragment(fragment)) {
        const blockIndex = blocks.findIndex((block) => block.id === fragment.blockId);
        if (blockIndex === -1) return;
        const block = blocks[blockIndex];
        const pmRange = getAtomicPmRange(fragment, block);
        if (!rangesOverlap(pmRange.pmStart, pmRange.pmEnd, from, to)) return;
        rects.push({
          x: fragment.x,
          y: fragment.y + pageIndex * layout.pageSize.h,
          width: fragment.width,
          height: fragment.height,
          pageIndex,
        });
      }
    });
  });

  return rects;
}

export function getFragmentAtPosition(
  layout: Layout,
  blocks: FlowBlock[],
  measures: Measure[],
  pos: number,
): FragmentHit | null {
  // Suppress bridge debug logs

  for (let pageIndex = 0; pageIndex < layout.pages.length; pageIndex += 1) {
    const page = layout.pages[pageIndex];
    for (const fragment of page.fragments) {
      // Debug fragment checks removed to reduce noise

      const blockIndex = blocks.findIndex((block) => block.id === fragment.blockId);
      if (blockIndex === -1) {
        continue;
      }
      const block = blocks[blockIndex];
      const measure = measures[blockIndex];
      if (!block || !measure) continue;

      if (fragment.kind === 'para') {
        if (block.kind !== 'paragraph' || measure.kind !== 'paragraph') continue;

        if (fragment.pmStart != null && fragment.pmEnd != null && pos >= fragment.pmStart && pos <= fragment.pmEnd) {
          return {
            fragment,
            block,
            measure,
            pageIndex,
            pageY: 0,
          };
        }
        continue;
      }

      if (isAtomicFragment(fragment)) {
        const { pmStart, pmEnd } = getAtomicPmRange(fragment, block);
        const start = pmStart ?? pmEnd;
        const end = pmEnd ?? pmStart;
        if (start == null || end == null) {
          continue;
        }
        const rangeStart = Math.min(start, end);
        const rangeEnd = Math.max(start, end);
        if (pos >= rangeStart && pos <= rangeEnd) {
          return {
            fragment,
            block,
            measure,
            pageIndex,
            pageY: 0,
          };
        }
      }
    }
  }
  return null;
}

export function findLinesIntersectingRange(
  block: FlowBlock,
  measure: Measure,
  from: number,
  to: number,
): { line: Line; index: number }[] {
  if (block.kind !== 'paragraph' || measure.kind !== 'paragraph') {
    return [];
  }
  const hits: { line: Line; index: number }[] = [];
  measure.lines.forEach((line, idx) => {
    const range = computeLinePmRange(block, line);
    if (range.pmStart == null || range.pmEnd == null) {
      return;
    }
    const intersects = range.pmEnd > from && range.pmStart < to;
    if (intersects) {
      hits.push({ line, index: idx });
    }
  });
  return hits;
}

export function computeLinePmRange(block: FlowBlock, line: Line): { pmStart?: number; pmEnd?: number } {
  if (block.kind !== 'paragraph') return {};

  let pmStart: number | undefined;
  let pmEnd: number | undefined;

  for (let runIndex = line.fromRun; runIndex <= line.toRun; runIndex += 1) {
    const run = block.runs[runIndex];
    if (!run) continue;

    const text = run.text ?? '';
    const runLength = text.length;
    const runPmStart = run.pmStart ?? null;
    const runPmEnd = run.pmEnd ?? (runPmStart != null ? runPmStart + runLength : null);

    if (runPmStart == null || runPmEnd == null) continue;

    const isFirstRun = runIndex === line.fromRun;
    const isLastRun = runIndex === line.toRun;
    const startOffset = isFirstRun ? line.fromChar : 0;
    const endOffset = isLastRun ? line.toChar : runLength;

    const sliceStart = runPmStart + startOffset;
    const sliceEnd = Math.min(runPmStart + endOffset, runPmEnd);

    if (pmStart == null) {
      pmStart = sliceStart;
    }
    pmEnd = sliceEnd;
  }

  return { pmStart, pmEnd };
}

const determineColumn = (layout: Layout, fragmentX: number): number => {
  const columns = layout.columns;
  if (!columns || columns.count <= 1) return 0;
  const usableWidth = layout.pageSize.w - columns.gap * (columns.count - 1);
  const columnWidth = usableWidth / columns.count;
  const span = columnWidth + columns.gap;
  const relative = fragmentX;
  const raw = Math.floor(relative / Math.max(span, 1));
  return Math.max(0, Math.min(columns.count - 1, raw));
};

/**
 * Finds the line index at a given Y offset within a paragraph measure.
 *
 * This function searches within a specified range of lines to determine which line
 * contains the given Y coordinate. It validates bounds to prevent out-of-bounds
 * access in case of corrupted layout data.
 *
 * @param measure - The paragraph measure containing line data
 * @param offsetY - The Y offset in pixels to search for
 * @param fromLine - The starting line index (inclusive)
 * @param toLine - The ending line index (exclusive)
 * @returns The line index containing the Y offset, or null if invalid
 *
 * @throws Never throws - returns null for invalid inputs
 */
const findLineIndexAtY = (measure: Measure, offsetY: number, fromLine: number, toLine: number): number | null => {
  if (measure.kind !== 'paragraph') return null;

  // Validate bounds to prevent out-of-bounds access
  const lineCount = measure.lines.length;
  if (fromLine < 0 || toLine > lineCount || fromLine >= toLine) {
    return null;
  }

  let cursor = 0;
  // Only search within the fragment's line range
  for (let i = fromLine; i < toLine; i += 1) {
    const line = measure.lines[i];
    // Guard against undefined lines (defensive check for corrupted data)
    if (!line) return null;

    const next = cursor + line.lineHeight;
    if (offsetY >= cursor && offsetY < next) {
      return i; // Return absolute line index within measure
    }
    cursor = next;
  }
  // If beyond all lines, return the last line in the fragment
  return toLine - 1;
};

const lineHeightBeforeIndex = (measure: Measure, absoluteLineIndex: number): number => {
  if (measure.kind !== 'paragraph') return 0;
  let height = 0;
  for (let i = 0; i < absoluteLineIndex; i += 1) {
    height += measure.lines[i]?.lineHeight ?? 0;
  }
  return height;
};

const mapPointToPm = (block: FlowBlock, line: Line, x: number, isRTL: boolean): number | null => {
  if (block.kind !== 'paragraph') return null;
  const range = computeLinePmRange(block, line);
  if (range.pmStart == null || range.pmEnd == null) return null;

  // Use shared text measurement utility for pixel-perfect accuracy
  const result = findCharacterAtX(block, line, x, range.pmStart);

  // Handle RTL text by reversing the position
  if (isRTL) {
    const charOffset = result.charOffset;
    const charsInLine = Math.max(1, line.toChar - line.fromChar);
    const reversedOffset = charsInLine - charOffset;
    return range.pmStart + reversedOffset;
  }

  return result.pmPosition;
};

const mapPmToX = (block: FlowBlock, line: Line, offset: number, fragmentWidth: number): number => {
  if (fragmentWidth <= 0 || line.width <= 0) return 0;
  // Use shared text measurement utility for pixel-perfect accuracy
  return measureCharacterX(block, line, offset);
};

const _sliceRunsForLine = (block: FlowBlock, line: Line): Run[] => {
  const result: Run[] = [];

  if (block.kind !== 'paragraph') return result;

  for (let runIndex = line.fromRun; runIndex <= line.toRun; runIndex += 1) {
    const run = block.runs[runIndex];
    if (!run) continue;

    if (run.kind === 'tab') {
      result.push(run);
      continue;
    }

    const text = run.text ?? '';
    const isFirstRun = runIndex === line.fromRun;
    const isLastRun = runIndex === line.toRun;

    if (isFirstRun || isLastRun) {
      const start = isFirstRun ? line.fromChar : 0;
      const end = isLastRun ? line.toChar : text.length;
      const slice = text.slice(start, end);
      const pmStart =
        run.pmStart != null ? run.pmStart + start : run.pmEnd != null ? run.pmEnd - (text.length - start) : undefined;
      const pmEnd =
        run.pmStart != null ? run.pmStart + end : run.pmEnd != null ? run.pmEnd - (text.length - end) : undefined;
      result.push({
        ...run,
        text: slice,
        pmStart,
        pmEnd,
      });
    } else {
      result.push(run);
    }
  }

  return result;
};

const isRtlBlock = (block: FlowBlock): boolean => {
  if (block.kind !== 'paragraph') return false;
  const attrs = block.attrs as Record<string, unknown> | undefined;
  if (!attrs) return false;
  const directionAttr = attrs.direction ?? attrs.dir ?? attrs.textDirection;
  if (typeof directionAttr === 'string' && directionAttr.toLowerCase() === 'rtl') {
    return true;
  }
  if (typeof attrs.rtl === 'boolean') {
    return attrs.rtl;
  }
  return false;
};
