export type DeepRequired<T> = Required<{
  [K in keyof T]: DeepRequired<T[K]>;
}>;

export type DeepReadonly<T> = Readonly<{
  [K in keyof T]: DeepReadonly<T[K]>;
}>;
