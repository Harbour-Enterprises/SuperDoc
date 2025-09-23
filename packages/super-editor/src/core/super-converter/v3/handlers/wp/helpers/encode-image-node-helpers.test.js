import { handleImageNode } from './encode-image-node-helpers.js';
import { emuToPixels } from '@converter/helpers.js';

vi.mock('@converter/helpers.js', () => ({
  emuToPixels: vi.fn(),
}));

describe('handleImageNode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    emuToPixels.mockImplementation((emu) => (emu ? parseInt(emu, 10) / 1000 : 0));
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

  it('includes simplePos, wrapSquare, wrapTopAndBottom, anchorData', () => {
    const node = makeNode({
      attributes: { distT: '111', distB: '222', distL: '333', distR: '444' },
    });

    node.elements.push({ name: 'wp:simplePos', attributes: { x: '1', y: '2' } });
    node.elements.push({ name: 'wp:wrapSquare', attributes: { wrapText: 'bothSides' } });
    node.elements.push({ name: 'wp:wrapTopAndBottom' });
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
    expect(result.attrs.wrapText).toBe('bothSides');
    expect(result.attrs.wrapTopAndBottom).toBe(true);
    expect(result.attrs.anchorData).toEqual({
      hRelativeFrom: 'page',
      vRelativeFrom: 'margin',
      alignH: 'center',
      alignV: 'bottom',
    });
    expect(result.attrs.marginOffset).toEqual({ left: 1, top: 2 });
  });

  it('delegates to handleShapeDrawing when uri matches shape', () => {
    const node = makeNode();
    node.elements[1].elements[0].attributes.uri = 'http://schemas.microsoft.com/office/word/2010/wordprocessingShape';
    node.elements[1].elements[0].elements = [{ name: 'wps:wsp', elements: [] }];

    const result = handleImageNode(node, makeParams(), false);
    expect(result === null || result.type === 'contentBlock').toBe(true);
  });
});
