// @ts-check
import { Decoration, DecorationSet } from 'prosemirror-view';

const loggedBreakIds = new Set();
let loggedLeadingSpacer = false;
let loggedTrailingSpacer = false;

/**
 * @typedef {Object} PageBreak
 * @property {number} [pos]
 * @property {{pos?: number}} [break]
 * @property {{to?: number}} [boundary]
 * @property {number} [to]
 * @property {{ headerHeightPx?: number, footerHeightPx?: number, gapHeightPx?: number, totalHeightPx?: number }} [placeholder]
 * @property {number} [pageIndex]
 */

/**
 * Builds decorations for page breaks in the document.
 * @param {import('prosemirror-model').Node} doc
 * @param {PageBreak[]} pageBreaks
 * @param {{
 *   leadingSpacingPx?: number,
 *   trailingSpacingPx?: number,
 *   pageFillers?: Array<{ pos:number,heightPx:number,pageIndex?:number,key?:string }>,
 *   pageHeaderHeights?: number[],
 *   pageFooterHeights?: number[],
 * }} [options]
 * @returns {DecorationSet}
 */
export const buildPageBreakDecorations = (doc, pageBreaks, options = {}) => {
  const widgets = [];

  const leadingSpacingPx = getSafeNumber(options.leadingSpacingPx);
  const trailingSpacingPx = getSafeNumber(options.trailingSpacingPx);
  const pageFillers = Array.isArray(options.pageFillers) ? options.pageFillers : [];
  const pageHeaderHeights = Array.isArray(options.pageHeaderHeights) ? options.pageHeaderHeights : null;
  const pageFooterHeights = Array.isArray(options.pageFooterHeights) ? options.pageFooterHeights : null;
  if (!pageBreaks?.length) {
    loggedBreakIds.clear();
  }

  if (leadingSpacingPx > 0) {
    if (!loggedLeadingSpacer) {
      console.debug('[pagination] leading spacer', {
        headerHeightPx: leadingSpacingPx,
        gapHeightPx: 0,
        footerHeightPx: 0,
        expectedSpacerPx: leadingSpacingPx,
        explicitSpacerPx: leadingSpacingPx,
      });
      loggedLeadingSpacer = true;
    }
    widgets.push(
      Decoration.widget(0, () => createLeadingSpacer(leadingSpacingPx), {
        key: `page-leading-spacer-${Math.round(leadingSpacingPx)}`,
      }),
    );
  } else {
    loggedLeadingSpacer = false;
  }

  (pageBreaks || []).forEach((pageBreak, index) => {
    const rawPos = resolveBreakPosition(pageBreak);
    const pos = typeof rawPos === 'number' && !Number.isNaN(rawPos) ? rawPos : doc.content.size;

    const pageIndex = Number.isInteger(pageBreak?.pageIndex) ? pageBreak.pageIndex : index;
    const nextHeaderOverride = pickBandHeight(pageHeaderHeights, pageIndex + 1);
    const prevFooterOverride = pickBandHeight(pageFooterHeights, pageIndex);
    const footerHeight = normalizeHeight(prevFooterOverride, pageBreak?.placeholder?.footerHeightPx);
    const headerHeight = normalizeHeight(nextHeaderOverride, pageBreak?.placeholder?.headerHeightPx);
    const gapHeight = getSafeNumber(pageBreak?.placeholder?.gapHeightPx);
    const spacerHeight = headerHeight + gapHeight;
    const totalHeight = footerHeight + gapHeight + headerHeight;
    console.debug('[pagination-debug] decoration-build', {
      pageIndex,
      widgetIndex: index,
      pos,
      footerHeight,
      headerHeight,
      gapHeight,
      spacerHeight,
      headerOverride: nextHeaderOverride,
      footerOverride: prevFooterOverride,
      placeholderHeader: pageBreak?.placeholder?.headerHeightPx,
      placeholderFooter: pageBreak?.placeholder?.footerHeightPx,
      isTrailing: rawPos == null,
    });
    const placeholder = createBreakPlaceholder(pageBreak, index, {
      headerHeightPx: headerHeight,
      footerHeightPx: footerHeight,
      gapHeightPx: gapHeight,
      totalHeightPx: totalHeight,
    });

    const breakId = Number.isInteger(pageBreak?.pageIndex) ? `page-${pageBreak.pageIndex}` : `pos-${pos}`;
    if (!loggedBreakIds.has(breakId)) {
      console.debug('[pagination] spacer', {
        pageIndex: Number.isInteger(pageBreak?.pageIndex) ? pageBreak.pageIndex : index,
        headerHeightPx: headerHeight,
        gapHeightPx: gapHeight,
        footerHeightPx: footerHeight,
        placeholderHeightPx: getSafeNumber(pageBreak?.placeholder?.totalHeightPx),
        expectedSpacerPx: spacerHeight,
        explicitSpacerPx: spacerHeight,
      });
      loggedBreakIds.add(breakId);
    }

    const key = createDecorationKey(pageBreak, pos, index);
    widgets.push(
      Decoration.widget(pos, () => createCombinedSpacer({ placeholder, spacerHeight }), {
        key,
      }),
    );
  });

  pageFillers.forEach((filler, index) => {
    const height = getSafeNumber(filler?.heightPx);
    const pos = Number.isFinite(filler?.pos) ? filler.pos : doc.content.size;
    if (height <= 0 || pos == null) return;
    const pageIndex = Number.isInteger(filler?.pageIndex) ? filler.pageIndex : null;
    const keyBase = typeof filler?.key === 'string' ? filler.key : `page-fill-${pos}-${index}`;
    widgets.push(
      Decoration.widget(pos, () => createPageFillSpacer({ heightPx: height, pageIndex }), {
        key: keyBase,
        side: -1,
      }),
    );
  });

  if (trailingSpacingPx > 0) {
    if (!loggedTrailingSpacer) {
      console.debug('[pagination] trailing spacer', {
        footerHeightPx: trailingSpacingPx,
      });
      loggedTrailingSpacer = true;
    }
    widgets.push(
      Decoration.widget(doc.content.size, () => createTrailingSpacer(trailingSpacingPx), {
        key: `page-trailing-spacer-${Math.round(trailingSpacingPx)}`,
      }),
    );
  } else {
    loggedTrailingSpacer = false;
  }

  if (!widgets.length) {
    return DecorationSet.empty;
  }

  return DecorationSet.create(doc, widgets);
};

