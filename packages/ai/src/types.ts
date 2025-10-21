// ============================================
// Core AI Types
// ============================================

export interface AIMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface StreamOptions {
    temperature?: number;
    maxTokens?: number;
    stop?: string[];
    model?: string;
    signal?: AbortSignal;
    metadata?: Record<string, unknown>;
    providerOptions?: Record<string, unknown>;
    documentId?: string;
}

export interface CompletionOptions extends StreamOptions {}

export interface AIProvider {
    streamCompletion(messages: AIMessage[], options?: StreamOptions): AsyncGenerator<string, void, unknown>;
    getCompletion(messages: AIMessage[], options?: CompletionOptions): Promise<string>;
}

// ============================================
// User Configuration
// ============================================

export interface AIUser {
    display_name: string;
    profile_url?: string;
    user_id?: string;
}

export interface SuperDocAIConfig {
    provider: AIProvider;
    user: AIUser;
    systemPrompt?: string;
    enableLogging?: boolean;
}

// ============================================
// Document Types
// ============================================

export interface DocumentPosition {
    from: number;
    to: number;
}
export interface ReplacementEntry  {
    oldText: string;
    newText: string;
}

export interface FoundMatch {
    text: string | null | undefined;
    oldText?: string | null | undefined;
    newText?: string | null | undefined;
    positions: Array<DocumentPosition>;
}

export interface EditorLike {
    state: { doc: { textContent: string; content: { size: number } } };
    exportDocx: (options?: Record<string, unknown>) => Promise<unknown>;
    options: { documentId?: string | number, user: any };
    commands: any;
}

export interface SuperDocLike {
    activeEditor?: EditorLike | null | undefined;
}

export type SuperDocInstance = unknown;

export interface FindResult {
    found: boolean;
    results?: Array<FoundMatch>;
}

export interface FindAllResult {
    found: boolean;
    results?: Array<FoundMatch>;
}

export interface HighlightResult extends FindResult {
    highlighted: boolean;
}

export interface ReplaceResult extends FindResult {
    replaced: boolean;
    oldText?: string;
    newText?: string;
}

export interface ReplaceAllResult extends FindAllResult {
    replaced: boolean;
    replacements: Array<{
        oldText: string;
        newText: string;
    }>;
}

export interface TrackedChangeResult extends FindResult {
    trackedChangeId?: string;
    author: AIUser;
    timestamp: string;
}

export interface TrackedChangesResult extends FindAllResult {
    trackedChangeIds: string[];
    changes: Array<{
        trackedChangeId: string;
        author: AIUser;
    }>;
}

export interface CommentResult extends FindResult {
    commentId?: string;
    author: AIUser;
    commentText: string;
    timestamp: string;
}

export interface CommentsResult extends FindAllResult {
    commentIds: string[];
    comments: Array<{
        commentId: string;
        author: AIUser;
        commentText: string | null | undefined;
    }>;
}

export interface SummarizeResult {
    summary: string;
    keyPoints?: string[];
}

export interface InsertContentResult {
    inserted: boolean;
    insertedText?: string;
}

// ============================================
// Actions Interface
// ============================================

export interface SuperDocAIActions {
    find: (query: string) => Promise<FindResult>;
    findAll: (query: string) => Promise<FindAllResult>;
    highlight: (query: string) => Promise<HighlightResult>;
    replace: (instruction: string) => Promise<ReplaceResult>;
    replaceAll: (instruction: string) => Promise<ReplaceAllResult>;
    insertTrackedChange: (instruction: string) => Promise<TrackedChangeResult>;
    insertTrackedChanges: (instruction: string) => Promise<TrackedChangesResult>;
    insertComment: (instruction: string) => Promise<CommentResult>;
    insertComments: (instruction: string) => Promise<CommentsResult>;
    summarize: (options?: { maxLength?: number }) => Promise<SummarizeResult>;
    ask: (question: string) => Promise<string>;
    insertContent: (instruction: string) => Promise<InsertContentResult>;
}

// ============================================
// SuperDocAI API Interface (FIXED)
// ============================================

export interface SuperDocAIApi<TSuperdoc = SuperDocInstance> {
    // Actions - THIS WAS MISSING!
    readonly action: SuperDocAIActions;

    // Lifecycle
    waitUntilReady(): Promise<void>;
    getIsReady(): boolean;

    // Configuration
    setProvider(provider: AIProvider): void;
    setSystemPrompt(systemPrompt: string): void;
    getProvider(): AIProvider;
    getConfig(): Readonly<SuperDocAIConfig>;

    // Document
    getDocumentContext(): Promise<string>;
    getSuperdoc(): TSuperdoc;

    // Direct AI calls
    streamCompletion(prompt: string, options?: StreamOptions): Promise<string>;
    getCompletion(prompt: string, options?: CompletionOptions): Promise<string>;
}

// ============================================
// Callbacks (NOW CORRECT)
// ============================================

export interface SuperDocAICallbacks<TSuperdoc = SuperDocInstance> {
    /**
     * Called when AI is ready
     * Now correctly typed with SuperDocAIApi that includes 'action'
     */
    onReady?: (context: { superdocAIBot: any }) => void;

    /**
     * Called when streaming starts
     */
    onStreamingStart?: () => void;

    /**
     * Called during streaming with partial results
     */
    onStreamingPartialResult?: (context: { partialResult: string }) => void;

    /**
     * Called when streaming completes
     */
    onStreamingEnd?: (context: { fullResult: string }) => void;

    /**
     * Called on errors
     */
    onError?: (error: Error) => void;
}

// ============================================
// Options Type (Combined)
// ============================================

export type SuperDocAIOptions<TSuperdoc = SuperDocInstance> =
    SuperDocAIConfig & SuperDocAICallbacks<TSuperdoc>;
