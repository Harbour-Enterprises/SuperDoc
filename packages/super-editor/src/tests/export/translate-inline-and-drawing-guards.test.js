import { describe, it, expect } from 'vitest';
import { translateInlineNode } from '@core/super-converter/v3/handlers/wp/inline/helpers/translate-inline-node.js';
import { translator as wDrawingTranslator } from '@core/super-converter/v3/handlers/w/drawing/drawing-translator.js';

describe('translateInlineNode guard', () => {
  it('returns a text run when image/signature fallback yields no drawing', () => {
    const params = {
      node: {
        type: 'fieldAnnotation',
        attrs: {
          type: 'signature',
          src: 'data:,', // invalid image data -> fallback to text
          displayLabel: 'Signature',
        },
      },
      media: {},
      relationships: [],
      converter: { convertedXml: {} },
      editor: { extensionService: { extensions: [] } },
    };
    const result = translateInlineNode(params);
    expect(result).toBeTruthy();
    expect(result.name).toBe('w:r');
  });

  it('returns wp:inline for proper image nodes', () => {
    const params = {
      node: {
        type: 'image',
        attrs: {
          src: 'word/media/image1.png',
          size: { width: 128, height: 64 },
        },
      },
      media: {},
      relationships: [],
      converter: { convertedXml: {} },
      editor: { extensionService: { extensions: [] } },
    };
    const result = translateInlineNode(params);
    expect(result).toBeTruthy();
    expect(result.name).toBe('wp:inline');
    const hasExtent = result.elements?.some?.((el) => el.name === 'wp:extent');
    expect(Boolean(hasExtent)).toBe(true);
  });
});

describe('drawing-translator decode guard', () => {
  it('does not wrap text run in w:drawing when child is not a drawing', () => {
    const params = {
      node: {
        // child translator: wp:inline by default (isAnchor=false)
        // but translateInlineNode will return a text run due to invalid signature data
        type: 'fieldAnnotation',
        attrs: {
          type: 'signature',
          src: 'data:,',
          displayLabel: 'Signature',
          isAnchor: false,
        },
      },
      media: {},
      relationships: [],
      converter: { convertedXml: {} },
      editor: { extensionService: { extensions: [] } },
    };
    const wrapped = wDrawingTranslator.decode(params);
    expect(wrapped).toBeTruthy();
    expect(wrapped.name).toBe('w:r'); // returned as-is, not wrapped in w:drawing
  });

  it('wraps valid drawing children in w:drawing', () => {
    const params = {
      node: {
        type: 'image',
        attrs: {
          src: 'word/media/image1.png',
          size: { width: 64, height: 64 },
          isAnchor: false,
        },
      },
      media: {},
      relationships: [],
      converter: { convertedXml: {} },
      editor: { extensionService: { extensions: [] } },
    };
    const wrapped = wDrawingTranslator.decode(params);
    expect(wrapped).toBeTruthy();
    expect(wrapped.name).toBe('w:r');
    const drawing = wrapped.elements?.find?.((el) => el.name === 'w:drawing');
    expect(Boolean(drawing)).toBe(true);
    const inline = drawing?.elements?.find?.((el) => el.name === 'wp:inline');
    expect(Boolean(inline)).toBe(true);
  });
});
