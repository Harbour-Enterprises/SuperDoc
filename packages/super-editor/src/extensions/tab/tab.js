import { Node, Attribute } from '@core/index.js';
import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import { ReplaceStep, ReplaceAroundStep } from 'prosemirror-transform';
import { DOMSerializer } from 'prosemirror-model';

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
    const { view, schema } = this.editor;
    const domSerializer = DOMSerializer.fromSchema(schema);

    const tabPlugin = new Plugin({
      name: 'tabPlugin',
      key: new PluginKey('tabPlugin'),
      state: {
        init(_, state) {
          const decorations = DecorationSet.create(
            state.doc,
            getTabDecorations(state, state, state.tr, view, domSerializer),
          );
          return { decorations };
        },
        apply(tr, { decorations }, oldState, newState) {
          if (!tr.docChanged) {
            return { decorations };
          }
          decorations = decorations.map(tr.mapping, tr.doc);

          let rangesToRecalculate = [];
          tr.steps.forEach((step, index) => {
            const stepMap = step.getMap();
            if (step instanceof ReplaceStep || step instanceof ReplaceAroundStep) {
              const $from = tr.docs[index].resolve(step.from);
              const $to = tr.docs[index].resolve(step.to);
              const start = $from.start(1); // start of node at level 1
              const end = $to.end(1); // end of node at level 1
              let addRange = false;
              tr.docs[index].nodesBetween(start, end, (node) => {
                if (node.type.name === 'tab') {
                  // Node contains or contained a tab
                  addRange = true;
                }
              });
              if (!addRange && step.slice?.content) {
                step.slice.content.descendants((node) => {
                  if (node.type.name === 'tab') {
                    // A tab was added.
                    addRange = true;
                  }
                });
              }
              if (addRange) {
                rangesToRecalculate.push([start, end]);
              }
            }
            rangesToRecalculate = rangesToRecalculate.map(([from, to]) => {
              const mappedFrom = stepMap.map(from, -1);
              const mappedTo = stepMap.map(to, 1);
              return [mappedFrom, mappedTo];
            });
          });
          rangesToRecalculate.forEach(([start, end]) => {
            const oldDecorations = decorations.find(start, end);
            decorations = decorations.remove(oldDecorations);
            const newDecorations = getTabDecorations(oldState, newState, tr, view, domSerializer, start, end);
            decorations = decorations.add(newState.doc, newDecorations);
          });
          return { decorations };
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

const getTabDecorations = (oldState, newState, tr, view, domSerializer, from = 0, to = null) => {
  if (!to) {
    to = newState.doc.content.size;
  }
  const nodeWidthCache = {};
  let decorations = [];
  const invertMapping = tr.mapping.invert();
  newState.doc.nodesBetween(from, to, (node, pos, parent) => {
    if (node.type.name === 'tab') {
      let extraStyles = '';
      const $pos = newState.doc.resolve(pos);
      let tabWidth;
      const tabIndex = $pos.index($pos.depth);
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
          //tabWidth = tabStop.pos - calcNodeLeftOffset(view, invertMapping.map(pos));
          //tabWidth = tabStop.pos - calcNodeLeftOffset(parent, tabIndex, pos - $pos.parentOffset, domSerializer, invertMapping, nodeWidthCache);
          tabWidth =
            tabStop.pos -
            calcChildNodesWidth(
              parent,
              pos - $pos.parentOffset,
              0,
              tabIndex,
              domSerializer,
              view,
              invertMapping,
              nodeWidthCache,
            );

          if (['end', 'center'].includes(tabStop.val)) {
            // TODO: support for "bar", "clear", "decimal", "num" (deprecated).
            let nextTabIndex = tabIndex + 1;
            while (nextTabIndex < parent.childCount && parent.child(nextTabIndex).type.name !== 'tab') {
              nextTabIndex++;
            }
            const tabSectionWidth = calcChildNodesWidth(
              parent,
              pos - $pos.parentOffset,
              tabIndex,
              nextTabIndex,
              domSerializer,
              view,
              invertMapping,
              nodeWidthCache,
            );
            tabWidth -= tabStop.val === 'end' ? tabSectionWidth : tabSectionWidth / 2;
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
        let lastTabIndex = tabIndex - 1;

        while (lastTabIndex >= 0 && parent.child(lastTabIndex).type.name !== 'tab') {
          lastTabIndex--;
        }

        tabWidth = Math.max(
          0,
          tabWidthPx -
            calcChildNodesWidth(
              parent,
              pos - $pos.parentOffset,
              lastTabIndex,
              tabIndex,
              domSerializer,
              view,
              invertMapping,
              nodeWidthCache,
            ),
        );
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

function calcNodeWidth(domSerializer, node, view, oldPos) {
  // Create dom node of node. Then calculate width.
  const oldDomNode = view.nodeDOM(oldPos);
  const styleReference = oldDomNode ? (oldDomNode.nodeName === '#text' ? oldDomNode.parentNode : oldDomNode) : view.dom;
  const temp = document.createElement('div');
  const style = window.getComputedStyle(styleReference);
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

  const domNode = domSerializer.serializeNode(node);

  temp.appendChild(domNode);
  document.body.appendChild(temp);

  const width = temp.offsetWidth;
  document.body.removeChild(temp);

  return width;
}

function calcChildNodesWidth(
  parent,
  parentPos,
  startIndex,
  endIndex,
  domSerializer,
  view,
  invertMapping,
  nodeWidthCache,
) {
  let pos = parentPos;
  let width = 0;
  for (let i = 0; i < endIndex; i++) {
    const node = parent.child(i);
    if (i >= startIndex) {
      if (!nodeWidthCache[pos]) {
        nodeWidthCache[pos] = calcNodeWidth(domSerializer, node, view, invertMapping.map(pos));
      }
      width += nodeWidthCache[pos];
    }
    pos += node.nodeSize;

    // TODO: This assumes no space between inline sibling nodes.
  }
  return width;
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
