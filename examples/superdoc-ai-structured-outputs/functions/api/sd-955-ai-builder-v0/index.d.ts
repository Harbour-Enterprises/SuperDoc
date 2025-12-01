import { SuperDoc, Editor as Editor$1 } from 'superdoc';
export { SuperDoc } from 'superdoc';
import { Mark, Node } from 'prosemirror-model';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';

type MarkType = Mark;
type NodeType = Node;
type Editor = InstanceType<typeof Editor$1> & {
    view?: EditorView;
    state?: EditorState;
};
type SuperDocInstance = typeof SuperDoc | SuperDoc;
/**
 * Represents a position range in the document
 */
interface DocumentPosition {
    from: number;
    to: number;
}
/**
 * Represents a match found by AI operations
 */
interface FoundMatch {
    originalText?: string | null | undefined;
    suggestedText?: string | null | undefined;
    positions?: DocumentPosition[];
}
/**
 * Standard result structure for AI operations
 */
interface Result {
    success: boolean;
    results: FoundMatch[];
}
/**
 * Message format for AI chat interactions
 */
type AIMessage = {
    role: 'system' | 'user' | 'assistant';
    content: string;
};
/**
 * Options for streaming AI completions
 */
type StreamOptions = {
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
};
/**
 * Options for non-streaming completions (extends StreamOptions)
 */
type CompletionOptions = StreamOptions;
/**
 * Interface that all AI providers must implement
 */
type AIProvider = {
    /** Indicates whether the provider prefers streaming responses by default */
    streamResults?: boolean;
    /** Stream completion with incremental results */
    streamCompletion(messages: AIMessage[], options?: StreamOptions): AsyncGenerator<string, void, unknown>;
    /** Get complete response in one call */
    getCompletion(messages: AIMessage[], options?: CompletionOptions): Promise<string>;
};
/**
 * User information for AI-generated changes
 */
type AIUser = {
    /** Display name of the user/bot */
    displayName: string;
    /** Optional profile URL */
    profileUrl?: string;
    /** Optional user identifier */
    userId?: string;
};
/**
 * Configuration for the AIActions service
 */
type AIActionsConfig = {
    /** AI provider instance */
    provider: AIProvider;
    /** User/bot information for attributed changes */
    user: AIUser;
    /** Optional system prompt for AI context */
    systemPrompt?: string;
    /** Enable debug logging */
    enableLogging?: boolean;
};
/**
 * Lifecycle callbacks for AIActions events
 */
type AIActionsCallbacks = {
    /** Called when AI is initialized and ready */
    onReady?: (context: {
        aiActions: unknown;
    }) => void;
    /** Called when streaming starts */
    onStreamingStart?: () => void;
    /** Called for each streaming chunk */
    onStreamingPartialResult?: (context: {
        partialResult: string;
    }) => void;
    /** Called when streaming completes */
    onStreamingEnd?: (context: {
        fullResult: unknown;
    }) => void;
    /** Called when an error occurs */
    onError?: (error: Error) => void;
};
/**
 * Complete options for AIActions constructor
 */
type AIActionsOptions = AIActionsConfig & AIActionsCallbacks;

/**
 * Primary entry point for SuperDoc AI capabilities. Wraps a SuperDoc instance,
 * manages provider lifecycle, and exposes high-level document actions.
 *
 * @template TSuperdoc - Type of the SuperDoc instance being wrapped
 *
 * @example
 * ```typescript
 * // With provider config (recommended)
 * const ai = new AIActions(superdoc, {
 *   user: { display_name: 'Bot', user_id: 'bot-123' },
 *   provider: {
 *     type: 'openai',
 *     apiKey: process.env.OPENAI_API_KEY,
 *     model: 'gpt-4'
 *   }
 * });
 *
 * // With existing provider instance
 * const provider = createAIProvider({ type: 'openai', ... });
 * const ai = new AIActions(superdoc, {
 *   user: { display_name: 'Bot' },
 *   provider
 * });
 * ```
 */
