/**
 * Bookmark configuration
 * @typedef {Object} BookmarkConfig
 * @property {string} name - Bookmark name for reference
 * @property {string} [id] - Optional unique identifier
 */
/**
 * @module BookmarkStart
 * @sidebarTitle Bookmarks
 * @snippetPath /snippets/extensions/bookmarks.mdx
 */
export const BookmarkStart: Node;
/**
 * Bookmark configuration
 */
export type BookmarkConfig = {
    /**
     * - Bookmark name for reference
     */
    name: string;
    /**
     * - Optional unique identifier
     */
    id?: string;
};
import { Node } from '@core/index.js';
