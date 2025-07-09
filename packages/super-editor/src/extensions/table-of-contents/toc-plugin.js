import { Plugin } from 'prosemirror-state';

export const TocPlugin = () => {
  return new Plugin({
    key: 'tocPlugin',
    
    props: {},

    // Listen for document changes to update TOC entries
    appendTransaction: (transactions, oldState, newState) => {
      // Check if any headings were added, removed, or modified
      const hasHeadingChanges = transactions.some(tr => 
        tr.docChanged && tr.doc.descendants((node, pos) => {
          return node.type.name === 'heading' || 
                 (node.type.name === 'tocEntry' && tr.docChanged);
        })
      );

      if (hasHeadingChanges) {
        // Update TOC entries to reflect current heading structure
        updateTocEntries(newState);
      }

      return null;
    }
  });
};

/**
 * Update TOC entries to match current heading structure
 * @param {EditorState} state - The current editor state
 */
function updateTocEntries(state) {
  // This would be called when headings change
  // For now, we'll rely on the dynamic detection in scrollToHeading
  // In a full implementation, you might want to:
  // 1. Find all TOC entries
  // 2. Update their page numbers based on current heading positions
  // 3. Update their text if headings have changed
  // 4. Add/remove entries based on heading changes
}

/**
 * Get the text content of the TOC entry
 * @param {Element} tocElement - The TOC page number element
 * @returns {string} The text content of the TOC entry
 */
function getTocEntryText(tocElement) {
  const tocEntry = tocElement.closest('.sd-toc-entry');
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
  const tocEntry = tocElement.closest('.sd-toc-entry');
  if (!tocEntry) return 1;
  
  const level = tocEntry.getAttribute('data-level');
  return level ? parseInt(level, 10) : 1;
}

/**
 * Scroll to the heading using multiple detection strategies
 * @param {string} headingId - The ID of the heading to scroll to (if available)
 * @param {string} pageNumber - The page number as a fallback
 * @param {string} tocText - The text content of the TOC entry
 * @param {number} tocLevel - The level of the TOC entry
 */
function scrollToHeading(headingId, pageNumber, tocText, tocLevel) {
  // Strategy 1: Try to find the heading by ID first (if available)
  if (headingId && !headingId.startsWith('toc-')) {
    const headingElement = document.getElementById(headingId);
    if (headingElement) {
      headingElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
  }
  
  // Strategy 2: Find heading by exact text match and level
  if (tocText) {
    const headingElement = findHeadingByTextAndLevel(tocText, tocLevel);
    if (headingElement) {
      headingElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
  }
  
  // Strategy 3: Find heading by partial text match and level
  if (tocText) {
    const headingElement = findHeadingByPartialTextAndLevel(tocText, tocLevel);
    if (headingElement) {
      headingElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
  }
  
  // Strategy 4: Find heading by level only (fallback)
  if (tocLevel) {
    const headingElement = findHeadingByLevel(tocLevel);
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
 * Find heading by exact text match and level
 * @param {string} text - The text to match
 * @param {number} level - The heading level
 * @returns {Element|null} The matching heading element or null
 */
function findHeadingByTextAndLevel(text, level) {
  const headingTag = `h${level}`;
  const headings = document.querySelectorAll(headingTag);
  
  for (const heading of headings) {
    const headingText = heading.textContent.trim();
    if (headingText === text) {
      return heading;
    }
  }
  
  return null;
}

/**
 * Find heading by partial text match and level
 * @param {string} text - The text to match
 * @param {number} level - The heading level
 * @returns {Element|null} The matching heading element or null
 */
function findHeadingByPartialTextAndLevel(text, level) {
  const headingTag = `h${level}`;
  const headings = document.querySelectorAll(headingTag);
  
  for (const heading of headings) {
    const headingText = heading.textContent.trim();
    if (headingText.includes(text) || text.includes(headingText)) {
      return heading;
    }
  }
  
  return null;
}

/**
 * Find heading by level only
 * @param {number} level - The heading level
 * @returns {Element|null} The first heading of the specified level or null
 */
function findHeadingByLevel(level) {
  const headingTag = `h${level}`;
  const headings = document.querySelectorAll(headingTag);
  
  return headings.length > 0 ? headings[0] : null;
} 