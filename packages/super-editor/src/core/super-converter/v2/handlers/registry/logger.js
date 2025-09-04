const CONSOLE_STYLES = {
  muted: 'color:#AAAAAA',
  primary: 'color:#AAFFAA;font-weight:700',
  success: 'color:#059669;font-weight:700',
  warning: 'color:#d97706;font-weight:700',
  missing: 'color:#f97316;font-weight:700',
  successSecondary: 'color:#065f46',
  missingSecondary: 'color:#ea580c',
  progressBar: 'color:#d97706;font-weight:700;background:#1f2937',
  dimmed: 'color:#6b7280',
};

const PROGRESS_BAR_LENGTH = 20;
const COVERAGE_THRESHOLDS = {
  good: 80,
  fair: 50,
};

const DISPLAY_OPTIONS = {
  expandMainGroup: true,
  collapseItemLists: true,
  showProgressBars: true,
  showItemCounts: true,
};

/**
 * Calculates percentage with safe division
 * @param {Number} numerator - The numerator value
 * @param {Number} denominator - The denominator value
 * @returns {Number} Percentage rounded to nearest integer
 */
function calculatePercentage(numerator, denominator) {
  if (!denominator || denominator === 0) {
    // If there are no items to cover, coverage is 100% (complete)
    return 100;
  }
  return Math.round((numerator / denominator) * 100);
}

/**
 * Creates a visual progress bar using Unicode characters
 * @param {Number} percentage - Percentage to display (0-100)
 * @param {Number} length - Length of the progress bar
 * @returns {String} Unicode progress bar
 */
function createProgressBar(percentage, length = PROGRESS_BAR_LENGTH) {
  const filledBlocks = Math.round((percentage / 100) * length);
  const emptyBlocks = length - filledBlocks;
  return '█'.repeat(filledBlocks) + '░'.repeat(emptyBlocks);
}

/**
 * Determines the appropriate color style based on coverage percentage
 * @param {Number} percentage - Coverage percentage
 * @returns {String} CSS style string
 */
function getCoverageColor(percentage) {
  if (percentage >= COVERAGE_THRESHOLDS.good) {
    return CONSOLE_STYLES.success;
  }
  if (percentage >= COVERAGE_THRESHOLDS.fair) {
    return CONSOLE_STYLES.warning;
  }
  return CONSOLE_STYLES.missing; // Orange for missing items instead of red
}

/**
 * Extracts a readable name from various object types
 * @param {*} item - Object to extract name from
 * @returns {String} Extracted name or string representation
 */
function extractItemName(item) {
  if (typeof item === 'string') {
    return item;
  }

  // Try common name properties in order of preference
  const nameProperties = ['qname', 'xmlName', 'name', 'tag'];

  for (const property of nameProperties) {
    if (item?.[property]) {
      return item[property];
    }
  }

  return String(item);
}

/**
 * Displays a message for unhandled tags
 * @param {String} tagName
 * @returns {void}
 */
export function displayNotHandledMessage(tagName) {
  const message = `%c⚠️ Not Handled:%c ${tagName}`;
  console.log(message, CONSOLE_STYLES.muted, CONSOLE_STYLES.missing);
}

/**
 * Creates a formatted title for coverage group display
 * @param {String} tagName - Name of the tag being analyzed
 * @param {Number} coveredCount - Number of covered items
 * @param {Number} totalCount - Total number of items
 * @returns {Object} Formatted title with text and styles
 */
export function createCoverageGroupTitle(tagName, coveredCount, totalCount) {
  const percentage = calculatePercentage(coveredCount, totalCount);

  return {
    text: `%c📊 Coverage%c ${tagName}  %c${coveredCount}/${totalCount} (${percentage}%)`,
    styles: [CONSOLE_STYLES.muted, CONSOLE_STYLES.primary, getCoverageColor(percentage)],
  };
}

/**
 * Starts a console group with the given title
 * @param {Object} title - Title object with text and styles
 */
export function startCoverageGroup(title) {
  if (DISPLAY_OPTIONS.expandMainGroup) {
    // Use expanded groups for main coverage groups to show legend and progress
    console.group(title.text, ...title.styles);
  } else {
    console.groupCollapsed(title.text, ...title.styles);
  }
}

/**
 * Displays a legend explaining the coverage symbols
 */
export function showCoverageLegend() {
  console.log(
    '%cLegend: %c✅ covered  %c⚠️ missing',
    CONSOLE_STYLES.muted,
    CONSOLE_STYLES.success,
    CONSOLE_STYLES.missing, // Orange for missing instead of red
  );
}

/**
 * Displays a progress bar for coverage percentage
 * @param {Number} percentage - Coverage percentage to display
 */
export function showProgressBar(percentage) {
  if (!DISPLAY_OPTIONS.showProgressBars) {
    return;
  }

  const progressBar = createProgressBar(percentage);
  console.log(`%c[${progressBar}] ${percentage}%`, CONSOLE_STYLES.progressBar);
}

/**
 * Displays a list of items with consistent formatting
 * @param {String} label - Label for the list (e.g., "Covered Items")
 * @param {Array} items - Array of items to display
 * @param {'covered'|'missing'} listType - Type of list for appropriate styling
 */
