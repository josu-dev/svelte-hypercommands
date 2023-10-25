import type {
	Invalidator,
	StartStopNotifier,
	Subscriber,
	Unsubscriber,
	Updater,
	Writable
} from 'svelte/store';
import { writable } from 'svelte/store';
import type { OnChangeCallback, SideEffectCallback } from './types';

export type WritablesFromRecordFn = <
	T extends Record<string, unknown>,
	OmitedKeys extends (keyof T)[] | keyof T = []
>(
	record: T,
	omit?: OmitedKeys
) => {
	[K in keyof Omit<
		T,
		OmitedKeys extends (infer U)[]
			? U extends keyof T
				? U
				: never
			: OmitedKeys extends keyof T
			? OmitedKeys
			: never
	>]: Writable<T[K]>;
};

export function writablesFromRecord<
	T extends Record<string, unknown>,
	Return extends {
		[K in keyof Omit<
			T,
			OmitedKeys extends (infer U)[]
				? U extends keyof T
					? U
					: never
				: OmitedKeys extends keyof T
				? OmitedKeys
				: never
		>]: Writable<T[K]>;
	},
	OmitedKeys extends (keyof T & string)[] | (keyof T & string) | undefined = undefined
>(record: T, omit?: OmitedKeys): Return {
	const toOmit = omit
		? typeof omit === 'string'
			? [omit]
			: omit
		: ([] as NonNullable<OmitedKeys>[]);
	const result: Record<string, Writable<any>> = {};
	for (const key of Object.keys(record)) {
		if (toOmit.includes(key as any)) {
			continue;
		}
		result[key] = writable(record[key]);
	}
	return result as Return;
}

export function writableWithOnChange<T>(
	store: Writable<T>,
	onChange: OnChangeCallback<T> | undefined = undefined
) {
	function update(updater: Updater<T>, sideEffect: SideEffectCallback<T> | undefined = undefined) {
		store.update((curr) => {
			const next = updater(curr);
			let res = next;
			if (onChange) {
				res = onChange({ curr, next });
			}
			sideEffect?.(res);
			return res;
		});
	}

	function set(newValue: T) {
		update(() => newValue);
	}

	return {
		subscribe: store.subscribe,
		update,
		set
	};
}

export function addValueAccessor<T>(store: Writable<T>) {
	let value: T;

	const unsubscribe = store.subscribe((val) => {
		value = val;
	});

	function subscribe(run: (value: T) => void, invalidate?: (value?: T) => void) {
		return store.subscribe(run, invalidate);
	}

	function set(newValue: T) {
		value = newValue;
		store.set(newValue);
	}

	function update(updater: Updater<T>) {
		value = updater(value);
		store.update(() => value);
	}

	return {
		subscribe,
		set,
		update,
		get value() {
			return value;
		},
		unsubscribe
	};
}
export function safe_not_equal(a: any, b: any): boolean {
	return a != a ? b == b : a !== b || (a && typeof a === 'object') || typeof a === 'function';
}
export function noop() {}
/**
 * Create a `Writable` store that allows both updating and reading by subscription.
 * Also has a `value` property that is kept in sync updated value.
 *
 * https://svelte.dev/docs/svelte-store#writable
 * @template T
 * @param {T} [value] initial value
 * @param {import('./public.js').StartStopNotifier<T>} [start]
 * @returns {import('./public.js').Writable<T>}
 */
export type WritableWithValue<T> = Writable<T> & {
	get value(): T;
};

const subscriber_queue: any[] = [];
export function writableWithValue<T>(value: T, start: StartStopNotifier<T> = noop): WritableWithValue<T> {
	let stop: Unsubscriber | null;
	const subscribers: Set<[Subscriber<T>, Invalidator<T>]> = new Set();
	function set(new_value: T): void {
		if (safe_not_equal(value, new_value)) {
			value = new_value;
			if (stop) {
				// store is ready
				const run_queue = !subscriber_queue.length;
				for (const subscriber of subscribers) {
					subscriber[1]();
					subscriber_queue.push(subscriber, value);
				}
				if (run_queue) {
					for (let i = 0; i < subscriber_queue.length; i += 2) {
						subscriber_queue[i][0](subscriber_queue[i + 1]);
					}
					subscriber_queue.length = 0;
				}
			}
		}
	}

	function update(fn: Updater<T>): void {
		set(fn(value));
	}

	function subscribe(run: Subscriber<T>, invalidate: Invalidator<T> = noop): Unsubscriber {
		const subscriber = [run, invalidate] as [Subscriber<T>, Invalidator<T>];
		subscribers.add(subscriber);
		if (subscribers.size === 1) {
			stop = start(set, update) || noop;
		}
		run(value);
		return () => {
			subscribers.delete(subscriber);
			if (subscribers.size === 0 && stop) {
				stop();
				stop = null;
			}
		};
	}

	return {
		set,
		update,
		subscribe,
		get value() {
			return value;
		}
	};
}
