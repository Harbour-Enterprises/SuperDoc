/**
 * SDM/1 style dictionaries, theme model, document defaults, and provenance.
 */

import type {
  SDParagraphProps,
  SDRowProps,
  SDRunProps,
  SDTableProps,
  SDTableStyleProps,
  SDTableStyleCellProps,
  SDThemeColorName,
} from './sd-props.js';
import type { SDResolvedProvenance } from './sd-objects.js';

// ---------------------------------------------------------------------------
// Style dictionaries
// ---------------------------------------------------------------------------

export interface SDStyleBase<TProps> {
  name?: string;
  basedOn?: string;
  next?: string;
  linked?: string;
  /** Properties authored on this style, with theme references left raw. */
  props?: TProps;
  /** Cascaded values (basedOn chain, docDefaults, theme). Present with `includeResolved`. */
  resolved?: Partial<TProps>;
  /** Where each resolved value came from. Present with `includeProvenance`. */
  provenance?: SDResolvedProvenance<TProps>;
}

export interface SDParagraphStyleDef extends SDStyleBase<SDParagraphProps> {
  /** Run properties authored on this paragraph style (`w:rPr`). */
  runProps?: SDRunProps;
  /** Cascaded run values for text in this paragraph style. Present with `includeResolved`. */
  resolvedRun?: Partial<SDRunProps>;
  /** Where each resolved run value came from. Present with `includeProvenance`. */
  runProvenance?: SDResolvedProvenance<SDRunProps>;
}

export type SDCharacterStyleDef = SDStyleBase<SDRunProps>;

/** Table regions that a table style can format conditionally (`w:tblStylePr/@w:type`). */
export type SDTableStyleRegion =
  | 'wholeTable'
  | 'firstRow'
  | 'lastRow'
  | 'firstCol'
  | 'lastCol'
  | 'band1Vert'
  | 'band2Vert'
  | 'band1Horz'
  | 'band2Horz'
  | 'neCell'
  | 'nwCell'
  | 'seCell'
  | 'swCell';

/** Formatting a table style applies to one region, as authored. */
export interface SDTableStyleFormatting {
  table?: SDTableStyleProps;
  row?: SDRowProps;
  cell?: SDTableStyleCellProps;
  paragraph?: SDParagraphProps;
  run?: SDRunProps;
}

export interface SDTableStyleDef extends SDStyleBase<SDTableStyleProps> {
  /** Row defaults (`w:trPr`). */
  rowProps?: SDRowProps;
  /** Cell defaults (`w:tcPr`). */
  cellProps?: SDTableStyleCellProps;
  /** Paragraph formatting for text in the table (`w:pPr`). */
  paragraphProps?: SDParagraphProps;
  /** Run formatting for text in the table (`w:rPr`). */
  runProps?: SDRunProps;
  /**
   * Conditional formatting per table region (`w:tblStylePr`), as authored.
   * `resolved` / `provenance` cover table-level props only; regions are not cascaded.
   */
  conditional?: Partial<Record<SDTableStyleRegion, SDTableStyleFormatting>>;
  /** Rows per horizontal band (`w:tblStyleRowBandSize`). */
  rowBandSize?: number;
  /** Columns per vertical band (`w:tblStyleColBandSize`). */
  columnBandSize?: number;
}

export interface SDStyles {
  paragraph?: Record<string, SDParagraphStyleDef>;
  character?: Record<string, SDCharacterStyleDef>;
  table?: Record<string, SDTableStyleDef>;
}

// ---------------------------------------------------------------------------
// Theme model
// ---------------------------------------------------------------------------

/** Theme color roles that `w:clrSchemeMapping` maps onto theme color slots. */
export type SDThemeColorRole =
  | 'bg1'
  | 't1'
  | 'bg2'
  | 't2'
  | 'accent1'
  | 'accent2'
  | 'accent3'
  | 'accent4'
  | 'accent5'
  | 'accent6'
  | 'hyperlink'
  | 'followedHyperlink';

export interface SDTheme {
  /**
   * `document` when read from the package theme part; `fallback` when the part is
   * missing or unreadable and the default Office theme stands in (see diagnostics).
   */
  source?: 'document' | 'fallback';
  /** Six-digit hex colors without `#`, matching `SDColorRef` rgb values. */
  colorScheme: Record<SDThemeColorName, string>;
  fontScheme?: {
    major?: { latin?: string; eastAsia?: string; complexScript?: string };
    minor?: { latin?: string; eastAsia?: string; complexScript?: string };
  };
  /** From `w:settings/w:clrSchemeMapping`; absent when the document declares none. */
  colorSchemeMapping?: Partial<Record<SDThemeColorRole, SDThemeColorName>>;
}

// ---------------------------------------------------------------------------
// Document defaults
// ---------------------------------------------------------------------------

export interface SDDocDefaults {
  run?: SDRunProps;
  paragraph?: SDParagraphProps;
  table?: SDTableProps;
  /** `run` with theme references resolved. Present with `includeResolved`. */
  resolvedRun?: Partial<SDRunProps>;
  /** `paragraph` with theme references resolved. Present with `includeResolved`. */
  resolvedParagraph?: Partial<SDParagraphProps>;
}
