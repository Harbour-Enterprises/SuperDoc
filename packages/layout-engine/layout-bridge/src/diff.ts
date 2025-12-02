import type {
  FlowBlock,
  ImageBlock,
  DrawingBlock,
  ImageDrawing,
  BoxSpacing,
  ImageAnchor,
  ImageWrap,
  DrawingGeometry,
  ShapeGroupTransform,
  ShapeGroupChild,
  Run,
} from '@superdoc/contracts';
import { hasTrackedChange, resolveTrackedChangesEnabled } from './tracked-changes-utils.js';

export type DirtyRegion = {
  firstDirtyIndex: number;
  lastStableIndex: number;
  insertedBlockIds: string[];
  deletedBlockIds: string[];
};

/**
 * Computes dirty regions between two versions of a document's flow blocks.
 *
 * Identifies which blocks have changed, been added, or removed, and determines
 * the minimal region that needs to be re-laid out. Uses block IDs and tracked
 * change metadata to detect modifications.
 *
 * @param previous - Previous version of flow blocks
 * @param next - New version of flow blocks
 * @returns DirtyRegion describing the extent of changes
 *
 * @example
 * ```typescript
 * const region = computeDirtyRegions(oldBlocks, newBlocks);
 * if (region.isEntireDocument) {
 *   relayoutAll();
 * } else {
 *   relayoutRange(region.firstDirtyIndex, region.lastDirtyIndex);
 * }
 * ```
 */
export const computeDirtyRegions = (previous: FlowBlock[], next: FlowBlock[]): DirtyRegion => {
  const prevMap = new Map(previous.map((block, index) => [block.id, { block, index }]));
  const nextMap = new Map(next.map((block, index) => [block.id, { block, index }]));

  let firstDirtyIndex = next.length;
  let lastStableIndex = -1;
  let prevPointer = 0;
  let nextPointer = 0;

  while (prevPointer < previous.length && nextPointer < next.length) {
    const prevBlock = previous[prevPointer];
    const nextBlock = next[nextPointer];

    if (prevBlock.id === nextBlock.id && shallowEqual(prevBlock, nextBlock)) {
      lastStableIndex = nextPointer;
      prevPointer += 1;
      nextPointer += 1;
      continue;
    }

    firstDirtyIndex = Math.min(firstDirtyIndex, nextPointer);

    if (!nextMap.has(prevBlock.id)) {
      prevPointer += 1;
    } else if (!prevMap.has(nextBlock.id)) {
      nextPointer += 1;
    } else {
      prevPointer += 1;
      nextPointer += 1;
    }
  }

  const insertedBlockIds = next.filter((block) => !prevMap.has(block.id)).map((block) => block.id);

  const deletedBlockIds = previous.filter((block) => !nextMap.has(block.id)).map((block) => block.id);

  if (firstDirtyIndex === next.length && previous.length !== next.length) {
    firstDirtyIndex = Math.min(prevPointer, nextPointer);
  }

  return {
    firstDirtyIndex: firstDirtyIndex === next.length ? next.length : firstDirtyIndex,
    lastStableIndex,
    insertedBlockIds,
    deletedBlockIds,
  };
};

const shallowEqual = (a: FlowBlock, b: FlowBlock): boolean => {
  if (a.kind !== b.kind) return false;

  if (a.kind === 'image' && b.kind === 'image') {
    return imageBlocksEqual(a, b);
  }

  if (a.kind === 'paragraph' && b.kind === 'paragraph') {
    return paragraphBlocksEqual(a, b);
  }

  if (a.kind === 'drawing' && b.kind === 'drawing') {
    return drawingBlocksEqual(a, b);
  }

  return false;
};

/**
 * Generates a hash key from tracked change metadata for equality comparison.
 * Used to detect when runs have changed tracked change state.
 *
 * @param run - The run to extract tracked change key from
 * @returns Hash string, or empty string if no tracked change metadata
 */