declare class AIActions {
    private readonly superdoc;
    private readonly config;
    private callbacks;
    private isReady;
    private initializationPromise;
    private readonly commands;
    readonly action: {
        find: (instruction: string) => Promise<Result>;
        findAll: (instruction: string) => Promise<Result>;
        highlight: (instruction: string, color?: string) => Promise<Result>;
        replace: (instruction: string) => Promise<Result>;
        replaceAll: (instruction: string) => Promise<Result>;
        insertTrackedChange: (instruction: string) => Promise<Result>;
        insertTrackedChanges: (instruction: string) => Promise<Result>;
        insertComment: (instruction: string) => Promise<Result>;
        insertComments: (instruction: string) => Promise<Result>;
        summarize: (instruction: string) => Promise<Result>;
        insertContent: (instruction: string) => Promise<Result>;
    };
    /**
     * Creates a new AIActions instance.
     *
     * @param superdoc - SuperDoc instance to wrap
     * @param options - Configuration including provider, user, and callbacks
     * ```
     */
    constructor(superdoc: SuperDocInstance, options: AIActionsOptions);
    /**
     * Initializes the AI system and triggers onReady callback.
     * @private
     */
    private initialize;
    /**
     * Validates that a provider is configured.
     * @private
     * @throws Error if no provider is present
     */
    private isProviderAvailable;
    /**
     * Executes an action with full callback lifecycle support
     * @private
     */
    private executeActionWithCallbacks;
    /**
     * Gets the default system prompt.
     * @private
     * @returns Default system prompt string
     */
    private getDefaultSystemPrompt;
    /**
     * Waits for initialization to complete before allowing operations.
     * Useful when you need to ensure the AI is ready before performing actions.
     *
     * @returns Promise that resolves when initialization is complete
     */
    waitUntilReady(): Promise<void>;
    /**
     * Checks if the AI is ready to process requests.
     *
     * @returns True if ready, false otherwise
     */
    getIsReady(): boolean;
    /**
     * Streams AI completion with real-time updates via callbacks.
     * Includes document context automatically.
     *
     * @param prompt - User prompt
     * @param options - Optional completion configuration
     * @returns Promise resolving to complete response
     *
     */
    streamCompletion(prompt: string, options?: StreamOptions): Promise<string>;
    /**
     * Gets a complete AI response (non-streaming).
     * Includes document context automatically.
     *
     * @param prompt - User prompt
     * @param options - Optional completion configuration
     *
     * @returns Promise resolving to complete response
     */
    getCompletion(prompt: string, options?: CompletionOptions): Promise<string>;
    /**
     * Retrieves the current document context for AI processing.
     * Returns selected text if there is a selection, otherwise returns full document content.
     *
     * @returns Document context string
     */
    getDocumentContext(): string;
    /**
     * Handles errors by logging and invoking error callback.
     * @private
     * @param error - Error to handle
     */
    private handleError;
    /**
     * Gets the active editor from the SuperDoc instance.
     * @returns Editor instance or null
     */
    private getEditor;
}

/**
 * AI-powered document actions
 * All methods are pure - they receive dependencies and return results
 */
declare class AIActionsService {
    private provider;
    private editor;
    private documentContextProvider;
    private enableLogging;
    private onStreamChunk?;
    private streamPreference?;
    private adapter;
    constructor(provider: AIProvider, editor: Editor | null, documentContextProvider: () => string, enableLogging?: boolean, onStreamChunk?: ((partialResult: string) => void) | undefined, streamPreference?: boolean | undefined);
    private getDocumentContext;
    /**
     * Executes a find query and resolves editor positions for matches.
     *
     * @param query - Natural language description of content to find
     * @param findAll - Whether to find all occurrences or just the first
     * @returns Result with found locations enriched with editor positions
     * @throws Error if query is empty
     * @private
     */
    private executeFindQuery;
    /**
     * Finds the first occurrence of content matching the query and resolves concrete positions via the editor adapter.
     * Automatically scrolls to bring the found text into view.
     *
     * @param query - Natural language description of content to find
     * @returns Result with found locations enriched with editor positions
     * @throws Error if query is empty
     */
    find(query: string): Promise<Result>;
    /**
     * Finds all occurrences of content matching the query.
     *
     * @param query - Natural language description of content to find
     * @returns Result with all found locations
     * @throws Error if query is empty
     */
    findAll(query: string): Promise<Result>;
    /**
     * Finds and highlights content in the document.
     * Automatically scrolls to bring the highlighted content into view.
     *
     * @param query - Natural language description of content to highlight
     * @param color - Hex color for the highlight (default: #6CA0DC)
     * @returns Result with highlight ID if successful
     * @throws Error if query is empty or content not found
     */
    highlight(query: string, color?: string): Promise<Result>;
    /**
     * Core logic for all document operations (replace, tracked changes, comments).
     * Finds matching content and applies the operation function to each match.
     *
     * @param query - Natural language query to find content
     * @param multiple - Whether to apply to all occurrences or just the first
     * @param operationFn - Function to execute the specific operation on each match
     * @returns Array of matches with IDs of created items
     * @throws Error if query is empty
     * @private
     */
    private executeOperation;
    /**
     * Finds and replaces the first occurrence of content with AI-generated alternative.
     * Uses intelligent mark preservation to maintain formatting.
     *
     * @param query - Natural language query describing what to replace and how
     * @returns Result with original and suggested text for the replacement
     * @throws Error if query is empty
     */
    replace(query: string): Promise<Result>;
    /**
     * Finds and replaces all occurrences with AI-generated alternatives.
     * Uses intelligent mark preservation to maintain formatting for each replacement.
     *
     * @param query - Natural language query describing what to replace and how
     * @returns Result with all replacements made
     * @throws Error if query is empty
     */
    replaceAll(query: string): Promise<Result>;
    /**
     * Insert a single tracked change
     */
    insertTrackedChange(query: string): Promise<Result>;
    /**
     * Insert multiple tracked changes
     */
    insertTrackedChanges(query: string): Promise<Result>;
    /**
     * Insert a single comment
     */
    insertComment(query: string): Promise<Result>;
    /**
     * Insert multiple comments
     */
    insertComments(query: string): Promise<Result>;
    /**
     * Generates a summary of the document.
     */
    summarize(query: string): Promise<Result>;
    /**
     * Inserts new content into the document.
     * @param query - Natural language query for content generation
     * @returns Result with inserted content location
     */
    insertContent(query: string): Promise<Result>;
    private runCompletion;
}

