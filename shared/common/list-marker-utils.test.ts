import { describe, it, expect } from 'vitest';
import { resolveListTextStartPx, type MinimalWordLayout, type MinimalMarker } from './list-marker-utils.js';
import { LIST_MARKER_GAP, SPACE_SUFFIX_GAP_PX, DEFAULT_TAB_INTERVAL_PX } from './layout-constants.js';

describe('resolveListTextStartPx', () => {
  const mockMeasureMarkerText = (text: string): number => text.length * 8; // 8px per character

  describe('edge cases and validation', () => {
    it('returns undefined when no marker present', () => {
      const wordLayout: MinimalWordLayout = {};
      const result = resolveListTextStartPx(wordLayout, 36, 0, 18, mockMeasureMarkerText);
      expect(result).toBeUndefined();
    });

    it('returns undefined when wordLayout is undefined', () => {
      const result = resolveListTextStartPx(undefined, 36, 0, 18, mockMeasureMarkerText);
      expect(result).toBeUndefined();
    });

    it('handles NaN markerBoxWidthPx by using 0', () => {
      const wordLayout: MinimalWordLayout = {
        marker: {
          markerBoxWidthPx: NaN,
          suffix: 'nothing',
        },
      };
      const result = resolveListTextStartPx(wordLayout, 0, 0, 0, mockMeasureMarkerText);
      expect(result).toBe(0); // markerStartPos(0) + markerTextWidth(0)
    });

    it('handles negative markerBoxWidthPx by using 0', () => {
      const wordLayout: MinimalWordLayout = {
        marker: {
          markerBoxWidthPx: -10,
          suffix: 'nothing',
        },
      };
      const result = resolveListTextStartPx(wordLayout, 0, 0, 0, mockMeasureMarkerText);
      expect(result).toBe(0); // markerStartPos(0) + markerTextWidth(0)
    });

    it('handles NaN markerX in firstLineIndentMode by falling back to standard calculation', () => {
      const wordLayout: MinimalWordLayout = {
        firstLineIndentMode: true,
        marker: {
          markerX: NaN,
          glyphWidthPx: 20,
          suffix: 'nothing',
        },
      };
      const result = resolveListTextStartPx(wordLayout, 36, 0, 18, mockMeasureMarkerText);
      // When markerX is NaN, falls back to: indentLeft - hanging + firstLine = 36 - 18 + 0 = 18
      // markerStartPos(18) + glyphWidth(20) = 38
      expect(result).toBe(38);
    });
  });

  describe('suffix handling', () => {
    describe('space suffix', () => {
      it('adds SPACE_SUFFIX_GAP_PX (4px) after marker', () => {
        const wordLayout: MinimalWordLayout = {
          marker: {
            glyphWidthPx: 15,
            markerX: 0,
            suffix: 'space',
          },
          firstLineIndentMode: true,
        };
        const result = resolveListTextStartPx(wordLayout, 0, 0, 0, mockMeasureMarkerText);
        expect(result).toBe(15 + SPACE_SUFFIX_GAP_PX); // 15 + 4 = 19
      });

      it('uses measured width when glyphWidthPx not provided', () => {
        const wordLayout: MinimalWordLayout = {
          marker: {
            markerText: 'ABC', // 3 chars * 8px = 24px
            markerX: 0,
            suffix: 'space',
          },
          firstLineIndentMode: true,
        };
        const result = resolveListTextStartPx(wordLayout, 0, 0, 0, mockMeasureMarkerText);
        expect(result).toBe(24 + SPACE_SUFFIX_GAP_PX); // 24 + 4 = 28
      });
    });

    describe('nothing suffix', () => {
      it('returns position immediately after marker', () => {
        const wordLayout: MinimalWordLayout = {
          marker: {
            glyphWidthPx: 20,
            markerX: 10,
            suffix: 'nothing',
          },
          firstLineIndentMode: true,
        };
        const result = resolveListTextStartPx(wordLayout, 0, 0, 0, mockMeasureMarkerText);
        expect(result).toBe(30); // markerX(10) + glyphWidth(20)
      });
    });

    describe('tab suffix (default)', () => {
      it('uses tab suffix when not specified', () => {
        const wordLayout: MinimalWordLayout = {
          marker: {
            glyphWidthPx: 20,
            markerX: 0,
          },
          firstLineIndentMode: true,
          textStartPx: 48,
        };
        const result = resolveListTextStartPx(wordLayout, 0, 0, 0, mockMeasureMarkerText);
        expect(result).toBe(48); // Advances to textStartPx
      });
    });
  });

  describe('justification modes', () => {
    describe('left justification (default)', () => {
      it('uses tab-based spacing in standard mode', () => {
        const wordLayout: MinimalWordLayout = {
          marker: {
            glyphWidthPx: 20,
            justification: 'left',
            suffix: 'tab',
          },
        };
        const indentLeft = 36;
        const firstLine = 0;
        const hanging = 18;
        // markerStartPos = indentLeft - hanging + firstLine = 36 - 18 + 0 = 18
        // currentPos = markerStartPos + glyphWidth = 18 + 20 = 38
        // textStart = indentLeft + firstLine = 36 + 0 = 36
        // Since textStart(36) < currentPos(38), use default tab interval:
        // tabWidth = DEFAULT_TAB_INTERVAL_PX - (currentPos % DEFAULT_TAB_INTERVAL_PX)
        //          = 48 - (38 % 48) = 48 - 38 = 10
        // result = 38 + 10 = 48
        const result = resolveListTextStartPx(wordLayout, indentLeft, firstLine, hanging, mockMeasureMarkerText);
        expect(result).toBe(48);
      });
    });

    describe('center/right justification', () => {
      it('uses gutterWidthPx for center justification', () => {
        const wordLayout: MinimalWordLayout = {
          marker: {
            glyphWidthPx: 20,
            markerX: 0,
            justification: 'center',
            gutterWidthPx: 12,
            suffix: 'tab',
          },
          firstLineIndentMode: true,
        };
        const result = resolveListTextStartPx(wordLayout, 0, 0, 0, mockMeasureMarkerText);
        // Uses max(gutterWidthPx, LIST_MARKER_GAP) = max(12, 8) = 12
        expect(result).toBe(20 + 12); // glyphWidth(20) + gutter(12) = 32
      });

      it('uses LIST_MARKER_GAP when gutterWidthPx too small', () => {
        const wordLayout: MinimalWordLayout = {
          marker: {
            glyphWidthPx: 20,
            markerX: 0,
            justification: 'right',
            gutterWidthPx: 4, // Less than LIST_MARKER_GAP (8)
            suffix: 'tab',
          },
          firstLineIndentMode: true,
        };
        const result = resolveListTextStartPx(wordLayout, 0, 0, 0, mockMeasureMarkerText);
        // Uses max(gutterWidthPx, LIST_MARKER_GAP) = max(4, 8) = 8
        expect(result).toBe(20 + LIST_MARKER_GAP); // glyphWidth(20) + LIST_MARKER_GAP(8) = 28
      });

      it('uses LIST_MARKER_GAP when gutterWidthPx not provided', () => {
        const wordLayout: MinimalWordLayout = {
          marker: {
            glyphWidthPx: 20,
            markerX: 0,
            justification: 'right',
            suffix: 'tab',
          },
          firstLineIndentMode: true,
        };
        const result = resolveListTextStartPx(wordLayout, 0, 0, 0, mockMeasureMarkerText);
        expect(result).toBe(20 + LIST_MARKER_GAP); // glyphWidth(20) + LIST_MARKER_GAP(8) = 28
      });
    });
  });

  describe('first-line indent mode', () => {
    it('uses markerX for marker start position', () => {
      const wordLayout: MinimalWordLayout = {
        firstLineIndentMode: true,
        marker: {
          markerX: 10,
          glyphWidthPx: 20,
          textStartX: 48,
          suffix: 'tab',
        },
      };
      const result = resolveListTextStartPx(wordLayout, 36, 0, 18, mockMeasureMarkerText);
      expect(result).toBe(48); // Uses textStartX
    });

    it('uses explicit tab stop when available and after marker', () => {
      const wordLayout: MinimalWordLayout = {
        firstLineIndentMode: true,
        tabsPx: [24, 48, 72],
        marker: {
          markerX: 0,
          glyphWidthPx: 18, // currentPos = 0 + 18 = 18
          suffix: 'tab',
        },
      };
      const result = resolveListTextStartPx(wordLayout, 0, 0, 0, mockMeasureMarkerText);
      // First tab after currentPos(18) is at 24
      // tabWidth = 24 - 18 = 6, which is less than LIST_MARKER_GAP (8)
      // So enforces minimum: markerStartPos(0) + markerTextWidth(18) + LIST_MARKER_GAP(8) = 26
      expect(result).toBe(26);
    });

    it('uses textStartX when no tab stop found', () => {
      const wordLayout: MinimalWordLayout = {
        firstLineIndentMode: true,
        tabsPx: [12, 24], // All tabs before marker end
        marker: {
          markerX: 0,
          glyphWidthPx: 30, // currentPos = 30
          textStartX: 56,
          suffix: 'tab',
        },
      };
      const result = resolveListTextStartPx(wordLayout, 0, 0, 0, mockMeasureMarkerText);
      expect(result).toBe(56); // Uses textStartX since no tabs after 30
    });

    it('prefers textStartX over textStartPx', () => {
      const wordLayout: MinimalWordLayout = {
        firstLineIndentMode: true,
        textStartPx: 100, // Should be ignored
        marker: {
          markerX: 0,
          glyphWidthPx: 20,
          textStartX: 56, // Should be used
          suffix: 'tab',
        },
      };
      const result = resolveListTextStartPx(wordLayout, 0, 0, 0, mockMeasureMarkerText);
      expect(result).toBe(56); // Uses textStartX, not textStartPx
    });

    it('falls back to textStartPx when textStartX not provided', () => {
      const wordLayout: MinimalWordLayout = {
        firstLineIndentMode: true,
        textStartPx: 48,
        marker: {
          markerX: 0,
          glyphWidthPx: 20,
          suffix: 'tab',
        },
      };
      const result = resolveListTextStartPx(wordLayout, 0, 0, 0, mockMeasureMarkerText);
      expect(result).toBe(48); // Uses textStartPx
    });

    it('enforces minimum LIST_MARKER_GAP tab width', () => {
      const wordLayout: MinimalWordLayout = {
        firstLineIndentMode: true,
        marker: {
          markerX: 0,
          glyphWidthPx: 20, // currentPos = 20
          textStartX: 22, // Would give tabWidth = 2, less than LIST_MARKER_GAP (8)
          suffix: 'tab',
        },
      };
      const result = resolveListTextStartPx(wordLayout, 0, 0, 0, mockMeasureMarkerText);
      expect(result).toBe(20 + LIST_MARKER_GAP); // Enforces minimum: 20 + 8 = 28
    });

    it('uses LIST_MARKER_GAP when no tab or textStart available', () => {
      const wordLayout: MinimalWordLayout = {
        firstLineIndentMode: true,
        marker: {
          markerX: 0,
          glyphWidthPx: 20,
          suffix: 'tab',
        },
      };
      const result = resolveListTextStartPx(wordLayout, 0, 0, 0, mockMeasureMarkerText);
      expect(result).toBe(20 + LIST_MARKER_GAP); // 20 + 8 = 28
    });
  });

  describe('standard hanging indent mode', () => {
    it('calculates marker start from indents', () => {
      const wordLayout: MinimalWordLayout = {
        marker: {
          glyphWidthPx: 18,
          suffix: 'tab',
        },
      };
      const indentLeft = 36;
      const firstLine = 0;
      const hanging = 18;
      // markerStartPos = indentLeft - hanging + firstLine = 36 - 18 + 0 = 18
      // currentPos = 18 + 18 = 36
      // textStart = indentLeft + firstLine = 36 + 0 = 36
      // tabWidth = textStart - currentPos = 36 - 36 = 0 (falls to default)
      // Since tabWidth <= 0, use default interval:
      // tabWidth = DEFAULT_TAB_INTERVAL_PX - (currentPos % DEFAULT_TAB_INTERVAL_PX)
      //          = 48 - (36 % 48) = 48 - 36 = 12
      const result = resolveListTextStartPx(wordLayout, indentLeft, firstLine, hanging, mockMeasureMarkerText);
      expect(result).toBe(36 + 12); // 48
    });

    it('uses default tab interval when currentPos exceeds textStart', () => {
      const wordLayout: MinimalWordLayout = {
        marker: {
          glyphWidthPx: 30, // Long marker
          suffix: 'tab',
        },
      };
      const indentLeft = 36;
      const firstLine = 0;
      const hanging = 18;
      // markerStartPos = 36 - 18 + 0 = 18
      // currentPos = 18 + 30 = 48
      // textStart = 36 + 0 = 36
      // Since currentPos(48) > textStart(36), use default interval:
      // tabWidth = DEFAULT_TAB_INTERVAL_PX - (currentPos % DEFAULT_TAB_INTERVAL_PX)
      //          = 48 - (48 % 48) = 48 - 0 = 48
      const result = resolveListTextStartPx(wordLayout, indentLeft, firstLine, hanging, mockMeasureMarkerText);
      expect(result).toBe(48 + 48); // 96
    });

    it('enforces minimum LIST_MARKER_GAP tab width', () => {
      const wordLayout: MinimalWordLayout = {
        marker: {
          glyphWidthPx: 10,
          suffix: 'tab',
        },
      };
      const indentLeft = 36;
      const firstLine = 0;
      const hanging = 18;
      // markerStartPos = 36 - 18 + 0 = 18
      // currentPos = 18 + 10 = 28
      // textStart = 36 + 0 = 36
      // tabWidth = 36 - 28 = 8 (exactly LIST_MARKER_GAP, not enforced)
      const result = resolveListTextStartPx(wordLayout, indentLeft, firstLine, hanging, mockMeasureMarkerText);
      expect(result).toBe(36); // textStart
    });

    it('enforces minimum when calculated tab width is too small', () => {
      const wordLayout: MinimalWordLayout = {
        marker: {
          glyphWidthPx: 12,
          suffix: 'tab',
        },
      };
      const indentLeft = 36;
      const firstLine = 0;
      const hanging = 18;
      // markerStartPos = 36 - 18 + 0 = 18
      // currentPos = 18 + 12 = 30
      // textStart = 36 + 0 = 36
      // tabWidth = 36 - 30 = 6 (less than LIST_MARKER_GAP, so enforce minimum)
      const result = resolveListTextStartPx(wordLayout, indentLeft, firstLine, hanging, mockMeasureMarkerText);
      expect(result).toBe(30 + LIST_MARKER_GAP); // 30 + 8 = 38
    });
  });

  describe('marker text measurement', () => {
    it('uses glyphWidthPx when provided', () => {
      const measureCalls: string[] = [];
      const trackingMeasure = (text: string): number => {
        measureCalls.push(text);
        return text.length * 8;
      };

      const wordLayout: MinimalWordLayout = {
        marker: {
          glyphWidthPx: 25,
          markerText: 'ABC', // Should not be measured
          suffix: 'nothing',
        },
      };

      const result = resolveListTextStartPx(wordLayout, 0, 0, 0, trackingMeasure);
      expect(result).toBe(25); // Uses glyphWidthPx
      expect(measureCalls).toHaveLength(0); // measureMarkerText not called
    });

    it('measures markerText when glyphWidthPx not provided', () => {
      const measureCalls: string[] = [];
      const trackingMeasure = (text: string): number => {
        measureCalls.push(text);
        return text.length * 8;
      };

      const wordLayout: MinimalWordLayout = {
        marker: {
          markerText: 'ABC', // 3 * 8 = 24
          suffix: 'nothing',
        },
      };

      const result = resolveListTextStartPx(wordLayout, 0, 0, 0, trackingMeasure);
      expect(result).toBe(24); // Measured width
      expect(measureCalls).toEqual(['ABC']); // measureMarkerText called
    });

    it('falls back to markerBoxWidthPx when measurement fails', () => {
      const failingMeasure = (): number => NaN;

      const wordLayout: MinimalWordLayout = {
        marker: {
          markerBoxWidthPx: 20,
          markerText: 'ABC',
          suffix: 'nothing',
        },
      };

      const result = resolveListTextStartPx(wordLayout, 0, 0, 0, failingMeasure);
      expect(result).toBe(20); // Uses markerBoxWidthPx fallback
    });

    it('uses 0 when no width information available', () => {
      const wordLayout: MinimalWordLayout = {
        marker: {
          suffix: 'nothing',
        },
      };

      const result = resolveListTextStartPx(wordLayout, 0, 0, 0, mockMeasureMarkerText);
      expect(result).toBe(0); // All widths default to 0
    });
  });
});
