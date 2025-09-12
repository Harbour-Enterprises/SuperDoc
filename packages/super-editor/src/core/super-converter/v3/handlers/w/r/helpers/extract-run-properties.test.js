import { describe, it, expect, vi } from 'vitest';
import { extractRunProperties } from './extract-run-properties.js';

describe('extractRunProperties', () => {
  it('returns runProperties when handler returns attributes entry', () => {
    const rPrNode = { name: 'w:rPr' };
    const params = { some: 'param' };
    const attributes = [{ xmlName: 'w:b', attributes: { 'w:val': '1' } }];
    const nodeListHandler = {
      handler: vi.fn(() => [{ type: 'attr', sdNodeOrKeyName: 'runProperties', attributes }]),
    };

    const res = extractRunProperties(rPrNode, params, nodeListHandler);
    expect(res).toEqual({ runProperties: attributes });
    expect(nodeListHandler.handler).toHaveBeenCalledOnce();
    expect(nodeListHandler.handler).toHaveBeenCalledWith({ ...params, nodes: [rPrNode] });
  });

  it('returns {} when no matching entry is present', () => {
    const nodeListHandler = { handler: vi.fn(() => [{ type: 'other' }]) };
    const res = extractRunProperties({ name: 'w:rPr' }, {}, nodeListHandler);
    expect(res).toEqual({});
  });

  it('returns {} when attributes are not an array', () => {
    const nodeListHandler = {
      handler: vi.fn(() => [{ type: 'attr', sdNodeOrKeyName: 'runProperties', attributes: null }]),
    };
    const res = extractRunProperties({ name: 'w:rPr' }, {}, nodeListHandler);
    expect(res).toEqual({});
  });
});
