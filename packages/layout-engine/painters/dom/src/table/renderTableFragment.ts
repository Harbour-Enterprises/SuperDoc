import type {
  Fragment,
  Line,
  ParagraphBlock,
  SdtMetadata,
  TableBlock,
  TableFragment,
  TableMeasure,
} from '@superdoc/contracts';
import { CLASS_NAMES, fragmentStyles } from '../styles.js';
import type { FragmentRenderContext, BlockLookup } from '../renderer.js';
import { createTableBorderOverlay } from './border-utils.js';
import { renderTableRow } from './renderTableRow.js';

type ApplyStylesFn = (el: HTMLElement, styles: Partial<CSSStyleDeclaration>) => void;

/**
 * Dependencies required for rendering a table fragment.
 *
 * Encapsulates all external dependencies needed to render a table, including
 * document access, rendering context, block lookup, and helper functions.
 */
export type TableRenderDependencies = {
  /** Document object for creating DOM elements */
  doc: Document;
  /** Table fragment to render (contains dimensions and row range) */
  fragment: TableFragment;
  /** Rendering context (section info, etc.) */
  context: FragmentRenderContext;
  /** Lookup map for retrieving block data and measurements */
  blockLookup: BlockLookup;
  /** Function to render a line of paragraph content */
  renderLine: (block: ParagraphBlock, line: Line, context: FragmentRenderContext) => HTMLElement;
  /** Function to apply fragment positioning and dimensions */
  applyFragmentFrame: (el: HTMLElement, fragment: Fragment) => void;
  /** Function to apply SDT metadata as data attributes */
  applySdtDataset: (el: HTMLElement | null, metadata?: SdtMetadata | null) => void;
  /** Function to apply CSS styles to an element */
  applyStyles: ApplyStylesFn;
};

/**
 * Renders a table fragment as a DOM element.
 *
 * Creates a container div with absolutely-positioned rows and cells. Handles:
 * - Table border overlays for outer borders
 * - Border collapse settings
 * - Cell spacing
 * - Row-by-row rendering with proper positioning
 * - Metadata embedding for interactive table resizing
 *
 * **Error Handling:**
 * If the table block cannot be found or is invalid, returns an error placeholder
 * element instead of throwing. This maintains rendering stability when:
 * - Block is missing from blockLookup
 * - Block is wrong kind (not 'table')
 * - Measure is wrong kind (not 'table')
 * - Document object is not available
 *
 * **Metadata Embedding:**
 * Embeds column boundary metadata in the `data-table-boundaries` attribute
 * using a compact JSON format:
 * ```json
 * {
 *   "columns": [
 *     {"i": 0, "x": 0, "w": 100, "min": 25, "r": 1},
 *     {"i": 1, "x": 100, "w": 150, "min": 30, "r": 1}
 *   ]
 * }
 * ```
 * Where: i=index, x=position, w=width, min=minWidth, r=resizable(0/1)
 *
 * **Edge Cases:**
 * - Missing metadata: Element created without data-table-boundaries attribute
 * - Empty columnBoundaries: Creates empty columns array in JSON
 * - Missing block ID: Element created without data-sd-block-id attribute
 *
 * @param deps - All dependencies required for rendering
 * @returns HTMLElement containing the rendered table fragment, or error placeholder
 *
 * @example
 * ```typescript
 * const tableElement = renderTableFragment({
 *   doc: document,
 *   fragment: tableFragment,
 *   context: renderContext,
 *   blockLookup: blocks,
 *   renderLine,
 *   applyFragmentFrame,
 *   applySdtDataset,
 *   applyStyles
 * });
 * container.appendChild(tableElement);
 * ```
 */
export const renderTableFragment = (deps: TableRenderDependencies): HTMLElement => {
  const { doc, fragment, blockLookup, context, renderLine, applyFragmentFrame, applySdtDataset, applyStyles } = deps;

  // Check document first before using it in error handlers
  if (!doc) {
    console.error('DomPainter: document is not available');

    // Use global document as fallback for error placeholder when available
    if (typeof document !== 'undefined') {
      const placeholder = document.createElement('div');
      placeholder.classList.add(CLASS_NAMES.fragment, 'superdoc-error-placeholder');
      placeholder.textContent = '[Document not available]';
      placeholder.style.border = '1px dashed red';
      placeholder.style.padding = '8px';
      return placeholder;
    }

    throw new Error('Document is required for table rendering');
  }

  const lookup = blockLookup.get(fragment.blockId);
  if (!lookup || lookup.block.kind !== 'table' || lookup.measure.kind !== 'table') {
    console.error(`DomPainter: missing table block for fragment ${fragment.blockId}`, {
      blockId: fragment.blockId,
      lookup: lookup ? { kind: lookup.block.kind } : null,
    });

    // Return placeholder element instead of crashing (doc is guaranteed to exist here)
    const placeholder = doc.createElement('div');
    placeholder.classList.add(CLASS_NAMES.fragment, 'superdoc-error-placeholder');
    placeholder.textContent = '[Table rendering error]';
    placeholder.style.border = '1px dashed red';
    placeholder.style.padding = '8px';
    return placeholder;
  }

  const block = lookup.block as TableBlock;
  const measure = lookup.measure as TableMeasure;
  const tableBorders = block.attrs?.borders;
  const borderOverlay = tableBorders ? createTableBorderOverlay(doc, fragment, tableBorders) : null;

  const container = doc.createElement('div');
  container.classList.add(CLASS_NAMES.fragment);
  applyStyles(container, fragmentStyles);
  applyFragmentFrame(container, fragment);
  container.style.height = `${fragment.height}px`;
  applySdtDataset(container, block.attrs?.sdt);

  // Add table-specific class for resize overlay targeting
  container.classList.add('superdoc-table-fragment');

  // Add metadata for interactive table resizing
  if (fragment.metadata?.columnBoundaries) {
    const metadata = {
      columns: fragment.metadata.columnBoundaries.map((boundary) => ({
        i: boundary.index,
        x: boundary.x,
        w: boundary.width,
        min: boundary.minWidth,
        r: boundary.resizable ? 1 : 0,
      })),
    };

    container.setAttribute('data-table-boundaries', JSON.stringify(metadata));
  }

  // Add block ID for PM transaction targeting
  if (block.id) {
    container.setAttribute('data-sd-block-id', block.id);
  }

  const borderCollapse = block.attrs?.borderCollapse || 'collapse';
  if (borderCollapse === 'separate' && block.attrs?.cellSpacing) {
    container.style.borderSpacing = `${block.attrs.cellSpacing}px`;
  }

  let y = 0;
  for (let r = fragment.fromRow; r < fragment.toRow; r += 1) {
    const rowMeasure = measure.rows[r];
    if (!rowMeasure) break;
    renderTableRow({
      doc,
      container,
      rowIndex: r,
      y,
      rowMeasure,
      row: block.rows[r],
      totalRows: block.rows.length,
      tableBorders,
      context,
      renderLine,
      applySdtDataset,
    });
    y += rowMeasure.height;
  }

  if (borderOverlay) {
    container.appendChild(borderOverlay);
  }

  return container;
};
