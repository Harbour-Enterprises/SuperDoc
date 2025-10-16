import { describe, it, expect, vi } from 'vitest';
import { Schema } from 'prosemirror-model';
import { EditorState, TextSelection } from 'prosemirror-state';
import {
  aiFindContent,
  aiFindContents,
  aiFindAndSelect,
  aiChange,
  aiGenerateContent,
  aiRewriteSelection,
} from './ai-commands.js';

const createEditor = (content, selection = { from: 1, to: 1 }) => {
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
  const state = EditorState.create({
    schema,
    doc,
    selection: TextSelection.create(doc, selection.from, selection.to),
  });

  const chainMock = {
    deleteSelection: vi.fn().mockReturnThis(),
    insertContent: vi.fn().mockReturnThis(),
    run: vi.fn().mockReturnThis(),
  };

  const editor = {
    state,
    view: { dispatch: vi.fn() },
    emit: vi.fn(),
    options: {
      user: { name: 'Test User', email: 'test@example.com' },
    },
    commands: {
      search: vi.fn(),
      goToSearchResult: vi.fn(),
      insertContent: vi.fn(),
      deleteSelection: vi.fn(),
      enableTrackChanges: vi.fn(),
      disableTrackChanges: vi.fn(),
      insertComment: vi.fn(),
    },
    chain: vi.fn(() => chainMock),
    _chainMock: chainMock,
  };

  return { editor, schema };
};

describe('AI Commands', () => {
  describe('aiFindContent', () => {
    it('finds and returns content using provider', async () => {
      const { editor } = createEditor('Hello world');
      const provider = { findContent: vi.fn().mockResolvedValue('world') };

      const result = await aiFindContent(editor, 'find world', provider);

      expect(editor.emit).toHaveBeenCalledWith('ai:command:start', {
        command: 'find',
        prompt: 'find world',
      });
      expect(provider.findContent).toHaveBeenCalledWith('find world', {
        documentXml: 'Hello world',
      });
      expect(result).toBe('world');
      expect(editor.emit).toHaveBeenCalledWith('ai:command:complete', {
        command: 'find',
        result: 'world',
      });
      expect(editor.commands.search).not.toHaveBeenCalled();
    });

    it('throws when provider missing', async () => {
      const { editor } = createEditor('Hello world');
      await expect(aiFindContent(editor, 'test', null)).rejects.toThrow('AI provider not configured');
    });
  });

  describe('aiFindAndSelect', () => {
    it('selects first match returned by provider', async () => {
      const { editor } = createEditor('Hello world');
      const provider = {
        findContents: vi.fn().mockResolvedValue('world'),
      };
      editor.commands.search.mockReturnValue([{ from: 7, to: 12 }]);

      await aiFindAndSelect(editor, 'find world', provider);

      expect(provider.findContents).toHaveBeenCalledWith('find world', {
        documentXml: 'Hello world',
      });
      expect(editor.commands.search).toHaveBeenCalledWith('world');
      expect(editor.commands.goToSearchResult).toHaveBeenCalledWith({ from: 7, to: 12 });
    });
  });

  describe('aiChange', () => {
    it('replaces text when provider responds with new content', async () => {
      const { editor } = createEditor('Hello world', { from: 7, to: 12 });
      const provider = {
        change: vi.fn().mockResolvedValue({
          originalText: 'world',
          modifiedText: 'universe',
        }),
      };
      editor.commands.search.mockReturnValue([{ from: 7, to: 12 }]);

      const result = await aiChange(editor, { prompt: 'replace world' }, provider);

      expect(result).toMatchObject({
        originalText: 'world',
        modifiedText: 'universe',
        position: { from: 7, to: 12 },
      });
      expect(editor.emit).toHaveBeenCalledWith(
        'ai:command:complete',
        expect.objectContaining({
          command: 'change',
          action: 'replace',
        }),
      );
    });
  });

  describe('aiGenerateContent', () => {
    it('inserts provider result into editor', async () => {
      const { editor } = createEditor('');
      const provider = { write: vi.fn().mockResolvedValue('generated text') };

      await aiGenerateContent(editor, 'prompt', provider);

      expect(provider.write).toHaveBeenCalledWith('prompt', { documentXml: '' });
      expect(editor.commands.insertContent).toHaveBeenCalledWith('generated text');
    });
  });

  describe('aiRewriteSelection', () => {
    it('throws when selection empty', async () => {
      const { editor } = createEditor('text', { from: 1, to: 1 });
      const provider = { rewrite: vi.fn() };
      await expect(aiRewriteSelection(editor, 'instructions', provider)).rejects.toThrow('No text selected');
    });
  });
});
