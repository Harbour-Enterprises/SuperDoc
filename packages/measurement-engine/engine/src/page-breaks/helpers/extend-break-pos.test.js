import { describe, it, expect } from 'vitest';
import { extendBreakPositionWithSectionMarkers } from './extend-break-pos.js';

/**
 * Helper to create a mock ProseMirror node
 */
const createMockNode = (type, attrs = {}, nodeSize = 1) => ({
  type: { name: type },
  attrs,
  nodeSize,
});

/**
 * Helper to create a mock ProseMirror document
 */
const createMockDoc = (children) => {
  let offset = 0;
  const childNodes = children.map((child) => {
    const node = createMockNode(child.type, child.attrs, child.nodeSize);
    offset += child.nodeSize;
    return node;
  });

  return {
    content: {
      size: offset,
      findIndex: (pos) => {
        let currentOffset = 0;
        for (let i = 0; i < children.length; i++) {
          const child = children[i];
          if (pos >= currentOffset && pos < currentOffset + child.nodeSize) {
            return { index: i, offset: currentOffset };
          }
          currentOffset += child.nodeSize;
        }
        return { index: -1, offset: currentOffset };
      },
    },
    childCount: children.length,
    child: (index) => createMockNode(children[index].type, children[index].attrs, children[index].nodeSize),
  };
};

