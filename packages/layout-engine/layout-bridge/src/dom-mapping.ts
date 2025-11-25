/**
 * DOM-based click-to-position mapping utilities.
 *
 * This module provides pixel-perfect click-to-position mapping by reading actual
 * DOM elements with data attributes (`data-pm-start`, `data-pm-end`). This approach
 * is more accurate than pure geometry-based mapping because it uses the browser's
 * actual rendering and correctly handles ProseMirror position gaps that may occur
 * after document operations like paragraph joins.
 *
 * @module dom-mapping
 */

/**
 * Class names used by the DOM painter for layout elements.
 * These must match the painter's output structure.
 */
const CLASS_NAMES = {
  page: 'superdoc-page',
  fragment: 'superdoc-fragment',
  line: 'superdoc-line',
} as const;

/**
 * Maps a click coordinate to a ProseMirror document position using DOM data attributes.
 *
 * This function provides pixel-perfect accuracy by:
 * 1. Finding the fragment element under the click point using `elementsFromPoint`
 * 2. Finding the line element at the Y coordinate
 * 3. Finding the span (text run) at the X coordinate
 * 4. Using binary search with `document.createRange()` to find the exact character boundary
 *
 * The DOM structure must follow this pattern (as produced by the DOM painter):
 * ```
 * <div class="superdoc-page" data-page-index="0">
 *   <div class="superdoc-fragment" data-block-id="...">
 *     <div class="superdoc-line" data-pm-start="2" data-pm-end="19">
 *       <span data-pm-start="2" data-pm-end="12">text content</span>
 *       <span data-pm-start="14" data-pm-end="19">more text</span>
 *     </div>
 *   </div>
 * </div>
 * ```
 *
 * **Important:** This function correctly handles PM position gaps (e.g., 12→14 in the example
 * above) that can occur after document edits. The geometry-based mapping in `clickToPosition`
 * may produce incorrect positions in these cases, which is why DOM mapping should be preferred
 * when available.
 *
 * @param domContainer - The DOM container element (typically the viewport or page element)
 * @param clientX - X coordinate in viewport space (from MouseEvent.clientX)
 * @param clientY - Y coordinate in viewport space (from MouseEvent.clientY)
 * @returns ProseMirror document position, or null if mapping fails (no DOM data, invalid structure, etc.)
 *
 * @example
 * ```typescript
 * const pos = clickToPositionDom(viewportElement, event.clientX, event.clientY);
 * if (pos !== null) {
 *   editor.setSelection(pos, pos);
 * }
 * ```
 */
export function clickToPositionDom(domContainer: HTMLElement, clientX: number, clientY: number): number | null {
  // Find the page element that contains the click point
  const pageEl = findPageElement(domContainer, clientX, clientY);
  if (!pageEl) {
    return null;
  }

  const pageRect = pageEl.getBoundingClientRect();
  const pageLocalX = clientX - pageRect.left;
  const pageLocalY = clientY - pageRect.top;
  const viewX = pageRect.left + pageLocalX;
  const viewY = pageRect.top + pageLocalY;

  // Use elementsFromPoint to find all elements under the click
  // Note: Must call directly on document to maintain proper 'this' context
  interface DocumentWithElementsFromPoint {
    elementsFromPoint?(x: number, y: number): Element[];
  }

  let hitChain: Element[] = [];
  const doc = document as Document & DocumentWithElementsFromPoint;
  if (typeof doc.elementsFromPoint === 'function') {
    try {
      hitChain = doc.elementsFromPoint(viewX, viewY) ?? [];
    } catch {
      // elementsFromPoint failed, hitChain remains empty
    }
  }

  if (!Array.isArray(hitChain)) {
    return null;
  }

  // Find the fragment element under the click
  const fragmentEl = hitChain.find((el) => el.classList?.contains?.(CLASS_NAMES.fragment)) as HTMLElement | null;

  if (!fragmentEl) {
    // Fallback: try querySelector on the page
    const fallbackFragment = pageEl.querySelector(`.${CLASS_NAMES.fragment}`) as HTMLElement | null;

    if (!fallbackFragment) {
      return null;
    }

    return processFragment(fallbackFragment, viewX, viewY);
  }

  return processFragment(fragmentEl, viewX, viewY);
}

