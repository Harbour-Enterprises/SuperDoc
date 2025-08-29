export function createTableBorders({ size, color }?: BorderOptions): TableBorders;
/**
 * Table border configuration
 */
export type TableBorder = {
    /**
     * - Border width in pixels
     */
    size?: number;
    /**
     * - Border color (hex or CSS color)
     */
    color?: string;
    /**
     * - Border style (solid, dashed, dotted)
     */
    style?: string;
};
/**
 * Table borders object
 */
export type TableBorders = {
    /**
     * - Top border configuration
     */
    top?: TableBorder;
    /**
     * - Right border configuration
     */
    right?: TableBorder;
    /**
     * - Bottom border configuration
     */
    bottom?: TableBorder;
    /**
     * - Left border configuration
     */
    left?: TableBorder;
    /**
     * - Inside horizontal borders
     */
    insideH?: TableBorder;
    /**
     * - Inside vertical borders
     */
    insideV?: TableBorder;
};
/**
 * Border creation options
 */
export type BorderOptions = {
    /**
     * - Border width in pixels
     */
    size?: number;
    /**
     * - Border color (hex)
     */
    color?: string;
};
