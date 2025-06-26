import { ListHelpers } from '@helpers/list-numbering-helpers.js';

/**
 * Decreases the indent level of the current list item.
 * If the current item is at level 0, it converts it to a paragraph.
 * If the current item is at level 1 or higher, it decreases the level and updates the list structure.
 * @returns {Function} A ProseMirror command function.
 */
export const decreaseListIndent = () => ({ editor, tr, dispatch }) => {
  const { state } = editor;
  const $from = state.selection.$from;
  const content = $from.parent;
  const currentNode = ListHelpers.getCurrentListItem(state);
  if (!currentNode || !dispatch) return false;

  const parentList = ListHelpers.getParentOrderedList(state);
  if (!parentList) return false;

  const currentLevel = currentNode.node.attrs.level;
  const newLevel = currentLevel - 1;
  const numId = currentNode.node.attrs.numId;

  const replaceFrom = parentList.pos;
  const replaceTo = parentList.pos + parentList.node.nodeSize;

  if (replaceFrom < 0 || replaceTo > state.doc.content.size || replaceFrom >= replaceTo) {
    console.warn('Invalid replace positions');
    return false;
  }

  if (newLevel < 0) {
    const success = ListHelpers.convertListItemToParagraph({ state, tr, currentNode, replaceFrom, replaceTo });
    if (!success) return false;
    dispatch(tr);
    return true;
  }

  try {
    const listNode = ListHelpers.createSchemaOrderedListNode({
      level: newLevel,
      numId,
      editor,
      contentNode: content?.toJSON(),
    });

    const newMarks = ListHelpers.addInlineTextMarks(currentNode.node, []);
    ListHelpers.replaceListWithNode({ tr, from: replaceFrom, to: replaceTo, newNode: listNode });
    tr.ensureMarks(newMarks);
    ListHelpers.setSelectionInsideNewList(tr, replaceFrom);

    dispatch(tr);
    return true;
  } catch (error) {
    console.error('Error decreasing indent:', error);
    return false;
  }
};
