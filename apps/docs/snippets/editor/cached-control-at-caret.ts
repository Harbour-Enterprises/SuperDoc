import type { ContentControlInfo, ContentControlsHandle, SelectionSlice, SelectionTarget } from 'superdoc/ui';

function isBodyRange(target: SelectionTarget): boolean {
  const stories = [
    target.story,
    ...[target.start, target.end].map((point) => (point.kind === 'text' ? point.story : point.node.story)),
  ];
  return stories.every((story) => story === undefined || story.storyType === 'body');
}

// Context only: the caller must know that cached IDs and ranges are still current.
export function cachedControlAtCaret(
  controls: ContentControlsHandle,
  selection: SelectionSlice,
  catalogKnownCurrent: boolean,
): ContentControlInfo | null {
  const caret = selection.selectionTarget;
  if (!catalogKnownCurrent || selection.status !== 'ready' || !caret || !isBodyRange(caret)) return null;
  const { start, end } = caret;
  if (start.kind !== 'text' || end.kind !== 'text' || start.blockId !== end.blockId || start.offset !== end.offset) {
    return null;
  }

  const matches = controls.getSnapshot().items.filter((control) => {
    const range = control.selectionTarget;
    return (
      control.kind === 'inline' &&
      range &&
      isBodyRange(range) &&
      (range.coordinateSpace ?? 'visible') === (caret.coordinateSpace ?? 'visible') &&
      range.start.kind === 'text' &&
      range.end.kind === 'text' &&
      range.start.blockId === start.blockId &&
      range.end.blockId === start.blockId &&
      range.start.offset < start.offset &&
      start.offset < range.end.offset
    );
  });

  // Multiple enclosing controls and boundary affinity need a different workflow.
  return matches.length === 1 ? controls.get({ id: matches[0].id }) : null;
}
