/**
 * Handler for docPartObject: docPartGallery node type of 'Table of contents'
 * @param {*} params
 * @returns {Array} The processed nodes
 */
export const tableOfContentsHandler = (params) => {
  const { nodes, docx, nodeListHandler } = params;
  
  if (!nodes || nodes.length === 0) {
    return [];
  }

  const node = nodes[0];
  const sdtContent = node.elements?.find((el) => el.name === 'w:sdtContent');
  
  if (!sdtContent || !sdtContent.elements) {
    return [];
  }

  // Process the TOC content to extract entries
  const tocEntries = [];
  const processedElements = nodeListHandler.handler({ 
    ...params, 
    nodes: sdtContent.elements 
  });

  // Convert paragraphs to TOC entries
  processedElements.forEach((element) => {
    if (element.type === 'paragraph') {
      // Extract text content for heading ID generation
      const textContent = element.content?.map(item => item.text || '').join(' ') || '';
      const headingId = generateHeadingId(textContent);
      
      const tocEntry = {
        type: 'tocEntry',
        content: element.content || [],
        attrs: {
          level: extractTocLevel(element),
          headingId: headingId || extractHeadingId(element),
          pageNumber: extractPageNumber(element),
          isHyperlink: hasHyperlink(element),
          attributes: element.attrs || {},
        },
      };
      tocEntries.push(tocEntry);
    }
  });

  // Create the main TOC node
  const tocNode = {
    type: 'tableOfContents',
    content: tocEntries,
    attrs: {
      tocStyle: 'standard',
      title: 'Table of Contents',
      showPageNumbers: true,
      rightAlignPageNumbers: true,
      useHyperlinks: true,
      includeHeadingLevels: [1, 2, 3],
      attributes: {},
    },
  };

  return [tocNode];
};

/**
 * Extract TOC level from paragraph styling
 */
function extractTocLevel(element) {
  // Look for TOC level in style attributes
  const attrs = element.attrs || {};
  const styleId = attrs.styleId;
  
  if (styleId) {
    const match = styleId.match(/toc(\d+)/i);
    if (match) {
      return parseInt(match[1], 10);
    }
  }
  
  // Default to level 1
  return 1;
}

/**
 * Extract heading ID from hyperlink references
 */
function extractHeadingId(element) {
  // Look for hyperlink marks or attributes that reference headings
  const content = element.content || [];
  for (const item of content) {
    if (item.marks) {
      const linkMark = item.marks.find(mark => mark.type === 'link');
      if (linkMark && linkMark.attrs && linkMark.attrs.href) {
        const href = linkMark.attrs.href;
        if (href.startsWith('#')) {
          return href.substring(1);
        }
      }
    }
  }
  return null;
}

/**
 * Generate a heading ID from text content
 * @param {string} text The text to convert to an ID
 * @returns {string} A URL-safe heading ID
 */
function generateHeadingId(text) {
  if (!text) return '';
  
  // Convert to lowercase and replace spaces/special chars with hyphens
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters except hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Extract page number from TOC entry
 * Improved to handle the complex structure of DOCX TOC entries where page numbers
 * often appear after tab characters in separate text runs
 */
function extractPageNumber(element) {
  const content = element.content || [];
  
  // Strategy 1: Look for numbers after tab nodes
  for (let i = 0; i < content.length; i++) {
    const item = content[i];
    
    // If we find a tab, check the next text nodes for page numbers
    if (item.type === 'tab') {
      for (let j = i + 1; j < content.length; j++) {
        const nextItem = content[j];
        if (nextItem.type === 'text' && nextItem.text) {
          const trimmedText = nextItem.text.trim();
          // Look for standalone numbers (page numbers)
          const pageMatch = trimmedText.match(/^\d+$/);
          if (pageMatch) {
            return parseInt(pageMatch[0], 10);
          }
          // Also check for numbers at the start of text (common pattern)
          const startNumberMatch = trimmedText.match(/^(\d+)/);
          if (startNumberMatch) {
            return parseInt(startNumberMatch[1], 10);
          }
        }
      }
    }
  }
  
  // Strategy 2: Look for the last number in the content that appears to be a page number
  let lastNumber = null;
  let lastNumberDistance = -1;
  
  for (let i = content.length - 1; i >= 0; i--) {
    const item = content[i];
    if (item.type === 'text' && item.text) {
      const text = item.text.trim();
      
      // Look for standalone numbers first (most likely to be page numbers)
      const standaloneMatch = text.match(/^\d+$/);
      if (standaloneMatch) {
        return parseInt(standaloneMatch[0], 10);
      }
      
      // Look for numbers at the end of text
      const endNumberMatch = text.match(/(\d+)$/);
      if (endNumberMatch) {
        const number = parseInt(endNumberMatch[1], 10);
        const distance = content.length - i;
        
        // Prefer numbers that are closer to the end and appear to be standalone
        if (lastNumber === null || distance < lastNumberDistance || text.length <= 3) {
          lastNumber = number;
          lastNumberDistance = distance;
        }
      }
      
      // Look for numbers that are separated by spaces or punctuation
      const separatedMatch = text.match(/[^\d](\d{1,4})$/);
      if (separatedMatch && lastNumber === null) {
        lastNumber = parseInt(separatedMatch[1], 10);
        lastNumberDistance = content.length - i;
      }
    }
  }
  
  // Strategy 3: Look for numbers in the middle that might be page numbers
  if (lastNumber === null) {
    for (const item of content) {
      if (item.type === 'text' && item.text) {
        // Look for small standalone numbers (likely page numbers)
        const matches = item.text.match(/\b(\d{1,4})\b/g);
        if (matches) {
          // Take the last match, as it's most likely to be the page number
          const lastMatch = matches[matches.length - 1];
          lastNumber = parseInt(lastMatch, 10);
        }
      }
    }
  }
  
  return lastNumber;
}

/**
 * Check if the TOC entry has hyperlink functionality
 */
function hasHyperlink(element) {
  const content = element.content || [];
  return content.some(item => 
    item.marks && item.marks.some(mark => mark.type === 'link')
  );
}
