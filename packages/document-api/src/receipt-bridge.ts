/**
 * Bridge utilities for converting internal receipt types to SDMutationReceipt.
 *
 * Two paths produce SDMutationReceipts:
 *   1. Text pipeline: TextMutationReceipt → SDMutationReceipt (via {@link textReceiptToSDReceipt})
 *   2. Structural pipeline: direct construction (via {@link buildStructuralReceipt})
 */

import type {
  TextMutationReceipt,
  TextMutationResolution,
  TextMutationRange,
  ReceiptEffects,
  SDMutationReceipt,
  SDError,
  SelectionTarget,
  MutationResolutionTarget,
  ReceiptSuccess,
  SDMutationConversionReport,
} from './types/index.js';

export interface MutationReceiptBridgeContext {
  evaluatedRevision?: { before: string; after: string };
  conversion?: SDMutationConversionReport;
}

interface CanonicalSuccessMetadata {
  appliedChangeMode?: ReceiptSuccess['appliedChangeMode'];
  changed?: ReceiptSuccess['changed'];
  trackedChangeRefs?: ReceiptSuccess['trackedChangeRefs'];
  trackedChangeCount?: ReceiptSuccess['trackedChangeCount'];
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
  effects?: ReceiptSuccess['effects'];
}

function projectSuccessMetadata(metadata: CanonicalSuccessMetadata): Partial<SDMutationReceipt> {
  return {
    ...(metadata.appliedChangeMode !== undefined ? { appliedChangeMode: metadata.appliedChangeMode } : {}),
    ...(metadata.changed !== undefined ? { changed: metadata.changed } : {}),
    ...(metadata.trackedChangeRefs !== undefined ? { trackedChangeRefs: metadata.trackedChangeRefs } : {}),
    ...(metadata.trackedChangeCount !== undefined ? { trackedChangeCount: metadata.trackedChangeCount } : {}),
    ...(metadata.id !== undefined ? { id: metadata.id } : {}),
    ...(metadata.inserted !== undefined ? { inserted: metadata.inserted } : {}),
    ...(metadata.updated !== undefined ? { updated: metadata.updated } : {}),
    ...(metadata.removed !== undefined ? { removed: metadata.removed } : {}),
    ...(metadata.invalidatedRefs !== undefined ? { invalidatedRefs: metadata.invalidatedRefs } : {}),
    ...(metadata.remappedRefs !== undefined ? { remappedRefs: metadata.remappedRefs } : {}),
    ...(metadata.affectedStories !== undefined ? { affectedStories: metadata.affectedStories } : {}),
    ...(metadata.textRangeShifts !== undefined ? { textRangeShifts: metadata.textRangeShifts } : {}),
    ...(metadata.txId !== undefined ? { txId: metadata.txId } : {}),
    ...(metadata.warnings !== undefined ? { warnings: metadata.warnings } : {}),
    ...(metadata.effects !== undefined ? { effects: metadata.effects } : {}),
  };
}

function projectBridgeContext(context: MutationReceiptBridgeContext): Partial<SDMutationReceipt> {
  return {
    ...(context.evaluatedRevision !== undefined ? { evaluatedRevision: context.evaluatedRevision } : {}),
    ...(context.conversion !== undefined ? { conversion: context.conversion } : {}),
  };
}

/**
 * Builds the public receipt resolution from a TextMutationResolution.
 * Passes through `target` (TextAddress) and optional `selectionTarget` directly.
 */
function buildResolution(resolution: TextMutationResolution): SDMutationReceipt['resolution'] {
  return {
    target: resolution.target,
    range: resolution.range,
    ...(resolution.selectionTarget ? { selectionTarget: resolution.selectionTarget } : {}),
  };
}

/**
 * Wraps a TextMutationReceipt into an SDMutationReceipt at the public API boundary.
 *
 * - Success/failure semantics are preserved.
 * - Resolution is passed through directly (both use TextAddress).
 * - Failure codes from the text pipeline are mapped to SDErrorCode.
 */
