/**
 * Shared type definitions for Word paragraph + list layout contracts.
 */

import type { NumberingFormat } from './marker-utils.js';

export type WordListSuffix = 'tab' | 'space' | 'nothing' | undefined;

export type WordListJustification = 'left' | 'center' | 'right';

export type ParagraphIndent = {
  left?: number;
  right?: number;
  firstLine?: number;
  hanging?: number;
};

export type ParagraphSpacing = {
  before?: number;
  after?: number;
  line?: number;
  lineRule?: 'auto' | 'exact' | 'atLeast';
};

export type ResolvedTabStop = {
  position: number;
  alignment: 'start' | 'center' | 'end' | 'decimal' | 'bar' | 'num';
  leader?: 'none' | 'dot' | 'heavy' | 'hyphen' | 'middleDot' | 'underscore';
  decimalChar?: string;
};

export type ResolvedRunProperties = {
  fontFamily: string;
  fontSize: number;
  bold?: boolean;
  italic?: boolean;
  underline?: {
    style?: 'single' | 'double' | 'dotted' | 'dashed' | 'wavy';
    color?: string;
  };
  strike?: boolean;
  color?: string;
  highlight?: string;
  smallCaps?: boolean;
  allCaps?: boolean;
  baselineShift?: number;
  letterSpacing?: number;
  scale?: number;
  lang?: string;
};

export type NumberingProperties = {
  numId: string | number;
  ilvl: number;
  format?: NumberingFormat;
  lvlText?: string;
  markerText?: string;
  lvlJc?: WordListJustification;
  suffix?: WordListSuffix;
  start?: number;
  restart?: number;
  isLgl?: boolean;
  path?: number[];
  resolvedMarkerRpr?: ResolvedRunProperties;
};

export type ResolvedNumberingProperties = NumberingProperties;

export type ResolvedParagraphProperties = {
  styleId?: string;
  alignment?: WordListJustification | 'justify' | 'distribute';
  indent?: ParagraphIndent;
  spacing?: ParagraphSpacing;
  tabs?: ResolvedTabStop[];
  tabIntervalTwips?: number;
  decimalSeparator?: string;
  numberingProperties?: NumberingProperties | null;
};

export type DocDefaults = {
  defaultTabIntervalTwips?: number;
  decimalSeparator?: string;
  run?: Partial<ResolvedRunProperties>;
  paragraph?: {
    indent?: ParagraphIndent;
    spacing?: ParagraphSpacing;
  };
};

export type WordLayoutMeasurementAdapter = {
  measureText?: (text: string, fontCss: string, options?: { letterSpacing?: number }) => number;
};

export type WordParagraphLayoutInput = {
  paragraph: ResolvedParagraphProperties;
  numbering?: ResolvedNumberingProperties | null;
  markerRun?: ResolvedRunProperties | null;
  docDefaults: DocDefaults;
  measurement?: WordLayoutMeasurementAdapter;
};

export type WordListMarkerLayout = {
  markerText: string;
  glyphWidthPx?: number;
  markerBoxWidthPx: number;
  markerX: number;
  textStartX: number;
  baselineOffsetPx: number;
  gutterWidthPx?: number;
  justification: WordListJustification;
  suffix: WordListSuffix;
  run: ResolvedRunProperties;
  path?: number[];
};

export type WordParagraphLayoutOutput = {
  indentLeftPx: number;
  hangingPx: number;
  firstLinePx?: number;
  tabsPx: number[];
  textStartPx: number;
  marker?: WordListMarkerLayout;
  resolvedIndent?: ParagraphIndent;
  resolvedTabs?: ResolvedTabStop[];
  defaultTabIntervalPx?: number;
  /**
   * True when list uses firstLine indent pattern (marker at left+firstLine)
   * instead of standard hanging pattern (marker at left-hanging).
   */
  firstLineIndentMode?: boolean;
};

export type ResolveMarkerRunPropsInput = {
  inlineMarkerRpr?: Partial<ResolvedRunProperties>;
  resolvedParagraphProps: ResolvedParagraphProperties;
  numbering?: ResolvedNumberingProperties | null;
  docDefaults: DocDefaults;
  cached?: ResolvedRunProperties;
};
