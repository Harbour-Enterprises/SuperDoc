// @ts-nocheck
import { Mark, Attribute } from '@core/index.js';
import { annotationClass, annotationContentClass } from '../field-annotation/index.js';

/**
 * Configuration options for TextStyle
 * @typedef {Object} TextStyleOptions
 * @category Options
 * @property {Object} [htmlAttributes={}] - Custom HTML attributes to apply to text style spans
 */

/**
 * Attributes for text style marks
 * @typedef {Object} TextStyleAttributes
 * @category Attributes
 * @property {string} [styleId] - Style identifier for referencing predefined styles
 */

/**
 * @module TextStyle
 * @sidebarTitle Text Style
 * @snippetPath /snippets/extensions/text-style.mdx
 */
export const TextStyle = Mark.create({
  name: 'textStyle',

  addOptions() {
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
      {
        getAttrs: (node) => {
          const fontFamily = node.style.fontFamily?.replace(/['"]+/g, '');
          const fontSize = node.style.fontSize;
          const textTransform = node.style.textTransform;
          if (fontFamily || fontSize || textTransform) {
            return {
              fontFamily: fontFamily || null,
              fontSize: fontSize || null,
              textTransform: textTransform || null,
            };
          }
          return false;
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
       * @example
       * editor.commands.removeEmptyTextStyle()
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
