import { describe, it, expect, vi } from 'vitest';
import { anthropicTools, openaiTools, genericTools } from '../providers';
import type { Editor } from '../../shared';

function createMockEditor(): Editor {
  return {
    getSchemaSummaryJSON: vi.fn().mockResolvedValue({
      version: '0.34.5',
      nodes: [],
      marks: [],
      topNode: 'doc',
    }),
  } as any;
}

describe('ai-builder providers', () => {
  describe('genericTools', () => {
    it('returns 9 tools', () => {
      const tools = genericTools();
      expect(tools).toHaveLength(9);
    });

    it('has correct structure for all tools', () => {
      const tools = genericTools();
      
      tools.forEach(tool => {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('parameters');
        expect(tool.parameters).toHaveProperty('type', 'object');
        expect(tool.parameters).toHaveProperty('properties');
        expect(tool.parameters).toHaveProperty('additionalProperties', false);
        
        expect(typeof tool.name).toBe('string');
        expect(typeof tool.description).toBe('string');
        expect(tool.description.length).toBeGreaterThan(20);
      });
    });

    it('includes all expected tools', () => {
      const tools = genericTools();
      const names = tools.map(t => t.name);
      
      expect(names).toContain('readSelection');
      expect(names).toContain('readContent');
      expect(names).toContain('searchContent');
      expect(names).toContain('getContentSchema');
      expect(names).toContain('insertContent');
      expect(names).toContain('deleteContent');
      expect(names).toContain('replaceContent');
      expect(names).toContain('getDocumentOutline');
      expect(names).toContain('readSection');
    });

    it('filters tools when enabledTools is provided', () => {
      const tools = genericTools({ enabledTools: ['readSelection', 'insertContent'] });
      
      expect(tools).toHaveLength(2);
      expect(tools.map(t => t.name)).toEqual(['readSelection', 'insertContent']);
    });

    it('has required parameters defined correctly', () => {
      const tools = genericTools();
      
      const readContent = tools.find(t => t.name === 'readContent');
      expect(readContent?.parameters.required).toEqual(['from', 'to']);
      
      const searchContent = tools.find(t => t.name === 'searchContent');
      expect(searchContent?.parameters.required).toEqual(['query']);
      
      const insertContent = tools.find(t => t.name === 'insertContent');
      expect(insertContent?.parameters.required).toEqual(['position', 'content']);
    });
  });

  describe('anthropicTools', () => {
    it('returns 9 tools in Anthropic format', async () => {
      const editor = createMockEditor();
      const tools = await anthropicTools(editor);
      expect(tools).toHaveLength(9);
    });

    it('has correct Anthropic format', async () => {
      const editor = createMockEditor();
      const tools = await anthropicTools(editor);
      
      tools.forEach(tool => {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('input_schema');
        expect(tool.input_schema).toHaveProperty('type', 'object');
        expect(tool.input_schema).toHaveProperty('additionalProperties', false);
      });
    });

    it('has tools defined', async () => {
      const editor = createMockEditor();
      const anthropic = await anthropicTools(editor);
      
      // Anthropic tools may differ from generic tools
      // Just verify we have tools
      expect(anthropic.length).toBeGreaterThan(0);
      anthropic.forEach(tool => {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
      });
    });

    it('filters tools when enabledTools is provided', async () => {
      const editor = createMockEditor();
      const tools = await anthropicTools(editor, { enabledTools: ['readSelection'] });
      
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('readSelection');
    });
  });

  describe('openaiTools', () => {
    it('returns 9 tools in OpenAI format', async () => {
      const editor = createMockEditor();
      const tools = await openaiTools(editor);
      expect(tools).toHaveLength(9);
    });

    it('has correct OpenAI format', async () => {
      const editor = createMockEditor();
      const tools = await openaiTools(editor);
      
      tools.forEach(tool => {
        expect(tool).toHaveProperty('type', 'function');
        expect(tool).toHaveProperty('function');
        expect(tool.function).toHaveProperty('name');
        expect(tool.function).toHaveProperty('description');
        expect(tool.function).toHaveProperty('parameters');
        expect(tool.function.parameters).toHaveProperty('type', 'object');
        expect(tool.function.parameters).toHaveProperty('additionalProperties', false);
      });
    });

    it('has same tool names as generic', async () => {
      const editor = createMockEditor();
      const openai = await openaiTools(editor);
      const generic = genericTools();
      
      const openaiNames = openai.map(t => t.function.name).sort();
      const genericNames = generic.map(t => t.name).sort();
      
      // Compare sets to avoid order issues
      expect(new Set(openaiNames)).toEqual(new Set(genericNames));
    });

    it('filters tools when enabledTools is provided', async () => {
      const editor = createMockEditor();
      const tools = await openaiTools(editor, { enabledTools: ['searchContent', 'replaceContent'] });
      
      expect(tools).toHaveLength(2);
      expect(tools.map(t => t.function.name)).toContain('searchContent');
      expect(tools.map(t => t.function.name)).toContain('replaceContent');
    });
  });

  describe('Provider compatibility', () => {
    it('providers have valid tool structures', async () => {
      const editor = createMockEditor();
      const anthropic = await anthropicTools(editor);
      const openai = await openaiTools(editor);

      // Verify all tools have required structure
      anthropic.forEach((tool) => {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('input_schema');
        expect(typeof tool.name).toBe('string');
        expect(typeof tool.description).toBe('string');
        expect(tool.description.length).toBeGreaterThan(10);
      });

      openai.forEach((tool) => {
        expect(tool).toHaveProperty('type', 'function');
        expect(tool).toHaveProperty('function');
        expect(tool.function).toHaveProperty('name');
        expect(tool.function).toHaveProperty('description');
        expect(tool.function).toHaveProperty('parameters');
        expect(typeof tool.function.name).toBe('string');
        expect(typeof tool.function.description).toBe('string');
        expect(tool.function.description.length).toBeGreaterThan(10);
      });
    });
  });
});

