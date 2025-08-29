/**
 * Size configuration for content blocks
 * @typedef {Object} ContentBlockSize
 * @property {number} [top] - Top position in pixels
 * @property {number} [left] - Left position in pixels
 * @property {number|string} [width] - Width in pixels or percentage (e.g., "50%")
 * @property {number|string} [height] - Height in pixels or percentage
 */
/**
 * Content block configuration
 * @typedef {Object} ContentBlockConfig
 * @property {boolean} [horizontalRule] - Whether this is a horizontal rule
 * @property {ContentBlockSize} [size] - Size and position configuration
 * @property {string} [background] - Background color (hex, rgb, or named color)
 */
/**
 * @module ContentBlock
 * @sidebarTitle Content Block
 * @snippetPath /snippets/extensions/content-block.mdx
 */
export const ContentBlock: Node;
/**
 * Size configuration for content blocks
 */
export type ContentBlockSize = {
    /**
     * - Top position in pixels
     */
    top?: number;
    /**
     * - Left position in pixels
     */
    left?: number;
    /**
     * - Width in pixels or percentage (e.g., "50%")
     */
    width?: number | string;
    /**
     * - Height in pixels or percentage
     */
    height?: number | string;
};
/**
 * Content block configuration
 */
export type ContentBlockConfig = {
    /**
     * - Whether this is a horizontal rule
     */
    horizontalRule?: boolean;
    /**
     * - Size and position configuration
     */
    size?: ContentBlockSize;
    /**
     * - Background color (hex, rgb, or named color)
     */
    background?: string;
};
import { Node } from '@core/index.js';
