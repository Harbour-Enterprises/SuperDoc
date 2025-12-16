import { PluginKey } from 'prosemirror-state';
import { Editor as SuperEditor } from '@core/Editor.js';
import { getStarterExtensions } from '@extensions/index.js';
import { updateYdocDocxData } from '@extensions/collaboration/collaboration-helpers.js';
import { applyStyleIsolationClass } from '../../utils/styleIsolation.js';
import { isHeadless } from '../../utils/headless-helpers';
import type { EditorExtension } from '@core/index.js';

export const PaginationPluginKey = new PluginKey('paginationPlugin');

interface SectionDataEntry {
  data?: unknown;
  height?: number;
  sectionEditor?: SuperEditor;
  sectionContainer?: HTMLDivElement;
}

interface SectionData {
  headers: Record<string, SectionDataEntry>;
  footers: Record<string, SectionDataEntry>;
}

interface HeaderFooterEditorItem {
  id?: string;
  editor: SuperEditor;
}

/**
 * Initialize the pagination data for the editor.
 * This will fetch the header and footer data from the converter and calculate their height.
 */
export const initPaginationData = async (editor: SuperEditor): Promise<SectionData | undefined> => {
  if (isHeadless(editor) || !editor.converter) return;

  const sectionData: SectionData = { headers: {}, footers: {} };
  const headerIds = editor.converter.headerIds.ids as Record<string, string>;
  const footerIds = editor.converter.footerIds.ids as Record<string, string>;

  for (const key in headerIds) {
    const sectionId = headerIds[key];
    if (!sectionId) continue;

    const dataForThisSection = editor.converter.headers[sectionId];
    if (!sectionData.headers[sectionId]) sectionData.headers[sectionId] = {};
    sectionData.headers[sectionId].data = dataForThisSection;
    // Wait for the height to be resolved
    const { height, sectionEditor, sectionContainer } = await getSectionHeight(editor, dataForThisSection);
    sectionData.headers[sectionId].height = height;
    sectionData.headers[sectionId].sectionEditor = sectionEditor;
    sectionData.headers[sectionId].sectionContainer = sectionContainer;
  }

  for (const key in footerIds) {
    const sectionId = footerIds[key];
    if (!sectionId) continue;

    const dataForThisSection = editor.converter.footers[sectionId];
    if (!sectionData.footers[sectionId]) sectionData.footers[sectionId] = {};
    sectionData.footers[sectionId].data = dataForThisSection;
    // Wait for the height to be resolved
    const { height, sectionEditor, sectionContainer } = await getSectionHeight(editor, dataForThisSection);
    sectionData.footers[sectionId].height = height;
    sectionData.footers[sectionId].sectionEditor = sectionEditor;
    sectionData.footers[sectionId].sectionContainer = sectionContainer;
  }

  return sectionData;
};

interface SectionHeightResult {
  height: number;
  sectionEditor: SuperEditor;
  sectionContainer: HTMLDivElement;
}

/**
 * Get the height of a section.
 */
const getSectionHeight = async (editor: SuperEditor, data: unknown): Promise<SectionHeightResult> => {
  if (!data) return {} as SectionHeightResult;

  return new Promise((resolve) => {
    const editorContainer = document.createElement('div');
    editorContainer.className = 'super-editor';
    applyStyleIsolationClass(editorContainer);
    editorContainer.style.padding = '0';
    editorContainer.style.margin = '0';

    const sectionEditor = createHeaderFooterEditor({ editor, data, editorContainer });

    sectionEditor.on('create', () => {
      sectionEditor.setEditable(false, false);
      requestAnimationFrame(() => {
        const height = editorContainer.offsetHeight;
        document.body.removeChild(editorContainer);
        resolve({ height, sectionEditor, sectionContainer: editorContainer });
      });
    });
  });
};

interface CreateHeaderFooterEditorParams {
  editor: SuperEditor;
  data: unknown;
  editorContainer: HTMLDivElement;
  editorHost?: HTMLElement;
  sectionId?: string;
  type?: string;
  availableWidth?: number;
  availableHeight?: number;
  currentPageNumber?: number;
  totalPageCount?: number;
}

/**
 * Creates a header or footer editor instance.
 *
 * This function creates a ProseMirror editor configured for header/footer editing
 * with proper styling, dimensions, and page number context.
 *
 * @param {Object} params - Configuration parameters
 * @param {Editor} params.editor - The parent editor instance. Required.
 * @param {Object} params.data - The ProseMirror document data for the header/footer. Required.
 * @param {HTMLElement} params.editorContainer - The container element to mount the editor. Required.
 * @param {HTMLElement} [params.editorHost] - The host element for the editor (optional, for sibling architecture).
 * @param {string} [params.sectionId] - The section relationship ID for tracking.
 * @param {('header'|'footer')} [params.type] - The type of section being edited.
 * @param {number} [params.availableWidth] - The width of the editing region in pixels. Must be positive.
 * @param {number} [params.availableHeight] - The height of the editing region in pixels. Must be positive.
 * @param {number} [params.currentPageNumber] - The current page number for PAGE field resolution. Must be a positive integer.
 * @param {number} [params.totalPageCount] - The total page count for NUMPAGES field resolution. Must be a positive integer.
 * @returns {Editor} The created header/footer editor instance
 *
 * @throws {TypeError} If required parameters are missing or have invalid types
 * @throws {RangeError} If numeric parameters are out of valid range
 */
