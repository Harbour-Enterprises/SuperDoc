import type { Editor } from '../types';

/**
 * Result of executing a tool
 */
export interface ToolResult {
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
export type ToolCategory = 'read' | 'write' | 'navigate' | 'analyze';

/**
 * Core tool interface that all SuperDoc AI tools must implement
 */
export interface SuperDocTool {
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
export interface ToolDefinitionsOptions {
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
export interface ExecuteToolOptions {
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
 * OpenAI-specific tool format (for function calling)
 */
export interface OpenAITool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required?: string[];
      additionalProperties?: boolean;
    };
  };
}

/**
 * Union of all provider-specific tool formats
 */
export type ProviderToolDefinition = AnthropicTool | OpenAITool | GenericToolSchema;
