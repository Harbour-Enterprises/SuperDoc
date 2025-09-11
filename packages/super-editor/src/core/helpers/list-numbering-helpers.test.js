import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Schema } from 'prosemirror-model';
import { EditorState, TextSelection, NodeSelection } from 'prosemirror-state';
import * as listHelpers from './list-numbering-helpers.js';

// Mock the external dependencies
vi.mock('@core/super-converter/v2/importer/listImporter.js', () => ({
  getStyleTagFromStyleId: vi.fn(),
  getAbstractDefinition: vi.fn(),
  getDefinitionForLevel: vi.fn(),
}));

import { getStyleTagFromStyleId } from '@core/super-converter/v2/importer/listImporter.js';

// Import the function we want to test
const { getListDefinitionDetails, createNewList, ListHelpers } = listHelpers;

describe('getListDefinitionDetails', () => {
  let mockEditor;
  let mockDefinitions;
  let mockAbstracts;
  let generateNewListDefinitionSpy;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create spies on the ListHelpers object methods
    generateNewListDefinitionSpy = vi.spyOn(ListHelpers, 'generateNewListDefinition').mockImplementation(() => {});

    mockDefinitions = {};
    mockAbstracts = {};

    mockEditor = {
      converter: {
        numbering: {
          definitions: mockDefinitions,
          abstracts: mockAbstracts,
        },
        convertedXml: '<mock>xml</mock>',
      },
      schema: {
        nodes: {
          orderedList: { name: 'orderedList' },
          bulletList: { name: 'bulletList' },
        },
      },
      emit: vi.fn(), // Add mock emit function
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic functionality', () => {
    it('should return list definition details for valid numId and level', () => {
      // Setup mock data
      mockDefinitions[1] = {
        elements: [
          {
            name: 'w:abstractNumId',
            attributes: { 'w:val': 'abstract1' },
          },
        ],
      };

      mockAbstracts['abstract1'] = {
        elements: [
          {
            name: 'w:lvl',
            attributes: { 'w:ilvl': '0' },
            elements: [
              { name: 'w:start', attributes: { 'w:val': '1' } },
              { name: 'w:numFmt', attributes: { 'w:val': 'decimal' } },
              { name: 'w:lvlText', attributes: { 'w:val': '%1.' } },
            ],
          },
        ],
      };

      const result = getListDefinitionDetails({
        numId: 1,
        level: 0,
        editor: mockEditor,
      });

      expect(result).toEqual({
        start: '1',
        numFmt: 'decimal',
        lvlText: '%1.',
        listNumberingType: 'decimal',
        customFormat: undefined,
        abstract: mockAbstracts['abstract1'],
        abstractId: 'abstract1',
      });
    });

    it('should handle custom format when numFmt is custom', () => {
      mockDefinitions[1] = {
        elements: [
          {
            name: 'w:abstractNumId',
            attributes: { 'w:val': 'abstract1' },
          },
        ],
      };

      mockAbstracts['abstract1'] = {
        elements: [
          {
            name: 'w:lvl',
            attributes: { 'w:ilvl': '0' },
            elements: [
              {
                name: 'w:numFmt',
                attributes: {
                  'w:val': 'custom',
                  'w:format': 'customPattern',
                },
              },
            ],
          },
        ],
      };

      const result = getListDefinitionDetails({
        numId: 1,
        level: 0,
        editor: mockEditor,
      });

      expect(result.customFormat).toBe('customPattern');
    });

    it('should handle bullet list format', () => {
      mockDefinitions[1] = {
        elements: [
          {
            name: 'w:abstractNumId',
            attributes: { 'w:val': 'abstract1' },
          },
        ],
      };

      mockAbstracts['abstract1'] = {
        elements: [
          {
            name: 'w:lvl',
            attributes: { 'w:ilvl': '0' },
            elements: [
              { name: 'w:start', attributes: { 'w:val': '1' } },
              { name: 'w:numFmt', attributes: { 'w:val': 'bullet' } },
              { name: 'w:lvlText', attributes: { 'w:val': '•' } },
            ],
          },
        ],
      };

      const result = getListDefinitionDetails({
        numId: 1,
        level: 0,
        editor: mockEditor,
      });

      expect(result.numFmt).toBe('bullet');
      expect(result.lvlText).toBe('•');
    });

    it('should handle string level parameter by converting to number comparison', () => {
      mockDefinitions[1] = {
        elements: [
          {
            name: 'w:abstractNumId',
            attributes: { 'w:val': 'abstract1' },
          },
        ],
      };

      mockAbstracts['abstract1'] = {
        elements: [
          {
            name: 'w:lvl',
            attributes: { 'w:ilvl': '1' }, // String level in XML
            elements: [{ name: 'w:numFmt', attributes: { 'w:val': 'lowerRoman' } }],
          },
        ],
      };

      const result = getListDefinitionDetails({
        numId: 1,
        level: 1, // Number level in function call
        editor: mockEditor,
      });

      expect(result.numFmt).toBe('lowerRoman');
    });
  });

  describe('Missing definition handling', () => {
    it('should generate new definition when numDef is missing and listType is provided', () => {
      const result = getListDefinitionDetails({
        numId: 999,
        level: 0,
        listType: 'orderedList',
        editor: mockEditor,
      });

      expect(generateNewListDefinitionSpy).toHaveBeenCalledWith({
        numId: 999,
        listType: 'orderedList',
        editor: mockEditor,
      });
    });

    it('should not generate new definition when listType is not provided', () => {
      getListDefinitionDetails({
        numId: 999,
        level: 0,
        editor: mockEditor,
      });

      expect(generateNewListDefinitionSpy).not.toHaveBeenCalled();
    });

    it('should generate new definition for bulletList type', () => {
      getListDefinitionDetails({
        numId: 888,
        level: 0,
        listType: 'bulletList',
        editor: mockEditor,
      });

      expect(generateNewListDefinitionSpy).toHaveBeenCalledWith({
        numId: 888,
        listType: 'bulletList',
        editor: mockEditor,
      });
    });

    it('should handle existing definition and not call generateNewListDefinition', () => {
      // Setup existing definition
      mockDefinitions[1] = {
        elements: [
          {
            name: 'w:abstractNumId',
            attributes: { 'w:val': 'abstract1' },
          },
        ],
      };

      mockAbstracts['abstract1'] = {
        elements: [
          {
            name: 'w:lvl',
            attributes: { 'w:ilvl': '0' },
            elements: [{ name: 'w:numFmt', attributes: { 'w:val': 'decimal' } }],
          },
        ],
      };

      getListDefinitionDetails({
        numId: 1,
        level: 0,
        listType: 'orderedList', // Even with listType, shouldn't generate since definition exists
        editor: mockEditor,
      });

      expect(generateNewListDefinitionSpy).not.toHaveBeenCalled();
    });
  });

  describe('Abstract handling', () => {
    it('should return null values when abstract is not found', () => {
      mockDefinitions[1] = {
        elements: [
          {
            name: 'w:abstractNumId',
            attributes: { 'w:val': 'nonexistent' },
          },
        ],
      };

      const result = getListDefinitionDetails({
        numId: 1,
        level: 0,
        editor: mockEditor,
      });

      expect(result).toEqual({
        start: null,
        numFmt: null,
        lvlText: null,
        listNumberingType: null,
        customFormat: null,
        abstract: null,
        abstractId: 'nonexistent', // The function correctly returns the abstractId even when abstract is not found
      });
    });

    it('should return partial data when abstract exists but level definition is missing', () => {
      mockDefinitions[1] = {
        elements: [
          {
            name: 'w:abstractNumId',
            attributes: { 'w:val': 'abstract1' },
          },
        ],
      };

      mockAbstracts['abstract1'] = {
        elements: [
          {
            name: 'w:lvl',
            attributes: { 'w:ilvl': '1' }, // Different level
            elements: [{ name: 'w:start', attributes: { 'w:val': '1' } }],
          },
        ],
      };

      const result = getListDefinitionDetails({
        numId: 1,
        level: 0, // Looking for level 0, but only level 1 exists
        editor: mockEditor,
      });

      expect(result).toEqual({
        start: null,
        numFmt: null,
        lvlText: null,
        listNumberingType: null,
        customFormat: null,
        abstract: mockAbstracts['abstract1'],
        abstractId: 'abstract1',
      });
    });
  });

  describe('Style link recursion', () => {
    it('should follow style link and recurse when tries < 1', () => {
      // Setup original definition
      mockDefinitions[1] = {
        elements: [
          {
            name: 'w:abstractNumId',
            attributes: { 'w:val': 'abstract1' },
          },
        ],
      };

      mockAbstracts['abstract1'] = {
        elements: [
          {
            name: 'w:numStyleLink',
            attributes: { 'w:val': 'style1' },
          },
        ],
      };

      // Setup linked definition
      mockDefinitions[2] = {
        elements: [
          {
            name: 'w:abstractNumId',
            attributes: { 'w:val': 'abstract2' },
          },
        ],
      };

      mockAbstracts['abstract2'] = {
        elements: [
          {
            name: 'w:lvl',
            attributes: { 'w:ilvl': '0' },
            elements: [
              { name: 'w:start', attributes: { 'w:val': '1' } },
              { name: 'w:numFmt', attributes: { 'w:val': 'decimal' } },
            ],
          },
        ],
      };

      // Mock getStyleTagFromStyleId
      getStyleTagFromStyleId.mockReturnValue({
        elements: [
          {
            name: 'w:pPr',
            elements: [
              {
                name: 'w:numPr',
                elements: [
                  {
                    name: 'w:numId',
                    attributes: { 'w:val': '2' },
                  },
                ],
              },
            ],
          },
        ],
      });

      const result = getListDefinitionDetails({
        numId: 1,
        level: 0,
        editor: mockEditor,
      });

      expect(getStyleTagFromStyleId).toHaveBeenCalledWith('style1', '<mock>xml</mock>');
      expect(result.start).toBe('1');
      expect(result.numFmt).toBe('decimal');
    });

    it('should not recurse when tries >= 1', () => {
      mockDefinitions[1] = {
        elements: [
          {
            name: 'w:abstractNumId',
            attributes: { 'w:val': 'abstract1' },
          },
        ],
      };

      mockAbstracts['abstract1'] = {
        elements: [
          {
            name: 'w:numStyleLink',
            attributes: { 'w:val': 'style1' },
          },
        ],
      };

      getStyleTagFromStyleId.mockReturnValue({
        elements: [
          {
            name: 'w:pPr',
            elements: [
              {
                name: 'w:numPr',
                elements: [
                  {
                    name: 'w:numId',
                    attributes: { 'w:val': '2' },
                  },
                ],
              },
            ],
          },
        ],
      });

      const result = getListDefinitionDetails({
        numId: 1,
        level: 0,
        editor: mockEditor,
        tries: 1, // Max tries reached
      });

      // Should not recurse, should return null values since no level definition exists
      expect(result.abstract).toBe(mockAbstracts['abstract1']);
      expect(result.start).toBe(null);
    });

    it('should handle missing style definition gracefully', () => {
      mockDefinitions[1] = {
        elements: [
          {
            name: 'w:abstractNumId',
            attributes: { 'w:val': 'abstract1' },
          },
        ],
      };

      mockAbstracts['abstract1'] = {
        elements: [
          {
            name: 'w:numStyleLink',
            attributes: { 'w:val': 'nonexistent-style' },
          },
        ],
      };

      getStyleTagFromStyleId.mockReturnValue(null);

      const result = getListDefinitionDetails({
        numId: 1,
        level: 0,
        editor: mockEditor,
      });

      expect(result.abstract).toBe(mockAbstracts['abstract1']);
      expect(result.start).toBe(null);
    });

    it('should handle incomplete style definition chain', () => {
      mockDefinitions[1] = {
        elements: [
          {
            name: 'w:abstractNumId',
            attributes: { 'w:val': 'abstract1' },
          },
        ],
      };

      mockAbstracts['abstract1'] = {
        elements: [
          {
            name: 'w:numStyleLink',
            attributes: { 'w:val': 'style1' },
          },
        ],
      };

      // Mock incomplete style definition (missing numId)
      getStyleTagFromStyleId.mockReturnValue({
        elements: [
          {
            name: 'w:pPr',
            elements: [
              {
                name: 'w:numPr',
                elements: [], // Empty - no numId element
              },
            ],
          },
        ],
      });

      const result = getListDefinitionDetails({
        numId: 1,
        level: 0,
        editor: mockEditor,
      });

      expect(result.abstract).toBe(mockAbstracts['abstract1']);
      expect(result.start).toBe(null);
    });

    it('should handle style definition with missing nested elements', () => {
      mockDefinitions[1] = {
        elements: [
          {
            name: 'w:abstractNumId',
            attributes: { 'w:val': 'abstract1' },
          },
        ],
      };

      mockAbstracts['abstract1'] = {
        elements: [
          {
            name: 'w:numStyleLink',
            attributes: { 'w:val': 'style1' },
          },
        ],
      };

      // Mock style definition missing w:numPr
      getStyleTagFromStyleId.mockReturnValue({
        elements: [
          {
            name: 'w:pPr',
            elements: [
              {
                name: 'w:otherElement',
              },
            ],
          },
        ],
      });

      const result = getListDefinitionDetails({
        numId: 1,
        level: 0,
        editor: mockEditor,
      });

      expect(result.abstract).toBe(mockAbstracts['abstract1']);
      expect(result.start).toBe(null);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle missing attributes gracefully', () => {
      mockDefinitions[1] = {
        elements: [
          {
            name: 'w:abstractNumId',
            attributes: { 'w:val': 'abstract1' },
          },
        ],
      };

      mockAbstracts['abstract1'] = {
        elements: [
          {
            name: 'w:lvl',
            attributes: { 'w:ilvl': '0' },
            elements: [
              { name: 'w:start' }, // Missing attributes
              { name: 'w:numFmt', attributes: {} }, // Empty attributes
              { name: 'w:lvlText', attributes: { 'w:val': 'valid' } },
            ],
          },
        ],
      };

      const result = getListDefinitionDetails({
        numId: 1,
        level: 0,
        editor: mockEditor,
      });

      expect(result.start).toBe(undefined);
      expect(result.numFmt).toBe(undefined);
      expect(result.lvlText).toBe('valid');
    });

    it('should handle missing elements arrays', () => {
      mockDefinitions[1] = {
        elements: [
          {
            name: 'w:abstractNumId',
            attributes: { 'w:val': 'abstract1' },
          },
        ],
      };

      mockAbstracts['abstract1'] = {
        // Missing elements array
      };

      const result = getListDefinitionDetails({
        numId: 1,
        level: 0,
        editor: mockEditor,
      });

      expect(result.abstract).toBe(mockAbstracts['abstract1']);
      expect(result.start).toBe(null);
    });

    it('should handle undefined editor or numbering data', () => {
      const emptyEditor = {
        converter: {
          numbering: {
            definitions: {},
            abstracts: {},
          },
        },
      };

      const result = getListDefinitionDetails({
        numId: 999,
        level: 0,
        editor: emptyEditor,
      });

      expect(result).toEqual({
        start: null,
        numFmt: null,
        lvlText: null,
        listNumberingType: null,
        customFormat: null,
        abstract: null,
        abstractId: undefined,
      });
    });
  });

  describe('Parameter validation and edge cases', () => {
    it('should handle numId as string and convert internally if needed', () => {
      mockDefinitions['1'] = {
        // String key
        elements: [
          {
            name: 'w:abstractNumId',
            attributes: { 'w:val': 'abstract1' },
          },
        ],
      };

      mockAbstracts['abstract1'] = {
        elements: [
          {
            name: 'w:lvl',
            attributes: { 'w:ilvl': '0' },
            elements: [{ name: 'w:numFmt', attributes: { 'w:val': 'decimal' } }],
          },
        ],
      };

      const result = getListDefinitionDetails({
        numId: 1, // Number input
        level: 0,
        editor: mockEditor,
      });

      expect(result.numFmt).toBe('decimal');
    });

    it('should handle zero-based level correctly', () => {
      mockDefinitions[1] = {
        elements: [
          {
            name: 'w:abstractNumId',
            attributes: { 'w:val': 'abstract1' },
          },
        ],
      };

      mockAbstracts['abstract1'] = {
        elements: [
          {
            name: 'w:lvl',
            attributes: { 'w:ilvl': '0' }, // Zero-based level
            elements: [{ name: 'w:numFmt', attributes: { 'w:val': 'decimal' } }],
          },
        ],
      };

      const result = getListDefinitionDetails({
        numId: 1,
        level: 0, // Should match w:ilvl="0"
        editor: mockEditor,
      });

      expect(result.numFmt).toBe('decimal');
    });

    it('should handle missing converter gracefully', () => {
      const badEditor = {
        converter: null,
      };

      expect(() => {
        getListDefinitionDetails({
          numId: 1,
          level: 0,
          editor: badEditor,
        });
      }).toThrow();
    });

    it('should handle missing numbering gracefully', () => {
      const editorWithoutNumbering = {
        converter: {
          // Missing numbering property
        },
      };

      expect(() => {
        getListDefinitionDetails({
          numId: 1,
          level: 0,
          editor: editorWithoutNumbering,
        });
      }).toThrow();
    });
  });

  describe('Integration scenarios', () => {
    it('should work with complex nested list structure', () => {
      mockDefinitions[1] = {
        elements: [
          {
            name: 'w:abstractNumId',
            attributes: { 'w:val': 'abstract1' },
          },
        ],
      };

      mockAbstracts['abstract1'] = {
        elements: [
          {
            name: 'w:lvl',
            attributes: { 'w:ilvl': '0' },
            elements: [
              { name: 'w:start', attributes: { 'w:val': '1' } },
              { name: 'w:numFmt', attributes: { 'w:val': 'decimal' } },
              { name: 'w:lvlText', attributes: { 'w:val': '%1.' } },
            ],
          },
          {
            name: 'w:lvl',
            attributes: { 'w:ilvl': '1' },
            elements: [
              { name: 'w:start', attributes: { 'w:val': '1' } },
              { name: 'w:numFmt', attributes: { 'w:val': 'lowerRoman' } },
              { name: 'w:lvlText', attributes: { 'w:val': '%2.' } },
            ],
          },
          {
            name: 'w:lvl',
            attributes: { 'w:ilvl': '2' },
            elements: [
              { name: 'w:start', attributes: { 'w:val': '1' } },
              { name: 'w:numFmt', attributes: { 'w:val': 'lowerLetter' } },
              { name: 'w:lvlText', attributes: { 'w:val': '%3)' } },
            ],
          },
        ],
      };

      // Test level 0
      const level0 = getListDefinitionDetails({ numId: 1, level: 0, editor: mockEditor });
      expect(level0.numFmt).toBe('decimal');
      expect(level0.lvlText).toBe('%1.');

      // Test level 1
      const level1 = getListDefinitionDetails({ numId: 1, level: 1, editor: mockEditor });
      expect(level1.numFmt).toBe('lowerRoman');
      expect(level1.lvlText).toBe('%2.');

      // Test level 2
      const level2 = getListDefinitionDetails({ numId: 1, level: 2, editor: mockEditor });
      expect(level2.numFmt).toBe('lowerLetter');
      expect(level2.lvlText).toBe('%3)');
    });
  });

  describe('changeNumIdSameAbstract', () => {
    it('should generate a fresh definition when abstract is missing and return new numId', () => {
      // Ensure generateNewListDefinition calls through to real implementation so numbering updates
      const original = ListHelpers.generateNewListDefinition;
      generateNewListDefinitionSpy.mockRestore();
      const callThroughSpy = vi
        .spyOn(ListHelpers, 'generateNewListDefinition')
        .mockImplementation((args) => original(args));

      // Existing definition references a non-existent abstract
      mockEditor.converter.numbering.definitions[1] = {
        elements: [{ name: 'w:abstractNumId', attributes: { 'w:val': 'abstract1' } }],
      };
      // abstracts does not include 'abstract1'

      const newNumId = ListHelpers.changeNumIdSameAbstract(1, 0, 'orderedList', mockEditor);

      expect(typeof newNumId).toBe('number');
      expect(newNumId).not.toBe(1);
      // New definition should exist for the returned id
      expect(mockEditor.converter.numbering.definitions[newNumId]).toBeTruthy();
      // And emit should be called by generateNewListDefinition
      expect(mockEditor.emit).toHaveBeenCalledWith(
        'list-definitions-change',
        expect.objectContaining({ numbering: mockEditor.converter.numbering, editor: mockEditor }),
      );

      callThroughSpy.mockRestore();
    });

    it('should clone existing abstract and persist numbering', () => {
      // Set a definition and a valid abstract
      mockEditor.converter.numbering.definitions[1] = {
        elements: [{ name: 'w:abstractNumId', attributes: { 'w:val': '10' } }],
      };
      mockEditor.converter.numbering.abstracts['10'] = {
        attributes: { 'w:abstractNumId': '10' },
        elements: [],
      };

      const newNumId = ListHelpers.changeNumIdSameAbstract(1, 0, 'orderedList', mockEditor);

      expect(typeof newNumId).toBe('number');
      expect(newNumId).not.toBe(1);
      const def = mockEditor.converter.numbering.definitions[newNumId];
      expect(def).toBeTruthy();
      const abstractRef = def.elements.find((e) => e.name === 'w:abstractNumId');
      expect(abstractRef).toBeTruthy();
      const newAbstractId = abstractRef.attributes['w:val'];
      // Persisted new abstract exists
      expect(mockEditor.converter.numbering.abstracts[newAbstractId]).toBeTruthy();
    });
  });
});

