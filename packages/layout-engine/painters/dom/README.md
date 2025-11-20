# @superdoc/painter-dom

Read-only DOM renderer for the SuperDoc layout proof of concept.

## Responsibilities

- Render pages and fragments produced by `@superdoc/layout-engine`.
- Display static, paginated previews suitable for inspection in the browser.
- Handle rerenders when new layouts are provided.
- Annotate DOM elements with SDT (Structured Document Tag) metadata via `data-sdt-*` attributes for downstream consumers.
