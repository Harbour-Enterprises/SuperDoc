import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processContent } from './contentProcessor.js';
import * as importHtml from './importHtml.js';
import * as importMarkdown from './importMarkdown.js';
import * as listHelpers from './list-numbering-helpers.js';
import { DOMParser } from 'prosemirror-model';

vi.mock('./importHtml.js');
vi.mock('./importMarkdown.js');
vi.mock('./list-numbering-helpers.js');
vi.mock('prosemirror-model', () => ({
  DOMParser: {
    fromSchema: vi.fn(),
  },
}));

describe('contentProcessor', () => {
  let mockSchema, mockEditor, mockDoc;

  beforeEach(() => {
    vi.clearAllMocks();

    mockDoc = {
      toJSON: vi.fn(() => ({ type: 'doc', content: [] })),
    };

    mockSchema = {
      text: vi.fn((content) => ({ type: 'text', text: content })),
      nodeFromJSON: vi.fn((json) => mockDoc),
    };

    mockEditor = {
      schema: mockSchema,
      converter: { numbering: {} },
    };

    listHelpers.ListHelpers = {
      getNewListId: vi.fn(() => 123),
      generateNewListDefinition: vi.fn(),
    };

    // Mock DOMParser for text processing
    DOMParser.fromSchema.mockReturnValue({
      parse: vi.fn(() => mockDoc),
    });
  });

  describe('HTML processing', () => {
    it('processes HTML content and strips styles', () => {
      importHtml.createDocFromHTML.mockReturnValue(mockDoc);

      const result = processContent({
        content: '<p style="color: red;">Test</p>',
        type: 'html',
        schema: mockSchema,
        editor: mockEditor,
      });

      expect(importHtml.createDocFromHTML).toHaveBeenCalledWith('<p style="color: red;">Test</p>', mockSchema, {
        isImport: true,
      });
      expect(result).toBeDefined();
    });

    it('adds list attributes for HTML with lists', () => {
      const listDoc = {
        toJSON: () => ({
          type: 'doc',
          content: [
            {
              type: 'bulletList',
              content: [
                {
                  type: 'listItem',
                  content: [{ type: 'paragraph', content: [] }],
                },
              ],
            },
          ],
        }),
      };

      importHtml.createDocFromHTML.mockReturnValue(listDoc);

      processContent({
        content: '<ul><li>Item</li></ul>',
        type: 'html',
        schema: mockSchema,
        editor: mockEditor,
      });

      expect(listHelpers.ListHelpers.getNewListId).toHaveBeenCalled();
      expect(listHelpers.ListHelpers.generateNewListDefinition).toHaveBeenCalled();
    });
  });

  describe('Markdown processing', () => {
    it('processes markdown content', () => {
      importMarkdown.createDocFromMarkdown.mockReturnValue(mockDoc);

      const result = processContent({
        content: '# Heading\n\nParagraph',
        type: 'markdown',
        schema: mockSchema,
        editor: mockEditor,
      });

      expect(importMarkdown.createDocFromMarkdown).toHaveBeenCalledWith('# Heading\n\nParagraph', mockSchema, {
        isImport: true,
      });
      expect(result).toBeDefined();
    });
  });

  describe('Text processing', () => {
    it('processes plain text content', () => {
      const result = processContent({
        content: 'Plain text',
        type: 'text',
        schema: mockSchema,
        editor: mockEditor,
      });

      // Now it creates a proper paragraph element with import marker
      expect(DOMParser.fromSchema).toHaveBeenCalledWith(mockSchema);
      expect(result).toBe(mockDoc);

      // Verify that parse was called with a wrapper element
      const parser = DOMParser.fromSchema();
      expect(parser.parse).toHaveBeenCalled();
      const callArg = parser.parse.mock.calls[0][0];
      expect(callArg.dataset.superdocImport).toBe('true');
      expect(callArg.querySelector('p').textContent).toBe('Plain text');
    });
  });

  describe('Schema processing', () => {
    it('processes schema JSON content', () => {
      const schemaContent = { type: 'doc', content: [] };

      const result = processContent({
        content: schemaContent,
        type: 'schema',
        schema: mockSchema,
        editor: mockEditor,
      });

      expect(mockSchema.nodeFromJSON).toHaveBeenCalledWith(schemaContent);
      expect(result).toBe(mockDoc);
    });
  });

  describe('Error handling', () => {
    it('throws error for unknown content type', () => {
      expect(() => {
        processContent({
          content: 'test',
          type: 'invalid',
          schema: mockSchema,
          editor: mockEditor,
        });
      }).toThrow('Unknown content type: invalid');
    });
  });

  describe('List processing', () => {
    it('adds bullet list attributes correctly', () => {
      const bulletListDoc = {
        toJSON: () => ({
          type: 'doc',
          content: [
            {
              type: 'bulletList',
              content: [
                { type: 'listItem', content: [] },
                { type: 'listItem', content: [] },
              ],
            },
          ],
        }),
      };

      importHtml.createDocFromHTML.mockReturnValue(bulletListDoc);
      mockSchema.nodeFromJSON.mockImplementation((json) => {
        // Verify list attributes were added
        expect(json.content[0].attrs.listId).toBe(123);
        expect(json.content[0].attrs['list-style-type']).toBe('bullet');
        expect(json.content[0].content[0].attrs.lvlText).toBe('•');
        expect(json.content[0].content[0].attrs.listNumberingType).toBe('bullet');
        return mockDoc;
      });

      processContent({
        content: '<ul><li>A</li><li>B</li></ul>',
        type: 'html',
        schema: mockSchema,
        editor: mockEditor,
      });
    });

    it('adds ordered list attributes correctly', () => {
      const orderedListDoc = {
        toJSON: () => ({
          type: 'doc',
          content: [
            {
              type: 'orderedList',
              content: [{ type: 'listItem', content: [] }],
            },
          ],
        }),
      };

      importHtml.createDocFromHTML.mockReturnValue(orderedListDoc);
      mockSchema.nodeFromJSON.mockImplementation((json) => {
        expect(json.content[0].attrs['list-style-type']).toBe('decimal');
        expect(json.content[0].attrs.order).toBe(1);
        expect(json.content[0].content[0].attrs.lvlText).toBe('%1.');
        return mockDoc;
      });

      processContent({
        content: '<ol><li>First</li></ol>',
        type: 'html',
        schema: mockSchema,
        editor: mockEditor,
      });
    });

    it('handles nested lists correctly', () => {
      const nestedListDoc = {
        toJSON: () => ({
          type: 'doc',
          content: [
            {
              type: 'bulletList',
              content: [
                {
                  type: 'listItem',
                  content: [
                    {
                      type: 'bulletList',
                      content: [{ type: 'listItem', content: [] }],
                    },
                  ],
                },
              ],
            },
          ],
        }),
      };

      importHtml.createDocFromHTML.mockReturnValue(nestedListDoc);

      processContent({
        content: '<ul><li>Parent<ul><li>Nested</li></ul></li></ul>',
        type: 'html',
        schema: mockSchema,
        editor: mockEditor,
      });

      // Should generate IDs for both parent and nested lists
      expect(listHelpers.ListHelpers.getNewListId).toHaveBeenCalledTimes(2);
    });
  });
});
