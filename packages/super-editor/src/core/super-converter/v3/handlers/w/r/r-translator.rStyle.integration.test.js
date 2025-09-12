import { describe, it, expect } from 'vitest';
import { config } from './r-translator.js';

describe('w:r translator decode integration for w:rStyle', () => {
  it('emits w:rPr containing w:rStyle from runProperties', () => {
    const node = {
      // Simulate a run with runProperties already on the node (as set by encoder path)
      attrs: {
        runProperties: [{ xmlName: 'w:rStyle', attributes: { 'w:val': 'Emphasis' } }],
      },
      // No children to avoid dependency on export helpers
      content: [],
    };

    const out = config.decode({ node });
    expect(out).toEqual({
      name: 'w:r',
      elements: [
        {
          name: 'w:rPr',
          elements: [{ name: 'w:rStyle', attributes: { 'w:val': 'Emphasis' } }],
        },
      ],
    });
  });
});
