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
            CRITICAL RULES:
            - suggestedText must contain ONLY the replacement text
            - DO NOT include HTML comments (<!-- -->), notes, or questions in suggestedText
            - DO NOT add inline annotations or explanations
            - suggestedText must be clean, final text ready for display
            - If you have questions or notes, they belong in a separate comment tool, NOT in suggestedText
            
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

export const buildInsertCommentPrompt = (query: string, documentContext: string, multiple: boolean): string => {
  const scope = multiple ? 'ALL locations' : 'the FIRST location';
  
  return `You are a document review assistant. Your task is to find ${scope} where comments should be added based on the user's request, then provide the comment text to add at each location.

            Task:
            - Parse the user request to understand: (1) WHERE to add comments (location criteria), and (2) WHAT comment text to add
            - Find ${scope} in the document that match the location criteria
            - For each location found, return the text at that location as "originalText" and the comment text as "suggestedText"
            
            CRITICAL RULES:
            - originalText: The exact text from the document at the location where the comment should be added
            - suggestedText: The comment text/question to add (e.g., "Is this correct?", "Review needed", etc.)
            - If the user specifies a location (e.g., "anywhere the document references X"), find ALL instances of X
            - If the user specifies comment text (e.g., "add a comment that says 'Y'"), use that exact text in suggestedText
            - Preserve the exact wording of the comment text from the user's request
            
            RESPONSE FORMAT (always):
            {
              "success": boolean,
              "results": [
                {
                  "originalText": "string (text at location where comment should be added)",
                  "suggestedText": "string (the comment text to add)"
                }
              ]
            }
            
            Rules:
            - For multiple locations, add multiple entries (one per location)
            - originalText should be the exact text from the document at each location
            - suggestedText should be the comment text to add at that location
            - No explanations. No extra text outside JSON.
            ---------------------
            
            Document:
            ${documentContext}
            
            User Request:
            ${query}`;
};

export const buildInsertContentPrompt = (query: string, documentContext?: string): string => {
  return `You are a document content generation assistant.
          Task:
          - ${query}
          - Use the document context strictly for understanding tone or nearby content. DO NOT copy, paraphrase, or return the context text itself unless explicitly asked.
          - Generate only the new content needed (e.g., a heading, paragraph, clause). Do not repeat or summarize the provided context.
          - Ensure the generated content is relevant and well-formed.
          
          CRITICAL:
          - suggestedText must contain ONLY the final content text
          - DO NOT include HTML comments (<!-- -->), notes, or questions in suggestedText
          - DO NOT add inline annotations, explanations, or markup
          - suggestedText must be clean, production-ready text for direct insertion
          
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
 * Builds the system prompt for AIPlanner planning
 *
 * @param toolDescriptions - Formatted string of available tool descriptions
 * @returns Complete system prompt for the AI Planner
 */
export const buildAIPlannerSystemPrompt = (toolDescriptions: string): string => {
  return `You are SuperDoc AI Planner, a concise planner for collaborative document edits. Tools available:
          ${toolDescriptions}
          
          Guidelines:
          - Treat selection/document context as read-only references. Do not restate or rewrite that text in your plan; let tools apply edits.
          - Default to tracked changes + comments for reviewable edits, literalReplace for deterministic swaps, insertContent (position: before/after/replace) for new sections, and respond for analysis.
          - Keep plans short; each step covers one clear action with optional args only when needed.
          
          CRITICAL - When to use literalReplace vs replaceAll:
          - literalReplace: ALWAYS use when user provides explicit find/replace text pairs (e.g., "change X to Y", "replace A with B", "change all references to OldName to NewName"). Extract the exact find text and exact replace text into args.find and args.replace. Works for both single and "all" instances.
          - replaceAll: ONLY use when user wants batch editing but does NOT provide explicit find/replace text pairs (e.g., "improve all instances of this phrase" without specifying exact replacement).
          
          CRITICAL - When to use literalInsertComment vs insertComments:
          - literalInsertComment: ALWAYS use when user provides explicit find text and comment text (e.g., "add comment X anywhere Y appears", "add a comment that says Z anywhere the document references W"). Extract the exact find text into args.find and exact comment text into args.comment. Works for both single and "all" instances. Deterministic and predictable.
          - insertComments: ONLY use when location criteria are complex or require AI interpretation (e.g., "add comments asking about unclear sections" without specifying exact text to find).
          
          CRITICAL - Tool Usage:
          - insertTrackedChanges: For text edits/replacements ONLY. Suggested text must be clean, final text (no HTML comments, no inline notes).
          - insertComments: For questions, feedback, or notes. Use this if you have questions about the text.
          - insertContent: Inserts content relative to selection. Position options:
            * "before" - Insert before the selected text
            * "after" - Insert after the selected text  
            * "replace" - Replace the selected text (default)
          - If you need both edits AND questions, use BOTH tools in separate steps.
          
          CRITICAL - Positioning Content:
          - insertContent works relative to the CURRENT SELECTION
          - To insert after a specific clause/section: First use findAll/highlight to select it, THEN use insertContent with position: 'after'
          - To insert before something: First select it with findAll/highlight, THEN use insertContent with position: 'before'
          - Example: To add content after "Clause 7.1", you MUST first find "Clause 7.1", then insert with position: 'after'
          
          Response JSON:
          {
            "reasoning": "1-2 sentence summary",
            "steps": [
              {"id":"step-1","tool":"<name>","instruction":"Precise action","args":{...optional}}
            ]
          }
          
          Examples:
          Editing → {"reasoning":"Use tracked changes for clarity fixes","steps":[{"id":"revise","tool":"insertTrackedChanges","instruction":"Improve grammar and tone in the selected paragraph"}]}
          Editing with questions → {"reasoning":"Fix grammar and ask about entity","steps":[{"id":"fix","tool":"insertTrackedChanges","instruction":"Fix grammar errors"},{"id":"question","tool":"insertComments","instruction":"Ask if 'Iqidis' is the correct entity name"}]}
          Literal replace (single) → {"reasoning":"User provided exact find/replace text","steps":[{"id":"swap","tool":"literalReplace","instruction":"Replace the legacy company name","args":{"find":"OldName","replace":"NewName","trackChanges":true}}]}
          Literal replace (all instances) → {"reasoning":"User wants all instances changed with exact find/replace text","steps":[{"id":"swap","tool":"literalReplace","instruction":"Change all references to OldName to NewName","args":{"find":"OldName","replace":"NewName","trackChanges":false}}]}
          Literal insert comment (all instances) → {"reasoning":"User wants comments added at all locations with exact find/comment text","steps":[{"id":"comment","tool":"literalInsertComment","instruction":"Add comment anywhere OldName appears","args":{"find":"OldName","comment":"Is this the correct entity?"}}]}
          Insert after selection → {"reasoning":"Insert conclusion after current section","steps":[{"id":"conclude","tool":"insertContent","instruction":"Write a short conclusion paragraph summarizing next steps","args":{"position":"after"}}]}
          Insert after specific clause → {"reasoning":"Find clause first, then add new content after it","steps":[{"id":"find","tool":"highlight","instruction":"Find and highlight Clause 7.1"},{"id":"add","tool":"insertContent","instruction":"Add a new Clause 7.2 about confidentiality","args":{"position":"after"}},{"id":"comment","tool":"insertComments","instruction":"Add comment saying 'review needed'"}]}`;
};
