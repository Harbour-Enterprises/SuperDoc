import { Extension } from '@core/index.js';
import { parseSizeUnit, minMax } from '@core/utilities/index.js';

/**
 * Do we need a unit conversion system?
 *
 * For reference.
 * https://github.com/remirror/remirror/tree/HEAD/packages/remirror__extension-font-size
 * https://github.com/remirror/remirror/blob/83adfa93f9a320b6146b8011790f27096af9340b/packages/remirror__core-utils/src/dom-utils.ts
 */

/**
 * Font size configuration
 */
export interface FontSizeDefaults {
  /**
   * Default font size value
   * @default 12
   */
  value: number;
  /**
   * Default unit (pt, px, em, rem)
   * @default 'pt'
   */
  unit: string;
  /**
   * Minimum allowed size
   * @default 8
   */
  min: number;
  /**
   * Maximum allowed size
   * @default 96
   */
  max: number;
}

/**
 * Font size value
 * @description Size with optional unit (e.g., '12pt', '16px', 14)
 */
export type FontSizeValue = string | number;

/**
 * Configuration options for FontSize
 * @category Options
 */
export interface FontSizeOptions extends Record<string, unknown> {
  /**
   * Node/mark types to add font size support to
   * @default ['textStyle', 'tableCell']
   */
  types: string[];
  /**
   * Default size configuration
   */
  defaults: FontSizeDefaults;
}

/**
 * Attributes for font size
 * @category Attributes
 */
export interface FontSizeAttributes {
  /**
   * Font size with unit
   */
  fontSize?: FontSizeValue;
}

/**
 * @module FontSize
 * @sidebarTitle Font Size
 * @snippetPath /snippets/extensions/font-size.mdx
 */
export const FontSize = Extension.create<FontSizeOptions>({
  name: 'fontSize',

  addOptions() {
    return {
      types: ['textStyle', 'tableCell'],
      defaults: {
        value: 12,
        unit: 'pt',
        min: 8,
        max: 96,
      },
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseDOM: (el: HTMLElement) => el.style.fontSize,
            renderDOM: (attrs: FontSizeAttributes) => {
              if (!attrs.fontSize) return {};
              const [value, unit] = parseSizeUnit(String(attrs.fontSize));
              if (Number.isNaN(value)) return {};
              const finalUnit = unit ? unit : this.options.defaults.unit;
              return { style: `font-size: ${value}${finalUnit}` };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      /**
       * Set font size
       * @category Command
       * @param {FontSizeValue} fontSize - Size to apply (with optional unit)
       * @example
       * editor.commands.setFontSize('14pt')
       * editor.commands.setFontSize('18px')
       * editor.commands.setFontSize(16)
       * @note Automatically clamps to min/max values
       */
      setFontSize:
        (fontSize: FontSizeValue) =>
        ({ chain }: { chain: () => { setMark: (...args: unknown[]) => { run: () => boolean } } }) => {
          let value: number;
          let unit: string | null = null;

          if (typeof fontSize === 'number') {
            value = fontSize;
          } else {
            const [parsedValue, parsedUnitRaw] = parseSizeUnit(String(fontSize));
            value = Number(parsedValue);
            unit = typeof parsedUnitRaw === 'string' ? parsedUnitRaw : null;
          }

          if (Number.isNaN(value)) {
            return false;
          }

          const { min, max, unit: defaultUnit } = this.options.defaults;
          value = minMax(Number(value), min, max);
          unit = unit ? unit : defaultUnit;

          return chain()
            .setMark('textStyle', { fontSize: `${value}${unit}` })
            .run();
        },

      /**
       * Remove font size
       * @category Command
       * @example
       * editor.commands.unsetFontSize()
       * @note Reverts to default document size
       */
      unsetFontSize:
        () =>
        ({
          chain,
        }: {
          chain: () => { setMark: (...args: unknown[]) => { removeEmptyTextStyle: () => { run: () => boolean } } };
        }) => {
          return chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run();
        },
    };
  },
});
