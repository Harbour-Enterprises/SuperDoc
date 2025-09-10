// @ts-check
import { Node, Attribute } from '@core/index.js';

/**
 * @module LineBreak
 * @sidebarTitle Line Break
 * @snippetPath /snippets/extensions/line-break.mdx
 */
export const LineBreak = Node.create({
  name: 'lineBreak',
  group: 'inline',
  inline: true,
  marks: '',
  defining: true,
  selectable: false,
  content: '',
  atom: true,

  parseDOM() {
    return [{ tag: 'br' }];
  },

  renderDOM() {
    return ['br', {}];
  },

  addAttributes() {
    return {
      /**
       * @private
       * @category Attribute
       * @param {string} [lineBreakType] - Type of line break - passthrough in this node
       */
      lineBreakType: { rendered: false },

      /**
       * @private
       * @category Attribute
       * @param {string} [clear] - Clear attribute - passthrough in this node
       */
      clear: { rendered: false },
    };
  },

  addCommands() {
    return {
      /**
       * Insert a line break
       * @category Command
       * @returns {Function} Command function
       * @example
       * insertLineBreak()
       * @note Creates a soft break within the same paragraph
       */
      insertLineBreak:
        () =>
        ({ commands }) => {
          return commands.insertContent({ type: 'lineBreak' });
        },
    };
  },
});

/**
 * @module HardBreak
 * @sidebarTitle Hard Break
 * @snippetPath /snippets/extensions/hard-break.mdx
 */
export const HardBreak = Node.create({
  name: 'hardBreak',
  group: 'inline',
  inline: true,
  selectable: false,
  atom: true,

  addOptions() {
    return {
      /**
       * @typedef {Object} HardBreakOptions
       * @category Options
       * @property {Object} [htmlAttributes] - HTML attributes for the break element
       */
      htmlAttributes: {
        contentEditable: 'false',
        lineBreakType: 'page',
        'aria-hidden': 'true',
        'aria-label': 'Hard break node',
      },
    };
  },

  addAttributes() {
    return {
      /**
       * @private
       * @category Attribute
       * @param {string} [pageBreakSource] - Source of the page break
       */
      pageBreakSource: {
        rendered: false,
        default: null,
      },

      /**
       * @private
       * @category Attribute
       * @param {string} [pageBreakType] - Type of page break
       */
      pageBreakType: {
        default: null,
        rendered: false,
      },

      /**
       * @private
       * @category Attribute
       * @param {string} [lineBreakType] - Type of line break - passthrough in this node
       */
      lineBreakType: { rendered: false },

      /**
       * @private
       * @category Attribute
       * @param {string} [clear] - Clear attribute - passthrough in this node
       */
      clear: { rendered: false },
    };
  },

  parseDOM() {
    return [
      {
        tag: 'span[linebreaktype="page"]',
        getAttrs: (dom) => {
          if (!(dom instanceof HTMLElement)) return false;
          return {
            pageBreakSource: dom.getAttribute('pagebreaksource') || null,
            pageBreakType: dom.getAttribute('linebreaktype') || null,
          };
        },
      },
    ];
  },

  renderDOM({ htmlAttributes }) {
    return ['span', Attribute.mergeAttributes(this.options.htmlAttributes, htmlAttributes)];
  },

  addCommands() {
    return {
      /**
       * Insert a page break
       * @category Command
       * @returns {Function} Command function
       * @example
       * insertPageBreak()
       * @note Forces content to start on a new page when printed
       */
      insertPageBreak:
        () =>
        ({ commands }) => {
          return commands.insertContent({
            type: 'hardBreak',
            attrs: { pageBreakType: 'page' },
          });
        },
    };
  },
});
