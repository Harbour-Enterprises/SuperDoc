// @ts-check
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ParagraphNodeView } from './ParagraphNodeView.js';
import { Attribute } from '@core/index.js';
import { twipsToPixels } from '@converter/helpers.js';
import { calculateTabStyle } from '../tab/helpers/tabDecorations.js';
import { isList } from '@core/commands/list-helpers';

vi.mock('@core/index.js', () => ({
  Attribute: {
    getAttributesToRender: vi.fn().mockReturnValue({ class: 'paragraph', style: 'color: red;' }),
  },
}));

vi.mock('@converter/helpers.js', () => ({
  twipsToPixels: vi.fn().mockImplementation((value) => value / 20),
}));

vi.mock('../tab/helpers/tabDecorations.js', () => ({
  extractParagraphContext: vi.fn().mockReturnValue({ accumulatedTabWidth: 0 }),
  calculateTabStyle: vi.fn().mockReturnValue('width: 10px;'),
}));

vi.mock('@converter/styles.js', () => ({
  resolveRunProperties: vi.fn().mockReturnValue({ fontSize: '12pt' }),
  encodeCSSFromRPr: vi.fn().mockReturnValue({ 'font-size': '12pt' }),
}));

vi.mock('@core/commands/list-helpers', () => ({
  isList: vi.fn(),
}));

const createEditor = () => ({
  schema: {
    nodes: {
      tab: {
        create: vi.fn().mockReturnValue({}),
      },
    },
  },
  view: {},
  converter: {
    convertedXml: {},
    numbering: {},
  },
  state: {
    doc: {
      resolve: vi.fn().mockReturnValue({
        start: () => 0,
      }),
    },
  },
  helpers: {},
});

const createNode = (overrides = {}) => ({
  type: { name: 'paragraph' },
  attrs: {
    indent: { hanging: 720 },
    paragraphProperties: {
      numberingProperties: {},
      runProperties: {},
    },
    listRendering: {
      suffix: 'tab',
      justification: 'left',
      markerText: '1.',
      path: [1],
    },
    numberingProperties: { ilvl: 0, numId: 1 },
  },
  ...overrides,
});

describe('ParagraphNodeView', () => {
  /** @type {{ cancelAnimationFrame: ReturnType<typeof vi.fn>, requestAnimationFrame: ReturnType<typeof vi.fn> }} */
  const animationMocks = {
    cancelAnimationFrame: vi.fn(),
    requestAnimationFrame: vi.fn(),
  };
  const originalRAF = globalThis.requestAnimationFrame;
  const originalCAF = globalThis.cancelAnimationFrame;

  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.requestAnimationFrame = (cb) => {
      animationMocks.requestAnimationFrame(cb);
      cb();
      return 1;
    };
    globalThis.cancelAnimationFrame = animationMocks.cancelAnimationFrame;
  });

  afterEach(() => {
    globalThis.requestAnimationFrame = originalRAF;
    globalThis.cancelAnimationFrame = originalCAF;
  });

  const mountNodeView = (nodeOverrides = {}, options = {}) => {
    const node = createNode(nodeOverrides);
    const editor = createEditor();
    const getPos = vi.fn().mockReturnValue(0);
    const view = new ParagraphNodeView(node, editor, getPos, [], options.extensionAttrs || {});
    return { nodeView: view, node, editor, getPos };
  };

  it('creates list marker/separator on init when node is a list', () => {
    isList.mockReturnValue(true);
    const { nodeView } = mountNodeView();

    expect(nodeView.marker).toBeTruthy();
    expect(nodeView.marker.textContent).toBe('1.');
    expect(nodeView.separator).toBeTruthy();
    expect(nodeView.separator.className).toBe('sd-editor-tab');
    expect(Attribute.getAttributesToRender).toHaveBeenCalled();
  });

  it('removes list elements when node is not a list during update', () => {
    isList.mockReturnValue(true);
    const { nodeView } = mountNodeView();
    nodeView.marker = document.createElement('span');
    nodeView.separator = document.createElement('span');
    nodeView.dom.appendChild(nodeView.marker);
    nodeView.dom.appendChild(nodeView.separator);

    isList.mockReturnValue(false);
    const nextNode = createNode();
    const updated = nodeView.update(nextNode, []);

    expect(updated).toBe(true);
    expect(nodeView.marker).toBeNull();
    expect(nodeView.separator).toBeNull();
  });

  it('updates list rendering attributes and schedules animation', () => {
    isList.mockReturnValue(true);
    const baseAttrs = createNode().attrs;
    const { nodeView } = mountNodeView({ attrs: { ...baseAttrs } });
    const nextNode = createNode({
      attrs: {
        ...baseAttrs,
        listRendering: { ...baseAttrs.listRendering, suffix: 'space', justification: 'right', markerText: 'A.' },
      },
    });

    nodeView.update(nextNode, []);

    expect(animationMocks.requestAnimationFrame).toHaveBeenCalled();
    expect(nodeView.marker.textContent).toBe('A.');
    expect(nodeView.separator.textContent).toBe('\u00A0');
  });

  it('uses hanging indent width for right-justified tabs and skips tab helper', () => {
    isList.mockReturnValue(true);
    const attrs = {
      ...createNode().attrs,
      indent: { hanging: 720 },
      listRendering: { suffix: 'tab', justification: 'right', markerText: '1.' },
    };
    const { nodeView } = mountNodeView({ attrs });
    nodeView.marker.getBoundingClientRect = vi.fn().mockReturnValue({ width: 20 });

    expect(calculateTabStyle).not.toHaveBeenCalled();
    expect(twipsToPixels).toHaveBeenCalledWith(720);
    expect(nodeView.separator.style.cssText).toContain('width: 36');
  });

  it('falls back to tab helper for center justification', () => {
    isList.mockReturnValue(true);
    const attrs = {
      ...createNode().attrs,
      listRendering: { suffix: 'tab', justification: 'center', markerText: '1.' },
    };
    const { nodeView } = mountNodeView({ attrs });
    nodeView.marker.getBoundingClientRect = vi.fn().mockReturnValue({ width: 40 });
    nodeView.update(nodeView.node, []);

    expect(calculateTabStyle).toHaveBeenCalled();
    expect(nodeView.separator.style.cssText).toContain('margin-left: 20');
  });

  it('respects ignoreMutation rules for markers, separators, and style attribute', () => {
    isList.mockReturnValue(true);
    const { nodeView } = mountNodeView();
    const markerMutation = { target: nodeView.marker };
    const separatorMutation = { target: nodeView.separator };
    const styleMutation = { type: 'attributes', target: nodeView.dom, attributeName: 'style' };
    const otherMutation = { target: document.createElement('div') };

    expect(nodeView.ignoreMutation(markerMutation)).toBe(true);
    expect(nodeView.ignoreMutation(separatorMutation)).toBe(true);
    expect(nodeView.ignoreMutation(styleMutation)).toBe(true);
    expect(nodeView.ignoreMutation(otherMutation)).toBe(false);
  });

  it('destroys scheduled animations on destroy()', () => {
    isList.mockReturnValue(true);
    const { nodeView } = mountNodeView();
    nodeView.destroy();
    expect(animationMocks.cancelAnimationFrame).toHaveBeenCalled();
  });
});
