import type { BrowserDocumentApi, DocumentApi } from 'superdoc/ui';

declare const doc: BrowserDocumentApi;
const input: Parameters<DocumentApi['mutations']['apply']>[0] = {
  atomic: true,
  changeMode: 'direct',
  steps: [
    {
      id: 'replace-slash',
      op: 'structural.replace',
      where: {
        by: 'target',
        target: {
          kind: 'selection',
          start: { kind: 'text', blockId: 'paragraph', offset: 0 },
          end: { kind: 'text', blockId: 'paragraph', offset: 1 },
        },
      },
      args: {
        content: {
          kind: 'sdt',
          sdt: {
            scope: 'block',
            type: 'richText',
            tag: 'replacement',
            lock: 'content',
            content: [
              {
                kind: 'paragraph',
                paragraph: {
                  props: { spacing: { line: 30, lineRule: 'exact' } },
                  inlines: [{ kind: 'run', run: { text: 'Replacement' } }],
                },
              },
            ],
          },
        },
      },
    },
  ],
};
const result: ReturnType<BrowserDocumentApi['mutations']['apply']> = doc.mutations.apply(input);
void Promise.resolve(result).then((receipt) => {
  const success: true = receipt.success;
  const operation: string = receipt.steps[0].op;
  void success;
  void operation;
});
void Promise.resolve(doc.capabilities()).then((capabilities) => {
  const targets: readonly string[] | undefined = capabilities.planEngine.supportedTargets;
  const restrictions: readonly { cell: string; reason: string }[] | undefined = capabilities.planEngine.unsupported;
  void targets;
  void restrictions;
});
