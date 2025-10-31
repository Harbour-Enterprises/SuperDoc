import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../helpers/section-preview.js', () => ({
  getSectionPreviewClone: vi.fn(() => {
    const node = document.createElement('div');
    node.textContent = 'preview';
    return node;
  }),
  getSectionEntry: vi.fn(() => ({ offsetHeight: 24 })),
}));

vi.mock('../helpers/page-bands.js', () => ({
  resolveSectionIdForPage: vi.fn((editor, pageNumber, sectionKey) => {
    return editor.converter?.[sectionKey]?.default || null;
  }),
  resolveSectionIdFromSummary: vi.fn(),
}));

const { getSectionPreviewClone } = await import('../helpers/section-preview.js');
const { resolveSectionIdFromSummary } = await import('../helpers/page-bands.js');
const { __pageBreakOverlayTestUtils } = await import('./index.js');
const { renderOverlayContent } = __pageBreakOverlayTestUtils;

const createOverlay = () => {
  const overlay = document.createElement('div');
  overlay.style.position = 'absolute';
  return overlay;
};

const createEditor = (overrides = {}) => ({
  storage: { pagination: { sectionData: {} } },
  converter: {
    headerIds: { default: 'defaultHeader' },
    footerIds: { default: 'defaultFooter' },
  },
  ...overrides,
});

