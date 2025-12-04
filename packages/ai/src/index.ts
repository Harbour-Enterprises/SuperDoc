import { logPackageVersion } from './shared/logger';

logPackageVersion();

// Core exports
export { AIActions, AIBuilder } from './core';
export type { AIBuilderConfig, AIBuilderExecutionResult, AIBuilderPlan } from './core';

// Service exports
export { AIActionsService } from './services';

// Editor exports
export { EditorAdapter } from './editor';

// Provider exports
export { createAIProvider } from './providers';

// Shared exports
export * from './shared/types';
export * from './shared/utils';
export * from './shared/constants';
export type {
    AIToolActions,
    SafeRecord,
    SelectionRange,
    SelectionSnapshot,
    PlannerContextSnapshot,
    BuilderPlanResult,
} from './shared/ai-builder-types';

// Tool exports
export {
    createToolRegistry,
    getToolDescriptions,
    isValidTool,
} from './tools';

export type {
    AIBuilderPlanStep,
    AIBuilderToolDefinition,
    AIBuilderToolHandlerContext,
    AIBuilderToolHandlerPayload,
    AIBuilderToolHandlerResult,
    AIBuilderProgressEvent,
    AIBuilderProgressCallback,
    AIBuilderBuiltinTool,
    AIBuilderToolName,
    AIBuilderBuiltinTool as ToolBuiltinName,
    AIBuilderToolName as ToolName,
} from './tools/types';

// Provider type exports
export type {
    AIProviderInput,
    AnthropicProviderConfig,
    FetchLike,
    HttpProviderConfig,
    OpenAIProviderConfig,
    ProviderRequestContext,
} from './providers/types';