const resolveBreakPosition = (pageBreak) => {
  if (!pageBreak) return null;
  if (typeof pageBreak.pos === 'number') return pageBreak.pos;
  if (typeof pageBreak.break?.pos === 'number') return pageBreak.break.pos;
  if (typeof pageBreak.boundary?.to === 'number') return pageBreak.boundary.to;
  if (typeof pageBreak.to === 'number') return pageBreak.to;
  return null;
};

const createBreakPlaceholder = (pageBreak, index, overrides) => {
  const element = document.createElement('div');
  element.className = 'page-break';

  const placeholder = pageBreak?.placeholder ?? null;
  const headerHeight = getSafeNumber(overrides?.headerHeightPx ?? placeholder?.headerHeightPx);
  const footerHeight = getSafeNumber(overrides?.footerHeightPx ?? placeholder?.footerHeightPx);
  const gapHeight = getSafeNumber(overrides?.gapHeightPx ?? placeholder?.gapHeightPx);
  const totalOverride = getSafeNumber(overrides?.totalHeightPx ?? placeholder?.totalHeightPx);
  const totalHeight = totalOverride > 0 ? totalOverride : headerHeight + gapHeight + footerHeight;

  if (Number.isInteger(pageBreak?.pageIndex)) {
    element.dataset.pageIndex = String(pageBreak.pageIndex);
    element.dataset.pageNumber = String(pageBreak.pageIndex + 1);
  } else if (Number.isInteger(index)) {
    element.dataset.pageIndex = String(index);
    element.dataset.pageNumber = String(index + 1);
  }

  if (Number.isInteger(pageBreak?.break?.pos)) {
    element.dataset.breakPos = String(pageBreak.break.pos);
  }

  element.style.display = 'flex';
  element.style.flexDirection = 'column';
  element.style.width = '100%';
  element.style.height = `${totalHeight}px`;
  element.style.minHeight = `${totalHeight}px`;
  element.style.backgroundColor = 'rgba(191, 219, 254, 0.25)';
  element.style.pointerEvents = 'none';
  element.style.boxSizing = 'border-box';
  element.style.border = '1px solid rgba(59, 130, 246, 0.35)';

  appendSegment(element, footerHeight, {
    className: 'page-break__footer',
    backgroundColor: 'rgba(191, 219, 254, 0.35)',
    borderBottom: '1px dashed rgba(59, 130, 246, 0.65)',
  });

  appendSegment(element, gapHeight, {
    className: 'page-break__gap',
    backgroundColor: 'rgba(191, 219, 254, 0.55)',
    borderBottom: '1px dashed rgba(59, 130, 246, 0.5)',
  });

  appendSegment(element, headerHeight, {
    className: 'page-break__header',
    backgroundColor: 'rgba(191, 219, 254, 0.35)',
    borderBottom: 'none',
    borderTop: '1px dashed rgba(59, 130, 246, 0.65)',
  });

  element.dataset.headerHeight = `${headerHeight}`;
  element.dataset.footerHeight = `${footerHeight}`;
  element.dataset.gapHeight = `${gapHeight}`;
  element.dataset.totalHeight = `${totalHeight}`;

  return element;
};

