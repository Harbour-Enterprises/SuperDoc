// @ts-check
import { Fragment } from 'prosemirror-model';
import { TextSelection } from 'prosemirror-state';
import { Attribute } from '../Attribute.js';
import { findParentNode, getNodeType } from '@helpers/index.js';
import { decreaseListIndent } from './decreaseListIndent.js'; // adjust path if needed

/**
 * Check if a paragraph node is visually empty.
 * A paragraph is considered visually empty if it has no text content
 * (ignoring empty <run> wrappers) and no hardBreak.
 * @param {import('prosemirror-model').Node} node
 * @returns {boolean}
 */
function isVisuallyEmptyParagraph(node) {
  if (!node || node.type.name !== 'paragraph') return false;

  // hardBreak means it's not empty
  let hasHardBreak = false;
  node.descendants((n) => {
    if (n.type && n.type.name === 'hardBreak') {
      hasHardBreak = true;
      return false; // stop
    }
    return true;
  });
  if (hasHardBreak) return false;

  // textContent collapses inline wrappers (e.g., run)
  const text = (node.textContent || '').replace(/\u200b/g, '').trim();
  return text.length === 0;
}

/**
 * Try to outdent one level using SuperDoc's list indent helper.
 * Return true if indentation was decreased.
 * @param {Object} props
 * @returns {boolean}
 */
function tryOutdentOneLevel(props) {
  return decreaseListIndent()(props);
}

/**
 * Split the current list item into two separate items.
 * @returns {Function} A command function that performs the split operation.
 */
export const splitListItem = () => (props) => {
  const { tr, state, dispatch } = props;
  const type = getNodeType('listItem', state.schema);
  const { $from, $to, empty } = state.selection;

  tr.setMeta('updateListSync', true);

  const listItemPM = findParentNode((n) => n.type === type)(state.selection);
  if (!listItemPM) return false;
  const { node: listItemNode } = listItemPM;

  // Must be a single textblock selection
  if ((state.selection.node && state.selection.node.isBlock) || $from.depth < 2 || !$from.sameParent($to)) {
    return false;
  }

  // Empty-block special case with "visual emptiness" + Word-like outdent
  const parentPara = $from.parent;
  const isEmptyPara = isVisuallyEmptyParagraph(parentPara);
  const atEndOfListItem = $from.node(-1).childCount === $from.indexAfter(-1);

  if (isEmptyPara && atEndOfListItem) {
    // If level > 0, outdent one level first
    const currentLevel = typeof listItemNode?.attrs?.level === 'number' ? listItemNode.attrs.level : 0;
    if (currentLevel > 0) {
      const outdented = tryOutdentOneLevel(props);
      if (outdented) {
        tr.scrollIntoView();
        if (dispatch) dispatch(tr);
        return true;
      }
      // If outdent failed, fall through to default empty-block handler
    }
    return handleSplitInEmptyBlock(props, listItemPM);
  }

  // Parent list (MS-Word model: a root block with exactly one listItem)
  const listPM = findParentNode((n) => ['orderedList', 'bulletList'].includes(n.type.name))(state.selection);
  if (!listPM) return false;
  const { node: parentListNode, pos: listStart } = listPM;
  const listEnd = listStart + parentListNode.nodeSize;

  // If text is selected, delete it first so we split at a caret
  if (!empty) tr.delete($from.pos, $to.pos);

  // Slice the *paragraph* at the cursor
  const paraPM = findParentNode((n) => n.type.name === 'paragraph')(state.selection);
  if (!paraPM) return false;
  const paragraphNode = paraPM.node;
  const paraStart = paraPM.pos + 1; // first position inside paragraph
  const offsetInParagraph = state.selection.from - paraStart;

  const beforeCursor = paragraphNode.content.cut(0, Math.max(0, offsetInParagraph));
  const afterCursor = paragraphNode.content.cut(Math.max(0, offsetInParagraph));

  // If visually empty (e.g., only run wrappers), treat as empty-block path
  if (isVisuallyEmptyParagraph(paragraphNode)) {
    const currentLevel = typeof listItemNode?.attrs?.level === 'number' ? listItemNode.attrs.level : 0;
    if (currentLevel > 0) {
      const outdented = tryOutdentOneLevel(props);
      if (outdented) {
        tr.scrollIntoView();
        if (dispatch) dispatch(tr);
        return true;
      }
    }
    return handleSplitInEmptyBlock(props, listItemPM);
  }

  // Multi-paragraph vs single-paragraph listItem
  const paragraphIndex = $from.index(-1);
  const listItemHasMultipleParagraphs = listItemNode.childCount > 1;

  let firstLI, secondLI;

  if (listItemHasMultipleParagraphs) {
    // Content before/after the current paragraph
    const contentBefore = [];
    for (let i = 0; i < paragraphIndex; i++) contentBefore.push(listItemNode.child(i));

    const contentAfter = [];
    for (let i = paragraphIndex + 1; i < listItemNode.childCount; i++) contentAfter.push(listItemNode.child(i));

    // First listItem content
    const firstParas = [
      ...contentBefore,
      paragraphNode.type.create(paragraphNode.attrs, beforeCursor.size ? beforeCursor : null),
    ].filter(Boolean);
    if (firstParas.length === 0) {
      firstParas.push(state.schema.nodes.paragraph.create(paragraphNode.attrs));
    }

    // Second listItem content
    const secondParas = [
      paragraphNode.type.create(paragraphNode.attrs, afterCursor.size ? afterCursor : null),
      ...contentAfter,
    ].filter(Boolean);
    if (secondParas.length === 0) {
      secondParas.push(state.schema.nodes.paragraph.create(paragraphNode.attrs));
    }

    firstLI = state.schema.nodes.listItem.create({ ...listItemNode.attrs }, Fragment.from(firstParas));
    secondLI = state.schema.nodes.listItem.create({ ...listItemNode.attrs }, Fragment.from(secondParas));
  } else {
    // Single paragraph listItem: keep empty paragraphs empty (no " ")
    const firstParagraph = paragraphNode.type.create(paragraphNode.attrs, beforeCursor.size ? beforeCursor : null);
    const secondParagraph = paragraphNode.type.create(paragraphNode.attrs, afterCursor.size ? afterCursor : null);

    firstLI = state.schema.nodes.listItem.create({ ...listItemNode.attrs }, firstParagraph);
    secondLI = state.schema.nodes.listItem.create({ ...listItemNode.attrs }, secondParagraph);
  }

  if (!firstLI || !secondLI) return false;

  // Build two new lists (each with exactly one listItem)
  const ListType = parentListNode.type; // orderedList or bulletList
  const firstList = ListType.createAndFill(parentListNode.attrs, Fragment.from(firstLI));
  const secondList = ListType.createAndFill(parentListNode.attrs, Fragment.from(secondLI));
  if (!firstList || !secondList) return false;

  // Replace the ENTIRE current list with firstList, then insert secondList after it
  tr.replaceWith(listStart, listEnd, firstList);
  const insertAfterFirst = listStart + firstList.nodeSize;
  tr.insert(insertAfterFirst, secondList);

  // Place cursor inside the second list's paragraph (list + listItem + paragraph)
  const cursorPos = insertAfterFirst + 3;
  tr.setSelection(TextSelection.near(tr.doc.resolve(cursorPos), 1)).scrollIntoView();

  tr.setMeta('splitListItem', true);
  if (dispatch) dispatch(tr);
  return true;
};

