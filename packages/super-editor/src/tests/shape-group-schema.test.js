import { describe, it, expect } from 'vitest';
import { initTestEditor } from './helpers/helpers.js';

describe('ShapeGroup Schema Test', () => {
  it('should allow shapeGroup node in schema', () => {
    const testDoc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'run',
              content: [
                {
                  type: 'shapeGroup',
                  attrs: {
                    groupTransform: {},
                    shapes: [],
                    size: { width: 100, height: 100 },
                    padding: null,
                    marginOffset: null,
                    drawingContent: null,
                  },
                },
              ],
            },
          ],
        },
      ],
    };

    const { editor } = initTestEditor({ loadFromSchema: true, content: testDoc });

    const doc = editor.state.doc;
    expect(doc).toBeDefined();
    expect(doc.type.name).toBe('doc');

    console.log('Document JSON:', JSON.stringify(doc.toJSON(), null, 2));

    // Check if shapeGroup is in the document
    let foundShapeGroup = false;
    doc.descendants((node) => {
      if (node.type.name === 'shapeGroup') {
        foundShapeGroup = true;
        console.log('Found shapeGroup node:', node.toJSON());
      }
    });

    expect(foundShapeGroup).toBe(true);
  });

  it('should allow shapeGroup directly in paragraph (no run)', () => {
    const testDoc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'shapeGroup',
              attrs: {
                groupTransform: {},
                shapes: [],
                size: { width: 100, height: 100 },
                padding: null,
                marginOffset: null,
                drawingContent: null,
              },
            },
          ],
        },
      ],
    };

    const { editor } = initTestEditor({ loadFromSchema: true, content: testDoc });

    const doc = editor.state.doc;
    expect(doc).toBeDefined();

    console.log('Direct paragraph test - Document JSON:', JSON.stringify(doc.toJSON(), null, 2));

    // Check if shapeGroup is in the document
    let foundShapeGroup = false;
    doc.descendants((node) => {
      if (node.type.name === 'shapeGroup') {
        foundShapeGroup = true;
        console.log('Found shapeGroup node in paragraph:', node.toJSON());
      }
    });

    expect(foundShapeGroup).toBe(true);
  });

  it('should allow image node in run for comparison', () => {
    const testDoc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'run',
              content: [
                {
                  type: 'image',
                  attrs: {
                    src: 'test.png',
                    alt: 'Test',
                    extension: 'png',
                    id: '1',
                    title: 'Test',
                    inline: true,
                    padding: null,
                    marginOffset: null,
                    size: { width: 100, height: 100 },
                    anchorData: null,
                    isAnchor: false,
                    transformData: {},
                    wrap: { type: 'Inline' },
                    wrapTopAndBottom: false,
                    originalPadding: {},
                    originalAttributes: {},
                    rId: 'rId1',
                  },
                },
              ],
            },
          ],
        },
      ],
    };

    const { editor } = initTestEditor({ loadFromSchema: true, content: testDoc });

    const doc = editor.state.doc;
    expect(doc).toBeDefined();

    // Try to check the document for validation errors
    try {
      doc.check();
      console.log('Document passed validation check');
    } catch (error) {
      console.error('Document validation error:', error.message);
    }

    console.log('Document JSON:', JSON.stringify(doc.toJSON(), null, 2));

    // Check if image is in the document
    let foundImage = false;
    doc.descendants((node) => {
      if (node.type.name === 'image') {
        foundImage = true;
        console.log('Found image node:', node.toJSON());
      }
    });

    expect(foundImage).toBe(true);
  });

  it('should allow shapeGroup with minimal attrs', () => {
    const testDoc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'shapeGroup',
            },
          ],
        },
      ],
    };

    const { editor } = initTestEditor({ loadFromSchema: true, content: testDoc });

    const doc = editor.state.doc;
    expect(doc).toBeDefined();

    console.log('Minimal attrs test - Document JSON:', JSON.stringify(doc.toJSON(), null, 2));

    // Check if shapeGroup is in the document
    let foundShapeGroup = false;
    doc.descendants((node) => {
      if (node.type.name === 'shapeGroup') {
        foundShapeGroup = true;
        console.log('Found shapeGroup node with minimal attrs:', node.toJSON());
      }
    });

    expect(foundShapeGroup).toBe(true);
  });

  it('should allow shapeGroup with explicit content field', () => {
    const testDoc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'shapeGroup',
              content: [], // Explicitly specify empty content for atom node
              attrs: {
                groupTransform: {},
                shapes: [],
                size: { width: 100, height: 100 },
                padding: null,
                marginOffset: null,
                drawingContent: null,
              },
            },
          ],
        },
      ],
    };

    const { editor } = initTestEditor({ loadFromSchema: true, content: testDoc });

    const doc = editor.state.doc;
    expect(doc).toBeDefined();

    console.log('Explicit content test - Document JSON:', JSON.stringify(doc.toJSON(), null, 2));

    // Check if shapeGroup is in the document
    let foundShapeGroup = false;
    doc.descendants((node) => {
      if (node.type.name === 'shapeGroup') {
        foundShapeGroup = true;
        console.log('Found shapeGroup node with explicit content:', node.toJSON());
      }
    });

    expect(foundShapeGroup).toBe(true);
  });

  it('should create shapeGroup using schema.nodes directly', () => {
    const { editor } = initTestEditor({});

    // Try creating a shapeGroup node directly using the schema
    try {
      const shapeGroupNode = editor.schema.nodes.shapeGroup.create({
        groupTransform: {},
        shapes: [],
        size: { width: 100, height: 100 },
        padding: null,
        marginOffset: null,
        drawingContent: null,
      });

      console.log('Created shapeGroup node directly:', shapeGroupNode.toJSON());
      expect(shapeGroupNode).toBeDefined();
      expect(shapeGroupNode.type.name).toBe('shapeGroup');

      // Now try to create a paragraph containing it
      const paragraphNode = editor.schema.nodes.paragraph.create(null, [shapeGroupNode]);
      console.log('Created paragraph with shapeGroup:', paragraphNode.toJSON());
      expect(paragraphNode.childCount).toBe(1);
    } catch (error) {
      console.error('Error creating shapeGroup node:', error.message);
      throw error;
    }
  });

  it('should have shapeGroup in schema', () => {
    const { editor } = initTestEditor({});

    expect(editor.schema.nodes.shapeGroup).toBeDefined();
    console.log('ShapeGroup spec:', editor.schema.nodes.shapeGroup.spec);
  });
});
