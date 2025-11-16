// @ts-nocheck
import { Extension } from '@core/Extension.js';
import { helpers } from '@core/index.js';
import { mergeRanges, clampRange } from '@core/helpers/rangeUtils.js';
import { Plugin, PluginKey } from 'prosemirror-state';
import { ReplaceStep } from 'prosemirror-transform';
import { v4 as uuidv4 } from 'uuid';

const { findChildren } = helpers;
const SD_BLOCK_ID_ATTRIBUTE_NAME = 'sdBlockId';
export const BlockNodePluginKey = new PluginKey('blockNodePlugin');

/**
 * @typedef {import('prosemirror-model').Node} ProseMirrorNode
 * @typedef {import('prosemirror-state').Transaction} Transaction
 */

/**
 * Block node information object
 * @typedef {Object} BlockNodeInfo
 * @property {ProseMirrorNode} node - The block node
 * @property {number} pos - Position in the document
 */

/**
 * Configuration options for BlockNode
 * @typedef {Object} BlockNodeOptions
 * @category Options
 */

/**
 * Attributes for block nodes
 * @typedef {Object} BlockNodeAttributes
 * @category Attributes
 * @property {string} [sdBlockId] @internal Unique identifier for the block
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
       * @param {ProseMirrorNode} contentNode - The replacement ProseMirror node
       * @example
       * const newParagraph = editor.schema.nodes.paragraph.create({}, editor.schema.text('New content'))
       * editor.commands.replaceBlockNodeById('block-123', newParagraph)
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
       * @example
       * editor.commands.deleteBlockNodeById('block-123')
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
       * @example
       * editor.commands.updateBlockNodeAttributes('block-123', { textAlign: 'center' })
       * @example
       * editor.commands.updateBlockNodeAttributes('block-123', { indent: { left: 20 } })
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

    /**
     * Assigns a new sdBlockId attribute to a block node.
     * @param {import('prosemirror-state').Transaction} tr - Current transaction being updated.
     * @param {import('prosemirror-model').Node} node - Node that needs the identifier.
     * @param {number} pos - Document position of the node.
     */
    const assignBlockId = (tr, node, pos) => {
      tr.setNodeMarkup(
        pos,
        undefined,
        {
          ...node.attrs,
          sdBlockId: uuidv4(),
        },
        node.marks,
      );
    };

    return [
      new Plugin({
        key: BlockNodePluginKey,
        appendTransaction: (transactions, oldState, newState) => {
          const docChanges = transactions.some((tr) => tr.docChanged) && !oldState.doc.eq(newState.doc);

          if (hasInitialized && !docChanges) {
            return;
          }

          if (hasInitialized && !checkForNewBlockNodesInTrs([...transactions])) {
            return;
          }

          const { tr } = newState;
          let changed = false;

          if (!hasInitialized) {
            // Initial pass: assign IDs to all block nodes in document
            newState.doc.descendants((node, pos) => {
              if (nodeAllowsSdBlockIdAttr(node) && nodeNeedsSdBlockId(node)) {
                assignBlockId(tr, node, pos);
                changed = true;
              }
            });
          } else {
            // Subsequent updates: only check affected ranges
            const rangesToCheck = [];
            let shouldFallbackToFullTraversal = false;

            transactions.forEach((transaction, txIndex) => {
              transaction.steps.forEach((step, stepIndex) => {
                if (!(step instanceof ReplaceStep)) return;

                const hasNewBlockNodes = step.slice?.content?.content?.some((node) => nodeAllowsSdBlockIdAttr(node));
                if (!hasNewBlockNodes) return;

                const stepMap = step.getMap();

                stepMap.forEach((_oldStart, _oldEnd, newStart, newEnd) => {
                  if (newEnd <= newStart) {
                    if (process.env.NODE_ENV === 'development') {
                      console.debug('Block node: invalid range in step map, falling back to full traversal');
                    }
                    shouldFallbackToFullTraversal = true;
                    return;
                  }

                  let rangeStart = newStart;
                  let rangeEnd = newEnd;

                  // Map through remaining steps in the current transaction
                  for (let i = stepIndex + 1; i < transaction.steps.length; i++) {
                    const laterStepMap = transaction.steps[i].getMap();
                    rangeStart = laterStepMap.map(rangeStart, -1);
                    rangeEnd = laterStepMap.map(rangeEnd, 1);
                  }

                  // Map through later transactions in the appendTransaction batch
                  for (let i = txIndex + 1; i < transactions.length; i++) {
                    const laterTx = transactions[i];
                    rangeStart = laterTx.mapping.map(rangeStart, -1);
                    rangeEnd = laterTx.mapping.map(rangeEnd, 1);
                  }

                  if (rangeEnd <= rangeStart) {
                    if (process.env.NODE_ENV === 'development') {
                      console.debug('Block node: invalid range after mapping, falling back to full traversal');
                    }
                    shouldFallbackToFullTraversal = true;
                    return;
                  }

                  rangesToCheck.push([rangeStart, rangeEnd]);
                });
              });
            });

            const mergedRanges = mergeRanges(rangesToCheck);

            for (const [start, end] of mergedRanges) {
              const docSize = newState.doc.content.size;
              const clampedRange = clampRange(start, end, docSize);

              if (!clampedRange) {
                if (process.env.NODE_ENV === 'development') {
                  console.debug('Block node: invalid range after clamping, falling back to full traversal');
                }
                shouldFallbackToFullTraversal = true;
                break;
              }

              const [safeStart, safeEnd] = clampedRange;

              try {
                newState.doc.nodesBetween(safeStart, safeEnd, (node, pos) => {
                  if (nodeAllowsSdBlockIdAttr(node) && nodeNeedsSdBlockId(node)) {
                    assignBlockId(tr, node, pos);
                    changed = true;
                  }
                });
              } catch (error) {
                console.warn('Block node plugin: nodesBetween failed, falling back to full traversal', error);
                shouldFallbackToFullTraversal = true;
                break;
              }
            }

            if (shouldFallbackToFullTraversal) {
              newState.doc.descendants((node, pos) => {
                if (nodeAllowsSdBlockIdAttr(node) && nodeNeedsSdBlockId(node)) {
                  assignBlockId(tr, node, pos);
                  changed = true;
                }
              });
            }
          }

          if (changed && !hasInitialized) {
            hasInitialized = true;
            tr.setMeta('blockNodeInitialUpdate', true);
          }

          // Restore marks since setNodeMarkup resets them
          tr.setStoredMarks(newState.tr.storedMarks);

          return changed ? tr : null;
        },
      }),
    ];
  },
});

/**
 * Check if a node allows sdBlockId attribute
 * @param {ProseMirrorNode} node - The ProseMirror node to check
 * @returns {boolean} True if the node type supports sdBlockId attribute
 */
export const nodeAllowsSdBlockIdAttr = (node) => {
  return !!(node?.isBlock && node?.type?.spec?.attrs?.[SD_BLOCK_ID_ATTRIBUTE_NAME]);
};

/**
 * Check if a node needs an sdBlockId (doesn't have one or has null/empty value)
 * @param {ProseMirrorNode} node - The ProseMirror node to check
 * @returns {boolean} True if the node needs an sdBlockId assigned
 */
export const nodeNeedsSdBlockId = (node) => {
  const currentId = node?.attrs?.[SD_BLOCK_ID_ATTRIBUTE_NAME];
  return !currentId;
};

/**
 * Check for new block nodes in ProseMirror transactions.
 * Iterate through the list of transactions, and in each tr check if there are any new block nodes.
 * @param {Transaction[]} transactions - The ProseMirror transactions to check
 * @returns {boolean} True if new block nodes are found, false otherwise
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
