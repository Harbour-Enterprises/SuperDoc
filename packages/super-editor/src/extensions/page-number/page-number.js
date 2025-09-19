import { Node, Attribute } from '@core/index.js';

/**
 * Configuration options for PageNumber
 * @typedef {Object} PageNumberOptions
 * @category Options
 * @property {Object} [htmlAttributes] - HTML attributes for page number elements
 */

/**
 * Attributes for page number nodes
 * @typedef {Object} PageNumberAttributes
 * @category Attributes
 * @property {Array} [marksAsAttrs=null] @internal - Internal marks storage
 */

/**
 * @module PageNumber
 * @sidebarTitle Page Number
 * @snippetPath /snippets/extensions/page-number.mdx
 * @shortcut Mod-Shift-alt-p | addAutoPageNumber | Insert page number
 */
export const PageNumber = Node.create({
  name: 'page-number',
  group: 'inline',
  inline: true,
  atom: true,
  draggable: false,
  selectable: false,
  defining: true,

  content: '',

  addOptions() {
    return {
      htmlAttributes: {
        contenteditable: false,
        'data-id': 'auto-page-number',
        'aria-label': 'Page number node',
      },
    };
  },

  addAttributes() {
    return {
      marksAsAttrs: {
        default: null,
        rendered: false,
      },
    };
  },

  // ... addNodeView, parseDOM, renderDOM stay the same

  addCommands() {
    return {
      /**
       * Insert an automatic page number
       * @category Command
       * @returns {Function} Command function
       * @example
       * editor.commands.addAutoPageNumber()
       * @note Only works in header/footer contexts
       */
      addAutoPageNumber:
        () =>
        ({ tr, dispatch, state, editor }) => {
          // ... implementation stays the same
        },
    };
  },

  addShortcuts() {
    return {
      'Mod-Shift-alt-p': () => this.editor.commands.addAutoPageNumber(),
    };
  },
});

/**
 * Configuration options for TotalPageCount
 * @typedef {Object} TotalPageCountOptions
 * @category Options
 * @property {Object} [htmlAttributes] - HTML attributes for total page count elements
 */

/**
 * Attributes for total page count nodes
 * @typedef {Object} TotalPageCountAttributes
 * @category Attributes
 * @property {Array} [marksAsAttrs=null] @internal - Internal marks storage
 */

/**
 * @module TotalPageCount
 * @sidebarTitle Total Page Count
 * @snippetPath /snippets/extensions/total-page-count.mdx
 * @shortcut Mod-Shift-alt-c | addTotalPageCount | Insert total page count
 */
export const TotalPageCount = Node.create({
  name: 'total-page-number',
  group: 'inline',
  inline: true,
  atom: true,
  draggable: false,
  selectable: false,

  content: 'text*',

  addOptions() {
    return {
      htmlAttributes: {
        contenteditable: false,
        'data-id': 'auto-total-pages',
        'aria-label': 'Total page count node',
        class: 'sd-editor-auto-total-pages',
      },
    };
  },

  addAttributes() {
    return {
      marksAsAttrs: {
        default: null,
        rendered: false,
      },
    };
  },

  // ... addNodeView, parseDOM, renderDOM stay the same

  addCommands() {
    return {
      /**
       * Insert total page count
       * @category Command
       * @returns {Function} Command function
       * @example
       * editor.commands.addTotalPageCount()
       * @note Only works in header/footer contexts
       */
      addTotalPageCount:
        () =>
        ({ tr, dispatch, state, editor }) => {
          // ... implementation stays the same
        },
    };
  },

  addShortcuts() {
    return {
      'Mod-Shift-alt-c': () => this.editor.commands.addTotalPageCount(),
    };
  },
});

// ... rest of helper functions and AutoPageNumberNodeView class stay the same
