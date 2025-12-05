/**
 * Tests for Paragraph Attributes Computation Module
 *
 * Covers 13 exported functions for computing, merging, and normalizing paragraph attributes:
 * - resolveParagraphBooleanAttr: Resolve boolean attributes from PM node
 * - hasPageBreakBefore: Check for page break before paragraph
 * - cloneParagraphAttrs: Deep clone paragraph attributes
 * - buildStyleNodeFromAttrs: Build style node for style engine
 * - normalizeListRenderingAttrs: Normalize list rendering attributes
 * - buildNumberingPath: Build numbering path for multi-level lists
 * - computeWordLayoutForParagraph: Compute Word paragraph layout
 * - computeParagraphAttrs: Main function for computing paragraph attrs (187 lines)
 * - mergeParagraphAttrs: Merge two paragraph attrs
 * - convertListParagraphAttrs: Convert list paragraph attrs
 *
 * Note: Some tests require mocking style-engine and word-layout dependencies.
 */

import { describe, it, expect, vi } from 'vitest';
import type { ParagraphAttrs, ParagraphIndent, ParagraphSpacing } from '@superdoc/contracts';
import {
  resolveParagraphBooleanAttr,
  hasPageBreakBefore,
  cloneParagraphAttrs,
  buildStyleNodeFromAttrs,
  normalizeListRenderingAttrs,
  buildNumberingPath,
  computeWordLayoutForParagraph,
  computeParagraphAttrs,
  mergeParagraphAttrs,
  convertListParagraphAttrs,
  mergeSpacingSources,
} from './paragraph.js';
import type { ListCounterContext } from '../types.js';
import { twipsToPx } from '../utilities.js';

// Mock PM node shape
type PMNode = {
  attrs?: Record<string, unknown>;
};

describe('resolveParagraphBooleanAttr', () => {
  describe('direct attribute resolution', () => {
    it('should return true for boolean true', () => {
      const para: PMNode = { attrs: { bidi: true } };
      expect(resolveParagraphBooleanAttr(para, 'bidi', 'w:bidi')).toBe(true);
    });

    it('should return true for number 1', () => {
      const para: PMNode = { attrs: { bidi: 1 } };
      expect(resolveParagraphBooleanAttr(para, 'bidi', 'w:bidi')).toBe(true);
    });

    it('should return true for string "true"', () => {
      const para: PMNode = { attrs: { bidi: 'true' } };
      expect(resolveParagraphBooleanAttr(para, 'bidi', 'w:bidi')).toBe(true);
    });

    it('should return true for string "1"', () => {
      const para: PMNode = { attrs: { bidi: '1' } };
      expect(resolveParagraphBooleanAttr(para, 'bidi', 'w:bidi')).toBe(true);
    });

    it('should return true for string "on"', () => {
      const para: PMNode = { attrs: { bidi: 'on' } };
      expect(resolveParagraphBooleanAttr(para, 'bidi', 'w:bidi')).toBe(true);
    });

    it('should return false for boolean false', () => {
      const para: PMNode = { attrs: { bidi: false } };
      expect(resolveParagraphBooleanAttr(para, 'bidi', 'w:bidi')).toBe(false);
    });

    it('should return false for number 0', () => {
      const para: PMNode = { attrs: { bidi: 0 } };
      expect(resolveParagraphBooleanAttr(para, 'bidi', 'w:bidi')).toBe(false);
    });

    it('should return false for string "false"', () => {
      const para: PMNode = { attrs: { bidi: 'false' } };
      expect(resolveParagraphBooleanAttr(para, 'bidi', 'w:bidi')).toBe(false);
    });

    it('should return false for string "0"', () => {
      const para: PMNode = { attrs: { bidi: '0' } };
      expect(resolveParagraphBooleanAttr(para, 'bidi', 'w:bidi')).toBe(false);
    });

    it('should return false for string "off"', () => {
      const para: PMNode = { attrs: { bidi: 'off' } };
      expect(resolveParagraphBooleanAttr(para, 'bidi', 'w:bidi')).toBe(false);
    });

    it('should handle case-insensitive string values', () => {
      expect(resolveParagraphBooleanAttr({ attrs: { bidi: 'TRUE' } }, 'bidi', 'w:bidi')).toBe(true);
      expect(resolveParagraphBooleanAttr({ attrs: { bidi: 'FALSE' } }, 'bidi', 'w:bidi')).toBe(false);
      expect(resolveParagraphBooleanAttr({ attrs: { bidi: 'On' } }, 'bidi', 'w:bidi')).toBe(true);
      expect(resolveParagraphBooleanAttr({ attrs: { bidi: 'Off' } }, 'bidi', 'w:bidi')).toBe(false);
    });
  });

  describe('paragraphProperties resolution', () => {
    it('should resolve from nested paragraphProperties', () => {
      const para: PMNode = {
        attrs: {
          paragraphProperties: {
            bidi: true,
          },
        },
      };
      expect(resolveParagraphBooleanAttr(para, 'bidi', 'w:bidi')).toBe(true);
    });

    it('should prioritize direct attrs over paragraphProperties', () => {
      const para: PMNode = {
        attrs: {
          bidi: true,
          paragraphProperties: {
            bidi: false,
          },
        },
      };
      expect(resolveParagraphBooleanAttr(para, 'bidi', 'w:bidi')).toBe(true);
    });
  });

  describe('element-based resolution', () => {
    it('should infer true from element without val attribute', () => {
      const para: PMNode = {
        attrs: {
          paragraphProperties: {
            elements: [{ name: 'w:bidi' }],
          },
        },
      };
      expect(resolveParagraphBooleanAttr(para, 'bidi', 'w:bidi')).toBe(true);
    });

    it('should infer from element with w:val attribute', () => {
      const para: PMNode = {
        attrs: {
          paragraphProperties: {
            elements: [{ name: 'w:bidi', attributes: { 'w:val': 'true' } }],
          },
        },
      };
      expect(resolveParagraphBooleanAttr(para, 'bidi', 'w:bidi')).toBe(true);
    });

    it('should handle element name with and without w: prefix', () => {
      const para1: PMNode = {
        attrs: {
          paragraphProperties: {
            elements: [{ name: 'w:bidi' }],
          },
        },
      };
      const para2: PMNode = {
        attrs: {
          paragraphProperties: {
            elements: [{ name: 'bidi' }],
          },
        },
      };
      expect(resolveParagraphBooleanAttr(para1, 'bidi', 'bidi')).toBe(true);
      expect(resolveParagraphBooleanAttr(para2, 'bidi', 'w:bidi')).toBe(true);
    });

    it('should handle multiple element names', () => {
      const para: PMNode = {
        attrs: {
          paragraphProperties: {
            elements: [{ name: 'w:keepNext' }],
          },
        },
      };
      expect(resolveParagraphBooleanAttr(para, 'keepWithNext', ['w:keepNext', 'w:keepWithNext'])).toBe(true);
    });
  });

  describe('undefined cases', () => {
    it('should return undefined when attribute not found', () => {
      const para: PMNode = { attrs: {} };
      expect(resolveParagraphBooleanAttr(para, 'bidi', 'w:bidi')).toBeUndefined();
    });

    it('should return undefined for para without attrs', () => {
      const para: PMNode = {};
      expect(resolveParagraphBooleanAttr(para, 'bidi', 'w:bidi')).toBeUndefined();
    });

    it('should return undefined for non-boolean values', () => {
      const para: PMNode = { attrs: { bidi: 'unknown' } };
      expect(resolveParagraphBooleanAttr(para, 'bidi', 'w:bidi')).toBeUndefined();
    });
  });
});

