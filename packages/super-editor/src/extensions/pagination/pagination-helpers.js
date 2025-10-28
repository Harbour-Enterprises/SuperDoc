import { PluginKey } from 'prosemirror-state';
import { Editor as SuperEditor } from '@core/Editor.js';
import { getStarterExtensions } from '@extensions/index.js';
import { updateYdocDocxData } from '@extensions/collaboration/collaboration-helpers.js';
import { getSectionPreviewClone } from './plugin/helpers/section-preview.js';

export const PaginationPluginKey = new PluginKey('paginationPlugin');

export const PaginationMode = Object.freeze({
  NONE: 'none',
  LEGACY: 'legacy',
  LAYOUT: 'layout',
});

export const DEFAULT_PAGINATION_OPTIONS = Object.freeze({
  mode: PaginationMode.NONE,
  showPageNumbers: false,
});

const CSS_PX_PER_INCH = 96;

/**
 * Convert inches to CSS pixels (96 DPI baseline).
 * @param {number | null | undefined} value Inches to convert
 * @returns {number | null}
 */
const inchesToPx = (value) => (typeof value === 'number' && Number.isFinite(value) ? value * CSS_PX_PER_INCH : null);

/**
 * Resolve DOCX section margin/distance values in pixels for header/footer bands.
 * @param {SuperEditor} editor Main editor instance
 * @param {'header' | 'footer'} type Section type
 * @returns {{ marginPx: number | null, distancePx: number | null } | null}
 */
const getDocxSectionSpecPx = (editor, type) => {
  try {
    const margins = editor?.converter?.pageStyles?.pageMargins;
    if (!margins) return null;
    const marginKey = type === 'header' ? 'top' : 'bottom';
    const distanceKey = type === 'header' ? 'header' : 'footer';
    const marginPx = inchesToPx(margins[marginKey]);
    const distancePx = Math.max(0, inchesToPx(margins[distanceKey]) ?? 0);
    return { marginPx, distancePx };
  } catch {}
  return null;
};

/**
 * Compute the rendered height for the (temporary) header/footer editor DOM.
 * @param {SuperEditor} sectionEditor Section editor instance
 * @returns {number}
 */
const measureEditorContentHeight = (sectionEditor) => {
  try {
    const pmRoot = sectionEditor?.view?.dom;
    if (!(pmRoot instanceof HTMLElement)) return 0;

    const elements = Array.from(pmRoot.children).filter((node) => node instanceof HTMLElement);
    if (elements.length) {
      let minTop = Number.POSITIVE_INFINITY;
      let maxBottom = Number.NEGATIVE_INFINITY;
      elements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (!rect || !Number.isFinite(rect.top) || !Number.isFinite(rect.bottom)) return;
        if (rect.height <= 0) return;
        if (rect.top < minTop) minTop = rect.top;
        if (rect.bottom > maxBottom) maxBottom = rect.bottom;
      });
      if (maxBottom > minTop && Number.isFinite(minTop) && Number.isFinite(maxBottom)) {
        return Math.max(0, maxBottom - minTop);
      }
    }

    const styles = window.getComputedStyle(pmRoot);
    const paddingTop = parseFloat(styles.paddingTop) || 0;
    const paddingBottom = parseFloat(styles.paddingBottom) || 0;
    const scrollHeight = pmRoot.scrollHeight;
    if (Number.isFinite(scrollHeight) && scrollHeight > 0) {
      return Math.max(0, scrollHeight - paddingTop - paddingBottom);
    }
    const rect = pmRoot.getBoundingClientRect();
    if (Number.isFinite(rect?.height) && rect.height > 0) {
      return Math.max(0, rect.height - paddingTop - paddingBottom);
    }
  } catch {}
  return 0;
};

/**
 * Determine the reserved band size that accommodates measured content and DOCX offsets.
 * @param {{ marginPx: number | null, distancePx: number | null, measuredPx: number | null }} param0
 * @returns {{ applied: number, margin: number, offset: number, measured: number }}
 */
const computeSectionReservePx = ({ marginPx, distancePx, measuredPx }) => {
  const margin = Number.isFinite(marginPx) ? marginPx : CSS_PX_PER_INCH;
  const offset = Number.isFinite(distancePx) ? distancePx : 0;
  const measured = Number.isFinite(measuredPx) ? measuredPx : 0;
  const threshold = margin - offset;
  if (measured <= threshold) {
    return { applied: margin, margin, offset, measured };
  }
  const applied = Math.max(margin, measured + offset);
  return { applied, margin, offset, measured };
};

