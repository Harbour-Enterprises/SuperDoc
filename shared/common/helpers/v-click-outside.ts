import type { Directive, DirectiveBinding } from 'vue';

interface ClickOutsideElement extends HTMLElement {
  __clickOutsideHandler?: (event: MouseEvent) => void;
}

type ClickOutsideHandler = (event: MouseEvent) => void;

export default {
  mounted(el: ClickOutsideElement, binding: DirectiveBinding<ClickOutsideHandler>) {
    const clickOutsideHandler = (event: MouseEvent) => {
      if (!el.contains(event.target as Node)) {
        binding.value?.(event);
      }
    };

    document.addEventListener('click', clickOutsideHandler);

    el.__clickOutsideHandler = clickOutsideHandler;
  },
  unmounted(el: ClickOutsideElement) {
    if (el.__clickOutsideHandler) {
      document.removeEventListener('click', el.__clickOutsideHandler);
      delete el.__clickOutsideHandler;
    }
  },
} satisfies Directive<ClickOutsideElement, ClickOutsideHandler>;
