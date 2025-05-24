import { LinkedStylesPluginKey } from '../linked-styles/linked-styles.js';
import { getMarkType } from '@core/helpers/index.js';
import { parseSizeUnit } from '@core/utilities/index.js';
import {
  getStyleTagFromStyleId,
  getAbstractDefinition,
  getDefinitionForLevel,
  parseIndentElement,
  combineIndents,
} from '@core/super-converter/v2/importer/listImporter.js';
import { generateOrderedListIndex } from '@helpers/orderedListUtils.js';


const IS_DEBUGGING = true;

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
export class ListItemNodeView {
  constructor(node, getPos, decorations, editor) {
    this.node = node;
    this.editor = editor;
    this.decorations = decorations;
    this.view = editor.view;
    this.getPos = getPos;
    this.editor = editor;

    this.#init();
  }

  #init() {
    const { attrs } = this.node;
    const { styleId, listLevel, listNumberingType, lvlText, numId, level, indent: inlineIndent } = attrs;

    let orderMarker = '';
    if (listLevel) {
      orderMarker = generateOrderedListIndex({
        listLevel,
        lvlText,
        listNumberingType,
      });
    };

    const pos = this.getPos();
    const { fontSize, fontFamily } = getTextStyleMarksFromLinkedStyles({
      node: this.node,
      pos,
      editor: this.editor,
    });
  
    // Gather visible indents
    const defs = getListItemStyleDefinitions({ styleId, node: this.node, numId, level, editor: this.editor });
    const visibleIndent = getVisibleIndent(defs.stylePpr, defs.numDefPpr, inlineIndent);
    console.debug('VISIBLEINDENT', visibleIndent, '\n\n\n\n');
    let absoluteLeft = visibleIndent.left - (visibleIndent.hanging || 0);
    if (!absoluteLeft && absoluteLeft !== 0) absoluteLeft = 0;

    // Container for the entire node view
    this.dom = document.createElement("li");
    this.dom.className = "sd-editor-list-item-node-view";
    this.dom.style.fontSize = fontSize;
    this.dom.style.fontFamily = fontFamily;

    // A container for the numbering
    this.numberingDOM = document.createElement("span");
    this.numberingDOM.className = "sd-editor-list-item-numbering";
    this.numberingDOM.textContent = orderMarker;
    this.numberingDOM.setAttribute("contenteditable", "false");
    this.numberingDOM.addEventListener('click', this.handleNumberingClick);

    // Container for the content
    this.contentDOM = document.createElement("p");
    this.contentDOM.className = "sd-editor-list-item-content-dom";

    // Place the content at the visible indent left
    let contentLeft = visibleIndent.left;
    if (visibleIndent.left === absoluteLeft) {
      contentLeft = 48;
    }
    this.contentDOM.style.marginLeft = `${contentLeft}px`;

    // We use the absolute left for the numbering (left - hanging)
    this.numberingDOM.style.left = `${absoluteLeft}px`;

    this.dom.appendChild(this.numberingDOM);
    this.dom.appendChild(this.contentDOM);
  }

  handleNumberingClick = (event) => {
    // Respond to numbering clicks here in the future
    // ie: open a modal to customize numbering
  }

  update(node) {
    if (node.type !== this.node.type) return false;
    this.node = node;
    return true;
  }

  destroy() {
    this.numberingDOM.removeEventListener('click', this.handleNumberingClick);
  }
};

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
};

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
  const { font: defaultFont, size: defaultSize } =
    getStylesFromLinkedStyles({ node, pos, editor });

  // 2. Find all textStyle marks on this node
  const textStyleType = getMarkType('textStyle', editor.schema);
  const allMarks = getListItemTextStyleMarks(node, textStyleType);
  const styleMarks = allMarks.filter(m => m.type === textStyleType);

  // 3. Helpers to find the first mark that has a fontSize / fontFamily attr
  const sizeMark = styleMarks.find(m => m.attrs.fontSize);
  const familyMark = styleMarks.find(m => m.attrs.fontFamily);

  // 4. Compute final fontSize (parse it, fall back to default if invalid)
  const fontSize = sizeMark
    ? (() => {
        const [value, unit = 'pt'] = parseSizeUnit(sizeMark.attrs.fontSize);
        return Number.isNaN(value)
          ? defaultSize
          : `${value}${unit}`;
      })()
    : defaultSize;

  // 5. Compute final fontFamily (or fall back)
  const fontFamily = familyMark?.attrs.fontFamily ?? defaultFont;

  return { fontSize, fontFamily };
};

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
  const styleDeco = decorationsInPlace?.find((dec) => dec.type.attrs?.style);
  const style = styleDeco?.type.attrs?.style;

  const stylesArray = style?.split(';') || [];
  const fontSizeFromStyles = stylesArray.find((s) => s.includes('font-size'))?.split(':')[1].trim();
  const fontFamilyFromStyles = stylesArray.find((s) => s.includes('font-family'))?.split(':')[1].trim();

  return {
    font: fontFamilyFromStyles,
    size: fontSizeFromStyles,
  }
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

/**
 * Get docx style definitions for a list item.
 * This returns the docx pPr nodes in the docx and needs to be translated further
 * @param {Object} param0 
 * @param {string} param0.styleId - The style id
 * @param {string} param0.numId - The num id
 * @param {number} param0.level - The level of the list item
 * @param {Editor} param0.editor - The editor instance
 * @returns {Object} The style definitions
 * @property {DocxNode} stylePpr - The style paragraph properties docx node
 * @property {DocxNode} numDefPpr - The num definition paragraph properties docx node
 */
export const getListItemStyleDefinitions = ({ styleId, numId, level, editor }) => {  
  const docx = editor?.converter?.convertedXml;

  // We need definitions for the styleId if we have one.
  const styleDefinition = getStyleTagFromStyleId(styleId, docx);
  const stylePpr = styleDefinition?.elements.find((el) => el.name === 'w:pPr');

  // We also check definitions for the numId which can contain styles.
  const abstractDefinition = getAbstractDefinition(numId, docx);
  const numDefinition = getDefinitionForLevel(abstractDefinition, level);
  const numDefPpr = numDefinition?.elements.find((el) => el.name === 'w:pPr');

  return {
    stylePpr,
    numDefPpr,
  }
};