/**
 * Initialize pagination metadata for headers/footers, including measured heights.
 * @param {SuperEditor} editor Main editor instance
 * @returns {Promise<{ headers: Record<string, any>, footers: Record<string, any> } | undefined>}
 */
export const initPaginationData = async (editor) => {
  if (!editor.converter) return;

  const sectionData = { headers: {}, footers: {} };
  const headerIds = editor.converter.headerIds.ids;
  const footerIds = editor.converter.footerIds.ids;

  for (let key in headerIds) {
    const sectionId = headerIds[key];
    if (!sectionId) continue;

    const dataForThisSection = editor.converter.headers[sectionId];
    if (!sectionData.headers[sectionId]) sectionData.headers[sectionId] = {};
    sectionData.headers[sectionId].data = dataForThisSection;
    // Wait for the height to be resolved
    const { height, sectionEditor, sectionContainer } = await getSectionHeight(editor, dataForThisSection);
    const spec = getDocxSectionSpecPx(editor, 'header') || {};
    const band = computeSectionReservePx({
      marginPx: spec.marginPx,
      distancePx: spec.distancePx,
      measuredPx: height,
    });
    sectionData.headers[sectionId].height = band.measured;
    sectionData.headers[sectionId].measuredHeight = band.measured;
    sectionData.headers[sectionId].baselineHeight = band.margin;
    sectionData.headers[sectionId].offsetHeight = band.offset;
    sectionData.headers[sectionId].reservedHeight = band.applied;
    console.debug('[pagination] header height init', {
      sectionId,
      marginPx: band.margin,
      distancePx: band.offset,
      measuredHeight: band.measured,
      appliedHeight: band.applied,
    });
    sectionData.headers[sectionId].sectionEditor = sectionEditor;
    sectionData.headers[sectionId].sectionContainer = sectionContainer;
  }

  for (let key in footerIds) {
    const sectionId = footerIds[key];
    if (!sectionId) continue;

    const dataForThisSection = editor.converter.footers[sectionId];
    // Ensure we initialize the correct map for footers
    if (!sectionData.footers[sectionId]) sectionData.footers[sectionId] = {};
    sectionData.footers[sectionId].data = dataForThisSection;
    // Wait for the height to be resolved
    const { height, sectionEditor, sectionContainer } = await getSectionHeight(editor, dataForThisSection);
    const spec = getDocxSectionSpecPx(editor, 'footer') || {};
    const band = computeSectionReservePx({
      marginPx: spec.marginPx,
      distancePx: spec.distancePx,
      measuredPx: height,
    });
    sectionData.footers[sectionId].height = band.measured;
    sectionData.footers[sectionId].measuredHeight = band.measured;
    sectionData.footers[sectionId].baselineHeight = band.margin;
    sectionData.footers[sectionId].offsetHeight = band.offset;
    sectionData.footers[sectionId].reservedHeight = band.applied;
    console.debug('[pagination] footer height init', {
      sectionId,
      marginPx: band.margin,
      distancePx: band.offset,
      measuredHeight: band.measured,
      appliedHeight: band.applied,
    });
    sectionData.footers[sectionId].sectionEditor = sectionEditor;
    sectionData.footers[sectionId].sectionContainer = sectionContainer;
  }

  return sectionData;
};

/**
 * Measure a header/footer section by rendering it in an off-screen editor instance.
 * @param {SuperEditor} editor Main editor instance
 * @param {Record<string, any>} data JSON content for the section
 * @returns {Promise<{ height: number, sectionEditor: SuperEditor, sectionContainer: HTMLElement } | {}>}
 */
const getSectionHeight = async (editor, data) => {
  if (!data) return {};

  return new Promise((resolve) => {
    const editorContainer = document.createElement('div');
    editorContainer.className = 'super-editor';
    editorContainer.style.padding = '0';
    editorContainer.style.margin = '0';

    const sectionEditor = createHeaderFooterEditor({
      editor,
      data,
      editorContainer,
      isMeasurement: true,
    });

    sectionEditor.on('create', () => {
      sectionEditor.setEditable(false, false);
      requestAnimationFrame(() => {
        let height = measureEditorContentHeight(sectionEditor);
        if (!Number.isFinite(height) || height <= 0) {
          height = editorContainer.offsetHeight;
        }
        document.body.removeChild(editorContainer);
        resolve({ height, sectionEditor, sectionContainer: editorContainer });
      });
    });
  });
};

