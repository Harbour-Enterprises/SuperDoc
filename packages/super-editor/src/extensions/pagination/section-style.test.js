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

    it('applies only typeface when fontSizePt is missing', () => {
      const editor = {
        converter: {
          getDocumentDefaultStyles: () => ({
            typeface: 'Arial',
          }),
        },
      };
      const element = document.createElement('div');

      applyDefaultSectionStyles(editor, element);

      expect(element.style.fontFamily).toBe('Arial');
      expect(element.style.fontSize).toBe('');
      expect(element.style.lineHeight).toBe('');
    });

    it('applies only font size when typeface is missing', () => {
      const editor = {
        converter: {
          getDocumentDefaultStyles: () => ({
            fontSizePt: 10,
          }),
        },
      };
      const element = document.createElement('div');

      applyDefaultSectionStyles(editor, element);

      expect(element.style.fontFamily).toBe('');
      expect(parseFloat(element.style.fontSize)).toBeCloseTo(13.33, 1);
      expect(element.style.lineHeight).toBe('16px');
    });

    it('ignores invalid fontSizePt values', () => {
      const testCases = [NaN, Infinity, -Infinity, 'not a number', null, undefined];

      testCases.forEach((invalidValue) => {
        const editor = {
          converter: {
            getDocumentDefaultStyles: () => ({
              typeface: 'Inter',
              fontSizePt: invalidValue,
            }),
          },
        };
        const element = document.createElement('div');

        applyDefaultSectionStyles(editor, element);

        expect(element.style.fontFamily).toBe('Inter');
        expect(element.style.fontSize).toBe('');
        expect(element.style.lineHeight).toBe('');
      });
    });

    it('handles zero fontSizePt', () => {
      const editor = {
        converter: {
          getDocumentDefaultStyles: () => ({
            fontSizePt: 0,
          }),
        },
      };
      const element = document.createElement('div');

      applyDefaultSectionStyles(editor, element);

      expect(element.style.fontSize).toBe('0px');
      expect(element.style.lineHeight).toBe('0px');
    });

    it('handles errors from getDocumentDefaultStyles', () => {
      const editor = {
        converter: {
          getDocumentDefaultStyles: () => {
            throw new Error('Test error');
          },
        },
      };
      const element = document.createElement('div');

      expect(() => applyDefaultSectionStyles(editor, element)).not.toThrow();
      expect(element.style.fontFamily).toBe('');
    });

    it('handles missing converter', () => {
      const editor = {};
      const element = document.createElement('div');

      expect(() => applyDefaultSectionStyles(editor, element)).not.toThrow();
      expect(element.style.fontFamily).toBe('');
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

    it('uses defaults when pageStyles is missing', () => {
      const editor = {
        converter: {},
        storage: {
          pagination: {
            sectionData: {
              headers: {},
              footers: {},
            },
          },
        },
      };

      const metrics = computeSectionMetrics(editor);

      expect(metrics.marginTopPx).toBe(96);
      expect(metrics.marginBottomPx).toBe(96);
      expect(metrics.headerOffsetPx).toBe(0);
      expect(metrics.footerOffsetPx).toBe(0);
    });

    it('uses defaults when pageMargins is missing', () => {
      const editor = {
        converter: {
          pageStyles: {},
        },
        storage: {
          pagination: {
            sectionData: {
              headers: {},
              footers: {},
            },
          },
        },
      };

      const metrics = computeSectionMetrics(editor);

      expect(metrics.marginTopPx).toBe(96);
      expect(metrics.marginBottomPx).toBe(96);
      expect(metrics.headerOffsetPx).toBe(0);
      expect(metrics.footerOffsetPx).toBe(0);
    });

    it('handles invalid margin values', () => {
      const editor = {
        converter: {
          pageStyles: {
            pageMargins: {
              top: NaN,
              bottom: Infinity,
              header: 'not a number',
              footer: null,
            },
          },
        },
        storage: {
          pagination: {
            sectionData: {
              headers: {},
              footers: {},
            },
          },
        },
      };

      const metrics = computeSectionMetrics(editor);

      expect(metrics.marginTopPx).toBe(96);
      expect(metrics.marginBottomPx).toBe(96);
      expect(metrics.headerOffsetPx).toBe(0);
      expect(metrics.footerOffsetPx).toBe(0);
    });

    it('handles negative margin values', () => {
      const editor = {
        converter: {
          pageStyles: {
            pageMargins: {
              top: -1,
              bottom: -1,
              header: -0.5,
              footer: -0.2,
            },
          },
        },
        storage: {
          pagination: {
            sectionData: {
              headers: {},
              footers: {},
            },
          },
        },
      };

      const metrics = computeSectionMetrics(editor);

      expect(metrics.marginTopPx).toBe(-96);
      expect(metrics.marginBottomPx).toBe(-96);
      expect(metrics.headerOffsetPx).toBe(0);
      expect(metrics.footerOffsetPx).toBe(0);
    });

    it('uses margin when header height + offset is smaller', () => {
      const editor = {
        converter: {
          getDocumentDefaultStyles: () => ({
            fontSizePt: 8,
          }),
          pageStyles: {
            pageMargins: {
              top: 2,
              bottom: 2,
              header: 0.1,
              footer: 0.1,
            },
          },
        },
        storage: {
          pagination: {
            sectionData: {
              headers: {
                small: { height: 10 },
              },
              footers: {
                tiny: { height: 5 },
              },
            },
          },
        },
      };

      const metrics = computeSectionMetrics(editor);

      expect(metrics.marginTopPx).toBe(192);
      expect(metrics.marginBottomPx).toBe(192);
      expect(metrics.headerSpacingPx).toBe(192);
      expect(metrics.footerSpacingPx).toBe(192);
    });

    it('uses header/footer spacing when larger than margin', () => {
      const editor = {
        converter: {
          pageStyles: {
            pageMargins: {
              top: 0.5,
              bottom: 0.5,
              header: 0.1,
              footer: 0.1,
            },
          },
        },
        storage: {
          pagination: {
            sectionData: {
              headers: {
                large: { height: 100 },
              },
              footers: {
                huge: { height: 150 },
              },
            },
          },
        },
      };

      const metrics = computeSectionMetrics(editor);

      expect(metrics.marginTopPx).toBe(48);
      expect(metrics.marginBottomPx).toBe(48);
      expect(metrics.headerSpacingPx).toBeCloseTo(109.6, 1);
      expect(metrics.footerSpacingPx).toBeCloseTo(159.6, 1);
    });

    it('handles empty headers and footers objects', () => {
      const editor = {
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
              headers: {},
              footers: {},
            },
          },
        },
      };

      const metrics = computeSectionMetrics(editor);

      expect(metrics.headerHeights).toBeInstanceOf(Map);
      expect(metrics.footerHeights).toBeInstanceOf(Map);
      expect(metrics.headerHeights.size).toBe(0);
      expect(metrics.footerHeights.size).toBe(0);
      expect(metrics.headerSpacingPx).toBe(96);
      expect(metrics.footerSpacingPx).toBe(96);
    });

    it('handles missing pagination storage', () => {
      const editor = {
        converter: {
          pageStyles: {
            pageMargins: {
              top: 1,
              bottom: 1,
            },
          },
        },
        storage: {},
      };

      const metrics = computeSectionMetrics(editor);

      expect(metrics.headerHeights).toBeInstanceOf(Map);
      expect(metrics.footerHeights).toBeInstanceOf(Map);
      expect(metrics.headerHeights.size).toBe(0);
      expect(metrics.footerHeights.size).toBe(0);
    });

    it('handles completely missing storage', () => {
      const editor = {
        converter: {
          pageStyles: {
            pageMargins: {
              top: 1,
              bottom: 1,
            },
          },
        },
      };

      const metrics = computeSectionMetrics(editor);

      expect(metrics.headerHeights).toBeInstanceOf(Map);
      expect(metrics.footerHeights).toBeInstanceOf(Map);
    });

    it('uses fallback when section container throws error', () => {
      const editor = {
        converter: {
          getDocumentDefaultStyles: () => ({
            fontSizePt: 10,
          }),
        },
        storage: {
          pagination: {
            sectionData: {
              headers: {
                broken: {
                  height: -1,
                  get sectionContainer() {
                    throw new Error('Access error');
                  },
                },
              },
              footers: {},
            },
          },
        },
      };

      const metrics = computeSectionMetrics(editor);

      expect(metrics.headerHeights.get('broken')).toBeCloseTo(16, 4);
    });

    it('handles multiple sections with varying heights', () => {
      const container1 = document.createElement('div');
      Object.defineProperty(container1, 'offsetHeight', {
        configurable: true,
        value: 50,
      });

      const container2 = document.createElement('div');
      Object.defineProperty(container2, 'offsetHeight', {
        configurable: true,
        value: 75,
      });

      const editor = {
        converter: {
          pageStyles: {
            pageMargins: {
              top: 0.5,
              bottom: 0.5,
              header: 0.2,
              footer: 0.3,
            },
          },
        },
        storage: {
          pagination: {
            sectionData: {
              headers: {
                first: { height: 20 },
                second: { height: 60 },
                third: { height: 40 },
              },
              footers: {
                footerA: { height: -1, sectionContainer: container1 },
                footerB: { height: NaN, sectionContainer: container2 },
              },
            },
          },
        },
      };

      const metrics = computeSectionMetrics(editor);

      expect(metrics.headerHeights.get('first')).toBe(20);
      expect(metrics.headerHeights.get('second')).toBe(60);
      expect(metrics.headerHeights.get('third')).toBe(40);
      expect(metrics.footerHeights.get('footerA')).toBe(50);
      expect(metrics.footerHeights.get('footerB')).toBe(75);
      expect(metrics.headerSpacingPx).toBeCloseTo(79.2, 1);
      expect(metrics.footerSpacingPx).toBeCloseTo(103.8, 1);
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

    it('returns null for missing metrics', () => {
      expect(getSectionHeight(null, 'header', 'any')).toBeNull();
      expect(getSectionHeight(undefined, 'header', 'any')).toBeNull();
    });

    it('returns null when height map is missing', () => {
      const metrics = {
        marginTopPx: 96,
      };

      expect(getSectionHeight(metrics, 'header', 'any')).toBeNull();
      expect(getSectionHeight(metrics, 'footer', 'any')).toBeNull();
    });

    it('returns null for missing section in Map', () => {
      const metrics = {
        headerHeights: new Map([['exists', 42]]),
        footerHeights: new Map(),
      };

      expect(getSectionHeight(metrics, 'header', 'missing')).toBeNull();
      expect(getSectionHeight(metrics, 'footer', 'missing')).toBeNull();
    });

    it('returns null for missing section in plain object', () => {
      const metrics = {
        headerHeights: { exists: 42 },
        footerHeights: {},
      };

      expect(getSectionHeight(metrics, 'header', 'missing')).toBeNull();
      expect(getSectionHeight(metrics, 'footer', 'missing')).toBeNull();
    });

    it('handles empty Map', () => {
      const metrics = {
        headerHeights: new Map(),
        footerHeights: new Map(),
      };

      expect(getSectionHeight(metrics, 'header', 'any')).toBeNull();
      expect(getSectionHeight(metrics, 'footer', 'any')).toBeNull();
    });

    it('handles empty plain object', () => {
      const metrics = {
        headerHeights: {},
        footerHeights: {},
      };

      expect(getSectionHeight(metrics, 'header', 'any')).toBeNull();
      expect(getSectionHeight(metrics, 'footer', 'any')).toBeNull();
    });

    it('reads from headerHeights for header type', () => {
      const metrics = computeSectionMetrics({
        converter: {
          pageStyles: {
            pageMargins: {},
          },
        },
        storage: {
          pagination: {
            sectionData: {
              headers: {
                testHeader: { height: 100 },
              },
              footers: {
                testFooter: { height: 50 },
              },
            },
          },
        },
      });

      expect(getSectionHeight(metrics, 'header', 'testHeader')).toBe(100);
      expect(getSectionHeight(metrics, 'header', 'testFooter')).toBeNull();
    });

    it('reads from footerHeights for footer type', () => {
      const metrics = computeSectionMetrics({
        converter: {
          pageStyles: {
            pageMargins: {},
          },
        },
        storage: {
          pagination: {
            sectionData: {
              headers: {
                testHeader: { height: 100 },
              },
              footers: {
                testFooter: { height: 50 },
              },
            },
          },
        },
      });

      expect(getSectionHeight(metrics, 'footer', 'testFooter')).toBe(50);
      expect(getSectionHeight(metrics, 'footer', 'testHeader')).toBeNull();
    });

    it('handles zero height values', () => {
      const metrics = {
        headerHeights: new Map([['zero', 0]]),
        footerHeights: { alsoZero: 0 },
      };

      expect(getSectionHeight(metrics, 'header', 'zero')).toBe(0);
      expect(getSectionHeight(metrics, 'footer', 'alsoZero')).toBe(0);
    });

    it('handles mixed Map and plain object metrics', () => {
      const metrics = {
        headerHeights: new Map([['mapHeader', 30]]),
        footerHeights: { plainFooter: 40 },
      };

      expect(getSectionHeight(metrics, 'header', 'mapHeader')).toBe(30);
      expect(getSectionHeight(metrics, 'footer', 'plainFooter')).toBe(40);
    });
  });
});
