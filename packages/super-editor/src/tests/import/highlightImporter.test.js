import { describe, it, expect } from 'vitest';
import { highlightNodeEntityHandler } from '../../core/super-converter/v2/importer/highlightImporter.js';

describe('v2 importer: highlightImporter', () => {
  const handler = highlightNodeEntityHandler.handler;

  it('returns consumed=0 for non w:highlight nodes', () => {
    const res = handler({ nodes: [{ name: 'w:r' }] });
    expect(res.consumed).toBe(0);
    expect(res.nodes).toEqual([]);
  });

  it('encodes w:highlight into an attribute entry with w:val', () => {
    const res = handler({ nodes: [{ name: 'w:highlight', attributes: { 'w:val': 'yellow' } }] });
    expect(res.consumed).toBe(1);
    const out = res.nodes[0];
    expect(out.type).toBe('attr');
    expect(out.xmlName).toBe('w:highlight');
    expect(out.sdNodeOrKeyName).toBe('highlight');
    expect(out.attributes).toMatchObject({ 'w:val': 'yellow' });
  });
});