/**
 * Create a detached SuperEditor for a header/footer section (measurement or interactive editing).
 * @param {Object} params
 * @param {SuperEditor} params.editor Parent editor instance
 * @param {Record<string, any>} params.data Section JSON content
 * @param {HTMLElement} params.editorContainer DOM container for the section editor
 * @param {boolean} [params.appendToBody=true] Whether the container should be appended to `document.body`
 * @param {string} [params.sectionId] Section identifier
 * @param {'header'|'footer'} [params.type] Section type
 * @param {number} [params.availableHeight] Optional height constraint in pixels
 * @param {number} [params.currentPageNumber] Page number context for previews
 * @param {boolean} [params.isEditable=false] Whether the section editor should be editable
 * @param {boolean} [params.isMeasurement=false] Whether the instance is only for measurement
 * @param {(evt: any) => void} [params.onCreateHook] Optional hook invoked on the section editor create event
 * @param {(evt: any) => void} [params.onBlurHook] Optional hook invoked when section editor blurs
 * @returns {SuperEditor}
 */
export const createHeaderFooterEditor = ({
  editor,
  data,
  editorContainer,
  appendToBody = true,
  sectionId,
  type,
  availableHeight,
  currentPageNumber,
  isEditable = false,
  isMeasurement = false,
  onCreateHook,
  onBlurHook,
}) => {
  const parentStyles = editor.converter.getDocumentDefaultStyles();
  const { fontSizePt, typeface, fontFamilyCss } = parentStyles;
  const fontSizeInPixles = fontSizePt * 1.3333;
  const lineHeight = fontSizeInPixles * 1.2;

  Object.assign(editorContainer.style, {
    padding: '0',
    margin: '0',
    border: 'none',
    boxSizing: 'border-box',
    position: 'absolute',
    top: '0',
    left: '0',
    width: 'auto',
    maxWidth: 'none',
    fontFamily: fontFamilyCss || typeface,
    fontSize: `${fontSizeInPixles}px`,
    lineHeight: `${lineHeight}px`,
  });

  try {
    const pageStyles = editor.converter?.pageStyles || {};
    const pageWidthPx = inchesToPx(pageStyles.pageSize?.width) ?? 8.5 * CSS_PX_PER_INCH;
    const marginLeftPx = inchesToPx(pageStyles.pageMargins?.left) ?? 0;
    const marginRightPx = inchesToPx(pageStyles.pageMargins?.right) ?? 0;
    const contentWidthPx = Math.max(0, pageWidthPx - marginLeftPx - marginRightPx);
    if (contentWidthPx > 0) {
      editorContainer.style.width = `${contentWidthPx}px`;
      editorContainer.style.maxWidth = `${contentWidthPx}px`;
    }
  } catch {}

  Object.assign(editorContainer.style, {
    padding: '0',
    margin: '0',
    border: 'none',
    boxSizing: 'border-box',
    overflow: 'hidden',
  });
  // Only constrain height when a numeric availableHeight is provided
  if (Number.isFinite(availableHeight)) {
    editorContainer.style.height = availableHeight + 'px';
  }
  if (appendToBody) document.body.appendChild(editorContainer);

  const headerFooterEditor = new SuperEditor({
    role: editor.options.role,
    loadFromSchema: true,
    mode: 'docx',
    element: editorContainer,
    content: data,
    extensions: getStarterExtensions(),
    // Ensure header/footer editors do not run pagination or measurement
    pagination: false,
    measurement: { disabled: true },
    documentId: sectionId || 'sectionId',
    media: editor.storage.image.media,
    mediaFiles: editor.storage.image.media,
    fonts: editor.options.fonts,
    isHeaderOrFooter: true,
    isHeadless: editor.options.isHeadless,
    annotations: true,
    currentPageNumber,
    parentEditor: editor,
    editable: isEditable,
    documentMode: 'viewing',
    suppressDefaultDocxStyles: isMeasurement || editor.options.suppressDefaultDocxStyles,
    onCreate: (evt) => {
      setEditorToolbar(evt, editor);
      if (typeof onCreateHook === 'function') {
        try {
          onCreateHook(evt);
        } catch (error) {
          console.warn('[pagination] header/footer onCreate hook failed', error);
        }
      }
    },
    onBlur: (evt) => {
      onHeaderFooterDataUpdate(evt, editor, sectionId, type);
      if (typeof onBlurHook === 'function') {
        try {
          onBlurHook(evt);
        } catch (error) {
          console.warn('[pagination] header/footer onBlur hook failed', error);
        }
      }
    },
  });
  headerFooterEditor.setEditable(isEditable, false);

  const pm = editorContainer.querySelector('.ProseMirror');
  if (pm) {
    if (isEditable && !isMeasurement) {
      pm.style.maxHeight = '100%';
      pm.style.minHeight = '100%';
    } else {
      pm.style.maxHeight = 'none';
      pm.style.minHeight = '0';
    }
    if (isMeasurement) {
      pm.style.paddingTop = '0px';
      pm.style.paddingBottom = '0px';
      pm.style.marginTop = '0px';
      pm.style.marginBottom = '0px';
      pm.style.paddingLeft = '0px';
      pm.style.paddingRight = '0px';
    }
    pm.style.outline = 'none';
    pm.style.border = 'none';

    pm.setAttribute('role', 'textbox');
    pm.setAttribute('aria-multiline', true);
    pm.setAttribute('aria-label', `${type} content area. Double click to start typing.`);
    pm.setAttribute('aria-readonly', String(!isEditable));
  }

  return headerFooterEditor;
};

