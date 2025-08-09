import { LinkedStylesPluginKey } from '../linked-styles/index.js';
import { getMarkType } from '@core/helpers/index.js';
import { parseSizeUnit } from '@core/utilities/index.js';
import { parseIndentElement, combineIndents } from '@core/super-converter/v2/importer/listImporter.js';
import { generateOrderedListIndex } from '@helpers/orderedListUtils.js';
import { getListItemStyleDefinitions } from '@helpers/list-numbering-helpers.js';
import { docxNumberigHelpers } from '@/core/super-converter/v2/importer/listImporter.js';

const IS_DEBUGGING = false;

/**
 * @typedef {Object} IndentObject
 * @property {number} [left] - The left indent value
 * @property {number} [right] - The right indent value
 * @property {number} [firstLine] - The first line indent value
 * @property {number} [hanging] - The hanging indent value
 */

/**
 * The node view for the list item
 * @param {Node} node - The node to be rendered
 * @param {function} getPos - A function to get the position of the node
 * @param {Array} decorations - An array of decorations
 * @param {Editor} editor - The editor instance
 * @returns {ListItemNodeView} The node view instance
 */
// Add a registry to track active node views
const activeListItemNodeViews = new Set();

export class ListItemNodeView {
  constructor(node, getPos, decorations, editor) {
    this.node = node;
    this.editor = editor;
    this.decorations = decorations;
    this.view = editor.view;
    this.getPos = getPos;

    // Register this node view
    activeListItemNodeViews.add(this);

    this.#init();
  }

  #init() {
    const { attrs } = this.node;
    const { listLevel, listNumberingType, lvlText, numId, level, customFormat } = attrs;

    let orderMarker = '';
    if (listLevel) {
      if (listNumberingType !== 'bullet') {
        orderMarker = generateOrderedListIndex({
          listLevel,
          lvlText: lvlText,
          listNumberingType,
          customFormat,
        });
      } else {
        orderMarker = docxNumberigHelpers.normalizeLvlTextChar(lvlText);
      }
    }

    const pos = this.getPos();
    const { fontSize, fontFamily } = getTextStyleMarksFromLinkedStyles({
      node: this.node,
      pos,
      editor: this.editor,
    });

    // Container for the entire node view
    this.dom = document.createElement('li');
    this.dom.className = 'sd-editor-list-item-node-view';
    this.dom.style.fontSize = fontSize;
    this.dom.style.fontFamily = fontFamily ? fontFamily : 'inherit';
    this.dom.setAttribute('data-marker-type', orderMarker);
    this.dom.setAttribute('data-num-id', numId);
    this.dom.setAttribute('data-list-level', JSON.stringify(listLevel));
    this.dom.setAttribute('data-list-numbering-type', listNumberingType);
    this.dom.setAttribute('data-level', level);

    // A container for the numbering
    this.numberingDOM = document.createElement('span');
    this.numberingDOM.className = 'sd-editor-list-item-numbering';
    this.numberingDOM.textContent = orderMarker;
    this.numberingDOM.setAttribute('contenteditable', 'false');
    this.numberingDOM.addEventListener('click', this.handleNumberingClick);

    // Container for the content
    this.contentDOM = document.createElement('div');
    this.contentDOM.className = 'sd-editor-list-item-content-dom';

    this.dom.appendChild(this.numberingDOM);
    this.dom.appendChild(this.contentDOM);

    // Apply initial indent styling
    this.refreshIndentStyling();
  }

  refreshIndentStyling() {
    const { attrs } = this.node;
    const { styleId, numId, level, indent: inlineIndent } = attrs;

    // Gather visible indents
    const defs = getListItemStyleDefinitions({ styleId, node: this.node, numId, level, editor: this.editor });
    const visibleIndent = getVisibleIndent(defs.stylePpr, defs.numDefPpr, inlineIndent);

    let absoluteLeft = visibleIndent.left - (visibleIndent.hanging || 0);
    if (!absoluteLeft && absoluteLeft !== 0) absoluteLeft = 0;

    // Place the content at the visible indent left
    let contentLeft = visibleIndent.left;
    if (IS_DEBUGGING) {
      console.debug('[ListItemNodeView] absoluteLeft', absoluteLeft);
      console.debug('[ListItemNodeView] contentLeft', contentLeft);
    }

    if (visibleIndent.left === absoluteLeft) {
      absoluteLeft -= 24;
    }

    // Apply the styling
    this.contentDOM.style.marginLeft = `${contentLeft}px`;
    this.numberingDOM.style.left = `${absoluteLeft}px`;
  }

  handleNumberingClick = () => {
    // Respond to numbering clicks here in the future
    // ie: open a modal to customize numbering
  };

  update(node, decorations) {
    this.node = node;
    this.decorations = decorations;

    const { fontSize, fontFamily } = getTextStyleMarksFromLinkedStyles({
      node,
      pos: this.getPos(),
      editor: this.editor,
    });
    this.dom.style.fontSize = fontSize;
    this.dom.style.fontFamily = fontFamily || 'inherit';
  }

  destroy() {
    // Unregister this node view
    activeListItemNodeViews.delete(this);
    this.numberingDOM.removeEventListener('click', this.handleNumberingClick);
  }
}

