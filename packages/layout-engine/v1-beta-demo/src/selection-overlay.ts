import type { FlowBlock, Layout, Measure, Line } from '@superdoc/contracts';
import {
  selectionToRects,
  getFragmentAtPosition,
  computeLinePmRange,
  type FragmentHit,
} from '../../layout-bridge/src/index.js';
import { measureCharacterX } from '../../layout-bridge/src/text-measurement.js';

type OverlayState = {
  rects: ReturnType<typeof selectionToRects>;
  caret: CaretRect | null;
};

type CaretRect = {
  x: number;
  y: number;
  height: number;
};

type CaretMode = 'auto' | 'dom' | 'canvas';

export class SelectionOverlay {
  private readonly root: HTMLElement;
  private readonly layoutContainer: HTMLElement;
  private state: OverlayState = { rects: [], caret: null };
  private layout: Layout | null = null;

  constructor(root: HTMLElement, layoutContainer: HTMLElement) {
    this.root = root;
    this.layoutContainer = layoutContainer;
    this.root.classList.add('selection-overlay');
  }

  update(data: {
    layout: Layout;
    blocks: FlowBlock[];
    measures: Measure[];
    selection: { from: number; to: number };
  }): void {
    this.layout = data.layout;
    if (data.selection.from === data.selection.to) {
      const caret = this.computeCaret(data, data.selection.from);
      this.state = { rects: [], caret };
      this.render();
      return;
    }

    const rects = selectionToRects(data.layout, data.blocks, data.measures, data.selection.from, data.selection.to);
    this.state = { rects, caret: null };
    this.render();
  }

  clear(): void {
    this.state = { rects: [], caret: null };
    this.render();
  }

  private render(): void {
    const { rects, caret } = this.state;
    this.root.innerHTML = '';
    rects.forEach((rect) => {
      if (!this.layout) return;

      // Convert from layout-space coordinates to page-local, then to DOM coordinates
      // selectionToRects returns rect.y in layout-space (includes pageIndex * pageHeight)
      const pageLocalX = rect.x;
      const pageLocalY = rect.y - rect.pageIndex * this.layout.pageSize.h;

      const domCoords = this.convertPageLocalToDom(rect.pageIndex, pageLocalX, pageLocalY);
      if (!domCoords) return;

      const el = document.createElement('div');
      el.classList.add('selection-overlay__rect');
      el.style.left = `${domCoords.x}px`;
      el.style.top = `${domCoords.y}px`;
      el.style.width = `${rect.width}px`;
      el.style.height = `${rect.height}px`;
      this.root.appendChild(el);
    });
    if (caret) {
      const caretEl = document.createElement('div');
      caretEl.classList.add('selection-overlay__caret');
      caretEl.style.left = `${caret.x}px`;
      caretEl.style.top = `${caret.y}px`;
      caretEl.style.height = `${caret.height}px`;
      this.root.appendChild(caretEl);
    }
  }

  private computeCaret(
    data: {
      layout: Layout;
      blocks: FlowBlock[];
      measures: Measure[];
    },
    pos: number,
  ): CaretRect | null {
    const hit = getFragmentAtPosition(data.layout, data.blocks, data.measures, pos);

    if (!hit) return null;
    if (hit.block.kind !== 'paragraph' || hit.measure.kind !== 'paragraph') return null;

    const lineInfo = this.findLineContainingPos(hit, pos);

    if (!lineInfo) return null;
    const { line, index } = lineInfo;
    const range = computeLinePmRange(hit.block, line);

    if (range.pmStart == null) return null;

    const charsInLine = Math.max(1, line.toChar - line.fromChar);
    const offsetChars = Math.max(0, Math.min(charsInLine, pos - range.pmStart));

    // Determine caret measurement mode
    const mode = this.getCaretMode();

    // Optional comparison for debugging
    // Enable comparison logs by default; can be turned off via window.__overlayDebug.compare = false
    const compare = (window as any)?.__overlayDebug?.compare !== false;
    let domCaret: CaretRect | null = null;
    let canvasCaret: CaretRect | null = null;

    if (mode !== 'canvas') {
      domCaret = this.computeCaretDom(hit, pos, { line, offsetChars });
      if (compare) canvasCaret = this.computeCaretCanvas(hit, { line, offsetChars });
      if (domCaret && !compare) return domCaret;
    }

    if (mode === 'canvas' || !domCaret) {
      canvasCaret = this.computeCaretCanvas(hit, { line, offsetChars });
      if (canvasCaret && !compare) return canvasCaret;
    }

    if (compare && (domCaret || canvasCaret)) {
      // Log both results for debugging

      return domCaret ?? canvasCaret;
    }

    // If neither method produced a caret, return null
    return null;
  }

