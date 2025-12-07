/**
 * Comment and tracked change tools for review and feedback
 * @module tools/builtin/collaboration-tools
 */

import type { Result } from '../../../shared';
import type { AIToolDefinition } from '../types';
import { ERROR_MESSAGES } from '../../../shared';

/**
 * Creates the insertTrackedChanges tool for suggesting multiple edits
 * 
 * @param actions - AI actions service instance
 * @returns Tool definition with handler
 */
export function createInsertTrackedChangesTool(actions: any): AIToolDefinition {
    return {
        name: 'insertTrackedChanges',
        description:
            'PRIMARY TOOL for suggesting multiple edits. Creates tracked changes across multiple locations. Use for: batch corrections, applying consistent changes, multiple editing suggestions.',
        handler: async ({instruction}) => {
            const action = actions.insertTrackedChanges;
            if (typeof action !== 'function') {
                throw new Error(ERROR_MESSAGES.ACTION_NOT_AVAILABLE('insertTrackedChanges'));
            }

            const result: Result = await action(instruction);
            return {
                success: Boolean(result?.success),
                data: result,
                message: result?.success ? undefined : 'Tool "insertTrackedChanges" could not complete the request',
            };
        },
    };
}

/**
 * Creates the insertComments tool for providing feedback in multiple locations
 * 
 * @param actions - AI actions service instance
 * @returns Tool definition with handler
 */
export function createInsertCommentsTool(actions: any): AIToolDefinition {
    return {
        name: 'insertComments',
        description:
            'PRIMARY TOOL for providing feedback in multiple locations. Use for: comprehensive document review, multiple questions, batch feedback.',
        handler: async ({instruction}) => {
            const action = actions.insertComments;
            if (typeof action !== 'function') {
                throw new Error(ERROR_MESSAGES.ACTION_NOT_AVAILABLE('insertComments'));
            }

            const result: Result = await action(instruction);
            return {
                success: Boolean(result?.success),
                data: result,
                message: result?.success ? undefined : 'Tool "insertComments" could not complete the request',
            };
        },
    };
}