/**
 * Handle the case where we are splitting a list item in an empty block.
 * Word-like behavior is layered above: if level>0 we already tried to outdent.
 * If we reach here and the item is empty at level 0, exit/destroy the list.
 * If the item has other content and we're at its end, create a *new list after*.
 * @param {Object} props
 * @param {Object} currentListItem
 * @returns {boolean}
 */
const handleSplitInEmptyBlock = (props, currentListItem) => {
  const { state, editor, tr } = props;
  const { schema } = state;
  const { $from } = state.selection;
  const extensionAttrs = editor.extensionService.attributes;

  const listItemNode = currentListItem.node;
  const isEmptyParagraph = isVisuallyEmptyParagraph($from.parent);
  const listItemHasOtherContent = listItemNode.content.size > $from.parent.nodeSize;
  const isAtEndOfListItem = $from.indexAfter(-1) === $from.node(-1).childCount;

  if (isEmptyParagraph && listItemHasOtherContent && isAtEndOfListItem) {
    try {
      const listTypes = ['orderedList', 'bulletList'];
      const parentList = findParentNode((n) => listTypes.includes(n.type.name))(state.selection);
      if (!parentList) return false;

      const newParagraphAttrs = Attribute.getSplittedAttributes(extensionAttrs, 'paragraph', {});
      const newParagraph = schema.nodes.paragraph.create(newParagraphAttrs);
      const newListItem = schema.nodes.listItem.create({ ...listItemNode.attrs }, newParagraph);

      const ListType = parentList.node.type;
      const newList = ListType.createAndFill(parentList.node.attrs, Fragment.from(newListItem));
      if (!newList) return false;

      const insertPos = parentList.pos + parentList.node.nodeSize;
      tr.insert(insertPos, newList);

      const newPos = insertPos + 3; // list + listItem + paragraph
      tr.setSelection(TextSelection.near(tr.doc.resolve(newPos)));
      tr.scrollIntoView();

      return true;
    } catch (e) {
      console.error('Error creating new list item:', e);
      return false;
    }
  }

  // If empty but not at end, let normal split handle it
  if (isEmptyParagraph && listItemHasOtherContent && !isAtEndOfListItem) return false;

  // Destroy list when completely empty (level 0 exit)
  const listTypes = ['orderedList', 'bulletList'];
  const parentList = findParentNode((n) => listTypes.includes(n.type.name))(state.selection);
  if (!parentList) return false;

  const newParagraphAttrs = Attribute.getSplittedAttributes(extensionAttrs, 'paragraph', {});
  let newParagraph = schema.nodes.paragraph.createAndFill(newParagraphAttrs);
  if (!newParagraph) newParagraph = schema.nodes.paragraph.create();

  const listStart = parentList.pos;
  const listEnd = parentList.pos + parentList.node.nodeSize;
  tr.replaceWith(listStart, listEnd, newParagraph);

  const newPos = listStart + 1;
  tr.setSelection(TextSelection.near(tr.doc.resolve(newPos)));
  tr.scrollIntoView();

  return true;
};
