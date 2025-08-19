import { Extension } from '@core/Extension.js';
import { helpers } from '@core/index.js';
const { findChildren } = helpers;

export const BlockNode = Extension.create({
  name: 'BlockNode',

  addCommands() {
    return {
      replaceBlockNodeById:
        (id, contentNode) =>
        ({ dispatch, tr }) => {
          let blockNode = this.editor.helpers.BlockNode.getBlockNodeById(id);
          if (!blockNode || blockNode.length > 1) {
            return true;
          }

          if (dispatch) {
            let { pos, node } = blockNode[0];
            let newPosFrom = tr.mapping.map(pos); // map the position between transaction steps
            let newPosTo = tr.mapping.map(pos + node.nodeSize);

            let currentNode = tr.doc.nodeAt(newPosFrom);
            if (node.eq(currentNode)) {
              tr.replaceWith(newPosFrom, newPosTo, contentNode);
            }
          }

          return true;
        },

      deleteBlockNodeById:
        (id) =>
        ({ dispatch, tr }) => {
          let blockNode = this.editor.helpers.BlockNode.getBlockNodeById(id);
          if (!blockNode || blockNode.length > 1) {
            return true;
          }

          if (dispatch) {
            let { pos, node } = blockNode[0];
            let newPosFrom = tr.mapping.map(pos); // map the position between transaction steps
            let newPosTo = tr.mapping.map(pos + node.nodeSize);

            let currentNode = tr.doc.nodeAt(newPosFrom);
            if (node.eq(currentNode)) {
              tr.delete(newPosFrom, newPosTo);
            }
          }

          return true;
        },

      updateBlockNodeAttributes:
        (id, attrs = {}) =>
        ({ dispatch, tr }) => {
          if (!dispatch) return true;

          let blockNode = this.editor.helpers.BlockNode.getBlockNodeById(id);
          if (!blockNode || blockNode.length > 1) {
            return true;
          }

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
        },
    };
  },

  addHelpers() {
    return {
      getBlockNodes: () => {
        return findChildren(this.editor.state.doc, (node) => node.type.groups.includes('block'));
      },

      getBlockNodeById: (id) => {
        return findChildren(this.editor.state.doc, (node) => node.attrs.sdBlockId === id);
      },

      getBlockNodesByType: (type) => {
        return findChildren(this.editor.state.doc, (node) => node.type.name === type);
      },

      getBlockNodesInRange: (from, to) => {
        let blockNodes = [];

        this.editor.state.doc.nodesBetween(from, to, (node, pos) => {
          if (!node || node?.nodeSize === undefined) {
            return;
          }
          if (node.type.groups.includes('block')) {
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
});
