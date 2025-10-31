import { resolveSectionIdForPage, resolveSectionIdFromSummary } from '../helpers/page-bands.js';
import { getSectionPreviewClone } from '../helpers/section-preview.js';

const SECTION_TYPES = {
  header: 'headerIds',
  footer: 'footerIds',
};

/**
 * Clears all child elements from an overlay using modern DOM API
 */
const clearOverlay = (overlay) => {
  if (!overlay) return;
  overlay.replaceChildren();
};

/**
 * Determines if preview rendering should be skipped for spacer elements
 */
const shouldSkipPreview = (meta) => {
  return meta?.isLeading === true || meta?.isTrailing === true;
};

/**
 * Resolves the section ID, trying summary first, then falling back to editor converter
 */
const resolveSectionId = ({ editor, summary, type, pageIndex, isLast }) => {
  const idFromSummary = resolveSectionIdFromSummary(summary, type, pageIndex, isLast);
  if (idFromSummary) return idFromSummary;

  const sectionKey = SECTION_TYPES[type];
  if (!sectionKey) return null;

  return resolveSectionIdForPage(editor, pageIndex + 1, sectionKey);
};

/**
 * Applies common and type-specific positioning styles to the clone
 */
const applyOverlayStyles = (clone, type) => {
  // Common styles
  clone.style.position = 'absolute';
  clone.style.left = '0';
  clone.style.right = '0';

  // Type-specific positioning
  if (type === 'footer') {
    clone.style.bottom = '0';
  } else {
    clone.style.top = '0';
  }
};

/**
 * Renders header/footer preview content into page break overlays
 */
export const renderOverlayContent = ({ editor, overlay, type, meta, pageCount, summary }) => {
  // Validate inputs and type
  if (!overlay || !SECTION_TYPES[type]) {
    return;
  }

  clearOverlay(overlay);

  // Skip spacer overlays (leading/trailing)
  if (shouldSkipPreview(meta)) {
    return;
  }

  // Calculate page metrics
  const pageIndex = Number.isInteger(meta?.pageIndex) ? meta.pageIndex : 0;
  const totalPages = Number.isInteger(pageCount) && pageCount > 0 ? pageCount : pageIndex + 1;
  const isLastPage = pageIndex === totalPages - 1;

  // Resolve which section to display
  const sectionId = resolveSectionId({
    editor,
    summary,
    type,
    pageIndex,
    isLast: isLastPage,
  });

  if (!sectionId) {
    return;
  }

  // Create and configure preview clone
  const clone = getSectionPreviewClone(editor, type, sectionId, { pageNumber: pageIndex + 1 });
  if (!clone) {
    return;
  }

  // Set data attributes for styling and debugging
  clone.dataset.paginationSection = type;
  clone.dataset.paginationSectionRole = 'overlay';

  // Apply positioning styles
  applyOverlayStyles(clone, type);

  overlay.appendChild(clone);
};

export const __pageBreakOverlayTestUtils = {
  renderOverlayContent,
};
