// @ts-check
import { updateNumberingProperties } from './changeListLevel.js';
import { ListHelpers } from '@helpers/list-numbering-helpers.js';

export const toggleList =
  (listType) =>
  ({ editor, state, tr, dispatch }) => {
    // 1. Find first paragraph in selection that is a list of the same type
    let predicate;
    if (listType === 'orderedList') {
      predicate = (n) =>
        n.attrs.numberingProperties && n.attrs.listRendering && n.attrs.listRendering.numberingType !== 'bullet';
    } else if (listType === 'bulletList') {
      predicate = (n) =>
        n.attrs.numberingProperties && n.attrs.listRendering && n.attrs.listRendering.numberingType === 'bullet';
    } else {
      return false;
    }
    const { selection } = state;
    const { from, to } = selection;
    let firstListNode = null;
    let hasNonListParagraphs = false;
    let paragraphsInSelection = [];
    state.doc.nodesBetween(from, to, (node, pos) => {
      if (node.type.name === 'paragraph') {
        paragraphsInSelection.push({ node, pos });
        if (!firstListNode && predicate(node)) {
          firstListNode = node;
        } else if (!predicate(node)) {
          hasNonListParagraphs = true;
        }
        return false; // stop iterating this paragraph's children
      }
      return true;
    });
    // 2. If not found, check if the paragraph right before the selection is a list of the same type
    if (!firstListNode && from > 0) {
      const $from = state.doc.resolve(from);
      const parentIndex = $from.index(-1);
      if (parentIndex > 0) {
        const beforeNode = $from.node(-1).child(parentIndex - 1);
        if (beforeNode && beforeNode.type.name === 'paragraph' && predicate(beforeNode)) {
          firstListNode = beforeNode;
        }
      }
    }
    // 3. Resolve numbering properties
    let newNumberingProperties;
    if (firstListNode) {
      if (!hasNonListParagraphs) {
        // All paragraphs are already lists of the same type, remove the list formatting
        newNumberingProperties = null;
      } else {
        // Apply those numbering properties to all paragraphs in selection and make them all level zero
        newNumberingProperties = { ...firstListNode.attrs.numberingProperties, ilvl: 0 };
      }
    } else {
      // If list paragraph was not found, create a new list definition and apply it to all paragraphs in selection
      const numId = ListHelpers.getNewListId(editor);
      ListHelpers.generateNewListDefinition({ numId: Number(numId), listType, editor });
      newNumberingProperties = {
        numId: Number(numId),
        ilvl: 0,
      };
    }

    for (const { node, pos } of paragraphsInSelection) {
      updateNumberingProperties(newNumberingProperties, node, pos, editor, tr);
    }

    if (dispatch) dispatch(tr);
    return true;
  };
