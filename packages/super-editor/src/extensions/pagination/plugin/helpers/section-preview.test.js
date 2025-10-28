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
});
