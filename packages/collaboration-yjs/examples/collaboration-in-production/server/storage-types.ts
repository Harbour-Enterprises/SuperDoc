export type StorageFunction = (id: string, file?: Uint8Array) => Promise<Uint8Array | boolean | null>;

export interface StorageHandler {
  save: StorageFunction;
  load: StorageFunction;
}