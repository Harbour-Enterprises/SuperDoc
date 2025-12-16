import { createLogger } from './logger/logger.js';
import { StateValidators } from './validators/state/index.js';
import { XmlValidators } from './validators/xml/index.js';
import type {
  DocumentAnalysis,
  ValidatorFunction,
  SuperValidatorOptions,
  ValidatorLogger,
  ValidationResult,
} from './types.js';
import type { Editor } from '../Editor.js';
import type { Mark, Node } from 'prosemirror-model';

/**
 * Main class for validating XML documents in the Super Editor.
 */
export class SuperValidator {
  #editor: Editor;
  #stateValidators: Record<string, ValidatorFunction>;
  #xmlValidators: Record<string, () => ValidationResult>;
  #requiredNodeTypes: Set<string>;
  #requiredMarkTypes: Set<string>;
  dryRun: boolean;
  debug: boolean;
  logger: ValidatorLogger;

  constructor(options: SuperValidatorOptions) {
    this.#editor = options.editor;
    this.dryRun = options.dryRun || false;
    this.debug = options.debug || false;
    this.logger = createLogger(this.debug);

    // Initialize validators and collect their requirements
    const { stateValidators, xmlValidators, nodeTypes, markTypes } = this.#initializeValidators();
    this.#stateValidators = stateValidators;
    this.#xmlValidators = xmlValidators;
    this.#requiredNodeTypes = nodeTypes;
    this.#requiredMarkTypes = markTypes;
  }

