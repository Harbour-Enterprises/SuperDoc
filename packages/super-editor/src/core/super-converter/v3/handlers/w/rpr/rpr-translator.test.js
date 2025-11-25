import { describe, it, expect } from 'vitest';
import { translator } from './rpr-translator.js';

const makeParams = (elements = []) => ({
  nodes: [
    {
      name: 'w:rPr',
      elements,
    },
  ],
});

describe('w:rPr translator (attribute aggregator)', () => {
  it('aggregates run property children via their translators', () => {
    const params = makeParams([
      { name: 'w:b', attributes: { 'w:val': '1' } },
      { name: 'w:color', attributes: { 'w:val': 'FF0000' } },
    ]);

    const result = translator.encode(params);

    expect(result?.attributes).toEqual([
      { xmlName: 'w:b', attributes: {} },
      { xmlName: 'w:color', attributes: { 'w:val': 'FF0000' } },
    ]);
  });

  it('preserves raw entries for supported children without dedicated translators', () => {
    const params = makeParams([
      { name: 'w:lang', attributes: { 'w:val': 'en-US' } },
      { name: 'w:shd', attributes: { 'w:fill': 'CCCCCC', 'w:val': 'clear' } },
    ]);

    const result = translator.encode(params);

    expect(result?.attributes).toEqual([
      { xmlName: 'w:lang', attributes: { 'w:val': 'en-US' } },
      { xmlName: 'w:shd', attributes: { 'w:fill': 'CCCCCC', 'w:val': 'clear' } },
    ]);
  });

  it('ignores unsupported children', () => {
    const params = makeParams([{ name: 'w:foo', attributes: { 'w:val': 'noop' } }]);

    const result = translator.encode(params);

    expect(result?.attributes).toEqual([]);
  });
});
