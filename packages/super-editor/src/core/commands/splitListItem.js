import { Fragment, Slice } from 'prosemirror-model';
import { TextSelection } from 'prosemirror-state';
import { Attribute } from '../Attribute.js';
import { ListHelpers } from '@helpers/list-numbering-helpers.js';
import { findParentNode, getNodeType } from '@helpers/index.js';
import { decreaseListIndent } from './decreaseListIndent.js';

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
  const { tr, state, editor } = props;
  const type = getNodeType('listItem', state.schema);
  const { $from, $to } = state.selection;

  const currentListItem = findParentNode((node) => node.type.name === 'listItem')(state.selection);
  if (!currentListItem) return false;

  // If selection spans multiple blocks or we're not inside a list item, do nothing
  if ((state.selection.node && state.selection.node.isBlock) || $from.depth < 2 || !$from.sameParent($to)) {
    return false;
  }

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

  const paragraphNode = $from.node();
  const paraOffset = $from.parentOffset;
  const beforeCursor = paragraphNode.content.cut(0, paraOffset);
  const afterCursor = paragraphNode.content.cut(paraOffset);

  // Create the first list with content before cursor
  const firstParagraph = editor.schema.nodes.paragraph.create(paragraphNode.attrs, beforeCursor);
  const firstListItem = editor.schema.nodes.listItem.create({...listItemNode.attrs}, firstParagraph);
  const firstList = editor.schema.nodes.orderedList.createAndFill(parentListNode.attrs, Fragment.from(firstListItem));

  // Create the second list with content after cursor
  const secondParagraph = editor.schema.nodes.paragraph.create(paragraphNode.attrs, afterCursor);
  const secondListItem = editor.schema.nodes.listItem.create({...listItemNode.attrs}, secondParagraph);
  const secondList = editor.schema.nodes.orderedList.createAndFill(parentListNode.attrs, Fragment.from(secondListItem));

  if (!firstList || !secondList) return false;

  // Replace the entire original list with the first list
  const listStart = matchedParentList.pos;
  const listEnd = matchedParentList.pos + parentListNode.nodeSize;
  tr.replaceWith(listStart, listEnd, firstList);

  // Insert the second list after the first one
  const insertPosition = listStart + firstList.nodeSize;
  tr.insert(insertPosition, secondList);

  // Set selection at the beginning of the second list's paragraph
  const secondListStart = insertPosition + 2; // +1 for list, +1 for listItem
  tr.setSelection(TextSelection.near(tr.doc.resolve(secondListStart)));
  tr.scrollIntoView();

  // Retain any marks
  const marks = state.storedMarks || $from.marks() || [];
  if (marks?.length) {
    tr.ensureMarks(marks);
  }
  tr.setMeta('splitListItem', true);

  return true;
};


/**
 * Handle the case where we are splitting a list item in an empty block.
 * @param {Object} param0.props The props object containing the editor state and transaction.
 * @returns {boolean} Returns true if the split was handled, false otherwise.
 */
const handleSplitInEmptyBlock = (props) => {
  const { state, editor, tr } = props;
  const { schema } = state;
  const extensionAttrs = editor.extensionService.attributes;

  // Find the list item node
  const listItemNode = findParentNode((node) => node.type.name === 'listItem')(state.selection);
  if (!listItemNode) return false;

  // Check if the list item is empty
  if (listItemNode.node.content.size > 2) return false;

  // First, try to outdent
  const didOutdent = decreaseListIndent()({ editor, tr })
  if (didOutdent) return true;
  
  try {
    // Find the parent list (orderedList or bulletList)
    const listTypes = ['orderedList', 'bulletList'];
    const parentList = findParentNode((node) => listTypes.includes(node.type.name))(state.selection);
    
    if (!parentList) {
      console.error('No parent list found');
      return false;
    }

    // Get attributes for the new paragraph
    const newParagraphAttrs = Attribute.getSplittedAttributes(
      extensionAttrs,
      'paragraph',
      {}
    );

    // Create a new paragraph node
    const paragraphType = schema.nodes.paragraph;
    let newParagraph = paragraphType.createAndFill(newParagraphAttrs);
    
    if (!newParagraph) {
      newParagraph = paragraphType.create();
    }

    // Replace the ENTIRE LIST with a paragraph
    const listStart = parentList.pos;
    const listEnd = parentList.pos + parentList.node.nodeSize;
    
    tr.replaceWith(listStart, listEnd, newParagraph);

    // Position cursor at start of new paragraph
    const newPos = listStart + 1;
    tr.setSelection(TextSelection.near(tr.doc.resolve(newPos)));
    
    tr.scrollIntoView();
    
    return true;

  } catch (error) {
    console.error('Error destroying list:', error);
    return false;
  }
};