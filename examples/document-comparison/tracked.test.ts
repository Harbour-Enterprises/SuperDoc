import assert from 'node:assert/strict';
import test from 'node:test';
import {
  saveTrackedComparison,
  type ComparisonSnapshot,
  type TrackedComparisonDocument,
  type TrackedComparisonReceipt,
} from './tracked-workflow.ts';

const snapshot: ComparisonSnapshot = {
  version: 'sd-diff-snapshot/v2',
  engine: 'superdoc-v2',
  fingerprint: 'target',
  coverage: { body: true, comments: false, styles: true, numbering: false, headerFooters: false },
  payload: {},
};

function scenario(options: { blocked?: boolean; styleOnly?: boolean; stylesChanged?: boolean; applyError?: Error; saved?: boolean } = {}) {
  const calls: Array<{ operation: string; params: unknown }> = [];
  const stylesChanged = options.stylesChanged ?? true;
  const summary: TrackedComparisonReceipt['summary'] = {
    hasChanges: true,
    changedComponents: options.styleOnly ? ['styles'] : stylesChanged ? ['body', 'styles'] : ['body'],
    body: { hasChanges: !options.styleOnly },
    comments: { hasChanges: false },
    styles: { hasChanges: stylesChanged },
    numbering: { hasChanges: false },
    headerFooters: { hasChanges: false },
    parts: { hasChanges: false },
  };
  const diff = {
    version: 'sd-diff-payload/v2' as const,
    engine: 'superdoc-v2' as const,
    baseFingerprint: 'base',
    targetFingerprint: 'target',
    coverage: snapshot.coverage,
    summary,
    payload: {},
    applyEligibility: {
      direct: { status: 'candidate' as const, blockers: [] },
      tracked: options.blocked
        ? { status: 'blocked' as const, blockers: [{ code: 'definition-replay-tracked-unsupported' as const, message: 'Styles require consent.', families: ['styles'] }] }
        : { status: 'candidate' as const, blockers: [] },
    },
  };
  const receipt: TrackedComparisonReceipt = {
    appliedOperations: 1,
    operationReceipts: options.styleOnly ? [{
      operationId: 'compare:direct:0',
      disposition: 'applied-directly',
      reviewItems: [],
    }] : [{
      operationId: 'insert-1',
      disposition: 'review-created',
      reviewItems: [{
        id: 'body-insertion-1',
        story: { kind: 'story', storyType: 'body' },
        address: { kind: 'entity', entityType: 'trackedChange', entityId: 'body-insertion-1' },
      }],
    }],
    baseFingerprint: 'base',
    targetFingerprint: 'target',
    coverage: snapshot.coverage,
    summary,
    ...(stylesChanged ? { styleChanges: { changeMode: 'direct' as const, partUris: ['/word/styles.xml'] } } : {}),
    diagnostics: stylesChanged ? ['Style definitions are not tracked and remain after rejecting body revisions.'] : [],
  };
  const doc: TrackedComparisonDocument = {
    diff: {
      async compare(params) { calls.push({ operation: 'compare', params }); return diff; },
      async apply(params) {
        calls.push({ operation: 'apply', params });
        if (options.applyError) throw options.applyError;
        return receipt;
      },
    },
    async save(params) {
      calls.push({ operation: 'save', params });
      return { contextId: 'example', saved: options.saved ?? true };
    },
  };
  return { doc, calls, diff, receipt };
}

test('passes explicit direct-style consent to compare and apply and saves pending body revisions', async () => {
  const s = scenario();
  const result = await saveTrackedComparison(s.doc, snapshot, 'pending.docx', { styleChangeMode: 'direct' });
  assert.deepEqual(s.calls, [
    { operation: 'compare', params: { targetSnapshot: snapshot, styleChangeMode: 'direct' } },
    { operation: 'apply', params: { diff: s.diff, changeMode: 'tracked', styleChangeMode: 'direct' } },
    { operation: 'save', params: { out: 'pending.docx' } },
  ]);
  assert.equal(result, s.receipt);
  assert.equal(result.operationReceipts[0].disposition, 'review-created');
  assert.deepEqual(result.styleChanges, { changeMode: 'direct', partUris: ['/word/styles.xml'] });
  assert.match(result.diagnostics.join(' '), /not tracked.*remain after rejecting/);
});

test('saves style-only comparisons and reports direct styles without requiring a body revision', async () => {
  const s = scenario({ styleOnly: true });
  const result = await saveTrackedComparison(s.doc, snapshot, 'styles.docx', { styleChangeMode: 'direct' });
  assert.equal(result.appliedOperations, 1);
  assert.equal(result.operationReceipts[0].disposition, 'applied-directly');
  assert.deepEqual(result.operationReceipts.flatMap((receipt) => receipt.reviewItems), []);
  assert.deepEqual(result.styleChanges?.partUris, ['/word/styles.xml']);
  assert.equal(s.calls.at(-1)?.operation, 'save');
});

test('saves body-only comparisons without opting into direct styles', async () => {
  const s = scenario({ stylesChanged: false });
  const result = await saveTrackedComparison(s.doc, snapshot, 'pending.docx');
  assert.deepEqual(s.calls, [
    { operation: 'compare', params: { targetSnapshot: snapshot } },
    { operation: 'apply', params: { diff: s.diff, changeMode: 'tracked' } },
    { operation: 'save', params: { out: 'pending.docx' } },
  ]);
  assert.equal(result, s.receipt);
  assert.deepEqual(result.summary.changedComponents, ['body']);
  assert.equal(result.summary.styles.hasChanges, false);
  assert.equal(result.styleChanges, undefined);
  assert.deepEqual(result.diagnostics, []);
  assert.equal(result.operationReceipts.length, 1);
  assert.equal(result.operationReceipts[0].disposition, 'review-created');
  assert.deepEqual(result.operationReceipts[0].reviewItems.map((item) => item.id), ['body-insertion-1']);
});

test('does not apply or save when the default tracked policy blocks styles', async () => {
  const s = scenario({ blocked: true });
  await assert.rejects(saveTrackedComparison(s.doc, snapshot, 'pending.docx'), /definition-replay-tracked-unsupported/);
  assert.deepEqual(s.calls.map((call) => call.operation), ['compare']);
});

test('does not save and preserves the original error if apply refuses a candidate', async () => {
  const refusal = new Error('The live base changed.');
  const s = scenario({ applyError: refusal });
  await assert.rejects(saveTrackedComparison(s.doc, snapshot, 'pending.docx', { styleChangeMode: 'direct' }), (error) => error === refusal);
  assert.deepEqual(s.calls.map((call) => call.operation), ['compare', 'apply']);
});

test('does not report a successful comparison when save does not confirm success', async () => {
  const s = scenario({ saved: false });
  await assert.rejects(saveTrackedComparison(s.doc, snapshot, 'pending.docx', { styleChangeMode: 'direct' }), /save did not confirm success/);
});
