import type { Editor } from '../../shared/types';

/**
 * Readiness check result
 */
export interface ReadinessResult {
    ready: boolean;
    reasons: string[];
    warnings: string[];
}

/**
 * Options for readiness check
 */
export interface ReadinessOptions {
    requireSchema?: boolean;
    requireView?: boolean;
    requireState?: boolean;
    timeout?: number;
}

/**
 * Check if editor is ready for AI operations.
 * Prevents race conditions when editor is initializing.
 *
 * @param editor - SuperDoc editor instance
 * @param options - Readiness check options
 * @returns Readiness result
 *
 * @example
 * ```typescript
 * const readiness = checkEditorReadiness(editor);
 * if (!readiness.ready) {
 *   console.error('Editor not ready:', readiness.reasons.join(', '));
 *   return;
 * }
 * ```
 */
export function checkEditorReadiness(
    editor: Editor,
    options?: ReadinessOptions
): ReadinessResult {
    const {
        requireSchema = true,
        requireView = true,
        requireState = true,
    } = options || {};

    const reasons: string[] = [];
    const warnings: string[] = [];

    // Check if editor exists
    if (!editor) {
        reasons.push('Editor instance is null or undefined');
        return { ready: false, reasons, warnings };
    }

    // Check schema
    if (requireSchema) {
        if (!editor.schema) {
            reasons.push('Editor schema is not available');
        } else if (!editor.schema.nodes || Object.keys(editor.schema.nodes).length === 0) {
            reasons.push('Editor schema has no nodes defined');
        }
    }

    // Check view
    if (requireView && !editor.view) {
        reasons.push('Editor view is not initialized');
    }

    // Check state
    if (requireState && !editor.state) {
        reasons.push('Editor state is not available');
    }

    // Check if getSchemaSummaryJSON is available
    if (typeof editor.getSchemaSummaryJSON !== 'function') {
        warnings.push('getSchemaSummaryJSON() method not available on editor');
    }

    // Check if commands are available
    if (!editor.commands) {
        reasons.push('Editor commands are not available');
    } else {
        // Check for essential commands
        if (typeof editor.commands.insertContentAt !== 'function') {
            warnings.push('insertContentAt command not available');
        }
        if (typeof editor.commands.setContent !== 'function') {
            warnings.push('setContent command not available');
        }
    }

    return {
        ready: reasons.length === 0,
        reasons,
        warnings,
    };
}

/**
 * Wait for editor to be ready with timeout.
 * Polls editor state until ready or timeout.
 *
 * @param editor - SuperDoc editor instance
 * @param options - Readiness options including timeout
 * @returns Promise that resolves when ready or rejects on timeout
 *
 * @example
 * ```typescript
 * try {
 *   await waitForEditorReady(editor, { timeout: 5000 });
 *   // Editor is ready, proceed with AI operations
 * } catch (error) {
 *   console.error('Editor failed to become ready:', error);
 * }
 * ```
 */
export async function waitForEditorReady(
    editor: Editor,
    options?: ReadinessOptions
): Promise<void> {
    const timeout = options?.timeout || 10000; // 10 seconds default
    const pollInterval = 100; // Check every 100ms
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
        const checkReady = () => {
            const readiness = checkEditorReadiness(editor, options);

            if (readiness.ready) {
                resolve();
                return;
            }

            if (Date.now() - startTime > timeout) {
                reject(
                    new Error(
                        `Editor not ready after ${timeout}ms. Reasons: ${readiness.reasons.join(', ')}`
                    )
                );
                return;
            }

            setTimeout(checkReady, pollInterval);
        };

        checkReady();
    });
}

/**
 * Decorator to ensure editor is ready before executing function.
 * Useful for wrapping tool execution functions.
 *
 * @param fn - Function to wrap
 * @param options - Readiness options
 * @returns Wrapped function that checks readiness first
 *
 * @example
 * ```typescript
 * const safeExecuteTool = ensureEditorReady(executeTool);
 * const result = await safeExecuteTool('insertContent', params, editor);
 * ```
 */
export function ensureEditorReady<T extends (...args: any[]) => any>(
    fn: T,
    options?: ReadinessOptions
): T {
    return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
        const editor = args.find((arg) => arg && typeof arg === 'object' && 'schema' in arg);

        if (!editor) {
            throw new Error('Could not find editor instance in arguments');
        }

        const readiness = checkEditorReadiness(editor, options);
        if (!readiness.ready) {
            throw new Error(
                `Editor not ready: ${readiness.reasons.join(', ')}`
            );
        }

        if (readiness.warnings.length > 0) {
            console.warn('[EditorReadiness] Warnings:', readiness.warnings.join(', '));
        }

        return fn(...args);
    }) as T;
}

/**
 * Get detailed editor state information for diagnostics.
 *
 * @param editor - SuperDoc editor instance
 * @returns Diagnostic information about editor state
 */
export function getEditorDiagnostics(editor: Editor): Record<string, any> {
    return {
        hasSchema: !!editor.schema,
        hasView: !!editor.view,
        hasState: !!editor.state,
        hasCommands: !!editor.commands,
        schemaNodeCount: editor.schema?.nodes ? Object.keys(editor.schema.nodes).length : 0,
        schemaMarkCount: editor.schema?.marks ? Object.keys(editor.schema.marks).length : 0,
        hasGetSchemaSummaryJSON: typeof editor.getSchemaSummaryJSON === 'function',
        hasInsertContentAt: typeof editor.commands?.insertContentAt === 'function',
        hasSetContent: typeof editor.commands?.setContent === 'function',
        documentSize: editor.state?.doc?.content?.size || 0,
        selectionFrom: editor.state?.selection?.from,
        selectionTo: editor.state?.selection?.to,
    };
}