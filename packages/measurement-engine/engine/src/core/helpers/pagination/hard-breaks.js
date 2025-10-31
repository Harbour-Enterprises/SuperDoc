import { extendBreakPositionWithSectionMarkers } from '../../../page-breaks/helpers/index.js';

/**
 * Detect explicit hard break markers within a DOM element.
 * @param {import('prosemirror-view').EditorView} view - Measurement editor view.
 * @param {HTMLElement} element - Host element being examined.
 * @param {DOMRect} containerRect - Container bounding rectangle.
 * @param {number} lowerBound - Lower page boundary in pixels.
 * @param {number} upperBound - Upper page boundary in pixels.
 * @returns {{top:number,bottom:number,pos:number}|null} Break metadata or null if none found.
 */
export const checkForHardBreak = (view, element, containerRect, lowerBound, upperBound) => {
  if (!element || !view) return null;

  let nextBreak = null;

  const recordCandidate = (node, fallbackElement) => {
    if (!node || typeof node.getBoundingClientRect !== 'function') return;
    const rect = node.getBoundingClientRect();
    if (!rect) return;

    const relativeTop = rect.top - containerRect.top;
    const relativeBottom = rect.bottom - containerRect.top;
    if (!Number.isFinite(relativeTop) || relativeTop <= lowerBound || relativeTop > upperBound) {
      return;
    }

    let pos = null;
    try {
      pos = view.posAtDOM(node, 0);
    } catch {}

    if (Number.isFinite(pos)) {
      const docNode = view.state?.doc ?? null;
      if (docNode) {
        const extendedPos = extendBreakPositionWithSectionMarkers(docNode, pos);
        if (extendedPos !== pos) {
          pos = extendedPos;
        }
      }
    }

    let resolvedBottom = Number.isFinite(relativeBottom) && relativeBottom > relativeTop ? relativeBottom : null;
    if (!resolvedBottom && fallbackElement && typeof fallbackElement.getBoundingClientRect === 'function') {
      const fallbackRect = fallbackElement.getBoundingClientRect();
      if (fallbackRect) {
        const fallbackBottom = fallbackRect.bottom - containerRect.top;
        if (Number.isFinite(fallbackBottom) && fallbackBottom > relativeTop) {
          resolvedBottom = fallbackBottom;
        }
      }
    }
    if (!resolvedBottom) {
      resolvedBottom = relativeTop;
    }

    if (!nextBreak || relativeTop < nextBreak.top) {
      nextBreak = {
        top: relativeTop,
        bottom: resolvedBottom,
        pos,
      };
    }
  };

  const considerDescendantSpans = (hostElement) => {
    const spans = hostElement.getElementsByTagName('span');
    for (let i = 0, len = spans.length; i < len; i += 1) {
      const span = spans[i];
      if (span.getAttribute('linebreaktype') !== 'page') continue;
      recordCandidate(span, hostElement);
    }
  };

  if (element instanceof HTMLElement && element.getAttribute('linebreaktype') === 'page') {
    const fallbackElement =
      element.previousElementSibling instanceof HTMLElement ? element.previousElementSibling : null;
    recordCandidate(element, fallbackElement);
    return nextBreak;
  }

  considerDescendantSpans(element);
  return nextBreak;
};
