import { registeredHandlers } from '../index.js';
import { childrenOf } from '@superdoc-dev/ooxml-inspector';
import {
  createCoverageGroupTitle,
  startCoverageGroup,
  showCoverageLegend,
  showProgressBar,
  showItemList,
  endCoverageGroup,
  computeCoverageSummary,
  displayCoverageReport,
  displayNotHandledMessage,
} from './logger.js';

/**
 * The handler registry class for managing document handlers.
 * Provides methods to analyze coverage of registered handlers against OOXML specifications.
 */
export class HandlerRegistry {
  /** @type {import('../index.js').RegisteredHandlers} */
  #registeredHandlers;

  constructor() {
    this.#registeredHandlers = registeredHandlers;
  }

  /**
   * Gets the registered handlers
   * @returns {import('../index.js').RegisteredHandlers} The registered handlers
   */
  get handlers() {
    return this.#registeredHandlers;
  }

  /**
   * Builds a set of handled XML names from the registered handlers
   * @returns {Set<string>} Set of XML names that have handlers
   */
  #buildHandledSet() {
    let handlerList = [];

    if (Array.isArray(this.#registeredHandlers?.all)) {
      handlerList = this.#registeredHandlers.all;
    } else if (this.#registeredHandlers) {
      handlerList = Object.values(this.#registeredHandlers);
    }

    return new Set(handlerList.map((handler) => handler?.xmlName).filter(Boolean));
  }

  /**
   * Analyzes and displays coverage for a specific XML tag
   * @param {string} tagName - The XML tag name to analyze coverage for
   * @returns {Object} Coverage summary object
   */
  coverage(tagName) {
    const handledSet = this.#buildHandledSet();
    if (!handledSet.has(tagName)) {
      displayNotHandledMessage(tagName);
      return;
    }

    const allowedChildren = childrenOf(tagName);
    const summary = computeCoverageSummary(tagName, allowedChildren, handledSet);

    // Display the coverage report using the new API
    const title = createCoverageGroupTitle(summary.tagName, summary.coveredItems.length, summary.totalCount);

    startCoverageGroup(title);
    showCoverageLegend();
    showProgressBar(summary.coveragePercentage);
    showItemList(`Covered (${summary.coveredItems.length})`, summary.coveredItems, 'covered');
    showItemList(`Missing (${summary.missingItems.length})`, summary.missingItems, 'missing');
    endCoverageGroup();

    // Return summary in legacy format for backward compatibility
    return {
      tagName: summary.tagName,
      total: summary.totalCount,
      covered: summary.coveredItems,
      missing: summary.missingItems,
      percent: summary.coveragePercentage,
    };
  }

  /**
   * Simplified coverage analysis using the all-in-one report function
   * @param {string} tagName - The XML tag name to analyze coverage for
   * @returns {Object} Coverage summary object
   */
  coverageReport(tagName) {
    const handledSet = this.#buildHandledSet();
    const allowedChildren = childrenOf(tagName);

    const summary = displayCoverageReport(tagName, allowedChildren, handledSet);

    // Return summary in legacy format for backward compatibility
    return {
      tagName: summary.tagName,
      total: summary.totalCount,
      covered: summary.coveredItems,
      missing: summary.missingItems,
      percent: summary.coveragePercentage,
    };
  }

  /**
   * Gets coverage statistics without displaying console output
   * @param {string} tagName - The XML tag name to analyze coverage for
   * @returns {Object} Coverage summary object
   */
  getCoverageStats(tagName) {
    const handledSet = this.#buildHandledSet();
    const allowedChildren = childrenOf(tagName);
    const summary = computeCoverageSummary(tagName, allowedChildren, handledSet);

    // Return summary in legacy format for backward compatibility
    return {
      tagName: summary.tagName,
      total: summary.totalCount,
      covered: summary.coveredItems,
      missing: summary.missingItems,
      percent: summary.coveragePercentage,
    };
  }

  /**
   * Analyzes coverage for multiple tags
   * @param {string[]} tagNames - Array of XML tag names to analyze
   * @returns {Object[]} Array of coverage summary objects
   */
  multipleCoverage(tagNames) {
    if (!Array.isArray(tagNames)) {
      throw new Error('tagNames must be an array');
    }

    return tagNames.map((tagName) => this.getCoverageStats(tagName));
  }

  /**
   * Gets the total number of registered handlers
   * @returns {number} Number of registered handlers
   */
  getHandlerCount() {
    const handledSet = this.#buildHandledSet();
    return handledSet.size;
  }

  /**
   * Gets all handled XML names
   * @returns {string[]} Array of XML names that have handlers
   */
  getHandledXmlNames() {
    const handledSet = this.#buildHandledSet();
    return Array.from(handledSet).sort();
  }
}
