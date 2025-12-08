import type { EditorView } from 'prosemirror-view';
import type { EditorState } from 'prosemirror-state';
import type { Schema } from 'prosemirror-model';

/**
 * Minimal type definition for Editor class
 * This provides TypeScript with the structure of the JavaScript Editor class
 */
export declare class Editor {
  /** ProseMirror view instance */
  view?: EditorView;

  /** ProseMirror schema */
  schema?: Schema;

  /** Editor converter for import/export */
  converter?: any;

  /** Presentation editor instance for pages mode */
  presentationEditor?: {
    element?: HTMLElement;
    [key: string]: any;
  };

  /** Editor options passed during construction */
  options?: {
    element?: HTMLElement;
    [key: string]: any;
  };

  /** Current editor state */
  state?: EditorState;

  /** Update page style (for pages mode) */
  updatePageStyle?: (styles: Record<string, unknown>) => void;

  /** Get current page styles (for pages mode) */
  getPageStyles?: () => Record<string, unknown>;

  /** Get coordinates at a document position */
  coordsAtPos?: (pos: number) => { left: number; top: number } | undefined;

  /** Command service */
  commands?: any;

  [key: string]: any;
}
