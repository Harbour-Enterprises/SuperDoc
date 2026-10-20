import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import type { Line, ParagraphBlock } from '@superdoc/contracts';
import { invalidateLayoutMeasurementFonts } from '../src/measurement-environment.js';
import { measureCharacterX } from '../src/text-measurement.js';

afterEach(() => {
  vi.unstubAllGlobals();
  invalidateLayoutMeasurementFonts();
});

function installCanvas(initialKerning: CanvasFontKerning) {
  const context = {
    font: '',
    fontKerning: initialKerning,
    measureText: vi.fn(function (this: { fontKerning: CanvasFontKerning }, text: string) {
      const prefix = 'For all the capabilities of the modern browser, ';
      // Captured from the same current native frame as the CI171 painted run.
      const width =
        text === prefix
          ? this.fontKerning === 'none'
            ? 320.8265075683594
            : 317.8945007324219
          : text.length * 10 - (this.fontKerning === 'none' ? 0 : (text.match(/AV/g)?.length ?? 0) * 2);
      return { width };
    }),
  };
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => context }) });
  invalidateLayoutMeasurementFonts();
  return context;
}

function measuredLine(overrides: Partial<Line>): Line {
  return {
    fromRun: 0,
    fromChar: 0,
    toRun: 0,
    toChar: 2,
    width: 20,
    ascent: 12,
    descent: 4,
    lineHeight: 20,
    ...overrides,
  };
}

describe('painted run kerning in caret measurements', () => {
  it.each(['auto', 'normal', 'none'] as const)(
    'keeps a tracked word after an ordinary run at its painted origin with a cold %s canvas',
    (initial) => {
      const context = installCanvas(initial);
      const prefix = 'For all the capabilities of the modern browser, ';
      const block: ParagraphBlock = {
        kind: 'paragraph',
        id: 'tracked-word',
        runs: [
          { text: prefix, fontFamily: 'Arial', fontSize: 14.666666666666666 },
          {
            text: 'online',
            fontFamily: 'Arial',
            fontSize: 14.666666666666666,
            dataAttrs: { 'data-track-change-kind': 'delete' },
          },
        ],
      };
      const line = measuredLine({
        toRun: 1,
        toChar: 6,
        width: 380.8265075683594,
        segments: [
          { runIndex: 0, fromChar: 0, toChar: prefix.length, width: 320.8265075683594 },
          { runIndex: 1, fromChar: 0, toChar: 6, width: 60 },
        ],
      });
      expect(measureCharacterX(block, line, prefix.length)).toBeCloseTo(320.8265075683594, 8);
      expect(measureCharacterX(block, line, prefix.length + 6)).toBeCloseTo(380.8265075683594, 8);
      expect(context.fontKerning).toBe('none');
    },
  );

  it.each([false, true])(
    'restores painted kerning after a reused canvas changes, with positioned segments %s',
    (positioned) => {
      const context = installCanvas('none');
      const block: ParagraphBlock = {
        kind: 'paragraph',
        id: 'reused',
        runs: [{ text: 'AV', fontFamily: 'Arial', fontSize: 16 }],
      };
      const line = measuredLine(
        positioned ? { segments: [{ runIndex: 0, fromChar: 0, toChar: 2, width: 20, x: 100 }] } : {},
      );
      const origin = positioned ? 100 : 0;
      expect(measureCharacterX(block, line, 1)).toBe(origin + 10);
      for (const changed of ['normal', 'auto', 'none', 'normal'] as const) {
        context.fontKerning = changed;
        expect(measureCharacterX(block, line, 1)).toBe(origin + 10);
        expect(context.fontKerning).toBe('none');
        expect(measureCharacterX(block, line, 2)).toBe(origin + 20);
      }
    },
  );
});
