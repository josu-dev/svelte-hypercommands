export const isBrowser = typeof document !== 'undefined';

export function randomId() {
	return crypto.getRandomValues(new Uint32Array(1))[0].toString(16);
}

export function noopAction() {}


function _log(type: 'log' | 'info' | 'warn' | 'error', ...args: any[]) {
	console[type](...args);
}

export const log = process.env.NODE_ENV === 'development' ? _log : undefined;
