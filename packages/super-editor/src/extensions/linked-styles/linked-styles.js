import { Extension } from '@core/Extension.js';
import { applyLinkedStyleToTransaction, generateLinkedStyleString } from './helpers.js';
import { createLinkedStylesPlugin, LinkedStylesPluginKey } from './plugin.js';
import { findParentNodeClosestToPos } from '@core/helpers';

export const LinkedStyles = Extension.create({
  name: 'linkedStyles',

  priority: 1, // We need this plugin to run before the list plugins

  addPmPlugins() {
    return [createLinkedStylesPlugin(this.editor)];
  },

  addCommands() {
    return {
      /**
       * Apply a linked style to the current selection.
       *
       * @param {object} style The linked style to apply
       * @param {string} style.id The style ID (e.g., 'Heading1')
       * @returns {boolean} Whether the style was correctly applied
       */
      setLinkedStyle: (style) => (params) => {
        const { tr } = params;
        return applyLinkedStyleToTransaction(tr, this.editor, style);
      },

      /**
       * Toggle a linked style on the current selection.
       *
       * @param {object} style The linked style to apply
       * @param {string} style.id The style ID (e.g., 'Heading1')
       * @param {string|null} nodeType The node type to restrict the toggle to (e.g., 'paragraph'). If null,
       * the style can be toggled on any node type.
       * @returns {boolean} Whether the style was correctly applied/removed
       */
      toggleLinkedStyle:
        (style, nodeType = null) =>
        (params) => {
          const { tr } = params;
          if (tr.selection.empty) {
            return false;
          }
          let node = tr.doc.nodeAt(tr.selection.$from.pos);

          if (node && nodeType && node.type.name !== nodeType) {
            node = findParentNodeClosestToPos(tr.selection.$from, (n) => {
              return nodeType ? n.type.name === nodeType : true;
            })?.node;
          }
          if (!node) {
            return false;
          }
          const currentStyleId = node.attrs.styleId;

          if (currentStyleId === style.id) {
            return applyLinkedStyleToTransaction(tr, this.editor, { id: null });
          }
          return applyLinkedStyleToTransaction(tr, this.editor, style);
        },

      /**
       * Apply a linked style by its ID.
       * @param {string} styleId The style ID (e.g., 'Heading1')
       * @returns {boolean} Whether the style was correctly applied
       */
      setStyleById: (styleId) => (params) => {
        const { state, tr } = params;
        const pluginState = LinkedStylesPluginKey.getState(state);
        if (!pluginState) return false;

        const style = pluginState.styles?.find((s) => s.id === styleId);
        if (!style) return false;

        return applyLinkedStyleToTransaction(tr, this.editor, style);
      },
    };
  },

  addHelpers() {
    return {
      /**
       * Get all linked styles available in the editor
       * @returns {Array} Array of linked style objects
       */
      getStyles: () => {
        const styles = LinkedStylesPluginKey.getState(this.editor.state)?.styles || [];
        return styles;
      },

      /**
       * Get a linked style by its ID
       * @param {string} styleId The style ID (e.g., 'Heading1')
       * @returns {object|null} The linked style object or null if not found
       */
      getStyleById: (styleId) => {
        const styles = this.editor.helpers[this.name].getStyles();
        return styles.find((s) => s.id === styleId);
      },

      getLinkedStyleString: (styleId) => {
        const styles = this.editor.helpers.linkedStyles.getStyles();
        const style = styles.find((s) => s.id === styleId);
        if (!style) return '';
        return generateLinkedStyleString(style);
      },
    };
  },
});
