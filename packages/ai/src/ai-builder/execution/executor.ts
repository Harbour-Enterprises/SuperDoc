import type { Editor } from '../../shared';
import type { ToolResult, ExecuteToolOptions } from '../types';
import { getTool } from '../tools';
import { checkEditorReadiness } from '../utils';
import { validateContent, autoFixContent, formatValidationErrors } from '../schema';

/**
 * Execute a tool by name with given parameters.
 * This is the primary way to run AI-generated tool calls.
 *
 * Now includes:
 * - Editor readiness checks
 * - Content validation
 * - Auto-fix attempts
 * - Detailed diagnostics
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
 * }, editor, {
 *   validate: true,  // Enable validation
 *   onProgress: (p) => console.log(`Progress: ${p}%`)
 * });
 *
 * if (result.success) {
 *   console.log('Content inserted successfully');
 * } else {
 *   console.error('Error:', result.error);
 * }
 * ```
 */
export async function executeTool(
    toolName: string,
    params: any,
    editor: Editor,
    options?: ExecuteToolOptions
): Promise<ToolResult> {
    try {
        if (options?.signal?.aborted) {
            return {
                success: false,
                error: 'Tool execution was cancelled',
                docChanged: false
            };
        }

        const readiness = checkEditorReadiness(editor);
        if (!readiness.ready) {
            return {
                success: false,
                error: `Editor not ready: ${readiness.reasons.join(', ')}`,
                docChanged: false
            };
        }

        if (readiness.warnings.length > 0) {
            console.warn('[executeTool] Editor warnings:', readiness.warnings.join(', '));
        }

        const tool = getTool(toolName);
        if (!tool) {
            return {
                success: false,
                error: `Unknown tool: ${toolName}`,
                docChanged: false
            };
        }

        // Validate params if requested
        if (options?.validate) {
            if (params === undefined || params === null) {
                return {
                    success: false,
                    error: 'Tool parameters are required',
                    docChanged: false
                };
            }

            if (
                (toolName === 'insertContent' || toolName === 'replaceContent') &&
                params.content
            ) {
                const validationResult = validateContent(params.content, editor);

                if (!validationResult.valid) {
                    const fixed = autoFixContent(params.content, validationResult, editor);

                    if (fixed) {
                        console.warn(
                            '[executeTool] Content had validation errors but was auto-fixed'
                        );
                        params.content = fixed;
                    } else {
                        return {
                            success: false,
                            error: `Content validation failed:\n${formatValidationErrors(validationResult)}`,
                            docChanged: false
                        };
                    }
                }

                if (validationResult.warnings.length > 0) {
                    console.warn(
                        '[executeTool] Validation warnings:',
                        validationResult.warnings.map((w) => `${w.path}: ${w.message}`).join(', ')
                    );
                }
            }
        }

        if (options?.onProgress) {
            options.onProgress(0);
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
            docChanged: false
        };
    }
}

