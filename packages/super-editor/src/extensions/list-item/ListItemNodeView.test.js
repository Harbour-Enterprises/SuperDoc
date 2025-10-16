import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';

const hoistedMocks = vi.hoisted(() => {
  const parseIndentElementMock = vi.fn();
  const combineIndentsMock = vi.fn();
  const docxNumberigHelpersMock = {
    normalizeLvlTextChar: vi.fn(),
  };
  const generateOrderedListIndexMock = vi.fn();
  const getListItemStyleDefinitionsMock = vi.fn();
  const resolveListItemTypographyMock = vi.fn();

  return {
    parseIndentElementMock,
    combineIndentsMock,
    docxNumberigHelpersMock,
    generateOrderedListIndexMock,
    getListItemStyleDefinitionsMock,
    resolveListItemTypographyMock,
  };
});

const {
  parseIndentElementMock,
  combineIndentsMock,
  docxNumberigHelpersMock,
  generateOrderedListIndexMock,
  getListItemStyleDefinitionsMock,
  resolveListItemTypographyMock,
} = hoistedMocks;

vi.mock('@core/super-converter/v2/importer/listImporter.js', () => ({
  parseIndentElement: (...args) => hoistedMocks.parseIndentElementMock(...args),
  combineIndents: (...args) => hoistedMocks.combineIndentsMock(...args),
}));

vi.mock('@/core/super-converter/v2/importer/listImporter.js', () => ({
  parseIndentElement: (...args) => hoistedMocks.parseIndentElementMock(...args),
  combineIndents: (...args) => hoistedMocks.combineIndentsMock(...args),
  docxNumberigHelpers: hoistedMocks.docxNumberigHelpersMock,
}));

vi.mock('@helpers/orderedListUtils.js', () => ({
  generateOrderedListIndex: (...args) => hoistedMocks.generateOrderedListIndexMock(...args),
}));

vi.mock('@helpers/list-numbering-helpers.js', () => ({
  getListItemStyleDefinitions: (...args) => hoistedMocks.getListItemStyleDefinitionsMock(...args),
}));

vi.mock('./helpers/listItemTypography.js', () => ({
  resolveListItemTypography: (...args) => hoistedMocks.resolveListItemTypographyMock(...args),
}));

import { ListItemNodeView, refreshAllListItemNodeViews, getVisibleIndent } from './ListItemNodeView.js';

const realRAF = globalThis.requestAnimationFrame;
const realCAF = globalThis.cancelAnimationFrame;
const nativeCreateElement = document.createElement;

const installCanvasMock = (width = 18) => {
  document.createElement = vi.fn((tagName, options) => {
    if (tagName === 'canvas') {
      return {
        getContext: vi.fn(() => ({
          measureText: vi.fn(() => ({ width })),
        })),
      };
    }
    return nativeCreateElement.call(document, tagName, options);
  });
};

const createDefaultIndentDefinitions = ({ style = {}, numDef = {}, align = 'left' } = {}) => ({
  stylePpr: { elements: [{ name: 'w:ind', mockIndent: style }] },
  numDefPpr: { elements: [{ name: 'w:ind', mockIndent: numDef }] },
  numLvlJs: { attributes: { 'w:val': align } },
});

const createNodeView = ({ nodeAttrs = {}, getPos = vi.fn(() => 5), editorOptions = {}, decorations = [] } = {}) => {
  const node = {
    attrs: {
      listLevel: 1,
      listNumberingType: 'decimal',
      lvlText: '%1.',
      numId: '10',
      level: 1,
      indent: undefined,
      ...nodeAttrs,
    },
    nodeSize: 2,
    forEach: () => {},
  };

  const editor = {
    view: { state: {} },
    options: editorOptions,
  };

  return new ListItemNodeView(node, getPos, decorations, editor);
};

let requestAnimationFrameMock;
let cancelAnimationFrameMock;

