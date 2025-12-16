function getScrollableParent(element: HTMLElement | null): HTMLElement | Element {
  let currentElement = element;

  while (currentElement) {
    const overflowY = window.getComputedStyle(currentElement).overflowY;
    if (/(auto|scroll)/.test(overflowY) && currentElement.scrollHeight > currentElement.clientHeight) {
      return currentElement;
    }
    currentElement = currentElement.parentElement;
  }

  return document.scrollingElement || document.documentElement;
}

interface ScrollOptions {
  behavior?: ScrollBehavior;
  block?: 'start' | 'end';
}

export function scrollToElement(
  targetElement: HTMLElement | null,
  options: ScrollOptions = { behavior: 'smooth', block: 'start' },
): void {
  if (!targetElement) return;

  const container = getScrollableParent(targetElement);

  const containerRect = container.getBoundingClientRect();
  const targetRect = targetElement.getBoundingClientRect();
  const offsetTop = targetRect.top - containerRect.top + container.scrollTop;

  container.scrollTo({
    top:
      options.block === 'start'
        ? offsetTop
        : offsetTop - (container as HTMLElement).clientHeight + targetElement.offsetHeight,
    behavior: options.behavior,
  });
}
