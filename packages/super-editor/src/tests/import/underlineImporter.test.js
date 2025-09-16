import { describe, it, expect } from 'vitest';
import { underlineNodeEntityHandler } from '../../core/super-converter/v2/importer/underlineImporter.js';

describe('v2 importer: underlineImporter', () => {
  const handler = underlineNodeEntityHandler.handler;

  it('returns consumed=0 for non w:u nodes', () => {
    const res = handler({ nodes: [{ name: 'w:color' }] });
    expect(res.consumed).toBe(0);
    expect(res.nodes).toEqual([]);
  });

  it('encodes w:u with basic attributes (val)', () => {
    const res = handler({ nodes: [{ name: 'w:u', attributes: { 'w:val': 'dash' } }] });
    expect(res.consumed).toBe(1);
    const out = res.nodes[0];
    expect(out.type).toBe('attr');
    expect(out.xmlName).toBe('w:u');
    expect(out.sdNodeOrKeyName).toBe('underline');
    expect(out.attributes).toMatchObject({ 'w:val': 'dash' });
  });

  it('preserves color and themeColor on w:u', () => {
    const res = handler({ nodes: [{ name: 'w:u', attributes: { 'w:val': 'single', 'w:color': 'FF0000', 'w:themeColor': 'accent1' } }] });
    const out = res.nodes[0];
    expect(out.attributes).toMatchObject({ 'w:val': 'single', 'w:color': 'FF0000', 'w:themeColor': 'accent1' });
  });
});