/**
 * Adapter for SuperDoc editor operations
 * Encapsulates all editor-specific API calls
 */
declare class EditorAdapter {
    private editor;
    constructor(editor: Editor);
    /**
     * Finds document positions for all search match results.
     * Maps abstract search results to concrete editor positions using the search command.
     *
     * @param results - Array of found matches with originalText to search for
     * @returns Array of matches enriched with position data, filtered to only matches with positions
     */
    findResults(results: FoundMatch[]): FoundMatch[];
    /**
     * Creates a highlight mark at the specified document range.
     * Automatically scrolls to bring the highlighted range into view.
     *
     * @param from - Start position of the highlight
     * @param to - End position of the highlight
     * @param inlineColor - Hex color for the highlight (default: #6CA0DC)
     */
    createHighlight(from: number, to: number, inlineColor?: string): void;
    /**
     * Scrolls the editor view to bring a specific position range into view.
     *
     * @param from - Start position to scroll to
     * @param to - End position to scroll to
     */
    scrollToPosition(from: number, to: number): void;
    /**
     * Gets the current selection range from the editor state.
     *
     * @returns Selection range with from/to positions, or null if no valid state
     * @private
     */
    private getSelectionRange;
    /**
     * Collects text segments with their marks from a document range.
     * Handles text nodes that partially overlap with the specified range by computing
     * the intersection and extracting only the overlapping portion with its marks.
     *
     * @param from - Start position (validated against doc boundaries)
     * @param to - End position (validated against doc boundaries)
     * @returns Array of segments with length and marks, or empty array if invalid positions
     * @private
     */
    private collectTextSegments;
    /**
     * Gets the marks that should be applied at a specific position.
     * Checks stored marks first, then resolves marks from the document position.
     *
     * @param position - Document position to get marks from
     * @returns Array of marks at the position, or empty array if invalid position
     * @private
     */
    private getMarksAtPosition;
    /**
     * Builds an array of ProseMirror text nodes with preserved marks.
     * Distributes the suggested text across segments, applying each segment's marks
     * to the corresponding portion of text. If text extends beyond segments, uses
     * the last segment's marks for the overflow.
     *
     * @param from - Original range start (used if segments not provided)
     * @param to - Original range end (used if segments not provided)
     * @param suggestedText - The text to split into marked nodes
     * @param segments - Optional pre-collected segments (will collect if not provided)
     * @returns Array of text nodes with marks applied
     * @private
     */
    private buildTextNodes;
    /**
     * Computes the range of actual changes between original and suggested text.
     * Uses a diff algorithm to find common prefix and suffix, minimizing the
     * region that needs to be replaced in the document.
     *
     * @param original - Original text string
     * @param suggested - Suggested replacement text string
     * @returns Object with prefix length, suffix length, and whether any change exists
     * @private
     */
    private computeChangeRange;
    /**
     * Applies a text replacement patch to the document.
     * Uses intelligent diffing to replace only the changed portion while preserving marks.
     * Validates position boundaries before making changes.
     *
     * @param from - Start position of the replacement range
     * @param to - End position of the replacement range
     * @param suggestedText - The text to insert
     * @private
     */
    private applyPatch;
    /**
     * Replaces text in the document while intelligently preserving ProseMirror marks.
     * Uses a diffing algorithm to minimize document changes by only replacing changed portions.
     * Validates position boundaries and silently ignores invalid positions.
     *
     * @param from - Start position (must be >= 0 and < doc size)
     * @param to - End position (must be <= doc size and >= from)
     * @param suggestedText - The replacement text to insert
     */
    replaceText(from: number, to: number, suggestedText: string): void;
    /**
     * Creates a tracked change for the specified replacement.
     * Temporarily enables track changes mode, applies the replacement, then disables tracking.
     *
     * @param from - Start position of the change
     * @param to - End position of the change
     * @param suggestedText - The suggested replacement text
     * @returns Generated ID for the tracked change
     */
    createTrackedChange(from: number, to: number, suggestedText: string): string;
    /**
     * Creates a comment at the specified document range.
     * Enables track changes during comment insertion to maintain editing context.
     *
     * @param from - Start position of the comment anchor
     * @param to - End position of the comment anchor
     * @param text - The comment text content
     * @returns Promise resolving to the generated ID for the comment
     */
    createComment(from: number, to: number, text: string): Promise<string>;
    /**
     * Inserts text at the current editor selection.
     * Preserves marks from the surrounding context at the insertion point.
     *
     * @param suggestedText - The text to insert
     */
    insertText(suggestedText: string): void;
}