beforeEach(() => {
  vi.clearAllMocks();
  parseIndentElementMock.mockImplementation((tag) => tag?.mockIndent || {});
  combineIndentsMock.mockImplementation((...indents) =>
    Object.assign({}, ...indents.filter((item) => item && Object.keys(item).length > 0)),
  );
  docxNumberigHelpersMock.normalizeLvlTextChar.mockImplementation((value) => (value == null ? '•' : value));
  generateOrderedListIndexMock.mockReturnValue('1.');
  getListItemStyleDefinitionsMock.mockReturnValue(
    createDefaultIndentDefinitions({ style: { left: 30 }, numDef: { hanging: 10 }, align: 'left' }),
  );
  resolveListItemTypographyMock.mockReturnValue({
    fontSize: '15pt',
    fontFamily: 'MockFamily',
    lineHeight: '1.4',
  });

  requestAnimationFrameMock = vi.fn((cb) => {
    cb();
    return 42;
  });
  cancelAnimationFrameMock = vi.fn();
  globalThis.requestAnimationFrame = requestAnimationFrameMock;
  globalThis.cancelAnimationFrame = cancelAnimationFrameMock;
  document.createElement = nativeCreateElement;
});

afterEach(() => {
  globalThis.requestAnimationFrame = realRAF;
  globalThis.cancelAnimationFrame = realCAF;
  document.createElement = nativeCreateElement;
});

