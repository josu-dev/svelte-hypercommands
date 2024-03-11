import type { Action } from 'svelte/action';
import type { Readable, Stores, StoresValues, Subscriber, Unsubscriber } from 'svelte/store';
import { derived } from 'svelte/store';

export function noop() { }

/**
 * Create a store from the initial value and never update it.
 * 
 * Side effects free.
 */
export function lightable<T>(value: T): Readable<T> {
    function subscribe(run: Subscriber<T>): Unsubscriber {
        run(value);
        return () => { };
    }

    return { subscribe };
}

export function hiddenAction<T extends Record<string, unknown>>(obj: T) {
    return new Proxy(obj, {
        get(target, prop, receiver) {
            return Reflect.get(target, prop, receiver);
        },
        ownKeys(target) {
            const keys = [];
            for (const key of Reflect.ownKeys(target)) {
                if (key === 'action') {
                    continue;
                }
                keys.push(key);
            }
            return keys;
        },
    });
}

type BuilderCallback<S extends Stores | undefined> = S extends Stores
    ? (values: StoresValues<S>) => Record<string, any>
    : () => Record<string, any>;

type BuilderArgs<
    S extends Stores | undefined,
    A extends Action<any, any>,
    R extends BuilderCallback<S>,
> = S extends undefined ? {
    stores?: never;
    returned: () => Record<string, any>;
    action?: A;
} : {
    stores: S;
    returned: R;
    action?: A;
};

type BuilderStore<
    S extends Stores | undefined,
    A extends Action<any, any>,
    R extends BuilderCallback<S>,
    Name extends string,
> =
    Readable<
        ReturnType<R> & { [K in `data-hyper-${Name}`]: '' }
    >;

export type ExplicitBuilderReturn<
    S extends Stores | undefined,
    A extends Action<any, any>,
    R extends BuilderCallback<S>,
    Name extends string,
> = BuilderStore<S, A, R, Name> & A;

export function builder<
    S extends Stores | undefined,
    A extends Action<any, any>,
    R extends BuilderCallback<S>,
    Name extends string,
>(name: Name, args?: BuilderArgs<S, A, R>): ExplicitBuilderReturn<S, A, R, Name> {
    const { stores, action, returned } = args ?? {};

    let derivedStore: BuilderStore<S, A, R, Name>;
    if (stores && returned) {
        derivedStore = derived(
            stores,
            (values) => {
                const result = returned(values);

                return hiddenAction({
                    ...result,
                    [`data-hyper-${name}`]: '',
                    action: action ?? noop,
                }) as any;
            }
        );
    }
    else {
        const result = (returned as () => R | undefined)?.() ?? {};

        derivedStore = lightable(
            hiddenAction({
                ...result,
                [`data-hyper-${name}`]: '',
                action: action ?? noop,
            }) as any
        );
    }

    const result = (
        action ?? (() => { })
    ) as A & { subscribe: typeof derivedStore.subscribe; };

    result.subscribe = derivedStore.subscribe;

    return result;
}
