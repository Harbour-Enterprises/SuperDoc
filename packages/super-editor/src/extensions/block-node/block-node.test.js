import { describe, it, expect } from 'vitest';
import { ReplaceStep } from 'prosemirror-transform';
import { nodeAllowsSdBlockIdAttr, nodeNeedsSdBlockId, checkForNewBlockNodesInTrs } from './block-node.js';

// Mock
class OtherStep {}

describe('block-node: nodeAllowsSdBlockIdAttr', () => {
  it('should return true for block nodes with sdBlockId attribute', () => {
    const mockNode = {
      isBlock: true,
      type: {
        spec: {
          attrs: {
            sdBlockId: {
              default: null,
              keepOnSplit: false,
            },
            otherAttr: { default: 'value' },
          },
        },
      },
    };

    expect(nodeAllowsSdBlockIdAttr(mockNode)).toBe(true);
  });

  it('should return false for inline nodes with sdBlockId attribute', () => {
    const mockNode = {
      isBlock: false,
      type: {
        spec: {
          attrs: {
            sdBlockId: {
              default: null,
              keepOnSplit: false,
            },
          },
        },
      },
    };

    expect(nodeAllowsSdBlockIdAttr(mockNode)).toBe(false);
  });

  it('should return false for block nodes without sdBlockId attribute', () => {
    const mockNode = {
      isBlock: true,
      type: {
        spec: {
          attrs: {
            otherAttr: { default: 'value' },
            anotherAttr: { default: 'another' },
          },
        },
      },
    };

    expect(nodeAllowsSdBlockIdAttr(mockNode)).toBe(false);
  });

  it('should return false for block nodes with no attrs spec', () => {
    const mockNode = {
      isBlock: true,
      type: {
        spec: {},
      },
    };

    expect(nodeAllowsSdBlockIdAttr(mockNode)).toBe(false);
  });

  it('should return false for block nodes with null attrs', () => {
    const mockNode = {
      isBlock: true,
      type: {
        spec: {
          attrs: null,
        },
      },
    };

    expect(nodeAllowsSdBlockIdAttr(mockNode)).toBe(false);
  });

  it('should return false for nodes without type.spec', () => {
    const mockNode = {
      isBlock: true,
      type: {},
    };

    expect(nodeAllowsSdBlockIdAttr(mockNode)).toBe(false);
  });

  it('should handle undefined/null nodes gracefully', () => {
    expect(nodeAllowsSdBlockIdAttr(null)).toBe(false);
    expect(nodeAllowsSdBlockIdAttr(undefined)).toBe(false);
    expect(nodeAllowsSdBlockIdAttr({})).toBe(false);
  });
});

