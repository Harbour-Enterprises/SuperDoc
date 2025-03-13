/**
 * AI Helpers - Utilities for interacting with Harbour API for document insights
 * Based on documentation at: https://harbour-enterprises.github.io/Harbour-API-Docs/#insights
 * 
 * Endpoint Selection Logic:
 * - If an API key is provided, the standard Harbour API endpoint is used
 * - If no API key is provided, requests are routed through the SuperDoc gateway
 * 
 * The API key can be configured when instantiating SuperDoc:
 * ```
 * const config = {
 *   // ... other config options
 *   modules: {
 *     ai: {
 *       apiKey: 'your-harbour-api-key'
 *     }
 *   }
 * };
 * ```
 */

// API endpoint for Harbour Insights

// @todo: Figure out logic for self hosted vs Harbour hosted and which endpoint
// should be used based on that
const API_ENDPOINT = 'https://api.myharbourshare.com/v2/insights';
const GATEWAY_ENDPOINT = 'https://superdoc-dev-gateway-88eonph9.uc.gateway.dev/insights';

/**
 * UTILITY - Makes a fetch request to the Harbour API
 * @param {Object} payload - The request payload
 * @param {Object} options - Configuration options
 * @param {string} options.apiKey - API key for authentication
 * @param {string} options.apiEndpoint - Custom API endpoint (optional)
 * @returns {Promise<Response>} - The API response
 */
async function baseInsightsFetch(payload, options = {}) {
  const apiKey = options.apiKey;
  
  // If an apiKey is provided, use the standard endpoint, otherwise use the gateway
  const apiEndpoint =apiKey ? API_ENDPOINT : GATEWAY_ENDPOINT

  try {
    const headers = {
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

/**
 * UTILITY - Extracts content from a streaming response
 * @param {ReadableStream} stream - The stream to process
 * @param {function} onChunk - Callback for each text chunk
 * @returns {Promise<string>} - The complete generated text
 */
async function processStream(stream, onChunk) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let result = '';
  let jsonBuffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        break;
      }

      // Decode the chunk
      const chunk = decoder.decode(value, { stream: true });
      jsonBuffer += chunk;
      
      // Try to parse as JSON and extract content
      try {
        const jsonResponse = JSON.parse(jsonBuffer);
        
        // Extract content based on response structure
        let extractedContent = '';
        
        if (jsonResponse.custom_prompt && Array.isArray(jsonResponse.custom_prompt) && jsonResponse.custom_prompt.length > 0) {
          const promptData = jsonResponse.custom_prompt[0];
          
          if (promptData.content) {
            extractedContent = promptData.content;
          } else if (promptData.title) {
            extractedContent = promptData.title;
          } else if (promptData.text) {
            extractedContent = promptData.text;
          }
        }
        
        if (extractedContent) {
          result = extractedContent;
          if (typeof onChunk === 'function') {
            onChunk(result);
          }
          
          jsonBuffer = '';
        }
      } catch (e) {
        // Not valid JSON yet, might be a partial chunk
        if (jsonBuffer.length > 10000) {
          result = jsonBuffer;
          if (typeof onChunk === 'function') {
            onChunk(result);
          }
          jsonBuffer = '';
        }
      }
    }
    
    // Final attempt to extract content from any remaining buffer
    if (jsonBuffer) {
      try {
        const jsonResponse = JSON.parse(jsonBuffer);
        
        if (jsonResponse.custom_prompt && Array.isArray(jsonResponse.custom_prompt) && jsonResponse.custom_prompt.length > 0) {
          const promptData = jsonResponse.custom_prompt[0];
          
          if (promptData.content) {
            result = promptData.content;
          } else if (promptData.title) {
            result = promptData.title;
          } else if (promptData.text) {
            result = promptData.text;
          }
        }
      } catch (e) {
        if (!result && jsonBuffer) {
          result = jsonBuffer;
        }
      }
    }
    
    return result;
  } catch (error) {
    console.error('Error processing stream:', error);
    throw error;
  } finally {
    reader.releaseLock();
  }
}

/**
 * UTILITY - Extracts content from a non-streaming response
 * @param {Response} response - The API response
 * @returns {Promise<string>} - The extracted content
 */
async function processResponse(response) {
  const jsonResponse = await response.json();
  if (jsonResponse.custom_prompt) return jsonResponse.custom_prompt[0].value;
  else {
    throw new Error('No custom prompt found in response');
  }
}

/**
 * Generate text based on a prompt with streaming
 * @param {string} prompt - User prompt
 * @param {Object} options - Additional options
 * @param {string} options.context - System prompt to guide generation
 * @param {string} options.documentXml - Document XML for context
 * @param {string} options.url - URL of a document to analyze
 * @param {Object} options.config - API configuration
 * @param {function} onChunk - Callback for each text chunk
 * @returns {Promise<string>} - The complete generated text
 */
