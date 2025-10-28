import { describe, it, expect } from 'vitest';
import { applyDefaultSectionStyles, computeSectionMetrics, getSectionHeight } from './section-style.js';

describe('section-style', () => {
  describe('applyDefaultSectionStyles', () => {
    it('applies default font family, size, and line height when defaults exist', () => {
      const editor = {
        converter: {
          getDocumentDefaultStyles: () => ({
            typeface: 'Inter',
            fontSizePt: 12,
          }),
        },
      };
      const element = document.createElement('div');

      applyDefaultSectionStyles(editor, element);

      expect(element.style.fontFamily).toBe('Inter');
      expect(element.style.fontSize).toBe('16px');
      expect(element.style.lineHeight).toBe('19px');
    });

    it('handles missing editor defaults without throwing', () => {
      const element = document.createElement('div');

      expect(() => applyDefaultSectionStyles({ converter: {} }, element)).not.toThrow();
      expect(element.style.fontFamily).toBe('');
      expect(element.style.fontSize).toBe('');
      expect(element.style.lineHeight).toBe('');
    });

    it('returns early when editor or element is missing', () => {
      const element = document.createElement('div');

      expect(() => applyDefaultSectionStyles(null, element)).not.toThrow();
      expect(() => applyDefaultSectionStyles({ converter: {} }, null)).not.toThrow();
    });
  });

  describe('computeSectionMetrics', () => {
    it('derives spacing and height metrics from editor data', () => {
      const headerContainer = document.createElement('div');
      Object.defineProperty(headerContainer, 'offsetHeight', {
        configurable: true,
        value: 42,
      });

      const editor = {
        converter: {
          getDocumentDefaultStyles: () => ({
            fontSizePt: 10,
          }),
          pageStyles: {
            pageMargins: {
              top: 1,
              bottom: 1,
              header: 0.2,
              footer: 0.5,
            },
          },
        },
        storage: {
          pagination: {
            sectionData: {
              headers: {
                alpha: { height: -5, sectionContainer: headerContainer },
                bravo: { height: 30 },
              },
              footers: {
                omega: { height: null },
              },
            },
          },
        },
      };

      const metrics = computeSectionMetrics(editor);

      expect(metrics.marginTopPx).toBe(96);
      expect(metrics.marginBottomPx).toBe(96);
      expect(metrics.headerOffsetPx).toBeCloseTo(19.2, 4);
      expect(metrics.footerOffsetPx).toBeCloseTo(48, 4);
      expect(metrics.headerSpacingPx).toBe(96);
      expect(metrics.footerSpacingPx).toBe(96);

      expect(metrics.headerHeights).toBeInstanceOf(Map);
      expect(metrics.headerHeights.get('alpha')).toBe(42);
      expect(metrics.headerHeights.get('bravo')).toBe(30);
      expect(metrics.footerHeights.get('omega')).toBeCloseTo(16, 4);
    });
  });

  describe('getSectionHeight', () => {
    it('reads heights from maps produced by computeSectionMetrics', () => {
      const metrics = computeSectionMetrics({
        converter: {
          getDocumentDefaultStyles: () => ({
            fontSizePt: 12,
          }),
          pageStyles: {
            pageMargins: {},
          },
        },
        storage: {
          pagination: {
            sectionData: {
              headers: {
                alpha: { height: 24 },
              },
              footers: {},
            },
          },
        },
      });

      expect(getSectionHeight(metrics, 'header', 'alpha')).toBe(24);
      expect(getSectionHeight(metrics, 'footer', 'missing')).toBeNull();
    });

    it('supports plain object metrics', () => {
      const metrics = {
        footerHeights: { foo: 99 },
      };

      expect(getSectionHeight(metrics, 'footer', 'foo')).toBe(99);
      expect(getSectionHeight(null, 'footer', 'foo')).toBeNull();
    });
  });
});
