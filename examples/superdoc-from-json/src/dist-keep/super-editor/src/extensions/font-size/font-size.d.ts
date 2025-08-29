/**
 * Do we need a unit conversion system?
 *
 * For reference.
 * https://github.com/remirror/remirror/tree/HEAD/packages/remirror__extension-font-size
 * https://github.com/remirror/remirror/blob/83adfa93f9a320b6146b8011790f27096af9340b/packages/remirror__core-utils/src/dom-utils.ts
 */
/**
 * Font size configuration
 * @typedef {Object} FontSizeDefaults
 * @property {number} [value=12] - Default font size value
 * @property {string} [unit='pt'] - Default unit (pt, px, em, rem)
 * @property {number} [min=8] - Minimum allowed size
 * @property {number} [max=96] - Maximum allowed size
 */
/**
 * Font size value
 * @typedef {string|number} FontSizeValue
 * @description Size with optional unit (e.g., '12pt', '16px', 14)
 */
/**
 * @module FontSize
 * @sidebarTitle Font Size
 * @snippetPath /snippets/extensions/font-size.mdx
 */
export const FontSize: Extension;
/**
 * Font size configuration
 */
export type FontSizeDefaults = {
    /**
     * - Default font size value
     */
    value?: number;
    /**
     * - Default unit (pt, px, em, rem)
     */
    unit?: string;
    /**
     * - Minimum allowed size
     */
    min?: number;
    /**
     * - Maximum allowed size
     */
    max?: number;
};
/**
 * Font size value
 */
export type FontSizeValue = string | number;
import { Extension } from '@core/index.js';
