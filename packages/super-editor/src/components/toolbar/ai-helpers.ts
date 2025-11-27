import type { Editor } from '../../core/Editor.js';

/**
 * AI Helpers - Utilities for interacting with Harbour API for document insights
 * Based on documentation at: https://harbour-enterprises.github.io/Harbour-API-Docs/#insights
 *
 * Configuration options:
 * ```
 * const config = {
 *   // ... other config options
 *   modules: {
 *     ai: {
 *       apiKey: 'your-harbour-api-key',
 *       endpoint: 'https://your-custom-endpoint.com/insights'
 *     }
 *   }
 * };
 * ```
 */

// Default API endpoint if none is provided in config
// Default is the SuperDoc gateway (passthrough to Harbour API)
const DEFAULT_API_ENDPOINT = 'https://sd-dev-express-gateway-i6xtm.ondigitalocean.app/insights';
const SYSTEM_PROMPT =
  'You are an expert copywriter and you are immersed in a document editor. You are to provide document related text responses based on the user prompts. Only write what is asked for. Do not provide explanations. Try to keep placeholders as short as possible. Do not output your prompt. Your instructions are: ';

interface APIConfig {
  apiKey?: string;
  endpoint?: string;
}

interface InsightPayload {
  stream: boolean;
  context: string;
  doc_text?: string;
  document_content?: string;
  insights: Array<{
    type: string;
    name: string;
    message: string;
    format?: Array<{ value: string }>;
  }>;
}

/**
 * UTILITY - Makes a fetch request to the Harbour API
 * @param {InsightPayload} payload - The request payload
 * @param {APIConfig} options - Configuration options
 * @returns {Promise<Response>} - The API response
 */