const getTrackedChangeKey = (run: Run): string => {
  if (hasTrackedChange(run)) {
    const tc = run.trackedChange;
    const beforeHash = tc.before ? JSON.stringify(tc.before) : '';
    const afterHash = tc.after ? JSON.stringify(tc.after) : '';
    return `${tc.kind ?? ''}:${tc.id ?? ''}:${tc.author ?? ''}:${tc.date ?? ''}:${beforeHash}:${afterHash}`;
  }
  return '';
};

const paragraphBlocksEqual = (a: FlowBlock & { kind: 'paragraph' }, b: FlowBlock & { kind: 'paragraph' }): boolean => {
  const aMode = (a.attrs as { trackedChangesMode?: string } | undefined)?.trackedChangesMode ?? 'review';
  const bMode = (b.attrs as { trackedChangesMode?: string } | undefined)?.trackedChangesMode ?? 'review';
  if (aMode !== bMode) return false;
  const aEnabled = resolveTrackedChangesEnabled(a.attrs, true);
  const bEnabled = resolveTrackedChangesEnabled(b.attrs, true);
  if (aEnabled !== bEnabled) return false;
  if (a.runs.length !== b.runs.length) return false;
  for (let i = 0; i < a.runs.length; i += 1) {
    const runA = a.runs[i];
    const runB = b.runs[i];
    if (
      ('src' in runA || runA.kind === 'lineBreak' || runA.kind === 'break' ? '' : runA.text) !==
        ('src' in runB || runB.kind === 'lineBreak' || runB.kind === 'break' ? '' : runB.text) ||
      ('bold' in runA ? runA.bold : false) !== ('bold' in runB ? runB.bold : false) ||
      ('italic' in runA ? runA.italic : false) !== ('italic' in runB ? runB.italic : false) ||
      ('color' in runA ? runA.color : undefined) !== ('color' in runB ? runB.color : undefined) ||
      getTrackedChangeKey(runA) !== getTrackedChangeKey(runB)
    ) {
      return false;
    }
  }
  return true;
};

const imageBlocksEqual = (a: ImageBlock | ImageDrawing, b: ImageBlock | ImageDrawing): boolean => {
  return (
    a.src === b.src &&
    a.width === b.width &&
    a.height === b.height &&
    a.alt === b.alt &&
    a.title === b.title &&
    a.objectFit === b.objectFit &&
    a.display === b.display &&
    boxSpacingEqual(a.margin, b.margin) &&
    boxSpacingEqual(a.padding, b.padding) &&
    imageAnchorEqual(a.anchor, b.anchor) &&
    imageWrapEqual(a.wrap, b.wrap) &&
    shallowRecordEqual(a.attrs, b.attrs)
  );
};

const drawingBlocksEqual = (a: DrawingBlock, b: DrawingBlock): boolean => {
  if (a.drawingKind !== b.drawingKind) return false;
  if (!boxSpacingEqual(a.margin, b.margin)) return false;
  if (!boxSpacingEqual(a.padding, b.padding)) return false;
  if (!imageAnchorEqual(a.anchor, b.anchor)) return false;
  if (!imageWrapEqual(a.wrap, b.wrap)) return false;
  if (a.zIndex !== b.zIndex) return false;
  if (a.drawingContentId !== b.drawingContentId) return false;
  if (!jsonEqual(a.drawingContent, b.drawingContent)) return false;
  if (!shallowRecordEqual(a.attrs, b.attrs)) return false;

  if (a.drawingKind === 'image' && b.drawingKind === 'image') {
    return imageBlocksEqual(a, b);
  }

  if (a.drawingKind === 'vectorShape' && b.drawingKind === 'vectorShape') {
    return (
      drawingGeometryEqual(a.geometry, b.geometry) &&
      a.shapeKind === b.shapeKind &&
      a.fillColor === b.fillColor &&
      a.strokeColor === b.strokeColor &&
      a.strokeWidth === b.strokeWidth
    );
  }

  if (a.drawingKind === 'shapeGroup' && b.drawingKind === 'shapeGroup') {
    return (
      drawingGeometryEqual(a.geometry, b.geometry) &&
      shapeGroupTransformEqual(a.groupTransform, b.groupTransform) &&
      shapeGroupSizeEqual(a.size, b.size) &&
      shapeGroupChildrenEqual(a.shapes, b.shapes)
    );
  }

  return true;
};

