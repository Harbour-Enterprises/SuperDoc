import { describe, it, expect, beforeEach } from 'vite-plus/test';
// Fresh isolated documents from the happy-dom test environment (see
// vitest.config.mjs) - the painter package deliberately has no jsdom
// dependency, so a direct `import "jsdom"` fails vite's transform here
// (persistent-page rendering preflight plan, workstream 8).
const createTestDocument = (): Document => document.implementation.createHTMLDocument('painter-test');

import { createChartElement, createChartPlaceholder, formatTickValue } from './chart-renderer.js';
import type { ChartModel, DrawingGeometry } from '@superdoc/contracts';

let doc: Document;

beforeEach(() => {
  doc = createTestDocument();
});

const defaultGeometry: DrawingGeometry = { width: 400, height: 300, rotation: 0, flipH: false, flipV: false };

function makeBarChart(overrides: Partial<ChartModel> = {}): ChartModel {
  return {
    chartType: 'barChart',
    barDirection: 'col',
    series: [{ name: 'Series 1', categories: ['Q1', 'Q2', 'Q3'], values: [100, 200, 150] }],
    legendPosition: 'r',
    ...overrides,
  };
}

function makePieChart(overrides: Partial<ChartModel> = {}): ChartModel {
  return {
    chartType: 'pieChart',
    series: [{ name: 'Sales', categories: ['1st Qtr', '2nd Qtr', '3rd Qtr', '4th Qtr'], values: [8.2, 3.2, 1.4, 1.2] }],
    legendPosition: 'b',
    ...overrides,
  };
}

function makeLineChart(overrides: Partial<ChartModel> = {}): ChartModel {
  return {
    chartType: 'lineChart',
    series: [
      { name: 'Series 1', categories: ['Q1', 'Q2', 'Q3', 'Q4'], values: [10, 24, 18, 31] },
      { name: 'Series 2', categories: ['Q1', 'Q2', 'Q3', 'Q4'], values: [8, 12, 20, 25] },
    ],
    legendPosition: 'b',
    ...overrides,
  };
}

function makeAreaChart(overrides: Partial<ChartModel> = {}): ChartModel {
  return {
    chartType: 'areaChart',
    series: [{ name: 'Series 1', categories: ['Q1', 'Q2', 'Q3', 'Q4'], values: [10, 24, 18, 31] }],
    legendPosition: 'b',
    ...overrides,
  };
}

function makeDoughnutChart(overrides: Partial<ChartModel> = {}): ChartModel {
  return {
    chartType: 'doughnutChart',
    series: [{ name: 'Sales', categories: ['1st Qtr', '2nd Qtr', '3rd Qtr', '4th Qtr'], values: [8.2, 3.2, 1.4, 1.2] }],
    legendPosition: 'b',
    ...overrides,
  };
}

function makeScatterChart(overrides: Partial<ChartModel> = {}): ChartModel {
  return {
    chartType: 'scatterChart',
    series: [{ name: 'Series 1', categories: [], values: [12, 30, 22, 35], xValues: [1, 2, 3, 4] }],
    legendPosition: 'b',
    ...overrides,
  };
}

function makeBubbleChart(overrides: Partial<ChartModel> = {}): ChartModel {
  return {
    chartType: 'bubbleChart',
    series: [
      {
        name: 'Series 1',
        categories: [],
        values: [10, 18, 26],
        xValues: [1, 3, 5],
        bubbleSizes: [4, 8, 16],
      },
    ],
    legendPosition: 'r',
    ...overrides,
  };
}

function makeRadarChart(overrides: Partial<ChartModel> = {}): ChartModel {
  return {
    chartType: 'radarChart',
    series: [
      { name: 'Series 1', categories: ['Speed', 'Design', 'Quality', 'Cost'], values: [65, 80, 72, 55] },
      { name: 'Series 2', categories: ['Speed', 'Design', 'Quality', 'Cost'], values: [58, 66, 81, 70] },
    ],
    legendPosition: 'b',
    ...overrides,
  };
}

describe('formatTickValue', () => {
  it('formats millions', () => expect(formatTickValue(2_500_000)).toBe('2.5M'));
  it('formats thousands', () => expect(formatTickValue(4_500)).toBe('4.5K'));
  it('formats integers', () => expect(formatTickValue(42)).toBe('42'));
  it('formats decimals', () => expect(formatTickValue(3.14)).toBe('3.1'));
  it('formats negative millions', () => expect(formatTickValue(-1_000_000)).toBe('-1.0M'));
});

