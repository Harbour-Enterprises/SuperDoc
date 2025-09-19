import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  collectRunProperties,
  buildRunAttrs,
  applyRunMarks,
  createRunMark,
  deriveStyleMarks,
  collectStyleMarks,
  collectStyleChain,
  findStyleTag,
  extractMarksFromStyle,
  mergeInlineMarkSets,
  mergeTextStyleAttrs,
  cloneRunAttrs,
  cloneMark,
  mergeRunAttrs,
  normalizeBool,
  resolveRunElement,
  ensureRunPropertiesContainer,
} from './helpers.js';

const makeDocxWithStyles = (styles) => ({
  'word/styles.xml': {
    elements: [
      {
        name: 'w:styles',
        elements: styles,
      },
    ],
  },
});

describe('w:r helper utilities', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('collectRunProperties', () => {
    it('uses translator output when available', () => {
      const mockTranslator = {
        encode: vi.fn().mockReturnValue({
          attributes: [{ xmlName: 'w:b', attributes: { 'w:val': '1' } }],
        }),
      };
      const rPrNode = { name: 'w:rPr', elements: [] };
      const { entries, hadRPr } = collectRunProperties({}, rPrNode, mockTranslator);

      expect(mockTranslator.encode).toHaveBeenCalled();
      expect(hadRPr).toBe(true);
      expect(entries).toEqual([{ xmlName: 'w:b', attributes: { 'w:val': '1' } }]);
    });

    it('falls back to raw rPr elements when translator yields nothing', () => {
      const mockTranslator = { encode: vi.fn().mockReturnValue({}) };
      const rPrNode = {
        name: 'w:rPr',
        elements: [{ name: 'w:color', attributes: { 'w:val': 'FF0000' } }],
      };
      const { entries } = collectRunProperties({}, rPrNode, mockTranslator);

      expect(mockTranslator.encode).toHaveBeenCalled();
      expect(entries).toEqual([{ xmlName: 'w:color', attributes: { 'w:val': 'FF0000' } }]);
    });

    it('returns empty entries when rPr node is missing', () => {
      const { entries, hadRPr } = collectRunProperties({}, null);
      expect(entries).toEqual([]);
      expect(hadRPr).toBe(false);
    });
  });

  describe('buildRunAttrs', () => {
    it('omits runProperties when they are empty', () => {
      expect(buildRunAttrs({ foo: 'bar' }, true, [])).toEqual({ foo: 'bar', runProperties: null });
      expect(buildRunAttrs({}, false, [])).toEqual({});
    });
  });

  describe('applyRunMarks', () => {
    it('adds run and inline marks, merging textStyle attrs', () => {
      const node = { type: 'text', text: 'Hello', marks: [] };
      const runAttrs = { runProperties: [{ xmlName: 'w:rStyle', attributes: { 'w:val': 'RunStyle' } }] };
      const inlineMarks = [{ type: 'bold' }];
      const textStyleAttrs = { fontFamily: 'Arial' };

      const result = applyRunMarks(node, runAttrs, inlineMarks, textStyleAttrs);
      expect(result.marks).toEqual([
        { type: 'run', attrs: runAttrs },
        { type: 'bold' },
        { type: 'textStyle', attrs: { fontFamily: 'Arial' } },
      ]);
    });

    it('merges with existing marks without duplication', () => {
      const node = {
        type: 'text',
        text: 'Hello',
        marks: [
          { type: 'run', attrs: { runProperties: [{ xmlName: 'w:color', attributes: { 'w:val': '00FF00' } }] } },
          { type: 'textStyle', attrs: { fontFamily: 'Times' } },
        ],
      };

      const runAttrs = { runProperties: [{ xmlName: 'w:sz', attributes: { 'w:val': '48' } }] };
      const inlineMarks = [{ type: 'bold' }];
      const textStyleAttrs = { fontSize: '24pt' };

      const result = applyRunMarks(node, runAttrs, inlineMarks, textStyleAttrs);
      const runMark = result.marks.find((m) => m.type === 'run');
      expect(runMark.attrs.runProperties).toEqual([
        { xmlName: 'w:color', attributes: { 'w:val': '00FF00' } },
        { xmlName: 'w:sz', attributes: { 'w:val': '48' } },
      ]);
      expect(result.marks.filter((m) => m.type === 'bold')).toHaveLength(1);
      const textStyle = result.marks.find((m) => m.type === 'textStyle');
      expect(textStyle.attrs).toEqual({ fontFamily: 'Times', fontSize: '24pt' });
    });
  });

  describe('createRunMark', () => {
    it('creates bare run mark when attrs empty', () => {
      expect(createRunMark()).toEqual({ type: 'run' });
    });

    it('clones provided attributes', () => {
      const attrs = { runProperties: [{ xmlName: 'w:b', attributes: {} }] };
      const mark = createRunMark(attrs);
      expect(mark).toEqual({ type: 'run', attrs: { runProperties: [{ xmlName: 'w:b', attributes: {} }] } });
      expect(mark.attrs.runProperties).not.toBe(attrs.runProperties);
    });
  });

  describe('style chain helpers', () => {
    let docx;

    beforeEach(() => {
      docx = makeDocxWithStyles([
        {
          name: 'w:style',
          attributes: { 'w:styleId': 'Base' },
          elements: [
            {
              name: 'w:rPr',
              elements: [{ name: 'w:rFonts', attributes: { 'w:ascii': 'Times' } }],
            },
          ],
        },
        {
          name: 'w:style',
          attributes: { 'w:styleId': 'Derived' },
          elements: [
            { name: 'w:basedOn', attributes: { 'w:val': 'Base' } },
            {
              name: 'w:rPr',
              elements: [{ name: 'w:color', attributes: { 'w:val': 'FF0000' } }],
            },
          ],
        },
      ]);
    });

    it('deriveStyleMarks merges paragraph and run styles', () => {
      const result = deriveStyleMarks({ docx, paragraphStyleId: 'Base', runStyleId: 'Derived' });
      expect(result.textStyleAttrs).toEqual({ fontFamily: 'Times, sans-serif', color: '#FF0000' });
      expect(result.inlineMarks).toEqual([]);
    });

    it('collectStyleMarks prevents infinite recursion via seen set', () => {
      const seen = new Set();
      seen.add('Derived');
      const result = collectStyleMarks('Derived', docx, seen);
      expect(result).toEqual({ inlineMarks: [], textStyleAttrs: null });
    });

    it('collectStyleChain returns basedOn chain before current', () => {
      const chain = collectStyleChain('Derived', docx, new Set());
      expect(chain).toHaveLength(2);
      expect(chain[0].attributes['w:styleId']).toBe('Base');
      expect(chain[1].attributes['w:styleId']).toBe('Derived');
    });

    it('findStyleTag locates styles regardless of nesting', () => {
      expect(findStyleTag(docx, 'Derived')?.attributes?.['w:styleId']).toBe('Derived');
      expect(findStyleTag({}, 'Missing')).toBeNull();
    });

    it('extractMarksFromStyle splits textStyle and inline marks', () => {
      const styleTag = findStyleTag(docx, 'Derived');
      const { inlineMarks, textStyleAttrs } = extractMarksFromStyle(styleTag, docx);
      expect(inlineMarks).toEqual([]);
      expect(textStyleAttrs).toEqual({ color: '#FF0000' });
    });
  });

  describe('merge helpers', () => {
    it('mergeInlineMarkSets deduplicates by mark type', () => {
      const merged = mergeInlineMarkSets(
        [{ type: 'bold' }, { type: 'italic' }],
        [{ type: 'italic' }, { type: 'underline', attrs: { underlineType: 'single' } }],
      );
      expect(merged).toEqual([
        { type: 'bold' },
        { type: 'italic' },
        { type: 'underline', attrs: { underlineType: 'single' } },
      ]);
    });

    it('mergeTextStyleAttrs merges objects and drops empty results', () => {
      expect(mergeTextStyleAttrs({ color: '#FF0000' }, null, { fontFamily: 'Arial' })).toEqual({
        color: '#FF0000',
        fontFamily: 'Arial',
      });
      expect(mergeTextStyleAttrs(null, {})).toBeNull();
    });

    it('cloneRunAttrs deep copies runProperties array', () => {
      const attrs = { runProperties: [{ xmlName: 'w:rStyle', attributes: { 'w:val': 'Style' } }] };
      const clone = cloneRunAttrs(attrs);
      expect(clone).toEqual(attrs);
      expect(clone.runProperties).not.toBe(attrs.runProperties);
    });

    it('cloneMark copies nested runProperties', () => {
      const mark = { type: 'run', attrs: { runProperties: [{ xmlName: 'w:b', attributes: {} }] } };
      const clone = cloneMark(mark);
      expect(clone).toEqual(mark);
      expect(clone.attrs.runProperties).not.toBe(mark.attrs.runProperties);
    });

    it('mergeRunAttrs combines runProperties without duplication', () => {
      const existing = { runProperties: [{ xmlName: 'w:b', attributes: {} }] };
      const incoming = {
        runProperties: [
          { xmlName: 'w:b', attributes: {} },
          { xmlName: 'w:color', attributes: { 'w:val': 'FF' } },
        ],
      };
      expect(mergeRunAttrs(existing, incoming)).toEqual({
        runProperties: [
          { xmlName: 'w:b', attributes: {} },
          { xmlName: 'w:color', attributes: { 'w:val': 'FF' } },
        ],
      });
    });
  });

  describe('normalizeBool', () => {
    it('handles boolean-like inputs', () => {
      expect(normalizeBool(true)).toBe(true);
      expect(normalizeBool(false)).toBe(false);
      expect(normalizeBool(0)).toBe(false);
      expect(normalizeBool('false')).toBe(false);
      expect(normalizeBool('on')).toBe(true);
      expect(normalizeBool(undefined)).toBe(true);
    });
  });

  describe('resolveRunElement & ensureRunPropertiesContainer', () => {
    it('resolves run element directly or nested', () => {
      const direct = { name: 'w:r' };
      expect(resolveRunElement(direct)).toBe(direct);

      const nested = { name: 'w:hyperlink', elements: [{ name: 'w:r' }] };
      expect(resolveRunElement(nested)).toBe(nested.elements[0]);
      expect(resolveRunElement({ name: 'w:p' })).toBeNull();
    });

    it('ensures run properties container exists and is reusable', () => {
      const run = { name: 'w:r', elements: [] };
      const rPr = ensureRunPropertiesContainer(run);
      expect(rPr).toEqual({ name: 'w:rPr', elements: [] });
      expect(run.elements[0]).toBe(rPr);

      const existing = ensureRunPropertiesContainer(run);
      expect(existing).toBe(rPr);
    });
  });
});
