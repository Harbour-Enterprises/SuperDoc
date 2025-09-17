"use strict";
const jszip = require("./jszip-CP5d3NU1.cjs");
const index$2 = require("./index-C4XlhMue.cjs");
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
var streamHttpExports = index$2.requireStreamHttp();
const index = /* @__PURE__ */ jszip.getDefaultExportFromCjs(streamHttpExports);
const index$1 = /* @__PURE__ */ _mergeNamespaces({
  __proto__: null,
  default: index
}, [streamHttpExports]);
exports.index = index$1;
