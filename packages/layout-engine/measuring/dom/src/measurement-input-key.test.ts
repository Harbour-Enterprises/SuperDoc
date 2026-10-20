import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  isImmutableMeasurementInput,
  memoizedMeasurementInputKey,
  readMeasurementInputKeyMemoStats,
  resetMeasurementInputKeyMemoStats,
  serializeMeasurementInput,
} from './measurement-input-key.js';

describe('serializeMeasurementInput', () => {
  it('omits structural object ids but preserves output-bearing inline-box ids', () => {
    const input = (blockId: string, inlineBoxId: string) => ({
      block: {
        kind: 'paragraph',
        id: blockId,
        runs: [{ text: 'Citation' }],
        inlineBoxes: [
          {
            id: inlineBoxId,
            from: 0,
            to: 8,
            layout: { paddingInlineStart: 4 },
            appearance: { backgroundColor: '#eef2ff' },
          },
        ],
      },
    });

    expect(serializeMeasurementInput(input('paragraph-a', 'citation'), { omitObjectIds: true })).toBe(
      serializeMeasurementInput(input('paragraph-b', 'citation'), { omitObjectIds: true }),
    );
    expect(serializeMeasurementInput(input('paragraph-a', 'citation-a'), { omitObjectIds: true })).not.toBe(
      serializeMeasurementInput(input('paragraph-a', 'citation-b'), { omitObjectIds: true }),
    );
  });
});

describe('memoizedMeasurementInputKey', () => {
  beforeEach(() => resetMeasurementInputKeyMemoStats());

  const frozenCell = () =>
    Object.freeze({
      attrs: Object.freeze({ padding: Object.freeze({ top: 0, left: 4, right: 4, bottom: 0 }) }),
      blocks: Object.freeze([
        Object.freeze({
          kind: 'paragraph',
          id: 'p',
          runs: Object.freeze([Object.freeze({ text: 'cell', pmStart: 1, pmEnd: 5 })]),
        }),
      ]),
    });

  it('serializes a deep-frozen owner once per variant', () => {
    const cell = frozenCell();
    let builds = 0;
    const build = () => {
      builds += 1;
      return serializeMeasurementInput({ cell });
    };
    const first = memoizedMeasurementInputKey(cell, 'a', build);
    expect(memoizedMeasurementInputKey(cell, 'a', build)).toBe(first);
    expect(builds).toBe(1);
    memoizedMeasurementInputKey(cell, 'b', build);
    expect(builds).toBe(2);
    expect(readMeasurementInputKeyMemoStats()).toEqual({ hits: 1, misses: 2, uncertified: 0 });
  });

  it('never memoizes an owner that is not deep-frozen plain data', () => {
    const shallow = Object.freeze({ blocks: [{ kind: 'paragraph', runs: [] }] });
    const withPrototype = Object.freeze(
      new (class Cell {
        blocks = Object.freeze([]);
      })(),
    );
    let builds = 0;
    const build = () => `key-${(builds += 1)}`;
    expect(memoizedMeasurementInputKey(shallow, 'a', build)).toBe('key-1');
    expect(memoizedMeasurementInputKey(shallow, 'a', build)).toBe('key-2');
    expect(memoizedMeasurementInputKey(withPrototype, 'a', build)).toBe('key-3');
    expect(isImmutableMeasurementInput(shallow)).toBe(false);
    expect(isImmutableMeasurementInput(frozenCell())).toBe(true);
    expect(readMeasurementInputKeyMemoStats()).toEqual({ hits: 0, misses: 0, uncertified: 3 });
  });

  it('keeps distinct owners with equal content apart from each other', () => {
    const left = frozenCell();
    const right = frozenCell();
    const build = (label: string) => () => label;
    expect(memoizedMeasurementInputKey(left, 'a', build('left'))).toBe('left');
    expect(memoizedMeasurementInputKey(right, 'a', build('right'))).toBe('right');
  });

  it('rejects frozen accessors without evaluating them during certification', () => {
    let text = 'before';
    const read = vi.fn(() => text);
    const owner = Object.freeze({
      runs: Object.freeze([
        Object.freeze({
          get text() {
            return read();
          },
        }),
      ]),
    });
    expect(isImmutableMeasurementInput(owner)).toBe(false);
    expect(read).not.toHaveBeenCalled();
    const build = () => serializeMeasurementInput(owner);
    const first = memoizedMeasurementInputKey(owner, 'same', build);
    text = 'after';
    expect(memoizedMeasurementInputKey(owner, 'same', build)).not.toBe(first);
  });

  it('rejects frozen array accessors and custom map behavior', () => {
    const read = vi.fn(() => Object.freeze({ text: 'value' }));
    const indexed: unknown[] = [];
    Object.defineProperty(indexed, '0', { get: read, enumerable: true });
    expect(isImmutableMeasurementInput(Object.freeze(indexed))).toBe(false);
    expect(read).not.toHaveBeenCalled();
    const custom = [Object.freeze({ text: 'value' })];
    Object.defineProperty(custom, 'map', { value: () => ['changing serialization'] });
    expect(isImmutableMeasurementInput(Object.freeze(custom))).toBe(false);
  });
});
