import { describe, expect, it, vi } from 'vitest';
import { config, translator } from './ins-translator.js';
import { NodeTranslator } from '@translator';
import { exportSchemaToJson } from '@converter/exporter.js';
import { createTrackStyleMark } from '@converter/v3/handlers/helpers.js';

// Mock external modules
vi.mock('@converter/exporter.js', () => ({
  exportSchemaToJson: vi.fn(),
}));

vi.mock('@converter/v3/handlers/helpers.js', () => ({
  createTrackStyleMark: vi.fn(),
}));

describe('w:del translator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exposes correct config meta', () => {
    expect(config.xmlName).toBe('w:ins');
    expect(config.sdNodeOrKeyName).toEqual('trackInsert');
    expect(typeof config.encode).toBe('function');
    expect(typeof config.decode).toBe('function');
    expect(config.attributes.length).toEqual(4);
  });

  it('builds NodeTranslator instance', () => {
    expect(translator).toBeInstanceOf(NodeTranslator);
    expect(translator.xmlName).toBe('w:ins');
    expect(translator.sdNodeOrKeyName).toEqual('trackInsert');
  });

  describe('encode', () => {
    it('wraps subnodes with trackInsert mark and sets importedAuthor', () => {
      const mockNode = { elements: [{ text: 'added text' }] };

      const mockSubNodes = [{ text: 'added text' }];

      const mockNodeListHandler = {
        handler: vi.fn().mockReturnValue(mockSubNodes),
      };

      const encodedAttrs = {
        author: 'Test',
        authorEmail: 'test@example.com',
        id: '123',
        date: '2025-10-09T12:00:00Z',
      };

      const result = config.encode(
        {
          nodeListHandler: mockNodeListHandler,
          extraParams: { node: mockNode },
          path: [],
        },
        { ...encodedAttrs },
      );

      // Ensure handler is called properly
      expect(mockNodeListHandler.handler).toHaveBeenCalledWith(
        expect.objectContaining({
          insideTrackChange: true,
          nodes: mockNode.elements,
        }),
      );

      // Ensure results are annotated correctly
      expect(result).toHaveLength(1);
      expect(result[0].marks).toEqual([
        {
          type: 'trackInsert',
          attrs: expect.objectContaining({
            author: 'Test',
            importedAuthor: 'Test (imported)',
          }),
        },
      ]);
    });
  });

  describe('decode', () => {
    it('decodes node with trackInsert mark into a w:ins element', () => {
      const mockTrackedMark = {
        type: 'trackInsert',
        attrs: {
          id: '123',
          author: 'Test',
          authorEmail: 'test@example.com',
          date: '2025-10-09T12:00:00Z',
        },
      };

      const mockMarks = [mockTrackedMark, { type: 'bold' }];
      const mockTextNode = { name: 'w:t', text: 'added text' };
      const mockTranslatedNode = { elements: [mockTextNode] };

      exportSchemaToJson.mockReturnValue(mockTranslatedNode);
      createTrackStyleMark.mockReturnValue(null);

      const node = {
        type: 'text',
        text: 'added text',
        marks: [...mockMarks],
      };

      const result = config.decode({ node });

      expect(exportSchemaToJson).toHaveBeenCalledWith(expect.objectContaining({ node: expect.any(Object) }));

      expect(result.name).toBe('w:ins');
      expect(result.type).toBe('element');
      expect(result.attributes).toEqual({
        'w:id': '123',
        'w:author': 'Test',
        'w:authorEmail': 'test@example.com',
        'w:date': '2025-10-09T12:00:00Z',
      });
    });

    it('returns null if node is missing or invalid', () => {
      expect(config.decode({ node: null })).toBeNull();
      expect(config.decode({ node: {} })).toBeNull();
    });

    it('preserves trackStyleMark if created', () => {
      const node = {
        type: 'text',
        marks: [{ type: 'trackInsert', attrs: {} }],
      };

      const mockTrackStyleMark = { type: 'trackStyle', attrs: {} };
      createTrackStyleMark.mockReturnValue(mockTrackStyleMark);
      exportSchemaToJson.mockReturnValue({ elements: [{ name: 'w:t' }] });

      const result = config.decode({ node });

      expect(createTrackStyleMark).toHaveBeenCalled();
      expect(result).toBeTruthy();
      console.log(result.elements[0].elements[0]);
      expect(result.elements[0].elements[0].name).toBe('w:t');
    });
  });
});