/**
 * Proxy selected header/footer events back to the parent editor emitter.
 * @param {SuperEditor} editor Parent editor instance
 * @param {SuperEditor} sectionEditor Section editor instance
 */
export const broadcastEditorEvents = (editor, sectionEditor) => {
  const eventNames = [
    'fieldAnnotationDropped',
    'fieldAnnotationPaste',
    'fieldAnnotationSelected',
    'fieldAnnotationClicked',
    'fieldAnnotationDoubleClicked',
    'fieldAnnotationDeleted',
  ];
  eventNames.forEach((eventName) => {
    sectionEditor.on(eventName, (...args) => {
      editor.emit(eventName, ...args);
      console.debug('broadcastEditorEvents', { eventName, args });
    });
  });
};

/**
 * Toggle header/footer edit mode, updating ARIA state and focus management.
 * @param {{ editor: SuperEditor, focusedSectionEditor?: SuperEditor | null, isEditMode: boolean, documentMode: string }} params
 */
export const toggleHeaderFooterEditMode = ({ editor, focusedSectionEditor, isEditMode, documentMode }) => {
  editor.converter.headerEditors.forEach((item) => {
    item.editor.setEditable(isEditMode, false);
    item.editor.view.dom.setAttribute('aria-readonly', !isEditMode);
    item.editor.view.dom.setAttribute('documentmode', documentMode);
  });

  editor.converter.footerEditors.forEach((item) => {
    item.editor.setEditable(isEditMode, false);
    item.editor.view.dom.setAttribute('aria-readonly', !isEditMode);
    item.editor.view.dom.setAttribute('documentmode', documentMode);
  });

  if (isEditMode) {
    const pm = editor.view?.dom || editor.options.element?.querySelector?.('.ProseMirror');
    if (pm) {
      pm.classList.add('header-footer-edit');
      pm.setAttribute('aria-readonly', true);
    }
  } else {
    const pm = editor.view?.dom || editor.options.element?.querySelector?.('.ProseMirror');
    if (pm) {
      pm.classList.remove('header-footer-edit');
      pm.removeAttribute('aria-readonly');
    }
  }

  if (focusedSectionEditor) {
    focusedSectionEditor.view.focus();
  }
};

/**
 * Persist header/footer edits back into the main editor converter and pagination cache.
 * @param {{ editor: SuperEditor, transaction?: import('prosemirror-state').Transaction | null }} param0
 * @param {SuperEditor} mainEditor Main editor instance
 * @param {string} sectionId Header/footer identifier
 * @param {'header'|'footer'} type Section type
 * @returns {Promise<void>}
 */
