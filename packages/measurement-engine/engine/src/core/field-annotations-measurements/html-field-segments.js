import { isHtmlFieldNode, extractHtmlFieldMetadata } from './html-field-utils.js';

const HTMLElementRef = typeof HTMLElement === 'undefined' ? null : HTMLElement;
const ELEMENT_NODE = 1;

/**
 * Returns the first finite number from the provided values, or 0 if none are finite.
 * @param {...number} values - Numbers to check
 * @returns {number} First finite value or 0
 */
const getSafeNumber = (...values) => {
  for (const value of values) {
    if (Number.isFinite(value)) {
      return value;
    }
  }
  return 0;
};

/**
 * Validates if a DOM node is measurable (has getBoundingClientRect and is an element).
 * @param {Node|null} domNode - DOM node to validate
 * @returns {boolean} True if node is valid for measurement
 */
const isValidDomNode = (domNode) => {
  if (!domNode || typeof domNode.getBoundingClientRect !== 'function') {
    return false;
  }

  // Allow all nodes if HTMLElement is not available (server-side)
  if (!HTMLElementRef) {
    return true;
  }

  // Accept HTMLElement instances or any element node (nodeType === 1)
  return domNode instanceof HTMLElementRef || domNode.nodeType === ELEMENT_NODE;
};

/**
 * Calculates field boundaries relative to the container.
 * @param {DOMRect} domRect - Bounding rect from DOM
 * @param {Object} containerRect - Container's bounding rect
 * @returns {Object|null} Field bounds or null if invalid
 */
const calculateFieldBounds = (domRect, containerRect) => {
  if (!domRect) {
    return null;
  }

  const fieldTop = domRect.top - containerRect.top;
  const fieldBottom = domRect.bottom - containerRect.top;
  const fieldLeft = domRect.left - containerRect.left;

  if (!Number.isFinite(fieldTop) || !Number.isFinite(fieldBottom)) {
    return null;
  }

  return {
    top: fieldTop,
    bottom: fieldBottom,
    left: fieldLeft,
    width: domRect.width,
    height: domRect.height,
  };
};

/**
 * Computes a single page segment for a field within a specific page.
 * @param {Object} page - Page definition
 * @param {Object} fieldBounds - Field boundary coordinates
 * @returns {Object|null} Page segment or null if field doesn't intersect page
 */
const computePageSegment = (page, fieldBounds) => {
  const pageIndex = Number.isInteger(page?.pageIndex) ? page.pageIndex : 0;
  const pageStart = getSafeNumber(page?.break?.startOffsetPx, page?.from ?? 0);
  const contentBoundary = pageStart + getSafeNumber(page?.metrics?.contentHeightPx, 0);
  const breakBoundary = Number.isFinite(page?.break?.fittedBottom) ? page.break.fittedBottom : null;

  const constrainedEnd = Number.isFinite(breakBoundary) ? Math.min(breakBoundary, contentBoundary) : contentBoundary;

  const pageEnd = Math.max(constrainedEnd, pageStart);

  // Skip invalid pages
  if (!Number.isFinite(pageEnd) || pageEnd <= pageStart) {
    return null;
  }

  const marginTopPx = getSafeNumber(page?.metrics?.marginTopPx, 0);
  const pageContentStart = pageStart + marginTopPx;

  // Calculate visible portion of field within this page
  const displayTop = Math.max(fieldBounds.top, pageContentStart);
  const displayBottom = Math.min(fieldBounds.bottom, pageEnd);

  // Skip if field doesn't intersect with page
  if (displayBottom <= displayTop) {
    return null;
  }

  const topWithinPage = Math.max(displayTop - pageContentStart, 0);
  const bottomWithinPage = Math.max(displayBottom - pageContentStart, topWithinPage);
  const heightWithinPage = bottomWithinPage - topWithinPage;

  // Final sanity check
  if (heightWithinPage <= 0) {
    return null;
  }

  return {
    pageIndex,
    absoluteTopPx: displayTop,
    absoluteBottomPx: displayBottom,
    topPx: topWithinPage,
    heightPx: heightWithinPage,
    offsetWithinFieldPx: displayTop - fieldBounds.top,
  };
};

/**
 * Computes field segments showing how HTML fields span across paginated pages.
 * @param {Object} params - Parameters
 * @param {Object} params.view - ProseMirror view
 * @param {Object} params.containerRect - Container bounding rect
 * @param {Array} params.pages - Page definitions
 * @returns {Array} Array of field segment data
 */
export function computeHtmlFieldSegments({ view, containerRect, pages }) {
  if (!view?.state?.doc || !containerRect || !Array.isArray(pages)) {
    return [];
  }

  const segmentsByField = [];

  view.state.doc.descendants((node, pos) => {
    if (!isHtmlFieldNode(node)) {
      return true;
    }

    // Get DOM node safely
    let domNode = null;
    try {
      domNode = view.nodeDOM(pos);
    } catch {
      return true;
    }

    // Validate DOM node is measurable
    if (!isValidDomNode(domNode)) {
      return true;
    }

    // Calculate field boundaries
    const domRect = domNode.getBoundingClientRect();
    const fieldBounds = calculateFieldBounds(domRect, containerRect);
    if (!fieldBounds) {
      return true;
    }

    // Compute segments for each page
    const pageSegments = pages
      .map((page) => computePageSegment(page, fieldBounds))
      .filter((segment) => segment !== null);

    // Only include fields that appear on at least one page
    if (pageSegments.length > 0) {
      segmentsByField.push({
        pos,
        nodeSize: node.nodeSize,
        attrs: extractHtmlFieldMetadata(node),
        rect: {
          leftPx: fieldBounds.left,
          widthPx: fieldBounds.width,
          topPx: fieldBounds.top,
          heightPx: fieldBounds.height,
        },
        segments: pageSegments,
      });
    }

    return true;
  });

  return segmentsByField;
}
