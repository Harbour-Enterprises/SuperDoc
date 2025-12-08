/**
 * Resolves paragraph properties from styles chain
 */
export function resolveParagraphProperties(
  params: unknown,
  inlineProps: unknown,
  insideTable?: boolean,
  overrideInlineStyleId?: boolean,
  tableStyleId?: string | null,
): unknown;

/**
 * Gets default properties for a translator
 */
export function getDefaultProperties(params: unknown, translator: unknown): unknown;

/**
 * Gets style properties by style ID
 */
export function getStyleProperties(
  params: unknown,
  styleId: string,
  translator: unknown,
): { properties: unknown; isDefault: boolean };

/**
 * Gets numbering properties
 */
export function getNumberingProperties(
  params: unknown,
  ilvl: number,
  numId: number,
  translator: unknown,
  tries?: number,
): unknown;

/**
 * Encodes marks from run properties
 */
export function encodeMarksFromRPr(runProperties: unknown, docx: unknown): unknown;

/**
 * Encodes CSS from paragraph properties
 */
export function encodeCSSFromPPr(paragraphProperties: unknown): unknown;

/**
 * Encodes CSS from run properties
 */
export function encodeCSSFromRPr(runProperties: unknown, docx: unknown): unknown;

/**
 * Decodes run properties from marks
 */
export function decodeRPrFromMarks(marks: unknown): unknown;
