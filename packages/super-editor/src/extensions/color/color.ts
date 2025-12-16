import { Extension } from '@core/index.js';

/**
 * Color value format
 * @description Accepts hex colors (#ff0000), rgb(255,0,0), or named colors (red)
 */
export type ColorValue = string;

/**
 * Configuration options for Color
 * @category Options
 */
export interface ColorOptions extends Record<string, unknown> {
  /**
   * Mark types to add color support to
   * @default ['textStyle']
   */
  types: string[];
}

/**
 * Attributes for color marks
 * @category Attributes
 * @example
 * // Apply color to selected text
 * editor.commands.setColor('#ff0000')
 *
 * // Remove color
 * editor.commands.unsetColor()
 */
export interface ColorAttributes {
  /**
   * Text color value
   */
  color?: ColorValue;
}

/**
 * @module Color
 * @sidebarTitle Color
 * @snippetPath /snippets/extensions/color.mdx
 */
export const Color = Extension.create<ColorOptions>({
  name: 'color',

  addOptions() {
    return {
      types: ['textStyle'],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          color: {
            default: null,
            parseDOM: (el: HTMLElement) => el.style.color?.replace(/['"]+/g, ''),
            renderDOM: (attrs: { color?: string | null }) => {
              if (!attrs.color) return {};
              return { style: `color: ${attrs.color}` };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      /**
       * Set text color
       * @category Command
       * @param {ColorValue} color - Color value to apply
       * @example
       * // Set to red using hex
       * editor.commands.setColor('#ff0000')
       *
       * @example
       * // Set using rgb
       * editor.commands.setColor('rgb(255, 0, 0)')
       *
       * @example
       * // Set using named color
       * editor.commands.setColor('blue')
       * @note Preserves other text styling attributes
       */
      setColor:
        (color: ColorValue) =>
        ({
          chain,
        }: {
          chain: () => { setMark: (mark: string, attrs: { color: ColorValue }) => { run: () => boolean } };
        }) => {
          return chain().setMark('textStyle', { color: color }).run();
        },

      /**
       * Remove text color
       * @category Command
       * @example
       * editor.commands.unsetColor()
       * @note Removes color while preserving other text styles
       */
      unsetColor:
        () =>
        ({
          chain,
        }: {
          chain: () => {
            setMark: (mark: string, attrs: { color: null }) => { removeEmptyTextStyle: () => { run: () => boolean } };
          };
        }) => {
          return chain().setMark('textStyle', { color: null }).removeEmptyTextStyle().run();
        },
    };
  },
});
