// @vitest-environment jsdom

import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createMeasurementEditor } from './create-measurement-editor.js';

vi.mock('@/index.js', () => {
  const Editor = vi.fn(function (options) {
    this.options = options;
  });

  return { Editor };
});

vi.mock('@extensions/index.js', () => ({
  getStarterExtensions: vi.fn(),
}));

vi.mock('./hidden-container.js', () => ({
  applyHiddenContainerStyles: vi.fn((element) => element),
}));

import { Editor } from '@/index.js';
import { getStarterExtensions } from '@extensions/index.js';
import { applyHiddenContainerStyles } from './hidden-container.js';

describe('createMeasurementEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';

    getStarterExtensions.mockReturnValue([{ name: 'pagination' }, { name: 'bold' }]);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('returns null when no host editor is provided', () => {
    const result = createMeasurementEditor(null);

    expect(result).toBeNull();
    expect(Editor).not.toHaveBeenCalled();
  });

  it('creates a measurement editor that mirrors the host options with measurement overrides', () => {
    const hostElement = document.createElement('div');
    const hostEditor = {
      options: {
        element: hostElement,
        selector: '#host-editor',
        role: 'author',
        documentMode: 'editing',
        editable: true,
        pagination: true,
        isMeasurement: false,
        someCustomOption: 'keep-me',
      },
    };

    const measurementEditor = createMeasurementEditor(hostEditor);

    expect(measurementEditor).toBe(Editor.mock.instances[0]);
    expect(getStarterExtensions).toHaveBeenCalledTimes(1);
    expect(applyHiddenContainerStyles).toHaveBeenCalledWith(expect.any(HTMLElement), {
      top: '-9999px',
      left: '-9999px',
    });

    const [measurementOptions] = Editor.mock.calls[0];

    expect(measurementOptions.element).not.toBe(hostElement);
    expect(measurementOptions.element).toBeInstanceOf(HTMLElement);
    expect(document.body.contains(measurementOptions.element)).toBe(true);
    expect(measurementOptions.selector).toBeNull();
    expect(measurementOptions.role).toBe('viewer');
    expect(measurementOptions.documentMode).toBe('viewing');
    expect(measurementOptions.editable).toBe(false);
    expect(measurementOptions.pagination).toBe(false);
    expect(measurementOptions.isMeasurement).toBe(true);
    expect(measurementOptions.isMeasurementEditor).toBe(true);
    expect(measurementOptions.extensions).toEqual([{ name: 'bold' }]);
    expect(measurementOptions.someCustomOption).toBe('keep-me');

    const expectedError = new Error('measurement');
    expect(() => measurementOptions.onContentError({ error: expectedError })).toThrow(expectedError);
  });

  it('reuses a provided element without adjusting the DOM container', () => {
    const providedElement = document.createElement('div');
    const hostEditor = { options: {} };

    createMeasurementEditor(hostEditor, providedElement);

    expect(applyHiddenContainerStyles).not.toHaveBeenCalled();
    expect(document.body.contains(providedElement)).toBe(false);

    const [measurementOptions] = Editor.mock.calls[0];
    expect(measurementOptions.element).toBe(providedElement);
  });
});