describe('ListItemNodeView', () => {
  it('initializes DOM for ordered lists using resolved typography', () => {
    installCanvasMock(22);
    const getPos = vi.fn(() => 3);
    const nodeView = createNodeView({ getPos });

    expect(generateOrderedListIndexMock).toHaveBeenCalledWith(
      expect.objectContaining({
        listLevel: 1,
        listNumberingType: 'decimal',
        lvlText: '%1.',
      }),
    );
    expect(docxNumberigHelpersMock.normalizeLvlTextChar).not.toHaveBeenCalled();
    expect(resolveListItemTypographyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        node: nodeView.node,
        nodeView,
      }),
    );

    expect(nodeView.dom.tagName).toBe('LI');
    expect(nodeView.dom.style.fontSize).toBe('15pt');
    expect(nodeView.dom.style.fontFamily).toBe('MockFamily');
    expect(nodeView.dom.getAttribute('data-marker-type')).toBe('1.');

    expect(nodeView.contentDOM.style.marginLeft).toBe('30px');
    expect(nodeView.numberingDOM.style.left).toBe('2px');
    expect(nodeView.numberingDOM.style.width).toBe('');

    nodeView.destroy();
  });

  it('normalizes bullet markers and applies right alignment styling', () => {
    getListItemStyleDefinitionsMock.mockReturnValue(
      createDefaultIndentDefinitions({ style: { left: 50 }, numDef: { hanging: 5 }, align: 'right' }),
    );
    const normalized = '•';
    docxNumberigHelpersMock.normalizeLvlTextChar.mockReturnValue(normalized);
    const nodeView = createNodeView({
      nodeAttrs: { listNumberingType: 'bullet', lvlText: 'o' },
      editorOptions: { isHeadless: true },
    });

    expect(generateOrderedListIndexMock).not.toHaveBeenCalled();
    expect(docxNumberigHelpersMock.normalizeLvlTextChar).toHaveBeenCalledWith('o');
    expect(nodeView.numberingDOM.textContent).toBe(normalized);
    expect(nodeView.contentDOM.style.marginLeft).toBe('50px');
    expect(nodeView.numberingDOM.style.left).toBe('26px');
    expect(nodeView.numberingDOM.style.width).toBe('20px');
    expect(nodeView.numberingDOM.style.textAlign).toBe('right');

    nodeView.destroy();
  });

  it('falls back to inherit styles when typography is missing', () => {
    resolveListItemTypographyMock.mockReturnValueOnce({
      fontSize: '',
      fontFamily: null,
      lineHeight: null,
    });
    installCanvasMock(10);
    const nodeView = createNodeView();

    expect(nodeView.dom.style.fontSize).toBe('');
    expect(nodeView.dom.style.fontFamily).toBe('inherit');
    expect(nodeView.dom.style.lineHeight).toBe('');

    nodeView.destroy();
  });

  it('supports measuring markers when font sizes use pixels', () => {
    resolveListItemTypographyMock.mockReturnValueOnce({
      fontSize: '16px',
      fontFamily: 'Sans',
      lineHeight: '1.5',
    });
    installCanvasMock(12);
    const nodeView = createNodeView();

    expect(nodeView.dom.style.fontSize).toBe('16px');

    nodeView.destroy();
  });

  it('uses left handler when alignment is unknown', () => {
    getListItemStyleDefinitionsMock.mockReturnValueOnce(
      createDefaultIndentDefinitions({ style: { left: 40 }, numDef: { hanging: 15 }, align: 'center' }),
    );
    installCanvasMock(18);
    const nodeView = createNodeView();

    expect(nodeView.numberingDOM.style.textAlign).toBe('');

    nodeView.destroy();
  });

  it('shifts marker by minimum width when hanging equals content indent', () => {
    getListItemStyleDefinitionsMock.mockReturnValueOnce(
      createDefaultIndentDefinitions({ style: { left: 40 }, numDef: { hanging: 0 }, align: 'left' }),
    );
    installCanvasMock(14);
    const nodeView = createNodeView();

    expect(nodeView.numberingDOM.style.left).toBe('20px');

    nodeView.destroy();
  });

  it('gracefully handles canvas failures during marker width calculation', () => {
    document.createElement = vi.fn((tagName, options) => {
      if (tagName === 'canvas') {
        throw new Error('canvas unavailable');
      }
      return nativeCreateElement.call(document, tagName, options);
    });

    const nodeView = createNodeView();

    expect(nodeView.numberingDOM.style.left).toBe('10px');

    nodeView.destroy();
  });

  it('returns zero width when marker text is empty', () => {
    const nodeView = createNodeView({ nodeAttrs: { listLevel: null } });

    expect(nodeView.numberingDOM.textContent).toBe('');
    expect(nodeView.numberingDOM.style.left).toBe('10px');

    nodeView.destroy();
  });

  it('exposes a numbering click handler placeholder', () => {
    const nodeView = createNodeView();

    expect(() => nodeView.handleNumberingClick()).not.toThrow();

    nodeView.destroy();
  });

  it('caches the resolved position and allows invalidation', () => {
    const getPos = vi.fn().mockReturnValueOnce(7).mockReturnValueOnce(11);
    const nodeView = createNodeView({ getPos });

    expect(nodeView.getResolvedPos()).toBe(7);
    expect(getPos).toHaveBeenCalledTimes(1);

    expect(nodeView.getResolvedPos()).toBe(7);
    expect(getPos).toHaveBeenCalledTimes(1);

    expect(nodeView.getResolvedPos({ force: true })).toBe(11);
    expect(getPos).toHaveBeenCalledTimes(2);

    nodeView._rawGetPos = () => 'not-a-number';
    nodeView.invalidateResolvedPos();
    expect(nodeView.getResolvedPos()).toBeNull();

    nodeView._rawGetPos = () => {
      throw new Error('position unavailable');
    };
    nodeView.invalidateResolvedPos();
    expect(nodeView.getResolvedPos()).toBeNull();

    nodeView.destroy();
  });

  it('exposes getPos helper that proxies to getResolvedPos', () => {
    const getPos = vi.fn().mockReturnValue(4);
    const nodeView = createNodeView({ getPos });

    expect(nodeView.getPos()).toBe(4);
    expect(getPos).toHaveBeenCalledTimes(1);

    nodeView.destroy();
  });

  it('updates typography styles during update and refreshes indent', () => {
    resolveListItemTypographyMock
      .mockReturnValueOnce({ fontSize: '15pt', fontFamily: 'MockFamily', lineHeight: '1.4' })
      .mockReturnValueOnce({ fontSize: '18pt', fontFamily: 'Updated', lineHeight: '1.8' });

    const getPos = vi.fn().mockReturnValueOnce(4).mockReturnValueOnce(8);
    installCanvasMock(12);
    const nodeView = createNodeView({ getPos });

    const updatedNode = {
      ...nodeView.node,
      attrs: { ...nodeView.node.attrs, listNumberingType: 'decimal' },
    };

    nodeView.update(updatedNode, []);

    expect(resolveListItemTypographyMock).toHaveBeenCalledTimes(2);
    expect(nodeView.dom.style.fontSize).toBe('18pt');
    expect(nodeView.dom.style.fontFamily).toBe('Updated');
    expect(nodeView.dom.style.lineHeight).toBe('1.8');

    expect(nodeView.getResolvedPos()).toBe(8);

    nodeView.destroy();
  });

  it('falls back to inherit styles during update when typography missing', () => {
    resolveListItemTypographyMock
      .mockReturnValueOnce({ fontSize: '13pt', fontFamily: 'Initial', lineHeight: '1.2' })
      .mockReturnValueOnce({ fontSize: '', fontFamily: null, lineHeight: null });

    const nodeView = createNodeView();

    const updatedNode = {
      ...nodeView.node,
      attrs: { ...nodeView.node.attrs },
    };

    nodeView.update(updatedNode, []);

    expect(nodeView.dom.style.fontSize).toBe('');
    expect(nodeView.dom.style.fontFamily).toBe('inherit');
    expect(nodeView.dom.style.lineHeight).toBe('');

    nodeView.destroy();
  });

  it('cancels pending indent refresh on destroy', () => {
    requestAnimationFrameMock.mockImplementationOnce((cb) => {
      // do not execute immediately to keep pending id
      return 99;
    });

    const nodeView = createNodeView();
    nodeView.refreshIndentStyling();
    nodeView.refreshIndentStyling();
    expect(requestAnimationFrameMock).toHaveBeenCalledTimes(1);
    nodeView.destroy();

    expect(cancelAnimationFrameMock).toHaveBeenCalledWith(99);
  });

  it('applies indent styling immediately when requested', () => {
    const nodeView = createNodeView();
    requestAnimationFrameMock.mockClear();

    nodeView.refreshIndentStyling({ immediate: true });

    expect(requestAnimationFrameMock).not.toHaveBeenCalled();
    expect(nodeView._pendingIndentRefresh).toBeNull();

    nodeView.destroy();
  });

  it('removes broken node views during refreshAllListItemNodeViews', () => {
    const nodeView = createNodeView();
    const healthyView = createNodeView({ nodeAttrs: { numId: '20' } });

    const refreshSpy = vi.spyOn(healthyView, 'refreshIndentStyling');
    nodeView.refreshIndentStyling = vi.fn(() => {
      throw new Error('refresh failed');
    });

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    refreshAllListItemNodeViews();
    expect(errorSpy).toHaveBeenCalledWith('Error refreshing list item node view:', expect.any(Error));
    expect(refreshSpy).toHaveBeenCalledWith({ immediate: true });

    refreshSpy.mockClear();
    refreshAllListItemNodeViews();
    expect(refreshSpy).toHaveBeenCalledTimes(1);

    errorSpy.mockRestore();
    nodeView.destroy();
    healthyView.destroy();
  });
});

