import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import { Attribute } from '@core/index.js';
import { getMarkType } from '@core/helpers/index.js';
import { parseSizeUnit } from '@core/utilities/index.js';
import { getLineHeightValueString } from '@core/super-converter/helpers.js';

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

function checkListItemEmpty(listItem) {
  return (
    listItem.childCount === 1 &&
    listItem.firstChild?.type.name === 'paragraph' &&
    listItem.firstChild?.content.size === 0
  );
}
