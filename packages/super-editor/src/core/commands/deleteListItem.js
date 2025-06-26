import { TextSelection } from 'prosemirror-state';
import { findParentNode } from '@helpers/index.js';

/**
 * Delete the current list item.
 * If the list item is empty, the entire list will be removed.
 * If it has content, the list will be replaced with a paragraph containing that content.
 * Only triggers when cursor is at the beginning of a list item (parentOffset === 0).
 * @returns {Function} A ProseMirror command function.
 */
export const deleteListItem = () => (props) => {
  const { tr, state, dispatch } = props;
  const { $from } = state.selection;
  
  // Early return if not at the beginning of a text node
  if ($from.parentOffset !== 0) return false;
  
  // Find the current list item
  const currentListItem = findParentNode((node) => node.type.name === 'listItem')(state.selection);
  if (!currentListItem) return false;

  // Find the parent list (ordered or bullet)
  const listTypes = ['orderedList', 'bulletList'];
  const parentList = findParentNode((node) => listTypes.includes(node.type.name))(state.selection);
  if (!parentList) return false;

  const currentParagraphNode = findParentNode((node) => node.type.name === 'paragraph')(state.selection);

  if (!dispatch) return true;

  const listFrom = parentList.pos;
  const listTo = listFrom + parentList.node.nodeSize;
  const paragraphNode = currentListItem.node.content.firstChild;
  if (paragraphNode !== currentParagraphNode.node) return false;

  /**
   * Case 1: List item is empty - just remove the entire list
   */
  if (!paragraphNode || paragraphNode.content.size === 0) {
    tr.delete(listFrom, listTo);
    dispatch(tr.scrollIntoView());
    return true;
  }

  /**
   * Case 2: List item has content - replace list with standalone paragraph
   */
  const standaloneParagraph = state.schema.nodes.paragraph.create(
    paragraphNode.attrs,
    paragraphNode.content,
    paragraphNode.marks
  );

  // Replace the entire list with the paragraph content
  tr.replaceWith(listFrom, listTo, standaloneParagraph);

  // Set cursor position inside the new paragraph
  const newPos = listFrom + 1; // Position after the paragraph's opening tag
  const $newPos = tr.doc.resolve(newPos);
  tr.setSelection(TextSelection.near($newPos));

  dispatch(tr.scrollIntoView());
  return true;
};