/**
 * Result of executing a tool
 */
interface ToolResult {
    /** Whether the tool executed successfully */
    success: boolean;
    /** Data returned by the tool */
    data?: any;
    /** Error message if execution failed */
    error?: string;
    /** Whether the document was modified */
    docChanged: boolean;
    /** Optional message to send back to the AI */
    message?: string;
}
/**
 * Category of tool operation
 */
type ToolCategory = 'read' | 'write' | 'navigate' | 'analyze';
/**
 * Core tool interface that all SuperDoc AI tools must implement
 */
interface SuperDocTool {
    /** Unique identifier for the tool */
    name: string;
    /** Human-readable description of what the tool does */
    description: string;
    /** Category of operation */
    category: ToolCategory;
    /** Execute the tool with given parameters */
    execute: (editor: Editor, params: any) => Promise<ToolResult>;
}
/**
 * Options for filtering which tools and features to include
 */
interface ToolDefinitionsOptions {
    /** List of tool names to enable (if undefined, all are enabled) */
    enabledTools?: string[];
    /** Node types to exclude (all others from extensions are included) */
    excludedNodes?: string[];
    /** Mark types to exclude (all others from extensions are included) */
    excludedMarks?: string[];
    /** Attribute names to exclude */
    excludedAttrs?: string[];
    /** Whether to use strict mode (for providers that support it) */
    strict?: boolean;
}
/**
 * Options for tool execution
 */
interface ExecuteToolOptions {
    /** Whether to validate params before execution */
    validate?: boolean;
    /** Callback for progress updates during execution */
    onProgress?: (progress: number) => void;
    /** Abort signal for cancellation */
    signal?: AbortSignal;
}
/**
 * Generic tool schema format (provider-agnostic)
 */
interface GenericToolSchema {
    name: string;
    description: string;
    parameters: {
        type: 'object';
        properties: Record<string, any>;
        required?: string[];
        additionalProperties?: boolean;
    };
}
/**
 * Anthropic-specific tool format
 */
interface AnthropicTool {
    name: string;
    description: string;
    input_schema: {
        type: 'object';
        properties: Record<string, any>;
        required?: string[];
        additionalProperties?: boolean;
    };
}
/**
 * Union of all provider-specific tool formats
 */
type ProviderToolDefinition = AnthropicTool | GenericToolSchema;

/**
 * Params for readSelection tool
 */
interface ReadSelectionParams {
    /** Number of paragraphs to include before and after the selection for context */
    withContext?: number;
}
/**
 * Tool for reading the currently selected content in the document.
 * Returns the selection range and the JSON representation of the selected content.
 * Optionally includes surrounding paragraphs for context.
 *
 * @example
 * // Read just the selection
 * const selection = await executeTool('readSelection', {}, editor);
 *
 * // Read selection with 2 paragraphs before/after for context
 * const selection = await executeTool('readSelection', { withContext: 2 }, editor);
 */
declare const readSelection: SuperDocTool;

/**
 * Params for readContent tool
 */
interface ReadContentParams {
    /** Start position (character offset) */
    from: number;
    /** End position (character offset) */
    to: number;
}
/**
 * Tool for reading content at a specific position range.
 * Use this after searchContent to read the actual content around a found position.
 *
 * @example
 * // First find the position
 * const searchResult = await executeTool('searchContent', { query: 'Introduction' }, editor);
 * // Then read the content around it
 * const content = await executeTool('readContent', {
 *   from: searchResult.data.matches[0].from,
 *   to: searchResult.data.matches[0].to + 500 // read 500 chars after
 * }, editor);
 */
declare const readContent: SuperDocTool;

/**
 * Params for searchContent tool
 */
interface SearchContentParams {
    /** The text or pattern to search for */
    query: string;
    /** Whether the search should be case-sensitive (default: false) */
    caseSensitive?: boolean;
    /** Whether to treat query as a regular expression (default: false) */
    regex?: boolean;
    /** Whether to return all matches or just the first one (default: true) */
    findAll?: boolean;
}
/**
 * Search result containing match information
 */
