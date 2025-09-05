import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HandlerRegistry } from './handler-registry.js';

vi.mock('../index.js', () => ({
  registeredHandlers: {},
}));

vi.mock('@superdoc-dev/ooxml-oracle', () => ({
  childrenOf: vi.fn(),
}));

vi.mock('./logger.js', () => ({
  createCoverageGroupTitle: vi.fn(),
  startCoverageGroup: vi.fn(),
  showCoverageLegend: vi.fn(),
  showProgressBar: vi.fn(),
  showItemList: vi.fn(),
  endCoverageGroup: vi.fn(),
  computeCoverageSummary: vi.fn(),
  displayCoverageReport: vi.fn(),
  displayNotHandledMessage: vi.fn(),
}));

import { registeredHandlers } from '../index.js';
import { childrenOf } from '@superdoc-dev/ooxml-oracle';
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

describe('HandlerRegistry', () => {
  let registry;

  // Helper function to setup mock handlers
  const setupMockHandlers = (handlerData) => {
    // Clear existing properties
    Object.keys(registeredHandlers).forEach((key) => {
      delete registeredHandlers[key];
    });
    // Set new properties
    Object.assign(registeredHandlers, handlerData);
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Clear all properties from registeredHandlers mock
    Object.keys(registeredHandlers).forEach((key) => {
      delete registeredHandlers[key];
    });

    registry = new HandlerRegistry();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Constructor and Basic Properties', () => {
    it('should initialize with registeredHandlers', () => {
      expect(registry.handlers).toBe(registeredHandlers);
    });

    it('should create new instance each time', () => {
      const registry1 = new HandlerRegistry();
      const registry2 = new HandlerRegistry();

      expect(registry1).not.toBe(registry2);
      expect(registry1.handlers).toBe(registry2.handlers);
    });
  });

  describe('handlers getter', () => {
    it('should return the registered handlers', () => {
      const mockHandlers = { test: 'handlers' };
      registeredHandlers.mockValue = mockHandlers;

      const newRegistry = new HandlerRegistry();
      expect(newRegistry.handlers).toBe(registeredHandlers);
    });
  });

  describe('#buildHandledSet', () => {
    it('should build set from handlers.all array', () => {
      setupMockHandlers({
        all: [{ xmlName: 'w:p' }, { xmlName: 'w:r' }, { xmlName: 'w:t' }],
      });

      const newRegistry = new HandlerRegistry();
      const handledNames = newRegistry.getHandledXmlNames();

      expect(handledNames).toEqual(['w:p', 'w:r', 'w:t']);
    });

    it('should build set from handlers object values when no all array', () => {
      setupMockHandlers({
        handler1: { xmlName: 'w:p' },
        handler2: { xmlName: 'w:r' },
        handler3: { xmlName: 'w:t' },
      });

      const newRegistry = new HandlerRegistry();
      const handledNames = newRegistry.getHandledXmlNames();

      expect(handledNames.sort()).toEqual(['w:p', 'w:r', 'w:t']);
    });

    it('should filter out handlers without xmlName', () => {
      setupMockHandlers({
        all: [
          { xmlName: 'w:p' },
          { name: 'no-xml-name' },
          null,
          undefined,
          { xmlName: 'w:r' },
          { xmlName: '' },
          { xmlName: 'w:t' },
        ],
      });

      const newRegistry = new HandlerRegistry();
      const handledNames = newRegistry.getHandledXmlNames();

      expect(handledNames).toEqual(['w:p', 'w:r', 'w:t']);
    });

    it('should handle empty handlers', () => {
      setupMockHandlers({});

      const newRegistry = new HandlerRegistry();
      const handledNames = newRegistry.getHandledXmlNames();

      expect(handledNames).toEqual([]);
    });

    it('should handle null/undefined handlers', () => {
      setupMockHandlers({ all: null });

      const newRegistry = new HandlerRegistry();
      const handledNames = newRegistry.getHandledXmlNames();

      expect(handledNames).toEqual([]);
    });
  });

  describe('getHandlerCount', () => {
    it('should return correct count of handlers', () => {
      setupMockHandlers({
        all: [{ xmlName: 'w:p' }, { xmlName: 'w:r' }, { xmlName: 'w:t' }],
      });

      const newRegistry = new HandlerRegistry();
      expect(newRegistry.getHandlerCount()).toBe(3);
    });

    it('should return 0 for empty handlers', () => {
      setupMockHandlers({});

      const newRegistry = new HandlerRegistry();
      expect(newRegistry.getHandlerCount()).toBe(0);
    });

    it('should not count duplicate xmlNames', () => {
      setupMockHandlers({
        all: [
          { xmlName: 'w:p' },
          { xmlName: 'w:p' }, // Duplicate
          { xmlName: 'w:r' },
        ],
      });

      const newRegistry = new HandlerRegistry();
      expect(newRegistry.getHandlerCount()).toBe(2); // Set removes duplicates
    });
  });

  describe('getHandledXmlNames', () => {
    it('should return sorted array of XML names', () => {
      setupMockHandlers({
        all: [{ xmlName: 'w:t' }, { xmlName: 'w:p' }, { xmlName: 'w:r' }],
      });

      const newRegistry = new HandlerRegistry();
      const names = newRegistry.getHandledXmlNames();

      expect(names).toEqual(['w:p', 'w:r', 'w:t']); // Sorted
      expect(Array.isArray(names)).toBe(true);
    });

    it('should return empty array when no handlers', () => {
      setupMockHandlers({});

      const newRegistry = new HandlerRegistry();
      const names = newRegistry.getHandledXmlNames();

      expect(names).toEqual([]);
      expect(Array.isArray(names)).toBe(true);
    });
  });

  describe('getCoverageStats', () => {
    beforeEach(() => {
      setupMockHandlers({
        all: [{ xmlName: 'w:p' }, { xmlName: 'w:r' }],
      });

      childrenOf.mockReturnValue(['w:p', 'w:r', 'w:t', 'w:br']);
      computeCoverageSummary.mockReturnValue({
        tagName: 'w:document',
        totalCount: 4,
        coveredItems: ['w:p', 'w:r'],
        missingItems: ['w:t', 'w:br'],
        coveragePercentage: 50,
      });
    });

    it('should return coverage statistics without console output', () => {
      const result = registry.getCoverageStats('w:document');

      expect(childrenOf).toHaveBeenCalledWith('w:document');
      expect(computeCoverageSummary).toHaveBeenCalledWith('w:document', ['w:p', 'w:r', 'w:t', 'w:br'], expect.any(Set));

      expect(result).toEqual({
        tagName: 'w:document',
        total: 4,
        covered: ['w:p', 'w:r'],
        missing: ['w:t', 'w:br'],
        percent: 50,
      });

      // Should not call any console display functions
      expect(startCoverageGroup).not.toHaveBeenCalled();
      expect(showCoverageLegend).not.toHaveBeenCalled();
      expect(showProgressBar).not.toHaveBeenCalled();
    });

    it('should pass correct handled set to computeCoverageSummary', () => {
      registry.getCoverageStats('w:test');

      const calledSet = computeCoverageSummary.mock.calls[0][2];
      expect(calledSet).toBeInstanceOf(Set);
      expect([...calledSet].sort()).toEqual(['w:p', 'w:r']);
    });
  });

  describe('coverage', () => {
    beforeEach(() => {
      setupMockHandlers({
        all: [{ xmlName: 'w:p' }, { xmlName: 'w:r' }],
      });

      childrenOf.mockReturnValue(['w:p', 'w:r', 'w:t']);
      computeCoverageSummary.mockReturnValue({
        tagName: 'w:document',
        totalCount: 3,
        coveredItems: ['w:p', 'w:r'],
        missingItems: ['w:t'],
        coveragePercentage: 67,
      });

      createCoverageGroupTitle.mockReturnValue({
        text: '%cCoverage%c w:document  %c2/3 (67%)',
        styles: ['color1', 'color2', 'color3'],
      });
    });

    it('should handle empty coverage correctly', () => {
      computeCoverageSummary.mockReturnValue({
        tagName: 'w:empty',
        totalCount: 0,
        coveredItems: [],
        missingItems: [],
        coveragePercentage: 0,
      });

      registry.coverage('w:empty');
      expect(displayNotHandledMessage).toHaveBeenCalled();
    });
  });

  describe('coverageReport', () => {
    beforeEach(() => {
      setupMockHandlers({
        all: [{ xmlName: 'w:p' }],
      });

      childrenOf.mockReturnValue(['w:p', 'w:t']);
      displayCoverageReport.mockReturnValue({
        tagName: 'w:test',
        totalCount: 2,
        coveredItems: ['w:p'],
        missingItems: ['w:t'],
        coveragePercentage: 50,
      });
    });

    it('should use displayCoverageReport function', () => {
      const result = registry.coverageReport('w:test');

      expect(childrenOf).toHaveBeenCalledWith('w:test');
      expect(displayCoverageReport).toHaveBeenCalledWith('w:test', ['w:p', 'w:t'], expect.any(Set));

      expect(result).toEqual({
        tagName: 'w:test',
        total: 2,
        covered: ['w:p'],
        missing: ['w:t'],
        percent: 50,
      });
    });
  });

  describe('multipleCoverage', () => {
    beforeEach(() => {
      setupMockHandlers({
        all: [{ xmlName: 'w:p' }, { xmlName: 'w:r' }],
      });

      childrenOf.mockImplementation((tagName) => {
        const childrenMap = {
          'w:document': ['w:p', 'w:r', 'w:t'],
          'w:body': ['w:p', 'w:table'],
          'w:p': ['w:r', 'w:br'],
        };
        return childrenMap[tagName] || [];
      });

      computeCoverageSummary.mockImplementation((tagName, children, handledSet) => {
        const covered = children.filter((child) => handledSet.has(child));
        const missing = children.filter((child) => !handledSet.has(child));
        return {
          tagName,
          totalCount: children.length,
          coveredItems: covered,
          missingItems: missing,
          coveragePercentage: Math.round((covered.length / children.length) * 100),
        };
      });
    });

    it('should analyze coverage for multiple tags', () => {
      const result = registry.multipleCoverage(['w:document', 'w:body', 'w:p']);

      expect(result).toHaveLength(3);
      expect(result[0].tagName).toBe('w:document');
      expect(result[1].tagName).toBe('w:body');
      expect(result[2].tagName).toBe('w:p');

      // Check that each tag was processed
      expect(childrenOf).toHaveBeenCalledWith('w:document');
      expect(childrenOf).toHaveBeenCalledWith('w:body');
      expect(childrenOf).toHaveBeenCalledWith('w:p');
      expect(computeCoverageSummary).toHaveBeenCalledTimes(3);
    });

    it('should handle empty array', () => {
      const result = registry.multipleCoverage([]);

      expect(result).toEqual([]);
      expect(childrenOf).not.toHaveBeenCalled();
      expect(computeCoverageSummary).not.toHaveBeenCalled();
    });

    it('should throw error for non-array input', () => {
      expect(() => registry.multipleCoverage('not-an-array')).toThrow('tagNames must be an array');
      expect(() => registry.multipleCoverage(null)).toThrow('tagNames must be an array');
      expect(() => registry.multipleCoverage(undefined)).toThrow('tagNames must be an array');
      expect(() => registry.multipleCoverage(123)).toThrow('tagNames must be an array');
    });

    it('should handle array with single element', () => {
      const result = registry.multipleCoverage(['w:document']);

      expect(result).toHaveLength(1);
      expect(result[0].tagName).toBe('w:document');
    });
  });

  describe('Integration Tests', () => {
    beforeEach(() => {
      setupMockHandlers({
        all: [{ xmlName: 'w:p' }, { xmlName: 'w:r' }, { xmlName: 'w:t' }],
      });
    });

    it('should work with realistic OOXML data', () => {
      childrenOf.mockReturnValue(['w:p', 'w:tbl', 'w:sectPr', 'w:bookmarkStart', 'w:bookmarkEnd', 'w:r', 'w:t']);

      computeCoverageSummary.mockReturnValue({
        tagName: 'w:document',
        totalCount: 7,
        coveredItems: ['w:p', 'w:r', 'w:t'],
        missingItems: ['w:tbl', 'w:sectPr', 'w:bookmarkStart', 'w:bookmarkEnd'],
        coveragePercentage: 43,
      });

      const result = registry.getCoverageStats('w:document');

      expect(result.total).toBe(7);
      expect(result.covered).toHaveLength(3);
      expect(result.missing).toHaveLength(4);
      expect(result.percent).toBe(43);
    });

    it('should maintain consistency across different methods', () => {
      childrenOf.mockReturnValue(['w:p', 'w:r']);
      computeCoverageSummary.mockReturnValue({
        tagName: 'w:test',
        totalCount: 2,
        coveredItems: ['w:p', 'w:r'],
        missingItems: [],
        coveragePercentage: 100,
      });
      displayCoverageReport.mockReturnValue({
        tagName: 'w:test',
        totalCount: 2,
        coveredItems: ['w:p', 'w:r'],
        missingItems: [],
        coveragePercentage: 100,
      });

      const stats = registry.getCoverageStats('w:r');
      const coverage = registry.coverage('w:r');
      const report = registry.coverageReport('w:r');

      // All methods should return equivalent data (just different property names)
      expect(stats.total).toBe(coverage.total);
      expect(stats.total).toBe(report.total);
      expect(stats.covered).toEqual(coverage.covered);
      expect(stats.covered).toEqual(report.covered);
      expect(stats.percent).toBe(coverage.percent);
      expect(stats.percent).toBe(report.percent);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle malformed handler objects', () => {
      setupMockHandlers({
        all: [
          { xmlName: 'w:p' },
          { notXmlName: 'should-be-ignored' },
          null,
          undefined,
          { xmlName: null },
          { xmlName: '' },
          'string-handler',
          123,
        ],
      });

      const newRegistry = new HandlerRegistry();
      const names = newRegistry.getHandledXmlNames();

      expect(names).toEqual(['w:p']); // Only valid xmlName
      expect(newRegistry.getHandlerCount()).toBe(1);
    });

    it('should handle childrenOf returning null/undefined', () => {
      childrenOf.mockReturnValue(null);
      computeCoverageSummary.mockReturnValue({
        tagName: 'w:null',
        totalCount: 0,
        coveredItems: [],
        missingItems: [],
        coveragePercentage: 0,
      });

      const result = registry.getCoverageStats('w:null');

      expect(result.total).toBe(0);
      expect(computeCoverageSummary).toHaveBeenCalledWith('w:null', null, expect.any(Set));
    });

    it('should handle very large datasets', () => {
      // Create large handler set
      setupMockHandlers({
        all: Array.from({ length: 1000 }, (_, i) => ({ xmlName: `w:element${i}` })),
      });

      // Set up mocks needed for getCoverageStats
      childrenOf.mockReturnValue(['w:element1', 'w:element2']);
      computeCoverageSummary.mockReturnValue({
        tagName: 'w:test',
        totalCount: 2,
        coveredItems: ['w:element1'],
        missingItems: ['w:element2'],
        coveragePercentage: 50,
      });

      const newRegistry = new HandlerRegistry();

      expect(newRegistry.getHandlerCount()).toBe(1000);
      expect(() => newRegistry.getHandledXmlNames()).not.toThrow();
      expect(() => newRegistry.getCoverageStats('w:test')).not.toThrow();
    });

    it('should handle empty string tag names', () => {
      childrenOf.mockReturnValue([]);
      computeCoverageSummary.mockReturnValue({
        tagName: '',
        totalCount: 0,
        coveredItems: [],
        missingItems: [],
        coveragePercentage: 0,
      });

      expect(() => registry.getCoverageStats('')).not.toThrow();
    });
  });

  describe('Performance and Memory', () => {
    it('should not recreate handled set unnecessarily', () => {
      setupMockHandlers({
        all: [{ xmlName: 'w:p' }],
      });

      // Set up mocks needed for getCoverageStats
      childrenOf.mockReturnValue(['w:p', 'w:r']);
      computeCoverageSummary.mockReturnValue({
        tagName: 'w:test',
        totalCount: 2,
        coveredItems: ['w:p'],
        missingItems: ['w:r'],
        coveragePercentage: 50,
      });

      const newRegistry = new HandlerRegistry();

      // Multiple calls should work efficiently
      newRegistry.getHandlerCount();
      newRegistry.getHandledXmlNames();
      newRegistry.getCoverageStats('w:test');

      // Each call should create its own set, but efficiently
      expect(() => {
        for (let i = 0; i < 100; i++) {
          newRegistry.getHandlerCount();
        }
      }).not.toThrow();
    });

    it('should handle Set operations correctly', () => {
      setupMockHandlers({
        all: [
          { xmlName: 'w:p' },
          { xmlName: 'w:p' }, // Duplicate
          { xmlName: 'w:r' },
        ],
      });

      const newRegistry = new HandlerRegistry();

      // Set should automatically handle duplicates
      expect(newRegistry.getHandlerCount()).toBe(2);
      expect(newRegistry.getHandledXmlNames()).toEqual(['w:p', 'w:r']);
    });
  });
});
