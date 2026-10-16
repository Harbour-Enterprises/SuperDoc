/**
 * SDM/1 Document Fragment: the canonical structural content model.
 *
 * This is the single most important type family in the structural API surface.
 * Every structural write operation expresses its content as an SDFragment.
 * Every structural read operation returns SDContentNode / SDInlineNode shapes.
 *
 * File organization:
 *   sd-props.ts     : property models (SDRunProps, SDParagraphProps, etc.)
 *   sd-objects.ts   : object layout, geometry, media, drawing source, provenance
 *   sd-nodes.ts     : all concrete node interfaces + SDContentNode/SDInlineNode unions
 *   sd-styles.ts    : style dictionaries, theme, document defaults
 *   sd-sections.ts  : sections, numbering, annotations, reference catalogs
 *   sd-envelope.ts  : SDNodeResult, SDFindResult, SDReadOptions
 *   sd-contract.ts  : SDErrorCode, SDError, SDMutationReceipt, SDDiagnostic
 *   fragment.ts     : (this file) SDFragment, SDDocument, kind constants, barrel re-exports
 */

import type { SDContentNode } from './sd-nodes.js';
import type { SDStyles, SDDocDefaults, SDTheme } from './sd-styles.js';
import type { SDNumberingCatalog, SDSection, SDReferenceCatalogs, SDAnnotations } from './sd-sections.js';
import type { SDDocumentMeta } from './sd-props.js';
import type { SDDiagnostic } from './sd-contract.js';

// ---------------------------------------------------------------------------
// SDFragment: the payload for insert/replace
// ---------------------------------------------------------------------------

/** Structural content payload for insert and replace operations. */
export type SDFragment = SDContentNode | SDContentNode[];

// ---------------------------------------------------------------------------
// SDDocument: full document read shape
// ---------------------------------------------------------------------------

export interface SDDocument {
  modelVersion: 'sdm/1';
  body: SDContentNode[];

  styles?: SDStyles;
  theme?: SDTheme;
  docDefaults?: SDDocDefaults;
  numbering?: SDNumberingCatalog;
  sections?: SDSection[];
  referenceCatalogs?: SDReferenceCatalogs;
  annotations?: SDAnnotations;
  metadata?: SDDocumentMeta;
  /** Missing, malformed or fallback package parts, and read options not honored yet. */
  diagnostics?: SDDiagnostic[];
}

// ---------------------------------------------------------------------------
// Kind constants (runtime-accessible)
// ---------------------------------------------------------------------------

export const SD_CONTENT_NODE_KINDS = [
  'paragraph',
  'heading',
  'list',
  'table',
  'toc',
  'index',
  'bibliography',
  'tableOfAuthorities',
  'break',
  'horizontalRule',
  'sectionBreak',
  'sectPr',
  'image',
  'drawing',
  'sdt',
  'customXml',
  'altChunk',
  'math',
  'field',
] as const;

export type SDContentNodeKind = (typeof SD_CONTENT_NODE_KINDS)[number];

type Assert<_T extends true> = void;
type KnownSDContentNodeKind = Exclude<SDContentNode['kind'], `ext.${string}`>;
/** Fails compilation when a concrete public node and the runtime kind inventory drift. */
type _AllConcreteContentNodesAreRegistered = Assert<KnownSDContentNodeKind extends SDContentNodeKind ? true : false>;
/** Fails compilation when the runtime inventory contains a kind absent from the public union. */
type _AllRegisteredContentKindsAreModeled = Assert<SDContentNodeKind extends KnownSDContentNodeKind ? true : false>;

export const SD_INLINE_NODE_KINDS = [
  'run',
  'hyperlink',
  'crossRef',
  'indexEntry',
  'sequenceField',
  'citation',
  'authorityEntry',
  'tocEntry',
  'image',
  'drawing',
  'sdt',
  'customXml',
  'math',
  'field',
  'tab',
  'lineBreak',
  'footnoteRef',
  'endnoteRef',
] as const;

export type SDInlineNodeKind = (typeof SD_INLINE_NODE_KINDS)[number];

// ---------------------------------------------------------------------------
// Barrel re-exports
// ---------------------------------------------------------------------------

export * from './sd-props.js';
export * from './sd-objects.js';
export * from './sd-nodes.js';
export * from './sd-styles.js';
export * from './sd-sections.js';
export * from './sd-envelope.js';
export * from './sd-contract.js';
