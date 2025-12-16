import { resolveCanvas } from '../measuring/dom/src/canvas-resolver.js';
import { installNodeCanvasPolyfill } from '../measuring/dom/src/setup.js';

const { Canvas } = resolveCanvas();

installNodeCanvasPolyfill({
  document,
  Canvas,
});
