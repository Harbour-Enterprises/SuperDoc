import { Fragment, Slice } from 'prosemirror-model';
import { canSplit } from 'prosemirror-transform';
import { TextSelection } from 'prosemirror-state';
import { Attribute } from '../Attribute.js';
import { getNodeType } from '../helpers/getNodeType.js';

/**
 * Splits one list item into two separate list items.
 * @param typeOrName The type or name of the node.
 *
 * The command is a slightly modified version of the original
 * `splitListItem` command to better manage attributes and marks.
 * https://github.com/ProseMirror/prosemirror-schema-list/blob/master/src/schema-list.ts#L114
 */
export const splitListItem = (typeOrName) => (props) => {
  const { tr, state, dispatch, editor } = props;
  const type = getNodeType(typeOrName, state.schema);
  const { $from, $to, node } = state.selection;

  if ((node && node.isBlock) || $from.depth < 2 || !$from.sameParent($to)) {
    return false;
  }

  const grandParent = $from.node(-1);
  if (grandParent.type !== type) {
    return false;
  }

  const extensionAttrs = editor.extensionService.attributes;

  if ($from.parent.content.size === 0 && $from.node(-1).childCount === $from.indexAfter(-1)) {
    // In an empty block. If this is a nested list, the wrapping
    // list item should be split. Otherwise, bail out and let next
    // command handle lifting.

    if (
      $from.depth === 2 || // 3
      $from.node(-3).type !== type ||
      $from.index(-2) !== $from.node(-2).childCount - 1
    ) {
      return false;
    }

    if (dispatch) {
      let wrap = Fragment.empty;
      const depthBefore = $from.index(-1) ? 1 : $from.index(-2) ? 2 : 3;

      // Build a fragment containing empty versions of the structure
      // from the outer list item to the parent node of the cursor
      for (let d = $from.depth - depthBefore; d >= $from.depth - 3; d--) {
        wrap = Fragment.from($from.node(d).copy(wrap));
      }

      //prettier-ignore
      const depthAfter = $from.indexAfter(-1) < $from.node(-2).childCount ? 1 : $from.indexAfter(-2) < $from.node(-3).childCount ? 2 : 3;

      const newNextTypeAttrs = Attribute.getSplittedAttributes(
        extensionAttrs,
        $from.node().type.name,
        $from.node().attrs,
      );

      const nextType = type.contentMatch.defaultType?.createAndFill(newNextTypeAttrs) || undefined;
      wrap = wrap.append(Fragment.from(type.createAndFill(null, nextType) || undefined));
      const start = $from.before($from.depth - (depthBefore - 1));
      tr.replace(start, $from.after(-depthAfter), new Slice(wrap, 4 - depthBefore, 0));

      let sel = -1;
      tr.doc.nodesBetween(start, tr.doc.content.size, (n, pos) => {
        if (sel > -1) return false;
        if (n.isTextblock && n.content.size === 0) sel = pos + 1;
      });
      if (sel > -1) tr.setSelection(TextSelection.near(tr.doc.resolve(sel))); // Selection
      tr.scrollIntoView();
    }

    return true;
  }

  const nextType = $to.pos === $from.end() ? grandParent.contentMatchAt(0).defaultType : null;

  const newTypeAttributes = Attribute.getSplittedAttributes(extensionAttrs, grandParent.type.name, grandParent.attrs);
  const newNextTypeAttributes = Attribute.getSplittedAttributes(
    extensionAttrs,
    $from.node().type.name,
    $from.node().attrs,
  );

  tr.delete($from.pos, $to.pos);

  const types = nextType
    ? [
        { type, attrs: newTypeAttributes },
        { type: nextType, attrs: newNextTypeAttributes },
      ]
    : [{ type, attrs: newTypeAttributes }];

  if (!canSplit(tr.doc, $from.pos, 2)) {
    return false;
  }

  if (dispatch) {
    const { selection, storedMarks } = state;
    const { splittableMarks } = editor.extensionService;
    const marks = storedMarks || (selection.$to.parentOffset && selection.$from.marks());

    tr.split($from.pos, 2, types).scrollIntoView();

    if (!marks || !dispatch) return true;

    const filteredMarks = marks.filter((m) => splittableMarks.includes(m.type.name));
    tr.ensureMarks(filteredMarks);

    // Add meta so we know which transactions are actually updating list items
    tr.setMeta('splitListItem', filteredMarks);
  }

  return true;
};