export async function writeStreaming(prompt, options = {}, onChunk) {
  if (!prompt) {
    throw new Error('Prompt is required for text generation');
  }

  const payload = {
    doc_text: 'this is a test',
    stream: true,
    insights: [
      {
        type: 'custom_prompt',
        name: 'text_generation',
        message: prompt,
        format: [{ content: '' }]
      }
    ]
  };

  // if (options.context) {
  //   payload.context = options.context;
  // }

  // if (options.documentXml) {
  //   payload.document_content = options.documentXml;
  // }

  const response = await baseInsightsFetch(payload, options.config || {});
  
  if (onChunk && response.body) {
    // Start processing the stream with the provided callback and await it
    return await processStream(response.body, onChunk);
  }
  
  // If no callback was provided, still process the stream but don't call onChunk
  return response.body ? await processStream(response.body) : '';
}

/**
 * Generate text based on a prompt (non-streaming)
 * @param {string} prompt - User prompt
 * @param {Object} options - Additional options
 * @param {string} options.context - System prompt to guide generation
 * @param {string} options.documentXml - Document XML for context
 * @param {string} options.url - URL of a document to analyze
 * @param {Object} options.config - API configuration
 * @returns {Promise<string>} - The generated text
 */
export async function write(prompt, options = {}) {
  if (!prompt) {
    throw new Error('Prompt is required for text generation');
  }

  const payload = {
    doc_text: 'this is a test',  
    stream: false,
    insights: [
      {
        type: 'custom_prompt',
        name: 'text_generation',
        message: ` ${options.context} Generate a text based on the following prompt: ${prompt}`,
        format: [{ value: '' }]
      }
    ]
  };

  // if (options.context) {
  //   payload.context = options.context;
  // }

  // if (options.documentXml) {
  //   payload.document_content = options.documentXml;
  // }

  const response = await baseInsightsFetch(payload, options.config || {});
  console.log('write response', response);
  return processResponse(response);
}

/**
 * Rewrite text based on a prompt with streaming
 * @param {string} text - Text to rewrite
 * @param {string} prompt - User instructions for rewriting
 * @param {Object} options - Additional options
 * @param {string} options.documentXml - Document XML for context
 * @param {string} options.url - URL of a document to analyze
 * @param {Object} options.config - API configuration
 * @param {function} onChunk - Callback for each text chunk
 * @returns {Promise<string>} - The complete rewritten text
 */
export async function rewriteStreaming(text, prompt = '', options = {}, onChunk) {
  if (!text) {
    throw new Error('Text is required for rewriting');
  }

  const message = prompt
    ? `Rewrite the following text: "${text}". Instructions: ${prompt}`
    : `Rewrite the following text: "${text}"`;

  const payload = {
    doc_text: 'this is a test',
    stream: true,
    insights: [
      {
        type: 'custom_prompt',
        name: 'text_rewrite',
        message: message,
        format: [{ content: '' }]
      }
    ]
  };

  if (options.documentXml) {
    payload.document_content = options.documentXml;
  }

  const response = await baseInsightsFetch(payload, options.config || {});
  
  if (onChunk && response.body) {
    // Start processing the stream with the provided callback and await it
    return await processStream(response.body, onChunk);
  }
  
  // If no callback was provided, still process the stream but don't call onChunk
  return response.body ? await processStream(response.body) : '';
}

/**
 * Rewrite text based on a prompt (non-streaming)
 * @param {string} text - Text to rewrite
 * @param {string} prompt - User instructions for rewriting
 * @param {Object} options - Additional options
 * @param {string} options.documentXml - Document XML for context
 * @param {string} options.url - URL of a document to analyze
 * @param {Object} options.config - API configuration
 * @returns {Promise<string>} - The rewritten text
 */
export async function rewrite(text, prompt = '', options = {}) {
  if (!text) {
    throw new Error('Text is required for rewriting');
  }

  const message = prompt
    ? `Rewrite the following text: "${text}". Instructions: ${prompt}`
    : `Rewrite the following text: "${text}"`;

  const payload = {
    doc_text: 'this is a test',
    stream: false,
    insights: [
      {
        type: 'custom_prompt',
        name: 'text_rewrite',
        message: message,
        format: [{ value: '' }]
      }
    ]
  };

  // if (options.documentXml) {
  //   payload.document_content = options.documentXml;
  // }

  const response = await baseInsightsFetch(payload, options.config || {});
  return processResponse(response);
}
