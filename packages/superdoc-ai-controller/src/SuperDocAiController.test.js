import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('./ai-commands.js', () => ({
  aiFindContent: vi.fn().mockResolvedValue('find-result'),
  aiFindContents: vi.fn().mockResolvedValue(['result']),
  aiFindAndSelect: vi.fn().mockResolvedValue('select-result'),
  aiChange: vi.fn().mockResolvedValue({}),
  aiGenerateContent: vi.fn().mockResolvedValue(),
  aiRewriteSelection: vi.fn().mockResolvedValue(),
}));

const aiCommands = await import('./ai-commands.js');

import { SuperDocAiController } from './SuperDocAiController.js';
import { ConfigurableAIProvider } from './providers/configurable-provider.js';
import { InsightsAIProvider } from './providers/insights-provider.js';

const createEditor = (aiOptions = { provider: { id: 'editor-provider' } }) => ({
  options: { ai: aiOptions },
});

afterEach(() => {
  Object.values(aiCommands).forEach((mock) => mock.mockClear());
});

describe('SuperDocAiController', () => {
  it('throws when constructed without editor', () => {
    expect(() => new SuperDocAiController({})).toThrow('SuperDocAiController requires an editor instance');
  });

  it('prefers override provider for find content operations', async () => {
    const editor = createEditor();
    const controller = new SuperDocAiController({ editor });
    const override = { id: 'override' };

    await controller.aiFindContent('prompt', override);
    expect(aiCommands.aiFindContent).toHaveBeenCalledWith(editor, 'prompt', override);

    await controller.aiFindContents('prompt', override);
    expect(aiCommands.aiFindContents).toHaveBeenCalledWith(editor, 'prompt', override);

    await controller.aiFindAndSelect('prompt', override);
    expect(aiCommands.aiFindAndSelect).toHaveBeenCalledWith(editor, 'prompt', override);
  });

  it('falls back to controller provider when override missing', async () => {
    const editor = createEditor();
    const controller = new SuperDocAiController({ editor });
    const controllerProvider = { id: 'controller-provider' };
    controller.setProvider(controllerProvider);

    await controller.aiChange({ prompt: 'swap' });
    expect(aiCommands.aiChange).toHaveBeenCalledWith(editor, { prompt: 'swap' }, controllerProvider);
  });

  it('uses editor configuration provider when no override or controller provider set', async () => {
    const editorProvider = { id: 'editor-provider' };
    const editor = createEditor({ provider: editorProvider });
    const controller = new SuperDocAiController({ editor });

    await controller.aiGenerateContent('draft');
    expect(aiCommands.aiGenerateContent).toHaveBeenCalledWith(editor, 'draft', editorProvider, false);
  });

  it('passes streaming flag through to rewrite selection', async () => {
    const editor = createEditor();
    const controller = new SuperDocAiController({ editor });
    const override = { id: 'override' };

    await controller.aiRewriteSelection('summarize', override, true);
    expect(aiCommands.aiRewriteSelection).toHaveBeenCalledWith(editor, 'summarize', override, true);
  });
});

describe('SuperDocAiController provider bootstrap', () => {
  it('instantiates InsightsAIProvider when credentials are provided', () => {
    const editor = createEditor({ apiKey: 'key', endpoint: 'https://example.com/ai' });
    const controller = new SuperDocAiController({ editor });

    expect(controller.provider).toBeInstanceOf(InsightsAIProvider);
    expect(editor.options.ai.provider).toBe(controller.provider);
  });

  it('instantiates ConfigurableAIProvider when configuration functions exist', () => {
    const buildRequest = vi.fn((operation, params) => ({ operation, ...params }));
    const parseResponse = vi.fn((data) => data.result);
    const editor = createEditor({
      endpoint: 'https://example.com/custom',
      buildRequest,
      parseResponse,
    });

    const controller = new SuperDocAiController({ editor });

    expect(controller.provider).toBeInstanceOf(ConfigurableAIProvider);
    expect(editor.options.ai.provider).toBe(controller.provider);
  });

  it('updates editor options when setProvider is called', () => {
    const editor = createEditor({ apiKey: 'key', endpoint: 'https://example.com/ai' });
    const controller = new SuperDocAiController({ editor });
    const customProvider = { id: 'custom' };

    controller.setProvider(customProvider);

    expect(controller.provider).toBe(customProvider);
    expect(editor.options.ai.provider).toBe(customProvider);
  });
});
