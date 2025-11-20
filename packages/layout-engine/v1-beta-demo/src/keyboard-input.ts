import { Editor } from '@harbour-enterprises/super-editor';
import type { Layout, FlowBlock, Measure } from '@superdoc/contracts';
import { selectionToRects, clickToPosition } from '../../layout-bridge/src/index.js';
import { splitBlock, joinBackward, deleteSelection } from 'prosemirror-commands';
import { undo, redo } from 'prosemirror-history';

type LayoutKeyboardOptions = {
  getEditor: () => InstanceType<typeof Editor> | null;
  onRequestFocus: () => void;
  layoutContainer: HTMLElement;
  getLayout: () => Layout | null;
  getBlocks: () => FlowBlock[];
  getMeasures: () => Measure[];
};

export class LayoutKeyboard {
  private readonly getEditor: () => InstanceType<typeof Editor> | null;
  private readonly onRequestFocus: () => void;
  private readonly layoutContainer: HTMLElement;
  private readonly getLayout: () => Layout | null;
  private readonly getBlocks: () => FlowBlock[];
  private readonly getMeasures: () => Measure[];
  private active = false;
  private isComposing = false;

  constructor(options: LayoutKeyboardOptions) {
    this.getEditor = options.getEditor;
    this.onRequestFocus = options.onRequestFocus;
    this.layoutContainer = options.layoutContainer;
    this.getLayout = options.getLayout;
    this.getBlocks = options.getBlocks;
    this.getMeasures = options.getMeasures;

    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleBeforeInput = this.handleBeforeInput.bind(this);
    this.handleCompositionStart = this.handleCompositionStart.bind(this);
    this.handleCompositionEnd = this.handleCompositionEnd.bind(this);
    this.handleFocusIn = this.handleFocusIn.bind(this);
    this.handleFocusOut = this.handleFocusOut.bind(this);
  }

  enable(): void {
    console.log('[LayoutKeyboard] ENABLE called - adding event listeners');
    window.addEventListener('keydown', this.handleKeyDown, true);
    window.addEventListener('beforeinput', this.handleBeforeInput, true);
    window.addEventListener('compositionstart', this.handleCompositionStart, true);
    window.addEventListener('compositionend', this.handleCompositionEnd, true);
    window.addEventListener('focusin', this.handleFocusIn, true);
    window.addEventListener('focusout', this.handleFocusOut, true);
    console.log('[LayoutKeyboard] Event listeners added successfully');
  }

  disable(): void {
    window.removeEventListener('keydown', this.handleKeyDown, true);
    window.removeEventListener('beforeinput', this.handleBeforeInput, true);
    window.removeEventListener('compositionstart', this.handleCompositionStart, true);
    window.removeEventListener('compositionend', this.handleCompositionEnd, true);
    window.removeEventListener('focusin', this.handleFocusIn, true);
    window.removeEventListener('focusout', this.handleFocusOut, true);
    this.active = false;
  }

  activate(): void {
    console.log('[LayoutKeyboard] ACTIVATED');
    this.active = true;
  }

  deactivate(): void {
    console.log('[LayoutKeyboard] DEACTIVATED');
    this.active = false;
  }

  private handleFocusIn(event: FocusEvent): void {
    // If focus moves into the layout container or hidden editor, activate
    const target = event.target as Node;
    const editor = this.getEditor();
    const editorDom = editor?.view?.dom;

    if (this.layoutContainer.contains(target) || (editorDom && (target === editorDom || editorDom.contains(target)))) {
      // Don't auto-activate on focus - wait for explicit activation via click
    }
  }

  private handleFocusOut(event: FocusEvent): void {
    // If focus leaves the layout container AND the hidden editor, deactivate
    const target = event.relatedTarget as Node | null;
    if (!target) {
      this.deactivate();
      return;
    }

    const editor = this.getEditor();
    const editorDom = editor?.view?.dom;

    const stillInLayout = this.layoutContainer.contains(target);
    const stillInEditor = editorDom && (target === editorDom || editorDom.contains(target));

    if (!stillInLayout && !stillInEditor) {
      this.deactivate();
    }
  }

