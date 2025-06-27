import { canJoin } from 'prosemirror-transform';
import { getNodeType } from '../helpers/getNodeType.js';
import { findParentNode } from '../helpers/findParentNode.js';
import { ListHelpers } from '@helpers/list-numbering-helpers.js';

/**
 * Join list backwards.
 * @param tr Transaction.
 * @param listType List type.
 */
const joinListBackwards = (tr, listType) => {
  const list = findParentNode((node) => node.type === listType)(tr.selection);
  if (!list) return true;

  const before = tr.doc.resolve(Math.max(0, list.pos - 1)).before(list.depth);
  if (before === undefined) return true;

  const nodeBefore = tr.doc.nodeAt(before);
  const canJoinBackwards = list.node.type === nodeBefore?.type && canJoin(tr.doc, list.pos);
  if (!canJoinBackwards) return true;

  tr.join(list.pos);
  return true;
};

/**
 * Join list forwards.
 * @param tr Transaction.
 * @param listType List type.
 */
const joinListForwards = (tr, listType) => {
  const list = findParentNode((node) => node.type === listType)(tr.selection);
  if (!list) return true;

  const after = tr.doc.resolve(list.start).after(list.depth);
  if (after === undefined) return true;

  const nodeAfter = tr.doc.nodeAt(after);
  const canJoinForwards = list.node.type === nodeAfter?.type && canJoin(tr.doc, after);
  if (!canJoinForwards) return true;

  tr.join(after);
  return true;
};

/**
 * Toggle between list types.
 * @param listTypeOrName The type/name of the list.
 * @param itemTypeOrName The type/name of the list item.
 * @param keepMarks Keep marks when toggling.
 * @param attributes Attrs for the new list.
 */
export const toggleList = (listType) => ({ editor, state, tr }) => {
  const isList = findParentNode((node) => node.type === listType)(tr.selection);

  if (!isList) {
    return ListHelpers.createNewList({ listType, tr, editor });
  }

  return false;
};