describe('createChartElement', () => {
  it('uses horizontal value geometry and vertical category labels for bar direction', () => {
    const chart = makeBarChart({
      barDirection: 'bar',
      legendPosition: undefined,
      series: [{ name: 'Values', categories: ['Alpha', 'Beta', 'Gamma'], values: [2, 5, 8] }],
    });
    const horizontal = createChartElement(doc, chart, defaultGeometry);
    const columns = createChartElement(doc, { ...chart, barDirection: 'col' }, defaultGeometry);
    const bars = Array.from(horizontal.querySelectorAll('svg rect'));
    const number = (el: Element, attr: string) => Number(el.getAttribute(attr));
    expect(bars).toHaveLength(3);
    expect(bars.map((bar) => number(bar, 'x'))).toEqual([60, 60, 60]);
    expect(number(bars[1]!, 'width') / number(bars[0]!, 'width')).toBeCloseTo(5 / 2);
    expect(number(bars[2]!, 'width') / number(bars[0]!, 'width')).toBeCloseTo(8 / 2);
    expect(number(bars[0]!, 'y')).toBeGreaterThan(number(bars[1]!, 'y'));
    expect(number(bars[1]!, 'y')).toBeGreaterThan(number(bars[2]!, 'y'));
    const labels = Array.from(horizontal.querySelectorAll('text')).filter((el) =>
      chart.series[0]!.categories.includes(el.textContent!),
    );
    expect(labels.map((label) => label.textContent)).toEqual(['Alpha', 'Beta', 'Gamma']);
    expect(new Set(labels.map((label) => label.getAttribute('x'))).size).toBe(1);
    const ticks = Array.from(horizontal.querySelectorAll('text')).filter(
      (el) => !chart.series[0]!.categories.includes(el.textContent!),
    );
    expect(new Set(ticks.map((label) => label.getAttribute('y'))).size).toBe(1);
    expect(number(ticks[0]!, 'x')).toBeLessThan(number(ticks.at(-1)!, 'x'));
    expect(horizontal.outerHTML).not.toEqual(columns.outerHTML);
    const columnBars = Array.from(columns.querySelectorAll('svg rect'));
    expect(new Set(columnBars.map((bar) => bar.getAttribute('width'))).size).toBe(1);
    expect(new Set(columnBars.map((bar) => bar.getAttribute('x'))).size).toBe(3);
    expect(chart.series[0]!.values).toEqual([2, 5, 8]);
  });

  it('keeps grouped horizontal series and negative values on their side of zero', () => {
    const chart = makeBarChart({
      barDirection: 'bar',
      legendPosition: undefined,
      series: [
        { name: 'First', categories: ['A', 'B'], values: [-2, 4] },
        { name: 'Second', categories: ['A', 'B'], values: [2, -4] },
      ],
    });
    const el = createChartElement(doc, chart, defaultGeometry);
    const bars = Array.from(el.querySelectorAll('svg rect'));
    const x = (index: number) => Number(bars[index]!.getAttribute('x'));
    const right = (index: number) => x(index) + Number(bars[index]!.getAttribute('width'));
    expect(bars).toHaveLength(4);
    expect(right(0)).toBeCloseTo(x(1));
    expect(right(3)).toBeCloseTo(x(2));
    expect(x(1)).toBeCloseTo(x(2));
    expect(bars[0]!.getAttribute('y')).not.toBe(bars[2]!.getAttribute('y'));
    expect(bars[0]!.getAttribute('fill')).toBe(bars[1]!.getAttribute('fill'));
    expect(bars[2]!.getAttribute('fill')).not.toBe(bars[0]!.getAttribute('fill'));
  });

  it('maps reversed horizontal axes without changing data order', () => {
    const chart = makeBarChart({
      barDirection: 'bar',
      legendPosition: undefined,
      categoryAxis: { orientation: 'maxMin' },
      valueAxis: { orientation: 'maxMin' },
      series: [{ name: 'Values', categories: ['A', 'B'], values: [2, 5] }],
    });
    const el = createChartElement(doc, chart, defaultGeometry);
    const bars = Array.from(el.querySelectorAll('svg rect'));
    expect(Number(bars[0]!.getAttribute('y'))).toBeLessThan(Number(bars[1]!.getAttribute('y')));
    expect(Number(bars[0]!.getAttribute('x'))).toBeGreaterThan(Number(bars[1]!.getAttribute('x')));
    expect(Number(bars[0]!.getAttribute('x')) + Number(bars[0]!.getAttribute('width'))).toBeCloseTo(380);
    expect(chart.series[0]!.categories).toEqual(['A', 'B']);
  });

  it('renders a bar chart as SVG', () => {
    const el = createChartElement(doc, makeBarChart(), defaultGeometry);
    expect(el.classList.contains('superdoc-chart')).toBe(true);
    expect(el.querySelector('svg')).not.toBeNull();
  });

  it('shows placeholder for missing chart data', () => {
    const el = createChartElement(doc, undefined, defaultGeometry);
    expect(el.textContent).toContain('No chart data');
    expect(el.classList.contains('superdoc-placeholder-block')).toBe(true);
    expect(el.dataset.placeholderDiagnosticIds).toBe('render.chart-not-supported');
    expect(el.getAttribute('role')).toBe('img');
    expect(el.getAttribute('aria-label')).toContain('No chart data');
  });

  it('shows placeholder for empty series', () => {
    const el = createChartElement(doc, makeBarChart({ series: [] }), defaultGeometry);
    expect(el.textContent).toContain('No chart data');
  });

  it('shows placeholder for unsupported chart type', () => {
    const el = createChartElement(doc, makeBarChart({ chartType: 'surfaceChart' }), defaultGeometry);
    expect(el.textContent).toContain('Chart: surfaceChart');
  });

  it('renders bars for each series value', () => {
    const el = createChartElement(doc, makeBarChart(), defaultGeometry);
    const rects = el.querySelectorAll('svg rect');
    // 3 data points = 3 bar rects (no legend swatch for single series with legendPosition)
    // Wait — with the fix, legend shows for single series too. Let's check:
    // Series 1 has 3 values → 3 bars
    // Legend: 1 series with legendPosition → 1 swatch rect
    expect(rects.length).toBeGreaterThanOrEqual(3);
  });

  it('renders a pie chart as SVG paths', () => {
    const el = createChartElement(doc, makePieChart(), defaultGeometry);
    const svg = el.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg!.querySelectorAll('path,circle').length).toBeGreaterThan(0);
  });

  it('renders pie title from series name', () => {
    const el = createChartElement(doc, makePieChart(), defaultGeometry);
    const textEls = el.querySelectorAll('svg text');
    const title = Array.from(textEls).find((t) => t.textContent === 'Sales');
    expect(title).not.toBeUndefined();
  });

  it('renders pie legend categories', () => {
    const el = createChartElement(doc, makePieChart(), defaultGeometry);
    const textEls = el.querySelectorAll('svg text');
    const legendLabel = Array.from(textEls).find((t) => t.textContent === '1st Qtr');
    expect(legendLabel).not.toBeUndefined();
  });

  it('renders a line chart with polyline paths', () => {
    const el = createChartElement(doc, makeLineChart(), defaultGeometry);
    const svg = el.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg!.querySelectorAll('polyline').length).toBeGreaterThan(0);
  });

  it('renders an area chart with filled paths', () => {
    const el = createChartElement(doc, makeAreaChart(), defaultGeometry);
    const svg = el.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg!.querySelectorAll('path').length).toBeGreaterThan(0);
  });

  it('renders a doughnut chart as ring slices', () => {
    const el = createChartElement(doc, makeDoughnutChart(), defaultGeometry);
    const svg = el.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg!.querySelectorAll('path,circle').length).toBeGreaterThan(0);
  });

  it('renders a scatter chart with point markers', () => {
    const el = createChartElement(doc, makeScatterChart(), defaultGeometry);
    const svg = el.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg!.querySelectorAll('circle').length).toBeGreaterThan(0);
  });

  it('renders a bubble chart with variable-size circles', () => {
    const el = createChartElement(doc, makeBubbleChart(), defaultGeometry);
    const svg = el.querySelector('svg');
    expect(svg).not.toBeNull();
    const radii = Array.from(svg!.querySelectorAll('circle')).map((node) => Number(node.getAttribute('r')));
    expect(Math.max(...radii)).toBeGreaterThan(Math.min(...radii));
  });

  it('renders a radar chart as polygons', () => {
    const el = createChartElement(doc, makeRadarChart(), defaultGeometry);
    const svg = el.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg!.querySelectorAll('polygon').length).toBeGreaterThan(0);
  });

  it('routes stockChart to line renderer', () => {
    const el = createChartElement(doc, makeLineChart({ chartType: 'stockChart' }), defaultGeometry);
    const svg = el.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg!.querySelectorAll('polyline').length).toBeGreaterThan(0);
  });

  it('routes ofPieChart to pie renderer', () => {
    const chart = makePieChart({ chartType: 'ofPieChart' });
    const el = createChartElement(doc, chart, defaultGeometry);
    const svg = el.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg!.querySelectorAll('path,circle').length).toBeGreaterThan(0);
  });

  it('renders legend when chart has legendPosition (even single series)', () => {
    const chart = makeBarChart({ legendPosition: 'b' });
    const el = createChartElement(doc, chart, defaultGeometry);
    const svg = el.querySelector('svg')!;
    const textEls = svg.querySelectorAll('text');
    const legendText = Array.from(textEls).find((t) => t.textContent === 'Series 1');
    expect(legendText).not.toBeUndefined();
  });

  it('omits legend when chart has no legendPosition', () => {
    const chart = makeBarChart({ legendPosition: undefined });
    const el = createChartElement(doc, chart, defaultGeometry);
    const svg = el.querySelector('svg')!;
    const textEls = svg.querySelectorAll('text');
    const legendText = Array.from(textEls).find((t) => t.textContent === 'Series 1');
    expect(legendText).toBeUndefined();
  });
});

