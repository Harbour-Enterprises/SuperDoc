import { findParentNode } from '@helpers/index.js';
import { isList } from '@core/commands/list-helpers';
import { resolveParagraphProperties } from '@converter/styles';
import { ListHelpers } from '@helpers/list-numbering-helpers.js';

/**
 * Increase or decrease the numbering level of the currently selected list item.
 *
 * @param {number} delta The delta to apply to the current list level (e.g. +1 to indent, -1 to outdent).
 * @param {import('../Editor').Editor} editor The editor providing state and numbering data.
 * @param {import('prosemirror-state').Transaction} tr The transaction to mutate when the level changes.
 * @returns {boolean} True when the command handled the interaction (even if it was a no-op), otherwise false.
 */
export const changeListLevel = (delta, editor, tr) => {
  const { state } = editor;

  // Guard against non-paragraph nodes
  const currentItem = findParentNode(isList)(state.selection);
  if (!currentItem) return false;

  // Update the ilvl
  const newLevel = (currentItem.node.attrs.numberingProperties.ilvl ?? 0) + delta;

  if (newLevel < 0) {
    return true;
  }

  if (!ListHelpers.hasListDefinition(editor, currentItem.node.attrs.numberingProperties.numId, newLevel)) {
    return false; // Prevent invalid levels
  }

  updateNumberingProperties(
    {
      ...currentItem.node.attrs.numberingProperties,
      ilvl: newLevel,
    },
    currentItem.node,
    currentItem.pos,
    editor,
    tr,
  );

  return true; // IMPORTANT: consume Tab so we don't indent paragraph text
};

/**
 * Apply new numbering metadata to a paragraph node and refresh related layout attributes.
 *
 * @param {{ numId: number, ilvl: number } | null} newNumberingProperties The numbering properties to set, or null to clear them.
 * @param {import('prosemirror-model').Node} paragraphNode The paragraph node being updated.
 * @param {number} pos Document position of the node, used for transaction updates.
 * @param {import('../Editor').Editor} editor The editor that supplies numbering and style resolution helpers.
 * @param {import('prosemirror-state').Transaction} tr The transaction receiving the updated node markup.
 */
export function updateNumberingProperties(newNumberingProperties, paragraphNode, pos, editor, tr) {
  const newProperties = {
    ...paragraphNode.attrs.paragraphProperties,
    numberingProperties: newNumberingProperties ? { ...newNumberingProperties } : null,
  };

  if (paragraphNode.attrs.styleId === 'ListParagraph') { // Word's default list paragraph style
    newProperties.styleId = null;
  }

  // Inline indentation is removed for compatibility with Word
  if (newProperties.indent) {
    delete newProperties.indent;
  }

  const newAttrs = {
    ...paragraphNode.attrs,
    paragraphProperties: newProperties,
    numberingProperties: newProperties.numberingProperties,
    listRendering: null,
  };

  // START: remove after CSS styles
  // Get new indent based on ilvl
  const resolvedParagraphProperties = resolveParagraphProperties(
    { docx: editor.converter.convertedXml, numbering: editor.converter.numbering },
    newProperties,
    false,
    true,
  );
  newAttrs.indent = resolvedParagraphProperties.indent ? { ...resolvedParagraphProperties.indent } : null;
  newAttrs.spacing = resolvedParagraphProperties.spacing ? { ...resolvedParagraphProperties.spacing } : null;
  newAttrs.styleId = resolvedParagraphProperties.styleId || null;
  // END: remove after CSS styles

  tr.setNodeMarkup(pos, null, newAttrs);
}
