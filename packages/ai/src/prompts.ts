import type {ContextBlock, ContextWindow} from './types';

/**
 * AI prompt templates for document operations
 */

export const SYSTEM_PROMPTS = {
    SEARCH: 'You are a document search assistant. Always respond with valid JSON.',
    EDIT: 'You are a document editing assistant. Always respond with valid JSON.',
    SUMMARY: 'You are a document summarization assistant. Always respond with valid JSON.',
    CONTENT_GENERATION: 'You are a document content generation assistant. Always respond with valid JSON.',
} as const;

const describeBlock = (block: ContextBlock): string => {
    const descriptor: string[] = [block.type];
    if (block.title) {
        descriptor.push(`"${block.title}"`);
    }
    if (typeof block.headingLevel === 'number') {
        descriptor.push(`(level ${block.headingLevel})`);
    }
    return `${descriptor.join(' ')}:\n${block.text}`;
};

export const formatContextWindow = (context: ContextWindow): string => {
    const segments: string[] = [`Scope: ${context.scope}`];

    if (context.selection?.text) {
        segments.push(`Selected text:\n${context.selection.text}`);
    }

    if (context.selection?.block?.text) {
        segments.push(`Active block:\n${describeBlock(context.selection.block)}`);
    }

    if (context.selection?.surroundingBlocks?.length) {
        const nearby = context.selection.surroundingBlocks.map((block) => describeBlock(block)).join('\n---\n');
        segments.push(`Surrounding blocks:\n${nearby}`);
    }

    if (!context.selection?.text && context.primaryText) {
        segments.push(`Primary text:\n${context.primaryText}`);
    }

    if (context.metadata?.documentId) {
        segments.push(`Document ID: ${context.metadata.documentId}`);
    }

    return segments.filter(Boolean).join('\n\n');
};

export const buildFindPrompt = (query: string, context: ContextWindow, findAll: boolean): string => {
    const scope = findAll ? 'ALL occurrences' : 'FIRST occurrence ONLY';

    return `apply this query for original text return the EXACT text from the doc no title or added text: ${query}, ${scope}
            Context window:
            ${formatContextWindow(context)}
            
            Respond with JSON:
            {
              "success": boolean,
              "results": [ { 
                  "originalText": string,
                }
              ]
            }`;
};

export const buildReplacePrompt = (query: string, context: ContextWindow, replaceAll: boolean): string => {
    const scope = replaceAll
        ? 'ALL occurrences'
        : 'FIRST occurrence ONLY';

    const finalQuery = `apply this query: ${query} if find and replace query then Find and replace the EXACT text of ${scope}`;

    return `${finalQuery}
            Context window:
            ${formatContextWindow(context)}
            
            Respond with JSON:
            {
              "success": boolean,
              "results": [{
                  "originalText": string,
                  "suggestedText": string,
              }],
            }`;
};

export const buildSummaryPrompt = (query: string, context: ContextWindow): string => {
    return `${query}
            Context window:
            ${formatContextWindow(context)}
            
            Respond with JSON:
            {
              "success": boolean,
              "results": [ { 
                  "suggestedText": string,
                }
              ]
            }`;
};

export const buildInsertContentPrompt = (query: string, context: ContextWindow): string => {
    return `${query}
            Context window:
            ${formatContextWindow(context)}
            Respond with JSON: { 
                "success": boolean, "results": [ { 
                "suggestedText": string,
                }
            ]`;
};