import { minMax } from '../utilities/minMax.js';
import type { EditorView } from 'prosemirror-view';

type Coords = { left: number; right: number; top: number; bottom: number };

type DOMRectLike = Coords & {
  width: number;
  height: number;
  x: number;
  y: number;
  toJSON: () => Coords & { width: number; height: number; x: number; y: number };
};

export function posToDOMRect(view: EditorView, from: number, to: number): DOMRectLike {
  const minPos = 0;
  const maxPos = view.state.doc.content.size;
  const resolvedFrom = minMax(from, minPos, maxPos);
  const resolvedEnd = minMax(to, minPos, maxPos);
  const start = view.coordsAtPos(resolvedFrom) as Coords;
  const end = view.coordsAtPos(resolvedEnd, -1) as Coords;
  const top = Math.min(start.top, end.top);
  const bottom = Math.max(start.bottom, end.bottom);
  const left = Math.min(start.left, end.left);
  const right = Math.max(start.right, end.right);
  const width = right - left;
  const height = bottom - top;
  const x = left;
  const y = top;
  const data = {
    top,
    bottom,
    left,
    right,
    width,
    height,
    x,
    y,
  };

  return {
    ...data,
    toJSON: () => data,
  };
}
