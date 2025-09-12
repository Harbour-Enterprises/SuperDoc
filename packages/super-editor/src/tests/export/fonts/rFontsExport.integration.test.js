import { describe, it, expect } from 'vitest';
import { getExportedResultWithDocContent } from '../export-helpers/index.js';

describe('rFonts export integration', () => {
  it('preserves all font family attributes on export', async () => {
    const content = [
      {
        type: 'paragraph',
        content: [
          {
            type: 'run',
            content: [
              {
                type: 'text',
                text: 'Hello',
                marks: [
                  {
                    type: 'textStyle',
                    attrs: {
                      fontFamily: 'Arial, sans-serif',
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
    ];

    const result = await getExportedResultWithDocContent(content);
    const body = result.elements.find((n) => n.name === 'w:body');
    const p = body.elements.find((n) => n.name === 'w:p');
    const r = p.elements.find((n) => n.name === 'w:r');
    const rPr = r.elements.find((n) => n.name === 'w:rPr');
    const rFonts = rPr.elements.find((n) => n.name === 'w:rFonts');

    expect(rFonts).toBeDefined();
    expect(rFonts.attributes['w:ascii']).toBe('Arial');
    expect(rFonts.attributes['w:eastAsia']).toBe('Arial');
    expect(rFonts.attributes['w:hAnsi']).toBe('Arial');
    expect(rFonts.attributes['w:cs']).toBe('Arial');
    // Export path does not add w:val; unit translator tests cover optional mapping of eastAsia -> w:val
    expect(rFonts.attributes['w:val']).toBeUndefined();
  });
});
