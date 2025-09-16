import { describe, it, expect } from 'vitest';
import { rStyleNodeEntityHandler } from '../../core/super-converter/v2/importer/rStyleImporter.js';

describe('v2 importer: rStyleImporter', () => {
  const handler = rStyleNodeEntityHandler.handler;

  it('returns consumed=0 for non w:rStyle nodes', () => {
    const res = handler({ nodes: [{ name: 'w:r' }] });
    expect(res.consumed).toBe(0);
    expect(res.nodes).toEqual([]);
  });

  it('encodes w:rStyle into an attribute entry with w:val', () => {
    const res = handler({ nodes: [{ name: 'w:rStyle', attributes: { 'w:val': 'Heading1Char' } }] });
    expect(res.consumed).toBe(1);
    const out = res.nodes[0];
    expect(out.type).toBe('attr');
    expect(out.xmlName).toBe('w:rStyle');
    expect(out.sdNodeOrKeyName).toBe('styleId');
    expect(out.attributes).toMatchObject({ 'w:val': 'Heading1Char' });
  });
});
