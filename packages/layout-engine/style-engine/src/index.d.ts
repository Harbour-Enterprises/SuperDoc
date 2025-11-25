/**
 * @superdoc/style-engine
 *
 * Resolves OOXML styles to normalized ComputedStyle objects that engines can consume.
 * This module owns the cascade rules (defaults → styles → numbering → direct formatting).
 *
 * Tab Stops:
 * - Passes through OOXML TabStop values unchanged (positions in twips, val: start/end/etc.)
 * - No unit conversion happens here - preserves exact OOXML values for round-trip fidelity
 * - Conversion to pixels happens at measurement boundary only
 */
import type {
  TabStop,
  FieldAnnotationMetadata,
  StructuredContentMetadata,
  DocumentSectionMetadata,
  DocPartMetadata,
  SdtMetadata,
} from '@superdoc/contracts';
export type {
  FieldAnnotationMetadata,
  StructuredContentMetadata,
  DocumentSectionMetadata,
  DocPartMetadata,
  SdtMetadata,
};
export type SdtNodeType =
  | 'fieldAnnotation'
  | 'structuredContent'
  | 'structuredContentBlock'
  | 'documentSection'
  | 'docPartObject';
export interface ResolveSdtMetadataInput {
  nodeType?: SdtNodeType | string | null;
  attrs?: Record<string, unknown> | null;
  /**
   * Optional cache key for reusing normalized metadata between identical SDT nodes.
   * When omitted, the helper derives a key from attrs.hash/id when available.
   */
  cacheKey?: string | null;
}
export interface ResolveStyleOptions {
  sdt?: ResolveSdtMetadataInput | null;
}
export interface BorderStyle {
  style?: 'none' | 'solid' | 'dashed' | 'dotted' | 'double';
  width?: number;
  color?: string;
}
export interface ComputedParagraphStyle {
  alignment?: 'left' | 'center' | 'right' | 'justify';
  spacing?: {
    before?: number;
    after?: number;
    line?: number;
    lineRule?: 'auto' | 'exact' | 'atLeast';
  };
  indent?: {
    left?: number;
    right?: number;
    firstLine?: number;
    hanging?: number;
  };
  borders?: {
    top?: BorderStyle;
    right?: BorderStyle;
    bottom?: BorderStyle;
    left?: BorderStyle;
  };
  shading?: {
    fill?: string;
    pattern?: string;
  };
  tabs?: TabStop[];
}
export interface ComputedCharacterStyle {
  font?: {
    family: string;
    size?: number;
    weight?: number;
    italic?: boolean;
  };
  color?: string;
  underline?: {
    style?: 'single' | 'double' | 'dotted' | 'dashed' | 'wavy';
    color?: string;
  };
  strike?: boolean;
  highlight?: string;
  letterSpacing?: number;
}
export interface NumberingStyle {
  numId: string;
  level: number;
  indent?: {
    left?: number;
    hanging?: number;
  };
  format?: 'decimal' | 'lowerLetter' | 'upperLetter' | 'lowerRoman' | 'upperRoman' | 'bullet' | 'custom';
  text?: string;
  start?: number;
}
export interface ComputedStyle {
  paragraph: ComputedParagraphStyle;
  character: ComputedCharacterStyle;
  numbering?: NumberingStyle;
  sdt?: SdtMetadata;
}
export interface StyleNode {
  styleId?: string;
  paragraphProps?: Partial<ComputedParagraphStyle>;
  characterProps?: Partial<ComputedCharacterStyle>;
  numbering?: {
    numId: string;
    level: number;
  };
}
export interface ParagraphStyleDefinition {
  id: string;
  basedOn?: string;
  paragraph?: Partial<ComputedParagraphStyle>;
  character?: Partial<ComputedCharacterStyle>;
  numbering?: {
    numId: string;
    level: number;
  };
}
export interface NumberingLevelDefinition {
  level: number;
  format?: NumberingStyle['format'];
  text?: string;
  start?: number;
  indent?: {
    left?: number;
    hanging?: number;
  };
}
export interface NumberingDefinition {
  levels: NumberingLevelDefinition[];
}
export interface StyleContext {
  styles?: Record<string, ParagraphStyleDefinition>;
  numbering?: Record<string, NumberingDefinition>;
  theme?: Record<string, unknown>;
  defaults?: {
    paragraphFont?: string;
    fontSize?: number;
    paragraphFontFallback?: string;
    paragraphFontFamily?: string;
    decimalSeparator?: string;
    defaultTabIntervalTwips?: number;
  };
}
/**
 * Clears the internal SDT metadata cache.
 *
 * This is primarily useful for testing to ensure a clean state between test runs.
 * In production, the cache persists for the lifetime of the module to maximize performance.
 *
 * @example
 * ```typescript
 * import { clearSdtMetadataCache } from '@superdoc/style-engine';
 *
 * // Before each test
 * beforeEach(() => {
 *   clearSdtMetadataCache();
 * });
 * ```
 */
