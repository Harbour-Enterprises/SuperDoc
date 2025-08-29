/**
 * Heading attributes
 * @typedef {Object} HeadingAttributes
 * @property {number} level - Heading level (1-6)
 */
/**
 * @module Heading
 * @sidebarTitle Heading
 * @snippetPath /snippets/extensions/heading.mdx
 * @shortcut Mod-Alt-1 | toggleHeading | Toggle heading level 1
 * @shortcut Mod-Alt-2 | toggleHeading | Toggle heading level 2
 * @shortcut Mod-Alt-3 | toggleHeading | Toggle heading level 3
 * @shortcut Mod-Alt-4 | toggleHeading | Toggle heading level 4
 * @shortcut Mod-Alt-5 | toggleHeading | Toggle heading level 5
 * @shortcut Mod-Alt-6 | toggleHeading | Toggle heading level 6
 */
export const Heading: Node;
/**
 * Heading attributes
 */
export type HeadingAttributes = {
    /**
     * - Heading level (1-6)
     */
    level: number;
};
import { Node } from '@core/index.js';
