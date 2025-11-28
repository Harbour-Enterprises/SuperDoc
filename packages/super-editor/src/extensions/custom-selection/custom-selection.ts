/* global Element */
import { Extension } from '@core/Extension.js';
import { Plugin, TextSelection, Selection } from 'prosemirror-state';
import type { Transaction, EditorState } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import { PluginKey } from 'prosemirror-state';
import { shouldAllowNativeContextMenu } from '../../utils/contextmenu-helpers.js';
import type { EditorView } from 'prosemirror-view';
import type { Editor } from '@core/index.js';
import type { EditorOptions } from '@core/types/EditorConfig.js';

/**
 * Selection state
 */
interface SelectionState {
  focused: boolean;
  preservedSelection: Selection | null;
  showVisualSelection: boolean;
  skipFocusReset: boolean;
}

const DEFAULT_SELECTION_STATE: SelectionState = Object.freeze({
  focused: false,
  preservedSelection: null,
  showVisualSelection: false,
  skipFocusReset: false,
});

const normalizeSelectionState = (state: Partial<SelectionState> = {}): SelectionState => ({
  ...DEFAULT_SELECTION_STATE,
  ...state,
});

/**
 * Configuration options for CustomSelection
 * @typedef {Object} CustomSelectionOptions
 * @category Options
 * @example
 * // CustomSelection works automatically
 * new SuperDoc({
 *   selector: '#editor',
 *   document: 'document.docx'
 *   // Selection handling is built-in
 * });
 */

/**
 * Plugin key for custom selection management
 * @private
 */
export const CustomSelectionPluginKey = new PluginKey<SelectionState>('CustomSelection');

/**
 * Handle clicks outside the editor
 * @private
 */
const handleClickOutside = (event: MouseEvent, editor: Editor) => {
  const editorElem = editor?.options?.element;
  if (!editorElem) return;

  const targetElement = event.target instanceof HTMLElement ? event.target : null;
  const isInsideEditor = targetElement ? editorElem.contains(targetElement) : false;

  if (!isInsideEditor) {
    editor.setOptions({
      focusTarget: targetElement,
    } as unknown as Partial<EditorOptions>);
  } else {
    editor.setOptions({
      focusTarget: null,
    } as unknown as Partial<EditorOptions>);
  }
};

/**
 * Get focus metadata from transaction
 * @private
 */
function getFocusMeta(tr: Transaction): Partial<SelectionState> | undefined {
  return tr.getMeta(CustomSelectionPluginKey);
}

/**
 * Set focus metadata on transaction
 * @private
 * @param {Object} tr - Transaction
 * @param {SelectionState} value - State to set
 * @returns {Object} Transaction with metadata
 */
function setFocusMeta(tr: Transaction, value: Partial<SelectionState>): Transaction {
  return tr.setMeta(CustomSelectionPluginKey, value);
}

/**
 * Get focus state from editor state
 * @private
 * @param {Object} state - Editor state
 * @returns {SelectionState} Current focus state
 */
function getFocusState(state: EditorState): SelectionState {
  return CustomSelectionPluginKey.getState(state) as SelectionState;
}

/**
 * Type guard to check if target is an Element
 */
function isElement(target: EventTarget | null): target is Element {
  return target instanceof Element;
}

/**
 * Check if target is a toolbar input
 * @private
 * @param {Element} target - DOM element
 * @returns {boolean} True if toolbar input
 */
const isToolbarInput = (target: EventTarget | null): boolean => {
  if (!isElement(target)) return false;
  return !!target.closest('.button-text-input') || target.classList.contains('button-text-input');
};

/**
 * Check if target is a toolbar button
 * @private
 * @param {Element} target - DOM element
 * @returns {boolean} True if toolbar button
 */
const isToolbarButton = (target: EventTarget | null): boolean => {
  if (!isElement(target)) return false;
  return !!target.closest('.toolbar-button') || target.classList.contains('toolbar-button');
};

/**
 * @module CustomSelection
 * @sidebarTitle Custom Selection
 * @snippetPath /snippets/extensions/custom-selection.mdx
 */
