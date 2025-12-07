import { describe, it, expect } from 'vitest';
import { enrichParagraphNodes } from '../../helpers/enrichContent';

describe('enrichParagraphNodes', () => {
  it('should add default spacing to paragraph nodes without spacing', () => {
    const input = [
      { type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }
    ];

    const result = enrichParagraphNodes(input);

    expect(result[0].attrs).toBeDefined();
    expect(result[0].attrs.spacing).toEqual({
      after: null,
      before: null,
      line: null,
      lineRule: 'auto'
    });
  });

  it('should preserve existing spacing attributes', () => {
    const input = [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Hello' }],
        attrs: {
          spacing: { after: 100, before: 50, line: 120, lineRule: 'exact' }
        }
      }
    ];

    const result = enrichParagraphNodes(input);

    expect(result[0].attrs.spacing).toEqual({
      after: 100,
      before: 50,
      line: 120,
      lineRule: 'exact'
    });
  });

  it('should preserve other attrs while adding spacing', () => {
    const input = [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Hello' }],
        attrs: { styleId: 'Heading1' }
      }
    ];

    const result = enrichParagraphNodes(input);

    expect(result[0].attrs.styleId).toBe('Heading1');
    expect(result[0].attrs.spacing).toEqual({
      after: null,
      before: null,
      line: null,
      lineRule: 'auto'
    });
  });

  it('should not affect non-paragraph nodes', () => {
    const input = [
      { type: 'heading', level: 1, content: [{ type: 'text', text: 'Title' }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'Content' }] }
    ];

    const result = enrichParagraphNodes(input);

    // Heading should remain unchanged
    expect(result[0].type).toBe('heading');
    expect(result[0].attrs).toBeUndefined();

    // Paragraph should have spacing added
    expect(result[1].type).toBe('paragraph');
    expect(result[1].attrs.spacing).toBeDefined();
  });

  it('should handle empty arrays', () => {
    const result = enrichParagraphNodes([]);
    expect(result).toEqual([]);
  });

  it('should handle non-array input gracefully', () => {
    const result = enrichParagraphNodes(null as any);
    expect(result).toBeNull();
  });

  it('should not mutate original nodes', () => {
    const input = [
      { type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }
    ];

    const original = JSON.parse(JSON.stringify(input));
    const result = enrichParagraphNodes(input);

    // Original should be unchanged
    expect(input).toEqual(original);

    // Result should have spacing
    expect(result[0].attrs.spacing).toBeDefined();
  });

  it('should handle multiple paragraph nodes', () => {
    const input = [
      { type: 'paragraph', content: [{ type: 'text', text: 'First' }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'Second' }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'Third' }] }
    ];

    const result = enrichParagraphNodes(input);

    result.forEach(node => {
      expect(node.attrs.spacing).toEqual({
        after: null,
        before: null,
        line: null,
        lineRule: 'auto'
      });
    });
  });
});
