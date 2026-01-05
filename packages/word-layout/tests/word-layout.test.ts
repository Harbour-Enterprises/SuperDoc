import { describe, expect, it } from 'vitest';

import { computeWordParagraphLayout, resolveMarkerRunProperties } from '../src/index.js';
import type { WordParagraphLayoutInput } from '../src/types.js';

const buildInput = (overrides: Partial<WordParagraphLayoutInput> = {}): WordParagraphLayoutInput => {
  const numbering = overrides.numbering ?? {
    numId: '1',
    ilvl: 0,
    format: 'decimal',
    lvlText: '%1.',
    suffix: 'tab',
    lvlJc: 'left',
    path: [3],
  };

  return {
    paragraph: {
      indent: { left: 36, hanging: 18 },
      tabs: [{ position: 72, alignment: 'start' }],
      tabIntervalTwips: 720,
      numberingProperties: numbering,
    },
    numbering,
    docDefaults: {
      defaultTabIntervalTwips: 720,
      run: { fontFamily: 'Calibri', fontSize: 12 },
    },
    measurement: {
      measureText: (text: string) => text.length * 6,
    },
    ...overrides,
  };
};

describe('computeWordParagraphLayout', () => {
  it('computes marker layout with measurement and numbering data', () => {
    const layout = computeWordParagraphLayout(buildInput());

    expect(layout.indentLeftPx).toBe(36);
    expect(layout.tabsPx).toEqual([72]);
    expect(layout.defaultTabIntervalPx).toBe(48);
    expect(layout.marker?.markerText).toBe('3.');
    expect(layout.marker?.glyphWidthPx).toBe(12);
    expect(layout.marker?.markerBoxWidthPx).toBeGreaterThan(12);
    expect(layout.marker?.markerX).toBeCloseTo(layout.textStartPx - (layout.marker?.markerBoxWidthPx ?? 0));
    expect(layout.marker?.run.fontFamily).toBe('Calibri');
  });

  it('formats roman numerals and falls back when measurement missing', () => {
    const layout = computeWordParagraphLayout(
      buildInput({
        numbering: {
          numId: '2',
          ilvl: 0,
          format: 'upperRoman',
          lvlText: '%1)',
          suffix: 'space',
          lvlJc: 'right',
          path: [4],
        },
        measurement: undefined,
      }),
    );

    expect(layout.marker?.markerText).toBe('IV)');
    expect(layout.marker?.glyphWidthPx).toBeUndefined();
    expect(layout.marker?.markerBoxWidthPx).toBeGreaterThan(0);
    expect(layout.marker?.justification).toBe('right');
    expect(layout.marker?.suffix).toBe('space');
  });
});

describe('resolveMarkerRunProperties', () => {
  it('merges defaults with inline overrides when cache missing', () => {
    const run = resolveMarkerRunProperties({
      inlineMarkerRpr: { fontFamily: 'Roboto', bold: true },
      resolvedParagraphProps: { indent: {} },
      numbering: null,
      docDefaults: { run: { fontSize: 14, color: '#333333', fontFamily: 'Calibri' } },
    });

    expect(run.fontFamily).toBe('Roboto');
    expect(run.fontSize).toBe(14);
    expect(run.bold).toBe(true);
    expect(run.color).toBe('#333333');
  });
});

