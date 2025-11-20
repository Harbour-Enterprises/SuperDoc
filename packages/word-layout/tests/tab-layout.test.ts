import { describe, expect, it } from 'vitest';

import {
  buildEffectiveTabStopsPx,
  computeTabStops,
  normalizeExplicitTabStops,
  normalizeAlignment,
} from '../src/tab-layout.js';

describe('tab helpers', () => {
  it('normalizes explicit tab stops from px to twips and preserves order', () => {
    const stops = normalizeExplicitTabStops([
      { val: 'left', pos: 48 },
      { val: 'right', originalPos: 1440 },
    ]);

    expect(stops).toEqual([
      { alignment: 'start', positionTwips: 720, leader: undefined },
      { alignment: 'end', positionTwips: 1440, leader: undefined },
    ]);
  });

  it('generates default tab stops when none are provided', () => {
    const stops = computeTabStops({
      defaultTabIntervalTwips: 720,
      startTwips: 0,
    });

    expect(stops).toHaveLength(12);
    expect(stops[0].positionTwips).toBe(720);
    expect(stops[0].alignment).toBe('start');
  });

  it('builds pixel tab stops honoring paragraph indent and decimal separator', () => {
    const stops = buildEffectiveTabStopsPx({
      explicitStops: [{ val: 'decimal', pos: 96, leader: 'dot' }],
      paragraphIndent: { left: 24 },
      defaultTabIntervalTwips: 720,
      decimalSeparator: ',',
    });

    expect(stops[0]).toEqual({
      alignment: 'decimal',
      position: 96,
      leader: 'dot',
      decimalChar: ',',
    });
  });
});

describe('normalizeExplicitTabStops edge cases', () => {
  it('returns empty array for null input', () => {
    const stops = normalizeExplicitTabStops(null);
    expect(stops).toEqual([]);
  });

  it('returns empty array for undefined input', () => {
    const stops = normalizeExplicitTabStops(undefined);
    expect(stops).toEqual([]);
  });

  it('returns empty array for empty array', () => {
    const stops = normalizeExplicitTabStops([]);
    expect(stops).toEqual([]);
  });

  it('skips malformed stop objects (null in array)', () => {
    const stops = normalizeExplicitTabStops([null as any, { val: 'left', pos: 48 }]);
    expect(stops).toHaveLength(1);
    expect(stops[0].alignment).toBe('start');
  });

  it('skips malformed stop objects (undefined in array)', () => {
    const stops = normalizeExplicitTabStops([undefined as any, { val: 'right', pos: 96 }]);
    expect(stops).toHaveLength(1);
    expect(stops[0].alignment).toBe('end');
  });

  it('skips stops without valid alignment', () => {
    const stops = normalizeExplicitTabStops([{ pos: 48 } as any]);
    expect(stops).toEqual([]);
  });

  it('skips stops without valid position', () => {
    const stops = normalizeExplicitTabStops([{ val: 'left' }]);
    expect(stops).toEqual([]);
  });

  it('handles duplicate positions', () => {
    const stops = normalizeExplicitTabStops([
      { val: 'left', pos: 48 },
      { val: 'right', pos: 48 },
    ]);
    expect(stops).toHaveLength(2);
    expect(stops[0].positionTwips).toBe(720);
    expect(stops[1].positionTwips).toBe(720);
  });

  it('handles negative positions', () => {
    const stops = normalizeExplicitTabStops([{ val: 'left', pos: -48 }]);
    expect(stops).toHaveLength(1);
    expect(stops[0].positionTwips).toBeLessThan(0);
  });

  it('handles all leader types', () => {
    const leaders: Array<'none' | 'dot' | 'heavy' | 'hyphen' | 'middleDot' | 'underscore'> = [
      'none',
      'dot',
      'heavy',
      'hyphen',
      'middleDot',
      'underscore',
    ];

    leaders.forEach((leader) => {
      const stops = normalizeExplicitTabStops([{ val: 'left', pos: 48, leader }]);
      expect(stops[0].leader).toBe(leader);
    });
  });

  it('handles all alignment types', () => {
    const alignments = [
      { val: 'left', expected: 'start' },
      { val: 'right', expected: 'end' },
      { val: 'center', expected: 'center' },
      { val: 'decimal', expected: 'decimal' },
      { val: 'bar', expected: 'bar' },
      { val: 'num', expected: 'num' },
      { val: 'start', expected: 'start' },
      { val: 'end', expected: 'end' },
    ];

    alignments.forEach(({ val, expected }) => {
      const stops = normalizeExplicitTabStops([{ val, pos: 48 }]);
      expect(stops[0].alignment).toBe(expected);
    });
  });

  it('handles unknown alignment by defaulting to start', () => {
    const stops = normalizeExplicitTabStops([{ val: 'unknown', pos: 48 }]);
    expect(stops[0].alignment).toBe('start');
  });

  it('sorts stops by position', () => {
    const stops = normalizeExplicitTabStops([
      { val: 'left', pos: 96 },
      { val: 'left', pos: 24 },
      { val: 'left', pos: 48 },
    ]);
    expect(stops[0].positionTwips).toBeLessThan(stops[1].positionTwips);
    expect(stops[1].positionTwips).toBeLessThan(stops[2].positionTwips);
  });

  it('prefers originalPos over pos', () => {
    const stops = normalizeExplicitTabStops([{ val: 'left', originalPos: 1440, pos: 96 }]);
    expect(stops[0].positionTwips).toBe(1440); // originalPos used, not pos
  });

  it('handles NaN position values', () => {
    const stops = normalizeExplicitTabStops([{ val: 'left', pos: NaN }]);
    expect(stops).toEqual([]);
  });

  it('handles Infinity position values', () => {
    const stops = normalizeExplicitTabStops([{ val: 'left', pos: Infinity }]);
    expect(stops).toEqual([]);
  });
});

