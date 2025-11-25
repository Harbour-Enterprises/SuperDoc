import { describe, expect, it } from 'vitest';
import { calculateTabWidth, computeTabStops, layoutWithTabs } from './tabs.js';

describe('engines-tabs computeTabStops', () => {
  it('merges explicit and default stops and filters by indent', () => {
    const stops = computeTabStops({
      explicitStops: [
        { val: 'start', pos: 720, leader: 'none' }, // 720 twips = 0.5"
        { val: 'end', pos: 1440, leader: 'dot' }, // 1440 twips = 1"
      ],
      defaultTabInterval: 720, // 0.5 inch in twips
      paragraphIndent: { left: 360 }, // 0.25 inch in twips
    });

    expect(stops[0].pos).toBeGreaterThanOrEqual(360);
    expect(stops.find((stop) => stop.pos === 1440)?.val).toBe('end');
  });

  it('filters out clear tabs', () => {
    const stops = computeTabStops({
      explicitStops: [
        { val: 'start', pos: 720, leader: 'none' },
        { val: 'clear', pos: 1440, leader: 'none' }, // Should be filtered
        { val: 'decimal', pos: 2160, leader: 'dot' },
      ],
      defaultTabInterval: 720,
      paragraphIndent: { left: 0 },
    });

    expect(stops.find((stop) => stop.val === 'clear')).toBeUndefined();
    expect(stops.find((stop) => stop.pos === 720)).toBeDefined();
    expect(stops.find((stop) => stop.pos === 2160)).toBeDefined();
  });

  it('clear tabs suppress default stops within 20 twips tolerance', () => {
    // OOXML spec: clear tab at 1440 should prevent default stop from being generated there
    const stops = computeTabStops({
      explicitStops: [
        { val: 'clear', pos: 1440, leader: 'none' }, // Clear at 1440 (1.0")
      ],
      defaultTabInterval: 720, // Default every 720 twips (0.5")
      paragraphIndent: { left: 0 },
    });

    // Should have default stops at 720, 2160, 2880, etc. but NOT at 1440
    expect(stops.find((stop) => Math.abs(stop.pos - 720) < 20)).toBeDefined(); // 0.5"
    expect(stops.find((stop) => Math.abs(stop.pos - 1440) < 20)).toBeUndefined(); // 1.0" CLEARED
    expect(stops.find((stop) => Math.abs(stop.pos - 2160) < 20)).toBeDefined(); // 1.5"
  });

  it('clear tabs suppress stops within tolerance even with slight offset', () => {
    // Clear at 1438 should suppress default at 1440 (within 20 twips tolerance)
    const stops = computeTabStops({
      explicitStops: [
        { val: 'clear', pos: 1438, leader: 'none' }, // 2 twips off
      ],
      defaultTabInterval: 720,
      paragraphIndent: { left: 0 },
    });

    // Default at 1440 should be suppressed due to clear at 1438 (within 20 twips)
    expect(stops.find((stop) => Math.abs(stop.pos - 1440) < 20)).toBeUndefined();
  });

  it('adds default tabs with start alignment', () => {
    const stops = computeTabStops({
      explicitStops: [],
      defaultTabInterval: 720,
      paragraphIndent: { left: 0 },
    });

    const firstDefault = stops.find((stop) => stop.pos === 720);
    expect(firstDefault?.val).toBe('start');
    expect(firstDefault?.leader).toBe('none');
  });
});