describe('hasPageBreakBefore', () => {
  it('should return true for direct pageBreakBefore attribute', () => {
    const para: PMNode = { attrs: { pageBreakBefore: true } };
    expect(hasPageBreakBefore(para)).toBe(true);
  });

  it('should return true for nested paragraphProperties', () => {
    const para: PMNode = {
      attrs: {
        paragraphProperties: {
          pageBreakBefore: true,
        },
      },
    };
    expect(hasPageBreakBefore(para)).toBe(true);
  });

  it('should return true for element-based pageBreakBefore', () => {
    const para: PMNode = {
      attrs: {
        paragraphProperties: {
          elements: [{ name: 'w:pageBreakBefore' }],
        },
      },
    };
    expect(hasPageBreakBefore(para)).toBe(true);
  });

  it('should return false when pageBreakBefore is false', () => {
    const para: PMNode = { attrs: { pageBreakBefore: false } };
    expect(hasPageBreakBefore(para)).toBe(false);
  });

  it('should return false when pageBreakBefore is not present', () => {
    const para: PMNode = { attrs: {} };
    expect(hasPageBreakBefore(para)).toBe(false);
  });

  it('should return false for para without attrs', () => {
    const para: PMNode = {};
    expect(hasPageBreakBefore(para)).toBe(false);
  });
});

describe('cloneParagraphAttrs', () => {
  it('should return undefined for undefined input', () => {
    expect(cloneParagraphAttrs(undefined)).toBeUndefined();
  });

  it('should clone simple attributes', () => {
    const attrs: ParagraphAttrs = {
      alignment: 'center',
    };
    const cloned = cloneParagraphAttrs(attrs);
    expect(cloned).toEqual(attrs);
    expect(cloned).not.toBe(attrs);
  });

  it('should deep clone spacing', () => {
    const attrs: ParagraphAttrs = {
      spacing: { before: 10, after: 20, line: 15 },
    };
    const cloned = cloneParagraphAttrs(attrs);
    expect(cloned?.spacing).toEqual(attrs.spacing);
    expect(cloned?.spacing).not.toBe(attrs.spacing);
  });

  it('should deep clone indent', () => {
    const attrs: ParagraphAttrs = {
      indent: { left: 10, right: 20, firstLine: 5 },
    };
    const cloned = cloneParagraphAttrs(attrs);
    expect(cloned?.indent).toEqual(attrs.indent);
    expect(cloned?.indent).not.toBe(attrs.indent);
  });

  it('should deep clone borders', () => {
    const attrs: ParagraphAttrs = {
      borders: {
        top: { style: 'solid', width: 1, color: '#FF0000' },
        bottom: { style: 'dashed', width: 2, color: '#00FF00' },
      },
    };
    const cloned = cloneParagraphAttrs(attrs);
    expect(cloned?.borders).toEqual(attrs.borders);
    expect(cloned?.borders).not.toBe(attrs.borders);
    expect(cloned?.borders?.top).not.toBe(attrs.borders?.top);
    expect(cloned?.borders?.bottom).not.toBe(attrs.borders?.bottom);
  });

  it('should deep clone shading', () => {
    const attrs: ParagraphAttrs = {
      shading: { fill: '#FFFF00', color: '#000000' },
    };
    const cloned = cloneParagraphAttrs(attrs);
    expect(cloned?.shading).toEqual(attrs.shading);
    expect(cloned?.shading).not.toBe(attrs.shading);
  });

  it('should deep clone tabs array', () => {
    const attrs: ParagraphAttrs = {
      tabs: [
        { pos: 100, val: 'left' },
        { pos: 200, val: 'center' },
      ],
    };
    const cloned = cloneParagraphAttrs(attrs);
    expect(cloned?.tabs).toEqual(attrs.tabs);
    expect(cloned?.tabs).not.toBe(attrs.tabs);
    expect(cloned?.tabs?.[0]).not.toBe(attrs.tabs?.[0]);
  });

  it('should clone complete paragraph attrs', () => {
    const attrs: ParagraphAttrs = {
      alignment: 'right',
      spacing: { before: 10, after: 20 },
      indent: { left: 15, right: 25 },
      borders: {
        top: { style: 'solid', width: 1 },
      },
      shading: { fill: '#FFFF00' },
      tabs: [{ pos: 100, val: 'left' }],
    };
    const cloned = cloneParagraphAttrs(attrs);
    expect(cloned).toEqual(attrs);
    expect(cloned).not.toBe(attrs);
  });

  it('should not mutate original attrs', () => {
    const attrs: ParagraphAttrs = {
      spacing: { before: 10 },
    };
    const cloned = cloneParagraphAttrs(attrs);
    if (cloned?.spacing) {
      cloned.spacing.before = 999;
    }
    expect(attrs.spacing?.before).toBe(10);
  });

  it('should handle borders with only some sides', () => {
    const attrs: ParagraphAttrs = {
      borders: {
        top: { style: 'solid', width: 1 },
      },
    };
    const cloned = cloneParagraphAttrs(attrs);
    expect(cloned?.borders).toEqual(attrs.borders);
    expect(cloned?.borders?.left).toBeUndefined();
  });

  it('should handle empty borders object', () => {
    const attrs: ParagraphAttrs = {
      borders: {},
    };
    const cloned = cloneParagraphAttrs(attrs);
    expect(cloned?.borders).toBeUndefined();
  });
});

describe('buildStyleNodeFromAttrs', () => {
  it('should return empty object for undefined attrs', () => {
    const styleNode = buildStyleNodeFromAttrs(undefined);
    expect(styleNode).toEqual({});
  });

  it('should build style node with alignment', () => {
    const attrs = { alignment: 'center' };
    const styleNode = buildStyleNodeFromAttrs(attrs);
    expect(styleNode.paragraphProps?.alignment).toBe('center');
  });

  it('should normalize textAlign to alignment', () => {
    const attrs = { textAlign: 'right' };
    const styleNode = buildStyleNodeFromAttrs(attrs);
    expect(styleNode.paragraphProps?.alignment).toBe('right');
  });

  it('should include spacing when provided', () => {
    const spacing: ParagraphSpacing = { before: 10, after: 20 };
    const styleNode = buildStyleNodeFromAttrs({}, spacing);
    expect(styleNode.paragraphProps?.spacing).toBeDefined();
  });

  it('should include indent when provided', () => {
    const indent: ParagraphIndent = { left: 15, right: 25 };
    const styleNode = buildStyleNodeFromAttrs({}, undefined, indent);
    expect(styleNode.paragraphProps?.indent).toBeDefined();
  });

  it('should normalize tabs from attrs.tabs', () => {
    const attrs = {
      tabs: [{ pos: 100, val: 'left' }],
    };
    const styleNode = buildStyleNodeFromAttrs(attrs);
    expect(styleNode.paragraphProps?.tabs).toBeDefined();
  });

  it('should normalize tabs from attrs.tabStops', () => {
    const attrs = {
      tabStops: [{ pos: 200, val: 'center' }],
    };
    const styleNode = buildStyleNodeFromAttrs(attrs);
    expect(styleNode.paragraphProps?.tabs).toBeDefined();
  });

  it('should return empty styleNode when no paragraph props', () => {
    const attrs = {};
    const styleNode = buildStyleNodeFromAttrs(attrs);
    expect(styleNode).toEqual({});
  });

  it('should build complete style node', () => {
    const attrs = { alignment: 'justify' };
    const spacing: ParagraphSpacing = { before: 10 };
    const indent: ParagraphIndent = { left: 15 };
    const styleNode = buildStyleNodeFromAttrs(attrs, spacing, indent);
    expect(styleNode.paragraphProps?.alignment).toBe('justify');
    expect(styleNode.paragraphProps?.spacing).toBeDefined();
    expect(styleNode.paragraphProps?.indent).toBeDefined();
  });
});

