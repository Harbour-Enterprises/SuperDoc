import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

type CanvasCtor = new (
  width?: number,
  height?: number,
) => {
  getContext(type: '2d'): CanvasRenderingContext2D;
};

let warned = false;

export function resolveCanvas(): { Canvas: CanvasCtor; usingStub: boolean } {
  try {
    const { Canvas } = require('canvas') as { Canvas: CanvasCtor };
    return { Canvas, usingStub: false };
  } catch {
    if (!warned) {
      console.warn(
        '[superdoc] Using mock canvas fallback; text metrics may be approximate. Install native deps (pkg-config + cairo/pixman) or use Node 20 for precise measurements.',
      );
      warned = true;
    }

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

    return { Canvas: MockCanvas as unknown as CanvasCtor, usingStub: true };
  }
}
