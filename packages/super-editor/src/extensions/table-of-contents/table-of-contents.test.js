import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EditorState, TextSelection } from 'prosemirror-state';
import { Schema } from 'prosemirror-model';
import { TableOfContents } from './table-of-contents.js';

// Mock pagination plugin
vi.mock('@extensions/pagination/pagination-helpers.js', () => ({
  PaginationPluginKey: {
    getState: vi.fn(() => ({
      isEnabled: true,
      decorations: {
        find: vi.fn(() => [{ from: 0 }, { from: 100 }, { from: 200 }]),
      },
    })),
  },
}));

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
            styleId: { default: null },
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
        schema.nodes.paragraph.create({ styleId: 'TOCHeading' }, schema.text('Table of Contents')),
        schema.nodes.paragraph.create({ styleId: 'TOC1', isTocEntry: true }, schema.text('Heading 1')),
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
        schema.nodes.paragraph.create({ styleId: 'TOC1', isTocEntry: true }, schema.text('Entry')),
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

      const editor = { view: { state: stateWithSelection } };
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

      const editor = { view: { state: stateWithSelection } };
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
        schema.nodes.paragraph.create({ styleId: 'TOC1', isTocEntry: true }, schema.text('Entry')),
      ]);

      const docNode = schema.nodes.doc.create({}, [
        schema.nodes.paragraph.create({}, schema.text('Before')),
        tocNode,
        schema.nodes.paragraph.create({}, schema.text('After')),
      ]);

      const state = EditorState.create({ schema, doc: docNode });

      const editor = { view: { state } };
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
        schema.nodes.paragraph.create({ styleId: 'TOCHeading' }, schema.text('Table of Contents')),
        schema.nodes.paragraph.create({ styleId: 'TOC1', isTocEntry: true }, schema.text('Old Entry')),
      ]);

      const docNode = schema.nodes.doc.create({}, [
        existingToc,
        schema.nodes.paragraph.create({ styleId: 'Heading1' }, [bookmark1, schema.text('Chapter 1')]),
        schema.nodes.paragraph.create({ styleId: 'Heading2' }, [bookmark2, schema.text('Section 1.1')]),
        schema.nodes.paragraph.create({}, schema.text('Body text')),
      ]);

      const state = EditorState.create({ schema, doc: docNode });
      const selection = TextSelection.create(docNode, 5); // Inside TOC
      const stateWithSelection = state.apply(state.tr.setSelection(selection));

      const editor = { view: { state: stateWithSelection } };
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
        schema.nodes.paragraph.create({ styleId: 'TOC1', isTocEntry: true }, schema.text('Old')),
      ]);

      const docPartObj = schema.nodes.documentPartObject.create({ docPartGallery: 'Table of Contents' }, [
        schema.nodes.paragraph.create({ styleId: 'TOCHeading' }, schema.text('Table of Contents')),
        tocNode,
      ]);

      const docNode = schema.nodes.doc.create({}, [
        docPartObj,
        schema.nodes.paragraph.create({ styleId: 'Heading1' }, [bookmark, schema.text('New Heading')]),
      ]);

      const state = EditorState.create({ schema, doc: docNode });
      const selection = TextSelection.create(docNode, 15); // Inside TOC
      const stateWithSelection = state.apply(state.tr.setSelection(selection));

      const editor = { view: { state: stateWithSelection } };
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
        schema.nodes.paragraph.create({ styleId: 'TOCHeading' }, schema.text('Contents')),
      ]);

      const docNode = schema.nodes.doc.create({}, [
        existingToc,
        schema.nodes.paragraph.create({ styleId: 'Heading1' }, [bookmark, schema.text('Introduction')]),
      ]);

      const state = EditorState.create({ schema, doc: docNode });
      const selection = TextSelection.create(docNode, 5);
      const stateWithSelection = state.apply(state.tr.setSelection(selection));

      const editor = { view: { state: stateWithSelection } };
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
        schema.nodes.paragraph.create({ styleId: 'TOCHeading' }, schema.text('Contents')),
      ]);

      const docNode = schema.nodes.doc.create({}, [
        existingToc,
        schema.nodes.paragraph.create({ styleId: 'Heading1' }, schema.text('No Bookmark')),
      ]);

      const state = EditorState.create({ schema, doc: docNode });
      const selection = TextSelection.create(docNode, 5);
      const stateWithSelection = state.apply(state.tr.setSelection(selection));

      const editor = { view: { state: stateWithSelection } };
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
      const selection = TextSelection.create(docNode, 5);
      const stateWithSelection = state.apply(state.tr.setSelection(selection));

      const editor = { view: { state: stateWithSelection } };
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
        schema.nodes.paragraph.create({ styleId: 'TOC1', isTocEntry: true }, schema.text('Old')),
      ]);

      const docNode = schema.nodes.doc.create({}, [
        schema.nodes.paragraph.create({}, schema.text('Before')),
        existingToc,
        schema.nodes.paragraph.create({ styleId: 'Heading1' }, schema.text('New Heading')),
      ]);

      const state = EditorState.create({ schema, doc: docNode });

      const editor = { view: { state } };
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
        schema.nodes.paragraph.create({ styleId: 'TOCHeading' }, schema.text('Contents')),
      ]);

      const docNode = schema.nodes.doc.create({}, [
        existingToc,
        schema.nodes.paragraph.create({ styleId: 'Heading1' }, schema.text('Chapter 1')),
        schema.nodes.paragraph.create({ styleId: 'Heading2' }, schema.text('Section 1.1')),
        schema.nodes.paragraph.create({ styleId: 'Heading3' }, schema.text('Subsection 1.1.1')),
        schema.nodes.paragraph.create({ styleId: 'Heading1' }, schema.text('Chapter 2')),
      ]);

      const state = EditorState.create({ schema, doc: docNode });
      const selection = TextSelection.create(docNode, 5);
      const stateWithSelection = state.apply(state.tr.setSelection(selection));

      const editor = { view: { state: stateWithSelection } };
      const commandContext = { editor, options: TableOfContents.options };
      const commands = TableOfContents.config.addCommands.call(commandContext);
      const updateCommand = commands.updateTableOfContents();

      const dispatch = vi.fn();
      const result = updateCommand({ state: stateWithSelection, tr: stateWithSelection.tr, dispatch, editor });

      expect(result).toBe(true);
      expect(dispatch).toHaveBeenCalled();
    });
  });
});
