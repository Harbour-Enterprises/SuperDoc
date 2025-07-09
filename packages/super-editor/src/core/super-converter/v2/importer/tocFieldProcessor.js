/**
 * Process TOC field codes to extract text and page numbers
 * @param {Array} paragraphElements The elements of a paragraph containing TOC field codes
 * @returns {Object|null} TOC entry data or null if not a TOC field
 */
export const processTocField = (paragraphElements) => {
  if (!paragraphElements || paragraphElements.length === 0) {
    return null;
  }

  // Look for TOC field structure
  let hasTocField = false;
  let tocInstruction = '';
  let tocText = '';
  let pageNumber = null;
  let level = 1;
  let inField = false;
  let hasLeaders = false;
  let leaderType = '';

  // Check for tab stops and leaders in paragraph properties
  const pPr = paragraphElements.find(el => el.name === 'w:pPr');
  if (pPr && pPr.elements) {
    const tabs = pPr.elements.find(el => el.name === 'w:tabs');
    if (tabs && tabs.elements) {
      const tabStop = tabs.elements.find(el => el.name === 'w:tab');
      if (tabStop && tabStop.attributes) {
        hasLeaders = tabStop.attributes['w:leader'] !== undefined;
        leaderType = tabStop.attributes['w:leader'];
      }
    }
  }

  // Process the paragraph elements to find TOC field
  for (let i = 0; i < paragraphElements.length; i++) {
    const element = paragraphElements[i];
    
    if (element.name === 'w:r') {
      const fldChar = element.elements?.find(el => el.name === 'w:fldChar');
      const instrText = element.elements?.find(el => el.name === 'w:instrText');
      const text = element.elements?.find(el => el.name === 'w:t');
      
      if (fldChar) {
        const fldCharType = fldChar.attributes?.['w:fldCharType'];
        
        if (fldCharType === 'begin') {
          hasTocField = true;
          inField = true;
        } else if (fldCharType === 'separate') {
          // Field result starts here
          inField = false;
        } else if (fldCharType === 'end') {
          break; // End of field
        }
      }
      
      if (instrText && instrText.elements && instrText.elements[0] && instrText.elements[0].text) {
        tocInstruction = instrText.elements[0].text;
        
        // Extract level from instruction
        const levelMatch = tocInstruction.match(/TOC\s*(\d+)/i);
        if (levelMatch) {
          level = parseInt(levelMatch[1]);
        }
      }
      
      // Extract text - it's in the first w:r element (before field codes)
      if (text && text.elements && text.elements[0] && text.elements[0].text && !inField && !hasTocField) {
        tocText = text.elements[0].text.trim();
      }
      
      // Extract page number - it's in a w:r element after the field codes
      if (text && text.elements && text.elements[0] && text.elements[0].text && hasTocField && !inField) {
        const resultText = text.elements[0].text.trim();
        
        // Check if this looks like a page number
        if (/^\d+$/.test(resultText)) {
          pageNumber = resultText;
        }
      }
    }
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

  if (hasTocField && tocText && tocText.trim()) {
    const headingId = generateHeadingId(tocText);
    
    return {
      type: 'tocEntry',
      attrs: {
        level,
        pageNumber,
        isHyperlink: tocInstruction.includes('\\h'),
        headingId: headingId,
        hasLeaders,
        leaderType
      },
      content: [
        {
          type: 'text',
          text: tocText.trim()
        }
      ]
    };
  }

  return null;
}; 