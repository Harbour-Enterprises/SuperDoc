import { CustomSelectionPluginKey } from '../custom-selection/custom-selection.js';
import { getLineHeightValueString } from '@core/super-converter/helpers.js';
import { findParentNode } from '@helpers/index.js';
import { kebabCase } from '@superdoc/common';
import { getUnderlineCssString } from './index.js';
import { twipsToLines, twipsToPixels, halfPointToPixels } from '@converter/helpers.js';
import type { Node as PmNode, Mark } from 'prosemirror-model';
import type { Transaction, EditorState } from 'prosemirror-state';
import { Selection } from 'prosemirror-state';
import type { Step } from 'prosemirror-transform';
import type { Editor } from '@core/Editor.js';

export interface LinkedStyleDefinition {
  id?: string;
  type?: string;
  definition?: {
    attrs?: Record<string, unknown>;
    styles?: Record<string, unknown>;
  };
}

interface SpacingAttrs {
  before?: number;
  after?: number;
  line?: number;
  lineRule?: string;
  beforeAutospacing?: boolean;
  afterAutospacing?: boolean;
  lineSpaceBefore?: number;
  lineSpaceAfter?: number;
  beforeAutoSpacing?: boolean;
  afterAutoSpacing?: boolean;
}

interface MarkAttr {
  type: string;
  attrs: Record<string, unknown>;
}

