import { findParentNode } from '@helpers/index.js';
import { ListHelpers } from '@helpers/list-numbering-helpers.js';
import {
  collectTargetListItemPositions,
  parseLevel,
  resolveParentList,
} from '@core/commands/list-helpers/list-indent-helpers.js';

/**
 * Increases the indent level of the current list item.
 * Works for both ordered and bullet lists, including lists toggled from ordered→bullet.
 * @param {Array} _targetPositions - list item positions in selection collected with collectTargetListItemPositions
 */
export const increaseListIndent =
  (_targetPositions) =>
  ({ editor, tr }) => {
    const { state } = editor;

    // 1) Current list item (prefer your helper; fallback to generic)
    const currentItem =
      (ListHelpers.getCurrentListItem && ListHelpers.getCurrentListItem(state)) ||
      findParentNode((n) => n.type && n.type.name === 'listItem')(state.selection);

    const parentOrderedHelper = ListHelpers.getParentOrderedList && ListHelpers.getParentOrderedList(state);
    const parentBulletHelper = ListHelpers.getParentBulletList && ListHelpers.getParentBulletList(state);

    const targetPositions = _targetPositions || collectTargetListItemPositions(state, currentItem?.pos);
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
      const currentLevel = parseLevel(attrs.level);
      const newLevel = currentLevel + 1;

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

      let numId = attrs.numId;
      if (numId == null) {
        const fallbackListId = parentListNode.attrs?.listId ?? null;
        numId = fallbackListId ?? (ListHelpers.getNewListId ? ListHelpers.getNewListId(editor) : null);

        if (numId != null && ListHelpers.generateNewListDefinition) {
          ListHelpers.generateNewListDefinition({
            numId,
            listType: parentListNode.type,
            editor,
          });
        }
      }

      tr.setNodeMarkup(mappedPos, null, {
        ...attrs,
        level: newLevel,
        numId,
      });
    });

    // IMPORTANT: consume Tab so we don't indent paragraph text
    return Object.values(parentListsMap).length ? !Object.values(parentListsMap).every((pos) => !pos) : true;
  };
