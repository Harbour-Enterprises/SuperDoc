export interface DocumentLoadOptions {
  /** Total milliseconds from starting this document's download through its initial rendered readiness. */
  timeoutMs?: number;
  /** Cancels only the initial load. Aborting after readiness does not close the document. */
  signal?: AbortSignal;
}

export class DocumentLoadError extends Error {
  readonly name = 'DocumentLoadError';
  constructor(
    readonly code: 'DOCUMENT_LOAD_TIMEOUT' | 'DOCUMENT_LOAD_CANCELLED',
    readonly documentId?: string,
  ) {
    super(code === 'DOCUMENT_LOAD_TIMEOUT' ? 'Document load deadline exceeded.' : 'Document load cancelled.');
  }
}

/** One document lifetime. Omitted configuration creates no timer, controller or listener. */
export function createDocumentLoadScope(options?: DocumentLoadOptions, documentId?: string) {
  if (options === undefined) return undefined;
  if (
    options.timeoutMs !== undefined &&
    (!Number.isFinite(options.timeoutMs) || options.timeoutMs <= 0 || options.timeoutMs > 2147483647)
  ) {
    throw new RangeError('load.timeoutMs must be positive and at most 2147483647.');
  }
  const controller = new AbortController();
  let complete = false;
  let error: DocumentLoadError | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let rejectFailure!: (error: DocumentLoadError) => void;
  const listeners = new Set<(error: DocumentLoadError) => void>();
  const settled = new Set<() => void>();
  const failure = new Promise<never>((_, reject) => {
    rejectFailure = reject;
  });
  void failure.catch(() => {});
  const detach = () => {
    if (timer !== undefined) clearTimeout(timer);
    options.signal?.removeEventListener('abort', cancel);
  };
  const fail = (code: DocumentLoadError['code']) => {
    if (complete || error) return;
    error = new DocumentLoadError(code, documentId);
    detach();
    controller.abort(error);
    rejectFailure(error);
    for (const listener of settled) listener();
    settled.clear();
    for (const listener of [...listeners]) listener(error);
    listeners.clear();
  };
  const cancel = () => fail('DOCUMENT_LOAD_CANCELLED');
  if (options.timeoutMs !== undefined) timer = setTimeout(() => fail('DOCUMENT_LOAD_TIMEOUT'), options.timeoutMs);
  options.signal?.addEventListener('abort', cancel, { once: true });
  if (options.signal?.aborted) cancel();
  return {
    signal: controller.signal,
    wait<T>(task: Promise<T>): Promise<T> {
      return error ? Promise.reject(error) : Promise.race([failure, task]);
    },
    assertActive() {
      if (error) throw error;
    },
    finish(): boolean {
      if (error) return false;
      complete = true;
      detach();
      listeners.clear();
      for (const listener of settled) listener();
      settled.clear();
      return true;
    },
    cancel,
    onSettled(listener: () => void) {
      if (complete || error) listener();
      else settled.add(listener);
    },
    onFailure(listener: (error: DocumentLoadError) => void) {
      if (error) listener(error);
      else if (!complete) listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
