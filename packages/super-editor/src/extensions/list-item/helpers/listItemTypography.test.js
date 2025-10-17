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
  findSiblingListItem,
  getStylesFromLinkedStyles,
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
  type: { name: 'listItem' },
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

const originalGetComputedStyle = globalThis.window?.getComputedStyle;

afterEach(() => {
  if (originalGetComputedStyle) {
    globalThis.window.getComputedStyle = originalGetComputedStyle;
  }
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

  it('returns empty results when mark type is unavailable', () => {
    const paragraph = paragraphNode([textNode([])], { lineHeight: '2' });
    const listItem = listItemNode([paragraph]);

    const result = collectTextStyleMarks(listItem, null);

    expect(result).toEqual({ marks: [], attrs: {} });
  });

  it('ignores null child nodes safely', () => {
    const paragraph = paragraphNode([null, textNode([])]);
    const listItem = listItemNode([paragraph]);

    expect(() => collectTextStyleMarks(listItem, fakeMarkType)).not.toThrow();
  });

  it('treats non-array marks as empty', () => {
    const customText = { ...textNode(), marks: null };
    const paragraph = paragraphNode([customText]);
    const listItem = listItemNode([paragraph]);

    const { marks } = collectTextStyleMarks(listItem, fakeMarkType);

    expect(marks).toHaveLength(0);
  });

  it('skips nodes that are not paragraphs', () => {
    const otherNode = { type: { name: 'heading' } };
    const listItem = listItemNode([otherNode]);

    const { marks } = collectTextStyleMarks(listItem, fakeMarkType);

    expect(marks).toHaveLength(0);
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

  it('handles missing textStyleType by returning defaults', () => {
    const listItem = listItemNode([paragraphNode([])]);

    const result = deriveFontStylesFromNode({
      node: listItem,
      textStyleType: null,
      defaultFont: 'Arial',
      defaultSize: '11pt',
    });

    expect(result.fontSize).toBe('11pt');
    expect(result.fontFamily).toBe('Arial');
    expect(result.hasFamily).toBe(false);
    expect(result.hasSize).toBe(false);
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

  it('ignores invalid size values', () => {
    expect(parseSizeFromRunProperties({ 'w:val': 'abc' })).toBeNull();
    expect(parseSizeFromRunProperties({ 'w:val': 0 })).toBeNull();
    expect(parseSizeFromRunProperties(null)).toBeNull();
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

  it('uses resolved positions when available on adjacent views', () => {
    const previousView = { getResolvedPos: () => 2 };
    const currentView = { getPos: () => 5 };
    const active = new Set([previousView, currentView]);

    const result = getAdjacentListItemNodeView({
      nodeView: currentView,
      pos: 5,
      direction: -1,
      activeNodeViews: active,
    });

    expect(result).toBe(previousView);
  });

  it('identifies preceding views provided through iterable forEach', () => {
    const previousView = { getPos: () => 2 };
    const nodeView = { getPos: () => 5 };
    const active = {
      forEach: (cb) => {
        cb(previousView);
        cb(nodeView);
      },
    };

    const result = getAdjacentListItemNodeView({
      nodeView,
      pos: 5,
      direction: -1,
      activeNodeViews: active,
    });

    expect(result).toBe(previousView);
  });

  it('inspects array-based active node views', () => {
    const previousView = { getPos: () => 1 };
    const nodeView = { getPos: () => 4 };
    const active = [previousView, nodeView];

    const result = getAdjacentListItemNodeView({
      nodeView,
      pos: 4,
      direction: -1,
      activeNodeViews: active,
    });

    expect(result).toBe(previousView);
  });

  it('chooses the closest among multiple preceding views', () => {
    const fartherView = { getPos: () => 1 };
    const closerView = { getPos: () => 3 };
    const nodeView = { getPos: () => 6 };
    const active = [fartherView, closerView, nodeView];

    const result = getAdjacentListItemNodeView({
      nodeView,
      pos: 6,
      direction: -1,
      activeNodeViews: active,
    });

    expect(result).toBe(closerView);
  });

  it('returns the next node view when direction is positive', () => {
    const currentView = { getPos: () => 2 };
    const nextView = { getPos: () => 4 };
    const fartherView = { getPos: () => 10 };
    const active = new Set([currentView, nextView, fartherView]);

    const result = getAdjacentListItemNodeView({
      nodeView: currentView,
      pos: 2,
      direction: 1,
      activeNodeViews: active,
    });

    expect(result).toBe(nextView);
  });

  it('skips node views whose getPos throws or returns non-number', () => {
    const currentView = { getPos: () => 10 };
    const throwingView = {
      getPos: () => {
        throw new Error('fail');
      },
    };
    const nonNumericView = { getPos: () => 'abc' };
    const resolvedView = { getResolvedPos: () => 3 };
    const active = new Set([currentView, throwingView, nonNumericView, resolvedView]);

    const result = getAdjacentListItemNodeView({
      nodeView: currentView,
      pos: 10,
      direction: -1,
      activeNodeViews: active,
    });

    expect(result).toBe(resolvedView);
  });

  it('returns null when there are no active node views', () => {
    const result = getAdjacentListItemNodeView({
      nodeView: {},
      pos: 0,
      direction: 1,
      activeNodeViews: null,
    });
    expect(result).toBeNull();
  });

  it('returns null when no adjacent candidates are found', () => {
    const currentView = { getPos: () => 4 };
    const active = new Set([currentView]);

    const result = getAdjacentListItemNodeView({
      nodeView: currentView,
      pos: 4,
      direction: 1,
      activeNodeViews: active,
    });

    expect(result).toBeNull();
  });

  it('ignores views that are not positioned before the current node', () => {
    const currentView = { getPos: () => 5 };
    const laterView = { getPos: () => 7 };
    const active = new Set([currentView, laterView]);

    const result = getAdjacentListItemNodeView({
      nodeView: currentView,
      pos: 5,
      direction: -1,
      activeNodeViews: active,
    });

    expect(result).toBeNull();
  });

  it('ignores forward candidates that are not ahead of the current node', () => {
    const currentView = { getPos: () => 5 };
    const previousView = { getPos: () => 3 };
    const active = new Set([currentView, previousView]);

    const result = getAdjacentListItemNodeView({
      nodeView: currentView,
      pos: 5,
      direction: 1,
      activeNodeViews: active,
    });

    expect(result).toBeNull();
  });
});

describe('readNodeViewStyles', () => {
  it('prefers inline styles when present', () => {
    const view = { dom: { style: { fontSize: '12pt', fontFamily: 'Arial', lineHeight: '1.4' } } };
    expect(readNodeViewStyles(view)).toEqual({ fontSize: '12pt', fontFamily: 'Arial', lineHeight: '1.4' });
  });

  it('falls back to computed styles when inline values are missing', () => {
    const computed = { fontSize: '16px', fontFamily: 'Roboto', lineHeight: '1.6' };
    const getComputedStyleMock = vi.fn(() => computed);
    globalThis.window.getComputedStyle = getComputedStyleMock;

    const view = { dom: { style: {} } };

    expect(readNodeViewStyles(view)).toEqual(computed);
    expect(getComputedStyleMock).toHaveBeenCalledWith(view.dom);
  });

  it('evaluates partial inline styles before consulting computed styles', () => {
    const computed = { fontSize: '12pt', fontFamily: 'Arial', lineHeight: '1.6' };
    const getComputedStyleMock = vi.fn(() => computed);
    globalThis.window.getComputedStyle = getComputedStyleMock;

    const view = { dom: { style: { fontSize: '10pt', fontFamily: 'Arial' } } };

    const result = readNodeViewStyles(view);

    expect(result.lineHeight).toBe('1.6');
    expect(result.fontSize).toBe('10pt');
    expect(getComputedStyleMock).toHaveBeenCalledWith(view.dom);
  });

  it('skips inline styles when font family is missing', () => {
    const computed = { fontSize: '14pt', fontFamily: 'Times', lineHeight: '1.4' };
    const getComputedStyleMock = vi.fn(() => computed);
    globalThis.window.getComputedStyle = getComputedStyleMock;

    const view = { dom: { style: { fontSize: '12pt' } } };

    const result = readNodeViewStyles(view);

    expect(result.fontFamily).toBe('Times');
    expect(result.fontSize).toBe('12pt');
    expect(getComputedStyleMock).toHaveBeenCalledWith(view.dom);
  });

  it('returns inline defaults when window is unavailable', () => {
    const originalWindow = globalThis.window;
    globalThis.window = undefined;

    try {
      const view = { dom: { style: {} } };
      expect(readNodeViewStyles(view)).toEqual({ fontSize: null, fontFamily: null, lineHeight: null });
    } finally {
      globalThis.window = originalWindow;
    }
  });

  it('returns inline values when computed styles are unavailable', () => {
    const originalGetComputedStyle = globalThis.window?.getComputedStyle;
    if (globalThis.window) {
      globalThis.window.getComputedStyle = undefined;
    }

    try {
      const view = { dom: { style: {} } };
      expect(readNodeViewStyles(view)).toEqual({ fontSize: null, fontFamily: null, lineHeight: null });
    } finally {
      if (globalThis.window) {
        globalThis.window.getComputedStyle = originalGetComputedStyle;
      }
    }
  });

  it('returns null defaults when dom is missing', () => {
    expect(readNodeViewStyles(null)).toEqual({ fontSize: null, fontFamily: null, lineHeight: null });
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
    expect(result.lineHeight).toBe('1.3');
  });

  it('uses linked styles defaults when no overrides exist', () => {
    getStateMock.mockReturnValue({
      decorations: {
        find: () => [
          {
            type: { attrs: { style: 'font-size: 11pt; font-family: Tahoma;' } },
          },
        ],
      },
    });

    const emptyItem = listItemNode([paragraphNode([])]);
    const editor = {
      schema: {},
      view: { state: { doc: { resolve: () => ({ depth: 1, node: () => null, index: () => 0 }) } } },
    };

    const result = resolveListItemTypography({
      node: emptyItem,
      pos: 0,
      editor,
      nodeView: null,
      activeNodeViews: null,
    });

    expect(result.fontSize).toBe('11pt');
    expect(result.fontFamily).toBe('Tahoma');
    expect(result.lineHeight).toBeUndefined();
  });

  it('derives line height from collected attrs when available', () => {
    const mark = { type: fakeMarkType, attrs: { fontSize: '13pt' } };
    const paragraph = paragraphNode([textNode([mark])], { lineHeight: '1.8' });
    const listItem = listItemNode([paragraph]);

    const editor = {
      schema: {},
      view: { state: { doc: { resolve: () => ({ depth: 1, node: () => null, index: () => 0 }) } } },
    };

    const result = resolveListItemTypography({
      node: listItem,
      pos: 0,
      editor,
      nodeView: null,
      activeNodeViews: null,
    });

    expect(result.lineHeight).toBe('1.8');
  });

  it('falls back to previous node view when no sibling list item exists', () => {
    const emptyItem = listItemNode([paragraphNode([])]);
    const editor = {
      schema: {},
      view: {
        state: {
          doc: {
            resolve: () => ({
              depth: 0,
            }),
          },
        },
      },
    };

    const previousView = {
      getPos: () => 0,
      dom: { style: { fontSize: '15pt', fontFamily: 'Verdana', lineHeight: '1.7' } },
    };

    const currentView = {
      getPos: () => 5,
      dom: { style: {} },
    };

    const result = resolveListItemTypography({
      node: emptyItem,
      pos: 5,
      editor,
      nodeView: currentView,
      activeNodeViews: new Set([previousView, currentView]),
    });

    expect(result.fontSize).toBe('15pt');
    expect(result.fontFamily).toBe('Verdana');
    expect(result.lineHeight).toBe('1.7');
  });

  it('skips sibling lookup when current styles already exist', () => {
    const mark = { type: fakeMarkType, attrs: { fontSize: '12pt', fontFamily: 'Tahoma' } };
    const paragraph = paragraphNode([textNode([mark])], { lineHeight: '1.2' });
    const listItem = listItemNode([paragraph]);

    const editor = {
      schema: {},
      view: {
        state: {
          doc: {
            resolve: () => ({ depth: 1, node: () => null, index: () => 0 }),
          },
        },
      },
    };

    const result = resolveListItemTypography({
      node: listItem,
      pos: 0,
      editor,
      nodeView: null,
      activeNodeViews: null,
    });

    expect(result).toEqual({ fontSize: '12pt', fontFamily: 'Tahoma', lineHeight: '1.2' });
  });
});

describe('findSiblingListItem', () => {
  const createEditorWithChildren = (children) => {
    const parent = {
      childCount: children.length,
      child: (index) => children[index],
    };

    return {
      view: {
        state: {
          doc: {
            resolve: (pos) => ({
              depth: 2,
              node: (depth) => (depth === 1 ? parent : null),
              index: (depth) => (depth === 1 ? pos : 0),
            }),
          },
        },
      },
    };
  };

  it('locates the previous sibling list item', () => {
    const siblings = [listItemNode(), listItemNode(), { type: { name: 'paragraph' } }];
    const editor = createEditorWithChildren(siblings);

    const result = findSiblingListItem({ editor, pos: 1, direction: -1 });

    expect(result).toBe(siblings[0]);
  });

  it('returns null when adjacent node is not a list item', () => {
    const siblings = [listItemNode(), { type: { name: 'paragraph' } }];
    const editor = createEditorWithChildren(siblings);

    expect(findSiblingListItem({ editor, pos: 0, direction: 1 })).toBeNull();
  });

  it('returns null for invalid input', () => {
    expect(findSiblingListItem({ editor: null, pos: null, direction: 1 })).toBeNull();
  });

  it('returns null when sibling index exceeds bounds', () => {
    const siblings = [listItemNode()];
    const editor = createEditorWithChildren(siblings);

    expect(findSiblingListItem({ editor, pos: 0, direction: 1 })).toBeNull();
  });

  it('returns null when resolved depth is shallow', () => {
    const editor = {
      view: {
        state: {
          doc: {
            resolve: () => ({ depth: 0 }),
          },
        },
      },
    };

    expect(findSiblingListItem({ editor, pos: 0, direction: 1 })).toBeNull();
  });
});

describe('getStylesFromLinkedStyles', () => {
  it('prefers decorations containing both font size and family', () => {
    const style = 'color: red; font-size: 14pt; font-family: Helvetica;';
    getStateMock.mockReturnValue({
      decorations: {
        find: () => [{ type: { attrs: { style } } }],
      },
    });

    const result = getStylesFromLinkedStyles({
      node: { nodeSize: 3 },
      pos: 5,
      editor: { view: { state: {} } },
    });

    expect(result).toEqual({ size: '14pt', font: 'Helvetica' });
  });

  it('extracts font-size when only size decoration exists', () => {
    getStateMock.mockReturnValue({
      decorations: {
        find: () => [{ type: { attrs: { style: 'font-size: 12pt;' } } }],
      },
    });

    const result = getStylesFromLinkedStyles({
      node: { nodeSize: 2 },
      pos: 10,
      editor: { view: { state: {} } },
    });

    expect(result).toEqual({ size: '12pt', font: undefined });
  });

  it('extracts font-family when only font decoration exists', () => {
    getStateMock.mockReturnValue({
      decorations: {
        find: () => [{ type: { attrs: { style: 'font-family: Courier;' } } }],
      },
    });

    const result = getStylesFromLinkedStyles({
      node: { nodeSize: 1 },
      pos: 1,
      editor: { view: { state: {} } },
    });

    expect(result).toEqual({ size: undefined, font: 'Courier' });
  });

  it('ignores decorations without styles', () => {
    getStateMock.mockReturnValue({
      decorations: {
        find: () => [{ type: { attrs: { style: '' } } }],
      },
    });

    const result = getStylesFromLinkedStyles({
      node: { nodeSize: 1 },
      pos: 2,
      editor: { view: { state: {} } },
    });

    expect(result).toEqual({ size: undefined, font: undefined });
  });

  it('returns null styles when no decorations present', () => {
    getStateMock.mockReturnValue({ decorations: { find: () => [] } });

    const result = getStylesFromLinkedStyles({
      node: { nodeSize: 1 },
      pos: 0,
      editor: { view: { state: {} } },
    });

    expect(result).toEqual({ size: undefined, font: undefined });
  });
});
