import { PluginKey } from 'prosemirror-state';
import { Editor as SuperEditor } from '@core/Editor.js';
import { getStarterExtensions } from '@extensions/index.js';
import { updateYdocDocxData } from '@extensions/collaboration/collaboration-helpers.js';
import { getSectionPreviewClone } from './plugin/helpers/section-preview.js';
import { syncSectionDataFromSummary } from './section-data.js';

export const PaginationPluginKey = new PluginKey('paginationPlugin');

const CSS_PX_PER_INCH = 96;
const POINTS_TO_PX_RATIO = 4 / 3; // 1.3333... (96 DPI / 72 points per inch)
const LINE_HEIGHT_RATIO = 1.2;
const DEFAULT_PAGE_WIDTH_INCHES = 8.5;

/**
 * Convert inches to CSS pixels (96 DPI baseline).
 * @param {number | null | undefined} value Inches to convert
 * @returns {number | null}
 */
const inchesToPx = (value) => (typeof value === 'number' && Number.isFinite(value) ? value * CSS_PX_PER_INCH : null);

/**
 * Apply base styles to the section container element.
 *
 * @param {HTMLElement} container Container element for the section editor
 * @param {Object} options Style options
 * @param {string} options.fontFamily Font family CSS value
 * @param {number} options.fontSize Font size in pixels
 * @param {number} options.lineHeight Line height in pixels
 * @param {string} options.overflow Overflow CSS value
 * @private
 */
const applyContainerStyles = (container, { fontFamily, fontSize, lineHeight, overflow }) => {
  Object.assign(container.style, {
    padding: '0',
    margin: '0',
    border: 'none',
    boxSizing: 'border-box',
    position: 'absolute',
    top: '0',
    left: '0',
    width: 'auto',
    maxWidth: 'none',
    overflow,
    fontFamily,
    fontSize: `${fontSize}px`,
    lineHeight: `${lineHeight}px`,
  });
};

/**
 * Calculate and apply content width based on page size and margins.
 *
 * @param {SuperEditor} editor Parent editor instance
 * @param {HTMLElement} container Container element to apply width to
 * @private
 */
const applyContentWidth = (editor, container) => {
  try {
    const pageStyles = editor.converter?.pageStyles || {};
    const pageWidthPx = inchesToPx(pageStyles.pageSize?.width) ?? DEFAULT_PAGE_WIDTH_INCHES * CSS_PX_PER_INCH;
    const marginLeftPx = inchesToPx(pageStyles.pageMargins?.left) ?? 0;
    const marginRightPx = inchesToPx(pageStyles.pageMargins?.right) ?? 0;
    const contentWidthPx = Math.max(0, pageWidthPx - marginLeftPx - marginRightPx);

    if (contentWidthPx > 0) {
      container.style.width = `${contentWidthPx}px`;
      container.style.maxWidth = `${contentWidthPx}px`;
    }
  } catch {}
};

/**
 * Apply ProseMirror-specific styles based on editor mode.
 *
 * @param {HTMLElement} pm ProseMirror DOM element
 * @param {boolean} isEditable Whether the editor is editable
 * @param {boolean} isMeasurement Whether this is a measurement instance
 * @param {boolean} allowOverflow Whether to allow content overflow
 * @private
 */
const applyProseMirrorStyles = (pm, isEditable, isMeasurement, allowOverflow) => {
  if (isEditable && !isMeasurement) {
    pm.style.maxHeight = '100%';
    pm.style.minHeight = '100%';
  } else {
    pm.style.maxHeight = 'none';
    pm.style.minHeight = '0';
  }

  if (allowOverflow) {
    pm.style.overflow = 'visible';
  }

  if (isMeasurement) {
    Object.assign(pm.style, {
      paddingTop: '0px',
      paddingBottom: '0px',
      marginTop: '0px',
      marginBottom: '0px',
      paddingLeft: '0px',
      paddingRight: '0px',
    });
  }

  pm.style.outline = 'none';
  pm.style.border = 'none';
};

/**
 * Set accessibility attributes on ProseMirror element.
 *
 * @param {HTMLElement} pm ProseMirror DOM element
 * @param {string} type Section type (header or footer)
 * @param {boolean} isEditable Whether the editor is editable
 * @private
 */
