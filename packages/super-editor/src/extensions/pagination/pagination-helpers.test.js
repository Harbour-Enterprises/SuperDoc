import { describe, it, expect, beforeEach, vi } from 'vitest';

// Provide a deterministic raf for measurement helpers.
if (!globalThis.requestAnimationFrame) {
  globalThis.requestAnimationFrame = (cb) => {
    cb();
    return 1;
  };
}

const rafSpy = vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => {
  cb();
  return 1;
});

vi.mock('@core/Editor.js', () => {
  class MockSuperEditor {
    constructor(options) {
      this.options = options;
      this.events = {};
      this.commands = {
        updateFieldAnnotations: vi.fn(),
        deleteFieldAnnotations: vi.fn(),
        resetFieldAnnotations: vi.fn(),
      };
      this.storage = { image: { media: options.media || null, mediaFiles: options.mediaFiles || null } };
      const pm = document.createElement('div');
      pm.className = 'ProseMirror';
      const measurementHeights = Array.isArray(options.parentEditor?.__testMeasurementHeights)
        ? options.parentEditor.__testMeasurementHeights
        : null;
      const height = measurementHeights ? (measurementHeights.shift() ?? 0) : 0;
      if (height > 0 || height === 0) {
        const child = document.createElement('div');
        child.getBoundingClientRect = () => ({ top: 0, bottom: height, height });
        pm.appendChild(child);
      }
      options.element.appendChild(pm);
      this.view = { dom: pm };
      this.setEditable = vi.fn();
      this.setToolbar = vi.fn();
      this.getUpdatedJson = () => this.options.content;
      this.replaceContent = vi.fn();
      this.setOptions = vi.fn();
      this.destroy = vi.fn();
      if (typeof options.onCreate === 'function') {
        options.onCreate({ editor: this });
      }
      setTimeout(() => {
        this.emit('create', { editor: this });
      }, 0);
    }

    on(event, handler) {
      this.events[event] = handler;
      return this;
    }

    emit(event, ...args) {
      if (this.events[event]) {
        this.events[event](...args);
      }
    }
  }

  return { Editor: MockSuperEditor };
});

vi.mock('@extensions/index.js', () => ({
  getStarterExtensions: vi.fn(() => []),
}));

vi.mock('@extensions/collaboration/collaboration-helpers.js', () => ({
  updateYdocDocxData: vi.fn(async () => {}),
}));

vi.mock('./plugin/helpers/section-preview.js', () => ({
  getSectionPreviewClone: vi.fn(() => {
    const node = document.createElement('div');
    node.textContent = 'preview';
    return node;
  }),
}));

import {
  DEFAULT_PAGINATION_OPTIONS,
  PaginationMode,
  PaginationPluginKey,
  initPaginationData,
  createHeaderFooterEditor,
  broadcastEditorEvents,
  toggleHeaderFooterEditMode,
  onHeaderFooterDataUpdate,
} from './pagination-helpers.js';
import { updateYdocDocxData } from '@extensions/collaboration/collaboration-helpers.js';
import { getSectionPreviewClone } from './plugin/helpers/section-preview.js';

const createMainEditorStub = () => {
  const pm = document.createElement('div');
  pm.className = 'ProseMirror';

  return {
    converter: {
      getDocumentDefaultStyles: () => ({ fontSizePt: 12, typeface: 'Arial', fontFamilyCss: 'Helvetica' }),
      pageStyles: {
        pageSize: { width: 8.5 },
        pageMargins: { top: 1, bottom: 1, header: 0.25, footer: 0.3, left: 1, right: 1 },
      },
      headers: {},
      footers: {},
      headerEditors: [],
      footerEditors: [],
    },
    storage: {
      image: { media: ['media'], mediaFiles: ['mediaFile'] },
      pagination: {
        sectionData: { headers: {}, footers: {} },
        headerFooterDomCache: { delete: vi.fn() },
      },
    },
    options: {
      role: 'editor',
      fonts: [],
      isHeadless: false,
      suppressDefaultDocxStyles: false,
      element: pm,
    },
    toolbar: { id: 'toolbar' },
    view: {
      dom: pm,
      state: {
        tr: {
          setMeta: vi.fn(function () {
            return this;
          }),
        },
      },
      dispatch: vi.fn(),
    },
    setOptions: vi.fn(),
    emit: vi.fn(),
  };
};

