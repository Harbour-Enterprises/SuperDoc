import { NodeSelection, TextSelection } from 'prosemirror-state';
import type { Command } from '../types/ChainedCommands.js';
import { canSplit } from 'prosemirror-transform';
import { defaultBlockAt } from '../helpers/defaultBlockAt.js';
import { Attribute, type AttributeValue } from '../Attribute.js';
import type { EditorState } from 'prosemirror-state';

const ensureMarks = (state: EditorState, splittableMarks: string[]): void => {
  const marks = state.storedMarks || (state.selection.$to.parentOffset && state.selection.$from.marks());
  if (marks) {
    const filtered = marks.filter((m) => splittableMarks?.includes(m.type.name));
    state.tr.ensureMarks(filtered);
  }
};

/**
 * Will split the current node into two nodes. If the selection is not
 * splittable, the command will be ignored.
 * @param options.keepMarks Keep marks from prev node.
 *
 * The command is a slightly modified version of the original
 * `splitBlockAs` command to better manage attributes and marks.
 * https://github.com/ProseMirror/prosemirror-commands/blob/master/src/commands.ts#L357
 */
export const splitBlock =
  ({
    keepMarks = true,
    attrsToRemoveOverride = [],
  }: { keepMarks?: boolean; attrsToRemoveOverride?: string[] } = {}): Command =>
  (props) => {
    const { tr, state, dispatch, editor } = props;
    const { selection, doc } = tr;
    const { $from, $to } = selection;

    const extensionAttrs = editor.extensionService.attributes;
    let newAttrs: Record<string, AttributeValue> = Attribute.getSplittedAttributes(
      extensionAttrs,
      $from.node().type.name,
      $from.node().attrs,
    ) as Record<string, AttributeValue>;

    // Remove any overridden attributes
    if (attrsToRemoveOverride.length > 0) {
      newAttrs = deleteAttributes(newAttrs, attrsToRemoveOverride);
    }

    if (selection instanceof NodeSelection && selection.node.isBlock) {
      if (!$from.parentOffset || !canSplit(doc, $from.pos)) return false;
      if (dispatch) {
        if (keepMarks) ensureMarks(state, editor.extensionService.splittableMarks);
        tr.split($from.pos).scrollIntoView();
      }
      return true;
    }

    if (!$from.parent.isBlock) return false;

    if (dispatch) {
      const atEnd = $to.parentOffset === $to.parent.content.size;
      if (selection instanceof TextSelection) tr.deleteSelection();
      const deflt = $from.depth === 0 ? null : defaultBlockAt($from.node(-1).contentMatchAt($from.indexAfter(-1)));

      let types = atEnd && deflt ? [{ type: deflt, attrs: newAttrs }] : undefined;
      let can = canSplit(tr.doc, tr.mapping.map($from.pos), 1, types);

      if (!types && !can && canSplit(tr.doc, tr.mapping.map($from.pos), 1, deflt ? [{ type: deflt }] : undefined)) {
        can = true;
        types = deflt ? [{ type: deflt, attrs: newAttrs }] : undefined;
      }

      if (can) {
        tr.split(tr.mapping.map($from.pos), 1, types);

        if (deflt && !atEnd && !$from.parentOffset && $from.parent.type !== deflt) {
          const first = tr.mapping.map($from.before());
          const $first = tr.doc.resolve(first);
          if ($from.node(-1).canReplaceWith($first.index(), $first.index() + 1, deflt)) {
            tr.setNodeMarkup(tr.mapping.map($from.before()), deflt);
          }
        }
      }

      if (keepMarks) ensureMarks(state, editor.extensionService.splittableMarks);
      tr.scrollIntoView();
    }

    return true;
  };

function deleteAttributes(attrs: Record<string, unknown>, attrsToRemove: string[]): Record<string, unknown> {
  const newAttrs = { ...attrs };
  attrsToRemove.forEach((attrName) => {
    const parts = attrName.split('.');
    if (parts.length === 1) {
      delete newAttrs[attrName];
    } else {
      let current: Record<string, unknown> = newAttrs;
      for (let i = 0; i < parts.length - 1; i++) {
        if (current[parts[i]] == null) return;
        current = current[parts[i]] as Record<string, unknown>;
      }
      delete current[parts[parts.length - 1]];
    }
  });
  return newAttrs;
}
