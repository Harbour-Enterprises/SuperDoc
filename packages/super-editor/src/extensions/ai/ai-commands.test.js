import { describe, it, expect, vi } from 'vitest';
import { Schema } from 'prosemirror-model';
import { EditorState, TextSelection } from 'prosemirror-state';
import { aiFindContent } from './ai-commands.js';

const createEditor = (content) => {
  const schema = new Schema({
    nodes: {
      doc: { content: 'block+' },
      paragraph: { content: 'inline*', group: 'block' },
      text: { group: 'inline' },
    },
    marks: {},
  });

  const paragraph = schema.nodes.paragraph.create(null, schema.text(content));
  const doc = schema.nodes.doc.create(null, [paragraph]);
  const state = EditorState.create({ schema, doc, selection: TextSelection.create(doc, 1, 1) });

  const editor = {
    state,
    emit: vi.fn(),
    commands: {
      search: vi.fn(),
      goToSearchResult: vi.fn(),
    },
  };

  return { editor };
};

describe('aiFindContent', () => {
  it('selects the matched text within the document', async () => {
    const { editor } = createEditor('Hello world');
    const provider = {
      findContent: vi.fn().mockResolvedValue('world'),
    };

    editor.commands.search.mockReturnValue([{ from: 7, to: 12 }]);

    await aiFindContent(editor, 'find world', provider);

    expect(editor.emit).toHaveBeenCalledWith('ai:command:start', { command: 'find', prompt: 'find world' });
    expect(provider.findContent).toHaveBeenCalledWith('find world', { documentXml: 'Hello world' });
    expect(editor.commands.search).toHaveBeenCalledWith('world');
    expect(editor.commands.goToSearchResult).toHaveBeenCalledWith({ from: 7, to: 12 });
    expect(editor.emit).toHaveBeenCalledWith('ai:command:complete', { command: 'find', result: 'world' });
  });

  it('does nothing when provider yields no result', async () => {
    const { editor } = createEditor('Hello world');
    const provider = {
      findContent: vi.fn().mockResolvedValue(null),
    };

    await aiFindContent(editor, 'find nothing', provider);

    expect(provider.findContent).toHaveBeenCalled();
    expect(editor.commands.search).not.toHaveBeenCalled();
    expect(editor.commands.goToSearchResult).not.toHaveBeenCalled();
  });

  it('skips goToSearchResult when there are no matches', async () => {
    const { editor } = createEditor('Hello world');
    const provider = {
      findContent: vi.fn().mockResolvedValue('missing'),
    };

    editor.commands.search.mockReturnValue([]);

    await aiFindContent(editor, 'find missing', provider);

    expect(editor.commands.search).toHaveBeenCalledWith('missing');
    expect(editor.commands.goToSearchResult).not.toHaveBeenCalled();
  });
});
