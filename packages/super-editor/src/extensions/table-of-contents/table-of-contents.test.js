import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EditorState, TextSelection } from 'prosemirror-state';
import { Schema } from 'prosemirror-model';
import { TableOfContents } from './table-of-contents.js';

describe('TableOfContents Extension', () => {
  let schema;

  beforeEach(() => {
    // Create a minimal schema for testing
    schema = new Schema({
      nodes: {
        doc: {
          content: 'block+',
        },
        paragraph: {
          group: 'block',
          content: 'inline*',
          attrs: {
            paragraphProperties: {
              default: {},
            },
            isTocEntry: { default: false },
          },
          parseDOM: [{ tag: 'p' }],
          toDOM: () => ['p', 0],
        },
        text: {
          group: 'inline',
        },
        tableOfContents: {
          group: 'block',
          content: 'paragraph+',
          attrs: {
            instruction: { default: null },
            sdBlockId: { default: null },
          },
          parseDOM: [{ tag: 'div[data-id="table-of-contents"]' }],
          toDOM: () => ['div', { 'data-id': 'table-of-contents' }, 0],
        },
        documentPartObject: {
          group: 'block',
          content: 'block+',
          attrs: {
            docPartGallery: { default: null },
          },
          parseDOM: [{ tag: 'div[data-doc-part-object]' }],
          toDOM: () => ['div', { 'data-doc-part-object': 'true' }, 0],
        },
        bookmarkStart: {
          group: 'inline',
          inline: true,
          content: 'inline*',
          attrs: {
            name: { default: null },
            id: { default: null },
          },
          parseDOM: [{ tag: 'a' }],
          toDOM: () => ['a', 0],
        },
        tab: {
          group: 'inline',
          inline: true,
          content: 'inline*',
          atom: true,
          attrs: {
            tabSize: { default: null },
          },
          parseDOM: [{ tag: 'span.sd-editor-tab' }],
          toDOM: () => ['span', { class: 'sd-editor-tab' }, 0],
        },
      },
      marks: {
        link: {
          attrs: {
            href: { default: null },
            anchor: { default: null },
          },
          parseDOM: [
            {
              tag: 'a[href]',
              getAttrs: (dom) => ({
                href: dom.getAttribute('href'),
                anchor: dom.getAttribute('data-anchor'),
              }),
            },
          ],
          toDOM: (mark) => ['a', { href: mark.attrs.href }, 0],
        },
      },
    });
  });

  describe('deleteTableOfContents', () => {
    it('should delete standalone tableOfContents node', () => {
      const tocNode = schema.nodes.tableOfContents.create({}, [
        schema.nodes.paragraph.create(
          { paragraphProperties: { styleId: 'TOCHeading' } },
          schema.text('Table of Contents'),
        ),
        schema.nodes.paragraph.create(
          { paragraphProperties: { styleId: 'TOC1' }, isTocEntry: true },
          schema.text('Heading 1'),
        ),
      ]);

      const docNode = schema.nodes.doc.create({}, [
        schema.nodes.paragraph.create({}, schema.text('Before')),
        tocNode,
        schema.nodes.paragraph.create({}, schema.text('After')),
      ]);

      const state = EditorState.create({ schema, doc: docNode });
      const selection = TextSelection.create(docNode, 10); // Inside TOC
      const stateWithSelection = state.apply(state.tr.setSelection(selection));

      // Mock editor
      const editor = {
        view: { state: stateWithSelection },
        presentationEditor: {
          getPages: vi.fn(() => [
            {
              number: 1,
              fragments: [{ pmStart: 0, pmEnd: 50 }],
            },
          ]),
        },
      };

      // Get the command function
      const commandContext = { editor, options: TableOfContents.options };
      const commands = TableOfContents.config.addCommands.call(commandContext);
      const deleteCommand = commands.deleteTableOfContents();

      const dispatch = vi.fn();
      const result = deleteCommand({
        state: stateWithSelection,
        tr: stateWithSelection.tr,
        dispatch,
      });

      expect(result).toBe(true);
      expect(dispatch).toHaveBeenCalledTimes(1);

      const tr = dispatch.mock.calls[0][0];
      expect(tr.steps.length).toBeGreaterThan(0);
      expect(tr.getMeta('forceUpdatePagination')).toBe(true);
    });

    it('should delete documentPartObject wrapping TOC', () => {
      const tocNode = schema.nodes.tableOfContents.create({}, [
        schema.nodes.paragraph.create(
          { paragraphProperties: { styleId: 'TOC1' }, isTocEntry: true },
          schema.text('Entry'),
        ),
      ]);

      const docPartObj = schema.nodes.documentPartObject.create({ docPartGallery: 'Table of Contents' }, [
        schema.nodes.paragraph.create({ styleId: 'TOCHeading' }, schema.text('Table of Contents')),
        tocNode,
      ]);

      const docNode = schema.nodes.doc.create({}, [
        schema.nodes.paragraph.create({}, schema.text('Before')),
        docPartObj,
        schema.nodes.paragraph.create({}, schema.text('After')),
      ]);

      const state = EditorState.create({ schema, doc: docNode });
      const selection = TextSelection.create(docNode, 12); // Inside TOC
      const stateWithSelection = state.apply(state.tr.setSelection(selection));

      const editor = {
        view: { state: stateWithSelection },
        presentationEditor: {
          getPages: vi.fn(() => [
            {
              number: 1,
              fragments: [{ pmStart: 0, pmEnd: 100 }],
            },
          ]),
        },
      };
      const commandContext = { editor, options: TableOfContents.options };
      const commands = TableOfContents.config.addCommands.call(commandContext);
      const deleteCommand = commands.deleteTableOfContents();

      const dispatch = vi.fn();
      const result = deleteCommand({ state: stateWithSelection, tr: stateWithSelection.tr, dispatch });

      expect(result).toBe(true);
      expect(dispatch).toHaveBeenCalledTimes(1);
    });

    it('should return false when cursor is not in TOC', () => {
      const docNode = schema.nodes.doc.create({}, [schema.nodes.paragraph.create({}, schema.text('Just a paragraph'))]);

      const state = EditorState.create({ schema, doc: docNode });
      const selection = TextSelection.create(docNode, 5);
      const stateWithSelection = state.apply(state.tr.setSelection(selection));

      const editor = {
        view: { state: stateWithSelection },
        presentationEditor: {
          getPages: vi.fn(() => [
            {
              number: 1,
              fragments: [{ pmStart: 0, pmEnd: 50 }],
            },
          ]),
        },
      };
      const commandContext = { editor, options: TableOfContents.options };
      const commands = TableOfContents.config.addCommands.call(commandContext);
      const deleteCommand = commands.deleteTableOfContents();

      const dispatch = vi.fn();
      const result = deleteCommand({ state: stateWithSelection, tr: stateWithSelection.tr, dispatch });

      expect(result).toBe(false);
      expect(dispatch).not.toHaveBeenCalled();
    });

    it('should delete TOC at specified position', () => {
      const tocNode = schema.nodes.tableOfContents.create({}, [
        schema.nodes.paragraph.create(
          { paragraphProperties: { styleId: 'TOC1' }, isTocEntry: true },
          schema.text('Entry'),
        ),
      ]);

      const docNode = schema.nodes.doc.create({}, [
        schema.nodes.paragraph.create({}, schema.text('Before')),
        tocNode,
        schema.nodes.paragraph.create({}, schema.text('After')),
      ]);

      const state = EditorState.create({ schema, doc: docNode });

      const editor = {
        view: { state },
        presentationEditor: {
          getPages: vi.fn(() => [
            {
              number: 1,
              fragments: [{ pmStart: 0, pmEnd: 100 }],
            },
          ]),
        },
      };
      const commandContext = { editor, options: TableOfContents.options };
      const commands = TableOfContents.config.addCommands.call(commandContext);
      const deleteCommand = commands.deleteTableOfContents({ pos: 10 });

      const dispatch = vi.fn();
      const result = deleteCommand({ state, tr: state.tr, dispatch });

      expect(result).toBe(true);
      expect(dispatch).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateTableOfContents', () => {
    it('should regenerate TOC entries from document headings', () => {
      const bookmark1 = schema.nodes.bookmarkStart.create({ name: '_Toc123' });
      const bookmark2 = schema.nodes.bookmarkStart.create({ name: '_Toc456' });

      const existingToc = schema.nodes.tableOfContents.create({}, [
        schema.nodes.paragraph.create(
          { paragraphProperties: { styleId: 'TOCHeading' } },
          schema.text('Table of Contents'),
        ),
        schema.nodes.paragraph.create(
          { paragraphProperties: { styleId: 'TOC1' }, isTocEntry: true },
          schema.text('Old Entry'),
        ),
      ]);

      const docNode = schema.nodes.doc.create({}, [
        existingToc,
        schema.nodes.paragraph.create({ paragraphProperties: { styleId: 'Heading1' } }, [
          bookmark1,
          schema.text('Chapter 1'),
        ]),
        schema.nodes.paragraph.create({ paragraphProperties: { styleId: 'Heading2' } }, [
          bookmark2,
          schema.text('Section 1.1'),
        ]),
        schema.nodes.paragraph.create({}, schema.text('Body text')),
      ]);

      const state = EditorState.create({ schema, doc: docNode });
      const selection = TextSelection.create(docNode, 5); // Inside TOC
      const stateWithSelection = state.apply(state.tr.setSelection(selection));

      const editor = {
        view: { state: stateWithSelection },
        presentationEditor: {
          getPages: vi.fn(() => [
            {
              number: 1,
              fragments: [{ pmStart: 0, pmEnd: 100 }],
            },
            {
              number: 2,
              fragments: [{ pmStart: 100, pmEnd: 200 }],
            },
          ]),
        },
      };
      const commandContext = { editor, options: TableOfContents.options };
      const commands = TableOfContents.config.addCommands.call(commandContext);
      const updateCommand = commands.updateTableOfContents();

      const dispatch = vi.fn();
      const result = updateCommand({ state: stateWithSelection, tr: stateWithSelection.tr, dispatch, editor });

      expect(result).toBe(true);
      expect(dispatch).toHaveBeenCalledTimes(1);

      const tr = dispatch.mock.calls[0][0];
      expect(tr.steps.length).toBeGreaterThan(0);
      expect(tr.getMeta('forceUpdatePagination')).toBe(true);
    });

    it('should update TOC inside documentPartObject', () => {
      const bookmark = schema.nodes.bookmarkStart.create({ name: '_Toc789' });

      const tocNode = schema.nodes.tableOfContents.create({}, [
        schema.nodes.paragraph.create(
          { paragraphProperties: { styleId: 'TOC1' }, isTocEntry: true },
          schema.text('Old'),
        ),
      ]);

      const docPartObj = schema.nodes.documentPartObject.create({ docPartGallery: 'Table of Contents' }, [
        tocNode,
        schema.nodes.paragraph.create({ paragraphProperties: { styleId: 'Normal' } }, schema.text('Other')),
      ]);

      const docNode = schema.nodes.doc.create({}, [
        docPartObj,
        schema.nodes.paragraph.create({ paragraphProperties: { styleId: 'Heading1' } }, [bookmark, schema.text('New')]),
      ]);

      const state = EditorState.create({ schema, doc: docNode });
      const selection = TextSelection.create(docNode, 12); // Inside TOC
      const stateWithSelection = state.apply(state.tr.setSelection(selection));

      const editor = {
        view: { state: stateWithSelection },
        presentationEditor: {
          getPages: vi.fn(() => [
            {
              number: 1,
              fragments: [{ pmStart: 0, pmEnd: 100 }],
            },
          ]),
        },
      };
      const commandContext = { editor, options: TableOfContents.options };
      const commands = TableOfContents.config.addCommands.call(commandContext);
      const updateCommand = commands.updateTableOfContents();

      const dispatch = vi.fn();
      const result = updateCommand({ state: stateWithSelection, tr: stateWithSelection.tr, dispatch, editor });

      expect(result).toBe(true);
      expect(dispatch).toHaveBeenCalledTimes(1);
    });

    it('should generate TOC entries with links to bookmarks', () => {
      const bookmark = schema.nodes.bookmarkStart.create({ name: '_Toc100' });

      const existingToc = schema.nodes.tableOfContents.create({}, [
        schema.nodes.paragraph.create({ paragraphProperties: { styleId: 'TOCHeading' } }, schema.text('Contents')),
      ]);

      const docNode = schema.nodes.doc.create({}, [
        existingToc,
        schema.nodes.paragraph.create({ paragraphProperties: { styleId: 'Heading1' } }, [
          bookmark,
          schema.text('Chapter'),
        ]),
      ]);

      const state = EditorState.create({ schema, doc: docNode });
      const selection = TextSelection.create(docNode, 5); // Inside TOC
      const stateWithSelection = state.apply(state.tr.setSelection(selection));

      const editor = {
        view: { state: stateWithSelection },
        presentationEditor: {
          getPages: vi.fn(() => [
            {
              number: 1,
              fragments: [{ pmStart: 0, pmEnd: 100 }],
            },
          ]),
        },
      };
      const commandContext = { editor, options: TableOfContents.options };
      const commands = TableOfContents.config.addCommands.call(commandContext);
      const updateCommand = commands.updateTableOfContents();

      const dispatch = vi.fn();
      updateCommand({ state: stateWithSelection, tr: stateWithSelection.tr, dispatch, editor });

      expect(dispatch).toHaveBeenCalled();
      const tr = dispatch.mock.calls[0][0];
      expect(tr.steps.length).toBeGreaterThan(0);
    });

    it('should handle headings without bookmarks', () => {
      const existingToc = schema.nodes.tableOfContents.create({}, [
        schema.nodes.paragraph.create({ paragraphProperties: { styleId: 'TOCHeading' } }, schema.text('Contents')),
      ]);

      const docNode = schema.nodes.doc.create({}, [
        existingToc,
        schema.nodes.paragraph.create({ paragraphProperties: { styleId: 'Heading1' } }, schema.text('No Bookmark')),
      ]);

      const state = EditorState.create({ schema, doc: docNode });
      const selection = TextSelection.create(docNode, 5);
      const stateWithSelection = state.apply(state.tr.setSelection(selection));

      const editor = {
        view: { state: stateWithSelection },
        presentationEditor: {
          getPages: vi.fn(() => [
            {
              number: 1,
              fragments: [{ pmStart: 0, pmEnd: 100 }],
            },
          ]),
        },
      };
      const commandContext = { editor, options: TableOfContents.options };
      const commands = TableOfContents.config.addCommands.call(commandContext);
      const updateCommand = commands.updateTableOfContents();

      const dispatch = vi.fn();
      const result = updateCommand({ state: stateWithSelection, tr: stateWithSelection.tr, dispatch, editor });

      expect(result).toBe(true);
      expect(dispatch).toHaveBeenCalled();
    });

    it('should return false when not in TOC', () => {
      const docNode = schema.nodes.doc.create({}, [schema.nodes.paragraph.create({}, schema.text('No TOC here'))]);

      const state = EditorState.create({ schema, doc: docNode });
      const selection = TextSelection.create(docNode, 5); // Inside TOC
      const stateWithSelection = state.apply(state.tr.setSelection(selection));

      const editor = {
        view: { state: stateWithSelection },
        presentationEditor: {
          getPages: vi.fn(() => [
            {
              number: 1,
              fragments: [{ pmStart: 0, pmEnd: 50 }],
            },
            {
              number: 2,
              fragments: [{ pmStart: 50, pmEnd: 100 }],
            },
            {
              number: 3,
              fragments: [{ pmStart: 100, pmEnd: 150 }],
            },
          ]),
        },
      };
      const commandContext = { editor, options: TableOfContents.options };
      const commands = TableOfContents.config.addCommands.call(commandContext);
      const updateCommand = commands.updateTableOfContents();

      const dispatch = vi.fn();
      const result = updateCommand({ state: stateWithSelection, tr: stateWithSelection.tr, dispatch, editor });

      expect(result).toBe(false);
      expect(dispatch).not.toHaveBeenCalled();
    });

    it('should update TOC at specified position', () => {
      const existingToc = schema.nodes.tableOfContents.create({}, [
        schema.nodes.paragraph.create(
          { paragraphProperties: { styleId: 'TOC1' }, isTocEntry: true },
          schema.text('Old'),
        ),
      ]);

      const docNode = schema.nodes.doc.create({}, [
        schema.nodes.paragraph.create({}, schema.text('Before')),
        existingToc,
        schema.nodes.paragraph.create({ paragraphProperties: { styleId: 'Heading1' } }, schema.text('New Heading')),
      ]);

      const state = EditorState.create({ schema, doc: docNode });

      const editor = {
        view: { state },
        presentationEditor: {
          getPages: vi.fn(() => [
            {
              number: 1,
              fragments: [{ pmStart: 0, pmEnd: 100 }],
            },
          ]),
        },
      };
      const commandContext = { editor, options: TableOfContents.options };
      const commands = TableOfContents.config.addCommands.call(commandContext);
      const updateCommand = commands.updateTableOfContents({ pos: 10 });

      const dispatch = vi.fn();
      const result = updateCommand({ state, tr: state.tr, dispatch, editor });

      expect(result).toBe(true);
      expect(dispatch).toHaveBeenCalled();
    });

    it('should handle multiple heading levels correctly', () => {
      const existingToc = schema.nodes.tableOfContents.create({}, [
        schema.nodes.paragraph.create({ paragraphProperties: { styleId: 'TOCHeading' } }, schema.text('Contents')),
      ]);

      const docNode = schema.nodes.doc.create({}, [
        existingToc,
        schema.nodes.paragraph.create({ paragraphProperties: { styleId: 'Heading1' } }, schema.text('Chapter 1')),
        schema.nodes.paragraph.create({ paragraphProperties: { styleId: 'Heading2' } }, schema.text('Section 1.1')),
        schema.nodes.paragraph.create(
          { paragraphProperties: { styleId: 'Heading3' } },
          schema.text('Subsection 1.1.1'),
        ),
        schema.nodes.paragraph.create({ paragraphProperties: { styleId: 'Heading1' } }, schema.text('Chapter 2')),
      ]);

      const state = EditorState.create({ schema, doc: docNode });
      const selection = TextSelection.create(docNode, 5);
      const stateWithSelection = state.apply(state.tr.setSelection(selection));

      const editor = {
        view: { state: stateWithSelection },
        presentationEditor: {
          getPages: vi.fn(() => [
            {
              number: 1,
              fragments: [{ pmStart: 0, pmEnd: 50 }],
            },
            {
              number: 2,
              fragments: [{ pmStart: 50, pmEnd: 100 }],
            },
            {
              number: 3,
              fragments: [{ pmStart: 100, pmEnd: 150 }],
            },
          ]),
        },
      };
      const commandContext = { editor, options: TableOfContents.options };
      const commands = TableOfContents.config.addCommands.call(commandContext);
      const updateCommand = commands.updateTableOfContents();

      const dispatch = vi.fn();
      const result = updateCommand({ state: stateWithSelection, tr: stateWithSelection.tr, dispatch, editor });

      expect(result).toBe(true);
      expect(dispatch).toHaveBeenCalled();
    });

    it('should assign correct page numbers from layout engine', () => {
      const bookmark1 = schema.nodes.bookmarkStart.create({ name: '_Toc1' });
      const bookmark2 = schema.nodes.bookmarkStart.create({ name: '_Toc2' });
      const bookmark3 = schema.nodes.bookmarkStart.create({ name: '_Toc3' });

      const existingToc = schema.nodes.tableOfContents.create({}, [
        schema.nodes.paragraph.create({ paragraphProperties: { styleId: 'TOCHeading' } }, schema.text('Contents')),
      ]);

      const docNode = schema.nodes.doc.create({}, [
        existingToc,
        schema.nodes.paragraph.create({ paragraphProperties: { styleId: 'Heading1' } }, [
          bookmark1,
          schema.text('First'),
        ]),
        schema.nodes.paragraph.create({ paragraphProperties: { styleId: 'Heading1' } }, [
          bookmark2,
          schema.text('Second'),
        ]),
        schema.nodes.paragraph.create({ paragraphProperties: { styleId: 'Heading1' } }, [
          bookmark3,
          schema.text('Third'),
        ]),
      ]);

      const state = EditorState.create({ schema, doc: docNode });
      const selection = TextSelection.create(docNode, 5);
      const stateWithSelection = state.apply(state.tr.setSelection(selection));

      // Mock layout engine with headings on different pages
      // Document structure: TOC (0-10), First (12-20), Second (21-30), Third (31-40)
      const editor = {
        view: { state: stateWithSelection },
        presentationEditor: {
          getPages: vi.fn(() => [
            {
              number: 1,
              fragments: [{ pmStart: 0, pmEnd: 20 }], // TOC and first heading
            },
            {
              number: 2,
              fragments: [{ pmStart: 21, pmEnd: 30 }], // Second heading
            },
            {
              number: 3,
              fragments: [{ pmStart: 31, pmEnd: 100 }], // Third heading
            },
          ]),
        },
      };
      const commandContext = { editor, options: TableOfContents.options };
      const commands = TableOfContents.config.addCommands.call(commandContext);
      const updateCommand = commands.updateTableOfContents();

      const dispatch = vi.fn();
      const result = updateCommand({ state: stateWithSelection, tr: stateWithSelection.tr, dispatch, editor });

      expect(result).toBe(true);
      expect(dispatch).toHaveBeenCalled();

      const tr = dispatch.mock.calls[0][0];
      const updatedDoc = tr.doc;

      // Find the updated TOC node
      let tocNode = null;
      updatedDoc.descendants((node) => {
        if (node.type.name === 'tableOfContents' && !tocNode) {
          tocNode = node;
          return false;
        }
      });

      expect(tocNode).toBeTruthy();

      // Debug: log the TOC node structure
      // Check that TOC entries have the correct page numbers
      const tocEntries = [];
      tocNode.descendants((node) => {
        if (node.type.name === 'paragraph' && node.attrs?.isTocEntry) {
          tocEntries.push(node.textContent);
        }
      });

      // Should have 3 TOC entries (one for each heading)
      expect(tocEntries).toHaveLength(3);

      // Page numbers should be at the end of each entry after the tab
      expect(tocEntries[0]).toBeDefined();
      expect(tocEntries[0]).toContain('First');
      expect(tocEntries[0]).toContain('1'); // First heading is on page 1

      expect(tocEntries[1]).toBeDefined();
      expect(tocEntries[1]).toContain('Second');
      expect(tocEntries[1]).toContain('2'); // Second heading is on page 2

      expect(tocEntries[2]).toBeDefined();
      expect(tocEntries[2]).toContain('Third');
      expect(tocEntries[2]).toContain('3'); // Third heading is on page 3
    });
  });
});
