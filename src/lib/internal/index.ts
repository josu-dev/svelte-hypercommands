export const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

export type HyperId = string & { __hyper: true; };

export function hyperId(): HyperId {
    return crypto.getRandomValues(new Uint32Array(1))[0].toString(16) as HyperId;
}

export function stringAsHyperId(id: string): HyperId {
    return id as HyperId;
}

export function noopCleanup() { }

function _log(type: 'log' | 'info' | 'warn' | 'error', ...args: any[]): void {
    console[type](...args);
}

export const log = process.env.NODE_ENV === 'development' ? _log : undefined;