interface SearchMatch {
    /** The matched text */
    text: string;
    /** Start position in the document */
    from: number;
    /** End position in the document */
    to: number;
}
/**
 * Tool for searching text in the document.
 * Returns positions of matches that can be used with readContent or replaceContent.
 *
 * @example
 * // Search for all occurrences of "privacy"
 * const result = await executeTool('searchContent', {
 *   query: 'privacy',
 *   caseSensitive: false,
 *   findAll: true
 * }, editor);
 * // Returns: { matches: [{ text: 'privacy', from: 100, to: 107 }, ...] }
 *
 * // Then read content around the match:
 * await executeTool('readContent', {
 *   from: result.data.matches[0].from - 50,
 *   to: result.data.matches[0].to + 50
 * }, editor);
 *
 * // Or replace it:
 * await executeTool('replaceContent', {
 *   from: result.data.matches[0].from,
 *   to: result.data.matches[0].to,
 *   content: [{ type: 'paragraph', content: [{ type: 'text', text: 'confidentiality' }] }]
 * }, editor);
 */
declare const searchContent: SuperDocTool;

/**
 * Tool for getting the content schema.
 * Call this before insertContent or replaceContent to understand the expected format.
 *
 * @example
 * // First get the schema
 * const schema = await executeTool('getContentSchema', {}, editor);
 * // Then use the format to create content
 * await executeTool('insertContent', {
 *   position: 'selection',
 *   content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }]
 * }, editor);
 */
declare const getContentSchema: SuperDocTool;

/**
 * Params for insertContent tool
 */
interface InsertContentParams {
    /** Where to insert: 'selection' (at cursor), 'documentStart', or 'documentEnd' */
    position: 'selection' | 'documentStart' | 'documentEnd';
    /** Array of content nodes to insert (ProseMirror JSON format) */
    content: any[];
}
/**
 * Tool for inserting content at specified positions in the document.
 * Supports inserting at cursor position, document start, or document end.
 */
declare const insertContent: SuperDocTool;

/**
 * Params for replaceContent tool
 */
interface ReplaceContentParams {
    /** Text to search for and replace (alternative to from/to positions) */
    query?: string;
    /** Start position (character offset) - required if query not provided */
    from?: number;
    /** End position (character offset) - required if query not provided */
    to?: number;
    /** Array of content nodes to replace with (ProseMirror JSON format) */
    content: any[];
    /** Whether to replace all occurrences when using query (default: false) */
    replaceAll?: boolean;
}
/**
 * Tool for replacing content in a specific range of the document.
 * Removes content from 'from' to 'to' positions and inserts new content.
 */
declare const replaceContent: SuperDocTool;

/**
 * Heading info returned in document outline
 */
interface HeadingInfo {
    /** The heading text */
    text: string;
    /** Heading level (1-6) */
    level: number;
    /** Start position in document */
    position: number;
}
/**
 * Tool for getting document structure/outline.
 * Returns headings with their positions so LLM can navigate large documents.
 *
 * @example
 * const outline = await executeTool('getDocumentOutline', {}, editor);
 * // Returns: { headings: [{ text: "Introduction", level: 1, position: 0 }, ...], totalLength: 5000 }
 */
declare const getDocumentOutline: SuperDocTool;

/**
 * Params for readSection tool
 */
interface ReadSectionParams {
    /** Heading text to find and read (case-insensitive partial match) */
    heading?: string;
    /** Start position (alternative to heading) */
    from?: number;
    /** End position (alternative to heading) */
    to?: number;
}
/**
 * Tool for reading a specific section of the document by heading name.
 * Use after getDocumentOutline to read content of a specific section.
 *
 * @example
 * // Read by heading name
 * const section = await executeTool('readSection', { heading: 'Introduction' }, editor);
 *
 * // Read by position (from outline)
 * const section = await executeTool('readSection', { from: 150, to: 450 }, editor);
 */
declare const readSection: SuperDocTool;

/**
 * All available SuperDoc AI tools
 */
declare const ALL_TOOLS: Record<string, SuperDocTool>;
/**
 * Get a tool by name
 */
declare function getTool(name: string): SuperDocTool | undefined;
/**
 * Get all tool names
 */
declare function getToolNames(): string[];

/**
 * Execute a tool by name with given parameters.
 * This is the primary way to run AI-generated tool calls.
 *
 * @param toolName - Name of the tool to execute
 * @param params - Parameters to pass to the tool
 * @param editor - SuperDoc editor instance
 * @param options - Optional execution options
 * @returns Tool execution result
 *
 * @example
 * ```typescript
 * const result = await executeTool('insertContent', {
 *   position: 'selection',
 *   content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }]
 * }, editor);
 *
 * if (result.success) {
 *   console.log('Content inserted successfully');
 * }
 * ```
 */
declare function executeTool(toolName: string, params: any, editor: Editor, options?: ExecuteToolOptions): Promise<ToolResult>;

/**
 * Generate Anthropic-compatible tool definitions for SuperDoc AI.
 *
 * Returns an array of tool objects compatible with Anthropic's Messages API.
 *
 * @param extensions - Array of SuperDoc extensions (unused for now, reserved for future)
 * @param options - Tool definition options
 * @returns Array of Anthropic tool definitions
 *
 * @example
 * ```typescript
 * import { anthropicTools } from '@superdoc-dev/ai/ai-builder/providers';
 * import Anthropic from '@anthropic-ai/sdk';
 *
 * const tools = anthropicTools();
 *
 * const anthropic = new Anthropic({ apiKey: '...' });
 * const response = await anthropic.messages.create({
 *   model: 'claude-sonnet-4-5',
 *   tools,
 *   messages: [...]
 * });
 * ```
 */
