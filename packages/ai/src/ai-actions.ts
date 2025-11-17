import type {
    CompletionOptions,
    ContextScope,
    ContextWindow,
    ContextWindowConfig,
    Editor,
    Result,
    StreamOptions,
    AIActionsCallbacks,
    AIActionsConfig,
    AIActionsOptions,
    SuperDocInstance,
    SuperDoc,
} from './types';
import {AIActionsService} from './ai-actions-service';
import {createAIProvider, isAIProvider} from './providers';
import {EditorAdapter} from './editor-adapter';
import {formatContextWindow} from './prompts';

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
export class AIActions {
    private readonly superdoc: SuperDocInstance;
    private readonly config: AIActionsConfig;
    private callbacks: AIActionsCallbacks;
    private isReady = false;
    private initializationPromise: Promise<void> | null = null;
    private readonly commands: AIActionsService;
    private readonly contextWindowConfig: {
        paddingBlocks: number;
        maxChars: number;
    };

    public readonly action = {
        find: async (instruction: string) => {
            return this.executeActionWithCallbacks(() => this.commands.find(instruction));
        },
        findAll: async (instruction: string) => {
            return this.executeActionWithCallbacks(() => this.commands.findAll(instruction));
        },
        highlight: async (instruction: string, color?: string) => {
            return this.executeActionWithCallbacks(() => this.commands.highlight(instruction, color));
        },
        replace: async (instruction: string) => {
            return this.executeActionWithCallbacks(() => this.commands.replace(instruction));
        },
        replaceAll: async (instruction: string) => {
            return this.executeActionWithCallbacks(() => this.commands.replaceAll(instruction));
        },
        insertTrackedChange: async (instruction: string) => {
            return this.executeActionWithCallbacks(() => this.commands.insertTrackedChange(instruction));
        },
        insertTrackedChanges: async (instruction: string) => {
            return this.executeActionWithCallbacks(() => this.commands.insertTrackedChanges(instruction));
        },
        insertComment: async (instruction: string) => {
            return this.executeActionWithCallbacks(() => this.commands.insertComment(instruction));
        },

        insertComments: async (instruction: string) => {
            return this.executeActionWithCallbacks(() => this.commands.insertComments(instruction));
        },
        summarize: async (instruction: string) => {
            return this.executeActionWithCallbacks(() => this.commands.summarize(instruction));
        },
        insertContent: async (instruction: string) => {
            return this.executeActionWithCallbacks(() => this.commands.insertContent(instruction));
        },
    };

    /**
     * Creates a new AIActions instance.
     *
     * @param superdoc - SuperDoc instance to wrap
     * @param options - Configuration including provider, user, and callbacks
     * ```
     */
    constructor(superdoc: SuperDocInstance, options: AIActionsOptions) {
        this.superdoc = superdoc;

        const {onReady, onStreamingStart, onStreamingPartialResult, onStreamingEnd, onError, provider, ...config} =
            options;
        let streamResults = provider.streamResults;

        const aiProvider = isAIProvider(provider) ? provider : createAIProvider(provider);

        this.config = {
            systemPrompt: this.getDefaultSystemPrompt(),
            enableLogging: false,
            ...config,
            provider: aiProvider,
        };

        const contextWindowDefaults: ContextWindowConfig | undefined = this.config.contextWindow;
        this.contextWindowConfig = {
            paddingBlocks: Math.max(0, contextWindowDefaults?.paddingBlocks ?? 1),
            maxChars: Math.max(200, contextWindowDefaults?.maxChars ?? 2000),
        };

        this.callbacks = {
            onReady,
            onStreamingStart,
            onStreamingPartialResult,
            onStreamingEnd,
            onError,
        };

        const editor = this.getEditor();
        if (!editor) {
            throw new Error('AIActions requires an active editor before initialization');
        }

        editor.setOptions({
            user: {
                id: this.config.user.userId,
                name: this.config.user.displayName,
                image: this.config.user.profileUrl,
            },
        });

        this.commands = new AIActionsService(
            this.config.provider,
            editor,
            (scope) => this.getContextWindow({scope}),
            this.config.enableLogging,
            (partial) => this.callbacks.onStreamingPartialResult?.({partialResult: partial}),
            streamResults,
        );

        this.initializationPromise = this.initialize();
    }

