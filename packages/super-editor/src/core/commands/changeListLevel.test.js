// @ts-check
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@helpers/list-numbering-helpers.js', () => ({
  ListHelpers: {
    hasListDefinition: vi.fn().mockReturnValue(true),
  },
}));

vi.mock('@helpers/index.js', () => ({
  findParentNode: vi.fn(),
}));

vi.mock('@converter/styles', () => ({
  resolveParagraphProperties: vi.fn().mockReturnValue({
    indent: null,
    spacing: null,
    styleId: null,
  }),
}));

import { changeListLevel } from './changeListLevel.js';
import { findParentNode } from '@helpers/index.js';
import { ListHelpers } from '@helpers/list-numbering-helpers.js';
import { resolveParagraphProperties } from '@converter/styles';

describe('changeListLevel', () => {
  /** @type {{ state: any, converter: { convertedXml: any, numbering: { definitions: any, abstracts: any } } }} */
  let editor;
  /** @type {{ setNodeMarkup: ReturnType<typeof vi.fn> }} */
  let tr;

  beforeEach(() => {
    vi.clearAllMocks();

    editor = {
      state: { selection: {} },
      converter: {
        convertedXml: {},
        numbering: { definitions: {}, abstracts: {} },
      },
    };
    tr = { setNodeMarkup: vi.fn() };

    findParentNode.mockReturnValue(() => null);
    ListHelpers.hasListDefinition.mockReturnValue(true);
    resolveParagraphProperties.mockReturnValue({
      indent: null,
      spacing: null,
      styleId: null,
    });
  });

  it('returns false when no current list item is found', () => {
    const result = changeListLevel(1, editor, tr);

    expect(result).toBe(false);
    expect(ListHelpers.hasListDefinition).not.toHaveBeenCalled();
    expect(tr.setNodeMarkup).not.toHaveBeenCalled();
  });

  it('returns true without updating when the new level would be negative', () => {
    const currentItem = {
      node: {
        attrs: {
          numberingProperties: { ilvl: 0, numId: 5 },
          paragraphProperties: { numberingProperties: { ilvl: 0, numId: 5 } },
        },
      },
      pos: 10,
    };

    findParentNode.mockReturnValue(() => currentItem);

    const result = changeListLevel(-1, editor, tr);

    expect(result).toBe(true);
    expect(ListHelpers.hasListDefinition).not.toHaveBeenCalled();
    expect(tr.setNodeMarkup).not.toHaveBeenCalled();
  });

  it('returns false when list definition for target level is missing', () => {
    const currentItem = {
      node: {
        attrs: {
          numberingProperties: { ilvl: 1, numId: 99 },
          paragraphProperties: { numberingProperties: { ilvl: 1, numId: 99 } },
        },
      },
      pos: 15,
    };

    findParentNode.mockReturnValue(() => currentItem);
    ListHelpers.hasListDefinition.mockReturnValue(false);

    const result = changeListLevel(1, editor, tr);

    expect(result).toBe(false);
    expect(tr.setNodeMarkup).not.toHaveBeenCalled();
  });

  it('updates numbering properties and resolves paragraph properties when the level change is valid', () => {
    const currentItem = {
      node: {
        attrs: {
          numberingProperties: { ilvl: 1, numId: 123 },
          paragraphProperties: {
            numberingProperties: { ilvl: 1, numId: 123 },
            indent: { left: 720 },
            keepLines: true,
          },
          listRendering: { foo: 'bar' },
          someOtherAttr: 'keep-me',
        },
      },
      pos: 21,
    };

    const resolvedProps = {
      indent: { left: 1440 },
      spacing: { before: 120, after: 240 },
      styleId: 'ListParagraph',
    };

    resolveParagraphProperties.mockReturnValue(resolvedProps);
    findParentNode.mockReturnValue(() => currentItem);

    const result = changeListLevel(1, editor, tr);

    expect(result).toBe(true);
    expect(ListHelpers.hasListDefinition).toHaveBeenCalledWith(editor, 123, 2);
    expect(tr.setNodeMarkup).toHaveBeenCalledTimes(1);
    expect(resolveParagraphProperties).toHaveBeenCalledWith(
      { docx: editor.converter.convertedXml, numbering: editor.converter.numbering },
      {
        numberingProperties: { ilvl: 2, numId: 123 },
        keepLines: true,
      },
      false,
      true,
    );

    const [posArg, typeArg, newAttrs] = tr.setNodeMarkup.mock.calls[0];

    expect(posArg).toBe(21);
    expect(typeArg).toBeNull();

    expect(newAttrs.numberingProperties).toEqual({ ilvl: 2, numId: 123 });
    expect(newAttrs.paragraphProperties).toEqual({
      numberingProperties: { ilvl: 2, numId: 123 },
      keepLines: true,
    });
    expect(newAttrs.listRendering).toBeNull();
    expect(newAttrs.indent).toEqual(resolvedProps.indent);
    expect(newAttrs.spacing).toEqual(resolvedProps.spacing);
    expect(newAttrs.styleId).toBe(resolvedProps.styleId);
    expect(newAttrs.someOtherAttr).toBe('keep-me');
  });
});
