export interface DocumentPosition {
    from: number;
    to: number;
}

export interface FoundMatch {
    originalText?: string | null | undefined;
    suggestedText?: string | null | undefined;
    positions?: DocumentPosition[];
}

export interface Result {
    success: boolean;
    results: FoundMatch[];
}

export type AIMessage = {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export type StreamOptions = {
    temperature?: number;
    maxTokens?: number;
    stop?: string[];
    model?: string;
    signal?: AbortSignal;
    metadata?: Record<string, unknown>;
    providerOptions?: Record<string, unknown>;
    documentId?: string;
}

export type CompletionOptions = StreamOptions & {}

export type AIProvider = {
    streamCompletion(messages: AIMessage[], options?: StreamOptions): AsyncGenerator<string, void, unknown>;
    getCompletion(messages: AIMessage[], options?: CompletionOptions): Promise<string>;
}

export type AIUser = {
    displayName: string;
    profileUrl?: string;
    userId?: string;
}

export type SuperDocAIConfig = {
    provider: AIProvider;
    user: AIUser;
    systemPrompt?: string;
    enableLogging?: boolean;
}

export type EditorLike = {
    state: { doc: { textContent: string; content: { size: number } } };
    exportDocx: (options?: Record<string, unknown>) => Promise<unknown>;
    options: { documentId?: string | number, user: any };
    commands: any;
}

export type SuperDocLike = {
    activeEditor?: EditorLike | null | undefined;
}

export type SuperDocInstance = unknown;

export type SuperDocAICallbacks<TSuperdoc = SuperDocInstance> = {
    onReady?: (context: { superdocAIBot: any }) => void;
    onStreamingStart?: () => void;
    onStreamingPartialResult?: (context: { partialResult: string }) => void;
    onStreamingEnd?: (context: { fullResult: any }) => void;
    onError?: (error: Error) => void;
}

export type SuperDocAIOptions<TSuperdoc = SuperDocInstance> =
    SuperDocAIConfig & SuperDocAICallbacks<TSuperdoc>;
