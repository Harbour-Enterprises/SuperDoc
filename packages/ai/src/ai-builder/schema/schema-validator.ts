import type { Editor } from '../../shared';

/**
 * Validation result for content against schema
 */
export interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
}

/**
 * Validation error details
 */
export interface ValidationError {
    path: string;
    message: string;
    expected?: string;
    actual?: string;
    suggestion?: string;
}

/**
 * Validation warning details
 */
export interface ValidationWarning {
    path: string;
    message: string;
    severity: 'low' | 'medium' | 'high';
}

/**
 * Validate content against editor schema before execution.
 * Provides detailed diagnostics for debugging and error recovery.
 *
 * @param content - Content to validate (array of nodes)
 * @param editor - SuperDoc editor instance
 * @returns Validation result with errors and warnings
 *
 * @example
 * ```typescript
 * const result = validateContent(content, editor);
 * if (!result.valid) {
 *   console.error('Validation failed:');
 *   result.errors.forEach(err => {
 *     console.error(`  ${err.path}: ${err.message}`);
 *     if (err.suggestion) {
 *       console.log(`  Suggestion: ${err.suggestion}`);
 *     }
 *   });
 * }
 * ```
 */
export function validateContent(content: any[], editor: Editor): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!Array.isArray(content)) {
        errors.push({
            path: 'content',
            message: 'Content must be an array',
            expected: 'array',
            actual: typeof content,
            suggestion: 'Wrap content in an array: [content]',
        });
        return { valid: false, errors, warnings };
    }

    const schema = editor.schema;
    if (!schema) {
        warnings.push({
            path: 'editor.schema',
            message: 'Editor schema not available, skipping validation',
            severity: 'high',
        });
        return { valid: true, errors, warnings };
    }

    content.forEach((node, index) => {
        const path = `content[${index}]`;
        validateNode(node, path, schema, errors, warnings);
    });

    return {
        valid: errors.length === 0,
        errors,
        warnings,
    };
}

/**
 * Validate a single node against schema
 */
function validateNode(
    node: any,
    path: string,
    schema: any,
    errors: ValidationError[],
    warnings: ValidationWarning[]
): void {
    // Check if node is an object
    if (!node || typeof node !== 'object') {
        errors.push({
            path,
            message: 'Node must be an object',
            expected: 'object',
            actual: typeof node,
        });
        return;
    }

    // Check if type exists
    if (!node.type) {
        errors.push({
            path: `${path}.type`,
            message: 'Node must have a "type" property',
            suggestion: 'Add type property, e.g., { type: "paragraph", ... }',
        });
        return;
    }

    // Check if type is valid in schema
    const nodeType = schema.nodes[node.type];
    if (!nodeType) {
        errors.push({
            path: `${path}.type`,
            message: `Unknown node type: "${node.type}"`,
            actual: node.type,
            suggestion: `Available types: ${Object.keys(schema.nodes).join(', ')}`,
        });
        return;
    }

    // Validate attributes
    if (node.attrs) {
        validateAttributes(node.attrs, nodeType.spec.attrs, `${path}.attrs`, errors, warnings);
    }

    // Validate content
    if (node.content) {
        if (!Array.isArray(node.content)) {
            errors.push({
                path: `${path}.content`,
                message: 'Node content must be an array',
                expected: 'array',
                actual: typeof node.content,
            });
            return;
        }

        // Check if node can have content
        if (!nodeType.spec.content && node.content.length > 0) {
            warnings.push({
                path: `${path}.content`,
                message: `Node type "${node.type}" typically doesn't have content`,
                severity: 'medium',
            });
        }

        // Recursively validate child nodes
        node.content.forEach((child: any, childIndex: number) => {
            const childPath = `${path}.content[${childIndex}]`;
            validateNode(child, childPath, schema, errors, warnings);
        });
    }

    // Validate marks (for text nodes)
    if (node.marks && Array.isArray(node.marks)) {
        node.marks.forEach((mark: any, markIndex: number) => {
            validateMark(mark, `${path}.marks[${markIndex}]`, schema, errors, warnings);
        });
    }
}

/**
 * Validate node attributes
 */
