/**
 * OpenAI API integration for SuperDoc
 * Uses native fetch for API calls without external dependencies
 */

const OPENAI_API_BASE = 'https://api.openai.com/v1';
const DEFAULT_MODEL = 'gpt-4o-mini';

/**
 * Error types for OpenAI API calls
 */
export const OpenAiErrorTypes = {
  AUTHENTICATION: 'authentication_error',
  RATE_LIMIT: 'rate_limit_error',
  MODEL_ERROR: 'model_error',
  TOKEN_LIMIT: 'token_limit_error',
  NETWORK_ERROR: 'network_error',
  UNKNOWN: 'unknown_error',
};

/**
 * Parse OpenAI API error response
 * @param {Error} error - The error object
 * @param {Response} response - The fetch response object
 * @returns {Object} Parsed error with type and message
 */
function parseError(error, response) {
  // Network error
  if (!response) {
    return {
      type: OpenAiErrorTypes.NETWORK_ERROR,
      message: 'Network error: Unable to reach OpenAI API',
    };
  }

  // API error
  switch (response.status) {
    case 401:
      return {
        type: OpenAiErrorTypes.AUTHENTICATION,
        message: 'Invalid API key or unauthorized access',
      };
    case 429:
      return {
        type: OpenAiErrorTypes.RATE_LIMIT,
        message: 'Rate limit exceeded. Please try again later',
      };
    case 404:
      return {
        type: OpenAiErrorTypes.MODEL_ERROR,
        message: 'The requested model is not available',
      };
    case 400:
      if (error.message?.includes('token')) {
        return {
          type: OpenAiErrorTypes.TOKEN_LIMIT,
          message: 'Input too long. Please reduce the length of your text',
        };
      }
      break;
    default:
      return {
        type: OpenAiErrorTypes.UNKNOWN,
        message: error.message || 'An unknown error occurred',
      };
  }
}

/**
 * Create headers for OpenAI API requests
 * @param {string} apiKey - The OpenAI API key
 * @returns {Object} Headers object
 */
function createHeaders(apiKey) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };
}

/**
 * Base function for making API calls to OpenAI
 * @param {string} endpoint - API endpoint
 * @param {Object} options - Request options
 * @param {string} apiKey - OpenAI API key
 * @returns {Promise} API response
 */
async function fetchOpenAI(endpoint, options, apiKey) {
  try {
    const response = await fetch(`${OPENAI_API_BASE}${endpoint}`, {
      ...options,
      headers: createHeaders(apiKey),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw { response, error };
    }

    return response;
  } catch (error) {
    const parsedError = parseError(error.error || error, error.response);
    console.error('OpenAI API Error:', parsedError);
    throw parsedError;
  }
}

/**
 * Create a streaming completion request to OpenAI
 * @param {Object} params - Request parameters
 * @param {string} apiKey - OpenAI API key
 * @param {Function} onChunk - Callback for each chunk of data
 * @returns {Promise} Streaming response
 */
export async function createStreamingCompletion(params, apiKey, onChunk) {
  const options = {
    method: 'POST',
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      stream: true,
      ...params,
    }),
  };

  const response = await fetchOpenAI('/chat/completions', options, apiKey);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // Process the chunk
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter((line) => line.trim() !== '');

      for (const line of lines) {
        if (line.includes('[DONE]')) continue;
        if (!line.startsWith('data: ')) continue;

        const jsonData = line.replace('data: ', '');
        try {
          const data = JSON.parse(jsonData);
          if (data.choices?.[0]?.delta?.content) {
            onChunk(data.choices[0].delta.content);
          }
        } catch (e) {
          console.warn('Error parsing streaming response:', e);
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
