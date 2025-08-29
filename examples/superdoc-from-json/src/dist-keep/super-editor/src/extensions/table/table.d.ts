/**
 * @module Table
 * @sidebarTitle Table
 * @snippetPath /snippets/extensions/table.mdx
 * @shortcut Tab | goToNextCell/addRowAfter | Navigate to next cell or add row
 * @shortcut Shift-Tab | goToPreviousCell | Navigate to previous cell
 * @shortcut Backspace | deleteTableWhenSelected | Delete table when all cells selected
 * @shortcut Delete | deleteTableWhenSelected | Delete table when all cells selected
 */
export const Table: Node;
/**
 * Table configuration options
 */
export type TableConfig = {
    /**
     * - Number of rows to create
     */
    rows?: number;
    /**
     * - Number of columns to create
     */
    cols?: number;
    /**
     * - Create first row as header row
     */
    withHeaderRow?: boolean;
};
/**
 * Table indentation configuration
 */
export type TableIndent = {
    /**
     * - Indent width in pixels
     */
    width: number;
    /**
     * - Indent type
     */
    type?: string;
};
/**
 * Table attributes
 */
export type TableAttributes = {
    /**
     * - Table indentation
     */
    tableIndent?: TableIndent;
    /**
     * - Table border configuration
     */
    borders?: import("./tableHelpers/createTableBorders.js").TableBorders;
    /**
     * - CSS border-collapse value
     */
    borderCollapse?: string;
    /**
     * - Reference to table style ID
     */
    tableStyleId?: string;
    /**
     * - Table layout algorithm
     */
    tableLayout?: string;
    /**
     * - Cell spacing in pixels
     */
    tableCellSpacing?: number;
};
/**
 * Cell selection position
 */
export type CellSelectionPosition = {
    /**
     * - Starting cell position
     */
    anchorCell: number;
    /**
     * - Ending cell position
     */
    headCell: number;
};
/**
 * Column group information
 */
export type ColGroupInfo = {
    /**
     * - Column group DOM structure
     */
    colgroup?: any[];
    /**
     * - Fixed table width or empty string
     */
    tableWidth?: string;
    /**
     * - Minimum table width or empty string
     */
    tableMinWidth?: string;
    /**
     * - Array of column width values
     */
    colgroupValues?: number[];
};
/**
 * Position resolution result
 */
export type CellPosition = {
    /**
     * - Resolved position
     */
    $pos: any;
    /**
     * - Absolute position
     */
    pos: number;
    /**
     * - Depth in document tree
     */
    depth: number;
};
/**
 * Current cell information
 */
export type CurrentCellInfo = {
    /**
     * - Selected rectangle from ProseMirror
     */
    rect: any;
    /**
     * - Current cell node
     */
    cell: any;
    /**
     * - Cell attributes without span properties
     */
    attrs: any;
};
import { Node } from '@core/index.js';
