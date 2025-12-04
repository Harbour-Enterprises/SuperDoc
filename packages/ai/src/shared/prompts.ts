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
            - Generate a summary, review note, or analysis that the user can use for legal/business review.
            - Highlight the most critical clauses, risks, or action items in prose (no Markdown).
            
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
- Use the document context strictly for understanding tone or nearby content. DO NOT copy, paraphrase, or return the context text itself unless explicitly asked.
- Generate only the new content needed (e.g., a heading, paragraph, clause). Do not repeat or summarize the provided context.
- Ensure the generated content is relevant and well-formed.

${documentContext ? `Document context (read-only reference):\n${documentContext}\n` : ''}
Respond with JSON:
{
  "success": boolean,
  "results": [{
      "suggestedText": string
  }]
}`;
};

/**
 * Builds the system prompt for AIBuilder planning
 *
 * @param toolDescriptions - Formatted string of available tool descriptions
 * @returns Complete system prompt for the AI Builder planner
 */
export const buildAIBuilderSystemPrompt = (toolDescriptions: string): string => {
  return `You are SuperDoc AI Builder, a concise planner for collaborative document edits. Tools available:
          ${toolDescriptions}
          
          Guidelines:
          - Treat selection/document context as read-only references. Do not restate or rewrite that text in your plan; let tools apply edits.
          - Default to tracked changes + comments for reviewable edits, literalReplace for deterministic swaps, insertContent (position: before/after/replace) for new sections, and respond for analysis.
          - Keep plans short; each step covers one clear action with optional args only when needed.
          
          Response JSON:
          {
            "reasoning": "1-2 sentence summary",
            "steps": [
              {"id":"step-1","tool":"<name>","instruction":"Precise action","args":{...optional}}
            ]
          }
          
          Examples:
          Editing → {"reasoning":"Use tracked changes for clarity fixes","steps":[{"id":"revise","tool":"insertTrackedChanges","instruction":"Improve grammar and tone in the selected paragraph"}]}
          Literal replace → {"reasoning":"User provided exact before/after text","steps":[{"id":"swap","tool":"literalReplace","instruction":"Replace the legacy company name","args":{"find":"A","replace":"B","trackChanges":true}}]}
          Drafting → {"reasoning":"Insert conclusion after current section","steps":[{"id":"conclude","tool":"insertContent","instruction":"Write a short conclusion paragraph summarizing next steps","args":{"position":"after"}}]}`;
};
