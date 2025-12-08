/**
 * Converter Context Types
 *
 * Provides lightweight type definitions for data that flows from the
 * SuperConverter (DOCX import pipeline) into the layout-engine adapter.
 *
 * The context is intentionally minimal to avoid tight coupling; helpers
 * should always guard for undefined fields and degrade gracefully.
 */

import type { ParagraphSpacing } from '@superdoc/contracts';

export type ConverterNumberingContext = {
  definitions?: Record<string, unknown>;
  abstracts?: Record<string, unknown>;
};

export type ConverterLinkedStyle = {
  id: string;
  definition?: {
    styles?: Record<string, unknown>;
    attrs?: Record<string, unknown>;
  };
};

/**
 * Paragraph properties from a table style that should be applied to
 * paragraphs inside table cells as part of the OOXML style cascade.
 */
export type TableStyleParagraphProps = {
  spacing?: ParagraphSpacing;
};

export type ConverterContext = {
  docx?: Record<string, unknown>;
  numbering?: ConverterNumberingContext;
  linkedStyles?: ConverterLinkedStyle[];
  /**
   * Paragraph properties inherited from the containing table's style.
   * Per OOXML spec, table styles can define pPr that applies to all
   * paragraphs within the table. This is set by the table converter
   * and read by paragraph converters inside table cells.
   *
   * Style cascade: docDefaults → tableStyleParagraphProps → paragraph style → direct formatting
   */
  tableStyleParagraphProps?: TableStyleParagraphProps;
};

/**
 * Guard that checks whether the converter context includes DOCX data
 * required for paragraph style hydration.
 *
 * Paragraph hydration needs DOCX structures so it can follow style
 * inheritance chains via resolveParagraphProperties. Numbering is optional
 * since documents without lists should still get docDefaults spacing.
 */
export const hasParagraphStyleContext = (
  context?: ConverterContext,
): context is ConverterContext & { docx: Record<string, unknown> } => {
  return Boolean(context?.docx);
};

/**
 * Guard that checks whether DOCX data is available for table style lookups.
 *
 * Table style hydration only needs access to styles.xml, so numbering data
 * is optional.
 */
export const hasTableStyleContext = (
  context?: ConverterContext,
): context is ConverterContext & { docx: Record<string, unknown> } => {
  return Boolean(context?.docx);
};
