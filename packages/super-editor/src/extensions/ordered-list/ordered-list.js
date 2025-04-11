import { Node, Attribute } from '@core/index.js';
import { toKebabCase } from '@harbour-enterprises/common';
import { generateDocxListAttributes, findParentNode } from '@helpers/index.js';
import { orderedListSync as orderedListSyncPlugin, randomId } from './helpers/orderedListSyncPlugin.js';
import { orderedListMarker as orderedListMarkerPlugin } from './helpers/orderedListMarkerPlugin.js';
import { wrappingInputRule } from '../../core/inputRules/wrappingInputRule.js';

/**
 * Matches an ordered list to a 1. on input (or any number followed by a dot).
 */
const inputRegex = /^(\d+)\.\s$/;

export const OrderedList = Node.create({
  name: 'orderedList',

  group: 'block list',

  content() {
    return `${this.options.itemTypeName}+`;
  },

  addOptions() {
    return {
      itemTypeName: 'listItem',
      htmlAttributes: {},
      keepMarks: true,
      keepAttributes: false,
      listStyleTypes: ['decimal', 'lowerAlpha', 'lowerRoman'],
    };
  },

  addAttributes() {
    return {
      order: {
        default: 1,
        parseDOM: (element) => {
          return element.hasAttribute('start') ? parseInt(element.getAttribute('start') || '', 10) : 1;
        },
        renderDOM: (attrs) => {
          return {
            start: attrs.order,
          };
        },
      },

      syncId: {
        default: null,
        parseDOM: (elem) => elem.getAttribute('data-sync-id'),
        renderDOM: (attrs) => {
          if (!attrs.syncId) return {};
          return {
            'data-sync-id': attrs.syncId,
          };
        },
        // rendered: false,
      },

      listId: {
        default: null,
        render: false,
      },

      'list-style-type': {
        default: 'decimal',
        renderDOM: (attrs) => {
          let listStyleType = attrs['list-style-type'];
          if (!listStyleType) return {};

          if (listStyleType === 'lowerLetter') {
            listStyleType = 'lowerAlpha';
          }

          return {
            style: `list-style-type: ${toKebabCase(listStyleType)};`,
          };
        },
      },

      attributes: {
        rendered: false,
        keepOnSplit: true,
      },
    };
  },

  parseDOM() {
    return [{ tag: 'ol' }];
  },

  renderDOM({ htmlAttributes }) {
    const { start, ...restAttributes } = htmlAttributes;

    return start === 1
      ? ['ol', Attribute.mergeAttributes(this.options.htmlAttributes, restAttributes), 0]
      : ['ol', Attribute.mergeAttributes(this.options.htmlAttributes, htmlAttributes), 0];
  },

  addCommands() {
    return {
      toggleOrderedList:
        () =>
        ({ commands }) => {
          return commands.toggleList(this.name, this.options.itemTypeName, this.options.keepMarks);
        },

      /**
       * Updates ordered list style type when sink or lift `listItem`.
       * @example 1,2,3 -> a,b,c -> i,ii,iii -> 1,2,3 -> etc
       */
      updateOrderedListStyleType:
        () =>
        ({ dispatch, state, tr }) => {
          let list = findParentNode((node) => node.type.name === this.name)(state.selection);

          if (!list) {
            return true;
          }

          if (dispatch) {
            // Each list level increases depth by 2.
            let listLevel = (list.depth - 1) / 2;
            let listStyleTypes = this.options.listStyleTypes;
            let listStyle = listStyleTypes[listLevel % listStyleTypes.length];
            let currentListStyle = list.node.attrs['list-style-type'];
            let nodeAtPos = tr.doc.nodeAt(list.pos);

            if (currentListStyle !== listStyle && nodeAtPos.eq(list.node)) {
              tr.setNodeMarkup(list.pos, undefined, {
                ...list.node.attrs,
                ...{
                  'list-style-type': listStyle,
                },
              });
            }
          }

          return true;
        },

      /**
       * Continue list numbering after `liftEmptyBlock` command.
       * @example
       * <ol start="1">
       *  <li>item</li>
       *  <li>item</li>
       * </ol>
       * <ol start="3">
       *  <li>item</li>
       *  <li>item</li>
       * </ol>
       */
      liftEmptyBlockAndContinueListOrder:
        () =>
        ({ editor, dispatch, state, tr, commands }) => {
          let list = findParentNode((node) => node.type.name === this.name)(state.selection);

          if (!list) {
            return false;
          }

          let canLiftEmptyBlock = editor.can().liftEmptyBlock();
          let isRootDepth = list.depth === 1; // Only first level lists.
          let isOneItem = list.node.childCount === 1;
          let currentListItem = state.selection.$from.node(-1);
          let isLastItem = list.node.lastChild.eq(currentListItem);

          let canRunCommand = canLiftEmptyBlock && isRootDepth && !isOneItem && !isLastItem;

          if (!canRunCommand) {
            return false;
          }

          if (dispatch) {
            // Save pos before liftEmptyBlock command.
            let prevListPos = list.pos;

            if (!commands.liftEmptyBlock(state, dispatch)) {
              return false;
            }

            let { $from } = tr.selection;
            let prevListNode = tr.doc.nodeAt(prevListPos);
            let newListPos = $from.after();
            let newListNode = tr.doc.nodeAt(newListPos);

            let isPrevOrderedList = prevListNode?.type.name === this.name;
            let isNewOrderedList = newListNode?.type.name === this.name;

            if (isPrevOrderedList && isNewOrderedList) {
              let lastOrder = prevListNode.attrs.order || 1;
              let lastIndex = prevListNode.childCount;
              let lastSyncId = prevListNode.attrs.syncId;
              let newOrder = lastIndex + lastOrder;
              let syncId = !!lastSyncId ? lastSyncId : randomId();

              tr.setNodeMarkup(newListPos, undefined, {
                ...newListNode.attrs,
                order: newOrder,
                syncId,
              });

              if (!lastSyncId) {
                tr.setNodeMarkup(prevListPos, undefined, {
                  ...prevListNode.attrs,
                  syncId,
                });
              }
            }
          }

          return true;
        },
    };
  },

  addShortcuts() {
    return {
      'Mod-Shift-7': () => {
        return this.editor.commands.toggleOrderedList();
      },
      Enter: () => {
        return this.editor.commands.liftEmptyBlockAndContinueListOrder();
      },
    };
  },

  addPmPlugins() {
    return [orderedListMarkerPlugin(), orderedListSyncPlugin()];
  },

  addInputRules() {
    let inputRule = wrappingInputRule({
      match: inputRegex,
      type: this.type,
      getAttributes: match => ({ start: +match[1] }),
      joinPredicate: (match, node) => node.childCount + node.attrs.start === +match[1],
    })

    if (this.options.keepMarks || this.options.keepAttributes) {
      inputRule = wrappingInputRule({
        match: inputRegex,
        type: this.type,
        keepMarks: this.options.keepMarks,
        keepAttributes: this.options.keepAttributes,
        getAttributes: match => ({ start: +match[1], ...this.editor.getAttributes('textStyle') }),
        joinPredicate: (match, node) => node.childCount + node.attrs.start === +match[1],
        editor: this.editor,
      })
    }
    return [
      inputRule,
    ];
  },
});

