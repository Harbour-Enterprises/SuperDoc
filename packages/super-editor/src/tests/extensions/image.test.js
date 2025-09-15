import { createTestEditor } from '../helpers/editor-test-utils.js';
import { Image } from '@extensions/image/image.js';
import { getStarterExtensions } from '@extensions/index.js';

describe('Image Extension', () => {
  let editor;

  beforeEach(() => {
    const extensions = getStarterExtensions();
    editor = createTestEditor({ extensions });
  });

  afterEach(() => {
    editor?.destroy();
  });

  describe('DOM rendering', () => {
    it('renders basic image without transformData', () => {
      const imageNode = editor.schema.nodes.image.create({
        src: 'test-image.jpg',
        alt: 'Test image',
        size: { width: 200, height: 150 },
      });

      const dom = editor.schema.nodes.image.spec.renderDOM({
        node: imageNode,
        htmlAttributes: {},
      });

      expect(dom[0]).toBe('img');
      expect(dom[1].src).toBe('test-image.jpg');
      expect(dom[1].alt).toBe('Test image');
      expect(dom[1].style).toContain('width: 200px');
    });

    it('renders transformData with rotation only', () => {
      const imageNode = editor.schema.nodes.image.create({
        src: 'rotated-image.jpg',
        alt: 'Rotated image',
        transformData: {
          rotation: 45,
        },
      });

      const renderDOM = editor.schema.nodes.image.spec.attributes.transformData.renderDOM;
      const result = renderDOM({ transformData: { rotation: 45 } });

      expect(result.style).toBe('transform: rotate(45deg);');
    });

    it('renders transformData with vertical flip only', () => {
      const renderDOM = editor.schema.nodes.image.spec.attributes.transformData.renderDOM;
      const result = renderDOM({
        transformData: {
          verticalFlip: true,
        },
      });

      expect(result.style).toBe('transform: scaleY(-1);');
    });

    it('renders transformData with horizontal flip only', () => {
      const renderDOM = editor.schema.nodes.image.spec.attributes.transformData.renderDOM;
      const result = renderDOM({
        transformData: {
          horizontalFlip: true,
        },
      });

      expect(result.style).toBe('transform: scaleX(-1);');
    });

    it('renders transformData with all transformations combined', () => {
      const renderDOM = editor.schema.nodes.image.spec.attributes.transformData.renderDOM;
      const result = renderDOM({
        transformData: {
          rotation: 30,
          verticalFlip: true,
          horizontalFlip: true,
        },
      });

      expect(result.style).toBe('transform: rotate(30deg) scaleY(-1) scaleX(-1);');
    });

    it('renders transformData with fractional rotation', () => {
      const renderDOM = editor.schema.nodes.image.spec.attributes.transformData.renderDOM;
      const result = renderDOM({
        transformData: {
          rotation: 45.7,
        },
      });

      expect(result.style).toBe('transform: rotate(46deg);');
    });

    it('renders transformData with negative rotation', () => {
      const renderDOM = editor.schema.nodes.image.spec.attributes.transformData.renderDOM;
      const result = renderDOM({
        transformData: {
          rotation: -90,
        },
      });

      expect(result.style).toBe('transform: rotate(-90deg);');
    });

    it('returns undefined when no transformData is provided', () => {
      const renderDOM = editor.schema.nodes.image.spec.attributes.transformData.renderDOM;
      const result = renderDOM({ transformData: {} });

      expect(result).toBeUndefined();
    });

    it('returns undefined when transformData is null', () => {
      const renderDOM = editor.schema.nodes.image.spec.attributes.transformData.renderDOM;
      const result = renderDOM({ transformData: null });

      expect(result).toBeUndefined();
    });

    it('ignores sizeExtension in DOM rendering', () => {
      const renderDOM = editor.schema.nodes.image.spec.attributes.transformData.renderDOM;
      const result = renderDOM({
        transformData: {
          rotation: 45,
          sizeExtension: {
            left: 10,
            top: 5,
            right: 15,
            bottom: 20,
          },
        },
      });

      // sizeExtension should not affect DOM transform style
      expect(result.style).toBe('transform: rotate(45deg);');
    });
  });

  describe('size rendering', () => {
    it('renders size with width and height', () => {
      const renderDOM = editor.schema.nodes.image.spec.attributes.size.renderDOM;
      const result = renderDOM({
        size: { width: 300, height: 200 },
      });

      expect(result.style).toContain('width: 300px');
      expect(result.style).toContain('height: auto');
    });

    it('renders EMF/WMF with special height styling', () => {
      const renderDOM = editor.schema.nodes.image.spec.attributes.size.renderDOM;
      const result = renderDOM({
        size: { width: 300, height: 200 },
        extension: 'emf',
      });

      expect(result.style).toContain('width: 300px');
      expect(result.style).toContain('height: 200px');
      expect(result.style).toContain('border: 1px solid black');
      expect(result.style).toContain('position: absolute');
    });

    it('renders WMF with special height styling', () => {
      const renderDOM = editor.schema.nodes.image.spec.attributes.size.renderDOM;
      const result = renderDOM({
        size: { width: 250, height: 150 },
        extension: 'wmf',
      });

      expect(result.style).toContain('width: 250px');
      expect(result.style).toContain('height: 150px');
      expect(result.style).toContain('border: 1px solid black');
      expect(result.style).toContain('position: absolute');
    });

    it('handles missing size gracefully', () => {
      const renderDOM = editor.schema.nodes.image.spec.attributes.size.renderDOM;
      const result = renderDOM({ size: null });

      expect(result.style).toBe('');
    });
  });

  describe('padding rendering', () => {
    it('renders all padding values', () => {
      const renderDOM = editor.schema.nodes.image.spec.attributes.padding.renderDOM;
      const result = renderDOM({
        size: { width: 200, height: 150 },
        padding: {
          left: 10,
          top: 15,
          bottom: 20,
          right: 25,
        },
      });

      expect(result.style).toContain('margin-left: 10px');
      expect(result.style).toContain('margin-top: 15px');
      expect(result.style).toContain('margin-bottom: 20px');
      expect(result.style).toContain('margin-right: 25px');
    });

    it('adds rotation margins for rotated images', () => {
      const renderDOM = editor.schema.nodes.image.spec.attributes.padding.renderDOM;
      const result = renderDOM({
        size: { width: 100, height: 100 },
        padding: { left: 5, top: 5, bottom: 5, right: 5 },
        transformData: { rotation: 45 },
      });

      // Should include base padding plus rotation margins
      expect(result.style).toContain('margin-left:');
      expect(result.style).toContain('margin-top:');
      expect(result.style).toContain('margin-bottom:');
      expect(result.style).toContain('margin-right:');

      // Values should be higher than base padding due to rotation margins
      const leftMatch = result.style.match(/margin-left: (\d+)px/);
      const topMatch = result.style.match(/margin-top: (\d+)px/);

      if (leftMatch && topMatch) {
        expect(parseInt(leftMatch[1])).toBeGreaterThan(5);
        expect(parseInt(topMatch[1])).toBeGreaterThan(5);
      }
    });

    it('respects marginOffset for left and top margins', () => {
      const renderDOM = editor.schema.nodes.image.spec.attributes.padding.renderDOM;
      const result = renderDOM({
        size: { width: 200, height: 150 },
        padding: { left: 10, top: 15, bottom: 20, right: 25 },
        marginOffset: { left: true, top: true },
      });

      expect(result.style).not.toContain('margin-left');
      expect(result.style).not.toContain('margin-top');
      expect(result.style).toContain('margin-bottom: 20px');
      expect(result.style).toContain('margin-right: 25px');
    });
  });

  describe('marginOffset rendering', () => {
    it('renders marginOffset values', () => {
      const renderDOM = editor.schema.nodes.image.spec.attributes.marginOffset.renderDOM;
      const result = renderDOM({
        marginOffset: { left: 30, top: 40 },
      });

      expect(result.style).toContain('margin-left: 30px');
      expect(result.style).toContain('margin-top: 40px');
    });

    it('limits top margin for page-relative anchors', () => {
      const renderDOM = editor.schema.nodes.image.spec.attributes.marginOffset.renderDOM;
      const result = renderDOM({
        marginOffset: { left: 30, top: 600 },
        anchorData: { vRelativeFrom: 'page' },
      });

      expect(result.style).toContain('margin-left: 30px');
      expect(result.style).toContain('margin-top: 500px'); // Capped at 500px
    });

    it('does not limit top margin for non-page-relative anchors', () => {
      const renderDOM = editor.schema.nodes.image.spec.attributes.marginOffset.renderDOM;
      const result = renderDOM({
        marginOffset: { left: 30, top: 600 },
        anchorData: { vRelativeFrom: 'margin' },
      });

      expect(result.style).toContain('margin-left: 30px');
      expect(result.style).toContain('margin-top: 600px');
    });
  });

  describe('src attribute rendering', () => {
    beforeEach(() => {
      // Mock storage.media
      if (editor.extensionService.extensions.find((e) => e.name === 'image')) {
        const imageExtension = editor.extensionService.extensions.find((e) => e.name === 'image');
        imageExtension.storage.media = {
          'stored-key': 'actual-image-path.jpg',
        };
      }
    });

    it('uses media storage when src is a key', () => {
      const imageExtension = editor.extensionService.extensions.find((e) => e.name === 'image');
      const renderDOM = imageExtension.spec.attributes.src.renderDOM;
      const result = renderDOM.call(imageExtension, { src: 'stored-key' });

      expect(result.src).toBe('actual-image-path.jpg');
    });

    it('uses src directly when not in media storage', () => {
      const imageExtension = editor.extensionService.extensions.find((e) => e.name === 'image');
      const renderDOM = imageExtension.spec.attributes.src.renderDOM;
      const result = renderDOM.call(imageExtension, { src: 'direct-path.jpg' });

      expect(result.src).toBe('direct-path.jpg');
    });
  });

  describe('commands', () => {
    it('setImage command creates image node with correct attributes', () => {
      const imageAttrs = {
        src: 'command-test.jpg',
        alt: 'Command test image',
        size: { width: 150, height: 100 },
        transformData: {
          rotation: 90,
          verticalFlip: true,
        },
      };

      editor.commands.setImage(imageAttrs);

      const imageNode = editor.state.doc.firstChild.firstChild;
      expect(imageNode.type.name).toBe('image');
      expect(imageNode.attrs.src).toBe('command-test.jpg');
      expect(imageNode.attrs.alt).toBe('Command test image');
      expect(imageNode.attrs.transformData.rotation).toBe(90);
      expect(imageNode.attrs.transformData.verticalFlip).toBe(true);
    });
  });

  describe('parseDOM', () => {
    it('parses img tags correctly', () => {
      const parseRule = editor.schema.nodes.image.spec.parseDOM[0];

      // Test with regular img tag
      const imgElement = document.createElement('img');
      imgElement.src = 'test.jpg';
      imgElement.alt = 'Test';

      expect(parseRule.tag).toMatch(imgElement);
    });

    it('excludes base64 images when allowBase64 is false', () => {
      const extensions = getStarterExtensions().map((ext) => {
        if (ext.name === 'image') {
          return Image.configure({
            allowBase64: false,
          });
        }
        return ext;
      });

      const editorNoBase64 = createTestEditor({ extensions });

      const parseRule = editorNoBase64.schema.nodes.image.spec.parseDOM[0];
      expect(parseRule.tag).toBe('img[src]:not([src^="data:"])');

      editorNoBase64.destroy();
    });
  });

  describe('integration with helpers', () => {
    it('integrates with getRotationMargins helper', () => {
      // This test verifies that rotation margin calculation is working
      const renderDOM = editor.schema.nodes.image.spec.attributes.padding.renderDOM;

      // Test with square image rotated 45 degrees
      const result = renderDOM({
        size: { width: 100, height: 100 },
        padding: { left: 0, top: 0, bottom: 0, right: 0 },
        transformData: { rotation: 45 },
      });

      // Should have added rotation margins
      expect(result.style).toContain('margin-left:');
      expect(result.style).toContain('margin-right:');
      expect(result.style).toContain('margin-top:');
      expect(result.style).toContain('margin-bottom:');
    });
  });
});
