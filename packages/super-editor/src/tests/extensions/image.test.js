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

    it('retains padding-based margins when rotated without explicit margin offsets', () => {
      const { style } = renderImageAttributes({
        size: { width: 100, height: 100 },
        transformData: { rotation: 45 },
        padding: { left: 10, top: 15, bottom: 3, right: 8 },
      });
      const styles = parseStyle(style);
      expect(styles['margin-left']).toBe('31px');
      expect(styles['margin-top']).toBe('36px');
      expect(styles['margin-bottom']).toBe('24px');
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

    it('sets wrap text mode using setWrapping command', async () => {
      const {
        schema: { nodes },
        state,
        view,
      } = editor;

      // Create and insert an image
      const imageNode = nodes.image.create({
        src: 'word/media/test-image.png',
        size: { width: 200, height: 150 },
      });
      const paragraph = nodes.paragraph.create({}, imageNode);
      const docNode = nodes.doc.create({}, paragraph);

      const tr = state.tr.replaceWith(0, state.doc.content.size, docNode.content);
      view.dispatch(tr);

      // Helper function to select the image
      const selectImage = async () => {
        let imagePos;
        editor.view.state.doc.descendants((node, pos) => {
          if (node.type.name === 'image') {
            imagePos = pos + 1; // +1 to get position after the image node
            return false;
          }
          return true;
        });

        if (imagePos !== undefined) {
          const { NodeSelection } = await import('prosemirror-state');
          const selection = NodeSelection.create(editor.view.state.doc, imagePos - 1);
          editor.view.dispatch(editor.view.state.tr.setSelection(selection));
        }
        return imagePos;
      };

      let imagePos = await selectImage();

      // Test 1: Square wrapping with bothSides
      // Test setting wrap text to Square with bothSides
      editor.commands.setWrapping({
        type: 'Square',
        attrs: { wrapText: 'bothSides' },
      });

      let updatedImage;
      editor.view.state.doc.descendants((node) => {
        if (node.type.name === 'image') {
          updatedImage = node;
          return false;
        }
        return true;
      });

      expect(updatedImage).toBeTruthy();
      expect(updatedImage.attrs.wrap.type).toBe('Square');
      expect(updatedImage.attrs.wrap.attrs.wrapText).toBe('bothSides');

      // Test 2: Square wrapping with distances
      imagePos = await selectImage();
      editor.commands.setWrapping({
        type: 'Square',
        attrs: {
          wrapText: 'left',
          distTop: 10,
          distBottom: 20,
          distLeft: 30,
          distRight: 40,
        },
      });

      editor.view.state.doc.descendants((node) => {
        if (node.type.name === 'image') {
          updatedImage = node;
          return false;
        }
        return true;
      });

      expect(updatedImage.attrs.wrap.type).toBe('Square');
      expect(updatedImage.attrs.wrap.attrs.wrapText).toBe('left');
      expect(updatedImage.attrs.wrap.attrs.distTop).toBe(10);
      expect(updatedImage.attrs.wrap.attrs.distBottom).toBe(20);
      expect(updatedImage.attrs.wrap.attrs.distLeft).toBe(30);
      expect(updatedImage.attrs.wrap.attrs.distRight).toBe(40);

      // Test 3: Tight wrapping with polygon
      imagePos = await selectImage();
      editor.commands.setWrapping({
        type: 'Tight',
        attrs: {
          distLeft: 5,
          distRight: 10,
          polygon: [
            [0, 0],
            [100, 0],
            [100, 100],
            [0, 100],
          ],
        },
      });

      editor.view.state.doc.descendants((node) => {
        if (node.type.name === 'image') {
          updatedImage = node;
          return false;
        }
        return true;
      });

      expect(updatedImage.attrs.wrap.type).toBe('Tight');
      expect(updatedImage.attrs.wrap.attrs.distLeft).toBe(5);
      expect(updatedImage.attrs.wrap.attrs.distRight).toBe(10);
      expect(updatedImage.attrs.wrap.attrs.polygon).toEqual([
        [0, 0],
        [100, 0],
        [100, 100],
        [0, 100],
      ]);

      // Test 4: Through wrapping with polygon
      imagePos = await selectImage();
      editor.commands.setWrapping({
        type: 'Through',
        attrs: {
          distTop: 8,
          distBottom: 12,
          polygon: [
            [10, 10],
            [90, 10],
            [90, 90],
            [10, 90],
          ],
        },
      });

      editor.view.state.doc.descendants((node) => {
        if (node.type.name === 'image') {
          updatedImage = node;
          return false;
        }
        return true;
      });

      expect(updatedImage.attrs.wrap.type).toBe('Through');
      expect(updatedImage.attrs.wrap.attrs.distTop).toBe(8);
      expect(updatedImage.attrs.wrap.attrs.distBottom).toBe(12);
      expect(updatedImage.attrs.wrap.attrs.polygon).toEqual([
        [10, 10],
        [90, 10],
        [90, 90],
        [10, 90],
      ]);

      // Test 5: TopAndBottom wrapping
      imagePos = await selectImage();
      editor.commands.setWrapping({
        type: 'TopAndBottom',
        attrs: {
          distTop: 15,
          distBottom: 25,
        },
      });

      editor.view.state.doc.descendants((node) => {
        if (node.type.name === 'image') {
          updatedImage = node;
          return false;
        }
        return true;
      });

      expect(updatedImage.attrs.wrap.type).toBe('TopAndBottom');
      expect(updatedImage.attrs.wrap.attrs.distTop).toBe(15);
      expect(updatedImage.attrs.wrap.attrs.distBottom).toBe(25);

      // Test 6: None wrapping with behindDoc
      imagePos = await selectImage();
      editor.commands.setWrapping({ type: 'None', attrs: { behindDoc: true } });

      editor.view.state.doc.descendants((node) => {
        if (node.type.name === 'image') {
          updatedImage = node;
          return false;
        }
        return true;
      });

      expect(updatedImage.attrs.wrap.type).toBe('None');
      expect(updatedImage.attrs.wrap.attrs).toEqual({ behindDoc: true });

      // Test 7: None wrapping without behindDoc (should not affect originalAttributes)
      imagePos = await selectImage();
      editor.commands.setWrapping({ type: 'None', attrs: { behindDoc: false } });

      editor.view.state.doc.descendants((node) => {
        if (node.type.name === 'image') {
          updatedImage = node;
          return false;
        }
        return true;
      });

      expect(updatedImage.attrs.wrap.type).toBe('None');
      expect(updatedImage.attrs.wrap.attrs).toEqual({ behindDoc: false });
    });

    it('validates attributes for each wrap type', async () => {
      const {
        schema: { nodes },
        state,
        view,
      } = editor;

      // Create and insert an image
      const imageNode = nodes.image.create({
        src: 'word/media/test-image.png',
        size: { width: 200, height: 150 },
      });
      const paragraph = nodes.paragraph.create({}, imageNode);
      const docNode = nodes.doc.create({}, paragraph);

      const tr = state.tr.replaceWith(0, state.doc.content.size, docNode.content);
      view.dispatch(tr);

      // Helper function to select the image
      const selectImage = async () => {
        let imagePos;
        editor.view.state.doc.descendants((node, pos) => {
          if (node.type.name === 'image') {
            imagePos = pos + 1; // +1 to get position after the image node
            return false;
          }
          return true;
        });

        if (imagePos !== undefined) {
          const { NodeSelection } = await import('prosemirror-state');
          const selection = NodeSelection.create(editor.view.state.doc, imagePos - 1);
          editor.view.dispatch(editor.view.state.tr.setSelection(selection));
        }
        return imagePos;
      };

      let imagePos = await selectImage();

      // Test 1: Square type should ignore polygon attribute
      editor.commands.setWrapping({
        type: 'Square',
        attrs: {
          wrapText: 'bothSides',
          polygon: [
            [0, 0],
            [100, 0],
            [100, 100],
            [0, 100],
          ], // Should be ignored
        },
      });

      let updatedImage;
      editor.view.state.doc.descendants((node) => {
        if (node.type.name === 'image') {
          updatedImage = node;
          return false;
        }
        return true;
      });

      expect(updatedImage.attrs.wrap.type).toBe('Square');
      expect(updatedImage.attrs.wrap.attrs.wrapText).toBe('bothSides');
      expect(updatedImage.attrs.wrap.attrs.polygon).toBeUndefined(); // Polygon should be filtered out

      // Test 2: TopAndBottom type should ignore wrapText and polygon attributes
      imagePos = await selectImage();
      editor.commands.setWrapping({
        type: 'TopAndBottom',
        attrs: {
          distTop: 15,
          distBottom: 20,
          wrapText: 'bothSides', // Should be ignored
          polygon: [
            [0, 0],
            [100, 0],
          ], // Should be ignored
        },
      });

      editor.view.state.doc.descendants((node) => {
        if (node.type.name === 'image') {
          updatedImage = node;
          return false;
        }
        return true;
      });

      expect(updatedImage.attrs.wrap.type).toBe('TopAndBottom');
      expect(updatedImage.attrs.wrap.attrs.distTop).toBe(15);
      expect(updatedImage.attrs.wrap.attrs.distBottom).toBe(20);
      expect(updatedImage.attrs.wrap.attrs.wrapText).toBeUndefined(); // Should be filtered out
      expect(updatedImage.attrs.wrap.attrs.polygon).toBeUndefined(); // Should be filtered out

      // Test 3: None type should ignore all attributes except behindDoc
      imagePos = await selectImage();
      editor.commands.setWrapping({
        type: 'None',
        attrs: {
          wrapText: 'bothSides', // Should be ignored
          distTop: 10, // Should be ignored
          polygon: [
            [0, 0],
            [100, 0],
          ], // Should be
          behindDoc: true,
        },
      });

      editor.view.state.doc.descendants((node) => {
        if (node.type.name === 'image') {
          updatedImage = node;
          return false;
        }
        return true;
      });

      expect(updatedImage.attrs.wrap.type).toBe('None');
      expect(updatedImage.attrs.wrap.attrs).toEqual({ behindDoc: true }); // All attributes except behindDoc should be filtered out

      // Test 4: Through type should accept polygon and distance attributes
      imagePos = await selectImage();
      editor.commands.setWrapping({
        type: 'Through',
        attrs: {
          distLeft: 5,
          distRight: 10,
          distTop: 3,
          distBottom: 7,
          polygon: [
            [10, 10],
            [90, 10],
            [90, 90],
            [10, 90],
          ],
        },
      });

      editor.view.state.doc.descendants((node) => {
        if (node.type.name === 'image') {
          updatedImage = node;
          return false;
        }
        return true;
      });

      expect(updatedImage.attrs.wrap.type).toBe('Through');
      expect(updatedImage.attrs.wrap.attrs.distLeft).toBe(5);
      expect(updatedImage.attrs.wrap.attrs.distRight).toBe(10);
      expect(updatedImage.attrs.wrap.attrs.distTop).toBe(3);
      expect(updatedImage.attrs.wrap.attrs.distBottom).toBe(7);
      expect(updatedImage.attrs.wrap.attrs.polygon).toEqual([
        [10, 10],
        [90, 10],
        [90, 90],
        [10, 90],
      ]);

      // Test 5: Tight type should accept polygon and distance attributes
      imagePos = await selectImage();
      editor.commands.setWrapping({
        type: 'Tight',
        attrs: {
          distLeft: 8,
          polygon: [
            [0, 0],
            [50, 0],
            [50, 50],
            [0, 50],
          ],
        },
      });

      editor.view.state.doc.descendants((node) => {
        if (node.type.name === 'image') {
          updatedImage = node;
          return false;
        }
        return true;
      });

      expect(updatedImage.attrs.wrap.type).toBe('Tight');
      expect(updatedImage.attrs.wrap.attrs.distLeft).toBe(8);
      expect(updatedImage.attrs.wrap.attrs.polygon).toEqual([
        [0, 0],
        [50, 0],
        [50, 50],
        [0, 50],
      ]);
    });

    it('demonstrates setWrapping command usage', () => {
      // Example usage of the setWrapping command:
      //
      // No wrapping, behind document:
      // editor.commands.setWrapping({ type: 'None', behindDoc: true })
      //
      // Square wrapping on both sides with distances:
      // editor.commands.setWrapping({
      //   type: 'Square',
      //   attrs: {
      //     wrapText: 'bothSides',
      //     distTop: 10,
      //     distBottom: 10,
      //     distLeft: 10,
      //     distRight: 10
      //   }
      // })
      //
      // Square wrapping on left side only:
      // editor.commands.setWrapping({
      //   type: 'Square',
      //   attrs: { wrapText: 'left' }
      // })
      //
      // Square wrapping on right side only:
      // editor.commands.setWrapping({
      //   type: 'Square',
      //   attrs: { wrapText: 'right' }
      // })
      //
      // Square wrapping on largest side:
      // editor.commands.setWrapping({
      //   type: 'Square',
      //   attrs: { wrapText: 'largest' }
      // })
      //
      // Tight wrapping with polygon:
      // editor.commands.setWrapping({
      //   type: 'Tight',
      //   attrs: {
      //     polygon: [[0, 0], [100, 0], [100, 100], [0, 100]]
      //   }
      // })
      //
      // Through wrapping with polygon and distances:
      // editor.commands.setWrapping({
      //   type: 'Through',
      //   attrs: {
      //     distLeft: 5,
      //     distRight: 5,
      //     polygon: [[10, 10], [90, 10], [90, 90], [10, 90]]
      //   }
      // })
      //
      // Top and bottom wrapping:
      // editor.commands.setWrapping({
      //   type: 'TopAndBottom',
      //   attrs: {
      //     distTop: 15,
      //     distBottom: 15
      //   }
      // })
      //
      // No text wrapping (in front of document):
      // editor.commands.setWrapping({ type: 'None', behindDoc: false })

      expect(true).toBe(true); // Placeholder assertion
    });
  });
});