describe('engines-tabs layoutWithTabs', () => {
  it('advances to the next tab stop', () => {
    const stops = [
      { val: 'start', pos: 720, leader: 'none' },
      { val: 'decimal', pos: 1440, leader: 'dot' },
    ];

    const runs = [
      { run: 'First', width: 20 },
      { run: '\t', width: 0, isTab: true },
      { run: 'Second', width: 25 },
    ];

    const positioned = layoutWithTabs(runs, stops, 2000);
    const tabRun = positioned.find((entry) => entry.tabStop);
    expect(tabRun?.tabStop?.pos).toBe(720);
    const secondRun = positioned.find((entry) => entry.run === 'Second');
    expect(secondRun?.x).toBe(720);
  });

  it('aligns decimal text so the separator sits on the tab stop', () => {
    const stops = [{ val: 'decimal', pos: 1000, leader: 'none' }];

    const runs = [
      { run: '\t', width: 0, isTab: true },
      { run: 'Price', width: 40, text: '12.99' },
    ];

    const positioned = layoutWithTabs(runs, stops, 2000, {
      measureTextWidth: (_run, text) => text.length * 5,
    });

    const priceRun = positioned.find((entry) => entry.run === 'Price');
    // Decimal at index 2: "12" = 10px, so x = 1000 - 10 = 990
    expect(priceRun?.x).toBe(990);
  });

  it('aligns decimal text using a comma separator', () => {
    const stops = [{ val: 'decimal', pos: 1000, leader: 'none' }];

    const runs = [
      { run: '\t', width: 0, isTab: true },
      { run: 'PriceComma', width: 40, text: '12,99' },
    ];

    const positioned = layoutWithTabs(runs, stops, 2000, {
      measureTextWidth: (_run, text) => text.length * 5,
      decimalSeparator: ',',
    });

    const priceRun = positioned.find((entry) => entry.run === 'PriceComma');
    // Decimal comma at index 2: "12" = 10px, so x = 1000 - 10 = 990
    expect(priceRun?.x).toBe(990);
  });

  it('falls back to stop position when decimal separator missing', () => {
    const stops = [{ val: 'decimal', pos: 1600, leader: 'none' }];
    const runs = [
      { run: '\t', width: 0, isTab: true },
      { run: 'Label', width: 30, text: 'Total' },
    ];

    const positioned = layoutWithTabs(runs, stops, 2000);
    const labelRun = positioned.find((entry) => entry.run === 'Label');
    expect(labelRun?.x).toBe(1600);
  });

  it('centers text at center tab stop', () => {
    const stops = [{ val: 'center', pos: 1000, leader: 'none' }];
    const runs = [
      { run: '\t', width: 0, isTab: true },
      { run: 'Centered', width: 60 },
    ];

    const positioned = layoutWithTabs(runs, stops, 2000);
    const centeredRun = positioned.find((entry) => entry.run === 'Centered');
    // Text width = 60, so x = 1000 - (60/2) = 970
    expect(centeredRun?.x).toBe(970);
  });

  it('centers text with measureTextWidth callback', () => {
    const stops = [{ val: 'center', pos: 800, leader: 'none' }];
    const runs = [
      { run: '\t', width: 0, isTab: true },
      { run: 'Title', width: 40, text: 'Title' },
    ];

    const positioned = layoutWithTabs(runs, stops, 2000, {
      measureTextWidth: (_run, text) => text.length * 8,
    });

    const titleRun = positioned.find((entry) => entry.run === 'Title');
    // measureTextWidth returns 40 (5 chars * 8), so x = 800 - 20 = 780
    expect(titleRun?.x).toBe(780);
  });

  it('right-aligns text at end tab stop', () => {
    const stops = [{ val: 'end', pos: 1200, leader: 'none' }];
    const runs = [
      { run: '\t', width: 0, isTab: true },
      { run: 'RightAlign', width: 80 },
    ];

    const positioned = layoutWithTabs(runs, stops, 2000);
    const rightRun = positioned.find((entry) => entry.run === 'RightAlign');
    // Text width = 80, so x = 1200 - 80 = 1120
    expect(rightRun?.x).toBe(1120);
  });

  it('right-aligns text with measureTextWidth callback', () => {
    const stops = [{ val: 'end', pos: 1500, leader: 'none' }];
    const runs = [
      { run: '\t', width: 0, isTab: true },
      { run: 'Amount', width: 50, text: 'Amount' },
    ];

    const positioned = layoutWithTabs(runs, stops, 2000, {
      measureTextWidth: (_run, text) => text.length * 10,
    });

    const amountRun = positioned.find((entry) => entry.run === 'Amount');
    // measureTextWidth returns 60 (6 chars * 10), but we use run width = 50
    // x = 1500 - 50 = 1450
    expect(amountRun?.x).toBe(1450);
  });

  it('handles mixed alignment types on same line', () => {
    const stops = [
      { val: 'start', pos: 400, leader: 'none' },
      { val: 'center', pos: 1000, leader: 'none' },
      { val: 'end', pos: 1800, leader: 'none' },
    ];

    const runs = [
      { run: '\t', width: 0, isTab: true }, // Tab to 400 (start)
      { run: 'Left', width: 30 }, // Start at 400
      { run: '\t', width: 0, isTab: true }, // Tab to 1000 (center)
      { run: 'Center', width: 40 }, // Center at 1000
      { run: '\t', width: 0, isTab: true }, // Tab to 1800 (end)
      { run: 'Right', width: 50 }, // End at 1800
    ];

    const positioned = layoutWithTabs(runs, stops, 2000);

    const leftRun = positioned.find((entry) => entry.run === 'Left');
    expect(leftRun?.x).toBe(400); // Start alignment

    const centerRun = positioned.find((entry) => entry.run === 'Center');
    expect(centerRun?.x).toBe(980); // 1000 - 40/2 = 980

    const rightRun = positioned.find((entry) => entry.run === 'Right');
    expect(rightRun?.x).toBe(1750); // 1800 - 50 = 1750
  });

  it('handles center and end with decimal alignment', () => {
    const stops = [
      { val: 'center', pos: 500, leader: 'none' },
      { val: 'decimal', pos: 1000, leader: 'none' },
      { val: 'end', pos: 1500, leader: 'none' },
    ];

    const runs = [
      { run: '\t', width: 0, isTab: true },
      { run: 'Header', width: 60 },
      { run: '\t', width: 0, isTab: true },
      { run: 'Price', width: 40, text: '99.99' },
      { run: '\t', width: 0, isTab: true },
      { run: 'Total', width: 50 },
    ];

    const positioned = layoutWithTabs(runs, stops, 2000, {
      measureTextWidth: (_run, text) => text.length * 5,
    });

    const headerRun = positioned.find((entry) => entry.run === 'Header');
    expect(headerRun?.x).toBe(470); // 500 - 60/2 = 470

    const priceRun = positioned.find((entry) => entry.run === 'Price');
    // Decimal at index 2: "99" = 10px, so x = 1000 - 10 = 990
    expect(priceRun?.x).toBe(990);

    const totalRun = positioned.find((entry) => entry.run === 'Total');
    expect(totalRun?.x).toBe(1450); // 1500 - 50 = 1450
  });

  it('clamps center alignment to prevent negative x position', () => {
    const stops = [{ val: 'center', pos: 20, leader: 'none' }];
    const runs = [
      { run: '\t', width: 0, isTab: true },
      { run: 'Wide', width: 100 },
    ];

    const positioned = layoutWithTabs(runs, stops, 2000);
    const wideRun = positioned.find((entry) => entry.run === 'Wide');
    // Would be 20 - 50 = -30, but clamped to 0
    expect(wideRun?.x).toBe(0);
  });

  it('clamps end alignment to prevent negative x position', () => {
    const stops = [{ val: 'end', pos: 30, leader: 'none' }];
    const runs = [
      { run: '\t', width: 0, isTab: true },
      { run: 'VeryWide', width: 100 },
    ];

    const positioned = layoutWithTabs(runs, stops, 2000);
    const veryWideRun = positioned.find((entry) => entry.run === 'VeryWide');
    // Would be 30 - 100 = -70, but clamped to 0
    expect(veryWideRun?.x).toBe(0);
  });
});

