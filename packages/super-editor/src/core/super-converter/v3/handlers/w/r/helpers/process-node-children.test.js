import { describe, it, expect, vi } from 'vitest';
import { processNodeChildren } from './process-node-children.js';

describe('processNodeChildren', () => {
  it('returns empty arrays/objects when children is not an array', () => {
    const res = processNodeChildren(null, {}, { handler: vi.fn() });
    expect(res).toEqual({ runProperties: {}, contentNodes: [] });
  });

  it('separates content nodes and extracts runProperties', () => {
    const rPrNode = { name: 'w:rPr' };
    const contentA = { name: 'w:t', elements: [] };
    const contentB = { name: 'w:br' };
    const children = [rPrNode, contentA, contentB];

    const contentResult = [{ type: 'text', text: 'Hello' }];
    const attrs = [{ xmlName: 'w:b', attributes: { 'w:val': '1' } }];

    const handler = vi.fn((arg) => {
      if (arg.nodes?.length === 1 && arg.nodes[0] === rPrNode) {
        return [{ type: 'attr', sdNodeOrKeyName: 'runProperties', attributes: attrs }];
      }
      return contentResult;
    });

    const res = processNodeChildren(children, { foo: 'bar' }, { handler });
    expect(res.contentNodes).toEqual(contentResult);
    expect(res.runProperties).toEqual({ runProperties: attrs });
    expect(handler).toHaveBeenCalledTimes(2);
  });
});
