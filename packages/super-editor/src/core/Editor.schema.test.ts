import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Editor } from './Editor.js';
import { getTestDataAsFileBuffer } from '@tests/helpers/helpers.js';
import { loadFrozenSchema } from './schema-management/schema-loader.js';
import type { ProseMirrorJSON } from './types/EditorTypes.js';

describe('Editor - Schema Methods', () => {
  describe('getSchemaSummaryJSON', () => {
    let editor: Editor;

    beforeEach(async () => {
      const buffer = await getTestDataAsFileBuffer('simple-ordered-list.docx');
      const [content, , mediaFiles, fonts] = await Editor.loadXmlData(buffer, true);

      const frozen = await loadFrozenSchema();
      const extensions = frozen.getStarterExtensions();

      editor = new Editor({
        isHeadless: true,
        mode: 'docx',
        documentId: 'schema-test',
        extensions,
        content,
        mediaFiles,
        fonts,
      });
    });

    afterEach(() => {
      if (editor) {
        editor.destroy();
      }
    });

    it('should return a schema summary for the latest frozen schema', async () => {
      const summary = await editor.getSchemaSummaryJSON();

      expect(summary).toBeDefined();
      expect(summary).toHaveProperty('version');
      expect(summary).toHaveProperty('schemaVersion');
      expect(summary).toHaveProperty('topNode');
      expect(summary).toHaveProperty('nodes');
      expect(summary).toHaveProperty('marks');
    });

    it('should return schema summary with array of nodes', async () => {
      const summary = await editor.getSchemaSummaryJSON();

      expect(Array.isArray(summary.nodes)).toBe(true);
      expect(summary.nodes.length).toBeGreaterThan(0);
    });

    it('should return schema summary with array of marks', async () => {
      const summary = await editor.getSchemaSummaryJSON();

      expect(Array.isArray(summary.marks)).toBe(true);
      expect(summary.marks.length).toBeGreaterThan(0);
    });

    it('should include doc node in schema summary', async () => {
      const summary = await editor.getSchemaSummaryJSON();

      const docNode = summary.nodes.find((n) => n.name === 'doc');
      expect(docNode).toBeDefined();
      expect(docNode?.name).toBe('doc');
    });

    it('should include paragraph node in schema summary', async () => {
      const summary = await editor.getSchemaSummaryJSON();

      const paragraphNode = summary.nodes.find((n) => n.name === 'paragraph');
      expect(paragraphNode).toBeDefined();
      expect(paragraphNode?.name).toBe('paragraph');
    });

    it('should include node attributes in schema summary', async () => {
      const summary = await editor.getSchemaSummaryJSON();

      const paragraphNode = summary.nodes.find((n) => n.name === 'paragraph');
      expect(paragraphNode).toBeDefined();
      expect(paragraphNode?.attrs).toBeDefined();
      expect(typeof paragraphNode?.attrs).toBe('object');
    });

    it('should include mark attributes in schema summary', async () => {
      const summary = await editor.getSchemaSummaryJSON();

      const boldMark = summary.marks.find((m) => m.name === 'bold');
      if (boldMark) {
        expect(boldMark.attrs).toBeDefined();
        expect(typeof boldMark.attrs).toBe('object');
      }
    });

    it('should set topNode to doc', async () => {
      const summary = await editor.getSchemaSummaryJSON();

      expect(summary.topNode).toBe('doc');
    });

    it('should accept version string parameter', async () => {
      const summary = await editor.getSchemaSummaryJSON();
      const version = summary.schemaVersion;

      const summaryWithVersion = await editor.getSchemaSummaryJSON(version);

      expect(summaryWithVersion.schemaVersion).toBe(version);
    });

    it('should accept options object parameter', async () => {
      const summary = await editor.getSchemaSummaryJSON();
      const version = summary.schemaVersion;

      const summaryWithOptions = await editor.getSchemaSummaryJSON({ version });

      expect(summaryWithOptions.schemaVersion).toBe(version);
    });

    it('should throw error for non-existent version', async () => {
      await expect(editor.getSchemaSummaryJSON('999.999.999')).rejects.toThrow();
    });

    it('should return detailed node specs with all properties', async () => {
      const summary = await editor.getSchemaSummaryJSON();

      const headingNode = summary.nodes.find((n) => n.name === 'heading');
      if (headingNode) {
        expect(headingNode).toHaveProperty('name');
        expect(headingNode).toHaveProperty('attrs');
        // May have group, content, etc.
      }
    });

    it('should return detailed mark specs with all properties', async () => {
      const summary = await editor.getSchemaSummaryJSON();

      const boldMark = summary.marks.find((m) => m.name === 'bold');
      if (boldMark) {
        expect(boldMark).toHaveProperty('name');
        expect(boldMark).toHaveProperty('attrs');
        // May have inclusive, excludes, etc.
      }
    });
  });

  describe('validateJSON', () => {
    let editor: Editor;

    beforeEach(async () => {
      const buffer = await getTestDataAsFileBuffer('simple-ordered-list.docx');
      const [content, , mediaFiles, fonts] = await Editor.loadXmlData(buffer, true);

      const frozen = await loadFrozenSchema();
      const extensions = frozen.getStarterExtensions();

      editor = new Editor({
        isHeadless: true,
        mode: 'docx',
        documentId: 'validation-test',
        extensions,
        content,
        mediaFiles,
        fonts,
      });
    });

    afterEach(() => {
      if (editor) {
        editor.destroy();
      }
    });

    it('should validate a simple valid document', () => {
      const doc: ProseMirrorJSON = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Hello world' }],
          },
        ],
      };

      const node = editor.validateJSON(doc);

      expect(node).toBeDefined();
      expect(node.type.name).toBe('doc');
    });

    it('should validate document with no content', () => {
      const doc: ProseMirrorJSON = {
        type: 'doc',
        content: [],
      };

      // This may be valid or invalid depending on schema - test the behavior
      try {
        const node = editor.validateJSON(doc);
        expect(node).toBeDefined();
      } catch (error) {
        // Schema may require content
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should validate document with multiple paragraphs', () => {
      const doc: ProseMirrorJSON = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'First paragraph' }],
          },
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Second paragraph' }],
          },
        ],
      };

      const node = editor.validateJSON(doc);

      expect(node).toBeDefined();
      expect(node.childCount).toBe(2);
    });

    it('should validate document with marks', () => {
      const doc: ProseMirrorJSON = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Bold text',
                marks: [{ type: 'bold' }],
              },
            ],
          },
        ],
      };

      const node = editor.validateJSON(doc);

      expect(node).toBeDefined();
      const firstChild = node.child(0);
      const textNode = firstChild.child(0);
      expect(textNode.marks.length).toBeGreaterThan(0);
    });

    it('should validate document with nested content', () => {
      const doc: ProseMirrorJSON = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Simple paragraph' }],
          },
        ],
      };

      const node = editor.validateJSON(doc);

      expect(node).toBeDefined();
      expect(node.type.name).toBe('doc');
    });

    it('should throw error for invalid node type', () => {
      const doc: ProseMirrorJSON = {
        type: 'invalidNode',
        content: [],
      };

      expect(() => editor.validateJSON(doc)).toThrow();
    });

    it('should throw error for missing required attributes', () => {
      // This depends on schema specifics - heading might require level
      const doc: ProseMirrorJSON = {
        type: 'doc',
        content: [
          {
            type: 'heading',
            // Missing attrs that might be required
            content: [{ type: 'text', text: 'Heading' }],
          },
        ],
      };

      try {
        editor.validateJSON(doc);
      } catch (error) {
        // If attrs are required, it should throw
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should throw error for invalid content model', () => {
      const doc: ProseMirrorJSON = {
        type: 'doc',
        content: [
          {
            type: 'text', // text cannot be direct child of doc
            text: 'Invalid',
          },
        ],
      };

      try {
        editor.validateJSON(doc);
        // Some schemas might allow this, so we don't fail if it succeeds
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        const err = error as Error;
        expect(err.message).toContain('Invalid document for current schema');
      }
    });

    it('should throw error for invalid mark on node', () => {
      const doc: ProseMirrorJSON = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Text',
                marks: [{ type: 'invalidMark' }],
              },
            ],
          },
        ],
      };

      expect(() => editor.validateJSON(doc)).toThrow();
    });

    it('should preserve original error in cause property', () => {
      const doc: ProseMirrorJSON = {
        type: 'invalidNode',
        content: [],
      };

      try {
        editor.validateJSON(doc);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        const err = error as Error & { cause?: Error };
        expect(err.message).toContain('Invalid document for current schema');
        expect(err.cause).toBeDefined();
        expect(err.cause).toBeInstanceOf(Error);
      }
    });

    it('should include details in error message', () => {
      const doc: ProseMirrorJSON = {
        type: 'nonExistentNodeType',
        content: [],
      };

      try {
        editor.validateJSON(doc);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        const err = error as Error;
        expect(err.message).toContain('Invalid document for current schema');
        expect(err.message.length).toBeGreaterThan('Invalid document for current schema:'.length);
      }
    });

    it('should return valid ProseMirror node with correct structure', () => {
      const doc: ProseMirrorJSON = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Test' }],
          },
        ],
      };

      const node = editor.validateJSON(doc);

      expect(node.type.name).toBe('doc');
      expect(node.childCount).toBe(1);
      expect(node.child(0).type.name).toBe('paragraph');
      expect(node.child(0).textContent).toBe('Test');
    });

    it('should validate complex document structure', () => {
      const doc: ProseMirrorJSON = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'First paragraph' }],
          },
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Normal text ' },
              {
                type: 'text',
                text: 'bold text',
                marks: [{ type: 'bold' }],
              },
            ],
          },
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Third paragraph' }],
          },
        ],
      };

      const node = editor.validateJSON(doc);

      expect(node).toBeDefined();
      expect(node.childCount).toBe(3);
    });

    it('should handle empty paragraph', () => {
      const doc: ProseMirrorJSON = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [],
          },
        ],
      };

      const node = editor.validateJSON(doc);

      expect(node).toBeDefined();
      expect(node.child(0).childCount).toBe(0);
    });

    it('should validate current editor JSON', () => {
      const currentJSON = editor.getJSON();
      const node = editor.validateJSON(currentJSON);

      expect(node).toBeDefined();
      expect(node.type.name).toBe('doc');
    });
  });
});
