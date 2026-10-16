import type { FontMeasureContext } from '@superdoc/font-system';
import { DomMeasurementInfrastructureError } from './measurement-infrastructure-error.js';
import { FontMetricsMeasurementCache } from './fontMetricsCache.js';
import { TextWidthMeasurementCache } from './measurementCache.js';

export interface SurfaceMeasurementExecutionControl {
  throwIfAborted?(): void;
  /** Returns null on the allocation-free under-budget path. */
  checkpointIfDue?(): Promise<void> | null;
}

export interface SurfaceMeasurementRuntimeState {
  readonly textWidths: TextWidthMeasurementCache;
  readonly fontMetrics: FontMetricsMeasurementCache;
  canvasContext: CanvasRenderingContext2D | null;
  readonly createCanvasContext: () => CanvasRenderingContext2D;
  fontSignature: string | null;
  execution: SurfaceMeasurementExecutionControl | null;
  activeFontContext: FontMeasureContext | null;
  activePass: boolean;
  disposed: boolean;
}

const runtimeByFontContext = new WeakMap<FontMeasureContext, SurfaceMeasurementRuntimeState>();
const runtimeByCanvasContext = new WeakMap<CanvasRenderingContext2D, SurfaceMeasurementRuntimeState>();

export function createSurfaceMeasurementRuntimeState(options: {
  maxTextEntries: number;
  maxEstimatedTextBytes: number;
  createCanvasContext?: () => CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
}): SurfaceMeasurementRuntimeState {
  return {
    textWidths: new TextWidthMeasurementCache({
      maxEntries: options.maxTextEntries,
      maxEstimatedBytes: options.maxEstimatedTextBytes,
    }),
    fontMetrics: new FontMetricsMeasurementCache(),
    canvasContext: null,
    createCanvasContext: options.createCanvasContext
      ? () => options.createCanvasContext!() as CanvasRenderingContext2D
      : createMeasurementCanvasContext,
    fontSignature: null,
    execution: null,
    activeFontContext: null,
    activePass: false,
    disposed: false,
  };
}

export function getSurfaceMeasurementRuntime(
  fontContext: FontMeasureContext | undefined,
): SurfaceMeasurementRuntimeState | undefined {
  return fontContext ? runtimeByFontContext.get(fontContext) : undefined;
}

export function getSurfaceMeasurementRuntimeForCanvas(
  context: CanvasRenderingContext2D,
): SurfaceMeasurementRuntimeState | undefined {
  return runtimeByCanvasContext.get(context);
}

/** Canvas2D is the measurement contract; workers use their own OffscreenCanvas. */
export function createMeasurementCanvasContext(): CanvasRenderingContext2D {
  const canvas =
    typeof document !== 'undefined'
      ? document.createElement('canvas')
      : typeof OffscreenCanvas !== 'undefined'
        ? new OffscreenCanvas(1, 1)
        : null;
  const context = canvas?.getContext('2d');
  if (!context) {
    throw new DomMeasurementInfrastructureError('Canvas2D is unavailable in this execution environment.');
  }
  return context as CanvasRenderingContext2D;
}

export function ensureSurfaceMeasurementCanvas(state: SurfaceMeasurementRuntimeState): CanvasRenderingContext2D {
  assertSurfaceMeasurementRuntimeLive(state);
  if (!state.canvasContext) {
    const context = state.createCanvasContext();
    state.canvasContext = context;
    runtimeByCanvasContext.set(context, state);
  }
  return state.canvasContext;
}

export function bindSurfaceMeasurementPass(
  state: SurfaceMeasurementRuntimeState,
  fontContext: FontMeasureContext,
  execution: SurfaceMeasurementExecutionControl | undefined,
): void {
  assertSurfaceMeasurementRuntimeLive(state);
  if (state.activePass) {
    throw new DomMeasurementInfrastructureError('DomMeasurementRuntime already has an active pass');
  }
  state.execution = execution ?? null;
  state.activeFontContext = fontContext;
  state.activePass = true;
  runtimeByFontContext.set(fontContext, state);
}

export function unbindSurfaceMeasurementPass(
  state: SurfaceMeasurementRuntimeState,
  fontContext: FontMeasureContext,
): void {
  if (runtimeByFontContext.get(fontContext) === state) {
    runtimeByFontContext.delete(fontContext);
  }
  if (state.activeFontContext === fontContext) state.activeFontContext = null;
  state.execution = null;
  state.activePass = false;
}

export function clearSurfaceMeasurementGeneration(
  state: SurfaceMeasurementRuntimeState,
  nextFontSignature: string,
): void {
  assertSurfaceMeasurementRuntimeLive(state);
  if (state.activePass) {
    throw new DomMeasurementInfrastructureError('Cannot change font generation during an active measurement pass');
  }
  if (state.canvasContext) runtimeByCanvasContext.delete(state.canvasContext);
  state.canvasContext = null;
  state.textWidths.clear();
  state.fontMetrics.clear();
  state.fontSignature = nextFontSignature;
}

export function disposeSurfaceMeasurementRuntime(state: SurfaceMeasurementRuntimeState): void {
  if (state.disposed) return;
  if (state.activeFontContext) {
    runtimeByFontContext.delete(state.activeFontContext);
  }
  if (state.canvasContext) runtimeByCanvasContext.delete(state.canvasContext);
  state.activeFontContext = null;
  state.canvasContext = null;
  state.execution = null;
  state.activePass = false;
  state.textWidths.dispose();
  state.fontMetrics.dispose();
  state.disposed = true;
}

export function surfaceMeasurementCheckpointIfDue(fontContext: FontMeasureContext): Promise<void> | null {
  const runtime = runtimeByFontContext.get(fontContext);
  runtime?.execution?.throwIfAborted?.();
  const pending = runtime?.execution?.checkpointIfDue?.() ?? null;
  if (!pending || !runtime) return null;
  return pending.then(() => runtime.execution?.throwIfAborted?.());
}

function assertSurfaceMeasurementRuntimeLive(state: SurfaceMeasurementRuntimeState): void {
  if (state.disposed) {
    throw new DomMeasurementInfrastructureError('DomMeasurementRuntime has been disposed');
  }
}
