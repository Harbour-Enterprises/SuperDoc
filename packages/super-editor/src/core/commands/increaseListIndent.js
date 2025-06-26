import { ListHelpers } from '@helpers/list-numbering-helpers.js';

/**
 * Increases the indent level of the current list item.
 * @returns {Function} A ProseMirror command function.
 */
export const increaseListIndent = () => ({ editor, tr, dispatch }) => {
  const { state } = editor;
  const $from = state.selection.$from;
  const content = $from.parent;
  const currentNode = ListHelpers.getCurrentListItem(state);
  if (!currentNode || !dispatch) return false;

  const parentList = ListHelpers.getParentOrderedList(state);
  if (!parentList) return false;

  const level = currentNode.node.attrs.level + 1;
  const numId = currentNode.node.attrs.numId;

  const listNode = ListHelpers.createSchemaOrderedListNode({
    level,
    numId,
    editor,
    contentNode: content?.toJSON(),
  });

  const newMarks = ListHelpers.addInlineTextMarks(currentNode.node, []);
  ListHelpers.replaceListWithNode({
    tr,
    from: parentList.pos,
    to: parentList.pos + parentList.node.nodeSize,
    newNode: listNode,
  });
  tr.ensureMarks(newMarks);
  ListHelpers.setSelectionInsideNewList(tr, parentList.pos);

  dispatch(tr);
  return true;
};
