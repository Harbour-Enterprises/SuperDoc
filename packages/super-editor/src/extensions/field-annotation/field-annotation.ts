import { Node, Attribute } from '@core/index.js';
import type { Editor } from '@core/index.js';
import { FieldAnnotationView } from './FieldAnnotationView.js';
import { FieldAnnotationPlugin } from './FieldAnnotationPlugin.js';
import {
  findFieldAnnotationsByFieldId,
  getAllFieldAnnotations,
  findFieldAnnotationsBetween,
} from './fieldAnnotationHelpers/index.js';
import { toHex } from 'color2k';
import { parseSizeUnit, minMax } from '@core/utilities/index.js';
import { NodeSelection, Selection } from 'prosemirror-state';
import type { EditorState, Transaction } from 'prosemirror-state';
import type { Node as PmNode, Mark as PmMark } from 'prosemirror-model';
import { generateDocxRandomId } from '../../core/helpers/index.js';
import { commands as cleanupCommands } from './cleanup-commands/index.js';
import { isHeadless } from '@/utils/headless-helpers.js';

export const fieldAnnotationName = 'fieldAnnotation';
export const annotationClass = 'annotation';
export const annotationContentClass = 'annotation-content';

interface FieldAnnotationAttributes {
  type?: string;
  defaultDisplayLabel?: string;
  displayLabel?: string;
  imageSrc?: string | null;
  rawHtml?: string | null;
  linkUrl?: string | null;
  fieldId?: string | null;
  fieldType?: string | null;
  fieldColor?: string;
  hidden?: boolean;
  visibility?: string;
  highlighted?: boolean;
  multipleImage?: boolean | string;
  size?: { width: number; height: number } | null;
  extras?: Record<string, unknown>;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  fontFamily?: string | null;
  fontSize?: string | null;
  textHighlight?: string | null;
  textColor?: string | null;
  generatorIndex?: number | null;
  hash?: string | null;
  sdtId?: string | null;
  [key: string]: unknown;
}

interface FieldAnnotationOptions extends Record<string, unknown> {
  htmlAttributes: Record<string, string>;
  annotationClass: string;
  annotationContentClass: string;
  types: string[];
  defaultType: string;
  borderColor: string;
  visibilityOptions: string[];
  handleDropOutside: boolean;
  toggleFormatNames: string[];
}