describe('computeTabStops edge cases', () => {
  it('returns empty array when interval is not provided', () => {
    const stops = computeTabStops({});
    expect(stops).toEqual([]);
  });

  it('returns empty array when interval is zero', () => {
    const stops = computeTabStops({ defaultTabIntervalTwips: 0 });
    expect(stops).toEqual([]);
  });

  it('returns empty array when interval is negative', () => {
    const stops = computeTabStops({ defaultTabIntervalTwips: -720 });
    expect(stops).toEqual([]);
  });

  it('returns empty array when interval is NaN', () => {
    const stops = computeTabStops({ defaultTabIntervalTwips: NaN });
    expect(stops).toEqual([]);
  });

  it('returns empty array when interval is Infinity', () => {
    const stops = computeTabStops({ defaultTabIntervalTwips: Infinity });
    expect(stops).toEqual([]);
  });

  it('uses startTwips as offset for default tabs', () => {
    const stops = computeTabStops({
      defaultTabIntervalTwips: 720,
      startTwips: 360,
    });
    expect(stops[0].positionTwips).toBe(1080); // 360 + 720
  });

  it('returns explicit stops when provided', () => {
    const explicitStops = [
      { alignment: 'start', positionTwips: 100 },
      { alignment: 'end', positionTwips: 200 },
    ];
    const stops = computeTabStops({
      explicitStops,
      defaultTabIntervalTwips: 720,
    });
    expect(stops).toEqual(explicitStops);
  });

  it('filters out falsy values from explicit stops', () => {
    const explicitStops = [
      { alignment: 'start', positionTwips: 100 },
      null as any,
      { alignment: 'end', positionTwips: 200 },
    ];
    const stops = computeTabStops({
      explicitStops,
      defaultTabIntervalTwips: 720,
    });
    expect(stops).toHaveLength(2);
  });

  it('sorts explicit stops by position', () => {
    const explicitStops = [
      { alignment: 'end', positionTwips: 200 },
      { alignment: 'start', positionTwips: 100 },
    ];
    const stops = computeTabStops({
      explicitStops,
      defaultTabIntervalTwips: 720,
    });
    expect(stops[0].positionTwips).toBe(100);
    expect(stops[1].positionTwips).toBe(200);
  });
});

