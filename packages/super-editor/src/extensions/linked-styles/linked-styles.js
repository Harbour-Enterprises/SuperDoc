// @ts-check
import { Extension } from '@core/Extension.js';
import { applyLinkedStyleToTransaction, generateLinkedStyleString } from './helpers.js';
import { createLinkedStylesPlugin, LinkedStylesPluginKey } from './plugin.js';
import { findParentNodeClosestToPos } from '@core/helpers';

/**
 * Style definition from Word document
 * @typedef {Object} LinkedStyle
 * @property {string} id - Style ID (e.g., 'Heading1', 'Normal')
 * @property {string} type - Style type ('paragraph' or 'character')
 * @property {Object} definition - Style definition from Word
 */

/**
 * Configuration options for LinkedStyles
 * @typedef {Object} LinkedStylesOptions
 * @category Options
 */

/**
 * @module LinkedStyles
 * @sidebarTitle Linked Styles
 * @snippetPath /snippets/extensions/linked-styles.mdx
 */
export const LinkedStyles = Extension.create({
  name: 'linkedStyles',

  priority: 1, // We need this plugin to run before the list plugins

  addOptions() {
    return {};
  },

  addPmPlugins() {
    return [createLinkedStylesPlugin(this.editor)];
  },

  addCommands() {
    return {
      /**
       * Apply a linked style to the selected paragraphs
       * @category Command
       * @param {LinkedStyle} style - The style object to apply
       * @example
       * const style = editor.helpers.linkedStyles.getStyleById('Heading1');
       * editor.commands.setLinkedStyle(style);
       * @note Clears existing formatting when applying a style
       * @note Works with custom selection preservation
       */
      setLinkedStyle: (style) => (params) => {
        const { tr } = params;
        return applyLinkedStyleToTransaction(tr, this.editor, style);
      },

      /**
       * Toggle a linked style on the current selection
       * @category Command
       * @param {LinkedStyle} style - The linked style to apply (with id property)
       * @param {string|null} [nodeType=null] - Node type to restrict toggle to (e.g., 'paragraph')
       * @example
       * const style = editor.helpers.linkedStyles.getStyleById('Heading1');
       * editor.commands.toggleLinkedStyle(style)
       * editor.commands.toggleLinkedStyle(style, 'paragraph')
       * @note If selection is empty, returns false
       * @note Removes style if already applied, applies it if not
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
       * Apply a linked style by its ID
       * @category Command
       * @param {string} styleId - The style ID to apply (e.g., 'Heading1')
       * @example
       * editor.commands.setStyleById('Heading1')
       * editor.commands.setStyleById('Normal')
       * @note Looks up the style from loaded Word styles
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
       * Get all available linked styles
       * @category Helper
       * @returns {Array} Array of linked style objects
       * @example
       * const styles = editor.helpers.linkedStyles.getStyles();
       * // Returns all styles from the Word document
       */
      getStyles: () => {
        const styles = LinkedStylesPluginKey.getState(this.editor.state)?.styles || [];
        return styles;
      },

      /**
       * Get a specific style by ID
       * @category Helper
       * @param {string} styleId - The style ID to find
       * @returns {Object} The style object or undefined
       * @example
       * const headingStyle = editor.helpers.linkedStyles.getStyleById('Heading1');
       */
      getStyleById: (styleId) => {
        const styles = this.editor.helpers[this.name].getStyles();
        return styles.find((s) => s.id === styleId);
      },

      /**
       * Get the CSS string for a style
       * @category Helper
       * @param {string} styleId - The style ID
       * @returns {string} CSS style string
       * @example
       * const css = editor.helpers.linkedStyles.getLinkedStyleString('Heading1');
       * // Returns: "font-size: 16pt; font-weight: bold; color: #2E74B5"
       * @private
       */
      getLinkedStyleString: (styleId) => {
        const styles = this.editor.helpers.linkedStyles.getStyles();
        const style = styles.find((s) => s.id === styleId);
        if (!style) return '';
        return generateLinkedStyleString(style);
      },
    };
  },
});
