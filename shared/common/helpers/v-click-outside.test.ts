import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Mock } from 'vitest';
import type { DirectiveBinding } from 'vue';
import vClickOutside from './v-click-outside';

interface ClickOutsideElement extends HTMLElement {
  __clickOutsideHandler?: (event: MouseEvent) => void;
}

type ClickOutsideHandler = (event: MouseEvent) => void;

interface MockDocument {
  addEventListener: Mock;
  removeEventListener: Mock;
}

describe('v-click-outside directive', () => {
  let originalDocument: Document | undefined;
  let addEventListenerMock: Mock;
  let removeEventListenerMock: Mock;

  beforeEach(() => {
    originalDocument = globalThis.document;
    addEventListenerMock = vi.fn();
    removeEventListenerMock = vi.fn();

    (globalThis as unknown as { document: MockDocument }).document = {
      addEventListener: addEventListenerMock,
      removeEventListener: removeEventListenerMock,
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalDocument === undefined) {
      delete (globalThis as unknown as { document?: MockDocument }).document;
    } else {
      (globalThis as unknown as { document: Document }).document = originalDocument;
    }
  });

  it('invokes binding when clicks originate outside the element and unregisters on unmount', () => {
    const containsMock = vi.fn().mockReturnValue(false);
    const binding: DirectiveBinding<ClickOutsideHandler> = {
      value: vi.fn(),
      oldValue: undefined,
      arg: undefined,
      modifiers: {},
      instance: null,
      dir: vClickOutside,
    };
    const el = {
      contains: containsMock,
      __clickOutsideHandler: undefined,
    } as unknown as ClickOutsideElement;

    vClickOutside.mounted(el, binding);

    expect(addEventListenerMock).toHaveBeenCalledWith('click', expect.any(Function));
    expect(typeof el.__clickOutsideHandler).toBe('function');

    const handler = addEventListenerMock.mock.calls[0][1];

    // Trigger an outside click
    const outsideEvent = { target: {} };
    handler(outsideEvent);
    expect(binding.value).toHaveBeenCalledWith(outsideEvent);

    // Trigger an inside click
    binding.value.mockClear();
    containsMock.mockReturnValue(true);
    handler({ target: {} });
    expect(binding.value).not.toHaveBeenCalled();

    vClickOutside.unmounted(el);
    expect(removeEventListenerMock).toHaveBeenCalledWith('click', handler);
    expect(el.__clickOutsideHandler).toBeUndefined();
  });
});
