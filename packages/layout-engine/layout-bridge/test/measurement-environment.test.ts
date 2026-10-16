import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { createLayoutMeasurementContext, type LayoutMeasurementContext } from '../src/measurement-environment.js';
import { clearRemeasureTextCaches, remeasureParagraph } from '../src/remeasure.js';
import { measureCharacterX } from '../src/text-measurement.js';
import { FontMetricsCache } from '../src/font-metrics-cache.js';
import type { ParagraphBlock } from '@superdoc/contracts';

function installCanvas(width: () => number): void {
  vi.stubGlobal('document', undefined);
  vi.stubGlobal(
    'OffscreenCanvas',
    class {
      getContext() {
        return {
          font: '',
          measureText: (text: string) => ({
            width: text.length * width(),
            actualBoundingBoxAscent: 10,
            actualBoundingBoxDescent: 3,
          }),
        };
      }
    },
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  clearRemeasureTextCaches();
});

describe('secondary measurement environment', () => {
  it('uses injected native contexts without touching a browser global', () => {
    const context = { measureText: vi.fn() } as unknown as LayoutMeasurementContext;
    expect(createLayoutMeasurementContext({ context, unavailable: 'require-native' })).toBe(context);
  });

  it('uses an explicit owner document before the global document', () => {
    const context = {} as CanvasRenderingContext2D;
    const createElement = vi.fn(() => ({ getContext: () => context }));
    expect(createLayoutMeasurementContext({ ownerDocument: { createElement } as unknown as Document })).toBe(context);
    expect(createElement).toHaveBeenCalledWith('canvas');
  });

  it('does not silently approximate when worker canvas allocation fails', () => {
    vi.stubGlobal('document', undefined);
    vi.stubGlobal(
      'OffscreenCanvas',
      class {
        getContext() {
          return null;
        }
      },
    );
    expect(() => createLayoutMeasurementContext()).toThrow('Native Canvas2D is unavailable');
    expect(() =>
      remeasureParagraph({ kind: 'paragraph', id: 'worker', runs: [{ text: 'wide W', fontSize: 16 }] }, 100),
    ).toThrow('Native Canvas2D is unavailable');
  });

  it('fails closed in a worker even when OffscreenCanvas itself is absent', () => {
    vi.stubGlobal('document', undefined);
    vi.stubGlobal('OffscreenCanvas', undefined);
    vi.stubGlobal(
      'WorkerGlobalScope',
      class {
        static [Symbol.hasInstance](value: unknown) {
          return value === globalThis;
        }
      },
    );
    expect(() => createLayoutMeasurementContext()).toThrow('Native Canvas2D is unavailable');
  });

  it('keeps explicitly selected headless approximation available', () => {
    vi.stubGlobal('document', undefined);
    vi.stubGlobal('OffscreenCanvas', undefined);
    expect(createLayoutMeasurementContext({ unavailable: 'headless-approximation' })).toBeNull();
    expect(() => createLayoutMeasurementContext({ unavailable: 'require-native' })).toThrow('Native Canvas2D');
  });

  it('invalidates caret prefixes and cached font metrics when remeasurement fonts change', () => {
    let glyphWidth = 3;
    installCanvas(() => glyphWidth);
    const block: ParagraphBlock = {
      kind: 'paragraph',
      id: 'font-change',
      runs: [{ text: 'aaaa', fontSize: 16, fontFamily: 'Arial' }],
    };
    const cache = new FontMetricsCache();
    const key = FontMetricsCache.createFontKey('Arial', 16);
    const before = remeasureParagraph(block, 100);
    expect(cache.measureChar(key, 'a')).toBe(3);
    expect(measureCharacterX(block, before.lines[0], 2)).toBe(6);
    glyphWidth = 7;
    clearRemeasureTextCaches();
    const after = remeasureParagraph(block, 100);
    expect(cache.getMetrics(key)).toBeUndefined();
    expect(cache.measureChar(key, 'a')).toBe(7);
    expect(measureCharacterX(block, after.lines[0], 2)).toBe(14);
    expect(after.lines[0].width).toBeGreaterThan(before.lines[0].width);
  });
});
