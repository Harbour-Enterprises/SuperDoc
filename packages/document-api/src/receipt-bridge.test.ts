import { describe, it, expect } from 'vite-plus/test';
import { textReceiptToSDReceipt, buildStructuralReceipt } from './receipt-bridge.js';
import type { ReceiptEffects, TextMutationReceipt } from './types/index.js';

const EFFECTS: ReceiptEffects = {
  insertedText: [
    {
      kind: 'insertedText',
      sourcePath: [0, 'paragraph', 'inlines', 0],
      target: { kind: 'text', blockId: 'B1', range: { start: 4, end: 7 } },
      selectionTarget: {
        kind: 'selection',
        start: { kind: 'text', blockId: 'B1', offset: 4 },
        end: { kind: 'text', blockId: 'B1', offset: 7 },
      },
      text: 'XYZ',
    },
  ],
};

describe('receipt-bridge: failure code mapping', () => {
  // Reproduces a real bug (reported against a live two-peer room on
  // superdoc@2.20.0, re-localized here): root `doc.replace`/`doc.insert`
  // under enforced document protection returned `INTERNAL_ERROR` instead of
  // `PERMISSION_DENIED` — not because anything threw, but because
  // `PERMISSION_DENIED` was simply absent from both `SDErrorCode` and this
  // file's `CODE_MAP`, so the `?? 'INTERNAL_ERROR'` fallback silently caught
  // it. `text.replace` (which returns the raw TextMutationReceipt directly,
  // bypassing this bridge) was unaffected — only the root member paths that
  // go through `textReceiptToSDReceipt` (`insert`, `replace`, and `delete`,
  // which is implemented via `replace`) ever hit this translation.
  it('maps a PERMISSION_DENIED text-mutation failure to PERMISSION_DENIED, not INTERNAL_ERROR', () => {
    const textReceipt: TextMutationReceipt = {
      success: false,
      failure: {
        code: 'PERMISSION_DENIED',
        message: 'document protection permits edits only within an everyone permission range.',
      },
      resolution: {
        target: { kind: 'text', blockId: '', range: { start: 0, end: 0 } },
        range: { from: 0, to: 0 },
        text: '',
      },
    };
    const sdReceipt = textReceiptToSDReceipt(textReceipt);
    expect(sdReceipt.success).toBe(false);
    if (sdReceipt.success) return;
    expect(sdReceipt.failure.code).toBe('PERMISSION_DENIED');
    expect(sdReceipt.failure.message).toBe(textReceipt.failure.message);
  });
});

