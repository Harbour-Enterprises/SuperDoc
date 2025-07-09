import { Plugin } from 'prosemirror-state';

export const TocPlugin = () => {
  return new Plugin({
    key: 'tocPlugin',
    
    props: {},

    // Note: TOC update logic is currently unused
    // This plugin is prepared for future TOC synchronization features
    // appendTransaction: (transactions, oldState, newState) => {
    //   // Future implementation for automatic TOC updates
    //   return null;
    // }
  });
};

/**
 * Get the TOC entry element from a TOC page number element
 * @param {Element} tocElement - The TOC page number element
 * @returns {Element|null} The TOC entry element or null
 */
function getTocEntryElement(tocElement) {
  return tocElement.closest('.sd-toc-entry');
}

/**
 * Get the text content of the TOC entry
 * @param {Element} tocElement - The TOC page number element
 * @returns {string} The text content of the TOC entry
 */
function getTocEntryText(tocElement) {
  const tocEntry = getTocEntryElement(tocElement);
  if (!tocEntry) return '';
  
  const textElement = tocEntry.querySelector('.toc-text');
  return textElement ? textElement.textContent.trim() : '';
}

/**
 * Get the level of the TOC entry
 * @param {Element} tocElement - The TOC page number element
 * @returns {number} The TOC level (1, 2, 3, etc.)
 */
function getTocEntryLevel(tocElement) {
  const tocEntry = getTocEntryElement(tocElement);
  if (!tocEntry) return 1;
  
  const level = tocEntry.getAttribute('data-level');
  return level ? parseInt(level, 10) : 1;
}

/**
 * Scroll to the heading using multiple detection strategies
 * @param {string} headingId - The ID of the heading to scroll to (if available)
 * @param {string} tocText - The text content of the TOC entry
 * @param {number} tocLevel - The level of the TOC entry
 */
function scrollToHeading(headingId, tocText, tocLevel) {
  // Strategy 1: Try to find the heading by ID first (if available)
  if (headingId && !headingId.startsWith('toc-')) {
    const headingElement = document.getElementById(headingId);
    if (headingElement) {
      headingElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
  }
  
  // Strategy 2-4: Use optimized heading search
  if (tocText || tocLevel) {
    const headingElement = findHeadingOptimized(tocText, tocLevel);
    if (headingElement) {
      headingElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
  }
  
  // Strategy 5: Find any heading (last resort)
  const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
  if (headings.length > 0) {
    headings[0].scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

/**
 * Optimized heading search that combines all strategies in a single DOM query
 * @param {string} text - The text to match (optional)
 * @param {number} level - The heading level (optional)
 * @returns {Element|null} The matching heading element or null
 */
function findHeadingOptimized(text, level) {
  // Determine which heading tags to search
  const headingTags = level ? [`h${level}`] : ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
  
  // Single DOM query for all relevant headings
  const headings = document.querySelectorAll(headingTags.join(', '));
  
  if (!text) {
    // If no text provided, return first heading of specified level
    return headings.length > 0 ? headings[0] : null;
  }
  
  // Search through headings with text matching
  for (const heading of headings) {
    const headingText = heading.textContent.trim();
    
    // Exact match (highest priority)
    if (headingText === text) {
      return heading;
    }
    
    // Partial match (lower priority)
    if (headingText.includes(text) || text.includes(headingText)) {
      return heading;
    }
  }
  
  return null;
} 