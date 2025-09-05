import { Extension } from '@core/Extension.js';
import { applyLinkedStyleToTransaction, generateLinkedStyleString } from './helpers.js';
import { createLinkedStylesPlugin, LinkedStylesPluginKey } from './plugin.js';

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
