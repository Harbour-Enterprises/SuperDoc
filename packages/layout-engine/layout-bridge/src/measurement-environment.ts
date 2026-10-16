/** Native Canvas2D allocation shared by the secondary layout measurers. */
export type LayoutMeasurementContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

type UnavailablePolicy = 'require-native' | 'headless-approximation';

let fontGeneration = 0;

export function getLayoutMeasurementFontGeneration(): number {
  return fontGeneration;
}

/** Invalidates secondary caches when a face changes behind an unchanged CSS font string. */
export function invalidateLayoutMeasurementFonts(): void {
  fontGeneration += 1;
}

function isWorkerRealm(): boolean {
  const WorkerScope = (globalThis as typeof globalThis & { WorkerGlobalScope?: new () => object }).WorkerGlobalScope;
  return typeof WorkerScope === 'function' && globalThis instanceof WorkerScope;
}

export function createLayoutMeasurementContext(
  options: {
    context?: LayoutMeasurementContext;
    ownerDocument?: Document;
    unavailable?: UnavailablePolicy;
  } = {},
): LayoutMeasurementContext | null {
  if (options.context) return options.context;
  const ownerDocument = options.ownerDocument ?? (typeof document !== 'undefined' ? document : undefined);
  // Node/SSR callers historically support approximate measurements. A worker must
  // never silently use that headless behavior for a mounted exact render.
  const unavailable =
    options.unavailable ??
    (isWorkerRealm() || (!ownerDocument && typeof OffscreenCanvas !== 'undefined')
      ? 'require-native'
      : 'headless-approximation');
  let context: LayoutMeasurementContext | null = null;
  try {
    if (ownerDocument) {
      const canvas = ownerDocument.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      context = canvas.getContext('2d');
    } else if (typeof OffscreenCanvas !== 'undefined') {
      context = new OffscreenCanvas(1, 1).getContext('2d');
    }
  } catch (error) {
    if (unavailable === 'require-native') {
      throw Object.assign(new Error('Native Canvas2D is unavailable for layout measurement.'), { cause: error });
    }
  }
  if (!context && unavailable === 'require-native') {
    throw new Error('Native Canvas2D is unavailable for layout measurement.');
  }
  return context;
}