describe('computeWordParagraphLayout edge cases', () => {
  it('handles paragraph without numbering properties', () => {
    const layout = computeWordParagraphLayout(
      buildInput({
        paragraph: {
          indent: { left: 24 },
          tabs: [],
        },
        numbering: null,
      }),
    );

    expect(layout.marker).toBeUndefined();
    expect(layout.indentLeftPx).toBe(24);
    expect(layout.hangingPx).toBe(0);
  });

  it('handles null inputs for numbering override but uses paragraph numbering', () => {
    const layout = computeWordParagraphLayout(
      buildInput({
        numbering: null,
        paragraph: {
          indent: { left: 36, hanging: 18 },
          tabs: [],
          numberingProperties: null,
        },
      }),
    );

    expect(layout.marker).toBeUndefined();
  });

  it('handles undefined inputs for numbering override but uses paragraph numbering', () => {
    const layout = computeWordParagraphLayout(
      buildInput({
        numbering: undefined,
        paragraph: {
          indent: { left: 36, hanging: 18 },
          tabs: [],
          numberingProperties: null,
        },
      }),
    );

    expect(layout.marker).toBeUndefined();
  });

  it('handles negative indent values', () => {
    const layout = computeWordParagraphLayout(
      buildInput({
        paragraph: {
          indent: { left: -10, hanging: -5 },
          tabs: [],
          numberingProperties: null,
        },
        numbering: null,
      }),
    );

    expect(layout.indentLeftPx).toBe(-10);
    expect(layout.hangingPx).toBe(0); // hanging is clamped to >= 0
  });

  it('handles both firstLine and hanging defined (firstLine takes precedence)', () => {
    const layout = computeWordParagraphLayout(
      buildInput({
        paragraph: {
          indent: { left: 36, firstLine: 12, hanging: 18 },
          tabs: [],
        },
        numbering: null,
      }),
    );

    expect(layout.firstLinePx).toBe(12);
    expect(layout.hangingPx).toBe(18); // hanging is preserved in this case
  });

  it('handles negative firstLine as hanging', () => {
    const layout = computeWordParagraphLayout(
      buildInput({
        paragraph: {
          indent: { left: 36, firstLine: -18 },
          tabs: [],
        },
        numbering: null,
      }),
    );

    expect(layout.firstLinePx).toBe(-18);
    expect(layout.hangingPx).toBe(18); // converted from negative firstLine
  });

  it('handles empty tabs array', () => {
    const layout = computeWordParagraphLayout(
      buildInput({
        paragraph: {
          indent: { left: 24 },
          tabs: [],
        },
      }),
    );

    expect(layout.tabsPx).toEqual([]);
  });

  it('handles undefined tabs array', () => {
    const layout = computeWordParagraphLayout(
      buildInput({
        paragraph: {
          indent: { left: 24 },
        },
      }),
    );

    expect(layout.tabsPx).toEqual([]);
  });

  it('handles very large indent values', () => {
    const layout = computeWordParagraphLayout(
      buildInput({
        paragraph: {
          indent: { left: 10000, hanging: 5000 },
          tabs: [],
        },
      }),
    );

    expect(layout.indentLeftPx).toBe(10000);
    expect(layout.hangingPx).toBe(5000);
  });

  it('handles zero indent values', () => {
    const layout = computeWordParagraphLayout(
      buildInput({
        paragraph: {
          indent: { left: 0, hanging: 0 },
          tabs: [],
        },
        numbering: null,
      }),
    );

    expect(layout.indentLeftPx).toBe(0);
    expect(layout.hangingPx).toBe(0);
  });

  it('handles undefined indent with defaults from docDefaults', () => {
    const layout = computeWordParagraphLayout(
      buildInput({
        paragraph: {
          tabs: [],
          numberingProperties: null,
        },
        numbering: null,
        docDefaults: {},
      }),
    );

    // When indent.left is undefined, the code uses ?? 0, so it becomes 0
    expect(layout.indentLeftPx).toBe(0);
  });

  it('handles missing measurement adapter', () => {
    const layout = computeWordParagraphLayout(
      buildInput({
        measurement: undefined,
      }),
    );

    expect(layout.marker?.glyphWidthPx).toBeUndefined();
    expect(layout.marker?.markerBoxWidthPx).toBeGreaterThan(0);
  });
});

