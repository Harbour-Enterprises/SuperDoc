import type { Editor } from '../../shared';
import type { ToolResult } from '../types';
import { executeTool } from './executor';

/**
 * Represents a tool call parsed from AI text response
 */
export interface ParsedToolCall {
    tool: string;
    params: any;
}

/**
 * Result of parsing an AI text response
 */
export interface ParseResult {
    toolCalls: ParsedToolCall[];
    error?: string;
    rawText: string;
}

/**
 * System prompt for text-based providers that don't support structured tool calling.
 * Instructs the AI to respond with JSON tool calls in a specific format.
 */
export const TEXT_BASED_SYSTEM_PROMPT = `You are a document editor assistant for SuperDoc.
    When the user requests document changes, respond with JSON tool calls wrapped in a code block.
    
    Available tools:
    1. **searchDocument** - Search for text or patterns in the document
       - query: string (required)
       - caseSensitive: boolean (optional, default: false)
       - regex: boolean (optional, default: false)
       - findAll: boolean (optional, default: true)
    
    2. **insertContent** - Insert new content into the document
       - position: "selection" | "documentStart" | "documentEnd" (required)
       - content: array of paragraph nodes (required)
    
    3. **replaceContent** - Replace content in a specific range
       - from: number (required) - start position
       - to: number (required) - end position
       - content: array of paragraph nodes (required)
    
    Content format (ProseMirror JSON):
    - Each content item is a paragraph node
    - Paragraph structure: { "type": "paragraph", "content": [...], "attrs": {...} }
    - Text node: { "type": "text", "text": "..." }
    - For headings, use attrs.styleId: "Heading1", "Heading2", etc.
    - For lists, use attrs.numberingProperties: { "numId": 1, "ilvl": 0 }
    - Marks for formatting: { "type": "text", "text": "...", "marks": [{ "type": "bold" }] }
    
    Response format (always use this exact structure):
    
    \`\`\`json
    [
      {
        "tool": "toolName",
        "params": {
          "param1": "value1",
          "param2": "value2"
        }
      }
    ]
    \`\`\`
    
    Examples:
    
    User: "add a header that says hello"
    Assistant:
    \`\`\`json
    [
      {
        "tool": "insertContent",
        "params": {
          "position": "selection",
          "content": [
            {
              "type": "paragraph",
              "attrs": { "styleId": "Heading1" },
              "content": [{ "type": "text", "text": "hello" }]
            }
          ]
        }
      }
    ]
    \`\`\`
    
    User: "find all occurrences of 'privacy' and replace with 'confidentiality'"
    Assistant:
    \`\`\`json
    [
      {
        "tool": "searchDocument",
        "params": {
          "query": "privacy",
          "findAll": true
        }
      }
    ]
    \`\`\`
    
    Note: After search, I would need the positions to call replaceContent. For multi-step operations, return only the first step.
    
    Always respond with valid JSON in a code block. Never include explanations outside the code block.`;

/**
 * Parse AI text response to extract tool calls.
 * Looks for JSON code blocks containing tool call definitions.
 *
 * @param aiResponse - The text response from the AI provider
 * @returns ParseResult containing extracted tool calls or error
 *
 * @example
 * ```typescript
 * const response = await provider.getCompletion([
 *   { role: 'system', content: TEXT_BASED_SYSTEM_PROMPT },
 *   { role: 'user', content: 'add a header that says hello' }
 * ]);
 *
 * const parsed = parseTextResponse(response);
 * if (parsed.error) {
 *   console.error('Parse error:', parsed.error);
 * } else {
 *   console.log('Found tool calls:', parsed.toolCalls);
 * }
 * ```
 */
