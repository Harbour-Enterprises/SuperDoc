/**
 * Creates style tag and append it to head.
 */
export function createStyleTag(style: string, suffix?: string): HTMLStyleElement {
  const styleTag = document.querySelector(`style[data-supereditor-style${suffix ? `-${suffix}` : ''}]`);

  if (styleTag !== null) {
    return styleTag as HTMLStyleElement;
  }

  const styleNode = document.createElement('style');

  styleNode.setAttribute(`data-supereditor-style${suffix ? `-${suffix}` : ''}`, '');
  styleNode.innerHTML = style;
  document.getElementsByTagName('head')[0].appendChild(styleNode);

  return styleNode;
}