describe('page break overlays', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('early returns', () => {
    it('does nothing when overlay is null', () => {
      renderOverlayContent({
        editor: createEditor(),
        overlay: null,
        type: 'footer',
        meta: { pageIndex: 0 },
        pageCount: 1,
        summary: {},
      });
      expect(getSectionPreviewClone).not.toHaveBeenCalled();
    });

    it('does nothing when overlay is undefined', () => {
      renderOverlayContent({
        editor: createEditor(),
        overlay: undefined,
        type: 'footer',
        meta: { pageIndex: 0 },
        pageCount: 1,
        summary: {},
      });
      expect(getSectionPreviewClone).not.toHaveBeenCalled();
    });

    it('does nothing when type is invalid', () => {
      const overlay = createOverlay();
      renderOverlayContent({
        editor: createEditor(),
        overlay,
        type: 'invalid',
        meta: { pageIndex: 0 },
        pageCount: 1,
        summary: {},
      });
      expect(getSectionPreviewClone).not.toHaveBeenCalled();
      expect(overlay.innerHTML).toBe('');
    });

    it('skips preview rendering for trailing spacers', () => {
      const overlay = createOverlay();
      renderOverlayContent({
        editor: createEditor(),
        overlay,
        type: 'footer',
        meta: { pageIndex: 0, isTrailing: true },
        pageCount: 1,
        summary: {},
      });
      expect(getSectionPreviewClone).not.toHaveBeenCalled();
      expect(overlay.innerHTML).toBe('');
    });

    it('skips preview rendering for leading spacers', () => {
      const overlay = createOverlay();
      renderOverlayContent({
        editor: createEditor(),
        overlay,
        type: 'footer',
        meta: { pageIndex: 0, isLeading: true },
        pageCount: 1,
        summary: {},
      });
      expect(getSectionPreviewClone).not.toHaveBeenCalled();
      expect(overlay.innerHTML).toBe('');
    });

    it('does nothing when sectionId cannot be resolved', () => {
      const overlay = createOverlay();
      resolveSectionIdFromSummary.mockReturnValueOnce(null);
      const editor = createEditor({ converter: {} });

      renderOverlayContent({
        editor,
        overlay,
        type: 'footer',
        meta: { pageIndex: 0 },
        pageCount: 1,
        summary: {},
      });
      expect(getSectionPreviewClone).not.toHaveBeenCalled();
      expect(overlay.innerHTML).toBe('');
    });

    it('does nothing when getSectionPreviewClone returns null', () => {
      const overlay = createOverlay();
      getSectionPreviewClone.mockReturnValueOnce(null);

      renderOverlayContent({
        editor: createEditor(),
        overlay,
        type: 'footer',
        meta: { pageIndex: 0 },
        pageCount: 1,
        summary: {
          variantLookup: { footer: { default: 'defaultFooter' } },
        },
      });
      expect(overlay.innerHTML).toBe('');
    });
  });

  describe('footer rendering', () => {
    it('renders preview content for standard footer overlays', () => {
      const overlay = createOverlay();
      renderOverlayContent({
        editor: createEditor(),
        overlay,
        type: 'footer',
        meta: { pageIndex: 0 },
        pageCount: 1,
        summary: {
          variantLookup: { footer: { default: 'defaultFooter' } },
          sectionMetricsById: new Map([['defaultFooter', { effectiveHeightPx: 48 }]]),
        },
      });
      expect(getSectionPreviewClone).toHaveBeenCalledWith(
        expect.any(Object),
        'footer',
        'defaultFooter',
        expect.objectContaining({ pageNumber: 1 }),
      );
      expect(overlay.innerHTML).not.toBe('');
    });

    it('sets correct positioning and data attributes for footer', () => {
      const overlay = createOverlay();
      renderOverlayContent({
        editor: createEditor(),
        overlay,
        type: 'footer',
        meta: { pageIndex: 0 },
        pageCount: 1,
        summary: {
          variantLookup: { footer: { default: 'defaultFooter' } },
        },
      });

      const clone = overlay.firstChild;
      expect(clone.style.position).toBe('absolute');
      expect(clone.style.left).toBe('0px');
      expect(clone.style.right).toBe('0px');
      expect(clone.style.bottom).toBe('0px');
      expect(clone.dataset.paginationSection).toBe('footer');
      expect(clone.dataset.paginationSectionRole).toBe('overlay');
    });
  });

  describe('header rendering', () => {
    it('renders preview content for standard header overlays', () => {
      const overlay = createOverlay();
      renderOverlayContent({
        editor: createEditor(),
        overlay,
        type: 'header',
        meta: { pageIndex: 0 },
        pageCount: 1,
        summary: {
          variantLookup: { header: { default: 'defaultHeader' } },
          sectionMetricsById: new Map([['defaultHeader', { effectiveHeightPx: 48 }]]),
        },
      });
      expect(getSectionPreviewClone).toHaveBeenCalledWith(
        expect.any(Object),
        'header',
        'defaultHeader',
        expect.objectContaining({ pageNumber: 1 }),
      );
      expect(overlay.innerHTML).not.toBe('');
    });

    it('sets correct positioning and data attributes for header', () => {
      const overlay = createOverlay();
      renderOverlayContent({
        editor: createEditor(),
        overlay,
        type: 'header',
        meta: { pageIndex: 0 },
        pageCount: 1,
        summary: {
          variantLookup: { header: { default: 'defaultHeader' } },
        },
      });

      const clone = overlay.firstChild;
      expect(clone.style.position).toBe('absolute');
      expect(clone.style.left).toBe('0px');
      expect(clone.style.right).toBe('0px');
      expect(clone.style.top).toBe('0px');
      expect(clone.style.bottom).not.toBe('0px');
      expect(clone.dataset.paginationSection).toBe('header');
      expect(clone.dataset.paginationSectionRole).toBe('overlay');
    });
  });

  describe('section resolution', () => {
    it('uses sectionId from summary when available', () => {
      const overlay = createOverlay();
      resolveSectionIdFromSummary.mockReturnValueOnce('summaryFooter');

      renderOverlayContent({
        editor: createEditor(),
        overlay,
        type: 'footer',
        meta: { pageIndex: 0 },
        pageCount: 1,
        summary: {
          variantLookup: { footer: { default: 'summaryFooter' } },
        },
      });

      expect(getSectionPreviewClone).toHaveBeenCalledWith(
        expect.any(Object),
        'footer',
        'summaryFooter',
        expect.any(Object),
      );
    });

    it('falls back to editor.converter when summary returns null', () => {
      const overlay = createOverlay();
      resolveSectionIdFromSummary.mockReturnValueOnce(null);

      renderOverlayContent({
        editor: createEditor(),
        overlay,
        type: 'footer',
        meta: { pageIndex: 0 },
        pageCount: 1,
        summary: {},
      });

      expect(getSectionPreviewClone).toHaveBeenCalledWith(
        expect.any(Object),
        'footer',
        'defaultFooter',
        expect.any(Object),
      );
    });
  });

  describe('page calculations', () => {
    it('handles missing meta by defaulting to pageIndex 0', () => {
      const overlay = createOverlay();
      renderOverlayContent({
        editor: createEditor(),
        overlay,
        type: 'footer',
        meta: null,
        pageCount: 1,
        summary: {
          variantLookup: { footer: { default: 'defaultFooter' } },
        },
      });

      expect(getSectionPreviewClone).toHaveBeenCalledWith(
        expect.any(Object),
        'footer',
        'defaultFooter',
        expect.objectContaining({ pageNumber: 1 }),
      );
    });

    it('calculates page number correctly for middle pages', () => {
      const overlay = createOverlay();
      renderOverlayContent({
        editor: createEditor(),
        overlay,
        type: 'footer',
        meta: { pageIndex: 5 },
        pageCount: 10,
        summary: {
          variantLookup: { footer: { default: 'defaultFooter' } },
        },
      });

      expect(getSectionPreviewClone).toHaveBeenCalledWith(
        expect.any(Object),
        'footer',
        'defaultFooter',
        expect.objectContaining({ pageNumber: 6 }),
      );
    });

    it('handles invalid pageCount by deriving from pageIndex', () => {
      const overlay = createOverlay();
      renderOverlayContent({
        editor: createEditor(),
        overlay,
        type: 'footer',
        meta: { pageIndex: 5 },
        pageCount: 0,
        summary: {
          variantLookup: { footer: { default: 'defaultFooter' } },
        },
      });

      expect(getSectionPreviewClone).toHaveBeenCalledWith(
        expect.any(Object),
        'footer',
        'defaultFooter',
        expect.objectContaining({ pageNumber: 6 }),
      );
    });

    it('handles non-integer pageCount', () => {
      const overlay = createOverlay();
      renderOverlayContent({
        editor: createEditor(),
        overlay,
        type: 'footer',
        meta: { pageIndex: 2 },
        pageCount: 'invalid',
        summary: {
          variantLookup: { footer: { default: 'defaultFooter' } },
        },
      });

      expect(getSectionPreviewClone).toHaveBeenCalledWith(
        expect.any(Object),
        'footer',
        'defaultFooter',
        expect.objectContaining({ pageNumber: 3 }),
      );
    });
  });

  describe('overlay clearing', () => {
    it('clears existing children before rendering new content', () => {
      const overlay = createOverlay();
      const existingChild = document.createElement('div');
      existingChild.textContent = 'old content';
      overlay.appendChild(existingChild);

      expect(overlay.children.length).toBe(1);

      renderOverlayContent({
        editor: createEditor(),
        overlay,
        type: 'footer',
        meta: { pageIndex: 0 },
        pageCount: 1,
        summary: {
          variantLookup: { footer: { default: 'defaultFooter' } },
        },
      });

      expect(overlay.children.length).toBe(1);
      expect(overlay.firstChild.textContent).toBe('preview');
    });

    it('clears overlay even when skipping preview', () => {
      const overlay = createOverlay();
      const existingChild = document.createElement('div');
      overlay.appendChild(existingChild);

      renderOverlayContent({
        editor: createEditor(),
        overlay,
        type: 'footer',
        meta: { pageIndex: 0, isTrailing: true },
        pageCount: 1,
        summary: {},
      });

      expect(overlay.children.length).toBe(0);
    });
  });
});
