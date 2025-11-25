import { Canvas } from 'canvas';
import { installNodeCanvasPolyfill } from '@superdoc/measuring-dom';

installNodeCanvasPolyfill({
  document,
  Canvas,
});