describe('buildEffectiveTabStopsPx edge cases', () => {
  it('handles null paragraphIndent', () => {
    const stops = buildEffectiveTabStopsPx({
      explicitStops: [{ val: 'left', pos: 48 }],
    });
    expect(stops).toHaveLength(1);
  });

  it('handles undefined paragraphIndent', () => {
    const stops = buildEffectiveTabStopsPx({
      explicitStops: [{ val: 'left', pos: 48 }],
      paragraphIndent: undefined,
    });
    expect(stops).toHaveLength(1);
  });

  it('uses default interval when both paragraph and default are missing', () => {
    const stops = buildEffectiveTabStopsPx({});
    expect(stops).toHaveLength(12); // MAX_DEFAULT_TABS
  });

  it('prefers paragraphTabIntervalTwips over defaultTabIntervalTwips', () => {
    const stops = buildEffectiveTabStopsPx({
      paragraphTabIntervalTwips: 360,
      defaultTabIntervalTwips: 720,
    });
    expect(stops[0].position).toBe(24); // 360 twips converted to pixels
  });

  it('omits decimalChar when alignment is not decimal', () => {
    const stops = buildEffectiveTabStopsPx({
      explicitStops: [{ val: 'left', pos: 48 }],
      decimalSeparator: ',',
    });
    expect(stops[0]).not.toHaveProperty('decimalChar');
  });

  it('includes decimalChar when alignment is decimal', () => {
    const stops = buildEffectiveTabStopsPx({
      explicitStops: [{ val: 'decimal', pos: 48 }],
      decimalSeparator: ',',
    });
    expect(stops[0].decimalChar).toBe(',');
  });

  it('handles all paragraph indent properties', () => {
    const stops = buildEffectiveTabStopsPx({
      paragraphIndent: {
        left: 10,
        right: 20,
        firstLine: 5,
        hanging: 8,
      },
      defaultTabIntervalTwips: 720,
    });
    expect(stops).toHaveLength(12);
  });
});

describe('normalizeAlignment', () => {
  it('handles case-insensitive LEFT', () => {
    expect(normalizeAlignment('LEFT')).toBe('start');
  });

  it('handles case-insensitive Right', () => {
    expect(normalizeAlignment('Right')).toBe('end');
  });

  it('handles case-insensitive CENTER', () => {
    expect(normalizeAlignment('CENTER')).toBe('center');
  });

  it('handles case-insensitive Decimal', () => {
    expect(normalizeAlignment('Decimal')).toBe('decimal');
  });

  it('handles case-insensitive BAR', () => {
    expect(normalizeAlignment('BAR')).toBe('bar');
  });

  it('handles case-insensitive Num', () => {
    expect(normalizeAlignment('Num')).toBe('num');
  });

  it('returns null for empty string', () => {
    expect(normalizeAlignment('')).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(normalizeAlignment(undefined)).toBeNull();
  });

  it('defaults unknown values to start', () => {
    expect(normalizeAlignment('unknown')).toBe('start');
  });

  it('defaults invalid values to start', () => {
    expect(normalizeAlignment('xyz123')).toBe('start');
  });

  it('maps left to start', () => {
    expect(normalizeAlignment('left')).toBe('start');
  });

  it('maps right to end', () => {
    expect(normalizeAlignment('right')).toBe('end');
  });

  it('preserves center', () => {
    expect(normalizeAlignment('center')).toBe('center');
  });

  it('preserves decimal', () => {
    expect(normalizeAlignment('decimal')).toBe('decimal');
  });

  it('preserves bar', () => {
    expect(normalizeAlignment('bar')).toBe('bar');
  });

  it('preserves num', () => {
    expect(normalizeAlignment('num')).toBe('num');
  });

  it('preserves start', () => {
    expect(normalizeAlignment('start')).toBe('start');
  });

  it('preserves end', () => {
    expect(normalizeAlignment('end')).toBe('end');
  });

  it('handles whitespace in values', () => {
    expect(normalizeAlignment('  left  ')).toBe('start');
  });

  it('handles whitespace with center', () => {
    expect(normalizeAlignment(' center ')).toBe('center');
  });

  it('handles tab characters', () => {
    expect(normalizeAlignment('\tright\t')).toBe('end');
  });

  it('handles mixed whitespace', () => {
    expect(normalizeAlignment(' \t decimal \n ')).toBe('decimal');
  });
});

