import { Node, Attribute } from '@core/index.js';
import { findParentNode } from '@helpers/index.js';
import { ListHelpers } from '@helpers/list-numbering-helpers.js';
import { ListItemNodeView } from './ListItemNodeView.js';

export const ListItem = Node.create({
  name: 'listItem',

  content: 'paragraph* block*',

  defining: true,

  priority: 101, // to run listItem commands first

  addOptions() {
    return {
      htmlAttributes: {
        'aria-label': 'List item node'
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

  /**
   * Important: The listItem node uses a custom node view.
   * @returns {import('@core/NodeView.js').NodeView}
   */
  addNodeView() {
    return ({ node, editor, getPos, decorations }) => {
      return new ListItemNodeView(node, getPos, decorations, editor);
    }
  },

  addAttributes() {
    return {
      // Virtual attribute.
      // markerType: {
      //   default: null,
      //   renderDOM: (attrs) => {
      //     let { listLevel, listNumberingType, lvlText } = attrs;
      //     let hasListLevel = !!listLevel?.length;

      //     if (!hasListLevel || !lvlText) {
      //       return {};
      //     }

      //     // MS Word has many custom ordered list options.
      //     // We need to generate the correct index here.
      //     let orderMarker = generateOrderedListIndex({
      //       listLevel,
      //       lvlText,
      //       listNumberingType,
      //     });

      //     if (!orderMarker) return {};

      //     return {
      //       'data-marker-type': orderMarker,
      //     };
      //   },
      // },

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
        keepOnSplit: true,
        parseDOM: (elem) => {
          let listLevel = elem.getAttribute('data-list-level');
          try {
            listLevel = JSON.parse(listLevel);
          } catch (e) {};
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
        rendered: false,
      },

      numPrType: {
        rendered: false,
        default: null,
        keepOnSplit: true,
      },

      level: {
        default: null,
        rendered: false,
        keepOnSplit: true,
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
        keepOnSplit: true,
      },
    };
  },

  addCommands() {
    return {
      getCurrentListNode: () => ({ state }) => {
        return findParentNode((node) => node.type.name === this.name)(state.selection);
      },

      increaseListIndent: () => ({ commands, chain, editor }) => {
        const node = commands.getCurrentListNode();
        return ListHelpers.indentListItem({ editor, chain, node });

        // if (!commands.sinkListItem(this.name)) { return false }
        // commands.updateNodeStyle();
        // commands.updateOrderedListStyleType();
        // return true;
      },

      decreaseListIndent: () => ({ commands, chain, editor }) => {
        const node = commands.getCurrentListNode();
        return ListHelpers.outdentListItem({ editor, chain, node });

        // const currentList = commands.getCurrentList();
        // const depth = currentList?.depth;

        // if (depth === 1) return false;
        // if (!commands.liftListItem(this.name)) { return true }
        // if (!commands.updateNodeStyle()) { return false }

        // const currentNode = commands.getCurrentListNode();
        // const currentNodeIndex = currentList?.node?.children.findIndex((child) => child === currentNode.node);
        // const nextNodePos = currentNode?.pos + currentNode?.node.nodeSize;
        // const followingNodes = currentList?.node?.children.slice(currentNodeIndex + 1) || [];

        // commands.updateOrderedListStyleType();
        // commands.restartListNodes(followingNodes, nextNodePos);
        // return true;
      },

    }
  },

  addShortcuts() {
    return {
      Enter: () => {
        const node = this.editor.commands.getCurrentListNode();
        return this.editor.commands.splitListItem(this.name, node);
      },
      'Shift-Enter': () => {
        return this.editor.commands.first(({ commands }) => [
          () => commands.createParagraphNear(),
          () => commands.splitBlock(),
        ]);
      },
      Tab: () => {
        return this.editor.commands.increaseListIndent();
      },
      'Shift-Tab': () => {
        return this.editor.commands.decreaseListIndent();
      },
    };
  },

});