describe('receipt-bridge: created-content effects', () => {
  it('preserves INVALID_INPUT from a rejected structural text write', () => {
    const receipt = textReceiptToSDReceipt({
      success: false,
      failure: { code: 'INVALID_INPUT', message: 'Per-call author cannot stamp structural content.' },
    });
    expect(receipt).toMatchObject({ success: false, failure: { code: 'INVALID_INPUT' } });
  });

  it('preserves effects from a successful text receipt onto the SDMutationReceipt', () => {
    const textReceipt: TextMutationReceipt = {
      success: true,
      resolution: {
        target: { kind: 'text', blockId: 'B1', range: { start: 4, end: 4 } },
        range: { from: 4, to: 4 },
        text: '',
      },
      effects: EFFECTS,
    };
    const sdReceipt = textReceiptToSDReceipt(textReceipt);
    expect(sdReceipt.success).toBe(true);
    // resolution.target stays the collapsed insertion point.
    expect(sdReceipt.resolution?.target).toMatchObject({ blockId: 'B1', range: { start: 4, end: 4 } });
    // effects carries the created span (nonzero base offset).
    expect(sdReceipt.effects?.insertedText?.[0]).toMatchObject({
      kind: 'insertedText',
      target: { blockId: 'B1', range: { start: 4, end: 7 } },
      text: 'XYZ',
    });
  });

  it('omits effects when the text receipt has none', () => {
    const textReceipt: TextMutationReceipt = {
      success: true,
      resolution: {
        target: { kind: 'text', blockId: 'B1', range: { start: 0, end: 0 } },
        range: { from: 0, to: 0 },
        text: '',
      },
    };
    expect(textReceiptToSDReceipt(textReceipt).effects).toBeUndefined();
  });

  it('carries effects through buildStructuralReceipt', () => {
    const receipt = buildStructuralReceipt(true, {
      target: { kind: 'block', nodeType: 'paragraph', nodeId: 'P1' },
      range: { from: 0, to: 0 },
      effects: {
        insertedBlocks: [{ kind: 'insertedBlock', target: { kind: 'block', nodeType: 'paragraph', nodeId: 'P1' } }],
      },
    });
    expect(receipt.success).toBe(true);
    expect(receipt.effects?.insertedBlocks?.[0]).toMatchObject({ kind: 'insertedBlock', target: { nodeId: 'P1' } });
  });

  it('explicitly projects every canonical success lane plus bridge context', () => {
    const trackedChange = { kind: 'entity' as const, entityType: 'trackedChange' as const, entityId: 'tc-1' };
    const heldRef = { kind: 'text' as const, blockId: 'B1', range: { start: 0, end: 1 } };
    const remappedRef = { kind: 'text' as const, blockId: 'B1', range: { start: 1, end: 2 } };
    const textReceipt: TextMutationReceipt = {
      success: true,
      resolution: {
        target: { kind: 'text', blockId: 'B1', range: { start: 0, end: 0 } },
        range: { from: 0, to: 0 },
        text: '',
      },
      id: 'tc-1',
      inserted: [trackedChange],
      updated: [trackedChange],
      removed: [trackedChange],
      invalidatedRefs: [heldRef],
      remappedRefs: [{ from: heldRef, to: remappedRef }],
      affectedStories: [{ kind: 'story', storyType: 'body' }],
      textRangeShifts: [{ story: { kind: 'story', storyType: 'body' }, atChar: 0, delta: 3 }],
      txId: 'tx-1',
      warnings: [
        {
          code: 'tracked-non-exact',
          message: 'Non-load-bearing review metadata was normalized.',
          feature: 'trackedChanges',
          severity: 'warning',
          canProceed: true,
        },
      ],
      effects: EFFECTS,
    };
    const conversion = {
      format: 'html' as const,
      lossy: false,
      diagnostics: [],
    };

    const receipt = textReceiptToSDReceipt(textReceipt, {
      evaluatedRevision: { before: 'r1', after: 'r2' },
      conversion,
    });

    expect(receipt).toMatchObject({
      success: true,
      id: 'tc-1',
      inserted: [trackedChange],
      updated: [trackedChange],
      removed: [trackedChange],
      invalidatedRefs: [heldRef],
      remappedRefs: [{ from: heldRef, to: remappedRef }],
      affectedStories: [{ kind: 'story', storyType: 'body' }],
      textRangeShifts: [{ atChar: 0, delta: 3 }],
      txId: 'tx-1',
      warnings: [{ code: 'tracked-non-exact' }],
      effects: EFFECTS,
      evaluatedRevision: { before: 'r1', after: 'r2' },
      conversion,
    });
  });

  it('projects structural metadata and source paths without manufacturing identities', () => {
    const inserted = { kind: 'entity' as const, entityType: 'trackedChange' as const, entityId: 'tc-2' };
    const receipt = buildStructuralReceipt(true, {
      target: { kind: 'block', nodeType: 'paragraph', nodeId: 'P2' },
      range: { from: 4, to: 4 },
      inserted: [inserted],
      affectedStories: [{ kind: 'story', storyType: 'body' }],
      txId: 'tx-2',
      evaluatedRevision: { before: 'r2', after: 'r3' },
      conversion: { format: 'markdown', lossy: false, diagnostics: [] },
      effects: {
        insertedBlocks: [
          {
            kind: 'insertedBlock',
            sourcePath: [0],
            target: { kind: 'block', nodeType: 'paragraph', nodeId: 'P2' },
          },
        ],
      },
    });

    expect(receipt.inserted).toEqual([inserted]);
    expect(receipt.affectedStories).toEqual([{ kind: 'story', storyType: 'body' }]);
    expect(receipt.effects?.insertedBlocks?.[0]?.sourcePath).toEqual([0]);
    expect(receipt.conversion?.format).toBe('markdown');
  });

  it('omits success-only metadata on failure while retaining revision and fatal conversion context', () => {
    const receipt = buildStructuralReceipt(
      false,
      {
        target: { kind: 'block', nodeType: 'paragraph', nodeId: 'P3' },
        range: { from: 0, to: 0 },
        id: 'must-not-leak',
        inserted: [{ kind: 'entity', entityType: 'trackedChange', entityId: 'must-not-leak' }],
        effects: EFFECTS,
        txId: 'must-not-leak',
        evaluatedRevision: { before: 'r3', after: 'r3' },
        conversion: {
          format: 'html',
          lossy: true,
          diagnostics: [
            {
              code: 'conversion-empty-result',
              severity: 'error',
              message: 'No safe fragment could be produced.',
              construct: 'document',
              disposition: 'rejected',
              lossy: true,
              source: { format: 'html' },
            },
          ],
        },
      },
      { code: 'INVALID_PAYLOAD', message: 'Conversion failed.' },
    );

    expect(receipt).toMatchObject({
      success: false,
      evaluatedRevision: { before: 'r3', after: 'r3' },
      conversion: { format: 'html', lossy: true },
    });
    expect(receipt).not.toHaveProperty('id');
    expect(receipt).not.toHaveProperty('inserted');
    expect(receipt).not.toHaveProperty('effects');
    expect(receipt).not.toHaveProperty('txId');
  });
});
