import { describe, it, expect } from 'vitest';
import { translateImageNode } from '@core/super-converter/v3/handlers/wp/helpers/decode-image-node-helpers.js';
import { prepareImageAnnotation } from '@core/super-converter/v3/handlers/w/sdt/helpers/translate-field-annotation.js';

describe('Image/Signature placeholders export', () => {
  it('generates non-zero ids for wp:docPr and pic:cNvPr when attrs.id is missing', () => {
    const params = {
      node: {
        type: 'image',
        attrs: {
          // no id provided on purpose
          src: 'word/media/image1.png',
          size: { width: 64, height: 64 },
        },
      },
      media: {},
      relationships: [],
      converter: { convertedXml: {} },
    };

    const inline = translateImageNode(params);
    expect(inline).toBeTruthy();

    const docPr = inline.elements.find((el) => el.name === 'wp:docPr');
    expect(docPr).toBeTruthy();
    expect(Number(docPr.attributes.id)).toBeGreaterThan(0);

    const graphic = inline.elements.find((el) => el.name === 'a:graphic');
    const graphicData = graphic.elements.find((el) => el.name === 'a:graphicData');
    const pic = graphicData.elements.find((el) => el.name === 'pic:pic');
    const nvPicPr = pic.elements.find((el) => el.name === 'pic:nvPicPr');
    const cNvPr = nvPicPr.elements.find((el) => el.name === 'pic:cNvPr');
    expect(Number(cNvPr.attributes.id)).toBeGreaterThan(0);
  });

  it('preserves provided positive id for wp:docPr and pic:cNvPr when attrs.id is set', () => {
    const providedId = 12345;
    const params = {
      node: {
        type: 'image',
        attrs: {
          id: providedId,
          src: 'word/media/image1.png',
          size: { width: 64, height: 64 },
        },
      },
      media: {},
      relationships: [],
      converter: { convertedXml: {} },
      editor: { extensionService: { extensions: [] } },
    };

    const inline = translateImageNode(params);
    const docPr = inline.elements.find((el) => el.name === 'wp:docPr');
    expect(Number(docPr.attributes.id)).toBe(providedId);

    const graphic = inline.elements.find((el) => el.name === 'a:graphic');
    const graphicData = graphic.elements.find((el) => el.name === 'a:graphicData');
    const pic = graphicData.elements.find((el) => el.name === 'pic:pic');
    const nvPicPr = pic.elements.find((el) => el.name === 'pic:nvPicPr');
    const cNvPr = nvPicPr.elements.find((el) => el.name === 'pic:cNvPr');
    expect(Number(cNvPr.attributes.id)).toBe(providedId);
  });

  it('falls back to text when signature fieldAnnotation lacks a valid image data type', () => {
    const params = {
      node: {
        type: 'fieldAnnotation',
        attrs: {
          type: 'signature',
          // invalid/empty data url type -> should fallback to text
          src: 'data:,',
          displayLabel: 'Signature',
        },
      },
      media: {},
      relationships: [],
      converter: { convertedXml: {} },
      editor: { extensionService: { extensions: [] } },
    };

    const result = prepareImageAnnotation(params, { w: 990000, h: 495000 });
    // In this invalid data case, it should be a text run (w:r) structure (not wrapped in w:drawing)
    expect(result).toBeTruthy();
    expect(result.name).toBe('w:r');
    const hasDrawing = result.elements?.some?.((el) => el.name === 'w:drawing');
    expect(Boolean(hasDrawing)).toBe(false);
  });
});