const boxSpacingEqual = (a?: BoxSpacing, b?: BoxSpacing): boolean => {
  if (a === b) return true;
  if (!a || !b) return !a && !b;
  return a.top === b.top && a.right === b.right && a.bottom === b.bottom && a.left === b.left;
};

const imageAnchorEqual = (a?: ImageAnchor, b?: ImageAnchor): boolean => {
  if (a === b) return true;
  if (!a || !b) return !a && !b;
  return (
    a.isAnchored === b.isAnchored &&
    a.hRelativeFrom === b.hRelativeFrom &&
    a.vRelativeFrom === b.vRelativeFrom &&
    a.alignH === b.alignH &&
    a.alignV === b.alignV &&
    a.offsetH === b.offsetH &&
    a.offsetV === b.offsetV &&
    a.behindDoc === b.behindDoc
  );
};

const imageWrapEqual = (a?: ImageWrap, b?: ImageWrap): boolean => {
  if (a === b) return true;
  if (!a || !b) return !a && !b;
  return (
    a.type === b.type &&
    a.wrapText === b.wrapText &&
    a.distTop === b.distTop &&
    a.distBottom === b.distBottom &&
    a.distLeft === b.distLeft &&
    a.distRight === b.distRight &&
    a.behindDoc === b.behindDoc &&
    polygonEqual(a.polygon, b.polygon)
  );
};

const polygonEqual = (a?: number[][], b?: number[][]): boolean => {
  if (a === b) return true;
  if (!a || !b) return !a && !b;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    const rowA = a[i];
    const rowB = b[i];
    if (!rowA || !rowB) return false;
    if (rowA.length !== rowB.length) return false;
    for (let j = 0; j < rowA.length; j += 1) {
      if (rowA[j] !== rowB[j]) {
        return false;
      }
    }
  }
  return true;
};

const drawingGeometryEqual = (a?: DrawingGeometry, b?: DrawingGeometry): boolean => {
  if (a === b) return true;
  if (!a || !b) return !a && !b;
  return (
    a.width === b.width &&
    a.height === b.height &&
    (a.rotation ?? 0) === (b.rotation ?? 0) &&
    Boolean(a.flipH) === Boolean(b.flipH) &&
    Boolean(a.flipV) === Boolean(b.flipV)
  );
};

const shapeGroupTransformEqual = (a?: ShapeGroupTransform, b?: ShapeGroupTransform): boolean => {
  if (a === b) return true;
  if (!a || !b) return !a && !b;
  return (
    a.x === b.x &&
    a.y === b.y &&
    a.width === b.width &&
    a.height === b.height &&
    a.childX === b.childX &&
    a.childY === b.childY &&
    a.childWidth === b.childWidth &&
    a.childHeight === b.childHeight &&
    a.childOriginXEmu === b.childOriginXEmu &&
    a.childOriginYEmu === b.childOriginYEmu
  );
};

const shapeGroupSizeEqual = (
  a?: { width?: number; height?: number },
  b?: { width?: number; height?: number },
): boolean => {
  if (a === b) return true;
  if (!a || !b) return !a && !b;
  return a.width === b.width && a.height === b.height;
};

const shapeGroupChildrenEqual = (a: ShapeGroupChild[], b: ShapeGroupChild[]): boolean => {
  if (a === b) return true;
  if (!a || !b) return !a && !b;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    const childA = a[i];
    const childB = b[i];
    if (!childA || !childB) return false;
    if (childA.shapeType !== childB.shapeType) return false;
    if (!jsonEqual(childA.attrs, childB.attrs)) return false;
  }
  return true;
};

const shallowRecordEqual = (a?: Record<string, unknown>, b?: Record<string, unknown>): boolean => {
  if (a === b) return true;
  if (!a || !b) return !a && !b;
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (a[key] !== b[key]) return false;
  }
  return true;
};

const jsonEqual = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (a == null || b == null) return a == null && b == null;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
};
