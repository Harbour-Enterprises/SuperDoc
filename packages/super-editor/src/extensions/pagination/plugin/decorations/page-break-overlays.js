import { resolveSectionIdForPage, resolveSectionIdFromSummary } from '../helpers/page-bands.js';
import { getSectionPreviewClone } from '../helpers/section-preview.js';

const SECTION_TYPES = {
  header: 'headerIds',
  footer: 'footerIds',
};

const clearOverlay = (overlay) => {
  if (!overlay) return;
  while (overlay.firstChild) {
    overlay.removeChild(overlay.firstChild);
  }
};

const resolveSectionId = ({ editor, summary, type, pageIndex, isLast }) => {
  const idFromSummary = resolveSectionIdFromSummary(summary, type, pageIndex, isLast);
  if (idFromSummary) return idFromSummary;
  const sectionKey = SECTION_TYPES[type];
  if (!sectionKey) return null;
  return resolveSectionIdForPage(editor, pageIndex + 1, sectionKey);
};

const shouldSkipPreview = (meta) => {
  if (!meta) return false;
  if (meta.isLeading) return true;
  if (meta.isTrailing) return true;
  return false;
};

export const renderOverlayContent = ({ editor, overlay, type, meta, pageCount, summary }) => {
  if (!overlay || (type !== 'header' && type !== 'footer')) {
    return;
  }

  clearOverlay(overlay);

  if (shouldSkipPreview(meta)) {
    return;
  }

  const pageIndex = Number.isInteger(meta?.pageIndex) ? meta.pageIndex : 0;
  const totalPages = Number.isInteger(pageCount) && pageCount > 0 ? pageCount : pageIndex + 1;
  const isLast = pageIndex === totalPages - 1;

  const sectionId = resolveSectionId({
    editor,
    summary,
    type,
    pageIndex,
    isLast,
  });

  if (!sectionId) {
    return;
  }

  const clone = getSectionPreviewClone(editor, type, sectionId, { pageNumber: pageIndex + 1 });
  if (!clone) {
    return;
  }

  clone.dataset.paginationSection = type;
  clone.dataset.paginationSectionRole = 'overlay';

  if (type === 'footer') {
    clone.style.position = 'absolute';
    clone.style.left = '0';
    clone.style.right = '0';
    clone.style.bottom = '0';
  } else {
    clone.style.position = 'absolute';
    clone.style.left = '0';
    clone.style.right = '0';
    clone.style.top = '0';
  }

  overlay.appendChild(clone);
};

export const __pageBreakOverlayTestUtils = {
  renderOverlayContent,
};
