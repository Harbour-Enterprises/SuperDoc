/**
 * Replace tools for text replacement operations
 * @module tools/builtin/replace-tools
 */

import type { Result } from '../../../shared';
import type { AIBuilderToolDefinition } from '../types';
import { ERROR_MESSAGES } from '../../../shared';

/**
 * Creates the replaceAll tool for batch text replacement
 * 
 * @param actions - AI actions service instance
 * @returns Tool definition with handler
 */
export function createReplaceAllTool(actions: any): AIBuilderToolDefinition {
    return {
        name: 'replaceAll',
        description:
            'DIRECT batch editing (no tracking). Use ONLY when: user explicitly wants all instances changed immediately. Otherwise prefer insertTrackedChanges for reviewable changes.',
        handler: async ({instruction}) => {
            const action = actions.replaceAll;
            if (typeof action !== 'function') {
                throw new Error(ERROR_MESSAGES.ACTION_NOT_AVAILABLE('replaceAll'));
            }

            const result: Result = await action(instruction);
            return {
                success: Boolean(result?.success),
                data: result,
                message: result?.success ? undefined : 'Tool "replaceAll" could not complete the request',
            };
        },
    };
}

/**
 * Creates the literalReplace tool for deterministic find-and-replace operations
 * Selection detection is now automatic - AIActionsService will check for active selection
 * 
 * @param actions - AI actions service instance
 * @returns Tool definition with handler
 */
export function createLiteralReplaceTool(actions: any): AIBuilderToolDefinition {
    return {
        name: 'literalReplace',
        description:
            'Deterministic literal find-and-replace. Use when the user explicitly provides both the text to find and the exact replacement. Requires args.find and args.replace.',
        handler: async ({step}) => {
            const args = step.args ?? {};
            const findText = typeof args.find === 'string' ? args.find : '';
            const replaceTextProvided = typeof args.replace === 'string';
            const replaceText = replaceTextProvided ? (args.replace as string) : '';
            const caseSensitive = Boolean(args.caseSensitive);
            const trackChanges = Boolean(args.trackChanges);

            if (!findText.trim()) {
                return {
                    success: false,
                    message: ERROR_MESSAGES.LITERAL_REPLACE_NO_FIND,
                    data: null,
                };
            }

            if (!replaceTextProvided) {
                return {
                    success: false,
                    message: ERROR_MESSAGES.LITERAL_REPLACE_NO_REPLACE,
                    data: null,
                };
            }

            const action = actions.literalReplace;
            if (typeof action !== 'function') {
                throw new Error(ERROR_MESSAGES.ACTION_NOT_AVAILABLE('literalReplace'));
            }

            // Selection detection is now automatic in AIActionsService
            const result: Result = await action(findText, replaceText, {
                caseSensitive,
                trackChanges,
            });
            
            return {
                success: Boolean(result?.success),
                data: result,
                message: result?.success ? undefined : ERROR_MESSAGES.LITERAL_REPLACE_NO_MATCHES(findText),
            };
        },
    };
}

