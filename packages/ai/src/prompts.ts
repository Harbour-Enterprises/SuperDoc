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

    return `You are a document search assistant.
      Task:
      - In the document context, locate ${scopeInstruction} that best match the user request.
      - Interpret the user request as a description of the desired text (term, clause, or definition); it might not be an exact character-for-character match.
      - Treat punctuation, capitalization, smart quotes vs. straight quotes, and minor wording differences as equivalent when identifying the match.
      - If the request references a defined term or section, return the entire relevant sentence/definition from the document.
      - Always copy the matched text exactly as it appears in the document when returning it.
      - Do NOT include any surrounding text before or after the match beyond what is necessary to satisfy the request.
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
    const scope = replaceAll
        ? 'ALL occurrences'
        : 'FIRST occurrence ONLY';

    return `You are a document-editing engine. Read the user request and identify what text to find and what action to perform.

            OPERATION TYPES:
            
            1. FIND & REPLACE TEXT
               - When user says: "replace X with Y", "change X to Y", "update X", "delete X"
               - Find EXACT match: ${scope} of the text to replace
               - originalText: the exact text found in document
               - suggestedText: the replacement text
               - Case, spacing, punctuation must match exactly.
            
            2. FIND & ADD COMMENT
               - When user says: "add comment to X", "comment on X", "note about X", "review X"
               - Find EXACT match: ${scope} of the text to comment on
               - originalText: the exact text found in document (the text to attach comment to)
               - suggestedText: the comment text to add (NOT a replacement - the original text stays unchanged)
               - Example: "Add comment to clause 4.2(b)" → find "clause 4.2(b)", suggestedText is the comment
            
            3. FIND & HIGHLIGHT / MARK
               - When user says: "highlight X", "mark X", "emphasize X"
               - Find EXACT match: ${scope} of the text
               - originalText: the exact text found
               - suggestedText: same as originalText (no replacement needed)
            
            4. FIND & SUGGEST IMPROVEMENTS (Tracked Changes)
               - When user says: "improve X", "suggest changes to X", "redline X"
               - Find EXACT match: ${scope} of the text
               - originalText: the exact text found
               - suggestedText: the improved/modified version
            
            5. SUMMARIZE / CLARIFY / REWRITE
               - When user says: "summarize X", "clarify X", "rewrite X"
               - Find the relevant text section
               - originalText: the text to summarize/clarify
               - suggestedText: the summarized/clarified version
            
            CRITICAL RULES:
            - ALWAYS find the EXACT text mentioned in the user request from the document
            - For "add comment to X" or "comment on X": originalText = X (found text), suggestedText = comment content
            - For "replace X with Y": originalText = X, suggestedText = Y
            - Use minimal, precise spans - match exactly what's in the document
            - If the exact text cannot be found → success = false
            - For ${scope}: return all matches or just the first match accordingly
            
            ---------------------
            RESPONSE FORMAT (always valid JSON):
            {
              "success": boolean,
              "results": [
                {
                  "originalText": "exact text from document",
                  "suggestedText": "replacement/comment/improvement text"
                }
              ]
            }
            
            - For multiple operations, add multiple entries in results array
            - No explanations. No extra text outside JSON.
            ---------------------
            
            Document context:
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
