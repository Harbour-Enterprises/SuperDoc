// @ts-check
import { CustomSelectionPluginKey } from '../custom-selection/custom-selection.js';
import { getLineHeightValueString } from '@core/super-converter/helpers.js';
import { findParentNode } from '@helpers/index.js';
import { kebabCase } from '@harbour-enterprises/common';
import { getUnderlineCssString } from './index.js';
import { twipsToLines, twipsToPixels, twipsToPt, halfPointToPixels } from '@converter/helpers.js';

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
 * @param {Array} marks - The marks array for font size reference
 * @returns {string} The CSS style string
 * @private
 */
export const getSpacingStyleString = (spacing, marks) => {
  let { before, after, line, lineRule, beforeAutospacing, afterAutospacing } = spacing;
  line = twipsToLines(line);
  if (lineRule === 'exact' && line) {
    line = `${twipsToPt(line)}pt`;
  }

  const textStyleMark = marks.find((mark) => mark.type === 'textStyle');
  const fontSize = textStyleMark?.attrs?.fontSize;

  before = twipsToPixels(before);
  if (beforeAutospacing && fontSize) {
    before += halfPointToPixels(parseInt(fontSize) * 0.5);
  }

  after = twipsToPixels(after);
  if (afterAutospacing && fontSize) {
    after += halfPointToPixels(parseInt(fontSize) * 0.5);
  }

  return `
    ${before ? `margin-top: ${before}px;` : ''}
    ${after ? `margin-bottom: ${after}px;` : ''}
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
    const flattenedMarks = [];

    // Flatten node marks (including text styles) for comparison
    node?.marks?.forEach((n) => {
      if (n.type.name === 'textStyle') {
        Object.entries(n.attrs).forEach(([styleKey, value]) => {
          const parsedKey = kebabCase(styleKey);
          if (!value) return;
          flattenedMarks.push({ key: parsedKey, value });
        });
        return;
      }

      flattenedMarks.push({ key: n.type.name, value: n.attrs[key] });
    });

    // If inline underline explicitly sets 'none', force no underline regardless of style
    const underlineNone = node?.marks?.some((m) => m.type?.name === 'underline' && m.attrs?.underlineType === 'none');
    if (underlineNone) {
      markValue['text-decoration'] = 'none';
    }

    // Check if this node has the expected mark. If yes, we are not overriding it
    const mark = flattenedMarks.find((n) => n.key === key);
    const hasParentIndent = Object.keys(parent?.attrs?.indent || {});
    const hasParentSpacing = Object.keys(parent?.attrs?.spacing || {});

    const listTypes = ['orderedList', 'listItem'];

    // If no mark already in the node, we override the style
    if (!mark) {
      if (key === 'spacing' && includeSpacing && !hasParentSpacing) {
        const space = getSpacingStyle(value);
        Object.entries(space).forEach(([k, v]) => {
          markValue[k] = v;
        });
      } else if (key === 'indent' && includeSpacing && !hasParentIndent) {
        const { leftIndent, rightIndent, firstLine } = value;

        if (leftIndent) markValue['margin-left'] = leftIndent + 'px';
        if (rightIndent) markValue['margin-right'] = rightIndent + 'px';
        if (firstLine) markValue['text-indent'] = firstLine + 'px';
      } else if (key === 'bold' && node) {
        const boldValue = typeof value === 'object' && value !== null ? value.value : value;
        const hasInlineBoldOff = node.marks?.some((m) => m.type?.name === 'bold' && m.attrs?.value === '0');
        const hasInlineBoldOn = node.marks?.some((m) => m.type?.name === 'bold' && m.attrs?.value !== '0');
        if (
          !listTypes.includes(node.type.name) &&
          !hasInlineBoldOff &&
          !hasInlineBoldOn &&
          boldValue !== '0' &&
          boldValue !== false
        ) {
          markValue['font-weight'] = 'bold';
        }
      } else if (key === 'italic' && node) {
        const italicValue = typeof value === 'object' && value !== null ? value.value : value;
        const hasInlineItalicOff = node.marks?.some((m) => m.type?.name === 'italic' && m.attrs?.value === '0');
        const hasInlineItalicOn = node.marks?.some((m) => m.type?.name === 'italic' && m.attrs?.value !== '0');
        if (
          !listTypes.includes(node.type.name) &&
          !hasInlineItalicOff &&
          !hasInlineItalicOn &&
          italicValue !== '0' &&
          italicValue !== false
        ) {
          markValue['font-style'] = 'italic';
        }
      } else if (key === 'strike' && node) {
        const strikeValue = typeof value === 'object' && value !== null ? value.value : value;
        const hasInlineStrikeOff = node.marks?.some((m) => m.type?.name === 'strike' && m.attrs?.value === '0');
        const hasInlineStrikeOn = node.marks?.some(
          (m) => m.type?.name === 'strike' && (m.attrs?.value === undefined || m.attrs?.value !== '0'),
        );
        if (
          !listTypes.includes(node.type.name) &&
          !hasInlineStrikeOff &&
          !hasInlineStrikeOn &&
          strikeValue !== '0' &&
          strikeValue !== false
        ) {
          markValue['text-decoration'] = 'line-through';
        }
      } else if (key === 'text-transform' && node) {
        if (!listTypes.includes(node.type.name)) {
          markValue[key] = value;
        }
      } else if (key === 'font-size' && node) {
        if (!listTypes.includes(node.type.name)) {
          markValue[key] = value;
        }
      } else if (key === 'font-family' && node) {
        if (!listTypes.includes(node.type.name)) {
          markValue[key] = value;
        }
      } else if (key === 'color' && node) {
        if (!listTypes.includes(node.type.name)) {
          markValue[key] = value;
        }
      } else if (key === 'highlight' && node) {
        const hasInlineHighlight = node.marks?.some((m) => m.type?.name === 'highlight');
        if (!listTypes.includes(node.type.name) && !hasInlineHighlight) {
          const color = typeof value === 'string' ? value : value?.color;
          if (color) markValue['background-color'] = color;
        }
      } else if (key === 'underline' && node) {
        const styleValRaw = value?.value ?? value ?? '';
        const styleVal = styleValRaw.toString().toLowerCase();
        const hasInlineUnderlineOff = node.marks?.some(
          (m) => m.type?.name === 'underline' && m.attrs?.underlineType === 'none',
        );
        const hasInlineUnderlineOn = node.marks?.some(
          (m) => m.type?.name === 'underline' && m.attrs?.underlineType && m.attrs.underlineType !== 'none',
        );
        if (!listTypes.includes(node.type.name) && !hasInlineUnderlineOff && !hasInlineUnderlineOn) {
          if (styleVal && styleVal !== 'none' && styleVal !== '0') {
            const colorVal = value && typeof value === 'object' ? value.color || value.underlineColor || null : null;
            const css = getUnderlineCssString({ type: styleVal, color: colorVal });
            // apply css string into markValue map
            css.split(';').forEach((decl) => {
              const d = decl.trim();
              if (!d) return;
              const idx = d.indexOf(':');
              if (idx === -1) return;
              const k = d.slice(0, idx).trim();
              const v = d.slice(idx + 1).trim();
              markValue[k] = v;
            });
          }
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
