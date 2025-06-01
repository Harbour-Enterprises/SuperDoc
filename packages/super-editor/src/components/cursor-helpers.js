import { TextSelection } from 'prosemirror-state';

/**
 * Calculates cursor position based on margin click event
 * @param {MouseEvent} event Mousedown event
 * @param {SuperEditor} editor SuperEditor instance
 */
export const onMarginClickCursorChange = (event, editor) => {
  const y = event.clientY;
  const x = event.clientX;
  const { view } = editor;
  const editorRect = view.dom.getBoundingClientRect();

  let coords = {
    left: 0,
    top: y,
  };
  let isRightMargin = false;

  if (x > editorRect.right) {
    coords.left = editorRect.left + editorRect.width - 1;
    isRightMargin = true;
  } else if (x < editorRect.left) {
    coords.left = editorRect.left;
  }

  const pos = view.posAtCoords(coords)?.pos;
  if (pos) {
    let cursorPos = pos;

    if (isRightMargin) {
      const $pos = view.state.doc.resolve(pos);
      const charOffset = $pos.textOffset;

      const node = view.state.doc.nodeAt(pos);
      const text = node?.text;
      const charAtPos = text?.charAt(charOffset);

      cursorPos = node?.isText && charAtPos !== ' ' ? pos - 1 : pos;
    }

    const transaction = view.state.tr.setSelection(TextSelection.create(view.state.doc, cursorPos));
    view.dispatch(transaction);
    view.focus();
  }
};