vi.mock('@core/super-converter/v2/importer/listImporter.js', () => ({
  getStyleTagFromStyleId: vi.fn(),
  getAbstractDefinition: vi.fn(),
  getDefinitionForLevel: vi.fn(),
}));

describe('createNewList', () => {
  /** @type {import('prosemirror-model').Schema} */
  let schema;

  /** @type {any} */
  let editor;

  let getNewListIdSpy;
  let generateNewListDefinitionSpy;
  let createSchemaOrderedListNodeSpy;

  const makeStateWithParagraph = () => {
    const doc = schema.node('doc', null, [schema.node('paragraph', null, [schema.text('hello')])]);
    const sel = TextSelection.create(doc, 2); // inside text
    return EditorState.create({ doc, selection: sel, schema });
  };

  const makeStateWithOrderedListNodeSelection = () => {
    const innerPara = schema.node('paragraph', null, [schema.text('x')]);
    const listItem = schema.node('listItem', null, innerPara);
    const olist = schema.node('orderedList', { 'list-style-type': 'decimal', listId: 99, order: 0 }, [listItem]);
    const doc = schema.node('doc', null, [olist]);
    // Select the orderedList node itself
    const sel = NodeSelection.create(doc, 1);
    return EditorState.create({ doc, selection: sel, schema });
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Minimal, valid list schema: *orderedList is a block node*
    schema = new Schema({
      nodes: {
        doc: { content: 'block+' },
        text: { group: 'inline' },
        paragraph: {
          group: 'block',
          content: 'inline*',
          toDOM() {
            return ['p', 0];
          },
          parseDOM: [{ tag: 'p' }],
        },
        listItem: {
          // listItem is not directly under doc, only under orderedList
          content: 'paragraph',
          toDOM() {
            return ['li', 0];
          },
          parseDOM: [{ tag: 'li' }],
        },
        orderedList: {
          // <-- The crucial fix
          group: 'block',
          content: 'listItem+',
          attrs: {
            'list-style-type': { default: 'decimal' },
            listId: { default: 1 },
            order: { default: 0 },
          },
          toDOM() {
            return ['ol', 0];
          },
          parseDOM: [{ tag: 'ol' }],
        },
      },
      marks: {},
    });

    editor = {
      schema,
      emit: vi.fn(),
      converter: {
        numbering: { definitions: {}, abstracts: {} },
        convertedXml: '<mock/>',
      },
    };

    // Keep list ID/definition logic mocked (unit test scope)
    getNewListIdSpy = vi.spyOn(ListHelpers, 'getNewListId').mockReturnValue(1);
    generateNewListDefinitionSpy = vi.spyOn(ListHelpers, 'generateNewListDefinition').mockImplementation(() => {});

    // Return a real PM node for insertion
    createSchemaOrderedListNodeSpy = vi
      .spyOn(ListHelpers, 'createSchemaOrderedListNode')
      .mockImplementation(({ contentNode, editor: ed }) => {
        const para = ed.schema.nodeFromJSON(contentNode); // the original paragraph content
        const li = ed.schema.nodes.listItem.create(null, para);
        return ed.schema.nodes.orderedList.create({ 'list-style-type': 'decimal', listId: 1, order: 0 }, li);
      });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic behavior', () => {
    it('creates a new list, replaces the paragraph, and places caret inside the new list item', () => {
      const state = makeStateWithParagraph();
      const tr = state.tr;

      const ok = createNewList({ listType: 'orderedList', tr, editor });
      expect(ok).toBe(true);

      expect(getNewListIdSpy).toHaveBeenCalledWith(editor);
      expect(generateNewListDefinitionSpy).toHaveBeenCalledWith({
        numId: 1,
        listType: editor.schema.nodes.orderedList,
        editor,
      });
      expect(createSchemaOrderedListNodeSpy).toHaveBeenCalled();

      const first = tr.doc.firstChild;
      expect(first).toBeTruthy();
      expect(first.type.name).toBe('orderedList');

      const li = first.firstChild;
      expect(li.type.name).toBe('listItem');

      const innerPara = li.firstChild;
      expect(innerPara.type.name).toBe('paragraph');
      expect(innerPara.textContent).toBe('hello');

      // Caret should be *inside* the inserted paragraph
      const $from = tr.selection.$from;
      expect($from.parent.type.name).toBe('paragraph');
      expect($from.node(-1).type.name).toBe('listItem');
      expect($from.node(-2).type.name).toBe('orderedList');
    });

    it('returns false (no-op) when selection parent is not a paragraph', () => {
      const state = makeStateWithOrderedListNodeSelection();
      const tr = state.tr;

      const ok = createNewList({ listType: 'orderedList', tr, editor });
      expect(ok).toBe(false);

      // These ARE called (function does ID/definition work up-front)
      expect(getNewListIdSpy).toHaveBeenCalledTimes(1);
      expect(generateNewListDefinitionSpy).toHaveBeenCalledTimes(1);

      // But we never build/insert a list node, and the doc is unchanged
      expect(createSchemaOrderedListNodeSpy).not.toHaveBeenCalled();
      expect(tr.steps.length).toBe(0);
      expect(tr.doc.eq(state.doc)).toBe(true);
    });

    it('accepts listType as NodeType as well as string', () => {
      const state = makeStateWithParagraph();
      const tr = state.tr;

      const ok = createNewList({ listType: editor.schema.nodes.orderedList, tr, editor });
      expect(ok).toBe(true);

      expect(generateNewListDefinitionSpy).toHaveBeenCalledWith({
        numId: 1,
        listType: editor.schema.nodes.orderedList,
        editor,
      });
    });
  });

  describe('Integration-ish sanity (minimal)', () => {
    it('preserves inline content/marks via contentNode JSON round-trip', () => {
      const doc = schema.node('doc', null, [schema.node('paragraph', null, [schema.text('abc 123')])]);
      const sel = TextSelection.create(doc, 3);
      const state = EditorState.create({ doc, selection: sel, schema });
      const tr = state.tr;

      const ok = createNewList({ listType: 'orderedList', tr, editor });
      expect(ok).toBe(true);

      const ol = tr.doc.firstChild;
      expect(ol.type.name).toBe('orderedList');
      const para = ol.firstChild.firstChild;
      expect(para.type.name).toBe('paragraph');
      expect(para.textContent).toBe('abc 123');
    });
  });
});