/**
 * Finds the page element containing the click coordinates.
 *
 * @param domContainer - The container element to search within
 * @param clientX - X coordinate in viewport space
 * @param clientY - Y coordinate in viewport space
 * @returns The page element, or null if not found
 */
function findPageElement(domContainer: HTMLElement, clientX: number, clientY: number): HTMLElement | null {
  // Check if the container itself is a page element
  if (domContainer.classList?.contains?.(CLASS_NAMES.page)) {
    return domContainer;
  }

  // First try elementsFromPoint to find the page directly
  interface DocumentWithElementsFromPoint {
    elementsFromPoint?(x: number, y: number): Element[];
  }

  const doc = document as Document & DocumentWithElementsFromPoint;
  if (typeof doc.elementsFromPoint === 'function') {
    try {
      const hitChain = doc.elementsFromPoint(clientX, clientY);
      if (Array.isArray(hitChain)) {
        const pageEl = hitChain.find((el) => el.classList?.contains?.(CLASS_NAMES.page)) as HTMLElement | null;

        if (pageEl) {
          return pageEl;
        }
      }
    } catch {
      // elementsFromPoint may fail in some environments, fall through to fallback
    }
  }

  // Fallback: find the closest page element in the container
  const pages = Array.from(domContainer.querySelectorAll(`.${CLASS_NAMES.page}`)) as HTMLElement[];

  for (const page of pages) {
    const rect = page.getBoundingClientRect();
    if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
      return page;
    }
  }

  // Last resort: return first page if one exists
  if (pages.length > 0) {
    return pages[0];
  }

  return null;
}

/**
 * Processes a fragment element to extract the PM position from a click.
 *
 * Finds the line at the Y coordinate, then the span at the X coordinate, and finally
 * uses binary search to find the exact character boundary within the span's text node.
 *
 * @param fragmentEl - The fragment element containing lines and spans with PM data attributes
 * @param viewX - X coordinate in viewport space
 * @param viewY - Y coordinate in viewport space
 * @returns ProseMirror position, or null if processing fails (missing elements or invalid data)
 *
 * @internal
 */
function processFragment(fragmentEl: HTMLElement, viewX: number, viewY: number): number | null {
  // Find the line element at the Y position
  const lineEls = Array.from(fragmentEl.querySelectorAll(`.${CLASS_NAMES.line}`)) as HTMLElement[];

  if (lineEls.length === 0) {
    return null;
  }

  const lineEl = findLineAtY(lineEls, viewY);
  if (!lineEl) {
    return null;
  }

  const lineStart = Number(lineEl.dataset.pmStart ?? 'NaN');
  const lineEnd = Number(lineEl.dataset.pmEnd ?? 'NaN');

  if (!Number.isFinite(lineStart) || !Number.isFinite(lineEnd)) {
    return null;
  }

  // Find the span (run slice) at the X position
  const spanEls = Array.from(lineEl.querySelectorAll('span')) as HTMLSpanElement[];

  if (spanEls.length === 0) {
    return lineStart;
  }

  // Check if click is before first span or after last span
  const firstRect = spanEls[0].getBoundingClientRect();
  if (viewX <= firstRect.left) {
    return lineStart;
  }

  const lastRect = spanEls[spanEls.length - 1].getBoundingClientRect();
  if (viewX >= lastRect.right) {
    return lineEnd;
  }

  // Find the target span containing or nearest to the X coordinate
  const targetSpan = findSpanAtX(spanEls, viewX);
  if (!targetSpan) {
    return lineStart;
  }

  const spanStart = Number(targetSpan.dataset.pmStart ?? 'NaN');
  const spanEnd = Number(targetSpan.dataset.pmEnd ?? 'NaN');

  if (!Number.isFinite(spanStart) || !Number.isFinite(spanEnd)) {
    return null;
  }

  // Get the text node and find the character index
  const firstChild = targetSpan.firstChild;
  if (!firstChild || firstChild.nodeType !== Node.TEXT_NODE || !firstChild.textContent) {
    // Empty span or non-text node: choose closer edge
    const spanRect = targetSpan.getBoundingClientRect();
    const closerToLeft = Math.abs(viewX - spanRect.left) <= Math.abs(viewX - spanRect.right);
    const snapPos = closerToLeft ? spanStart : spanEnd;
    return snapPos;
  }

  const textNode = firstChild as Text;
  const charIndex = findCharIndexAtX(textNode, targetSpan, viewX);
  const pos = spanStart + charIndex;

  return pos;
}