  /**
   * Initialize all validators and collect their element requirements
   * @returns {{ stateValidators: Record<string, ValidatorFunction>, xmlValidators: Record<string, ValidatorFunction>, nodeTypes: Set<string>, markTypes: Set<string> }}
   */
  #initializeValidators(): {
    stateValidators: Record<string, ValidatorFunction>;
    xmlValidators: Record<string, () => ValidationResult>;
    nodeTypes: Set<string>;
    markTypes: Set<string>;
  } {
    const requiredNodes = new Set<string>();
    const requiredMarks = new Set<string>();

    type ValidatorFactory = (params: {
      editor: Editor;
      logger: ValidatorLogger;
    }) => ValidatorFunction | (() => ValidationResult);

    const initializeValidatorSet = (
      validatorFactories: Record<string, ValidatorFactory>,
    ): Record<string, ValidatorFunction | (() => ValidationResult)> => {
      return Object.fromEntries(
        Object.entries(validatorFactories).map(([key, factory]) => {
          const validatorLogger = this.logger.withPrefix(key);
          const validator = factory({ editor: this.#editor, logger: validatorLogger });

          // Collect requirements from this validator
          this.#collectValidatorRequirements(validator, requiredNodes, requiredMarks);

          return [key, validator];
        }),
      );
    };

    const stateValidators = initializeValidatorSet(StateValidators as unknown as Record<string, ValidatorFactory>);
    const xmlValidators = initializeValidatorSet(XmlValidators as unknown as Record<string, ValidatorFactory>);

    return {
      stateValidators: stateValidators as Record<string, ValidatorFunction>,
      xmlValidators: xmlValidators as Record<string, () => ValidationResult>,
      nodeTypes: requiredNodes,
      markTypes: requiredMarks,
    };
  }

  /**
   * Extract and collect requirements from a validator
   */
  #collectValidatorRequirements(
    validator: ValidatorFunction | (() => ValidationResult),
    requiredNodes: Set<string>,
    requiredMarks: Set<string>,
  ): void {
    const validatorWithReqs = validator as ValidatorFunction;
    if (!validatorWithReqs.requiredElements) return;

    const requirements = validatorWithReqs.requiredElements;
    if (typeof requirements === 'object' && requirements !== null) {
      if (requirements.nodes && Array.isArray(requirements.nodes)) {
        requirements.nodes.forEach((nodeType) => {
          requiredNodes.add(nodeType);
        });
      }
      if (requirements.marks && Array.isArray(requirements.marks)) {
        requirements.marks.forEach((markType) => {
          requiredMarks.add(markType);
        });
      }
    }
  }

  /**
   * Analyze the document to collect all required elements
   */
  #analyzeDocument(): DocumentAnalysis {
    const { doc } = this.#editor.state;

    const analysis: DocumentAnalysis = {};

    // Initialize arrays for required element types
    this.#requiredNodeTypes.forEach((type) => {
      analysis[type] = [];
    });
    this.#requiredMarkTypes.forEach((type) => {
      analysis[type] = [];
    });

    const collectElements = (node: Node, pos: number): void => {
      // Collect nodes by type
      if (this.#requiredNodeTypes.has(node.type.name)) {
        const arr = analysis[node.type.name];
        if (arr) {
          arr.push({ node, pos });
        }
      }

      // Collect marks from text nodes
      if (node.isText && node.marks) {
        node.marks.forEach((mark: Mark) => {
          if (this.#requiredMarkTypes.has(mark.type.name)) {
            const arr = analysis[mark.type.name];
            if (arr) {
              arr.push({
                mark,
                node,
                pos,
                from: pos,
                to: pos + node.nodeSize,
              });
            }
          }
        });
      }
    };

    doc.descendants(collectElements);
    return analysis;
  }

  /**
   * Validate the active document in the editor. Triggered automatically on editor initialization.
   */
  validateActiveDocument(): { modified: boolean; results: Array<{ key: string; results: string[] }> } {
    const state = this.#editor.state;
    if (!state) return { modified: false, results: [] };

    const { tr } = state;

    const documentAnalysis = this.#analyzeDocument();
    this.logger.debug('Document analysis:', documentAnalysis);

    let hasModifiedDocument = false;
    const validationResults: Array<{ key: string; results: string[] }> = [];
    Object.entries(this.#stateValidators).forEach(([key, validator]) => {
      this.logger.debug(`🕵 Validating with ${key}...`);

      const { results, modified } = (validator as ValidatorFunction)(tr, documentAnalysis);
      validationResults.push({ key, results });

      hasModifiedDocument = hasModifiedDocument || modified;
    });

    if (!this.dryRun) {
      this.#dispatchWithFallback(tr);
    } else {
      this.logger.debug('DRY RUN: No changes applied to the document.');
    }

    this.logger.debug('Results:', validationResults);
    return { modified: hasModifiedDocument, results: validationResults };
  }

  /**
   * Validate the exported document in the editor. Triggered automatically on editor export.
   */
  validateDocumentExport(): { modified: boolean; results: Array<{ key: string; results: string[] }> } {
    const state = this.#editor.state;
    if (!state) return { modified: false, results: [] };
    const { tr } = state;

    let hasModifiedDocument = false;
    const validationResults: Array<{ key: string; results: string[] }> = [];

    // Run XML validators
    Object.entries(this.#xmlValidators).forEach(([key, validator]) => {
      this.logger.debug(`🕵 Validating export with ${key}...`);

      const { results, modified } = (validator as () => ValidationResult)();
      validationResults.push({ key, results });

      hasModifiedDocument = hasModifiedDocument || modified;
    });

    if (!this.dryRun && hasModifiedDocument) {
      this.#dispatchWithFallback(tr);
    } else {
      this.logger.debug('DRY RUN: No export changes applied to the document.');
    }

    this.logger.debug('Export validation results:', validationResults);
    return { modified: hasModifiedDocument, results: validationResults };
  }

  /**
   * Dispatch a transaction using the editor's public API if available, or fall back to the view.
   */
  #dispatchWithFallback(tr: import('prosemirror-state').Transaction): void {
    if (typeof this.#editor?.dispatch === 'function') {
      this.#editor.dispatch(tr);
      return;
    }
    this.#editor?.view?.dispatch?.(tr);
  }
}