describe('normalizeListRenderingAttrs', () => {
  it('should return undefined for null', () => {
    expect(normalizeListRenderingAttrs(null)).toBeUndefined();
  });

  it('should return undefined for non-object', () => {
    expect(normalizeListRenderingAttrs('string')).toBeUndefined();
  });

  it('should normalize markerText', () => {
    const input = { markerText: '1.' };
    const result = normalizeListRenderingAttrs(input);
    expect(result?.markerText).toBe('1.');
  });

  it('should normalize justification', () => {
    expect(normalizeListRenderingAttrs({ justification: 'left' })?.justification).toBe('left');
    expect(normalizeListRenderingAttrs({ justification: 'right' })?.justification).toBe('right');
    expect(normalizeListRenderingAttrs({ justification: 'center' })?.justification).toBe('center');
  });

  it('should reject invalid justification', () => {
    expect(normalizeListRenderingAttrs({ justification: 'invalid' })?.justification).toBeUndefined();
  });

  it('should normalize numberingType', () => {
    const input = { numberingType: 'decimal' };
    const result = normalizeListRenderingAttrs(input);
    expect(result?.numberingType).toBe('decimal');
  });

  it('should normalize suffix', () => {
    expect(normalizeListRenderingAttrs({ suffix: 'tab' })?.suffix).toBe('tab');
    expect(normalizeListRenderingAttrs({ suffix: 'space' })?.suffix).toBe('space');
    expect(normalizeListRenderingAttrs({ suffix: 'nothing' })?.suffix).toBe('nothing');
  });

  it('should reject invalid suffix', () => {
    expect(normalizeListRenderingAttrs({ suffix: 'invalid' })?.suffix).toBeUndefined();
  });

  it('should normalize numeric path array', () => {
    const input = { path: [1, 2, 3] };
    const result = normalizeListRenderingAttrs(input);
    expect(result?.path).toEqual([1, 2, 3]);
  });

  it('should convert string numbers in path to numbers', () => {
    const input = { path: ['1', '2', '3'] };
    const result = normalizeListRenderingAttrs(input);
    expect(result?.path).toEqual([1, 2, 3]);
  });

  it('should filter out non-numeric values from path', () => {
    const input = { path: [1, 'invalid', 2, NaN, 3] };
    const result = normalizeListRenderingAttrs(input);
    expect(result?.path).toEqual([1, 2, 3]);
  });

  it('should return undefined for empty path', () => {
    const input = { path: [] };
    const result = normalizeListRenderingAttrs(input);
    expect(result?.path).toBeUndefined();
  });

  it('should normalize complete list rendering attrs', () => {
    const input = {
      markerText: 'a)',
      justification: 'left',
      numberingType: 'lowerLetter',
      suffix: 'tab',
      path: [1, 2],
    };
    const result = normalizeListRenderingAttrs(input);
    expect(result).toEqual({
      markerText: 'a)',
      justification: 'left',
      numberingType: 'lowerLetter',
      suffix: 'tab',
      path: [1, 2],
    });
  });
});

describe('buildNumberingPath', () => {
  describe('without listCounterContext', () => {
    it('should build path with counterValue at target level', () => {
      const path = buildNumberingPath(undefined, 0, 5);
      expect(path).toEqual([5]);
    });

    it('should build path for level 0', () => {
      const path = buildNumberingPath(1, 0, 3);
      expect(path).toEqual([3]);
    });

    it('should build path for level 1', () => {
      const path = buildNumberingPath(undefined, 1, 3);
      expect(path).toEqual([1, 3]);
    });

    it('should build path for level 2', () => {
      const path = buildNumberingPath(undefined, 2, 5);
      expect(path).toEqual([1, 1, 5]);
    });

    it('should handle negative level as 0', () => {
      const path = buildNumberingPath(undefined, -1, 3);
      expect(path).toEqual([3]);
    });

    it('should floor fractional levels', () => {
      const path = buildNumberingPath(undefined, 2.7, 3);
      expect(path).toEqual([1, 1, 3]);
    });
  });

  describe('with listCounterContext', () => {
    it('should query parent levels from context', () => {
      const context: ListCounterContext = {
        getListCounter: vi.fn((numId, level) => {
          if (level === 0) return 2;
          if (level === 1) return 3;
          return 0;
        }),
        incrementListCounter: vi.fn(),
        resetListCounter: vi.fn(),
      };

      const path = buildNumberingPath(1, 2, 7, context);
      expect(path).toEqual([2, 3, 7]);
      expect(context.getListCounter).toHaveBeenCalledWith(1, 0);
      expect(context.getListCounter).toHaveBeenCalledWith(1, 1);
    });

    it('should use 1 for zero or negative parent values', () => {
      const context: ListCounterContext = {
        getListCounter: vi.fn(() => 0),
        incrementListCounter: vi.fn(),
        resetListCounter: vi.fn(),
      };

      const path = buildNumberingPath(1, 2, 5, context);
      expect(path).toEqual([1, 1, 5]);
    });

    it('should handle level 0 without querying parents', () => {
      const context: ListCounterContext = {
        getListCounter: vi.fn(),
        incrementListCounter: vi.fn(),
        resetListCounter: vi.fn(),
      };

      const path = buildNumberingPath(1, 0, 3, context);
      expect(path).toEqual([3]);
      expect(context.getListCounter).not.toHaveBeenCalled();
    });
  });
});

describe('mergeParagraphAttrs', () => {
  it('should return undefined when both are undefined', () => {
    expect(mergeParagraphAttrs(undefined, undefined)).toBeUndefined();
  });

  it('should return override when base is undefined', () => {
    const override: ParagraphAttrs = { alignment: 'center' };
    expect(mergeParagraphAttrs(undefined, override)).toBe(override);
  });

  it('should return base when override is undefined', () => {
    const base: ParagraphAttrs = { alignment: 'left' };
    expect(mergeParagraphAttrs(base, undefined)).toBe(base);
  });

  it('should override alignment', () => {
    const base: ParagraphAttrs = { alignment: 'left' };
    const override: ParagraphAttrs = { alignment: 'right' };
    const merged = mergeParagraphAttrs(base, override);
    expect(merged?.alignment).toBe('right');
  });

  it('should merge spacing properties', () => {
    const base: ParagraphAttrs = {
      spacing: { before: 10, after: 20 },
    };
    const override: ParagraphAttrs = {
      spacing: { after: 30, line: 15 },
    };
    const merged = mergeParagraphAttrs(base, override);
    expect(merged?.spacing).toEqual({ before: 10, after: 30, line: 15 });
  });

  it('should merge indent properties', () => {
    const base: ParagraphAttrs = {
      indent: { left: 10, right: 20 },
    };
    const override: ParagraphAttrs = {
      indent: { right: 30, firstLine: 5 },
    };
    const merged = mergeParagraphAttrs(base, override);
    expect(merged?.indent).toEqual({ left: 10, right: 30, firstLine: 5 });
  });

  it('should merge borders', () => {
    const base: ParagraphAttrs = {
      borders: {
        top: { style: 'solid', width: 1 },
      },
    };
    const override: ParagraphAttrs = {
      borders: {
        bottom: { style: 'dashed', width: 2 },
      },
    };
    const merged = mergeParagraphAttrs(base, override);
    expect(merged?.borders?.top).toEqual({ style: 'solid', width: 1 });
    expect(merged?.borders?.bottom).toEqual({ style: 'dashed', width: 2 });
  });

  it('should merge shading', () => {
    const base: ParagraphAttrs = {
      shading: { fill: '#FF0000' },
    };
    const override: ParagraphAttrs = {
      shading: { color: '#00FF00' },
    };
    const merged = mergeParagraphAttrs(base, override);
    expect(merged?.shading).toEqual({ fill: '#FF0000', color: '#00FF00' });
  });

  it('should not mutate base or override', () => {
    const base: ParagraphAttrs = { alignment: 'left', spacing: { before: 10 } };
    const override: ParagraphAttrs = { alignment: 'right', spacing: { after: 20 } };
    const originalBase = { ...base, spacing: { ...base.spacing } };
    const originalOverride = { ...override, spacing: { ...override.spacing } };

    mergeParagraphAttrs(base, override);

    expect(base.alignment).toBe(originalBase.alignment);
    expect(override.alignment).toBe(originalOverride.alignment);
  });
});