    /**
     * Initializes the AI system and triggers onReady callback.
     * @private
     */
    private async initialize(): Promise<void> {
        try {
            this.isProviderAvailable();
            this.isReady = true;
            this.callbacks.onReady?.({aiActions: this});
        } catch (error) {
            this.handleError(error as Error);
            throw error;
        } finally {
            this.initializationPromise = null;
        }
    }

    /**
     * Validates that a provider is configured.
     * @private
     * @throws Error if no provider is present
     */
    private isProviderAvailable(): void {
        if (!this.config.provider) {
            throw new Error('AI provider is required');
        }
    }

    /**
     * Executes an action with full callback lifecycle support
     * @private
     */
    private async executeActionWithCallbacks<T extends Result>(
        fn: () => Promise<T>
    ): Promise<T> {
        const editor = this.getEditor();
        if (!editor) {
            throw new Error('No active SuperDoc editor available for AI actions');
        }
        try {
            this.callbacks.onStreamingStart?.();
            const result: T = await fn();
            this.callbacks.onStreamingEnd?.({fullResult: result});

            return result;
        } catch (error: Error | any) {
            this.handleError(error as Error);
            throw error;
        }
    }



    /**
     * Gets the default system prompt.
     * @private
     * @returns Default system prompt string
     */
    private getDefaultSystemPrompt(): string {
        return `You are an AI assistant integrated with SuperDoc, a document collaboration platform.
                Your role is to help users find, analyze, and understand document content.
                When searching for content, provide precise locations and relevant context.`;
    }
    
    /**
     * Waits for initialization to complete before allowing operations.
     * Useful when you need to ensure the AI is ready before performing actions.
     *
     * @returns Promise that resolves when initialization is complete
     */
    public async waitUntilReady(): Promise<void> {
        if (this.isReady) {
            return;
        }

        if (this.initializationPromise) {
            await this.initializationPromise;
        }
    }

    /**
     * Checks if the AI is ready to process requests.
     *
     * @returns True if ready, false otherwise
     */
    public getIsReady(): boolean {
        return this.isReady;
    }

    /**
     * Streams AI completion with real-time updates via callbacks.
     * Includes document context automatically.
     *
     * @param prompt - User prompt
     * @param options - Optional completion configuration
     * @returns Promise resolving to complete response
     *
     */
    public async streamCompletion(prompt: string, options?: StreamOptions): Promise<string> {
        if (!this.isReady) {
            throw new Error('AIActions is not ready yet. Call waitUntilReady() first.');
        }

        const context = this.getContextWindow({
            scope: options?.contextScope,
            paddingBlocks: options?.contextPaddingBlocks,
        });
        const userContent = this.buildPromptWithContext(prompt, context);

        const messages = [
            {role: 'system' as const, content: this.config.systemPrompt || ''},
            {role: 'user' as const, content: userContent},
        ];

        let accumulated = '';
        const providerOptions = options ? {...options} : undefined;
        if (providerOptions) {
            delete (providerOptions as Partial<StreamOptions>).contextScope;
            delete (providerOptions as Partial<StreamOptions>).contextPaddingBlocks;
        }

        try {
            this.callbacks.onStreamingStart?.();

            const stream = this.config.provider.streamCompletion(messages, providerOptions);

            for await (const chunk of stream) {
                accumulated += chunk;
                this.callbacks.onStreamingPartialResult?.({partialResult: accumulated});
            }

            this.callbacks.onStreamingEnd?.({fullResult: accumulated});
            return accumulated;
        } catch (error) {
            this.handleError(error as Error);
            throw error;
        }
    }

