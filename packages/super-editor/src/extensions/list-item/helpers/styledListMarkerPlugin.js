import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import { Attribute } from '@core/index.js';
import { getMarkType } from '@core/helpers/index.js';
import { parseSizeUnit } from '@core/utilities/index.js';
import { getLineHeightValueString } from '@core/super-converter/helpers.js';

/**
 * Creates a ProseMirror plugin for styling list item markers and spacing.
 * Applies CSS custom properties for marker typography (font-size, font-family)
 * and direct styles for list item spacing (margins, line-height).
 * @returns {Plugin} ProseMirror plugin for styled list markers
 * @example
 * const plugin = styledListMarker();
 * @note Skips re-computation when 'orderedListMarker' meta is set
 * @note Respects textStyle marks from paragraph content for marker styling
 */
export function styledListMarker() {
  return new Plugin({
    key: new PluginKey('styledListMarker'),

    state: {
      init(_, state) {
        const decorations = getCombinedListDecorations(state);
        return DecorationSet.create(state.doc, decorations);
      },

      apply(tr, oldDecorationSet, oldState, newState) {
        if (!tr.docChanged) return oldDecorationSet;

        const isOrderedListPlugin = tr.getMeta('orderedListMarker');
        if (isOrderedListPlugin) return oldDecorationSet;

        /*
         * OPTIMIZATION: Check if the transaction actually touches list items or paragraphs
         * before rebuilding decorations. We only recompute when list content or marks change.
         */
        let affectsListItems = false;

        tr.steps.forEach((step) => {
          if (step.slice) {
            step.slice.content.descendants((node) => {
              if (node.type.name === 'listItem' || node.type.name === 'paragraph') {
                affectsListItems = true;
                return false;
              }
            });
          }

          if (step.jsonID === 'addMark' || step.jsonID === 'removeMark') {
            affectsListItems = true;
          }
        });

        if (!affectsListItems) {
          return oldDecorationSet.map(tr.mapping, tr.doc);
        }

        const marks = tr.getMeta('splitListItem');
        const decorations = getCombinedListDecorations(newState, marks);
        return DecorationSet.create(newState.doc, decorations);
      },
    },

    props: {
      decorations(state) {
        return this.getState(state);
      },
    },
  });
}

/**
 * Builds list item decorations combining marker typography and spacing rules.
 * OPTIMIZATION: Combines marker styling and spacing into a single document traversal.
 * Previously required two separate passes - one for marker fonts, one for spacing.
 * Now processes both in a single pass, reducing O(2n) to O(n).
 * @param {import('prosemirror-state').EditorState} state - Current editor state.
 * @param {import('prosemirror-model').Mark[]} [marks=[]] - Marks that should influence styling.
 * @returns {import('prosemirror-view').Decoration[]} Decorations to apply to list items.
 */
function getCombinedListDecorations(state, marks = []) {
  let { doc, storedMarks } = state;
  let decorations = [];

  if (Array.isArray(storedMarks)) marks.push(...storedMarks);

  doc.descendants((node, pos) => {
    // no need to descend into a paragraph
    if (node.type.name === 'paragraph') {
      return false;
    }

    if (node.type.name === 'listItem') {
      // Process marker styling
      let textStyleType = getMarkType('textStyle', doc.type.schema);
      let textStyleMarks = [...marks.filter((m) => m.type === textStyleType)];
      let isEmptyListItem = checkListItemEmpty(node);

      if (isEmptyListItem && marks.length) {
        const textMarks = marks.filter((mark) => mark.type === textStyleType);
        textStyleMarks.push(...textMarks);
      } else {
        const itemMarks = getListItemTextStyleMarks(node, doc, textStyleType);
        textStyleMarks.push(...itemMarks);
      }

      let fontSize = null;
      let fontFamily = null;

      textStyleMarks.forEach((mark) => {
        let { attrs } = mark;

        if (attrs.fontSize && !fontSize) {
          let [value, unit] = parseSizeUnit(attrs.fontSize);
          if (!Number.isNaN(value)) {
            unit = unit ?? 'pt';
            fontSize = `${value}${unit}`;
          }
        }

        if (attrs.fontFamily && !fontFamily) {
          fontFamily = attrs.fontFamily;
        }
      });

      let fontSizeAttrs = {
        style: `--marker-font-size: ${fontSize ?? 'initial'}`,
      };
      let fontFamilyAttrs = {
        style: `--marker-font-family: ${fontFamily ?? 'initial'}`,
      };

      // Process spacing styling that used to live in a separate helper
      let spacingStyle = '';
      if (node.attrs.spacing) {
        const { lineSpaceBefore, lineSpaceAfter, line } = node.attrs.spacing;
        spacingStyle = `
          ${lineSpaceBefore ? `margin-top: ${lineSpaceBefore}px;` : ''}
          ${lineSpaceAfter ? `margin-bottom: ${lineSpaceAfter}px;` : ''}
          ${line ? getLineHeightValueString(line, '') : ''}
        `.trim();
      }

      // Combine all attributes
      let attrs = Attribute.mergeAttributes(fontSizeAttrs, fontFamilyAttrs);
      if (spacingStyle) {
        attrs = Attribute.mergeAttributes(attrs, { style: spacingStyle });
      }

      let dec = Decoration.node(pos, pos + node.nodeSize, attrs);
      decorations.push(dec);
    }
  });

  return decorations;
}

/**
 * Extracts textStyle marks from text nodes within a list item's paragraphs.
 * Used to determine font styling that should be applied to the list marker.
 * @private
 * @param {import('prosemirror-model').Node} listItem - The list item node to extract marks from
 * @param {import('prosemirror-model').Node} doc - The document node
 * @param {import('prosemirror-model').MarkType} markType - The textStyle mark type to filter for
 * @returns {import('prosemirror-model').Mark[]} Array of textStyle marks found in the list item
 */
function getListItemTextStyleMarks(listItem, doc, markType) {
  let textStyleMarks = [];
  listItem.forEach((childNode) => {
    if (childNode.type.name !== 'paragraph') return;
    childNode.forEach((textNode) => {
      let isTextNode = textNode.type.name === 'text';
      let hasTextStyleMarks = markType.isInSet(textNode.marks);
      if (isTextNode && hasTextStyleMarks) {
        let marks = textNode.marks.filter((mark) => mark.type === markType);
        textStyleMarks.push(...marks);
      }
    });
  });
  return textStyleMarks;
}

/**
 * Checks if a list item is empty (contains only an empty paragraph).
 * Empty list items use stored marks for styling instead of content marks.
 * @private
 * @param {import('prosemirror-model').Node} listItem - The list item node to check
 * @returns {boolean} True if the list item contains only an empty paragraph, false otherwise
 */
function checkListItemEmpty(listItem) {
  return (
    listItem.childCount === 1 &&
    listItem.firstChild?.type.name === 'paragraph' &&
    listItem.firstChild?.content.size === 0
  );
}
