import { describe, it, expect } from 'vitest';
import { boldNodeEntityHandler } from '../../core/super-converter/v2/importer/boldImporter.js';

describe('v2 importer: boldImporter', () => {
  const handler = boldNodeEntityHandler.handler;

  it('returns consumed=0 for non w:b nodes', () => {
    const res = handler({ nodes: [{ name: 'w:i' }] });
    expect(res.consumed).toBe(0);
    expect(res.nodes).toEqual([]);
  });

  it('encodes w:b into an attribute entry', () => {
    const params = { nodes: [{ name: 'w:b', attributes: {} }] };
    const res = handler(params);
    expect(res.consumed).toBe(1);
    expect(res.nodes).toHaveLength(1);
    const out = res.nodes[0];
    expect(out.type).toBe('attr');
    expect(out.xmlName).toBe('w:b');
    expect(out.sdNodeOrKeyName).toBe('bold');
  });

  it('preserves explicit w:val="0" when present', () => {
    const params = { nodes: [{ name: 'w:b', attributes: { 'w:val': '0' } }] };
    const res = handler(params);
    const out = res.nodes[0];
    expect(out.attributes).toMatchObject({ 'w:val': '0' });
  });
});

