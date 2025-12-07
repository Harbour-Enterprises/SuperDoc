import type { Editor } from '../../shared/types';
import { generateContentSchema, type SchemaGeneratorOptions } from './schema-generator';

/**
 * Optimization level for schema generation
 */
export type OptimizationLevel = 'none' | 'minimal' | 'balanced' | 'aggressive';

/**
 * Schema optimization options
 */
export interface SchemaOptimizationOptions extends SchemaGeneratorOptions {
    optimization?: OptimizationLevel;
    maxDepth?: number;
    includeAttributeDescriptions?: boolean;
    simplifyComplexTypes?: boolean;
    nodePriority?: Record<string, number>;
}

/**
 * Schema statistics for measuring context usage
 */
export interface SchemaStats {
    estimatedTokens: number;
    sizeInChars: number;
    nodeCount: number;
    markCount: number;
    maxDepth: number;
}

/**
 * Generate optimized schema that uses less context.
 * Reduces token usage while maintaining essential structure information.
 *
 * @param editor - SuperDoc editor instance
 * @param options - Optimization options
 * @returns Optimized schema
 *
 * @example
 * ```typescript
 * // Aggressive optimization for large schemas
 * const schema = await generateOptimizedSchema(editor, {
 *   optimization: 'aggressive',
 *   excludedNodes: ['table', 'image'],  // Exclude complex nodes
 *   maxDepth: 2  // Limit nesting depth
 * });
 * ```
 */
export async function generateOptimizedSchema(
    editor: Editor,
    options?: SchemaOptimizationOptions
): Promise<any> {
    const {
        optimization = 'balanced',
        maxDepth = 3,
        includeAttributeDescriptions = false,
        simplifyComplexTypes = true,
        nodePriority = {},
        ...schemaOptions
    } = options || {};

    const fullSchema = await generateContentSchema(editor, {
        ...schemaOptions,
        includeDescriptions: optimization === 'none',
    });

    switch (optimization) {
        case 'none':
            return fullSchema;

        case 'minimal':
            return optimizeMinimal(fullSchema, {
                maxDepth,
                includeAttributeDescriptions,
            });

        case 'balanced':
            return optimizeBalanced(fullSchema, {
                maxDepth,
                includeAttributeDescriptions,
                simplifyComplexTypes,
                nodePriority,
            });

        case 'aggressive':
            return optimizeAggressive(fullSchema, {
                maxDepth: Math.min(maxDepth, 2),
                nodePriority,
            });

        default:
            return fullSchema;
    }
}

/**
 * Minimal optimization - keep most structure, remove verbose descriptions
 */
function optimizeMinimal(schema: any, options: any): any {
    const optimized = JSON.parse(JSON.stringify(schema));

    if (!options.includeAttributeDescriptions) {
        removeDescriptions(optimized);
    }

    return optimized;
}

/**
 * Balanced optimization - good compromise between detail and size
 */
function optimizeBalanced(schema: any, options: any): any {
    const optimized = JSON.parse(JSON.stringify(schema));
    removeDescriptions(optimized);

    if (options.simplifyComplexTypes) {
        simplifyTypes(optimized);
    }

    // Limit depth
    if (options.maxDepth) {
        limitDepth(optimized, options.maxDepth);
    }

    return optimized;
}

/**
 * Aggressive optimization - minimal schema, maximum reduction
 */
function optimizeAggressive(schema: any, options: any): any {
    const priorityNodes = options.nodePriority || {};
    const essentialTypes = ['paragraph', 'text', 'heading', ...Object.keys(priorityNodes)];

    if (schema.type === 'array' && schema.items) {
        const items = schema.items;
        if (items.oneOf) {
            const filtered = items.oneOf.filter((item: any) => {
                const typeName = item.properties?.type?.const;
                return essentialTypes.includes(typeName);
            });

            const simplified = filtered.map((item: any) => simplifyNodeSchema(item));

            return {
                type: 'array',
                items: simplified.length === 1 ? simplified[0] : { oneOf: simplified },
            };
        }

        return {
            type: 'array',
            items: simplifyNodeSchema(items),
        };
    }

    return schema;
}

/**
 * Remove all description fields recursively
 */
function removeDescriptions(obj: any): void {
    if (typeof obj !== 'object' || obj === null) {
        return;
    }

    if (Array.isArray(obj)) {
        obj.forEach(removeDescriptions);
        return;
    }

    delete obj.description;

    for (const value of Object.values(obj)) {
        removeDescriptions(value);
    }
}

/**
 * Simplify complex type definitions
 */
