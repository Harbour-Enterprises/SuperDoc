import { Node } from '@core/index.js';

/**
 * @type {import("docxImporter").NodeHandler}
 */
export const handleParagraphNode = (params) => {
  const { nodes } = params;
  
  if (nodes.length === 0 || nodes[0].name !== 'w:p') {
    return { nodes: [], consumed: 0 };
  }

  const node = nodes[0];
  
  // Check if this is a TOC paragraph
  const pPr = node.elements?.find(el => el.name === 'w:pPr');
  const pStyle = pPr?.elements?.find(el => el.name === 'w:pStyle');
  const styleVal = pStyle?.attributes?.['w:val'];
  
  if (styleVal && (styleVal.includes('TOC') || styleVal.includes('toc'))) {
    
    // Extract TOC level from style (e.g., "TOC 1" -> level 1)
    const levelMatch = styleVal.match(/TOC\s*(\d+)/i);
    const level = levelMatch ? parseInt(levelMatch[1]) : 1;
    
    // Extract text content and page number
    const textElements = node.elements?.filter(el => el.name === 'w:r');
    let tocText = '';
    let pageNumber = null;
    let isHyperlink = false;
    let headingId = null;
    
    if (textElements) {
      textElements.forEach(textEl => {
        const text = textEl.elements?.find(el => el.name === 'w:t');
        if (text && text.text) {
          tocText += text.text;
        }
        
        // Check for hyperlinks
        const hyperlink = textEl.elements?.find(el => el.name === 'w:hyperlink');
        if (hyperlink) {
          isHyperlink = true;
          headingId = hyperlink.attributes?.['w:anchor'];
        }
      });
    }
    
    // Extract page number (usually at the end after tab)
    const pageMatch = tocText.match(/(\d+)\s*$/);
    if (pageMatch) {
      pageNumber = pageMatch[1];
      tocText = tocText.replace(/\s*\d+\s*$/, '').trim();
    }

    // Create TOC entry node
    const tocEntry = {
      type: 'tocEntry',
      attrs: {
        level,
        pageNumber,
        isHyperlink,
        headingId
      },
      content: [
        {
          type: 'text',
          text: tocText
        }
      ]
    };
    
    return { nodes: [tocEntry], consumed: 1 };
  }
  
  // If not a TOC paragraph, let the default paragraph handler process it
  return { nodes: [], consumed: 0 };
};

export const paragraphNodeHandlerEntity = {
  handlerName: 'paragraph',
  handler: handleParagraphNode,
}; 