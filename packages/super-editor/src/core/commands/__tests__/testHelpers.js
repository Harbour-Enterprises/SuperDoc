import { Editor } from '../../Editor.js';
import { CommandService } from '../../CommandService.js';

export function createTestEditor({ doc, schemaOverride } = {}) {
  const editor = new Editor({
    content: doc,
    extensions: [],
    schema: schemaOverride,
  });
  return editor;
}

export function createCommandContext(editor) {
  const commandService = new CommandService({ editor });
  return commandService;
}
