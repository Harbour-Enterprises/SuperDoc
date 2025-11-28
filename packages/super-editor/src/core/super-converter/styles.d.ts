export interface NumberingProperties {
  numId?: number;
  ilvl?: number;
  [key: string]: unknown;
}

export interface ParagraphProperties extends Record<string, unknown> {
  numberingProperties?: NumberingProperties;
  indent?: Record<string, unknown>;
  framePr?: { dropCap?: unknown; [key: string]: unknown };
  runProperties?: Record<string, unknown>;
  styleId?: string;
}

export type RunProperties = Record<string, unknown>;
export function combineRunProperties(propertiesArray: RunProperties[]): RunProperties;

/**
 * Resolves paragraph properties from styles chain
 */
export function resolveParagraphProperties(
  params: Record<string, unknown>,
  inlineProps: ParagraphProperties | Record<string, unknown>,
  insideTable?: boolean,
  overrideInlineStyleId?: boolean,
  tableStyleId?: string | null,
): ParagraphProperties;

/**
 * Gets default properties for a translator
 */
export function getDefaultProperties(params: Record<string, unknown>, translator: unknown): Record<string, unknown>;

/**
 * Gets style properties by style ID
 */
export function getStyleProperties(
  params: Record<string, unknown>,
  styleId: string,
  translator: unknown,
): { properties: Record<string, unknown>; isDefault: boolean };

/**
 * Gets numbering properties
 */
export function getNumberingProperties(
  params: Record<string, unknown>,
  ilvl: number,
  numId: number,
  translator: unknown,
  tries?: number,
): Record<string, unknown>;

/**
 * Encodes marks from run properties
 */
export function encodeMarksFromRPr(runProperties: RunProperties, docx: unknown): unknown;

/**
 * Encodes CSS from paragraph properties
 */
export function encodeCSSFromPPr(paragraphProperties: ParagraphProperties): Record<string, string>;

/**
 * Encodes CSS from run properties
 */
export function encodeCSSFromRPr(runProperties: RunProperties, docx: unknown): Record<string, string>;

/**
 * Decodes run properties from marks
 */
export function decodeRPrFromMarks(marks: unknown): RunProperties;

/**
 * Resolves run properties
 */
export function resolveRunProperties(
  params: Record<string, unknown>,
  inlineRpr: RunProperties,
  resolvedPpr: ParagraphProperties,
  isListNumber?: boolean,
  numberingDefinedInline?: boolean,
): RunProperties;