declare function anthropicTools(extensions?: unknown[], options?: ToolDefinitionsOptions): AnthropicTool[];
/**
 * Alias for anthropicTools for consistency
 */
declare const toolDefinitions: typeof anthropicTools;

/**
 * Hardcoded content schema for SuperDoc AI
 *
 * JSON Schema that describes SuperDoc's document structure for LLMs.
 *
 * Structure:
 * - Document = array of paragraphs
 * - Paragraph = contains text nodes with optional marks (bold, italic, etc.)
 * - Supports lists via numberingProperties attribute
 * - Supports headings via styleId attribute
 */
/**
 * The content schema for SuperDoc documents
 *
 * This is a hardcoded schema. Future versions may generate this dynamically.
 */
declare const CONTENT_SCHEMA: {
    readonly type: "array";
    readonly description: "Array of paragraph nodes that make up the document content";
    readonly items: {
        readonly additionalProperties: false;
        readonly type: "object";
        readonly required: readonly ["type", "content"];
        readonly properties: {
            readonly type: {
                readonly type: "string";
                readonly const: "paragraph";
                readonly description: "Paragraph node. For headings, use styleId attribute (e.g., \"Heading1\"). For lists, use numberingProperties.";
            };
            readonly content: {
                readonly type: "array";
                readonly description: "Array of text nodes and line breaks";
                readonly items: {
                    readonly oneOf: readonly [{
                        readonly type: "object";
                        readonly required: readonly ["type", "text"];
                        readonly properties: {
                            readonly type: {
                                readonly type: "string";
                                readonly const: "text";
                                readonly description: "Text content node";
                            };
                            readonly text: {
                                readonly type: "string";
                                readonly description: "The actual text content";
                            };
                            readonly marks: {
                                readonly type: "array";
                                readonly description: "Optional formatting marks (bold, italic, etc.)";
                                readonly items: {
                                    readonly type: "object";
                                    readonly required: readonly ["type"];
                                    readonly properties: {
                                        readonly type: {
                                            readonly type: "string";
                                            readonly enum: readonly ["bold", "italic", "underline", "strike", "link", "highlight", "textStyle"];
                                            readonly description: "Type of formatting mark";
                                        };
                                        readonly attrs: {
                                            readonly type: "object";
                                            readonly description: "Mark attributes (e.g., href for links, color for highlights)";
                                        };
                                    };
                                };
                            };
                        };
                    }, {
                        readonly type: "object";
                        readonly required: readonly ["type"];
                        readonly properties: {
                            readonly type: {
                                readonly type: "string";
                                readonly const: "hardBreak";
                                readonly description: "Line break (Shift+Enter)";
                            };
                        };
                    }];
                };
            };
            readonly attrs: {
                readonly type: "object";
                readonly description: "Paragraph attributes for styling and structure";
                readonly properties: {
                    readonly styleId: {
                        readonly type: "string";
                        readonly description: "Word style ID for headings (e.g., \"Heading1\", \"Heading2\", etc.) or other styles";
                    };
                    readonly textAlign: {
                        readonly type: "string";
                        readonly enum: readonly ["left", "center", "right", "justify"];
                        readonly description: "Text alignment";
                    };
                    readonly lineHeight: {
                        readonly oneOf: readonly [{
                            readonly type: "string";
                        }, {
                            readonly type: "number";
                        }];
                        readonly description: "Line height (e.g., \"1.5\" or 1.5)";
                    };
                    readonly textIndent: {
                        readonly oneOf: readonly [{
                            readonly type: "string";
                        }, {
                            readonly type: "number";
                        }];
                        readonly description: "First-line indentation";
                    };
                    readonly numberingProperties: {
                        readonly type: "object";
                        readonly description: "List properties. Use numId=1 for bullet lists, numId=2 for numbered lists";
                        readonly required: readonly ["numId", "ilvl"];
                        readonly properties: {
                            readonly numId: {
                                readonly type: "number";
                                readonly description: "Numbering definition ID: 1 for bullets, 2 for numbered lists";
                            };
                            readonly ilvl: {
                                readonly type: "number";
                                readonly description: "Indentation level (0-8, where 0 is top level)";
                            };
                        };
                    };
                };
            };
        };
    };
};

/**
 * Result from getDocumentContext
 */
interface DocumentContextResult {
    /** Strategy used: 'full' for small docs, 'selection' for large docs */
    strategy: 'full' | 'selection';
    /** The document content (full or selection only) */
    content: unknown;
    /** Guidance message for large documents */
    message?: string;
}
/**
 * Options for getDocumentContext
 */
