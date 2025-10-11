/**
 * AI Commands - Content manipulation commands powered by AI
 */

/**
 * Find content using AI search
 */
export async function aiFindContent(editor, prompt, provider) {
  if (!provider) throw new Error('AI provider not configured');

  const documentXml = editor.state.doc.textContent || '';
  editor.emit('ai:command:start', { command: 'find', prompt });

  try {
    const result = await provider.findContent(prompt, { documentXml });

    if (result) {
      const matches = editor.commands?.search?.(result) || [];

      if (matches.length > 0) {
        const [firstMatch] = matches;
        editor.commands?.goToSearchResult?.(firstMatch);
      }
    }

    editor.emit('ai:command:complete', { command: 'find', result });
    return result;
  } catch (error) {
    editor.emit('ai:command:error', { command: 'find', error });
    throw error;
  }
}

/**
 * Generate new content
 */
export async function aiGenerateContent(editor, prompt, provider, streaming = false) {
  if (!provider) throw new Error('AI provider not configured');

  const documentXml = editor.state.doc.textContent || '';
  editor.emit('ai:command:start', { command: 'generate', prompt });

  try {
    if (streaming) {
      await provider.writeStreaming(
        prompt,
        { documentXml },
        (chunk) => {
          editor.commands.insertContent(chunk);
          editor.emit('ai:chunk', { chunk });
        },
        () => editor.emit('ai:stream:complete'),
      );
    } else {
      const result = await provider.write(prompt, { documentXml });
      if (result) editor.commands.insertContent(result);
    }

    editor.emit('ai:command:complete', { command: 'generate' });
  } catch (error) {
    editor.emit('ai:command:error', { command: 'generate', error });
    throw error;
  }
}

/**
 * Rewrite selected content
 */
export async function aiRewriteSelection(editor, instructions, provider, streaming = false) {
  if (!provider) throw new Error('AI provider not configured');

  const { state } = editor;
  const { from, to } = state.selection;

  if (from === to) throw new Error('No text selected');

  const selectedText = state.doc.textBetween(from, to);
  editor.emit('ai:command:start', { command: 'rewrite', instructions });

  try {
    if (streaming) {
      editor.commands.deleteSelection();
      await provider.rewriteStreaming(
        selectedText,
        instructions,
        {},
        (chunk) => {
          editor.commands.insertContent(chunk);
          editor.emit('ai:chunk', { chunk });
        },
        () => editor.emit('ai:stream:complete'),
      );
    } else {
      const result = await provider.rewrite(selectedText, instructions);
      if (result) {
        editor.chain().deleteSelection().insertContent(result).run();
      }
    }

    editor.emit('ai:command:complete', { command: 'rewrite' });
  } catch (error) {
    editor.emit('ai:command:error', { command: 'rewrite', error });
    throw error;
  }
}