describe('getVisibleIndent', () => {
  it('combines style, num definition, and inline indent sources', () => {
    parseIndentElementMock.mockImplementation((tag) => tag?.mockIndent || {});
    combineIndentsMock.mockImplementation((...indents) => Object.assign({}, ...indents.filter(Boolean)));

    const styleIndent = { left: 24 };
    const numDefIndent = { hanging: 8 };
    const inlineIndent = { left: 30, right: 5 };

    const result = getVisibleIndent(
      { elements: [{ name: 'w:ind', mockIndent: styleIndent }] },
      { elements: [{ name: 'w:ind', mockIndent: numDefIndent }] },
      inlineIndent,
    );

    expect(result).toEqual({ left: 30, hanging: 8, right: 5 });
    expect(parseIndentElementMock).toHaveBeenCalledTimes(2);
    expect(combineIndentsMock).toHaveBeenCalledTimes(2);
  });

  it('handles missing definition nodes by defaulting to inline indent', () => {
    parseIndentElementMock.mockClear();
    combineIndentsMock.mockImplementation((...indents) => Object.assign({}, ...indents.filter(Boolean)));

    const inlineIndent = { left: 12, hanging: 4 };
    const result = getVisibleIndent(null, null, inlineIndent);

    expect(parseIndentElementMock).toHaveBeenCalledTimes(2);
    expect(result).toEqual(inlineIndent);
  });
});
