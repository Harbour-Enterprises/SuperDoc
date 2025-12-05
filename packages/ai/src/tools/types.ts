/**
 * Tool system types for AIBuilder
 * @module tools/types
 */

import type { Editor, Result } from '../shared/types';

/**
 * Safe record type for tool arguments
 */
export type SafeRecord = Record<string, unknown>;

/**
 * Built-in tool names available in AIBuilder
 */
export type AIBuilderBuiltinTool =
    | 'findAll'
    | 'highlight'
    | 'replaceAll'
    | 'literalReplace'
    | 'insertTrackedChanges'
    | 'insertComments'
    | 'summarize'
    | 'insertContent'
    | 'respond';

/**
 * Tool name type that allows built-in names plus custom tool names
 */
export type AIBuilderToolName = AIBuilderBuiltinTool | (string & {});

/**
 * Represents a single step in an execution plan
 */
export interface AIBuilderPlanStep {
    id?: string;
    tool: AIBuilderToolName;
    instruction: string;
    args?: SafeRecord;
}

/**
 * Actions interface available to tool handlers
 */
export interface AIToolActions {
    findAll: (instruction: string) => Promise<Result>;
    highlight: (instruction: string, color?: string) => Promise<Result>;
    replaceAll: (instruction: string) => Promise<Result>;
    literalReplace: (
        findText: string,
        replaceText: string,
        options?: {caseSensitive?: boolean; trackChanges?: boolean}
    ) => Promise<Result>;
    insertTrackedChanges: (instruction: string) => Promise<Result>;
    insertComments: (instruction: string) => Promise<Result>;
    summarize: (instruction: string) => Promise<Result>;
    insertContent: (instruction: string, options?: {position?: 'before' | 'after' | 'replace'}) => Promise<Result>;
}

/**
 * Selection range for literalReplace operations
 */
export interface SelectionRange {
    from: number;
    to: number;
    text: string;
}

/**
 * Context provided to tool handlers
 */
export interface AIBuilderToolHandlerContext {
    editor: Editor;
    actions: AIToolActions;
}

/**
 * Payload passed to tool handlers
 */
export interface AIBuilderToolHandlerPayload {
    instruction: string;
    step: AIBuilderPlanStep;
    context: AIBuilderToolHandlerContext;
}

/**
 * Result returned from tool handlers
 */
export interface AIBuilderToolHandlerResult {
    success: boolean;
    message?: string;
    data?: Result | SafeRecord | null;
}

/**
 * Tool definition including metadata and handler
 */
export interface AIBuilderToolDefinition {
    name: AIBuilderToolName;
    description: string;
    handler: (payload: AIBuilderToolHandlerPayload) => Promise<AIBuilderToolHandlerResult> | AIBuilderToolHandlerResult;
}

/**
 * Selection snapshot for preserving selection state
 */
export interface SelectionSnapshot {
    from: number;
    to: number;
    text: string;
}

/**
 * Progress event types for AIBuilder execution
 */
export type AIBuilderProgressEvent =
    | { type: 'planning'; message: string }
    | { type: 'plan_ready'; plan: any }
    | { type: 'tool_start'; tool: string; instruction: string; stepIndex: number; totalSteps: number }
    | { type: 'tool_complete'; tool: string; stepIndex: number; totalSteps: number }
    | { type: 'complete'; success: boolean };

/**
 * Callback function for progress updates
 */
export type AIBuilderProgressCallback = (event: AIBuilderProgressEvent) => void;

