// @ts-check
import { CustomSelectionPluginKey } from '../custom-selection/custom-selection.js';
import { getLineHeightValueString } from '@core/super-converter/helpers.js';
import { findParentNode } from '@helpers/index.js';
import { kebabCase } from '@harbour-enterprises/common';
import { getUnderlineCssString } from './index.js';

// Shared helpers for style resolution
export const LIST_NODE_TYPES = new Set(['orderedList', 'listItem']);
export const PLAIN_STYLE_KEYS = new Set(['text-transform', 'font-size', 'font-family', 'color']);
export const MARK_KEY_TO_CSS = {
  bold: { cssKey: 'font-weight', cssValue: 'bold' },
  italic: { cssKey: 'font-style', cssValue: 'italic' },
  strike: { cssKey: 'text-decoration', cssValue: 'line-through' },
};

export function isListNode(node) {
  return !!node && LIST_NODE_TYPES.has(node.type?.name);
}

export function isTruthyStyleValue(val) {
  const v = val?.value ?? val;
  return v !== '0' && v !== false;
}

export function colorFromStyleValue(value) {
  return typeof value === 'string' ? value : value?.color;
}

export function mergeCssString(map, css) {
  if (!css) return;
  css.split(';').forEach((decl) => {
    const d = decl.trim();
    if (!d) return;
    const idx = d.indexOf(':');
    if (idx === -1) return;
    const k = d.slice(0, idx).trim();
    const v = d.slice(idx + 1).trim();
    if (k) map[k] = v;
  });
}

export function flattenNodeMarks(node) {
  const out = [];
  if (!node?.marks) return out;
  node.marks.forEach((n) => {
    if (n.type?.name === 'textStyle') {
      Object.entries(n.attrs || {}).forEach(([styleKey, v]) => {
        if (!v) return;
        out.push({ key: kebabCase(styleKey), value: v });
      });
      return;
    }
    out.push({ key: n.type?.name, value: n.attrs });
  });
  return out;
}

export function hasInlineMarkOff(node, markName) {
  return !!node?.marks?.some((m) => m.type?.name === markName && m.attrs?.value === '0');
}

export function hasInlineMarkOn(node, markName) {
  return !!node?.marks?.some((m) => m.type?.name === markName && m.attrs?.value !== '0');
}

/**
 * Get the (parsed) linked style from the styles.xml
 * @category Helper
 * @param {string} styleId - The styleId of the linked style
 * @param {Array} styles - The styles array
 * @returns {Object} The linked style and its parent
 * @example
 * const { linkedStyle, basedOnStyle } = getLinkedStyle('Heading1', styles);
 */
export const getLinkedStyle = (styleId, styles = []) => {
  const linkedStyle = styles.find((style) => style.id === styleId);
  const basedOn = linkedStyle?.definition?.attrs?.basedOn;
  const basedOnStyle = styles.find((style) => style.id === basedOn);
  return { linkedStyle, basedOnStyle };
};

/**
 * Convert spacing attributes to CSS style object
 * @category Helper
 * @param {Object} spacing - The spacing object
 * @returns {Object} CSS style properties
 * @private
 */
export const getSpacingStyle = (spacing) => {
  const { lineSpaceBefore, lineSpaceAfter, line, lineRule } = spacing;
  const lineHeightResult = getLineHeightValueString(line, '', lineRule, true);
  const lineHeightStyles = typeof lineHeightResult === 'object' && lineHeightResult !== null ? lineHeightResult : {};

  return {
    'margin-top': lineSpaceBefore + 'px',
    'margin-bottom': lineSpaceAfter + 'px',
    ...lineHeightStyles,
  };
};

/**
 * Convert spacing object to a CSS style string
 * @category Helper
 * @param {Object} spacing - The spacing object
 * @returns {string} The CSS style string
 * @private
 */
export const getSpacingStyleString = (spacing) => {
  const { lineSpaceBefore, lineSpaceAfter, line } = spacing;
  return `
    ${lineSpaceBefore ? `margin-top: ${lineSpaceBefore}px;` : ''}
    ${lineSpaceAfter ? `margin-bottom: ${lineSpaceAfter}px;` : ''}
    ${line ? getLineHeightValueString(line, '') : ''}
  `.trim();
};

/**
 * Convert mark attributes to CSS styles
 * @category Helper
 * @param {Array} attrs - Array of mark attributes
 * @returns {string} CSS style string
 * @private
 */
