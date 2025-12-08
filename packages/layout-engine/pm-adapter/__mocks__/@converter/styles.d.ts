export function resolveParagraphProperties(
  docxContext: unknown,
  inlineProps: unknown,
): ResolvedParagraphPropertiesExtended;
export function resolveRunProperties(styleId: unknown, context: unknown): Record<string, never>;
/**
 * Mock for @converter/styles resolveParagraphProperties
 */
export type ResolvedParagraphPropertiesExtended = {
  spacing: unknown;
  indent: unknown;
  borders: unknown;
  shading: unknown;
  justification: unknown;
  tabStops: unknown;
  keepLines: boolean;
  keepNext: boolean;
  numberingProperties: unknown;
};
