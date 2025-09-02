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

    // No-op at level 0 (consume Shift+Tab)
    if (currLevel <= 0) return true;

    const newLevel = currLevel - 1;

    // Resolve numId: prefer parent's listId (keeps the current container’s definition),
    // else keep the item's, else mint a new one.
    const parentNumId = parentList.node?.attrs?.listId ?? null;
    let numId = parentNumId ?? attrs.numId ?? null;

    let createdNewId = false;
    if (numId == null && ListHelpers.getNewListId) {
      numId = ListHelpers.getNewListId(editor);
      createdNewId = true;
    }

    // Only create a definition when we *just* minted the id.
    // Never re-generate for an existing id (prevents clobbering bullet/ordered mapping).
    if (createdNewId && numId != null && ListHelpers.generateNewListDefinition) {
      ListHelpers.generateNewListDefinition({
        numId,
        listType: parentList.node.type,
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
