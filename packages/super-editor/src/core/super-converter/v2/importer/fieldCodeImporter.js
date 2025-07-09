/**
 * Handler for field codes (TOC, page numbers, etc.)
 * @type {import("docxImporter").NodeHandler}
 */
export const handleFieldCodeNode = (params) => {
  const { nodes, docx, nodeListHandler, insideTrackChange } = params;
  
  if (nodes.length === 0 || nodes[0].name !== 'w:r') {
    return { nodes: [], consumed: 0 };
  }

  const node = nodes[0];
  
  // Check for field code elements
  const fldChar = node.elements?.find(el => el.name === 'w:fldChar');
  const instrText = node.elements?.find(el => el.name === 'w:instrText');
  
  if (fldChar || instrText) {

    
    // Check if this is a TOC field
    if (instrText?.text && instrText.text.includes('TOC')) {
      
      // The field code structure is:
      // 1. w:fldChar begin
      // 2. w:instrText with TOC instruction
      // 3. w:fldChar separate
      // 4. w:t with the actual TOC text and page number
      // 5. w:fldChar end
      
      // We need to look at the parent paragraph to get the complete field
      // For now, let's extract what we can from the instruction
      const instruction = instrText.text;
      
      // Look for TOC level in instruction
      const levelMatch = instruction.match(/TOC\s*(\d+)/i);
      const level = levelMatch ? parseInt(levelMatch[1]) : 1;
      
      // The actual TOC text and page number will be in the field result
      // which appears after the "separate" fldChar
      let tocText = '';
      let pageNumber = null;
      
      // For now, we'll extract from the instruction text
      // In a real implementation, we'd need to process the entire field
      if (instruction.includes('\\h')) {
        // Hyperlink TOC
        tocText = 'TOC Entry'; // Placeholder
        pageNumber = '1'; // Placeholder
      } else {
        // Regular TOC
        tocText = 'TOC Entry'; // Placeholder
        pageNumber = '1'; // Placeholder
      }
      
      if (tocText && tocText.trim()) {
        const tocEntry = {
          type: 'tocEntry',
          attrs: {
            level,
            pageNumber,
            isHyperlink: instruction.includes('\\h'),
            headingId: null
          },
          content: [
            {
              type: 'text',
              text: tocText.trim()
            }
          ]
        };
        
        return { nodes: [tocEntry], consumed: 1 };
      }
    }
  }
  
  return { nodes: [], consumed: 0 };
};

export const fieldCodeNodeHandlerEntity = {
  handlerName: 'fieldCode',
  handler: handleFieldCodeNode,
}; 