// Export function to refresh all active list item node views
export function refreshAllListItemNodeViews() {
  activeListItemNodeViews.forEach((nodeView) => {
    try {
      nodeView.refreshIndentStyling();
    } catch (error) {
      console.error('Error refreshing list item node view:', error);
      // Remove broken node views from the set
      activeListItemNodeViews.delete(nodeView);
    }
  });
}

/**
 * Get the text style marks from a list item
 * @param {Node} listItem - The list item node
 * @param {MarkType} markType - The mark type to look for
 * @returns {Array} An array of text style marks
 */
function getListItemTextStyleMarks(listItem, markType) {
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
 * Pull font and size defaults from linked styles,
 * then override them if there are any textStyle marks on this node.
 * @param {Object} params - The parameters
 * @param {Node} params.node - The node to get the styles from
 * @param {number} params.pos - The position of the node
 * @param {Editor} params.editor - The editor instance
 * @returns {Object} The font and size styles
 * @property {string} fontSize - The font size
 * @property {string} fontFamily - The font family
 */
function getTextStyleMarksFromLinkedStyles({ node, pos, editor }) {
  // 1. Get the “base” font + size from linked styles
  const { font: defaultFont, size: defaultSize } = getStylesFromLinkedStyles({ node, pos, editor });

  // 2. Find all textStyle marks on this node
  const textStyleType = getMarkType('textStyle', editor.schema);
  const allMarks = getListItemTextStyleMarks(node, textStyleType);
  const styleMarks = allMarks.filter((m) => m.type === textStyleType);

  // 3. Helpers to find the first mark that has a fontSize / fontFamily attr
  const sizeMark = styleMarks.find((m) => m.attrs.fontSize);
  const familyMark = styleMarks.find((m) => m.attrs.fontFamily);

  // 4. Compute final fontSize (parse it, fall back to default if invalid)
  let fontSize = sizeMark
    ? (() => {
        const [value, unit = 'pt'] = parseSizeUnit(sizeMark.attrs.fontSize);
        return Number.isNaN(value) ? defaultSize : `${value}${unit}`;
      })()
    : defaultSize;

  // 5. Compute final fontFamily (or fall back)
  let fontFamily = familyMark?.attrs.fontFamily ?? defaultFont;

  const firstChild = node.firstChild;
  const hasOnlyOnePar = node.childCount === 1 && firstChild?.type.name === 'paragraph';

  // If a list item contains only one annotation,
  // then we try to take the font from there.
  if (hasOnlyOnePar) {
    const par = firstChild;
    const parFirstChild = par?.firstChild;
    if (par?.childCount === 1 && parFirstChild?.type.name === 'fieldAnnotation') {
      const aFontSize = parFirstChild.attrs.fontSize;
      const aFontFamily = parFirstChild.attrs.fontFamily;
      if (!sizeMark && aFontSize) fontSize = aFontSize;
      if (!familyMark && aFontFamily) fontFamily = aFontFamily;
    }
  }

  return { fontSize, fontFamily };
}

/**
 * Get the styles from linked styles
 * @param {Object} param0
 * @param {Node} param0.node - The node to get the styles from
 * @param {number} param0.pos - The position of the node
 * @param {Editor} param0.editor - The editor instance
 * @returns {Object} The styles
 * @property {string} font - The font family
 * @property {string} size - The font size
 */
const getStylesFromLinkedStyles = ({ node, pos, editor }) => {
  const { state } = editor.view;
  const linkedStyles = LinkedStylesPluginKey.getState(state)?.decorations;
  const decorationsInPlace = linkedStyles?.find(pos, pos + node.nodeSize);
  // We are looking from the end as there may be several decorations
  // and we need to find the most specific one.
  const styleDeco = decorationsInPlace?.findLast((dec) => dec.type.attrs?.style);
  const style = styleDeco?.type.attrs?.style;

  const stylesArray = style?.split(';') || [];
  const fontSizeFromStyles = stylesArray
    .find((s) => s.includes('font-size'))
    ?.split(':')[1]
    .trim();
  const fontFamilyFromStyles = stylesArray
    .find((s) => s.includes('font-family'))
    ?.split(':')[1]
    .trim();

  return {
    font: fontFamilyFromStyles,
    size: fontSizeFromStyles,
  };
};

/**
 * Calculate the visible indent for a list item.
 * This is the combination of the style and num definitions.
 * @param {DocxNode} stylePpr stylePpr The style paragraph properties docx node
 * @param {DocxNode} numDefPpr The num definition paragraph properties docx node
 * @returns {IndentObject} The visible indent object
 */
export const getVisibleIndent = (stylePpr, numDefPpr, inlineIndent) => {
  if (IS_DEBUGGING) console.debug('[getVisibleIndent] inlineIndent', inlineIndent);

  const styleIndentTag = stylePpr?.elements?.find((el) => el.name === 'w:ind') || {};
  const styleIndent = parseIndentElement(styleIndentTag);

  if (IS_DEBUGGING) console.debug('[getVisibleIndent] styleIndent', styleIndent, styleIndentTag);

  const numDefIndentTag = numDefPpr?.elements?.find((el) => el.name === 'w:ind') || {};
  const numDefIndent = parseIndentElement(numDefIndentTag);
  if (IS_DEBUGGING) console.debug('[getVisibleIndent] numDefIndent', numDefIndent, numDefIndentTag, '\n\n');

  const indent = combineIndents(styleIndent, numDefIndent);
  return combineIndents(indent, inlineIndent);
};
