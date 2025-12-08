import { Canvas } from 'canvas';
import { installNodeCanvasPolyfill } from './src/setup.js';

installNodeCanvasPolyfill({
  document,
  Canvas,
});
