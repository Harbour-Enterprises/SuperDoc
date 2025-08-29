/**
 * @module Underline
 * @sidebarTitle Underline
 * @snippetPath /snippets/extensions/underline.mdx
 * @shortcut Mod-u | toggleUnderline | Toggle underline formatting
 * @shortcut Mod-U | toggleUnderline | Toggle underline formatting (uppercase)
 */
export const Underline: Mark;
/**
 * Underline style configuration
 */
export type UnderlineConfig = {
    /**
     * - Style variant
     */
    value: "single" | "double" | "thick" | "dotted" | "dashed" | "wavy";
};
import { Mark } from '@core/index.js';
