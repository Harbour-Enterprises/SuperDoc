// @ts-check
import { Extension } from '@core/Extension.js';
import { helpers } from '@core/index.js';
import { Plugin, PluginKey } from 'prosemirror-state';
import { ReplaceStep } from 'prosemirror-transform';
import { v4 as uuidv4 } from 'uuid';
import { Transaction } from 'prosemirror-state';

const { findChildren } = helpers;
const SD_BLOCK_ID_ATTRIBUTE_NAME = 'sdBlockId';
export const BlockNodePluginKey = new PluginKey('blockNodePlugin');

/**
 * Block node information object
 * @typedef {Object} BlockNodeInfo
 * @property {Object} node - The block node
 * @property {number} pos - Position in the document
 */

/**
 * @module BlockNode
 * @sidebarTitle Block Node
 * @snippetPath /snippets/extensions/block-node.mdx
 */
export const BlockNode = Extension.create({
  name: 'blockNode',

  addCommands() {
    return {
      /**
       * Replace a block node by its ID with new content
       * @category Command
       * @param {string} id - The sdBlockId of the node to replace
       * @param {Object} contentNode - The replacement ProseMirror node
       * @returns {Function} Command function
       * @example
       * const newParagraph = editor.schema.nodes.paragraph.create({}, editor.schema.text('New content'))
       * replaceBlockNodeById('block-123', newParagraph)
       * @note The replacement node should have the same type as the original
       */
      replaceBlockNodeById:
        (id, contentNode) =>
        ({ dispatch, tr }) => {
          const blockNode = this.editor.helpers.blockNode.getBlockNodeById(id);
          if (!blockNode || blockNode.length > 1) {
            return false;
          }

          if (dispatch) {
            let { pos, node } = blockNode[0];
            let newPosFrom = tr.mapping.map(pos);
            let newPosTo = tr.mapping.map(pos + node.nodeSize);

            let currentNode = tr.doc.nodeAt(newPosFrom);
            if (node.eq(currentNode)) {
              tr.replaceWith(newPosFrom, newPosTo, contentNode);
            }
          }

          return true;
        },

      /**
       * Delete a block node by its ID
       * @category Command
       * @param {string} id - The sdBlockId of the node to delete
       * @returns {Function} Command function
       * @example
       * deleteBlockNodeById('block-123')
       * @note Completely removes the node from the document
       */
      deleteBlockNodeById:
        (id) =>
        ({ dispatch, tr }) => {
          const blockNode = this.editor.helpers.blockNode.getBlockNodeById(id);
          if (!blockNode || blockNode.length > 1) {
            return false;
          }

          if (dispatch) {
            let { pos, node } = blockNode[0];
            let newPosFrom = tr.mapping.map(pos);
            let newPosTo = tr.mapping.map(pos + node.nodeSize);

            let currentNode = tr.doc.nodeAt(newPosFrom);
            if (node.eq(currentNode)) {
              tr.delete(newPosFrom, newPosTo);
            }
          }

          return true;
        },

      /**
       * Update attributes of a block node by its ID
       * @category Command
       * @param {string} id - The sdBlockId of the node to update
       * @param {Object} attrs - Attributes to update
       * @returns {Function} Command function
       * @example
       * updateBlockNodeAttributes('block-123', { textAlign: 'center' })
       * @example
       * updateBlockNodeAttributes('block-123', { indent: { left: 20 } })
       * @note Merges new attributes with existing ones
       */
      updateBlockNodeAttributes:
        (id, attrs = {}) =>
        ({ dispatch, tr }) => {
          const blockNode = this.editor.helpers.blockNode.getBlockNodeById(id);
          if (!blockNode || blockNode.length > 1) {
            return false;
          }
          if (dispatch) {
            let { pos, node } = blockNode[0];
            let newPos = tr.mapping.map(pos);
            let currentNode = tr.doc.nodeAt(newPos);
            if (node.eq(currentNode)) {
              tr.setNodeMarkup(newPos, undefined, {
                ...node.attrs,
                ...attrs,
              });
            }

            return true;
          }
        },
    };
  },

  addHelpers() {
    return {
      /**
       * Get all block nodes in the document
       * @category Helper
       * @returns {Array<BlockNodeInfo>} Array of block node info objects
       * @example
       * const blocks = editor.helpers.blockNode.getBlockNodes()
       * console.log(`Found ${blocks.length} block nodes`)
       */
      getBlockNodes: () => {
        return findChildren(this.editor.state.doc, (node) => nodeAllowsSdBlockIdAttr(node));
      },

      /**
       * Get a specific block node by its ID
       * @category Helper
       * @param {string} id - The sdBlockId to search for
       * @returns {Array<BlockNodeInfo>} Array containing the matching node (or empty)
       * @example
       * const block = editor.helpers.blockNode.getBlockNodeById('block-123')
       * if (block.length) console.log('Found:', block[0].node.type.name)
       */
      getBlockNodeById: (id) => {
        return findChildren(this.editor.state.doc, (node) => node.attrs.sdBlockId === id);
      },

      /**
       * Get all block nodes of a specific type
       * @category Helper
       * @param {string} type - The node type name (e.g., 'paragraph', 'heading')
       * @returns {Array<BlockNodeInfo>} Array of matching block nodes
       * @example
       * const paragraphs = editor.helpers.blockNode.getBlockNodesByType('paragraph')
       * const headings = editor.helpers.blockNode.getBlockNodesByType('heading')
       */
      getBlockNodesByType: (type) => {
        return findChildren(this.editor.state.doc, (node) => node.type.name === type);
      },

      /**
       * Get all block nodes within a position range
       * @category Helper
       * @param {number} from - Start position
       * @param {number} to - End position
       * @returns {Array<BlockNodeInfo>} Array of block nodes in the range
       * @example
       * const selection = editor.state.selection
       * const blocksInSelection = editor.helpers.blockNode.getBlockNodesInRange(
       *   selection.from,
       *   selection.to
       * )
       */
      getBlockNodesInRange: (from, to) => {
        let blockNodes = [];

        this.editor.state.doc.nodesBetween(from, to, (node, pos) => {
          if (nodeAllowsSdBlockIdAttr(node)) {
            blockNodes.push({
              node,
              pos,
            });
          }
        });

        return blockNodes;
      },
    };
  },

  addPmPlugins() {
    let hasInitialized = false;

    return [
      new Plugin({
        key: BlockNodePluginKey,
        appendTransaction: (transactions, _oldState, newState) => {
          if (hasInitialized && !transactions.some((tr) => tr.docChanged)) return null;

          // Check for new block nodes and if none found, we don't need to do anything
          if (hasInitialized && !checkForNewBlockNodesInTrs(transactions)) return null;

          const { tr } = newState;
          let changed = false;
          newState.doc.descendants((node, pos) => {
            // Only allow block nodes with a valid sdBlockId attribute
            if (!nodeAllowsSdBlockIdAttr(node) || !nodeNeedsSdBlockId(node)) return null;

            tr.setNodeMarkup(
              pos,
              undefined,
              {
                ...node.attrs,
                sdBlockId: uuidv4(),
              },
              node.marks,
            );
            changed = true;
          });

          if (changed && !hasInitialized) {
            hasInitialized = true;
          }

          // Restore marks if they exist.
          // `tr.setNodeMarkup` resets the stored marks.
          tr.setStoredMarks(newState.tr.storedMarks);

          return changed ? tr : null;
        },
      }),
    ];
  },
});

