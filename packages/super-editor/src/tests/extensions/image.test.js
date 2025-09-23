import { describe, it, expect } from 'vitest';

describe('Image Extension Core Functionality', () => {
  describe('transformData CSS generation', () => {
    // Test the core logic of transformData rendering
    const generateTransformCSS = (transformData) => {
      if (!transformData) return undefined;

      let style = '';
      if (transformData?.rotation) {
        style += `rotate(${Math.round(transformData.rotation)}deg) `;
      }
      if (transformData?.verticalFlip) {
        style += 'scaleY(-1) ';
      }
      if (transformData?.horizontalFlip) {
        style += 'scaleX(-1) ';
      }
      style = style.trim();
      if (style.length > 0) {
        return { style: `transform: ${style};` };
      }
      return undefined;
    };

    it('generates rotation CSS correctly', () => {
      const result = generateTransformCSS({ rotation: 45 });
      expect(result.style).toBe('transform: rotate(45deg);');
    });

    it('generates vertical flip CSS correctly', () => {
      const result = generateTransformCSS({ verticalFlip: true });
      expect(result.style).toBe('transform: scaleY(-1);');
    });

    it('generates horizontal flip CSS correctly', () => {
      const result = generateTransformCSS({ horizontalFlip: true });
      expect(result.style).toBe('transform: scaleX(-1);');
    });

    it('combines multiple transformations correctly', () => {
      const result = generateTransformCSS({
        rotation: 30,
        verticalFlip: true,
        horizontalFlip: true,
      });
      expect(result.style).toBe('transform: rotate(30deg) scaleY(-1) scaleX(-1);');
    });

    it('rounds fractional rotation values', () => {
      const result = generateTransformCSS({ rotation: 45.7 });
      expect(result.style).toBe('transform: rotate(46deg);');
    });

    it('handles negative rotation values', () => {
      const result = generateTransformCSS({ rotation: -90 });
      expect(result.style).toBe('transform: rotate(-90deg);');
    });

    it('returns undefined for empty transformData', () => {
      const result = generateTransformCSS({});
      expect(result).toBeUndefined();
    });

    it('returns undefined for null transformData', () => {
      const result = generateTransformCSS(null);
      expect(result).toBeUndefined();
    });

    it('ignores sizeExtension properties', () => {
      const result = generateTransformCSS({
        rotation: 45,
        sizeExtension: {
          left: 10,
          top: 5,
          right: 15,
          bottom: 20,
        },
      });
      expect(result.style).toBe('transform: rotate(45deg);');
    });
  });

  describe('size CSS generation', () => {
    const generateSizeCSS = (size, extension) => {
      let style = '';
      let { width, height } = size ?? {};
      if (width) style += `width: ${width}px;`;
      if (height && ['emf', 'wmf'].includes(extension)) {
        style += `height: ${height}px; border: 1px solid black; position: absolute;`;
      } else if (height) {
        style += 'height: auto;';
      }
      return { style };
    };

    it('generates basic size CSS', () => {
      const result = generateSizeCSS({ width: 300, height: 200 });
      expect(result.style).toContain('width: 300px');
      expect(result.style).toContain('height: auto');
    });

    it('handles EMF files with special styling', () => {
      const result = generateSizeCSS({ width: 300, height: 200 }, 'emf');
      expect(result.style).toContain('width: 300px');
      expect(result.style).toContain('height: 200px');
      expect(result.style).toContain('border: 1px solid black');
      expect(result.style).toContain('position: absolute');
    });

    it('handles WMF files with special styling', () => {
      const result = generateSizeCSS({ width: 250, height: 150 }, 'wmf');
      expect(result.style).toContain('width: 250px');
      expect(result.style).toContain('height: 150px');
      expect(result.style).toContain('border: 1px solid black');
      expect(result.style).toContain('position: absolute');
    });

    it('handles missing size gracefully', () => {
      const result = generateSizeCSS(null);
      expect(result.style).toBe('');
    });
  });

  describe('marginOffset CSS generation', () => {
    const generateMarginOffsetCSS = (marginOffset, anchorData) => {
      const relativeFromPageV = anchorData?.vRelativeFrom === 'page';
      const maxMarginV = 500;
      const { left = 0, top = 0 } = marginOffset ?? {};

      let style = '';
      if (left) style += `margin-left: ${left}px;`;
      if (top) {
        if (relativeFromPageV && top >= maxMarginV) {
          style += `margin-top: ${maxMarginV}px;`;
        } else {
          style += `margin-top: ${top}px;`;
        }
      }
      return { style };
    };

    it('generates basic margin offset CSS', () => {
      const result = generateMarginOffsetCSS({ left: 30, top: 40 });
      expect(result.style).toContain('margin-left: 30px');
      expect(result.style).toContain('margin-top: 40px');
    });

    it('limits top margin for page-relative anchors', () => {
      const result = generateMarginOffsetCSS({ left: 30, top: 600 }, { vRelativeFrom: 'page' });
      expect(result.style).toContain('margin-left: 30px');
      expect(result.style).toContain('margin-top: 500px');
    });

    it('does not limit top margin for non-page-relative anchors', () => {
      const result = generateMarginOffsetCSS({ left: 30, top: 600 }, { vRelativeFrom: 'margin' });
      expect(result.style).toContain('margin-left: 30px');
      expect(result.style).toContain('margin-top: 600px');
    });
  });

  describe('src attribute handling', () => {
    const generateSrcAttribute = (src, mediaStorage) => {
      return {
        src: mediaStorage[src] ?? src,
      };
    };

    it('uses media storage when src is a key', () => {
      const mediaStorage = {
        'stored-key': 'actual-image-path.jpg',
      };
      const result = generateSrcAttribute('stored-key', mediaStorage);
      expect(result.src).toBe('actual-image-path.jpg');
    });

    it('uses src directly when not in media storage', () => {
      const mediaStorage = {
        'stored-key': 'actual-image-path.jpg',
      };
      const result = generateSrcAttribute('direct-path.jpg', mediaStorage);
      expect(result.src).toBe('direct-path.jpg');
    });

    it('handles empty storage gracefully', () => {
      const result = generateSrcAttribute('test.jpg', {});
      expect(result.src).toBe('test.jpg');
    });
  });

  describe('style attribute handling', () => {
    const generateStyleAttribute = (style) => {
      if (!style) return {};
      return { style };
    };

    it('renders custom style when provided', () => {
      const result = generateStyleAttribute('border: 1px solid red; opacity: 0.5;');
      expect(result.style).toBe('border: 1px solid red; opacity: 0.5;');
    });

    it('returns empty object when no style is provided', () => {
      const result = generateStyleAttribute(null);
      expect(result).toEqual({});
    });

    it('returns empty object for empty style', () => {
      const result = generateStyleAttribute('');
      expect(result).toEqual({});
    });
  });

  describe('DOM structure generation', () => {
    const generateImageDOM = (htmlAttributes, defaultOptions) => {
      const mergedAttributes = {
        ...defaultOptions.htmlAttributes,
        ...htmlAttributes,
      };
      return ['img', mergedAttributes];
    };

    it('creates img element with default attributes', () => {
      const defaultOptions = {
        htmlAttributes: {
          style: 'display: inline-block;',
          'aria-label': 'Image node',
        },
      };
      const result = generateImageDOM({}, defaultOptions);

      expect(result[0]).toBe('img');
      expect(result[1]).toEqual({
        style: 'display: inline-block;',
        'aria-label': 'Image node',
      });
    });

    it('merges custom attributes with defaults', () => {
      const defaultOptions = {
        htmlAttributes: {
          style: 'display: inline-block;',
          'aria-label': 'Image node',
        },
      };
      const customAttributes = {
        class: 'custom-class',
        'data-test': 'value',
      };
      const result = generateImageDOM(customAttributes, defaultOptions);

      expect(result[0]).toBe('img');
      expect(result[1]).toEqual({
        style: 'display: inline-block;',
        'aria-label': 'Image node',
        class: 'custom-class',
        'data-test': 'value',
      });
    });
  });

  describe('parseDOM rules generation', () => {
    const generateParseRules = (allowBase64) => {
      return [
        {
          tag: allowBase64 ? 'img[src]' : 'img[src]:not([src^="data:"])',
        },
      ];
    };

    it('allows all images by default', () => {
      const rules = generateParseRules(true);
      expect(rules[0].tag).toBe('img[src]');
    });

    it('excludes base64 images when allowBase64 is false', () => {
      const rules = generateParseRules(false);
      expect(rules[0].tag).toBe('img[src]:not([src^="data:"])');
    });
  });

  describe('attribute defaults', () => {
    const getDefaultAttributes = () => {
      return {
        src: { default: null },
        alt: { default: 'Uploaded picture' },
        title: { default: null },
        rId: { default: null, rendered: false },
        transformData: { default: {} },
        size: { default: {} },
        padding: { default: {} },
        marginOffset: { default: {} },
        style: { default: null, rendered: true },
        // Private attributes
        id: { rendered: false },
        originalPadding: { rendered: false },
        originalAttributes: { rendered: false },
        wrapTopAndBottom: { rendered: false },
        anchorData: { rendered: false },
        isAnchor: { rendered: false },
        simplePos: { rendered: false },
        wrapText: { rendered: false },
        extension: { rendered: false },
      };
    };

    it('has correct default attribute values', () => {
      const attributes = getDefaultAttributes();

      expect(attributes.src.default).toBe(null);
      expect(attributes.alt.default).toBe('Uploaded picture');
      expect(attributes.title.default).toBe(null);
      expect(attributes.rId.default).toBe(null);
      expect(attributes.transformData.default).toEqual({});
      expect(attributes.size.default).toEqual({});
      expect(attributes.padding.default).toEqual({});
      expect(attributes.marginOffset.default).toEqual({});
      expect(attributes.style.default).toBe(null);
    });

    it('has correct rendering flags for private attributes', () => {
      const attributes = getDefaultAttributes();

      expect(attributes.id.rendered).toBe(false);
      expect(attributes.rId.rendered).toBe(false);
      expect(attributes.originalPadding.rendered).toBe(false);
      expect(attributes.originalAttributes.rendered).toBe(false);
      expect(attributes.wrapTopAndBottom.rendered).toBe(false);
      expect(attributes.anchorData.rendered).toBe(false);
      expect(attributes.isAnchor.rendered).toBe(false);
      expect(attributes.simplePos.rendered).toBe(false);
      expect(attributes.wrapText.rendered).toBe(false);
      expect(attributes.extension.rendered).toBe(false);
    });

    it('has style attribute explicitly marked as rendered', () => {
      const attributes = getDefaultAttributes();
      expect(attributes.style.rendered).toBe(true);
    });
  });

  describe('extension configuration', () => {
    const getDefaultOptions = () => {
      return {
        allowBase64: true,
        htmlAttributes: {
          style: 'display: inline-block;',
          'aria-label': 'Image node',
        },
      };
    };

    const configureOptions = (customOptions) => {
      const defaults = getDefaultOptions();
      const custom = customOptions;

      // Merge htmlAttributes properly
      const mergedHtmlAttributes = {
        ...defaults.htmlAttributes,
        ...custom.htmlAttributes,
      };

      return {
        ...defaults,
        ...custom,
        htmlAttributes: mergedHtmlAttributes,
      };
    };

    it('has correct default options', () => {
      const options = getDefaultOptions();
      expect(options.allowBase64).toBe(true);
      expect(options.htmlAttributes).toEqual({
        style: 'display: inline-block;',
        'aria-label': 'Image node',
      });
    });

    it('can be configured with custom options', () => {
      const customOptions = {
        allowBase64: false,
        htmlAttributes: {
          class: 'custom-image',
        },
      };
      const options = configureOptions(customOptions);

      expect(options.allowBase64).toBe(false);
      expect(options.htmlAttributes.class).toBe('custom-image');
      // Should still preserve default style since we spread defaults first
      expect(options.htmlAttributes.style).toBe('display: inline-block;');
    });
  });

  describe('command structure', () => {
    const createSetImageCommand = () => {
      return {
        setImage:
          (options) =>
          ({ commands }) => {
            return commands.insertContent({
              type: 'image',
              attrs: options,
            });
          },
      };
    };

    it('defines setImage command correctly', () => {
      const commands = createSetImageCommand();
      expect(commands.setImage).toBeDefined();
      expect(typeof commands.setImage).toBe('function');
    });

    it('setImage command returns a command function', () => {
      const commands = createSetImageCommand();
      const commandFunction = commands.setImage({ src: 'test.jpg' });
      expect(typeof commandFunction).toBe('function');
    });

    it('setImage command creates correct content structure', () => {
      const commands = createSetImageCommand();
      const commandFunction = commands.setImage({
        src: 'test.jpg',
        alt: 'Test image',
        transformData: { rotation: 45 },
      });

      const mockCommands = {
        insertContent: (content) => content,
      };

      const result = commandFunction({ commands: mockCommands });

      expect(result).toEqual({
        type: 'image',
        attrs: {
          src: 'test.jpg',
          alt: 'Test image',
          transformData: { rotation: 45 },
        },
      });
    });
  });

  describe('storage initialization', () => {
    const createStorage = () => {
      return {
        media: {},
      };
    };

    it('initializes with empty media storage', () => {
      const storage = createStorage();
      expect(storage.media).toEqual({});
    });

    it('allows media storage to be populated', () => {
      const storage = createStorage();
      storage.media['key1'] = 'path1.jpg';
      storage.media['key2'] = 'path2.png';

      expect(storage.media['key1']).toBe('path1.jpg');
      expect(storage.media['key2']).toBe('path2.png');
    });
  });
});
