import type { Readable, Unsubscriber, Writable } from 'svelte/store';
import { writable } from 'svelte/store';

export type StoreValue<T> = T extends Readable<infer V> ? V : never;

/** Readable with its value exposed. */
export interface ReadableExposed<T> extends Readable<T> {
    /**
     * Manually set the value of the store triggering updates.
     * @param value New value.
     */
    _set(value: T): void;

    /**
     * Manually sync the value with the store to trigger updates.
     */
    sync(): void;

    /**
     * Exposed value.
     */
    get value(): T;
}


export function readableExposed<T>(initialValue: T): ReadableExposed<T> {
    const { subscribe, set } = writable(initialValue);

    return {
        subscribe,
        get value() {
            return initialValue;
        },
        _set(value) {
            initialValue = value;
            set(initialValue);
        },
        sync() {
            set(initialValue);
        }
    };
}

/** Writable with its value exposed. */
export interface WritableExposed<T> extends Writable<T> {
    /**
     * Manually sync the value with the store to trigger updates.
     */
    sync(): void;

    /**
     * Exposed value.
     */
    get value(): T;
}

export function writableExposed<T>(initialValue: T): WritableExposed<T> {
    const { subscribe, set } = writable(initialValue);

    return {
        subscribe,
        set(value) {
            initialValue = value;
            set(initialValue);
        },
        update(updater) {
            initialValue = updater(initialValue);
            set(initialValue);
        },
        get value() {
            return initialValue;
        },
        sync() {
            set(initialValue);
        }
    };
}

export interface ExposedWritable<T> extends WritableExposed<T> {
    /**
     * Unsuscribe from the source store.
     */
    unsubscribe: Unsubscriber;
}

export function exposeWritable<T>(store: Writable<T>): ExposedWritable<T> {
    let _value: T;

    const unsubscribe = store.subscribe((value) => {
        _value = value;
    });

    return {
        subscribe: store.subscribe,
        set(value: T) {
            _value = value;
            store.set(value);
        },
        update(updater) {
            _value = updater(_value);
            store.set(_value);
        },
        get value() {
            return _value;
        },
        sync() {
            store.set(_value);
        },
        unsubscribe
    };
}
