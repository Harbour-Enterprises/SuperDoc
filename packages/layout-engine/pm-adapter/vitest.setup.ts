import { resolveCanvas } from '@superdoc/measuring-dom/src/canvas-resolver.js';
import { installNodeCanvasPolyfill } from '@superdoc/measuring-dom/src/setup.js';

const { Canvas } = resolveCanvas();

installNodeCanvasPolyfill({
  document,
  Canvas,
});
