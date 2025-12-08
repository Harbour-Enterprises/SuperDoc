/**
 * Tests for DragHandler
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DragHandler, createDragHandler, type DragHandlerConfig } from '../src/drag-handler';

describe('DragHandler', () => {
  let container: HTMLDivElement;
  let handler: DragHandler;
  let config: DragHandlerConfig;

  beforeEach(() => {
    // Create a mock container element
    container = document.createElement('div');
    container.classList.add('superdoc-layout');
    document.body.appendChild(container);

    // Default config with mock callbacks
    config = {
      onDragStart: vi.fn(),
      onDrop: vi.fn(),
      onDragOver: vi.fn(),
      onDragEnd: vi.fn(),
    };
  });

  afterEach(() => {
    handler?.destroy();
    document.body.removeChild(container);
  });

  /**
   * Creates a mock draggable field annotation element.
   */
  function createDraggableAnnotation(data: Record<string, string> = {}): HTMLSpanElement {
    const annotation = document.createElement('span');
    annotation.classList.add('annotation');
    annotation.draggable = true;
    annotation.dataset.draggable = 'true';
    annotation.dataset.fieldId = data.fieldId ?? 'field-123';
    annotation.dataset.fieldType = data.fieldType ?? 'TEXTINPUT';
    annotation.dataset.variant = data.variant ?? 'text';
    annotation.dataset.displayLabel = data.displayLabel ?? 'Test Field';
    annotation.dataset.pmStart = data.pmStart ?? '10';
    annotation.dataset.pmEnd = data.pmEnd ?? '11';
    return annotation;
  }

  /**
   * Creates a mock DragEvent.
   */
  function createDragEvent(
    type: string,
    options: {
      target?: HTMLElement;
      dataTransfer?: Partial<DataTransfer>;
      clientX?: number;
      clientY?: number;
    } = {},
  ): DragEvent {
    const dataTransferData: Map<string, string> = new Map();

    const mockDataTransfer = {
      data: dataTransferData,
      types: [] as string[],
      effectAllowed: 'uninitialized' as DataTransfer['effectAllowed'],
      dropEffect: 'none' as DataTransfer['dropEffect'],
      setData(type: string, data: string) {
        this.data.set(type, data);
        if (!this.types.includes(type)) {
          this.types.push(type);
        }
      },
      getData(type: string) {
        return this.data.get(type) ?? '';
      },
      setDragImage: vi.fn(),
      clearData: vi.fn(),
      files: [] as unknown as FileList,
      items: [] as unknown as DataTransferItemList,
      ...options.dataTransfer,
    };

    const event = new Event(type, { bubbles: true, cancelable: true }) as DragEvent;

    // Add dataTransfer and other properties
    Object.defineProperties(event, {
      dataTransfer: { value: mockDataTransfer, writable: true },
      clientX: { value: options.clientX ?? 100, writable: true },
      clientY: { value: options.clientY ?? 100, writable: true },
      target: { value: options.target ?? container, writable: true },
    });

    return event;
  }

  describe('constructor', () => {
    it('should create a handler instance', () => {
      handler = new DragHandler(container, config);
      expect(handler).toBeInstanceOf(DragHandler);
    });

    it('should attach event listeners to the container', () => {
      const addEventListenerSpy = vi.spyOn(container, 'addEventListener');
      handler = new DragHandler(container, config);

      expect(addEventListenerSpy).toHaveBeenCalledWith('dragstart', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('dragover', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('drop', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('dragend', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('dragleave', expect.any(Function));
    });
  });

  describe('dragstart handling', () => {
    beforeEach(() => {
      handler = new DragHandler(container, config);
    });

    it('should handle dragstart on a field annotation element', () => {
      const annotation = createDraggableAnnotation();
      container.appendChild(annotation);

      const event = createDragEvent('dragstart', { target: annotation });
      annotation.dispatchEvent(event);

      expect(config.onDragStart).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.any(Object),
          element: annotation,
          data: expect.objectContaining({
            fieldId: 'field-123',
            fieldType: 'TEXTINPUT',
            variant: 'text',
            displayLabel: 'Test Field',
            pmStart: 10,
            pmEnd: 11,
          }),
        }),
      );
    });

    it('should set dataTransfer data in multiple formats', () => {
      const annotation = createDraggableAnnotation();
      container.appendChild(annotation);

      const event = createDragEvent('dragstart', { target: annotation });
      annotation.dispatchEvent(event);

      // Check that data was set in multiple formats
      expect(event.dataTransfer?.types).toContain('application/x-field-annotation');
      expect(event.dataTransfer?.types).toContain('fieldAnnotation');
      expect(event.dataTransfer?.types).toContain('text/plain');
    });

    it('should set drag image to the annotation element', () => {
      const annotation = createDraggableAnnotation();
      container.appendChild(annotation);

      const event = createDragEvent('dragstart', { target: annotation });
      annotation.dispatchEvent(event);

      expect(event.dataTransfer?.setDragImage).toHaveBeenCalledWith(annotation, 0, 0);
    });

    it('should not handle dragstart on non-draggable elements', () => {
      const regularElement = document.createElement('span');
      container.appendChild(regularElement);

      const event = createDragEvent('dragstart', { target: regularElement });
      regularElement.dispatchEvent(event);

      expect(config.onDragStart).not.toHaveBeenCalled();
    });

    it('should set effectAllowed to move', () => {
      const annotation = createDraggableAnnotation();
      container.appendChild(annotation);

      const event = createDragEvent('dragstart', { target: annotation });
      annotation.dispatchEvent(event);

      expect(event.dataTransfer?.effectAllowed).toBe('move');
    });
  });

  describe('dragover handling', () => {
    beforeEach(() => {
      handler = new DragHandler(container, config);
    });

    it('should handle dragover with field annotation data', () => {
      // Simulate a drag that started with field annotation data
      const event = createDragEvent('dragover');
      event.dataTransfer?.setData('application/x-field-annotation', '{}');

      container.dispatchEvent(event);

      expect(config.onDragOver).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.any(Object),
          clientX: 100,
          clientY: 100,
          hasFieldAnnotation: true,
        }),
      );
    });

    it('should add drag-over class to container when dragging field annotation', () => {
      const event = createDragEvent('dragover');
      event.dataTransfer?.setData('application/x-field-annotation', '{}');

      container.dispatchEvent(event);

      expect(container.classList.contains('drag-over')).toBe(true);
    });

    it('should not add drag-over class for non-field-annotation drags', () => {
      const event = createDragEvent('dragover');
      // No field annotation data in dataTransfer

      container.dispatchEvent(event);

      expect(container.classList.contains('drag-over')).toBe(false);
    });

    it('should set dropEffect to move for field annotation drags', () => {
      const event = createDragEvent('dragover');
      event.dataTransfer?.setData('application/x-field-annotation', '{}');

      container.dispatchEvent(event);

      expect(event.dataTransfer?.dropEffect).toBe('move');
    });
  });

  describe('drop handling', () => {
    beforeEach(() => {
      handler = new DragHandler(container, config);
    });

    it('should handle drop with field annotation data', () => {
      const dragData = JSON.stringify({
        attributes: { fieldId: 'field-456', variant: 'image' },
        sourceField: { fieldId: 'field-456', variant: 'image', displayLabel: 'Image Field' },
      });

      const event = createDragEvent('drop', { clientX: 150, clientY: 200 });
      event.dataTransfer?.setData('application/x-field-annotation', dragData);

      container.dispatchEvent(event);

      expect(config.onDrop).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.any(Object),
          data: expect.objectContaining({
            fieldId: 'field-456',
            variant: 'image',
            displayLabel: 'Image Field',
          }),
          clientX: 150,
          clientY: 200,
        }),
      );
    });

    it('should remove drag-over class on drop', () => {
      container.classList.add('drag-over');

      const event = createDragEvent('drop');
      event.dataTransfer?.setData('application/x-field-annotation', '{}');

      container.dispatchEvent(event);

      expect(container.classList.contains('drag-over')).toBe(false);
    });

    it('should handle legacy fieldAnnotation MIME type', () => {
      const dragData = JSON.stringify({
        sourceField: { fieldId: 'legacy-field', variant: 'text' },
      });

      const event = createDragEvent('drop');
      event.dataTransfer?.setData('fieldAnnotation', dragData);

      container.dispatchEvent(event);

      expect(config.onDrop).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            fieldId: 'legacy-field',
            variant: 'text',
          }),
        }),
      );
    });

    it('should not handle drop without field annotation data', () => {
      const event = createDragEvent('drop');
      // No field annotation data

      container.dispatchEvent(event);

      expect(config.onDrop).not.toHaveBeenCalled();
    });
  });

  describe('dragend handling', () => {
    beforeEach(() => {
      handler = new DragHandler(container, config);
    });

    it('should handle dragend event', () => {
      const event = createDragEvent('dragend');
      container.dispatchEvent(event);

      expect(config.onDragEnd).toHaveBeenCalledWith(expect.any(Object));
    });

    it('should remove drag-over class on dragend', () => {
      container.classList.add('drag-over');

      const event = createDragEvent('dragend');
      container.dispatchEvent(event);

      expect(container.classList.contains('drag-over')).toBe(false);
    });
  });

  describe('dragleave handling', () => {
    beforeEach(() => {
      handler = new DragHandler(container, config);
    });

    it('should remove drag-over class when leaving container', () => {
      container.classList.add('drag-over');

      const event = new Event('dragleave', { bubbles: true }) as DragEvent;
      Object.defineProperty(event, 'relatedTarget', { value: document.body });

      container.dispatchEvent(event);

      expect(container.classList.contains('drag-over')).toBe(false);
    });

    it('should not remove drag-over class when moving to child element', () => {
      container.classList.add('drag-over');

      const child = document.createElement('span');
      container.appendChild(child);

      const event = new Event('dragleave', { bubbles: true }) as DragEvent;
      Object.defineProperty(event, 'relatedTarget', { value: child });

      container.dispatchEvent(event);

      expect(container.classList.contains('drag-over')).toBe(true);
    });
  });

  describe('updateConfig', () => {
    it('should update configuration options', () => {
      handler = new DragHandler(container, config);

      const newOnDrop = vi.fn();
      handler.updateConfig({ onDrop: newOnDrop });

      const dragData = JSON.stringify({ sourceField: {} });
      const event = createDragEvent('drop');
      event.dataTransfer?.setData('application/x-field-annotation', dragData);

      container.dispatchEvent(event);

      expect(newOnDrop).toHaveBeenCalled();
      expect(config.onDrop).not.toHaveBeenCalled();
    });

    it('should update custom MIME type', () => {
      handler = new DragHandler(container, config);
      handler.updateConfig({ mimeType: 'custom/mime-type' });

      const annotation = createDraggableAnnotation();
      container.appendChild(annotation);

      const event = createDragEvent('dragstart', { target: annotation });
      annotation.dispatchEvent(event);

      expect(event.dataTransfer?.types).toContain('custom/mime-type');
    });
  });

  describe('destroy', () => {
    it('should remove event listeners', () => {
      const removeEventListenerSpy = vi.spyOn(container, 'removeEventListener');
      handler = new DragHandler(container, config);

      handler.destroy();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('dragstart', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('dragover', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('drop', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('dragend', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('dragleave', expect.any(Function));
    });

    it('should remove drag-over class', () => {
      handler = new DragHandler(container, config);
      container.classList.add('drag-over');

      handler.destroy();

      expect(container.classList.contains('drag-over')).toBe(false);
    });
  });

  describe('createDragHandler helper', () => {
    it('should create a handler and return cleanup function', () => {
      const cleanup = createDragHandler(container, config);

      expect(typeof cleanup).toBe('function');

      // Verify handler is active
      const annotation = createDraggableAnnotation();
      container.appendChild(annotation);
      const event = createDragEvent('dragstart', { target: annotation });
      annotation.dispatchEvent(event);

      expect(config.onDragStart).toHaveBeenCalled();

      // Cleanup
      cleanup();
    });

    it('should properly cleanup when called', () => {
      const cleanup = createDragHandler(container, config);
      cleanup();

      // Verify handler is no longer active
      const annotation = createDraggableAnnotation();
      container.appendChild(annotation);
      const event = createDragEvent('dragstart', { target: annotation });
      annotation.dispatchEvent(event);

      // onDragStart should not be called after cleanup
      expect(config.onDragStart).toHaveBeenCalledTimes(0);
    });
  });

  describe('field annotation data extraction', () => {
    beforeEach(() => {
      handler = new DragHandler(container, config);
    });

    it('should extract all data attributes from element', () => {
      const annotation = createDraggableAnnotation({
        fieldId: 'custom-id',
        fieldType: 'CHECKBOX',
        variant: 'checkbox',
        displayLabel: 'Custom Label',
        pmStart: '50',
        pmEnd: '51',
      });
      container.appendChild(annotation);

      const event = createDragEvent('dragstart', { target: annotation });
      annotation.dispatchEvent(event);

      expect(config.onDragStart).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            fieldId: 'custom-id',
            fieldType: 'CHECKBOX',
            variant: 'checkbox',
            displayLabel: 'Custom Label',
            pmStart: 50,
            pmEnd: 51,
          }),
        }),
      );
    });

    it('should handle elements with partial data', () => {
      const annotation = document.createElement('span');
      annotation.dataset.draggable = 'true';
      annotation.dataset.fieldId = 'partial-field';
      // Missing other attributes
      container.appendChild(annotation);

      const event = createDragEvent('dragstart', { target: annotation });
      annotation.dispatchEvent(event);

      expect(config.onDragStart).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            fieldId: 'partial-field',
            fieldType: undefined,
            variant: undefined,
          }),
        }),
      );
    });
  });
});