export declare function clearSdtMetadataCache(): void;
/**
 * Resolves a node's fully-computed style by applying OOXML cascade rules.
 *
 * Cascade order:
 * 1. Document defaults
 * 2. Style chain (basedOn hierarchy)
 * 3. Direct paragraph/character formatting
 * 4. Numbering overrides
 * 5. SDT metadata (if provided via options)
 *
 * @param node - The style node containing styleId and direct formatting
 * @param context - Style definitions, numbering, theme, and defaults
 * @param options - Optional SDT metadata to attach to the computed style
 * @returns Fully-resolved ComputedStyle with paragraph, character, numbering, and optional SDT metadata
 *
 * @example
 * ```typescript
 * import { resolveStyle } from '@superdoc/style-engine';
 *
 * const style = resolveStyle(
 *   { styleId: 'Heading1', paragraphProps: { indent: { left: 36 } } },
 *   { styles: {...}, defaults: { paragraphFont: 'Calibri', fontSize: 11 } }
 * );
 *
 * console.log(style.paragraph.indent.left); // 36
 * console.log(style.character.font.family); // 'Calibri, sans-serif'
 * ```
 */
export declare function resolveStyle(
  node: StyleNode,
  context: StyleContext,
  options?: ResolveStyleOptions,
): ComputedStyle;
/**
 * Resolves numbering metadata for a list item at a specific level.
 *
 * Looks up the numbering definition by `numId` and extracts the level-specific
 * formatting (format, text, indent, start value). Returns undefined if the
 * definition or level is not found.
 *
 * @param numId - The numbering definition ID (from w:numPr/w:numId)
 * @param level - The zero-based level index (from w:numPr/w:ilvl)
 * @param context - Style context containing numbering definitions
 * @returns Resolved NumberingStyle or undefined if not found
 *
 * @example
 * ```typescript
 * import { resolveNumbering } from '@superdoc/style-engine';
 *
 * const numbering = resolveNumbering('1', 0, {
 *   numbering: {
 *     '1': {
 *       levels: [{ level: 0, format: 'decimal', text: '%1.', indent: { left: 36, hanging: 18 } }]
 *     }
 *   }
 * });
 *
 * console.log(numbering?.format); // 'decimal'
 * console.log(numbering?.text); // '%1.'
 * ```
 */
export declare function resolveNumbering(
  numId: string,
  level: number,
  context: StyleContext,
): NumberingStyle | undefined;
/**
 * Resolves style for a table cell's content.
 *
 * Note: This is a placeholder implementation that returns document defaults.
 * Full table cascade (tblPr → trPr → tcPr → pPr) will be implemented in a future phase.
 *
 * @param table - Table element (reserved for future use)
 * @param row - Row index (reserved for future use)
 * @param col - Column index (reserved for future use)
 * @param context - Style context containing defaults
 * @returns ComputedStyle with document defaults
 */
export declare function resolveTableCellStyle(
  _table: unknown,
  _row: number,
  _col: number,
  context: StyleContext,
): ComputedStyle;
/**
 * Normalizes Structured Document Tag (SDT) metadata into a stable contract shape.
 *
 * Supports the following SDT node types:
 * - `fieldAnnotation`: Inline field annotations with display labels, colors, and visibility
 * - `structuredContent` / `structuredContentBlock`: Inline or block-level structured content containers
 * - `documentSection`: Document section metadata with locks and descriptions
 * - `docPartObject`: Document part objects (e.g., TOC, bibliography)
 *
 * Results are cached by hash/id to avoid recomputing metadata for identical SDT instances.
 *
 * @param input - SDT node information including nodeType, attrs, and optional cacheKey
 * @returns Normalized SdtMetadata or undefined if nodeType is unsupported/missing
 *
 * @example
 * ```typescript
 * import { resolveSdtMetadata } from '@superdoc/style-engine';
 *
 * const metadata = resolveSdtMetadata({
 *   nodeType: 'fieldAnnotation',
 *   attrs: {
 *     fieldId: 'CLIENT_NAME',
 *     displayLabel: 'Client Name',
 *     fieldColor: '#980043',
 *     visibility: 'visible'
 *   }
 * });
 *
 * console.log(metadata?.type); // 'fieldAnnotation'
 * console.log(metadata?.fieldColor); // '#980043'
 * ```
 */
export declare function resolveSdtMetadata(input?: ResolveSdtMetadataInput | null): SdtMetadata | undefined;
