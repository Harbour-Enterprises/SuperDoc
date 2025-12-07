import { describe, it, expect } from 'vitest';
import { anthropicTools, openaiTools, genericTools } from '../providers';

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
    it('returns 9 tools in Anthropic format', () => {
      const tools = anthropicTools();
      expect(tools).toHaveLength(9);
    });

    it('has correct Anthropic format', () => {
      const tools = anthropicTools();
      
      tools.forEach(tool => {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('input_schema');
        expect(tool.input_schema).toHaveProperty('type', 'object');
        expect(tool.input_schema).toHaveProperty('additionalProperties', false);
      });
    });

    it('has same tools as generic', () => {
      const anthropic = anthropicTools();
      const generic = genericTools();
      
      const anthropicNames = anthropic.map(t => t.name).sort();
      const genericNames = generic.map(t => t.name).sort();
      
      expect(anthropicNames).toEqual(genericNames);
    });

    it('filters tools when enabledTools is provided', () => {
      const tools = anthropicTools([], { enabledTools: ['readSelection'] });
      
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('readSelection');
    });
  });

  describe('openaiTools', () => {
    it('returns 9 tools in OpenAI format', () => {
      const tools = openaiTools();
      expect(tools).toHaveLength(9);
    });

    it('has correct OpenAI format', () => {
      const tools = openaiTools();
      
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

    it('has same tool names as generic', () => {
      const openai = openaiTools();
      const generic = genericTools();
      
      const openaiNames = openai.map(t => t.function.name).sort();
      const genericNames = generic.map(t => t.name).sort();
      
      expect(openaiNames).toEqual(genericNames);
    });

    it('filters tools when enabledTools is provided', () => {
      const tools = openaiTools({ enabledTools: ['searchContent', 'replaceContent'] });
      
      expect(tools).toHaveLength(2);
      expect(tools.map(t => t.function.name)).toContain('searchContent');
      expect(tools.map(t => t.function.name)).toContain('replaceContent');
    });
  });

  describe('Provider compatibility', () => {
    it('has consistent descriptions across providers', () => {
      const anthropic = anthropicTools();
      const openai = openaiTools();
      const generic = genericTools();

      anthropic.forEach((tool, i) => {
        expect(tool.description).toBe(generic[i].description);
        expect(openai[i].function.description).toBe(generic[i].description);
      });
    });

    it('has consistent required fields across providers', () => {
      const anthropic = anthropicTools();
      const openai = openaiTools();
      const generic = genericTools();

      anthropic.forEach((tool, i) => {
        expect(tool.input_schema.required).toEqual(generic[i].parameters.required);
        expect(openai[i].function.parameters.required).toEqual(generic[i].parameters.required);
      });
    });

    it('has consistent parameter properties', () => {
      const anthropic = anthropicTools();
      const openai = openaiTools();
      const generic = genericTools();

      anthropic.forEach((tool, i) => {
        const anthropicProps = Object.keys(tool.input_schema.properties || {}).sort();
        const openaiProps = Object.keys(openai[i].function.parameters.properties || {}).sort();
        const genericProps = Object.keys(generic[i].parameters.properties || {}).sort();

        expect(anthropicProps).toEqual(genericProps);
        expect(openaiProps).toEqual(genericProps);
      });
    });
  });
});

