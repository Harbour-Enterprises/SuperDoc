import type { EditorState } from 'prosemirror-state';
import type { MarkType } from 'prosemirror-model';

/**
 * Information about a found mark
 */
interface MarkInfo {
  /** Start position of the mark */
  from: number;
  /** End position of the mark */
  to: number;
  /** Attributes of the mark */
  attrs: Record<string, unknown>;
  /** Whether the mark is fully contained within the selection */
  contained: boolean;
}

/**
 * Find marks of a given type within the current selection
 * @param state The editor state
 * @param markType The type of mark to search for
 * @param toArr Whether to return all matches as an array
 * @returns Single mark info, array of mark infos, or undefined
 */
export function findMark(state: EditorState, markType: MarkType, toArr: false): MarkInfo | undefined;

export function findMark(state: EditorState, markType: MarkType, toArr: true): MarkInfo[];

export function findMark(state: EditorState, markType: MarkType, toArr?: boolean): MarkInfo | MarkInfo[] | undefined;

export function findMark(state: EditorState, markType: MarkType, toArr = false): MarkInfo | MarkInfo[] | undefined {
  const { selection, doc } = state;
  const { $from, $to } = selection;

  const fromMark = $from.marks().find((mark) => mark.type === markType);
  const toMark = $to.marks().find((mark) => mark.type === markType);

  let markFound: MarkInfo | undefined;
  const marksFound: MarkInfo[] = [];

  doc.nodesBetween($from.pos, $to.pos, (node, from) => {
    if (node.marks) {
      const actualMark = node.marks.find((mark) => mark.type === markType);
      if (actualMark) {
        markFound = {
          from,
          to: from + node.nodeSize,
          attrs: actualMark.attrs as Record<string, unknown>,
          contained: !fromMark || !toMark || fromMark === toMark,
        };
        marksFound.push(markFound);
      }
    }
  });

  if (toArr) {
    return marksFound;
  }

  return markFound;
}
