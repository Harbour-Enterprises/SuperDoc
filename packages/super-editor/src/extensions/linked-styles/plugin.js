// @ts-check
import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import { generateLinkedStyleString, getLinkedStyle } from './helpers.js';

/**
 * Plugin key for accessing linked styles state
 */
export const LinkedStylesPluginKey = new PluginKey('linkedStyles');

/**
 * Create the linked styles ProseMirror plugin
 * @category Helper
 * @param {Object} editor - The editor instance
 * @returns {Object} The linked styles plugin
 * @example
 * const plugin = createLinkedStylesPlugin(editor);
 * @note Only activates in docx mode with converter available
 * @note Generates decorations for visual style application
 */
export const createLinkedStylesPlugin = (editor) => {
  return new Plugin({
    key: LinkedStylesPluginKey,
    state: {
      /**
       * Initialize plugin state with styles and decorations
       * @returns {Object} Initial state with styles and decorations
       * @private
       */
      init() {
        if (!editor.converter || editor.options.mode !== 'docx') return {};
        const styles = editor.converter?.linkedStyles || [];
        return {
          styles,
          decorations: generateDecorations(editor.state, styles),
        };
      },
      /**
       * Update decorations when document changes
       * @param {Object} tr - The transaction
       * @param {Object} prev - Previous plugin state
       * @param {Object} oldEditorState - Old editor state
       * @param {Object} newEditorState - New editor state
       * @returns {Object} Updated state with styles and decorations
       * @private
       */
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
      /**
       * Provide decorations to the editor view
       * @param {Object} state - Current editor state
       * @returns {Object} The decoration set
       * @private
       */
      decorations(state) {
        return LinkedStylesPluginKey.getState(state)?.decorations;
      },
    },
  });
};

/**
 * Generate style decorations for linked styles
 * @category Helper
 * @param {Object} state - Editor state
 * @param {Array} styles - The linked styles array
 * @returns {Object} The decoration set for visual styling
 * @example
 * const decorations = generateDecorations(editorState, linkedStyles);
 * @note Creates inline decorations with CSS styles
 * @note Respects style inheritance and mark precedence
 * @private
 */
const generateDecorations = (state, styles) => {
  const decorations = [];
  let lastStyleId = null;
  const doc = state?.doc;

  doc.descendants((node, pos) => {
    const { name } = node.type;

    if (node?.attrs?.styleId) lastStyleId = node.attrs.styleId;
    if (name === 'paragraph' && !node.attrs?.styleId) lastStyleId = null;
    if (name !== 'text' && name !== 'listItem' && name !== 'orderedList') return;

    // Get the last styleId from the node marks
    // This allows run-level styles and styleIds to override paragraph-level styles
    for (const mark of node.marks) {
      if (mark.type.name === 'textStyle' && mark.attrs.styleId) {
        lastStyleId = mark.attrs.styleId;
      }
    }
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
