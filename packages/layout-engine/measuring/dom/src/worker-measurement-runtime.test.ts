import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import {
  createMeasurementCanvasContext,
  createSurfaceMeasurementRuntimeState,
  ensureSurfaceMeasurementCanvas,
  clearSurfaceMeasurementGeneration,
  disposeSurfaceMeasurementRuntime,
} from './measurement-runtime-context.js';

afterEach(() => vi.unstubAllGlobals());

describe('worker-owned Canvas2D measurement', () => {
  it('allocates native OffscreenCanvas without any document', () => {
    const context = { measureText: () => ({ width: 10 }) };
    const allocation = vi.fn();
    vi.stubGlobal('document', undefined);
    vi.stubGlobal(
      'OffscreenCanvas',
      class {
        constructor(width: number, height: number) {
          allocation(width, height);
        }
        getContext(kind: string) {
          expect(kind).toBe('2d');
          return context;
        }
      },
    );
    expect(createMeasurementCanvasContext()).toBe(context);
    expect(allocation).toHaveBeenCalledWith(1, 1);
  });
  it('retains the injected worker context per document and replaces it on font changes', () => {
    const contexts = [{ font: 'first' }, { font: 'second' }];
    const factory = vi.fn(
      () => contexts[factory.mock.calls.length - 1] as unknown as OffscreenCanvasRenderingContext2D,
    );
    const runtime = createSurfaceMeasurementRuntimeState({
      maxTextEntries: 10,
      maxEstimatedTextBytes: 1000,
      createCanvasContext: factory,
    });
    expect(ensureSurfaceMeasurementCanvas(runtime)).toBe(contexts[0]);
    expect(ensureSurfaceMeasurementCanvas(runtime)).toBe(contexts[0]);
    expect(factory).toHaveBeenCalledTimes(1);
    clearSurfaceMeasurementGeneration(runtime, 'fonts-2');
    expect(ensureSurfaceMeasurementCanvas(runtime)).toBe(contexts[1]);
    expect(factory).toHaveBeenCalledTimes(2);
    disposeSurfaceMeasurementRuntime(runtime);
    expect(() => ensureSurfaceMeasurementCanvas(runtime)).toThrow(/disposed/);
  });
});
