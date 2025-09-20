import { describe, expect, it, beforeEach, vi } from 'vitest';

const fakeMarkType = {
  name: 'textStyle',
  isInSet: (marks) => marks.some((mark) => mark.type === fakeMarkType),
};

const getStateMock = vi.fn(() => null);

vi.mock('../../linked-styles/index.js', () => ({
  LinkedStylesPluginKey: {
    getState: (state) => getStateMock(state),
  },
}));

vi.mock('@core/helpers/index.js', () => ({
  getMarkType: vi.fn(() => fakeMarkType),
}));

vi.mock('@core/utilities/index.js', () => ({
  parseSizeUnit: (value) => {
    if (typeof value !== 'string') return [Number.NaN, undefined];
    const match = value.trim().match(/^([0-9]+(?:\.[0-9]+)?)([a-z%]*)$/i);
    if (!match) return [Number.NaN, undefined];
    const [, numeric, unit] = match;
    return [Number(numeric), unit || 'pt'];
  },
}));

import {
  collectTextStyleMarks,
  deriveFontStylesFromNode,
  parseSizeFromRunProperties,
  parseFontFamilyFromRunProperties,
  getAdjacentListItemNodeView,
  readNodeViewStyles,
  resolveListItemTypography,
} from './listItemTypography.js';

const textNode = (marks = []) => ({
  type: { name: 'text' },
  marks,
  isText: true,
  childCount: 0,
  forEach: () => {},
});

const fieldAnnotationNode = (attrs = {}) => ({
  type: { name: 'fieldAnnotation' },
  attrs,
  marks: [],
  isText: false,
  childCount: 0,
  forEach: () => {},
});

const paragraphNode = (children = [], attrs = {}) => ({
  type: { name: 'paragraph' },
  attrs,
  marks: [],
  isText: false,
  childCount: children.length,
  firstChild: children[0],
  forEach: (fn) => children.forEach(fn),
});

const listItemNode = (children = [], attrs = {}) => ({
  attrs,
  childCount: children.length,
  firstChild: children[0],
  forEach: (fn) => children.forEach(fn),
  nodeSize: 1,
});

beforeEach(() => {
  getStateMock.mockReset();
  getStateMock.mockReturnValue({ decorations: { find: () => [] } });
});

describe('collectTextStyleMarks', () => {
  it('collects unique textStyle marks and preserves line height', () => {
    const mark = { type: fakeMarkType, attrs: { fontSize: '12pt' } };
    const duplicateMark = { type: fakeMarkType, attrs: { fontFamily: 'Arial' } };
    const paragraph = paragraphNode([textNode([mark, duplicateMark]), textNode([mark])], { lineHeight: '1.5' });
    const listItem = listItemNode([paragraph]);

    const { marks, attrs } = collectTextStyleMarks(listItem, fakeMarkType);

    expect(marks).toHaveLength(2);
    expect(marks[0]).toBe(mark);
    expect(marks[1]).toBe(duplicateMark);
    expect(attrs.lineHeight).toBe('1.5');
  });
});

describe('deriveFontStylesFromNode', () => {
  it('prefers mark-provided size and family', () => {
    const mark = { type: fakeMarkType, attrs: { fontSize: '14pt', fontFamily: 'Georgia' } };
    const listItem = listItemNode([paragraphNode([textNode([mark])])]);

    const result = deriveFontStylesFromNode({
      node: listItem,
      textStyleType: fakeMarkType,
      defaultFont: 'Times New Roman',
      defaultSize: '10pt',
    });

    expect(result.fontSize).toBe('14pt');
    expect(result.fontFamily).toBe('Georgia');
    expect(result.hasSize).toBe(true);
    expect(result.hasFamily).toBe(true);
  });

  it('falls back to list run properties when marks are absent', () => {
    const listItem = listItemNode([paragraphNode([])]);
    const result = deriveFontStylesFromNode({
      node: listItem,
      textStyleType: fakeMarkType,
      defaultFont: 'Times',
      defaultSize: '10pt',
      listRunProperties: { 'w:val': 28, 'w:ascii': 'Calibri' },
    });

    expect(result.fontSize).toBe('14pt');
    expect(result.fontFamily).toBe('Calibri');
    expect(result.hasSize).toBe(true);
    expect(result.hasFamily).toBe(true);
  });

  it('uses field annotation attributes when lone child is annotation', () => {
    const annotation = fieldAnnotationNode({ fontSize: '18pt', fontFamily: 'Courier New' });
    const paragraph = paragraphNode([annotation]);
    const listItem = listItemNode([paragraph]);

    const result = deriveFontStylesFromNode({
      node: listItem,
      textStyleType: fakeMarkType,
      defaultFont: 'Times',
      defaultSize: '10pt',
    });

    expect(result.fontSize).toBe('18pt');
    expect(result.fontFamily).toBe('Courier New');
  });
});

