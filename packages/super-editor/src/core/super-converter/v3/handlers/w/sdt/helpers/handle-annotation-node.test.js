import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleAnnotationNode, parseAnnotationMarks, getAttrsFromElements } from './handle-annotation-node';
import { parseTagValueJSON } from './parse-tag-value-json';
import { parseMarks } from '@converter/v2/importer/markImporter';
import { generateDocxRandomId } from '@core/helpers/generateDocxRandomId';

// Mock dependencies
vi.mock('./parse-tag-value-json', () => ({
  parseTagValueJSON: vi.fn(),
}));
vi.mock('@converter/v2/importer/markImporter', () => ({
  parseMarks: vi.fn(() => []),
}));
vi.mock('@core/helpers/generateDocxRandomId', () => ({
  generateDocxRandomId: vi.fn(() => 'test-hash-1234'),
}));

describe('handleAnnotationNode', () => {
  const createNode = (sdtPrElements = [], sdtContentElements = []) => ({
    name: 'w:sdt',
    elements: [
      {
        name: 'w:sdtPr',
        elements: sdtPrElements,
      },
      {
        name: 'w:sdtContent',
        elements: sdtContentElements,
      },
    ],
  });

  const createTag = (value) => ({
    name: 'w:tag',
    attributes: { 'w:val': value },
  });

  const createAlias = (value) => ({
    name: 'w:alias',
    attributes: { 'w:val': value },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    parseMarks.mockReturnValue([]);
  });

  it('returns null when nodes array is empty', () => {
    const params = { nodes: [] };
    const result = handleAnnotationNode(params);

    expect(result).toBeNull();
  });

  it('returns null when fieldId or type is missing', () => {
    const node = createNode([createTag('test-field')]);
    const params = { nodes: [node], editor: { options: {} } };

    parseTagValueJSON.mockReturnValue({});

    const result = handleAnnotationNode(params);

    expect(result).toBeNull();
  });

  it('processes JSON tag value correctly', () => {
    const tagValue = '{"fieldId": "123", "fieldTypeShort": "text", "displayLabel": "Test Field"}';
    const node = createNode([createTag(tagValue)]);
    const params = { nodes: [node], editor: { options: {} } };

    parseTagValueJSON.mockReturnValue({
      fieldId: '123',
      fieldTypeShort: 'text',
      displayLabel: 'Test Field',
    });

    const result = handleAnnotationNode(params);

    expect(parseTagValueJSON).toHaveBeenCalledWith(tagValue);
    expect(result).toEqual({
      type: 'text',
      text: '{{Test Field}}',
      attrs: {
        type: 'text',
        fieldId: '123',
        displayLabel: 'Test Field',
        hash: 'test-hash-1234',
      },
      marks: undefined,
    });
  });

  it('processes legacy format correctly', () => {
    const node = createNode([
      createTag('field-123'),
      createAlias('Legacy Field'),
      {
        name: 'w:fieldTypeShort',
        attributes: { 'w:val': 'text' },
      },
    ]);
    const params = { nodes: [node], editor: { options: {} } };

    const result = handleAnnotationNode(params);

    expect(parseTagValueJSON).not.toHaveBeenCalled();
    expect(result).toEqual({
      type: 'text',
      text: '{{Legacy Field}}',
      attrs: {
        type: 'text',
        fieldId: 'field-123',
        displayLabel: 'Legacy Field',
        multipleImage: false,
        fontFamily: undefined,
        fontSize: undefined,
        textColor: undefined,
        textHighlight: undefined,
        hash: 'test-hash-1234',
      },
      marks: undefined,
    });
  });

  it('returns fieldAnnotation type when editor annotations option is enabled', () => {
    const tagValue = '{"fieldId": "123", "fieldTypeShort": "text", "displayLabel": "Test Field"}';
    const node = createNode([createTag(tagValue)]);
    const params = {
      nodes: [node],
      editor: { options: { annotations: true } },
    };

    parseTagValueJSON.mockReturnValue({
      fieldId: '123',
      fieldTypeShort: 'text',
      displayLabel: 'Test Field',
    });

    const result = handleAnnotationNode(params);

    expect(result.type).toBe('fieldAnnotation');
    expect(result).not.toHaveProperty('text');
  });
});
