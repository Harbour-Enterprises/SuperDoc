import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createCoverageGroupTitle,
  startCoverageGroup,
  showCoverageLegend,
  showProgressBar,
  showItemList,
  endCoverageGroup,
  computeCoverageSummary,
  displayCoverageReport,
  updateDisplayOptions,
  getDisplayOptions,
  setDisplayMode,
  displayNotHandledMessage,
} from './logger.js';

// Mock console methods
const mockConsole = {
  group: vi.fn(),
  groupCollapsed: vi.fn(),
  groupEnd: vi.fn(),
  log: vi.fn(),
};

describe('Coverage Logger', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();

    // Mock console methods
    global.console = mockConsole;

    // Reset display options to defaults
    setDisplayMode('compact');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createCoverageGroupTitle', () => {
    it('should create title with correct format and styles', () => {
      const result = createCoverageGroupTitle('w:document', 5, 10);

      expect(result.text).toBe('%c📊 Coverage%c w:document  %c5/10 (50%)');
      expect(result.styles).toHaveLength(3);
      expect(result.styles[0]).toContain('color:#AAAAAA'); // muted (from your current file)
      expect(result.styles[1]).toContain('color:#AAFFAA'); // primary (from your current file)
      expect(result.styles[2]).toContain('color:#d97706'); // warning (50%)
    });

    it('should use success color for high coverage', () => {
      const result = createCoverageGroupTitle('w:document', 9, 10);

      expect(result.text).toBe('%c📊 Coverage%c w:document  %c9/10 (90%)');
      expect(result.styles[2]).toContain('color:#059669'); // success
    });

    it('should use missing color for low coverage', () => {
      const result = createCoverageGroupTitle('w:document', 1, 10);

      expect(result.text).toBe('%c📊 Coverage%c w:document  %c1/10 (10%)');
      expect(result.styles[2]).toContain('color:#f97316'); // missing
    });

    it('should handle zero denominator as 100% coverage', () => {
      const result = createCoverageGroupTitle('w:document', 0, 0);

      expect(result.text).toBe('%c📊 Coverage%c w:document  %c0/0 (100%)');
      expect(result.styles[2]).toContain('color:#059669'); // success (100% - no children means perfect coverage)
    });

    it('should handle undefined values', () => {
      const result = createCoverageGroupTitle('w:document', undefined, null);

      expect(result.text).toBe('%c📊 Coverage%c w:document  %cundefined/null (100%)');
    });
  });

  describe('startCoverageGroup', () => {
    it('should call console.group when expandMainGroup is true', () => {
      const title = {
        text: '%cTest%cTitle',
        styles: ['color:red', 'color:blue'],
      };

      startCoverageGroup(title);

      expect(mockConsole.group).toHaveBeenCalledWith('%cTest%cTitle', 'color:red', 'color:blue');
      expect(mockConsole.groupCollapsed).not.toHaveBeenCalled();
    });

    it('should call console.groupCollapsed when expandMainGroup is false', () => {
      updateDisplayOptions({ expandMainGroup: false });
      const title = {
        text: '%cTest%cTitle',
        styles: ['color:red'],
      };

      startCoverageGroup(title);

      expect(mockConsole.groupCollapsed).toHaveBeenCalledWith('%cTest%cTitle', 'color:red');
      expect(mockConsole.group).not.toHaveBeenCalled();
    });
  });

  describe('showCoverageLegend', () => {
    it('should display legend with correct formatting', () => {
      showCoverageLegend();

      expect(mockConsole.log).toHaveBeenCalledWith(
        '%cLegend: %c✅ covered  %c⚠️ missing',
        'color:#AAAAAA', // muted (from your current file)
        'color:#059669;font-weight:700', // success
        'color:#f97316;font-weight:700', // missing
      );
    });
  });

  describe('showProgressBar', () => {
    it('should display progress bar when enabled', () => {
      showProgressBar(25);

      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('[█████░░░░░░░░░░░░░░░] 25%'),
        'color:#d97706;font-weight:700;background:#1f2937',
      );
    });

    it('should display full progress bar for 100%', () => {
      showProgressBar(100);

      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('[████████████████████] 100%'),
        'color:#d97706;font-weight:700;background:#1f2937',
      );
    });

    it('should display empty progress bar for 0%', () => {
      showProgressBar(0);

      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('[░░░░░░░░░░░░░░░░░░░░] 0%'),
        'color:#d97706;font-weight:700;background:#1f2937',
      );
    });

    it('should not display when showProgressBars is false', () => {
      updateDisplayOptions({ showProgressBars: false });

      showProgressBar(50);

      expect(mockConsole.log).not.toHaveBeenCalled();
    });

    it('should handle edge cases correctly', () => {
      showProgressBar(33); // Should round to nearest filled blocks

      expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining('] 33%'), expect.any(String));
    });
  });

  describe('showItemList', () => {
    const mockItems = ['w:p', 'w:r', 'w:t'];

    it('should display covered items with correct styling', () => {
      showItemList('Covered Items', mockItems, 'covered');

      expect(mockConsole.groupCollapsed).toHaveBeenCalledWith('%c✅ Covered Items', 'color:#059669;font-weight:700');

      expect(mockConsole.log).toHaveBeenCalledWith('%c• %s', 'color:#065f46', 'w:p');
      expect(mockConsole.log).toHaveBeenCalledWith('%c• %s', 'color:#065f46', 'w:r');
      expect(mockConsole.log).toHaveBeenCalledWith('%c• %s', 'color:#065f46', 'w:t');
      expect(mockConsole.log).toHaveBeenCalledWith('%c— 3 items', 'color:#AAAAAA');
      expect(mockConsole.groupEnd).toHaveBeenCalled();
    });

    it('should display missing items with correct styling', () => {
      showItemList('Missing Items', mockItems, 'missing');

      expect(mockConsole.groupCollapsed).toHaveBeenCalledWith('%c⚠️ Missing Items', 'color:#f97316;font-weight:700');

      expect(mockConsole.log).toHaveBeenCalledWith('%c• %s', 'color:#ea580c', 'w:p');
      expect(mockConsole.log).toHaveBeenCalledWith('%c• %s', 'color:#ea580c', 'w:r');
      expect(mockConsole.log).toHaveBeenCalledWith('%c• %s', 'color:#ea580c', 'w:t');
    });

    it('should handle empty list', () => {
      showItemList('Empty Items', [], 'covered');

      expect(mockConsole.log).toHaveBeenCalledWith('%cNo empty items.', 'color:#6b7280');
      expect(mockConsole.groupCollapsed).not.toHaveBeenCalled();
      expect(mockConsole.groupEnd).not.toHaveBeenCalled();
    });

    it('should handle null/undefined items', () => {
      showItemList('Test Items', null, 'covered');

      expect(mockConsole.log).toHaveBeenCalledWith('%cNo test items.', 'color:#6b7280');
    });

    it('should extract names from objects', () => {
      const objectItems = [{ qname: 'w:p' }, { xmlName: 'w:r' }, { name: 'w:t' }, { tag: 'w:br' }, 'w:tab'];

      showItemList('Object Items', objectItems, 'covered');

      expect(mockConsole.log).toHaveBeenCalledWith('%c• %s', expect.any(String), 'w:br');
      expect(mockConsole.log).toHaveBeenCalledWith('%c• %s', expect.any(String), 'w:p');
      expect(mockConsole.log).toHaveBeenCalledWith('%c• %s', expect.any(String), 'w:r');
      expect(mockConsole.log).toHaveBeenCalledWith('%c• %s', expect.any(String), 'w:t');
      expect(mockConsole.log).toHaveBeenCalledWith('%c• %s', expect.any(String), 'w:tab');
    });

    it('should sort items alphabetically', () => {
      const unsortedItems = ['w:z', 'w:a', 'w:m'];
      showItemList('Sorted Items', unsortedItems, 'covered');

      // Check that items were logged in sorted order
      const logCalls = mockConsole.log.mock.calls.filter((call) => call[0] === '%c• %s');

      expect(logCalls[0][2]).toBe('w:a');
      expect(logCalls[1][2]).toBe('w:m');
      expect(logCalls[2][2]).toBe('w:z');
    });

    it('should use expanded groups when collapseItemLists is false', () => {
      updateDisplayOptions({ collapseItemLists: false });

      showItemList('Expanded Items', mockItems, 'covered');

      expect(mockConsole.group).toHaveBeenCalledWith('%c✅ Expanded Items', 'color:#059669;font-weight:700');
      expect(mockConsole.groupCollapsed).not.toHaveBeenCalled();
    });

    it('should not show item counts when disabled', () => {
      updateDisplayOptions({ showItemCounts: false });

      showItemList('No Count Items', mockItems, 'covered');

      const countCall = mockConsole.log.mock.calls.find((call) => call[0].includes('—') && call[0].includes('items'));
      expect(countCall).toBeUndefined();
    });

    it('should handle singular vs plural items correctly', () => {
      showItemList('Single Item', ['w:p'], 'covered');

      expect(mockConsole.log).toHaveBeenCalledWith('%c— 1 item', 'color:#AAAAAA');
    });
  });

  describe('endCoverageGroup', () => {
    it('should call console.groupEnd', () => {
      endCoverageGroup();

      expect(mockConsole.groupEnd).toHaveBeenCalledWith();
    });
  });

  describe('computeCoverageSummary', () => {
    const allowedChildren = ['w:p', 'w:r', 'w:t', 'w:br', 'w:tab'];
    const handledSet = new Set(['w:p', 'w:r']);

    it('should compute coverage statistics correctly', () => {
      const result = computeCoverageSummary('w:document', allowedChildren, handledSet);

      expect(result).toEqual({
        tagName: 'w:document',
        totalCount: 5,
        coveredItems: ['w:p', 'w:r'],
        missingItems: ['w:t', 'w:br', 'w:tab'],
        coveragePercentage: 40,
      });
    });

    it('should handle empty children list', () => {
      const result = computeCoverageSummary('w:empty', [], handledSet);

      expect(result).toEqual({
        tagName: 'w:empty',
        totalCount: 0,
        coveredItems: [],
        missingItems: [],
        coveragePercentage: 100, // 0/0 should be 100% coverage
      });
    });

    it('should handle null children', () => {
      const result = computeCoverageSummary('w:null', null, handledSet);

      expect(result.totalCount).toBe(0);
      expect(result.coveredItems).toEqual([]);
      expect(result.missingItems).toEqual([]);
      expect(result.coveragePercentage).toBe(100); // null children should be 100% coverage
    });

    it('should filter out falsy children', () => {
      const childrenWithFalsyValues = ['w:p', null, '', undefined, 'w:r', false];
      const result = computeCoverageSummary('w:test', childrenWithFalsyValues, handledSet);

      expect(result.totalCount).toBe(2);
      expect(result.coveredItems).toEqual(['w:p', 'w:r']);
      expect(result.missingItems).toEqual([]);
    });

    it('should handle 100% coverage', () => {
      const fullHandledSet = new Set(['w:p', 'w:r', 'w:t', 'w:br', 'w:tab']);
      const result = computeCoverageSummary('w:complete', allowedChildren, fullHandledSet);

      expect(result.coveragePercentage).toBe(100);
      expect(result.coveredItems).toEqual(allowedChildren);
      expect(result.missingItems).toEqual([]);
    });

    it('should handle 0% coverage', () => {
      const emptyHandledSet = new Set();
      const result = computeCoverageSummary('w:incomplete', allowedChildren, emptyHandledSet);

      expect(result.coveragePercentage).toBe(0);
      expect(result.coveredItems).toEqual([]);
      expect(result.missingItems).toEqual(allowedChildren);
    });
  });

  describe('displayCoverageReport', () => {
    const allowedChildren = ['w:p', 'w:r', 'w:t'];
    const handledSet = new Set(['w:p']);

    it('should display complete coverage report', () => {
      const result = displayCoverageReport('w:test', allowedChildren, handledSet);

      // Check that all console methods were called
      expect(mockConsole.group).toHaveBeenCalled();
      expect(mockConsole.log).toHaveBeenCalledWith(
        '%cLegend: %c✅ covered  %c⚠️ missing',
        expect.any(String),
        expect.any(String),
        expect.any(String),
      );
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('['), // Progress bar
        expect.any(String),
      );
      expect(mockConsole.groupCollapsed).toHaveBeenCalledTimes(2); // Covered and Missing groups
      expect(mockConsole.groupEnd).toHaveBeenCalledTimes(3); // 2 item lists + 1 main group

      // Check return value
      expect(result).toEqual({
        tagName: 'w:test',
        totalCount: 3,
        coveredItems: ['w:p'],
        missingItems: ['w:r', 'w:t'],
        coveragePercentage: 33,
      });
    });
  });

  describe('updateDisplayOptions and getDisplayOptions', () => {
    it('should update display options', () => {
      const newOptions = {
        expandMainGroup: false,
        showProgressBars: false,
      };

      updateDisplayOptions(newOptions);
      const options = getDisplayOptions();

      expect(options.expandMainGroup).toBe(false);
      expect(options.showProgressBars).toBe(false);
      expect(options.collapseItemLists).toBe(true); // Should retain existing values
    });

    it('should return copy of options to prevent mutation', () => {
      const options1 = getDisplayOptions();
      const options2 = getDisplayOptions();

      options1.expandMainGroup = false;

      expect(options2.expandMainGroup).toBe(true); // Should not be affected
    });
  });

  describe('setDisplayMode', () => {
    it('should set compact mode correctly', () => {
      setDisplayMode('compact');
      const options = getDisplayOptions();

      expect(options).toEqual({
        expandMainGroup: true,
        collapseItemLists: true,
        showProgressBars: true,
        showItemCounts: true,
      });
    });

    it('should set expanded mode correctly', () => {
      setDisplayMode('expanded');
      const options = getDisplayOptions();

      expect(options).toEqual({
        expandMainGroup: true,
        collapseItemLists: false,
        showProgressBars: true,
        showItemCounts: true,
      });
    });

    it('should set minimal mode correctly', () => {
      setDisplayMode('minimal');
      const options = getDisplayOptions();

      expect(options).toEqual({
        expandMainGroup: false,
        collapseItemLists: true,
        showProgressBars: false,
        showItemCounts: false,
      });
    });

    it('should throw error for invalid mode', () => {
      expect(() => setDisplayMode('invalid')).toThrow(
        "Unknown display mode: invalid. Use 'compact', 'expanded', or 'minimal'.",
      );
    });
  });

  describe('Integration Tests', () => {
    it('should work end-to-end with different display modes', () => {
      const allowedChildren = ['w:p', 'w:r', 'w:t', 'w:br'];
      const handledSet = new Set(['w:p', 'w:r']);

      // Test compact mode
      setDisplayMode('compact');
      displayCoverageReport('w:test', allowedChildren, handledSet);

      expect(mockConsole.group).toHaveBeenCalled(); // Main group expanded
      expect(mockConsole.groupCollapsed).toHaveBeenCalled(); // Item lists collapsed

      vi.clearAllMocks();

      // Test expanded mode
      setDisplayMode('expanded');
      displayCoverageReport('w:test', allowedChildren, handledSet);

      expect(mockConsole.group).toHaveBeenCalledTimes(3); // Main group + 2 item lists expanded
      expect(mockConsole.groupCollapsed).not.toHaveBeenCalled();

      vi.clearAllMocks();

      // Test minimal mode
      setDisplayMode('minimal');
      displayCoverageReport('w:test', allowedChildren, handledSet);

      expect(mockConsole.groupCollapsed).toHaveBeenCalledWith(
        expect.stringContaining('Coverage'), // Main group collapsed
        expect.any(String),
        expect.any(String),
        expect.any(String),
      );

      // Progress bar should not be shown
      const progressBarCalls = mockConsole.log.mock.calls.filter(
        (call) => call[0].includes('[') && call[0].includes(']'),
      );
      expect(progressBarCalls).toHaveLength(0);
    });

    it('should handle edge cases gracefully', () => {
      // Empty data should be 100% coverage (perfect coverage of nothing)
      expect(() => displayCoverageReport('w:empty', [], new Set())).not.toThrow();

      // Null data should be 100% coverage
      expect(() => displayCoverageReport('w:null', null, new Set())).not.toThrow();

      // Large dataset
      const largeChildren = Array.from({ length: 100 }, (_, i) => `w:item${i}`);
      const largeHandledSet = new Set(largeChildren.slice(0, 50));

      expect(() => displayCoverageReport('w:large', largeChildren, largeHandledSet)).not.toThrow();
    });
  });

  describe('Helper Function Tests', () => {
    describe('calculatePercentage', () => {
      // These tests would be for the internal function if it was exported
      // Since it's not exported, we test it indirectly through other functions
      it('should calculate percentages correctly through computeCoverageSummary', () => {
        const result1 = computeCoverageSummary('test', ['a', 'b', 'c'], new Set(['a']));
        expect(result1.coveragePercentage).toBe(33);

        const result2 = computeCoverageSummary('test', ['a', 'b'], new Set(['a', 'b']));
        expect(result2.coveragePercentage).toBe(100);

        const result3 = computeCoverageSummary('test', ['a', 'b'], new Set());
        expect(result3.coveragePercentage).toBe(0);

        // Test the key fix: empty children should be 100% coverage
        const result4 = computeCoverageSummary('test', [], new Set());
        expect(result4.coveragePercentage).toBe(100);
      });
    });

    describe('createProgressBar', () => {
      // Test through showProgressBar function
      it('should create correct progress bars', () => {
        showProgressBar(0);
        expect(mockConsole.log).toHaveBeenCalledWith(
          expect.stringContaining('░░░░░░░░░░░░░░░░░░░░'), // All empty
          expect.any(String),
        );

        vi.clearAllMocks();

        showProgressBar(100);
        expect(mockConsole.log).toHaveBeenCalledWith(
          expect.stringContaining('████████████████████'), // All filled
          expect.any(String),
        );
      });
    });

    describe('extractItemName', () => {
      // Test through showItemList function
      it('should extract names correctly through showItemList', () => {
        const complexItems = [
          { qname: 'test1' },
          { xmlName: 'test2' },
          { name: 'test3' },
          { tag: 'test4' },
          'test5',
          { other: 'test6' }, // Should fall back to String()
        ];

        showItemList('Complex Items', complexItems, 'covered');

        expect(mockConsole.log).toHaveBeenCalledWith('%c• %s', expect.any(String), 'test1');
        expect(mockConsole.log).toHaveBeenCalledWith('%c• %s', expect.any(String), 'test2');
        expect(mockConsole.log).toHaveBeenCalledWith('%c• %s', expect.any(String), 'test3');
        expect(mockConsole.log).toHaveBeenCalledWith('%c• %s', expect.any(String), 'test4');
        expect(mockConsole.log).toHaveBeenCalledWith('%c• %s', expect.any(String), 'test5');
        expect(mockConsole.log).toHaveBeenCalledWith('%c• %s', expect.any(String), '[object Object]');
      });
    });
  });

  describe('displayNotHandledMessage', () => {
    it('should display a not handled message for a given tag name', () => {
      displayNotHandledMessage('w:unknown');

      expect(mockConsole.log).toHaveBeenCalledWith(
        '%c⚠️ Not Handled:%c w:unknown',
        'color:#AAAAAA',
        'color:#f97316;font-weight:700',
      );
    });
  });
});
