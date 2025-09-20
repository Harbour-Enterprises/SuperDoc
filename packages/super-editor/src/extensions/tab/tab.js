import { Node, Attribute } from '@core/index.js';
import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import { ReplaceStep, ReplaceAroundStep, StepMap } from 'prosemirror-transform';
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
        init() {
          return { decorations: false };
        },
        apply(tr, { decorations }, _oldState, newState) {
          if (!decorations) {
            decorations = DecorationSet.create(
              newState.doc,
              getTabDecorations(newState.doc, StepMap.empty, view, domSerializer),
            );
          }

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
              const start = $from.start(Math.min($from.depth, 1)); // start of node at level 1
              const end = $to.end(Math.min($to.depth, 1)); // end of node at level 1
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
            const invertMapping = tr.mapping.invert();
            const newDecorations = getTabDecorations(newState.doc, invertMapping, view, domSerializer, start, end);
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

const defaultTabDistance = 48;
const defaultLineLength = 816;

const getTabDecorations = (doc, invertMapping, view, domSerializer, from = 0, to = null) => {
  if (!to) {
    to = doc.content.size;
  }
  const paragraphCache = new Map();
  let decorations = [];
  doc.nodesBetween(from, to, (node, pos) => {
    if (node.type.name !== 'tab') return;

    let extraStyles = '';
    const $pos = doc.resolve(pos);
    const paragraphContext = getParagraphContext($pos, paragraphCache);
    if (!paragraphContext) return;

    const { tabStops, flattened, startPos } = paragraphContext;
    const entryIndex = flattened.findIndex((entry) => entry.pos === pos);
    if (entryIndex === -1) return;

    const indentWidth = getIndentWidth(view, startPos, paragraphContext.indent);
    const currentWidth = indentWidth + measureRangeWidth(view, startPos + 1, pos);

    let tabWidth;
    if (tabStops.length) {
      const tabStop = tabStops.find((stop) => stop.pos > currentWidth && stop.val !== 'clear');
      if (tabStop) {
        tabWidth = tabStop.pos - currentWidth;

        if (tabStop.val === 'center' || tabStop.val === 'end' || tabStop.val === 'right') {
          const nextTabIndex = findNextTabIndex(flattened, entryIndex + 1);
          const segmentStartPos = pos + node.nodeSize;
          const segmentEndPos =
            nextTabIndex === -1 ? startPos + paragraphContext.paragraph.nodeSize - 1 : flattened[nextTabIndex].pos;
          const segmentWidth = measureRangeWidth(view, segmentStartPos, segmentEndPos);
          tabWidth -= tabStop.val === 'center' ? segmentWidth / 2 : segmentWidth;
        } else if (tabStop.val === 'decimal' || tabStop.val === 'num') {
          const breakChar = tabStop.decimalChar || '.';
          const decimalPos = findDecimalBreakPos(flattened, entryIndex + 1, breakChar);
          const integralWidth = decimalPos
            ? measureRangeWidth(view, pos + node.nodeSize, decimalPos)
            : measureRangeWidth(view, pos + node.nodeSize, startPos + paragraphContext.paragraph.nodeSize - 1);
          tabWidth -= integralWidth;
        }

        if (tabStop.leader) {
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

    if (!tabWidth || tabWidth < 1) {
      tabWidth = defaultTabDistance - ((currentWidth % defaultLineLength) % defaultTabDistance);
      if (tabWidth === 0) tabWidth = defaultTabDistance;
    }

    const tabHeight = calcTabHeight($pos);

    decorations.push(
      Decoration.node(pos, pos + node.nodeSize, {
        style: `width: ${tabWidth}px; height: ${tabHeight};${extraStyles}`,
      }),
    );
  });
  return decorations;
};

function getParagraphContext($pos, cache) {
  for (let depth = $pos.depth; depth >= 0; depth--) {
    const node = $pos.node(depth);
    if (node?.type?.name === 'paragraph') {
      const startPos = $pos.start(depth);
      if (!cache.has(startPos)) {
        cache.set(startPos, {
          paragraph: node,
          paragraphDepth: depth,
          startPos,
          indent: node.attrs?.indent || {},
          tabStops: Array.isArray(node.attrs?.tabStops) ? node.attrs.tabStops : [],
          flattened: flattenParagraph(node, startPos),
        });
      }
      return cache.get(startPos);
    }
  }
  return null;
}

function flattenParagraph(paragraph, paragraphStartPos) {
  const entries = [];

  const walk = (node, basePos) => {
    if (!node) return;
    if (node.type?.name === 'run') {
      node.forEach((child, offset) => {
        const childPos = basePos + offset + 1;
        walk(child, childPos);
      });
      return;
    }
    entries.push({ node, pos: basePos });
  };

  paragraph.forEach((child, offset) => {
    const childPos = paragraphStartPos + offset + 1;
    walk(child, childPos);
  });

  return entries;
}

function findNextTabIndex(flattened, fromIndex) {
  for (let i = fromIndex; i < flattened.length; i++) {
    if (flattened[i]?.node?.type?.name === 'tab') {
      return i;
    }
  }
  return -1;
}

function findDecimalBreakPos(flattened, startIndex, breakChar) {
  if (!breakChar) return null;
  for (let i = startIndex; i < flattened.length; i++) {
    const entry = flattened[i];
    if (!entry) break;
    if (entry.node.type?.name === 'tab') break;
    if (entry.node.type?.name === 'text') {
      const index = entry.node.text?.indexOf(breakChar);
      if (index !== undefined && index !== -1) {
        return entry.pos + index + 1;
      }
    }
  }
  return null;
}

function measureRangeWidth(view, from, to) {
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) return 0;
  try {
    const range = document.createRange();
    const fromRef = view.domAtPos(from);
    const toRef = view.domAtPos(to);
    range.setStart(fromRef.node, fromRef.offset);
    range.setEnd(toRef.node, toRef.offset);
    const rect = range.getBoundingClientRect();
    range.detach?.();
    return rect.width || 0;
  } catch (error) {
    const startLeft = getLeftCoord(view, from);
    const endLeft = getLeftCoord(view, to);
    if (startLeft == null || endLeft == null) return 0;
    return Math.max(0, endLeft - startLeft);
  }
}

function getIndentWidth(view, paragraphStartPos, indentAttrs = {}) {
  const marginLeft = getLeftCoord(view, paragraphStartPos);
  const lineLeft = getLeftCoord(view, paragraphStartPos + 1);
  if (marginLeft != null && lineLeft != null) {
    const diff = lineLeft - marginLeft;
    if (!Number.isNaN(diff)) return diff;
  }
  return indentAttrs.firstLine || 0;
}

function getLeftCoord(view, pos) {
  if (!Number.isFinite(pos)) return null;
  try {
    return view.coordsAtPos(pos).left;
  } catch (error) {
    try {
      const ref = view.domAtPos(pos);
      const range = document.createRange();
      range.setStart(ref.node, ref.offset);
      range.setEnd(ref.node, ref.offset);
      const rect = range.getBoundingClientRect();
      range.detach?.();
      return rect.left;
    } catch {
      return null;
    }
  }
}

export const __testing__ = {
  flattenParagraph,
  findNextTabIndex,
  findDecimalBreakPos,
  getParagraphContext,
  measureRangeWidth,
  getIndentWidth,
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

function calcTabHeight(pos) {
  const ptToPxRatio = 1.333;
  const defaultFontSize = 16;
  const defaultLineHeight = 1.1;

  const blockParent = pos.node(1);
  const parentTextStyleMark = blockParent.firstChild.marks.find((mark) => mark.type.name === 'textStyle');

  const fontSize = parseInt(parentTextStyleMark?.attrs.fontSize) * ptToPxRatio || defaultFontSize;

  return `${fontSize * defaultLineHeight}px`;
}
