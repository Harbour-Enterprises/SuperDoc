import { g as getDefaultExportFromCjs } from "./jszip-DnG9-ill.es.js";
import { r as requireStreamHttp } from "./index-CO3_7_bn.es.js";
function _mergeNamespaces(n, m) {
  for (var i = 0; i < m.length; i++) {
    const e = m[i];
    if (typeof e !== "string" && !Array.isArray(e)) {
      for (const k in e) {
        if (k !== "default" && !(k in n)) {
          const d = Object.getOwnPropertyDescriptor(e, k);
          if (d) {
            Object.defineProperty(n, k, d.get ? d : {
              enumerable: true,
              get: () => e[k]
            });
          }
        }
      }
    }
  }
  return Object.freeze(Object.defineProperty(n, Symbol.toStringTag, { value: "Module" }));
}
var streamHttpExports = requireStreamHttp();
const index = /* @__PURE__ */ getDefaultExportFromCjs(streamHttpExports);
const index$1 = /* @__PURE__ */ _mergeNamespaces({
  __proto__: null,
  default: index
}, [streamHttpExports]);
export {
  index$1 as i
};
