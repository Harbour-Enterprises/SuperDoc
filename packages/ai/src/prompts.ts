/**
 * AI prompt templates for document operations
 */

export const SYSTEM_PROMPTS = {
  SEARCH: 'You are a document search assistant. Always respond with valid JSON.',
  EDIT: 'You are a document editing assistant. Always respond with valid JSON.',
  SUMMARY: 'You are a document summarization assistant. Always respond with valid JSON.',
  CONTENT_GENERATION: 'You are a document content generation assistant. Always respond with valid JSON.',
} as const;

export const buildFindPrompt = (query: string, documentContext: string, findAll: boolean): string => {
  const scopeInstruction = findAll ? 'ALL occurrences' : 'the FIRST occurrence ONLY';

  return `You are a strict document search assistant.
      Task:
      - In the document context, locate ${scopeInstruction} that match the user request exactly.
      - User request (treat this as the literal text or exact criteria to match): "${query}"
      - Return ONLY the exact matched text from the document.
      - Do NOT include any surrounding text before or after the match.
      - Do NOT modify, transform, summarize, or interpret the text.
      - Do NOT add explanations or metadata.
      
      Document context:
      ${documentContext}
      
      Respond with JSON:
      {
        "success": boolean,
        "results": [{
          "originalText": string
        }]
      }`;
};

export const buildReplacePrompt = (query: string, documentContext: string, replaceAll: boolean): string => {
  const scope = replaceAll ? 'ALL occurrences' : 'FIRST occurrence ONLY';

  return `You are a document-editing engine. Read the user request in ${query} and perform ONE of the following operation types:
            1. FIND & REPLACE (if the request involves replacing, deleting, inserting, or redlining text)
               - Search for EXACT matches of: ${scope}
               - Replace ONLY the matched text (no surrounding text).
               - Use minimal spans for originalText and suggestedText.
               - Case, spacing, punctuation must match exactly.
               - If no exact match found → success = false.
            
            2. SUMMARIZE / CLARIFY / REWRITE (if the request involves summarizing or improving text)
               - Ignore find/replace logic.
               - Preserve meaning.
            
            3. GENERAL EDITING / REDLINING
               - Trigger when the user request asks for improvements requiring redlines.
               - Provide improved text with inline redlines.
               - Keep edits minimal and precise.
            
            ---------------------
            RESPONSE FORMAT (always):
            {
              "success": boolean,
              "results": [
                {
                  "originalText": "string",
                  "suggestedText": "string"
                }
              ]
            }
            
            Rules:
            - For multiple replacements, add multiple entries.
            - No explanations. No extra text outside JSON.
            ---------------------
            
            Document:
            ${documentContext}
            
            User Request:
            ${query}`;
};

export const buildSummaryPrompt = (query: string, documentContext: string): string => {
  return `You are a document summarization assistant.
            Task:
            - In the document context, ${query}
            - Generate a summary based on the query requirements.
            - Provide clear and concise summarization results.
            
            Document context:
            ${documentContext}
            
            Respond with JSON:
            {
              "success": boolean,
              "results": [{
                  "suggestedText": string,
              }],
            }`;
};

export const buildInsertContentPrompt = (query: string, documentContext?: string): string => {
  return `You are a document content generation assistant.
            Task:
            - ${query}
            - Generate appropriate content based on the query requirements.
            - Ensure the generated content is relevant and well-formed.
            
            ${documentContext ? `Document context:\n            ${documentContext}\n            ` : ''}
            Respond with JSON:
            {
              "success": boolean,
              "results": [{
                  "suggestedText": string,
              }],
            }`;
};
