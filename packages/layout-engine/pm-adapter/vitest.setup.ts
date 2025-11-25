import { Canvas } from 'canvas';
import { installNodeCanvasPolyfill } from '../measuring/dom/src/setup.js';

installNodeCanvasPolyfill({
  document,
  Canvas,
});
