// @ts-check
import { findParentNode } from '@helpers/index.js';
import { ListHelpers } from '@helpers/list-numbering-helpers.js';
import {
  collectTargetListItemPositions,
  parseLevel,
  resolveParentList,
} from '@core/commands/list-helpers/list-indent-helpers.js';

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

    const parentOrderedHelper = ListHelpers.getParentOrderedList && ListHelpers.getParentOrderedList(state);
    const parentBulletHelper = ListHelpers.getParentBulletList && ListHelpers.getParentBulletList(state);

    const targetPositions = collectTargetListItemPositions(state, currentItem?.pos);
    if (!targetPositions.length) return false;

    let parentListsMap = {};

    // Map each target position to its node and mapped position
    const mappedNodes = targetPositions.map((originalPos) => {
      const mappedPos = tr.mapping ? tr.mapping.map(originalPos) : originalPos;
      const node =
        (tr.doc && tr.doc.nodeAt(mappedPos)) ||
        (currentItem && originalPos === currentItem.pos ? currentItem.node : null);
      return { originalPos, mappedPos, node };
    });

    // Filter out positions where node is not a valid listItem
    const validNodes = mappedNodes.filter(({ node }) => node && node.type.name === 'listItem');

    validNodes.forEach(({ mappedPos, node }) => {
      const attrs = node.attrs || {};
      const currLevel = parseLevel(attrs.level);

      // No-op at level 0 (consume Shift+Tab)
      if (currLevel <= 0) {
        return;
      }

      const newLevel = currLevel - 1;

      const $pos = tr.doc ? tr.doc.resolve(mappedPos) : null;
      const parentListNode =
        resolveParentList($pos) ||
        parentOrderedHelper?.node ||
        parentBulletHelper?.node ||
        parentOrderedHelper ||
        parentBulletHelper;

      parentListsMap[mappedPos] = parentListNode;
      if (!parentListNode) {
        return;
      }

      const fallbackListId = parentListNode.attrs?.listId ?? null;
      let numId = fallbackListId ?? attrs.numId ?? null;

      let createdNewId = false;
      if (numId == null && ListHelpers.getNewListId) {
        numId = ListHelpers.getNewListId(editor);
        createdNewId = numId != null;
      }

      if (createdNewId && numId != null && ListHelpers.generateNewListDefinition) {
        ListHelpers.generateNewListDefinition({
          numId,
          listType: parentListNode.type,
          editor,
        });
      }

      tr.setNodeMarkup(mappedPos, null, {
        ...attrs,
        level: newLevel,
        numId,
      });
    });

    return Object.values(parentListsMap).length ? !Object.values(parentListsMap).every((pos) => !pos) : true;
  };
