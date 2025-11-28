import { getMarksFromSelection } from './getMarksFromSelection.js';
import { findMark } from './findMark.js';
import type { EditorState } from 'prosemirror-state';
import type { Mark, MarkType, Node as PmNode } from 'prosemirror-model';
import type { Editor } from '../Editor.js';

type FormattingEntry = { name: string; attrs: Record<string, unknown> | boolean };

export function getActiveFormatting(editor: Editor): FormattingEntry[] {
  const { state } = editor;
  const { selection } = state;

  const marks: Mark[] = getMarksFromSelection(state);
  const markAttrs = selection.$head.parent.attrs.marksAttrs as
    | Array<{ type: string; attrs?: Record<string, unknown> }>
    | undefined;

  const marksToProcess: FormattingEntry[] = marks
    .filter((mark) => !['textStyle', 'link'].includes(mark.type.name))
    .map((mark) => ({ name: mark.type.name, attrs: mark.attrs as Record<string, unknown> }));

  const textStyleMarks = marks.filter((mark) => mark.type.name === 'textStyle');
  marksToProcess.push(...textStyleMarks.flatMap(unwrapTextMarks));

  // Empty paragraphs could have marks defined as attributes
  if (markAttrs) {
    const marksFromAttrs = markAttrs
      .filter((mark) => !['textStyle', 'link'].includes(mark.type))
      .map((mark) => ({ name: mark.type, attrs: mark.attrs || {} }));

    const textStyleMarksFromAttrs = markAttrs.filter((mark) => mark.type === 'textStyle');

    marksToProcess.push(...marksFromAttrs);
    marksToProcess.push(...textStyleMarksFromAttrs.flatMap(unwrapTextMarks));
  }

  const linkMarkType: MarkType | undefined = state.schema.marks['link'];
  const linkMark = linkMarkType
    ? (findMark(state, linkMarkType) as unknown as { from: number; to: number; attrs: Record<string, unknown> } | null)
    : null;

  if (linkMark) {
    const { from, to, attrs } = linkMark;

    if (selection.from >= from && selection.to <= to) {
      marksToProcess.push({ name: 'link', attrs });
    }
  }

  const ignoreKeys = ['paragraphSpacing'];
  const attributes = getActiveAttributes(state);
  Object.keys(attributes).forEach((key) => {
    if (ignoreKeys.includes(key)) return;
    const attrs: Record<string, unknown> = {};
    attrs[key] = attributes[key];
    marksToProcess.push({ name: key, attrs });
  });

  // For fieldAnnotation.
  const textColor = marksToProcess.find((i) => i.name === 'textColor');
  const textHightlight = marksToProcess.find((i) => i.name === 'textHighlight');

  if (textColor && textColor.attrs && typeof textColor.attrs === 'object') {
    marksToProcess.push({
      name: 'color',
      attrs: { color: (textColor.attrs as Record<string, unknown>)?.['textColor'] },
    });
  }
  if (textHightlight && textHightlight.attrs && typeof textHightlight.attrs === 'object') {
    marksToProcess.push({
      name: 'highlight',
      attrs: { color: (textHightlight.attrs as Record<string, unknown>)?.['textHighlight'] },
    });
  }

  const hasPendingFormatting = !!(editor as unknown as { storage?: { formatCommands?: { storedStyle?: unknown } } })
    .storage?.formatCommands?.storedStyle;
  if (hasPendingFormatting) marksToProcess.push({ name: 'copyFormat', attrs: true });

  return marksToProcess;
}

function unwrapTextMarks(textStyleMark: Mark | { attrs?: Record<string, unknown> }): FormattingEntry[] {
  const processedMarks: FormattingEntry[] = [];
  const attrs = (textStyleMark as Mark).attrs ?? (textStyleMark as { attrs?: Record<string, unknown> }).attrs;
  if (!attrs) return processedMarks;
  Object.keys(attrs).forEach((key) => {
    if (!attrs[key]) return;
    processedMarks.push({ name: key, attrs: { [key]: attrs[key] } });
  });
  return processedMarks;
}

function getActiveAttributes(state: EditorState): Record<string, unknown> {
  try {
    const { from, to, empty } = state.selection;
    const attributes: Record<string, unknown> = {};
    const getAttrs = (node: PmNode) => {
      Object.keys(node.attrs).forEach((key) => {
        const value = node.attrs[key];
        if (value) {
          attributes[key] = value;
        }
      });
    };

    const start = from;
    const end = to;
    if (empty) state.doc.nodesBetween(start, end + 1, (node) => getAttrs(node));
    else state.doc.nodesBetween(from, to, (node) => getAttrs(node));
    return attributes;
  } catch {
    return {};
  }
}
