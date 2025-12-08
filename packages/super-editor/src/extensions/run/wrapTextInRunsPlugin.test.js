import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Schema } from 'prosemirror-model';
import { EditorState, TextSelection } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { wrapTextInRunsPlugin } from './wrapTextInRunsPlugin.js';

const makeSchema = () =>
  new Schema({
    nodes: {
      doc: { content: 'block+' },
      paragraph: {
        group: 'block',
        content: 'inline*',
        toDOM: () => ['p', 0],
      },
      run: { inline: true, group: 'inline', content: 'inline*', toDOM: () => ['span', { 'data-run': '1' }, 0] },
      text: { group: 'inline' },
    },
    marks: {},
  });

const paragraphDoc = (schema) => schema.node('doc', null, [schema.node('paragraph')]);

describe('wrapTextInRunsPlugin', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  const createView = (schema, doc) =>
    new EditorView(container, {
      state: EditorState.create({
        schema,
        doc,
        plugins: [wrapTextInRunsPlugin()],
      }),
      dispatchTransaction(tr) {
        const state = this.state.apply(tr);
        this.updateState(state);
      },
    });

  it('wraps text inserted via transactions (e.g. composition) inside runs', () => {
    const schema = makeSchema();
    const view = createView(schema, paragraphDoc(schema));

    const tr = view.state.tr.setSelection(TextSelection.create(view.state.doc, 1)).insertText('こんにちは');
    view.dispatch(tr);

    const paragraph = view.state.doc.firstChild;
    expect(paragraph.firstChild.type.name).toBe('run');
    expect(paragraph.textContent).toBe('こんにちは');
  });

  it('wraps composition text as soon as composition ends without extra typing', async () => {
    const schema = makeSchema();
    const view = createView(schema, paragraphDoc(schema));

    // Simulate composition insert while composing
    const composingSpy = vi.spyOn(view, 'composing', 'get').mockReturnValue(true);
    const tr = view.state.tr.setSelection(TextSelection.create(view.state.doc, 1)).insertText('あ');
    view.dispatch(tr);

    // Text is still bare while composing
    expect(view.state.doc.firstChild.firstChild.type.name).toBe('text');

    // Finish composition; plugin flushes on compositionend
    composingSpy.mockReturnValue(false);
    const event = new CompositionEvent('compositionend', { data: 'あ', bubbles: true });
    view.dom.dispatchEvent(event);

    await Promise.resolve();

    composingSpy.mockRestore();

    const paragraph = view.state.doc.firstChild;
    expect(paragraph.firstChild.type.name).toBe('run');
    expect(paragraph.textContent).toBe('あ');
  });
});
