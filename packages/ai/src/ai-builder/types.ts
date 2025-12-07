import type { Editor } from '../types';

/**
 * Result of executing a tool
 */
export interface ToolResult {
    success: boolean;
    data?: any;
    error?: string;
    docChanged: boolean;
    message?: string;
}

/**
 * Category of tool operation
 */
export type ToolCategory = 'read' | 'write' | 'navigate' | 'analyze';

/**
 * Core tool interface that all SuperDoc AI tools must implement
 */
export interface SuperDocTool {
    name: string;
    description: string;
    category: ToolCategory;
    execute: (editor: Editor, params: any) => Promise<ToolResult>;
}

/**
 * Options for filtering which tools and features to include
 */
export interface ToolDefinitionsOptions {
    enabledTools?: string[];
    excludedNodes?: string[];
    excludedMarks?: string[];
    excludedAttrs?: string[];
    strict?: boolean;
}

/**
 * Options for tool execution
 */
export interface ExecuteToolOptions {
    validate?: boolean;
    onProgress?: (progress: number) => void;
    signal?: AbortSignal;
}

/**
 * Generic tool schema format (provider-agnostic)
 */
export interface GenericToolSchema {
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
export interface AnthropicTool {
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
export type ProviderToolDefinition = AnthropicTool | GenericToolSchema;
