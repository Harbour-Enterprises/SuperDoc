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
  const scope = findAll ? 'ALL occurrences' : 'FIRST occurrence ONLY';

  return `apply this query for original text return the EXACT text from the doc no title or added text: ${query}, ${scope}
            Document context:
            ${documentContext}
            
            Respond with JSON:
            {
              "success": boolean,
              "results": [ { 
                  "originalText": string,
                }
              ]
            }`;
};

export const buildReplacePrompt = (query: string, documentContext: string, replaceAll: boolean): string => {
  const scope = replaceAll ? 'ALL occurrences' : 'FIRST occurrence ONLY';

  const finalQuery = `apply this query: ${query} if find and replace query then Find and replace the EXACT text of ${scope}`;

  return `${finalQuery}
            Document context:
            ${documentContext}
            
            Respond with JSON:
            {
              "success": boolean,
              "results": [{
                  "originalText": string,
                  "suggestedText": string,
              }],
            }`;
};

export const buildSummaryPrompt = (query: string, documentContext: string): string => {
  return `${query}
            Document context:
            ${documentContext}
            
            Respond with JSON:
            {
              "success": boolean,
              "results": [ { 
                  "suggestedText": string,
                }
              ]
            }`;
};

export const buildInsertContentPrompt = (query: string, documentContext?: string): string => {
  return `${query}
            ${documentContext ? `Current document:\n${documentContext}\n` : ''}
            Respond with JSON: { 
                "success": boolean, "results": [ { 
                "suggestedText": string,
                }
            ]`;
};
