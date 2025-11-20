import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleImageNode, getVectorShape } from './encode-image-node-helpers.js';
import { emuToPixels, polygonToObj, rotToDegrees } from '@converter/helpers.js';
import { extractFillColor, extractStrokeColor, extractStrokeWidth } from './vector-shape-helpers.js';

vi.mock('@converter/helpers.js', () => ({
  emuToPixels: vi.fn(),
  polygonToObj: vi.fn(),
  rotToDegrees: vi.fn(),
}));

vi.mock('./vector-shape-helpers.js', () => ({
  extractFillColor: vi.fn(),
  extractStrokeColor: vi.fn(),
  extractStrokeWidth: vi.fn(),
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

  const shapeUri = 'http://schemas.microsoft.com/office/word/2010/wordprocessingShape';

  const makeShapeNode = ({ includeTextbox = false, prst = 'ellipse' } = {}) => {
    const wspChildren = [
      {
        name: 'wps:spPr',
        elements: [
          {
            name: 'a:prstGeom',
            attributes: { prst },
          },
        ],
      },
    ];

    if (includeTextbox) {
      wspChildren.push({
        name: 'wps:txbx',
        elements: [
          {
            name: 'w:txbxContent',
            elements: [{ name: 'w:p' }],
          },
        ],
      });
    }

    return {
      attributes: {
        distT: '1000',
        distB: '2000',
        distL: '3000',
        distR: '4000',
      },
      elements: [
        { name: 'wp:extent', attributes: { cx: '5000', cy: '6000' } },
        {
          name: 'a:graphic',
          elements: [
            {
              name: 'a:graphicData',
              attributes: { uri: shapeUri },
              elements: [
                {
                  name: 'wps:wsp',
                  elements: wspChildren,
                },
              ],
            },
          ],
        },
        { name: 'wp:docPr', attributes: { id: '99', name: 'Shape', descr: 'Shape placeholder' } },
        {
          name: 'wp:positionH',
          attributes: { relativeFrom: 'page' },
          elements: [{ name: 'wp:posOffset', elements: [{ text: '7000' }] }],
        },
        {
          name: 'wp:positionV',
          attributes: { relativeFrom: 'paragraph' },
          elements: [{ name: 'wp:posOffset', elements: [{ text: '8000' }] }],
        },
      ],
    };
  };

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
    const node = makeShapeNode();

    const result = handleImageNode(node, makeParams(), false);
    expect(result.type).toBe('vectorShape');
  });

  it('marks textbox shapes with a specific placeholder type', () => {
    const node = makeShapeNode({ includeTextbox: true });
    const result = handleImageNode(node, makeParams(), false);

    expect(result.type).toBe('contentBlock');
    expect(result.attrs.attributes).toMatchObject({
      'data-shape-type': 'textbox',
      'data-padding-top': 1,
    });
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
          wrapText: 'bothSides',
        },
        elements: [
          {
            name: 'wp:wrapPolygon',
            attributes: { edited: '0' },
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
      expect(result.attrs.wrap.attrs.wrapText).toBe('bothSides');
      expect(result.attrs.wrap.attrs.polygon).toEqual([
        [1, 2],
        [3, 4],
        [5, 6],
      ]);
      expect(result.attrs.wrap.attrs.polygonEdited).toBe('0');
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
          wrapText: 'bothSides',
        },
      });

      const result = handleImageNode(node, makeParams(), true);

      expect(result.attrs.wrap.type).toBe('Through');
      expect(result.attrs.wrap.attrs.distLeft).toBe(1.5);
      expect(result.attrs.wrap.attrs.distRight).toBe(2.5);
      expect(result.attrs.wrap.attrs.distTop).toBe(0.5);
      expect(result.attrs.wrap.attrs.distBottom).toBe(0.75);
      expect(result.attrs.wrap.attrs.wrapText).toBe('bothSides');
    });

    it('handles wrap type Through with polygon', () => {
      const node = makeNode();
      node.elements.push({
        name: 'wp:wrapThrough',
        elements: [
          {
            name: 'wp:wrapPolygon',
            attributes: { edited: '1' },
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
      expect(result.attrs.wrap.attrs.polygonEdited).toBe('1');
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

describe('getVectorShape', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    emuToPixels.mockImplementation((emu) => parseInt(emu, 10) / 12700);
    rotToDegrees.mockImplementation((rot) => parseInt(rot, 10) / 60000);
    extractFillColor.mockReturnValue('#70ad47');
    extractStrokeColor.mockReturnValue('#000000');
    extractStrokeWidth.mockReturnValue(1);
  });

  const makeGraphicData = (overrides = {}) => ({
    elements: [
      {
        name: 'wps:wsp',
        elements: [
          {
            name: 'wps:spPr',
            elements: [
              {
                name: 'a:prstGeom',
                attributes: { prst: 'ellipse' },
              },
              {
                name: 'a:xfrm',
                attributes: { rot: '0', flipH: '0', flipV: '0' },
                elements: [
                  {
                    name: 'a:ext',
                    attributes: { cx: '914400', cy: '914400' },
                  },
                ],
              },
              ...(overrides.spPrElements || []),
            ],
          },
          {
            name: 'wps:style',
            elements: [],
          },
        ],
      },
    ],
  });

  const makeParams = () => ({
    nodes: [{ name: 'w:drawing', elements: [] }],
  });

  it('returns null when wsp is missing', () => {
    const graphicData = { elements: [] };
    const result = getVectorShape({ params: makeParams(), node: {}, graphicData });
    expect(result).toBeNull();
  });

  it('returns null when spPr is missing', () => {
    const graphicData = {
      elements: [{ name: 'wps:wsp', elements: [] }],
    };
    const result = getVectorShape({ params: makeParams(), node: {}, graphicData });
    expect(result).toBeNull();
  });

  it('extracts basic shape properties', () => {
    const graphicData = makeGraphicData();
    const result = getVectorShape({ params: makeParams(), node: {}, graphicData });

    expect(result.type).toBe('vectorShape');
    expect(result.attrs.kind).toBe('ellipse');
    expect(result.attrs.width).toBe(72); // 914400 / 12700
    expect(result.attrs.height).toBe(72);
    expect(result.attrs.rotation).toBe(0);
    expect(result.attrs.flipH).toBe(false);
    expect(result.attrs.flipV).toBe(false);
  });

  it('extracts colors and stroke width', () => {
    const graphicData = makeGraphicData();
    const result = getVectorShape({ params: makeParams(), node: {}, graphicData });

    expect(extractFillColor).toHaveBeenCalled();
    expect(extractStrokeColor).toHaveBeenCalled();
    expect(extractStrokeWidth).toHaveBeenCalled();

    expect(result.attrs.fillColor).toBe('#70ad47');
    expect(result.attrs.strokeColor).toBe('#000000');
    expect(result.attrs.strokeWidth).toBe(1);
  });

  it('handles rotation and flips', () => {
    const graphicData = makeGraphicData();
    graphicData.elements[0].elements[0].elements[1].attributes = {
      rot: '5400000', // 90 degrees
      flipH: '1',
      flipV: '1',
    };

    const result = getVectorShape({ params: makeParams(), node: {}, graphicData });

    expect(result.attrs.rotation).toBe(90);
    expect(result.attrs.flipH).toBe(true);
    expect(result.attrs.flipV).toBe(true);
  });

  it('uses default size when extent is missing', () => {
    const graphicData = makeGraphicData();
    graphicData.elements[0].elements[0].elements[1].elements = [];

    const result = getVectorShape({ params: makeParams(), node: {}, graphicData });

    expect(result.attrs.width).toBe(100);
    expect(result.attrs.height).toBe(100);
  });

  it('stores drawingContent when present', () => {
    const drawingNode = { name: 'w:drawing', elements: [] };
    const params = { nodes: [drawingNode] };
    const graphicData = makeGraphicData();

    const result = getVectorShape({ params, node: {}, graphicData });

    expect(result.attrs.drawingContent).toBe(drawingNode);
  });

  it('handles missing shape kind with warning', () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const graphicData = makeGraphicData();
    graphicData.elements[0].elements[0].elements[0].attributes = {}; // No prst

    const result = getVectorShape({ params: makeParams(), node: {}, graphicData });

    expect(consoleWarnSpy).toHaveBeenCalledWith('Shape kind not found');
    expect(result.attrs.kind).toBeUndefined();

    consoleWarnSpy.mockRestore();
  });
});
