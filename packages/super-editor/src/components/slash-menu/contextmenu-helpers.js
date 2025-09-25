export const shouldBypassContextMenu = (event) => {
  if (!event) return false;

  if (event.ctrlKey || event.metaKey) {
    return true;
  }

  const isKeyboardInvocation =
    event.type === 'contextmenu' &&
    typeof event.detail === 'number' &&
    event.detail === 0 &&
    (event.button === 0 || event.button === undefined) &&
    event.clientX === 0 &&
    event.clientY === 0;

  return Boolean(isKeyboardInvocation);
};
