import type { ParagraphAttrs, ParagraphIndent, ParagraphSpacing } from '@superdoc/contracts';
import { resolveParagraphProperties } from '@converter/styles.js';
import type { PMNode } from '../types.js';
import type { ConverterContext, ConverterNumberingContext } from '../converter-context.js';
import { hasParagraphStyleContext } from '../converter-context.js';
import type { ResolvedParagraphProperties } from '@superdoc/word-layout';
import { normalizeAlignment } from './spacing-indent.js';

/**
 * Empty numbering context used as a fallback when documents don't have lists.
 * This allows paragraph style resolution to proceed even without numbering data.
 */
const EMPTY_NUMBERING_CONTEXT: ConverterNumberingContext = {
  definitions: {},
  abstracts: {},
};

export type ParagraphStyleHydration = {
  resolved?: ResolvedParagraphProperties;
  spacing?: ParagraphSpacing;
  indent?: ParagraphIndent;
  borders?: ParagraphAttrs['borders'];
  shading?: ParagraphAttrs['shading'];
  alignment?: ParagraphAttrs['alignment'];
  tabStops?: unknown;
  keepLines?: boolean;
  keepNext?: boolean;
  numberingProperties?: Record<string, unknown>;
};

/**
 * Hydrates paragraph-level attributes from a linked style when converter context is available.
 *
 * This function works even when styleId is null or undefined, as it will apply docDefaults
 * from the document's styles.xml through the resolveParagraphProperties function. This ensures
 * that all paragraphs receive at minimum the document's default spacing and formatting.
 *
 * The helper never mutates the ProseMirror node; callers should merge the returned
 * attributes with existing attrs, preserving explicit overrides on the node.
 *
 * Normal style semantics (doc defaults, w:default flags) are delegated to
 * resolveParagraphProperties which already mirrors Word's cascade rules.
 *
 * @param para - The ProseMirror paragraph node to hydrate
 * @param context - The converter context containing DOCX and optional numbering data
 * @param preResolved - Optional pre-resolved paragraph properties to use instead of resolving
 * @returns Hydrated paragraph attributes or null if context is missing or resolution fails.
 *          Returns null when:
 *          - context is undefined or missing docx data (checked by hasParagraphStyleContext)
 *          - resolveParagraphProperties returns null or undefined
 *
 * @remarks
 * - Provides an empty numbering fallback (EMPTY_NUMBERING_CONTEXT) for documents without lists,
 *   ensuring paragraph style resolution can proceed even when context.numbering is undefined.
 * - Uses null-safe checks (!= null) for numberingProperties, indent, and spacing to handle
 *   both null and undefined consistently.
 */
