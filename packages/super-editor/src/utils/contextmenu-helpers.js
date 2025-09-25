const isKeyboardInvocation = (event) => {
  return (
    event.type === 'contextmenu' &&
    typeof event.detail === 'number' &&
    event.detail === 0 &&
    (event.button === 0 || event.button === undefined) &&
    event.clientX === 0 &&
    event.clientY === 0
  );
};

const prefersNativeMenu = (event) => {
  if (!event) return false;

  if (event.ctrlKey || event.metaKey) {
    return true;
  }

  return isKeyboardInvocation(event);
};

export const shouldBypassContextMenu = (event) => {
  return prefersNativeMenu(event);
};

export const shouldAllowNativeContextMenu = (event) => {
  return prefersNativeMenu(event);
};

export const shouldUseNativeContextMenu = prefersNativeMenu;
