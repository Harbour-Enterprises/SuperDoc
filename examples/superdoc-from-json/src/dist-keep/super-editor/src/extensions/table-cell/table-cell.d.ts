/**
 * @module TableCell
 * @sidebarTitle Table Cell
 * @snippetPath /snippets/extensions/table-cell.mdx
 */
export const TableCell: Node;
/**
 * Cell margins configuration
 */
export type CellMargins = {
    /**
     * - Top margin in pixels
     */
    top?: number;
    /**
     * - Right margin in pixels
     */
    right?: number;
    /**
     * - Bottom margin in pixels
     */
    bottom?: number;
    /**
     * - Left margin in pixels
     */
    left?: number;
};
/**
 * Cell background configuration
 */
export type CellBackground = {
    /**
     * - Background color (hex without #)
     */
    color: string;
};
import { Node } from '@core/index.js';