export const hydrateParagraphStyleAttrs = (
  para: PMNode,
  context?: ConverterContext,
  preResolved?: ResolvedParagraphProperties,
): ParagraphStyleHydration | null => {
  if (!hasParagraphStyleContext(context)) {
    return null;
  }
  const attrs = para.attrs ?? {};
  const paragraphProps =
    typeof attrs.paragraphProperties === 'object' && attrs.paragraphProperties !== null
      ? (attrs.paragraphProperties as Record<string, unknown>)
      : {};
  const styleIdSource = attrs.styleId ?? paragraphProps.styleId;
  const styleId = typeof styleIdSource === 'string' && styleIdSource.trim() ? styleIdSource : null;

  const inlineProps: Record<string, unknown> = { styleId };

  const numberingProperties = cloneIfObject(attrs.numberingProperties ?? paragraphProps.numberingProperties);
  if (numberingProperties != null) {
    inlineProps.numberingProperties = numberingProperties;
  }

  const indent = cloneIfObject(attrs.indent ?? paragraphProps.indent);
  if (indent != null) {
    inlineProps.indent = indent;
  }

  const spacing = cloneIfObject(attrs.spacing ?? paragraphProps.spacing);
  if (spacing != null) {
    inlineProps.spacing = spacing;
  }

  const resolverParams = {
    docx: context.docx,
    // Provide empty numbering context if not present - documents without lists
    // should still get docDefaults spacing from style resolution
    numbering: context.numbering ?? EMPTY_NUMBERING_CONTEXT,
  };

  // Cast to bypass JSDoc type mismatch - the JS function actually accepts { docx, numbering }
  const resolved = preResolved ?? resolveParagraphProperties(resolverParams as never, inlineProps);
  if (!resolved) {
    return null;
  }

  // TypeScript: resolved could be ResolvedParagraphProperties (from preResolved)
  // or the extended type from resolveParagraphProperties.
  // We safely access properties using optional chaining and type assertions.
  type ExtendedResolvedProps = ResolvedParagraphProperties & {
    borders?: unknown;
    shading?: unknown;
    justification?: unknown;
    tabStops?: unknown;
    keepLines?: boolean;
    keepNext?: boolean;
    outlineLvl?: number;
  };
  const resolvedExtended = resolved as ExtendedResolvedProps;
  const resolvedAsRecord = resolved as Record<string, unknown>;
  let resolvedIndent = cloneIfObject(resolvedAsRecord.indent) as ParagraphIndent | undefined;

  // Word built-in heading styles do NOT inherit Normal's first-line indent.
  // If the resolved paragraph is a heading (outline level present or styleId starts with headingX)
  // and no explicit indent was defined on the style/para, normalize indent to zero.
  const styleIdLower = typeof styleId === 'string' ? styleId.toLowerCase() : '';
  const isHeadingStyle =
    typeof resolvedExtended.outlineLvl === 'number' ||
    styleIdLower.startsWith('heading ') ||
    styleIdLower.startsWith('heading');
  const onlyFirstLineIndent =
    resolvedIndent &&
    resolvedIndent.firstLine != null &&
    resolvedIndent.hanging == null &&
    resolvedIndent.left == null &&
    resolvedIndent.right == null;
  if (isHeadingStyle && (!resolvedIndent || Object.keys(resolvedIndent).length === 0 || onlyFirstLineIndent)) {
    // Clear inherited firstLine/hanging from Normal
    resolvedIndent = { firstLine: 0, hanging: 0, left: resolvedIndent?.left, right: resolvedIndent?.right };
  }

  // Get resolved spacing from style cascade (docDefaults → paragraph style)
  let resolvedSpacing = cloneIfObject(resolvedAsRecord.spacing) as ParagraphSpacing | undefined;

  // Apply table style paragraph properties if present
  // Per OOXML spec, table style pPr applies between docDefaults and paragraph style
  // But since we can't easily inject into the style resolver, we apply table style
  // spacing as a base that can be overridden by explicit paragraph properties
  const tableStyleParagraphProps = context.tableStyleParagraphProps;
  if (tableStyleParagraphProps?.spacing) {
    const tableSpacing = tableStyleParagraphProps.spacing;

    // Only apply table style spacing for properties NOT explicitly set on the paragraph
    // This maintains the cascade: table style wins over docDefaults, but paragraph wins over table style
    const paragraphHasExplicitSpacing = Boolean(spacing);

    if (!paragraphHasExplicitSpacing) {
      // No explicit paragraph spacing - use table style spacing as base, merged with resolved
      resolvedSpacing = {
        ...resolvedSpacing,
        ...tableSpacing,
      };
    } else {
      // Paragraph has explicit spacing - it should win, but fill in missing values from table style
      // This ensures partial paragraph spacing (e.g., only 'line') still gets 'before'/'after' from table style
      resolvedSpacing = {
        ...tableSpacing,
        ...resolvedSpacing,
      };
    }
  }

  const normalizedAlign = normalizeAlignment(resolvedExtended.justification);

  const hydrated: ParagraphStyleHydration = {
    resolved,
    spacing: resolvedSpacing,
    indent: resolvedIndent,
    borders: cloneIfObject(resolvedExtended.borders) as ParagraphAttrs['borders'],
    shading: cloneIfObject(resolvedExtended.shading) as ParagraphAttrs['shading'],
    alignment: normalizedAlign,
    tabStops: cloneIfObject(resolvedExtended.tabStops),
    keepLines: resolvedExtended.keepLines,
    keepNext: resolvedExtended.keepNext,
    numberingProperties: cloneIfObject(resolvedAsRecord.numberingProperties) as Record<string, unknown> | undefined,
  };
  return hydrated;
};

const cloneIfObject = <T>(value: T): T | undefined => {
  if (!value || typeof value !== 'object') return value as T | undefined;
  if (Array.isArray(value)) {
    return value.map((entry) => (typeof entry === 'object' ? { ...entry } : entry)) as unknown as T;
  }
  return { ...(value as Record<string, unknown>) } as T;
};