    /**
     * Gets a complete AI response (non-streaming).
     * Includes document context automatically.
     *
     * @param prompt - User prompt
     * @param options - Optional completion configuration
     * 
     * @returns Promise resolving to complete response
     */
    public async getCompletion(prompt: string, options?: CompletionOptions): Promise<string> {
        if (!this.isReady) {
            throw new Error('AIActions is not ready yet. Call waitUntilReady() first.');
        }

        const context = this.getContextWindow({
            scope: options?.contextScope,
            paddingBlocks: options?.contextPaddingBlocks,
        });
        const userContent = this.buildPromptWithContext(prompt, context);

        const messages = [
            {role: 'system' as const, content: this.config.systemPrompt || ''},
            {role: 'user' as const, content: userContent},
        ];

        const providerOptions = options ? {...options} : undefined;
        if (providerOptions) {
            delete (providerOptions as Partial<CompletionOptions>).contextScope;
            delete (providerOptions as Partial<CompletionOptions>).contextPaddingBlocks;
        }

        try {
            return await this.config.provider.getCompletion(messages, providerOptions);
        } catch (error) {
            this.handleError(error as Error);
            throw error;
        }
    }

    /**
     * Retrieves the current document context for AI processing.
     * Combines XML and plain text representations when available.
     *
     * @returns Document context string
     */
    public getDocumentContext(): string {
        return this.getContextWindow({scope: 'document'}).primaryText;
    }

    /**
     * Returns a scoped context window summarizing the current selection and neighbors.
     */
    public getContextWindow(options?: {scope?: ContextScope; paddingBlocks?: number}): ContextWindow {
        const rawWindow = this.buildContextWindow(options);
        return this.applyContextConstraints(rawWindow);
    }

    private buildContextWindow(options?: {scope?: ContextScope; paddingBlocks?: number}): ContextWindow {
        const editor = this.getEditor();
        const scope = options?.scope;

        if (!editor) {
            return {
                scope: scope ?? 'document',
                primaryText: '',
            };
        }

        const adapter = new EditorAdapter(editor);
        const paddingBlocks = this.resolvePaddingBlocks(options?.paddingBlocks);

        return adapter.getContextWindow(paddingBlocks, scope);
    }

    private resolvePaddingBlocks(padding?: number): number {
        if (typeof padding === 'number' && padding >= 0) {
            return padding;
        }

        return this.contextWindowConfig.paddingBlocks;
    }

    private applyContextConstraints(context: ContextWindow): ContextWindow {
        const clamp = (value?: string): string | undefined => {
            if (!value) {
                return value;
            }

            const limit = this.contextWindowConfig.maxChars;
            if (!limit || value.length <= limit) {
                return value;
            }

            return `${value.slice(0, limit)}...`;
        };

        const selection = context.selection
            ? {
                  ...context.selection,
                  text: clamp(context.selection.text) ?? '',
                  block: context.selection.block
                      ? {
                            ...context.selection.block,
                            text: clamp(context.selection.block.text) ?? '',
                        }
                      : undefined,
                  surroundingBlocks: (context.selection.surroundingBlocks || []).map((block) => ({
                      ...block,
                      text: clamp(block.text) ?? '',
                  })),
              }
            : undefined;

        return {
            ...context,
            primaryText: clamp(context.primaryText) ?? '',
            selection,
        };
    }

    private buildPromptWithContext(prompt: string, context: ContextWindow): string {
        const formattedContext = this.serializeContextWindow(context);
        if (!formattedContext) {
            return prompt;
        }

        return `${prompt}\n\nContext window:\n${formattedContext}`;
    }

    private serializeContextWindow(context: ContextWindow): string {
        if (!context.primaryText?.trim()) {
            return '';
        }

        return formatContextWindow(context);
    }
    
    /**
     * Handles errors by logging and invoking error callback.
     * @private
     * @param error - Error to handle
     */
    private handleError(error: Error): void {
        if (this.config.enableLogging) {
            console.error('[AIActions Error]:', error);
        }

        this.callbacks.onError?.(error);
    }

    /**
     * Gets the active editor from the SuperDoc instance.
     * @returns Editor instance or null
     */
    private getEditor(): Editor | null {
        const superdoc = this.superdoc as unknown as SuperDoc | undefined;
        return superdoc?.activeEditor ?? null;
    }
}
