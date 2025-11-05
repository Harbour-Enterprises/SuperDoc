import { createNodeFromContent } from '../helpers/createNodeFromContent';
import { selectionToInsertionEnd } from '../helpers/selectionToInsertionEnd';

/**
 * @typedef {import("prosemirror-model").Node} ProseMirrorNode
 * @typedef {import("prosemirror-model").Fragment} ProseMirrorFragment
 */

/**
 * Checks if the given node or fragment is a ProseMirror Fragment.
 * @param {ProseMirrorNode|ProseMirrorFragment} nodeOrFragment
 * @returns {boolean}
 */
const isFragment = (nodeOrFragment) => {
  return !('type' in nodeOrFragment);
};

/**
 * Inserts content at the specified position.
 * - Bare strings with newlines → insertText (keeps literal \n)
 * - HTML-looking strings → parse and replaceWith
 * - Arrays of strings / {text} objects → insertText
 *
 * @param {import("prosemirror-model").ResolvedPos|number|{from:number,to:number}} position
 * @param {string|Array<string|{text?:string}>|ProseMirrorNode|ProseMirrorFragment} value
 * @param {Object} options
 * @returns {boolean}
 */
// prettier-ignore
export const insertContentAt =
  (position, value, options) =>
  ({ tr, dispatch, editor }) => {
    if (!dispatch) return true;

    options = {
      parseOptions: {},
      updateSelection: true,
      applyInputRules: false,
      applyPasteRules: false,
      // optional escape hatch to force literal text insertion
      asText: false,
      ...options,
    };

    let content;

    try {
      content = createNodeFromContent(value, editor, {
        parseOptions: {
          preserveWhitespace: 'full',
          ...options.parseOptions,
        },
        errorOnInvalidContent: options.errorOnInvalidContent ?? editor.options.enableContentCheck,
      });
    } catch (e) {
      editor.emit('contentError', {
        editor,
        error: e,
        disableCollaboration: () => {
          console.error('[super-editor error]: Unable to disable collaboration at this point in time');
        },
      });
      return false;
    }

    let { from, to } =
      typeof position === 'number'
        ? { from: position, to: position }
        : { from: position.from, to: position.to };

    // Heuristic:
    // - Bare strings that LOOK like HTML: let parser handle (replaceWith)
    // - Bare strings with one or more newlines: force text insertion (insertText)
    const isBareString = typeof value === 'string';
    const looksLikeHTML = isBareString && /^\s*<[a-zA-Z][^>]*>.*<\/[a-zA-Z][^>]*>\s*$/s.test(value);
    const hasNewline = isBareString && /[\r\n]/.test(value);
    const forceTextInsert =
      !!options.asText ||
      (hasNewline && !looksLikeHTML) ||
      (Array.isArray(value) && value.every((v) => typeof v === 'string' || (v && typeof v.text === 'string'))) ||
      (!!value && typeof value === 'object' && typeof value.text === 'string');

    // Inspect parsed nodes to decide text vs block replacement
    let isOnlyTextContent = true;
    let isOnlyBlockContent = true;
    const nodes = isFragment(content) ? content : [content];

    nodes.forEach((node) => {
      // validate node
      node.check();

      // only-plain-text if every node is an unmarked text node
      isOnlyTextContent = isOnlyTextContent ? (node.isText && node.marks.length === 0) : false;

      isOnlyBlockContent = isOnlyBlockContent ? node.isBlock : false;
    });

    // Replace empty textblock wrapper when inserting blocks at a cursor
    if (from === to && isOnlyBlockContent) {
      const { parent } = tr.doc.resolve(from);
      const isEmptyTextBlock = parent.isTextblock && !parent.type.spec.code && !parent.childCount;

      if (isEmptyTextBlock) {
        from -= 1;
        to += 1;
      }
    }

    let newContent;

    // Use insertText for pure text OR when explicitly/heuristically forced
    if (isOnlyTextContent || forceTextInsert) {
      if (Array.isArray(value)) {
        newContent = value.map((v) => (typeof v === 'string' ? v : (v && v.text) || '')).join('');
      } else if (typeof value === 'object' && !!value && !!value.text) {
        newContent = value.text;
      } else {
        newContent = typeof value === 'string' ? value : '';
      }

      tr.insertText(newContent, from, to);
    } else {
      newContent = content;
      tr.replaceWith(from, to, newContent);
    }

    // set cursor at end of inserted content
    if (options.updateSelection) {
      selectionToInsertionEnd(tr, tr.steps.length - 1, -1);
    }

    if (options.applyInputRules) {
      tr.setMeta('applyInputRules', { from, text: newContent });
    }

    if (options.applyPasteRules) {
      tr.setMeta('applyPasteRules', { from, text: newContent });
    }

    return true;
  };
