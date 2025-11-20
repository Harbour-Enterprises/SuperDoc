import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIActions } from './ai-actions';
import type { AIProvider, AIActionsOptions, SuperDoc, Editor } from './types';

describe('AIActions', () => {
  let mockProvider: AIProvider;
  let mockEditor: Editor;
  let mockSuperdoc: SuperDoc;

  beforeEach(() => {
    mockProvider = {
      async *streamCompletion(_messages, _options) {
        yield 'chunk1';
        yield 'chunk2';
        yield 'chunk3';
      },
      async getCompletion(_messages, _options) {
        return 'Complete response';
      },
    };

    const mockDoc = {
      textContent: 'Sample document text',
      content: { size: 100 },
      textBetween: vi.fn((from: number, to: number, _separator?: string) => {
        // Simple mock: return a substring based on positions
        const text = 'Sample document text';
        return text.substring(Math.max(0, from), Math.min(text.length, to));
      }),
      resolve: vi.fn((pos) => ({
        pos,
        parent: { inlineContent: true },
        min: vi.fn(() => pos),
        max: vi.fn(() => pos),
      })),
    };

    mockEditor = {
      state: {
        doc: mockDoc,
        tr: {
          setSelection: vi.fn().mockReturnThis(),
          scrollIntoView: vi.fn().mockReturnThis(),
        },
      },
      view: {
        state: {
          doc: mockDoc,
          selection: {
            from: 0,
            to: 0,
            empty: true,
          },
        },
        dispatch: vi.fn(),
      },
      exportDocx: vi.fn(),
      options: {
        documentId: 'doc-123',
        user: { name: 'Test User', image: '' },
      },
      commands: {
        search: vi.fn().mockReturnValue([]),
        setTextSelection: vi.fn(),
        setHighlight: vi.fn(),
        deleteSelection: vi.fn(),
        insertContent: vi.fn(),
        getSelectionMarks: vi.fn().mockReturnValue([]),
        enableTrackChanges: vi.fn(),
        disableTrackChanges: vi.fn(),
        insertComment: vi.fn(),
        insertContentAt: vi.fn(),
      },
      setOptions: vi.fn(),
    } as unknown as Editor;

    mockSuperdoc = {
      activeEditor: mockEditor,
    } as unknown as SuperDoc;
  });

  describe('constructor', () => {
    it('should initialize with provider config', async () => {
      const _options: AIActionsOptions = {
        user: { displayName: 'AI Bot' },
        provider: mockProvider,
      };

      const ai = new AIActions(mockSuperdoc, _options);
      await ai.waitUntilReady();

      expect(ai.getIsReady()).toBe(true);
    });

    it('should call onReady callback when initialized', async () => {
      const onReady = vi.fn();
      const _options: AIActionsOptions = {
        user: { displayName: 'AI Bot' },
        provider: mockProvider,
        onReady,
      };

      const ai = new AIActions(mockSuperdoc, _options);
      await ai.waitUntilReady();

      expect(onReady).toHaveBeenCalledWith(
        expect.objectContaining({
          aiActions: expect.any(Object),
        }),
      );
    });

    it('should use custom system prompt if provided', async () => {
      const _options: AIActionsOptions = {
        user: { displayName: 'AI Bot' },
        provider: mockProvider,
        systemPrompt: 'Custom system prompt',
      };

      const ai = new AIActions(mockSuperdoc, _options);
      await ai.waitUntilReady();

      // Call a method that uses the provider to verify the prompt
      const completionSpy = vi.spyOn(mockProvider, 'getCompletion');
      await ai.getCompletion('test');

      expect(completionSpy).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            role: 'system',
            content: 'Custom system prompt',
          }),
        ]),
        undefined,
      );
    });

    it('should use default system prompt if not provided', async () => {
      const _options: AIActionsOptions = {
        user: { displayName: 'AI Bot' },
        provider: mockProvider,
      };

      const ai = new AIActions(mockSuperdoc, _options);
      await ai.waitUntilReady();

      const completionSpy = vi.spyOn(mockProvider, 'getCompletion');
      await ai.getCompletion('test');

      expect(completionSpy).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            role: 'system',
            content: expect.stringContaining('SuperDoc'),
          }),
        ]),
        undefined,
      );
    });
  });

  describe('waitUntilReady', () => {
    it('should resolve immediately if already ready', async () => {
      const _options: AIActionsOptions = {
        user: { displayName: 'AI Bot' },
        provider: mockProvider,
      };

      const ai = new AIActions(mockSuperdoc, _options);
      await ai.waitUntilReady();

      const start = Date.now();
      await ai.waitUntilReady();
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(10);
    });

    it('should wait for initialization if not ready', async () => {
      const _options: AIActionsOptions = {
        user: { displayName: 'AI Bot' },
        provider: mockProvider,
      };

      const ai = new AIActions(mockSuperdoc, _options);

      // Should wait for initialization
      await ai.waitUntilReady();
      expect(ai.getIsReady()).toBe(true);
    });
  });

  describe('getCompletion', () => {
    it('should get completion with document context', async () => {
      const _options: AIActionsOptions = {
        user: { displayName: 'AI Bot' },
        provider: mockProvider,
      };

      const ai = new AIActions(mockSuperdoc, _options);
      await ai.waitUntilReady();

      const completionSpy = vi.spyOn(mockProvider, 'getCompletion');
      await ai.getCompletion('test prompt');

      expect(completionSpy).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('test prompt'),
          }),
        ]),
        undefined,
      );
    });

    it('should throw if not ready', async () => {
      const _options: AIActionsOptions = {
        user: { displayName: 'AI Bot' },
        provider: mockProvider,
      };

      // Create AI without waiting for ready
      const ai = new AIActions(mockSuperdoc, _options);

      // Manually set isReady to false to test
      (ai as unknown as { isReady: boolean }).isReady = false;

      await expect(ai.getCompletion('test')).rejects.toThrow('AIActions is not ready yet');
    });

    it('should pass options to provider', async () => {
      const _options: AIActionsOptions = {
        user: { displayName: 'AI Bot' },
        provider: mockProvider,
      };

      const ai = new AIActions(mockSuperdoc, _options);
      await ai.waitUntilReady();

      const completionSpy = vi.spyOn(mockProvider, 'getCompletion');
      await ai.getCompletion('test', { temperature: 0.5, maxTokens: 100 });

      expect(completionSpy).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          temperature: 0.5,
          maxTokens: 100,
        }),
      );
    });

    it('should handle errors and call onError callback', async () => {
      const _onError = vi.fn();
      const _errorProvider: AIProvider = {
        async *streamCompletion() {
          yield 'test';
        },
        async getCompletion() {
          throw new Error('Provider error');
        },
      };

      const _options: AIActionsOptions = {
        user: { displayName: 'AI Bot' },
        provider: _errorProvider,
        onError: _onError,
      };

      const ai = new AIActions(mockSuperdoc, _options);
      await ai.waitUntilReady();

      await expect(ai.getCompletion('test')).rejects.toThrow('Provider error');
      expect(_onError).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('streamCompletion', () => {
    it('should stream completion chunks', async () => {
      const onStreamingStart = vi.fn();
      const onStreamingPartialResult = vi.fn();
      const onStreamingEnd = vi.fn();

      const _options: AIActionsOptions = {
        user: { displayName: 'AI Bot' },
        provider: mockProvider,
        onStreamingStart,
        onStreamingPartialResult,
        onStreamingEnd,
      };

      const ai = new AIActions(mockSuperdoc, _options);
      await ai.waitUntilReady();

      const result = await ai.streamCompletion('test prompt');

      expect(result).toBe('chunk1chunk2chunk3');
      expect(onStreamingStart).toHaveBeenCalled();
      expect(onStreamingPartialResult).toHaveBeenCalledTimes(3);
      expect(onStreamingEnd).toHaveBeenCalledWith({ fullResult: 'chunk1chunk2chunk3' });
    });

    it('should accumulate chunks correctly', async () => {
      const partialResults: string[] = [];

      const _options: AIActionsOptions = {
        user: { displayName: 'AI Bot' },
        provider: mockProvider,
        onStreamingPartialResult: (ctx) => {
          partialResults.push(ctx.partialResult);
        },
      };

      const ai = new AIActions(mockSuperdoc, _options);
      await ai.waitUntilReady();

      await ai.streamCompletion('test');

      expect(partialResults).toEqual(['chunk1', 'chunk1chunk2', 'chunk1chunk2chunk3']);
    });

    it('should throw if not ready', async () => {
      const _options: AIActionsOptions = {
        user: { displayName: 'AI Bot' },
        provider: mockProvider,
      };

      const ai = new AIActions(mockSuperdoc, _options);
      (ai as unknown as { isReady: boolean }).isReady = false;

      await expect(ai.streamCompletion('test')).rejects.toThrow('AIActions is not ready yet');
    });

    it('should handle streaming errors', async () => {
      const _onError = vi.fn();
      const _errorProvider: AIProvider = {
        async *streamCompletion(): AsyncGenerator<string, void, unknown> {
          yield ''; // Need at least one yield for generator function
          throw new Error('Stream error');
        },
        async getCompletion() {
          return 'test';
        },
      };

      const _options: AIActionsOptions = {
        user: { displayName: 'AI Bot' },
        provider: _errorProvider,
        onError: _onError,
      };

      const ai = new AIActions(mockSuperdoc, _options);
      await ai.waitUntilReady();

      await expect(ai.streamCompletion('test')).rejects.toThrow('Stream error');
      expect(_onError).toHaveBeenCalled();
    });
  });

  describe('getDocumentContext', () => {
    it('should return document text content when no selection', async () => {
      const _options: AIActionsOptions = {
        user: { displayName: 'AI Bot' },
        provider: mockProvider,
      };

      const ai = new AIActions(mockSuperdoc, _options);
      await ai.waitUntilReady();

      // Ensure no selection
      mockEditor.view.state.selection = {
        from: 0,
        to: 0,
        empty: true,
      } as unknown as typeof mockEditor.view.state.selection;

      const context = ai.getDocumentContext();
      expect(context).toBe('Sample document text');
    });

    it('should return selected text when there is a selection', async () => {
      const _options: AIActionsOptions = {
        user: { displayName: 'AI Bot' },
        provider: mockProvider,
      };

      const ai = new AIActions(mockSuperdoc, _options);
      await ai.waitUntilReady();

      // Set up a selection
      mockEditor.view.state.selection = {
        from: 0,
        to: 6,
        empty: false,
      } as unknown as typeof mockEditor.view.state.selection;

      // Mock textBetween to return the selected portion
      mockEditor.view.state.doc.textBetween = vi.fn(() => 'Sample');

      const context = ai.getDocumentContext();
      expect(context).toBe('Sample');
      expect(mockEditor.view.state.doc.textBetween).toHaveBeenCalledWith(0, 6, ' ');
    });

    it('should return empty string when editor view state is missing', async () => {
      const _options: AIActionsOptions = {
        user: { displayName: 'AI Bot' },
        provider: mockProvider,
      };

      const ai = new AIActions(mockSuperdoc, _options);
      await ai.waitUntilReady();

      // Remove view state
      (mockEditor as unknown as { view: typeof mockEditor.view | null }).view = null;

      const context = ai.getDocumentContext();
      expect(context).toBe('');
    });

    it('throws during construction when no editor is available', () => {
      const _noEditorSuperdoc: SuperDoc = {
        activeEditor: null,
      } as unknown as SuperDoc;

      const _options: AIActionsOptions = {
        user: { displayName: 'AI Bot' },
        provider: mockProvider,
      };

      expect(() => new AIActions(_noEditorSuperdoc, _options)).toThrow(
        'AIActions requires an active editor before initialization',
      );
    });
  });

  describe('action methods', () => {
    it('should call find action', async () => {
      mockProvider.getCompletion = vi
        .fn()
        .mockResolvedValue(JSON.stringify({ success: true, results: [{ originalText: 'test' }] }));
      mockEditor.commands.search = vi.fn().mockReturnValue([{ from: 0, to: 4 }]);

      const _options: AIActionsOptions = {
        user: { displayName: 'AI Bot' },
        provider: mockProvider,
      };

      const ai = new AIActions(mockSuperdoc, _options);
      await ai.waitUntilReady();

      const result = await ai.action.find('find test');
      expect(result.success).toBe(true);
    });

    it('rejects action calls when the active editor is missing', async () => {
      const _options: AIActionsOptions = {
        user: { displayName: 'AI Bot' },
        provider: mockProvider,
      };

      const ai = new AIActions(mockSuperdoc, _options);
      await ai.waitUntilReady();

      mockSuperdoc.activeEditor = null as unknown as Editor;

      await expect(ai.action.find('find test')).rejects.toThrow('No active SuperDoc editor available for AI actions');
    });

    it('should call callbacks for actions', async () => {
      const _onStreamingStart = vi.fn();
      const _onStreamingEnd = vi.fn();

      mockProvider.getCompletion = vi
        .fn()
        .mockResolvedValue(JSON.stringify({ success: true, results: [{ originalText: 'test' }] }));
      mockEditor.commands.search = vi.fn().mockReturnValue([{ from: 0, to: 4 }]);

      const _options: AIActionsOptions = {
        user: { displayName: 'AI Bot' },
        provider: mockProvider,
        onStreamingStart: _onStreamingStart,
        onStreamingEnd: _onStreamingEnd,
      };

      const ai = new AIActions(mockSuperdoc, _options);
      await ai.waitUntilReady();

      await ai.action.find('test');

      // Actions should call onStreamingStart but NOT onStreamingEnd
      // onStreamingEnd is only for streaming operations that return strings
      expect(_onStreamingStart).toHaveBeenCalled();
      expect(_onStreamingEnd).not.toHaveBeenCalled();
    });
  });

  describe('logging', () => {
    it('should log errors when logging is enabled', async () => {
      const _consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {
        // Intentionally empty mock implementation for testing
      });

      const _errorProvider: AIProvider = {
        async *streamCompletion() {
          yield 'test';
        },
        async getCompletion() {
          throw new Error('Test error');
        },
      };

      const _options: AIActionsOptions = {
        user: { displayName: 'AI Bot' },
        provider: _errorProvider,
        enableLogging: true,
      };

      const ai = new AIActions(mockSuperdoc, _options);
      await ai.waitUntilReady();

      await expect(ai.getCompletion('test')).rejects.toThrow();
      expect(_consoleSpy).toHaveBeenCalledWith('[AIActions Error]:', expect.any(Error));

      _consoleSpy.mockRestore();
    });

    it('should not log errors when logging is disabled', async () => {
      const _consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {
        // Intentionally empty mock implementation for testing
      });

      const _errorProvider: AIProvider = {
        async *streamCompletion() {
          yield 'test';
        },
        async getCompletion() {
          throw new Error('Test error');
        },
      };

      const _options: AIActionsOptions = {
        user: { displayName: 'AI Bot' },
        provider: _errorProvider,
        enableLogging: false,
      };

      const ai = new AIActions(mockSuperdoc, _options);
      await ai.waitUntilReady();

      await expect(ai.getCompletion('test')).rejects.toThrow();
      expect(_consoleSpy).not.toHaveBeenCalled();

      _consoleSpy.mockRestore();
    });
  });
});
