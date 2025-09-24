import { describe, it, expect } from 'vitest';
import { createDocxTestEditor } from '../../helpers/editor-test-utils.js';
import { __searchTextContent } from '@extensions/search/prosemirror-search-patched.js';
import { prepareCommentsForImport } from '@extensions/comment/comments-helpers.js';
import { EditorState } from 'prosemirror-state';

const SEARCH_TEXT =
  'An\u2002Income\u2002Strategy\u2002Approach to\u2002the\u2002Positive\u2002Theory\u2002of\u2002Accounting';

const buildDocWithCommentNodes = (schema) => {
  const { doc, paragraph, commentRangeStart, commentRangeEnd } = schema.nodes;

  return doc.create(null, [
    paragraph.create(null, [
      commentRangeStart.create({ 'w:id': 'import-1', internal: false }),
      schema.text('An\u2002'),
      commentRangeEnd.create({ 'w:id': 'import-1' }),
      commentRangeStart.create({ 'w:id': 'import-2', internal: false }),
      schema.text('Income\u2002'),
      commentRangeEnd.create({ 'w:id': 'import-2' }),
      schema.text('Strategy\u2002Approach to\u2002the\u2002Positive\u2002Theory\u2002of\u2002Accounting'),
    ]),
  ]);
};

describe('Search command', () => {
  it('finds regex matches with figure spaces in plain text paragraphs', () => {
    const editor = createDocxTestEditor({ isHeadless: true });

    try {
      const { doc, paragraph, run } = editor.schema.nodes;
      const docWithText = doc.create(null, [
        paragraph.create(null, [
          run.create(null, [editor.schema.text('An\u2002')]),
          run.create(null, [editor.schema.text('Income\u2002')]),
          run.create(null, [editor.schema.text('Strategy\u2002')]),
          run.create(null, [editor.schema.text('Approach to\u2002')]),
          run.create(null, [editor.schema.text('the\u2002')]),
          run.create(null, [editor.schema.text('Positive\u2002')]),
          run.create(null, [editor.schema.text('Theory\u2002')]),
          run.create(null, [editor.schema.text('of\u2002')]),
          run.create(null, [editor.schema.text('Accounting')]),
        ]),
      ]);

      const baseState = EditorState.create({
        schema: editor.schema,
        doc: docWithText,
        plugins: editor.state.plugins,
      });
      editor.view.updateState(baseState);

      const pattern =
        /An\u2002Income\u2002Strategy\u2002Approach to\u2002the\u2002Positive\u2002Theory\u2002of\u2002Accounting/gi;

      const paragraphNode = editor.view.state.doc.child(0);
      const textContent = __searchTextContent(paragraphNode);
      expect(textContent).toBe(SEARCH_TEXT);

      const matches = editor.commands.search(pattern);

      expect(matches).toHaveLength(1);
      const [match] = matches;
      expect(match.text).toBe(SEARCH_TEXT);
    } finally {
      editor.destroy();
    }
  });

  it('should find matches when text spans multiple comment range nodes', () => {
    const editor = createDocxTestEditor({ isHeadless: true });

    try {
      const docWithComments = buildDocWithCommentNodes(editor.schema);
      const baseState = EditorState.create({
        schema: editor.schema,
        doc: docWithComments,
        plugins: editor.state.plugins,
      });
      const tr = baseState.tr;
      prepareCommentsForImport(baseState.doc, tr, editor.schema, { comments: [] });
      const preparedState = baseState.apply(tr);
      editor.view.updateState(preparedState);

      const remainingCommentNodes = [];
      editor.view.state.doc.descendants((node) => {
        if (['commentRangeStart', 'commentRangeEnd', 'commentReference'].includes(node.type.name)) {
          remainingCommentNodes.push(node.type.name);
        }
      });
      expect(remainingCommentNodes).toHaveLength(0);

      const docText = editor.view.state.doc.textBetween(0, editor.view.state.doc.content.size);
      expect(docText).toContain('An');

      const matches = editor.commands.search(new RegExp(SEARCH_TEXT, 'gi'));

      expect(matches).toHaveLength(1);
      expect(matches[0]?.text).toBe(SEARCH_TEXT);
    } finally {
      editor.destroy();
    }
  });
});
