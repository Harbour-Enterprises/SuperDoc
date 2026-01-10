import { describe, it, expect } from 'vitest';
import { handleShapeTextWatermarkImport } from './handle-shape-text-watermark-import';

describe('handleShapeTextWatermarkImport', () => {
  describe('Basic text watermark import', () => {
    it('should import a basic text watermark with v:textpath', () => {
      const pict = {
        elements: [
          {
            name: 'v:shape',
            attributes: {
              id: 'PowerPlusWaterMarkObject',
              'o:spid': 'shape_0',
              type: '#_x0000_t136',
              adj: '10800',
              fillcolor: 'silver',
              stroked: 'f',
              'o:allowincell': 'f',
              style:
                'position:absolute;margin-left:0.05pt;margin-top:315.7pt;width:481.8pt;height:82.8pt;mso-wrap-style:none;v-text-anchor:middle;rotation:315;mso-position-horizontal:center;mso-position-horizontal-relative:margin;mso-position-vertical:center;mso-position-vertical-relative:margin',
            },
            elements: [
              {
                name: 'v:path',
                attributes: {
                  textpathok: 't',
                },
              },
              {
                name: 'v:textpath',
                attributes: {
                  on: 't',
                  fitshape: 't',
                  string: 'DRAFT MARK',
                  style: 'font-family:"Liberation Sans";font-size:1pt',
                  trim: 't',
                },
              },
              {
                name: 'v:fill',
                attributes: {
                  'o:detectmouseclick': 't',
                  type: 'solid',
                  color2: '#3f3f3f',
                  opacity: '0.5',
                },
              },
              {
                name: 'v:stroke',
                attributes: {
                  color: '#3465a4',
                  joinstyle: 'round',
                  endcap: 'flat',
                },
              },
              {
                name: 'w10:wrap',
                attributes: {
                  type: 'none',
                },
              },
            ],
          },
        ],
      };

      const result = handleShapeTextWatermarkImport({ params: {}, pict });

      expect(result).toBeDefined();
      expect(result.type).toBe('image');
      expect(result.attrs.vmlTextWatermark).toBe(true);
      expect(result.attrs.textWatermarkData.text).toBe('DRAFT MARK');
      expect(result.attrs.src).toContain('data:image/svg+xml');
    });

    it('should extract text from string attribute', () => {
      const pict = {
        elements: [
          {
            name: 'v:shape',
            attributes: {
              style: 'position:absolute;width:100pt;height:50pt',
            },
            elements: [
              {
                name: 'v:textpath',
                attributes: {
                  string: 'CONFIDENTIAL',
                },
              },
            ],
          },
        ],
      };

      const result = handleShapeTextWatermarkImport({ params: {}, pict });

      expect(result).not.toBeNull();
      expect(result.attrs.textWatermarkData.text).toBe('CONFIDENTIAL');
    });

    it('should return null if v:textpath is missing', () => {
      const pict = {
        elements: [
          {
            name: 'v:shape',
            attributes: {},
            elements: [],
          },
        ],
      };

      const result = handleShapeTextWatermarkImport({ params: {}, pict });

      expect(result).toBeNull();
    });

    it('should return null if v:shape is missing', () => {
      const pict = {
        elements: [],
      };

      const result = handleShapeTextWatermarkImport({ params: {}, pict });

      expect(result).toBeNull();
    });

    it('should warn and return null if string attribute is empty', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const pict = {
        elements: [
          {
            name: 'v:shape',
            attributes: {},
            elements: [
              {
                name: 'v:textpath',
                attributes: {
                  on: 't',
                },
              },
            ],
          },
        ],
      };

      const result = handleShapeTextWatermarkImport({ params: {}, pict });

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('v:textpath missing string attribute');

      consoleSpy.mockRestore();
    });
  });

  describe('Style parsing', () => {
    it('should parse dimensions from style', () => {
      const pict = {
        elements: [
          {
            name: 'v:shape',
            attributes: {
              style: 'width:481.8pt;height:82.8pt',
            },
            elements: [
              {
                name: 'v:textpath',
                attributes: {
                  string: 'TEST',
                },
              },
            ],
          },
        ],
      };

      const result = handleShapeTextWatermarkImport({ params: {}, pict });

      expect(result.attrs.size.width).toBeCloseTo(642.4, 1); // 481.8pt to pixels
      expect(result.attrs.size.height).toBeCloseTo(110.4, 1); // 82.8pt to pixels
    });

    it('should parse rotation from style', () => {
      const pict = {
        elements: [
          {
            name: 'v:shape',
            attributes: {
              style: 'rotation:315',
            },
            elements: [
              {
                name: 'v:textpath',
                attributes: {
                  string: 'ROTATED',
                },
              },
            ],
          },
        ],
      };

      const result = handleShapeTextWatermarkImport({ params: {}, pict });

      expect(result.attrs.textWatermarkData.rotation).toBe(315);
      // Rotation is baked into the SVG, not in transformData
      // (layout engine doesn't support rotation for image fragments)
      expect(result.attrs.transformData).toBeUndefined();
    });

    it('should parse margin offsets from style', () => {
      const pict = {
        elements: [
          {
            name: 'v:shape',
            attributes: {
              style: 'margin-left:0.05pt;margin-top:315.7pt',
            },
            elements: [
              {
                name: 'v:textpath',
                attributes: {
                  string: 'MARGIN TEST',
                },
              },
            ],
          },
        ],
      };

      const result = handleShapeTextWatermarkImport({ params: {}, pict });

      expect(result.attrs.marginOffset.horizontal).toBeCloseTo(0.067, 2);
      // For center-aligned watermarks relative to margin, margin-top is set to 0
      // to let center alignment work properly in the browser
      expect(result.attrs.marginOffset.top).toBe(0);
    });

    it('should parse positioning from style', () => {
      const pict = {
        elements: [
          {
            name: 'v:shape',
            attributes: {
              style:
                'mso-position-horizontal:center;mso-position-vertical:center;mso-position-horizontal-relative:margin;mso-position-vertical-relative:margin',
            },
            elements: [
              {
                name: 'v:textpath',
                attributes: {
                  string: 'POSITIONED',
                },
              },
            ],
          },
        ],
      };

      const result = handleShapeTextWatermarkImport({ params: {}, pict });

      expect(result.attrs.anchorData).toEqual({
        hRelativeFrom: 'margin',
        vRelativeFrom: 'margin',
        alignH: 'center',
        alignV: 'center',
      });
    });

    it('should use default positioning if not specified', () => {
      const pict = {
        elements: [
          {
            name: 'v:shape',
            attributes: {
              style: 'width:100pt',
            },
            elements: [
              {
                name: 'v:textpath',
                attributes: {
                  string: 'DEFAULT POS',
                },
              },
            ],
          },
        ],
      };

      const result = handleShapeTextWatermarkImport({ params: {}, pict });

      expect(result.attrs.anchorData.alignH).toBe('center');
      expect(result.attrs.anchorData.alignV).toBe('center');
      expect(result.attrs.anchorData.hRelativeFrom).toBe('margin');
      expect(result.attrs.anchorData.vRelativeFrom).toBe('margin');
    });
  });

  describe('Fill properties', () => {
    it('should extract fill properties', () => {
      const pict = {
        elements: [
          {
            name: 'v:shape',
            attributes: {
              fillcolor: 'silver',
              style: 'width:100pt',
            },
            elements: [
              {
                name: 'v:textpath',
                attributes: {
                  string: 'FILLED',
                },
              },
              {
                name: 'v:fill',
                attributes: {
                  type: 'solid',
                  color2: '#3f3f3f',
                  opacity: '0.5',
                },
              },
            ],
          },
        ],
      };

      const result = handleShapeTextWatermarkImport({ params: {}, pict });

      expect(result.attrs.textWatermarkData.fill).toEqual({
        color: 'silver',
        color2: '#3f3f3f',
        opacity: 0.5,
        type: 'solid',
      });
    });

    it('should use fillcolor from shape if v:fill is missing', () => {
      const pict = {
        elements: [
          {
            name: 'v:shape',
            attributes: {
              fillcolor: 'blue',
              style: 'width:100pt',
            },
            elements: [
              {
                name: 'v:textpath',
                attributes: {
                  string: 'BLUE TEXT',
                },
              },
            ],
          },
        ],
      };

      const result = handleShapeTextWatermarkImport({ params: {}, pict });

      expect(result.attrs.textWatermarkData.fill.color).toBe('blue');
    });

    it('should default to silver if no fill color specified', () => {
      const pict = {
        elements: [
          {
            name: 'v:shape',
            attributes: {
              style: 'width:100pt',
            },
            elements: [
              {
                name: 'v:textpath',
                attributes: {
                  string: 'DEFAULT COLOR',
                },
              },
            ],
          },
        ],
      };

      const result = handleShapeTextWatermarkImport({ params: {}, pict });

      expect(result.attrs.textWatermarkData.fill.color).toBe('silver');
    });
  });

  describe('Stroke properties', () => {
    it('should extract stroke properties when enabled', () => {
      const pict = {
        elements: [
          {
            name: 'v:shape',
            attributes: {
              stroked: 't',
              style: 'width:100pt',
            },
            elements: [
              {
                name: 'v:textpath',
                attributes: {
                  string: 'STROKED',
                },
              },
              {
                name: 'v:stroke',
                attributes: {
                  color: '#3465a4',
                  joinstyle: 'round',
                  endcap: 'flat',
                },
              },
            ],
          },
        ],
      };

      const result = handleShapeTextWatermarkImport({ params: {}, pict });

      expect(result.attrs.textWatermarkData.stroke).toEqual({
        enabled: true, // 'stroked' attribute is 't' which means enabled
        color: '#3465a4',
        joinstyle: 'round',
        endcap: 'flat',
      });
    });

    it('should mark stroke as disabled when stroked="f"', () => {
      const pict = {
        elements: [
          {
            name: 'v:shape',
            attributes: {
              stroked: 'f',
              style: 'width:100pt',
            },
            elements: [
              {
                name: 'v:textpath',
                attributes: {
                  string: 'NO STROKE',
                },
              },
            ],
          },
        ],
      };

      const result = handleShapeTextWatermarkImport({ params: {}, pict });

      expect(result.attrs.textWatermarkData.stroke.enabled).toBe(false);
    });
  });

  describe('Text styling', () => {
    it('should extract font family and size from textpath style', () => {
      const pict = {
        elements: [
          {
            name: 'v:shape',
            attributes: {
              style: 'width:100pt',
            },
            elements: [
              {
                name: 'v:textpath',
                attributes: {
                  string: 'STYLED TEXT',
                  style: 'font-family:"Liberation Sans";font-size:1pt',
                },
              },
            ],
          },
        ],
      };

      const result = handleShapeTextWatermarkImport({ params: {}, pict });

      expect(result.attrs.textWatermarkData.textStyle.fontFamily).toBe('Liberation Sans');
      expect(result.attrs.textWatermarkData.textStyle.fontSize).toBe('1pt');
    });

    it('should handle single quotes in font-family', () => {
      const pict = {
        elements: [
          {
            name: 'v:shape',
            attributes: {
              style: 'width:100pt',
            },
            elements: [
              {
                name: 'v:textpath',
                attributes: {
                  string: 'ARIAL',
                  style: "font-family:'Arial'",
                },
              },
            ],
          },
        ],
      };

      const result = handleShapeTextWatermarkImport({ params: {}, pict });

      expect(result.attrs.textWatermarkData.textStyle.fontFamily).toBe('Arial');
    });

    it('should use default font if not specified', () => {
      const pict = {
        elements: [
          {
            name: 'v:shape',
            attributes: {
              style: 'width:100pt',
            },
            elements: [
              {
                name: 'v:textpath',
                attributes: {
                  string: 'DEFAULT FONT',
                },
              },
            ],
          },
        ],
      };

      const result = handleShapeTextWatermarkImport({ params: {}, pict });

      expect(result.attrs.textWatermarkData.textStyle.fontFamily).toBe('Liberation Sans');
      expect(result.attrs.textWatermarkData.textStyle.fontSize).toBe('1pt');
    });

    it('should extract text anchor from style', () => {
      const pict = {
        elements: [
          {
            name: 'v:shape',
            attributes: {
              style: 'v-text-anchor:middle',
            },
            elements: [
              {
                name: 'v:textpath',
                attributes: {
                  string: 'ANCHORED',
                },
              },
            ],
          },
        ],
      };

      const result = handleShapeTextWatermarkImport({ params: {}, pict });

      expect(result.attrs.textWatermarkData.textStyle.textAnchor).toBe('middle');
    });
  });

  describe('VML attributes preservation', () => {
    it('should preserve all VML attributes for round-tripping', () => {
      const pict = {
        elements: [
          {
            name: 'v:shape',
            attributes: {
              id: 'PowerPlusWaterMarkObject',
              'o:spid': 'shape_123',
              type: '#_x0000_t136',
              adj: '10800',
              style: 'width:100pt',
            },
            elements: [
              {
                name: 'v:path',
                attributes: {
                  textpathok: 't',
                },
              },
              {
                name: 'v:textpath',
                attributes: {
                  on: 't',
                  fitshape: 't',
                  string: 'PRESERVED',
                  trim: 't',
                },
              },
            ],
          },
        ],
      };

      const result = handleShapeTextWatermarkImport({ params: {}, pict });

      expect(result.attrs.vmlAttributes).toBeDefined();
      expect(result.attrs.vmlTextpathAttributes).toBeDefined();
      expect(result.attrs.vmlPathAttributes).toBeDefined();
      expect(result.attrs.vmlTextpathAttributes.on).toBe('t');
      expect(result.attrs.vmlPathAttributes.textpathok).toBe('t');
      expect(result.type).toBe('image');
      expect(result.attrs.vmlTextWatermark).toBe(true);
    });

    it('should preserve wrap attributes', () => {
      const pict = {
        elements: [
          {
            name: 'v:shape',
            attributes: {
              style: 'width:100pt',
            },
            elements: [
              {
                name: 'v:textpath',
                attributes: {
                  string: 'WRAPPED',
                },
              },
              {
                name: 'w10:wrap',
                attributes: {
                  type: 'none',
                },
              },
            ],
          },
        ],
      };

      const result = handleShapeTextWatermarkImport({ params: {}, pict });

      expect(result.attrs.vmlWrapAttributes).toEqual({ type: 'none' });
      expect(result.attrs.wrap.type).toBe('None');
      expect(result.attrs.wrap.attrs.behindDoc).toBe(true);
    });
  });

  describe('Textpath properties', () => {
    it('should extract textpath boolean properties', () => {
      const pict = {
        elements: [
          {
            name: 'v:shape',
            attributes: {
              style: 'width:100pt',
            },
            elements: [
              {
                name: 'v:path',
                attributes: {
                  textpathok: 't',
                },
              },
              {
                name: 'v:textpath',
                attributes: {
                  on: 't',
                  fitshape: 't',
                  trim: 't',
                  string: 'TEXTPATH',
                },
              },
            ],
          },
        ],
      };

      const result = handleShapeTextWatermarkImport({ params: {}, pict });

      expect(result.attrs.textWatermarkData.textpath).toEqual({
        on: true,
        fitshape: true,
        trim: true,
        textpathok: true,
      });
    });

    it('should handle false values for textpath properties', () => {
      const pict = {
        elements: [
          {
            name: 'v:shape',
            attributes: {
              style: 'width:100pt',
            },
            elements: [
              {
                name: 'v:path',
                attributes: {
                  textpathok: 'f',
                },
              },
              {
                name: 'v:textpath',
                attributes: {
                  on: 'f',
                  fitshape: 'f',
                  string: 'NO TEXTPATH',
                },
              },
            ],
          },
        ],
      };

      const result = handleShapeTextWatermarkImport({ params: {}, pict });

      expect(result.attrs.textWatermarkData.textpath.on).toBe(false);
      expect(result.attrs.textWatermarkData.textpath.fitshape).toBe(false);
      expect(result.attrs.textWatermarkData.textpath.textpathok).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('should handle missing optional elements gracefully', () => {
      const pict = {
        elements: [
          {
            name: 'v:shape',
            attributes: {
              style: 'width:100pt;height:50pt',
            },
            elements: [
              {
                name: 'v:textpath',
                attributes: {
                  string: 'MINIMAL',
                },
              },
            ],
          },
        ],
      };

      const result = handleShapeTextWatermarkImport({ params: {}, pict });

      expect(result).not.toBeNull();
      expect(result.type).toBe('image');
      expect(result.attrs.textWatermarkData.text).toBe('MINIMAL');
    });

    it('should handle complex style strings with colons in values', () => {
      const pict = {
        elements: [
          {
            name: 'v:shape',
            attributes: {
              style: 'width:100pt;height:50pt;position:absolute',
            },
            elements: [
              {
                name: 'v:textpath',
                attributes: {
                  string: 'COMPLEX',
                  style: 'font-family:"Times New Roman";font-size:12pt',
                },
              },
            ],
          },
        ],
      };

      const result = handleShapeTextWatermarkImport({ params: {}, pict });

      expect(result.attrs.textWatermarkData.textStyle.fontFamily).toBe('Times New Roman');
    });
  });
});
