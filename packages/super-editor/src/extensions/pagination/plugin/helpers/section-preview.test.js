import { describe, it, expect, beforeEach, vi } from 'vitest';

const superEditorInstances = [];

vi.mock('@core/Editor.js', () => {
  const Editor = vi.fn(({ element }) => {
    const dom = document.createElement('div');
    dom.className = 'ProseMirror';
    dom.innerHTML = `
      <div class="page-leading-spacer">leading</div>
      <div data-leading-spacer>leading attr</div>
      <div class="content"><span>Preview content</span><div data-trailing-spacer>trail attr</div></div>
      <div class="page-trailing-spacer">trailing</div>
    `;
    element.appendChild(dom);
    const instance = {
      setEditable: vi.fn(),
      view: { dom },
      on: vi.fn(),
      destroy: vi.fn(),
    };
    superEditorInstances.push(instance);
    return instance;
  });
  return { Editor };
});

vi.mock('@extensions/index.js', () => ({
  getStarterExtensions: vi.fn(() => []),
}));

vi.mock('@extensions/collaboration/collaboration-helpers.js', () => ({
  updateYdocDocxData: vi.fn(),
}));

import { getSectionEntry, getSectionPreviewClone, disposeSectionPreviewCache } from './section-preview.js';

describe('section-preview helpers', () => {
  beforeEach(() => {
    superEditorInstances.length = 0;
  });

  it('fetches section entries from storage buckets', () => {
    const entry = { data: { id: 'header-1' } };
    const editor = {
      storage: {
        pagination: {
          sectionData: {
            headers: { 'header-1': entry },
            footers: {},
          },
        },
      },
    };
    expect(getSectionEntry(editor, 'header', 'header-1')).toBe(entry);
    expect(getSectionEntry(editor, 'footer', 'header-1')).toBeNull();
    expect(getSectionEntry(editor, 'header', null)).toBeNull();
  });

  it('returns null when preview elements are unavailable', () => {
    const editor = { storage: { pagination: {} } };
    expect(getSectionPreviewClone(editor, 'header', null)).toBeNull();
    expect(getSectionPreviewClone(editor, 'header', 'missing')).toBeNull();
  });

  it('creates, caches, and clones sanitized preview DOM nodes', () => {
    const editor = {
      converter: {
        getDocumentDefaultStyles: () => ({ fontSizePt: 12, typeface: 'Arial', fontFamilyCss: 'Arial' }),
        pageStyles: {
          pageMargins: { left: 0.5, right: 0.5 },
          pageSize: { width: 8.5 },
        },
      },
      options: {
        role: 'doc',
        fonts: [],
        isHeadless: false,
        suppressDefaultDocxStyles: false,
      },
      storage: {
        pagination: {
          sectionData: {
            headers: {
              'header-1': {
                data: { id: 'doc-1' },
                reservedHeight: 180,
              },
            },
          },
        },
        image: { media: [] },
      },
      emit: vi.fn(),
    };

    const clone = getSectionPreviewClone(editor, 'header', 'header-1', { pageNumber: 2 });
    expect(clone).toBeInstanceOf(HTMLElement);
    expect(superEditorInstances.length).toBe(1);

    const cache = editor.storage.pagination.headerFooterPreviewCache;
    const record = cache.get('header:header-1:2');
    expect(record.container).not.toBe(clone);
    expect(superEditorInstances[0]).toBe(record.editor);

    expect(clone.querySelector('.page-leading-spacer')).toBeNull();
    expect(clone.querySelector('[data-leading-spacer]')).toBeNull();
    expect(clone.querySelector('.page-trailing-spacer')).toBeNull();
    expect(clone.querySelector('[data-trailing-spacer]')).toBeNull();
    expect(clone.textContent).toContain('Preview content');

    const secondClone = getSectionPreviewClone(editor, 'header', 'header-1', { pageNumber: 2 });
    expect(secondClone).toBeInstanceOf(HTMLElement);
    expect(superEditorInstances.length).toBe(1);

    editor.storage.pagination.sectionData.headers['header-1'].data = { id: 'doc-2' };
    const refreshedClone = getSectionPreviewClone(editor, 'header', 'header-1', { pageNumber: 2 });
    expect(superEditorInstances.length).toBe(2);
    expect(superEditorInstances[0].destroy).toHaveBeenCalled();
    expect(refreshedClone.textContent).toContain('Preview content');
  });

  it('disposes cached previews and destroys editors', () => {
    const storage = {
      sectionData: {},
    };
    storage.headerFooterPreviewCache = new Map([
      [
        'header:test',
        {
          editor: { destroy: vi.fn() },
          container: document.createElement('div'),
          dataRef: {},
          reservedHeight: null,
        },
      ],
    ]);

    disposeSectionPreviewCache(storage);
    const record = storage.headerFooterPreviewCache.get('header:test');
    expect(record).toBeUndefined();
    expect(storage.headerFooterPreviewCache.size).toBe(0);
  });

  it('handles missing section data gracefully', () => {
    const editor = {
      storage: {
        pagination: {
          sectionData: {
            headers: {},
            footers: {},
          },
        },
      },
    };
    expect(getSectionEntry(editor, 'header', 'non-existent')).toBeNull();
    expect(getSectionEntry(editor, 'footer', 'non-existent')).toBeNull();
  });

  it('handles missing editor storage gracefully', () => {
    expect(getSectionEntry({}, 'header', 'test')).toBeNull();
    expect(getSectionEntry({ storage: {} }, 'header', 'test')).toBeNull();
  });

  it('creates separate cache entries for different page numbers', () => {
    const editor = {
      converter: {
        getDocumentDefaultStyles: () => ({ fontSizePt: 12, typeface: 'Arial', fontFamilyCss: 'Arial' }),
        pageStyles: {
          pageMargins: { left: 0.5, right: 0.5 },
          pageSize: { width: 8.5 },
        },
      },
      options: {
        role: 'doc',
        fonts: [],
        isHeadless: false,
        suppressDefaultDocxStyles: false,
      },
      storage: {
        pagination: {
          sectionData: {
            headers: {
              'header-1': {
                data: { id: 'doc-1' },
                reservedHeight: 180,
              },
            },
          },
        },
        image: { media: [] },
      },
      emit: vi.fn(),
    };

    const clone1 = getSectionPreviewClone(editor, 'header', 'header-1', { pageNumber: 1 });
    const clone2 = getSectionPreviewClone(editor, 'header', 'header-1', { pageNumber: 2 });

    expect(clone1).toBeInstanceOf(HTMLElement);
    expect(clone2).toBeInstanceOf(HTMLElement);
    expect(clone1).not.toBe(clone2);

    const cache = editor.storage.pagination.headerFooterPreviewCache;
    expect(cache.has('header:header-1:1')).toBe(true);
    expect(cache.has('header:header-1:2')).toBe(true);
    expect(superEditorInstances.length).toBe(2);
  });

  it('handles section type footer correctly', () => {
    const editor = {
      storage: {
        pagination: {
          sectionData: {
            headers: {},
            footers: {
              'footer-1': {
                data: { id: 'footer-doc' },
                reservedHeight: 100,
              },
            },
          },
        },
      },
    };

    expect(getSectionEntry(editor, 'footer', 'footer-1')).toEqual({
      data: { id: 'footer-doc' },
      reservedHeight: 100,
    });
  });

  it('disposes all cached editors when clearing cache', () => {
    const destroySpy1 = vi.fn();
    const destroySpy2 = vi.fn();

    const storage = {
      sectionData: {},
    };
    storage.headerFooterPreviewCache = new Map([
      [
        'header:test1',
        {
          editor: { destroy: destroySpy1 },
          container: document.createElement('div'),
          dataRef: {},
          reservedHeight: null,
        },
      ],
      [
        'footer:test2',
        {
          editor: { destroy: destroySpy2 },
          container: document.createElement('div'),
          dataRef: {},
          reservedHeight: null,
        },
      ],
    ]);

    disposeSectionPreviewCache(storage);

    expect(destroySpy1).toHaveBeenCalledTimes(1);
    expect(destroySpy2).toHaveBeenCalledTimes(1);
    expect(storage.headerFooterPreviewCache.size).toBe(0);
  });

  it('handles dispose when cache does not exist', () => {
    const storage = { sectionData: {} };
    expect(() => disposeSectionPreviewCache(storage)).not.toThrow();
  });

  it('handles dispose with null storage gracefully', () => {
    expect(() => disposeSectionPreviewCache(null)).not.toThrow();
    expect(() => disposeSectionPreviewCache(undefined)).not.toThrow();
  });

  it('removes spacer elements from preview clone', () => {
    const editor = {
      converter: {
        getDocumentDefaultStyles: () => ({ fontSizePt: 12, typeface: 'Arial', fontFamilyCss: 'Arial' }),
        pageStyles: {
          pageMargins: { left: 0.5, right: 0.5 },
          pageSize: { width: 8.5 },
        },
      },
      options: {
        role: 'doc',
        fonts: [],
        isHeadless: false,
        suppressDefaultDocxStyles: false,
      },
      storage: {
        pagination: {
          sectionData: {
            headers: {
              'header-1': {
                data: { id: 'doc-1' },
                reservedHeight: 180,
              },
            },
          },
        },
        image: { media: [] },
      },
      emit: vi.fn(),
    };

    const clone = getSectionPreviewClone(editor, 'header', 'header-1', { pageNumber: 1 });

    // Verify all spacer-related elements are removed
    expect(clone.querySelector('.page-leading-spacer')).toBeNull();
    expect(clone.querySelector('.page-trailing-spacer')).toBeNull();
    expect(clone.querySelector('[data-leading-spacer]')).toBeNull();
    expect(clone.querySelector('[data-trailing-spacer]')).toBeNull();
  });
});
