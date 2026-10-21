import type { DocumentApi, BrowserDocumentApi } from 'superdoc/ui';

type ReceiptSuccess = Extract<ReturnType<DocumentApi['delete']>, { success: true }>;
type ReplacementReceipt = ReturnType<DocumentApi['replace']>;
type Assert<T extends true> = T;
type _SuccessIsNotNever = Assert<[ReceiptSuccess] extends [never] ? false : true>;
type _ReplacementIsNotNever = Assert<[ReplacementReceipt] extends [never] ? false : true>;

declare const doc: DocumentApi;
declare const browserDoc: BrowserDocumentApi;
function consume(receipt: ReceiptSuccess) {
  const coordinate: number | undefined = receipt.trackedTextRangeShifts?.[0]?.atCharInBlock;
  const transaction: string | undefined = receipt.history?.txId;
  const replay: 'undo' | 'redo' | undefined = receipt.history?.direction;
  return { coordinate, transaction, replay };
}
function consumeReplacement(receipt: ReplacementReceipt) {
  const coordinate: number | undefined = receipt.trackedTextRangeShifts?.[0]?.atCharInBlock;
  const blockId: string | undefined = receipt.trackedTextRangeShifts?.[0]?.blockId;
  const visibleReplaced: number | undefined = receipt.textRangeShifts?.[0]?.replacedLength;
  // @ts-expect-error Replacement length is an optional numeric receipt field.
  const invalidReplacement: string = receipt.textRangeShifts?.[0]?.replacedLength;
  void invalidReplacement;
  // @ts-expect-error The physical coordinate is numeric, not an untyped metadata bag.
  const invalid: string = receipt.trackedTextRangeShifts?.[0]?.atCharInBlock;
  void invalid;
  return { coordinate, blockId, visibleReplaced };
}
async function checkReplacement(input: Parameters<BrowserDocumentApi['replace']>[0]) {
  const receipt = await browserDoc.replace(input);
  consumeReplacement(receipt);
}
async function checkHistory() {
  const result = await browserDoc.history.undo();
  result.trackedTextRangeShifts?.forEach((shift) => {
    const blockId: string = shift.blockId;
    void blockId;
  });
  const ids: string[] | undefined = doc.history.redo().history?.txIds;
  void ids;
}
void consume;
void consumeReplacement;
void checkReplacement;
void checkHistory;
