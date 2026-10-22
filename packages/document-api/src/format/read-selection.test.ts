import { describe, expect, it, mock } from 'bun:test';
import type {
  FormatReadSelectionAdapter,
  FormatReadSelectionInput,
  FormatReadSelectionResult,
  InlineReadState,
} from './read-selection.js';
import { executeFormatReadSelection } from './read-selection.js';
import { INLINE_PROPERTY_REGISTRY, type InlineRunPatch } from './inline-run-patch.js';
import { DocumentApiValidationError } from '../errors.js';
import type { SelectionTarget } from '../types/address.js';

/** Type-only assertion — validates at compile time, no-op at runtime. */
function assertType<T>(_value: T): void {}

const TARGET: SelectionTarget = {
  kind: 'selection',
  start: { kind: 'text', blockId: 'p1', offset: 0 },
  end: { kind: 'text', blockId: 'p1', offset: 5 },
};

const ALL_KEYS = INLINE_PROPERTY_REGISTRY.map((entry) => entry.key);

function makeResult(): FormatReadSelectionResult {
  return { collapsed: false, properties: { bold: { state: 'uniform', value: true } } };
}

function makeAdapter(result: FormatReadSelectionResult = makeResult()) {
  return {
    readSelection: mock(async (_request: unknown) => result),
  } satisfies FormatReadSelectionAdapter;
}

async function expectInvalid(input: unknown, message: string | RegExp): Promise<void> {
  const adapter = makeAdapter();
  await expect(executeFormatReadSelection(adapter, input as FormatReadSelectionInput)).rejects.toThrow(message);
  await expect(executeFormatReadSelection(adapter, input as FormatReadSelectionInput)).rejects.toBeInstanceOf(
    DocumentApiValidationError,
  );
  expect(adapter.readSelection).not.toHaveBeenCalled();
}

describe('executeFormatReadSelection validation', () => {
  it('rejects non-object input', async () => {
    await expectInvalid(null, 'non-null object');
    await expectInvalid(42, 'non-null object');
  });

  it('rejects unknown top-level fields', async () => {
    await expectInvalid({ target: TARGET, extra: 1 }, 'extra');
  });

  it('requires exactly one of target, ref or selection', async () => {
    await expectInvalid({}, /target.*ref.*selection/);
    await expectInvalid({ target: TARGET, ref: 'r1' }, /only one/);
    await expectInvalid({ target: TARGET, selection: 'current' }, /only one/);
  });

  it('rejects an invalid target, empty ref and unknown selection mode', async () => {
    await expectInvalid({ target: { kind: 'nope' } }, 'SelectionTarget');
    await expectInvalid({ ref: '' }, 'non-empty string');
    await expectInvalid({ selection: 'anchor' }, '"current"');
  });

  it('rejects malformed keys', async () => {
    await expectInvalid({ target: TARGET, keys: 'bold' }, 'array');
    await expectInvalid({ target: TARGET, keys: [] }, 'at least one');
    await expectInvalid({ target: TARGET, keys: ['bold', 'notAKey'] }, 'notAKey');
    await expectInvalid({ target: TARGET, keys: ['bold', 'bold'] }, 'duplicate');
  });

  it('rejects an unknown view', async () => {
    await expectInvalid({ target: TARGET, view: 'computed' }, /effective.*direct/);
  });

  it('validates the story locator', async () => {
    await expectInvalid({ target: TARGET, in: { kind: 'nope' } }, 'in');
  });
});

describe('executeFormatReadSelection normalization', () => {
  it('defaults to every format.apply key and the effective view', async () => {
    const adapter = makeAdapter();
    await executeFormatReadSelection(adapter, { target: TARGET });
    expect(adapter.readSelection).toHaveBeenCalledTimes(1);
    const request = adapter.readSelection.mock.calls[0]![0] as Record<string, unknown>;
    expect(request).toEqual({ target: TARGET, keys: ALL_KEYS, view: 'effective' });
    expect(ALL_KEYS).toHaveLength(43);
  });

  it('passes explicit keys in caller order, view and story through', async () => {
    const adapter = makeAdapter();
    const story = { kind: 'story', storyType: 'body' } as const;
    await executeFormatReadSelection(adapter, {
      target: TARGET,
      keys: ['rFonts', 'bCs', 'bold'],
      view: 'direct',
      in: story,
    });
    expect(adapter.readSelection.mock.calls[0]![0]).toEqual({
      target: TARGET,
      keys: ['rFonts', 'bCs', 'bold'],
      view: 'direct',
      in: story,
    });
  });

  it('forwards ref and current-selection locators unchanged', async () => {
    const adapter = makeAdapter();
    await executeFormatReadSelection(adapter, { ref: 'r1' });
    await executeFormatReadSelection(adapter, { selection: 'current', keys: ['bold'] });
    expect(adapter.readSelection.mock.calls[0]![0]).toEqual({ ref: 'r1', keys: ALL_KEYS, view: 'effective' });
    expect(adapter.readSelection.mock.calls[1]![0]).toEqual({
      selection: 'current',
      keys: ['bold'],
      view: 'effective',
    });
  });

  it('returns the adapter result unchanged', async () => {
    const result: FormatReadSelectionResult = {
      collapsed: true,
      pendingApplied: true,
      properties: { bold: { state: 'uniform', value: true } },
    };
    const adapter = makeAdapter(result);
    expect(await executeFormatReadSelection(adapter, { selection: 'current', keys: ['bold'] })).toBe(result);
  });
});

describe('FormatReadSelectionResult type contract', () => {
  it('types uniform values as the matching format.apply value', () => {
    assertType<InlineReadState<'fontSize'>>({ state: 'uniform', value: 12 });
    assertType<InlineReadState<'bold'>>({ state: 'uniform', value: false });
    assertType<InlineReadState<'rFonts'>>({ state: 'uniform', value: { ascii: 'Arial', eastAsia: 'MS Mincho' } });
    // @ts-expect-error fontSize values are numbers, never strings
    assertType<InlineReadState<'fontSize'>>({ state: 'uniform', value: '12' });
    // A uniform value can be passed straight back to format.apply.
    const state = { state: 'uniform', value: 12 } as InlineReadState<'fontSize'>;
    if (state.state === 'uniform') assertType<InlineRunPatch['fontSize']>(state.value);
  });

  it('allows per-slot detail on mixed object keys', () => {
    assertType<InlineReadState<'rFonts'>>({
      state: 'mixed',
      slots: { ascii: { state: 'uniform', value: 'Arial' }, eastAsia: { state: 'mixed' } },
    });
    assertType<InlineReadState<'lang'>>({ state: 'mixed', slots: { bidi: { state: 'unset' } } });
    assertType<InlineReadState<'bold'>>({ state: 'unresolvable', reason: 'source-unavailable' });
  });
});
