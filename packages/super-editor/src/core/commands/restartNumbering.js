import { findParentNode } from '@helpers/index.js';
import { isList } from '@core/commands/list-helpers';
import { ListHelpers } from '@helpers/list-numbering-helpers.js';
import { updateNumberingProperties } from './changeListLevel.js';
import { getResolvedParagraphProperties } from '@extensions/paragraph/resolvedPropertiesCache.js';

export const restartNumbering = ({ editor, tr, state, dispatch }) => {
  // 1) Find the current list item
  const { node: paragraph, pos } = findParentNode(isList)(state.selection) || {};

  // 2) If not found, return false
  if (!paragraph) return false;

  // 3) Find all consecutive list items of the same type following the current one
  const allParagraphs = [{ node: paragraph, pos }];
  const startPos = pos + paragraph.nodeSize;
  const myNumId = getResolvedParagraphProperties(paragraph).numberingProperties.numId;
  let stop = false;
  state.doc.nodesBetween(startPos, state.doc.content.size, (node, nodePos) => {
    if (node.type.name === 'paragraph') {
      const paraProps = getResolvedParagraphProperties(node);
      if (isList(node) && paraProps.numberingProperties?.numId === myNumId) {
        allParagraphs.push({ node, pos: nodePos });
      } else {
        stop = true;
      }
      return false;
    }
    return !stop;
  });

  // 4) Create a new numId for the restarted list and generate its definition
  const { numberingType } = paragraph.attrs.listRendering || {};
  const listType = numberingType === 'bullet' ? 'bulletList' : 'orderedList';
  const numId = ListHelpers.getNewListId(editor);
  ListHelpers.generateNewListDefinition({ numId: Number(numId), listType, editor });

  // 5) Update numbering properties for all found paragraphs
  allParagraphs.forEach(({ node, pos }) => {
    const paragraphProps = getResolvedParagraphProperties(node);
    updateNumberingProperties(
      {
        ...(paragraphProps.numberingProperties || {}),
        numId: Number(numId),
      },
      node,
      pos,
      editor,
      tr,
    );
  });

  if (dispatch) dispatch(tr);
  return true;
};
