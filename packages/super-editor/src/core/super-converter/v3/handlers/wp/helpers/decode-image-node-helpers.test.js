import { translateImageNode } from '@converter/v3/handlers/wp/helpers/decode-image-node-helpers.js';
import * as helpers from '@converter/helpers.js';
import * as annotationHelpers from '@converter/v3/handlers/w/sdt/helpers/translate-field-annotation.js';

vi.mock('@converter/helpers.js', () => ({
  emuToPixels: vi.fn((v) => v / 9525), // 1 emu ≈ 1/9525 px
  pixelsToEmu: vi.fn((v) => v * 9525),
}));

vi.mock('@converter/v3/handlers/w/sdt/helpers/translate-field-annotation.js', () => ({
  prepareTextAnnotation: vi.fn(() => ({ type: 'text', text: 'annotation' })),
}));

vi.mock('@core/helpers/index.js', () => ({
  generateDocxRandomId: vi.fn(() => '123'),
}));

describe('translateImageNode', () => {
  let baseParams;

  beforeEach(() => {
    baseParams = {
      node: {
        type: 'image',
        attrs: {
          src: 'word/media/test.png',
          size: { width: 100, height: 50 },
          id: 1,
        },
      },
      relationships: [],
      media: {},
    };
    vi.clearAllMocks();
  });

  it('should convert basic image node with size to wp:extent', () => {
    const result = translateImageNode(baseParams);

    expect(result.elements.find((e) => e.name === 'wp:extent').attributes).toEqual({
      cx: helpers.pixelsToEmu(100),
      cy: helpers.pixelsToEmu(50),
    });
    expect(result.attributes).toEqual({
      distT: 0,
      distB: 0,
      distL: 0,
      distR: 0,
    });
  });

  it('should reuse given rId if provided', () => {
    baseParams.node.attrs.rId = 'rId999';
    const result = translateImageNode(baseParams);

    const blip = result.elements
      .find((e) => e.name === 'a:graphic')
      .elements[0].elements[0].elements.find((e) => e.name === 'pic:blipFill')
      .elements.find((e) => e.name === 'a:blip');

    expect(blip.attributes['r:embed']).toBe('rId999');
    expect(baseParams.relationships.length).toBe(0);
  });

  it('should generate a new relationship if rId is missing', () => {
    const result = translateImageNode(baseParams);

    expect(baseParams.relationships.length).toBe(1);
    expect(baseParams.relationships[0].attributes.Type).toContain('relationships/image');
    expect(result.elements).toEqual(expect.arrayContaining([expect.objectContaining({ name: 'a:graphic' })]));
  });

  it('should call prepareTextAnnotation for fieldAnnotation without type', () => {
    const params = {
      ...baseParams,
      node: {
        type: 'fieldAnnotation',
        attrs: { src: 'data:;base64,' },
      },
    };

    const result = translateImageNode(params);
    expect(annotationHelpers.prepareTextAnnotation).toHaveBeenCalledWith(params);
    expect(result).toEqual({ type: 'text', text: 'annotation' });
  });

  it('should resize images inside tableCell to maxWidth', () => {
    baseParams.node.attrs.size = { width: 500, height: 500 };
    baseParams.tableCell = {
      attrs: { colwidth: [200, 200], cellMargins: { left: 10, right: 10 } },
    };

    const result = translateImageNode(baseParams);

    const extent = result.elements.find((e) => e.name === 'wp:extent').attributes;
    expect(extent.cx).toBeLessThan(helpers.pixelsToEmu(500));
  });
});
