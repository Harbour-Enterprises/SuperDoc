import { describe, it, expect } from 'vitest';
import { colorNodeEntityHandler } from '../../core/super-converter/v2/importer/colorImporter.js';

describe('v2 importer: colorImporter', () => {
  const handler = colorNodeEntityHandler.handler;

  it('returns consumed=0 for non w:color nodes', () => {
    const res = handler({ nodes: [{ name: 'w:sz' }] });
    expect(res.consumed).toBe(0);
    expect(res.nodes).toEqual([]);
  });

  it('encodes w:color into an attribute entry with w:val', () => {
    const res = handler({ nodes: [{ name: 'w:color', attributes: { 'w:val': 'FF0000' } }] });
    expect(res.consumed).toBe(1);
    const out = res.nodes[0];
    expect(out.type).toBe('attr');
    expect(out.xmlName).toBe('w:color');
    expect(out.sdNodeOrKeyName).toBe('color');
    expect(out.attributes).toMatchObject({ 'w:val': 'FF0000' });
  });
});

