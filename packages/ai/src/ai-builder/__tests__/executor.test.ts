import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeTool } from '../executor';
import type { Editor } from '../../shared/types';

describe('ai-builder executor', () => {
  let mockEditor: Editor;

  beforeEach(() => {
    mockEditor = {
      state: {
        doc: {
          content: { size: 100 },
          toJSON: () => ({ type: 'doc', content: [] }),
          cut: vi.fn().mockReturnValue({
            toJSON: () => ({ type: 'doc', content: [] })
          }),
        },
        selection: { from: 0, to: 0, empty: true },
      },
      commands: {
        search: vi.fn().mockReturnValue([]),
        insertContentAt: vi.fn().mockReturnValue(true),
      },
    } as any;
  });

  describe('executeTool', () => {
    it('executes a valid tool', async () => {
      const result = await executeTool('readSelection', {}, mockEditor);
      
      expect(result.success).toBe(true);
      expect(result.docChanged).toBe(false);
    });

    it('returns error for unknown tool', async () => {
      const result = await executeTool('unknownTool', {}, mockEditor);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown tool');
      expect(result.docChanged).toBe(false);
    });

    it('handles tool execution errors gracefully', async () => {
      const badEditor = null as any;
      const result = await executeTool('readSelection', {}, badEditor);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.docChanged).toBe(false);
    });

    it('supports cancellation via AbortSignal', async () => {
      const controller = new AbortController();
      controller.abort();

      const result = await executeTool('readSelection', {}, mockEditor, {
        signal: controller.signal,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('cancelled');
      expect(result.docChanged).toBe(false);
    });

    it('validates params when validation option is enabled', async () => {
      const result = await executeTool('readContent', null, mockEditor, {
        validate: true,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });

    it('calls onProgress callback when provided', async () => {
      const onProgress = vi.fn();

      await executeTool('readSelection', {}, mockEditor, { onProgress });

      expect(onProgress).toHaveBeenCalledWith(100);
    });
  });
});

