import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  collectRunProperties,
  buildRunAttrs,
  applyRunMarks,
  deriveStyleMarks,
  collectStyleMarks,
  collectStyleChain,
  findStyleTag,
  extractMarksFromStyle,
  mergeInlineMarkSets,
  mergeTextStyleAttrs,
  cloneRunAttrs,
  cloneMark,
  createRunPropertiesElement,
  normalizeBool,
  cloneXmlNode,
  applyRunPropertiesTemplate,
  normalizeTextStyleAttrsForNode,
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
    it('adds inline marks and merges textStyle attrs', () => {
      const node = { type: 'text', text: 'Hello', marks: [] };
      const inlineMarks = [{ type: 'bold' }];
      const textStyleAttrs = { fontFamily: 'Arial' };

      const result = applyRunMarks(node, inlineMarks, textStyleAttrs);
      expect(result.marks).toEqual([{ type: 'bold' }, { type: 'textStyle', attrs: { fontFamily: 'Arial' } }]);
    });

    it('merges with existing marks without duplication', () => {
      const node = {
        type: 'text',
        text: 'Hello',
        marks: [{ type: 'textStyle', attrs: { fontFamily: 'Times' } }],
      };

      const inlineMarks = [{ type: 'bold' }];
      const textStyleAttrs = { fontSize: '24pt' };

      const result = applyRunMarks(node, inlineMarks, textStyleAttrs);
      expect(result.marks.filter((m) => m.type === 'bold')).toHaveLength(1);
      const textStyle = result.marks.find((m) => m.type === 'textStyle');
      expect(textStyle.attrs).toEqual({ fontFamily: 'Times', fontSize: '24pt' });
    });

    it('preserves latin font when east Asia font is present but unused', () => {
      const node = { type: 'text', text: 'Hello', marks: [] };
      const textStyleAttrs = {
        fontFamily: 'Helvetica, sans-serif',
        eastAsiaFontFamily: 'Meiryo, sans-serif',
      };

      const result = applyRunMarks(node, [], textStyleAttrs);
      expect(result.marks).toEqual([{ type: 'textStyle', attrs: { fontFamily: 'Helvetica, sans-serif' } }]);
    });

    it('uses east Asia font when text includes east Asian characters', () => {
      const node = { type: 'text', text: '你好', marks: [] };
      const textStyleAttrs = {
        fontFamily: 'Helvetica, sans-serif',
        eastAsiaFontFamily: 'Meiryo, sans-serif',
      };

      const result = applyRunMarks(node, [], textStyleAttrs);
      expect(result.marks).toEqual([{ type: 'textStyle', attrs: { fontFamily: 'Meiryo, sans-serif' } }]);
    });

    it('drops east Asia font hint when there are no applicable characters or other attrs', () => {
      const node = { type: 'text', text: 'Hello', marks: [] };
      const textStyleAttrs = { eastAsiaFontFamily: 'Meiryo, sans-serif' };

      const result = applyRunMarks(node, [], textStyleAttrs);
      expect(result.marks).toEqual([]);
    });
  });

  describe('normalizeTextStyleAttrsForNode', () => {
    it('returns null when attrs are falsy', () => {
      expect(normalizeTextStyleAttrsForNode(null, { type: 'text', text: 'Hello' })).toBeNull();
    });

    it('uses east Asia font only when node contains East Asian characters', () => {
      const attrs = { fontFamily: 'Helvetica, sans-serif', eastAsiaFontFamily: 'Meiryo, sans-serif' };

      const latinResult = normalizeTextStyleAttrsForNode(attrs, { type: 'text', text: 'Hello' });
      expect(latinResult).toEqual({ fontFamily: 'Helvetica, sans-serif' });

      const eastAsiaResult = normalizeTextStyleAttrsForNode(attrs, { type: 'text', text: '你好' });
      expect(eastAsiaResult).toEqual({ fontFamily: 'Meiryo, sans-serif' });
    });

    it('drops east Asia hint when node has no text and no primary font', () => {
      const attrs = { eastAsiaFontFamily: 'Meiryo, sans-serif' };
      expect(normalizeTextStyleAttrsForNode(attrs, { type: 'text', text: '' })).toBeNull();
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

    it('deriveStyleMarks ignores run styles for TOC paragraphs', () => {
      const tocDocx = makeDocxWithStyles([
        {
          name: 'w:style',
          attributes: { 'w:styleId': 'TOC1' },
          elements: [
            {
              name: 'w:rPr',
              elements: [{ name: 'w:b' }],
            },
          ],
        },
        {
          name: 'w:style',
          attributes: { 'w:styleId': 'RunStyle' },
          elements: [
            {
              name: 'w:rPr',
              elements: [{ name: 'w:i' }],
            },
          ],
        },
      ]);
      const result = deriveStyleMarks({ docx: tocDocx, paragraphStyleId: 'TOC1', runStyleId: 'RunStyle' });
      expect(result.inlineMarks).toEqual([{ type: 'bold' }]);
      expect(result.textStyleAttrs).toBeNull();
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

    it('cloneXmlNode deep clones nested elements', () => {
      const node = {
        name: 'w:r',
        attributes: { id: '1' },
        elements: [{ name: 'w:t', elements: [{ type: 'text', text: 'Hello' }] }],
      };
      const clone = cloneXmlNode(node);
      expect(clone).toEqual(node);
      expect(clone).not.toBe(node);
      expect(clone.elements[0]).not.toBe(node.elements[0]);
      expect(clone.elements[0].elements[0]).not.toBe(node.elements[0].elements[0]);
    });

    it('applyRunPropertiesTemplate adds run props to nodes', () => {
      const template = {
        name: 'w:rPr',
        attributes: { 'w:rsidR': '001' },
        elements: [{ name: 'w:b' }, { name: 'w:color', attributes: { 'w:val': 'FF0000' } }],
      };

      const runNode = { name: 'w:r', elements: [{ name: 'w:t' }] };
      applyRunPropertiesTemplate(runNode, template);

      const rPr = runNode.elements[0];
      expect(rPr.name).toBe('w:rPr');
      expect(rPr.attributes).toEqual({ 'w:rsidR': '001' });
      expect(rPr.elements).toHaveLength(2);
      expect(rPr.elements[0]).toEqual({ name: 'w:b' });
      expect(rPr.elements[0]).not.toBe(template.elements[0]);
      expect(rPr.elements[1]).toEqual({ name: 'w:color', attributes: { 'w:val': 'FF0000' } });

      applyRunPropertiesTemplate(runNode, template);
      expect(rPr.elements).toHaveLength(2);
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

  describe('createRunPropertiesElement', () => {
    it('returns null when entries are empty', () => {
      expect(createRunPropertiesElement()).toBeNull();
      expect(createRunPropertiesElement([])).toBeNull();
    });

    it('builds a w:rPr node from run property entries', () => {
      const element = createRunPropertiesElement([
        { xmlName: 'w:color', attributes: { 'w:val': 'FF0000' } },
        { xmlName: 'w:rStyle', attributes: { 'w:val': 'Heading1' } },
      ]);
      expect(element).toEqual({
        name: 'w:rPr',
        elements: [
          { name: 'w:color', attributes: { 'w:val': 'FF0000' } },
          { name: 'w:rStyle', attributes: { 'w:val': 'Heading1' } },
        ],
      });
    });
  });
});