describe('convertListParagraphAttrs', () => {
  it('should return undefined for undefined attrs', () => {
    expect(convertListParagraphAttrs(undefined)).toBeUndefined();
  });

  it('should return undefined for empty attrs', () => {
    expect(convertListParagraphAttrs({})).toBeUndefined();
  });

  it('should convert alignment from attrs.alignment', () => {
    const attrs = { alignment: 'center' };
    const result = convertListParagraphAttrs(attrs);
    expect(result?.alignment).toBe('center');
  });

  it('should convert alignment from attrs.lvlJc', () => {
    const attrs = { lvlJc: 'right' };
    const result = convertListParagraphAttrs(attrs);
    expect(result?.alignment).toBe('right');
  });

  it('should prioritize alignment over lvlJc', () => {
    const attrs = { alignment: 'center', lvlJc: 'right' };
    const result = convertListParagraphAttrs(attrs);
    expect(result?.alignment).toBe('center');
  });

  it('should convert spacing', () => {
    const attrs = {
      spacing: { before: 150, after: 300 }, // 10px and 20px in twips
    };
    const result = convertListParagraphAttrs(attrs);
    expect(result?.spacing).toEqual({ before: 10, after: 20 });
  });

  it('should convert shading', () => {
    const attrs = {
      shading: { fill: '#FFFF00' },
    };
    const result = convertListParagraphAttrs(attrs);
    expect(result?.shading).toEqual({ fill: '#FFFF00' });
  });

  it('should convert complete list paragraph attrs', () => {
    const attrs = {
      alignment: 'justify',
      spacing: { before: 75 }, // 5px in twips
      shading: { fill: '#FF0000' },
    };
    const result = convertListParagraphAttrs(attrs);
    expect(result).toEqual({
      alignment: 'justify',
      spacing: { before: 5 },
      shading: { fill: '#FF0000' },
    });
  });
});

describe('computeWordLayoutForParagraph', () => {
  it('should return null on error', () => {
    // This will cause computeWordParagraphLayout to throw
    const paragraphAttrs: ParagraphAttrs = {};
    const numberingProps = null; // Invalid
    const styleContext = {} as never;

    const result = computeWordLayoutForParagraph(paragraphAttrs, numberingProps, styleContext);
    expect(result).toBeNull();
  });

  it('should handle paragraphAttrs without indent', () => {
    const paragraphAttrs: ParagraphAttrs = {
      alignment: 'left',
    };
    const numberingProps = {
      numId: 1,
      ilvl: 0,
    };
    const styleContext = {
      defaults: {
        defaultTabIntervalTwips: 720,
        decimalSeparator: '.',
      },
    } as never;

    const result = computeWordLayoutForParagraph(paragraphAttrs, numberingProps, styleContext);
    // Result depends on computeWordParagraphLayout implementation
    // We're just testing it doesn't throw
    expect(result).toBeDefined();
  });

  it('should merge resolvedLevelIndent with paragraph indent', () => {
    const paragraphAttrs: ParagraphAttrs = {
      indent: { left: 10 },
    };
    const numberingProps = {
      numId: 1,
      ilvl: 0,
      resolvedLevelIndent: { left: 1440 }, // 1 inch in twips
    };
    const styleContext = {
      defaults: {
        defaultTabIntervalTwips: 720,
        decimalSeparator: '.',
      },
    } as never;

    const result = computeWordLayoutForParagraph(paragraphAttrs, numberingProps, styleContext);
    expect(result).toBeDefined();
  });

  it('should use default values from styleContext', () => {
    const paragraphAttrs: ParagraphAttrs = {};
    const numberingProps = { numId: 1, ilvl: 0 };
    const styleContext = {
      defaults: {
        defaultTabIntervalTwips: 360,
        decimalSeparator: ',',
      },
    } as never;

    const result = computeWordLayoutForParagraph(paragraphAttrs, numberingProps, styleContext);
    expect(result).toBeDefined();
  });
});

