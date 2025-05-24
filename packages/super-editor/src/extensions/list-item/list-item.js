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
      htmlAttributes: {},
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
      lvlText: { rendered: false, keepOnSplit: true, },
      listNumberingType: { rendered: false, keepOnSplit: true, },
      listLevel: { rendered: false, keepOnSplit: true, },
      lvlJc: { rendered: false, keepOnSplit: true, }, // JC = justification. Expect left, right, center

      // This will contain indentation and space info.
      // ie: w:left (left indent), w:hanging (hanging indent)
      listParagraphProperties: { rendered: false, keepOnSplit: true, },
      listRunProperties: { rendered: false, keepOnSplit: true, },
      numId: { rendered: false, keepOnSplit: true, },
      numPrType: { rendered: false, keepOnSplit: true, },
      level: { rendered: false, keepOnSplit: true, },
      attributes: { rendered: false, keepOnSplit: true, },
      spacing: { rendered: false, keepOnSplit: true, },
      indent: { rendered: false, keepOnSplit: true, },
      markerStyle: { rendered: false, keepOnSplit: true, },
      styleId: { rendered: false, keepOnSplit: true, },
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