const createLeadingSpacer = (heightPx) => {
  const height = getSafeNumber(heightPx);
  const container = document.createElement('div');
  container.className = 'page-leading-spacer';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.width = '100%';
  container.style.height = `${height}px`;
  container.style.minHeight = `${height}px`;
  container.style.pointerEvents = 'none';
  container.style.boxSizing = 'border-box';
  container.style.backgroundColor = 'rgba(191, 219, 254, 0.25)';
  container.style.border = '1px solid rgba(59, 130, 246, 0.35)';
  container.dataset.leadingSpacer = 'true';
  container.dataset.leadingSpacerHeight = `${height}`;
  container.dataset.leadingSpacerSegment = 'header';

  appendSegment(container, height, {
    className: 'page-leading-spacer__header',
    backgroundColor: 'rgba(191, 219, 254, 0.35)',
    borderBottom: '1px dashed rgba(59, 130, 246, 0.65)',
  });

  return container;
};

const createTrailingSpacer = (heightPx) => {
  const height = getSafeNumber(heightPx);
  const container = document.createElement('div');
  container.className = 'page-trailing-spacer';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.width = '100%';
  container.style.height = `${height}px`;
  container.style.minHeight = `${height}px`;
  container.style.pointerEvents = 'none';
  container.style.boxSizing = 'border-box';
  container.style.backgroundColor = 'rgba(191, 219, 254, 0.25)';
  container.style.border = '1px solid rgba(59, 130, 246, 0.35)';
  container.dataset.trailingSpacer = 'true';
  container.dataset.trailingSpacerHeight = `${height}`;
  container.dataset.trailingSpacerSegment = 'footer';

  appendSegment(container, height, {
    className: 'page-trailing-spacer__footer',
    backgroundColor: 'rgba(191, 219, 254, 0.35)',
    borderTop: '1px dashed rgba(59, 130, 246, 0.65)',
  });

  return container;
};

const createPageFillSpacer = ({ heightPx, pageIndex }) => {
  const height = getSafeNumber(heightPx);
  const container = document.createElement('div');
  container.className = 'page-fill-spacer';
  container.style.display = 'block';
  container.style.width = '100%';
  container.style.height = `${height}px`;
  container.style.minHeight = `${height}px`;
  container.style.pointerEvents = 'none';
  container.style.boxSizing = 'border-box';
  container.style.backgroundColor = 'rgba(253, 186, 116, 0.4)';
  container.style.border = '1px dashed rgba(217, 119, 6, 0.65)';
  container.dataset.pageFillSpacer = 'true';
  container.dataset.pageFillHeight = `${height}`;
  if (Number.isInteger(pageIndex)) {
    container.dataset.pageFillIndex = String(pageIndex);
  }
  return container;
};

const createCombinedSpacer = ({ placeholder, spacerHeight }) => {
  const wrapper = document.createElement('div');
  wrapper.className = 'page-break-wrapper';
  wrapper.style.display = 'block';
  wrapper.style.width = '100%';
  wrapper.style.pointerEvents = 'none';
  wrapper.style.boxSizing = 'border-box';

  const padding = getSafeNumber(spacerHeight);
  if (padding > 0) {
    wrapper.style.paddingTop = `${padding}px`;
  }

  if (placeholder) {
    if (padding > 0) {
      placeholder.style.marginTop = `-${padding}px`;
    }
    wrapper.appendChild(placeholder);
  }

  return wrapper;
};

const createDecorationKey = (pageBreak, pos, index) => {
  if (Number.isInteger(pageBreak?.pageIndex)) {
    return `page-break-${pageBreak.pageIndex}`;
  }

  if (Number.isFinite(pos)) {
    return `page-break-${pos}-${index}`;
  }

  return `page-break-${index}`;
};

const getSafeNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const normalizeHeight = (override, fallback) => {
  const fromOverride = getSafeNumber(override);
  if (fromOverride > 0) {
    return fromOverride;
  }
  return getSafeNumber(fallback);
};

const pickBandHeight = (collection, index) => {
  if (!Array.isArray(collection) || !collection.length || !Number.isInteger(index)) {
    return null;
  }
  const clamped = Math.max(0, Math.min(collection.length - 1, index));
  return collection[clamped];
};

const appendSegment = (container, height, styles) => {
  const resolvedHeight = getSafeNumber(height);
  if (resolvedHeight <= 0) {
    return;
  }

  const segment = document.createElement('div');
  segment.className = styles.className;
  segment.style.height = resolvedHeight + 'px';
  segment.style.minHeight = resolvedHeight + 'px';
  segment.style.flex = '0 0 auto';
  segment.style.pointerEvents = 'none';
  segment.style.boxSizing = 'border-box';
  segment.style.backgroundColor = styles.backgroundColor;
  if (styles.borderTop) segment.style.borderTop = styles.borderTop;
  if (styles.borderBottom) segment.style.borderBottom = styles.borderBottom;

  segment.dataset.segmentHeight = String(resolvedHeight);

  container.appendChild(segment);
};