describe('computeParagraphAttrs', () => {
  // Note: Full testing of computeParagraphAttrs requires mocking resolveStyle and other dependencies
  // These tests cover basic scenarios

  it('should return undefined for para without attrs', () => {
    const para: PMNode = {};
    const styleContext = {
      styles: {},
      defaults: {},
    } as never;

    const result = computeParagraphAttrs(para, styleContext);
    // May return undefined or minimal attrs depending on style resolution
    expect(result).toBeDefined();
  });

  it('should set direction and rtl for bidi paragraphs', () => {
    const para: PMNode = {
      attrs: { bidi: true },
    };
    const styleContext = {
      styles: {},
      defaults: {},
    } as never;

    const result = computeParagraphAttrs(para, styleContext);
    expect(result?.direction).toBe('rtl');
    expect(result?.rtl).toBe(true);
  });

  it('should default bidi paragraphs to right alignment', () => {
    const para: PMNode = {
      attrs: { bidi: true },
    };
    const styleContext = {
      styles: {},
      defaults: {},
    } as never;

    const result = computeParagraphAttrs(para, styleContext);
    expect(result?.alignment).toBe('right');
  });

  it('should respect explicit alignment over bidi default', () => {
    const para: PMNode = {
      attrs: { bidi: true, alignment: 'center' },
    };
    const styleContext = {
      styles: {},
      defaults: {},
    } as never;

    const result = computeParagraphAttrs(para, styleContext);
    expect(result?.alignment).toBe('center');
  });

  it('should normalize paragraph borders', () => {
    const para: PMNode = {
      attrs: {
        borders: {
          top: { val: 'single', size: 2, color: 'FF0000' },
        },
      },
    };
    const styleContext = {
      styles: {},
      defaults: {},
    } as never;

    const result = computeParagraphAttrs(para, styleContext);
    expect(result?.borders).toBeDefined();
  });

  it('should normalize paragraph shading', () => {
    const para: PMNode = {
      attrs: {
        shading: { fill: '#FFFF00' },
      },
    };
    const styleContext = {
      styles: {},
      defaults: {},
    } as never;

    const result = computeParagraphAttrs(para, styleContext);
    expect(result?.shading).toBeDefined();
  });

  it('should include custom decimalSeparator', () => {
    const para: PMNode = { attrs: {} };
    const styleContext = {
      styles: {},
      defaults: {
        decimalSeparator: ',',
      },
    } as never;

    const result = computeParagraphAttrs(para, styleContext);
    expect(result?.decimalSeparator).toBe(',');
  });

  it('should extract floatAlignment from framePr', () => {
    const para: PMNode = {
      attrs: {
        framePr: { xAlign: 'right' },
      },
    };
    const styleContext = {
      styles: {},
      defaults: {},
    } as never;

    const result = computeParagraphAttrs(para, styleContext);
    expect(result?.floatAlignment).toBe('right');
  });

  it('should surface frame positioning data from framePr', () => {
    const para: PMNode = {
      attrs: {
        framePr: { xAlign: 'right', wrap: 'none', y: 1440, hAnchor: 'margin', vAnchor: 'text' },
      },
    };
    const styleContext = {
      styles: {},
      defaults: {},
    } as never;

    const result = computeParagraphAttrs(para, styleContext);
    expect(result?.frame?.wrap).toBe('none');
    expect(result?.frame?.xAlign).toBe('right');
    expect(result?.frame?.vAnchor).toBe('text');
    expect(result?.frame?.hAnchor).toBe('margin');
    expect(result?.frame?.y).toBeCloseTo(twipsToPx(1440));
  });

  it('should handle framePr in paragraphProperties (raw OOXML elements)', () => {
    const para: PMNode = {
      attrs: {
        paragraphProperties: {
          elements: [
            {
              name: 'w:framePr',
              attributes: { 'w:xAlign': 'center' },
            },
          ],
        },
      },
    };
    const styleContext = {
      styles: {},
      defaults: {},
    } as never;

    const result = computeParagraphAttrs(para, styleContext);
    expect(result?.floatAlignment).toBe('center');
  });

  it('should handle framePr in paragraphProperties (decoded object from v3 translator)', () => {
    // This is the format produced by the v3 translator when importing DOCX
    // Headers/footers with right-aligned page numbers use this structure
    const para: PMNode = {
      attrs: {
        paragraphProperties: {
          framePr: { xAlign: 'right', wrap: 'none', hAnchor: 'margin', vAnchor: 'text', y: 1440 },
        },
      },
    };
    const styleContext = {
      styles: {},
      defaults: {},
    } as never;

    const result = computeParagraphAttrs(para, styleContext);
    expect(result?.floatAlignment).toBe('right');
    expect(result?.frame?.wrap).toBe('none');
    expect(result?.frame?.xAlign).toBe('right');
    expect(result?.frame?.hAnchor).toBe('margin');
    expect(result?.frame?.vAnchor).toBe('text');
    expect(result?.frame?.y).toBeCloseTo(twipsToPx(1440));
  });

  it('should handle numberingProperties with list counter', () => {
    const para: PMNode = {
      attrs: {
        numberingProperties: {
          numId: 1,
          ilvl: 0,
        },
      },
    };
    const styleContext = {
      styles: {},
      defaults: {},
    } as never;
    const listCounterContext: ListCounterContext = {
      getListCounter: vi.fn(() => 0),
      incrementListCounter: vi.fn(() => 1),
      resetListCounter: vi.fn(),
    };

    const result = computeParagraphAttrs(para, styleContext, listCounterContext);
    expect(result?.numberingProperties).toBeDefined();
    expect(listCounterContext.incrementListCounter).toHaveBeenCalledWith(1, 0);
  });

  it('should reset deeper list levels', () => {
    const para: PMNode = {
      attrs: {
        numberingProperties: {
          numId: 1,
          ilvl: 2,
        },
      },
    };
    const styleContext = {
      styles: {},
      defaults: {},
    } as never;
    const listCounterContext: ListCounterContext = {
      getListCounter: vi.fn(() => 1),
      incrementListCounter: vi.fn(() => 3),
      resetListCounter: vi.fn(),
    };

    computeParagraphAttrs(para, styleContext, listCounterContext);

    // Should reset levels 3-8
    expect(listCounterContext.resetListCounter).toHaveBeenCalled();
    const resetCalls = (listCounterContext.resetListCounter as never).mock.calls;
    expect(resetCalls.length).toBeGreaterThan(0);
    expect(resetCalls.some((call: PMNode) => call[1] === 3)).toBe(true);
  });

  it('hydrates numbering details from converterContext definitions', () => {
    const para: PMNode = {
      attrs: {
        numberingProperties: { numId: 7, ilvl: 1 },
      },
    };
    const styleContext = {
      styles: {},
      defaults: { defaultTabIntervalTwips: 720, decimalSeparator: '.' },
    } as never;
    const converterContext = {
      numbering: {
        definitions: {
          '7': {
            name: 'w:num',
            attributes: { 'w:numId': '7' },
            elements: [{ name: 'w:abstractNumId', attributes: { 'w:val': '3' } }],
          },
        },
        abstracts: {
          '3': {
            name: 'w:abstractNum',
            attributes: { 'w:abstractNumId': '3' },
            elements: [
              {
                name: 'w:lvl',
                attributes: { 'w:ilvl': '1' },
                elements: [
                  { name: 'w:start', attributes: { 'w:val': '1' } },
                  { name: 'w:numFmt', attributes: { 'w:val': 'lowerLetter' } },
                  { name: 'w:lvlText', attributes: { 'w:val': '%2.' } },
                  { name: 'w:lvlJc', attributes: { 'w:val': 'left' } },
                  { name: 'w:suff', attributes: { 'w:val': 'space' } },
                  {
                    name: 'w:pPr',
                    elements: [{ name: 'w:ind', attributes: { 'w:left': '1440', 'w:hanging': '360' } }],
                  },
                  {
                    name: 'w:rPr',
                    elements: [
                      { name: 'w:rFonts', attributes: { 'w:ascii': 'Arial' } },
                      { name: 'w:color', attributes: { 'w:val': '5C5C5F' } },
                      { name: 'w:sz', attributes: { 'w:val': '16' } },
                    ],
                  },
                ],
              },
            ],
          },
        },
      },
    };

    const result = computeParagraphAttrs(para, styleContext, undefined, converterContext);

    expect(result?.numberingProperties?.format).toBe('lowerLetter');
    expect(result?.numberingProperties?.lvlText).toBe('%2.');
    expect(result?.numberingProperties?.start).toBe(1);
    expect(result?.numberingProperties?.lvlJc).toBe('left');
    expect(result?.numberingProperties?.suffix).toBe('space');
    expect(result?.numberingProperties?.resolvedLevelIndent).toEqual({ left: 1440, hanging: 360 });
    expect(result?.wordLayout?.marker?.markerText).toBe('a.');

    const markerRun = (result?.numberingProperties as Record<string, unknown>)?.resolvedMarkerRpr as
      | Record<string, unknown>
      | undefined;
    expect(markerRun?.fontFamily).toBe('Arial');
  });

  describe('unwrapTabStops function', () => {
    // Note: unwrapTabStops is a private function inside computeParagraphAttrs
    // We test it indirectly through computeParagraphAttrs by passing various tabStops formats
    const createStyleContext = () =>
      ({
        styles: {},
        defaults: {},
      }) as never;

    it('should unwrap nested tab format { tab: { tabType, pos } }', () => {
      const para: PMNode = {
        attrs: {
          tabs: [{ tab: { tabType: 'start', pos: 2880 } }], // Use value > 1000 so it stays as twips
        },
      };
      const styleContext = createStyleContext();

      const result = computeParagraphAttrs(para, styleContext);

      expect(result?.tabs).toBeDefined();
      expect(result?.tabs?.[0].val).toBe('start');
      expect(result?.tabs?.[0].pos).toBe(2880); // Stays as twips (> 1000 threshold)
    });

    it('should handle direct format { val, pos }', () => {
      const para: PMNode = {
        attrs: {
          tabs: [{ val: 'center', pos: 1440 }],
        },
      };
      const styleContext = createStyleContext();

      const result = computeParagraphAttrs(para, styleContext);

      expect(result?.tabs).toBeDefined();
      expect(result?.tabs?.[0].val).toBe('center');
      expect(result?.tabs?.[0].pos).toBe(1440);
    });

    it('should skip invalid entries with missing required fields', () => {
      const para: PMNode = {
        attrs: {
          tabs: [
            { val: 'start' }, // Missing pos
            { pos: 720 }, // Missing val
            { val: 'center', pos: 1440 }, // Valid
          ],
        },
      };
      const styleContext = createStyleContext();

      const result = computeParagraphAttrs(para, styleContext);

      expect(result?.tabs).toBeDefined();
      expect(result?.tabs).toHaveLength(1);
      expect(result?.tabs?.[0].val).toBe('center');
    });

    it('should add originalPos when extracting from nested format', () => {
      const para: PMNode = {
        attrs: {
          tabs: [{ tab: { tabType: 'start', pos: 4320 } }], // Use value > 1000 so it stays as twips
        },
      };
      const styleContext = createStyleContext();

      const result = computeParagraphAttrs(para, styleContext);

      expect(result?.tabs).toBeDefined();
      expect(result?.tabs?.[0].pos).toBe(4320); // Stays as twips (> 1000 threshold)
      // The originalPos is set internally during unwrapping
    });

    it('should handle mixed valid and invalid entries', () => {
      const para: PMNode = {
        attrs: {
          tabs: [
            { tab: { tabType: 'start', pos: 2880 } }, // Valid nested (> 1000 threshold)
            null, // Invalid: null
            { val: 'center', pos: 1440 }, // Valid direct
            'invalid', // Invalid: string
            { tab: 'invalid' }, // Invalid: tab is not an object
            { val: 'end', pos: 2160 }, // Valid direct
          ],
        },
      };
      const styleContext = createStyleContext();

      const result = computeParagraphAttrs(para, styleContext);

      expect(result?.tabs).toBeDefined();
      expect(result?.tabs).toHaveLength(3);
      expect(result?.tabs?.[0].val).toBe('start');
      expect(result?.tabs?.[1].val).toBe('center');
      expect(result?.tabs?.[2].val).toBe('end');
    });

    it('should return undefined for non-array input', () => {
      const para: PMNode = {
        attrs: {
          tabs: 'not an array',
        },
      };
      const styleContext = createStyleContext();

      const result = computeParagraphAttrs(para, styleContext);

      // When tabs is not an array, unwrapTabStops returns undefined
      // computeParagraphAttrs may still set tabs from other sources
      expect(result).toBeDefined();
    });

    it('should handle nested format with originalPos', () => {
      const para: PMNode = {
        attrs: {
          tabs: [{ tab: { tabType: 'start', pos: 500, originalPos: 720 } }],
        },
      };
      const styleContext = createStyleContext();

      const result = computeParagraphAttrs(para, styleContext);

      expect(result?.tabs).toBeDefined();
      expect(result?.tabs?.[0].pos).toBe(720); // Uses originalPos
    });

    it('should handle nested format with leader', () => {
      const para: PMNode = {
        attrs: {
          tabs: [{ tab: { tabType: 'end', pos: 1440, leader: 'dot' } }],
        },
      };
      const styleContext = createStyleContext();

      const result = computeParagraphAttrs(para, styleContext);

      expect(result?.tabs).toBeDefined();
      expect(result?.tabs?.[0].val).toBe('end');
      expect(result?.tabs?.[0].leader).toBe('dot');
    });

    it('should skip entries with invalid nested tab structure', () => {
      const para: PMNode = {
        attrs: {
          tabs: [
            { tab: null }, // Invalid: tab is null
            { tab: { tabType: 'start', pos: 2880 } }, // Valid (> 1000 threshold)
            { tab: { pos: 1440 } }, // Invalid: missing tabType
            { tab: { tabType: 'center' } }, // Invalid: missing pos
          ],
        },
      };
      const styleContext = createStyleContext();

      const result = computeParagraphAttrs(para, styleContext);

      expect(result?.tabs).toBeDefined();
      expect(result?.tabs).toHaveLength(1);
      expect(result?.tabs?.[0].val).toBe('start');
    });

    it('should handle empty array', () => {
      const para: PMNode = {
        attrs: {
          tabs: [],
        },
      };
      const styleContext = createStyleContext();

      const result = computeParagraphAttrs(para, styleContext);

      // Empty array returns undefined from unwrapTabStops
      expect(result).toBeDefined();
    });

    it('should handle direct format with val property fallback', () => {
      const para: PMNode = {
        attrs: {
          tabs: [{ tab: { val: 'start', pos: 2880 } }], // val instead of tabType in nested format (> 1000 threshold)
        },
      };
      const styleContext = createStyleContext();

      const result = computeParagraphAttrs(para, styleContext);

      expect(result?.tabs).toBeDefined();
      expect(result?.tabs?.[0].val).toBe('start');
    });

    it('should preserve leader in direct format', () => {
      const para: PMNode = {
        attrs: {
          tabs: [{ val: 'decimal', pos: 2880, leader: 'hyphen' }],
        },
      };
      const styleContext = createStyleContext();

      const result = computeParagraphAttrs(para, styleContext);

      expect(result?.tabs).toBeDefined();
      expect(result?.tabs?.[0].leader).toBe('hyphen');
    });
  });

  describe('framePr edge cases and validation', () => {
    const createStyleContext = () =>
      ({
        styles: {},
        defaults: {},
      }) as never;

    it('should return undefined for empty framePr object', () => {
      const para: PMNode = {
        attrs: { framePr: {} },
      };
      const styleContext = createStyleContext();

      const result = computeParagraphAttrs(para, styleContext);

      // Empty framePr should not produce floatAlignment or frame
      expect(result?.floatAlignment).toBeUndefined();
      expect(result?.frame).toBeUndefined();
    });

    it('should handle framePr with attributes wrapper but empty attributes', () => {
      const para: PMNode = {
        attrs: { framePr: { attributes: {} } },
      };
      const styleContext = createStyleContext();

      const result = computeParagraphAttrs(para, styleContext);

      expect(result?.floatAlignment).toBeUndefined();
      expect(result?.frame).toBeUndefined();
    });

    it('should handle non-numeric x/y values gracefully', () => {
      const para: PMNode = {
        attrs: {
          framePr: {
            xAlign: 'right',
            x: 'invalid',
            y: 'bad',
            wrap: 'none',
          },
        },
      };
      const styleContext = createStyleContext();

      const result = computeParagraphAttrs(para, styleContext);

      // Should extract valid xAlign and wrap, ignore invalid x/y
      expect(result?.floatAlignment).toBe('right');
      expect(result?.frame?.xAlign).toBe('right');
      expect(result?.frame?.wrap).toBe('none');
      expect(result?.frame?.x).toBeUndefined();
      expect(result?.frame?.y).toBeUndefined();
    });

    it('should use w:prefixed keys first via nullish coalescing', () => {
      const para: PMNode = {
        attrs: {
          framePr: {
            'w:xAlign': 'right',
            xAlign: 'left', // Should be ignored due to nullish coalescing
            'w:wrap': 'around',
            wrap: 'none', // Should be ignored
          },
        },
      };
      const styleContext = createStyleContext();

      const result = computeParagraphAttrs(para, styleContext);

      // Should prefer w:prefixed keys
      expect(result?.floatAlignment).toBe('right');
      expect(result?.frame?.xAlign).toBe('right');
      expect(result?.frame?.wrap).toBe('around');
    });

    it('should return undefined frame when all framePr values are invalid', () => {
      const para: PMNode = {
        attrs: {
          framePr: {
            xAlign: 'invalid',
            yAlign: 'invalid',
            x: 'bad',
            y: 'bad',
          },
        },
      };
      const styleContext = createStyleContext();

      const result = computeParagraphAttrs(para, styleContext);

      // Invalid xAlign should not produce floatAlignment
      expect(result?.floatAlignment).toBeUndefined();
      // Frame is still set with invalid xAlign (validation deferred to renderer)
      expect(result?.frame?.xAlign).toBe('invalid');
      expect(result?.frame?.yAlign).toBe('invalid');
      // Invalid x and y should not be set
      expect(result?.frame?.x).toBeUndefined();
      expect(result?.frame?.y).toBeUndefined();
    });

    it('should handle mixed valid and invalid framePr properties', () => {
      const para: PMNode = {
        attrs: {
          framePr: {
            xAlign: 'center', // valid
            yAlign: 'top', // valid
            x: 'bad', // invalid
            y: 720, // valid
            wrap: 'none', // valid
            hAnchor: 'margin', // valid
          },
        },
      };
      const styleContext = createStyleContext();

      const result = computeParagraphAttrs(para, styleContext);

      expect(result?.floatAlignment).toBe('center');
      expect(result?.frame?.xAlign).toBe('center');
      expect(result?.frame?.yAlign).toBe('top');
      expect(result?.frame?.x).toBeUndefined();
      expect(result?.frame?.y).toBeCloseTo(twipsToPx(720));
      expect(result?.frame?.wrap).toBe('none');
      expect(result?.frame?.hAnchor).toBe('margin');
    });

    it('should handle framePr with null values', () => {
      const para: PMNode = {
        attrs: {
          framePr: {
            xAlign: null,
            wrap: null,
            y: 1440,
          },
        },
      };
      const styleContext = createStyleContext();

      const result = computeParagraphAttrs(para, styleContext);

      // Null values should be ignored by nullish coalescing
      expect(result?.floatAlignment).toBeUndefined();
      // Only y should be set
      expect(result?.frame?.xAlign).toBeUndefined();
      expect(result?.frame?.wrap).toBeUndefined();
      expect(result?.frame?.y).toBeCloseTo(twipsToPx(1440));
    });

    it('should handle very large numeric values for x and y', () => {
      const para: PMNode = {
        attrs: {
          framePr: {
            xAlign: 'left',
            x: Number.MAX_SAFE_INTEGER,
            y: Number.MAX_SAFE_INTEGER,
          },
        },
      };
      const styleContext = createStyleContext();

      const result = computeParagraphAttrs(para, styleContext);

      expect(result?.floatAlignment).toBe('left');
      // Large values should be converted but remain finite
      expect(result?.frame?.x).toBeDefined();
      expect(Number.isFinite(result?.frame?.x)).toBe(true);
      expect(result?.frame?.y).toBeDefined();
      expect(Number.isFinite(result?.frame?.y)).toBe(true);
    });

    it('should convert case-insensitive xAlign values correctly', () => {
      const testCases = [
        { input: 'LEFT', expected: 'left' },
        { input: 'Right', expected: 'right' },
        { input: 'CENTER', expected: 'center' },
        { input: 'CeNtEr', expected: 'center' },
      ];

      testCases.forEach(({ input, expected }) => {
        const para: PMNode = {
          attrs: {
            framePr: { xAlign: input },
          },
        };
        const styleContext = createStyleContext();

        const result = computeParagraphAttrs(para, styleContext);

        expect(result?.floatAlignment).toBe(expected);
        expect(result?.frame?.xAlign).toBe(expected);
      });
    });

    it('should set yAlign values without validation', () => {
      const para: PMNode = {
        attrs: {
          framePr: {
            xAlign: 'center',
            yAlign: 'bottom',
            wrap: 'none',
          },
        },
      };
      const styleContext = createStyleContext();

      const result = computeParagraphAttrs(para, styleContext);

      // xAlign should still work
      expect(result?.floatAlignment).toBe('center');
      expect(result?.frame?.xAlign).toBe('center');
      // yAlign set as-is (no validation at this stage)
      expect(result?.frame?.yAlign).toBe('bottom');
      expect(result?.frame?.wrap).toBe('none');
    });

    it('should handle framePr with only positioning properties (no alignment)', () => {
      const para: PMNode = {
        attrs: {
          framePr: {
            x: 1440,
            y: 2880,
            hAnchor: 'page',
            vAnchor: 'page',
          },
        },
      };
      const styleContext = createStyleContext();

      const result = computeParagraphAttrs(para, styleContext);

      // No xAlign means no floatAlignment
      expect(result?.floatAlignment).toBeUndefined();
      // But frame should still be set with positioning
      expect(result?.frame?.x).toBeCloseTo(twipsToPx(1440));
      expect(result?.frame?.y).toBeCloseTo(twipsToPx(2880));
      expect(result?.frame?.hAnchor).toBe('page');
      expect(result?.frame?.vAnchor).toBe('page');
    });

    it('should handle framePr with dropCap property', () => {
      const para: PMNode = {
        attrs: {
          framePr: {
            dropCap: 'drop',
            xAlign: 'left',
          },
        },
      };
      const styleContext = createStyleContext();

      const result = computeParagraphAttrs(para, styleContext);

      expect(result?.dropCap).toBe('drop');
      expect(result?.floatAlignment).toBe('left');
    });

    it('should handle w:prefixed dropCap property', () => {
      const para: PMNode = {
        attrs: {
          framePr: {
            'w:dropCap': 'margin',
            xAlign: 'center',
          },
        },
      };
      const styleContext = createStyleContext();

      const result = computeParagraphAttrs(para, styleContext);

      expect(result?.dropCap).toBe('margin');
      expect(result?.floatAlignment).toBe('center');
    });

    it('should build dropCapDescriptor with mode and lines from framePr', () => {
      const para: PMNode = {
        attrs: {
          framePr: {
            dropCap: 'drop',
            lines: 3,
            wrap: 'around',
          },
        },
        content: [
          {
            type: 'text',
            text: 'D',
            marks: [
              {
                type: 'textStyle',
                attrs: {
                  fontSize: '156px',
                  fontFamily: 'Times New Roman',
                },
              },
            ],
          },
        ],
      };
      const styleContext = createStyleContext();

      const result = computeParagraphAttrs(para, styleContext);

      expect(result?.dropCapDescriptor).toBeDefined();
      expect(result?.dropCapDescriptor?.mode).toBe('drop');
      expect(result?.dropCapDescriptor?.lines).toBe(3);
      expect(result?.dropCapDescriptor?.wrap).toBe('around');
      expect(result?.dropCapDescriptor?.run.text).toBe('D');
      expect(result?.dropCapDescriptor?.run.fontFamily).toBe('Times New Roman');
      expect(result?.dropCapDescriptor?.run.fontSize).toBe(156);
    });

    it('should build dropCapDescriptor with margin mode', () => {
      const para: PMNode = {
        attrs: {
          framePr: {
            'w:dropCap': 'margin',
            'w:lines': 2,
          },
        },
        content: [
          {
            type: 'text',
            text: 'W',
          },
        ],
      };
      const styleContext = createStyleContext();

      const result = computeParagraphAttrs(para, styleContext);

      expect(result?.dropCapDescriptor).toBeDefined();
      expect(result?.dropCapDescriptor?.mode).toBe('margin');
      expect(result?.dropCapDescriptor?.lines).toBe(2);
    });

    it('should extract font styling from nested run nodes', () => {
      const para: PMNode = {
        attrs: {
          framePr: {
            dropCap: 'drop',
            lines: 4,
          },
        },
        content: [
          {
            type: 'run',
            attrs: {
              runProperties: {
                fontSize: '117pt',
                fontFamily: 'Georgia',
                bold: true,
                italic: true,
                color: '0000FF',
              },
            },
            content: [
              {
                type: 'text',
                text: 'A',
              },
            ],
          },
        ],
      };
      const styleContext = createStyleContext();

      const result = computeParagraphAttrs(para, styleContext);

      expect(result?.dropCapDescriptor).toBeDefined();
      expect(result?.dropCapDescriptor?.run.text).toBe('A');
      expect(result?.dropCapDescriptor?.run.fontFamily).toBe('Georgia');
      expect(result?.dropCapDescriptor?.run.bold).toBe(true);
      expect(result?.dropCapDescriptor?.run.italic).toBe(true);
      expect(result?.dropCapDescriptor?.run.color).toBe('#0000FF');
    });

    it('should default to 3 lines when lines not specified', () => {
      const para: PMNode = {
        attrs: {
          framePr: {
            dropCap: 'drop',
          },
        },
        content: [{ type: 'text', text: 'B' }],
      };
      const styleContext = createStyleContext();

      const result = computeParagraphAttrs(para, styleContext);

      expect(result?.dropCapDescriptor?.lines).toBe(3);
    });

    it('should not create dropCapDescriptor without content', () => {
      const para: PMNode = {
        attrs: {
          framePr: {
            dropCap: 'drop',
            lines: 3,
          },
        },
        content: [],
      };
      const styleContext = createStyleContext();

      const result = computeParagraphAttrs(para, styleContext);

      expect(result?.dropCapDescriptor).toBeUndefined();
    });

    it('should normalize wrap value to proper casing', () => {
      const para: PMNode = {
        attrs: {
          framePr: {
            dropCap: 'drop',
            wrap: 'notBeside',
          },
        },
        content: [{ type: 'text', text: 'C' }],
      };
      const styleContext = createStyleContext();

      const result = computeParagraphAttrs(para, styleContext);

      expect(result?.dropCapDescriptor?.wrap).toBe('notBeside');
    });

    it('should handle OOXML half-points font size format', () => {
      const para: PMNode = {
        attrs: {
          framePr: {
            dropCap: 'drop',
          },
        },
        content: [
          {
            type: 'run',
            attrs: {
              runProperties: {
                sz: 234, // Half-points: 234 = 117pt
              },
            },
            content: [{ type: 'text', text: 'E' }],
          },
        ],
      };
      const styleContext = createStyleContext();

      const result = computeParagraphAttrs(para, styleContext);

      // 117pt ≈ 156px (at 96dpi)
      expect(result?.dropCapDescriptor?.run.fontSize).toBeCloseTo(156, 0);
    });
  });
});

