// @ts-check
import { describe, it, expect, vi, beforeEach } from 'vitest';

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

const createResolvedPos = ({ pos = 0, before = pos, parent = null } = {}) => ({
  pos,
  parent,
  depth: parent ? 1 : 0,
  before: () => before,
});

const createSelection = (fromConfig = {}, toConfig = {}) => {
  const $from = createResolvedPos(fromConfig);
  const $to = createResolvedPos(toConfig);
  return {
    $from,
    $to,
    ranges: [{ $from, $to }],
  };
};

describe('changeListLevel', () => {
  /** @type {{ state: any, converter: { convertedXml: any, numbering: { definitions: any, abstracts: any } } }} */
  let editor;
  /** @type {{ setNodeMarkup: ReturnType<typeof vi.fn> }} */
  let tr;
  /** @type {{ nodesBetween: ReturnType<typeof vi.fn> }} */
  let rootNode;
  /** @type<Array<{ node: any, pos: number }>> */
  let nodesBetweenSequence;
  /** @type {any} */
  let selection;

  beforeEach(() => {
    vi.clearAllMocks();

    nodesBetweenSequence = [];
    rootNode = {
      nodesBetween: vi.fn((_from, _to, callback) => {
        nodesBetweenSequence.forEach(({ node, pos }) => callback(node, pos));
      }),
    };

    selection = createSelection({ pos: 0, before: 0 }, { pos: 1000, before: 1000 });

    editor = {
      state: {
        doc: rootNode,
        selection,
      },
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
    expect(rootNode.nodesBetween).toHaveBeenCalled();
    expect(ListHelpers.hasListDefinition).not.toHaveBeenCalled();
    expect(tr.setNodeMarkup).not.toHaveBeenCalled();
  });

  it('returns true without updating when the new level would be negative', () => {
    const node = {
      type: { name: 'paragraph' },
      attrs: {
        numberingProperties: { ilvl: 0, numId: 5 },
        paragraphProperties: { numberingProperties: { ilvl: 0, numId: 5 } },
        listRendering: {},
      },
    };
    nodesBetweenSequence.push({ node, pos: 10 });

    const result = changeListLevel(-1, editor, tr);

    expect(result).toBe(true);
    expect(ListHelpers.hasListDefinition).not.toHaveBeenCalled();
    expect(tr.setNodeMarkup).not.toHaveBeenCalled();
  });

  it('coerces ilvl strings before applying the delta', () => {
    const node = {
      type: { name: 'paragraph' },
      attrs: {
        numberingProperties: { ilvl: '0', numId: 42 },
        paragraphProperties: { numberingProperties: { ilvl: '0', numId: 42 } },
        listRendering: {},
      },
    };

    nodesBetweenSequence.push({ node, pos: 18 });

    const result = changeListLevel(1, editor, tr);

    expect(result).toBe(true);
    expect(ListHelpers.hasListDefinition).toHaveBeenCalledWith(editor, 42, 1);
    expect(tr.setNodeMarkup).toHaveBeenCalledWith(
      18,
      null,
      expect.objectContaining({
        numberingProperties: { ilvl: 1, numId: 42 },
      }),
    );
  });

  it('returns false when list definition for target level is missing', () => {
    const node = {
      type: { name: 'paragraph' },
      attrs: {
        numberingProperties: { ilvl: 1, numId: 99 },
        paragraphProperties: { numberingProperties: { ilvl: 1, numId: 99 } },
        listRendering: {},
      },
    };

    nodesBetweenSequence.push({ node, pos: 15 });
    ListHelpers.hasListDefinition.mockReturnValue(false);

    const result = changeListLevel(1, editor, tr);

    expect(result).toBe(false);
    expect(tr.setNodeMarkup).not.toHaveBeenCalled();
  });

  it('updates numbering properties and resolves paragraph properties when the level change is valid', () => {
    const nodes = [
      {
        type: { name: 'paragraph' },
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
      {
        type: { name: 'paragraph' },
        attrs: {
          numberingProperties: { ilvl: 2, numId: 123 },
          paragraphProperties: {
            numberingProperties: { ilvl: 2, numId: 123 },
            keepLines: false,
          },
          listRendering: { foo: 'baz' },
          someOtherAttr: 'stay',
        },
      },
    ];

    nodesBetweenSequence.push({ node: nodes[0], pos: 21 }, { node: nodes[1], pos: 30 });

    const resolvedProps = {
      indent: { left: 1440 },
      spacing: { before: 120, after: 240 },
      styleId: 'ListParagraph',
    };

    resolveParagraphProperties.mockReturnValue(resolvedProps);

    const result = changeListLevel(1, editor, tr);

    expect(result).toBe(true);
    expect(ListHelpers.hasListDefinition).toHaveBeenNthCalledWith(1, editor, 123, 2);
    expect(ListHelpers.hasListDefinition).toHaveBeenNthCalledWith(2, editor, 123, 3);
    expect(tr.setNodeMarkup).toHaveBeenCalledTimes(2);

    const firstCall = tr.setNodeMarkup.mock.calls[0];
    const secondCall = tr.setNodeMarkup.mock.calls[1];

    expect(firstCall[0]).toBe(21);
    expect(firstCall[1]).toBeNull();
    expect(firstCall[2].numberingProperties).toEqual({ ilvl: 2, numId: 123 });
    expect(firstCall[2].paragraphProperties).toEqual({
      numberingProperties: { ilvl: 2, numId: 123 },
      keepLines: true,
    });

    expect(secondCall[0]).toBe(30);
    expect(secondCall[2].numberingProperties).toEqual({ ilvl: 3, numId: 123 });
    expect(secondCall[2].paragraphProperties).toEqual({
      numberingProperties: { ilvl: 3, numId: 123 },
      keepLines: false,
    });

    expect(resolveParagraphProperties).toHaveBeenCalledTimes(2);
  });

  it('falls back to the current list item when the selection range contributes none', () => {
    const fallbackItem = {
      node: {
        attrs: {
          numberingProperties: { ilvl: 1, numId: 321 },
          paragraphProperties: { numberingProperties: { ilvl: 1, numId: 321 } },
          listRendering: {},
        },
      },
      pos: 42,
    };

    findParentNode.mockReturnValue(() => fallbackItem);

    const result = changeListLevel(1, editor, tr);

    expect(result).toBe(true);
    expect(ListHelpers.hasListDefinition).toHaveBeenCalledWith(editor, 321, 2);
    expect(tr.setNodeMarkup).toHaveBeenCalledTimes(1);
  });

  it('includes partially selected list items at the selection edges', () => {
    const firstNode = {
      type: { name: 'paragraph' },
      attrs: {
        numberingProperties: { ilvl: 0, numId: 7 },
        paragraphProperties: { numberingProperties: { ilvl: 0, numId: 7 } },
        listRendering: {},
      },
    };
    const middleNode = {
      type: { name: 'paragraph' },
      attrs: {
        numberingProperties: { ilvl: 1, numId: 7 },
        paragraphProperties: { numberingProperties: { ilvl: 1, numId: 7 } },
        listRendering: {},
      },
    };
    const lastNode = {
      type: { name: 'paragraph' },
      attrs: {
        numberingProperties: { ilvl: 2, numId: 7 },
        paragraphProperties: { numberingProperties: { ilvl: 2, numId: 7 } },
        listRendering: {},
      },
    };

    nodesBetweenSequence.push({ node: middleNode, pos: 30 });

    selection = createSelection({ pos: 5, before: 0, parent: firstNode }, { pos: 65, before: 60, parent: lastNode });
    selection.ranges = [{ $from: selection.$from, $to: selection.$to }];
    editor.state.selection = selection;

    const result = changeListLevel(1, editor, tr);

    expect(result).toBe(true);
    expect(tr.setNodeMarkup).toHaveBeenCalledTimes(3);
    expect(tr.setNodeMarkup.mock.calls.map(([pos]) => pos)).toEqual([0, 30, 60]);
  });
});