export function textReceiptToSDReceipt(
  receipt: TextMutationReceipt,
  context: MutationReceiptBridgeContext = {},
): SDMutationReceipt {
  if (receipt.success) {
    return {
      success: true,
      resolution: receipt.resolution ? buildResolution(receipt.resolution) : undefined,
      ...projectSuccessMetadata(receipt),
      ...projectBridgeContext(context),
    };
  }

  // Failure path
  const failure: SDError = {
    code: 'INTERNAL_ERROR',
    message: receipt.failure.message,
    ...(receipt.failure.details != null ? { details: receipt.failure.details as Record<string, unknown> } : {}),
  };

  // Map known receipt failure codes to SDErrorCode
  const CODE_MAP: Record<string, SDError['code']> = {
    INVALID_INPUT: 'INVALID_INPUT',
    INVALID_TARGET: 'INVALID_TARGET',
    TARGET_NOT_FOUND: 'TARGET_NOT_FOUND',
    MATCH_NOT_FOUND: 'TARGET_NOT_FOUND',
    AMBIGUOUS_MATCH: 'INVALID_TARGET',
    PERMISSION_DENIED: 'PERMISSION_DENIED',
    NO_OP: 'NO_OP',
    UNSUPPORTED_ENVIRONMENT: 'UNSUPPORTED_ENVIRONMENT',
    INVALID_NESTING: 'INVALID_NESTING',
    INVALID_PLACEMENT: 'INVALID_PLACEMENT',
    INVALID_PAYLOAD: 'INVALID_PAYLOAD',
    ADDRESS_STALE: 'ADDRESS_STALE',
    INVALID_CONTEXT: 'INVALID_CONTEXT',
    CAPABILITY_UNAVAILABLE: 'CAPABILITY_UNSUPPORTED',
    CAPABILITY_UNSUPPORTED: 'CAPABILITY_UNSUPPORTED',
    PRECONDITION_FAILED: 'PRECONDITION_FAILED',
    REVISION_MISMATCH: 'REVISION_MISMATCH',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
  };
  failure.code = CODE_MAP[receipt.failure.code] ?? 'INTERNAL_ERROR';

  return {
    success: false,
    failure,
    resolution: receipt.resolution ? buildResolution(receipt.resolution) : undefined,
    ...projectBridgeContext(context),
  };
}

// ---------------------------------------------------------------------------
// Structural receipt builder
// ---------------------------------------------------------------------------

/** Parameters for building a structural mutation receipt. */
export interface StructuralReceiptParams extends CanonicalSuccessMetadata, MutationReceiptBridgeContext {
  target: MutationResolutionTarget;
  range: TextMutationRange;
  selectionTarget?: SelectionTarget;
  /** Post-mutation created-content spans (inserted blocks / text). */
  effects?: ReceiptEffects;
}

/**
 * Builds an SDMutationReceipt for structural (block-level) mutations.
 *
 * Unlike {@link textReceiptToSDReceipt} which converts from the internal
 * text pipeline, this constructs a receipt directly: preserving the
 * original `BlockNodeAddress` target instead of normalizing it to a
 * synthetic `TextAddress`.
 */
export function buildStructuralReceipt(success: true, params: StructuralReceiptParams): SDMutationReceipt;
export function buildStructuralReceipt(
  success: false,
  params: StructuralReceiptParams,
  failure: { code: string; message: string },
): SDMutationReceipt;
export function buildStructuralReceipt(
  success: boolean,
  params: StructuralReceiptParams,
  failure?: { code: string; message: string },
): SDMutationReceipt {
  const resolution: SDMutationReceipt['resolution'] = {
    target: params.target,
    range: params.range,
    ...(params.selectionTarget ? { selectionTarget: params.selectionTarget } : {}),
  };

  if (success) {
    return {
      success: true,
      resolution,
      ...projectSuccessMetadata(params),
      ...projectBridgeContext(params),
    };
  }

  return {
    success: false,
    failure: { code: (failure?.code ?? 'INTERNAL_ERROR') as SDError['code'], message: failure?.message ?? '' },
    resolution,
    ...projectBridgeContext(params),
  };
}
