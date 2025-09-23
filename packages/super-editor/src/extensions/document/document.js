// @ts-check
import { Node } from '@core/index.js';

/**
 * Configuration options for Document
 * @typedef {Object} DocumentOptions
 * @category Options
 * @example
 * // Document node is the root - always included
 * new SuperDoc({
 *   selector: '#editor',
 *   document: 'document.docx',
 *   // Document node wraps all content
 * });
 */

/**
 * Attributes for document nodes
 * @typedef {Object} DocumentAttributes
 * @category Attributes
 * @property {Object} [attributes] @internal Internal document attributes
 */

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
       * @example
       * // Get word and character count
       * const stats = editor.commands.getDocumentStats()
       * console.log(`${stats.words} words, ${stats.characters} characters`)
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
       * @example
       * editor.commands.clearDocument()
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
