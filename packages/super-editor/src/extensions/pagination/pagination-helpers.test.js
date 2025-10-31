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
  PaginationPluginKey,
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
        repository: {
          list: vi.fn(() => []),
          update: vi.fn(),
        },
        engine: null,
        layoutPages: null,
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
  it('exports PaginationPluginKey', () => {
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

  it('updates header/footer data, refreshes measurements, and propagates results', async () => {
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

    const headerRecord = { id: 'header-1', type: 'header', contentJson: { content: 'original' }, meta: {} };
    const repository = {
      list: vi.fn((role) => (role === 'header' ? [headerRecord] : [])),
      update: vi.fn((id, { contentJson }) => {
        headerRecord.contentJson = contentJson;
        headerRecord.dirty = true;
        headerRecord.heightPx = null;
        return headerRecord;
      }),
    };

    let currentSummary = {
      sectionMetricsById: new Map([
        [
          'header-1',
          {
            contentHeightPx: 30,
            distancePx: 12,
            effectiveHeightPx: 42,
          },
        ],
      ]),
      variantLookup: {
        header: new Map([['default', 'header-1']]),
        footer: new Map(),
      },
      distancesPx: {
        header: 12,
        footer: 0,
      },
    };

    const refreshedSummary = {
      ...currentSummary,
      sectionMetricsById: new Map([
        [
          'header-1',
          {
            contentHeightPx: 140,
            distancePx: 12,
            effectiveHeightPx: 152,
          },
        ],
      ]),
    };

    const engine = {
      getHeaderFooterSummary: vi.fn(() => currentSummary),
      refreshHeaderFooterMeasurements: vi.fn(async () => {
        currentSummary = refreshedSummary;
      }),
    };

    editor.storage.pagination.repository = repository;
    editor.storage.pagination.engine = engine;
    editor.storage.pagination.headerFooterSummary = currentSummary;
    editor.storage.pagination.sectionData.headers['header-1'] = {
      data: headerRecord.contentJson,
      measuredHeight: 30,
      reservedHeight: 42,
    };

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

    expect(repository.update).toHaveBeenCalledWith('header-1', { contentJson: { content: 'updated' } });
    expect(engine.refreshHeaderFooterMeasurements).toHaveBeenCalled();
    expect(engine.getHeaderFooterSummary).toHaveBeenCalledTimes(1);
    expect(editor.converter.headers['header-1']).toEqual({ content: 'updated' });
    expect(editor.storage.pagination.headerFooterSummary).toBe(refreshedSummary);
    expect(editor.storage.pagination.sectionData.headers['header-1']).toMatchObject({
      data: { content: 'updated' },
      reservedHeight: 152,
      measuredHeight: 140,
      offsetHeight: 12,
      sectionEditor,
    });
    expect(updateYdocDocxData).toHaveBeenCalledWith(editor);
    expect(editor.storage.pagination.headerFooterDomCache.delete).toHaveBeenCalledWith('header:header-1');
    expect(editor.view.dispatch).toHaveBeenCalled();
    expect(tr.setMeta).toHaveBeenCalledWith(PaginationPluginKey, { force: true });
    expect(slot.firstChild.textContent).toBe('clone');
  });

  describe('createHeaderFooterEditor', () => {
    it('creates editor without appending to body when appendToBody is false', () => {
      const editor = createMainEditorStub();
      const container = createSectionContainer();

      createHeaderFooterEditor({
        editor,
        data: { type: 'doc' },
        editorContainer: container,
        appendToBody: false,
      });

      expect(document.body.contains(container)).toBe(false);
    });

    it('appends container to body by default', () => {
      const editor = createMainEditorStub();
      const container = createSectionContainer();

      createHeaderFooterEditor({
        editor,
        data: { type: 'doc' },
        editorContainer: container,
      });

      expect(document.body.contains(container)).toBe(true);
      document.body.removeChild(container);
    });

    it('applies height constraint when availableHeight is provided', () => {
      const editor = createMainEditorStub();
      const container = createSectionContainer();

      createHeaderFooterEditor({
        editor,
        data: { type: 'doc' },
        editorContainer: container,
        appendToBody: false,
        availableHeight: 250,
      });

      expect(container.style.height).toBe('250px');
    });

    it('does not apply height constraint when availableHeight is not finite', () => {
      const editor = createMainEditorStub();
      const container = createSectionContainer();

      createHeaderFooterEditor({
        editor,
        data: { type: 'doc' },
        editorContainer: container,
        appendToBody: false,
        availableHeight: NaN,
      });

      expect(container.style.height).toBe('');
    });

    it('enables overflow when allowOverflow is true', () => {
      const editor = createMainEditorStub();
      const container = createSectionContainer();

      createHeaderFooterEditor({
        editor,
        data: { type: 'doc' },
        editorContainer: container,
        appendToBody: false,
        allowOverflow: true,
      });

      expect(container.style.overflow).toBe('visible');
      const pm = container.querySelector('.ProseMirror');
      expect(pm.style.overflow).toBe('visible');
    });

    it('invokes onCreate hook when provided', () => {
      const editor = createMainEditorStub();
      const container = createSectionContainer();
      const onCreateHook = vi.fn();

      createHeaderFooterEditor({
        editor,
        data: { type: 'doc' },
        editorContainer: container,
        appendToBody: false,
        onCreateHook,
      });

      expect(onCreateHook).toHaveBeenCalled();
      expect(onCreateHook.mock.calls[0][0].editor).toBeDefined();
    });

    it('handles onCreate hook errors gracefully', () => {
      const editor = createMainEditorStub();
      const container = createSectionContainer();
      const onCreateHook = vi.fn(() => {
        throw new Error('hook failed');
      });

      expect(() => {
        createHeaderFooterEditor({
          editor,
          data: { type: 'doc' },
          editorContainer: container,
          appendToBody: false,
          onCreateHook,
        });
      }).not.toThrow();
    });

    it('sets accessibility attributes correctly', () => {
      const editor = createMainEditorStub();
      const container = createSectionContainer();

      createHeaderFooterEditor({
        editor,
        data: { type: 'doc' },
        editorContainer: container,
        appendToBody: false,
        type: 'header',
        isEditable: false,
      });

      const pm = container.querySelector('.ProseMirror');
      expect(pm.getAttribute('role')).toBe('textbox');
      expect(pm.getAttribute('aria-multiline')).toBe('true');
      expect(pm.getAttribute('aria-label')).toContain('header content area');
      expect(pm.getAttribute('aria-readonly')).toBe('true');
    });

    it('sets aria-readonly to false when editable', () => {
      const editor = createMainEditorStub();
      const container = createSectionContainer();

      createHeaderFooterEditor({
        editor,
        data: { type: 'doc' },
        editorContainer: container,
        appendToBody: false,
        type: 'footer',
        isEditable: true,
      });

      const pm = container.querySelector('.ProseMirror');
      expect(pm.getAttribute('aria-readonly')).toBe('false');
      expect(pm.getAttribute('aria-label')).toContain('footer content area');
    });

    it('handles missing pageStyles gracefully', () => {
      const editor = createMainEditorStub();
      delete editor.converter.pageStyles;
      const container = createSectionContainer();

      expect(() => {
        createHeaderFooterEditor({
          editor,
          data: { type: 'doc' },
          editorContainer: container,
          appendToBody: false,
        });
      }).not.toThrow();
    });

    it('calculates content width from page size and margins', () => {
      const editor = createMainEditorStub();
      editor.converter.pageStyles = {
        pageSize: { width: 10 },
        pageMargins: { left: 1, right: 1.5 },
      };
      const container = createSectionContainer();

      createHeaderFooterEditor({
        editor,
        data: { type: 'doc' },
        editorContainer: container,
        appendToBody: false,
      });

      // 10 - 1 - 1.5 = 7.5 inches * 96 = 720px
      expect(container.style.width).toBe('720px');
      expect(container.style.maxWidth).toBe('720px');
    });

    it('uses fontFamilyCss when available', () => {
      const editor = createMainEditorStub();
      editor.converter.getDocumentDefaultStyles = () => ({
        fontSizePt: 12,
        typeface: 'Arial',
        fontFamilyCss: '"Custom Font", sans-serif',
      });
      const container = createSectionContainer();

      createHeaderFooterEditor({
        editor,
        data: { type: 'doc' },
        editorContainer: container,
        appendToBody: false,
      });

      expect(container.style.fontFamily).toBe('"Custom Font", sans-serif');
    });

    it('falls back to typeface when fontFamilyCss is missing', () => {
      const editor = createMainEditorStub();
      editor.converter.getDocumentDefaultStyles = () => ({
        fontSizePt: 12,
        typeface: 'Times New Roman',
      });
      const container = createSectionContainer();

      createHeaderFooterEditor({
        editor,
        data: { type: 'doc' },
        editorContainer: container,
        appendToBody: false,
      });

      expect(container.style.fontFamily).toBe('Times New Roman');
    });

    it('passes currentPageNumber to section editor', () => {
      const editor = createMainEditorStub();
      const container = createSectionContainer();

      const sectionEditor = createHeaderFooterEditor({
        editor,
        data: { type: 'doc' },
        editorContainer: container,
        appendToBody: false,
        currentPageNumber: 5,
      });

      expect(sectionEditor.options.currentPageNumber).toBe(5);
    });

    it('sets proper styling for non-editable measurement instances', () => {
      const editor = createMainEditorStub();
      const container = createSectionContainer();

      createHeaderFooterEditor({
        editor,
        data: { type: 'doc' },
        editorContainer: container,
        appendToBody: false,
        isMeasurement: true,
        isEditable: false,
      });

      const pm = container.querySelector('.ProseMirror');
      expect(pm.style.maxHeight).toBe('none');
      expect(pm.style.minHeight).toBe('0');
      expect(pm.style.paddingLeft).toBe('0px');
      expect(pm.style.paddingRight).toBe('0px');
    });
  });

  describe('broadcastEditorEvents', () => {
    it('broadcasts all supported events', () => {
      const emitted = [];
      const editor = { emit: (...args) => emitted.push(args) };
      const handlers = {};
      const sectionEditor = {
        on: (event, handler) => {
          handlers[event] = handler;
          return sectionEditor;
        },
      };

      broadcastEditorEvents(editor, sectionEditor);

      handlers.fieldAnnotationDropped('drop-payload');
      handlers.fieldAnnotationPaste('paste-payload');
      handlers.fieldAnnotationSelected('select-payload');
      handlers.fieldAnnotationClicked('click-payload');
      handlers.fieldAnnotationDoubleClicked('dblclick-payload');
      handlers.fieldAnnotationDeleted('delete-payload');

      expect(emitted).toHaveLength(6);
      expect(emitted[0]).toEqual(['fieldAnnotationDropped', 'drop-payload']);
      expect(emitted[1]).toEqual(['fieldAnnotationPaste', 'paste-payload']);
      expect(emitted[2]).toEqual(['fieldAnnotationSelected', 'select-payload']);
      expect(emitted[3]).toEqual(['fieldAnnotationClicked', 'click-payload']);
      expect(emitted[4]).toEqual(['fieldAnnotationDoubleClicked', 'dblclick-payload']);
      expect(emitted[5]).toEqual(['fieldAnnotationDeleted', 'delete-payload']);
    });

    it('handles multiple arguments in events', () => {
      const emitted = [];
      const editor = { emit: (...args) => emitted.push(args) };
      const handlers = {};
      const sectionEditor = {
        on: (event, handler) => {
          handlers[event] = handler;
          return sectionEditor;
        },
      };

      broadcastEditorEvents(editor, sectionEditor);
      handlers.fieldAnnotationClicked('arg1', 'arg2', 'arg3');

      expect(emitted).toEqual([['fieldAnnotationClicked', 'arg1', 'arg2', 'arg3']]);
    });
  });

  describe('toggleHeaderFooterEditMode', () => {
    it('handles empty headerEditors and footerEditors arrays', () => {
      const editor = createMainEditorStub();
      editor.converter.headerEditors = [];
      editor.converter.footerEditors = [];

      expect(() => {
        toggleHeaderFooterEditMode({
          editor,
          isEditMode: true,
          documentMode: 'editing',
        });
      }).not.toThrow();
    });

    it('works without focusedSectionEditor', () => {
      const editor = createMainEditorStub();
      const headerDom = document.createElement('div');
      const headerItem = {
        id: 'header-1',
        editor: {
          setEditable: vi.fn(),
          view: { dom: headerDom },
        },
      };
      editor.converter.headerEditors = [headerItem];
      editor.converter.footerEditors = [];

      toggleHeaderFooterEditMode({
        editor,
        focusedSectionEditor: null,
        isEditMode: true,
        documentMode: 'editing',
      });

      expect(headerItem.editor.setEditable).toHaveBeenCalledWith(true, false);
    });

    it('handles missing view.dom gracefully', () => {
      const editor = createMainEditorStub();
      delete editor.view.dom;
      delete editor.options.element;

      expect(() => {
        toggleHeaderFooterEditMode({
          editor,
          isEditMode: true,
          documentMode: 'editing',
        });
      }).not.toThrow();
    });

    it('uses options.element as fallback when view.dom is missing', () => {
      const editor = createMainEditorStub();
      const fallbackElement = document.createElement('div');
      const pm = document.createElement('div');
      pm.className = 'ProseMirror';
      fallbackElement.appendChild(pm);
      editor.view.dom = null;
      editor.options.element = fallbackElement;

      toggleHeaderFooterEditMode({
        editor,
        isEditMode: true,
        documentMode: 'editing',
      });

      expect(pm.classList.contains('header-footer-edit')).toBe(true);
    });

    it('sets both aria-readonly and readonly attributes correctly', () => {
      const editor = createMainEditorStub();
      const headerDom = document.createElement('div');
      const headerItem = {
        editor: {
          setEditable: vi.fn(),
          view: { dom: headerDom },
        },
      };
      editor.converter.headerEditors = [headerItem];
      editor.converter.footerEditors = [];

      toggleHeaderFooterEditMode({
        editor,
        isEditMode: true,
        documentMode: 'editing',
      });

      expect(headerDom.getAttribute('aria-readonly')).toBe('false');

      toggleHeaderFooterEditMode({
        editor,
        isEditMode: false,
        documentMode: 'viewing',
      });

      expect(headerDom.getAttribute('aria-readonly')).toBe('true');
    });
  });

  describe('onHeaderFooterDataUpdate', () => {
    it('returns early when type is missing', async () => {
      const editor = createMainEditorStub();
      const sectionEditor = { getUpdatedJson: vi.fn() };

      await onHeaderFooterDataUpdate({ editor: sectionEditor }, editor, 'section-1', null);

      expect(sectionEditor.getUpdatedJson).not.toHaveBeenCalled();
    });

    it('returns early when sectionId is missing', async () => {
      const editor = createMainEditorStub();
      const sectionEditor = { getUpdatedJson: vi.fn() };

      await onHeaderFooterDataUpdate({ editor: sectionEditor }, editor, null, 'header');

      expect(sectionEditor.getUpdatedJson).not.toHaveBeenCalled();
    });

    it('handles footer updates', async () => {
      const editor = createMainEditorStub();
      const sectionEditor = {
        getUpdatedJson: () => ({ content: 'footer-content' }),
        options: { media: [], mediaFiles: [], element: document.createElement('div') },
        view: { dom: document.createElement('div') },
        docChanged: false,
      };

      editor.converter.footers = { 'footer-1': { old: 'data' } };
      editor.converter.footerEditors = [
        {
          id: 'footer-1',
          editor: {
            setOptions: vi.fn(),
            replaceContent: vi.fn(),
          },
        },
      ];

      await onHeaderFooterDataUpdate({ editor: sectionEditor }, editor, 'footer-1', 'footer');

      expect(editor.converter.footers['footer-1']).toEqual({ content: 'footer-content' });
      expect(editor.converter.footerEditors[0].editor.replaceContent).toHaveBeenCalledWith({
        content: 'footer-content',
      });
    });

    it('updates sectionData when pagination storage exists', async () => {
      const editor = createMainEditorStub();
      const sectionDom = document.createElement('div');
      sectionDom.innerHTML = '<p>content</p>';
      const sectionEditor = {
        getUpdatedJson: () => ({ content: 'new' }),
        options: { media: [], mediaFiles: [], element: sectionDom },
        view: { dom: sectionDom },
        docChanged: true,
      };

      editor.converter.headers = { 'header-1': {} };
      editor.converter.headerEditors = [];

      await onHeaderFooterDataUpdate({ editor: sectionEditor }, editor, 'header-1', 'header');

      expect(editor.storage.pagination.sectionData.headers['header-1']).toMatchObject({
        data: { content: 'new' },
        sectionEditor,
        sectionContainer: sectionDom,
      });
      expect(editor.storage.pagination.sectionData.headers['header-1'].html).toBe('<p>content</p>');
    });

    it('handles missing repository gracefully', async () => {
      const editor = createMainEditorStub();
      const sectionEditor = {
        getUpdatedJson: () => ({ content: 'data' }),
        options: { media: [], mediaFiles: [], element: document.createElement('div') },
        view: { dom: document.createElement('div') },
      };

      editor.storage.pagination.repository = null;
      editor.converter.headers = { 'header-1': {} };
      editor.converter.headerEditors = [];

      await expect(
        onHeaderFooterDataUpdate({ editor: sectionEditor }, editor, 'header-1', 'header'),
      ).resolves.not.toThrow();
    });

    it('handles missing engine gracefully', async () => {
      const editor = createMainEditorStub();
      const sectionEditor = {
        getUpdatedJson: () => ({ content: 'data' }),
        options: { media: [], mediaFiles: [], element: document.createElement('div') },
        view: { dom: document.createElement('div') },
      };

      editor.storage.pagination.engine = null;
      editor.converter.headers = { 'header-1': {} };
      editor.converter.headerEditors = [];

      await expect(
        onHeaderFooterDataUpdate({ editor: sectionEditor }, editor, 'header-1', 'header'),
      ).resolves.not.toThrow();
    });

    it('handles engine.refreshHeaderFooterMeasurements errors', async () => {
      const editor = createMainEditorStub();
      const sectionEditor = {
        getUpdatedJson: () => ({ content: 'data' }),
        options: { media: [], mediaFiles: [], element: document.createElement('div') },
        view: { dom: document.createElement('div') },
      };

      const engine = {
        refreshHeaderFooterMeasurements: vi.fn(async () => {
          throw new Error('Measurement failed');
        }),
      };

      editor.storage.pagination.engine = engine;
      editor.converter.headers = { 'header-1': {} };
      editor.converter.headerEditors = [];

      await expect(
        onHeaderFooterDataUpdate({ editor: sectionEditor }, editor, 'header-1', 'header'),
      ).resolves.not.toThrow();
    });

    it('handles missing slot during preview refresh', async () => {
      const editor = createMainEditorStub();
      const sectionEditor = {
        getUpdatedJson: () => ({ content: 'data' }),
        options: { media: [], mediaFiles: [], element: document.createElement('div') },
        view: { dom: document.createElement('div') },
      };

      editor.converter.headers = { 'header-1': {} };
      editor.converter.headerEditors = [];

      // No slot in DOM
      await expect(
        onHeaderFooterDataUpdate({ editor: sectionEditor }, editor, 'header-1', 'header'),
      ).resolves.not.toThrow();
    });

    it('handles missing headerFooterDomCache', async () => {
      const editor = createMainEditorStub();
      const sectionEditor = {
        getUpdatedJson: () => ({ content: 'data' }),
        options: { media: [], mediaFiles: [], element: document.createElement('div') },
        view: { dom: document.createElement('div') },
      };

      editor.storage.pagination.headerFooterDomCache = null;
      editor.converter.headers = { 'header-1': {} };
      editor.converter.headerEditors = [];

      await expect(
        onHeaderFooterDataUpdate({ editor: sectionEditor }, editor, 'header-1', 'header'),
      ).resolves.not.toThrow();
    });

    it('handles missing view during dispatch', async () => {
      const editor = createMainEditorStub();
      const sectionEditor = {
        getUpdatedJson: () => ({ content: 'data' }),
        options: { media: [], mediaFiles: [], element: document.createElement('div') },
        view: { dom: document.createElement('div') },
      };

      editor.view = null;
      editor.converter.headers = { 'header-1': {} };
      editor.converter.headerEditors = [];

      await expect(
        onHeaderFooterDataUpdate({ editor: sectionEditor }, editor, 'header-1', 'header'),
      ).resolves.not.toThrow();
    });

    it('updates multiple slots for the same section', async () => {
      const editor = createMainEditorStub();
      const sectionDom = document.createElement('div');
      sectionDom.innerHTML = '<span>section</span>';
      const sectionEditor = {
        getUpdatedJson: () => ({ content: 'updated' }),
        options: { media: [], mediaFiles: [], element: sectionDom },
        view: { dom: sectionDom },
      };

      const clone1 = document.createElement('div');
      clone1.textContent = 'preview1';
      const clone2 = document.createElement('div');
      clone2.textContent = 'preview2';
      const clone3 = document.createElement('div');
      clone3.textContent = 'preview3';

      getSectionPreviewClone.mockReturnValueOnce(clone1).mockReturnValueOnce(clone2).mockReturnValueOnce(clone3);

      const slot1 = attachSlot({ type: 'header', sectionId: 'header-1', page: '1' });
      const slot2 = attachSlot({ type: 'header', sectionId: 'header-1', page: '2' });
      const slot3 = attachSlot({ type: 'header', sectionId: 'header-1', page: '3' });

      editor.converter.headers = { 'header-1': {} };
      editor.converter.headerEditors = [];

      // Create a proper editor.view.dom with ownerDocument
      const editorDom = document.createElement('div');
      editor.view = {
        dom: editorDom,
      };

      await onHeaderFooterDataUpdate({ editor: sectionEditor }, editor, 'header-1', 'header');

      // Verify getSectionPreviewClone was called for each slot
      expect(getSectionPreviewClone).toHaveBeenCalledTimes(3);

      // Check that slots have been updated (if they have children)
      if (slot1.firstChild) {
        expect(slot1.firstChild.textContent).toContain('preview');
      }
      if (slot2.firstChild) {
        expect(slot2.firstChild.textContent).toContain('preview');
      }
      if (slot3.firstChild) {
        expect(slot3.firstChild.textContent).toContain('preview');
      }
    });

    it('sets isHeaderFooterChanged option based on docChanged', async () => {
      const editor = createMainEditorStub();
      const sectionEditor = {
        getUpdatedJson: () => ({ content: 'data' }),
        options: { media: [], mediaFiles: [], element: document.createElement('div') },
        view: { dom: document.createElement('div') },
        docChanged: true,
      };

      editor.converter.headers = { 'header-1': {} };
      editor.converter.headerEditors = [];

      await onHeaderFooterDataUpdate({ editor: sectionEditor }, editor, 'header-1', 'header');

      expect(editor.setOptions).toHaveBeenCalledWith({ isHeaderFooterChanged: true });
    });

    it('passes transaction selection to setOptions', async () => {
      const editor = createMainEditorStub();
      const mockSelection = { from: 0, to: 5 };
      const sectionEditor = {
        getUpdatedJson: () => ({ content: 'data' }),
        options: { media: [], mediaFiles: [], element: document.createElement('div') },
        view: { dom: document.createElement('div') },
      };

      editor.converter.headers = { 'header-1': {} };
      editor.converter.headerEditors = [
        {
          id: 'header-1',
          editor: {
            setOptions: vi.fn(),
            replaceContent: vi.fn(),
          },
        },
      ];

      await onHeaderFooterDataUpdate(
        { editor: sectionEditor, transaction: { selection: mockSelection } },
        editor,
        'header-1',
        'header',
      );

      expect(editor.converter.headerEditors[0].editor.setOptions).toHaveBeenCalledWith({
        lastSelection: mockSelection,
      });
    });
  });
});

afterAll(() => {
  rafSpy.mockRestore();
});
