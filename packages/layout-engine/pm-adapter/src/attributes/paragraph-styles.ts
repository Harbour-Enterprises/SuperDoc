import type { ParagraphAttrs, ParagraphIndent, ParagraphSpacing } from '@superdoc/contracts';
import { resolveParagraphProperties } from '@converter/styles.js';
import type { PMNode } from '../types.js';
import type { ConverterContext } from '../converter-context.js';
import { hasParagraphStyleContext } from '../converter-context.js';
import type { ResolvedParagraphProperties } from '@superdoc/word-layout';

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
 * The helper never mutates the ProseMirror node; callers should merge the returned
 * attributes with existing attrs, preserving explicit overrides on the node.
 *
 * Normal style semantics (doc defaults, w:default flags) are delegated to
 * resolveParagraphProperties which already mirrors Word's cascade rules.
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
  if (!styleId) {
    return null;
  }

  const inlineProps = {
    styleId,
    numberingProperties: cloneIfObject(attrs.numberingProperties ?? paragraphProps.numberingProperties),
    indent: cloneIfObject(attrs.indent ?? paragraphProps.indent),
    spacing: cloneIfObject(attrs.spacing ?? paragraphProps.spacing),
  };

  const resolverParams = {
    docx: context.docx,
    numbering: context.numbering,
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
  };
  const resolvedExtended = resolved as ExtendedResolvedProps;
  const resolvedAsRecord = resolved as Record<string, unknown>;
  const hydrated: ParagraphStyleHydration = {
    resolved,
    spacing: cloneIfObject(resolvedAsRecord.spacing) as ParagraphSpacing | undefined,
    indent: cloneIfObject(resolvedAsRecord.indent) as ParagraphIndent | undefined,
    borders: cloneIfObject(resolvedExtended.borders) as ParagraphAttrs['borders'],
    shading: cloneIfObject(resolvedExtended.shading) as ParagraphAttrs['shading'],
    alignment: resolvedExtended.justification as ParagraphAttrs['alignment'],
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
