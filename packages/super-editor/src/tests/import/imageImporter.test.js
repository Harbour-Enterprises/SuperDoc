import { describe, it, expect, vi } from 'vitest';
import { getTestDataByFileName } from '../helpers/helpers.js';
import { defaultNodeListHandler } from '@converter/v2/importer/docxImporter.js';
import { handleDrawingNode, handleImageImport } from '../../core/super-converter/v2/importer/imageImporter.js';
import { handleParagraphNode } from '../../core/super-converter/v2/importer/paragraphNodeImporter.js';
import { emuToPixels, rotToDegrees } from '../../core/super-converter/helpers.js';

describe('ImageNodeImporter', () => {
  it('imports image node correctly', async () => {
    const dataName = 'image_doc.docx';
    const docx = await getTestDataByFileName(dataName);
    const documentXml = docx['word/document.xml'];

    const doc = documentXml.elements[0];
    const body = doc.elements[0];
    const content = body.elements;
    const { nodes } = handleParagraphNode({ nodes: [content[0]], docx, nodeListHandler: defaultNodeListHandler() });

    const paragraphNode = nodes[0];
    const drawingNode = paragraphNode.content[0];
    const { attrs } = drawingNode;
    const { padding, size } = attrs;

    expect(paragraphNode.type).toBe('paragraph');
    expect(drawingNode.type).toBe('image');

    expect(attrs).toHaveProperty('rId', 'rId4');
    expect(attrs).toHaveProperty('src', 'word/media/image1.jpeg');

    expect(size).toHaveProperty('width', 602);
    expect(size).toHaveProperty('height', 903);

    expect(padding).toHaveProperty('left', 0);
    expect(padding).toHaveProperty('top', 0);
    expect(padding).toHaveProperty('bottom', 0);
    expect(padding).toHaveProperty('right', 0);
  });

  it('imports anchor image node correctly', async () => {
    const dataName = 'anchor_images.docx';
    const docx = await getTestDataByFileName(dataName);
    const documentXml = docx['word/document.xml'];

    const doc = documentXml.elements[0];
    const body = doc.elements[0];
    const content = body.elements;
    const { nodes } = handleParagraphNode({ nodes: [content[1]], docx, nodeListHandler: defaultNodeListHandler() });

    const paragraphNode = nodes[0];
    const drawingNode = paragraphNode.content[3];
    const { attrs } = drawingNode;
    const { anchorData } = attrs;

    expect(anchorData).toHaveProperty('hRelativeFrom', 'margin');
    expect(anchorData).toHaveProperty('vRelativeFrom', 'margin');
    expect(anchorData).toHaveProperty('alignH', 'left');
    expect(anchorData).toHaveProperty('alignV', 'top');
  });

  it('imports image with absolute path in Target correctly', async () => {
    const dataName = 'image-out-of-folder.docx';
    const docx = await getTestDataByFileName(dataName);
    const documentXml = docx['word/document.xml'];

    const doc = documentXml.elements[0];
    const body = doc.elements[0];
    const content = body.elements;

    const { nodes } = handleParagraphNode({ nodes: [content[0]], docx, nodeListHandler: defaultNodeListHandler() });

    let paragraphNode = nodes[0];
    let drawingNode = paragraphNode.content[0];
    const { attrs } = drawingNode;
    expect(attrs.src).toBe('media/image.png');

    const { nodes: nodes1 } = handleParagraphNode({
      nodes: [content[5]],
      docx,
      nodeListHandler: defaultNodeListHandler(),
    });
    paragraphNode = nodes1[0];
    drawingNode = paragraphNode.content[1];
    expect(drawingNode.attrs.src).toBe('word/media/image1.jpeg');
  });

  it('imports image with transformData correctly', () => {
    // Create mock XML data for an image with transformData
    const mockXmlData = {
      name: 'wp:inline',
      attributes: {
        distT: '114300', // 8px in EMU
        distB: '114300', // 8px in EMU
        distL: '114300', // 8px in EMU
        distR: '114300', // 8px in EMU
      },
      elements: [
        {
          name: 'wp:extent',
          attributes: { cx: '5715000', cy: '4285500' }, // Sample dimensions
        },
        {
          name: 'wp:effectExtent',
          attributes: { l: '19050', t: '0', r: '0', b: '9525' },
        },
        {
          name: 'a:graphic',
          elements: [
            {
              name: 'a:graphicData',
              attributes: { uri: 'http://schemas.openxmlformats.org/drawingml/2006/picture' },
              elements: [
                {
                  name: 'pic:pic',
                  elements: [
                    {
                      name: 'pic:blipFill',
                      elements: [
                        {
                          name: 'a:blip',
                          attributes: { 'r:embed': 'rId5' },
                        },
                      ],
                    },
                    {
                      name: 'pic:spPr',
                      elements: [
                        {
                          name: 'a:xfrm',
                          attributes: {
                            rot: '5400000', // 30 degrees in 60000ths
                            flipV: '1',
                            flipH: '1',
                          },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          name: 'wp:docPr',
          attributes: { id: '1', name: 'Picture 1', descr: 'Test image' },
        },
      ],
    };

    const mockDocx = {
      'word/_rels/document.xml.rels': {
        elements: [
          {
            name: 'Relationships',
            elements: [
              {
                attributes: {
                  Id: 'rId5',
                  Target: 'media/test-image.jpg',
                },
              },
            ],
          },
        ],
      },
    };

    const params = { docx: mockDocx };
    const result = handleImageImport(mockXmlData, 'document.xml', params);

    expect(result).toBeTruthy();
    expect(result.type).toBe('image');
    expect(result.attrs.src).toBe('word/media/test-image.jpg');

    // Test transformData
    expect(result.attrs.transformData).toBeDefined();
    expect(result.attrs.transformData.rotation).toBe(rotToDegrees('5400000'));
    expect(result.attrs.transformData.verticalFlip).toBe(true);
    expect(result.attrs.transformData.horizontalFlip).toBe(true);

    // Test sizeExtension from effectExtent
    expect(result.attrs.transformData.sizeExtension).toBeDefined();
    expect(result.attrs.transformData.sizeExtension.left).toBe(emuToPixels('19050'));
    expect(result.attrs.transformData.sizeExtension.top).toBe(emuToPixels('0'));
    expect(result.attrs.transformData.sizeExtension.right).toBe(emuToPixels('0'));
    expect(result.attrs.transformData.sizeExtension.bottom).toBe(emuToPixels('9525'));

    // Test other attributes
    expect(result.attrs.padding.top).toBe(emuToPixels('114300'));
    expect(result.attrs.padding.bottom).toBe(emuToPixels('114300'));
    expect(result.attrs.padding.left).toBe(emuToPixels('114300'));
    expect(result.attrs.padding.right).toBe(emuToPixels('114300'));
  });

  it('handles drawing node with no image content', () => {
    const mockNodes = [
      {
        name: 'w:drawing',
        elements: [
          {
            name: 'wp:inline',
            attributes: {
              distT: '0',
              distB: '0',
              distL: '0',
              distR: '0',
            },
            elements: [
              {
                name: 'wp:extent',
                attributes: { cx: '100', cy: '100' },
              },
              {
                name: 'a:graphic',
                elements: [
                  {
                    name: 'a:graphicData',
                    attributes: { uri: 'http://schemas.openxmlformats.org/drawingml/2006/picture' },
                    elements: [], // Empty elements - no pic:pic
                  },
                ],
              },
            ],
          },
        ],
      },
    ];

    const params = { docx: {} };
    const result = handleDrawingNode({ nodes: mockNodes });

    expect(result.nodes).toEqual([]);
    expect(result.consumed).toBe(1);
  });

  it('imports image with minimal transformData correctly', () => {
    const mockXmlData = {
      name: 'wp:inline',
      attributes: { distT: '0', distB: '0', distL: '0', distR: '0' },
      elements: [
        {
          name: 'wp:extent',
          attributes: { cx: '1000000', cy: '1000000' },
        },
        {
          name: 'a:graphic',
          elements: [
            {
              name: 'a:graphicData',
              attributes: { uri: 'http://schemas.openxmlformats.org/drawingml/2006/picture' },
              elements: [
                {
                  name: 'pic:pic',
                  elements: [
                    {
                      name: 'pic:blipFill',
                      elements: [
                        {
                          name: 'a:blip',
                          attributes: { 'r:embed': 'rId1' },
                        },
                      ],
                    },
                    {
                      name: 'pic:spPr',
                      elements: [
                        {
                          name: 'a:xfrm',
                          attributes: { rot: '0' }, // No rotation
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          name: 'wp:docPr',
          attributes: { id: '2', name: 'Test Image' },
        },
      ],
    };

    const mockDocx = {
      'word/_rels/document.xml.rels': {
        elements: [
          {
            name: 'Relationships',
            elements: [
              {
                attributes: {
                  Id: 'rId1',
                  Target: 'media/simple-image.png',
                },
              },
            ],
          },
        ],
      },
    };

    const params = { docx: mockDocx };
    const result = handleImageImport(mockXmlData, null, params);

    expect(result.attrs.transformData).toBeDefined();
    expect(result.attrs.transformData.rotation).toBe(0);
    expect(result.attrs.transformData.verticalFlip).toBe(false);
    expect(result.attrs.transformData.horizontalFlip).toBe(false);
  });

  it('handles shape drawing correctly', () => {
    const mockNodes = [
      {
        name: 'w:drawing',
        elements: [
          {
            name: 'wp:anchor',
            attributes: {
              distT: '0',
              distB: '0',
              distL: '0',
              distR: '0',
            },
            elements: [
              {
                name: 'wp:extent',
                attributes: { cx: '1000000', cy: '1000000' },
              },
              {
                name: 'a:graphic',
                elements: [
                  {
                    name: 'a:graphicData',
                    attributes: { uri: 'http://schemas.microsoft.com/office/word/2010/wordprocessingShape' },
                    elements: [
                      {
                        name: 'wps:wsp',
                        elements: [
                          {
                            name: 'wps:spPr',
                            elements: [
                              {
                                name: 'a:xfrm',
                                elements: [
                                  { name: 'a:off', attributes: { x: '0', y: '0' } },
                                  { name: 'a:ext', attributes: { cx: '1000000', cy: '1000000' } },
                                ],
                              },
                              {
                                name: 'a:prstGeom',
                                attributes: { prst: 'rect' },
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                name: 'wp:docPr',
                attributes: { id: '1', name: 'Rectangle 1' },
              },
            ],
          },
        ],
      },
    ];

    const params = {
      docx: {},
      nodeListHandler: { handler: vi.fn().mockReturnValue([]) },
    };

    const result = handleDrawingNode({ nodes: mockNodes, ...params });

    expect(result.consumed).toBe(1);
    // Should handle shape drawing without throwing errors
  });

  it('imports image with wrapping properties correctly', () => {
    const mockXmlData = {
      name: 'wp:anchor',
      attributes: { distT: '0', distB: '0', distL: '0', distR: '0' },
      elements: [
        {
          name: 'wp:extent',
          attributes: { cx: '2000000', cy: '1500000' },
        },
        {
          name: 'wp:wrapSquare',
          attributes: { wrapText: 'bothSides' },
        },
        {
          name: 'wp:wrapTopAndBottom',
        },
        {
          name: 'a:graphic',
          elements: [
            {
              name: 'a:graphicData',
              attributes: { uri: 'http://schemas.openxmlformats.org/drawingml/2006/picture' },
              elements: [
                {
                  name: 'pic:pic',
                  elements: [
                    {
                      name: 'pic:blipFill',
                      elements: [
                        {
                          name: 'a:blip',
                          attributes: { 'r:embed': 'rId3' },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          name: 'wp:docPr',
          attributes: { id: '3', name: 'Wrapped Image' },
        },
      ],
    };

    const mockDocx = {
      'word/_rels/document.xml.rels': {
        elements: [
          {
            name: 'Relationships',
            elements: [
              {
                attributes: {
                  Id: 'rId3',
                  Target: 'media/wrapped-image.jpg',
                },
              },
            ],
          },
        ],
      },
    };

    const params = { docx: mockDocx };
    const result = handleImageImport(mockXmlData, null, params);

    expect(result.attrs.wrapText).toBe('bothSides');
    expect(result.attrs.wrapTopAndBottom).toBe(true);
  });

  it('handles missing relationships gracefully', () => {
    const mockXmlData = {
      name: 'wp:inline',
      attributes: { distT: '0', distB: '0', distL: '0', distR: '0' },
      elements: [
        {
          name: 'wp:extent',
          attributes: { cx: '1000000', cy: '1000000' },
        },
        {
          name: 'a:graphic',
          elements: [
            {
              name: 'a:graphicData',
              attributes: { uri: 'http://schemas.openxmlformats.org/drawingml/2006/picture' },
              elements: [
                {
                  name: 'pic:pic',
                  elements: [
                    {
                      name: 'pic:blipFill',
                      elements: [
                        {
                          name: 'a:blip',
                          attributes: { 'r:embed': 'rIdNonExistent' },
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
    };

    const mockDocx = {
      'word/_rels/document.xml.rels': {
        elements: [
          {
            name: 'Relationships',
            elements: [], // No relationships
          },
        ],
      },
    };

    const params = { docx: mockDocx };
    const result = handleImageImport(mockXmlData, null, params);

    expect(result).toBeNull();
  });

  it('handles invalid node types gracefully', () => {
    const invalidNodes = [{ name: 'w:invalidNode' }, { name: 'w:t' }];

    const result = handleDrawingNode({ nodes: invalidNodes });

    expect(result.nodes).toEqual([]);
    expect(result.consumed).toBe(0);
  });

  it('handles empty nodes array', () => {
    const result = handleDrawingNode({ nodes: [] });

    expect(result.nodes).toEqual([]);
    expect(result.consumed).toBe(0);
  });
});
