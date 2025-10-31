import { describe, it, expect, beforeEach, vi } from 'vitest';

const measurementMocks = vi.hoisted(() => {
  const onPageBreaksUpdateMock = vi.fn();
  const instances = [];
  const MeasurementEngine = vi.fn((config) => {
    const instance = {
      config,
      on: vi.fn(),
      off: vi.fn(),
      headerFooterRepository: config.headerFooterRepository ?? null,
    };
    instances.push(instance);
    return instance;
  });
  return { onPageBreaksUpdateMock, instances, MeasurementEngine };
});

vi.mock('./index.js', () => ({
  onPageBreaksUpdate: measurementMocks.onPageBreaksUpdateMock,
}));

vi.mock('@measurement-engine', () => ({
  MeasurementEngine: measurementMocks.MeasurementEngine,
}));

import { createMeasurementEngine } from './create-measurement-engine.js';

const {
  onPageBreaksUpdateMock,
  instances: measurementInstances,
  MeasurementEngine: MeasurementEngineMock,
} = measurementMocks;

describe('createMeasurementEngine', () => {
  beforeEach(() => {
    onPageBreaksUpdateMock.mockReset();
    MeasurementEngineMock.mockClear();
    measurementInstances.length = 0;
  });

  it('returns null when editor or pagination storage is missing', () => {
    expect(createMeasurementEngine(null)).toBeNull();
    expect(createMeasurementEngine({})).toBeNull();
    expect(createMeasurementEngine({ storage: {} })).toBeNull();
  });

  it('creates a new measurement engine when one is not cached', () => {
    const editor = {
      storage: { pagination: { repository: { id: 'stored-repo' } } },
    };

    const overrides = { customFlag: true };
    const engine = createMeasurementEngine(editor, overrides);

    expect(engine).toBe(measurementInstances[0]);
    expect(MeasurementEngineMock).toHaveBeenCalledTimes(1);

    const config = MeasurementEngineMock.mock.calls[0][0];
    expect(config).toEqual(
      expect.objectContaining({
        editor,
        customFlag: true,
        headerFooterRepository: { id: 'stored-repo' },
      }),
    );

    expect(typeof config.onPageBreaksUpdate).toBe('function');
    config.onPageBreaksUpdate({ layout: true });
    expect(onPageBreaksUpdateMock).toHaveBeenCalledWith(editor, { layout: true });

    expect(engine.onPageBreaksUpdate).toBe(config.onPageBreaksUpdate);
    expect(editor.storage.pagination.engine).toBe(engine);
    expect(editor.storage.pagination.engineHandler).toBe(config.onPageBreaksUpdate);
    expect(editor.measurement).toBe(engine);
  });

  it('applies overrides and reuses existing engine instances', () => {
    const previousHandler = vi.fn();
    const overridesHandler = vi.fn();
    const existingEngine = {
      config: { onPageBreaksUpdate: previousHandler },
      onPageBreaksUpdate: previousHandler,
      on: vi.fn(),
      off: vi.fn(),
      headerFooterRepository: null,
    };

    const editor = {
      storage: {
        pagination: {
          engine: existingEngine,
          engineHandler: previousHandler,
          repository: { id: 'stored-repo' },
        },
      },
    };

    const result = createMeasurementEngine(editor, {
      onPageBreaksUpdate: overridesHandler,
      headerFooterRepository: { id: 'override-repo' },
    });

    expect(result).toBe(existingEngine);
    expect(MeasurementEngineMock).not.toHaveBeenCalled();
    expect(existingEngine.off).toHaveBeenCalledWith('page-breaks-updated', previousHandler);
    expect(existingEngine.on).toHaveBeenCalledWith('page-breaks-updated', overridesHandler);
    expect(existingEngine.config.onPageBreaksUpdate).toBe(overridesHandler);
    expect(existingEngine.onPageBreaksUpdate).toBe(overridesHandler);
    expect(editor.storage.pagination.engineHandler).toBe(overridesHandler);
    expect(existingEngine.headerFooterRepository).toEqual({ id: 'override-repo' });
    expect(editor.measurement).toBe(existingEngine);
  });

  it('reuses engine and falls back to stored repository when override not provided', () => {
    const previousHandler = vi.fn();
    const existingEngine = {
      config: {},
      onPageBreaksUpdate: previousHandler,
      on: vi.fn(),
      off: vi.fn(),
      headerFooterRepository: null,
    };

    const paginationStorage = {
      engine: existingEngine,
      engineHandler: previousHandler,
      repository: { id: 'stored-repo' },
    };

    const editor = { storage: { pagination: paginationStorage } };
    const result = createMeasurementEngine(editor);

    expect(result).toBe(existingEngine);
    expect(existingEngine.off).toHaveBeenCalledWith('page-breaks-updated', previousHandler);
    expect(existingEngine.on).toHaveBeenCalledWith('page-breaks-updated', editor.storage.pagination.engineHandler);
    expect(existingEngine.headerFooterRepository).toEqual({ id: 'stored-repo' });
    expect(editor.storage.pagination.engineHandler).not.toBe(previousHandler);
    expect(typeof editor.storage.pagination.engineHandler).toBe('function');
    expect(existingEngine.onPageBreaksUpdate).toBe(editor.storage.pagination.engineHandler);
  });

  it('creates engine with custom element override', () => {
    const customElement = { type: 'custom' };
    const editor = {
      storage: { pagination: { repository: { id: 'repo' } } },
    };

    const engine = createMeasurementEngine(editor, { element: customElement });

    expect(MeasurementEngineMock).toHaveBeenCalledTimes(1);
    const config = MeasurementEngineMock.mock.calls[0][0];
    expect(config.element).toBe(customElement);
  });

  it('handles missing editor.storage gracefully', () => {
    const editor = {};
    const result = createMeasurementEngine(editor);
    expect(result).toBeNull();
  });

  it('handles missing pagination storage gracefully', () => {
    const editor = { storage: {} };
    const result = createMeasurementEngine(editor);
    expect(result).toBeNull();
  });

  it('merges override config properties correctly', () => {
    const editor = {
      storage: { pagination: { repository: { id: 'repo' } } },
    };

    const overrides = {
      customProp1: 'value1',
      customProp2: { nested: 'value2' },
      headerFooterRepository: { id: 'override-repo' },
    };

    const engine = createMeasurementEngine(editor, overrides);

    const config = MeasurementEngineMock.mock.calls[0][0];
    expect(config.customProp1).toBe('value1');
    expect(config.customProp2).toEqual({ nested: 'value2' });
    expect(config.headerFooterRepository).toEqual({ id: 'override-repo' });
  });

  it('creates new handler when reusing engine without previous handler', () => {
    const existingEngine = {
      config: {},
      onPageBreaksUpdate: null,
      on: vi.fn(),
      off: vi.fn(),
      headerFooterRepository: null,
    };

    const editor = {
      storage: {
        pagination: {
          engine: existingEngine,
          engineHandler: null,
          repository: { id: 'repo' },
        },
      },
    };

    const result = createMeasurementEngine(editor);

    expect(result).toBe(existingEngine);
    expect(existingEngine.off).not.toHaveBeenCalled(); // No previous handler to remove
    expect(typeof editor.storage.pagination.engineHandler).toBe('function');
    expect(existingEngine.on).toHaveBeenCalledWith('page-breaks-updated', editor.storage.pagination.engineHandler);
  });
});
