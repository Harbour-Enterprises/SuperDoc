import { handleImageNode } from './encode-image-node-helpers.js';
import { emuToPixels, polygonToObj } from '@converter/helpers.js';

vi.mock('@converter/helpers.js', () => ({
  emuToPixels: vi.fn(),
  polygonToObj: vi.fn(),
}));

describe('handleImageNode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    emuToPixels.mockImplementation((emu) => (emu ? parseInt(emu, 10) / 1000 : 0));
    polygonToObj.mockImplementation((polygon) => {
      if (!polygon) return null;
      const points = [];
      polygon.elements.forEach((element) => {
        if (['wp:start', 'wp:lineTo'].includes(element.name)) {
          const { x, y } = element.attributes;
          points.push([parseInt(x, 10) / 1000, parseInt(y, 10) / 1000]);
        }
      });
      return points;
    });
  });

  const makeNode = (overrides = {}) => ({
    attributes: {
      distT: '1000',
      distB: '2000',
      distL: '3000',
      distR: '4000',
      ...overrides.attributes,
    },
    elements: [
      { name: 'wp:extent', attributes: { cx: '5000', cy: '6000' } },
      {
        name: 'a:graphic',
        elements: [
          {
            name: 'a:graphicData',
            attributes: { uri: 'pic' },
            elements: [
              {
                name: 'pic:pic',
                elements: [
                  {
                    name: 'pic:blipFill',
                    elements: [{ name: 'a:blip', attributes: { 'r:embed': 'rId1' } }],
                  },
                ],
              },
            ],
          },
        ],
      },
      { name: 'wp:docPr', attributes: { id: '42', name: 'MyImage', descr: 'Alt text' } },
    ],
  });

  const makeParams = (relsTarget = 'media/image.png') => ({
    filename: 'document.xml',
    docx: {
      'word/_rels/document.xml.rels': {
        elements: [
          {
            name: 'Relationships',
            elements: [
              {
                name: 'Relationship',
                attributes: { Id: 'rId1', Target: relsTarget },
              },
            ],
          },
        ],
      },
    },
  });

  it('returns null if picture is missing', () => {
    const node = makeNode();
    node.elements[1].elements[0].elements = [];
    const result = handleImageNode(node, makeParams(), false);
    expect(result).toBeNull();
  });

  it('returns null if r:embed is missing', () => {
    const node = {
      name: 'wp:drawing',
      elements: [
        { name: 'wp:extent', attributes: { cx: '5000', cy: '6000' } },
        {
          name: 'a:graphic',
          elements: [
            {
              name: 'a:graphicData',
              elements: [
                {
                  name: 'pic:pic',
                  elements: [
                    {
                      name: 'pic:blipFill',
                      elements: [
                        {
                          name: 'a:blip',
                          attributes: {}, // r:embed is missing
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      attributes: {}, // optional
    };

    const result = handleImageNode(node, makeParams(), false);
    expect(result).toBeNull();
  });

  it('returns null if no relationship found', () => {
    const node = makeNode();
    const result = handleImageNode(node, { docx: { 'word/_rels/document.xml.rels': { elements: [] } } }, false);
    expect(result).toBeNull();
  });

  it('handles basic image with padding, size, rel target', () => {
    const node = makeNode();
    const result = handleImageNode(node, makeParams(), true);

    expect(result.type).toBe('image');
    expect(result.attrs.src).toBe('word/media/image.png');
    expect(result.attrs.extension).toBe('png');
    expect(result.attrs.id).toBe('42');
    expect(result.attrs.alt).toBe('MyImage');
    expect(result.attrs.title).toBe('Alt text');
    expect(result.attrs.isAnchor).toBe(true);
    expect(result.attrs.size).toEqual({ width: 5, height: 6 }); // emuToPixels mocked
  });

  it('normalizes targetPath starting with /word', () => {
    const node = makeNode();
    const params = makeParams('/word/media/pic.jpg');
    const result = handleImageNode(node, params, false);
    expect(result.attrs.src).toBe('word/media/pic.jpg');
    expect(result.attrs.extension).toBe('jpg');
  });

  it('normalizes targetPath starting with /media', () => {
    const node = makeNode();
    const params = makeParams('/media/pic.gif');
    const result = handleImageNode(node, params, false);
    expect(result.attrs.src).toBe('media/pic.gif');
    expect(result.attrs.extension).toBe('gif');
  });

  it('returns alt text for EMF/WMF', () => {
    const node = makeNode();
    const params = makeParams('media/pic.emf');
    const result = handleImageNode(node, params, false);
    expect(result.attrs.alt).toBe('Unable to render EMF/WMF image');
    expect(result.attrs.extension).toBe('emf');
  });

  it('includes simplePos, wrapSquare, anchorData', () => {
    const node = makeNode({
      attributes: { distT: '111', distB: '222', distL: '333', distR: '444' },
    });

    node.elements.push({ name: 'wp:simplePos', attributes: { x: '1', y: '2' } });
    node.elements.push({ name: 'wp:wrapSquare', attributes: { wrapText: 'bothSides' } });
    node.elements.push({
      name: 'wp:positionH',
      attributes: { relativeFrom: 'page' },
      elements: [
        { name: 'wp:posOffset', elements: [{ text: '1000' }] },
        { name: 'wp:align', elements: [{ text: 'center' }] },
      ],
    });
    node.elements.push({
      name: 'wp:positionV',
      attributes: { relativeFrom: 'margin' },
      elements: [
        { name: 'wp:posOffset', elements: [{ text: '2000' }] },
        { name: 'wp:align', elements: [{ text: 'bottom' }] },
      ],
    });

    const result = handleImageNode(node, makeParams(), true);

    expect(result.attrs.simplePos).toEqual({ x: '1', y: '2' });
    expect(result.attrs.wrap.attrs.wrapText).toBe('bothSides');
    expect(result.attrs.anchorData).toEqual({
      hRelativeFrom: 'page',
      vRelativeFrom: 'margin',
      alignH: 'center',
      alignV: 'bottom',
    });
    expect(result.attrs.marginOffset).toEqual({ horizontal: 1, top: 2 });
  });

  it('delegates to handleShapeDrawing when uri matches shape', () => {
    const node = makeNode();
    node.elements[1].elements[0].attributes.uri = 'http://schemas.microsoft.com/office/word/2010/wordprocessingShape';
    node.elements[1].elements[0].elements = [{ name: 'wps:wsp', elements: [] }];

    const result = handleImageNode(node, makeParams(), false);
    expect(result === null || result.type === 'contentBlock').toBe(true);
  });

  describe('wrap types', () => {
    it('handles wrap type None', () => {
      const node = makeNode();
      node.elements.push({ name: 'wp:wrapNone' });

      const result = handleImageNode(node, makeParams(), true);

      expect(result.attrs.wrap.type).toBe('None');
      expect(result.attrs.wrap.attrs).toEqual({ behindDoc: false });
    });

    it('handles wrap type Square with wrapText only', () => {
      const node = makeNode();
      node.elements.push({
        name: 'wp:wrapSquare',
        attributes: { wrapText: 'bothSides' },
      });

      const result = handleImageNode(node, makeParams(), true);

      expect(result.attrs.wrap.type).toBe('Square');
      expect(result.attrs.wrap.attrs.wrapText).toBe('bothSides');
    });

    it('handles wrap type Square with distance attributes', () => {
      const node = makeNode();
      node.elements.push({
        name: 'wp:wrapSquare',
        attributes: {
          wrapText: 'largest',
          distT: '1000',
          distB: '2000',
          distL: '3000',
          distR: '4000',
        },
      });

      const result = handleImageNode(node, makeParams(), true);

      expect(result.attrs.wrap.type).toBe('Square');
      expect(result.attrs.wrap.attrs.wrapText).toBe('largest');
      expect(result.attrs.wrap.attrs.distTop).toBe(1);
      expect(result.attrs.wrap.attrs.distBottom).toBe(2);
      expect(result.attrs.wrap.attrs.distLeft).toBe(3);
      expect(result.attrs.wrap.attrs.distRight).toBe(4);
    });

    it('handles wrap type TopAndBottom without distance attributes', () => {
      const node = makeNode();
      node.elements.push({ name: 'wp:wrapTopAndBottom' });

      const result = handleImageNode(node, makeParams(), true);

      expect(result.attrs.wrap.type).toBe('TopAndBottom');
      expect(result.attrs.wrap.attrs).toEqual({});
    });

    it('handles wrap type TopAndBottom with distance attributes', () => {
      const node = makeNode();
      node.elements.push({
        name: 'wp:wrapTopAndBottom',
        attributes: {
          distT: '5000',
          distB: '6000',
        },
      });

      const result = handleImageNode(node, makeParams(), true);

      expect(result.attrs.wrap.type).toBe('TopAndBottom');
      expect(result.attrs.wrap.attrs.distTop).toBe(5);
      expect(result.attrs.wrap.attrs.distBottom).toBe(6);
    });

    it('handles wrap type Tight without polygon', () => {
      const node = makeNode();
      node.elements.push({
        name: 'wp:wrapTight',
        attributes: {
          distL: '2000',
          distR: '3000',
        },
      });

      const result = handleImageNode(node, makeParams(), true);

      expect(result.attrs.wrap.type).toBe('Tight');
      expect(result.attrs.wrap.attrs.distLeft).toBe(2);
      expect(result.attrs.wrap.attrs.distRight).toBe(3);
    });

    it('handles wrap type Tight with polygon', () => {
      const node = makeNode();
      node.elements.push({
        name: 'wp:wrapTight',
        attributes: {
          distT: '1000',
          distB: '2000',
        },
        elements: [
          {
            name: 'wp:polygon',
            elements: [
              { name: 'wp:start', attributes: { x: '1000', y: '2000' } },
              { name: 'wp:lineTo', attributes: { x: '3000', y: '4000' } },
              { name: 'wp:lineTo', attributes: { x: '5000', y: '6000' } },
            ],
          },
        ],
      });

      const result = handleImageNode(node, makeParams(), true);

      expect(result.attrs.wrap.type).toBe('Tight');
      expect(result.attrs.wrap.attrs.distTop).toBe(1);
      expect(result.attrs.wrap.attrs.distBottom).toBe(2);
      expect(result.attrs.wrap.attrs.polygon).toEqual([
        [1, 2],
        [3, 4],
        [5, 6],
      ]);
    });

    it('handles wrap type Through without polygon', () => {
      const node = makeNode();
      node.elements.push({
        name: 'wp:wrapThrough',
        attributes: {
          distL: '1500',
          distR: '2500',
          distT: '500',
          distB: '750',
        },
      });

      const result = handleImageNode(node, makeParams(), true);

      expect(result.attrs.wrap.type).toBe('Through');
      expect(result.attrs.wrap.attrs.distLeft).toBe(1.5);
      expect(result.attrs.wrap.attrs.distRight).toBe(2.5);
      expect(result.attrs.wrap.attrs.distTop).toBe(0.5);
      expect(result.attrs.wrap.attrs.distBottom).toBe(0.75);
    });

    it('handles wrap type Through with polygon', () => {
      const node = makeNode();
      node.elements.push({
        name: 'wp:wrapThrough',
        elements: [
          {
            name: 'wp:polygon',
            elements: [
              { name: 'wp:start', attributes: { x: '10000', y: '20000' } },
              { name: 'wp:lineTo', attributes: { x: '30000', y: '40000' } },
            ],
          },
        ],
      });

      const result = handleImageNode(node, makeParams(), true);

      expect(result.attrs.wrap.type).toBe('Through');
      expect(result.attrs.wrap.attrs.polygon).toEqual([
        [10, 20],
        [30, 40],
      ]);
    });

    it('defaults to None wrap type when no wrap element found', () => {
      const node = makeNode();
      // No wrap element added

      const result = handleImageNode(node, makeParams(), true);

      expect(result.attrs.wrap.type).toBe('None');
      expect(result.attrs.wrap.attrs).toEqual({ behindDoc: false });
    });
  });
});
