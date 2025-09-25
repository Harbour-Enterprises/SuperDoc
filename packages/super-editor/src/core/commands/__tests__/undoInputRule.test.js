import { describe, it, expect, vi } from 'vitest';
import { Schema } from 'prosemirror-model';
import { EditorState, TextSelection, Plugin, PluginKey } from 'prosemirror-state';
import { undoInputRule } from '../undoInputRule.js';

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { content: 'inline*', group: 'block', toDOM: () => ['p', 0], parseDOM: [{ tag: 'p' }] },
    text: { group: 'inline' },
  },
  marks: {
    italic: {
      toDOM: () => ['em', 0],
      parseDOM: [{ tag: 'em' }],
    },
  },
});

const createStateWithPlugin = () => {
  const baseDoc = schema.node('doc', null, [schema.node('paragraph', null, [schema.text('Hello')])]);
  const baseState = EditorState.create({ schema, doc: baseDoc, selection: TextSelection.create(baseDoc, 6) });

  // Simulate input rule that inserted an exclamation mark with italics
  const transform = baseState.tr.insertText('!', 6);
  const italicMark = schema.marks.italic.create();
  transform.addMark(6, 7, italicMark);

  const finalDoc = transform.doc;

  const undoable = {
    transform,
    from: 6,
    to: 7,
    text: '',
  };

  const pluginKey = new PluginKey('test-input-rule');
  const inputRulePlugin = new Plugin({
    key: pluginKey,
    state: {
      init: () => undoable,
      apply: (tr, value) => value,
    },
    isInputRules: true,
  });

  const stateWithPlugin = EditorState.create({
    schema,
    doc: finalDoc,
    selection: TextSelection.create(finalDoc, 7),
    plugins: [inputRulePlugin],
  });

  return { state: stateWithPlugin, pluginKey };
};

describe('undoInputRule', () => {
  it('reverses the last input rule transformation and deletes added text', () => {
    const { state } = createStateWithPlugin();
    const tr = state.tr;
    const proxyState = Object.create(state, {
      tr: {
        get: () => tr,
      },
    });

    const result = undoInputRule()({ state: proxyState, dispatch: () => {} });

    expect(result).toBe(true);
    const newState = state.apply(tr);
    expect(newState.doc.textContent).toBe('Hello');
  });

  it('returns false when no input rule metadata exists', () => {
    const state = EditorState.create({ schema, doc: schema.node('doc', null, [schema.node('paragraph')]) });

    const result = undoInputRule()({ state });

    expect(result).toBe(false);
  });
});