describe('performance guardrails', () => {
  it('truncates series beyond MAX_RENDERED_SERIES (20)', () => {
    const series = Array.from({ length: 25 }, (_, i) => ({
      name: `S${i}`,
      categories: ['A'],
      values: [i * 10],
    }));
    const chart = makeBarChart({ series });
    const el = createChartElement(doc, chart, defaultGeometry);
    expect(el.textContent).toContain('Data truncated');
  });

  it('truncates data points beyond MAX_POINTS_PER_SERIES (500)', () => {
    const categories = Array.from({ length: 600 }, (_, i) => `C${i}`);
    const values = Array.from({ length: 600 }, (_, i) => i);
    const chart = makeBarChart({ series: [{ name: 'Big', categories, values }] });
    const el = createChartElement(doc, chart, defaultGeometry);
    expect(el.textContent).toContain('Data truncated');
  });

  it('falls back to placeholder when estimated SVG elements exceed budget (5000)', () => {
    // 20 series × 500 points = 10,000 bars alone → exceeds 5,000 budget
    const series = Array.from({ length: 20 }, (_, i) => ({
      name: `S${i}`,
      categories: Array.from({ length: 500 }, (_, j) => `C${j}`),
      values: Array.from({ length: 500 }, (_, j) => j),
    }));
    const chart = makeBarChart({ series });
    const el = createChartElement(doc, chart, defaultGeometry);
    expect(el.textContent).toContain('too complex');
    // Should NOT have an SVG — it's a placeholder
    expect(el.querySelector('svg')).toBeNull();
  });
});

describe('createChartPlaceholder', () => {
  it('shows the label text', () => {
    const container = doc.createElement('div');
    const el = createChartPlaceholder(doc, container, 'Test Label');
    expect(el.textContent).toContain('Test Label');
  });

  it('sets flex display for centering', () => {
    const container = doc.createElement('div');
    const el = createChartPlaceholder(doc, container, 'x');
    expect(el.style.display).toBe('flex');
  });

  it('uses projection-owned placeholder metadata when supplied', () => {
    const container = doc.createElement('div');
    const el = createChartPlaceholder(doc, container, 'No chart data', {
      diagnosticIds: ['render.chart-not-supported'],
      accessibleName: 'Quarterly sales chart',
    });
    expect(el.dataset.placeholderDiagnosticIds).toBe('render.chart-not-supported');
    expect(el.getAttribute('aria-label')).toBe('Quarterly sales chart');
  });
});
