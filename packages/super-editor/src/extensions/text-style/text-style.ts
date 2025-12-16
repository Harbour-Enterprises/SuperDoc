import { Mark, Attribute } from '@core/index.js';
import { annotationClass, annotationContentClass } from '../field-annotation/index.js';
import type { AttributeValue } from '@core/Attribute.js';
import type { MarkType } from 'prosemirror-model';
import type { Command, CommandProps } from '@core/types/ChainedCommands.js';

/**
 * Configuration options for TextStyle
 * @category Options
 */
interface TextStyleOptions extends Record<string, unknown> {
  /** Custom HTML attributes to apply to text style spans */
  htmlAttributes: Record<string, AttributeValue>;
}

/**
 * @module TextStyle
 * @sidebarTitle Text Style
 * @snippetPath /snippets/extensions/text-style.mdx
 */
export const TextStyle = Mark.create<TextStyleOptions>({
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
        getAttrs: (el: HTMLElement) => {
          const hasStyles = el.hasAttribute('style');
          const isAnnotation = el.classList.contains(annotationClass) || el.classList.contains(annotationContentClass);
          if (!hasStyles || isAnnotation) return false;
          return {};
        },
      },
      {
        getAttrs: (node: HTMLElement) => {
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

  renderDOM({
    htmlAttributes = {} as Record<string, AttributeValue>,
  }: {
    htmlAttributes: Record<string, AttributeValue>;
  }) {
    const base = (this.options as TextStyleOptions).htmlAttributes as Record<string, AttributeValue>;
    return ['span', Attribute.mergeAttributes(base, htmlAttributes), 0];
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
        (): Command =>
        ({ state, commands }: CommandProps) => {
          const attributes = Attribute.getMarkAttributes(state, this.name as string | MarkType);
          const hasStyles = Object.entries(attributes).some(([, value]) => !!value);
          if (hasStyles) return true;
          return Boolean(commands.unsetMark(this.name));
        },
    };
  },
});
