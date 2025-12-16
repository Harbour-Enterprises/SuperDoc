import { Mapping, ReplaceStep, AddMarkStep, RemoveMarkStep, type Step } from 'prosemirror-transform';
import { TextSelection, type EditorState, type Transaction } from 'prosemirror-state';
import { replaceStep } from './replaceStep.js';
import { addMarkStep } from './addMarkStep.js';
import { removeMarkStep } from './removeMarkStep.js';
import { TrackDeleteMarkName } from '../constants.js';
import { findMark } from '@core/helpers/index.js';
import { CommentsPluginKey } from '../../comment/comments-plugin.js';
import type { User } from '@core/types/EditorConfig.js';

type TrackedTransactionParams = {
  tr: Transaction;
  state: EditorState;
  user: User;
};

type FoundMark = {
  from: number;
  to: number;
  attrs: Record<string, unknown>;
  contained?: boolean;
};

/**
 * Tracked transaction to track changes.
 * @param {{ tr: import('prosemirror-state').Transaction; state: import('prosemirror-state').EditorState; user: import('@core/types/EditorConfig.js').User }} params
 * @returns {import('prosemirror-state').Transaction} Modified transaction.
 */
export const trackedTransaction = ({ tr, state, user }: TrackedTransactionParams): Transaction => {
  const onlyInputTypeMeta = ['inputType', 'uiEvent', 'paste', 'pointer'];
  const notAllowedMeta = ['historyUndo', 'historyRedo', 'acceptReject'];
  const isProgrammaticInput = tr.getMeta('inputType') === 'programmatic';
  const metaKeys = Object.keys((tr as unknown as { meta?: Record<string, unknown> }).meta || {});
  const hasUnexpectedMeta = metaKeys.length > 0 && !metaKeys.every((meta) => onlyInputTypeMeta.includes(meta));

  if (
    !tr.steps.length ||
    (hasUnexpectedMeta && !isProgrammaticInput) ||
    notAllowedMeta.includes(tr.getMeta('inputType')) ||
    tr.getMeta(CommentsPluginKey) // Skip if it's a comment transaction.
  ) {
    return tr;
  }

  const newTr = state.tr;
  const map = new Mapping();
  const fixedTimeTo10Mins = Math.floor(Date.now() / 600000) * 600000;
  const date = new Date(fixedTimeTo10Mins).toISOString();

  tr.steps.forEach((originalStep: Step, originalStepIndex: number) => {
    const step = originalStep.map(map);
    const { doc } = newTr;

    if (!step) {
      return;
    }

    if (step instanceof ReplaceStep) {
      const originalReplaceStep = originalStep as ReplaceStep;
      replaceStep({
        state,
        tr,
        step,
        newTr,
        map,
        user,
        date,
        originalStep: originalReplaceStep,
        originalStepIndex,
      });
    } else if (step instanceof AddMarkStep) {
      addMarkStep({
        state,
        step,
        newTr,
        doc,
        user,
        date,
      });
    } else if (step instanceof RemoveMarkStep) {
      removeMarkStep({
        state,
        step,
        newTr,
        doc,
        user,
        date,
      });
    } else {
      newTr.step(step);
    }
  });

  if (tr.getMeta('inputType')) {
    newTr.setMeta('inputType', tr.getMeta('inputType'));
  }

  if (tr.getMeta('uiEvent')) {
    newTr.setMeta('uiEvent', tr.getMeta('uiEvent'));
  }

  if (tr.getMeta('addToHistory') !== undefined) {
    newTr.setMeta('addToHistory', tr.getMeta('addToHistory'));
  }

  if (tr.selectionSet) {
    const deletionMarkSchema = state.schema.marks[TrackDeleteMarkName];
    const deletionMarkResult = findMark(state, deletionMarkSchema, false) as FoundMark | FoundMark[] | undefined;
    const deletionMark = Array.isArray(deletionMarkResult) ? deletionMarkResult[0] : deletionMarkResult;

    if (
      tr.selection instanceof TextSelection &&
      (tr.selection.from < state.selection.from || tr.getMeta('inputType') === 'deleteContentBackward')
    ) {
      const caretPos = map.map(tr.selection.from, -1);
      newTr.setSelection(new TextSelection(newTr.doc.resolve(caretPos)));
    } else if (tr.selection.from > state.selection.from && deletionMark) {
      const caretPos = map.map(deletionMark.to + 1, 1);
      newTr.setSelection(new TextSelection(newTr.doc.resolve(caretPos)));
    } else {
      newTr.setSelection(tr.selection.map(newTr.doc, map));
    }
  } else if (state.selection.from - tr.selection.from > 1 && tr.selection.$head.depth > 1) {
    const caretPos = map.map(tr.selection.from - 2, -1);
    newTr.setSelection(new TextSelection(newTr.doc.resolve(caretPos)));
  } else {
    // Skip the other cases for now.
  }

  if (tr.storedMarksSet) {
    newTr.setStoredMarks(tr.storedMarks);
  }

  if (tr.scrolledIntoView) {
    newTr.scrollIntoView();
  }

  return newTr;
};