export const getMarksStyle = (attrs) => {
  let styles = '';
  for (const attr of attrs) {
    switch (attr.type) {
      case 'bold':
        styles += `font-weight: bold; `;
        break;
      case 'italic':
        styles += `font-style: italic; `;
        break;
      case 'underline':
        styles += `text-decoration: underline; `;
        break;
      case 'highlight':
        styles += `background-color: ${attr.attrs.color}; `;
        break;
      case 'textStyle':
        const { fontFamily, fontSize } = attr.attrs;
        styles += `${fontFamily ? `font-family: ${fontFamily};` : ''} ${fontSize ? `font-size: ${fontSize};` : ''}`;
        break;
    }
  }

  return styles.trim();
};

/**
 * Get a sorted list of paragraph quick-format styles from the editor
 * @category Helper
 * @param {Object} editor - The editor instance
 * @returns {Array} Sorted list of paragraph styles
 * @example
 * const quickStyles = getQuickFormatList(editor);
 * // Returns paragraph styles sorted by name
 */
export const getQuickFormatList = (editor) => {
  if (!editor?.converter?.linkedStyles) return [];

  return editor.converter.linkedStyles
    .filter((style) => style.type === 'paragraph' && style.definition?.attrs)
    .sort((a, b) => {
      const nameA = a.definition.attrs?.name ?? '';
      const nameB = b.definition.attrs?.name ?? '';
      return nameA.localeCompare(nameB);
    });
};

/**
 * Convert linked styles and current node marks into a CSS decoration string
 * @category Helper
 * @param {Object} linkedStyle - The linked style object
 * @param {Object} basedOnStyle - The basedOn style object
 * @param {Object} node - The current node
 * @param {Object} parent - The parent of current node
 * @param {boolean} includeSpacing - Whether to include spacing styles
 * @returns {string} The CSS style string for decorations
 * @note Node marks take precedence over linked style properties per Word behavior
 * @private
 */
export const generateLinkedStyleString = (linkedStyle, basedOnStyle, node, parent, includeSpacing = true) => {
  if (!linkedStyle?.definition?.styles) return '';
  const markValue = {};

  const linkedDefinitionStyles = { ...linkedStyle.definition.styles };
  const basedOnDefinitionStyles = { ...basedOnStyle?.definition?.styles };
  const resultStyles = { ...linkedDefinitionStyles };

  const inheritKeys = [
    'font-size',
    'font-family',
    'text-transform',
    'bold',
    'italic',
    'underline',
    'strike',
    'color',
    'highlight',
  ];
  inheritKeys.forEach((k) => {
    if (!linkedDefinitionStyles[k] && basedOnDefinitionStyles[k]) {
      resultStyles[k] = basedOnDefinitionStyles[k];
    }
  });

  Object.entries(resultStyles).forEach(([k, value]) => {
    const key = kebabCase(k);
    const flattenedMarks = flattenNodeMarks(node);

    // If inline underline explicitly sets 'none', force no underline regardless of style
    const underlineNone = node?.marks?.some((m) => m.type?.name === 'underline' && m.attrs?.underlineType === 'none');
    if (underlineNone) {
      markValue['text-decoration'] = 'none';
    }

    // Check if this node has the expected mark. If yes, we are not overriding it
    const mark = flattenedMarks.find((n) => n.key === key);
    const hasParentIndent = Object.keys(parent?.attrs?.indent || {}).length > 0;
    const hasParentSpacing = Object.keys(parent?.attrs?.spacing || {}).length > 0;

    // If no mark already in the node, we override the style
    if (!mark) {
      if (key === 'spacing' && includeSpacing && !hasParentSpacing) {
        const space = getSpacingStyle(value);
        Object.assign(markValue, space);
      } else if (key === 'indent' && includeSpacing && !hasParentIndent) {
        const { leftIndent, rightIndent, firstLine } = value;
        if (leftIndent) markValue['margin-left'] = leftIndent + 'px';
        if (rightIndent) markValue['margin-right'] = rightIndent + 'px';
        if (firstLine) markValue['text-indent'] = firstLine + 'px';
      } else if (key in MARK_KEY_TO_CSS && node && !isListNode(node)) {
        // Respect inline overrides: do not apply style-provided mark if inline mark sets on or off
        if (isTruthyStyleValue(value) && !hasInlineMarkOff(node, key) && !hasInlineMarkOn(node, key)) {
          const { cssKey, cssValue } = MARK_KEY_TO_CSS[key];
          markValue[cssKey] = cssValue;
        }
      } else if (PLAIN_STYLE_KEYS.has(key) && node && !isListNode(node)) {
        markValue[key] = value;
      } else if (key === 'highlight' && node && !isListNode(node)) {
        const hasInlineHighlight = node.marks?.some((m) => m.type?.name === 'highlight');
        if (!hasInlineHighlight) {
          const color = colorFromStyleValue(value);
          if (color) markValue['background-color'] = color;
        }
      } else if (key === 'underline' && node && !isListNode(node)) {
        const styleValRaw = value?.value ?? value ?? '';
        const styleVal = styleValRaw.toString().toLowerCase();
        const hasInlineUnderlineOff = node.marks?.some(
          (m) => m.type?.name === 'underline' && m.attrs?.underlineType === 'none',
        );
        const hasInlineUnderlineOn = node.marks?.some(
          (m) => m.type?.name === 'underline' && m.attrs?.underlineType && m.attrs.underlineType !== 'none',
        );
        if (!hasInlineUnderlineOff && !hasInlineUnderlineOn && styleVal && styleVal !== 'none' && styleVal !== '0') {
          const colorVal = value && typeof value === 'object' ? value.color || value.underlineColor || null : null;
          const css = getUnderlineCssString({ type: styleVal, color: colorVal });
          mergeCssString(markValue, css);
        }
      } else if (typeof value === 'string') {
        markValue[key] = value;
      }
    }
  });

  const final = Object.entries(markValue)
    .map(([key, value]) => `${key}: ${value}`)
    .join(';');
  return final;
};

