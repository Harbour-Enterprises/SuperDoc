import { CellSelection, deleteColumn, deleteRow, TableMap } from 'prosemirror-tables';
import { Plugin } from 'prosemirror-state';

function isFullRowSelection(selection) {
  if (!(selection instanceof CellSelection)) return false;

  const map = TableMap.get(selection.$anchorCell.node(-1));
  const start = selection.$anchorCell.start(-1);
  const rect = map.rectBetween(selection.$anchorCell.pos - start, selection.$headCell.pos - start);

  return rect.left === 0 && rect.right === map.width;
}

function isFullColumnSelection(selection) {
  if (!(selection instanceof CellSelection)) return false;

  const map = TableMap.get(selection.$anchorCell.node(-1));
  const start = selection.$anchorCell.start(-1);
  const rect = map.rectBetween(selection.$anchorCell.pos - start, selection.$headCell.pos - start);

  return rect.top === 0 && rect.bottom === map.height;
}

export const deleteOnDeleteKeyPlugin = new Plugin({
  props: {
    handleKeyDown(view, event) {
      const { state, dispatch } = view;

      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (isFullRowSelection(state.selection)) {
          deleteRow(state, dispatch);
          return true;
        }
        if (isFullColumnSelection(state.selection)) {
          event.preventDefault();
          deleteColumn(state, dispatch);
          dispatch(view.state.tr.setMeta('columnDelete', true));

          return true;
        }
      }

      return false;
    },
  },
});
