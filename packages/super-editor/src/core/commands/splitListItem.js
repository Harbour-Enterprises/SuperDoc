import { Fragment, Slice } from 'prosemirror-model';
import { TextSelection } from 'prosemirror-state';
import { Attribute } from '../Attribute.js';
import { ListHelpers } from '@helpers/list-numbering-helpers.js';
import { findParentNode, getNodeType } from '@helpers/index.js';

/**
 * Splits one list item into two separate list items.
 * @param typeOrName The type or name of the node.
 *
 * The command is a heavily modified version of the original
 * `splitListItem` command to better manage attributes and marks
 * as well as custom SuperDoc lists.
 * 
 * https://github.com/ProseMirror/prosemirror-schema-list/blob/master/src/schema-list.ts#L114
 */
export const splitListItem = () => (props) => {
  const { tr, state, dispatch, editor } = props;
  const type = getNodeType('listItem', state.schema);
  const { $from, $to } = state.selection;

  const currentListItem = findParentNode((node) => node.type.name === 'listItem')(state.selection);
  if (!currentListItem) return false;

  // If selection spans multiple blocks or we're not inside a list item, do nothing
  if ((state.selection.node && state.selection.node.isBlock) || $from.depth < 2 || !$from.sameParent($to)) {
    return false;
  }

  /** 
   * In an empty block. If this is a nested list, the wrapping
   * list item should be split. Otherwise, bail out and let next
   * command handle lifting.
   */
  if ($from.parent.content.size === 0 && $from.node(-1).childCount === $from.indexAfter(-1)) {
    return handleSplitInEmptyBlock(props, currentListItem);
  }

  const matchedListItem = findParentNode((node) => node.type === type)(state.selection);
  const { node: listItemNode } = matchedListItem || {};
  if (listItemNode.type !== type) return false;

  const listTypes = ['orderedList', 'bulletList'];
  const matchedParentList = findParentNode((node) => listTypes.includes(node.type.name))(state.selection);
  const { node: parentListNode } = matchedParentList || {};

  // If we have something in the selection, we need to remove it
  if ($from.pos !== $to.pos) tr.delete($from.pos, $to.pos);

  if (!dispatch) return true;

  const paragraphNode = $from.node();
  const paraOffset = $from.parentOffset;
  const tail = paragraphNode.content.cut(paraOffset);

  const listItemPos = matchedListItem.pos;
  const cutPos = $from.pos;
  const listItemEnd = listItemPos + listItemNode.nodeSize;

  // This deletes the tail (everything after cursor)
  tr.delete(cutPos, listItemEnd);

  // Duplicate the list and list item
  const paragraph = editor.schema.nodes.paragraph.create(paragraphNode.attrs, tail);
  const newListItem = editor.schema.nodes.listItem.create({...listItemNode.attrs}, paragraph);
  const newList = editor.schema.nodes.orderedList.createAndFill(parentListNode.attrs, Fragment.from(newListItem));
  if (!newListItem || !newList) return false;

  // Insert the new orderedList after the current one
  const resolvedListPos = tr.doc.resolve(matchedParentList.pos);
  const updatedParentList = resolvedListPos.nodeAfter;
  const insertPosition = resolvedListPos.pos + updatedParentList.nodeSize;
  tr.insert(insertPosition, newList);

  // Set selection inside the new paragraph
  const newListResolved = tr.doc.resolve(insertPosition);
  tr.setSelection(TextSelection.near(newListResolved)).scrollIntoView();

  // Retain any marks
  const marks = state.storedMarks || $from.marks() || [];
  if (marks?.length) {
    tr.ensureMarks(marks);
  }
  tr.setMeta('splitListItem', true);

  dispatch(tr);
  return true;
};


/**
 * Handle the case where we are splitting a list item in an empty block.
 * @param {Object} param0.props The props object containing the editor state and transaction.
 * @returns {boolean} Returns true if the split was handled, false otherwise.
 */
const handleSplitInEmptyBlock = (props) => {
  const { tr, state, dispatch, editor } = props;
  const type = getNodeType('listItem', state.schema);
  const { $from } = state.selection;
  const extensionAttrs = editor.extensionService.attributes;

  if (
    $from.depth === 2 || // 3
    $from.node(-3).type !== type ||
    $from.index(-2) !== $from.node(-2).childCount - 1
  ) {
    return false;
  }

  if (dispatch) {
    let wrap = Fragment.empty;
    const depthBefore = $from.index(-1) ? 1 : $from.index(-2) ? 2 : 3;

    // Build a fragment containing empty versions of the structure
    // from the outer list item to the parent node of the cursor
    for (let d = $from.depth - depthBefore; d >= $from.depth - 3; d--) {
      wrap = Fragment.from($from.node(d).copy(wrap));
    }

    //prettier-ignore
    const depthAfter = $from.indexAfter(-1) < $from.node(-2).childCount ? 1 : $from.indexAfter(-2) < $from.node(-3).childCount ? 2 : 3;

    const newNextTypeAttrs = Attribute.getSplittedAttributes(
      extensionAttrs,
      $from.node().type.name,
      $from.node().attrs,
    );

    const nextType = type.contentMatch.defaultType?.createAndFill(newNextTypeAttrs) || undefined;
    wrap = wrap.append(Fragment.from(type.createAndFill(null, nextType) || undefined));
    const start = $from.before($from.depth - (depthBefore - 1));
    tr.replace(start, $from.after(-depthAfter), new Slice(wrap, 4 - depthBefore, 0));

    let sel = -1;
    tr.doc.nodesBetween(start, tr.doc.content.size, (n, pos) => {
      if (sel > -1) return false;
      if (n.isTextblock && n.content.size === 0) sel = pos + 1;
    });
    if (sel > -1) tr.setSelection(TextSelection.near(tr.doc.resolve(sel))); // Selection
    tr.scrollIntoView();
  }

  return true;
};
