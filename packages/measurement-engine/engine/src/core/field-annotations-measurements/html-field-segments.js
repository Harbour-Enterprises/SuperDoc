import { isHtmlFieldNode, extractHtmlFieldMetadata } from './html-field-utils.js';

const HTMLElementRef = typeof HTMLElement === 'undefined' ? null : HTMLElement;

const getSafeNumber = (...values) => {
  for (const value of values) {
    if (Number.isFinite(value)) {
      return value;
    }
  }
  return 0;
};

export function computeHtmlFieldSegments({ view, containerRect, pages }) {
  if (!view?.state?.doc || !containerRect || !Array.isArray(pages)) {
    return [];
  }

  const segmentsByField = [];
  const doc = view.state.doc;

  doc.descendants((node, pos) => {
    if (!isHtmlFieldNode(node)) {
      return true;
    }

    let domNode = null;
    try {
      domNode = view.nodeDOM(pos);
    } catch {}

    if (!domNode || typeof domNode.getBoundingClientRect !== 'function') {
      return true;
    }

    if (HTMLElementRef && !(domNode instanceof HTMLElementRef) && domNode.nodeType !== 1) {
      return true;
    }

    const rect = domNode.getBoundingClientRect();
    if (!rect) return true;

    const fieldTop = rect.top - containerRect.top;
    const fieldBottom = rect.bottom - containerRect.top;
    const fieldLeft = rect.left - containerRect.left;
    const fieldWidth = rect.width;
    const fieldHeight = rect.height;

    if (!Number.isFinite(fieldTop) || !Number.isFinite(fieldBottom)) {
      return true;
    }

    const pageSegments = [];
    for (const page of pages) {
      const pageIndex = Number.isInteger(page?.pageIndex) ? page.pageIndex : 0;
      const pageStart = getSafeNumber(page?.break?.startOffsetPx, page?.from ?? 0);
      const contentBoundary = pageStart + getSafeNumber(page?.metrics?.contentHeightPx, 0);
      const breakBoundary = Number.isFinite(page?.break?.fittedBottom) ? page.break.fittedBottom : null;
      const constrainedEnd = Number.isFinite(breakBoundary)
        ? Math.min(breakBoundary, contentBoundary)
        : contentBoundary;
      const pageEnd = Math.max(constrainedEnd, pageStart);
      if (!Number.isFinite(pageEnd) || pageEnd <= pageStart) continue;

      const marginTopPx = getSafeNumber(page?.metrics?.marginTopPx, 0);
      const pageContentStart = pageStart + marginTopPx;

      const displayTop = Math.max(fieldTop, pageContentStart);
      const displayBottom = Math.min(fieldBottom, pageEnd);
      if (displayBottom <= displayTop) continue;

      const topWithinPage = Math.max(displayTop - pageContentStart, 0);
      const bottomWithinPage = Math.max(displayBottom - pageContentStart, topWithinPage);
      const heightWithinPage = bottomWithinPage - topWithinPage;
      if (heightWithinPage <= 0) continue;

      pageSegments.push({
        pageIndex,
        absoluteTopPx: displayTop,
        absoluteBottomPx: displayBottom,
        topPx: topWithinPage,
        heightPx: heightWithinPage,
        offsetWithinFieldPx: displayTop - fieldTop,
      });
    }

    if (pageSegments.length) {
      const meta = extractHtmlFieldMetadata(node);

      segmentsByField.push({
        pos,
        nodeSize: node.nodeSize,
        attrs: meta,
        rect: {
          leftPx: fieldLeft,
          widthPx: fieldWidth,
          topPx: fieldTop,
          heightPx: fieldHeight,
        },
        segments: pageSegments,
      });
    }

    return true;
  });

  return segmentsByField;
}
