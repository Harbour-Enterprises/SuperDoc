import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import { Extension } from '@core/Extension.js';
import { kebabCase } from '@harbour-enterprises/common';
import { findParentNode } from '@helpers/index.js';
import { getLineHeightValueString } from '../../core/super-converter/helpers.js';

export const LinkedStylesPluginKey = new PluginKey('linkedStyles');

export const LinkedStyles = Extension.create({
  name: 'linkedStyles',

  priority: 1, // We need this plugin to run before the list plugins

  addPmPlugins() {
    return [createLinkedStylesPlugin(this.editor)];
  },

  addCommands() {
    return {
      setLinkedStyle: (style) => (params) => {
        if (!style) return;
        const { tr } = params;
        const selection = tr.selection;
        const { from, to } = selection;
        if (from === to) return;

        let pos = from;
        let paragraphNode = tr.doc.nodeAt(from);
        if (paragraphNode.type.name !== 'paragraph') {
          const parentNode = findParentNode((node) => node.type.name === 'paragraph')(tr.selection) || {};
          pos = parentNode.pos;
          paragraphNode = parentNode.node;
        }

        tr.setNodeMarkup(pos, undefined, {
          ...paragraphNode.attrs,
          styleId: style.id,
        });
      },
    };
  },
});

/**
 * The linked styles plugin
 */
const createLinkedStylesPlugin = (editor) => {
  return new Plugin({
    key: LinkedStylesPluginKey,
    state: {
      init(_, { doc, selection }) {
        if (!editor.converter || editor.options.mode !== 'docx') return {};
        const styles = editor.converter?.linkedStyles || [];
        return {
          styles,
          decorations: generateDecorations(editor.state, styles),
        };
      },
      apply(tr, prev, oldEditorState, newEditorState) {
        if (!editor.converter || editor.options.mode !== 'docx') return { ...prev };
        let decorations = prev.decorations || DecorationSet.empty;
        if (tr.docChanged) {
          const styles = LinkedStylesPluginKey.getState(editor.state).styles;
          decorations = generateDecorations(newEditorState, styles);
        }

        return { ...prev, decorations };
      },
    },
    props: {
      decorations(state) {
        return LinkedStylesPluginKey.getState(state)?.decorations;
      },
    },
  });
};

/**
 * Generate style decorations for linked styles
 *
 * @param {Object} state Editor state
 * @param {Array[Object]} styles The linked styles
 * @returns {DecorationSet} The decorations
 */
const generateDecorations = (state, styles) => {
  const decorations = [];
  let lastStyleId = null;
  const doc = state?.doc;

  doc.descendants((node, pos) => {
    const { name } = node.type;

    // Track the current StyleId
    if (node?.attrs?.styleId) lastStyleId = node.attrs.styleId;
    if (name === 'paragraph' && !node.attrs?.styleId) lastStyleId = null;
    if (name !== 'text' && name !== 'listItem' && name !== 'orderedList') return;

    const { linkedStyle, basedOnStyle } = getLinkedStyle(lastStyleId, styles);
    if (!linkedStyle) return;

    const $pos = state.doc.resolve(pos);
    const parent = $pos.parent;

    const styleString = generateLinkedStyleString(linkedStyle, basedOnStyle, node, parent);
    if (!styleString) return;

    const decoration = Decoration.inline(pos, pos + node.nodeSize, { style: styleString });
    decorations.push(decoration);
  });
  return DecorationSet.create(doc, decorations);
};

/**
 * Convert the linked styles and current node marks into a decoration string
 * If the node contains a given mark, we don't override it with the linked style per MS Word behavior
 *
 * @param {Object} linkedStyle The linked style object
 * @param {Object} basedOnStyle The basedOn style object
 * @param {Object} node The current node
 * @param {Object} parent The parent of current
 * @returns {String} The style string
 */
export const generateLinkedStyleString = (linkedStyle, basedOnStyle, node, parent, includeSpacing = true) => {
  if (!linkedStyle?.definition?.styles) return '';
  const markValue = {};

  const linkedDefinitionStyles = { ...linkedStyle.definition.styles };
  const basedOnDefinitionStyles = { ...basedOnStyle?.definition?.styles };
  const resultStyles = { ...linkedDefinitionStyles };

  if (!linkedDefinitionStyles['font-size'] && basedOnDefinitionStyles['font-size']) {
    resultStyles['font-size'] = basedOnDefinitionStyles['font-size'];
  }
  if (!linkedDefinitionStyles['text-transform'] && basedOnDefinitionStyles['text-transform']) {
    resultStyles['text-transform'] = basedOnDefinitionStyles['text-transform'];
  }

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
      } else if (key === 'bold') {
        const val = value?.value;
        if (!listTypes.includes(node.type.name) && val !== '0') {
          markValue['font-weight'] = 'bold';
        }
      } else if (key === 'text-transform') {
        if (!listTypes.includes(node.type.name)) {
          markValue[key] = value;
        }
      } else if (key === 'font-size') {
        if (!listTypes.includes(node.type.name)) {
          markValue[key] = value;
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
 * Get the (parsed) linked style from the styles.xml
 *
 * @param {String} styleId The styleId of the linked style
 * @param {Array[Object]} styles The styles array
 * @returns {Object} The linked style
 */
const getLinkedStyle = (styleId, styles = []) => {
  const linkedStyle = styles.find((style) => style.id === styleId);
  const basedOn = linkedStyle?.definition?.attrs?.basedOn;
  const basedOnStyle = styles.find((style) => style.id === basedOn);
  return { linkedStyle, basedOnStyle };
};

export const getSpacingStyle = (spacing) => {
  const { lineSpaceBefore, lineSpaceAfter, line, lineRule } = spacing;
  return {
    'margin-top': lineSpaceBefore + 'px',
    'margin-bottom': lineSpaceAfter + 'px',
    ...getLineHeightValueString(line, '', lineRule, true),
  };
};

/**
 * Convert spacing object to a style string
 *
 * @param {Object} spacing The spacing object
 * @returns {String} The style string
 */
export const getSpacingStyleString = (spacing) => {
  const { lineSpaceBefore, lineSpaceAfter, line } = spacing;
  return `
    ${lineSpaceBefore ? `margin-top: ${lineSpaceBefore}px;` : ''}
    ${lineSpaceAfter ? `margin-bottom: ${lineSpaceAfter}px;` : ''}
    ${line ? getLineHeightValueString(line, '') : ''}
  `.trim();
};

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
    }
  }

  return styles.trim();
};

export const getQuickFormatList = (editor) => {
  if (!editor?.converter) return [];
  const styles = editor.converter.linkedStyles || [];
  return styles
    .filter((style) => {
      return style.type === 'paragraph' && style.definition.attrs;
    })
    .sort((a, b) => {
      return a.definition.attrs?.name.localeCompare(b.definition.attrs?.name);
    });
};