function validateAttributes(
    attrs: any,
    attrSpec: any,
    path: string,
    errors: ValidationError[],
    warnings: ValidationWarning[]
): void {
    if (!attrSpec) {
        return;
    }

    // Check for required attributes
    for (const [attrName, spec] of Object.entries(attrSpec)) {
        const attrDef = spec as any;
        if (attrDef.default === undefined && !attrs[attrName]) {
            errors.push({
                path: `${path}.${attrName}`,
                message: `Required attribute "${attrName}" is missing`,
                suggestion: `Add ${attrName} to attrs`,
            });
        }
    }

    // Check for unknown attributes
    for (const attrName of Object.keys(attrs)) {
        if (!attrSpec[attrName]) {
            warnings.push({
                path: `${path}.${attrName}`,
                message: `Unknown attribute "${attrName}"`,
                severity: 'low',
            });
        }
    }
}

/**
 * Validate a mark
 */
function validateMark(
    mark: any,
    path: string,
    schema: any,
    errors: ValidationError[],
    warnings: ValidationWarning[]
): void {
    if (!mark || typeof mark !== 'object') {
        errors.push({
            path,
            message: 'Mark must be an object',
            expected: 'object',
            actual: typeof mark,
        });
        return;
    }

    if (!mark.type) {
        errors.push({
            path: `${path}.type`,
            message: 'Mark must have a "type" property',
        });
        return;
    }

    const markType = schema.marks[mark.type];
    if (!markType) {
        errors.push({
            path: `${path}.type`,
            message: `Unknown mark type: "${mark.type}"`,
            actual: mark.type,
            suggestion: `Available marks: ${Object.keys(schema.marks).join(', ')}`,
        });
        return;
    }

    // Validate mark attributes
    if (mark.attrs && markType.spec.attrs) {
        validateAttributes(mark.attrs, markType.spec.attrs, `${path}.attrs`, errors, warnings);
    }
}

/**
 * Attempt to auto-fix common validation errors.
 * Returns fixed content or null if cannot be fixed.
 *
 * @param content - Content with validation errors
 * @param validationResult - Result from validateContent
 * @param editor - SuperDoc editor instance
 * @returns Fixed content or null
 *
 * @example
 * ```typescript
 * const result = validateContent(content, editor);
 * if (!result.valid) {
 *   const fixed = autoFixContent(content, result, editor);
 *   if (fixed) {
 *     console.log('Content auto-fixed');
 *     return fixed;
 *   }
 * }
 * ```
 */
export function autoFixContent(
    content: any[],
    validationResult: ValidationResult,
    editor: Editor
): any[] | null {
    if (validationResult.valid) {
        return content;
    }

    let fixed = JSON.parse(JSON.stringify(content));

    for (const error of validationResult.errors) {
        if (error.message.startsWith('Unknown node type')) {
            const pathParts = error.path.split(/[\[\].]/).filter(Boolean);
            const index = parseInt(pathParts[1], 10);
            if (!isNaN(index) && fixed[index]) {
                fixed[index].type = 'paragraph';
            }
        }

        if (error.message.includes('Required attribute')) {
            const pathParts = error.path.split('.');
            const nodePath = pathParts.slice(0, -2).join('.');
            const nodeIndex = parseInt(nodePath.match(/\[(\d+)\]/)?.[1] || '0', 10);
            if (fixed[nodeIndex] && !fixed[nodeIndex].attrs) {
                fixed[nodeIndex].attrs = {};
            }
        }
    }

    const revalidated = validateContent(fixed, editor);
    return revalidated.valid ? fixed : null;
}

/**
 * Format validation errors as human-readable string.
 *
 * @param validationResult - Result from validateContent
 * @returns Formatted error message
 */
export function formatValidationErrors(validationResult: ValidationResult): string {
    if (validationResult.valid) {
        return 'Content is valid';
    }

    let message = `Found ${validationResult.errors.length} validation error(s):\n\n`;

    validationResult.errors.forEach((error, index) => {
        message += `${index + 1}. ${error.path}: ${error.message}\n`;
        if (error.expected && error.actual) {
            message += `   Expected: ${error.expected}, Got: ${error.actual}\n`;
        }
        if (error.suggestion) {
            message += `   💡 ${error.suggestion}\n`;
        }
        message += '\n';
    });

    if (validationResult.warnings.length > 0) {
        message += `\nWarnings (${validationResult.warnings.length}):\n`;
        validationResult.warnings.forEach((warning) => {
            message += `- ${warning.path}: ${warning.message} [${warning.severity}]\n`;
        });
    }

    return message;
}