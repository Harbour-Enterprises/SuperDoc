import { describe, it, expect } from 'vitest';
import { handleRunNode } from '../../core/super-converter/v2/importer/runNodeImporter.js';

describe('v2 importer: runNodeImporter', () => {
  it('returns consumed=0 for non w:r nodes', () => {
    const res = handleRunNode({ nodes: [{ name: 'w:t' }] });
    expect(res.consumed).toBe(0);
    expect(res.nodes).toEqual([]);
  });

  it('returns one encoded schema node for w:r', () => {
    // Minimal runnable run with a text child
    const params = {
      nodes: [
        {
          name: 'w:r',
          elements: [{ name: 'w:t', elements: [{ text: 'Hello' }] }],
        },
      ],
      nodeListHandler: { handler: () => [{ type: 'text', text: 'Hello' }] },
    };
    const res = handleRunNode(params);
    expect(res.consumed).toBe(1);
    expect(Array.isArray(res.nodes)).toBe(true);
    expect(res.nodes.length).toBe(1);
    const out = res.nodes[0];
    // Expect a text result (per r-translator encoding)
    expect(out.type).toBe('text');
    expect(out.text).toBe('Hello');
  });
});

