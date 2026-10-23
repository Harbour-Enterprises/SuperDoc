# Document comparison

Compare two DOCX files and apply the result as a reviewable tracked change,
using the Document API's `diff.capture → diff.compare → diff.apply` workflow.
The included fixtures are synthetic, non-customer documents that differ by one
word ("buyer" → "purchaser") in a single sentence.

This is application code using the Node SDK. Copy this directory and adapt the
input documents and decision logic for your service. The example pins
`@superdoc/sdk` `2.20.0`. SDK and editor package versions are separate release
lines; verify your own saved document pairs against the SDK version you deploy.

```sh
pnpm install
pnpm typecheck
pnpm test
pnpm start
```

`pnpm start` captures the target fixture's snapshot, compares it against the
base fixture, reads `applyEligibility` before applying, applies the diff as a
tracked change, accepts the exact compare-created review item identified by
the apply receipt, saves the result to `out/result.docx`, and reopens the
saved file to prove the accepted text persisted. The fixture deliberately
creates one review item. The helper refuses to guess if an adapted comparison
creates zero or multiple items; decide those receipt ids explicitly in the
order your application requires.

## Save pending revisions with explicit style consent

`start:tracked` compares your files and saves the pending body revisions without
accepting them. Style definitions are shared by the document and cannot be
reviewed as native tracked body revisions. The default policy refuses changed
definitions. Only use `--direct-styles` when your application explicitly agrees
to adopt target style definitions directly:

```sh
pnpm start:tracked older.docx newer.docx out/pending.docx --direct-styles
```

The flag passes `styleChangeMode: 'direct'` to **both** `diff.compare` and
`diff.apply`. The command prints the apply receipt's `styleChanges`,
`diagnostics` and body review items. Save occurs only after eligibility and apply
succeed. Omitting the flag keeps the default refusal for changed definitions.
The opt-in applies to styles; other unsupported definition changes remain blocked.

Rejecting the pending body revisions **keeps the directly adopted styles**.
A style-only comparison can succeed with no body review items; the style receipt
and diagnostics are still part of its result. An insertion-only text change
needs an insertion revision, not a deletion revision. The new helper in
`tracked-workflow.ts` returns the full apply receipt so applications can disclose
these effects and decide body revisions separately.

For a pair without style changes, the same command works without the flag:

```sh
pnpm start:tracked fixtures/base.docx fixtures/target.docx out/pending.docx
```

The live run requires the embedded SuperDoc host binary for your platform. A
plain `pnpm install` of this copied directory installs that published binary.

`pnpm test` uses scripted SDK doubles to exercise the orchestration logic in
`workflow.ts` and `tracked-workflow.ts`. It covers eligibility gates, exact
receipt-to-decision targeting, ambiguous receipts, explicit two-call consent,
direct-style disclosures, style-only receipts and saving only a successful apply.
It needs no live host and runs in any environment. It proves this example's own control flow, not the
comparison engine's behavior; the engine's behavior for each shape in the [supported-case
matrix](https://docs.superdoc.dev/document-api/document-comparison#supported-case-matrix)
is covered by the Document API's own test suite.

Not every document pair is eligible for a tracked apply. See
[Compare and apply tracked changes](https://docs.superdoc.dev/document-api/document-comparison)
for the full workflow guide and its version-qualified supported-case matrix.
Eligibility is specific to the input pair and deployed version; a candidate can
still be refused when apply checks the live document. Handle the SDK error and
keep the original input rather than saving a partially handled comparison.
