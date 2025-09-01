// @ts-check
import { findParentNode } from '@helpers/index.js';
import { ListHelpers } from '@helpers/list-numbering-helpers.js';

/**
 * Decreases the indent level of the current list item.
 * @returns {Function} A ProseMirror command function.
 */
export const decreaseListIndent =
  () =>
  ({ editor, tr }) => {
    const { state } = editor;

    // 1) Current list item
    const currentItem =
      (ListHelpers.getCurrentListItem && ListHelpers.getCurrentListItem(state)) ||
      findParentNode((n) => n.type && n.type.name === 'listItem')(state.selection);
    if (!currentItem) return false;

    // 2) Parent list (ordered OR bullet)
    const parentOrdered = ListHelpers.getParentOrderedList && ListHelpers.getParentOrderedList(state);
    const parentBullet = ListHelpers.getParentBulletList && ListHelpers.getParentBulletList(state);

    const parentList =
      parentOrdered ||
      parentBullet ||
      findParentNode((n) => n.type && (n.type.name === 'orderedList' || n.type.name === 'bulletList'))(state.selection);
    if (!parentList) return false;

    const attrs = currentItem.node.attrs || {};
    const currLevel = typeof attrs.level === 'number' ? attrs.level : 0;

    // No-op at level 0 (consume the key so the browser doesn't Shift-Tab focus)
    if (currLevel <= 0) {
      return true;
    }

    // Decrease level by 1; keep/repair numId
    const newLevel = currLevel - 1;
    let numId =
      attrs.numId ??
      parentList.node?.attrs?.listId ??
      (ListHelpers.getNewListId ? ListHelpers.getNewListId(editor) : null);

    // Ensure definition exists for this list/id (safe no-op if already exists)
    if (numId != null && ListHelpers.generateNewListDefinition) {
      ListHelpers.generateNewListDefinition({
        numId,
        listType: parentList.node.type, // orderedList or bulletList NodeType
        editor,
      });
    }

    tr.setNodeMarkup(currentItem.pos, null, {
      ...attrs,
      level: newLevel,
      numId,
    });

    return true;
  };
