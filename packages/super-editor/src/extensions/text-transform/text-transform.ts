import { Extension } from '@core/index.js';
import type { AttributeValue } from '@core/Attribute.js';

/**
 * Configuration options for TextTransform
 * @category Options
 */
export interface TextTransformOptions extends Record<string, unknown> {
  /**
   * Mark types to apply text transform to
   * @default ['textStyle']
   */
  types: string[];
}

/**
 * Attributes for text transform
 * @category Attributes
 */
export interface TextTransformAttributes {
  /**
   * Text transform value (uppercase, lowercase, capitalize, none)
   */
  textTransform?: string;
}

/**
 * @module TextTransform
 * @sidebarTitle Text Transform
 * @snippetPath /snippets/extensions/text-transform.mdx
 */
export const TextTransform = Extension.create<TextTransformOptions>({
  name: 'textTransform',

  addOptions() {
    return {
      types: ['textStyle'],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: (this.options as TextTransformOptions).types,
        attributes: {
          /**
           * @category Attribute
           * @param {string} [textTransform] - Text transform value (uppercase, lowercase, capitalize, none)
           */
          textTransform: {
            default: null,
            renderDOM: (attrs: Record<string, AttributeValue> = {}) => {
              const raw = attrs.textTransform;
              const value = typeof raw === 'string' ? raw : null;
              if (!value) return {};
              return {
                style: `text-transform: ${value}`,
              };
            },
          },
        },
      },
    ];
  },
});
