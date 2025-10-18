import { Node, Attribute } from '@core/index.js';
import { ListItemNodeView } from './ListItemNodeView.js';
import { generateOrderedListIndex } from '@helpers/orderedListUtils.js';
import { orderedListSync } from '../ordered-list/helpers/orderedListSyncPlugin.js';

/**
 * Configuration options for ListItem
 * @typedef {Object} ListItemOptions
 * @category Options
 * @property {Object} [htmlAttributes] - HTML attributes for list item elements
 * @property {string} [bulletListTypeName='bulletList'] - Name of bullet list node type
 * @property {string} [orderedListTypeName='orderedList'] - Name of ordered list node type
 */

/**
 * Attributes for list item nodes
 * @typedef {Object} ListItemAttributes
 * @category Attributes
 * @property {string} [markerType] - Virtual attribute for marker display
 * @property {string} [lvlText] - Level text template for numbering
 * @property {string} [listNumberingType] - Numbering format type
 * @property {Array} [listLevel] - List level hierarchy
 * @property {string} [lvlJc] - Level justification (left, right, center)
 * @property {Object} [listParagraphProperties] - Indentation and spacing info
 * @property {Object} [listRunProperties] - Run properties for list item
 * @property {string} [numId] - Numbering definition ID
 * @property {string} [numPrType='inline'] - Numbering properties type
 * @property {string} [level] - Current nesting level
 * @property {Object} [attributes] - Additional attributes
 * @property {Object} [spacing] - Spacing configuration
 * @property {Object} [indent] - Indentation settings
 * @property {Object} [markerStyle] - Marker styling
 * @property {string} [styleId] - Linked style ID
 * @property {string} [customFormat] - Custom numbering format
 * @property {string} [importedFontFamily] - Font family from import
 * @property {string} [importedFontSize] - Font size from import
 */

/**
 * @module ListItem
 * @sidebarTitle List Item
 * @snippetPath /snippets/extensions/list-item.mdx
 * @shortcut Enter | splitListItem | Split list item at cursor
 * @shortcut Shift-Enter | createParagraphNear | Create paragraph in list
 * @shortcut Tab | increaseListIndent | Increase list indentation
 * @shortcut Shift-Tab | decreaseListIndent | Decrease list indentation
 */
