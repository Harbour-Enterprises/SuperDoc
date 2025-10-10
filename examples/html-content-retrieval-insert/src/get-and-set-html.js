import { DOMSerializer } from 'prosemirror-model';

export function getHTMLFromSelection(editor) {
  if (!editor?.activeEditor) return '';
  
  const { view } = editor.activeEditor;
  const { selection, schema } = view.state;
  
  // Get the selected content
  const selectedSlice = selection.content();
  
  // Serialize the fragment to HTML using DOMSerializer
  const fragment = DOMSerializer.fromSchema(schema).serializeFragment(selectedSlice.content);
  const tempDiv = document.createElement('div');
  tempDiv.appendChild(fragment);
  
  return tempDiv.innerHTML;
}

export function setHTMLInSelection(editor, htmlContent) {
  if (!editor?.activeEditor || !htmlContent) return;
  
  // Parse the HTML to extract just the inline content
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent.trim();
  
  // Extract text content from block elements if present
  let inlineHTML = htmlContent;
  
  // If the content is wrapped in block elements (p, div, etc), extract the inner HTML
  if (tempDiv.children.length > 0) {
    const blockTags = ['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'];
    const firstChild = tempDiv.children[0];
    
    if (blockTags.includes(firstChild.tagName)) {
      inlineHTML = firstChild.innerHTML;
    }
  }
  
  console.log('Inserting inline HTML content:', inlineHTML);
  
  // Insert as raw HTML to maintain inline behavior
  editor.activeEditor.commands.insertContent(inlineHTML);
}