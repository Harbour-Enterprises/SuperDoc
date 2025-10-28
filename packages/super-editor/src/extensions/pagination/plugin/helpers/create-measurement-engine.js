import { MeasurementEngine } from '@measurement-engine';
import { onPageBreaksUpdate } from './index.js';

/**
 * Create (or reuse) a measurement engine instance scoped to the editor.
 * @param {import('../../../../core/Editor.js').Editor} editor - Super Editor instance
 * @param {Object} [overrides] - Optional overrides for engine configuration.
 * @returns {MeasurementEngine|null} - Measurement engine instance or null when unavailable.
 */
export const createMeasurementEngine = (editor, overrides = {}) => {
  if (!editor) return null;

  const storage = editor.storage?.pagination;
  if (!storage) return null;

  const defaultHandler = (layout) => onPageBreaksUpdate(editor, layout);
  const handler = typeof overrides.onPageBreaksUpdate === 'function' ? overrides.onPageBreaksUpdate : defaultHandler;

  const existing = storage.engine;
  if (existing) {
    const previousHandler = storage.engineHandler || existing.onPageBreaksUpdate || existing.config?.onPageBreaksUpdate;
    if (previousHandler && previousHandler !== handler) {
      if (typeof existing.off === 'function') {
        existing.off('page-breaks-updated', previousHandler);
      }
    }
    if (previousHandler !== handler) {
      if (typeof existing.on === 'function') {
        existing.on('page-breaks-updated', handler);
      }
    }
    if (existing.config) {
      existing.config.onPageBreaksUpdate = handler;
    }
    existing.onPageBreaksUpdate = handler;
    storage.engineHandler = handler;
    if (overrides.headerFooterRepository) {
      existing.headerFooterRepository = overrides.headerFooterRepository;
    } else if (storage.repository) {
      existing.headerFooterRepository = storage.repository;
    }
    if (editor && editor.measurement !== existing) {
      editor.measurement = existing;
    }
    return existing;
  }

  const config = {
    editor,
    onPageBreaksUpdate: handler,
    headerFooterRepository: overrides.headerFooterRepository
      ? overrides.headerFooterRepository
      : (storage.repository ?? null),
    ...overrides,
  };

  const engine = new MeasurementEngine(config);
  engine.onPageBreaksUpdate = handler;
  storage.engine = engine;
  storage.engineHandler = handler;
  if (editor) {
    editor.measurement = engine;
  }
  return engine;
};
