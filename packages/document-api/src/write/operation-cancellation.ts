import { DocumentApiValidationError } from '../errors.js';

/**
 * Host-side cancellation for browser `insert`, `mutations.apply`, and `extract`.
 *
 * `signal` and `timeoutMs` stay on the caller side. They are not serialized
 * into the worker. An already-aborted signal or a `timeoutMs` of 0 finishes
 * as {@link OperationCancellationError} `CANCELLED` before dispatch and does
 * not change the document. Aborting after the worker has started the command
 * does not roll it back: the call rejects as `INDETERMINATE` so the caller
 * stops waiting, and must read the document before deciding whether to retry.
 * Replacing the document or closing the editor also settles as `INDETERMINATE`.
 */
export interface OperationCancellation {
  /** Abort before dispatch, or ask the host to cancel a command that has not started. */
  signal?: AbortSignal;
  /**
   * Milliseconds from the call. `0` is already expired and does not dispatch.
   * A positive deadline uses the same outcome rules as `signal`.
   */
  timeoutMs?: number;
}

export type OperationCancellationCode = 'CANCELLED' | 'INDETERMINATE';

/**
 * Machine-readable outcome for a cancellation that did not return the
 * operation's normal receipt.
 *
 * `CANCELLED` means the command did not start and the document is unchanged.
 * Retrying that same call is safe. `INDETERMINATE` means the call cannot
 * prove whether a mutation committed. Read the current document before
 * retrying. A resolved receipt means the work committed; do not retry it.
 */
export class OperationCancellationError extends Error {
  readonly code: OperationCancellationCode;
  readonly details?: { cause?: string };

  constructor(code: OperationCancellationCode, message: string, details?: { cause?: string }) {
    super(message);
    this.name = 'OperationCancellationError';
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, OperationCancellationError.prototype);
  }
}

const CANCELLED_MESSAGE = 'The operation was cancelled before it changed the document.';

export function cancelledBeforeDispatch(): OperationCancellationError {
  return new OperationCancellationError('CANCELLED', CANCELLED_MESSAGE, { cause: 'cancelled' });
}

export function indeterminateOperation(cause: 'replaced' | 'disposed' | 'in-flight'): OperationCancellationError {
  if (cause === 'replaced') {
    return new OperationCancellationError(
      'INDETERMINATE',
      'The document was replaced before this operation finished. Read the current document before retrying.',
      { cause },
    );
  }
  if (cause === 'in-flight') {
    return new OperationCancellationError(
      'INDETERMINATE',
      'Cancellation was requested after the operation started. Read the current document before retrying.',
      { cause },
    );
  }
  return new OperationCancellationError(
    'INDETERMINATE',
    'The editor closed before this operation finished. Open a document again before retrying.',
    { cause },
  );
}

function isAbortSignal(value: unknown): value is AbortSignal {
  if (typeof value !== 'object' || value === null) return false;
  const signal = value as AbortSignal;
  return typeof signal.aborted === 'boolean' && typeof signal.addEventListener === 'function';
}

/**
 * Reject a call that is already cancelled or whose deadline has already
 * expired. Returns without effect when the caller did not ask for control.
 */
export function assertOperationCanStart(options?: OperationCancellation): void {
  if (options === undefined) return;
  if (options.signal !== undefined && !isAbortSignal(options.signal)) {
    throw new DocumentApiValidationError('VALIDATION_ERROR', 'signal must be an AbortSignal.', {
      field: 'signal',
    });
  }
  if (options.timeoutMs !== undefined) {
    if (typeof options.timeoutMs !== 'number' || !Number.isFinite(options.timeoutMs) || options.timeoutMs < 0) {
      throw new DocumentApiValidationError(
        'VALIDATION_ERROR',
        'timeoutMs must be a finite number of milliseconds, 0 or greater.',
        {
          field: 'timeoutMs',
          value: options.timeoutMs,
        },
      );
    }
  }
  if (options.signal?.aborted || (options.timeoutMs !== undefined && options.timeoutMs <= 0)) {
    throw cancelledBeforeDispatch();
  }
}

/**
 * Separate host-only cancellation fields from a value that will be
 * structured-cloned into the worker. `AbortSignal` cannot cross that boundary.
 */
export function splitOperationCancellation(value: unknown): {
  cancellation?: OperationCancellation;
  rest: unknown;
} {
  if (value === undefined || value === null || typeof value !== 'object' || Array.isArray(value)) {
    return { rest: value };
  }
  const record = value as Record<string, unknown>;
  if (!('signal' in record) && !('timeoutMs' in record)) return { rest: value };
  const cancellation: OperationCancellation = {};
  if ('signal' in record) cancellation.signal = record.signal as AbortSignal;
  if ('timeoutMs' in record) cancellation.timeoutMs = record.timeoutMs as number;
  const rest: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(record)) {
    if (key === 'signal' || key === 'timeoutMs') continue;
    rest[key] = entry;
  }
  return { cancellation, rest: Object.keys(rest).length > 0 ? rest : undefined };
}
