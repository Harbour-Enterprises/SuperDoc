import { resolveCanvas } from '../measuring/dom/src/canvas-resolver.js';
import { installNodeCanvasPolyfill } from '@superdoc/measuring-dom';

const { Canvas } = resolveCanvas();

installNodeCanvasPolyfill({
  document,
  Canvas,
});
