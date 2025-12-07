import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  readSelection,
  readContent,
  searchContent,
  getContentSchema,
  insertContent,
  deleteContent,
  replaceContent,
  getDocumentOutline,
  readSection,
} from '../tools';
import type { Editor } from '../../shared/types';

function createMockEditor(overrides = {}): Editor {
  return {
    state: {
      doc: {
        content: { size: 100 },
        toJSON: () => ({ type: 'doc', content: [] }),
        cut: vi.fn((from, to) => ({
          toJSON: () => ({ type: 'doc', content: [] })
        })),
        nodesBetween: vi.fn(),
        descendants: vi.fn(),
      },
      selection: { from: 10, to: 20, empty: false },
    },
    commands: {
      search: vi.fn().mockReturnValue([{ text: 'found', from: 10, to: 15 }]),
      insertContentAt: vi.fn().mockReturnValue(true),
    },
    getSchemaSummaryJSON: vi.fn().mockResolvedValue({
      version: '0.34.5',
      nodes: [],
      marks: [],
      topNode: 'doc',
    }),
    getJSON: () => ({ type: 'doc', content: [] }),
    ...overrides,
  } as any;
}

describe('ai-builder tools', () => {
  describe('readSelection', () => {
    it('reads current selection', async () => {
      const editor = createMockEditor();
      const result = await readSelection.execute(editor, {});

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('from');
      expect(result.data).toHaveProperty('to');
      expect(result.data).toHaveProperty('content');
      expect(result.docChanged).toBe(false);
    });

    it('includes context when withContext is specified', async () => {
      const editor = createMockEditor();
      editor.state.doc.nodesBetween = vi.fn((from, to, callback) => {
        callback({ type: { name: 'paragraph' }, toJSON: () => ({}) }, 0);
      });

      const result = await readSelection.execute(editor, { withContext: 2 });

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('before');
      expect(result.data).toHaveProperty('after');
    });

    it('handles missing editor state', async () => {
      const editor = { state: null } as any;
      const result = await readSelection.execute(editor, {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('state not available');
    });
  });

  describe('readContent', () => {
    it('reads content at specific range', async () => {
      const editor = createMockEditor();
      const result = await readContent.execute(editor, { from: 0, to: 50 });

      expect(result.success).toBe(true);
      expect(result.data.from).toBe(0);
      expect(result.data.to).toBe(50);
      expect(result.data).toHaveProperty('content');
      expect(result.docChanged).toBe(false);
    });

    it('validates parameters', async () => {
      const editor = createMockEditor();
      const result = await readContent.execute(editor, { from: 'invalid' as any, to: 50 });

      expect(result.success).toBe(false);
      expect(result.error).toContain('must be numbers');
    });

    it('clamps positions to document bounds', async () => {
      const editor = createMockEditor();
      const result = await readContent.execute(editor, { from: 0, to: 1000 });

      expect(result.success).toBe(true);
      expect(result.data.to).toBeLessThanOrEqual(100);
    });

    it('rejects invalid ranges', async () => {
      const editor = createMockEditor();
      const result = await readContent.execute(editor, { from: 50, to: 10 });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid range');
    });
  });

  describe('searchContent', () => {
    it('searches for text and returns matches', async () => {
      const editor = createMockEditor();
      const result = await searchContent.execute(editor, { query: 'test' });

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('matches');
      expect(result.data).toHaveProperty('count');
      expect(result.docChanged).toBe(false);
    });

    it('returns first match only when findAll is false', async () => {
      const editor = createMockEditor();
      editor.commands.search = vi.fn().mockReturnValue([
        { text: 'found', from: 10, to: 15 },
        { text: 'found', from: 50, to: 55 },
      ]);

      const result = await searchContent.execute(editor, { query: 'test', findAll: false });

      expect(result.success).toBe(true);
      expect(result.data.matches).toHaveLength(1);
    });

    it('handles regex patterns', async () => {
      const editor = createMockEditor();
      const result = await searchContent.execute(editor, {
        query: 't[e]st',
        regex: true,
      });

      expect(result.success).toBe(true);
    });

    it('handles invalid regex gracefully', async () => {
      const editor = createMockEditor();
      const result = await searchContent.execute(editor, {
        query: '[invalid',
        regex: true,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid regular expression');
    });

    it('requires query parameter', async () => {
      const editor = createMockEditor();
      const result = await searchContent.execute(editor, { query: '' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });
  });

  describe('getContentSchema', () => {
    it('returns dynamic schema when available', async () => {
      const editor = createMockEditor();
      const result = await getContentSchema.execute(editor);

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('schema');
      expect(result.data.schema).toHaveProperty('nodes');
      expect(result.data.schema).toHaveProperty('marks');
      expect(result.docChanged).toBe(false);
    });

    it('falls back to static schema when getSchemaSummaryJSON not available', async () => {
      const editor = createMockEditor({ getSchemaSummaryJSON: undefined });
      const result = await getContentSchema.execute(editor);

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('schema');
      expect(result.message).toContain('Static');
    });

    it('falls back to static schema on error', async () => {
      const editor = createMockEditor();
      editor.getSchemaSummaryJSON = vi.fn().mockRejectedValue(new Error('Schema error'));

      const result = await getContentSchema.execute(editor);

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('schema');
    });
  });

  describe('insertContent', () => {
    it('inserts at selection', async () => {
      const editor = createMockEditor();
      const content = [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }];

      const result = await insertContent.execute(editor, {
        position: 'selection',
        content,
      });

      expect(result.success).toBe(true);
      expect(result.docChanged).toBe(true);
      expect(editor.commands.insertContentAt).toHaveBeenCalled();
    });

    it('supports beforeSelection position', async () => {
      const editor = createMockEditor();
      editor.state.selection = { from: 50, to: 60, empty: false };
      
      const result = await insertContent.execute(editor, {
        position: 'beforeSelection',
        content: [{ type: 'paragraph', content: [] }],
      });

      expect(result.success).toBe(true);
      expect(result.data.insertedAt).toBe(50);
    });

    it('supports afterSelection position', async () => {
      const editor = createMockEditor();
      editor.state.selection = { from: 50, to: 60, empty: false };
      
      const result = await insertContent.execute(editor, {
        position: 'afterSelection',
        content: [{ type: 'paragraph', content: [] }],
      });

      expect(result.success).toBe(true);
      expect(result.data.insertedAt).toBe(60);
    });

    it('supports numeric position', async () => {
      const editor = createMockEditor();
      
      const result = await insertContent.execute(editor, {
        position: 75,
        content: [{ type: 'paragraph', content: [] }],
      });

      expect(result.success).toBe(true);
      expect(result.data.insertedAt).toBe(75);
    });

    it('validates content parameter', async () => {
      const editor = createMockEditor();
      const result = await insertContent.execute(editor, {
        position: 'selection',
        content: null as any,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('array');
    });
  });

  describe('deleteContent', () => {
    it('deletes by position', async () => {
      const editor = createMockEditor();
      const result = await deleteContent.execute(editor, { from: 10, to: 20 });

      expect(result.success).toBe(true);
      expect(result.docChanged).toBe(true);
      expect(result.data.deletedRange).toEqual({ from: 10, to: 20 });
    });

    it('deletes by query', async () => {
      const editor = createMockEditor();
      editor.commands.search = vi.fn().mockReturnValue([
        { text: 'delete me', from: 10, to: 19 },
      ]);

      const result = await deleteContent.execute(editor, { query: 'delete me' });

      expect(result.success).toBe(true);
      expect(result.docChanged).toBe(true);
      expect(result.data.deletedCount).toBe(1);
    });

    it('deletes all occurrences when deleteAll is true', async () => {
      const editor = createMockEditor();
      editor.commands.search = vi.fn().mockReturnValue([
        { text: 'TODO', from: 10, to: 14 },
        { text: 'TODO', from: 50, to: 54 },
      ]);

      const result = await deleteContent.execute(editor, {
        query: 'TODO',
        deleteAll: true,
      });

      expect(result.success).toBe(true);
      expect(result.data.deletedCount).toBe(2);
    });

    it('returns error when no matches found', async () => {
      const editor = createMockEditor();
      editor.commands.search = vi.fn().mockReturnValue([]);

      const result = await deleteContent.execute(editor, { query: 'nonexistent' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('No matches found');
    });

    it('validates parameters', async () => {
      const editor = createMockEditor();
      const result = await deleteContent.execute(editor, {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('query or from/to');
    });
  });

  describe('replaceContent', () => {
    it('replaces by position', async () => {
      const editor = createMockEditor();
      const content = [{ type: 'paragraph', content: [{ type: 'text', text: 'new' }] }];

      const result = await replaceContent.execute(editor, {
        from: 10,
        to: 20,
        content,
      });

      expect(result.success).toBe(true);
      expect(result.docChanged).toBe(true);
    });

    it('replaces by query', async () => {
      const editor = createMockEditor();
      const content = [{ type: 'paragraph', content: [{ type: 'text', text: 'new' }] }];

      const result = await replaceContent.execute(editor, {
        query: 'old',
        content,
      });

      expect(result.success).toBe(true);
      expect(result.data.replacedCount).toBeGreaterThan(0);
    });

    it('validates content parameter', async () => {
      const editor = createMockEditor();
      const result = await replaceContent.execute(editor, {
        from: 0,
        to: 10,
        content: null as any,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('array');
    });
  });

  describe('getDocumentOutline', () => {
    it('returns document headings', async () => {
      const editor = createMockEditor();
      editor.state.doc.descendants = vi.fn((callback) => {
        callback(
          {
            type: { name: 'paragraph' },
            attrs: { styleId: 'Heading1' },
            content: {
              forEach: (cb: any) => cb({ isText: true, text: 'Introduction' }),
            },
          },
          0
        );
        callback(
          {
            type: { name: 'paragraph' },
            attrs: { styleId: 'Heading2' },
            content: {
              forEach: (cb: any) => cb({ isText: true, text: 'Background' }),
            },
          },
          50
        );
      });

      const result = await getDocumentOutline.execute(editor);

      expect(result.success).toBe(true);
      expect(result.data.headings).toHaveLength(2);
      expect(result.data.headings[0]).toMatchObject({
        text: 'Introduction',
        level: 1,
        position: 0,
      });
      expect(result.data.headings[1]).toMatchObject({
        text: 'Background',
        level: 2,
        position: 50,
      });
    });

    it('returns empty array when no headings found', async () => {
      const editor = createMockEditor();
      editor.state.doc.descendants = vi.fn();

      const result = await getDocumentOutline.execute(editor);

      expect(result.success).toBe(true);
      expect(result.data.headings).toEqual([]);
    });
  });

  describe('readSection', () => {
    it('reads section by heading name', async () => {
      const editor = createMockEditor();
      editor.state.doc.descendants = vi.fn((callback) => {
        // First heading (our target)
        callback(
          {
            type: { name: 'paragraph' },
            attrs: { styleId: 'Heading1' },
            content: {
              forEach: (cb: any) => cb({ isText: true, text: 'Introduction' }),
            },
          },
          10
        );
        // Next heading (marks end of section)
        callback(
          {
            type: { name: 'paragraph' },
            attrs: { styleId: 'Heading1' },
            content: {
              forEach: (cb: any) => cb({ isText: true, text: 'Next Section' }),
            },
          },
          50
        );
        return true;
      });

      const result = await readSection.execute(editor, { heading: 'Introduction' });

      expect(result.success).toBe(true);
      expect(result.data.heading).toBe('Introduction');
      expect(result.data.from).toBe(10);
      expect(result.data.to).toBe(50);
    });

    it('reads section by position', async () => {
      const editor = createMockEditor();
      const result = await readSection.execute(editor, { from: 10, to: 50 });

      expect(result.success).toBe(true);
      expect(result.data.from).toBe(10);
      expect(result.data.to).toBe(50);
    });

    it('returns error when heading not found', async () => {
      const editor = createMockEditor();
      editor.state.doc.descendants = vi.fn();

      const result = await readSection.execute(editor, { heading: 'Nonexistent' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('No heading found');
    });

    it('requires either heading or from/to parameters', async () => {
      const editor = createMockEditor();
      const result = await readSection.execute(editor, {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });
  });

  describe('Tool metadata', () => {
    const allTools = [
      readSelection,
      readContent,
      searchContent,
      getContentSchema,
      insertContent,
      deleteContent,
      replaceContent,
      getDocumentOutline,
      readSection,
    ];

    it('all tools have required metadata', () => {
      allTools.forEach(tool => {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('category');
        expect(tool).toHaveProperty('execute');

        expect(typeof tool.name).toBe('string');
        expect(typeof tool.description).toBe('string');
        expect(typeof tool.execute).toBe('function');
        expect(['read', 'write', 'navigate', 'analyze']).toContain(tool.category);
      });
    });

    it('all tools have meaningful descriptions', () => {
      allTools.forEach(tool => {
        expect(tool.description.length).toBeGreaterThan(30);
      });
    });

    it('tools have correct categories', () => {
      expect(readSelection.category).toBe('read');
      expect(readContent.category).toBe('read');
      expect(searchContent.category).toBe('read');
      expect(getContentSchema.category).toBe('read');
      expect(insertContent.category).toBe('write');
      expect(deleteContent.category).toBe('write');
      expect(replaceContent.category).toBe('write');
      expect(getDocumentOutline.category).toBe('read');
      expect(readSection.category).toBe('read');
    });
  });
});