describe('block-node: nodeNeedsSdBlockId', () => {
  it('should return true when node has no sdBlockId attribute', () => {
    const mockNode = {
      attrs: {
        otherAttr: 'value',
        anotherAttr: 'another',
      },
    };

    expect(nodeNeedsSdBlockId(mockNode)).toBe(true);
  });

  it('should return true when sdBlockId is null', () => {
    const mockNode = {
      attrs: {
        sdBlockId: null,
        otherAttr: 'value',
      },
    };

    expect(nodeNeedsSdBlockId(mockNode)).toBe(true);
  });

  it('should return true when sdBlockId is undefined', () => {
    const mockNode = {
      attrs: {
        sdBlockId: undefined,
        otherAttr: 'value',
      },
    };

    expect(nodeNeedsSdBlockId(mockNode)).toBe(true);
  });

  it('should return true when sdBlockId is empty string', () => {
    const mockNode = {
      attrs: {
        sdBlockId: '',
        otherAttr: 'value',
      },
    };

    expect(nodeNeedsSdBlockId(mockNode)).toBe(true);
  });

  it('should return true when sdBlockId is 0', () => {
    const mockNode = {
      attrs: {
        sdBlockId: 0,
        otherAttr: 'value',
      },
    };

    expect(nodeNeedsSdBlockId(mockNode)).toBe(true);
  });

  it('should return true when sdBlockId is false', () => {
    const mockNode = {
      attrs: {
        sdBlockId: false,
        otherAttr: 'value',
      },
    };

    expect(nodeNeedsSdBlockId(mockNode)).toBe(true);
  });

  it('should return false when sdBlockId has a valid string value', () => {
    const mockNode = {
      attrs: {
        sdBlockId: 'block-id-123',
        otherAttr: 'value',
      },
    };

    expect(nodeNeedsSdBlockId(mockNode)).toBe(false);
  });

  it('should return false when sdBlockId has a valid numeric value', () => {
    const mockNode = {
      attrs: {
        sdBlockId: 42,
        otherAttr: 'value',
      },
    };

    expect(nodeNeedsSdBlockId(mockNode)).toBe(false);
  });

  it('should return false when sdBlockId is true', () => {
    const mockNode = {
      attrs: {
        sdBlockId: true,
        otherAttr: 'value',
      },
    };

    expect(nodeNeedsSdBlockId(mockNode)).toBe(false);
  });

  it('should return false when sdBlockId is an object', () => {
    const mockNode = {
      attrs: {
        sdBlockId: { id: 'block-123' },
        otherAttr: 'value',
      },
    };

    expect(nodeNeedsSdBlockId(mockNode)).toBe(false);
  });

  it('should return false when sdBlockId is an array', () => {
    const mockNode = {
      attrs: {
        sdBlockId: ['block-id'],
        otherAttr: 'value',
      },
    };

    expect(nodeNeedsSdBlockId(mockNode)).toBe(false);
  });

  it('should return true when node has no attrs property', () => {
    const mockNode = {};

    expect(nodeNeedsSdBlockId(mockNode)).toBe(true);
  });

  it('should return true when node attrs is null', () => {
    const mockNode = {
      attrs: null,
    };

    expect(nodeNeedsSdBlockId(mockNode)).toBe(true);
  });

  it('should return true when node attrs is undefined', () => {
    const mockNode = {
      attrs: undefined,
    };

    expect(nodeNeedsSdBlockId(mockNode)).toBe(true);
  });

  it('should handle null/undefined nodes gracefully', () => {
    expect(nodeNeedsSdBlockId(null)).toBe(true);
    expect(nodeNeedsSdBlockId(undefined)).toBe(true);
  });

  it('should return true when attrs is empty object', () => {
    const mockNode = {
      attrs: {},
    };

    expect(nodeNeedsSdBlockId(mockNode)).toBe(true);
  });
});

