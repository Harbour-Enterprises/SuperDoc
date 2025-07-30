import { Node, Attribute } from '@core/index.js';
import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';

export const TabNode = Node.create({
  name: 'tab',
  group: 'inline',
  inline: true,
  // need this prop so Prosemirror doesn't treat tab as an
  // empty node and doesn't insert separator after
  content: 'inline*',
  selectable: false,
  atom: true,

  addOptions() {
    return {
      htmlAttributes: {
        class: 'sd-editor-tab',
        // this works together with content prop:
        // since tab can't have content inside but content prop is defined I have to manually add attribute
        contentEditable: false,
      },
    };
  },

  parseDOM() {
    return [{ tag: 'span.sd-editor-tab' }];
  },

  renderDOM({ htmlAttributes }) {
    return ['span', Attribute.mergeAttributes(this.options.htmlAttributes, htmlAttributes), 0];
  },

  addAttributes() {
    return {
      tabSize: {
        renderDOM: ({ tabSize }) => {
          if (!tabSize) return {};
          const style = `width: ${tabSize}px; min-width: ${tabSize}px;`;
          return { style };
        },
      },
    };
  },

  addPmPlugins() {
    const { view } = this.editor;
    const tabPlugin = new Plugin({
      name: 'tabPlugin',
      key: new PluginKey('tabPlugin'),
      state: {
        init(_, state) {
          let decorations = getTabDecorations(state, state, state.tr, view);
          return { decorations: DecorationSet.create(state.doc, decorations), initial: true };
        },
        apply(tr, oldValue, oldState, newState) {
          if (!tr.docChanged && !oldValue.initial) return oldValue;
          const decorations = getTabDecorations(oldState, newState, tr, view);
          return { decorations: DecorationSet.create(newState.doc, decorations), initial: false };
        },
      },
      props: {
        decorations(state) {
          return this.getState(state).decorations;
        },
      },
    });
    return [tabPlugin];
  },
});

const tabWidthPx = 48;

const getTabDecorations = (oldState, newState, tr, view) => {
  let decorations = [];
  const invertMapping = tr.mapping.invert();
  newState.doc.descendants((node, pos, parent) => {
    if (node.type.name === 'tab') {
      let extraStyles = '';
      let $pos = newState.doc.resolve(pos);
      let tabWidth;
      if ($pos.depth === 1 && parent.attrs.tabStops && parent.attrs.tabStops.length > 0) {
        let tabCount = -1,
          childCount = -1,
          child;
        while (child !== node) {
          child = parent.child(++childCount);
          if (child.type.name === 'tab') {
            tabCount++;
          }
        }

        const tabStop = parent.attrs.tabStops[tabCount];
        if (tabStop) {
          tabWidth = tabStop.pos - calcNodeLeftOffset(view, invertMapping.map(pos));
          if (['end', 'center'].includes(tabStop.val)) {
            // TODO: support for "bar", "clear", "decimal", "num" (deprecated).
            let nextTextWidth = 0,
              foundTab = false;
            let text = '';
            newState.doc.nodesBetween(
              pos + node.nodeSize,
              pos - $pos.parentOffset + parent.nodeSize,
              (node, nodePos) => {
                if (node.type.name === 'tab') {
                  foundTab = true;
                }
                if (foundTab) {
                  return false;
                }
                if (node.isText) {
                  const textWidthForNode = calcTextWidth(view, invertMapping.map(nodePos));
                  text += node.text;
                  nextTextWidth += textWidthForNode;
                }
              },
            );
            tabWidth -= tabStop.val === 'end' ? nextTextWidth : nextTextWidth / 2;
          }
          if (tabStop.leader) {
            // TODO: The following styles will likely not correspond 1:1 to the original. Adjust as needed.
            if (tabStop.leader === 'dot') {
              extraStyles += `border-bottom: 1px dotted black;`;
            } else if (tabStop.leader === 'heavy') {
              extraStyles += `border-bottom: 2px solid black;`;
            } else if (tabStop.leader === 'hyphen') {
              extraStyles += `border-bottom: 1px solid black;`;
            } else if (tabStop.leader === 'middleDot') {
              extraStyles += `border-bottom: 1px dotted black; margin-bottom: 2px;`;
            } else if (tabStop.leader === 'underscore') {
              extraStyles += `border-bottom: 1px solid black;`;
            }
          }
        }
      }

      if (!tabWidth || tabWidth < 0) {
        const prevNodeSize = $pos.nodeBefore?.nodeSize || 0;

        let prevTextWidth = 0;

        try {
          newState.doc.nodesBetween(pos - prevNodeSize - 1, pos - 1, (node, nodePos) => {
            if (node.isText && node.textContent !== ' ') {
              const textWidthForNode = calcTextWidth(view, invertMapping.map(nodePos));
              prevTextWidth += textWidthForNode;
            }
          });
        } catch (_e) {
          return;
        }
        tabWidth = $pos.nodeBefore?.type.name === 'tab' ? tabWidthPx : tabWidthPx - (prevTextWidth % tabWidthPx);
      }

      const tabHeight = calcTabHeight($pos);

      decorations.push(
        Decoration.node(pos, pos + node.nodeSize, {
          style: `width: ${tabWidth}px; height: ${tabHeight};${extraStyles}`,
        }),
      );
    }
  });
  return decorations;
};

function calcTextWidth(view, pos) {
  const domNode = view.nodeDOM(pos);
  if (!domNode || !domNode.textContent) return 0;
  const temp = document.createElement('span');
  const style = window.getComputedStyle(domNode.nodeName === '#text' ? domNode.parentNode : domNode);

  // Copy relevant styles
  temp.style.cssText = `
        position: absolute;
        top: -9999px;
        left: -9999px;
        white-space: nowrap;
        font-family: ${style.fontFamily};
        font-size: ${style.fontSize};
        font-weight: ${style.fontWeight};
        font-style: ${style.fontStyle};
        letter-spacing: ${style.letterSpacing};
        word-spacing: ${style.wordSpacing};
        text-transform: ${style.textTransform};
        display: inline-block;
    `;

  temp.textContent = domNode.textContent;
  document.body.appendChild(temp);

  const width = temp.offsetWidth;
  document.body.removeChild(temp);

  return width;
}

function calcNodeLeftOffset(view, pos) {
  let domNode = view.nodeDOM(pos);
  if (!domNode) {
    return 0;
  }
  const range = document.createRange();
  range.selectNode(domNode);
  const childLeft = range.getBoundingClientRect().left;
  range.selectNodeContents(domNode.parentElement);
  const parentLeft = range.getBoundingClientRect().left;
  return childLeft - parentLeft;
}

function calcTabHeight(pos) {
  const ptToPxRatio = 1.333;
  const defaultFontSize = 16;
  const defaultLineHeight = 1.1;

  const blockParent = pos.node(1);
  const parentTextStyleMark = blockParent.firstChild.marks.find((mark) => mark.type.name === 'textStyle');

  const fontSize = parseInt(parentTextStyleMark?.attrs.fontSize) * ptToPxRatio || defaultFontSize;

  return `${fontSize * defaultLineHeight}px`;
}