describe('firstLineIndentMode detection and behavior', () => {
  it('should detect firstLine indent pattern when firstLine > 0 and no hanging', () => {
    const layout = computeWordParagraphLayout(
      buildInput({
        paragraph: {
          indent: { left: 0, firstLine: 720 },
          tabs: [],
        },
      }),
    );

    expect(layout.firstLineIndentMode).toBe(true);
    expect(layout.firstLinePx).toBe(720);
    expect(layout.hangingPx).toBe(0);
  });

  it('should NOT detect firstLine mode when firstLine is 0', () => {
    const layout = computeWordParagraphLayout(
      buildInput({
        paragraph: {
          indent: { left: 360, firstLine: 0 },
          tabs: [],
        },
      }),
    );

    expect(layout.firstLineIndentMode).toBeUndefined();
    expect(layout.firstLinePx).toBe(0);
  });

  it('should NOT detect firstLine mode when firstLine is undefined', () => {
    const layout = computeWordParagraphLayout(
      buildInput({
        paragraph: {
          indent: { left: 360 },
          tabs: [],
        },
      }),
    );

    expect(layout.firstLineIndentMode).toBeUndefined();
    expect(layout.firstLinePx).toBeUndefined();
  });

  it('should NOT detect firstLine mode when hanging is also defined', () => {
    const layout = computeWordParagraphLayout(
      buildInput({
        paragraph: {
          indent: { left: 360, firstLine: 720, hanging: 360 },
          tabs: [],
        },
      }),
    );

    expect(layout.firstLineIndentMode).toBeUndefined();
    expect(layout.firstLinePx).toBe(720);
    expect(layout.hangingPx).toBe(360);
  });

  it('should calculate textStartPx correctly in firstLine mode', () => {
    const layout = computeWordParagraphLayout(
      buildInput({
        paragraph: {
          indent: { left: 0, firstLine: 720 },
          tabs: [],
        },
        measurement: {
          measureText: (text: string) => text.length * 6,
        },
      }),
    );

    expect(layout.firstLineIndentMode).toBe(true);
    expect(layout.indentLeftPx).toBe(0);
    expect(layout.firstLinePx).toBe(720);

    // textStartPx should be: left (0) + firstLine (720) + markerBoxWidth
    // markerBoxWidth = glyphWidthPx (12) + LIST_MARKER_GAP (8) = 20
    expect(layout.textStartPx).toBe(740); // 0 + 720 + 20
    expect(layout.marker?.markerX).toBe(720); // left (0) + firstLine (720)
  });

  it('should handle negative firstLine as hanging (not firstLine mode)', () => {
    const layout = computeWordParagraphLayout(
      buildInput({
        paragraph: {
          indent: { left: 360, firstLine: -360 },
          tabs: [],
        },
      }),
    );

    expect(layout.firstLineIndentMode).toBeUndefined();
    expect(layout.firstLinePx).toBe(-360);
    expect(layout.hangingPx).toBe(360); // converted from negative firstLine
  });

  it('should handle very small positive firstLine correctly', () => {
    const layout = computeWordParagraphLayout(
      buildInput({
        paragraph: {
          indent: { left: 360, firstLine: 1 },
          tabs: [],
        },
      }),
    );

    expect(layout.firstLineIndentMode).toBe(true);
    expect(layout.firstLinePx).toBe(1);
  });

  it('should handle NaN firstLine gracefully (not detected as firstLine mode)', () => {
    const layout = computeWordParagraphLayout(
      buildInput({
        paragraph: {
          indent: { left: 360, firstLine: NaN },
          tabs: [],
        },
      }),
    );

    expect(layout.firstLineIndentMode).toBeUndefined();
  });

  it('should handle Infinity firstLine gracefully (not detected as firstLine mode)', () => {
    const layout = computeWordParagraphLayout(
      buildInput({
        paragraph: {
          indent: { left: 360, firstLine: Infinity },
          tabs: [],
        },
      }),
    );

    expect(layout.firstLineIndentMode).toBeUndefined();
  });

  it('should handle -Infinity firstLine gracefully (not detected as firstLine mode)', () => {
    const layout = computeWordParagraphLayout(
      buildInput({
        paragraph: {
          indent: { left: 360, firstLine: -Infinity },
          tabs: [],
        },
      }),
    );

    expect(layout.firstLineIndentMode).toBeUndefined();
  });
});
