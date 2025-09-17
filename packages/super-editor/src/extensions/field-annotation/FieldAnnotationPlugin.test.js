import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { FieldAnnotationPlugin } from './FieldAnnotationPlugin.js';
import { trackFieldAnnotationsDeletion } from './fieldAnnotationHelpers/trackFieldAnnotationsDeletion.js';
import { getAllFieldAnnotations } from './fieldAnnotationHelpers/getAllFieldAnnotations.js';

vi.mock('./fieldAnnotationHelpers/trackFieldAnnotationsDeletion.js', () => ({
  trackFieldAnnotationsDeletion: vi.fn(),
}));

vi.mock('./fieldAnnotationHelpers/getAllFieldAnnotations.js', () => ({
  getAllFieldAnnotations: vi.fn(),
}));

describe('FieldAnnotationPlugin', () => {
  let editorStub;
  const baseEvent = { clientX: 10, clientY: 20, dataTransfer: { getData: vi.fn() } };

  beforeEach(() => {
    editorStub = {
      emit: vi.fn(),
      options: {},
      commands: {
        addFieldAnnotation: vi.fn(),
      },
      view: {
        posAtCoords: vi.fn(),
      },
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const createPlugin = (options = {}) =>
    FieldAnnotationPlugin({ annotationClass: 'annotation', editor: editorStub, ...options });

  it('delegates deletion tracking through plugin state', () => {
    const plugin = createPlugin();
    const tr = { getMeta: vi.fn(), steps: [], meta: {}, mapping: { maps: [] } };
    const state = plugin.spec.state;
    const prev = state.init();
    state.apply(tr, prev);
    expect(trackFieldAnnotationsDeletion).toHaveBeenCalledWith(editorStub, tr);
  });

  it('emits drop outside events when configured', () => {
    editorStub.view.posAtCoords.mockReturnValue({ pos: 5 });
    const plugin = createPlugin({ handleDropOutside: true });
    const payload = { sourceField: { fieldId: 'f-1' } };
    const event = {
      ...baseEvent,
      dataTransfer: {
        getData: vi.fn().mockReturnValue(JSON.stringify(payload)),
      },
    };

    const handled = plugin.props.handleDrop(editorStub.view, event, null, false);
    expect(handled).toBe(true);
    expect(editorStub.emit).toHaveBeenCalledWith(
      'fieldAnnotationDropped',
      expect.objectContaining({
        sourceField: payload.sourceField,
        pos: 5,
      }),
    );
  });

  it('adds annotations on drop when outside handling is disabled', () => {
    editorStub.view.posAtCoords.mockReturnValue({ pos: 2 });
    const plugin = createPlugin({ handleDropOutside: false });
    const annotationAttrs = { attributes: { fieldId: 'drop', displayLabel: 'Drop' } };
    const event = {
      ...baseEvent,
      dataTransfer: {
        getData: vi.fn().mockReturnValue(JSON.stringify(annotationAttrs)),
      },
    };

    const handled = plugin.props.handleDrop(editorStub.view, event, null, false);
    expect(handled).toBe(true);
    expect(editorStub.commands.addFieldAnnotation).toHaveBeenCalledWith(2, annotationAttrs.attributes);
  });

  it('ignores drop events without annotation data or when moving nodes', () => {
    const plugin = createPlugin();
    expect(plugin.props.handleDrop(editorStub.view, baseEvent, null, false)).toBe(false);
    expect(plugin.props.handleDrop(editorStub.view, baseEvent, null, true)).toBe(false);
  });

  it('emits paste events when annotations are present in the slice', () => {
    const plugin = createPlugin();
    const annotationNode = { type: { name: 'fieldAnnotation' } };
    const slice = { content: { content: [annotationNode] } };
    const handled = plugin.props.handlePaste(editorStub.view, {}, slice);
    expect(handled).toBe(false);
    expect(editorStub.emit).toHaveBeenCalledWith(
      'fieldAnnotationPaste',
      expect.objectContaining({
        content: [annotationNode],
        editor: editorStub,
      }),
    );
  });

  it('sets drag image for annotation elements', () => {
    const plugin = createPlugin({ annotationClass: 'annotation' });
    const target = document.createElement('span');
    target.classList.add('annotation');
    const event = {
      target,
      dataTransfer: {
        setDragImage: vi.fn(),
      },
    };
    plugin.props.handleDOMEvents.dragstart(editorStub.view, event);
    expect(event.dataTransfer.setDragImage).toHaveBeenCalledWith(target, 0, 0);
  });

  it('removes marks from annotations via appendTransaction', () => {
    const plugin = createPlugin();
    const node = {
      marks: [{}],
      eq: () => true,
      nodeSize: 1,
    };
    getAllFieldAnnotations.mockReturnValue([{ node, pos: 1 }]);

    const tr = {
      doc: { nodeAt: () => node },
      removeMark: vi.fn(),
      docChanged: true,
    };
    const oldState = { doc: { eq: () => false } };
    const newState = { doc: { nodeAt: () => node }, tr, docChanged: true };

    const appended = plugin.spec.appendTransaction([{ docChanged: true }], oldState, newState);
    expect(appended).toBe(tr);
    expect(tr.removeMark).toHaveBeenCalled();
  });
});