async function baseInsightsFetch(payload: InsightPayload, options: APIConfig = {}): Promise<Response> {
  const apiKey = options.apiKey;

  // Use the provided endpoint from config, or fall back to the default
  const apiEndpoint = options.endpoint || DEFAULT_API_ENDPOINT;

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Only add the API key header if one is provided
    if (apiKey) {
      headers['x-api-key'] = apiKey;
    }

    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Harbour API error: ${response.status} - ${errorText}`);
    }

    return response;
  } catch (error) {
    console.error('Error calling Harbour API:', error);
    throw error;
  }
}

type ChunkCallback = (chunk: string) => void;
type DoneCallback = () => void;

/**
 * UTILITY - Extracts content from a streaming response
 * @param {ReadableStream} stream - The stream to process
 * @param {ChunkCallback} onChunk - Callback for each text chunk
 * @param {DoneCallback} onDone - Callback when streaming is done
 * @returns {Promise<string>} - The complete generated text
 */
async function processStream(
  stream: ReadableStream<Uint8Array>,
  onChunk: ChunkCallback,
  onDone?: DoneCallback,
): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let result = '';
  const buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        if (typeof onDone === 'function') {
          onDone();
        }
        break;
      }

      // Decode the chunk
      const chunk = decoder.decode(value, { stream: true });

      if (typeof onChunk === 'function') {
        onChunk(chunk);
      }
    }

    // Final attempt to extract content from buffer
    const extractedValue = getJsonBetweenFencesFromResponse(buffer);
    if (extractedValue !== null) {
      result = extractedValue;
    }

    return result || '';
  } catch (error) {
    console.error('Error reading stream:', error);
    throw error;
  } finally {
    reader.releaseLock();
  }
}

/**
 * Helper function to extract content from buffer with markdown code fences
 * @param {string} buffer - The text buffer to parse
 * @returns {string|null} - The extracted content or null if not found
 */
function getJsonBetweenFencesFromResponse(buffer: string): string | null {
  try {
    // Try to extract content between ```json and ```
    const jsonRegex = /```json\s*\n([\s\S]*?)\n\s*```/;
    const match = buffer.match(jsonRegex);

    if (match && match[1]) {
      const jsonObj = JSON.parse(match[1]);

      // Extract value from custom_prompt.value
      if (jsonObj.custom_prompt && jsonObj.custom_prompt.value !== undefined) {
        return jsonObj.custom_prompt.value || '';
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * UTILITY - Extracts content from a non-streaming response
 * @param {Response} response - The API response
 * @returns {Promise<string>} - The extracted content
 */
async function returnNonStreamingJson(response: Response): Promise<string> {
  const jsonResponse = await response.json();
  if (jsonResponse.custom_prompt) {
    return jsonResponse.custom_prompt[0].value;
  } else {
    throw new Error('No custom prompt found in response');
  }
}

interface WriteOptions {
  context?: string;
  documentXml?: string;
  url?: string;
  config?: APIConfig;
}

/**
 * Generate text based on a prompt with streaming
 * @param {string} prompt - User prompt
 * @param {WriteOptions} options - Additional options
 * @param {ChunkCallback} onChunk - Callback for each text chunk
 * @param {DoneCallback} onDone - Callback when done
 * @returns {Promise<string>} - The complete generated text
 */
export async function writeStreaming(
  prompt: string,
  options: WriteOptions = {},
  onChunk: ChunkCallback,
  onDone?: DoneCallback,
): Promise<string> {
  if (!prompt) {
    throw new Error('Prompt is required for text generation');
  }

  const payload: InsightPayload = {
    stream: true,
    context: SYSTEM_PROMPT,
    doc_text: '',
    insights: [
      {
        type: 'custom_prompt',
        name: 'text_generation',
        message: `Generate text based on the following prompt: ${prompt}`,
      },
    ],
  };

  // Add document content if available
  if (options.documentXml) {
    payload.document_content = options.documentXml;
  }

  const response = await baseInsightsFetch(payload, options.config || {});

  if (!response.body) return '';
  return await processStream(response.body, onChunk, onDone);
}

/**
 * Generate text based on a prompt (non-streaming)
 * @param {string} prompt - User prompt
 * @param {WriteOptions} options - Additional options
 * @returns {Promise<string>} - The generated text
 */
export async function write(prompt: string, options: WriteOptions = {}): Promise<string> {
  if (!prompt) {
    throw new Error('Prompt is required for text generation');
  }

  const payload: InsightPayload = {
    stream: false,
    context: SYSTEM_PROMPT,
    insights: [
      {
        type: 'custom_prompt',
        name: 'text_generation',
        message: `Generate text based on the following prompt: ${prompt}`,
        format: [{ value: '' }],
      },
    ],
  };

  const response = await baseInsightsFetch(payload, options.config || {});
  return returnNonStreamingJson(response);
}

/**
 * Rewrite text based on a prompt with streaming
 * @param {string} text - Text to rewrite
 * @param {string} prompt - User instructions for rewriting
 * @param {WriteOptions} options - Additional options
 * @param {ChunkCallback} onChunk - Callback for each text chunk
 * @param {DoneCallback} onDone - Callback when done
 * @returns {Promise<string>} - The complete rewritten text
 */
export async function rewriteStreaming(
  text: string,
  prompt: string = '',
  options: WriteOptions = {},
  onChunk: ChunkCallback,
  onDone?: DoneCallback,
): Promise<string> {
  if (!text) {
    throw new Error('Text is required for rewriting');
  }

  const message = prompt
    ? `Rewrite the following text: "${text}" using these instructions: ${prompt}`
    : `Rewrite the following text: "${text}"`;

  const payload: InsightPayload = {
    stream: true,
    context: SYSTEM_PROMPT,
    insights: [
      {
        type: 'custom_prompt',
        name: 'text_rewrite',
        message,
      },
    ],
  };

  const response = await baseInsightsFetch(payload, options.config || {});

  if (!response.body) return '';

  return await processStream(response.body, onChunk, onDone);
}

/**
 * Rewrite text based on a prompt (non-streaming)
 * @param {string} text - Text to rewrite
 * @param {string} prompt - User instructions for rewriting
 * @param {WriteOptions} options - Additional options
 * @returns {Promise<string>} - The rewritten text
 */
export async function rewrite(text: string, prompt: string = '', options: WriteOptions = {}): Promise<string> {
  if (!text) {
    throw new Error('Text is required for rewriting');
  }

  const message = prompt
    ? `Rewrite the following text: "${text}" using these instructions: ${prompt}`
    : `Rewrite the following text: "${text}"`;

  const payload: InsightPayload = {
    stream: false,
    context: SYSTEM_PROMPT,
    insights: [
      {
        type: 'custom_prompt',
        name: 'text_rewrite',
        message,
        format: [{ value: '' }],
      },
    ],
  };

  const response = await baseInsightsFetch(payload, options.config || {});
  return returnNonStreamingJson(response);
}

interface FormatRule {
  name: string;
  pattern: RegExp;
  transform: (
    match: string,
    content: string,
    editor: Editor,
  ) => {
    type: string;
    marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
    text: string;
  };
}

/**
 * Format registry to manage text formatting rules
 * Each rule has a name, pattern, and transform function
 * Extend this for more rules (e.g. italic, underline, etc.)
 */
const formatRegistry: { rules: FormatRule[] } = {
  rules: [
    {
      name: 'bold',
      pattern: /\*\*(.*?)\*\*/g,
      transform: (_match, content) => ({
        type: 'text',
        marks: [{ type: 'bold' }],
        text: content,
      }),
    },
    {
      name: 'italic',
      pattern: /\*(.*?)\*/g,
      transform: (_match, content) => ({
        type: 'text',
        marks: [{ type: 'italic' }],
        text: content,
      }),
    },
    {
      name: 'underline',
      pattern: /<(?:u|ins)>(.*?)<\/(?:u|ins)>/g,
      transform: (_match, content) => ({
        type: 'text',
        marks: [{ type: 'underline' }],
        text: content,
      }),
    },
  ],
};

/**
 * Converts markdown-style formatting in the document text to ProseMirror's native formatting.
 * Uses a node-aware approach that safely handles formatting across node boundaries.
 *
 * This function processes the entire document content and applies formatting rules defined in formatRegistry.
 * It handles cases where formatting markers (like **bold**) span across multiple text nodes by tracking
 * node positions and boundaries. The function works from the end of the document to the start to avoid
 * position shifts when making replacements.
 *
 * @param {Editor} editor - The ProseMirror editor instance containing the document state and view
 */
export function formatDocument(editor: Editor): void {
  try {
    let doc = editor.state.doc;
    const docText = doc.textContent || '';
    if (!docText) return;

    // Process each formatting rule
    // Registry is defined above
    formatRegistry.rules.forEach((rule) => {
      rule.pattern.lastIndex = 0;
      const matches: Array<{
        rule: FormatRule;
        startPos: number;
        endPos: number;
        originalText: string;
        contentText: string;
      }> = [];
      let match;

      while ((match = rule.pattern.exec(docText)) !== null) {
        matches.push({
          rule,
          startPos: match.index,
          endPos: match.index + match[0].length,
          originalText: match[0],
          contentText: match[1],
        });
      }

      // We may have 0, 1, or more matches for a single rule in a chunk of text
      // Need to handle each match individually but preserve positions of the matches
      // Process matches from end to start to avoid position shifts
      matches.sort((a, b) => b.startPos - a.startPos);

      for (const match of matches) {
        const { startPos, endPos, originalText, contentText } = match;

        try {
          // Create transaction
          let tr = editor.state.tr;
          const replacement = rule.transform(originalText, contentText, editor);

          // Gather nodes needed to replace the match
          const nodesInRange: Array<{ node: import('prosemirror-model').Node; pos: number }> = [];
          doc.nodesBetween(startPos, Math.min(endPos, doc.content.size), (node, pos) => {
            if (node.isText) {
              nodesInRange.push({ node, pos });
            }
            return true;
          });

          if (nodesInRange.length > 0) {
            // Try first to find match in a single node
            // This is best case scenario and would skip the need to reconstruct across nodes
            let foundExactMatch = false;
            let actualStartPos = -1;
            let actualEndPos = -1;

            for (let i = 0; i < nodesInRange.length; i++) {
              const nodeInfo = nodesInRange[i];
              const nodeText = nodeInfo.node.text || '';
              const nodePos = nodeInfo.pos;

              // Check if this node contains the entire pattern
              if (nodeText.includes(originalText)) {
                const nodeMatchIndex = nodeText.indexOf(originalText);
                actualStartPos = nodePos + nodeMatchIndex;
                actualEndPos = actualStartPos + originalText.length;

                foundExactMatch = true;
                break;
              }
            }

            // If we couldn't find the pattern in a single node, try reconstructing across nodes
            if (!foundExactMatch) {
              // Build text spanning multiple nodes
              let combinedText = '';
              const offsets: number[] = [];
              // Start of first node
              // This acts as an anchor point for the relative position of characters in other nodes
              const basePos = nodesInRange[0].pos;

              // Build a mapping between combined text positions and actual document positions
              for (const nodeInfo of nodesInRange) {
                const nodeText = nodeInfo.node.text || '';
                const relativePos = nodeInfo.pos - basePos;

                // For each character in the node, record its position
                for (let i = 0; i < nodeText.length; i++) {
                  offsets.push(relativePos + i);
                }

                combinedText += nodeText;
              }

              const matchIndex = combinedText.indexOf(originalText);
              if (matchIndex >= 0) {
                // Use our offset map to find the actual position in the document
                actualStartPos = basePos + offsets[matchIndex];
                // The end position might be beyond the last recorded offset if it falls at a node boundary
                const endIndex = matchIndex + originalText.length - 1;
                actualEndPos = basePos + (offsets[endIndex] || 0) + 1;

                foundExactMatch = true;
              }
            }

            if (foundExactMatch) {
              const marks = replacement.marks
                ? replacement.marks.map((mark) => editor.schema.marks[mark.type].create(mark.attrs))
                : [];

              // PM transactions
              tr = tr.delete(actualStartPos, actualEndPos);
              tr = tr.insert(actualStartPos, editor.schema.text(replacement.text, marks));

              if (tr.docChanged) {
                editor.view.dispatch(tr);

                // After making this change, we need to recalculate positions
                // Get updated doc reference
                doc = editor.state.doc;
              }
            }
          }
        } catch (error) {
          console.error('Error processing match:', error);
        }
      }
    });
  } catch (error) {
    console.error('Error formatting document:', error);
  }
}