/**
 * Apply a linked style to a transaction
 * @category Helper
 * @param {Object} tr - The transaction to mutate
 * @param {Object} editor - The editor instance
 * @param {Object} style - The linked style to apply
 * @returns {boolean} Whether the transaction was modified
 * @example
 * const success = applyLinkedStyleToTransaction(tr, editor, headingStyle);
 * @note Clears existing formatting marks when applying styles
 * @note Handles both cursor position and selection ranges
 */
export const applyLinkedStyleToTransaction = (tr, editor, style) => {
  if (!style) return false;

  let selection = tr.selection;
  const state = editor.state;

  // Check for preserved selection from custom selection plugin
  const focusState = CustomSelectionPluginKey.getState(state);
  if (selection.empty && focusState?.preservedSelection) {
    selection = focusState.preservedSelection;
    tr.setSelection(selection);
  }
  // Fallback to lastSelection if no preserved selection
  else if (selection.empty && editor.options.lastSelection) {
    selection = editor.options.lastSelection;
    tr.setSelection(selection);
  }

  const { from, to } = selection;

  // Function to get clean paragraph attributes (strips existing styles)
  const getCleanParagraphAttrs = (node) => {
    const cleanAttrs = {};
    const preservedAttrs = ['id', 'class'];

    preservedAttrs.forEach((attr) => {
      if (node.attrs[attr] !== undefined) {
        cleanAttrs[attr] = node.attrs[attr];
      }
    });

    // Apply the new style
    cleanAttrs.styleId = style.id;

    return cleanAttrs;
  };

  // Function to clear formatting marks from text content
  const clearFormattingMarks = (startPos, endPos) => {
    tr.doc.nodesBetween(startPos, endPos, (node, pos) => {
      if (node.isText && node.marks.length > 0) {
        const marksToRemove = [
          'textStyle',
          'bold',
          'italic',
          'underline',
          'strike',
          'subscript',
          'superscript',
          'highlight',
        ];

        node.marks.forEach((mark) => {
          if (marksToRemove.includes(mark.type.name)) {
            tr.removeMark(pos, pos + node.nodeSize, mark);
          }
        });
      }
      return true;
    });
  };

  // Handle cursor position (no selection)
  if (from === to) {
    let pos = from;
    let paragraphNode = tr.doc.nodeAt(from);

    if (paragraphNode?.type.name !== 'paragraph') {
      const parentNode = findParentNode((node) => node.type.name === 'paragraph')(selection);
      if (!parentNode) return false;
      pos = parentNode.pos;
      paragraphNode = parentNode.node;
    }

    // Clear formatting marks within the paragraph
    clearFormattingMarks(pos + 1, pos + paragraphNode.nodeSize - 1);

    // Apply clean paragraph attributes
    tr.setNodeMarkup(pos, undefined, getCleanParagraphAttrs(paragraphNode));
    return true;
  }

  // Handle selection spanning multiple nodes
  const paragraphPositions = [];

  tr.doc.nodesBetween(from, to, (node, pos) => {
    if (node.type.name === 'paragraph') {
      paragraphPositions.push({ node, pos });
    }
    return true;
  });

  // Apply style to all paragraphs in selection (with clean attributes and cleared marks)
  paragraphPositions.forEach(({ node, pos }) => {
    // Clear formatting marks within this paragraph
    clearFormattingMarks(pos + 1, pos + node.nodeSize - 1);

    // Apply clean paragraph attributes
    tr.setNodeMarkup(pos, undefined, getCleanParagraphAttrs(node));
  });

  return true;
};