function simplifyTypes(obj: any): void {
    if (typeof obj !== 'object' || obj === null) {
        return;
    }

    if (Array.isArray(obj)) {
        obj.forEach(simplifyTypes);
        return;
    }

    if (obj.type && Array.isArray(obj.type)) {
        if (obj.type.includes('string')) {
            obj.type = 'string';
        } else {
            obj.type = obj.type[0];
        }
    }

    if (obj.oneOf && obj.oneOf.length > 5) {
        obj.oneOf = obj.oneOf.slice(0, 5);
        obj.oneOf.push({ type: 'object' });
    }

    for (const value of Object.values(obj)) {
        simplifyTypes(value);
    }
}

/**
 * Limit schema depth to prevent excessive nesting
 */
function limitDepth(obj: any, maxDepth: number, currentDepth: number = 0): any {
    if (currentDepth >= maxDepth) {
        if (obj.type === 'array') {
            return { type: 'array', items: { type: 'object' } };
        }
        if (obj.type === 'object') {
            return { type: 'object' };
        }
        return obj;
    }

    if (typeof obj !== 'object' || obj === null) {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map((item) => limitDepth(item, maxDepth, currentDepth + 1));
    }

    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
        result[key] = limitDepth(value, maxDepth, currentDepth + 1);
    }

    return result;
}

/**
 * Simplify a single node schema
 */
function simplifyNodeSchema(nodeSchema: any): any {
    if (!nodeSchema.properties) {
        return nodeSchema;
    }

    const simplified: any = {
        type: 'object',
        required: nodeSchema.required || ['type'],
        properties: {
            type: nodeSchema.properties.type,
        },
    };

    if (nodeSchema.properties.content) {
        simplified.properties.content = {
            type: 'array',
            items: { type: 'object' },
        };
    }

    if (nodeSchema.properties.attrs) {
        simplified.properties.attrs = {
            type: 'object',
        };
    }

    return simplified;
}

/**
 * Calculate schema statistics
 */
export function calculateSchemaStats(schema: any): SchemaStats {
    const schemaString = JSON.stringify(schema);
    const sizeInChars = schemaString.length;

    const estimatedTokens = Math.ceil(sizeInChars / 4);

    let nodeCount = 0;
    let markCount = 0;

    const countItems = (obj: any, depth: number = 0): number => {
        let maxDepth = depth;

        if (typeof obj !== 'object' || obj === null) {
            return maxDepth;
        }

        if (Array.isArray(obj)) {
            obj.forEach((item) => {
                const itemDepth = countItems(item, depth + 1);
                maxDepth = Math.max(maxDepth, itemDepth);
            });
            return maxDepth;
        }

        if (obj.properties?.type?.const) {
            nodeCount++;
        }

        for (const value of Object.values(obj)) {
            const valueDepth = countItems(value, depth + 1);
            maxDepth = Math.max(maxDepth, valueDepth);
        }

        return maxDepth;
    };

    const maxDepth = countItems(schema);

    return {
        estimatedTokens,
        sizeInChars,
        nodeCount,
        markCount,
        maxDepth,
    };
}

/**
 * Compare schemas and show optimization savings
 */
export async function compareOptimizations(
    editor: Editor,
    options?: SchemaOptimizationOptions
): Promise<{
    none: SchemaStats;
    minimal: SchemaStats;
    balanced: SchemaStats;
    aggressive: SchemaStats;
}> {
    const levels: OptimizationLevel[] = ['none', 'minimal', 'balanced', 'aggressive'];
    const results: any = {};

    for (const level of levels) {
        const schema = await generateOptimizedSchema(editor, {
            ...options,
            optimization: level,
        });
        results[level] = calculateSchemaStats(schema);
    }

    return results;
}

/**
 * Get recommended optimization level based on schema size
 */
export async function getRecommendedOptimization(
    editor: Editor
): Promise<{
    level: OptimizationLevel;
    reason: string;
    stats: SchemaStats;
}> {
    const fullSchema = await generateContentSchema(editor, {
        includeDescriptions: true,
    });
    const stats = calculateSchemaStats(fullSchema);

    // Recommendations based on token count
    if (stats.estimatedTokens < 500) {
        return {
            level: 'none',
            reason: 'Schema is small, no optimization needed',
            stats,
        };
    }

    if (stats.estimatedTokens < 1500) {
        return {
            level: 'minimal',
            reason: 'Schema is moderate size, minimal optimization recommended',
            stats,
        };
    }

    if (stats.estimatedTokens < 3000) {
        return {
            level: 'balanced',
            reason: 'Schema is large, balanced optimization recommended',
            stats,
        };
    }

    return {
        level: 'aggressive',
        reason: 'Schema is very large, aggressive optimization strongly recommended',
        stats,
    };
}