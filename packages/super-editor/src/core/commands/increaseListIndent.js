import { ListHelpers } from '@helpers/list-numbering-helpers.js';

/**
 * Increases the indent level of the current list item.
 * @returns {Function} A ProseMirror command function.
 */
export const increaseListIndent = () => ({ editor, tr }) => {
  const { state } = editor;
  const $from = state.selection.$from;
  const content = $from.parent;
  const currentNode = ListHelpers.getCurrentListItem(state);
  if (!currentNode) return false;

  const parentList = ListHelpers.getParentOrderedList(state);
  if (!parentList) return false;

  const level = currentNode.node.attrs.level + 1;
  const numId = currentNode.node.attrs.numId;
  const listType = parentList.node.type.name === 'orderedList' ? 'orderedList' : 'bulletList';

  const listNode = ListHelpers.createSchemaOrderedListNode({
    level,
    numId,
    listType,
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

  return true;
};
