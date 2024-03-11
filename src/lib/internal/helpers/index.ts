export { builder } from './builder.js';
export * from './keyboard/index.js';
export * from './search/index.js';
export * from './stores.js';
export type * from './types.js';

export const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

export type HyperId = string & { __hyper: true; };

export function hyperId(): HyperId {
    return crypto.getRandomValues(new Uint32Array(1))[0].toString(16) as HyperId;
}

export function noop(): void { }
