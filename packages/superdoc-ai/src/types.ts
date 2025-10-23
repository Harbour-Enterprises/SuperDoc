import { SuperDoc, Editor as EditorClass } from 'superdoc';

export type Editor = InstanceType<typeof EditorClass>;
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
}

/**
 * Options for non-streaming completions (extends StreamOptions)
 */
export type CompletionOptions = StreamOptions;

/**
 * Interface that all AI providers must implement
 */
export type AIProvider = {
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
 * Configuration for SuperDocAI
 */
export type SuperDocAIConfig = {
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
 * Lifecycle callbacks for SuperDocAI events
 */
export type SuperDocAICallbacks = {
    /** Called when AI is initialized and ready */
    onReady?: (context: { superdocAIBot: any }) => void;
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
 * Complete options for SuperDocAI constructor
 */
export type SuperDocAIOptions = SuperDocAIConfig & SuperDocAICallbacks;

// Re-export SuperDoc class
export { SuperDoc };
