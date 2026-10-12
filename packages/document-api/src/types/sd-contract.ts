/**
 * SDM/1 contract types: mutation receipts, error model, and diagnostics.
 */

import type { BlockNodeAddress } from './base.js';
import type { SelectionTarget, TextAddress } from './address.js';
import type { ReceiptEffects, ReceiptSuccess, TextMutationRange } from './receipt.js';
import type { BodyStoryLocator } from './story.types.js';

// ---------------------------------------------------------------------------
// Error model (normative)
// ---------------------------------------------------------------------------

export type SDErrorCode =
  | 'INVALID_INPUT'
  | 'INVALID_PAYLOAD'
  | 'INVALID_TARGET'
  | 'TARGET_NOT_FOUND'
  | 'ADDRESS_STALE'
  | 'PERMISSION_DENIED'
  | 'PRECONDITION_FAILED'
  | 'REVISION_MISMATCH'
  | 'CHECK_MISMATCH'
  | 'INVALID_CONTEXT'
  | 'INVALID_NESTING'
  | 'INVALID_PLACEMENT'
  | 'DUPLICATE_ID'
  | 'CAPABILITY_UNSUPPORTED'
  | 'RAW_MODE_REQUIRED'
  | 'PRESERVE_ONLY_VIOLATION'
  | 'NO_OP'
  | 'UNSUPPORTED_ENVIRONMENT'
  | 'INTERNAL_ERROR';

export const SD_HTML_MARKDOWN_OUTCOMES = [
  'preserved',
  'preserved-with-warnings',
  'simplified',
  'rejected',
  'no-op',
  'invalid-target',
  'outdated',
] as const;

export type SDHtmlMarkdownOutcome = (typeof SD_HTML_MARKDOWN_OUTCOMES)[number];

export interface SDError {
  code: SDErrorCode;
  message: string;
  path?: Array<string | number>;
  /** The target that caused the error, when available. */
  target?: BlockNodeAddress | TextAddress | SelectionTarget | BodyStoryLocator;
  details?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Mutation receipt
// ---------------------------------------------------------------------------

/**
 * Discriminated target in a mutation resolution.
 *
 * - `TextAddress` (`kind: 'text'`): text-level insert/replace with block-relative offsets.
 * - `BlockNodeAddress` (`kind: 'block'`): structural insert/replace targeting a whole block.
 * - `BodyStoryLocator` (`kind: 'story'`): explicit complete-main-body replacement.
 */
export type MutationResolutionTarget = TextAddress | BlockNodeAddress | BodyStoryLocator;

export interface SDMutationReceipt {
  success: boolean;
  /** Rich HTML/Markdown fidelity outcome, when this receipt came from a rich write. */
  outcome?: SDHtmlMarkdownOutcome;
  failure?: SDError;
  evaluatedRevision?: { before: string; after: string };
  id?: ReceiptSuccess['id'];
  inserted?: ReceiptSuccess['inserted'];
  updated?: ReceiptSuccess['updated'];
  removed?: ReceiptSuccess['removed'];
  invalidatedRefs?: ReceiptSuccess['invalidatedRefs'];
  remappedRefs?: ReceiptSuccess['remappedRefs'];
  affectedStories?: ReceiptSuccess['affectedStories'];
  textRangeShifts?: ReceiptSuccess['textRangeShifts'];
  txId?: ReceiptSuccess['txId'];
  warnings?: ReceiptSuccess['warnings'];
  resolution?: {
    target: MutationResolutionTarget;
    /** Engine-resolved absolute document range for the effective target. */
    range: TextMutationRange;
    /** Full selection target for cross-block mutations. */
    selectionTarget?: SelectionTarget;
  };
  /**
   * Post-mutation created-content spans (inserted visible text / blocks).
   *
   * `resolution.target` is the resolved mutation target / insertion point; for
   * a collapsed insert it stays a collapsed point. Callers that need to anchor
   * to the content a mutation CREATED (citations, comments on inserted text)
   * read it here instead. See {@link ReceiptEffects}.
   */
  effects?: ReceiptEffects;
  conversion?: SDMutationConversionReport;
}

// ---------------------------------------------------------------------------
// Diagnostics and inbound conversion
// ---------------------------------------------------------------------------

export const SD_CONVERSION_FORMATS = ['html', 'markdown'] as const;

export type SDConversionFormat = (typeof SD_CONVERSION_FORMATS)[number];

export const SD_CONVERSION_DIAGNOSTIC_CODES = [
  'conversion-normalized-construct',
  'conversion-unsupported-construct',
  'conversion-dropped-style',
  'conversion-unsafe-content',
  'conversion-unsafe-url',
  'conversion-source-limit-exceeded',
  'conversion-depth-limit-exceeded',
  'conversion-malformed-input',
  'conversion-empty-result',
] as const;

export type SDConversionDiagnosticCode = (typeof SD_CONVERSION_DIAGNOSTIC_CODES)[number];

/** Stable feature identifiers used to classify conversion diagnostics. */
export const SD_CONVERSION_CONSTRUCTS = [
  'document',
  'source',
  'text',
  'paragraph',
  'emptyParagraph',
  'softBreak',
  'lineBreak',
  'heading',
  'bold',
  'italic',
  'underline',
  'strike',
  'hyperlink',
  'list',
  'table',
  'tableHeader',
  'colSpan',
  'rowSpan',
  'horizontalRule',
  'inlineCode',
  'codeBlock',
  'blockquote',
  'taskList',
  'image',
  'footnote',
  'rawHtml',
  'unknownWrapper',
  'script',
  'style',
  'eventHandler',
] as const;

export type SDConversionConstruct = (typeof SD_CONVERSION_CONSTRUCTS)[number];

export const SD_CONVERSION_DISPOSITIONS = ['preserved', 'normalized', 'downgraded', 'dropped', 'rejected'] as const;

export type SDConversionDisposition = (typeof SD_CONVERSION_DISPOSITIONS)[number];

/** UTF-16 offsets are start-inclusive and end-exclusive. */
export interface SDConversionSourceRange {
  startOffset: number;
  endOffset: number;
  startLine?: number;
  startColumn?: number;
  endLine?: number;
  endColumn?: number;
}

export interface SDConversionSource {
  format: SDConversionFormat;
  range?: SDConversionSourceRange;
}

export interface SDDiagnostic {
  code: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  path?: Array<string | number>;
  construct?: SDConversionConstruct;
  disposition?: SDConversionDisposition;
  lossy?: boolean;
  source?: SDConversionSource;
}

/** Diagnostic shape guaranteed by the canonical HTML/Markdown converters. */
export interface SDConversionDiagnostic extends SDDiagnostic {
  code: SDConversionDiagnosticCode;
  construct: SDConversionConstruct;
  disposition: SDConversionDisposition;
  lossy: boolean;
  source: SDConversionSource;
}

export interface SDMutationConversionReport {
  format: SDConversionFormat;
  lossy: boolean;
  diagnostics: SDConversionDiagnostic[];
}

// ---------------------------------------------------------------------------
// Inbound conversion results
// ---------------------------------------------------------------------------

export interface SDContentToFragmentResult<TDiagnostic extends SDDiagnostic = SDDiagnostic> {
  fragment: import('./fragment.js').SDFragment;
  lossy: boolean;
  diagnostics: TDiagnostic[];
}

export type SDHtmlToFragmentResult = SDContentToFragmentResult<SDConversionDiagnostic>;

/** Existing Markdown adapters may continue returning base diagnostics. */
export interface SDMarkdownToFragmentResult extends SDContentToFragmentResult<SDDiagnostic> {}
