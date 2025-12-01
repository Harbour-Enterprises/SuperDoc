import { findParentNode } from '@helpers/index.js';
import type { Command } from '../types/ChainedCommands.js';
import { isList } from '@core/commands/list-helpers';
import { ListHelpers } from '@helpers/list-numbering-helpers.js';
import { updateNumberingProperties } from './changeListLevel.js';
import { getResolvedParagraphProperties } from '@extensions/paragraph/resolvedPropertiesCache.js';
import type { Node } from 'prosemirror-model';

export const restartNumbering: Command = ({ editor, tr, state, dispatch }) => {
  // 1) Find the current list item
  const foundNode = findParentNode(isList)(state.selection);
  const paragraph = foundNode?.node;
  const pos = foundNode?.pos;

  // 2) If not found, return false
  if (!paragraph || pos == null) return false;

  // 3) Find all consecutive list items of the same type following the current one
  const allParagraphs: Array<{ node: Node; pos: number }> = [{ node: paragraph, pos }];
  const startPos = pos + paragraph.nodeSize;
  const paragraphNumberingProps = (getResolvedParagraphProperties(paragraph) ?? {}).numberingProperties as Record<
    string,
    unknown
  > | null;
  const myNumId = paragraphNumberingProps?.numId;
  let stop = false;
  state.doc.nodesBetween(startPos, state.doc.content.size, (node, nodePos) => {
    if (node.type.name === 'paragraph') {
      const paraProps = getResolvedParagraphProperties(node) ?? {};
      const nodeNumberingProps = paraProps.numberingProperties as Record<string, unknown> | null;
      if (isList(node) && nodeNumberingProps?.numId === myNumId) {
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
  ListHelpers.generateNewListDefinition({
    numId: Number(numId),
    listType,
    editor,
    level: undefined,
    start: undefined,
    text: undefined,
    fmt: undefined,
  });

  // 5) Update numbering properties for all found paragraphs
  allParagraphs.forEach(({ node, pos }) => {
    const paragraphProps = getResolvedParagraphProperties(node) ?? {};
    const nodeNumberingProps = paragraphProps.numberingProperties as Record<string, unknown> | null;
    updateNumberingProperties(
      {
        ...(nodeNumberingProps || {}),
        numId: Number(numId),
        ilvl: Number(nodeNumberingProps?.ilvl ?? 0),
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
