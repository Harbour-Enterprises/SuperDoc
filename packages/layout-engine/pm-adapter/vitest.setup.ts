import { createRequire } from 'node:module';
import { installNodeCanvasPolyfill } from '../measuring/dom/src/setup.js';

const require = createRequire(import.meta.url);

// Prefer the real node-canvas binding, but fall back to a lightweight stub when
// the native binary is missing or compiled for a different Node version. The
// tests in this package only need `measureText` and `font` support.
const Canvas = (() => {
  try {
    return require('canvas').Canvas as typeof import('canvas').Canvas;
  } catch {
    class MockCanvasRenderingContext2D {
      font = '';

      // Approximate width using font size to keep metrics consistent across tests
      measureText(text: string) {
        const size = this.getFontSize();
        return {
          width: text.length * size * 0.5,
          actualBoundingBoxAscent: size * 0.8,
          actualBoundingBoxDescent: size * 0.2,
        } as TextMetrics;
      }

      private getFontSize(): number {
        const match = this.font.match(/([\d.]+)px/);
        return match ? Number(match[1]) : 16;
      }
    }

    class MockCanvas {
      constructor(
        private width: number = 1024,
        private height: number = 768,
      ) {}

      getContext(type: '2d') {
        if (type === '2d') {
          return new MockCanvasRenderingContext2D() as unknown as CanvasRenderingContext2D;
        }
        return null;
      }
    }

    return MockCanvas as unknown as typeof import('canvas').Canvas;
  }
})();

installNodeCanvasPolyfill({
  document,
  Canvas,
});