  /**
   * Compute caret coordinates using actual DOM spans rendered by the painter.
   *
   * This method provides pixel-perfect caret positioning by reading from rendered
   * DOM elements, which correctly handles PM position gaps (e.g., when text runs
   * have discontinuous position ranges like 2-12, 14-19 after paragraph joins).
   *
   * Uses document.createRange() to measure exact character boundaries within
   * text nodes, ensuring accurate positioning even with complex typography.
   *
   * @param hit - Fragment hit containing block, measure, and page information
   * @param pos - ProseMirror document position for caret placement
   * @param context - Line and character offset information
   * @returns CaretRect with coordinates relative to overlay root, or null if DOM unavailable
   */
  private computeCaretDom(
    hit: FragmentHit & { block: FlowBlock; measure: Measure },
    pos: number,
    context: { line: Line; offsetChars: number },
  ): CaretRect | null {
    if (!this.layout) return null;
    const pageEl = this.layoutContainer.querySelector(
      `.superdoc-page[data-page-index="${hit.pageIndex}"]`,
    ) as HTMLElement | null;
    if (!pageEl) return null;

    const fragmentEl = pageEl.querySelector(
      `.superdoc-fragment[data-block-id="${hit.block.id}"]`,
    ) as HTMLElement | null;
    if (!fragmentEl) return null;

    // Find the line element containing the position using data attributes
    const lineEls = Array.from(fragmentEl.querySelectorAll('.superdoc-line')) as HTMLElement[];
    let lineEl: HTMLElement | null = null;
    for (const el of lineEls) {
      const ls = Number(el.dataset.pmStart ?? 'NaN');
      const le = Number(el.dataset.pmEnd ?? 'NaN');
      if (Number.isFinite(ls) && Number.isFinite(le) && pos >= ls && pos <= le) {
        lineEl = el;
        break;
      }
    }
    if (!lineEl) return null;

    // Find the span (run slice) containing the position
    const spans = Array.from(lineEl.querySelectorAll('span')) as HTMLSpanElement[];
    let targetSpan: HTMLSpanElement | null = null;
    let spanPmStart = 0;
    let spanPmEnd = 0;
    for (const span of spans) {
      const s = Number(span.dataset.pmStart ?? 'NaN');
      const e = Number(span.dataset.pmEnd ?? 'NaN');
      if (Number.isFinite(s) && Number.isFinite(e) && pos >= s && pos <= e) {
        targetSpan = span;
        spanPmStart = s;
        spanPmEnd = e;
        break;
      }
    }
    if (!targetSpan) {
      // If position equals end of line, use last span as caret anchor
      const last = spans[spans.length - 1];
      if (!last) return null;
      targetSpan = last;
      spanPmStart = Number(last.dataset.pmStart ?? 'NaN');
      spanPmEnd = Number(last.dataset.pmEnd ?? 'NaN');
      if (!Number.isFinite(spanPmStart) || !Number.isFinite(spanPmEnd)) return null;
    }

    const firstChild = targetSpan.firstChild;
    // Verify we have a text node
    if (!firstChild || firstChild.nodeType !== Node.TEXT_NODE) return null;

    const textNode = firstChild as Text;
    const spanTextLength = textNode.textContent?.length ?? 0;
    const offsetInSpan = Math.max(0, Math.min(spanTextLength, pos - spanPmStart));

    const range = document.createRange();
    try {
      range.setStart(textNode, offsetInSpan);
      range.setEnd(textNode, offsetInSpan);
    } catch {
      return null;
    }

    const caretRect = range.getBoundingClientRect();
    const overlayRect = this.root.getBoundingClientRect();
    const lineRect = lineEl.getBoundingClientRect();

    // If the caret rect is empty, use the span's left edge as a fallback
    const domXBase = caretRect?.left ?? targetSpan.getBoundingClientRect().left;
    const domXWidth = caretRect?.width ?? 0;
    const domX = domXBase + (domXWidth > 0 ? domXWidth : 0) - overlayRect.left;
    const domY = lineRect.top - overlayRect.top;

    return {
      x: domX,
      y: domY,
      height: context.line.lineHeight,
    };
  }