describe('calculateTabWidth', () => {
  const baseParams = {
    paragraphWidth: 200,
    defaultTabDistance: 48,
    defaultLineLength: 816,
    tabStops: [{ val: 'start', pos: 100, leader: 'none' } as const],
  };

  it('uses next tab stop for start alignment', () => {
    const result = calculateTabWidth({
      ...baseParams,
      currentX: 40,
      followingText: 'after',
    });
    expect(result.width).toBe(60);
    expect(result.alignment).toBe('start');
    expect(result.tabStopPosUsed).toBe(100);
  });

  it('falls back to default grid when no stop', () => {
    const result = calculateTabWidth({
      ...baseParams,
      tabStops: [],
      currentX: 50,
    });
    expect(result.alignment).toBe('default');
    expect(result.tabStopPosUsed).toBe('default');
    expect(result.width).toBeGreaterThan(0);
  });

  it('applies center alignment offset', () => {
    const result = calculateTabWidth({
      ...baseParams,
      tabStops: [{ val: 'center', pos: 150, leader: 'dot' }],
      currentX: 50,
      followingText: 'abcd',
      measureText: (text) => text.length * 5,
    });
    // base width = 100, adjust by half of followingText (4*5/2 = 10)
    expect(Math.round(result.width)).toBe(90);
    expect(result.alignment).toBe('center');
    expect(result.leader).toBe('dot');
  });

  it('applies decimal alignment with custom separator', () => {
    const result = calculateTabWidth({
      ...baseParams,
      tabStops: [{ val: 'decimal', pos: 160 }],
      currentX: 40,
      followingText: '12,34',
      decimalSeparator: ',',
      measureText: (text) => text.length * 4,
    });
    // base width = 120; before decimal "12" = 8px; width should subtract 8
    expect(result.width).toBe(112);
    expect(result.alignment).toBe('decimal');
  });

  it('returns zero width for bar tabs', () => {
    const result = calculateTabWidth({
      ...baseParams,
      tabStops: [{ val: 'bar', pos: 120 }],
      currentX: 60,
    });
    expect(result.width).toBe(0);
    expect(result.alignment).toBe('bar');
  });
});
