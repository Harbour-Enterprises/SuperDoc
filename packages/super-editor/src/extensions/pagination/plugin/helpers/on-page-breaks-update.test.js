import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';

vi.mock(
  '../index.js',
  () => ({
    PaginationPluginKey: 'pagination-key',
  }),
  { virtual: true },
);

let onPageBreaksUpdate;

beforeAll(async () => {
  ({ onPageBreaksUpdate } = await import('./on-page-breaks-update.js'));
});

describe('onPageBreaksUpdate', () => {
  let consoleSpy;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('logs and exits when editor view is missing', () => {
    const editor = { storage: { pagination: {} } };
    onPageBreaksUpdate(editor, { pages: [] });
    expect(consoleSpy).toHaveBeenCalled();
    expect(editor.storage.pagination.layoutPages).toBeUndefined();
  });

  it('stores layout payload and dispatches sanitized page break metadata', () => {
    const dispatch = vi.fn();
    const tr = {
      meta: null,
      docChanged: false,
      setMeta(key, value) {
        this.meta = { key, value };
        return this;
      },
    };
    const editor = {
      storage: { pagination: {} },
      view: {
        state: { tr },
        dispatch,
      },
    };

    const layout = {
      pages: [
        {
          pageIndex: 0,
          break: { top: 100, startOffsetPx: 0, pos: 10 },
          metrics: {
            pageHeightPx: 800,
            pageWidthPx: 612,
            marginTopPx: 40,
            marginBottomPx: 36,
            pageGapPx: 14,
          },
          pageTopOffsetPx: 0,
          pageGapPx: 12,
          headerFooterAreas: {
            footer: { heightPx: 34, metrics: { effectiveHeightPx: 38 } },
          },
        },
        {
          pageIndex: 1,
          break: { top: 920, startOffsetPx: 900, pos: 20, totalHeightPx: 48 },
          metrics: {
            pageHeightPx: 800,
            pageWidthPx: 612,
            marginTopPx: 42,
            marginBottomPx: 30,
          },
          headerFooterAreas: {
            header: { heightPx: 40, metrics: { effectiveHeightPx: 42 } },
          },
          pageTopOffsetPx: 820,
          pageGapPx: 12,
        },
      ],
      fieldSegments: [{ id: 'segment-1' }],
    };

    onPageBreaksUpdate(editor, layout);

    expect(editor.storage.pagination.layoutPages).toHaveLength(2);
    expect(editor.storage.pagination.layoutPages[1].break.top).toBeUndefined();
    expect(editor.storage.pagination.fieldSegments).toEqual([{ id: 'segment-1' }]);

    expect(dispatch).toHaveBeenCalledWith(tr);
    expect(tr.meta).toEqual({
      key: 'pagination-key',
      value: {
        pageBreaks: [
          expect.objectContaining({
            pageIndex: 0,
            break: expect.objectContaining({
              pos: 10,
              startOffsetPx: 0,
              top: 100,
            }),
            placeholder: {
              footerHeightPx: 38,
              headerHeightPx: 42,
              gapHeightPx: 20,
              totalHeightPx: 100,
            },
            metrics: expect.objectContaining({
              pageHeightPx: 800,
              pageWidthPx: 612,
              marginTopPx: 40,
              marginBottomPx: 36,
              pageGapPx: 12,
              pageTopOffsetPx: 0,
            }),
            headerFooterAreas: layout.pages[0].headerFooterAreas,
          }),
        ],
      },
    });
  });

  it('throws when the meta transaction mutates the document', () => {
    const dispatch = vi.fn();
    const tr = {
      meta: null,
      docChanged: true,
      setMeta() {
        return this;
      },
    };
    const editor = {
      storage: { pagination: {} },
      view: {
        state: { tr },
        dispatch,
      },
    };

    const layout = { pages: [] };
    expect(() => onPageBreaksUpdate(editor, layout)).toThrow(/should not modify the document/);
    expect(dispatch).not.toHaveBeenCalled();
  });
});
