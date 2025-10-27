// @ts-check
import { describe, it, expect, vi } from 'vitest';
import {
  getParagraphContext,
  flattenParagraph,
  findNextTabIndex,
  findDecimalBreakPos,
  calculateIndentFallback,
  getTabDecorations,
} from './tabDecorations.js';
import { pixelsToTwips } from '@converter/helpers';

describe('getParagraphContext', () => {
  const mockHelpers = {
    linkedStyles: {
      getStyleById: vi.fn(),
    },
  };

  it('should get tabStops from node attributes', () => {
    const tabStops = [{ tab: { tabType: 'left', pos: pixelsToTwips(720) } }];
    const node = { type: { name: 'paragraph' }, attrs: { tabStops }, forEach: () => {} };
    const $pos = { node: () => node, start: () => 0, depth: 1 };
    const cache = new Map();

    const context = getParagraphContext($pos, cache, mockHelpers);

    expect(context.tabStops).toEqual([{ val: 'left', pos: 720 }]);
    expect(mockHelpers.linkedStyles.getStyleById).not.toHaveBeenCalled();
  });

  it('should get tabStops from linked style if not on node', () => {
    const tabStops = [{ val: 'right', pos: 1440 }];
    mockHelpers.linkedStyles.getStyleById.mockReturnValue({
      definition: { styles: { tabStops } },
    });

    const node = { type: { name: 'paragraph' }, attrs: { styleId: 'MyStyle' }, forEach: () => {} };
    const $pos = { node: () => node, start: () => 0, depth: 1 };
    const cache = new Map();

    const context = getParagraphContext($pos, cache, mockHelpers);

    expect(context.tabStops).toEqual(tabStops);
    expect(mockHelpers.linkedStyles.getStyleById).toHaveBeenCalledWith('MyStyle');
  });

  it('should return empty tabStops if not found', () => {
    mockHelpers.linkedStyles.getStyleById.mockReturnValue(null);
    const node = { type: { name: 'paragraph' }, attrs: {}, forEach: () => {} };
    const $pos = { node: () => node, start: () => 0, depth: 1 };
    const cache = new Map();

    const context = getParagraphContext($pos, cache, mockHelpers);

    expect(context.tabStops).toEqual([]);
  });
});

describe('flattenParagraph', () => {
  it('should flatten a paragraph node', () => {
    const para = {
      forEach: (callback) => {
        callback({ type: { name: 'text' }, text: 'Hello ' }, 0);
        callback({ type: { name: 'tab' } }, 6);
        callback({ type: { name: 'text' }, text: 'World' }, 7);
      },
    };

    const flattened = flattenParagraph(para, 0);

    expect(flattened).toHaveLength(3);
    expect(flattened[0].node.text).toBe('Hello ');
    expect(flattened[1].node.type.name).toBe('tab');
    expect(flattened[2].node.text).toBe('World');
  });
});

describe('findNextTabIndex', () => {
  const flattened = [
    { node: { type: { name: 'text' } } },
    { node: { type: { name: 'tab' } } },
    { node: { type: { name: 'text' } } },
    { node: { type: { name: 'tab' } } },
  ];

  it('should find the next tab index', () => {
    expect(findNextTabIndex(flattened, 0)).toBe(1);
    expect(findNextTabIndex(flattened, 2)).toBe(3);
  });

  it('should return -1 if no more tabs are found', () => {
    expect(findNextTabIndex(flattened, 4)).toBe(-1);
  });
});

describe('findDecimalBreakPos', () => {
  it('should find the position of the decimal break', () => {
    const flattened = [
      { node: { type: { name: 'text' }, text: '1' }, pos: 0 },
      { node: { type: { name: 'text' }, text: '.' }, pos: 1 },
      { node: { type: { name: 'text' }, text: '2' }, pos: 2 },
    ];
    expect(findDecimalBreakPos(flattened, 0, '.')).toBe(2);
  });

  it('should return null if no decimal break is found', () => {
    const flattened = [{ node: { type: { name: 'text' }, text: '12' }, pos: 0 }];
    expect(findDecimalBreakPos(flattened, 0, '.')).toBeNull();
  });
});

describe('calculateIndentFallback', () => {
  it('should calculate indent correctly', () => {
    expect(calculateIndentFallback({ left: pixelsToTwips(10), firstLine: pixelsToTwips(20) })).toBe(30);
    expect(calculateIndentFallback({ left: pixelsToTwips(10), hanging: pixelsToTwips(20) })).toBe(-10);
    expect(calculateIndentFallback({ firstLine: pixelsToTwips(20), hanging: pixelsToTwips(10) })).toBe(10);
  });
});

describe('getTabDecorations', () => {
  it('should return an empty array if no tabs are found', () => {
    const doc = {
      content: { size: 10 },
      nodesBetween: () => {},
    };
    const decorations = getTabDecorations(doc, null, null);
    expect(decorations).toEqual([]);
  });
});
