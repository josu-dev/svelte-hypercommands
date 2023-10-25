import type { Action } from 'svelte/action';
import type { Readable, Stores, StoresValues } from 'svelte/store';


export type ChangeFn<T> = (args: { curr: T; next: T }) => T;

type BuilderPrefix = 'hcmd';

export type BuilderCallback<S extends Stores | undefined> = S extends Stores
  ? (values: StoresValues<S>) => Record<string, any> | ((...args: any[]) => Record<string, any>)
  : () => Record<string, any> | ((...args: any[]) => Record<string, any>);

export type BuilderStore<
  S extends Stores | undefined,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  A extends Action<any, any>,
  R extends BuilderCallback<S>,
  Name extends string
> = Readable<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ReturnType<R> extends (...args: any) => any
  ? ((
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - This is a valid type, but TS doesn't like it for some reason. TODO: Figure out why
    ...args: Parameters<ReturnType<R>>
  ) => ReturnType<R> & { [K in `data-${BuilderPrefix}-${Name}`]: '' } & { action: A; }) & { action: A; }
  : ReturnType<R> & { [K in `data-${BuilderPrefix}-${Name}`]: '' } & { action: A; }
>;

export type ExplicitBuilderReturn<
  S extends Stores | undefined,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  A extends Action<any, any>,
  R extends BuilderCallback<S>,
  Name extends string
> = BuilderStore<S, A, R, Name> & A;

export type BuilderArgs<
  S extends Stores | undefined,
  A extends Action<any, any>,
  R extends BuilderCallback<S>
> = {
  stores?: S;
  action?: A;
  returned?: R;
};

export type Builder = <
  S extends Stores | undefined,
  A extends Action<any, any>,
  R extends BuilderCallback<S>,
  Name extends string
>(name: Name, args?: BuilderArgs<S, A, R>) => ExplicitBuilderReturn<S, A, R, Name>;

export type BuilderReturn<T extends (...args: any) => any> = {
	[P in keyof ReturnType<T>]: ReturnType<T>[P];
};
