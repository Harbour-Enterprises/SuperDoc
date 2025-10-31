import { describe, it, expect, beforeEach } from 'vitest';
import { syncSectionDataFromSummary } from './section-data.js';

describe('section-data', () => {
  let mockEditor;
  let mockStorage;

  beforeEach(() => {
    mockEditor = {};
    mockStorage = {};
  });

  describe('syncSectionDataFromSummary', () => {
    describe('validation and early returns', () => {
      it('should return null when editor is missing', () => {
        const result = syncSectionDataFromSummary(null, mockStorage, {});
        expect(result).toBeNull();
      });

      it('should return null when storage is missing', () => {
        const result = syncSectionDataFromSummary(mockEditor, null, {});
        expect(result).toBeNull();
      });

      it('should return null when summary is missing', () => {
        const result = syncSectionDataFromSummary(mockEditor, mockStorage, {});
        expect(result).toBeNull();
      });

      it('should return null when repository is missing', () => {
        const result = syncSectionDataFromSummary(mockEditor, mockStorage, { summary: {} });
        expect(result).toBeNull();
      });
    });

    describe('basic synchronization', () => {
      it('should create empty headers and footers when repository has no records', () => {
        const repository = {
          list: (role) => [],
        };
        const summary = {
          distancesPx: {},
          sectionMetricsById: new Map(),
        };

        const result = syncSectionDataFromSummary(mockEditor, mockStorage, {
          summary,
          repository,
        });

        expect(result).toEqual({
          headers: {},
          footers: {},
        });
      });

      it('should populate headers from repository records', () => {
        const repository = {
          list: (role) => {
            if (role === 'header') {
              return [{ id: 'header-1', contentJson: { type: 'doc', content: [] } }];
            }
            return [];
          },
        };
        const summary = {
          distancesPx: { header: 36 },
          sectionMetricsById: new Map([['header-1', { contentHeightPx: 50, distancePx: 36 }]]),
        };

        const result = syncSectionDataFromSummary(mockEditor, mockStorage, {
          summary,
          repository,
        });

        expect(result.headers['header-1']).toBeDefined();
        expect(result.headers['header-1'].data).toEqual({ type: 'doc', content: [] });
        expect(result.headers['header-1'].role).toBe('header');
        expect(result.headers['header-1'].measuredHeight).toBe(50);
        expect(result.headers['header-1'].offsetHeight).toBe(36);
      });

      it('should populate footers from repository records', () => {
        const repository = {
          list: (role) => {
            if (role === 'footer') {
              return [{ id: 'footer-1', contentJson: { type: 'doc', content: [] } }];
            }
            return [];
          },
        };
        const summary = {
          distancesPx: { footer: 36 },
          sectionMetricsById: new Map([['footer-1', { contentHeightPx: 40, distancePx: 36 }]]),
        };

        const result = syncSectionDataFromSummary(mockEditor, mockStorage, {
          summary,
          repository,
        });

        expect(result.footers['footer-1']).toBeDefined();
        expect(result.footers['footer-1'].data).toEqual({ type: 'doc', content: [] });
        expect(result.footers['footer-1'].role).toBe('footer');
        expect(result.footers['footer-1'].measuredHeight).toBe(40);
      });

      it('should handle both headers and footers simultaneously', () => {
        const repository = {
          list: (role) => {
            if (role === 'header') {
              return [{ id: 'header-1', contentJson: {} }];
            }
            if (role === 'footer') {
              return [{ id: 'footer-1', contentJson: {} }];
            }
            return [];
          },
        };
        const summary = {
          distancesPx: { header: 36, footer: 36 },
          sectionMetricsById: new Map([
            ['header-1', { contentHeightPx: 50 }],
            ['footer-1', { contentHeightPx: 40 }],
          ]),
        };

        const result = syncSectionDataFromSummary(mockEditor, mockStorage, {
          summary,
          repository,
        });

        expect(result.headers['header-1']).toBeDefined();
        expect(result.footers['footer-1']).toBeDefined();
      });
    });

    describe('metrics handling', () => {
      it('should handle metrics from Map lookup', () => {
        const repository = {
          list: (role) => (role === 'header' ? [{ id: 'h1', contentJson: {} }] : []),
        };
        const summary = {
          distancesPx: {},
          sectionMetricsById: new Map([['h1', { contentHeightPx: 100, distancePx: 50, effectiveHeightPx: 150 }]]),
        };

        const result = syncSectionDataFromSummary(mockEditor, mockStorage, {
          summary,
          repository,
        });

        expect(result.headers.h1.metrics).toEqual({
          contentHeightPx: 100,
          distancePx: 50,
          effectiveHeightPx: 150,
        });
      });

      it('should handle metrics from plain object lookup', () => {
        const repository = {
          list: (role) => (role === 'header' ? [{ id: 'h1', contentJson: {} }] : []),
        };
        const summary = {
          distancesPx: {},
          sectionMetricsById: {
            h1: { contentHeightPx: 100, distancePx: 50 },
          },
        };

        const result = syncSectionDataFromSummary(mockEditor, mockStorage, {
          summary,
          repository,
        });

        expect(result.headers.h1.metrics).toEqual({
          contentHeightPx: 100,
          distancePx: 50,
        });
      });

      it('should handle missing metrics gracefully', () => {
        const repository = {
          list: (role) => (role === 'header' ? [{ id: 'h1', contentJson: {} }] : []),
        };
        const summary = {
          distancesPx: {},
          sectionMetricsById: new Map(),
        };

        const result = syncSectionDataFromSummary(mockEditor, mockStorage, {
          summary,
          repository,
        });

        expect(result.headers.h1).toBeDefined();
        expect(result.headers.h1.metrics).toBeNull();
      });
    });

    describe('height calculations', () => {
      it('should calculate effectiveHeight from content and distance', () => {
        const repository = {
          list: (role) => (role === 'header' ? [{ id: 'h1', contentJson: {} }] : []),
        };
        const summary = {
          distancesPx: {},
          sectionMetricsById: new Map([['h1', { contentHeightPx: 50, distancePx: 36 }]]),
        };

        const result = syncSectionDataFromSummary(mockEditor, mockStorage, {
          summary,
          repository,
        });

        // effectiveHeight = contentHeight + distance = 50 + 36 = 86
        expect(result.headers.h1.reservedHeight).toBe(86);
      });

      it('should use effectiveHeightPx from metrics if available', () => {
        const repository = {
          list: (role) => (role === 'header' ? [{ id: 'h1', contentJson: {} }] : []),
        };
        const summary = {
          distancesPx: {},
          sectionMetricsById: new Map([['h1', { contentHeightPx: 50, distancePx: 36, effectiveHeightPx: 100 }]]),
        };

        const result = syncSectionDataFromSummary(mockEditor, mockStorage, {
          summary,
          repository,
        });

        expect(result.headers.h1.reservedHeight).toBe(100);
      });

      it('should calculate baselineHeight correctly for headers', () => {
        const repository = {
          list: (role) => (role === 'header' ? [{ id: 'h1', contentJson: {} }] : []),
        };
        const summary = {
          distancesPx: {},
          sectionMetricsById: new Map([['h1', { contentHeightPx: 50, distancePx: 36 }]]),
        };

        const result = syncSectionDataFromSummary(mockEditor, mockStorage, {
          summary,
          repository,
        });

        // baselineHeight = reservedHeight - distance = 86 - 36 = 50
        expect(result.headers.h1.baselineHeight).toBe(50);
      });

      it('should handle footer height calculations differently', () => {
        const repository = {
          list: (role) => (role === 'footer' ? [{ id: 'f1', contentJson: {} }] : []),
        };
        const summary = {
          distancesPx: {},
          sectionMetricsById: new Map([['f1', { contentHeightPx: 40, distancePx: 36 }]]),
        };

        const result = syncSectionDataFromSummary(mockEditor, mockStorage, {
          summary,
          repository,
        });

        expect(result.footers.f1.measuredHeight).toBe(40);
        expect(result.footers.f1.offsetHeight).toBe(36);
      });

      it('should handle zero and null values in height calculations', () => {
        const repository = {
          list: (role) => (role === 'header' ? [{ id: 'h1', contentJson: {} }] : []),
        };
        const summary = {
          distancesPx: {},
          sectionMetricsById: new Map([['h1', { contentHeightPx: 0, distancePx: 0 }]]),
        };

        const result = syncSectionDataFromSummary(mockEditor, mockStorage, {
          summary,
          repository,
        });

        expect(result.headers.h1.measuredHeight).toBe(0);
        expect(result.headers.h1.offsetHeight).toBe(0);
        expect(result.headers.h1.reservedHeight).toBe(0);
      });
    });

    describe('layout pages integration', () => {
      it('should extract layout info from layoutPages', () => {
        const repository = {
          list: (role) => (role === 'header' ? [{ id: 'h1', contentJson: {} }] : []),
        };
        const summary = {
          distancesPx: {},
          sectionMetricsById: new Map([['h1', { contentHeightPx: 50 }]]),
        };
        const layoutPages = [
          {
            headerFooterAreas: {
              header: {
                sectionId: 'h1',
                reservedHeightPx: 120,
                slotTopPx: 36,
                slotHeightPx: 50,
                slotMaxHeightPx: 100,
                slotLeftPx: 72,
                slotRightPx: 72,
              },
            },
          },
        ];

        const result = syncSectionDataFromSummary(mockEditor, mockStorage, {
          summary,
          repository,
          layoutPages,
        });

        expect(result.headers.h1.reservedHeight).toBe(120);
        expect(result.headers.h1.slotTopPx).toBe(36);
        expect(result.headers.h1.slotHeightPx).toBe(50);
        expect(result.headers.h1.slotMaxHeightPx).toBe(100);
        expect(result.headers.h1.slotLeftPx).toBe(72);
        expect(result.headers.h1.slotRightPx).toBe(72);
      });

      it('should handle multiple pages with same section', () => {
        const repository = {
          list: (role) => (role === 'header' ? [{ id: 'h1', contentJson: {} }] : []),
        };
        const summary = {
          distancesPx: {},
          sectionMetricsById: new Map([['h1', { contentHeightPx: 50 }]]),
        };
        const layoutPages = [
          {
            headerFooterAreas: {
              header: {
                sectionId: 'h1',
                reservedHeightPx: 120,
                slotTopPx: 36,
              },
            },
          },
          {
            headerFooterAreas: {
              header: {
                sectionId: 'h1',
                reservedHeightPx: 150, // Should be ignored (first one wins)
              },
            },
          },
        ];

        const result = syncSectionDataFromSummary(mockEditor, mockStorage, {
          summary,
          repository,
          layoutPages,
        });

        expect(result.headers.h1.reservedHeight).toBe(120);
      });

      it('should handle alternative section ID field names', () => {
        const repository = {
          list: (role) => (role === 'header' ? [{ id: 'h1', contentJson: {} }] : []),
        };
        const summary = {
          distancesPx: {},
          sectionMetricsById: new Map([['h1', { contentHeightPx: 50 }]]),
        };

        // Test with 'id' field
        const layoutPages1 = [
          {
            headerFooterAreas: {
              header: { id: 'h1', reservedHeightPx: 100 },
            },
          },
        ];

        const result1 = syncSectionDataFromSummary(mockEditor, mockStorage, {
          summary,
          repository,
          layoutPages: layoutPages1,
        });
        expect(result1.headers.h1.reservedHeight).toBe(100);

        // Test with 'areaId' field
        const layoutPages2 = [
          {
            headerFooterAreas: {
              header: { areaId: 'h1', reservedHeightPx: 110 },
            },
          },
        ];

        const result2 = syncSectionDataFromSummary(mockEditor, mockStorage, {
          summary,
          repository,
          layoutPages: layoutPages2,
        });
        expect(result2.headers.h1.reservedHeight).toBe(110);
      });

      it('should handle footer areas in layout pages', () => {
        const repository = {
          list: (role) => (role === 'footer' ? [{ id: 'f1', contentJson: {} }] : []),
        };
        const summary = {
          distancesPx: {},
          sectionMetricsById: new Map([['f1', { contentHeightPx: 40 }]]),
        };
        const layoutPages = [
          {
            headerFooterAreas: {
              footer: {
                sectionId: 'f1',
                reservedHeightPx: 100,
                slotTopPx: 50,
              },
            },
          },
        ];

        const result = syncSectionDataFromSummary(mockEditor, mockStorage, {
          summary,
          repository,
          layoutPages,
        });

        expect(result.footers.f1.reservedHeight).toBe(100);
        expect(result.footers.f1.slotTopPx).toBe(50);
      });

      it('should handle missing or invalid layoutPages', () => {
        const repository = {
          list: (role) => (role === 'header' ? [{ id: 'h1', contentJson: {} }] : []),
        };
        const summary = {
          distancesPx: {},
          sectionMetricsById: new Map([['h1', { contentHeightPx: 50 }]]),
        };

        const result = syncSectionDataFromSummary(mockEditor, mockStorage, {
          summary,
          repository,
          layoutPages: null,
        });

        expect(result.headers.h1).toBeDefined();
      });
    });

    describe('previous data preservation', () => {
      it('should preserve previous data when contentJson is missing', () => {
        mockStorage.sectionData = {
          headers: {
            h1: {
              data: { type: 'doc', content: [{ type: 'paragraph' }] },
              reservedHeight: 100,
            },
          },
          footers: {},
        };

        const repository = {
          list: (role) => (role === 'header' ? [{ id: 'h1' }] : []),
        };
        const summary = {
          distancesPx: {},
          sectionMetricsById: new Map(),
        };

        const result = syncSectionDataFromSummary(mockEditor, mockStorage, {
          summary,
          repository,
        });

        expect(result.headers.h1.data).toEqual({
          type: 'doc',
          content: [{ type: 'paragraph' }],
        });
      });

      it('should override previous data with new contentJson', () => {
        mockStorage.sectionData = {
          headers: {
            h1: { data: { type: 'doc', content: [] }, reservedHeight: 100 },
          },
          footers: {},
        };

        const repository = {
          list: (role) =>
            role === 'header' ? [{ id: 'h1', contentJson: { type: 'doc', content: [{ type: 'heading' }] } }] : [],
        };
        const summary = {
          distancesPx: {},
          sectionMetricsById: new Map(),
        };

        const result = syncSectionDataFromSummary(mockEditor, mockStorage, {
          summary,
          repository,
        });

        expect(result.headers.h1.data).toEqual({
          type: 'doc',
          content: [{ type: 'heading' }],
        });
      });

      it('should preserve previous height values when new values are null', () => {
        mockStorage.sectionData = {
          headers: {
            h1: {
              data: {},
              reservedHeight: 100,
              measuredHeight: 80,
              offsetHeight: 20,
              slotTopPx: 36,
            },
          },
          footers: {},
        };

        const repository = {
          list: (role) => (role === 'header' ? [{ id: 'h1', contentJson: {} }] : []),
        };
        const summary = {
          distancesPx: {},
          sectionMetricsById: new Map(),
        };

        const result = syncSectionDataFromSummary(mockEditor, mockStorage, {
          summary,
          repository,
        });

        expect(result.headers.h1.reservedHeight).toBe(100);
        expect(result.headers.h1.measuredHeight).toBe(80);
        expect(result.headers.h1.offsetHeight).toBe(20);
        // slotTopPx defaults to 0 when it can't be calculated, not preserved
        expect(result.headers.h1.slotTopPx).toBe(0);
      });

      it('should handle corrupt or invalid previous data', () => {
        mockStorage.sectionData = null;

        const repository = {
          list: (role) => (role === 'header' ? [{ id: 'h1', contentJson: {} }] : []),
        };
        const summary = {
          distancesPx: {},
          sectionMetricsById: new Map(),
        };

        const result = syncSectionDataFromSummary(mockEditor, mockStorage, {
          summary,
          repository,
        });

        expect(result).toEqual({
          headers: { h1: expect.any(Object) },
          footers: {},
        });
      });
    });

    describe('edge cases and robustness', () => {
      it('should handle records without IDs', () => {
        const repository = {
          list: (role) => (role === 'header' ? [{ contentJson: {} }, { id: 'h1', contentJson: {} }] : []),
        };
        const summary = {
          distancesPx: {},
          sectionMetricsById: new Map(),
        };

        const result = syncSectionDataFromSummary(mockEditor, mockStorage, {
          summary,
          repository,
        });

        expect(Object.keys(result.headers)).toEqual(['h1']);
      });

      it('should handle repository.list returning null', () => {
        const repository = {
          list: () => null,
        };
        const summary = {
          distancesPx: {},
          sectionMetricsById: new Map(),
        };

        const result = syncSectionDataFromSummary(mockEditor, mockStorage, {
          summary,
          repository,
        });

        expect(result).toEqual({ headers: {}, footers: {} });
      });

      it('should handle non-numeric height values', () => {
        const repository = {
          list: (role) => (role === 'header' ? [{ id: 'h1', contentJson: {} }] : []),
        };
        const summary = {
          distancesPx: {},
          sectionMetricsById: new Map([['h1', { contentHeightPx: 'invalid', distancePx: NaN }]]),
        };

        const result = syncSectionDataFromSummary(mockEditor, mockStorage, {
          summary,
          repository,
        });

        expect(result.headers.h1.measuredHeight).toBeNull();
        expect(result.headers.h1.offsetHeight).toBeNull();
      });

      it('should handle Infinity values', () => {
        const repository = {
          list: (role) => (role === 'header' ? [{ id: 'h1', contentJson: {} }] : []),
        };
        const summary = {
          distancesPx: {},
          sectionMetricsById: new Map([['h1', { contentHeightPx: Infinity, distancePx: 36 }]]),
        };

        const result = syncSectionDataFromSummary(mockEditor, mockStorage, {
          summary,
          repository,
        });

        expect(result.headers.h1.measuredHeight).toBeNull();
      });

      it('should update storage.sectionData reference', () => {
        const repository = {
          list: (role) => (role === 'header' ? [{ id: 'h1', contentJson: {} }] : []),
        };
        const summary = {
          distancesPx: {},
          sectionMetricsById: new Map(),
        };

        syncSectionDataFromSummary(mockEditor, mockStorage, {
          summary,
          repository,
        });

        expect(mockStorage.sectionData).toBeDefined();
        expect(mockStorage.sectionData.headers).toBeDefined();
        expect(mockStorage.sectionData.footers).toBeDefined();
      });

      it('should handle empty string section IDs in layout pages', () => {
        const repository = {
          list: (role) => (role === 'header' ? [{ id: 'h1', contentJson: {} }] : []),
        };
        const summary = {
          distancesPx: {},
          sectionMetricsById: new Map(),
        };
        const layoutPages = [
          {
            headerFooterAreas: {
              header: { sectionId: '', reservedHeightPx: 100 },
            },
          },
        ];

        const result = syncSectionDataFromSummary(mockEditor, mockStorage, {
          summary,
          repository,
          layoutPages,
        });

        // Should not crash, empty section ID should be ignored
        expect(result.headers).toBeDefined();
      });
    });

    describe('complex scenarios', () => {
      it('should handle multiple headers and footers with mixed layout info', () => {
        const repository = {
          list: (role) => {
            if (role === 'header') {
              return [
                { id: 'h1', contentJson: { type: 'doc' } },
                { id: 'h2', contentJson: { type: 'doc' } },
              ];
            }
            if (role === 'footer') {
              return [
                { id: 'f1', contentJson: { type: 'doc' } },
                { id: 'f2', contentJson: { type: 'doc' } },
              ];
            }
            return [];
          },
        };
        const summary = {
          distancesPx: { header: 36, footer: 36 },
          sectionMetricsById: new Map([
            ['h1', { contentHeightPx: 50, distancePx: 36 }],
            ['h2', { contentHeightPx: 60, distancePx: 40 }],
            ['f1', { contentHeightPx: 40, distancePx: 36 }],
            ['f2', { contentHeightPx: 45, distancePx: 38 }],
          ]),
        };
        const layoutPages = [
          {
            headerFooterAreas: {
              header: { sectionId: 'h1', reservedHeightPx: 100 },
              footer: { sectionId: 'f1', reservedHeightPx: 80 },
            },
          },
          {
            headerFooterAreas: {
              header: { sectionId: 'h2', reservedHeightPx: 110 },
              footer: { sectionId: 'f2', reservedHeightPx: 85 },
            },
          },
        ];

        const result = syncSectionDataFromSummary(mockEditor, mockStorage, {
          summary,
          repository,
          layoutPages,
        });

        expect(Object.keys(result.headers)).toHaveLength(2);
        expect(Object.keys(result.footers)).toHaveLength(2);
        expect(result.headers.h1.reservedHeight).toBe(100);
        expect(result.headers.h2.reservedHeight).toBe(110);
        expect(result.footers.f1.reservedHeight).toBe(80);
        expect(result.footers.f2.reservedHeight).toBe(85);
      });

      it('should handle summary distances fallback', () => {
        const repository = {
          list: (role) => (role === 'header' ? [{ id: 'h1', contentJson: {} }] : []),
        };
        const summary = {
          distancesPx: { header: 40 },
          sectionMetricsById: new Map([['h1', { contentHeightPx: 50 }]]),
        };

        const result = syncSectionDataFromSummary(mockEditor, mockStorage, {
          summary,
          repository,
        });

        // Should use fallback distance from summary.distancesPx
        expect(result.headers.h1.offsetHeight).toBe(40);
      });

      it('should prioritize metrics distance over summary distance', () => {
        const repository = {
          list: (role) => (role === 'header' ? [{ id: 'h1', contentJson: {} }] : []),
        };
        const summary = {
          distancesPx: { header: 40 },
          sectionMetricsById: new Map([['h1', { contentHeightPx: 50, distancePx: 36 }]]),
        };

        const result = syncSectionDataFromSummary(mockEditor, mockStorage, {
          summary,
          repository,
        });

        // Should use metrics distance, not summary distance
        expect(result.headers.h1.offsetHeight).toBe(36);
      });
    });
  });
});
