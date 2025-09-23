import { translateAnchorNode } from './translate-anchor-node.js';
import { translateImageNode } from '../../helpers/decode-image-node-helpers.js';
import { pixelsToEmu } from '../../../../../helpers.js';

vi.mock('@converter/v3/handlers/wp/helpers/decode-image-node-helpers.js', () => ({
  translateImageNode: vi.fn(),
}));

vi.mock('@converter/helpers.js', () => ({
  pixelsToEmu: vi.fn(),
}));

describe('translateAnchorNode', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // default mock for translateImageNode
    translateImageNode.mockReturnValue({
      attributes: { fakeAttr: 'val' },
      elements: [{ name: 'pic:fake' }],
    });

    // default mock for pixelsToEmu
    pixelsToEmu.mockImplementation((px) => px * 1000);
  });

  it('should add wp:simplePos if simplePos is true', () => {
    const params = { node: { attrs: { simplePos: true } } };

    const result = translateAnchorNode(params);

    expect(result.elements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'wp:simplePos',
          attributes: { x: 0, y: 0 },
        }),
      ]),
    );
  });

  it('should add wp:positionH with posOffset when marginOffset.left is defined', () => {
    const params = {
      node: {
        attrs: {
          anchorData: { hRelativeFrom: 'margin' },
          marginOffset: { left: 10 },
        },
      },
    };

    const result = translateAnchorNode(params);

    const posH = result.elements.find((e) => e.name === 'wp:positionH');
    expect(posH.attributes.relativeFrom).toBe('margin');
    expect(posH.elements[0].name).toBe('wp:posOffset');
    expect(posH.elements[0].elements[0].text).toBe('10000'); // 10 * 1000
    expect(pixelsToEmu).toHaveBeenCalledWith(10);
  });

  it('should add wp:positionV with posOffset and alignV', () => {
    const params = {
      node: {
        attrs: {
          anchorData: { vRelativeFrom: 'page', alignV: 'bottom' },
          marginOffset: { top: 20 },
        },
      },
    };

    const result = translateAnchorNode(params);

    const posV = result.elements.find((e) => e.name === 'wp:positionV');
    expect(posV.attributes.relativeFrom).toBe('page');
    expect(posV.elements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'wp:posOffset',
        }),
        expect.objectContaining({
          name: 'wp:align',
          elements: [expect.objectContaining({ text: 'bottom', type: 'text' })],
        }),
      ]),
    );
  });

  it('should add wp:wrapSquare if wrapText is provided', () => {
    const params = { node: { attrs: { wrapText: 'bothSides' } } };

    const result = translateAnchorNode(params);

    expect(result.elements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'wp:wrapSquare',
          attributes: { wrapText: 'bothSides' },
        }),
      ]),
    );
  });

  it('should add wp:wrapTopAndBottom if wrapTopAndBottom is true', () => {
    const params = { node: { attrs: { wrapTopAndBottom: true } } };

    const result = translateAnchorNode(params);

    expect(result.elements).toEqual(expect.arrayContaining([expect.objectContaining({ name: 'wp:wrapTopAndBottom' })]));
  });

  it('should fallback to wp:wrapNone if no wrapping is set', () => {
    const params = { node: { attrs: {} } };

    const result = translateAnchorNode(params);

    expect(result.elements).toEqual(expect.arrayContaining([expect.objectContaining({ name: 'wp:wrapNone' })]));
  });

  it('should include originalAttributes in inlineAttrs', () => {
    const params = {
      node: {
        attrs: {
          originalAttributes: {
            simplePos: 'orig',
            behindDoc: true,
            locked: false,
            layoutInCell: true,
            allowOverlap: true,
          },
        },
      },
    };

    const result = translateAnchorNode(params);

    expect(result.attributes).toMatchObject({
      fakeAttr: 'val',
      simplePos: 'orig',
      relativeHeight: 1,
      behindDoc: true,
      locked: false,
      layoutInCell: true,
      allowOverlap: true,
    });
  });
});
