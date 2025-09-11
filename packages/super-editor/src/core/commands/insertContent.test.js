import { describe, it, expect, vi, beforeEach } from 'vitest';
import { insertContent } from './insertContent.js';
import * as contentProcessor from '../helpers/contentProcessor.js';

vi.mock('../helpers/contentProcessor.js');

describe('insertContent', () => {
  let mockCommands, mockState, mockEditor, mockTr;

  beforeEach(() => {
    vi.clearAllMocks();

    mockTr = {
      selection: { from: 0, to: 10 },
    };

    mockCommands = {
      insertContentAt: vi.fn(() => true),
    };

    mockState = {
      schema: { nodes: {} },
    };

    mockEditor = {
      schema: mockState.schema,
    };
  });

  it('uses original behavior when contentType is not specified', () => {
    const command = insertContent('test content', {});

    command({ tr: mockTr, state: mockState, commands: mockCommands, editor: mockEditor });

    expect(mockCommands.insertContentAt).toHaveBeenCalledWith({ from: 0, to: 10 }, 'test content', {});
    expect(contentProcessor.processContent).not.toHaveBeenCalled();
  });

  it('uses content processor when contentType is specified', () => {
    const mockDoc = {
      toJSON: vi.fn(() => ({ type: 'doc', content: [] })),
    };

    contentProcessor.processContent.mockReturnValue(mockDoc);

    const command = insertContent('<p>HTML</p>', { contentType: 'html' });

    command({ tr: mockTr, state: mockState, commands: mockCommands, editor: mockEditor });

    expect(contentProcessor.processContent).toHaveBeenCalledWith({
      content: '<p>HTML</p>',
      type: 'html',
      schema: mockState.schema,
      editor: mockEditor,
    });

    expect(mockCommands.insertContentAt).toHaveBeenCalledWith(
      { from: 0, to: 10 },
      { type: 'doc', content: [] },
      { contentType: 'html' },
    );
  });

  it('validates contentType and returns false for invalid types', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const command = insertContent('test', { contentType: 'invalid' });
    const result = command({ tr: mockTr, state: mockState, commands: mockCommands, editor: mockEditor });

    expect(result).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid contentType'));
    expect(mockCommands.insertContentAt).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('handles processing errors gracefully', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    contentProcessor.processContent.mockImplementation(() => {
      throw new Error('Processing failed');
    });

    const command = insertContent('test', { contentType: 'html' });
    const result = command({ tr: mockTr, state: mockState, commands: mockCommands, editor: mockEditor });

    expect(result).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to process html'), expect.any(Error));

    consoleSpy.mockRestore();
  });

  it('processes all valid content types', () => {
    const mockDoc = { toJSON: () => ({}) };
    contentProcessor.processContent.mockReturnValue(mockDoc);

    const validTypes = ['html', 'markdown', 'text', 'schema'];

    validTypes.forEach((type) => {
      const command = insertContent('content', { contentType: type });
      command({ tr: mockTr, state: mockState, commands: mockCommands, editor: mockEditor });

      expect(contentProcessor.processContent).toHaveBeenCalledWith(expect.objectContaining({ type }));
    });

    expect(contentProcessor.processContent).toHaveBeenCalledTimes(4);
  });
});