interface DocumentContextOptions {
    /** Maximum tokens before switching to selection-only mode (default: 5000) */
    maxTokens?: number;
}
/**
 * Get document context optimized for token efficiency.
 *
 * - Small documents: returns full document content
 * - Large documents: returns only selection, with guidance to use tools
 *
 * @example
 * ```typescript
 * const context = getDocumentContext(editor, { maxTokens: 5000 });
 *
 * if (context.strategy === 'full') {
 *   // Send full document to LLM
 *   systemPrompt += `\n\nDocument:\n${JSON.stringify(context.content)}`;
 * } else {
 *   // Send selection + guidance
 *   systemPrompt += `\n\nSelected content:\n${JSON.stringify(context.content)}`;
 *   systemPrompt += `\n\n${context.message}`;
 * }
 * ```
 */
declare function getDocumentContext(editor: Editor, options?: DocumentContextOptions): DocumentContextResult;

/**
 * SuperDoc AI Builder - Low-level primitives for building custom AI workflows
 *
 * @module ai-builder
 *
 * AI Builder provides the foundational components for creating AI-powered
 * document editing experiences. It offers:
 *
 * - **Tools**: Core document operations (read, search, insert, replace)
 * - **Executor**: Primitive for running tool calls (executeTool)
 * - **Provider**: Anthropic tool schemas
 * - **Helper**: Token-efficient document context (getDocumentContext)
 *
 * @example
 * ```typescript
 * import { executeTool, anthropicTools, getDocumentContext } from '@superdoc-dev/ai/ai-builder';
 * import Anthropic from '@anthropic-ai/sdk';
 *
 * // Get tool definitions
 * const tools = anthropicTools();
 *
 * // Get document context (full doc for small, selection for large)
 * const context = getDocumentContext(editor, { maxTokens: 5000 });
 *
 * // Use with Anthropic SDK
 * const anthropic = new Anthropic({ apiKey: '...' });
 * const response = await anthropic.messages.create({
 *   model: 'claude-sonnet-4-5',
 *   system: `You are a document editor.\n\nDocument:\n${JSON.stringify(context.content)}`,
 *   tools,
 *   messages: [{ role: 'user', content: userMessage }]
 * });
 *
 * // Execute tool calls
 * for (const toolUse of response.content.filter(c => c.type === 'tool_use')) {
 *   await executeTool(toolUse.name, toolUse.input, editor);
 * }
 * ```
 */

declare const index_ALL_TOOLS: typeof ALL_TOOLS;
type index_AnthropicTool = AnthropicTool;
declare const index_CONTENT_SCHEMA: typeof CONTENT_SCHEMA;
type index_DocumentContextOptions = DocumentContextOptions;
type index_DocumentContextResult = DocumentContextResult;
type index_ExecuteToolOptions = ExecuteToolOptions;
type index_GenericToolSchema = GenericToolSchema;
type index_HeadingInfo = HeadingInfo;
type index_InsertContentParams = InsertContentParams;
type index_ProviderToolDefinition = ProviderToolDefinition;
type index_ReadContentParams = ReadContentParams;
type index_ReadSectionParams = ReadSectionParams;
type index_ReadSelectionParams = ReadSelectionParams;
type index_ReplaceContentParams = ReplaceContentParams;
type index_SearchContentParams = SearchContentParams;
type index_SearchMatch = SearchMatch;
type index_SuperDocTool = SuperDocTool;
type index_ToolCategory = ToolCategory;
type index_ToolDefinitionsOptions = ToolDefinitionsOptions;
type index_ToolResult = ToolResult;
declare const index_anthropicTools: typeof anthropicTools;
declare const index_executeTool: typeof executeTool;
declare const index_getContentSchema: typeof getContentSchema;
declare const index_getDocumentContext: typeof getDocumentContext;
declare const index_getDocumentOutline: typeof getDocumentOutline;
declare const index_getTool: typeof getTool;
declare const index_getToolNames: typeof getToolNames;
declare const index_insertContent: typeof insertContent;
declare const index_readContent: typeof readContent;
declare const index_readSection: typeof readSection;
declare const index_readSelection: typeof readSelection;
declare const index_replaceContent: typeof replaceContent;
declare const index_searchContent: typeof searchContent;
declare namespace index {
  export { index_ALL_TOOLS as ALL_TOOLS, type index_AnthropicTool as AnthropicTool, index_CONTENT_SCHEMA as CONTENT_SCHEMA, type index_DocumentContextOptions as DocumentContextOptions, type index_DocumentContextResult as DocumentContextResult, type index_ExecuteToolOptions as ExecuteToolOptions, type index_GenericToolSchema as GenericToolSchema, type index_HeadingInfo as HeadingInfo, type index_InsertContentParams as InsertContentParams, type index_ProviderToolDefinition as ProviderToolDefinition, type index_ReadContentParams as ReadContentParams, type index_ReadSectionParams as ReadSectionParams, type index_ReadSelectionParams as ReadSelectionParams, type index_ReplaceContentParams as ReplaceContentParams, type index_SearchContentParams as SearchContentParams, type index_SearchMatch as SearchMatch, type index_SuperDocTool as SuperDocTool, type index_ToolCategory as ToolCategory, type index_ToolDefinitionsOptions as ToolDefinitionsOptions, type index_ToolResult as ToolResult, toolDefinitions as anthropicToolDefinitions, index_anthropicTools as anthropicTools, index_executeTool as executeTool, index_getContentSchema as getContentSchema, index_getDocumentContext as getDocumentContext, index_getDocumentOutline as getDocumentOutline, index_getTool as getTool, index_getToolNames as getToolNames, index_insertContent as insertContent, index_readContent as readContent, index_readSection as readSection, index_readSelection as readSelection, index_replaceContent as replaceContent, index_searchContent as searchContent };
}

