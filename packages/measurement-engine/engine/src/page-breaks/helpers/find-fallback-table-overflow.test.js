import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { findFallbackTableOverflow } from './find-fallback-table-overflow.js';

// Mock the imported functions
vi.mock('./index.js', () => ({
  isTableNode: vi.fn(),
  findBreakPosInTable: vi.fn(),
}));

import { isTableNode, findBreakPosInTable } from './index.js';

/**
 * Helper to create a mock ProseMirror node
 */
const createMockNode = (type = 'table', nodeSize = 10) => ({
  type: { name: type },
  nodeSize,
});

/**
 * Helper to create a mock document with descendants
 */
const createMockDoc = (nodes = []) => ({
  descendants: vi.fn((callback) => {
    nodes.forEach(({ node, pos }) => {
      callback(node, pos);
    });
  }),
});

/**
 * Helper to create a mock view
 */
const createMockView = (doc = null) => ({
  state: { doc: doc || createMockDoc() },
  nodeDOM: vi.fn((pos) => ({
    getBoundingClientRect: () => ({
      top: 100,
      bottom: 200,
      left: 50,
      right: 250,
      width: 200,
      height: 100,
    }),
  })),
});

describe('findFallbackTableOverflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete globalThis.__paginationTableLogs;
  });

  afterEach(() => {
    delete globalThis.__paginationTableLogs;
  });

  it('returns null when view is null', () => {
    const result = findFallbackTableOverflow(null, 0, 500);
    expect(result).toBeNull();
  });

  it('returns null when view.state is undefined', () => {
    const view = {};
    const result = findFallbackTableOverflow(view, 0, 500);
    expect(result).toBeNull();
  });

  it('returns null when doc is null', () => {
    const view = { state: { doc: null } };
    const result = findFallbackTableOverflow(view, 0, 500);
    expect(result).toBeNull();
  });

  it('returns null when no tables are found in document', () => {
    const nodes = [
      { node: createMockNode('paragraph', 10), pos: 0 },
      { node: createMockNode('heading', 15), pos: 10 },
    ];
    const doc = createMockDoc(nodes);
    const view = createMockView(doc);

    isTableNode.mockReturnValue(false);

    const result = findFallbackTableOverflow(view, 0, 500);

    expect(result).toBeNull();
    expect(isTableNode).toHaveBeenCalledTimes(2);
  });

  it('skips non-table nodes and continues scanning', () => {
    const nodes = [
      { node: createMockNode('paragraph', 10), pos: 0 },
      { node: createMockNode('table', 50), pos: 10 },
    ];
    const doc = createMockDoc(nodes);
    const view = createMockView(doc);

    isTableNode.mockImplementation((node) => node.type.name === 'table');
    findBreakPosInTable.mockReturnValue({ primary: { pos: 30, top: 100, bottom: 150 } });

    const result = findFallbackTableOverflow(view, 0, 500);

    expect(result).not.toBeNull();
    expect(isTableNode).toHaveBeenCalledTimes(2);
  });

  it('returns null when table has no overflow', () => {
    const nodes = [{ node: createMockNode('table', 50), pos: 0 }];
    const doc = createMockDoc(nodes);
    const view = createMockView(doc);

    isTableNode.mockReturnValue(true);
    findBreakPosInTable.mockReturnValue(null);

    const result = findFallbackTableOverflow(view, 0, 500);

    expect(result).toBeNull();
  });

  it('returns null when table overflow has no primary break', () => {
    const nodes = [{ node: createMockNode('table', 50), pos: 0 }];
    const doc = createMockDoc(nodes);
    const view = createMockView(doc);

    isTableNode.mockReturnValue(true);
    findBreakPosInTable.mockReturnValue({ secondary: { pos: 30 } });

    const result = findFallbackTableOverflow(view, 0, 500);

    expect(result).toBeNull();
  });

  it('returns break point and overflow block when table overflows', () => {
    const tableNode = createMockNode('table', 50);
    const nodes = [{ node: tableNode, pos: 10 }];
    const doc = createMockDoc(nodes);
    const view = createMockView(doc);

    isTableNode.mockReturnValue(true);
    const mockBreak = { primary: { pos: 30, top: 100, bottom: 150 } };
    findBreakPosInTable.mockReturnValue(mockBreak);

    const result = findFallbackTableOverflow(view, 0, 500, 0);

    expect(result).toBeDefined();
    expect(result.breakPoint).toBe(mockBreak);
    expect(result.overflowBlock).toBeDefined();
    expect(result.overflowBlock.node).toBe(tableNode);
    expect(result.overflowBlock.pos).toBe(10);
    expect(result.overflowBlock.rect).toBeDefined();
  });

  it('uses minPos parameter in findBreakPosInTable call', () => {
    const nodes = [{ node: createMockNode('table', 50), pos: 10 }];
    const doc = createMockDoc(nodes);
    const view = createMockView(doc);

    isTableNode.mockReturnValue(true);
    findBreakPosInTable.mockReturnValue({ primary: { pos: 30 } });

    findFallbackTableOverflow(view, 5, 500, 8);

    expect(findBreakPosInTable).toHaveBeenCalledWith(
      view,
      10,
      expect.any(Object),
      500,
      8, // minPos should be used
    );
  });

  it('uses startPos when minPos is not provided', () => {
    const nodes = [{ node: createMockNode('table', 50), pos: 10 }];
    const doc = createMockDoc(nodes);
    const view = createMockView(doc);

    isTableNode.mockReturnValue(true);
    findBreakPosInTable.mockReturnValue({ primary: { pos: 30 } });

    findFallbackTableOverflow(view, 15, 500);

    expect(findBreakPosInTable).toHaveBeenCalledWith(
      view,
      10,
      expect.any(Object),
      500,
      15, // startPos should be used as minPos default
    );
  });

  it('uses max of minPos and startPos', () => {
    const nodes = [{ node: createMockNode('table', 50), pos: 10 }];
    const doc = createMockDoc(nodes);
    const view = createMockView(doc);

    isTableNode.mockReturnValue(true);
    findBreakPosInTable.mockReturnValue({ primary: { pos: 30 } });

    findFallbackTableOverflow(view, 20, 500, 15);

    expect(findBreakPosInTable).toHaveBeenCalledWith(
      view,
      10,
      expect.any(Object),
      500,
      20, // max(15, 20) = 20
    );
  });

  it('stops scanning after finding first overflow table', () => {
    const nodes = [
      { node: createMockNode('table', 50), pos: 10 },
      { node: createMockNode('table', 60), pos: 60 },
    ];
    const doc = createMockDoc(nodes);
    const view = createMockView(doc);

    isTableNode.mockReturnValue(true);
    findBreakPosInTable.mockReturnValueOnce({ primary: { pos: 30 } }).mockReturnValueOnce({ primary: { pos: 80 } });

    findFallbackTableOverflow(view, 0, 500);

    // Should only check the first table
    expect(findBreakPosInTable).toHaveBeenCalledTimes(1);
  });

  it('handles exception when calling nodeDOM', () => {
    const nodes = [{ node: createMockNode('table', 50), pos: 10 }];
    const doc = createMockDoc(nodes);
    const view = createMockView(doc);
    view.nodeDOM.mockImplementation(() => {
      throw new Error('nodeDOM failed');
    });

    isTableNode.mockReturnValue(true);
    findBreakPosInTable.mockReturnValue({ primary: { pos: 30 } });

    const result = findFallbackTableOverflow(view, 0, 500);

    expect(result).toBeDefined();
    expect(result.overflowBlock.rect).toBeNull();
  });

  it('handles exception when calling getBoundingClientRect', () => {
    const nodes = [{ node: createMockNode('table', 50), pos: 10 }];
    const doc = createMockDoc(nodes);
    const view = createMockView(doc);
    view.nodeDOM.mockReturnValue({
      getBoundingClientRect: () => {
        throw new Error('getBoundingClientRect failed');
      },
    });

    isTableNode.mockReturnValue(true);
    findBreakPosInTable.mockReturnValue({ primary: { pos: 30 } });

    const result = findFallbackTableOverflow(view, 0, 500);

    expect(result).toBeDefined();
    expect(result.overflowBlock.rect).toBeNull();
  });

  it('sets rect to null when DOM element does not have getBoundingClientRect', () => {
    const nodes = [{ node: createMockNode('table', 50), pos: 10 }];
    const doc = createMockDoc(nodes);
    const view = createMockView(doc);
    view.nodeDOM.mockReturnValue({});

    isTableNode.mockReturnValue(true);
    findBreakPosInTable.mockReturnValue({ primary: { pos: 30 } });

    const result = findFallbackTableOverflow(view, 0, 500);

    expect(result).toBeDefined();
    expect(result.overflowBlock.rect).toBeNull();
  });

  it('logs to globalThis.__paginationTableLogs when available', () => {
    globalThis.__paginationTableLogs = [];

    const nodes = [{ node: createMockNode('table', 50), pos: 10 }];
    const doc = createMockDoc(nodes);
    const view = createMockView(doc);

    isTableNode.mockReturnValue(true);
    findBreakPosInTable.mockReturnValue({ primary: { pos: 30 } });

    findFallbackTableOverflow(view, 5, 500, 2);

    expect(globalThis.__paginationTableLogs.length).toBeGreaterThan(0);
    expect(globalThis.__paginationTableLogs[0]).toMatchObject({
      stage: 'fallback-start',
      startPos: 5,
      boundaryY: 500,
      minPos: 2,
    });
  });

  it('logs fallback-miss when no overflow is found', () => {
    globalThis.__paginationTableLogs = [];

    const nodes = [{ node: createMockNode('table', 50), pos: 10 }];
    const doc = createMockDoc(nodes);
    const view = createMockView(doc);

    isTableNode.mockReturnValue(true);
    findBreakPosInTable.mockReturnValue(null);

    findFallbackTableOverflow(view, 5, 500, 2);

    const missLog = globalThis.__paginationTableLogs.find((log) => log.stage === 'fallback-miss');
    expect(missLog).toBeDefined();
    expect(missLog.info.startPos).toBe(5);
    expect(missLog.info.boundaryY).toBe(500);
    expect(missLog.info.inspectedTables).toBe(1);
  });

  it('does not log when globalThis.__paginationTableLogs is not an array', () => {
    globalThis.__paginationTableLogs = null;

    const nodes = [{ node: createMockNode('table', 50), pos: 10 }];
    const doc = createMockDoc(nodes);
    const view = createMockView(doc);

    isTableNode.mockReturnValue(true);
    findBreakPosInTable.mockReturnValue({ primary: { pos: 30 } });

    // Should not throw
    expect(() => {
      findFallbackTableOverflow(view, 5, 500, 2);
    }).not.toThrow();
  });

  it('scans multiple tables when earlier ones do not overflow', () => {
    const nodes = [
      { node: createMockNode('table', 50), pos: 10 },
      { node: createMockNode('table', 60), pos: 60 },
    ];
    const doc = createMockDoc(nodes);
    const view = createMockView(doc);

    isTableNode.mockReturnValue(true);
    findBreakPosInTable.mockReturnValueOnce(null).mockReturnValueOnce({ primary: { pos: 80 } });

    const result = findFallbackTableOverflow(view, 0, 500);

    expect(result).toBeDefined();
    expect(result.overflowBlock.pos).toBe(60);
    expect(findBreakPosInTable).toHaveBeenCalledTimes(2);
  });

  it('handles empty document', () => {
    const doc = createMockDoc([]);
    const view = createMockView(doc);

    const result = findFallbackTableOverflow(view, 0, 500);

    expect(result).toBeNull();
  });

  it('respects default minPos of 0', () => {
    const nodes = [{ node: createMockNode('table', 50), pos: 10 }];
    const doc = createMockDoc(nodes);
    const view = createMockView(doc);

    isTableNode.mockReturnValue(true);
    findBreakPosInTable.mockReturnValue({ primary: { pos: 30 } });

    findFallbackTableOverflow(view, -5, 500);

    expect(findBreakPosInTable).toHaveBeenCalledWith(
      view,
      10,
      expect.any(Object),
      500,
      0, // max(0, -5) = 0
    );
  });
});