  /**
   * Check if we should handle an event based on the target element.
   * Returns false if the event target is outside the layout or is a focusable element.
   */
  private shouldHandleEvent(event: Event): boolean {
    if (!this.active) return false;

    const target = event.target as HTMLElement;
    if (!target) return false;

    // Don't hijack events from input elements, textareas, or contenteditable
    const tagName = target.tagName?.toLowerCase();
    if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
      return false;
    }
    if (target.isContentEditable && !this.isOurEditor(target)) {
      return false;
    }

    // Check if target is within our layout container or our hidden editor
    const inLayout = this.layoutContainer.contains(target);
    const inEditor = this.isOurEditor(target);

    // Fallback: check if our editor has focus (in case event targets body/document)
    const activeElement = document.activeElement as HTMLElement | null;
    const editorHasFocus = activeElement && this.isOurEditor(activeElement);

    return inLayout || inEditor || editorHasFocus;
  }

  /**
   * Check if the target element is our hidden editor
   */
  private isOurEditor(element: HTMLElement): boolean {
    const editor = this.getEditor();
    const editorDom = editor?.view?.dom;
    return !!(editorDom && (element === editorDom || editorDom.contains(element)));
  }

  private handleCompositionStart(event: CompositionEvent): void {
    if (!this.shouldHandleEvent(event)) return;
    this.isComposing = true;
    this.requestFocus();
  }

  private handleCompositionEnd(event: CompositionEvent): void {
    if (!this.shouldHandleEvent(event)) return;
    this.isComposing = false;
  }

  private handleBeforeInput(event: InputEvent): void {
    console.log('[LayoutKeyboard] beforeinput event:', {
      inputType: event.inputType,
      data: event.data,
      active: this.active,
      isComposing: this.isComposing,
      shouldHandle: this.shouldHandleEvent(event),
    });
    if (!this.shouldHandleEvent(event) || this.isComposing) {
      console.log('[LayoutKeyboard] beforeinput SKIPPED');
      return;
    }
    const editor = this.prepareEditor();
    if (!editor) {
      console.log('[LayoutKeyboard] beforeinput: no editor');
      return;
    }

    const handled = this.handleBeforeInputType(editor, event);
    console.log('[LayoutKeyboard] beforeinput handled:', handled);
    if (handled) {
      event.preventDefault();
    }
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.shouldHandleEvent(event)) return;
    const editor = this.prepareEditor();
    if (!editor) return;

    // Handle Enter variants with modifiers (must come before general modifier handling)
    if (event.key === 'Enter') {
      if (event.shiftKey && !event.metaKey && !event.ctrlKey && !event.altKey) {
        // Shift-Enter: insert line break

        if (editor.commands.insertLineBreak?.()) {
          event.preventDefault();
        }
        return;
      }
      if ((event.metaKey || event.ctrlKey) && !event.shiftKey && !event.altKey) {
        // Mod-Enter: exit code block

        if (editor.commands.exitCode?.()) {
          event.preventDefault();
        }
        return;
      }
    }

    // Handle keyboard shortcuts (Cmd/Ctrl combinations)
    if (event.metaKey || event.ctrlKey || event.altKey) {
      this.handleShortcut(editor, event);
      return;
    }

    switch (event.key) {
      case 'ArrowUp':
        if (this.isComposing) {
          // Queue and always prevent during composition
          this.queueCommand(() => this.navigateVertical(editor, 'up'));
          event.preventDefault();
        } else {
          // Execute immediately and only prevent if successful
          const handled = this.navigateVertical(editor, 'up');
          if (handled) {
            event.preventDefault();
          }
        }
        break;
      case 'ArrowDown':
        if (this.isComposing) {
          // Queue and always prevent during composition
          this.queueCommand(() => this.navigateVertical(editor, 'down'));
          event.preventDefault();
        } else {
          // Execute immediately and only prevent if successful
          const handled = this.navigateVertical(editor, 'down');
          if (handled) {
            event.preventDefault();
          }
        }
        break;
      case 'ArrowLeft':
        if (this.isComposing) {
          // Queue and always prevent during composition
          this.queueCommand(() => this.navigateHorizontal(editor, 'left', event.shiftKey));
          event.preventDefault();
        } else {
          const handled = this.navigateHorizontal(editor, 'left', event.shiftKey);
          if (handled) {
            event.preventDefault();
          }
        }
        break;
      case 'ArrowRight':
        if (this.isComposing) {
          // Queue and always prevent during composition
          this.queueCommand(() => this.navigateHorizontal(editor, 'right', event.shiftKey));
          event.preventDefault();
        } else {
          const handled = this.navigateHorizontal(editor, 'right', event.shiftKey);
          if (handled) {
            event.preventDefault();
          }
        }
        break;
      case 'Home':
      case 'End':
      case 'PageUp':
      case 'PageDown':
        // Let these bubble to ProseMirror for now

        break;
      case 'Enter':
        // Don't prevent default during composition - let IME handle it
        // The beforeinput handler will catch it after composition ends
        if (!this.isComposing) {
          this.queueCommand(() => this.performEnter(editor));
          event.preventDefault();
        }
        break;
      case 'Backspace':
        this.queueCommand(() => this.deleteBackward(editor));
        event.preventDefault();
        break;
      case 'Delete':
        this.queueCommand(() => this.deleteForward(editor));
        event.preventDefault();
        break;
      default:
        // Don't handle printable characters here - let beforeinput handle text insertion
        // This prevents double-insertion and supports IME composition properly
        break;
    }
  }

  private deleteBackward(editor: InstanceType<typeof Editor>): boolean {
    const { state } = editor;
    const { from, to } = state.selection;

    // Get character before cursor for debugging
    const charBefore = from > 0 ? state.doc.textBetween(from - 1, from) : '';
    const charCodeBefore = charBefore ? charBefore.charCodeAt(0) : null;

    console.log('[LayoutKeyboard] deleteBackward called:', {
      from,
      to,
      isEmpty: from === to,
      charBefore: charBefore,
      charCodeBefore: charCodeBefore,
      docSize: state.doc.content.size,
    });

    // If there's a selection, delete it first
    if (from !== to) {
      console.log('[LayoutKeyboard] deleteBackward: deleting selection');
      return deleteSelection(state, (tr) => editor.dispatch(tr));
    }

    // Check if we're at the start of a block - need to join blocks
    const $pos = state.doc.resolve(from);
    const isAtBlockStart = $pos.parentOffset === 0;

    console.log('[LayoutKeyboard] deleteBackward: cursor state:', {
      parentOffset: $pos.parentOffset,
      isAtBlockStart,
      canJoinBackward: from > 0,
      parentNode: $pos.parent.type.name,
      depth: $pos.depth,
    });

    if (isAtBlockStart && from > 0) {
      // At the start of a block - use ProseMirror's joinBackward command
      console.log('[LayoutKeyboard] deleteBackward: attempting joinBackward');
      const beforePos = from;
      let afterPos = from;

      const result = joinBackward(state, (tr) => {
        console.log('[LayoutKeyboard] deleteBackward: joinBackward transaction:', {
          steps: tr.steps.length,
          docChanged: tr.docChanged,
        });
        editor.dispatch(tr);
        // Capture position after join
        afterPos = editor.state.selection.from;
        console.log('[LayoutKeyboard] deleteBackward: position after join:', {
          beforePos,
          afterPos,
          positionChanged: afterPos < beforePos,
        });
      });

      console.log('[LayoutKeyboard] deleteBackward: joinBackward result:', result, 'positions:', {
        beforePos,
        afterPos,
      });

      // After joinBackward, check if we're STILL at a block start
      // If so, we joined empty formatting nodes and need to continue
      if (result) {
        const newState = editor.state;
        const newFrom = newState.selection.from;
        if (newFrom > 0) {
          const $newPos = newState.doc.resolve(newFrom);
          console.log('[LayoutKeyboard] deleteBackward: after join check:', {
            newFrom,
            parentOffset: $newPos.parentOffset,
            stillAtBlockStart: $newPos.parentOffset === 0,
            parentNode: $newPos.parent.type.name,
          });

          if ($newPos.parentOffset === 0) {
            // Still at block start, try joinBackward again
            console.log('[LayoutKeyboard] deleteBackward: still at block start, trying joinBackward again');
            joinBackward(newState, (tr) => editor.dispatch(tr));
          }
        }
      }

      return result;
    } else if (from === 0) {
      console.log('[LayoutKeyboard] deleteBackward: at document start, cannot delete');
      return false;
    } else {
      // In the middle of a block - delete previous character
      console.log('[LayoutKeyboard] deleteBackward: deleting previous character');
      const tr = state.tr.delete(from - 1, from);
      editor.dispatch(tr);
      return true;
    }
  }

  private deleteForward(editor: InstanceType<typeof Editor>): boolean {
    console.log('[LayoutKeyboard] deleteForward called');

    // IMPORTANT: Always use editor.dispatch to ensure proper event handling
    // in skipViewCreation mode. Don't use editor.commands which may use view.dispatch
    const { state } = editor;
    const { from, to } = state.selection;
    if (from === to) {
      if (from >= state.doc.content.size) return false;
      const tr = state.tr.delete(from, from + 1);
      editor.dispatch(tr);
      return true;
    }
    const tr = state.tr.delete(from, to);
    editor.dispatch(tr);
    return true;
  }

  private prepareEditor(): InstanceType<typeof Editor> | null {
    const editor = this.getEditor();
    if (!editor) return null;
    this.requestFocus();
    return editor;
  }

  private requestFocus(): void {
    this.onRequestFocus();
  }

  private queueCommand(command: () => boolean | void): void {
    if (this.isComposing) {
      setTimeout(() => command(), 0);
    } else {
      command();
    }
  }

  private handleBeforeInputType(editor: InstanceType<typeof Editor>, event: InputEvent): boolean {
    switch (event.inputType) {
      case 'insertText':
        if (event.data) {
          this.queueCommand(() => this.insertText(editor, event.data!));
          return true;
        }
        return false;
      case 'insertParagraph':
        this.queueCommand(() => {
          if (this.performEnter(editor)) return true;
          // Fallback to newline if Enter chain didn't handle it
          return this.insertText(editor, '\n');
        });
        return true;
      case 'insertLineBreak':
        // Handle Shift-Enter via beforeinput
        this.queueCommand(() => {
          if (editor.commands.insertLineBreak?.()) {
            return true;
          }
          // Fallback to inserting line break character
          return this.insertText(editor, '\n');
        });
        return true;
      case 'deleteContentBackward':
        this.queueCommand(() => this.deleteBackward(editor));
        return true;
      case 'deleteContentForward':
        this.queueCommand(() => this.deleteForward(editor));
        return true;
      default:
        return false;
    }
  }

  private insertText(editor: InstanceType<typeof Editor>, text: string): boolean {
    console.log('[LayoutKeyboard] insertText called:', {
      text,
      selectionFrom: editor.state.selection.from,
      selectionTo: editor.state.selection.to,
      hasInsertContent: !!editor.commands.insertContent,
    });

    // IMPORTANT: Always use editor.dispatch(tr) instead of editor.commands.insertContent
    // to ensure proper transaction handling in skipViewCreation mode
    const { state } = editor;
    const { from, to } = state.selection;
    const tr = state.tr.insertText(text, from, to);
    console.log('[LayoutKeyboard] insertText: calling editor.dispatch with transaction:', {
      from,
      to,
      text,
      steps: tr.steps.length,
      docChanged: tr.docChanged,
      hasDispatch: !!editor.dispatch,
      dispatchType: typeof editor.dispatch,
    });
    editor.dispatch(tr);
    console.log('[LayoutKeyboard] insertText: editor.dispatch completed');
    return true;
  }

  private handleShortcut(editor: InstanceType<typeof Editor>, event: KeyboardEvent): void {
    const isMac = navigator.platform.toLowerCase().includes('mac');
    const primary = isMac ? event.metaKey : event.ctrlKey;

    // Only handle primary key shortcuts (Cmd on Mac, Ctrl on Windows/Linux)
    if (!primary) return;

    // Don't handle Alt combinations (let browser/OS handle them)
    if (event.altKey) return;

    const key = event.key.toLowerCase();
    switch (key) {
      case 'a':
        if (!event.shiftKey) {
          // Cmd/Ctrl-A = Select all
          this.queueCommand(() => editor.commands.selectAll?.());
          event.preventDefault();
        }
        break;
      case 'b':
        if (!event.shiftKey) {
          // Cmd/Ctrl-B = Bold
          this.queueCommand(() => editor.commands.toggleBold?.());
          event.preventDefault();
        }
        break;
      case 'i':
        if (!event.shiftKey) {
          // Cmd/Ctrl-I = Italic
          this.queueCommand(() => editor.commands.toggleItalic?.());
          event.preventDefault();
        }
        break;
      case 'u':
        if (!event.shiftKey) {
          // Cmd/Ctrl-U = Underline
          this.queueCommand(() => editor.commands.toggleUnderline?.());
          event.preventDefault();
        }
        break;
      case 'z':
        if (event.shiftKey) {
          // Shift-Cmd/Ctrl-Z = Redo
          this.queueCommand(() => {
            const { state } = editor;
            redo(state, (tr) => editor.dispatch(tr));
          });
          event.preventDefault();
        } else {
          // Cmd/Ctrl-Z = Undo
          this.queueCommand(() => {
            const { state } = editor;
            undo(state, (tr) => editor.dispatch(tr));
          });
          event.preventDefault();
        }
        break;
      case 'y':
        // Ctrl-Y = Redo (Windows convention)
        if (!isMac && !event.shiftKey) {
          this.queueCommand(() => {
            const { state } = editor;
            redo(state, (tr) => editor.dispatch(tr));
          });
          event.preventDefault();
        }
        break;
      default:
        // For unhandled shortcuts, don't prevent default (let them bubble to editor)
        break;
    }

    // Additional shortcuts with modifiers can be added here
  }

  private navigateVertical(editor: InstanceType<typeof Editor>, direction: 'up' | 'down'): boolean {
    const layout = this.getLayout();
    const blocks = this.getBlocks();
    const measures = this.getMeasures();

    if (!layout || !blocks.length || !measures.length) {
      return false;
    }

    const { state } = editor;
    const { from } = state.selection;

    // Get current cursor rect to find x-coordinate
    const rects = selectionToRects(layout, blocks, measures, from, from + 1);
    if (!rects.length) {
      return false;
    }

    const currentRect = rects[0];
    const currentX = currentRect.x;
    const currentY = currentRect.y + currentRect.height / 2;

    // Calculate target Y position (one line up or down)
    const lineHeight = currentRect.height;
    const targetY = direction === 'up' ? currentY - lineHeight : currentY + lineHeight;

    // Use clickToPosition to find the position at the same X but different Y
    const hit = clickToPosition(layout, blocks, measures, { x: currentX, y: targetY });

    if (hit && hit.pos !== from) {
      // Use editor.dispatch instead of editor.commands.setTextSelection
      const tr = state.tr.setSelection(state.selection.constructor.near(state.doc.resolve(hit.pos)));
      editor.dispatch(tr);
      return true;
    }

    return false;
  }

  private navigateHorizontal(
    editor: InstanceType<typeof Editor>,
    direction: 'left' | 'right',
    shift: boolean,
  ): boolean {
    const { state } = editor;
    const { from, to, empty } = state.selection;

    // If shift is pressed, we're selecting
    if (shift) {
      // For now, let ProseMirror handle shift+arrow selection
      return false;
    }

    // If there's a selection, collapse it
    if (!empty) {
      const newPos = direction === 'left' ? from : to;
      const tr = state.tr.setSelection(state.selection.constructor.near(state.doc.resolve(newPos)));
      editor.dispatch(tr);
      return true;
    }

    // Move cursor one position
    const newPos = direction === 'left' ? Math.max(0, from - 1) : Math.min(state.doc.content.size, from + 1);

    if (newPos !== from) {
      const tr = state.tr.setSelection(state.selection.constructor.near(state.doc.resolve(newPos)));
      editor.dispatch(tr);
      return true;
    }

    return false;
  }

  private performEnter(editor: InstanceType<typeof Editor>): boolean {
    console.log('[LayoutKeyboard] performEnter called');

    // IMPORTANT: Always use editor.dispatch to ensure proper event handling
    // in skipViewCreation mode. Don't use editor.commands which may use view.dispatch
    const { state } = editor;
    const result = splitBlock(state, (tr) => {
      console.log('[LayoutKeyboard] performEnter: dispatching splitBlock transaction');
      editor.dispatch(tr);
    });

    console.log('[LayoutKeyboard] performEnter result:', result);
    return result;
  }
}