export const onHeaderFooterDataUpdate = async ({ editor, transaction }, mainEditor, sectionId, type) => {
  if (!type || !sectionId) return;

  const updatedData = editor.getUpdatedJson();
  mainEditor.converter[`${type}Editors`].forEach((item) => {
    if (item.id === sectionId) {
      item.editor.setOptions({
        media: editor.options.media,
        mediaFiles: editor.options.mediaFiles,
      });
      item.editor.replaceContent(updatedData);
    }
    item.editor.setOptions({
      lastSelection: transaction?.selection,
    });
  });
  mainEditor.converter[`${type}s`][sectionId] = updatedData;
  mainEditor.setOptions({ isHeaderFooterChanged: editor.docChanged });

  const store = mainEditor.storage?.pagination?.sectionData;
  if (store) {
    const key = type === 'header' ? 'headers' : 'footers';
    const bucket = store[key] || (store[key] = {});
    const entry = bucket[sectionId] || (bucket[sectionId] = {});
    entry.data = updatedData;
    entry.sectionEditor = editor;
    const container = editor?.options?.element;
    if (container instanceof HTMLElement) {
      entry.sectionContainer = container;
    }
    let measuredHeight = Number.isFinite(entry?.measuredHeight) ? entry.measuredHeight : 0;
    try {
      const measurement = await getSectionHeight(mainEditor, updatedData);
      if (Number.isFinite(measurement?.height)) measuredHeight = measurement.height;
      try {
        measurement?.sectionEditor?.destroy?.();
      } catch {}
    } catch {}
    const spec = getDocxSectionSpecPx(mainEditor, type) || {};
    const band = computeSectionReservePx({
      marginPx: spec.marginPx,
      distancePx: spec.distancePx,
      measuredPx: measuredHeight,
    });
    entry.height = band.measured;
    entry.measuredHeight = band.measured;
    entry.baselineHeight = band.margin;
    entry.offsetHeight = band.offset;
    entry.reservedHeight = band.applied;
    console.debug('[pagination] section height update', {
      sectionId,
      type,
      marginPx: band.margin,
      distancePx: band.offset,
      measuredHeight: band.measured,
      appliedHeight: band.applied,
    });
    try {
      const html = editor?.view?.dom?.innerHTML;
      if (typeof html === 'string') entry.html = html;
    } catch {}
  }

  await updateYdocDocxData(mainEditor);

  refreshOverlayPreview(mainEditor, type, sectionId);

  // Invalidate any cached DOM clone for this section so it re-renders
  try {
    const cache = mainEditor.storage?.pagination?.headerFooterDomCache;
    if (cache && cache.delete) {
      cache.delete(`${type}:${sectionId}`);
    }
  } catch {}

  // Force pagination plugin to rebuild decorations to reflect updated header/footer
  try {
    const { state, dispatch } = mainEditor.view;
    const tr = state.tr.setMeta(PaginationPluginKey, { force: true });
    dispatch(tr);
  } catch {}
};

/**
 * Synchronise toolbar instance between parent and section editors.
 * @param {{ editor: SuperEditor }} param0
 * @param {SuperEditor} mainEditor
 */
const setEditorToolbar = ({ editor }, mainEditor) => {
  editor.setToolbar(mainEditor.toolbar);
};

/**
 * Rebuild DOM clones for header/footer overlay previews so pagination UI reflects edits.
 * @param {SuperEditor} mainEditor Main editor instance
 * @param {'header'|'footer'} type Section type
 * @param {string} sectionId Header/footer identifier
 */
const refreshOverlayPreview = (mainEditor, type, sectionId) => {
  try {
    const doc = mainEditor?.view?.dom?.ownerDocument;
    if (!doc) return;
    const selector = `.super-editor-page-section-slot[data-pagination-section="${type}"][data-pagination-section-id="${sectionId}"]`;
    const slots = doc.querySelectorAll(selector);
    if (!slots?.length) return;
    slots.forEach((slot) => {
      const pageNumber = slot?.dataset?.paginationPage ? Number(slot.dataset.paginationPage) : undefined;
      const clone = getSectionPreviewClone(mainEditor, type, sectionId, {
        pageNumber: Number.isFinite(pageNumber) ? pageNumber : undefined,
      });
      if (!clone) return;
      clone.dataset.paginationSection = type;
      clone.dataset.paginationSectionRole = 'overlay-content';
      clone.dataset.paginationSectionId = sectionId;
      if (Number.isFinite(pageNumber)) {
        clone.dataset.paginationPage = String(pageNumber);
      }
      const offset = slot.dataset?.paginationOffset;
      if (offset !== undefined) {
        clone.dataset.paginationOffset = offset;
      }
      slot.replaceChildren(clone);
    });
  } catch (error) {
    console.debug('[pagination] failed to refresh overlay preview', error);
  }
};

export default {
  PaginationPluginKey,
  PaginationMode,
  DEFAULT_PAGINATION_OPTIONS,
  initPaginationData,
  createHeaderFooterEditor,
  broadcastEditorEvents,
  toggleHeaderFooterEditMode,
  onHeaderFooterDataUpdate,
};
