/**
 * @module Link
 * @sidebarTitle Link
 * @snippetPath /snippets/extensions/link.mdx
 * @note Non-inclusive mark that doesn't expand when typing at edges
 */
export const Link: Mark;
/**
 * Link attributes
 */
export type LinkAttributes = {
    /**
     * - URL or anchor reference
     */
    href: string;
    /**
     * - Link target
     */
    target?: string;
    /**
     * - Relationship attributes
     */
    rel?: string;
    /**
     * - Word relationship ID for internal links
     */
    rId?: string;
    /**
     * - Display text for the link
     */
    text?: string;
    /**
     * - Anchor name for internal references
     */
    name?: string;
};
import { Mark } from '@core/index.js';