const createSectionContainer = () => {
  const container = document.createElement('div');
  container.className = 'container';
  return container;
};

const attachSlot = ({ type, sectionId, page = '1', offset = '0' }) => {
  const slot = document.createElement('div');
  slot.className = 'super-editor-page-section-slot';
  slot.dataset.paginationSection = type;
  slot.dataset.paginationSectionId = sectionId;
  slot.dataset.paginationPage = page;
  slot.dataset.paginationOffset = offset;
  document.body.appendChild(slot);
  return slot;
};

beforeEach(() => {
  document.body.innerHTML = '';
  vi.clearAllMocks();
});

describe('pagination helpers', () => {
  it('exports default pagination options and modes', () => {
    expect(DEFAULT_PAGINATION_OPTIONS).toEqual({ mode: PaginationMode.NONE, showPageNumbers: false });
    expect(PaginationMode).toEqual({ NONE: 'none', LEGACY: 'legacy', LAYOUT: 'layout' });
    expect(PaginationPluginKey.key.startsWith('paginationPlugin')).toBe(true);
  });

  it('creates header/footer editor with expected container styling', () => {
    const editor = createMainEditorStub();
    const container = createSectionContainer();
    const sectionEditor = createHeaderFooterEditor({
      editor,
      data: { type: 'doc' },
      editorContainer: container,
      appendToBody: false,
      sectionId: 'header-1',
      type: 'header',
      isEditable: true,
    });

    const pm = container.querySelector('.ProseMirror');
    expect(pm).not.toBeNull();
    expect(pm.style.maxHeight).toBe('100%');
    expect(pm.style.paddingTop).toBe('');
    expect(container.style.overflow).toBe('hidden');
    expect(sectionEditor.options.parentEditor).toBe(editor);
  });

  it('applies measurement-safe styling when creating measurement editors', () => {
    const editor = createMainEditorStub();
    const container = createSectionContainer();
    const sectionEditor = createHeaderFooterEditor({
      editor,
      data: { type: 'doc' },
      editorContainer: container,
      sectionId: 'header-2',
      type: 'header',
      isMeasurement: true,
    });

    const pm = container.querySelector('.ProseMirror');
    expect(pm.style.paddingTop).toBe('0px');
    expect(pm.style.marginBottom).toBe('0px');
    expect(sectionEditor.setEditable).toHaveBeenCalledWith(false, false);
    expect(document.body.contains(container)).toBe(true);
    document.body.removeChild(container);
  });

  it('broadcasts header/footer editor events back to the main editor', () => {
    const emitted = [];
    const editor = { emit: (...args) => emitted.push(args) };
    const handlers = {};
    const sectionEditor = {
      on: (event, handler) => {
        handlers[event] = handler;
      },
    };

    broadcastEditorEvents(editor, sectionEditor);
    handlers.fieldAnnotationClicked('payload');

    expect(emitted).toEqual([['fieldAnnotationClicked', 'payload']]);
  });

  it('toggles header/footer edit mode and focus as expected', () => {
    const editor = createMainEditorStub();
    const headerDom = document.createElement('div');
    const footerDom = document.createElement('div');
    const focusDom = document.createElement('div');

    const headerItem = {
      id: 'header-1',
      editor: {
        setEditable: vi.fn(),
        view: { dom: headerDom },
      },
    };
    const footerItem = {
      id: 'footer-1',
      editor: {
        setEditable: vi.fn(),
        view: { dom: footerDom },
      },
    };
    const focusedSection = {
      view: { focus: vi.fn() },
    };

    editor.converter.headerEditors = [headerItem];
    editor.converter.footerEditors = [footerItem];

    toggleHeaderFooterEditMode({
      editor,
      focusedSectionEditor: focusedSection,
      isEditMode: true,
      documentMode: 'editing',
    });

    expect(headerItem.editor.setEditable).toHaveBeenCalledWith(true, false);
    expect(headerDom.getAttribute('documentmode')).toBe('editing');
    expect(editor.view.dom.classList.contains('header-footer-edit')).toBe(true);
    expect(focusedSection.view.focus).toHaveBeenCalled();

    toggleHeaderFooterEditMode({
      editor,
      focusedSectionEditor: null,
      isEditMode: false,
      documentMode: 'viewing',
    });

    expect(headerDom.getAttribute('aria-readonly')).toBe('true');
    expect(editor.view.dom.classList.contains('header-footer-edit')).toBe(false);
    expect(editor.view.dom.hasAttribute('aria-readonly')).toBe(false);
  });

  it('initializes pagination data with measured heights for headers and footers', async () => {
    const editor = createMainEditorStub();
    editor.converter.headerIds = { ids: { default: 'header-1' } };
    editor.converter.footerIds = { ids: { default: 'footer-1' } };
    editor.converter.headers = { 'header-1': { type: 'doc' } };
    editor.converter.footers = { 'footer-1': { type: 'doc' } };
    editor.__testMeasurementHeights = [40, 0];

    const data = await initPaginationData(editor);

    expect(Object.keys(data.headers)).toEqual(['header-1']);
    expect(data.headers['header-1'].measuredHeight).toBe(40);
    expect(data.headers['header-1'].reservedHeight).toBeCloseTo(96);
    expect(data.footers['footer-1'].measuredHeight).toBe(0);
    expect(data.footers['footer-1'].reservedHeight).toBeCloseTo(96);
  });

  it('updates header/footer data and triggers downstream updates', async () => {
    const editor = createMainEditorStub();
    const sectionDom = document.createElement('div');
    sectionDom.innerHTML = '<span>updated</span>';
    const sectionEditor = {
      getUpdatedJson: () => ({ content: 'updated' }),
      options: { media: ['media'], mediaFiles: ['files'], element: sectionDom },
      view: { dom: sectionDom },
      docChanged: true,
    };

    const clone = document.createElement('div');
    clone.textContent = 'clone';
    getSectionPreviewClone.mockReturnValue(clone);

    const slot = attachSlot({ type: 'header', sectionId: 'header-1', page: '2', offset: '12' });

    editor.converter.headers['header-1'] = { content: 'original' };
    editor.converter.headerEditors = [
      {
        id: 'header-1',
        editor: {
          setOptions: vi.fn(),
          replaceContent: vi.fn(),
          view: { dom: document.createElement('div') },
        },
      },
    ];

    editor.storage.pagination.sectionData.headers['header-1'] = { measuredHeight: 30 };
    editor.storage.pagination.headerFooterDomCache = { delete: vi.fn() };
    editor.__testMeasurementHeights = [140];

    const tr = {
      setMeta: vi.fn(function () {
        return this;
      }),
    };
    editor.view = {
      dom: document.createElement('div'),
      state: { tr },
      dispatch: vi.fn(),
    };

    await onHeaderFooterDataUpdate({ editor: sectionEditor }, editor, 'header-1', 'header');

    expect(editor.converter.headers['header-1']).toEqual({ content: 'updated' });
    expect(editor.storage.pagination.sectionData.headers['header-1'].measuredHeight).toBe(140);
    expect(editor.storage.pagination.sectionData.headers['header-1'].reservedHeight).toBeGreaterThan(140);
    expect(updateYdocDocxData).toHaveBeenCalledWith(editor);
    expect(editor.storage.pagination.headerFooterDomCache.delete).toHaveBeenCalledWith('header:header-1');
    expect(editor.view.dispatch).toHaveBeenCalled();
    expect(tr.setMeta).toHaveBeenCalledWith(PaginationPluginKey, { force: true });
    expect(slot.firstChild.textContent).toBe('clone');
  });
});

afterAll(() => {
  rafSpy.mockRestore();
});