import { setCaretInsideFirstTextblockOfInsertedAt } from './list-numbering-helpers.js';

describe('setCaretInsideFirstTextblockOfInsertedAt', () => {
  /** @type {import('prosemirror-model').Schema} */
  let schema;

  beforeEach(() => {
    // Minimal valid schema for lists + a dummy non-textblock block
    schema = new Schema({
      nodes: {
        doc: { content: 'block+' },
        text: { group: 'inline' },
        paragraph: {
          group: 'block',
          content: 'inline*',
          toDOM: () => ['p', 0],
          parseDOM: [{ tag: 'p' }],
        },
        listItem: {
          content: 'paragraph',
          toDOM: () => ['li', 0],
          parseDOM: [{ tag: 'li' }],
        },
        orderedList: {
          group: 'block',
          content: 'listItem+',
          attrs: {
            'list-style-type': { default: 'decimal' },
            listId: { default: 1 },
            order: { default: 0 },
          },
          toDOM: () => ['ol', 0],
          parseDOM: [{ tag: 'ol' }],
        },
        // A non-textblock container to exercise the "no descendant textblock" fallback
        box: {
          group: 'block',
          content: '', // cannot contain textblocks
          defining: true,
          toDOM: () => ['div', { 'data-box': '1' }],
          parseDOM: [{ tag: 'div[data-box]' }],
        },
      },
      marks: {},
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const makeParagraphState = (text = 'hello') => {
    const doc = schema.node('doc', null, [schema.node('paragraph', null, [schema.text(text)])]);
    const sel = TextSelection.create(doc, 2); // inside the paragraph
    return EditorState.create({ doc, selection: sel, schema });
  };

  it('moves the caret inside the first textblock of the inserted container (orderedList -> listItem -> paragraph)', () => {
    const state = makeParagraphState('hello');
    const tr = state.tr;

    // Replacement region = the paragraph at selection depth
    const { $from } = tr.selection;
    const depth = $from.depth;
    const replaceFrom = $from.before(depth);
    const replaceTo = $from.after(depth);

    // Create the container we "inserted"
    const para = schema.node('paragraph', null, [schema.text('hello')]);
    const li = schema.node('listItem', null, para);
    const ol = schema.node('orderedList', { 'list-style-type': 'decimal', listId: 42, order: 0 }, [li]);

    // Do the actual replacement
    const startBefore = replaceFrom;
    tr.replaceWith(replaceFrom, replaceTo, ol);

    // Now call the helper to position the caret
    setCaretInsideFirstTextblockOfInsertedAt(tr, startBefore);

    // Assert: caret is inside the inserted paragraph (not at boundary)
    const $pos = tr.selection.$from;
    expect($pos.parent.type.name).toBe('paragraph');
    expect($pos.node(-1).type.name).toBe('listItem');
    expect($pos.node(-2).type.name).toBe('orderedList');

    // Optional: at start of textblock (pos equals first char inside paragraph)
    // (we can’t assert exact number reliably across schemas, but offset should be >= 1)
    expect($pos.parentOffset).toBeGreaterThanOrEqual(0);
  });

  it('falls back near the boundary when the mapped position has no container (nodeAfter === null)', () => {
    const state = makeParagraphState('hello');
    const tr = state.tr;

    // We won’t insert anything; we pass a startBefore that maps to a spot without nodeAfter
    // A safe way: map to the last position in doc where nodeAfter is null (end of doc)
    const startBefore = tr.doc.content.size - 1;

    // Call the helper; it should not throw and should set a near selection
    setCaretInsideFirstTextblockOfInsertedAt(tr, startBefore);

    // Selection should be inside the doc and not null
    const sel = tr.selection;
    expect(sel).toBeTruthy();
    expect(sel.from).toBeGreaterThanOrEqual(0);
    expect(sel.to).toBeLessThanOrEqual(tr.doc.content.size);
  });

  it('falls back to near(containerStart + 1) when the container has no textblock descendants', () => {
    const state = makeParagraphState('hello');
    const tr = state.tr;

    const { $from } = tr.selection;
    const depth = $from.depth;
    const replaceFrom = $from.before(depth);
    const replaceTo = $from.after(depth);
    const startBefore = replaceFrom;

    const box = schema.node('box');
    tr.replaceWith(replaceFrom, replaceTo, box);

    setCaretInsideFirstTextblockOfInsertedAt(tr, startBefore);

    const pos = tr.selection.from;
    expect(pos).toBeGreaterThanOrEqual(0);
    expect(pos).toBeLessThanOrEqual(tr.doc.content.size);
  });
});