describe('extendBreakPositionWithSectionMarkers', () => {
  it('returns original position when doc is null', () => {
    const result = extendBreakPositionWithSectionMarkers(null, 10);
    expect(result).toBe(10);
  });

  it('returns original position when doc has no content', () => {
    const doc = { content: null };
    const result = extendBreakPositionWithSectionMarkers(doc, 10);
    expect(result).toBe(10);
  });

  it('returns original position when doc.content.findIndex is not a function', () => {
    const doc = { content: { size: 100 } };
    const result = extendBreakPositionWithSectionMarkers(doc, 10);
    expect(result).toBe(10);
  });

  it('returns original position when findIndex returns negative index', () => {
    const doc = createMockDoc([{ type: 'paragraph', nodeSize: 10 }]);
    doc.content.findIndex = () => ({ index: -1, offset: 0 });
    const result = extendBreakPositionWithSectionMarkers(doc, 5);
    expect(result).toBe(5);
  });

  it('extends to end of current node when break is within a node', () => {
    const doc = createMockDoc([
      { type: 'paragraph', nodeSize: 10 },
      { type: 'paragraph', nodeSize: 15 },
    ]);

    // Break at position 5, which is in the middle of the first node (0-10)
    const result = extendBreakPositionWithSectionMarkers(doc, 5);
    expect(result).toBe(10); // Should extend to end of first node
  });

  it('keeps position at end of current node when already at boundary', () => {
    const doc = createMockDoc([
      { type: 'paragraph', nodeSize: 10 },
      { type: 'paragraph', nodeSize: 15 },
    ]);

    // Break exactly at the end of first node
    const result = extendBreakPositionWithSectionMarkers(doc, 10);
    expect(result).toBe(10);
  });

  it('extends through consecutive sectPr paragraphs', () => {
    const doc = createMockDoc([
      { type: 'paragraph', nodeSize: 10 },
      { type: 'paragraph', attrs: { pageBreakSource: 'sectPr' }, nodeSize: 5 },
      { type: 'paragraph', attrs: { pageBreakSource: 'sectPr' }, nodeSize: 5 },
      { type: 'paragraph', nodeSize: 15 },
    ]);

    // Break at position 10, which is at the start of sectPr paragraphs
    const result = extendBreakPositionWithSectionMarkers(doc, 10);
    expect(result).toBe(20); // Should extend through both sectPr paragraphs (10 + 5 + 5)
  });

  it('stops extending when encountering a non-sectPr paragraph', () => {
    const doc = createMockDoc([
      { type: 'paragraph', nodeSize: 10 },
      { type: 'paragraph', attrs: { pageBreakSource: 'sectPr' }, nodeSize: 5 },
      { type: 'paragraph', nodeSize: 15 }, // Regular paragraph
    ]);

    // Break at position 10
    const result = extendBreakPositionWithSectionMarkers(doc, 10);
    expect(result).toBe(15); // Should extend through only the sectPr paragraph
  });

  it('handles break within a sectPr paragraph', () => {
    const doc = createMockDoc([
      { type: 'paragraph', nodeSize: 10 },
      { type: 'paragraph', attrs: { pageBreakSource: 'sectPr' }, nodeSize: 8 },
      { type: 'paragraph', attrs: { pageBreakSource: 'sectPr' }, nodeSize: 7 },
      { type: 'paragraph', nodeSize: 15 },
    ]);

    // Break at position 12, which is within the first sectPr paragraph (10-18)
    const result = extendBreakPositionWithSectionMarkers(doc, 12);
    expect(result).toBe(25); // Should extend to end of current sectPr and all following sectPr nodes (10 + 8 + 7)
  });

  it('does not extend past document size', () => {
    const doc = createMockDoc([
      { type: 'paragraph', nodeSize: 10 },
      { type: 'paragraph', attrs: { pageBreakSource: 'sectPr' }, nodeSize: 5 },
    ]);

    // Break at position 10
    const result = extendBreakPositionWithSectionMarkers(doc, 10);
    expect(result).toBe(15); // Should not exceed document size
    expect(result).toBeLessThanOrEqual(doc.content.size);
  });

  it('clamps result to minimum of break position', () => {
    const doc = createMockDoc([{ type: 'paragraph', nodeSize: 10 }]);

    const result = extendBreakPositionWithSectionMarkers(doc, 5);
    expect(result).toBeGreaterThanOrEqual(5);
  });

  it('handles non-finite adjusted position', () => {
    const doc = createMockDoc([
      { type: 'paragraph', nodeSize: 10 },
      { type: 'paragraph', attrs: { pageBreakSource: 'sectPr' }, nodeSize: 5 },
    ]);

    // Inject NaN into the calculation path by mocking nodeSize
    const originalChild = doc.child;
    doc.child = (index) => {
      const node = originalChild.call(doc, index);
      if (index === 1) {
        return { ...node, nodeSize: NaN };
      }
      return node;
    };

    const result = extendBreakPositionWithSectionMarkers(doc, 10);
    expect(result).toBe(10); // Should fallback to original position
  });

  it('handles empty document', () => {
    const doc = createMockDoc([]);
    const result = extendBreakPositionWithSectionMarkers(doc, 0);
    expect(result).toBe(0);
  });

  it('handles break at position 0', () => {
    const doc = createMockDoc([
      { type: 'paragraph', attrs: { pageBreakSource: 'sectPr' }, nodeSize: 5 },
      { type: 'paragraph', nodeSize: 10 },
    ]);

    const result = extendBreakPositionWithSectionMarkers(doc, 0);
    expect(result).toBe(5); // Should extend through the sectPr paragraph at the start
  });

  it('handles multiple sectPr paragraphs in sequence', () => {
    const doc = createMockDoc([
      { type: 'paragraph', nodeSize: 10 },
      { type: 'paragraph', attrs: { pageBreakSource: 'sectPr' }, nodeSize: 3 },
      { type: 'paragraph', attrs: { pageBreakSource: 'sectPr' }, nodeSize: 4 },
      { type: 'paragraph', attrs: { pageBreakSource: 'sectPr' }, nodeSize: 5 },
      { type: 'paragraph', nodeSize: 15 },
    ]);

    const result = extendBreakPositionWithSectionMarkers(doc, 10);
    expect(result).toBe(22); // 10 + 3 + 4 + 5 = 22
  });

  it('ignores non-paragraph nodes when checking for sectPr', () => {
    const doc = createMockDoc([
      { type: 'paragraph', nodeSize: 10 },
      { type: 'heading', attrs: { pageBreakSource: 'sectPr' }, nodeSize: 5 }, // Not a paragraph
      { type: 'paragraph', nodeSize: 15 },
    ]);

    const result = extendBreakPositionWithSectionMarkers(doc, 10);
    expect(result).toBe(10); // Should not extend through non-paragraph node
  });

  it('handles sectPr with different pageBreakSource values', () => {
    const doc = createMockDoc([
      { type: 'paragraph', nodeSize: 10 },
      { type: 'paragraph', attrs: { pageBreakSource: 'hardBreak' }, nodeSize: 5 },
      { type: 'paragraph', nodeSize: 15 },
    ]);

    const result = extendBreakPositionWithSectionMarkers(doc, 10);
    expect(result).toBe(10); // Should not extend through non-sectPr paragraph
  });

  it('handles break at exact document end', () => {
    const doc = createMockDoc([
      { type: 'paragraph', nodeSize: 10 },
      { type: 'paragraph', attrs: { pageBreakSource: 'sectPr' }, nodeSize: 5 },
    ]);

    const result = extendBreakPositionWithSectionMarkers(doc, 15);
    expect(result).toBe(15);
  });

  it('handles break past document end', () => {
    const doc = createMockDoc([
      { type: 'paragraph', nodeSize: 10 },
      { type: 'paragraph', nodeSize: 5 },
    ]);

    const result = extendBreakPositionWithSectionMarkers(doc, 20);
    expect(result).toBe(20); // Should clamp to max of breakPos and docSize
  });

  it('maintains minimum break position constraint', () => {
    const doc = createMockDoc([
      { type: 'paragraph', nodeSize: 10 },
      { type: 'paragraph', attrs: { pageBreakSource: 'sectPr' }, nodeSize: 5 },
    ]);

    const result = extendBreakPositionWithSectionMarkers(doc, 8);
    expect(result).toBeGreaterThanOrEqual(8);
  });
});
