// @ts-check
import { updateNumberingProperties } from './changeListLevel.js';
import { ListHelpers } from '@helpers/list-numbering-helpers.js';
import { getResolvedParagraphProperties } from '@extensions/paragraph/resolvedPropertiesCache.js';

export const toggleList =
  (listType) =>
  ({ editor, state, tr, dispatch }) => {
    // 1. Find first paragraph in selection that is a list of the same type
    let predicate;
    if (listType === 'orderedList') {
      predicate = (n) => {
        const paraProps = getResolvedParagraphProperties(n);
        return (
          paraProps.numberingProperties && n.attrs.listRendering && n.attrs.listRendering.numberingType !== 'bullet'
        );
      };
    } else if (listType === 'bulletList') {
      predicate = (n) => {
        const paraProps = getResolvedParagraphProperties(n);
        return (
          paraProps.numberingProperties && n.attrs.listRendering && n.attrs.listRendering.numberingType === 'bullet'
        );
      };
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
    let mode = null;
    let sharedNumberingProperties = null;
    if (firstListNode) {
      if (!hasNonListParagraphs) {
        // All paragraphs are already lists of the same type, remove the list formatting
        mode = 'remove';
      } else {
        // Apply numbering properties to new list paragraphs while keeping existing list items untouched
        mode = 'reuse';
        const paraProps = getResolvedParagraphProperties(firstListNode);
        const baseNumbering = paraProps.numberingProperties || {};
        sharedNumberingProperties = {
          ...baseNumbering,
          ilvl: baseNumbering.ilvl ?? 0,
        };
      }
    } else {
      // If list paragraph was not found, create a new list definition and apply it to all paragraphs in selection
      mode = 'create';
      const numId = ListHelpers.getNewListId(editor);
      ListHelpers.generateNewListDefinition({ numId: Number(numId), listType, editor });
      sharedNumberingProperties = {
        numId: Number(numId),
        ilvl: 0,
      };
    }

    for (const { node, pos } of paragraphsInSelection) {
      if (mode === 'remove') {
        updateNumberingProperties(null, node, pos, editor, tr);
        continue;
      }

      if (mode === 'reuse' && predicate(node)) {
        // Keep existing list items (and their level) untouched
        continue;
      }

      updateNumberingProperties(sharedNumberingProperties, node, pos, editor, tr);
    }

    // Preserve selection at the end of the original selection range
    // This ensures the cursor doesn't jump to an unexpected position after toggling the list
    const newTo = tr.mapping.map(to);
    if (newTo >= 0 && newTo <= tr.doc.content.size) {
      try {
        tr.setSelection(state.selection.constructor.near(tr.doc.resolve(newTo)));
      } catch {
        // Fallback: if selection fails, just leave the selection as-is
      }
    }
    if (dispatch) dispatch(tr);
    return true;
  };
