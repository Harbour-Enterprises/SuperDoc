import type { BoxSpacing } from '@superdoc/contracts';
import { _getReferencedTableStyles } from '@converter/v3/handlers/w/tbl/tbl-translator.js';
import type { PMNode } from '../types.js';
import type { ConverterContext } from '../converter-context.js';
import { hasTableStyleContext } from '../converter-context.js';
import { twipsToPx } from '../utilities.js';

export type TableStyleHydration = {
  borders?: Record<string, unknown>;
  cellPadding?: BoxSpacing;
  justification?: string;
  tableWidth?: { width?: number; type?: string };
};

/**
 * Hydrates table-level attributes from a table style definition.
 *
 * The hydrator never mutates the PM node and only returns new objects,
 * so callers must merge the result with the node's attrs explicitly.
 */
export const hydrateTableStyleAttrs = (tableNode: PMNode, context?: ConverterContext): TableStyleHydration | null => {
  const hydration: TableStyleHydration = {};
  const tableProps = (tableNode.attrs?.tableProperties ?? null) as Record<string, unknown> | null;

  if (tableProps) {
    const padding = convertCellMarginsToPx(tableProps.cellMargins as Record<string, unknown>);
    if (padding) hydration.cellPadding = padding;

    if (tableProps.borders && typeof tableProps.borders === 'object') {
      hydration.borders = clonePlainObject(tableProps.borders as Record<string, unknown>);
    }

    if (!hydration.justification && typeof tableProps.justification === 'string') {
      hydration.justification = tableProps.justification;
    }

    const tableWidth = normalizeTableWidth(tableProps.tableWidth);
    if (tableWidth) {
      hydration.tableWidth = tableWidth;
    }
  }

  const styleId = typeof tableNode.attrs?.tableStyleId === 'string' ? tableNode.attrs.tableStyleId : undefined;
  if (styleId && hasTableStyleContext(context)) {
    const referenced = _getReferencedTableStyles(styleId, { docx: context!.docx } as Parameters<
      typeof _getReferencedTableStyles
    >[1]);
    if (referenced) {
      if (!hydration.borders && referenced.borders) {
        hydration.borders = clonePlainObject(referenced.borders);
      }
      if (!hydration.cellPadding && referenced.cellMargins) {
        const padding = convertCellMarginsToPx(referenced.cellMargins as Record<string, unknown>);
        if (padding) hydration.cellPadding = padding;
      }
      if (!hydration.justification && referenced.justification) {
        hydration.justification = referenced.justification;
      }
    } else {
    }
  }

  if (Object.keys(hydration).length > 0) {
    return hydration;
  }

  return null;
};

const clonePlainObject = (value: Record<string, unknown>): Record<string, unknown> => ({ ...value });

const convertCellMarginsToPx = (margins: Record<string, unknown>): BoxSpacing | undefined => {
  if (!margins || typeof margins !== 'object') return undefined;
  const spacing: BoxSpacing = {};
  const keyMap: Record<string, keyof BoxSpacing> = {
    top: 'top',
    bottom: 'bottom',
    left: 'left',
    right: 'right',
    marginTop: 'top',
    marginBottom: 'bottom',
    marginLeft: 'left',
    marginRight: 'right',
  };

  Object.entries(margins).forEach(([key, value]) => {
    const side = keyMap[key];
    if (!side) return;
    const px = measurementToPx(value);
    if (px != null) spacing[side] = px;
  });

  return Object.keys(spacing).length ? spacing : undefined;
};

const measurementToPx = (value: unknown): number | undefined => {
  if (typeof value === 'number') return value;
  if (!value || typeof value !== 'object') return undefined;
  const entry = value as { value?: number; type?: string };
  if (typeof entry.value !== 'number') return undefined;
  if (!entry.type || entry.type === 'px' || entry.type === 'pixel') return entry.value;
  if (entry.type === 'dxa') return twipsToPx(entry.value);
  return undefined;
};

const normalizeTableWidth = (value: unknown): { width?: number; type?: string } | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  const measurement = value as { value?: number; width?: number; type?: string };
  const raw = typeof measurement.width === 'number' ? measurement.width : measurement.value;
  if (typeof raw !== 'number') return undefined;
  if (!measurement.type || measurement.type === 'px' || measurement.type === 'pixel') {
    return { width: raw, type: measurement.type ?? 'px' };
  }
  if (measurement.type === 'dxa') {
    return { width: twipsToPx(raw), type: 'px' };
  }
  return { width: raw, type: measurement.type };
};
