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
    changeId?: string;
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
    temperature?: number;
    maxTokens?: number;
    stop?: string[];
    model?: string;
    signal?: AbortSignal;
    metadata?: Record<string, unknown>;
    providerOptions?: Record<string, unknown>;
    documentId?: string;
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
    streamResults?: boolean;
    streamCompletion(messages: AIMessage[], options?: StreamOptions): AsyncGenerator<string, void, unknown>;
    getCompletion(messages: AIMessage[], options?: CompletionOptions): Promise<string>;
}

/**
 * User information for AI-generated changes
 */
export type AIUser = {
    displayName: string;
    profileUrl?: string;
    userId?: string;
}

/**
 * Configuration for the AIActions service
 */
export type AIActionsConfig = {
    provider: AIProvider;
    user: AIUser;
    systemPrompt?: string;
    enableLogging?: boolean;
}

/**
 * Lifecycle callbacks for AIActions events
 */
export type AIActionsCallbacks = {
    onReady?: (context: { aiActions: any }) => void;
    onStreamingStart?: () => void;
    onStreamingPartialResult?: (context: { partialResult: string }) => void;
    onStreamingEnd?: (context: { fullResult: any }) => void;
    onError?: (error: Error) => void;
}

/**
 * Planner-specific configuration options
 */
export type PlannerOptions = {
    maxContextLength?: number;
    documentContextProvider?: () => string;
    tools?: any[]; // AIBuilderToolDefinition[] - avoiding circular dependency
    onProgress?: (event: any) => void; // AIBuilderProgressCallback - avoiding circular dependency
}

/**
 * Complete options for AIActions constructor
 */
export type AIActionsOptions = AIActionsConfig & AIActionsCallbacks & {
    planner?: PlannerOptions;
};
export { SuperDoc };
