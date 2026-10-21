import type { ViewportGetRectsInput, ViewportGetRectsResult, ViewportRectResult } from './types.js';

/** No rendering or scrolling: read only geometry already acknowledged by the host. */
export async function readViewportBatch(
  input: ViewportGetRectsInput,
  read: (target: ViewportGetRectsInput['targets'][number]) => ViewportRectResult,
  generation: () => string | null,
  disposed: () => boolean,
): Promise<ViewportGetRectsResult> {
  if (!Array.isArray(input.targets) || input.targets.length > 5000) {
    throw new RangeError('getRects accepts at most 5000 targets per request.');
  }
  const targets = structuredClone(input.targets);
  const readGeneration = (): string | null => {
    try {
      return generation();
    } catch {
      return null;
    }
  };
  const started = readGeneration();
  const results: ViewportRectResult[] = [];
  const state = (): ViewportGetRectsResult['status'] =>
    disposed()
      ? 'disposed'
      : input.signal?.aborted
        ? 'cancelled'
        : started === null || readGeneration() !== started
          ? 'stale'
          : 'complete';
  const finish = (status: ViewportGetRectsResult['status']): ViewportGetRectsResult => ({
    status,
    generation: started ?? '',
    results:
      status === 'complete'
        ? results
        : targets.map(() => ({ found: false, success: false, rects: [], reason: status })),
  });
  for (let offset = 0; offset < targets.length; offset += 32) {
    // Yield to input, painting and cancellation between bounded chunks.
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    const status = state();
    if (status !== 'complete') return finish(status);
    for (const target of targets.slice(offset, offset + 32)) {
      try {
        results.push(read(target));
      } catch {
        results.push({ found: false, success: false, rects: [], reason: 'invalid-target' });
      }
    }
  }
  return finish(state());
}