export function parseTextResponse(aiResponse: string): ParseResult {
    const jsonBlockMatch = aiResponse.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);

    if (!jsonBlockMatch) {
        const jsonMatch = aiResponse.match(/(\[[\s\S]*?\])/);
        if (!jsonMatch) {
            return {
                toolCalls: [],
                error: 'No JSON tool calls found in response. Expected format: ```json\n[...]\n```',
                rawText: aiResponse,
            };
        }

        try {
            const toolCalls = JSON.parse(jsonMatch[1]);
            if (!Array.isArray(toolCalls)) {
                return {
                    toolCalls: [],
                    error: 'Tool calls must be an array',
                    rawText: aiResponse,
                };
            }
            return { toolCalls, rawText: aiResponse };
        } catch (error) {
            return {
                toolCalls: [],
                error: `Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`,
                rawText: aiResponse,
            };
        }
    }

    try {
        const toolCalls = JSON.parse(jsonBlockMatch[1]);
        if (!Array.isArray(toolCalls)) {
            return {
                toolCalls: [],
                error: 'Tool calls must be an array',
                rawText: aiResponse,
            };
        }
        for (let i = 0; i < toolCalls.length; i++) {
            const call = toolCalls[i];
            if (!call.tool || typeof call.tool !== 'string') {
                return {
                    toolCalls: [],
                    error: `Tool call at index ${i} missing 'tool' field`,
                    rawText: aiResponse,
                };
            }
            if (!call.params || typeof call.params !== 'object') {
                return {
                    toolCalls: [],
                    error: `Tool call at index ${i} missing 'params' field`,
                    rawText: aiResponse,
                };
            }
        }

        return {
            toolCalls,
            rawText: aiResponse,
        };
    } catch (error) {
        return {
            toolCalls: [],
            error: `Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`,
            rawText: aiResponse,
        };
    }
}

/**
 * Parse and execute tool calls from AI text response.
 * Combines parsing and execution in one step for convenience.
 *
 * @param aiResponse - The text response from the AI provider
 * @param editor - SuperDoc editor instance
 * @returns Array of tool execution results
 * @throws Error if parsing fails or no tool calls found
 *
 * @example
 * ```typescript
 * import { parseAndExecute, TEXT_BASED_SYSTEM_PROMPT } from '@superdoc-dev/ai/ai-builder';
 *
 * const response = await provider.getCompletion([
 *   { role: 'system', content: TEXT_BASED_SYSTEM_PROMPT },
 *   { role: 'user', content: 'add a header that says hello' }
 * ]);
 *
 * const results = await parseAndExecute(response, editor);
 * results.forEach(result => {
 *   console.log(`Tool executed: ${result.success ? 'Success' : 'Failed'}`);
 * });
 * ```
 */
export async function parseAndExecute(
    aiResponse: string,
    editor: Editor
): Promise<ToolResult[]> {
    const parsed = parseTextResponse(aiResponse);

    if (parsed.error) {
        throw new Error(`Failed to parse AI response: ${parsed.error}`);
    }

    if (parsed.toolCalls.length === 0) {
        throw new Error('No tool calls found in AI response');
    }

    const results: ToolResult[] = [];

    for (const call of parsed.toolCalls) {
        const result = await executeTool(call.tool, call.params, editor);
        results.push(result);
    }

    return results;
}

/**
 * Build context string for the AI about the current document state.
 * Useful for providing document context to text-based providers.
 *
 * @param editor - SuperDoc editor instance
 * @returns Context string describing current document state
 *
 * @example
 * ```typescript
 * const context = buildDocumentContext(editor);
 * const response = await provider.getCompletion([
 *   { role: 'system', content: TEXT_BASED_SYSTEM_PROMPT },
 *   { role: 'user', content: `${context}\n\nUser request: add a header` }
 * ]);
 * ```
 */
export function buildDocumentContext(editor: Editor): string {
    const { state } = editor;
    if (!state) {
        return 'Document context unavailable.';
    }

    const { doc, selection } = state;
    const docSize = doc.content.size;
    const selectionFrom = selection.from;
    const selectionTo = selection.to;

    let context = `Current document state:
    - Document size: ${docSize} characters
    - Cursor position: ${selectionFrom}`;

    if (selectionFrom !== selectionTo) {
        context += `\n- Selection: ${selectionFrom} to ${selectionTo} (${selectionTo - selectionFrom} characters)`;
    }

    return context;
}