describe('parse run property helpers', () => {
  it('converts half-point run sizes to points', () => {
    expect(parseSizeFromRunProperties({ 'w:val': 32 })).toBe('16pt');
    expect(parseSizeFromRunProperties({ 'w:sz': 20 })).toBe('10pt');
    expect(parseSizeFromRunProperties({})).toBeNull();
  });

  it('extracts font family variants', () => {
    expect(parseFontFamilyFromRunProperties({ 'w:ascii': 'Calibri' })).toBe('Calibri');
    expect(parseFontFamilyFromRunProperties({ 'w:hAnsi': 'Cambria' })).toBe('Cambria');
    expect(parseFontFamilyFromRunProperties({ 'w:eastAsia': 'MS Mincho' })).toBe('MS Mincho');
    expect(parseFontFamilyFromRunProperties({})).toBeNull();
  });
});

describe('getAdjacentListItemNodeView', () => {
  it('returns the closest preceding node view', () => {
    const previousView = { getPos: () => 0 };
    const currentView = { getPos: () => 1 };
    const nextView = { getPos: () => 5 };
    const active = new Set([previousView, currentView, nextView]);

    const result = getAdjacentListItemNodeView({
      nodeView: currentView,
      pos: 2,
      direction: -1,
      activeNodeViews: active,
    });

    expect(result).toBe(previousView);
  });
});

describe('readNodeViewStyles', () => {
  it('prefers inline styles when present', () => {
    const view = { dom: { style: { fontSize: '12pt', fontFamily: 'Arial', lineHeight: '1.4' } } };
    expect(readNodeViewStyles(view)).toEqual({ fontSize: '12pt', fontFamily: 'Arial', lineHeight: '1.4' });
  });
});

describe('resolveListItemTypography', () => {
  it('inherits typography from preceding list item and node view when marks are absent', () => {
    const firstMark = { type: fakeMarkType, attrs: { fontSize: '14pt', fontFamily: 'Calibri' } };
    const firstParagraph = paragraphNode([textNode([firstMark])], { lineHeight: '1.3' });
    const firstItem = listItemNode([firstParagraph]);

    const secondParagraph = paragraphNode([]);
    const secondItem = listItemNode([secondParagraph]);

    const nodes = [firstItem, secondItem];
    const parentDoc = {
      childCount: nodes.length,
      child: (index) => nodes[index],
    };

    const editor = {
      schema: {},
      view: {
        state: {
          doc: {
            resolve: (pos) => ({
              depth: 1,
              node: (depth) => (depth === 0 ? parentDoc : null),
              index: () => pos,
            }),
          },
        },
      },
    };

    const previousView = {
      getPos: () => 0,
      dom: { style: { fontSize: '14pt', fontFamily: 'Calibri', lineHeight: '1.4' } },
    };

    const currentView = {
      getPos: () => 1,
      dom: { style: {} },
    };

    const activeViews = new Set([previousView, currentView]);

    const result = resolveListItemTypography({
      node: secondItem,
      pos: 1,
      editor,
      nodeView: currentView,
      activeNodeViews: activeViews,
    });

    expect(result.fontSize).toBe('14pt');
    expect(result.fontFamily).toBe('Calibri');
    expect(result.lineHeight).toBe('1.4');
  });
});