/**
 * Check if a node allows sdBlockId attribute
 * @param {Object} node - The ProseMirror node to check
 * @returns {boolean} - True if the node type supports sdBlockId attribute
 */
export const nodeAllowsSdBlockIdAttr = (node) => {
  return !!(node?.isBlock && node?.type?.spec?.attrs?.[SD_BLOCK_ID_ATTRIBUTE_NAME]);
};

/**
 * Check if a node needs an sdBlockId (doesn't have one or has null/empty value)
 * @param {Object} node - The ProseMirror node to check
 * @returns {boolean} - True if the node needs an sdBlockId assigned
 */
export const nodeNeedsSdBlockId = (node) => {
  const currentId = node?.attrs?.[SD_BLOCK_ID_ATTRIBUTE_NAME];
  return !currentId;
};

/**
 * Check for new block nodes in ProseMirror transactions.
 * Iterate through the list of transactions, and in each tr check if there are any new block nodes.
 * @param {ArrayLike<Object>} transactions - The ProseMirror transactions to check.
 * @returns {boolean} - True if new block nodes are found, false otherwise.
 */
export const checkForNewBlockNodesInTrs = (transactions) => {
  return Array.from(transactions).some((tr) => {
    return tr.steps.some((step) => {
      if (!(step instanceof ReplaceStep)) return false;
      const hasValidSdBlockNodes = step.slice?.content?.content?.some((node) => nodeAllowsSdBlockIdAttr(node));
      return hasValidSdBlockNodes;
    });
  });
};
