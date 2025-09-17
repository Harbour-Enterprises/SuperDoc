// @ts-check
import { Node, Attribute } from '@core/index.js';
import { InputRule } from '@core/InputRule.js';
import { ListHelpers } from '@helpers/list-numbering-helpers.js';
import { toggleList } from '@core/commands/index.js';

/**
 * @module BulletList
 * @sidebarTitle Bullet List
 * @snippetPath /snippets/extensions/bullet-list.mdx
 * @shortcut Mod-Shift-8 | toggleBulletList | Toggle bullet list
 */

/**
 * Input rule regex that matches a bullet list marker (-, +, or *)
 * @private
 */
const inputRegex = /^\s*([-+*])\s$/;

export const BulletList = Node.create({
  name: 'bulletList',

  group: 'block list',

  selectable: false,

  content() {
    return `${this.options.itemTypeName}+`;
  },

  addOptions() {
    return {
      /**
       * @typedef {Object} BulletListOptions
       * @category Options
       * @property {string} [itemTypeName='listItem'] - Name of the list item node type
       * @property {Object} [htmlAttributes] - HTML attributes for the ul element
       * @property {boolean} [keepMarks=true] - Whether to preserve marks when splitting
       * @property {boolean} [keepAttributes=false] - Whether to preserve attributes when splitting
       */
      itemTypeName: 'listItem',
      htmlAttributes: {
        'aria-label': 'Bullet list node',
      },
      keepMarks: true,
      keepAttributes: false,
    };
  },

  parseDOM() {
    return [
      { tag: 'ul' },
      {
        tag: 'ol',
        getAttrs(dom) {
          const li = dom.querySelector('li');
          if (li?.getAttribute('data-num-fmt') === 'bullet') {
            return {};
          }
          return false;
        },
        priority: 60,
      },
    ];
  },

  renderDOM({ htmlAttributes }) {
    const attributes = Attribute.mergeAttributes(this.options.htmlAttributes, htmlAttributes);
    return ['ul', attributes, 0];
  },

  addAttributes() {
    return {
      /**
       * @category Attribute
       * @param {string} [list-style-type='bullet'] - List style type for this list
       */
      'list-style-type': {
        default: 'bullet',
        rendered: false,
      },

      /**
       * @private
       * @category Attribute
       * @param {string} [listId] - Internal list identifier for numbering
       */
      listId: {
        rendered: false,
      },

      /**
       * @private
       * @category Attribute
       * @param {string} [sdBlockId] - Internal block tracking ID
       */
      sdBlockId: {
        default: null,
        keepOnSplit: false,
        parseDOM: (elem) => elem.getAttribute('data-sd-block-id'),
        renderDOM: (attrs) => {
          return attrs.sdBlockId ? { 'data-sd-block-id': attrs.sdBlockId } : {};
        },
      },

      /**
       * @private
       * @category Attribute
       * @param {Object} [attributes] - Additional attributes for the list
       */
      attributes: {
        rendered: false,
        keepOnSplit: true,
      },
    };
  },

  addCommands() {
    return {
      /**
       * Toggle a bullet list at the current selection
       * @category Command
       * @returns {Function} Command function
       * @example
       * // Toggle bullet list on selected text
       * toggleBulletList()
       * @note Converts selected paragraphs to list items or removes list formatting
       */
      toggleBulletList: () => (params) => {
        return toggleList(this.type)(params);
      },
    };
  },

  addShortcuts() {
    return {
      'Mod-Shift-8': () => {
        return this.editor.commands.toggleBulletList();
      },
    };
  },

  addInputRules() {
    return [
      new InputRule({
        match: inputRegex,
        handler: ({ state, range }) => {
          // Check if we're currently inside a list item
          const $pos = state.selection.$from;
          const listItemType = state.schema.nodes.listItem;

          // Look up the tree to see if we're inside a list item
          for (let depth = $pos.depth; depth >= 0; depth--) {
            if ($pos.node(depth).type === listItemType) {
              // We're inside a list item, don't trigger the rule
              return null;
            }
          }

          // Not inside a list item, proceed with creating new list
          const { tr } = state;
          tr.delete(range.from, range.to);

          ListHelpers.createNewList({
            listType: this.type,
            tr,
            editor: this.editor,
          });
        },
      }),
    ];
  },
});