describe('MAX_DEFAULT_TABS', () => {
  it('generates exactly 12 default tabs with normal interval', () => {
    const stops = computeTabStops({
      defaultTabIntervalTwips: 720,
      startTwips: 0,
    });
    expect(stops).toHaveLength(12);
  });

  it('generates exactly 12 default tabs with small interval', () => {
    const stops = computeTabStops({
      defaultTabIntervalTwips: 100,
      startTwips: 0,
    });
    expect(stops).toHaveLength(12);
  });

  it('generates exactly 12 default tabs with large interval', () => {
    const stops = computeTabStops({
      defaultTabIntervalTwips: 2000,
      startTwips: 0,
    });
    expect(stops).toHaveLength(12);
  });

  it('generates no more than 12 tabs even with tiny interval', () => {
    const stops = computeTabStops({
      defaultTabIntervalTwips: 1,
      startTwips: 0,
    });
    expect(stops).toHaveLength(12);
  });

  it('all default tabs have start alignment', () => {
    const stops = computeTabStops({
      defaultTabIntervalTwips: 720,
      startTwips: 0,
    });
    expect(stops.every((stop) => stop.alignment === 'start')).toBe(true);
  });

  it('default tabs are positioned at correct intervals', () => {
    const interval = 720;
    const stops = computeTabStops({
      defaultTabIntervalTwips: interval,
      startTwips: 0,
    });
    for (let i = 0; i < 12; i++) {
      expect(stops[i].positionTwips).toBe((i + 1) * interval);
    }
  });

  it('default tabs respect startTwips offset', () => {
    const interval = 720;
    const start = 360;
    const stops = computeTabStops({
      defaultTabIntervalTwips: interval,
      startTwips: start,
    });
    for (let i = 0; i < 12; i++) {
      expect(stops[i].positionTwips).toBe(start + (i + 1) * interval);
    }
  });
});

describe('alignment validation edge cases', () => {
  it('normalizeExplicitTabStops handles invalid alignments by using fallback', () => {
    const stops = normalizeExplicitTabStops([{ val: 'invalid-alignment', pos: 48 }]);
    expect(stops).toHaveLength(1);
    expect(stops[0].alignment).toBe('start');
  });

  it('normalizeExplicitTabStops handles empty string alignment', () => {
    const stops = normalizeExplicitTabStops([{ val: '', pos: 48 }]);
    expect(stops).toHaveLength(0); // Empty alignment returns null, which is filtered out
  });

  it('normalizeExplicitTabStops handles mixed case alignments', () => {
    const stops = normalizeExplicitTabStops([
      { val: 'LeFt', pos: 24 },
      { val: 'RiGhT', pos: 48 },
      { val: 'CeNtEr', pos: 72 },
    ]);
    expect(stops).toHaveLength(3);
    expect(stops[0].alignment).toBe('start');
    expect(stops[1].alignment).toBe('end');
    expect(stops[2].alignment).toBe('center');
  });

  it('normalizeExplicitTabStops trims whitespace from alignment values', () => {
    const stops = normalizeExplicitTabStops([
      { val: '  left  ', pos: 24 },
      { val: '\tright\t', pos: 48 },
    ]);
    expect(stops).toHaveLength(2);
    expect(stops[0].alignment).toBe('start');
    expect(stops[1].alignment).toBe('end');
  });

  it('buildEffectiveTabStopsPx produces strongly-typed alignments', () => {
    const stops = buildEffectiveTabStopsPx({
      explicitStops: [
        { val: 'left', pos: 24 },
        { val: 'center', pos: 48 },
        { val: 'decimal', pos: 72 },
      ],
    });
    expect(stops).toHaveLength(3);
    expect(stops[0].alignment).toBe('start');
    expect(stops[1].alignment).toBe('center');
    expect(stops[2].alignment).toBe('decimal');
  });

  it('buildEffectiveTabStopsPx handles unknown alignments with fallback', () => {
    const stops = buildEffectiveTabStopsPx({
      explicitStops: [{ val: 'unknown', pos: 48 }],
    });
    expect(stops).toHaveLength(1);
    expect(stops[0].alignment).toBe('start');
  });
});

describe('zero handling with nullish coalescing', () => {
  it('handles zero left indent correctly', () => {
    const stops = buildEffectiveTabStopsPx({
      paragraphIndent: { left: 0 },
      defaultTabIntervalTwips: 720,
    });
    expect(stops[0].position).toBe(48); // First tab at 720 twips = 48px, not offset by indent
  });

  it('handles undefined left indent correctly', () => {
    const stops = buildEffectiveTabStopsPx({
      paragraphIndent: { left: undefined },
      defaultTabIntervalTwips: 720,
    });
    expect(stops[0].position).toBe(48); // First tab at 720 twips = 48px
  });

  it('handles null left indent correctly', () => {
    const stops = buildEffectiveTabStopsPx({
      paragraphIndent: { left: null as any },
      defaultTabIntervalTwips: 720,
    });
    expect(stops[0].position).toBe(48); // First tab at 720 twips = 48px
  });

  it('handles positive left indent correctly', () => {
    const stops = buildEffectiveTabStopsPx({
      paragraphIndent: { left: 24 },
      defaultTabIntervalTwips: 720,
    });
    // left indent of 24px = 360 twips, first tab at 360 + 720 = 1080 twips = 72px
    expect(stops[0].position).toBe(72);
  });
});
