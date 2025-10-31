/**
 * Helper utilities for pagination tests
 * @module tests/pagination/pagination-test-helpers
 */

/**
 * Find the first table node in a ProseMirror document
 * @private
 * @param {Object} docNode - ProseMirror document node
 * @returns {{tableNode: Object|null, tablePos: number|null}}
 * @throws {Error} If no table is found in the document
 */
const findTableInDoc = (docNode) => {
  let tableNode = null;
  let tablePos = null;

  docNode.descendants((node, pos) => {
    if (node.type?.name === 'table') {
      tableNode = node;
      tablePos = pos;
      return false; // Stop traversal
    }
    return true; // Continue traversal
  });

  if (!tableNode) {
    throw new Error('No table found in document');
  }

  return { tableNode, tablePos };
};

/**
 * Calculate the document position of a specific row in a table
 * @private
 * @param {Object} tableNode - ProseMirror table node
 * @param {number} tablePos - Position of the table in the document
 * @param {number} rowIndex - Index of the target row (0-based)
 * @returns {number} Position of the row in the document
 * @throws {Error} If row index is out of bounds
 */
const getRowPosition = (tableNode, tablePos, rowIndex) => {
  if (rowIndex < 0 || rowIndex >= tableNode.childCount) {
    throw new Error(
      `Row index ${rowIndex} out of bounds (table has ${tableNode.childCount} rows, valid indices: 0-${tableNode.childCount - 1})`,
    );
  }

  let rowPos = tablePos + 1; // Start after table opening tag
  for (let i = 0; i < rowIndex; i++) {
    rowPos += tableNode.child(i).nodeSize;
  }

  return rowPos;
};

/**
 * Extract all cell positions from a table row
 * @private
 * @param {Object} rowNode - ProseMirror table row node
 * @param {number} rowPos - Position of the row in the document
 * @param {number} targetCellIndex - Index of the cell to mark as break position
 * @returns {{breakPos: number, cellPositions: number[]}}
 * @throws {Error} If target cell index is out of bounds
 */
const extractCellPositions = (rowNode, rowPos, targetCellIndex) => {
  if (targetCellIndex < 0 || targetCellIndex >= rowNode.childCount) {
    throw new Error(
      `Cell index ${targetCellIndex} out of bounds (row has ${rowNode.childCount} cells, valid indices: 0-${rowNode.childCount - 1})`,
    );
  }

  const cellPositions = [];
  let breakPos = null;
  let cellPos = rowPos + 1; // Start after row opening tag

  for (let index = 0; index < rowNode.childCount; index++) {
    // Position of the first paragraph inside the cell
    const paragraphPos = cellPos + 1;
    cellPositions.push(paragraphPos);

    if (index === targetCellIndex) {
      breakPos = paragraphPos;
    }

    cellPos += rowNode.child(index).nodeSize;
  }

  return { breakPos, cellPositions };
};

/**
 * Find positions of table cells in a specific row.
 * Traverses the document to locate a table row and returns the positions of all cells,
 * plus the position of a specific target cell for page break testing.
 *
 * @param {Object} docNode - ProseMirror document node
 * @param {number} targetRowIndex - Index of the row to find (0-based)
 * @param {number} targetCellIndex - Index of the target cell within the row (0-based)
 * @returns {{breakPos: number, cellPositions: number[]}} Object containing:
 *   - breakPos: Position of the target cell's first paragraph (for page break placement)
 *   - cellPositions: Array of paragraph positions for all cells in the row
 * @throws {Error} If table not found, or row/cell indices are out of bounds
 *
 * @example
 * // Find positions in row 4, target cell 1
 * const { breakPos, cellPositions } = findTableCellPositions(docNode, 4, 1);
 * // breakPos might be 95, cellPositions might be [95, 96, 97] for a 3-column table
 */
export const findTableCellPositions = (docNode, targetRowIndex, targetCellIndex) => {
  // Step 1: Find the table in the document
  const { tableNode, tablePos } = findTableInDoc(docNode);

  // Step 2: Calculate the position of the target row
  const rowPos = getRowPosition(tableNode, tablePos, targetRowIndex);
  const rowNode = tableNode.child(targetRowIndex);

  // Step 3: Extract all cell positions and mark the target cell
  return extractCellPositions(rowNode, rowPos, targetCellIndex);
};

/**
 * Setup matchMedia mock for JSDOM environment.
 * Many pagination tests require window.matchMedia which is not available in JSDOM.
 * Call this in beforeAll() to provide a basic implementation.
 *
 * @param {Object} [options] - Configuration options
 * @param {boolean} [options.matches=false] - Default value for matches property
 * @param {string} [options.media=''] - Default media query string
 *
 * @example
 * beforeAll(() => {
 *   setupMatchMediaMock();
 * });
 *
 * @example
 * // Setup with custom default behavior
 * beforeAll(() => {
 *   setupMatchMediaMock({ matches: true, media: 'print' });
 * });
 */
export const setupMatchMediaMock = (options = {}) => {
  const { matches = false, media = '' } = options;

  if (typeof window.matchMedia !== 'function') {
    window.matchMedia = (query) => ({
      matches,
      media: query || media,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      onchange: null,
      dispatchEvent() {
        return false;
      },
    });
  }
};
