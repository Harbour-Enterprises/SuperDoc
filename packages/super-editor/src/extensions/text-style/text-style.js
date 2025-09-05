// @ts-check
import { Mark, Attribute } from '@core/index.js';
import { annotationClass, annotationContentClass } from '../field-annotation/index.js';

/**
 * @module TextStyle
 * @sidebarTitle Text Style
 * @snippetPath /snippets/extensions/text-style.mdx
 */
export const TextStyle = Mark.create({
  name: 'textStyle',

  addOptions() {
    /**
     * @typedef {Object} TextStyleOptions
     * @category Options
     * @property {Object} [htmlAttributes={}] - Custom HTML attributes to apply to text style spans
     */
    return {
      htmlAttributes: {},
    };
  },

  parseDOM() {
    return [
      {
        tag: 'span',
        getAttrs: (el) => {
          const hasStyles = el.hasAttribute('style');
          const isAnnotation = el.classList.contains(annotationClass) || el.classList.contains(annotationContentClass);
          if (!hasStyles || isAnnotation) return false;
          return {};
        },
      },
    ];
  },

  renderDOM({ htmlAttributes }) {
    return ['span', Attribute.mergeAttributes(this.options.htmlAttributes, htmlAttributes), 0];
  },

  addAttributes() {
    return {
      /**
       * @category Attribute
       * @param {string} [styleId] - Style identifier for referencing predefined styles
       */
      styleId: {},
    };
  },

  addCommands() {
    return {
      /**
       * Remove empty text style marks
       * @category Command
       * @returns {Function} Command function - Removes mark if no attributes present
       * @example
       * removeEmptyTextStyle()
       * @note Cleanup utility to prevent empty span elements
       * @note Automatically checks if any style attributes exist before removal
       */
      removeEmptyTextStyle:
        () =>
        ({ state, commands }) => {
          const attributes = Attribute.getMarkAttributes(state, this.type);
          const hasStyles = Object.entries(attributes).some(([, value]) => !!value);
          if (hasStyles) return true;
          return commands.unsetMark(this.name);
        },
    };
  },
});
