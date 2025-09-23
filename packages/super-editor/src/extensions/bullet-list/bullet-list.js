// @ts-check
import { Node, Attribute } from '@core/index.js';
import { InputRule } from '@core/InputRule.js';
import { ListHelpers } from '@helpers/list-numbering-helpers.js';
import { toggleList } from '@core/commands/index.js';

/**
 * Configuration options for BulletList
 * @typedef {Object} BulletListOptions
 * @category Options
 * @property {string} [itemTypeName='listItem'] Name of the list item node type
 * @property {Object} [htmlAttributes] HTML attributes for the ul element
 * @property {boolean} [keepAttributes=false] Whether to preserve attributes when splitting
 * @property {boolean} [keepMarks=true] Whether to preserve marks when splitting
 * @example
 * const ConfiguredBulletList = BulletList.configure({
 *   itemTypeName: 'customItem',
 *   keepMarks: false
 * });
 *
 * new SuperDoc({
 *   selector: '#editor',
 *   document: 'document.docx',
 *   editorExtensions: [ConfiguredBulletList]
 * });
 */

/**
 * Attributes for bullet list nodes
 * @typedef {Object} BulletListAttributes
 * @category Attributes
 * @property {string} [list-style-type='bullet'] List style type for this list
 * @property {string} [listId] @internal Internal list identifier for numbering
 * @property {string} [sdBlockId] @internal Internal block tracking ID
 * @property {Object} [attributes] @internal Additional attributes for the list
 */

/**
 * Commands provided by BulletList extension
 * @typedef {Object} BulletListCommands
 * @category Commands
 * @property {Function} toggleBulletList Toggle a bullet list at the current selection
 */

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
      itemTypeName: 'listItem',
      htmlAttributes: {
        'aria-label': 'Bullet list node',
      },
      keepMarks: true,
      keepAttributes: false,
    };
  },

  parseDOM() {
    return [{ tag: 'ul' }];
  },

  renderDOM({ htmlAttributes }) {
    const attributes = Attribute.mergeAttributes(this.options.htmlAttributes, htmlAttributes);
    return ['ul', attributes, 0];
  },

  addAttributes() {
    return {
      'list-style-type': {
        default: 'bullet',
        rendered: false,
      },

      listId: {
        rendered: false,
      },

      sdBlockId: {
        default: null,
        keepOnSplit: false,
        parseDOM: (elem) => elem.getAttribute('data-sd-block-id'),
        renderDOM: (attrs) => {
          return attrs.sdBlockId ? { 'data-sd-block-id': attrs.sdBlockId } : {};
        },
      },

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
       * @example
       * // Toggle bullet list on selected text
       * editor.commands.toggleBulletList()
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
