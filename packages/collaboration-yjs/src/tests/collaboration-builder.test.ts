import { describe, expect, test, vi } from 'vitest';

vi.mock('../collaboration/index.js', () => {
  class FakeSuperDocCollaboration {
    config: unknown;

    constructor(config: unknown) {
      this.config = config;
    }
  }

  return { SuperDocCollaboration: FakeSuperDocCollaboration };
});

import { CollaborationBuilder } from '../builder.js';
import { SuperDocCollaboration } from '../collaboration/index.js';

describe('CollaborationBuilder', () => {
  test('throws when name is missing', () => {
    const builder = new CollaborationBuilder();

    expect(() => builder.build()).toThrowError('CollaborationBuilder: `.withName()` is required');
  });

  test('build constructs collaboration service with configured options', () => {
    const baseExtension = { name: 'base-ext' };
    const extraExtension = { name: 'mock-ext' };

    const configureHook = vi.fn((config) => {
      config.extensions.push(extraExtension);
    });

    const builder = new CollaborationBuilder()
      .withName('demo-service')
      .withDebounce(250)
      .withDocumentExpiryMs(1000)
      .useExtensions([baseExtension])
      .onConfigure(configureHook);

    const service = builder.build();

    expect(configureHook).toHaveBeenCalledTimes(1);
    expect(service.config).toMatchObject({
      name: 'demo-service',
      debounce: 250,
      documentExpiryMs: 1000,
    });
    expect(service.config.extensions).toEqual([baseExtension, extraExtension]);
    expect(service).toBeInstanceOf(SuperDocCollaboration);
  });

  test('collects hook callbacks before building service', () => {
    const authenticate = vi.fn();
    const load = vi.fn();
    const autoSave = vi.fn();
    const beforeChange = vi.fn();
    const change = vi.fn();

    const builder = new CollaborationBuilder()
      .withName('hooky-service')
      .onAuthenticate(authenticate)
      .onLoad(load)
      .onAutoSave(autoSave)
      .onBeforeChange(beforeChange)
      .onChange(change);

    const service = builder.build();

    expect(service.config.hooks).toEqual({
      authenticate,
      load,
      autoSave,
      beforeChange,
      change,
    });
  });
});
