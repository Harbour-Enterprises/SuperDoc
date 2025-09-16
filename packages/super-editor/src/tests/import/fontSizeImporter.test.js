import { describe, it, expect } from 'vitest';
import { fontSizeNodeEntityHandler } from '../../core/super-converter/v2/importer/fontSizeImporter.js';

describe('v2 importer: fontSizeImporter', () => {
  const handler = fontSizeNodeEntityHandler.handler;

  it('returns consumed=0 for non size nodes', () => {
    const res = handler({ nodes: [{ name: 'w:color' }] });
    expect(res.consumed).toBe(0);
    expect(res.nodes).toEqual([]);
  });

  it('encodes w:sz element into an attribute entry', () => {
    const res = handler({ nodes: [{ name: 'w:sz', attributes: { 'w:val': '32' } }] });
    expect(res.consumed).toBe(1);
    expect(res.nodes).toHaveLength(1);
    const out = res.nodes[0];
    expect(out.type).toBe('attr');
    expect(out.xmlName).toBe('w:sz');
    expect(out.sdNodeOrKeyName).toBe('fontSize');
    expect(out.attributes).toMatchObject({ 'w:val': '32' });
  });

  it('encodes w:szCs element into an attribute entry', () => {
    const res = handler({ nodes: [{ name: 'w:szCs', attributes: { 'w:val': '24' } }] });
    expect(res.consumed).toBe(1);
    const out = res.nodes[0];
    expect(out.type).toBe('attr');
    expect(out.xmlName).toBe('w:szCs');
    expect(out.sdNodeOrKeyName).toBe('fontSizeCs');
    expect(out.attributes).toMatchObject({ 'w:val': '24' });
  });
});