export function showItemList(label, items, listType) {
  const itemNames = (items || []).map(extractItemName).filter(Boolean).sort();

  if (itemNames.length === 0) {
    console.log(`%cNo ${label.toLowerCase()}.`, CONSOLE_STYLES.dimmed);
    return;
  }

  // Determine styling based on list type
  const isCoveredList = listType === 'covered';
  const headerIcon = isCoveredList ? '✅' : '⚠️'; // Warning icon instead of X
  const headerStyle = isCoveredList ? CONSOLE_STYLES.success : CONSOLE_STYLES.missing; // Orange instead of red
  const itemStyle = isCoveredList ? CONSOLE_STYLES.successSecondary : CONSOLE_STYLES.missingSecondary; // Orange secondary

  // Use collapsed groups for item lists to keep the display clean
  if (DISPLAY_OPTIONS.collapseItemLists) {
    console.groupCollapsed(`%c${headerIcon} ${label}`, headerStyle);
  } else {
    console.group(`%c${headerIcon} ${label}`, headerStyle);
  }

  // Display each item with bullet point
  itemNames.forEach((name) => {
    console.log('%c• %s', itemStyle, name);
  });

  // Show count if enabled
  if (DISPLAY_OPTIONS.showItemCounts) {
    const itemText = itemNames.length === 1 ? 'item' : 'items';
    console.log(`%c— ${itemNames.length} ${itemText}`, CONSOLE_STYLES.muted);
  }

  console.groupEnd();
}

/**
 * Ends the current console group
 */
export function endCoverageGroup() {
  console.groupEnd();
}

/**
 * Computes coverage statistics for a given tag and its children
 * @param {String} tagName - Name of the tag being analyzed
 * @param {Array} allowedChildren - Array of allowed child elements
 * @param {Set} handledItemsSet - Set of items that have been handled
 * @returns {Object} Coverage summary with statistics
 */
export function computeCoverageSummary(tagName, allowedChildren, handledItemsSet) {
  const validChildren = (allowedChildren || []).filter(Boolean);

  const coveredItems = validChildren.filter((child) => handledItemsSet.has(child));

  const missingItems = validChildren.filter((child) => !handledItemsSet.has(child));

  const coveragePercentage = calculatePercentage(coveredItems.length, validChildren.length);

  return {
    tagName,
    totalCount: validChildren.length,
    coveredItems,
    missingItems,
    coveragePercentage,
  };
}

/**
 * Displays a complete coverage report for a tag
 * @param {String} tagName - Name of the tag
 * @param {Array} allowedChildren - Array of allowed children
 * @param {Set} handledItemsSet - Set of handled items
 */
export function displayCoverageReport(tagName, allowedChildren, handledItemsSet) {
  const summary = computeCoverageSummary(tagName, allowedChildren, handledItemsSet);

  // Create and start the main group
  const title = createCoverageGroupTitle(summary.tagName, summary.coveredItems.length, summary.totalCount);

  startCoverageGroup(title);

  // Show legend and progress
  showCoverageLegend();
  showProgressBar(summary.coveragePercentage);

  // Show covered and missing items
  showItemList('Covered Items', summary.coveredItems, 'covered');
  showItemList('Missing Items', summary.missingItems, 'missing');

  endCoverageGroup();

  return summary;
}

/**
 * Updates display options for customizing output
 * @param {Object} options - Options to update
 * @param {Boolean} [options.expandMainGroup] - Whether to expand main coverage groups
 * @param {Boolean} [options.collapseItemLists] - Whether to collapse item lists
 * @param {Boolean} [options.showProgressBars] - Whether to show progress bars
 * @param {Boolean} [options.showItemCounts] - Whether to show item counts
 */
export function updateDisplayOptions(options) {
  Object.assign(DISPLAY_OPTIONS, options);
}

/**
 * Gets current display options
 * @returns {Object} Current display options
 */
export function getDisplayOptions() {
  return { ...DISPLAY_OPTIONS };
}

/**
 * Sets display mode for different use cases
 * @param {'compact'|'expanded'|'minimal'} mode - Display mode to set
 */
export function setDisplayMode(mode) {
  switch (mode) {
    case 'compact':
      // Main group expanded, lists collapsed - best for overview
      updateDisplayOptions({
        expandMainGroup: true,
        collapseItemLists: true,
        showProgressBars: true,
        showItemCounts: true,
      });
      break;
    case 'expanded':
      // Everything expanded - best for detailed analysis
      updateDisplayOptions({
        expandMainGroup: true,
        collapseItemLists: false,
        showProgressBars: true,
        showItemCounts: true,
      });
      break;
    case 'minimal':
      // Everything collapsed - best for large reports
      updateDisplayOptions({
        expandMainGroup: false,
        collapseItemLists: true,
        showProgressBars: false,
        showItemCounts: false,
      });
      break;
    default:
      throw new Error(`Unknown display mode: ${mode}. Use 'compact', 'expanded', or 'minimal'.`);
  }
}