interface TransactionLike {
  selection: Selection;
  doc: PmNode;
  setSelection: (selection: Selection) => TransactionLike;
  setNodeMarkup: (pos: number, type: unknown, attrs: Record<string, unknown>) => TransactionLike;
  removeMark: (from: number, to: number, mark: Mark) => TransactionLike | void;
  nodesBetween: (from: number, to: number, callback: (node: PmNode, pos: number) => boolean | void) => void;
  mapping?: unknown;
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
export const getLinkedStyle = (
  styleId: string,
  styles: LinkedStyleDefinition[] = [],
): { linkedStyle: LinkedStyleDefinition | undefined; basedOnStyle: LinkedStyleDefinition | undefined } => {
  const linkedStyle = styles.find((style) => style.id === styleId);
  const basedOn = linkedStyle?.definition?.attrs?.basedOn as string | undefined;
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
export const getSpacingStyle = (spacing: SpacingAttrs): Record<string, string> => {
  const { lineSpaceBefore, lineSpaceAfter, line, lineRule, beforeAutoSpacing, afterAutoSpacing } = spacing;
  const lineHeightResult = getLineHeightValueString(line, '', lineRule, true);
  const lineHeightStyles =
    typeof lineHeightResult === 'object' && lineHeightResult !== null
      ? (lineHeightResult as Record<string, string>)
      : {};

  const result: Record<string, string> = {};
  if (!beforeAutoSpacing) {
    const beforeVal = typeof lineSpaceBefore === 'number' ? lineSpaceBefore : 0;
    result['margin-top'] = `${beforeVal}px`;
  }
  if (!afterAutoSpacing) {
    const afterVal = typeof lineSpaceAfter === 'number' ? lineSpaceAfter : 0;
    result['margin-bottom'] = `${afterVal}px`;
  }

  return {
    ...result,
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
export const getSpacingStyleString = (spacing: SpacingAttrs, marks: MarkAttr[], isListItem: boolean): string => {
  const { before: beforeRaw, after: afterRaw, line: lineRaw, lineRule, beforeAutospacing, afterAutospacing } = spacing;
  let before = beforeRaw;
  let after = afterRaw;
  let line: number | string | null = lineRaw ?? null;
  line = twipsToLines(line as number | null);
  // Prevent values less than 1 to avoid squashed text
  if (typeof line === 'number' && line < 1) {
    line = 1;
  }
  if (lineRule === 'exact' && line != null) {
    line = String(line);
  }

  const textStyleMark = marks?.find((mark) => mark.type === 'textStyle');
  const fontSize = textStyleMark?.attrs?.fontSize;

  before = twipsToPixels(before);
  if (beforeAutospacing) {
    if (fontSize) {
      const sizeNum = typeof fontSize === 'number' ? fontSize : Number(fontSize);
      before += halfPointToPixels(sizeNum * 0.5);
    }
    if (isListItem) {
      before = 0; // Lists do not apply before autospacing
    }
  }

  after = twipsToPixels(after);
  if (afterAutospacing) {
    if (fontSize) {
      const sizeNum = typeof fontSize === 'number' ? fontSize : Number(fontSize);
      after += halfPointToPixels(sizeNum * 0.5);
    }
    if (isListItem) {
      after = 0; // Lists do not apply after autospacing
    }
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
export const getMarksStyle = (attrs: MarkAttr[]): string => {
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
export const getQuickFormatList = (editor: Editor): LinkedStyleDefinition[] => {
  if (!editor?.converter?.linkedStyles) return [];

  return editor.converter.linkedStyles
    .filter((style: LinkedStyleDefinition) => style.type === 'paragraph' && style.definition?.attrs)
    .sort((a: LinkedStyleDefinition, b: LinkedStyleDefinition) => {
      const nameA = (a.definition?.attrs as { name?: string } | undefined)?.name ?? '';
      const nameB = (b.definition?.attrs as { name?: string } | undefined)?.name ?? '';
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
export const generateLinkedStyleString = (
  linkedStyle: LinkedStyleDefinition | null,
  basedOnStyle: LinkedStyleDefinition | null,
  node: PmNode | null,
  parent: PmNode | null,
  _includeSpacing = true,
): string => {
  if (!linkedStyle?.definition?.styles) return '';
  const markValue: Record<string, string> = {};

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
    const flattenedMarks: Array<{ key: string; value: unknown }> = [];

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

    // If no mark already in the node, we override the style
    if (!mark) {
      if (key === 'bold' && node) {
        const boldValue =
          typeof value === 'object' && value !== null && 'value' in value ? (value as { value: unknown }).value : value;
        const hasInlineBoldOff = node.marks?.some((m) => m.type?.name === 'bold' && m.attrs?.value === '0');
        const hasInlineBoldOn = node.marks?.some((m) => m.type?.name === 'bold' && m.attrs?.value !== '0');
        if (!hasInlineBoldOff && !hasInlineBoldOn && boldValue !== '0' && boldValue !== false) {
          markValue['font-weight'] = 'bold';
        }
      } else if (key === 'italic' && node) {
        const italicValue =
          typeof value === 'object' && value !== null && 'value' in value ? (value as { value: unknown }).value : value;
        const hasInlineItalicOff = node.marks?.some((m) => m.type?.name === 'italic' && m.attrs?.value === '0');
        const hasInlineItalicOn = node.marks?.some((m) => m.type?.name === 'italic' && m.attrs?.value !== '0');
        if (!hasInlineItalicOff && !hasInlineItalicOn && italicValue !== '0' && italicValue !== false) {
          markValue['font-style'] = 'italic';
        }
      } else if (key === 'strike' && node) {
        const strikeValue =
          typeof value === 'object' && value !== null && 'value' in value ? (value as { value: unknown }).value : value;
        const hasInlineStrikeOff = node.marks?.some((m) => m.type?.name === 'strike' && m.attrs?.value === '0');
        const hasInlineStrikeOn = node.marks?.some(
          (m) => m.type?.name === 'strike' && (m.attrs?.value === undefined || m.attrs?.value !== '0'),
        );
        if (!hasInlineStrikeOff && !hasInlineStrikeOn && strikeValue !== '0' && strikeValue !== false) {
          markValue['text-decoration'] = 'line-through';
        }
      } else if (key === 'text-transform' && node) {
        markValue[key] = value as string;
      } else if (key === 'font-size' && node) {
        markValue[key] = value as string;
      } else if (key === 'font-family' && node) {
        markValue[key] = value as string;
      } else if (key === 'color' && node) {
        markValue[key] = value as string;
      } else if (key === 'highlight' && node) {
        const hasInlineHighlight = node.marks?.some((m) => m.type?.name === 'highlight');
        if (!hasInlineHighlight) {
          const color =
            typeof value === 'string'
              ? value
              : typeof value === 'object' && value !== null && 'color' in value
                ? (value as { color?: unknown }).color
                : undefined;
          if (typeof color === 'string' && color) {
            markValue['background-color'] = color;
          } else if (color != null) {
            markValue['background-color'] = String(color);
          }
        }
      } else if (key === 'underline' && node) {
        const styleValRaw =
          (typeof value === 'object' && value !== null && 'value' in value
            ? (value as { value?: unknown }).value
            : value) ?? '';
        const styleVal = String(styleValRaw).toLowerCase();
        const hasInlineUnderlineOff = node.marks?.some(
          (m) => m.type?.name === 'underline' && m.attrs?.underlineType === 'none',
        );
        const hasInlineUnderlineOn = node.marks?.some(
          (m) => m.type?.name === 'underline' && m.attrs?.underlineType && m.attrs.underlineType !== 'none',
        );
        if (!hasInlineUnderlineOff && !hasInlineUnderlineOn) {
          if (styleVal && styleVal !== 'none' && styleVal !== '0') {
            const colorVal =
              value && typeof value === 'object' && value !== null
                ? 'color' in value
                  ? (value as { color?: unknown }).color
                  : 'underlineColor' in value
                    ? (value as { underlineColor?: unknown }).underlineColor
                    : null
                : null;
            const css = getUnderlineCssString({ type: styleVal, color: colorVal as string | null });
            // apply css string into markValue map
            css.split(';').forEach((decl: string) => {
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
export const applyLinkedStyleToTransaction = (
  tr: Transaction | TransactionLike,
  editor: Editor,
  style: LinkedStyleDefinition | { id: null },
): boolean => {
  if (!style) return false;

  let selection = tr.selection;
  const state = editor.state;

  // Check for preserved selection from custom selection plugin
  const focusState = CustomSelectionPluginKey.getState(state);
  if (selection.empty && focusState?.preservedSelection && !focusState?.preservedSelection.empty) {
    selection = focusState.preservedSelection;
    tr.setSelection(selection);
  }
  // Fallback to lastSelection if no preserved selection
  else if (selection.empty && editor.options.lastSelection instanceof Selection) {
    selection = editor.options.lastSelection;
    tr.setSelection(selection);
  }

  const { from, to } = selection;

  // Function to get clean paragraph attributes (strips existing styles)
  const getUpdatedParagraphAttrs = (node: PmNode): Record<string, unknown> => {
    return {
      ...node.attrs,
      paragraphProperties: {
        ...(node.attrs.paragraphProperties || {}),
        styleId: style.id,
      },
    };
  };

  // Function to clear formatting marks from text content
  const clearFormattingMarks = (startPos: number, endPos: number): void => {
    tr.doc.nodesBetween(startPos, endPos, (node: PmNode, pos: number) => {
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

    // Update paragraph attributes
    tr.setNodeMarkup(pos, undefined, getUpdatedParagraphAttrs(paragraphNode));
    return true;
  }

  // Handle selection spanning multiple nodes
  const paragraphPositions: Array<{ node: PmNode; pos: number }> = [];

  tr.doc.nodesBetween(from, to, (node: PmNode, pos: number) => {
    if (node.type.name === 'paragraph') {
      paragraphPositions.push({ node, pos });
    }
    return true;
  });

  // Apply style to all paragraphs in selection (with clean attributes and cleared marks)
  paragraphPositions.forEach(({ node, pos }: { node: PmNode; pos: number }) => {
    // Clear formatting marks within this paragraph
    clearFormattingMarks(pos + 1, pos + node.nodeSize - 1);

    // Apply clean paragraph attributes
    tr.setNodeMarkup(pos, undefined, getUpdatedParagraphAttrs(node));
  });

  return true;
};

// Detect typing inside any styled paragraph so decorations can be rebuilt
export const stepInsertsTextIntoStyledParagraph = (
  tr: Transaction,
  oldEditorState: EditorState,
  step: Step,
  stepIndex: number,
): boolean => {
  const slice = (
    step as unknown as {
      slice?: { size: number; content: { descendants: (callback: (node: PmNode) => boolean | void) => void } };
      from?: number;
    }
  ).slice;
  const from = (step as unknown as { from?: number }).from;
  if (!slice || slice.size === 0 || typeof from !== 'number') {
    return false;
  }

  let insertsText = false;
  slice.content.descendants((node: PmNode) => {
    if (node.type?.name === 'text' && node.text?.length) {
      insertsText = true;
      return false;
    }
    return true;
  });

  if (!insertsText) return false;

  const docBeforeStep = (tr as unknown as { docs?: PmNode[] }).docs?.[stepIndex] || oldEditorState.doc;
  if (!docBeforeStep) return false;
  const resolvedPos = Math.min(from, docBeforeStep.content.size);
  const $pos = docBeforeStep.resolve(resolvedPos);
  for (let depth = $pos.depth; depth >= 0; depth--) {
    const node = $pos.node(depth);
    if (node?.type?.name === 'paragraph') {
      return Boolean(node.attrs?.paragraphProperties?.styleId);
    }
  }
  return false;
};
