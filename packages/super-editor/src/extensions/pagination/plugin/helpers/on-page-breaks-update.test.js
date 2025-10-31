import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';

vi.mock(
  '../index.js',
  () => ({
    PaginationPluginKey: 'pagination-key',
  }),
  { virtual: true },
);

vi.mock('../../section-data.js', () => ({
  syncSectionDataFromSummary: vi.fn(),
}));

let onPageBreaksUpdate;
let syncSectionDataFromSummary;

beforeAll(async () => {
  ({ syncSectionDataFromSummary } = await import('../../section-data.js'));
  ({ onPageBreaksUpdate } = await import('./on-page-breaks-update.js'));
});

describe('onPageBreaksUpdate', () => {
  let consoleSpy;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    syncSectionDataFromSummary.mockClear();
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
    const summary = { marker: 'summary' };
    const repository = {};
    const engine = {
      getHeaderFooterSummary: vi.fn(() => summary),
      refreshHeaderFooterMeasurements: vi.fn(),
    };

    const editor = {
      storage: { pagination: { repository, engine } },
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
            footer: {
              reservedHeightPx: 38,
              heightPx: 34,
              metrics: { effectiveHeightPx: 38 },
            },
          },
          spacingAfterPx: 100,
          spacingSegments: [10, 14],
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
            header: {
              reservedHeightPx: 42,
              heightPx: 40,
              metrics: { effectiveHeightPx: 42 },
            },
          },
          pageTopOffsetPx: 820,
          pageGapPx: 12,
        },
      ],
      fieldSegments: [{ id: 'segment-1' }],
      headerFooterSummary: summary,
    };

    onPageBreaksUpdate(editor, layout);

    expect(editor.storage.pagination.layoutPages).toHaveLength(2);
    expect(editor.storage.pagination.layoutPages[1].break.top).toBeUndefined();
    expect(editor.storage.pagination.fieldSegments).toEqual([{ id: 'segment-1' }]);

    expect(dispatch).toHaveBeenCalledWith(tr);
    expect(tr.meta).toEqual({
      key: 'pagination-key',
      value: {
        layout: expect.objectContaining({
          pages: expect.any(Array),
          fieldSegments: expect.any(Array),
        }),
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
            spacingSegments: [10, 14],
          }),
        ],
      },
    });
    expect(editor.storage.pagination.headerFooterSummary).toBe(summary);
    expect(syncSectionDataFromSummary).toHaveBeenCalledWith(
      editor,
      editor.storage.pagination,
      expect.objectContaining({
        summary,
        repository,
        layoutPages: expect.any(Array),
      }),
    );
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
    const engine = {
      getHeaderFooterSummary: vi.fn(() => ({})),
      refreshHeaderFooterMeasurements: vi.fn(),
    };
    const editor = {
      storage: { pagination: { repository: {}, engine } },
      view: {
        state: { tr },
        dispatch,
      },
    };

    const layout = { pages: [] };
    expect(() => onPageBreaksUpdate(editor, layout)).toThrow(/should not modify the document/);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('handles empty pages array correctly', () => {
    const dispatch = vi.fn();
    const tr = {
      meta: null,
      docChanged: false,
      setMeta(key, value) {
        this.meta = { key, value };
        return this;
      },
    };

    const engine = {
      getHeaderFooterSummary: vi.fn(() => null),
    };

    const editor = {
      storage: { pagination: { repository: {}, engine } },
      view: {
        state: { tr },
        dispatch,
      },
    };

    const layout = { pages: [] };
    onPageBreaksUpdate(editor, layout);

    expect(editor.storage.pagination.layoutPages).toEqual([]);
    expect(dispatch).toHaveBeenCalledWith(tr);
    expect(tr.meta.value.pageBreaks).toEqual([]);
  });

  it('handles missing engine.getHeaderFooterSummary gracefully', () => {
    const dispatch = vi.fn();
    const tr = {
      meta: null,
      docChanged: false,
      setMeta(key, value) {
        this.meta = { key, value };
        return this;
      },
    };

    const engine = {};

    const editor = {
      storage: { pagination: { repository: {}, engine } },
      view: {
        state: { tr },
        dispatch,
      },
    };

    const layout = { pages: [] };
    onPageBreaksUpdate(editor, layout);

    expect(editor.storage.pagination.headerFooterSummary).toBeNull();
    expect(dispatch).toHaveBeenCalled();
  });

  it('emits pagination:update event', () => {
    const dispatch = vi.fn();
    const tr = {
      meta: null,
      docChanged: false,
      setMeta(key, value) {
        this.meta = { key, value };
        return this;
      },
    };

    const emitSpy = vi.fn();
    const engine = {
      getHeaderFooterSummary: vi.fn(() => null),
    };

    const editor = {
      storage: { pagination: { repository: {}, engine } },
      view: {
        state: { tr },
        dispatch,
      },
      emit: emitSpy,
    };

    const layout = {
      pages: [
        {
          pageIndex: 0,
          break: { top: 100, pos: 10 },
        },
      ],
    };

    onPageBreaksUpdate(editor, layout);

    expect(emitSpy).toHaveBeenCalledWith(
      'pagination:update',
      expect.objectContaining({
        layout: expect.any(Object),
        pages: expect.any(Array),
        pageBreaks: expect.any(Array),
      }),
    );
  });

  it('calculates placeholder heights correctly with all header/footer areas', () => {
    const dispatch = vi.fn();
    const tr = {
      meta: null,
      docChanged: false,
      setMeta(key, value) {
        this.meta = { key, value };
        return this;
      },
    };

    const engine = {
      getHeaderFooterSummary: vi.fn(() => null),
    };

    const editor = {
      storage: { pagination: { repository: {}, engine } },
      view: {
        state: { tr },
        dispatch,
      },
    };

    const layout = {
      pages: [
        {
          pageIndex: 0,
          break: { top: 100, pos: 10 },
          metrics: { marginTopPx: 50, pageGapPx: 20 },
          headerFooterAreas: {
            header: { reservedHeightPx: 60 },
            footer: { reservedHeightPx: 40 },
          },
          spacingAfterPx: 120,
        },
        {
          pageIndex: 1,
          break: { top: 200, pos: 20 },
          headerFooterAreas: {
            header: { reservedHeightPx: 60 },
          },
        },
      ],
    };

    onPageBreaksUpdate(editor, layout);

    const pageBreak = tr.meta.value.pageBreaks[0];
    expect(pageBreak.placeholder).toEqual({
      headerHeightPx: 60,
      footerHeightPx: 40,
      gapHeightPx: 20,
      totalHeightPx: 120,
    });
  });

  it('handles missing headerFooterAreas gracefully', () => {
    const dispatch = vi.fn();
    const tr = {
      meta: null,
      docChanged: false,
      setMeta(key, value) {
        this.meta = { key, value };
        return this;
      },
    };

    const engine = {
      getHeaderFooterSummary: vi.fn(() => null),
    };

    const editor = {
      storage: { pagination: { repository: {}, engine } },
      view: {
        state: { tr },
        dispatch,
      },
    };

    const layout = {
      pages: [
        {
          pageIndex: 0,
          break: { top: 100, pos: 10 },
          metrics: { pageGapPx: 10 },
          spacingAfterPx: 50,
        },
        {
          pageIndex: 1,
          break: { top: 200, pos: 20 },
        },
      ],
    };

    onPageBreaksUpdate(editor, layout);

    // First page placeholder (needs next page for placeholder calculation)
    const pageBreak = tr.meta.value.pageBreaks[0];
    expect(pageBreak.placeholder).toEqual({
      headerHeightPx: 0,
      footerHeightPx: 0,
      gapHeightPx: 50,
      totalHeightPx: 50,
    });
  });
});
