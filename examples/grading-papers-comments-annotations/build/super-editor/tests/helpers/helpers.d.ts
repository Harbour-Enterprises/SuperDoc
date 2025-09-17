export function getTestDataByFileName(name: string): Promise<any>;
export function getTestDataAsFileBuffer(name: any): Promise<Buffer<ArrayBufferLike>>;
export function loadTestDataForEditorTests(filename: string): Promise<[any, any, any, any]>;
export function initTestEditor(options?: any): Editor;
export function getNewTransaction(editor: Editor): Transaction;
//# sourceMappingURL=helpers.d.ts.map