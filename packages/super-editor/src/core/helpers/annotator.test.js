import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getFieldAttrs, getAllHeaderFooterEditors, AnnotatorHelpers, annotateDocument } from './annotator.js';

const { createHeaderFooterEditorMock, onHeaderFooterDataUpdateMock } = vi.hoisted(() => {
  const createHeaderFooterEditorMock = vi.fn(() => ({
    annotate: vi.fn(),
    commands: {
      updateFieldAnnotations: vi.fn(),
      deleteFieldAnnotations: vi.fn(),
      resetFieldAnnotations: vi.fn(),
    },
  }));
  const onHeaderFooterDataUpdateMock = vi.fn();
  return { createHeaderFooterEditorMock, onHeaderFooterDataUpdateMock };
});

vi.mock('@extensions/pagination/pagination-helpers.js', () => ({
  createHeaderFooterEditor: createHeaderFooterEditorMock,
  onHeaderFooterDataUpdate: onHeaderFooterDataUpdateMock,
  toggleHeaderFooterEditMode: vi.fn(),
  PaginationPluginKey: { getState: () => ({}) },
  broadcastEditorEvents: vi.fn(),
}));

globalThis.dateFormat = vi.fn(() => '2025-01-30');

const createEditorsCollection = () => [];

describe('annotator helpers', () => {
  beforeEach(() => {
    createHeaderFooterEditorMock.mockClear();
    onHeaderFooterDataUpdateMock.mockClear();
    globalThis.dateFormat.mockClear();
  });

  it('returns expected field attributes for different types', () => {
    const fieldNode = { attrs: { type: 'link' } };
    expect(getFieldAttrs(fieldNode, 'example.com')).toEqual({ linkUrl: 'http://example.com' });

    fieldNode.attrs.type = 'text';
    expect(getFieldAttrs(fieldNode, 'Hello')).toEqual({ displayLabel: 'Hello' });

    fieldNode.attrs.type = 'date';
    const attrs = getFieldAttrs(fieldNode, '2025-01-30', { input_format: 'yyyy-mm-dd' });
    expect(globalThis.dateFormat).toHaveBeenCalled();
    expect(attrs).toEqual({ displayLabel: '2025-01-30' });

    fieldNode.attrs.type = 'checkbox';
    expect(getFieldAttrs(fieldNode, 'Yes')).toEqual({ displayLabel: 'Yes' });

    fieldNode.attrs.type = 'yesno';
    expect(getFieldAttrs(fieldNode, ['yes'])).toEqual({ displayLabel: 'Yes' });

    fieldNode.attrs.type = 'image';
    expect(getFieldAttrs(fieldNode, 'http://img')).toEqual({ imageSrc: 'http://img' });

    fieldNode.attrs.type = 'html';
    expect(getFieldAttrs(fieldNode, '<p>html</p>')).toEqual({ rawHtml: '<p>html</p>' });
  });

  it('collects header/footer editors and annotates them', () => {
    const editor = {
      converter: {
        headers: {
          default: { data: { content: 'header' } },
        },
        footers: {
          default: { data: { content: 'footer' } },
        },
        headerEditors: createEditorsCollection(),
        footerEditors: createEditorsCollection(),
      },
    };

    const editors = getAllHeaderFooterEditors(editor);
    expect(createHeaderFooterEditorMock).toHaveBeenCalledTimes(2);
    expect(editors).toHaveLength(2);

    const updateAttrs = { displayLabel: 'Value' };
    AnnotatorHelpers.updateHeaderFooterFieldAnnotations({ editor, fieldIdOrArray: 'field-1', attrs: updateAttrs });
    const updateEditors = createHeaderFooterEditorMock.mock.results.slice(2, 4).map((result) => result.value);
    updateEditors.forEach((sectionEditor) => {
      expect(sectionEditor.commands.updateFieldAnnotations).toHaveBeenCalledWith('field-1', updateAttrs);
    });

    AnnotatorHelpers.deleteHeaderFooterFieldAnnotations({ editor, fieldIdOrArray: 'field-1' });
    const deleteEditors = createHeaderFooterEditorMock.mock.results.slice(4, 6).map((result) => result.value);
    deleteEditors.forEach((sectionEditor) => {
      expect(sectionEditor.commands.deleteFieldAnnotations).toHaveBeenCalledWith('field-1');
    });

    AnnotatorHelpers.resetHeaderFooterFieldAnnotations({ editor });
    const resetEditors = createHeaderFooterEditorMock.mock.results.slice(6, 8).map((result) => result.value);
    resetEditors.forEach((sectionEditor) => {
      expect(sectionEditor.commands.resetFieldAnnotations).toHaveBeenCalled();
    });

    expect(onHeaderFooterDataUpdateMock).toHaveBeenCalledTimes(6);
  });

  it('annotates document nodes and prunes empty fields', () => {
    const FieldType = Symbol('fieldAnnotation');
    const annotationValues = [{ input_id: 'field-1', input_value: 'Hello', input_field_type: 'TEXTINPUT' }];

    const editor = {
      converter: {
        headers: {},
        footers: {},
        headerEditors: createEditorsCollection(),
        footerEditors: createEditorsCollection(),
      },
    };

    const node = {
      type: FieldType,
      attrs: { type: 'text', fieldType: 'TEXTINPUT', fieldId: 'field-1', generatorIndex: null },
      nodeSize: 1,
    };

    const tr = {
      doc: {
        descendants: (cb) => cb(node, 5),
      },
      setNodeMarkup: vi.fn(function () {
        return this;
      }),
      delete: vi.fn(function () {
        return this;
      }),
    };

    const schema = { nodes: { fieldAnnotation: FieldType } };
    const updatedTr = annotateDocument({
      annotationValues,
      hiddenFieldIds: [],
      removeEmptyFields: true,
      schema,
      tr,
      editor,
    });

    expect(updatedTr.setNodeMarkup).toHaveBeenCalledWith(
      5,
      undefined,
      expect.objectContaining({ displayLabel: 'Hello' }),
    );

    // Now ensure missing values queue deletions
    const emptyNode = {
      type: FieldType,
      attrs: { type: 'text', fieldType: 'TEXTINPUT', fieldId: 'missing', generatorIndex: null },
      nodeSize: 2,
    };

    const trRemove = {
      doc: {
        descendants: (cb) => cb(emptyNode, 3),
      },
      setNodeMarkup: vi.fn(function () {
        return this;
      }),
      delete: vi.fn(function () {
        return this;
      }),
    };

    annotateDocument({
      annotationValues,
      hiddenFieldIds: [],
      removeEmptyFields: true,
      schema,
      tr: trRemove,
      editor,
    });

    expect(trRemove.delete).toHaveBeenCalledWith(3, 5);
  });
});
