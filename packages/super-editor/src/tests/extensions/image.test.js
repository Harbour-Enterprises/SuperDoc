import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDocxTestEditor } from '../helpers/editor-test-utils.js';

const parseStyle = (styleString = '') => {
  return styleString
    .split(';')
    .map((declaration) => declaration.trim())
    .filter(Boolean)
    .reduce((acc, declaration) => {
      const [property, value] = declaration.split(':').map((part) => part.trim());
      if (property) acc[property] = value;
      return acc;
    }, {});
};

describe('Image Extension DOM rendering', () => {
  let editor;
  let imageType;

  const renderImageAttributes = (attrs = {}) => {
    const nodeAttrs = {
      src: 'word/media/test-image.png',
      ...attrs,
    };

    const node = imageType.create(nodeAttrs);
    const domSpec = imageType.spec.toDOM(node);

    if (!Array.isArray(domSpec)) return {};
    const [, htmlAttributes = {}] = domSpec;
    return htmlAttributes;
  };

  beforeEach(() => {
    editor = createDocxTestEditor();
    imageType = editor.schema.nodes.image;
  });

  afterEach(() => {
    editor?.destroy();
  });

  describe('transformData CSS', () => {
    it('applies rotation transformations', () => {
      const { style } = renderImageAttributes({ transformData: { rotation: 45 } });
      const styles = parseStyle(style);
      expect(styles.transform).toContain('rotate(45deg)');
    });

    it('applies vertical flip transformations', () => {
      const { style } = renderImageAttributes({ transformData: { verticalFlip: true } });
      const styles = parseStyle(style);
      expect(styles.transform).toContain('scaleY(-1)');
    });

    it('applies horizontal flip transformations', () => {
      const { style } = renderImageAttributes({ transformData: { horizontalFlip: true } });
      const styles = parseStyle(style);
      expect(styles.transform).toContain('scaleX(-1)');
    });

    it('combines multiple transformations in order', () => {
      const { style } = renderImageAttributes({
        transformData: {
          rotation: 30,
          verticalFlip: true,
          horizontalFlip: true,
        },
      });
      const styles = parseStyle(style);
      expect(styles.transform).toBe('rotate(30deg) scaleY(-1) scaleX(-1)');
    });

    it('rounds fractional rotation values', () => {
      const { style } = renderImageAttributes({ transformData: { rotation: 45.7 } });
      const styles = parseStyle(style);
      expect(styles.transform).toContain('rotate(46deg)');
    });

    it('omits transform when data is empty', () => {
      const { style } = renderImageAttributes({ transformData: {} });
      const styles = parseStyle(style);
      expect(styles.transform).toBeUndefined();
    });
  });

  describe('size attribute styling', () => {
    it('applies width and auto height by default', () => {
      const { style } = renderImageAttributes({ size: { width: 300, height: 200 } });
      const styles = parseStyle(style);
      expect(styles.width).toBe('300px');
      expect(styles.height).toBe('auto');
    });

    it('renders EMF sizing with explicit height and border', () => {
      const { style } = renderImageAttributes({ size: { width: 300, height: 200 }, extension: 'emf' });
      const styles = parseStyle(style);
      expect(styles.width).toBe('300px');
      expect(styles.height).toBe('200px');
      expect(styles['border']).toBe('1px solid black');
      expect(styles['position']).toBe('absolute');
    });
  });

  describe('margin offset styling', () => {
    it('applies basic margin offsets', () => {
      const { style } = renderImageAttributes({ marginOffset: { left: 30, top: 40 } });
      const styles = parseStyle(style);
      expect(styles['margin-left']).toBe('30px');
      expect(styles['margin-top']).toBe('40px');
    });

    it('caps page-relative top margins at 500px', () => {
      const { style } = renderImageAttributes({
        marginOffset: { left: 10, top: 600 },
        anchorData: { vRelativeFrom: 'page' },
      });
      const styles = parseStyle(style);
      expect(styles['margin-left']).toBe('10px');
      expect(styles['margin-top']).toBe('500px');
    });

    it('adds rotation margins even when anchors are present', () => {
      const { style } = renderImageAttributes({
        size: { width: 100, height: 100 },
        transformData: { rotation: 45 },
        padding: { left: 10, top: 12, bottom: 4, right: 8 },
        marginOffset: { left: 5, top: 7 },
      });
      const styles = parseStyle(style);
      expect(styles['margin-left']).toBe('26px');
      expect(styles['margin-top']).toBe('28px');
      expect(styles['margin-bottom']).toBe('25px');
      expect(styles['margin-right']).toBe('29px');
    });
  });

  describe('editor integration', () => {
    it('renders anchored rotation margins in the live DOM', () => {
      const {
        schema: { nodes },
        state,
        view,
      } = editor;

      const imageNode = nodes.image.create({
        src: 'word/media/test-image.png',
        size: { width: 120, height: 80 },
        marginOffset: { left: 10, top: 20 },
        padding: { right: 4, bottom: 6 },
        transformData: { rotation: 30 },
        isAnchor: true,
        anchorData: { vRelativeFrom: 'page' },
      });
      const paragraph = nodes.paragraph.create({}, imageNode);
      const docNode = nodes.doc.create({}, paragraph);

      const tr = state.tr.replaceWith(0, state.doc.content.size, docNode.content);
      view.dispatch(tr);

      const img = editor.view.dom.querySelector('img');
      expect(img).toBeTruthy();
      const inlineStyles = parseStyle(img.getAttribute('style'));
      expect(inlineStyles['margin-top']).toBe('45px');
      expect(inlineStyles['margin-right']).toBe('16px');

      let insertedImage;
      editor.view.state.doc.descendants((node) => {
        if (node.type.name === 'image') {
          insertedImage = node;
          return false;
        }
        return true;
      });

      expect(insertedImage).toBeTruthy();
      expect(insertedImage.attrs.transformData.rotation).toBe(30);
      expect(insertedImage.attrs.marginOffset.left).toBe(10);
      expect(insertedImage.attrs.marginOffset.top).toBe(20);
    });
  });
});
