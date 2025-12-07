/**
 * Schema generation, optimization, and validation
 * @module ai-builder/schema
 */

export {
    generateContentSchema,
    getContentSchema,
    clearSchemaCache,
    generateLegacyContentSchema,
    type SchemaGeneratorOptions,
} from './schema-generator';

export {
    generateOptimizedSchema,
    calculateSchemaStats,
    compareOptimizations,
    getRecommendedOptimization,
    type OptimizationLevel,
    type SchemaOptimizationOptions,
    type SchemaStats,
} from './schema-optimizer';

export {
    validateContent,
    autoFixContent,
    formatValidationErrors,
    type ValidationResult,
    type ValidationError,
    type ValidationWarning,
} from './schema-validator';

// Legacy content schema (deprecated - use generateContentSchema instead)
export { CONTENT_SCHEMA } from './content-schema';