/**
 * Type definitions for section-properties.js
 * Provides type information for OOXML section property manipulation functions.
 */

/**
 * Represents an OOXML element in JSON format.
 * This is the standard structure used for OOXML XML elements converted to JSON.
 */
export interface OOXMLElement {
  type: 'element';
  name: string;
  attributes?: Record<string, string | number>;
  elements?: OOXMLElement[];
}

/**
 * Section break type values from OOXML w:type specification.
 */
export type SectionType = 'continuous' | 'nextPage' | 'evenPage' | 'oddPage';

/**
 * Page orientation values.
 */
export type PageOrientation = 'portrait' | 'landscape';

/**
 * Page size information including dimensions and orientation.
 */
export interface PageSize {
  width?: number;
  height?: number;
  orientation?: PageOrientation;
}

/**
 * Column configuration for multi-column layout.
 */
export interface ColumnConfig {
  count?: number;
  gap?: number;
}

/**
 * Page margin values in inches.
 */
export interface PageMargins {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
  header?: number;
  footer?: number;
  gutter?: number;
}

/**
 * Margin update parameters in inches.
 */
export interface MarginUpdates {
  topInches?: number;
  rightInches?: number;
  bottomInches?: number;
  leftInches?: number;
  headerInches?: number;
  footerInches?: number;
  gutterInches?: number;
}

/**
 * Converter object with page styles.
 * Used for updating document-level default margins.
 */
export interface Converter {
  pageStyles?: {
    pageMargins?: {
      top?: number;
      right?: number;
      bottom?: number;
      left?: number;
      header?: number;
      footer?: number;
      gutter?: number;
    };
  };
}

/**
 * Target for body-level margin updates.
 */
export interface BodyTarget {
  type: 'body';
  converter: Converter;
}

/**
 * Target for section-level (sectPr) margin updates.
 */
export interface SectPrTarget {
  type: 'sectPr';
  sectPr: OOXMLElement;
}

/**
 * Union type for margin update targets.
 */
export type MarginTarget = BodyTarget | SectPrTarget;

/**
 * Result of body-level margin update.
 */
export interface BodyUpdateResult {
  kind: 'body';
  pageMargins: PageMargins;
}

/**
 * Result of sectPr-level margin update.
 */
export interface SectPrUpdateResult {
  kind: 'sectPr';
  sectPr: OOXMLElement;
}

/**
 * Union type for margin update results.
 */
export type MarginUpdateResult = BodyUpdateResult | SectPrUpdateResult;

/**
 * Read section type from a sectPr node.
 * Maps OOXML w:type values to our internal section break types.
 *
 * @param sectPr - The OOXML JSON for a <w:sectPr> element.
 * @returns The section type, or undefined if not found or invalid.
 */
export function getSectPrType(sectPr: OOXMLElement | null | undefined): SectionType | undefined;

/**
 * Read page size and orientation from a sectPr node.
 * Returns dimensions in inches and orientation string.
 *
 * @param sectPr - The OOXML JSON for a <w:sectPr> element.
 * @returns Page size information, or undefined if not found.
 */
export function getSectPrPageSize(sectPr: OOXMLElement | null | undefined): PageSize | undefined;

/**
 * Read column configuration from a sectPr node.
 * Maps OOXML w:cols element to our internal column structure.
 *
 * @param sectPr - The OOXML JSON for a <w:sectPr> element.
 * @returns Column configuration, or undefined if not found.
 */
export function getSectPrColumns(sectPr: OOXMLElement | null | undefined): ColumnConfig | undefined;

/**
 * Read page margin values from a sectPr node (in inches).
 * Returns only margins present on the node; missing values are omitted.
 *
 * @param sectPr - The OOXML JSON for a <w:sectPr> element.
 * @returns Page margins object (empty if no margins found).
 */
export function getSectPrMargins(sectPr: OOXMLElement | null | undefined): PageMargins;

/**
 * Update header/footer and/or other page margins on a given <w:sectPr>.
 * Values are specified in inches; underlying OOXML is stored in twips.
 * Mutates the sectPr node in place.
 *
 * @param sectPr - The OOXML JSON for a <w:sectPr> element.
 * @param updates - Margin updates in inches.
 * @returns The mutated sectPr node (same reference).
 * @throws Error if sectPr is invalid or missing.
 */
export function updateSectPrMargins(sectPr: OOXMLElement, updates?: MarginUpdates): OOXMLElement;

/**
 * Unified API to update section margins, targeting either the document body defaults
 * (via converter.pageStyles.pageMargins) or a specific paragraph-level sectPr JSON node.
 *
 * - Body target: { type: 'body', converter }
 *   Updates converter.pageStyles.pageMargins.{header/footer/...} in inches.
 *   Export will reflect changes through ensureSectionLayoutDefaults.
 *
 * - SectPr target: { type: 'sectPr', sectPr }
 *   Mutates the provided sectPr JSON (pass-through on export) setting margins in twips.
 *
 * @param target - Update target descriptor (body or sectPr).
 * @param updates - Margin updates in inches.
 * @returns A summary of what was updated.
 * @throws Error if target is invalid or missing required properties.
 */
export function updateSectionMargins(target: MarginTarget, updates?: MarginUpdates): MarginUpdateResult;
