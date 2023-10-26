export const isBrowser = typeof document !== 'undefined';

export function randomID(): string {
	return crypto.getRandomValues(new Uint32Array(1))[0].toString(16);
}

function _log(type: 'log' | 'info' | 'warn' | 'error', ...args: any[]): void {
	console[type](...args);
}

export const log = process.env.NODE_ENV === 'development' ? _log : undefined;
