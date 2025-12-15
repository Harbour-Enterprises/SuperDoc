import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { EditorState } from 'prosemirror-state';
import { TrackDeleteMarkName } from '../constants.js';
import { findTrackedMarkBetween } from './findTrackedMarkBetween.js';
import { initTestEditor } from '@tests/helpers/helpers.js';

describe('findTrackedMarkBetween', () => {
  let editor;
  let schema;
  let basePlugins;

  const user = { name: 'SuperDoc 1115', email: 'user@superdoc.com' };
  const date = '2025-12-15T14:50:00.000Z';

  beforeEach(() => {
    ({ editor } = initTestEditor({ mode: 'text', content: '<p></p>' }));
    schema = editor.schema;
    basePlugins = editor.state.plugins;
  });

  afterEach(() => {
    editor?.destroy();
    editor = null;
  });

  const createState = (doc) =>
    EditorState.create({
      schema,
      doc,
      plugins: basePlugins,
    });

  it('finds mark in run node at end position when nodesBetween does not include it', () => {
    const deleteMark = schema.marks[TrackDeleteMarkName].create({
      id: '90b3b232-e513-43ae-8179-320f5415c258',
      author: user.name,
      authorEmail: user.email,
      date,
    });
    // Create a document structure: paragraph > run("tes") + run(text("t") with trackDelete mark)
    const run1 = schema.nodes.run.create({}, schema.text('tes'));
    const run2 = schema.nodes.run.create({}, schema.text('t', [deleteMark]));
    const paragraph = schema.nodes.paragraph.create({}, [run1, run2]);
    const doc = schema.nodes.doc.create({}, paragraph);

    const state = createState(doc);
    const tr = state.tr;

    // With offset=1 (default), endPos = to + 1 = 6, where run2 starts
    // nodesBetween won't fully include run2, but we should still find it by manually using `nodeAt` at the end of the fn
    const found = findTrackedMarkBetween({
      tr,
      from: 2,
      to: 5,
      markName: TrackDeleteMarkName,
      attrs: { authorEmail: user.email },
    });

    expect(found).toEqual(
      expect.objectContaining({
        mark: expect.objectContaining({
          attrs: expect.objectContaining({
            id: '90b3b232-e513-43ae-8179-320f5415c258',
            authorEmail: user.email,
          }),
        }),
      }),
    );
  });
});
