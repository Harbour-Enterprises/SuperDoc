import { describe, expect, it } from 'bun:test';
import { validateReplaceInput, executeReplace } from '../replace/replace.js';
import { executeSelectionExtractOoxml } from '../selection/selection.js';
import { DocumentApiValidationError } from '../errors.js';
import { OPERATION_DEFINITIONS } from './operation-definitions.js';
import { buildInternalContractSchemas } from './schemas.js';
const target = { kind: 'block', nodeType: 'paragraph', nodeId: 'p1' } as const;
const at = {
  kind: 'selection',
  start: { kind: 'nodeEdge', node: target, edge: 'before' },
  end: { kind: 'nodeEdge', node: target, edge: 'after' },
} as const;
describe('paragraph alternatives contract', () => {
  it('requires a local restore precondition and rejects arbitrary XML mutation input', () => {
    for (const call of [
      () => validateReplaceInput({ target, snapshotId: 'original' }, { replaceMode: 'contents' }),
      () => validateReplaceInput({ target, xml: '<w:p/>' }, { replaceMode: 'contents' }),
      () =>
        validateReplaceInput({ target: { ...target, nodeType: 'table' }, text: 'unsafe' }, { replaceMode: 'contents' }),
    ])
      expect(call).toThrow(DocumentApiValidationError);
    expect(() =>
      validateReplaceInput({ target, type: 'ooxml', value: '<w:p/>', namespaces: { w: 'urn:w' } }),
    ).not.toThrow();
  });
  it('fails closed when a runtime does not provide the scoped owner', () => {
    expect(() =>
      executeSelectionExtractOoxml(
        {
          extractOoxml: () => {
            throw new Error('not called');
          },
        } as never,
        { at, retain: true },
      ),
    ).toThrow(DocumentApiValidationError);
    expect(() =>
      executeReplace({} as never, {} as never, { target, text: 'Alternate' }, { replaceMode: 'contents' }),
    ).toThrow(DocumentApiValidationError);
  });
  it('advertises direct-only non-batchable mutations and current read coordinates', () => {
    const operations = buildInternalContractSchemas().operations;
    expect(Object.keys(operations).some((id) => /^blocks.(capture|replace|restore|release)Paragraph$/.test(id))).toBe(
      false,
    );
    expect(OPERATION_DEFINITIONS.replace.metadata).toMatchObject({
      mutates: true,
      supportsDryRun: true,
      returnsReceipt: true,
    });
    const snapshot = operations['selection.extractOoxml'].output;
    expect(snapshot?.required).toContain('evaluatedRevision');
    expect(snapshot?.properties).toHaveProperty('snapshotId');
    expect(snapshot?.additionalProperties).toBe(false);
    expect(operations['selection.releaseSnapshot'].input.required).toContain('snapshotId');
  });
});