export const createHeaderFooterEditor = ({
  editor,
  data,
  editorContainer,
  editorHost,
  sectionId,
  type,
  availableWidth,
  availableHeight,
  currentPageNumber,
  totalPageCount,
}: CreateHeaderFooterEditorParams): SuperEditor => {
  // Validate required parameters
  if (!editor) {
    throw new TypeError('editor parameter is required');
  }
  if (!data) {
    throw new TypeError('data parameter is required');
  }
  if (!editorContainer) {
    throw new TypeError('editorContainer parameter is required');
  }

  // Type-check editorContainer as HTMLElement
  if (!(editorContainer instanceof HTMLElement)) {
    throw new TypeError('editorContainer must be an HTMLElement');
  }

  // Type-check editorHost if provided
  if (editorHost !== undefined && !(editorHost instanceof HTMLElement)) {
    throw new TypeError('editorHost must be an HTMLElement or undefined');
  }

  // Range-check numeric parameters
  if (availableWidth !== undefined) {
    if (typeof availableWidth !== 'number' || !Number.isFinite(availableWidth) || availableWidth <= 0) {
      throw new RangeError('availableWidth must be a positive number');
    }
  }

  if (availableHeight !== undefined) {
    if (typeof availableHeight !== 'number' || !Number.isFinite(availableHeight) || availableHeight <= 0) {
      throw new RangeError('availableHeight must be a positive number');
    }
  }

  if (currentPageNumber !== undefined) {
    if (typeof currentPageNumber !== 'number' || !Number.isInteger(currentPageNumber) || currentPageNumber < 1) {
      throw new RangeError('currentPageNumber must be a positive integer');
    }
  }

  if (totalPageCount !== undefined) {
    if (typeof totalPageCount !== 'number' || !Number.isInteger(totalPageCount) || totalPageCount < 1) {
      throw new RangeError('totalPageCount must be a positive integer');
    }
  }

  const parentStyles = editor.converter.getDocumentDefaultStyles();
  const { fontSizePt, typeface, fontFamilyCss } = parentStyles;
  const fontSizeInPixles = fontSizePt * 1.3333;
  const lineHeight = fontSizeInPixles * 1.2;

  applyStyleIsolationClass(editorContainer);

  const isFooter = type === 'footer';

  Object.assign(editorContainer.style, {
    padding: '0',
    margin: '0',
    border: 'none',
    boxSizing: 'border-box',
    position: 'absolute',
    top: '0',
    left: '0',
    width: availableWidth ? `${availableWidth}px` : '100%',
    height: availableHeight ? `${availableHeight}px` : 'auto',
    maxWidth: 'none',
    fontFamily: fontFamilyCss || typeface,
    fontSize: `${fontSizeInPixles}px`,
    lineHeight: `${lineHeight}px`,
    overflow: isFooter ? 'visible' : 'hidden',
    pointerEvents: 'auto', // Critical: enables click interaction
    backgroundColor: 'white', // Ensure editor has white background
  });

  // Append to editor host (sibling container) instead of document.body
  if (editorHost) {
    editorHost.appendChild(editorContainer);
  } else {
    // Fallback to body for backward compatibility (should not happen in new code)
    console.warn('[createHeaderFooterEditor] No editorHost provided, falling back to document.body');
    document.body.appendChild(editorContainer);
  }

  interface ImageExtensionStorage {
    media?: Record<string, unknown>;
  }

  const storage = editor.storage;
  const imageStorage = storage.image as ImageExtensionStorage | undefined;
  const headerFooterEditor = new SuperEditor({
    role: editor.options.role,
    loadFromSchema: true,
    mode: 'docx',
    element: editorContainer,
    content: data,
    extensions: getStarterExtensions() as EditorExtension[],
    documentId: sectionId || 'sectionId',
    media: imageStorage?.media,
    mediaFiles: imageStorage?.media,
    fonts: editor.options.fonts,
    isHeaderOrFooter: true, // This flag prevents pagination from being enabled
    isHeadless: editor.options.isHeadless,
    annotations: true,
    currentPageNumber: currentPageNumber ?? 1,
    totalPageCount: totalPageCount ?? 1,
    // Don't set parentEditor to avoid circular reference issues
    // parentEditor: editor,
    // IMPORTANT: Start with editable: false to prevent triggering update cascades during creation.
    // PresentationEditor#enterHeaderFooterMode will call setEditable(true) when entering edit mode.
    editable: false,
    documentMode: 'viewing',
    onCreate: (evt: { editor: SuperEditor }) => setEditorToolbar(evt, editor),
    onBlur: (evt: { editor: SuperEditor }) => onHeaderFooterDataUpdate(evt, editor, sectionId, type),
  } as Record<string, unknown>);

  // Store parent editor reference separately to avoid circular reference in options
  // This allows access when needed without creating serialization issues
  Object.defineProperty(headerFooterEditor.options, 'parentEditor', {
    enumerable: false, // Don't include in serialization
    configurable: true,
    get() {
      return editor;
    },
  });
  headerFooterEditor.setEditable(false, false);

  const pm = editorContainer.querySelector('.ProseMirror') as HTMLElement | null;
  if (pm) {
    pm.style.maxHeight = '100%';
    pm.style.minHeight = '100%';
    pm.style.outline = 'none';
    pm.style.border = 'none';

    pm.setAttribute('role', 'textbox');
    pm.setAttribute('aria-multiline', 'true');
    pm.setAttribute('aria-label', `${type} content area. Double click to start typing.`);
  }

  return headerFooterEditor;
};

