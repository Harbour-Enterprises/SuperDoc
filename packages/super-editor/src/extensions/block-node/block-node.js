import { Extension } from '@core/Extension.js';
import { helpers } from '@core/index.js';
const { findChildren } = helpers;

export const BlockNode = Extension.create({
  name: 'BlockNode',

  addCommands() {
    return {
      replaceBlockNodeById: (id, content) => (params) => {
        const { tr } = params;
        return null;
      },

      deleteBlockNodeById: (id) => (params) => {
        return null;
      },

      updateBlockNodeAttrs: (id, attrs) => (params) => {
        return null;
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
