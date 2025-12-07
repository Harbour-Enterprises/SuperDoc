import type { Editor } from '../types';
import type { ToolResult, ExecuteToolOptions } from './types';
import { getTool } from './tools';

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
export async function executeTool(
  toolName: string,
  params: any,
  editor: Editor,
  options?: ExecuteToolOptions,
): Promise<ToolResult> {
  try {
    // Check for cancellation
    if (options?.signal?.aborted) {
      return {
        success: false,
        error: 'Tool execution was cancelled',
        docChanged: false,
      };
    }

    const tool = getTool(toolName);
    if (!tool) {
      return {
        success: false,
        error: `Unknown tool: ${toolName}`,
        docChanged: false,
      };
    }

    if (options?.validate) {
      if (params === undefined || params === null) {
        return {
          success: false,
          error: 'Tool parameters are required',
          docChanged: false,
        };
      }
    }

    const result = await tool.execute(editor, params);
    if (options?.onProgress) {
      options.onProgress(100);
    }

    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during tool execution',
      docChanged: false,
    };
  }
}
