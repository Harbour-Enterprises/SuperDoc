import { createHeaderFooterEditor } from '../../pagination-helpers.js';

const PREVIEW_CACHE_KEY = 'headerFooterPreviewCache';

const getStorage = (editor) => editor?.storage?.pagination ?? null;

const ensurePreviewCache = (editor) => {
  const storage = getStorage(editor);
  if (!storage) return null;
  if (!storage[PREVIEW_CACHE_KEY]) {
    storage[PREVIEW_CACHE_KEY] = new Map();
  }
  return storage[PREVIEW_CACHE_KEY];
};

export const getSectionEntry = (editor, type, sectionId) => {
  if (!sectionId) return null;
  const storage = getStorage(editor);
  if (!storage?.sectionData) return null;
  const bucket = type === 'header' ? storage.sectionData.headers : storage.sectionData.footers;
  if (!bucket) return null;
  return bucket[sectionId] ?? null;
};

/**
 * Create (or reuse) a DOM preview for the requested header/footer section.
 * Returns a cloned node ready to be inserted into an overlay.
 *
 * @param {import('../../../../core/Editor.js').Editor} editor
 * @param {'header'|'footer'} type
 * @param {string|null|undefined} sectionId
 * @param {{ pageNumber?: number }} [options]
 * @returns {HTMLElement|null}
 */
export const getSectionPreviewClone = (editor, type, sectionId, options = {}) => {
  if (!sectionId) return null;
  const entry = getSectionEntry(editor, type, sectionId);
  if (!entry?.data) return null;

  const cache = ensurePreviewCache(editor);
  if (!cache) return null;

  const pageNumber = Number.isInteger(options.pageNumber) ? options.pageNumber : null;
  const key = `${type}:${sectionId}:${pageNumber ?? 'default'}`;
  const dataRef = entry.data;
  const reservedHeight = Number.isFinite(entry.reservedHeight) ? entry.reservedHeight : null;

  let record = cache.get(key);
  const needsRefresh = !record || record.dataRef !== dataRef || record.reservedHeight !== reservedHeight;

  if (needsRefresh) {
    if (record?.editor?.destroy) {
      try {
        record.editor.destroy();
      } catch (error) {
        console.debug('[pagination-overlay] failed to destroy preview editor', error);
      }
    }

    const container = document.createElement('div');
    container.style.position = 'relative';
    container.style.pointerEvents = 'none';
    container.style.width = '100%';

    const previewEditor = createHeaderFooterEditor({
      editor,
      data: dataRef,
      editorContainer: container,
      appendToBody: false,
      sectionId,
      type,
      availableHeight: reservedHeight ?? undefined,
      currentPageNumber: pageNumber ?? undefined,
      isEditable: false,
      allowOverflow: true,
    });

    record = {
      editor: previewEditor,
      container,
      dataRef,
      reservedHeight,
    };
    cache.set(key, record);
  }

  const base = record?.container;
  if (!base) return null;
  const clone = base.cloneNode(true);
  cleanSpacerNodes(clone);
  return clone;
};

const cleanSpacerNodes = (root) => {
  if (!root || !root.querySelectorAll) return;
  const spacerSelector = '.page-leading-spacer, .page-trailing-spacer, [data-leading-spacer], [data-trailing-spacer]';
  root.querySelectorAll(spacerSelector).forEach((node) => {
    const parent = node?.parentNode;
    if (!parent) return;
    parent.removeChild(node);
    if (parent.childNodes.length === 0 && parent !== root) {
      parent.remove();
    }
  });
};

export const disposeSectionPreviewCache = (storage) => {
  if (!storage) return;
  const cache = storage[PREVIEW_CACHE_KEY];
  if (!cache) return;
  cache.forEach((record) => {
    if (record?.editor?.destroy) {
      try {
        record.editor.destroy();
      } catch (error) {
        console.debug('[pagination-overlay] failed to destroy preview editor during cleanup', error);
      }
    }
  });
  cache.clear();
};
