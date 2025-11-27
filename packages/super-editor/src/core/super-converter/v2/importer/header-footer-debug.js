/**
 * Debug utilities for header/footer import troubleshooting.
 * Enable by setting DEBUG_HEADER_FOOTER=true in environment or importing and calling enableDebug().
 */

let debugEnabled = false;

export const enableHeaderFooterDebug = () => {
  debugEnabled = true;
};

export const disableHeaderFooterDebug = () => {
  debugEnabled = false;
};

export const isDebugEnabled = () => debugEnabled;

/**
 * Log header/footer import stages with structured output.
 * @param {string} stage - The import stage (e.g., 'RAW_XML', 'PREPROCESSED', 'TRANSLATED')
 * @param {string} type - 'header' or 'footer'
 * @param {string} id - The rId of the header/footer
 * @param {any} data - Data to log
 */
export const logHeaderFooter = (stage, type, id, data) => {
  if (!debugEnabled) return;

  const prefix = `[HF-DEBUG] [${type.toUpperCase()}:${id}] [${stage}]`;

  if (stage === 'RAW_ELEMENTS') {
    console.log(`${prefix} Top-level element names:`, data?.map?.((e) => e.name) || 'none');
  } else if (stage === 'PREPROCESSED') {
    console.log(`${prefix} After preProcessNodesForFldChar:`, data?.map?.((e) => e.name) || 'none');
    // Look for sd:autoPageNumber nodes
    const findNodes = (nodes, name, results = []) => {
      for (const n of nodes || []) {
        if (n.name === name) results.push(n);
        if (n.elements) findNodes(n.elements, name, results);
      }
      return results;
    };
    const pageNumNodes = findNodes(data, 'sd:autoPageNumber');
    console.log(`${prefix} sd:autoPageNumber nodes found:`, pageNumNodes.length);
  } else if (stage === 'TRANSLATED') {
    console.log(`${prefix} Translated schema types:`, data?.map?.((n) => n.type) || 'none');
    // Count node types
    const countTypes = (nodes, counts = {}) => {
      for (const n of nodes || []) {
        if (n.type) counts[n.type] = (counts[n.type] || 0) + 1;
        if (n.content) countTypes(n.content, counts);
      }
      return counts;
    };
    console.log(`${prefix} Node type counts:`, countTypes(data));
  } else if (stage === 'PARAGRAPH_ATTRS') {
    console.log(`${prefix} Paragraph attrs:`, JSON.stringify(data, null, 2));
  } else if (stage === 'FRAME_PR') {
    console.log(`${prefix} framePr detected:`, JSON.stringify(data, null, 2));
  } else if (stage === 'SDT_HANDLER') {
    console.log(`${prefix} SDT handler:`, data);
  } else {
    console.log(`${prefix}`, data);
  }
};

/**
 * Deep inspect a node tree and log structure.
 */
export const inspectNodeTree = (nodes, label = 'nodes', maxDepth = 3) => {
  if (!debugEnabled) return;

  const inspect = (nodeList, depth = 0) => {
    if (depth > maxDepth || !nodeList) return [];
    return nodeList.map((n) => ({
      name: n.name || n.type,
      attrs: n.attributes ? Object.keys(n.attributes) : undefined,
      children: n.elements ? inspect(n.elements, depth + 1) : undefined,
      content: n.content ? inspect(n.content, depth + 1) : undefined,
    }));
  };

  console.log(`[HF-DEBUG] ${label}:`, JSON.stringify(inspect(nodes), null, 2));
};
