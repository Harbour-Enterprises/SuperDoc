[ ] Stage 1 — Reference snapshot: Build a helper (or reuse NodeView functions) that captures PM paragraph rendering inputs: resolved pPr/rPr via `resolveParagraphProperties`/`resolveRunProperties`, `encodeCSSFromPPr` + `encodeCSSFromRPr`, tab widths via `calculateTabStyle` in jsdom. Add unit tests that lock this helper to current NodeView behavior for baseline fixtures (plain paragraph, list with inline/ style numbering, rtl + adjustRightInd, tab stops/default tab interval).

[ ] Stage 2 — Adapter parity (computeParagraphAttrs): Add tests feeding PM fixtures to `computeParagraphAttrs`/hydration and assert attrs/wordLayout match Stage 1 reference (spacing, indent, alignment, tabs, numbering props). Fix gaps (converterContext propagation, spacing/indent precedence, tab interval defaults, framePr/dropcap flags) surfaced by tests.

[ ] Stage 3 — Marker styling: Add targeted tests comparing NodeView marker run resolution vs `wordLayout.marker.run` (colors, letterSpacing, bold/italic, suffix/justification/markerText). Adjust `computeWordLayoutForParagraph` inputs or numbering enrichment so marker styling/text matches reference.

[ ] Stage 4 — Tabs & hanging: Create parity tests for `calculateTabStyle` vs layout tab stop computation (left/right/center/decimal, hanging vs firstLine). Ensure default tab interval sourcing matches; align tab stop normalization or measurement if needed.

[ ] Stage 5 — Spacing/indent & rendering polish: Add layout tests that compare vertical gaps and textIndent/padding from Stage 1 CSS vs `layout-paragraph` and DOM painter output. Confirm contextualSpacing, before/after auto-spacing, keepNext/keepLines, borders/shading, and dropcap/framePr flags are honored or explicitly surfaced.

[ ] Stage 6 — End-to-end parity harness: Build deterministic-measurement harness (deterministic mode fonts) that runs PM JSON through both pipelines (Stage 1 reference vs `toFlowBlocks` → measure → layout → DOM painter) and compares fragment metrics (line count, marker width/position, indent). Add a small debug script to dump side-by-side data for any PM doc and wire tests into CI.
