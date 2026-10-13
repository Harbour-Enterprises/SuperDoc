const WEB_FLOW_STYLE_ID = 'superdoc-web-flow-surface-styles-v1';

export const WEB_FLOW_CLASS_NAMES = {
  root: 'superdoc-web-flow',
  block: 'superdoc-web-flow-block',
  paragraph: 'superdoc-web-flow-paragraph',
  run: 'superdoc-web-flow-run',
  listMarker: 'superdoc-web-flow-list-marker',
  table: 'superdoc-web-flow-table',
  diagnostic: 'superdoc-web-flow-diagnostic',
} as const;

export function ensureWebFlowStyles(doc: Document, styleNonce?: string): void {
  if (doc.getElementById(WEB_FLOW_STYLE_ID)) return;
  const style = doc.createElement('style');
  style.id = WEB_FLOW_STYLE_ID;
  if (styleNonce) style.nonce = styleNonce;
  style.textContent = `
.${WEB_FLOW_CLASS_NAMES.root} {
  box-sizing: border-box;
  display: block;
  max-width: 100%;
  min-width: 0;
  overflow-wrap: anywhere;
  position: relative;
  width: 100%;
}
.${WEB_FLOW_CLASS_NAMES.root} *, .${WEB_FLOW_CLASS_NAMES.root} *::before, .${WEB_FLOW_CLASS_NAMES.root} *::after {
  box-sizing: border-box;
}
.${WEB_FLOW_CLASS_NAMES.block} { max-width: 100%; }
.${WEB_FLOW_CLASS_NAMES.paragraph} {
  margin-left: 0;
  margin-right: 0;
  min-height: 1em;
  white-space: pre-wrap;
}
.${WEB_FLOW_CLASS_NAMES.run} { white-space: pre-wrap; }
.${WEB_FLOW_CLASS_NAMES.root} .superdoc-formatting-paragraph-mark,
.${WEB_FLOW_CLASS_NAMES.root} .superdoc-formatting-line-break {
  display: inline;
  position: absolute;
  top: auto;
  pointer-events: none;
  user-select: none;
  color: var(--sd-formatting-mark-color, var(--sd-ui-action, currentColor));
}
.${WEB_FLOW_CLASS_NAMES.root} .superdoc-formatting-space-mark,
.${WEB_FLOW_CLASS_NAMES.root} .superdoc-web-flow-formatting-tab { position: relative; }
.${WEB_FLOW_CLASS_NAMES.root} .superdoc-formatting-space-mark::after,
.${WEB_FLOW_CLASS_NAMES.root} .superdoc-web-flow-formatting-tab::after {
  content: "·";
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  color: var(--sd-formatting-mark-color, var(--sd-ui-action, currentColor));
  font-size: 0.75em;
  line-height: 1;
  pointer-events: none;
}
.${WEB_FLOW_CLASS_NAMES.root} .superdoc-web-flow-formatting-tab::after { content: "→"; }
.${WEB_FLOW_CLASS_NAMES.root} [dir="rtl"] .superdoc-web-flow-formatting-tab::after { content: "←"; }
@media print {
  .${WEB_FLOW_CLASS_NAMES.root} .superdoc-formatting-paragraph-mark,
  .${WEB_FLOW_CLASS_NAMES.root} .superdoc-formatting-line-break,
  .${WEB_FLOW_CLASS_NAMES.root} .superdoc-formatting-space-mark::after,
  .${WEB_FLOW_CLASS_NAMES.root} .superdoc-web-flow-formatting-tab::after { display: none; }
}
.${WEB_FLOW_CLASS_NAMES.listMarker} {
  display: inline-block;
  margin-inline-end: 0.5em;
  min-width: 1.5em;
  text-align: end;
  user-select: none;
}
.${WEB_FLOW_CLASS_NAMES.table} {
  border-collapse: collapse;
  table-layout: fixed;
  width: 100%;
}
.${WEB_FLOW_CLASS_NAMES.table} td { min-width: 0; vertical-align: top; }
.${WEB_FLOW_CLASS_NAMES.diagnostic} {
  border: 1px dashed currentColor;
  margin-block: 0.5rem;
  padding: 0.5rem;
}
`;
  (doc.head ?? doc.documentElement).appendChild(style);
}
