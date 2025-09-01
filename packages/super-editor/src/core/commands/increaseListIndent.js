import { findParentNode } from '@helpers/index.js';
import { ListHelpers } from '@helpers/list-numbering-helpers.js';

/**
 * Increases the indent level of the current list item.
 * Works for both ordered and bullet lists, including lists toggled from ordered→bullet.
 */
export const increaseListIndent =
  () =>
  ({ editor, tr }) => {
    const { state } = editor;

    // 1) Current list item (prefer your helper; fallback to generic)
    const currentItem =
      (ListHelpers.getCurrentListItem && ListHelpers.getCurrentListItem(state)) ||
      findParentNode((n) => n.type && n.type.name === 'listItem')(state.selection);
    if (!currentItem) return false;

    // 2) Parent list (ordered OR bullet). Try helpers if available; otherwise generic.
    const parentOrdered = ListHelpers.getParentOrderedList && ListHelpers.getParentOrderedList(state);
    const parentBullet = ListHelpers.getParentBulletList && ListHelpers.getParentBulletList(state);

    const parentList =
      parentOrdered ||
      parentBullet ||
      findParentNode((n) => n.type && (n.type.name === 'orderedList' || n.type.name === 'bulletList'))(state.selection);

    if (!parentList) return false; // not inside a list container

    // 3) Compute new level; preserve numId if present (your bullets carry numId after toggle)
    const currAttrs = currentItem.node.attrs || {};
    const newLevel = (typeof currAttrs.level === 'number' ? currAttrs.level : 0) + 1;

    // If numId is missing (edge-case), try to inherit from parent or mint a new one.
    let numId = currAttrs.numId;
    if (numId == null) {
      // Prefer container's listId if present, else generate
      numId = parentList.node?.attrs?.listId ?? ListHelpers.getNewListId(editor);
      // Ensure definition exists for this list type/id (safe no-op if already exists)
      if (ListHelpers.generateNewListDefinition) {
        const listType =
          parentList.node.type === editor.schema.nodes.orderedList
            ? editor.schema.nodes.orderedList
            : editor.schema.nodes.bulletList;
        ListHelpers.generateNewListDefinition({ numId, listType, editor });
      }
    }

    tr.setNodeMarkup(currentItem.pos, null, {
      ...currAttrs,
      level: newLevel,
      numId,
    });

    return true; // IMPORTANT: consume Tab so we don't indent paragraph text
  };