export const FieldAnnotation = Node.create<FieldAnnotationOptions>({
  name: 'fieldAnnotation',

  group: 'inline',

  inline: true,

  atom: true,

  draggable: true,

  selectable: true,

  addOptions() {
    return {
      htmlAttributes: {
        class: annotationClass,
        'aria-label': 'Field annotation node',
      },
      annotationClass,
      annotationContentClass,
      types: ['text', 'image', 'signature', 'checkbox', 'html', 'link'], // annotation types
      defaultType: 'text',
      borderColor: '#b015b3',
      visibilityOptions: ['visible', 'hidden'],
      handleDropOutside: true,

      /// for y-prosemirror support
      toggleFormatNames: ['bold', 'italic', 'underline'],
    };
  },

  addAttributes() {
    return {
      type: {
        default: this.options?.defaultType ?? 'text',
        parseDOM: (elem: Element) => elem.getAttribute('data-type'),
        renderDOM: (attrs: FieldAnnotationAttributes) => {
          if (!attrs.type) return {};
          return {
            'data-type': attrs.type,
          };
        },
      },

      defaultDisplayLabel: {
        default: '',
        parseDOM: (elem) => elem.getAttribute('data-default-display-label'),
        renderDOM: (attrs: FieldAnnotationAttributes) => {
          if (!attrs.defaultDisplayLabel) return {};
          return {
            'data-default-display-label': attrs.defaultDisplayLabel,
          };
        },
      },

      displayLabel: {
        default: '',
        parseDOM: (elem) => elem.getAttribute('data-display-label'),
        renderDOM: (attrs: FieldAnnotationAttributes) => {
          if (!attrs.displayLabel) return {};
          return {
            'data-display-label': attrs.displayLabel,
          };
        },
      },

      imageSrc: {
        default: null,
        rendered: false,
        parseDOM: (elem) => {
          const img = elem.querySelector('img');
          return img?.getAttribute('src') || null;
        },
      },

      rawHtml: {
        default: null,
        parseDOM: (elem: Element) => {
          try {
            const isHtmlType = elem.getAttribute('data-type') === 'html';
            if (!isHtmlType) return null;
            const rawHtmlAttr = elem.getAttribute('data-raw-html');
            if (!rawHtmlAttr) return null;
            return JSON.parse(rawHtmlAttr);
          } catch (e) {
            console.warn('Paste parse error', e);
          }
          return null;
        },
        renderDOM: (attrs: FieldAnnotationAttributes) => {
          if (!attrs.rawHtml) return {};
          return {
            'data-raw-html': JSON.stringify(attrs.rawHtml),
          };
        },
      },

      linkUrl: {
        default: null,
        rendered: false,
        parseDOM: (elem) => {
          const link = elem.querySelector('a');
          return link?.getAttribute('href') || null;
        },
      },

      fieldId: {
        default: null,
        parseDOM: (elem) => elem.getAttribute('data-field-id'),
        renderDOM: (attrs: FieldAnnotationAttributes) => {
          if (!attrs.fieldId) return {};
          return {
            'data-field-id': attrs.fieldId,
          };
        },
      },

      fieldType: {
        default: null,
        parseDOM: (elem) => elem.getAttribute('data-field-type'),
        renderDOM: (attrs: FieldAnnotationAttributes) => {
          if (!attrs.fieldType) return {};
          return {
            'data-field-type': attrs.fieldType,
          };
        },
      },

      fieldColor: {
        default: '#980043',
        parseDOM: (elem) => elem.getAttribute('data-field-color') || elem.style.backgroundColor || null,
        renderDOM: (attrs: FieldAnnotationAttributes) => {
          if (!attrs.fieldColor || attrs.fieldColor == 'None') return {};
          let hexColor = toHex(attrs.fieldColor as string);
          const isSixValueSyntax = hexColor.slice(1).length === 6;

          if (isSixValueSyntax) {
            hexColor = `${hexColor}33`;
          }

          const omitHighlight = attrs.highlighted === false;

          if (omitHighlight) {
            return {
              'data-field-color': hexColor,
            };
          }

          return {
            'data-field-color': hexColor,
            style: `background-color: ${hexColor}`,
          };
        },
      },

      hidden: {
        default: false,
        parseDOM: (elem) => {
          const hasHiddenAttr = elem.hasAttribute('hidden');
          const hasDisplayNoneStyle = elem.style.display === 'none';
          const isHidden = hasHiddenAttr || hasDisplayNoneStyle;
          return isHidden;
        },
        renderDOM: (attrs: FieldAnnotationAttributes) => {
          if (!attrs.hidden) return {};
          return {
            style: 'display: none',
          };
        },
      },

      visibility: {
        default: 'visible',
        parseDOM: (el: HTMLElement) => {
          const visibility = el.style.visibility || 'visible';
          const containsVisibility = this.options?.visibilityOptions?.includes(visibility) ?? false;
          return containsVisibility ? visibility : 'visible';
        },
        renderDOM: (attrs: FieldAnnotationAttributes) => {
          if (!attrs.visibility || attrs.visibility === 'visible') return {};
          return { style: `visibility: ${attrs.visibility}` };
        },
      },

      highlighted: {
        default: true,
        rendered: false,
      },

      multipleImage: {
        default: false,
        parseDOM: (elem) => elem.getAttribute('data-multiple-image'),
        renderDOM: (attrs: FieldAnnotationAttributes) => {
          if (!attrs.multipleImage) return {};
          return {
            'data-multiple-image': attrs.multipleImage,
          };
        },
      },

      size: {
        default: null,
        renderDOM: ({ size }) => {
          if (!size || typeof size !== 'object' || !('width' in size)) return {};
          const sizeObj = size as { width: number; height: number };
          const style = `width: ${sizeObj.width}px; height: ${sizeObj.height}px; overflow: hidden;`;
          return { style };
        },
      },

      extras: {
        default: {},
        rendered: false,
      },

      /// Formatting attrs for y-prosemirror support.
      bold: {
        default: false,
        parseDOM: (elem) => elem.getAttribute('data-bold') === 'true',
        renderDOM: (attrs: FieldAnnotationAttributes) => {
          if (!attrs.bold) return {};
          return {
            'data-bold': 'true',
            style: 'font-weight: bold',
          };
        },
      },

      italic: {
        default: false,
        parseDOM: (elem) => elem.getAttribute('data-italic') === 'true',
        renderDOM: (attrs: FieldAnnotationAttributes) => {
          if (!attrs.italic) return {};
          return {
            'data-italic': 'true',
            style: 'font-style: italic',
          };
        },
      },

      underline: {
        default: false,
        parseDOM: (elem) => elem.getAttribute('data-underline') === 'true',
        renderDOM: (attrs: FieldAnnotationAttributes) => {
          if (!attrs.underline) return {};
          return {
            'data-underline': 'true',
            style: 'text-decoration: underline',
          };
        },
      },

      fontFamily: {
        default: null,
        parseDOM: (elem) => elem.getAttribute('data-font-family') || elem.style.fontFamily || null,
        renderDOM: (attrs: FieldAnnotationAttributes) => {
          if (!attrs.fontFamily) return {};
          return {
            'data-font-family': attrs.fontFamily,
            style: `font-family: ${attrs.fontFamily}`,
          };
        },
      },

      fontSize: {
        default: null,
        parseDOM: (elem) => elem.getAttribute('data-font-size') || elem.style.fontSize || null,
        renderDOM: (attrs: FieldAnnotationAttributes) => {
          if (!attrs.fontSize) return {};
          const [value, rawUnit] = parseSizeUnit(attrs.fontSize as string);
          if (Number.isNaN(value)) return {};
          const unit = rawUnit ? rawUnit : 'pt';
          const fontSize = `${value}${unit}`;
          return {
            'data-font-size': fontSize,
            style: `font-size: ${fontSize}`,
          };
        },
      },

      textHighlight: {
        default: null,
        parseDOM: (element) => element.getAttribute('data-text-highlight'),
        renderDOM: (attrs: FieldAnnotationAttributes) => {
          if (!attrs.textHighlight) return {};
          return {
            'data-text-highlight': attrs.textHighlight,
            // takes precedence over the fieldColor.
            style: `background-color: ${attrs.textHighlight} !important`,
          };
        },
      },

      textColor: {
        default: null,
        parseDOM: (element) => element.getAttribute('data-text-color'),
        renderDOM: (attrs: FieldAnnotationAttributes) => {
          if (!attrs.textColor) return {};
          return {
            'data-text-color': attrs.textColor,
            style: `color: ${attrs.textColor}`,
          };
        },
      },
      /// Formatting attrs - end.

      generatorIndex: {
        rendered: false,
        default: null,
      },

      hash: {
        rendered: false,
        default: null,
      },

      sdtId: {
        rendered: false,
        default: null,
      },
    };
  },

  parseDOM() {
    return [
      {
        tag: `span.${this.options?.annotationClass ?? 'annotation'}`,
        priority: 60,
      },
    ];
  },

  renderDOM: function (
    this: { options: FieldAnnotationOptions },
    { node, htmlAttributes }: { node: PmNode; htmlAttributes: Record<string, unknown> },
  ) {
    const { type, displayLabel, imageSrc, linkUrl } = node.attrs as FieldAnnotationAttributes;
    const options = this.options;

    const textRenderer = () => {
      return [
        'span',
        Attribute.mergeAttributes(options?.htmlAttributes ?? {}, htmlAttributes),
        [
          'span',
          {
            class: `${options?.annotationContentClass ?? 'annotation-content'}`,
          },
          displayLabel,
        ],
      ];
    };

    const imageRenderer = () => {
      const contentRenderer = () => {
        if (!imageSrc) return displayLabel;
        return [
          'img',
          {
            src: imageSrc,
            alt: displayLabel,
          },
        ];
      };

      return [
        'span',
        Attribute.mergeAttributes(options?.htmlAttributes ?? {}, htmlAttributes),
        [
          'span',
          {
            class: `${options?.annotationContentClass ?? 'annotation-content'}`,
          },
          contentRenderer(),
        ],
      ];
    };

    const linkRenderer = () => {
      const contentRenderer = () => {
        if (!linkUrl) return displayLabel;
        return [
          'a',
          {
            href: linkUrl,
            target: '_blank',
          },
          linkUrl,
        ];
      };

      return [
        'span',
        Attribute.mergeAttributes(options?.htmlAttributes ?? {}, htmlAttributes),
        [
          'span',
          {
            class: `${options?.annotationContentClass ?? 'annotation-content'}`,
          },
          contentRenderer(),
        ],
      ];
    };

    const renderers: Record<string, () => unknown> = {
      text: () => textRenderer(),
      image: () => imageRenderer(),
      signature: () => imageRenderer(),
      checkbox: () => textRenderer(),
      html: () => textRenderer(),
      link: () => linkRenderer(),
      default: () => textRenderer(),
    };

    const renderer = renderers[type as string] ?? renderers['default'];

    return renderer();
  },

  addCommands() {
    const annotationTypes = this.options?.types ?? [];

    return {
      /**
       * Add field annotation.
       * @param pos The position in the doc.
       * @param attrs The attributes.
       * @example
       * editor.commands.addFieldAnnotation(0, {
       *  displayLabel: 'Enter your info',
       *  fieldId: `123`,
       *  fieldType: 'TEXTINPUT',
       *  fieldColor: '#980043',
       * })
       */
      addFieldAnnotation:
        (pos: number, attrs: Record<string, unknown> = {}, editorFocus = false) =>
        ({
          editor,
          dispatch,
          state,
          tr,
        }: {
          editor: Editor;
          dispatch?: (tr: Transaction) => void;
          state: EditorState;
          tr: Transaction;
        }) => {
          if (dispatch) {
            const { schema } = editor;

            const newPos = tr.mapping.map(pos);
            const $pos = state.doc.resolve(newPos);
            let currentMarks = $pos.marks();
            currentMarks = currentMarks.length ? [...currentMarks] : null;

            /// for y-prosemirror support - attrs instead marks
            const formatAttrs = getFormatAttrsFromMarks(currentMarks);
            ///

            const defaultDisplayLabel =
              (attrs as Record<string, unknown>).defaultDisplayLabel ||
              (attrs as Record<string, unknown>).displayLabel ||
              '';

            const node = schema.nodes[this.name].create(
              {
                ...attrs,
                ...formatAttrs,
                defaultDisplayLabel,
                hash: (attrs as { hash?: string }).hash || generateDocxRandomId(4),
              },
              null,
              null,
            );

            state.tr.insert(newPos, node).setSelection(Selection.near(tr.doc.resolve(newPos + node.nodeSize)));

            if (editorFocus) {
              this.editor?.view?.focus();
            }
          }

          return true;
        },

      addFieldAnnotationAtSelection:
        (attrs: Record<string, unknown> = {}, editorFocus = false) =>
        ({ state, commands }: { state: EditorState; commands: Editor['commands'] }) => {
          const { from } = state.selection;
          return commands.addFieldAnnotation(from, attrs, editorFocus);
        },

      /**
       * Replace field annotation.
       * @param fieldsArray array of fields with attrs to add as annotation.
       * @example
       * editor.commands.replaceWithFieldAnnotation([
       *  from: 20,
       *  to: 45,
       *  attrs: {
       *    fieldType: 'TEXTINPUT'
       *    fieldColor: '#980043'
       *  }
       * ])
       */
      replaceWithFieldAnnotation:
        (fieldsArray: Array<{ from: number; to: number; attrs: Record<string, unknown> }>) =>
        ({ editor, dispatch, tr }: { editor: Editor; dispatch?: (tr: Transaction) => void; tr: Transaction }) => {
          if (!dispatch) return true;

          fieldsArray.forEach((annotation) => {
            const { from, to, attrs } = annotation;
            const { schema } = editor;

            const newPosFrom = tr.mapping.map(from);
            const newPosTo = tr.mapping.map(to);

            const defaultDisplayLabel =
              (attrs as Record<string, unknown>).defaultDisplayLabel ||
              (attrs as Record<string, unknown>).displayLabel ||
              '';

            (attrs as { hash: string }).hash = generateDocxRandomId(4);

            const node = schema.nodes[this.name].create(
              {
                ...attrs,
                defaultDisplayLabel,
                hash: (attrs as { hash?: string }).hash || generateDocxRandomId(4),
              },
              null,
              null,
            );

            tr.replaceWith(newPosFrom, newPosTo, node);
          });

          return true;
        },

      /**
       * Replace annotations with a label (as text node) in selection.
       * @param options Additional options.
       * @example
       * editor.commands.replaceFieldAnnotationsWithLabelInSelection()
       */
      replaceFieldAnnotationsWithLabelInSelection:
        (options: Record<string, unknown> = {}) =>
        ({ commands }: { commands: Editor['commands'] }) => {
          return commands.replaceFieldAnnotationsWithLabel(null, {
            ...options,
            isInSelection: true,
          });
        },

      /**
       * Replace annotations with a label (as text node).
       * @param fieldIdOrArray The field ID or array of field IDs.
       * @param options.isInSelection Find in selection instead of field IDs.
       * @param options.addToHistory Add to history or not.
       * @param options.types Annotation types to replace.
       * @example
       * editor.commands.replaceFieldAnnotationsWithLabel(['1', '2'])
       */
      replaceFieldAnnotationsWithLabel:
        (
          fieldIdOrArray: string | string[] | null,
          { isInSelection = false, addToHistory = false, types = annotationTypes } = {},
        ) =>
        ({ dispatch, state, tr }: { dispatch?: (tr: Transaction) => void; state: EditorState; tr: Transaction }) => {
          const { from, to } = state.selection;

          let annotations = isInSelection
            ? findFieldAnnotationsBetween(from, to, state.doc)
            : findFieldAnnotationsByFieldId(fieldIdOrArray ?? '', state);

          annotations = types.length ? annotations.filter(({ node }) => types.includes(node.attrs.type)) : annotations;

          if (!annotations.length) {
            return true;
          }

          if (!addToHistory) {
            tr.setMeta('addToHistory', false);
          }

          if (dispatch) {
            annotations.forEach((annotation) => {
              const { pos, node } = annotation;

              const newPosFrom = tr.mapping.map(pos);
              const newPosTo = tr.mapping.map(pos + node.nodeSize);

              const currentNode = tr.doc.nodeAt(newPosFrom);
              const nodeEqual = node.attrs.fieldId === currentNode?.attrs?.fieldId;

              const $newPosFrom = tr.doc.resolve(newPosFrom);
              let currentMarks = $newPosFrom.marks();
              currentMarks = currentMarks.length ? [...currentMarks] : null;

              if (nodeEqual) {
                // empty text nodes are not allowed.
                const label = node.attrs.displayLabel || ' ';
                const textNode = state.schema.text(label, currentMarks);
                tr.replaceWith(newPosFrom, newPosTo, textNode);
              }
            });
          }

          return true;
        },

      /**
       * Resets all annotations to default values.
       * @example
       * editor.commands.resetFieldAnnotations()
       */
      resetFieldAnnotations:
        () =>
        ({ dispatch, state, tr }: { dispatch?: (tr: Transaction) => void; state: EditorState; tr: Transaction }) => {
          const annotations = getAllFieldAnnotations(state);

          if (!annotations.length) {
            return true;
          }

          // Specify that we are updating annotations
          // so they are not detected as deletions.
          tr.setMeta('fieldAnnotationUpdate', true);

          if (dispatch) {
            annotations.forEach(({ pos, node }) => {
              const newPos = tr.mapping.map(pos);
              const currentNode = tr.doc.nodeAt(newPos);
              const nodeEqual = node.attrs.fieldId === currentNode?.attrs?.fieldId;

              if (nodeEqual) {
                // if defaultDisplayLabel is not defined then we fallback to displayLabel.
                const displayLabel = node.attrs.defaultDisplayLabel || node.attrs.displayLabel || '';

                tr.setNodeMarkup(newPos, undefined, {
                  ...node.attrs,
                  // reset displayLabel to default.
                  displayLabel,
                  // reset attrs for specific types.
                  imageSrc: null,
                  rawHtml: null,
                  linkUrl: null,
                  hash: null,
                });
              }
            });
          }

          return true;
        },

      /**
       * Update annotations associated with a field.
       * @param fieldIdOrArray The field ID or array of field IDs.
       * @param attrs The attributes.
       * @example
       * editor.commands.updateFieldAnnotations('123', {
       *  displayLabel: 'Updated!',
       * })
       * @example
       * editor.commands.updateFieldAnnotations(['123', '456'], {
       *  displayLabel: 'Updated!',
       * })
       */
      updateFieldAnnotations:
        (fieldIdOrArray: string | string[], attrs: Record<string, unknown> = {}) =>
        ({
          dispatch,
          state,
          commands,
        }: {
          dispatch?: (tr: Transaction) => void;
          state: EditorState;
          commands: Editor['commands'];
        }) => {
          const annotations = findFieldAnnotationsByFieldId(fieldIdOrArray, state);

          if (!annotations.length) {
            return true;
          }

          if (dispatch) {
            return commands.updateFieldAnnotationsAttributes(annotations, attrs);
          }

          return true;
        },

      /**
       * Update particular annotation's attributes.
       * @param annotation field annotation node to be updated.
       * @param attrs The attributes.
       *
       * Used for a case when multiple annotations for one input presented
       */
      updateFieldAnnotation:
        (annotation: { pos: number; node: PmNode } | null, attrs: Record<string, unknown> = {}) =>
        ({ dispatch, commands }: { dispatch?: (tr: Transaction) => void; commands: Editor['commands'] }) => {
          if (!annotation) {
            return true;
          }

          if (dispatch) {
            commands.updateFieldAnnotationsAttributes([annotation], attrs);

            // Don't force update pagination in headless mode
            if ((this.editor?.options as { pagination?: unknown })?.pagination && !isHeadless(this.editor)) {
              setTimeout(() => {
                const newTr = this.editor?.view?.state.tr;
                if (newTr) {
                  newTr.setMeta('forceUpdatePagination', true);
                  this.editor?.view?.dispatch(newTr);
                }
              }, 50);
            }
            return true;
          }

          return true;
        },

      /**
       * Update the attributes of annotations.
       * @param annotations The annotations array [{pos, node}].
       * @param attrs The attributes object.
       */
      updateFieldAnnotationsAttributes:
        (annotations: Array<{ pos: number; node: PmNode }>, attrs: Record<string, unknown> = {}) =>
        ({ dispatch, tr }: { dispatch?: (tr: Transaction) => void; tr: Transaction }) => {
          if (!dispatch) return true;

          // Specify that we are updating annotations
          // so they are not detected as deletions.
          tr.setMeta('fieldAnnotationUpdate', true);

          annotations.forEach((annotation) => {
            const { pos, node } = annotation;
            const newPos = tr.mapping.map(pos);
            const currentNode = tr.doc.nodeAt(newPos);
            const nodeEqual = node.attrs.fieldId === currentNode?.attrs?.fieldId;
            if (nodeEqual) {
              tr.setNodeMarkup(newPos, undefined, {
                ...node.attrs,
                ...attrs,
              });
            }
          });

          return true;
        },

      /**
       * Delete annotations associated with a field.
       * @param fieldIdOrArray The field ID or array of field IDs.
       * @example
       * editor.commands.deleteFieldAnnotations('123')
       * @example
       * editor.commands.deleteFieldAnnotations(['123', '456'])
       */
      deleteFieldAnnotations:
        (fieldIdOrArray: string | string[]) =>
        ({ dispatch, state, tr }: { dispatch?: (tr: Transaction) => void; state: EditorState; tr: Transaction }) => {
          const annotations = findFieldAnnotationsByFieldId(fieldIdOrArray, state);

          if (!annotations.length) {
            return true;
          }

          if (dispatch) {
            annotations.forEach((annotation) => {
              const { pos, node } = annotation;
              const newPosFrom = tr.mapping.map(pos); // map the position between transaction steps
              const newPosTo = tr.mapping.map(pos + node.nodeSize);

              const currentNode = tr.doc.nodeAt(newPosFrom);
              if (node.eq(currentNode)) {
                tr.delete(newPosFrom, newPosTo);
              }
            });
          }

          return true;
        },

      deleteFieldAnnotationsByNode:
        (annotations: Array<{ pos: number; node: PmNode }>) =>
        ({ dispatch, tr }: { dispatch?: (tr: Transaction) => void; tr: Transaction }) => {
          if (!annotations.length) {
            return true;
          }

          if (dispatch) {
            annotations.forEach((annotation) => {
              const { pos, node } = annotation;
              const newPosFrom = tr.mapping.map(pos); // map the position between transaction steps
              const newPosTo = tr.mapping.map(pos + node.nodeSize);

              const currentNode = tr.doc.nodeAt(newPosFrom);
              if (node.eq(currentNode)) {
                tr.delete(newPosFrom, newPosTo);
              }
            });
          }

          return true;
        },

      deleteFieldAnnotation:
        (annotation: { pos: number; node: PmNode } | null) =>
        ({ dispatch, tr }: { dispatch?: (tr: Transaction) => void; tr: Transaction }) => {
          if (!annotation) {
            return true;
          }

          if (dispatch) {
            const { pos, node } = annotation;
            const newPosFrom = tr.mapping.map(pos);
            const newPosTo = tr.mapping.map(pos + node.nodeSize);

            const currentNode = tr.doc.nodeAt(newPosFrom);
            if (node.eq(currentNode)) {
              tr.delete(newPosFrom, newPosTo);
            }
          }

          return true;
        },

      /**
       * Delete a portion of annotations associated with a field.
       * @param fieldIdOrArray The field ID or array of field IDs.
       * @param end index at which to end extraction
       * @example
       * editor.commands.sliceFieldAnnotations('123', 5) - will remove a portion of annotations array starting from index 6
       * @example
       * editor.commands.sliceFieldAnnotations(['123', '456'], 5)
       */
      sliceFieldAnnotations:
        (fieldIdOrArray: string | string[], end: number) =>
        ({ dispatch, state, tr }: { dispatch?: (tr: Transaction) => void; state: EditorState; tr: Transaction }) => {
          const annotations = findFieldAnnotationsByFieldId(fieldIdOrArray, state);

          if (!annotations.length) {
            return true;
          }

          if (dispatch) {
            annotations.forEach((annotation, index) => {
              if (index >= end) {
                const { pos, node } = annotation;
                const newPosFrom = tr.mapping.map(pos); // map the position between transaction steps
                const newPosTo = tr.mapping.map(pos + node.nodeSize);

                const currentNode = tr.doc.nodeAt(newPosFrom);
                if (node.eq(currentNode)) {
                  tr.delete(newPosFrom, newPosTo);
                }
              }
            });
          }

          return true;
        },

      /**
       * Set `hidden` for annotations matching predicate.
       * Other annotations become unhidden.
       * @param predicate The predicate function.
       * @param unsetFromOthers If should unset hidden from other annotations.
       * @example
       * editor.commands.setFieldAnnotationsHiddenByCondition((node) => {
       *   let ids = ['111', '222', '333'];
       *   return ids.includes(node.attrs.fieldId);
       * })
       */
      setFieldAnnotationsHiddenByCondition:
        (predicate: (node: PmNode) => boolean = () => false, unsetFromOthers = false) =>
        ({
          dispatch,
          state,
          chain,
        }: {
          dispatch?: (tr: Transaction) => void;
          state: EditorState;
          chain: Editor['chain'];
        }) => {
          const annotations = getAllFieldAnnotations(state);

          if (!annotations.length) {
            return true;
          }

          if (dispatch) {
            const otherAnnotations: Array<{ pos: number; node: PmNode }> = [];
            const matchedAnnotations = annotations.filter((annotation) => {
              if (predicate(annotation.node)) return annotation;
              else otherAnnotations.push(annotation);
            });

            if (unsetFromOthers) {
              return chain()
                .updateFieldAnnotationsAttributes(matchedAnnotations, { hidden: true })
                .updateFieldAnnotationsAttributes(otherAnnotations, { hidden: false })
                .run();
            } else {
              return chain().updateFieldAnnotationsAttributes(matchedAnnotations, { hidden: true }).run();
            }
          }

          return true;
        },

      /**
       * Unset `hidden` for all annotations.
       * @example
       * editor.commands.unsetFieldAnnotationsHidden()
       */
      unsetFieldAnnotationsHidden:
        () =>
        ({
          dispatch,
          state,
          commands,
        }: {
          dispatch?: (tr: Transaction) => void;
          state: EditorState;
          commands: Editor['commands'];
        }) => {
          const annotations = getAllFieldAnnotations(state);

          if (!annotations.length) {
            return true;
          }

          if (dispatch) {
            return commands.updateFieldAnnotationsAttributes(annotations, { hidden: false });
          }

          return true;
        },

      /**
       * Set `visibility` for all annotations (without changing the layout).
       * @param visibility The visibility value (visible, hidden).
       * @example
       * editor.commands.setFieldAnnotationsVisibility('visible');
       * @example
       * editor.commands.setFieldAnnotationsVisibility('hidden');
       */
      setFieldAnnotationsVisibility:
        (visibility: string = 'visible') =>
        ({
          dispatch,
          state,
          commands,
        }: {
          dispatch?: (tr: Transaction) => void;
          state: EditorState;
          commands: Editor['commands'];
        }) => {
          const annotations = getAllFieldAnnotations(state);

          if (!annotations.length) {
            return true;
          }

          const containsVisibility = this.options?.visibilityOptions?.includes(visibility) ?? false;

          if (!containsVisibility) {
            return false;
          }

          if (dispatch) {
            return commands.updateFieldAnnotationsAttributes(annotations, {
              visibility,
            });
          }

          return true;
        },

      /**
       * Set `highlighted` for annotations matching predicate.
       * @param predicate The predicate function.
       * @param highlighted The highlighted attribute.
       * @example
       * editor.commands.setFieldAnnotationsHighlighted((node) => {
       *   let ids = ['111', '222', '333'];
       *   return ids.includes(node.attrs.fieldId);
       * }, false)
       * @example Set for all annotations.
       * editor.commands.setFieldAnnotationsHighlighted(() => true, false)
       * editor.commands.setFieldAnnotationsHighlighted(() => true, true)
       */
      setFieldAnnotationsHighlighted:
        (predicate: (node: PmNode) => boolean = () => false, highlighted = true) =>
        ({
          dispatch,
          state,
          commands,
        }: {
          dispatch?: (tr: Transaction) => void;
          state: EditorState;
          commands: Editor['commands'];
        }) => {
          const annotations = getAllFieldAnnotations(state);

          if (!annotations.length) {
            return true;
          }

          if (dispatch) {
            const matchedAnnotations = annotations.filter((annotation) => {
              if (predicate(annotation.node)) return annotation;
            });

            return commands.updateFieldAnnotationsAttributes(matchedAnnotations, {
              highlighted,
            });
          }

          return true;
        },

      /// Formatting commands for y-prosemirror support.
      toggleFieldAnnotationsFormat:
        (name: string, setSelection = false) =>
        ({
          dispatch,
          tr,
          state,
          commands,
        }: {
          dispatch?: (tr: Transaction) => void;
          tr: Transaction;
          state: EditorState;
          commands: Editor['commands'];
        }) => {
          const formats = this.options?.toggleFormatNames ?? [];

          if (!formats.includes(name)) {
            return false;
          }

          const { from, to, node } = state.selection;
          const annotations = findFieldAnnotationsBetween(from, to, state.doc);

          if (!annotations.length) {
            return true;
          }

          if (dispatch) {
            annotations.forEach((annotation) => {
              commands.updateFieldAnnotationsAttributes([annotation], {
                [name]: !(annotation.node.attrs as Record<string, unknown>)[name],
              });
            });

            if (setSelection && node?.type.name === this.name) {
              tr.setSelection(NodeSelection.create(tr.doc, from));
            }
          }

          return true;
        },

      setFieldAnnotationsFontFamily:
        (fontFamily: string, setSelection = false) =>
        ({
          dispatch,
          tr,
          state,
          commands,
        }: {
          dispatch?: (tr: Transaction) => void;
          tr: Transaction;
          state: EditorState;
          commands: Editor['commands'];
        }) => {
          const { from, to, node } = state.selection;
          const annotations = findFieldAnnotationsBetween(from, to, state.doc);

          if (!annotations.length) {
            return true;
          }

          if (dispatch) {
            annotations.forEach((annotation) => {
              commands.updateFieldAnnotationsAttributes([annotation], {
                fontFamily,
              });
            });

            if (setSelection && node?.type.name === this.name) {
              tr.setSelection(NodeSelection.create(tr.doc, from));
            }
          }

          return true;
        },

      setFieldAnnotationsFontSize:
        (fontSize: string | number, setSelection = false) =>
        ({
          dispatch,
          tr,
          state,
          commands,
        }: {
          dispatch?: (tr: Transaction) => void;
          tr: Transaction;
          state: EditorState;
          commands: Editor['commands'];
        }) => {
          const { from, to, node } = state.selection;
          const annotations = findFieldAnnotationsBetween(from, to, state.doc);

          if (!annotations.length) {
            return true;
          }

          let [value, unit] = parseSizeUnit(fontSize as string);
          const min = 8,
            max = 96,
            defaultUnit = 'pt';

          if (Number.isNaN(value)) {
            return false;
          }

          value = minMax(value as number, min, max);
          unit = unit ? unit : defaultUnit;

          if (dispatch) {
            annotations.forEach((annotation) => {
              commands.updateFieldAnnotationsAttributes([annotation], {
                fontSize: `${value}${unit}`,
              });
            });

            if (setSelection && node?.type.name === this.name) {
              tr.setSelection(NodeSelection.create(tr.doc, from));
            }
          }

          return true;
        },

      setFieldAnnotationsTextHighlight:
        (color: string, setSelection = false) =>
        ({
          dispatch,
          tr,
          state,
          commands,
        }: {
          dispatch?: (tr: Transaction) => void;
          tr: Transaction;
          state: EditorState;
          commands: Editor['commands'];
        }) => {
          const { from, to, node } = state.selection;
          const annotations = findFieldAnnotationsBetween(from, to, state.doc);

          if (!annotations.length) {
            return true;
          }

          if (dispatch) {
            annotations.forEach((annotation) => {
              commands.updateFieldAnnotationsAttributes([annotation], {
                textHighlight: color,
              });
            });

            if (setSelection && node?.type.name === this.name) {
              tr.setSelection(NodeSelection.create(tr.doc, from));
            }
          }

          return true;
        },

      setFieldAnnotationsTextColor:
        (color: string, setSelection = false) =>
        ({
          dispatch,
          tr,
          state,
          commands,
        }: {
          dispatch?: (tr: Transaction) => void;
          tr: Transaction;
          state: EditorState;
          commands: Editor['commands'];
        }) => {
          const { from, to, node } = state.selection;
          const annotations = findFieldAnnotationsBetween(from, to, state.doc);

          if (!annotations.length) {
            return true;
          }

          if (dispatch) {
            annotations.forEach((annotation) => {
              commands.updateFieldAnnotationsAttributes([annotation], {
                textColor: color,
              });
            });

            if (setSelection && node?.type.name === this.name) {
              tr.setSelection(NodeSelection.create(tr.doc, from));
            }
          }

          return true;
        },
      /// Formatting commands - end.

      // Clean up commands (after field deletion)
      ...cleanupCommands,
    };
  },

  addNodeView() {
    return (props: {
      editor: Editor;
      node: PmNode;
      getPos: () => number;
      HTMLAttributes: Record<string, unknown>;
      decorations: readonly unknown[];
    }) => {
      return new FieldAnnotationView({
        ...props,
        annotationClass: this.options?.annotationClass ?? 'annotation',
        annotationContentClass: this.options?.annotationContentClass ?? 'annotation-content',
        borderColor: this.options?.borderColor ?? '#b015b3',
      });
    };
  },

  addPmPlugins() {
    return [
      FieldAnnotationPlugin({
        editor: this.editor,
        annotationClass: this.options?.annotationClass ?? 'annotation',
        handleDropOutside: this.options?.handleDropOutside ?? true,
      }),
    ];
  },
});

/// for y-prosemirror support
function getFormatAttrsFromMarks(marks: PmMark[] | null): {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  fontFamily: string | null;
  fontSize: string | null;
} {
  if (!marks) {
    return {
      bold: false,
      italic: false,
      underline: false,
      fontFamily: null,
      fontSize: null,
    };
  }

  const formatAttrs = {
    bold: false,
    italic: false,
    underline: false,
    fontFamily: null as string | null,
    fontSize: null as string | null,
  };

  if (marks && marks.length) {
    formatAttrs.bold = marks.some((mark: PmMark) => mark.type.name === 'bold');
    formatAttrs.italic = marks.some((mark: PmMark) => mark.type.name === 'italic');
    formatAttrs.underline = marks.some((mark: PmMark) => mark.type.name === 'underline');

    const textStyle = marks.find((mark: PmMark) => mark.type.name === 'textStyle');

    if (textStyle) {
      formatAttrs.fontFamily = textStyle.attrs.fontFamily ?? null;
      formatAttrs.fontSize = textStyle.attrs.fontSize ?? null;
    }
  }

  return formatAttrs;
}
///
