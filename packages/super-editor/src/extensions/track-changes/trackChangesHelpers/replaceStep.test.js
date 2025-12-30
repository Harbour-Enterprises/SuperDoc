import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { EditorState, TextSelection } from 'prosemirror-state';
import { trackedTransaction, documentHelpers } from './index.js';
import { TrackInsertMarkName, TrackDeleteMarkName } from '../constants.js';
import { TrackChangesBasePluginKey } from '../plugins/trackChangesBasePlugin.js';
import { initTestEditor } from '@tests/helpers/helpers.js';

describe('trackChangesHelpers replaceStep', () => {
  let editor;
  let schema;
  let basePlugins;

  const user = { name: 'Track Tester', email: 'track@example.com' };

  beforeEach(() => {
    ({ editor } = initTestEditor({ mode: 'text', content: '<p></p>' }));
    schema = editor.schema;
    basePlugins = editor.state.plugins;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    editor?.destroy();
    editor = null;
  });

  const createState = (doc) =>
    EditorState.create({
      schema,
      doc,
      plugins: basePlugins,
    });

  const findTextPos = (docNode, exactText) => {
    let found = null;
    docNode.descendants((node, pos) => {
      if (found) return false;
      if (!node.isText) return;
      if (node.text !== exactText) return;
      found = pos;
    });
    return found;
  };

  it('tracks replace even when selection contains existing deletions and links', () => {
    const linkMark = schema.marks.link.create({ href: 'https://example.com' });
    const existingDeletion = schema.marks[TrackDeleteMarkName].create({
      id: 'del-existing',
      author: user.name,
      authorEmail: user.email,
      date: '2024-01-01T00:00:00.000Z',
    });

    const run = schema.nodes.run.create({}, [
      schema.text('Start'),
      schema.text('Del', [existingDeletion]),
      schema.text('Link', [linkMark]),
      schema.text('Tail'),
    ]);
    const doc = schema.nodes.doc.create({}, schema.nodes.paragraph.create({}, run));
    let state = createState(doc);

    const startPos = findTextPos(state.doc, 'Start');
    const linkPos = findTextPos(state.doc, 'Link');
    expect(startPos).toBeTypeOf('number');
    expect(linkPos).toBeTypeOf('number');

    const from = startPos;
    const to = linkPos + 'Link'.length;
    state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, from, to)));

    const tr = state.tr.replaceWith(from, to, schema.text('X'));
    tr.setMeta('inputType', 'insertText');

    const tracked = trackedTransaction({ tr, state, user });
    const meta = tracked.getMeta(TrackChangesBasePluginKey);

    expect(meta?.insertedMark).toBeDefined();
    expect(meta?.deletionMark).toBeDefined();
    expect(meta.insertedMark.attrs.id).toBe(meta.deletionMark.attrs.id);

    const finalState = state.apply(tracked);
    const inlineNodes = documentHelpers.findInlineNodes(finalState.doc);
    expect(inlineNodes.some(({ node }) => node.marks.some((mark) => mark.type.name === TrackInsertMarkName))).toBe(
      true,
    );
    expect(inlineNodes.some(({ node }) => node.marks.some((mark) => mark.type.name === TrackDeleteMarkName))).toBe(
      true,
    );
  });
});