describe('checkForNewBlockNodesInTrs', () => {
  // Helper function to create mock nodes
  const createMockNode = (isBlock, hasAttribute) => ({
    isBlock,
    type: {
      spec: {
        attrs: hasAttribute ? { sdBlockId: { default: null } } : {},
      },
    },
  });

  // Helper function to create mock transactions
  const createMockTransaction = (steps) => ({ steps });

  it('should return true when ReplaceStep contains block nodes with sdBlockId attribute', () => {
    const blockNode = createMockNode(true, true);
    const replaceStep = new ReplaceStep(0, 1, {
      content: {
        content: [blockNode],
      },
    });

    const transaction = createMockTransaction([replaceStep]);
    const transactions = [transaction];

    expect(checkForNewBlockNodesInTrs(transactions)).toBe(true);
  });

  it('should return false when ReplaceStep contains only inline nodes', () => {
    const inlineNode = createMockNode(false, true);
    const replaceStep = new ReplaceStep(0, 1, {
      content: {
        content: [inlineNode],
      },
    });

    const transaction = createMockTransaction([replaceStep]);
    const transactions = [transaction];

    expect(checkForNewBlockNodesInTrs(transactions)).toBe(false);
  });

  it('should return false when ReplaceStep contains block nodes without sdBlockId attribute', () => {
    const blockNodeWithoutAttr = createMockNode(true, false);
    const replaceStep = new ReplaceStep(0, 1, {
      content: {
        content: [blockNodeWithoutAttr],
      },
    });

    const transaction = createMockTransaction([replaceStep]);
    const transactions = [transaction];

    expect(checkForNewBlockNodesInTrs(transactions)).toBe(false);
  });

  it('should return false when step is not a ReplaceStep', () => {
    const blockNode = createMockNode(true, true);
    const otherStep = new OtherStep();
    otherStep.slice = {
      content: {
        content: [blockNode],
      },
    };

    const transaction = createMockTransaction([otherStep]);
    const transactions = [transaction];

    expect(checkForNewBlockNodesInTrs(transactions)).toBe(false);
  });

  it('should return false when ReplaceStep has no slice', () => {
    const replaceStep = new ReplaceStep(0, 1, null);

    const transaction = createMockTransaction([replaceStep]);
    const transactions = [transaction];

    expect(checkForNewBlockNodesInTrs(transactions)).toBe(false);
  });

  it('should return false when slice has no content', () => {
    const replaceStep = new ReplaceStep(0, 1, {});

    const transaction = createMockTransaction([replaceStep]);
    const transactions = [transaction];

    expect(checkForNewBlockNodesInTrs(transactions)).toBe(false);
  });

  it('should return false when content has no content array', () => {
    const replaceStep = new ReplaceStep(0, 1, {
      content: {},
    });

    const transaction = createMockTransaction([replaceStep]);
    const transactions = [transaction];

    expect(checkForNewBlockNodesInTrs(transactions)).toBe(false);
  });

  it('should return false when content array is empty', () => {
    const replaceStep = new ReplaceStep(0, 1, {
      content: {
        content: [],
      },
    });

    const transaction = createMockTransaction([replaceStep]);
    const transactions = [transaction];

    expect(checkForNewBlockNodesInTrs(transactions)).toBe(false);
  });

  it('should return true when multiple transactions contain valid block nodes', () => {
    const blockNode = createMockNode(true, true);
    const replaceStep = new ReplaceStep(0, 1, {
      content: {
        content: [blockNode],
      },
    });

    const transaction1 = createMockTransaction([new OtherStep()]);
    const transaction2 = createMockTransaction([replaceStep]);
    const transactions = [transaction1, transaction2];

    expect(checkForNewBlockNodesInTrs(transactions)).toBe(true);
  });

  it('should return true when transaction has multiple steps with valid block nodes', () => {
    const blockNode = createMockNode(true, true);
    const replaceStep = new ReplaceStep(0, 1, {
      content: {
        content: [blockNode],
      },
    });

    const transaction = createMockTransaction([new OtherStep(), replaceStep]);
    const transactions = [transaction];

    expect(checkForNewBlockNodesInTrs(transactions)).toBe(true);
  });

  it('should return true when ReplaceStep contains mixed nodes but at least one valid block', () => {
    const inlineNode = createMockNode(false, true);
    const blockNodeWithoutAttr = createMockNode(true, false);
    const validBlockNode = createMockNode(true, true);

    const replaceStep = new ReplaceStep(0, 1, {
      content: {
        content: [inlineNode, blockNodeWithoutAttr, validBlockNode],
      },
    });

    const transaction = createMockTransaction([replaceStep]);
    const transactions = [transaction];

    expect(checkForNewBlockNodesInTrs(transactions)).toBe(true);
  });

  it('should handle empty transactions array', () => {
    expect(checkForNewBlockNodesInTrs([])).toBe(false);
  });

  it('should handle transactions with empty steps arrays', () => {
    const transaction = createMockTransaction([]);
    const transactions = [transaction];

    expect(checkForNewBlockNodesInTrs(transactions)).toBe(false);
  });

  it('should handle null/undefined values gracefully', () => {
    const replaceStep = new ReplaceStep(0, 1, {
      content: {
        content: [null, undefined],
      },
    });

    const transaction = createMockTransaction([replaceStep]);
    const transactions = [transaction];

    // This should not throw an error
    expect(checkForNewBlockNodesInTrs(transactions)).toBe(false);
  });
});
