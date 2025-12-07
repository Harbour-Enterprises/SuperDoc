import { logPackageVersion } from './shared/logger';

logPackageVersion();

// AI Actions exports (high-level operations)
export { AIActions } from './ai-actions';
export { AIPlanner } from './ai-actions/planner';
export type { AIPlannerConfig, AIPlannerExecutionResult, AIPlan } from './ai-actions/planner';

// Backward compatibility (deprecated)
export { AIPlanner as AIBuilder } from './ai-actions/planner';
export type {
    AIPlannerConfig as AIBuilderConfig,
    AIPlannerExecutionResult as AIBuilderExecutionResult,
    AIPlan as AIBuilderPlan
} from './ai-actions/planner';

// Service exports
export { AIActionsService } from './ai-actions/services';

// Editor exports
export { EditorAdapter } from './ai-actions/editor';

// Provider exports
export { createAIProvider } from './ai-actions/providers';

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
    AIToolExecutor,
    executeAITool,
} from './ai-actions/tools';

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
} from './ai-actions/tools/types';

// Provider type exports
export type {
    AIProviderInput,
    AnthropicProviderConfig,
    FetchLike,
    HttpProviderConfig,
    OpenAIProviderConfig,
    ProviderRequestContext,
} from './ai-actions/providers/types';

// AI Builder primitives (tools, executor, providers, helpers)
export * from './ai-builder';