export const CustomSelection = Extension.create({
  name: 'customSelection',

  addPmPlugins() {
    const editor = this.editor;
    if (!editor) return [];
    const customSelectionPlugin = new Plugin({
      key: CustomSelectionPluginKey,
      state: {
        init: (): SelectionState => ({ ...DEFAULT_SELECTION_STATE }),
        apply: (tr: Transaction, value: SelectionState): SelectionState => {
          const meta = getFocusMeta(tr);
          if (meta !== undefined) {
            return { ...value, ...meta };
          }
          return value;
        },
      },
      view: () => {
        const clickHandler = (event: MouseEvent) => handleClickOutside(event, editor);
        document?.addEventListener('mousedown', clickHandler);

        return {
          destroy: () => {
            document?.removeEventListener('mousedown', clickHandler);
          },
        };
      },
      props: {
        handleDOMEvents: {
          contextmenu: (view: EditorView, event: MouseEvent) => {
            if (!this.editor) return false;
            if (shouldAllowNativeContextMenu(event)) {
              return false;
            }

            // Prevent context menu from removing focus/selection
            event.preventDefault();
            const { selection } = view.state;
            if (!selection.empty) {
              view.dispatch(
                setFocusMeta(view.state.tr, {
                  focused: true,
                  preservedSelection: selection,
                  showVisualSelection: true,
                  skipFocusReset: true,
                }),
              );
            }

            // Re-focus the editor to maintain selection visibility
            setTimeout(() => {
              view.focus();
            }, 0);

            return false;
          },

          mousedown: (view: EditorView, event: MouseEvent) => {
            // Handle right clicks - prevent focus loss
            if (event.button === 2) {
              if (shouldAllowNativeContextMenu(event)) {
                return false;
              }

              event.preventDefault(); // Prevent default right-click behavior
              const { selection } = view.state;
              if (!selection.empty) {
                // Ensure selection stays visible for right-click/context menu
                view.dispatch(
                  setFocusMeta(view.state.tr, {
                    focused: true,
                    preservedSelection: selection,
                    showVisualSelection: true,
                    skipFocusReset: true,
                  }),
                );

                // Store selection in editor options too
                this.editor?.setOptions({
                  lastSelection: selection,
                  preservedSelection: selection,
                } as unknown as Partial<EditorOptions>);
              }
              return false;
            }

            const { selection } = view.state;
            const target = event.target as EventTarget | null;
            const isElement = target instanceof Element;
            const isToolbarBtn = isElement && isToolbarButton(target);
            const isToolbarInp = isElement && isToolbarInput(target);

            // Store focus target for other components
            this.editor?.setOptions({
              focusTarget: target,
            } as unknown as Partial<EditorOptions>);

            // Handle toolbar input clicks - preserve selection
            if (isToolbarInp && !selection.empty) {
              // Store the selection and show visual selection
              view.dispatch(
                setFocusMeta(view.state.tr, {
                  focused: true,
                  preservedSelection: selection,
                  showVisualSelection: true,
                  skipFocusReset: false,
                }),
              );

              // Store in editor options as well for commands
              this.editor?.setOptions({
                lastSelection: selection,
                preservedSelection: selection,
              } as unknown as Partial<EditorOptions>);
              return false; // Don't prevent the input from getting focus
            }

            // Handle toolbar button clicks
            if (isToolbarBtn && !isToolbarInp) {
              if (!selection.empty) {
                this.editor?.setOptions({
                  lastSelection: selection,
                } as unknown as Partial<EditorOptions>);
                // Keep selection visible for toolbar buttons
                view.dispatch(
                  setFocusMeta(view.state.tr, {
                    focused: true,
                    preservedSelection: selection,
                    showVisualSelection: true,
                    skipFocusReset: false,
                  }),
                );
              }
              return false;
            }

            // Handle clicks outside toolbar
            if (!isToolbarBtn && !isToolbarInp) {
              // Clear preserved selection and visual selection
              view.dispatch(
                setFocusMeta(view.state.tr, {
                  focused: false,
                  preservedSelection: null,
                  showVisualSelection: false,
                  skipFocusReset: false,
                }),
              );

              // Clear selection if clicking outside editor
              if (!selection.empty && target && !this.editor?.options.element?.contains(target as Node)) {
                this.editor?.setOptions({ lastSelection: selection } as unknown as Partial<EditorOptions>);
                const clearSelectionTr = view.state.tr.setSelection(TextSelection.create(view.state.doc, 0));
                view.dispatch(clearSelectionTr);
              }
            }
          },

          focus: (view: EditorView) => {
            const target = this.editor?.options.focusTarget ?? null;
            const isElement = target instanceof Element;
            const isToolbarBtn = isElement && isToolbarButton(target);
            const isToolbarInp = isElement && isToolbarInput(target);
            const focusState = getFocusState(view.state);

            if (focusState?.skipFocusReset) {
              view.dispatch(
                setFocusMeta(view.state.tr, normalizeSelectionState({ ...focusState, skipFocusReset: false })),
              );
              return false;
            }

            // Don't change state if toolbar element caused the focus
            if (!isToolbarBtn && !isToolbarInp) {
              view.dispatch(
                setFocusMeta(view.state.tr, {
                  focused: false,
                  preservedSelection: null,
                  showVisualSelection: false,
                  skipFocusReset: false,
                }),
              );
            }
          },

          blur: (view: EditorView) => {
            const target = this.editor?.options.focusTarget ?? null;
            const isElement = target instanceof Element;
            const isToolbarBtn = isElement && isToolbarButton(target);
            const isToolbarInp = isElement && isToolbarInput(target);
            const state = getFocusState(view.state);

            if (state?.skipFocusReset) {
              return false;
            }

            if (isToolbarBtn || isToolbarInp) {
              // Maintain visual selection when toolbar elements are focused
              view.dispatch(
                setFocusMeta(view.state.tr, {
                  focused: true,
                  preservedSelection: state.preservedSelection || view.state.selection,
                  showVisualSelection: true,
                  skipFocusReset: false,
                }),
              );
            } else {
              // Clear everything when focus goes elsewhere
              view.dispatch(
                setFocusMeta(view.state.tr, {
                  focused: false,
                  preservedSelection: null,
                  showVisualSelection: false,
                  skipFocusReset: false,
                }),
              );
            }
          },
        },
        decorations: (state: EditorState) => {
          const { selection, doc } = state;
          const focusState = getFocusState(state);

          // Show visual selection if we have a preserved selection or current selection with focus
          const shouldShowSelection =
            focusState.showVisualSelection &&
            (focusState.preservedSelection || (!selection.empty && focusState.focused));

          if (!shouldShowSelection) {
            return null;
          }

          // Use preserved selection if available, otherwise current selection
          const targetSelection = focusState.preservedSelection || selection;

          if (targetSelection.empty) {
            return null;
          }

          return DecorationSet.create(doc, [
            Decoration.inline(targetSelection.from, targetSelection.to, {
              class: 'sd-custom-selection',
            }),
          ]);
        },
      },
    });

    return [customSelectionPlugin];
  },

  addCommands() {
    return {
      /**
       * Restore the preserved selection
       * @category Command
       * @returns {Function} Command function
       * @example
       * // Restore selection after toolbar interaction
       * editor.commands.restorePreservedSelection()
       * @note Used internally to maintain selection when interacting with toolbar
       */
      restorePreservedSelection:
        () =>
        ({ tr, state }: { tr: Transaction; state: EditorState }): Transaction => {
          const focusState = getFocusState(state);
          if (focusState?.preservedSelection) {
            return tr.setSelection(focusState.preservedSelection);
          }

          const lastSelection = (this.editor?.options as { lastSelection?: Selection | null })?.lastSelection;
          if (lastSelection && lastSelection instanceof Selection) {
            return tr.setSelection(lastSelection);
          }
          return tr;
        },
    };
  },
});
