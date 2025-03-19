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
const GATEWAY_ENDPOINT = 'https://sd-dev-express-gateway-i6xtm.ondigitalocean.app/insights';
const SYSTEM_PROMPT = 'You are an expert copywriter and you are immersed in a document editor. You are to provide document related text responses based on the user prompts. Only write what is asked for. Do not provide explanations. Try to keep placeholders as short as possible. Do not output your prompt.';
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
  const apiEndpoint = apiKey ? API_ENDPOINT : GATEWAY_ENDPOINT

  try {
    const headers = {
      'Content-Type': 'application/json',
    };
    
    // Only add the API key header if one is provided
    if (apiKey) {
      headers['x-api-key'] = apiKey;
    }

    console.log('payload', payload);
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
      console.log('done', done, 'value', value);
      if (done) {
        break;
      }

      // Decode the chunk
      const chunk = decoder.decode(value, { stream: true });
      console.log('chunk', chunk);
      jsonBuffer += chunk;
      console.log('jsonBuffer', jsonBuffer);
      // Try to parse as JSON and extract content
      tryParseAndExtractContent(jsonBuffer, (extractedContent) => {
        result = extractedContent;
        console.log('result', result);
        if (typeof onChunk === 'function') {
          console.log('calling onChunk', result);
          onChunk(result);
        }
        jsonBuffer = '';
      });
      
      // Safety check for large unparseable buffers
      if (jsonBuffer.length > 10000) {
        result = jsonBuffer;
        if (typeof onChunk === 'function') {
          onChunk(result);
        }
        jsonBuffer = '';
      }
    }
    
    // Final attempt to extract content from any remaining buffer
    if (jsonBuffer) {
      tryParseAndExtractContent(jsonBuffer, (extractedContent) => {
        result = extractedContent;
      });
    }
    
    return result;
  } catch (error) {
    console.error('Error reading stream:', error);
    throw error;
  } finally {
    reader.releaseLock();
  }
}

/**
 * Helper function to parse JSON and extract content
 * @param {string} jsonBuffer - The JSON string to parse
 * @param {function} onSuccess - Callback when content is successfully extracted
 */
function tryParseAndExtractContent(jsonBuffer, onSuccess) {
  try {
    console.log('jsonBuffer', jsonBuffer);
    const jsonResponse = JSON.parse(jsonBuffer);
    console.log('jsonResponse', jsonResponse);

    // Extract content based on response structure
    let extractedContent = '';
    
    if (jsonResponse.custom_prompt && Array.isArray(jsonResponse.custom_prompt) && jsonResponse.custom_prompt.length > 0) {
      const promptData = jsonResponse.custom_prompt[0];
      console.log('promptData', promptData);
      if (promptData.content) {
        extractedContent = promptData.content;
      }
    }
    
    if (extractedContent) {
      console.log('extractedContent', extractedContent);
      onSuccess(extractedContent);
    }
  } catch (e) {
    // Not valid JSON yet, might be a partial chunk
    // Do nothing, will try again with more data
    console.log('not valid JSON', e);
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

  // const payload = {
  //   doc_text: options.docText || 'this is a test',
  //   stream: true,
  //   insights: [
  //     {
  //       type: 'custom_prompt',
  //       name: 'text_generation',
  //       message: `${SYSTEM_PROMPT} Generate a text based on the following prompt: ${prompt}`,
  //     }
  //   ]
  // };
  const payload = 
    {
      // url: S3_URL, // Using URL instead of draft_id
      doc_text: "this is a test",
      insights: [
        {
          type: "custom_prompt",
          name: "text_generation",
          message: "Can you generate me an NDA agreement with placeholders",
        },
      ],
      stream: true,
    }

  // if (options.context) {
  //   payload.context = options.context;
  // }

  // if (options.documentXml) {
  //   payload.document_content = options.documentXml;
  // }

  const response = await baseInsightsFetch(payload, options.config || {});
  
  console.log('streaming response', response);
  if (!response.body) return '';
  console.log('processing stream');
  return await processStream(response.body, onChunk);
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
    doc_text: options.docText || 'this is a test',  
    stream: false,
    insights: [
      {
        type: 'custom_prompt',
        name: 'text_generation',
        message: `${SYSTEM_PROMPT} Generate a text based on the following prompt: ${prompt}`,
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
    doc_text: options.docText || 'this is a test',
    stream: true,
    insights: [
      {
        type: 'custom_prompt',
        name: 'text_rewrite',
        message: `${SYSTEM_PROMPT} ${message}`,
        format: [{ content: '' }]
      }
    ]
  };

  if (options.documentXml) {
    payload.document_content = options.documentXml;
  }

  const response = await baseInsightsFetch(payload, options.config || {});
  
  if (!response.body) return '';
  
  return await processStream(response.body, onChunk);
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
    doc_text: options.docText || 'this is a test',
    stream: false,
    insights: [
      {
        type: 'custom_prompt',
        name: 'text_rewrite',
        message: `${SYSTEM_PROMPT} ${message}`,
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