const setAccessibilityAttributes = (pm, type, isEditable) => {
  pm.setAttribute('role', 'textbox');
  pm.setAttribute('aria-multiline', 'true');
  pm.setAttribute('aria-label', `${type} content area. Double click to start typing.`);
  pm.setAttribute('aria-readonly', String(!isEditable));
};

/**
 * Safely invoke a user-provided hook function with error handling.
 *
 * @param {Function | undefined} hook Hook function to invoke
 * @param {string} hookName Name of the hook for error logging
 * @param {any[]} args Arguments to pass to the hook
 * @private
 */
const safelyInvokeHook = (hook, hookName, ...args) => {
  if (typeof hook === 'function') {
    try {
      hook(...args);
    } catch (error) {
      console.warn(`[pagination] header/footer ${hookName} hook failed`, error);
    }
  }
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
  allowOverflow = false,
}) => {
  const parentStyles = editor.converter.getDocumentDefaultStyles();
  const { fontSizePt, typeface, fontFamilyCss } = parentStyles;
  const fontSizeInPixels = fontSizePt * POINTS_TO_PX_RATIO;
  const lineHeight = fontSizeInPixels * LINE_HEIGHT_RATIO;

  // Apply base container styles
  applyContainerStyles(editorContainer, {
    fontFamily: fontFamilyCss || typeface,
    fontSize: fontSizeInPixels,
    lineHeight,
    overflow: allowOverflow ? 'visible' : 'hidden',
  });

  // Calculate and apply content width
  applyContentWidth(editor, editorContainer);

  // Apply height constraint if specified
  if (Number.isFinite(availableHeight)) {
    editorContainer.style.height = `${availableHeight}px`;
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
      safelyInvokeHook(onCreateHook, 'onCreate', evt);
    },
    onBlur: (evt) => {
      onHeaderFooterDataUpdate(evt, editor, sectionId, type);
      safelyInvokeHook(onBlurHook, 'onBlur', evt);
    },
  });

  headerFooterEditor.setEditable(isEditable, false);

  // Apply ProseMirror-specific styling and accessibility attributes
  const pm = editorContainer.querySelector('.ProseMirror');
  if (pm) {
    applyProseMirrorStyles(pm, isEditable, isMeasurement, allowOverflow);
    setAccessibilityAttributes(pm, type, isEditable);
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
 * Update section editor editability and ARIA attributes.
 *
 * @param {Array} sectionEditors Array of section editor items
 * @param {boolean} isEditMode Whether edit mode is enabled
 * @param {string} documentMode Document mode to set
 * @private
 */
const updateSectionEditors = (sectionEditors, isEditMode, documentMode) => {
  sectionEditors.forEach((item) => {
    item.editor.setEditable(isEditMode, false);
    item.editor.view.dom.setAttribute('aria-readonly', String(!isEditMode));
    item.editor.view.dom.setAttribute('documentmode', documentMode);
  });
};

/**
 * Get the main editor's ProseMirror element.
 *
 * @param {SuperEditor} editor Main editor instance
 * @returns {HTMLElement | null} ProseMirror DOM element or null
 * @private
 */
const getMainEditorProseMirror = (editor) => {
  return editor.view?.dom || editor.options.element?.querySelector?.('.ProseMirror');
};

/**
 * Toggle header/footer edit mode, updating ARIA state and focus management.
 * @param {{ editor: SuperEditor, focusedSectionEditor?: SuperEditor | null, isEditMode: boolean, documentMode: string }} params
 */
export const toggleHeaderFooterEditMode = ({ editor, focusedSectionEditor, isEditMode, documentMode }) => {
  // Update all header and footer editors
  updateSectionEditors(editor.converter.headerEditors, isEditMode, documentMode);
  updateSectionEditors(editor.converter.footerEditors, isEditMode, documentMode);

  // Toggle main editor's header-footer-edit class and aria-readonly
  const pm = getMainEditorProseMirror(editor);
  if (pm) {
    pm.classList.toggle('header-footer-edit', isEditMode);
    if (isEditMode) {
      pm.setAttribute('aria-readonly', 'true');
    } else {
      pm.removeAttribute('aria-readonly');
    }
  }

  // Focus the section editor if provided
  if (focusedSectionEditor) {
    focusedSectionEditor.view.focus();
  }
};

/**
 * Get the plural key for section type (headers or footers).
 *
 * @param {'header' | 'footer'} type Section type
 * @returns {'headers' | 'footers'} Plural key
 * @private
 */
const getSectionKey = (type) => (type === 'header' ? 'headers' : 'footers');

/**
 * Update section data in pagination storage.
 *
 * @param {Object} paginationStorage Pagination storage object
 * @param {'header' | 'footer'} type Section type
 * @param {string} sectionId Section identifier
 * @param {Object} updatedData Updated section data
 * @param {SuperEditor} editor Section editor instance
 * @private
 */
const updatePaginationSectionData = (paginationStorage, type, sectionId, updatedData, editor) => {
  if (!paginationStorage) return;

  // Ensure sectionData exists
  if (!paginationStorage.sectionData || typeof paginationStorage.sectionData !== 'object') {
    paginationStorage.sectionData = { headers: {}, footers: {} };
  }

  const key = getSectionKey(type);
  const bucket = paginationStorage.sectionData[key] || (paginationStorage.sectionData[key] = {});
  const entry = bucket[sectionId] || (bucket[sectionId] = {});

  entry.data = updatedData;
  entry.sectionEditor = editor;

  const container = editor?.options?.element;
  if (container instanceof HTMLElement) {
    entry.sectionContainer = container;
  }

  try {
    const html = editor?.view?.dom?.innerHTML;
    if (typeof html === 'string') {
      entry.html = html;
    }
  } catch {}
};

/**
 * Refresh measurements and sync section data.
 *
 * @param {Object} engine Measurement engine
 * @param {Object} paginationStorage Pagination storage object
 * @param {SuperEditor} mainEditor Main editor instance
 * @returns {Promise<void>}
 * @private
 */
const refreshMeasurements = async (engine, paginationStorage, mainEditor) => {
  if (!engine || typeof engine.refreshHeaderFooterMeasurements !== 'function') return;

  try {
    await engine.refreshHeaderFooterMeasurements();
    const summary = engine.getHeaderFooterSummary?.();

    if (summary && paginationStorage?.repository) {
      paginationStorage.headerFooterSummary = summary;
      syncSectionDataFromSummary(mainEditor, paginationStorage, {
        summary,
        repository: paginationStorage.repository,
        layoutPages: Array.isArray(paginationStorage.layoutPages) ? paginationStorage.layoutPages : [],
      });
    }
  } catch (error) {
    console.debug('[pagination] failed to refresh header/footer measurements', error);
  }
};

/**
 * Invalidate cached section DOM.
 *
 * @param {SuperEditor} mainEditor Main editor instance
 * @param {'header' | 'footer'} type Section type
 * @param {string} sectionId Section identifier
 * @private
 */
const invalidateSectionCache = (mainEditor, type, sectionId) => {
  try {
    const cache = mainEditor.storage?.pagination?.headerFooterDomCache;
    if (cache?.delete) {
      cache.delete(`${type}:${sectionId}`);
    }
  } catch {}
};

/**
 * Force pagination plugin to rebuild decorations.
 *
 * @param {SuperEditor} mainEditor Main editor instance
 * @private
 */
const forcePaginationRebuild = (mainEditor) => {
  try {
    const { state, dispatch } = mainEditor.view;
    const tr = state.tr.setMeta(PaginationPluginKey, { force: true });
    dispatch(tr);
  } catch {}
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
  const paginationStorage = mainEditor.storage?.pagination ?? null;
  const repository = paginationStorage?.repository ?? null;
  const engine = paginationStorage?.engine ?? mainEditor?.measurement ?? null;

  // Update all section editors with the same ID
  const editorsKey = `${type}Editors`;
  mainEditor.converter[editorsKey].forEach((item) => {
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

  // Update converter data
  const sectionsKey = getSectionKey(type);
  mainEditor.converter[sectionsKey][sectionId] = updatedData;
  mainEditor.setOptions({ isHeaderFooterChanged: editor.docChanged });

  // Update repository
  if (repository?.update) {
    repository.update(sectionId, { contentJson: updatedData });
  }

  // Update pagination storage
  updatePaginationSectionData(paginationStorage, type, sectionId, updatedData, editor);

  // Sync with collaboration
  await updateYdocDocxData(mainEditor);

  // Refresh measurements
  await refreshMeasurements(engine, paginationStorage, mainEditor);

  // Refresh overlay previews
  refreshOverlayPreview(mainEditor, type, sectionId);

  // Invalidate cache and force rebuild
  invalidateSectionCache(mainEditor, type, sectionId);
  forcePaginationRebuild(mainEditor);
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
