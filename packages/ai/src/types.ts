import { SuperDoc, Editor as EditorClass } from 'superdoc';
import type { Mark, Node } from 'prosemirror-model';
import type { EditorState } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';

export type MarkType = Mark;
export type NodeType = Node;

// Extend the Editor type to include properties not defined in the JS class
export type Editor = InstanceType<typeof EditorClass> & {
    view?: EditorView;
    state?: EditorState;
};

export type SuperDocInstance = typeof SuperDoc | SuperDoc;

/**
 * Represents a position range in the document
 */
export interface DocumentPosition {
    from: number;
    to: number;
}

/**
 * Represents a match found by AI operations
 */
export interface FoundMatch {
    originalText?: string | null | undefined;
    suggestedText?: string | null | undefined;
    positions?: DocumentPosition[];
}

/**
 * Standard result structure for AI operations
 */
export interface Result {
    success: boolean;
    results: FoundMatch[];
}

/**
 * Message format for AI chat interactions
 */
export type AIMessage = {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

/**
 * Options for streaming AI completions
 */
export type StreamOptions = {
    /** Temperature parameter (0-2), controls randomness */
    temperature?: number;
    /** Maximum tokens to generate */
    maxTokens?: number;
    /** Stop sequences to end generation */
    stop?: string[];
    /** Model identifier to use */
    model?: string;
    /** Abort signal for cancellation */
    signal?: AbortSignal;
    /** Additional metadata for the request */
    metadata?: Record<string, unknown>;
    /** Provider-specific options */
    providerOptions?: Record<string, unknown>;
    /** Document identifier for tracking */
    documentId?: string;
    /** Force streaming (true) or disable it (false). Defaults to true when supported. */
    stream?: boolean;
}

/**
 * Options for non-streaming completions (extends StreamOptions)
 */
export type CompletionOptions = StreamOptions;

/**
 * Interface that all AI providers must implement
 */
export type AIProvider = {
    /** Indicates whether the provider prefers streaming responses by default */
    streamResults?: boolean;
    /** Stream completion with incremental results */
    streamCompletion(messages: AIMessage[], options?: StreamOptions): AsyncGenerator<string, void, unknown>;
    /** Get complete response in one call */
    getCompletion(messages: AIMessage[], options?: CompletionOptions): Promise<string>;
}

/**
 * User information for AI-generated changes
 */
export type AIUser = {
    /** Display name of the user/bot */
    displayName: string;
    /** Optional profile URL */
    profileUrl?: string;
    /** Optional user identifier */
    userId?: string;
}

/**
 * Configuration for the AIActions service
 */
export type AIActionsConfig = {
    /** AI provider instance */
    provider: AIProvider;
    /** User/bot information for attributed changes */
    user: AIUser;
    /** Optional system prompt for AI context */
    systemPrompt?: string;
    /** Enable debug logging */
    enableLogging?: boolean;
}

/**
 * Lifecycle callbacks for AIActions events
 */
export type AIActionsCallbacks = {
    /** Called when AI is initialized and ready */
    onReady?: (context: { aiActions: any }) => void;
    /** Called when streaming starts */
    onStreamingStart?: () => void;
    /** Called for each streaming chunk */
    onStreamingPartialResult?: (context: { partialResult: string }) => void;
    /** Called when streaming completes */
    onStreamingEnd?: (context: { fullResult: any }) => void;
    /** Called when an error occurs */
    onError?: (error: Error) => void;
}

/**
 * Complete options for AIActions constructor
 */
export type AIActionsOptions = AIActionsConfig & AIActionsCallbacks;

// Re-export SuperDoc class
export { SuperDoc };
