import type {
    CompletionOptions,
    Editor,
    Result,
    StreamOptions,
    SuperDocAICallbacks,
    SuperDocAIConfig,
    SuperDocAIOptions,
    SuperDocInstance,
    SuperDoc,
} from './types';
import {AIActions} from './ai-actions';
import {createAIProvider, isAIProvider} from './providers';

/**
 * Primary entry point for SuperDoc AI capabilities. Wraps a SuperDoc instance,
 * manages provider lifecycle, and exposes high-level document actions.
 *
 * @template TSuperdoc - Type of the SuperDoc instance being wrapped
 *
 * @example
 * ```typescript
 * // With provider config (recommended)
 * const ai = new SuperDocAI(superdoc, {
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
 * const ai = new SuperDocAI(superdoc, {
 *   user: { display_name: 'Bot' },
 *   provider
 * });
 * ```
 */
export class SuperDocAI {
    private readonly superdoc: SuperDocInstance;
    private readonly config: SuperDocAIConfig;
    private callbacks: SuperDocAICallbacks;
    private isReady = false;
    private initializationPromise: Promise<void> | null = null;
    private readonly actions: AIActions;

    public readonly action = {
        find: async (instruction: string) => {
            return this.executeActionWithCallbacks(() => this.actions.find(instruction));
        },
        findAll: async (instruction: string) => {
            return this.executeActionWithCallbacks(() => this.actions.findAll(instruction));
        },
        highlight: async (instruction: string) => {
            return this.executeActionWithCallbacks(() => this.actions.highlight(instruction));
        },
        replace: async (instruction: string) => {
            return this.executeActionWithCallbacks(() => this.actions.replace(instruction));
        },
        replaceAll: async (instruction: string) => {
            return this.executeActionWithCallbacks(() => this.actions.replaceAll(instruction));
        },
        insertTrackedChange: async (instruction: string) => {
            return this.executeActionWithCallbacks(() => this.actions.insertTrackedChange(instruction));
        },
        insertTrackedChanges: async (instruction: string) => {
            return this.executeActionWithCallbacks(() => this.actions.insertTrackedChanges(instruction));
        },
        insertComment: async (instruction: string) => {
            return this.executeActionWithCallbacks(() => this.actions.insertComment(instruction));
        },

        insertComments: async (instruction: string) => {
            return this.executeActionWithCallbacks(() => this.actions.insertComments(instruction));
        },
        summarize: async (instruction: string) => {
            return this.executeActionWithCallbacks(() => this.actions.summarize(instruction));
        },
        insertContent: async (instruction: string) => {
            return this.executeActionWithCallbacks(() => this.actions.insertContent(instruction));
        },
    };

    /**
     * Creates a new SuperDocAI instance.
     *
     * @param superdoc - SuperDoc instance to wrap
     * @param options - Configuration including provider, user, and callbacks
     * ```
     */
    constructor(superdoc: SuperDocInstance, options: SuperDocAIOptions) {
        this.superdoc = superdoc;

        const {onReady, onStreamingStart, onStreamingPartialResult, onStreamingEnd, onError, provider, ...config} =
            options;
        const aiProvider = isAIProvider(provider) ? provider : createAIProvider(provider);

        this.config = {
            systemPrompt: this.getDefaultSystemPrompt(),
            enableLogging: false,
            ...config,
            provider: aiProvider,
        };

        this.callbacks = {
            onReady,
            onStreamingStart,
            onStreamingPartialResult,
            onStreamingEnd,
            onError,
        };

        const context = this.getDocumentContext();
        
        const editor = this.getEditor();
        if (!editor) {
            throw new Error('SuperDocAI requires an active editor before initialization');
        }

        editor.setOptions({
            user: {
                id: this.config.user.userId,
                name: this.config.user.displayName,
                image: this.config.user.profileUrl,
            },
        });

        this.actions = new AIActions(this.config.provider, editor, context, this.config.enableLogging);

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
            this.callbacks.onReady?.({superdocAIBot: this});
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
            const result: any = await fn();
            this.callbacks.onStreamingEnd?.(result);

            return result;
        } catch (error: Error | any) {
            this.callbacks.onError?.(error);
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
            throw new Error('SuperDocAI is not ready yet. Call waitUntilReady() first.');
        }

        const documentContext = this.getDocumentContext();
        const userContent = documentContext ? `${prompt}\n\nDocument context:\n${documentContext}` : prompt;

        const messages = [
            {role: 'system' as const, content: this.config.systemPrompt || ''},
            {role: 'user' as const, content: userContent},
        ];

        let accumulated = '';

        try {
            this.callbacks.onStreamingStart?.();

            const stream = this.config.provider.streamCompletion(messages, options);

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
            throw new Error('SuperDocAI is not ready yet. Call waitUntilReady() first.');
        }

        const documentContext = this.getDocumentContext();
        const userContent = documentContext ? `${prompt}\n\nDocument context:\n${documentContext}` : prompt;

        const messages = [
            {role: 'system' as const, content: this.config.systemPrompt || ''},
            {role: 'user' as const, content: userContent},
        ];

        try {
            return await this.config.provider.getCompletion(messages, options);
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
        const editor = this.getEditor();
        if (!editor) {
            return '';
        }

        return editor.state?.doc?.textContent?.trim() || '';
    }
    
    /**
     * Handles errors by logging and invoking error callback.
     * @private
     * @param error - Error to handle
     */
    private handleError(error: Error): void {
        if (this.config.enableLogging) {
            console.error('[SuperDocAI Error]:', error);
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

export type {AIActions} from './ai-actions';
