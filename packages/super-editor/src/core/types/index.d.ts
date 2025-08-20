import type {
    EditorState,
    Transaction
} from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';

// Re-export ProseMirror types
export type {
    EditorState,
    Transaction,
    EditorView
};

// Simple command types - no generics needed
export interface CommandProps {
    state: EditorState;
    tr: Transaction;
    view?: EditorView;
    dispatch?: (tr: Transaction) => void;
    editor: any;
}

// Simple, non-generic Command type
export type Command = (...args: any[]) => (props: CommandProps) => boolean;