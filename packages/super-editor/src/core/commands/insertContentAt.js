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
 * @param {import("prosemirror-model").ResolvedPos} position
 * @param {string|Array<string|ProseMirrorNode>} value
 * @param {Object} options
 * @returns
 */
export const insertContentAt =
  (position, value, options) =>
  ({ tr, dispatch, editor }) => {
    if (dispatch) {
      options = {
        parseOptions: {},
        updateSelection: true,
        applyInputRules: false,
        applyPasteRules: false,
        ...options,
      };

      let content;

      try {
        content = createNodeFromContent(value, editor.schema, {
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
        typeof position === 'number' ? { from: position, to: position } : { from: position.from, to: position.to };

      // If the original input is plainly textual, prefer insertText regardless of how parsing represents it.
      const forceTextInsert =
        typeof value === 'string' ||
        (Array.isArray(value) && value.every((v) => typeof v === 'string' || (v && typeof v.text === 'string'))) ||
        (value && typeof value === 'object' && typeof value.text === 'string');

      let isOnlyTextContent = forceTextInsert; // start true for plain text inputs
      let isOnlyBlockContent = true;
      const nodes = isFragment(content) ? content : [content];

      nodes.forEach((node) => {
        // check if added node is valid
        node.check();

        // only refine text heuristic if we are NOT forcing text insertion based on the original value
        if (!forceTextInsert) {
          isOnlyTextContent = isOnlyTextContent ? node.isText && node.marks.length === 0 : false;
        }

        isOnlyBlockContent = isOnlyBlockContent ? node.isBlock : false;
      });

      // check if we can replace the wrapping node by
      // the newly inserted content
      // example:
      // replace an empty paragraph by an inserted image
      // instead of inserting the image below the paragraph
      if (from === to && isOnlyBlockContent) {
        const { parent } = tr.doc.resolve(from);
        const isEmptyTextBlock = parent.isTextblock && !parent.type.spec.code && !parent.childCount;

        if (isEmptyTextBlock) {
          from -= 1;
          to += 1;
        }
      }

      let newContent;

      // if there is only plain text we have to use `insertText`
      // because this will keep the current marks
      if (isOnlyTextContent) {
        // if value is string, we can use it directly
        // otherwise if it is an array, we have to join it
        if (Array.isArray(value)) {
          newContent = value.map((v) => (typeof v === 'string' ? v : (v && v.text) || '')).join('');
        } else if (typeof value === 'object' && !!value && !!value.text) {
          newContent = value.text;
        } else {
          newContent = value;
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
    }

    return true;
  };