export const ListItem = Node.create({
  name: 'listItem',

  content: 'paragraph* block*',

  defining: true,

  priority: 101, // to run listItem commands first

  addOptions() {
    return {
      htmlAttributes: {
        'aria-label': 'List item node',
      },
      bulletListTypeName: 'bulletList',
      orderedListTypeName: 'orderedList',
    };
  },

  parseDOM() {
    return [{ tag: 'li' }];
  },

  renderDOM({ htmlAttributes }) {
    return ['li', Attribute.mergeAttributes(this.options.htmlAttributes, htmlAttributes), 0];
  },

  addPmPlugins() {
    const hasDocxSource = !!this.editor?.converter?.convertedXml;
    const isHeaderFooter = this.editor?.options?.isHeaderOrFooter;
    if (!hasDocxSource || isHeaderFooter) {
      return [];
    }
    return [orderedListSync(this.editor)];
  },

  /**
   * Important: The listItem node uses a custom node view.
   * @returns {import('@core/NodeView.js').NodeView}
   */
  addNodeView() {
    return ({ node, editor, getPos, decorations }) => {
      return new ListItemNodeView(node, getPos, decorations, editor);
    };
  },

  addAttributes() {
    return {
      // Virtual attribute.
      markerType: {
        default: null,
        renderDOM: (attrs) => {
          let { listLevel, listNumberingType, lvlText } = attrs;
          let hasListLevel = !!listLevel?.length;

          if (!hasListLevel || !lvlText) {
            return {};
          }

          // MS Word has many custom ordered list options.
          // We need to generate the correct index here.
          let orderMarker = generateOrderedListIndex({
            listLevel,
            lvlText,
            listNumberingType,
          });

          if (!orderMarker) return {};

          return {
            'data-marker-type': orderMarker,
          };
        },
      },

      lvlText: {
        default: null,
        keepOnSplit: true,
        parseDOM: (elem) => elem.getAttribute('data-lvl-text'),
        renderDOM: (attrs) => {
          if (!attrs.lvlText) return {};
          return {
            'data-lvl-text': attrs.lvlText,
          };
        },
      },

      listNumberingType: {
        default: null,
        keepOnSplit: true,
        parseDOM: (elem) => elem.getAttribute('data-num-fmt'),
        renderDOM: (attrs) => {
          if (!attrs.listNumberingType) return {};
          return {
            'data-num-fmt': attrs.listNumberingType,
          };
        },
      },

      listLevel: {
        default: null,
        parseDOM: (elem) => {
          let listLevel = elem.getAttribute('data-list-level');
          try {
            listLevel = JSON.parse(listLevel);
          } catch {}
          return listLevel;
        },
        renderDOM: (attrs) => {
          if (!attrs.listLevel) return {};
          return {
            'data-list-level': JSON.stringify(attrs.listLevel),
          };
        },
      },

      // JC = justification. Expect left, right, center
      lvlJc: {
        keepOnSplit: true,
        default: null,
        rendered: false,
      },

      // This will contain indentation and space info.
      // ie: w:left (left indent), w:hanging (hanging indent)
      listParagraphProperties: {
        keepOnSplit: true,
        default: null,
        rendered: false,
      },

      // This will contain run properties for the list item
      listRunProperties: {
        keepOnSplit: true,
        default: null,
        rendered: false,
      },

      numId: {
        keepOnSplit: true,
        default: null,
        parseDOM: (elem) => elem.getAttribute('data-num-id'),
        renderDOM: (attrs) => {
          if (!attrs.numId) return {};
          return {
            'data-num-id': attrs.numId,
          };
        },
      },

      numPrType: {
        rendered: false,
        default: 'inline',
        keepOnSplit: true,
      },

      level: {
        parseDOM: (elem) => {
          return elem.getAttribute('data-level');
        },
        renderDOM: (attrs) => {
          if (attrs.level === undefined || attrs.level === null) return {};
          return {
            'data-level': attrs.level,
          };
        },
      },

      attributes: {
        keepOnSplit: true,
        rendered: false,
      },

      spacing: {
        keepOnSplit: true,
        default: null,
        rendered: false,
      },

      indent: {
        parseDOM: (elem) => JSON.parse(elem.getAttribute('data-indent')),
        keepOnSplit: true,
        default: null,
        rendered: false,
      },

      markerStyle: {
        default: null,
        rendered: false,
        keepOnSplit: true,
      },

      styleId: {
        rendered: false,
        keepOnSplit: true,
      },

      customFormat: {
        default: null,
        rendered: false,
        keepOnSplit: true,
      },

      importedFontFamily: {
        parseDOM: (elem) => elem.getAttribute('data-font-family'),
        renderDOM: (attrs) => {
          if (!attrs.importedFontFamily) return {};
          return {
            'data-font-family': attrs.importedFontFamily,
          };
        },
      },

      importedFontSize: {
        parseDOM: (elem) => elem.getAttribute('data-font-size'),
        renderDOM: (attrs) => {
          if (!attrs.importedFontSize) return {};
          return {
            'data-font-size': attrs.importedFontSize,
          };
        },
      },
    };
  },

  addShortcuts() {
    return {
      Enter: () => {
        return this.editor.commands.splitListItem();
      },

      'Shift-Enter': () => {
        return this.editor.commands.first(({ commands }) => [
          () => commands.createParagraphNear(),
          () => commands.splitBlock(),
        ]);
      },

      Tab: () => {
        return this.editor.commands.first(({ commands }) => [() => commands.increaseListIndent()]);
      },

      'Shift-Tab': () => {
        return this.editor.commands.first(({ commands }) => [() => commands.decreaseListIndent()]);
      },
    };
  },
});
