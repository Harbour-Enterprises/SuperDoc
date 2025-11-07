// @ts-check
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { findParentNode } from '../helpers/index.js';
import { decreaseListIndent } from './decreaseListIndent.js';

vi.mock('../helpers/list-numbering-helpers.js', () => {
  return {
    ListHelpers: {
      hasListDefinition: vi.fn().mockReturnValue(true),
    },
  };
});

vi.mock('../helpers/index.js', () => {
  return {
    findParentNode: vi.fn().mockReturnValue(vi.fn().mockReturnValue(null)),
  };
});

describe('decreaseListIndent', () => {
  /** @type {{ state: any }, converter: { convertedXml: any, numbering: { definitions: any, abstracts: any } }} */
  let editor;
  /** @type {{ setNodeMarkup: ReturnType<typeof vi.fn> }} */
  let tr;

  beforeEach(() => {
    vi.clearAllMocks();
    editor = {
      state: { selection: {} },
      converter: { convertedXml: {}, numbering: { definitions: {}, abstracts: {} } },
    };
    tr = { setNodeMarkup: vi.fn() };
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('returns false when no current list item is found', () => {
    findParentNode.mockReturnValue(vi.fn().mockReturnValue(null));
    const result = decreaseListIndent()({ editor, tr });
    expect(result).toBe(false);
    expect(tr.setNodeMarkup).not.toHaveBeenCalled();
  });

  it('no-ops (returns true) at level 0 and does not mutate the doc', () => {
    const currentItem = {
      node: { type: { name: 'listItem' }, attrs: { numberingProperties: { ilvl: 0, numId: 1 } } },
      pos: 5,
    };

    findParentNode.mockReturnValue(vi.fn().mockReturnValue(currentItem));

    const result = decreaseListIndent()({ editor, tr });
    expect(result).toBe(true);
    expect(tr.setNodeMarkup).not.toHaveBeenCalled();
  });

  it('decreases level by 1', () => {
    const currentItem = {
      node: { type: { name: 'listItem' }, attrs: { numberingProperties: { ilvl: 2, numId: 123 } } },
      pos: 42,
    };

    findParentNode.mockReturnValue(vi.fn().mockReturnValue(currentItem));

    const result = decreaseListIndent()({ editor, tr });

    expect(result).toBe(true);
    expect(tr.setNodeMarkup).toHaveBeenCalledTimes(1);
    expect(tr.setNodeMarkup).toHaveBeenCalledWith(42, null, {
      indent: null,
      listRendering: null,
      numberingProperties: {
        ilvl: 1,
        numId: 123,
      },
      paragraphProperties: {
        numberingProperties: {
          ilvl: 1,
          numId: 123,
        },
      },
      spacing: null,
      styleId: null,
    });
  });

  it('outdents each list item covered by a multi-selection', () => {
    const schema = new Schema({
      nodes: {
        doc: { content: 'block+' },
        text: {},
        paragraph: {
          group: 'block',
          content: 'text*',
          parseDOM: [{ tag: 'p' }],
          toDOM: () => ['p', 0],
        },
        orderedList: {
          group: 'block',
          content: 'listItem+',
          attrs: {
            listId: { default: null },
          },
          toDOM: (node) => ['ol', { 'data-list-id': node.attrs.listId ?? '' }, 0],
        },
        bulletList: {
          group: 'block',
          content: 'listItem+',
          attrs: {
            listId: { default: null },
          },
          toDOM: (node) => ['ul', { 'data-list-id': node.attrs.listId ?? '' }, 0],
        },
        listItem: {
          content: 'paragraph block*',
          attrs: {
            level: { default: 0 },
            numId: { default: null },
          },
          toDOM: (node) => ['li', { 'data-level': node.attrs.level, 'data-num-id': node.attrs.numId ?? '' }, 0],
        },
      },
      marks: {},
    });

    const first = schema.node('listItem', { level: 3, numId: 900 }, [
      schema.node('paragraph', null, [schema.text('first')]),
    ]);
    const second = schema.node('listItem', { level: 2, numId: 900 }, [
      schema.node('paragraph', null, [schema.text('second')]),
    ]);
    const list = schema.node('orderedList', { listId: 900 }, [first, second]);
    const doc = schema.node('doc', null, [list]);

    let anchor = 1;
    let head = 1;
    doc.descendants((node, pos) => {
      if (!node.isText) return true;
      if (node.text === 'first') anchor = pos + 1;
      if (node.text === 'second') head = pos + node.nodeSize;
      return true;
    });

    const selection = TextSelection.create(doc, anchor, head);
    const state = EditorState.create({ schema, doc, selection });
    const pmTr = state.tr;
    const richEditor = { state, schema };

    const cmd = decreaseListIndent();
    const result = cmd({ editor: richEditor, tr: pmTr });

    expect(result).toBe(true);
    expect(ListHelpers.getNewListId).not.toHaveBeenCalled();
    expect(ListHelpers.generateNewListDefinition).not.toHaveBeenCalled();

    const levels = [];
    const numIds = [];
    pmTr.doc.descendants((node) => {
      if (node.type === schema.nodes.listItem) {
        levels.push(node.attrs.level);
        numIds.push(node.attrs.numId);
        return false;
      }
      return true;
    });

    expect(levels).toEqual([2, 1]);
    expect(numIds).toEqual([900, 900]);
  });
});
