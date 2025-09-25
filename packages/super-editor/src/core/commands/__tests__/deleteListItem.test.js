import { describe, it, expect } from 'vitest';
import { EditorState, NodeSelection, TextSelection } from 'prosemirror-state';
import { schema, doc, p } from 'prosemirror-test-builder';
import { deleteListItem } from '../deleteListItem.js';
import { schemaWithLists } from './schemaWithLists.js';

const findPos = (docNode, typeName) => {
  let found = null;
  docNode.descendants((node, pos) => {
    if (found == null && node.type.name === typeName) {
      found = pos;
      return false;
    }
    return undefined;
  });
  if (found == null) throw new Error(`Node ${typeName} not found`);
  return found;
};

describe('deleteListItem', () => {
  it('removes fully selected block nodes', () => {
    const docNode = doc(p('First'), p('Second'));
    const paraPos = findPos(docNode, 'paragraph');
    const selection = NodeSelection.create(docNode, paraPos);
    const state = EditorState.create({ schema, doc: docNode, selection });
    const tr = state.tr;

    const result = deleteListItem()({ state, tr, dispatch: () => {} });

    expect(result).toBe(true);
    expect(tr.doc.childCount).toBe(1);
    expect(tr.doc.firstChild.textContent).toBe('Second');
    expect(tr.selection.from).toBe(paraPos + 1);
  });

  it('returns false when cursor is not at start of list item', () => {
    const paragraph = schemaWithLists.node('paragraph', null, [schemaWithLists.text('Item 1')]);
    const listItem = schemaWithLists.node('listItem', null, [paragraph]);
    const bulletList = schemaWithLists.node('bulletList', null, [listItem]);
    const docNode = schemaWithLists.node('doc', null, [bulletList]);
    const selection = TextSelection.create(docNode, 4);
    const state = EditorState.create({ schema: schemaWithLists, doc: docNode, selection });
    const tr = state.tr;

    const result = deleteListItem()({ state, tr, dispatch: () => {} });

    expect(result).toBe(false);
    expect(tr.steps).toHaveLength(0);
  });

  it('replaces list with paragraph when deleting at start of list item', () => {
    const paragraph = schemaWithLists.node('paragraph', null, [schemaWithLists.text('Item 1')]);
    const listItem = schemaWithLists.node('listItem', null, [paragraph]);
    const bulletList = schemaWithLists.node('bulletList', null, [listItem]);
    const docNode = schemaWithLists.node('doc', null, [bulletList]);
    const selection = TextSelection.create(docNode, 3);
    const state = EditorState.create({ schema: schemaWithLists, doc: docNode, selection });
    const tr = state.tr;

    const result = deleteListItem()({ state, tr, dispatch: () => {} });

    expect(result).toBe(true);
    expect(tr.getMeta('updateListSync')).toBe(true);
    expect(tr.doc.childCount).toBe(1);
    expect(tr.doc.firstChild.type.name).toBe('paragraph');
    expect(tr.doc.firstChild.textContent).toBe('Item 1');
    expect(tr.selection.from).toBe(1);
  });
});
