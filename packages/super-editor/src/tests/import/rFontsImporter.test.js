import { describe, it, expect } from 'vitest';
import { rFontsNodeEntityHandler } from '../../core/super-converter/v2/importer/rFontsImporter.js';

describe('v2 importer: rFontsImporter', () => {
  const handler = rFontsNodeEntityHandler.handler;

  it('returns consumed=0 for non w:rFonts nodes', () => {
    const res = handler({ nodes: [{ name: 'w:color' }] });
    expect(res.consumed).toBe(0);
    expect(res.nodes).toEqual([]);
  });

  it('encodes w:rFonts into an attribute entry with font attributes', () => {
    const res = handler({ nodes: [{ name: 'w:rFonts', attributes: { 'w:ascii': 'Arial', 'w:hAnsi': 'Arial' } }] });
    expect(res.consumed).toBe(1);
    const out = res.nodes[0];
    expect(out.type).toBe('attr');
    expect(out.xmlName).toBe('w:rFonts');
    // Translator's sd key is 'fontFamily'; rPr aggregation uses xmlName/attributes, not this key
    expect(out.sdNodeOrKeyName).toBe('fontFamily');
    expect(out.attributes).toMatchObject({ 'w:ascii': 'Arial', 'w:hAnsi': 'Arial' });
  });
});