/**
 * Finds the line element at a given Y coordinate.
 *
 * Compares the Y coordinate against each line's bounding rectangle. If no line
 * contains the Y coordinate, returns the last line as a fallback (clicking below content).
 *
 * @param lineEls - Array of line elements with `data-pm-start` and `data-pm-end` attributes
 * @param viewY - Y coordinate in viewport space
 * @returns The matching line element, or last line if Y is below all lines, or null if no lines
 *
 * @internal
 */
function findLineAtY(lineEls: HTMLElement[], viewY: number): HTMLElement | null {
  if (lineEls.length === 0) {
    return null;
  }

  for (const lineEl of lineEls) {
    const rect = lineEl.getBoundingClientRect();
    if (viewY >= rect.top && viewY <= rect.bottom) {
      return lineEl;
    }
  }

  // If Y is beyond all lines, return the last line
  return lineEls[lineEls.length - 1];
}

/**
 * Finds the span element at a given X coordinate.
 *
 * Iterates through spans to find one whose bounding rectangle contains the X coordinate.
 * If no span contains X, returns the last span encountered (nearest to the right of X).
 * This handles bidirectional text and overlapping spans correctly.
 *
 * @param spanEls - Array of span elements with `data-pm-start` and `data-pm-end` attributes
 * @param viewX - X coordinate in viewport space
 * @returns The matching or nearest span element, or null if array is empty
 *
 * @internal
 */
function findSpanAtX(spanEls: HTMLSpanElement[], viewX: number): HTMLSpanElement | null {
  if (spanEls.length === 0) {
    return null;
  }

  let targetSpan: HTMLSpanElement = spanEls[0];

  for (const span of spanEls) {
    const rect = span.getBoundingClientRect();
    if (viewX >= rect.left && viewX <= rect.right) {
      return span;
    }
    // Track nearest span to the right if none contain X
    if (viewX > rect.right) {
      targetSpan = span;
    }
  }

  return targetSpan;
}

/**
 * Finds the character index in a text node closest to a given X coordinate.
 *
 * Uses binary search with `document.createRange()` to efficiently find the
 * character boundary nearest to the target X position. This provides accurate
 * click-to-character mapping even with variable-width fonts, ligatures, and
 * letter-spacing.
 *
 * @param textNode - The Text node containing the characters
 * @param span - The span element containing the text node (for position reference)
 * @param targetX - The target X coordinate in viewport space
 * @returns Character index (0-based) within the text node
 *
 * @example
 * ```typescript
 * const textNode = span.firstChild as Text;
 * const charIndex = findCharIndexAtX(textNode, span, 150);
 * // charIndex might be 5 if the click was near the 5th character
 * ```
 */
function findCharIndexAtX(textNode: Text, span: HTMLSpanElement, targetX: number): number {
  const text = textNode.textContent ?? '';
  const baseLeft = span.getBoundingClientRect().left;
  const range = document.createRange();

  // Binary search for the first character where measured X >= target X
  let lo = 0;
  let hi = text.length;

  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    range.setStart(textNode, 0);
    range.setEnd(textNode, mid);
    const w = range.getBoundingClientRect().width;
    const x = baseLeft + w;
    if (x < targetX) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }

  // lo is the first index where measured X >= click X
  // Compare with previous boundary to find nearest
  const index = Math.max(0, Math.min(text.length, lo));

  const measureAt = (i: number): number => {
    range.setStart(textNode, 0);
    range.setEnd(textNode, i);
    return baseLeft + range.getBoundingClientRect().width;
  };

  const xAt = measureAt(index);
  const distAt = Math.abs(xAt - targetX);

  // Check if previous boundary is closer
  if (index > 0) {
    const xPrev = measureAt(index - 1);
    const distPrev = Math.abs(xPrev - targetX);
    if (distPrev < distAt) {
      return index - 1;
    }
  }

  return index;
}