  /**
   * Compute caret using Canvas-based text measurement (fallback method).
   *
   * This method calculates caret position using Canvas measureText API and
   * geometric layout coordinates. It's used as a fallback when DOM elements
   * are unavailable (e.g., during initial render or in headless mode).
   *
   * Note: Canvas-based measurement may have slight inaccuracies with complex
   * fonts or ligatures. Prefer computeCaretDom when DOM is available.
   *
   * @param hit - Fragment hit containing block, measure, and page information
   * @param context - Line and character offset information
   * @returns CaretRect with coordinates relative to overlay root, or null on failure
   */
  private computeCaretCanvas(
    hit: FragmentHit & { block: FlowBlock; measure: Measure },
    context: { line: Line; offsetChars: number },
  ): CaretRect | null {
    if (!this.layout) return null;
    const measuredX = measureCharacterX(hit.block, context.line, context.offsetChars);
    const pageLocalX = hit.fragment.x + measuredX;
    const lineIndex = this.findLineIndex(hit, context.line);
    const lineOffsetY = this.lineHeightBeforeIndex((hit.measure as any).lines, hit.fragment.fromLine, lineIndex);
    const pageLocalY = hit.fragment.y + lineOffsetY;
    const dom = this.convertPageLocalToDom(hit.pageIndex, pageLocalX, pageLocalY);
    if (!dom) return null;
    return { x: dom.x, y: dom.y, height: context.line.lineHeight };
  }

  private findLineIndex(hit: FragmentHit, line: Line): number {
    const measure = (hit.measure as any).lines as Line[];
    const start = hit.fragment.fromLine;
    for (let i = start; i < hit.fragment.toLine; i += 1) {
      if (measure[i] === line) return i;
    }
    return hit.fragment.fromLine;
  }

  private getCaretMode(): CaretMode {
    const debug = (window as any)?.__overlayDebug;
    const value = typeof debug?.caretMode === 'string' ? (debug.caretMode as string) : 'auto';
    if (value === 'dom' || value === 'canvas') return value;
    return 'auto';
  }

  private findLineContainingPos(hit: FragmentHit, pos: number): { line: Line; index: number } | null {
    const { fragment, measure, block } = hit;
    if (measure.kind !== 'paragraph' || block.kind !== 'paragraph') return null;
    for (let lineIndex = fragment.fromLine; lineIndex < fragment.toLine; lineIndex += 1) {
      const line = measure.lines[lineIndex];
      if (!line) continue;
      const range = computeLinePmRange(block, line);
      if (range.pmStart == null || range.pmEnd == null) continue;
      if (pos >= range.pmStart && pos <= range.pmEnd) {
        return { line, index: lineIndex };
      }
    }
    return null;
  }

  private lineHeightBeforeIndex(lines: Line[], fromLine: number, targetIndex: number): number {
    let offset = 0;
    for (let i = fromLine; i < targetIndex; i += 1) {
      offset += lines[i]?.lineHeight ?? 0;
    }
    return offset;
  }

  private convertPageLocalToDom(
    pageIndex: number,
    pageLocalX: number,
    pageLocalY: number,
  ): { x: number; y: number } | null {
    // Find the actual page element in the DOM using stable page index
    const pageElement = this.layoutContainer.querySelector(
      `.superdoc-page[data-page-index="${pageIndex}"]`,
    ) as HTMLElement;
    if (!pageElement) {
      console.warn(`[SelectionOverlay] Page element not found for pageIndex=${pageIndex}`);
      return null;
    }

    // Get the bounding rectangles
    const pageRect = pageElement.getBoundingClientRect();
    const overlayRect = this.root.getBoundingClientRect();

    // Convert page-local coordinates to DOM coordinates
    // pageRect gives us the page's position in viewport coordinates
    // We subtract overlayRect to get the position relative to the overlay container
    const domX = pageRect.left - overlayRect.left + pageLocalX;
    const domY = pageRect.top - overlayRect.top + pageLocalY;

    return { x: domX, y: domY };
  }
}
