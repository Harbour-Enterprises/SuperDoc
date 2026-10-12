import { describe, expect, it, vi } from 'vite-plus/test';
import { executeInsert } from '../insert/insert.js';
import type { SelectionMutationAdapter } from '../selection-mutation.js';
import type { WriteAdapter } from './write.js';
import { DocumentApiValidationError } from '../errors.js';
import { OperationCancellationError, assertOperationCanStart } from './operation-cancellation.js';

function createStubSelectionAdapter(): SelectionMutationAdapter {
  return { execute: vi.fn() } as unknown as SelectionMutationAdapter;
}

function createStubWriteAdapter(): WriteAdapter {
  const write = vi.fn(() => ({ success: true }));
  return { write, insertStructured: vi.fn(), replaceStructured: vi.fn() } as unknown as WriteAdapter;
}

describe('operation cancellation before dispatch', () => {
  it('rejects an already-aborted insert before the adapter runs', () => {
    const write = createStubWriteAdapter();
    expect(() =>
      executeInsert(
        createStubSelectionAdapter(),
        write,
        { value: 'SD4996-CANCEL-MARKER' },
        {
          signal: AbortSignal.abort(),
          changeMode: 'tracked',
          author: { name: 'Automated Reviewer' },
        },
      ),
    ).toThrow(OperationCancellationError);
    expect(write.write).not.toHaveBeenCalled();
  });

  it('rejects a deadline that has already expired', () => {
    expect(() => assertOperationCanStart({ timeoutMs: 0 })).toThrow(OperationCancellationError);
  });

  it('rejects a malformed deadline without calling the operation', () => {
    expect(() => assertOperationCanStart({ timeoutMs: -1 })).toThrow(DocumentApiValidationError);
  });

  it('lets a live signal through to the adapter', () => {
    const write = createStubWriteAdapter();
    const receipt = executeInsert(
      createStubSelectionAdapter(),
      write,
      { value: 'kept' },
      {
        signal: new AbortController().signal,
        timeoutMs: 1_000,
        changeMode: 'tracked',
        author: { name: 'Automated Reviewer' },
      },
    );
    expect(receipt.success).toBe(true);
    expect(write.write).toHaveBeenCalledOnce();
    expect(write.write).toHaveBeenCalledWith(
      { kind: 'insert', text: 'kept' },
      expect.objectContaining({ changeMode: 'tracked', author: { name: 'Automated Reviewer' } }),
    );
  });
});
