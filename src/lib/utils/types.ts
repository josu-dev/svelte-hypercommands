import type { Writable } from 'svelte/store';

export type OnChangeCallback<T> = (args: { curr: T; next: T }) => T;

export type SideEffectCallback<T> = (args: T) => void;

export type RequiredKeys<T> = {
  [K in keyof T]-?: object extends Pick<T, K> ? never : K
}[keyof T];

export type RecordToWritables<T extends Record<string, unknown>> = {
  [K in keyof T]: Writable<T[K]>
};

export type Keys<T> = (keyof T)[] | (keyof T);

export type OmitFromRecord<T extends Record<string, unknown>, OmitedKeys extends Keys<T> = []> = Omit<T, OmitedKeys extends (infer U)[] ? U extends keyof T ? U : never : OmitedKeys extends keyof T ? OmitedKeys : never>;

export type WritablesFromRecord<T extends Record<string, unknown>, OmitedKeys extends Keys<T> = []> = RecordToWritables<OmitFromRecord<T, OmitedKeys>>;

export type WritablesFromRecordFn = <T extends Record<string, unknown>, OmitedKeys extends (keyof T)[] | (keyof T) = []>(record: T, omit?: OmitedKeys) => {
  [K in keyof Omit<T, OmitedKeys extends (infer U)[] ? U extends keyof T ? U : never : OmitedKeys extends keyof T ? OmitedKeys : never>]: Writable<T[K]> };

export type NullableKeys<T> = {
  [K in keyof T]: undefined extends T[K] ? K : never;
}[keyof T];

export type Defaults<T> = {
  [K in NullableKeys<T>]?: T[K];
};
