// @ts-check
import { Node } from '@core/index.js';

/**
 * @module Document
 * @sidebarTitle Document
 * @snippetPath /snippets/extensions/document.mdx
 */
export const Document = Node.create({
  name: 'doc',

  topNode: true,

  content: 'block+',

  parseDOM() {
    return [{ tag: 'doc' }];
  },

  renderDOM() {
    return ['doc', 0];
  },

  addAttributes() {
    return {
      /**
       * @private
       * @category Attribute
       * @param {Object} [attributes] - Internal document attributes
       */
      attributes: {
        rendered: false,
        'aria-label': 'Document node',
      },
    };
  },

  addCommands() {
    return {
      /**
       * Get document statistics
       * @category Command
       * @returns {Function} Command function
       * @example
       * // Get word and character count
       * getDocumentStats()
       * @note Returns word count, character count, and paragraph count
       */
      getDocumentStats:
        () =>
        ({ editor }) => {
          const text = editor.getText();
          const words = text.split(/\s+/).filter((word) => word.length > 0).length;
          const characters = text.length;
          const paragraphs = editor.state.doc.content.childCount;

          return {
            words,
            characters,
            paragraphs,
          };
        },

      /**
       * Clear entire document
       * @category Command
       * @returns {Function} Command function
       * @example
       * clearDocument()
       * @note Replaces all content with an empty paragraph
       */
      clearDocument:
        () =>
        ({ commands }) => {
          return commands.setContent('<p></p>');
        },
    };
  },
});
