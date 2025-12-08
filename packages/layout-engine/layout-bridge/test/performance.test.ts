// @vitest-environment jsdom
import { describe, it, expect, beforeAll } from 'vitest';
import { Canvas } from 'canvas';
import { installNodeCanvasPolyfill } from '../../measuring/dom/src/setup.ts';
import { runBenchmarkSuite } from '../src/benchmarks/index';

beforeAll(() => {
  installNodeCanvasPolyfill({
    document,
    Canvas,
  });
});

const LATENCY_TARGETS = {
  p50: 80, // Relaxed for CI environments which are slower than local machines
  p90: 120,
  p99: 200,
};
const MIN_HIT_RATE = 0.95;

describe('incremental pipeline benchmarks', () => {
  it('meets latency and cache targets across document sizes', async () => {
    const scenarios = [
      { targetPages: 1, iterations: 4 },
      { targetPages: 10, iterations: 4 },
      { targetPages: 25, iterations: 4 },
      { targetPages: 50, iterations: 4 },
    ];
    const results = await runBenchmarkSuite({ scenarios });

    results.forEach((result) => {
      if (process.env.LAYOUT_BENCH_DEBUG) {
        // eslint-disable-next-line no-console
        console.log(
          JSON.stringify(
            {
              pages: result.targetPages,
              actual: result.actualPages,
              initial: result.initialPages,
              totalBlocks: result.totalBlocks,
              blocksPerPage: result.blocksPerPage,
              blockHeight: result.blockHeight,
              latency: result.latency,
              cache: result.cache,
            },
            null,
            2,
          ),
        );
      }
      expect(result.actualPages).toBe(result.targetPages);
      expect(result.latency.p50).toBeLessThanOrEqual(LATENCY_TARGETS.p50);
      expect(result.latency.p90).toBeLessThanOrEqual(LATENCY_TARGETS.p90);
      expect(result.latency.p99).toBeLessThanOrEqual(LATENCY_TARGETS.p99);
      if (result.targetPages >= 10) {
        expect(result.cache.hitRate).toBeGreaterThanOrEqual(MIN_HIT_RATE);
      } else {
        expect(result.cache.hitRate).toBeGreaterThan(0);
      }
    });
  }, 60000); // Extended timeout for CI environments
});
