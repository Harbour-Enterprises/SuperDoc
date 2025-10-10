import { translateAnchorNode } from './translate-anchor-node.js';
import { translateImageNode } from '../../helpers/decode-image-node-helpers.js';
import { pixelsToEmu, objToPolygon } from '../../../../../helpers.js';

vi.mock('@converter/v3/handlers/wp/helpers/decode-image-node-helpers.js', () => ({
  translateImageNode: vi.fn(),
}));

vi.mock('@converter/helpers.js', () => ({
  pixelsToEmu: vi.fn(),
  objToPolygon: vi.fn(),
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

    // default mock for objToPolygon
    objToPolygon.mockImplementation((points) => ({
      type: 'wp:wrapPolygon',
      elements:
        points?.map((point, index) => ({
          type: index === 0 ? 'wp:start' : 'wp:lineTo',
          attributes: { x: point[0] * 1000, y: point[1] * 1000 },
        })) || [],
    }));
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

  it('should add wp:positionH with posOffset when marginOffset.horizontal is defined', () => {
    const params = {
      node: {
        attrs: {
          anchorData: { hRelativeFrom: 'margin' },
          marginOffset: { horizontal: 10 },
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
    const params = { node: { attrs: { wrap: { type: 'Square', attrs: { wrapText: 'bothSides' } } } } };

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
    const params = { node: { attrs: { wrap: { type: 'TopAndBottom' } } } };

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
      locked: false,
      layoutInCell: true,
      allowOverlap: true,
    });
  });

  describe('wrap types', () => {
    it('should add wp:wrapSquare with distance attributes', () => {
      const params = {
        node: {
          attrs: {
            wrap: {
              type: 'Square',
              attrs: {
                wrapText: 'largest',
                distTop: 10,
                distBottom: 20,
                distLeft: 30,
                distRight: 40,
              },
            },
          },
        },
      };

      const result = translateAnchorNode(params);

      expect(result.elements).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'wp:wrapSquare',
            attributes: {
              wrapText: 'largest',
              distT: 10000,
              distB: 20000,
              distL: 30000,
              distR: 40000,
            },
          }),
        ]),
      );
      expect(pixelsToEmu).toHaveBeenCalledWith(10);
      expect(pixelsToEmu).toHaveBeenCalledWith(20);
      expect(pixelsToEmu).toHaveBeenCalledWith(30);
      expect(pixelsToEmu).toHaveBeenCalledWith(40);
    });

    it('should add wp:wrapTopAndBottom with distance attributes', () => {
      const params = {
        node: {
          attrs: {
            wrap: {
              type: 'TopAndBottom',
              attrs: {
                distTop: 15,
                distBottom: 25,
              },
            },
          },
        },
      };

      const result = translateAnchorNode(params);

      expect(result.elements).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'wp:wrapTopAndBottom',
            attributes: {
              distT: 15000,
              distB: 25000,
            },
          }),
        ]),
      );
      expect(pixelsToEmu).toHaveBeenCalledWith(15);
      expect(pixelsToEmu).toHaveBeenCalledWith(25);
    });

    it('should add wp:wrapTopAndBottom without attributes when no distance specified', () => {
      const params = {
        node: {
          attrs: {
            wrap: {
              type: 'TopAndBottom',
              attrs: {},
            },
          },
        },
      };

      const result = translateAnchorNode(params);

      expect(result.elements).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'wp:wrapTopAndBottom',
          }),
        ]),
      );
      // Should not have attributes property when no distances specified
      const wrapElement = result.elements.find((el) => el.name === 'wp:wrapTopAndBottom');
      expect(wrapElement.attributes).toBeUndefined();
    });

    it('should add wp:wrapTight with distance attributes', () => {
      const params = {
        node: {
          attrs: {
            wrap: {
              type: 'Tight',
              attrs: {
                distLeft: 12,
                distRight: 18,
                distTop: 5,
                distBottom: 8,
              },
            },
          },
        },
      };

      const result = translateAnchorNode(params);

      expect(result.elements).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'wp:wrapTight',
            attributes: {
              distL: 12000,
              distR: 18000,
              distT: 5000,
              distB: 8000,
            },
          }),
        ]),
      );
    });

    it('should add wp:wrapTight without attributes when no distance specified', () => {
      const params = {
        node: {
          attrs: {
            wrap: {
              type: 'Tight',
              attrs: {},
            },
          },
        },
      };

      const result = translateAnchorNode(params);

      expect(result.elements).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'wp:wrapTight',
          }),
        ]),
      );
      const wrapElement = result.elements.find((el) => el.name === 'wp:wrapTight');
      expect(wrapElement.attributes).toBeUndefined();
    });

    it('should add wp:wrapThrough with distance attributes', () => {
      const params = {
        node: {
          attrs: {
            wrap: {
              type: 'Through',
              attrs: {
                distLeft: 7,
                distRight: 14,
                distTop: 3,
                distBottom: 6,
              },
            },
          },
        },
      };

      const result = translateAnchorNode(params);

      expect(result.elements).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'wp:wrapThrough',
            attributes: {
              distL: 7000,
              distR: 14000,
              distT: 3000,
              distB: 6000,
            },
          }),
        ]),
      );
    });

    it('should add wp:wrapThrough without attributes when no distance specified', () => {
      const params = {
        node: {
          attrs: {
            wrap: {
              type: 'Through',
              attrs: {},
            },
          },
        },
      };

      const result = translateAnchorNode(params);

      expect(result.elements).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'wp:wrapThrough',
          }),
        ]),
      );
      const wrapElement = result.elements.find((el) => el.name === 'wp:wrapThrough');
      expect(wrapElement.attributes).toBeUndefined();
    });

    it('should add wp:wrapNone when wrap type is None', () => {
      const params = {
        node: {
          attrs: {
            wrap: {
              type: 'None',
              attrs: {},
            },
          },
        },
      };

      const result = translateAnchorNode(params);

      expect(result.elements).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'wp:wrapNone',
          }),
        ]),
      );
    });

    it('should handle unknown wrap type by defaulting to None', () => {
      const params = {
        node: {
          attrs: {
            wrap: {
              type: 'UnknownType',
              attrs: {},
            },
          },
        },
      };

      const result = translateAnchorNode(params);

      expect(result.elements).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'wp:wrapUnknownType',
          }),
        ]),
      );
    });

    it('should handle Tight wrap with polygon', () => {
      const params = {
        node: {
          attrs: {
            wrap: {
              type: 'Tight',
              attrs: {
                distLeft: 5,
                distRight: 10,
                polygon: [
                  [1, 2],
                  [3, 4],
                  [5, 6],
                ],
              },
            },
          },
        },
      };

      const result = translateAnchorNode(params);

      expect(objToPolygon).toHaveBeenCalledWith([
        [1, 2],
        [3, 4],
        [5, 6],
      ]);

      const wrapElement = result.elements.find((el) => el.name === 'wp:wrapTight');
      expect(wrapElement.attributes).toEqual({
        distL: 5000,
        distR: 10000,
      });
      expect(wrapElement.elements).toEqual([
        {
          type: 'wp:wrapPolygon',
          elements: [
            { type: 'wp:start', attributes: { x: 1000, y: 2000 } },
            { type: 'wp:lineTo', attributes: { x: 3000, y: 4000 } },
            { type: 'wp:lineTo', attributes: { x: 5000, y: 6000 } },
          ],
        },
      ]);
    });

    it('should handle Through wrap with polygon', () => {
      const params = {
        node: {
          attrs: {
            wrap: {
              type: 'Through',
              attrs: {
                distTop: 8,
                distBottom: 12,
                polygon: [
                  [10, 20],
                  [30, 40],
                ],
              },
            },
          },
        },
      };

      const result = translateAnchorNode(params);

      expect(objToPolygon).toHaveBeenCalledWith([
        [10, 20],
        [30, 40],
      ]);

      const wrapElement = result.elements.find((el) => el.name === 'wp:wrapThrough');
      expect(wrapElement.attributes).toEqual({
        distT: 8000,
        distB: 12000,
      });
      expect(wrapElement.elements).toEqual([
        {
          type: 'wp:wrapPolygon',
          elements: [
            { type: 'wp:start', attributes: { x: 10000, y: 20000 } },
            { type: 'wp:lineTo', attributes: { x: 30000, y: 40000 } },
          ],
        },
      ]);
    });

    it('should not call objToPolygon for wrap types that do not support polygons', () => {
      const params = {
        node: {
          attrs: {
            wrap: {
              type: 'Square',
              attrs: {
                wrapText: 'bothSides',
                polygon: [
                  [1, 2],
                  [3, 4],
                ], // polygon should be ignored for Square
              },
            },
          },
        },
      };

      translateAnchorNode(params);

      expect(objToPolygon).not.toHaveBeenCalled();
    });

    it('should handle case where objToPolygon returns null', () => {
      objToPolygon.mockReturnValueOnce(null);

      const params = {
        node: {
          attrs: {
            wrap: {
              type: 'Tight',
              attrs: {
                distLeft: 5,
                polygon: [
                  [1, 2],
                  [3, 4],
                ],
              },
            },
          },
        },
      };

      const result = translateAnchorNode(params);

      expect(objToPolygon).toHaveBeenCalledWith([
        [1, 2],
        [3, 4],
      ]);

      const wrapElement = result.elements.find((el) => el.name === 'wp:wrapTight');
      expect(wrapElement.elements).toBeUndefined();
    });

    it('should handle Tight wrap with polygon but no distance attributes', () => {
      const params = {
        node: {
          attrs: {
            wrap: {
              type: 'Tight',
              attrs: {
                polygon: [
                  [5, 10],
                  [15, 20],
                ],
              },
            },
          },
        },
      };

      const result = translateAnchorNode(params);

      const wrapElement = result.elements.find((el) => el.name === 'wp:wrapTight');
      expect(wrapElement.attributes).toBeUndefined();
      expect(wrapElement.elements).toEqual([
        {
          type: 'wp:wrapPolygon',
          elements: [
            { type: 'wp:start', attributes: { x: 5000, y: 10000 } },
            { type: 'wp:lineTo', attributes: { x: 15000, y: 20000 } },
          ],
        },
      ]);
    });
  });
});
