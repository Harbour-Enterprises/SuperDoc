import { describe, it, expect } from 'vitest';
import { italicNodeEntityHandler } from '../../core/super-converter/v2/importer/italicImporter.js';

describe('v2 importer: italicImporter', () => {
  const handler = italicNodeEntityHandler.handler;

  it('returns consumed=0 for non w:i nodes', () => {
    const res = handler({ nodes: [{ name: 'w:b' }] });
    expect(res.consumed).toBe(0);
    expect(res.nodes).toEqual([]);
  });

  it('encodes w:i into an attribute entry with w:val passthrough', () => {
    const res = handler({ nodes: [{ name: 'w:i', attributes: { 'w:val': '0' } }] });
    expect(res.consumed).toBe(1);
    const out = res.nodes[0];
    expect(out.type).toBe('attr');
    expect(out.xmlName).toBe('w:i');
    expect(out.sdNodeOrKeyName).toBe('italic');
    expect(out.attributes).toMatchObject({ 'w:val': '0' });
  });
});

