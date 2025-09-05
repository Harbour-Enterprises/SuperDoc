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
            console.debug('[toggleLinkedStyle] empty selection, nothing to do...');
            return false;
          }
          let node = tr.doc.nodeAt(tr.selection.$from.pos);

          if (nodeType && node.type.name !== nodeType) {
            console.debug(
              `[toggleLinkedStyle] Current node has different type (${node.type.name}). Searching parents...`,
            );
            node = findParentNodeClosestToPos(tr.selection.$from, (n) => {
              return nodeType ? n.type.name === nodeType : true;
            })?.node;
          }
          console.debug('[toggleLinkedStyle] Current node:', node, node?.attrs);
          if (!node) {
            console.debug('[toggleLinkedStyle] Current node is not of type:', nodeType);
            return false;
          }
          const currentStyleId = node.attrs.styleId;

          if (currentStyleId === style.id) {
            console.debug('[toggleLinkedStyle] Removing style:', style.id);
            return applyLinkedStyleToTransaction(tr, this.editor, { id: null });
          }
          console.debug('[toggleLinkedStyle] Applying style:', style.id);
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
        const styles = this.getStyles();
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
