import { TrackDeleteMarkName, TrackFormatMarkName } from '../constants.js';
import { v4 as uuidv4 } from 'uuid';
import { objectIncludes } from '@core/utilities/objectIncludes.js';
import { TrackChangesBasePluginKey } from '../plugins/trackChangesBasePlugin.js';
import { CommentsPluginKey } from '../../comment/comments-plugin.js';
import type { EditorState, Transaction } from 'prosemirror-state';
import type { AddMarkStep } from 'prosemirror-transform';
import type { Mark as PmMark, Node as PmNode } from 'prosemirror-model';
import type { User } from '@core/types/EditorConfig.js';

type FormatChange = { type: string; attrs: Record<string, unknown> };

type AddMarkStepParams = {
  state: EditorState;
  step: AddMarkStep;
  newTr: Transaction;
  doc: PmNode;
  user: User;
  date: string;
};

/**
 * Add mark step.
 * @param {import('prosemirror-state').EditorState} options.state Editor state.
 * @param {import('prosemirror-state').Transaction} options.tr Transaction.
 * @param {import('prosemirror-transform').AddMarkStep} options.step Step.
 * @param {import('prosemirror-state').Transaction} options.newTr New transaction.
 * @param {import('prosemirror-transform').Mapping} options.map Map.
 * @param {import('prosemirror-model').Node} options.doc Doc.
 * @param {object} options.user User object ({ name, email }).
 * @param {string} options.date Date.
 */
export const addMarkStep = ({ state, step, newTr, doc, user, date }: AddMarkStepParams): void => {
  const meta: { formatMark?: PmMark; step?: AddMarkStep } = {};

  doc.nodesBetween(step.from, step.to, (node: PmNode, pos: number) => {
    if (!node.isInline) {
      return;
    }

    if (node.marks.find((mark) => mark.type.name === TrackDeleteMarkName)) {
      return false;
    }

    const existingChangeMark = node.marks.find((mark) =>
      [TrackDeleteMarkName, TrackFormatMarkName].includes(mark.type.name),
    );
    const wid = existingChangeMark ? (existingChangeMark.attrs as Record<string, unknown>).id : uuidv4();
    newTr.addMark(Math.max(step.from, pos), Math.min(step.to, pos + node.nodeSize), step.mark);

    const allowedMarks: string[] = ['bold', 'italic', 'strike', 'underline', 'textStyle'];

    // ![TrackDeleteMarkName].includes(step.mark.type.name)
    if (allowedMarks.includes(step.mark.type.name) && !node.marks.find((mark) => mark.type === step.mark.type)) {
      const formatChangeMark = node.marks.find((mark) => mark.type.name === TrackFormatMarkName);

      let after: FormatChange[] = [];
      let before: FormatChange[] = [];

      if (formatChangeMark) {
        const foundBefore = (formatChangeMark.attrs as { before: FormatChange[]; after: FormatChange[] }).before.find(
          (mark) => {
            if (mark.type === 'textStyle') {
              return mark.type === step.mark.type.name && objectIncludes(mark.attrs, step.mark.attrs);
            }
            return mark.type === step.mark.type.name;
          },
        );

        if (foundBefore) {
          before = [
            ...(formatChangeMark.attrs as { before: FormatChange[]; after: FormatChange[] }).before.filter(
              (mark) => mark.type !== step.mark.type.name,
            ),
          ];
          after = [...(formatChangeMark.attrs as { before: FormatChange[]; after: FormatChange[] }).after];
        } else {
          before = [...(formatChangeMark.attrs as { before: FormatChange[]; after: FormatChange[] }).before];
          after = [
            ...(formatChangeMark.attrs as { before: FormatChange[]; after: FormatChange[] }).after,
            {
              type: step.mark.type.name,
              attrs: { ...(step.mark.attrs as Record<string, unknown>) },
            },
          ];
        }
      } else {
        // before = [];
        before = node.marks.map((mark) => ({
          type: mark.type.name,
          attrs: { ...(mark.attrs as Record<string, unknown>) },
        }));

        after = [
          {
            type: step.mark.type.name,
            attrs: { ...(step.mark.attrs as Record<string, unknown>) },
          },
        ];
      }

      if (after.length || before.length) {
        const newFormatMark = state.schema.marks[TrackFormatMarkName].create({
          id: wid,
          author: user.name,
          authorEmail: user.email,
          authorImage: user.image,
          date,
          before,
          after,
        });
        newTr.addMark(
          step.from, // Math.max(step.from, pos)
          step.to, // Math.min(step.to, pos + node.nodeSize),
          newFormatMark,
        );

        meta.formatMark = newFormatMark;
        meta.step = step;

        newTr.setMeta(TrackChangesBasePluginKey, meta);
        newTr.setMeta(CommentsPluginKey, { type: 'force' });
      } else if (formatChangeMark) {
        newTr.removeMark(Math.max(step.from, pos), Math.min(step.to, pos + node.nodeSize), formatChangeMark);
      }
    }
  });
};
