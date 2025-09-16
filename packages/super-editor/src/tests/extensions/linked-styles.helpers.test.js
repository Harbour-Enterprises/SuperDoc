import { describe, it, expect, beforeEach } from 'vitest';
import {
  LIST_NODE_TYPES,
  PLAIN_STYLE_KEYS,
  MARK_KEY_TO_CSS,
  isListNode,
  isTruthyStyleValue,
  colorFromStyleValue,
  mergeCssString,
  flattenNodeMarks,
  hasInlineMarkOff,
  hasInlineMarkOn,
  getLinkedStyle,
  getSpacingStyle,
  getSpacingStyleString,
  getMarksStyle,
  getQuickFormatList,
  generateLinkedStyleString,
  applyLinkedStyleToTransaction,
} from '../../extensions/linked-styles/helpers.js';
import { initTestEditor, loadTestDataForEditorTests } from '../helpers/helpers.js';

describe('linked-styles helpers', () => {
  it('exports constants', () => {
    expect(LIST_NODE_TYPES).toBeInstanceOf(Set);
    expect(PLAIN_STYLE_KEYS).toBeInstanceOf(Set);
    expect(typeof MARK_KEY_TO_CSS).toBe('object');
  });

  it('isListNode works', () => {
    expect(isListNode({ type: { name: 'orderedList' } })).toBe(true);
    expect(isListNode({ type: { name: 'paragraph' } })).toBe(false);
  });

  it('isTruthyStyleValue filters false/"0"', () => {
    expect(isTruthyStyleValue('0')).toBe(false);
    expect(isTruthyStyleValue(false)).toBe(false);
    expect(isTruthyStyleValue({ value: '0' })).toBe(false);
    expect(isTruthyStyleValue({ value: '1' })).toBe(true);
    expect(isTruthyStyleValue(true)).toBe(true);
  });

  it('colorFromStyleValue handles string and object', () => {
    expect(colorFromStyleValue('#fff')).toBe('#fff');
    expect(colorFromStyleValue({ color: '#000' })).toBe('#000');
    expect(colorFromStyleValue({})).toBeUndefined();
  });

  it('mergeCssString parses css string into map', () => {
    const m = {};
    mergeCssString(m, 'font-weight: bold; color: #000');
    expect(m['font-weight']).toBe('bold');
    expect(m['color']).toBe('#000');
  });

  it('flattenNodeMarks flattens textStyle and simple marks', () => {
    const node = {
      marks: [
        { type: { name: 'textStyle' }, attrs: { fontSize: '12pt', fontFamily: 'Arial' } },
        { type: { name: 'bold' }, attrs: {} },
      ],
    };
    const out = flattenNodeMarks(node);
    const keys = out.map((e) => e.key);
    expect(keys).toContain('font-size');
    expect(keys).toContain('font-family');
    expect(keys).toContain('bold');
  });

  it('hasInlineMarkOff/On detect mark states', () => {
    const node = {
      marks: [
        { type: { name: 'bold' }, attrs: { value: '0' } },
        { type: { name: 'italic' }, attrs: { value: '1' } },
      ],
    };
    expect(hasInlineMarkOff(node, 'bold')).toBe(true);
    expect(hasInlineMarkOn(node, 'bold')).toBe(false);
    expect(hasInlineMarkOn(node, 'italic')).toBe(true);
  });

  it('getLinkedStyle returns linked style and basedOn', () => {
    const styles = [
      { id: 'A', definition: { attrs: {} } },
      { id: 'B', definition: { attrs: { basedOn: 'A' } } },
    ];
    const res = getLinkedStyle('B', styles);
    expect(res.linkedStyle.id).toBe('B');
    expect(res.basedOnStyle.id).toBe('A');
  });

  it('getSpacingStyle and getSpacingStyleString', () => {
    const spacing = { lineSpaceBefore: 10, lineSpaceAfter: 5, line: 0 };
    const obj = getSpacingStyle(spacing);
    expect(obj['margin-top']).toBe('10px');
    expect(obj['margin-bottom']).toBe('5px');
    const s = getSpacingStyleString(spacing);
    expect(s).toContain('margin-top: 10px');
    expect(s).toContain('margin-bottom: 5px');
  });

  it('getMarksStyle builds css from attrs', () => {
    const attrs = [
      { type: 'bold' },
      { type: 'italic' },
      { type: 'underline' },
      { type: 'highlight', attrs: { color: '#ff0' } },
      { type: 'textStyle', attrs: { fontFamily: 'Arial', fontSize: '12pt' } },
    ];
    const s = getMarksStyle(attrs);
    expect(s).toContain('font-weight');
    expect(s).toContain('font-style');
    expect(s).toContain('text-decoration');
    expect(s).toContain('background-color: #ff0');
    expect(s).toContain('font-family: Arial');
    expect(s).toContain('font-size: 12pt');
  });

  it('getQuickFormatList filters and sorts paragraph styles', () => {
    const editor = {
      converter: {
        linkedStyles: [
          { id: 'H1', type: 'paragraph', definition: { attrs: { name: 'Zed' } } },
          { id: 'H2', type: 'paragraph', definition: { attrs: { name: 'Alpha' } } },
          { id: 'R', type: 'character', definition: { attrs: { name: 'Char' } } },
        ],
      },
    };
    const list = getQuickFormatList(editor);
    expect(list.map((s) => s.id)).toEqual(['H2', 'H1']);
  });

  it('generateLinkedStyleString applies simple styles (bold, italic, font-size)', () => {
    const linkedStyle = { definition: { styles: { bold: '1', italic: '1', 'font-size': '14pt' }, attrs: {} } };
    const basedOnStyle = null;
    const node = { type: { name: 'text' }, marks: [] };
    const parent = { type: { name: 'paragraph' }, attrs: {} };
    const css = generateLinkedStyleString(linkedStyle, basedOnStyle, node, parent);
    expect(css).toContain('font-weight: bold');
    expect(css).toContain('font-style: italic');
    expect(css).toContain('font-size: 14pt');
  });

  it('generateLinkedStyleString respects underline none mark override', () => {
    const linkedStyle = { definition: { styles: { underline: { value: 'single', color: '#f00' } }, attrs: {} } };
    const node = { type: { name: 'text' }, marks: [{ type: { name: 'underline' }, attrs: { underlineType: 'none' } }] };
    const css = generateLinkedStyleString(linkedStyle, null, node, { attrs: {} });
    expect(css).toContain('text-decoration: none');
  });

  describe('applyLinkedStyleToTransaction', () => {
    let docx, media, mediaFiles, fonts, editor;
    beforeEach(async () => ({ docx, media, mediaFiles, fonts } = await loadTestDataForEditorTests('paragraph_spacing_missing.docx')));
    beforeEach(() => ({ editor } = initTestEditor({ content: docx, media, mediaFiles, fonts })));

    it('applies style to current paragraph and clears marks', () => {
      const tr = editor.state.tr;
      const style = { id: 'Heading1' };
      const ok = applyLinkedStyleToTransaction(tr, editor, style);
      expect(ok).toBe(true);
      // Dispatch the tr to apply changes
      editor.view.dispatch(tr);
      // Check first paragraph got styleId set
      const firstPara = editor.state.doc.content.content.find((n) => n.type.name === 'paragraph');
      expect(firstPara?.attrs?.styleId).toBe('Heading1');
    });
  });
});

