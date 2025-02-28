import { describe, it, expect } from 'vitest';
import { validateOpenAiKey, createSecureKeyStorage, createAiModule } from '../../../core/modules/ai';

describe('AI Module', () => {
  describe('validateOpenAiKey', () => {
    it('should validate correct OpenAI key format', () => {
      expect(validateOpenAiKey('sk-validKeyFormat123')).toBe(true);
      expect(validateOpenAiKey('invalid-key')).toBe(false);
      expect(validateOpenAiKey('')).toBe(false);
      expect(validateOpenAiKey(null)).toBe(false);
    });
  });

  describe('createSecureKeyStorage', () => {
    it('should securely store and manage API key', () => {
      const storage = createSecureKeyStorage();

      // Should start with no key
      expect(storage.hasKey()).toBe(false);

      // Should store valid key
      expect(storage.setKey('sk-validKey123')).toBe(true);
      expect(storage.hasKey()).toBe(true);
      expect(storage.getKey()).toBe('sk-validKey123');

      // Should reject invalid key
      expect(storage.setKey('invalid-key')).toBe(false);

      // Should clear key
      storage.clearKey();
      expect(storage.hasKey()).toBe(false);
      expect(storage.getKey()).toBe(null);
    });
  });

  describe('createAiModule', () => {
    it('should create AI module with initial configuration', () => {
      const aiModule = createAiModule({
        openAiKey: 'sk-validKey123',
      });

      expect(aiModule.isOpenAiEnabled()).toBe(true);
      expect(typeof aiModule.generateTextStream).toBe('function');

      aiModule.destroy();
      expect(aiModule.isOpenAiEnabled()).toBe(false);
    });
  });
});