export const broadcastEditorEvents = (editor: SuperEditor, sectionEditor: SuperEditor): void => {
  const eventNames = [
    'fieldAnnotationDropped',
    'fieldAnnotationPaste',
    'fieldAnnotationSelected',
    'fieldAnnotationClicked',
    'fieldAnnotationDoubleClicked',
    'fieldAnnotationDeleted',
  ] as const;
  eventNames.forEach((eventName) => {
    sectionEditor.on(eventName, (...args: unknown[]) => {
      editor.emit(eventName, ...args);
      console.debug('broadcastEditorEvents', { eventName, args });
    });
  });
};

export const toggleHeaderFooterEditMode = ({
  editor,
  focusedSectionEditor,
  isEditMode,
  documentMode,
}: {
  editor: SuperEditor;
  focusedSectionEditor?: SuperEditor | null;
  isEditMode: boolean;
  documentMode: string;
}): void => {
  if (isHeadless(editor)) return;

  editor.converter.headerEditors.forEach((item: HeaderFooterEditorItem) => {
    item.editor.setEditable(isEditMode, false);
    item.editor.view.dom.setAttribute('aria-readonly', String(!isEditMode));
    item.editor.view.dom.setAttribute('documentmode', documentMode);
  });

  editor.converter.footerEditors.forEach((item: HeaderFooterEditorItem) => {
    item.editor.setEditable(isEditMode, false);
    item.editor.view.dom.setAttribute('aria-readonly', String(!isEditMode));
    item.editor.view.dom.setAttribute('documentmode', documentMode);
  });

  if (isEditMode) {
    const pm = editor.view?.dom || editor.options.element?.querySelector?.('.ProseMirror');
    if (pm) {
      pm.classList.add('header-footer-edit');
      pm.setAttribute('aria-readonly', 'true');
    }
  }

  if (focusedSectionEditor) {
    focusedSectionEditor.view.focus();
  }
};

export const onHeaderFooterDataUpdate = async (
  { editor, transaction }: { editor: SuperEditor; transaction?: { selection?: unknown } },
  mainEditor: SuperEditor,
  sectionId?: string,
  type?: string,
): Promise<void> => {
  if (!type || !sectionId) return;

  const updatedData = editor.getUpdatedJson();
  const editorsList = mainEditor.converter[`${type}Editors`] as HeaderFooterEditorItem[];
  if (Array.isArray(editorsList)) {
    editorsList.forEach((item: HeaderFooterEditorItem) => {
      if (item.id === sectionId) {
        item.editor.setOptions({
          media: editor.options.media,
          mediaFiles: editor.options.mediaFiles,
        });
        // Only replaceContent on OTHER editors, not the one that triggered this update
        // Otherwise we get an infinite loop: replaceContent -> update event -> onHeaderFooterDataUpdate -> replaceContent
        if (item.editor !== editor) {
          item.editor.replaceContent(updatedData);
        }
      }
      item.editor.setOptions({
        lastSelection: transaction?.selection ?? null,
      });
    });
  }
  mainEditor.converter[`${type}s`][sectionId] = updatedData;
  mainEditor.setOptions({ isHeaderFooterChanged: editor.docChanged });
  if (editor.docChanged && mainEditor.converter) {
    mainEditor.converter.headerFooterModified = true;
  }

  await updateYdocDocxData(mainEditor, undefined);
};

const setEditorToolbar = ({ editor }: { editor: SuperEditor }, mainEditor: SuperEditor): void => {
  if (mainEditor.toolbar) {
    editor.setToolbar(mainEditor.toolbar);
  }
};
