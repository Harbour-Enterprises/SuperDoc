import {
  aiChange,
  aiFindAndSelect,
  aiFindContent,
  aiFindContents,
  aiGenerateContent,
  aiRewriteSelection,
} from './ai-commands.js';
import { ConfigurableAIProvider } from './providers/configurable-provider.js';
import { InsightsAIProvider } from './providers/insights-provider.js';

/**
 * SuperDoc AI Controller centralizes AI-powered editor commands behind an imperative API.
 */
export class SuperDocAiController {
  /**
   * @param {Object} options
   * @param {Object} options.editor - The active editor instance.
   * @param {Object} [options.provider] - Optional provider override.
   */
  constructor({ editor, provider = null } = {}) {
    if (!editor) {
      throw new Error('SuperDocAiController requires an editor instance');
    }

    this.editor = editor;
    this.provider = provider ?? null;

    this.#initializeProvider();
  }

  /**
   * Update the provider used by the controller.
   * @param {Object} provider
   */
  setProvider(provider) {
    this.provider = provider;
    if (!this.editor) return;

    const aiOptions = this.editor.options?.ai ?? {};
    this.editor.options.ai = { ...aiOptions, provider };
  }

  /**
   * Resolve provider precedence. Override > controller > editor options.
   * @param {Object} [override]
   */
  resolveProvider(override) {
    if (override) return override;
    if (this.provider) return this.provider;
    return this.editor?.options?.ai?.provider ?? null;
  }

  #initializeProvider() {
    if (!this.editor) return;

    const aiOptions = this.editor.options?.ai;
    if (!aiOptions) return;

    if (aiOptions.provider && !this.provider) {
      this.provider = aiOptions.provider;
      return;
    }

    if (this.provider) {
      this.editor.options.ai = { ...aiOptions, provider: this.provider };
      return;
    }

    const autoProvider = this.#createProviderFromConfig(aiOptions);
    if (autoProvider) {
      this.provider = autoProvider;
      this.editor.options.ai = { ...aiOptions, provider: autoProvider };
    }
  }

  #createProviderFromConfig(config) {
    if (!config) return null;

    try {
      if (config.buildRequest && config.parseResponse && config.endpoint) {
        return new ConfigurableAIProvider(config);
      }

      const hasInsightsConfig =
        Boolean(config.apiKey || config.api_key || config.endpoint || config.baseUrl || config.model) &&
        !config.provider;

      if (hasInsightsConfig) {
        return new InsightsAIProvider(config);
      }
    } catch (error) {
      console.error('[SuperDocAiController] Failed to initialize AI provider from configuration:', error);
    }

    return null;
  }

  aiFindContent(prompt, provider) {
    return aiFindContent(this.editor, prompt, this.resolveProvider(provider));
  }

  aiFindContents(prompt, provider) {
    return aiFindContents(this.editor, prompt, this.resolveProvider(provider));
  }

  aiFindAndSelect(prompt, provider) {
    return aiFindAndSelect(this.editor, prompt, this.resolveProvider(provider));
  }

  aiChange(config, provider) {
    return aiChange(this.editor, config, this.resolveProvider(provider));
  }

  aiGenerateContent(prompt, provider, streaming = false) {
    return aiGenerateContent(this.editor, prompt, this.resolveProvider(provider), streaming);
  }

  aiRewriteSelection(instructions, provider, streaming = false) {
    return aiRewriteSelection(this.editor, instructions, this.resolveProvider(provider), streaming);
  }
}