/**
 * Shared utility functions
 */
/**
 * Validates input string is not empty or whitespace-only
 * @param input - String to validate
 * @param _name - Name of the input for error messages (used by caller)
 * @returns true if valid, false if invalid
 */
declare function validateInput(input: string, _name: string): boolean;
/**
 * Parses JSON from a string, with robust handling of:
 *
 * @param response - String potentially containing JSON
 * @param fallback - Value to return if parsing fails
 * @param enableLogging - Whether to log parsing errors
 * @returns Parsed object or fallback value
 */
declare function parseJSON<T>(response: string, fallback: T, enableLogging?: boolean): T;
/**
 * Removes markdown code block syntax from a string.
 *
 * @param text - Text potentially wrapped in code blocks
 * @returns Cleaned text without markdown syntax
 */
declare function removeMarkdownCodeBlocks(text: string): string;
/**
 * Generates a unique ID with a prefix.
 *
 * @param prefix - Prefix for the ID
 * @returns Unique ID string
 * ```
 */
declare function generateId(prefix: string): string;

/**
 * Provider factories and adapter utilities that normalize different LLM backends
 * (OpenAI, Anthropic, bespoke HTTP endpoints, or pre-built provider instances)
 * into the shared `AIProvider` interface consumed by SuperDoc AI.
 *
 * Consumers typically pass a configuration object to `createAIProvider`; internally
 * we map that object to an implementation that exposes the two required methods:
 * `getCompletion` for single-turn requests and `streamCompletion` for incremental
 * responses.  Each helper below handles nuances such as request body shape,
 * authentication headers, and stream parsing for the corresponding provider.
 */

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
interface ProviderRequestContext {
    messages: AIMessage[];
    options?: CompletionOptions;
    stream: boolean;
}
interface ProviderDefaults {
    temperature?: number;
    maxTokens?: number;
    stop?: string[];
    streamResults?: boolean;
}
/**
 * Generic JSON value type for provider payloads
 */
type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
type JsonObject = {
    [key: string]: JsonValue;
};
type JsonArray = JsonValue[];
/**
 * Type for provider response payloads (parsed JSON or raw data)
 */
type ProviderPayload = JsonValue | unknown;
interface HttpProviderConfig extends ProviderDefaults {
    type: 'http';
    url: string;
    streamUrl?: string;
    headers?: Record<string, string>;
    method?: string;
    fetch?: FetchLike;
    buildRequestBody?: (context: ProviderRequestContext) => Record<string, JsonValue>;
    parseCompletion?: (payload: ProviderPayload) => string;
    parseStreamChunk?: (payload: ProviderPayload) => string | undefined;
}
interface OpenAIProviderConfig extends ProviderDefaults {
    type: 'openai';
    apiKey: string;
    model: string;
    baseURL?: string;
    organizationId?: string;
    headers?: Record<string, string>;
    completionPath?: string;
    requestOptions?: Record<string, JsonValue>;
    fetch?: FetchLike;
}
interface AnthropicProviderConfig extends ProviderDefaults {
    type: 'anthropic';
    apiKey: string;
    model: string;
    baseURL?: string;
    apiVersion?: string;
    headers?: Record<string, string>;
    requestOptions?: Record<string, JsonValue>;
    fetch?: FetchLike;
}
type AIProviderInput = AIProvider | OpenAIProviderConfig | AnthropicProviderConfig | HttpProviderConfig;

export { AIActions, type AIActionsCallbacks, type AIActionsConfig, type AIActionsOptions, AIActionsService, index as AIBuilder, type AIMessage, type AIProvider, type AIProviderInput, type AIUser, type AnthropicProviderConfig, type CompletionOptions, type DocumentPosition, type Editor, EditorAdapter, type FetchLike, type FoundMatch, type HttpProviderConfig, type MarkType, type NodeType, type OpenAIProviderConfig, type ProviderRequestContext, type Result, type StreamOptions, type SuperDocInstance, anthropicTools, executeTool, generateId, parseJSON, removeMarkdownCodeBlocks, validateInput };