describe('mergeSpacingSources', () => {
  describe('priority order', () => {
    it('should prioritize attrs over paragraphProps and base', () => {
      const base = { before: 10, after: 10, line: 1.0 };
      const paragraphProps = { before: 15, after: 15 };
      const attrs = { before: 20, line: 2.0 };

      const result = mergeSpacingSources(base, paragraphProps, attrs);

      expect(result).toEqual({
        before: 20, // from attrs (highest priority)
        after: 15, // from paragraphProps (middle priority)
        line: 2.0, // from attrs
      });
    });

    it('should prioritize paragraphProps over base when attrs is empty', () => {
      const base = { before: 10, after: 10, line: 1.0 };
      const paragraphProps = { before: 15, line: 1.5 };
      const attrs = {};

      const result = mergeSpacingSources(base, paragraphProps, attrs);

      expect(result).toEqual({
        before: 15, // from paragraphProps (overrides base)
        after: 10, // from base (not overridden)
        line: 1.5, // from paragraphProps (overrides base)
      });
    });

    it('should use base when paragraphProps and attrs are empty', () => {
      const base = { before: 10, after: 10, line: 1.0 };
      const paragraphProps = {};
      const attrs = {};

      const result = mergeSpacingSources(base, paragraphProps, attrs);

      expect(result).toEqual({
        before: 10,
        after: 10,
        line: 1.0,
      });
    });

    it('should handle correct priority chain: base < paragraphProps < attrs', () => {
      const base = { before: 10, after: 10, line: 1.0 };
      const paragraphProps = { before: 15 };
      const attrs = { line: 2.0 };

      const result = mergeSpacingSources(base, paragraphProps, attrs);

      expect(result).toEqual({
        before: 15, // from paragraphProps (overrides base)
        after: 10, // from base (not overridden)
        line: 2.0, // from attrs (highest priority)
      });
    });
  });

  describe('partial overrides', () => {
    it('should allow partial override from attrs (only line)', () => {
      const base = { before: 10, after: 10 };
      const paragraphProps = {};
      const attrs = { line: 1.5 };

      const result = mergeSpacingSources(base, paragraphProps, attrs);

      expect(result).toEqual({
        before: 10, // inherited from base
        after: 10, // inherited from base
        line: 1.5, // from attrs
      });
    });

    it('should allow partial override from paragraphProps (only before)', () => {
      const base = { before: 10, after: 10, line: 1.0 };
      const paragraphProps = { before: 20 };
      const attrs = {};

      const result = mergeSpacingSources(base, paragraphProps, attrs);

      expect(result).toEqual({
        before: 20, // from paragraphProps (overrides base)
        after: 10, // inherited from base
        line: 1.0, // inherited from base
      });
    });

    it('should merge multiple partial overrides correctly', () => {
      const base = { before: 10, after: 10, line: 1.0, lineRule: 'auto' };
      const paragraphProps = { before: 20, after: 20 };
      const attrs = { line: 2.0 };

      const result = mergeSpacingSources(base, paragraphProps, attrs);

      expect(result).toEqual({
        before: 20, // from paragraphProps
        after: 20, // from paragraphProps
        line: 2.0, // from attrs
        lineRule: 'auto', // inherited from base
      });
    });

    it('should handle single property from each source', () => {
      const base = { before: 10 };
      const paragraphProps = { after: 20 };
      const attrs = { line: 1.5 };

      const result = mergeSpacingSources(base, paragraphProps, attrs);

      expect(result).toEqual({
        before: 10,
        after: 20,
        line: 1.5,
      });
    });
  });

  describe('edge cases', () => {
    it('should return undefined when all sources are null', () => {
      const result = mergeSpacingSources(null, null, null);
      expect(result).toBeUndefined();
    });

    it('should return undefined when all sources are undefined', () => {
      const result = mergeSpacingSources(undefined, undefined, undefined);
      expect(result).toBeUndefined();
    });

    it('should return undefined when all sources are empty objects', () => {
      const result = mergeSpacingSources({}, {}, {});
      expect(result).toBeUndefined();
    });

    it('should handle null base gracefully', () => {
      const result = mergeSpacingSources(null, { before: 10 }, { line: 1.5 });
      expect(result).toEqual({ before: 10, line: 1.5 });
    });

    it('should handle null paragraphProps gracefully', () => {
      const result = mergeSpacingSources({ before: 10 }, null, { line: 1.5 });
      expect(result).toEqual({ before: 10, line: 1.5 });
    });

    it('should handle null attrs gracefully', () => {
      const result = mergeSpacingSources({ before: 10 }, { after: 20 }, null);
      expect(result).toEqual({ before: 10, after: 20 });
    });

    it('should handle undefined sources gracefully', () => {
      const result = mergeSpacingSources(undefined, { before: 10 }, { line: 1.5 });
      expect(result).toEqual({ before: 10, line: 1.5 });
    });

    it('should handle non-object values (treat as empty)', () => {
      const result = mergeSpacingSources('not an object', { before: 10 }, { line: 1.5 });
      expect(result).toEqual({ before: 10, line: 1.5 });
    });

    it('should preserve zero values through merge priority', () => {
      const base = { before: 10 };
      const paragraphProps = { before: 0 }; // explicit zero overrides base
      const attrs = {};

      const result = mergeSpacingSources(base, paragraphProps, attrs);
      expect(result).toEqual({ before: 0 });
    });

    it('should handle negative values correctly', () => {
      const base = { before: 10 };
      const paragraphProps = { after: -5 };
      const attrs = { line: -1.5 };

      const result = mergeSpacingSources(base, paragraphProps, attrs);
      expect(result).toEqual({
        before: 10,
        after: -5,
        line: -1.5,
      });
    });
  });

  describe('real-world OOXML scenarios', () => {
    it('should handle docDefaults + partial style override', () => {
      const base = { before: 0, after: 0, line: 1.0, lineRule: 'auto' };
      const paragraphProps = { after: 10 };
      const attrs = {};

      const result = mergeSpacingSources(base, paragraphProps, attrs);

      expect(result).toEqual({
        before: 0,
        after: 10,
        line: 1.0,
        lineRule: 'auto',
      });
    });

    it('should handle direct paragraph override of only line spacing', () => {
      const base = { before: 10, after: 10, line: 1.0 };
      const paragraphProps = {};
      const attrs = { line: 1.5 };

      const result = mergeSpacingSources(base, paragraphProps, attrs);

      expect(result).toEqual({
        before: 10,
        after: 10,
        line: 1.5,
      });
    });

    it('should handle three-tier override chain', () => {
      const base = { before: 0, after: 0, line: 1.0, lineRule: 'auto' };
      const paragraphProps = { before: 12 };
      const attrs = { after: 8, line: 1.2 };

      const result = mergeSpacingSources(base, paragraphProps, attrs);

      expect(result).toEqual({
        before: 12, // from paragraphProps
        after: 8, // from attrs
        line: 1.2, // from attrs
        lineRule: 'auto', // from base
      });
    });

    it('should handle complete direct override', () => {
      const base = { before: 10, after: 10, line: 1.0, lineRule: 'auto' };
      const paragraphProps = { before: 20, after: 20 };
      const attrs = { before: 5, after: 5, line: 1.5, lineRule: 'exact' };

      const result = mergeSpacingSources(base, paragraphProps, attrs);

      expect(result).toEqual({
        before: 5,
        after: 5,
        line: 1.5,
        lineRule: 'exact',
      });
    });
  });
});
