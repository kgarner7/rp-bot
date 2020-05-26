/**
 * A wrapper for undefined | null
 */
export type NoValue = undefined | null;

/**
 * A wrapper for T | none
 */
export type None<T> = T | NoValue;

/**
 * A wrapper for T | null
 */
export type Null<T> = T | null;

/**
 * a wrapper for T | undefined
 */
export type Undefined<T> = T | undefined;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isNone(arg: any): arg is NoValue {
  return arg === undefined || arg === null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function exists(arg: any): boolean {
  return !isNone(arg);
}

export interface ItemModel {
  description: string;
  editable?: boolean;
  hidden?: boolean;
  locked?: boolean;
  name: string;
  quantity?: number;
}
