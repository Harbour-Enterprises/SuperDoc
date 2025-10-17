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

import { InsightsAIProvider } from '@harbour-enterprises/superdoc-ai-controller';

let defaultProviderInstance = null;

const hasConfigOverrides = (config = {}) => {
  const { apiKey, api_key: apiKeyLegacy, endpoint, baseUrl, model } = config;
  return Boolean(apiKey || apiKeyLegacy || endpoint || baseUrl || model);
};

const resolveProvider = (options = {}) => {
  if (options.provider) return options.provider;

  const config = options.config || {};
  if (config.provider) return config.provider;

  if (!hasConfigOverrides(config)) {
    if (!defaultProviderInstance) {
      defaultProviderInstance = new InsightsAIProvider();
    }
    return defaultProviderInstance;
  }

  return new InsightsAIProvider(config);
};

const extractProviderOptions = (options = {}) => {
  const { ...providerOptions } = options || {};
  return providerOptions;
};

/**
 * Generate text based on a prompt with streaming
 * @param {string} prompt - User prompt
 * @param {Object} options - Additional options {context, documentXml, url, config }
 * @param {function} onChunk - Callback for each text chunk
 * @param {function} onDone - Callback when request is done
 * @returns {Promise<string>} - The complete generated text
 */
export async function writeStreaming(prompt, options = {}, onChunk, onDone) {
  if (!prompt) {
    throw new Error('Prompt is required for text generation');
  }

  const provider = resolveProvider(options);
  const providerOptions = extractProviderOptions(options);
  const result = await provider.writeStreaming(prompt, providerOptions, onChunk, onDone);
  return result ?? '';
}

/**
 * Generate text based on a prompt (non-streaming)
 * @param {string} prompt - User prompt
 * @param {Object} options - Additional options
 * @returns {Promise<string>} - The generated text
 */
export async function write(prompt, options = {}) {
  if (!prompt) {
    throw new Error('Prompt is required for text generation');
  }

  const provider = resolveProvider(options);
  const providerOptions = extractProviderOptions(options);
  return provider.write(prompt, providerOptions);
}

/**
 * Rewrite text based on a prompt with streaming
 * @param {string} text - Text to rewrite
 * @param {string} prompt - User instructions for rewriting
 * @param {Object} options - Additional options
 * @param {function} onChunk - Callback for each text chunk
 * @param {function} onDone - Callback when request is done
 * @returns {Promise<string>} - The complete rewritten text
 */
export async function rewriteStreaming(text, prompt = '', options = {}, onChunk, onDone) {
  if (!text) {
    throw new Error('Text is required for rewriting');
  }

  const provider = resolveProvider(options);
  const providerOptions = extractProviderOptions(options);
  const result = await provider.rewriteStreaming(text, prompt, providerOptions, onChunk, onDone);
  return result ?? '';
}

/**
 * Rewrite text based on a prompt (non-streaming)
 * @param {string} text - Text to rewrite
 * @param {string} prompt - User instructions for rewriting
 * @param {Object} options - Additional options
 * @returns {Promise<string>} - The rewritten text
 */
export async function rewrite(text, prompt = '', options = {}) {
  if (!text) {
    throw new Error('Text is required for rewriting');
  }

  const provider = resolveProvider(options);
  const providerOptions = extractProviderOptions(options);
  return provider.rewrite(text, prompt, providerOptions);
}

/**
 * Format registry to manage text formatting rules
 * Each rule has a name, pattern, and transform function
 * Extend this for more rules (e.g. italic, underline, etc.)
 */
const formatRegistry = {
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
 * @param {Object} editor - The ProseMirror editor instance containing the document state and view
 */
export function formatDocument(editor) {
  try {
    let doc = editor.state.doc;
    const docText = doc.textContent || '';
    if (!docText) return;

    // Process each formatting rule
    // Registry is defined above
    formatRegistry.rules.forEach((rule) => {
      rule.pattern.lastIndex = 0;
      const matches = [];
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
          const replacement = rule.transform(originalText, contentText);

          // Gather nodes needed to replace the match
          const nodesInRange = [];
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
              let offsets = [];
              // Start of first node
              // This acts as an anchor point for the relative position of characters in other nodes
              let basePos = nodesInRange[0].pos;

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
