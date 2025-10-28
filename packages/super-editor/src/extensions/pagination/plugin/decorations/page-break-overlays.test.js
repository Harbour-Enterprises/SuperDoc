import { describe, it, expect, vi } from 'vitest';

vi.mock('../helpers/section-preview.js', () => ({
  getSectionPreviewClone: vi.fn(() => {
    const node = document.createElement('div');
    node.textContent = 'preview';
    return node;
  }),
  getSectionEntry: vi.fn(() => ({ offsetHeight: 24 })),
}));

const { getSectionPreviewClone } = await import('../helpers/section-preview.js');
const { __pageBreakOverlayTestUtils } = await import('./index.js');
const { renderOverlayContent } = __pageBreakOverlayTestUtils;

const createOverlay = () => {
  const overlay = document.createElement('div');
  overlay.style.position = 'absolute';
  return overlay;
};

describe('page break overlays', () => {
  it('skips preview rendering for leading and trailing spacers', () => {
    const overlay = createOverlay();
    renderOverlayContent({
      editor: { storage: { pagination: { sectionData: {} } } },
      overlay,
      type: 'footer',
      meta: { pageIndex: 0, isTrailing: true },
      pageCount: 1,
      summary: {},
    });
    expect(getSectionPreviewClone).not.toHaveBeenCalled();
    expect(overlay.innerHTML).toBe('');
  });

  it('renders preview content for standard break overlays', () => {
    const overlay = createOverlay();
    renderOverlayContent({
      editor: { storage: { pagination: { sectionData: {} } } },
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
});
