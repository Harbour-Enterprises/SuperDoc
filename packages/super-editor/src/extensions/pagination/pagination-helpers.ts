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
  appendToBody?: boolean;
  sectionId?: string;
  type?: string;
  availableHeight?: number;
  currentPageNumber?: number;
}

export const createHeaderFooterEditor = ({
  editor,
  data,
  editorContainer,
  appendToBody = true,
  sectionId,
  type,
  availableHeight,
  currentPageNumber,
}: CreateHeaderFooterEditorParams): SuperEditor => {
  const parentStyles = editor.converter.getDocumentDefaultStyles();
  const { fontSizePt, typeface, fontFamilyCss } = parentStyles;
  const fontSizeInPixles = fontSizePt * 1.3333;
  const lineHeight = fontSizeInPixles * 1.2;

  applyStyleIsolationClass(editorContainer);

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

  Object.assign(editorContainer.style, {
    padding: '0',
    margin: '0',
    border: 'none',
    boxSizing: 'border-box',
    height: availableHeight + 'px',
    overflow: 'hidden',
  });
  if (appendToBody) document.body.appendChild(editorContainer);

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
    currentPageNumber,
    // Don't set parentEditor to avoid circular reference issues
    // parentEditor: editor,
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
  editorsList.forEach((item: HeaderFooterEditorItem) => {
    const sectionEditor = item.editor;
    if (item.id === sectionId) {
      sectionEditor.setOptions({
        media: editor.options.media,
        mediaFiles: editor.options.mediaFiles,
      });
      sectionEditor.replaceContent(updatedData);
    }
    sectionEditor.setOptions({
      lastSelection: transaction?.selection ?? null,
    });
  });
  mainEditor.converter[`${type}s`][sectionId] = updatedData;
  mainEditor.setOptions({ isHeaderFooterChanged: editor.docChanged });

  await updateYdocDocxData(mainEditor, undefined);
};

const setEditorToolbar = ({ editor }: { editor: SuperEditor }, mainEditor: SuperEditor): void => {
  if (mainEditor.toolbar) {
    editor.setToolbar(mainEditor.toolbar);
  }
};
