/**
 * Low-level tool execution helpers
 * Provides direct access to built-in AI Builder tools without planning
 * @module tools/executor
 */

import { AIActionsService } from '../services';
import { createToolRegistry } from './registry';
import type {
    AIBuilderPlanStep,
    AIBuilderToolDefinition,
    AIBuilderToolHandlerResult,
    AIBuilderToolName,
    AIToolActions,
    SafeRecord,
} from './types';
import { createAIProvider, isAIProvider } from '../providers';
import type { AIProviderInput } from '../providers';
import type { AIProvider, Editor } from '../../shared';
import { ERROR_MESSAGES, LOG_PREFIXES } from '../../shared';
import { getErrorMessage } from '../../shared';
import { getDocumentContext as getEditorContext, isEditorReady } from '../editor';

/**
 * Configuration for creating a low-level tool executor
 */
export interface AIToolExecutorConfig {
    editor: Editor;
    provider: AIProviderInput;
    documentContextProvider?: () => string;
    enableLogging?: boolean;
    customTools?: AIBuilderToolDefinition[];
    onStreamingPartialResult?: (partialResult: string) => void;
}

/**
 * Request payload for executing a single tool
 */
export interface ExecuteAIToolPayload {
    tool: AIBuilderToolName;
    instruction?: string;
    args?: SafeRecord;
    stepId?: string;
}

/**
 * Provides direct access to built-in AI Builder tools without the planning pipeline
 */
export class AIToolExecutor {
    private readonly editor: Editor;
    private readonly provider: AIProvider;
    private readonly registry: Map<AIBuilderToolName, AIBuilderToolDefinition>;
    private readonly actions: AIToolActions;
    private readonly enableLogging: boolean;

    constructor(config: AIToolExecutorConfig) {
        if (!config || !isEditorReady(config.editor)) {
            throw new Error(ERROR_MESSAGES.NO_ACTIVE_EDITOR);
        }

        if (!config.provider) {
            throw new Error(ERROR_MESSAGES.NO_PROVIDER);
        }

        this.editor = config.editor;
        this.enableLogging = Boolean(config.enableLogging);
        this.provider = isAIProvider(config.provider)
            ? config.provider
            : createAIProvider(config.provider);

        const documentContextProvider =
            config.documentContextProvider ??
            (() => getEditorContext(this.editor, this.enableLogging));

        const actionsService = new AIActionsService(
            this.provider,
            this.editor,
            documentContextProvider,
            this.enableLogging,
            config.onStreamingPartialResult,
            this.provider.streamResults,
        );

        this.actions = actionsService as unknown as AIToolActions;
        this.registry = createToolRegistry(this.actions, config.customTools);
    }

    /**
     * Returns the registered tool definitions
     */
    getTools(): AIBuilderToolDefinition[] {
        return Array.from(this.registry.values());
    }

    /**
     * Execute a single tool with the provided instruction and args
     * @param payload - Tool execution payload
     */
    async execute(payload: ExecuteAIToolPayload): Promise<AIBuilderToolHandlerResult> {
        const { tool, instruction = '', args, stepId } = payload;
        const definition = this.registry.get(tool);

        if (!definition) {
            return {
                success: false,
                message: ERROR_MESSAGES.TOOL_NOT_FOUND(tool),
                data: null,
            };
        }

        const step: AIBuilderPlanStep = {
            id: stepId ?? tool,
            tool,
            instruction,
            args,
        };

        try {
            return await definition.handler({
                instruction,
                step,
                context: {
                    editor: this.editor,
                    actions: this.actions,
                },
            });
        } catch (error) {
            const detail = getErrorMessage(error);
            if (this.enableLogging) {
                console.error(`${LOG_PREFIXES.SERVICE} Tool execution error`, {
                    tool,
                    detail,
                });
            }
            return {
                success: false,
                message: ERROR_MESSAGES.TOOL_THREW_ERROR(tool, detail),
                data: null,
            };
        }
    }
}

/**
 * Convenience helper to execute a tool without manually instantiating the executor
 * Creates a temporary executor under the hood
 */
export async function executeAITool(
    config: AIToolExecutorConfig,
    payload: ExecuteAIToolPayload,
): Promise<AIBuilderToolHandlerResult> {
    const executor = new AIToolExecutor(config);
    return executor.execute(payload);
}
