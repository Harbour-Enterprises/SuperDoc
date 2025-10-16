/**
 * AI Commands - Content manipulation commands powered by AI
 */
import { TextSelection } from 'prosemirror-state';

/**
 * Find content using AI search
 */
export async function aiFindContent(editor, prompt, provider) {
  if (!provider) throw new Error('AI provider not configured');

  const documentXml = editor.state.doc.textContent || '';
  editor.emit('ai:command:start', { command: 'find', prompt });

  try {
    const result = await provider.findContent(prompt, { documentXml });

    editor.emit('ai:command:complete', { command: 'find', result });
    return result;
  } catch (error) {
    editor.emit('ai:command:error', { command: 'find', error });
    throw error;
  }
}

export async function aiFindContents(editor, prompt, provider) {
  if (!provider) throw new Error('AI provider not configured');

  const documentXml = editor.state.doc.textContent || '';
  editor.emit('ai:command:start', { command: 'find', prompt });

  try {
    const results = await provider.findContents(prompt, { documentXml });

    editor.emit('ai:command:complete', { command: 'find', results });
    return results;
  } catch (error) {
    editor.emit('ai:command:error', { command: 'find', error });
    throw error;
  }
}

export async function aiFindAndSelect(editor, prompt, provider) {
  if (!provider) throw new Error('AI provider not configured');

  const documentXml = editor.state.doc.textContent || '';
  editor.emit('ai:command:start', { command: 'find', prompt });

  try {
    const result = await provider.findContents(prompt, { documentXml });

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

export async function aiChange(editor, config, provider) {
  if (!provider) {
    throw new Error('AI provider not configured');
  }

  const { prompt, action = 'replace', author, extraContext, customHandler } = config;

  if (!prompt) {
    throw new Error('Prompt is required for aiChange');
  }

  const documentXml = editor.state.doc.textContent || '';
  if (!documentXml) return;

  editor.emit('ai:command:start', { command: 'change', prompt, action });

  try {
    // Call AI to get both the original text and modified version
    const result = await provider.change(prompt, {
      documentXml,
      extraContext,
    });

    const { originalText, modifiedText } = result;

    // Find the original text in the document
    let position;
    if (originalText) {
      const matches = editor.commands?.search?.(originalText) || [];

      if (matches.length > 0) {
        [position] = matches;
      }
    }

    if (!position) {
      throw new Error('Could not locate the text in the document');
    }

    // Execute the action
    switch (action) {
      case 'replace':
        await handleReplace(editor, position, modifiedText);
        break;

      case 'insert_tracked_change':
        await handleTrackedChange(editor, position, modifiedText, author);
        break;

      case 'insert_comment':
        await handleComment(editor, position, author, modifiedText);
        break;

      case 'custom':
        if (customHandler) {
          await customHandler(editor, { position, originalText, modifiedText });
        }
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    editor.emit('ai:command:complete', {
      command: 'change',
      action,
      result: { originalText, modifiedText, position },
    });

    return { originalText, modifiedText, position };
  } catch (error) {
    editor.emit('ai:command:error', { command: 'change', error });
    throw error;
  }
}

/**
 * Action: Replace text directly
 */
async function handleReplace(editor, position, newText) {
  const { from, to } = position;
  const { state } = editor;
  const { doc } = state;

  const $pos = doc.resolve(position.from);
  const marks = $pos.marks();

  state.doc.textBetween(from, to);
  const tr = state.tr.setSelection(TextSelection.create(state.doc, from, to));
  editor.view.dispatch(tr);
  editor.chain().deleteSelection();
  if (marks.length > 0) {
    editor.commands.insertContent({
      type: 'text',
      text: newText,
      marks: marks.map((mark) => ({
        type: mark.type.name,
        attrs: mark.attrs,
      })),
    });
  } else {
    editor.commands.insertContent(newText);
  }
}

/**
 * Action: Insert tracked change
 */
/**
 * Action: Insert tracked change
 */
async function handleTrackedChange(editor, position, newText, author) {
  const { from, to } = position;
  const { state } = editor;
  const { doc } = state;

  // Save the original user
  const originalUser = editor.options.user;

  // Temporarily set the imported author as the current user
  if (author) {
    editor.options.user = {
      name: author.display_name || author,
      image: author.profile_url || '',
    };
  }

  // Collect marks from the range to preserve formatting
  const marks = [];
  const markMap = new Map();

  doc.nodesBetween(from, to, (node) => {
    if (node.marks) {
      node.marks.forEach((mark) => {
        const markName = mark.type.name;

        if (!markMap.has(markName)) {
          markMap.set(markName, mark);
        } else if (markName === 'textStyle') {
          // Merge textStyle attributes, preferring non-null values
          const existing = markMap.get(markName);
          const mergedAttrs = { ...existing.attrs };

          Object.keys(mark.attrs).forEach((key) => {
            if (mark.attrs[key] !== null && mark.attrs[key] !== undefined) {
              mergedAttrs[key] = mark.attrs[key];
            }
          });

          markMap.set(markName, {
            ...mark,
            attrs: mergedAttrs,
          });
        } else {
          // For other marks, keep the most recent one
          markMap.set(markName, mark);
        }
      });
    }
  });

  const uniqueMarks = Array.from(markMap.values());

  // Set selection
  const tr = state.tr.setSelection(TextSelection.create(state.doc, from, to));
  editor.view.dispatch(tr);

  // Enable track changes, delete, and insert with marks
  editor.commands.enableTrackChanges();
  editor.chain().deleteSelection();

  if (uniqueMarks.length > 0) {
    editor.commands.insertContent({
      type: 'text',
      text: newText,
      marks: uniqueMarks.map((mark) => ({
        type: mark.type.name,
        attrs: mark.attrs,
      })),
    });
  } else {
    editor.commands.insertContent(newText);
  }

  editor.commands.disableTrackChanges();
  editor.options.user = originalUser;
}

/**
 * Action: Insert comment
 */
async function handleComment(editor, position, author, suggestion) {
  const { from, to } = position;
  const { state } = editor;
  const { doc } = state;

  const $pos = doc.resolve(position.from);
  const marks = $pos.marks();

  editor.commands.enableTrackChanges();

  const tr = state.tr.setSelection(TextSelection.create(state.doc, from, to));
  editor.view.dispatch(tr);

  editor.commands.insertComment({
    commentText: suggestion,
  });
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
