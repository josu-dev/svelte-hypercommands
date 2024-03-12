import type { Register } from '$lib/index.js';
import type { Cleanup, DeepPartial, HyperId, MaybePromise, OneOrMany, Searcher, Tuple, Values, WritableExposed } from '$lib/internal/helpers/index.js';
import type { Writable } from 'svelte/store';
import type * as C from './constants.js';

//
// Constants
//

export type HyperItemType = Values<typeof C.HYPER_ITEM>;

export type HyperActionableType = typeof C.HYPER_ITEM.ACTIONABLE;

export type HyperNavigableType = typeof C.HYPER_ITEM.NAVIGABLE;

export type HyperSearchableType = typeof C.HYPER_ITEM.SEARCHABLE;

export type PaletteMode = string;

export type PaletteCloseAction = Values<typeof C.PALETTE_CLOSE_ACTION>;

export type ActionableCloseOn = Values<typeof C.ACTIONABLE_CLOSE_ON>;

export type NavigableCloseOn = Values<typeof C.NAVIGABLE_CLOSE_ON>;

export type ResultsEmptyMode = Values<typeof C.NO_RESULTS_MODE>;

export type SortMode = Values<typeof C.SORT_MODE>;

//
// User defined preferences
//

export type GlobalUserActionable = Register extends { HyperActionable: infer _Config; }
    ? _Config extends {
        meta?: HyperItemMeta;
    } ? _Config : never
    : { meta: HyperItemMeta; };

export type GlobalUserNavigable = Register extends { HyperNavigable: infer _Config; }
    ? _Config extends {
        meta?: HyperItemMeta;
    } ? _Config : never
    : { meta: HyperItemMeta; };

export type GlobalUserItemsTrait = {
    [Name in string]: {
        type: HyperItemType;
        prefix: string;
        mode: string;
        meta?: HyperItemMeta;
    }
};

type InferUserMeta<T> = T extends never ? HyperItemMeta
    : T extends { meta: infer _Meta; }
    ? _Meta extends HyperItemMeta ? _Meta : never
    : HyperItemMeta;

export type GlobalActionableMeta = InferUserMeta<GlobalUserActionable>;

export type GlobalNavigableMeta = InferUserMeta<GlobalUserNavigable>;

//
// Item traits
//

export type HyperItemMeta = Record<string, any>;

export type HyperItemId = HyperId | string;

export interface HyperItemBase<T extends HyperItemType = HyperItemType> {
    /**
     * @internal do not use.
     * 
     * Discriminator for the type of HyperItem.
     */
    readonly type: T;
    /**
     * A unique identifier for the HyperItem. It must be unique across all items.
     * 
     * If not provided, a random unique identifier will be generated.
     */
    readonly id: HyperItemId;
    /**
     * Display name for the HyperItem.
     */
    name: string;
    /**
     * @internal use under your own risk.
     *
     * Record for storing computed values.
     */
    hcache: Record<string, any>;
}

export type ItemRequestSource =
    | { type: 'submit'; event: SubmitEvent; }
    | { type: 'shortcut'; event: KeyboardEvent; shortcut: string; }
    | { type: 'click'; event: MouseEvent; };

export type ActionableHookArgs<T extends HyperActionable = HyperActionable> = {
    item: T;
    source: ItemRequestSource;
};

export type ActionableRequest<T extends HyperActionable = HyperActionable, RT = any> = (args: ActionableHookArgs<T>) => MaybePromise<false | RT>;

export type ActionableAction<T extends HyperActionable = HyperActionable, RT = any> = (args: ActionableHookArgs<T> & { rargs: RT; }) => MaybePromise<void>;

export type ActionableError<T extends HyperActionable = HyperActionable> = (args: ActionableHookArgs<T> & { error: any; }) => MaybePromise<void>;

export type ActionableUnregister<T extends HyperActionable = HyperActionable> = (item: T) => MaybePromise<void>;

export interface HyperActionable extends HyperItemBase<HyperActionableType> {
    /**
     * Category of the HyperItem. Can be used to group items in the palette.
     */
    category: string;
    /**
     * Description of the HyperCommand. Can be used to provide additional information in the palette.
     */
    description: string;
    /**
     * Shortcut/s to trigger the HyperItem.
     */
    shortcut: string[];
    /**
     * Hook to determine whether the HyperItem can be executed.
     * 
     * If its async, the palette will wait for it to resolve before continuing.
     * 
     * Return value interpretation:
     * - Returning `false` prevents the item from being executed.
     * - Returning other value than else will be passed to the `onAction` hook as last argument.
     */
    onRequest: ActionableRequest;
    /**
     * Hook to call when the user triggers the HyperItem.
     * 
     * If its async, the palette will wait for it to resolve before continuing.
     */
    onAction: ActionableAction;
    /**
     * Hook to handle errors during the execution of the HyperItem.
     * 
     * If not provided, the error will be silently ignored.
     */
    onError?: ActionableError;
    /**
     * Hook for cleaning up resources when the HyperItem is unregistered.
     */
    onUnregister?: ActionableUnregister;
    /**
     * Overrides the default close action for the palette when the item is executed.
     * 
     * @see {@link PaletteOptions.closeAction} for more information.
     */
    closeAction?: PaletteCloseAction;
    /**
     * Overrides the default close on for HyperCommands.
     * 
     * @see {@link PaletteOptions.items} for more information.
     */
    closeOn?: ActionableCloseOn;
    /**
     * User-defined metadata of the shape `Record<string, unknown>`.
     * 
     * Can be set by extending the `Register` interface with the `HyperActionable` prop in the `svelte-hypercommands` module.
     */
    meta: GlobalActionableMeta;
}

export type HyperActionableDefinition =
    | Pick<HyperActionable, 'name' | 'onAction'>
    & { shortcut?: string | string[]; }
    & Partial<Pick<HyperActionable, 'id' | 'category' | 'description' | 'onRequest' | 'onError' | 'onUnregister' | 'closeAction' | 'closeOn' | 'meta'>>;

export interface HyperNavigable extends HyperItemBase<HyperNavigableType> {
    /**
     * A flag indicating whether the HyperPage is an external URL.
     * 
     * This is inferred from the provided `url`.
     */
    readonly external: boolean;
    /**
     * The url of the HyperPage.
     * 
     * If the url starts with a '/', it is considered a local url. Otherwise, it is treated as an external url.
     * 
     * External urls must be valid according to the URL standard.
     */
    readonly url: string;
    /**
     * The host and pathname of the HyperPage's URL.
     * 
     * For local URLs, this is equivalent to the pathname.
     */
    readonly urlHostPathname: string;
    /**
     * Overrides the default close on for HyperPages.
     * 
     * @see {@link PaletteOptions.items} for more information.
     */
    closeOn?: NavigableCloseOn;
    /**
     * User-defined metadata of the shape `Record<string, unknown>`.
     * 
     * Can be set by extending the `Register` interface with the `HyperPageMeta` prop in the `svelte-hypercommands` module.
     */
    meta: GlobalNavigableMeta;
}

export type HyperNavigableDefinition = Pick<HyperNavigable, 'url'> & Partial<Pick<HyperNavigable, 'id' | 'name' | 'meta'>>;

/**
 * @deprecated Not supported yet.
 */
export interface HyperSearchable extends HyperItemBase<HyperSearchableType> { }

/** 
 * @deprecated Not supported yet.
 */
export type HyperSearchableDefinition = Partial<HyperSearchable>;

export type ItemTypeToItem =
    | { [K in HyperActionableType]: HyperActionable }
    & { [K in HyperNavigableType]: HyperNavigable }
    & { [K in HyperSearchableType]: HyperSearchable };

export type AnyHyperItem = ItemTypeToItem[HyperItemType];

export type ItemMatcher<T extends AnyHyperItem> = HyperItemId | T | ((item: T) => boolean);


type ItemTypeToSortableKeys =
    | { [K in HyperActionableType]: Tuple<keyof Pick<HyperActionable, 'category' | 'description' | 'id' | 'name'>> }
    & { [K in HyperNavigableType]: Tuple<keyof Pick<HyperNavigable, 'id' | 'name' | 'url' | 'urlHostPathname'>> }
    & { [K in HyperSearchableType]: Tuple<keyof Pick<HyperSearchable, 'id' | 'name'>> };

export type HyperItemSorter<T extends AnyHyperItem> =
    | ItemTypeToSortableKeys[T['type']]
    | ((items: T[]) => T[]);

export type HyperModeBaseConfig<T extends HyperItemType> = {
    /**
     * The type of item.
     */
    type: T;
    /**
     * What set of items to display if there is no input.
     * 
     * @default "ALL"
     */
    emptyMode: ResultsEmptyMode;
    /**
     * Function to map the item to a searchable string of the desired item's properties.
     */
    mapToSearch: (item: ItemTypeToItem[T]) => string;
    /**
     * Prefix used in the search input for setting the mode.
     */
    prefix: string;
    /**
     * Shortcut/s to open the palette in the given mode.
     * 
     * @default []
     */
    shortcut?: string[];
    /**
     * How the items should be sorted.
     * 
     * It can be a list of keys of the item properties to be used in that order to use as the sorting keys
     * or a function that receives the items and sorts them inplace.
     * 
     * If not provided, the items will be sorted by the `mapToSearch` function.
     */
    sortBy?: HyperItemSorter<ItemTypeToItem[T]>;
    /**
     * How to sort the items results.
     * 
     * - `SORTED`: The items keep the order of the `sortBy` | `mapToSearch` functions or ascending if sortBy is an array of keys.
     * - `REVERSE`: Reverses the results of the `SORTED` mode.
     * - `NONE`: The items are not sorted. They are displayed in the order of registration.
     * 
     * @default "SORTED"
     */
    sortMode?: SortMode;
};

export interface HyperActionableConfig extends HyperModeBaseConfig<HyperActionableType> {
    /**
     * Defines if the palette should automatically close.
     * 
     * - `ALWAYS`: The palette will close after the action is canceled, successful or an error occurs.
     * - `NEVER`: The palette will never close automatically.
     * - `ON_TRIGGER`: The palette will close before starting the action.
     * - `ON_CANCEL`: The palette will close after the action is canceled.
     * - `ON_SUCCESS`: The palette will close after the action is successful.
     * - `ON_ERROR`: The palette will close after an error occurs.
     * 
     * @default "ALWAYS"
     */
    closeOn: ActionableCloseOn;
}

export type HyperActionableOptions =
    Pick<
        HyperActionableConfig,
        'type' | 'mapToSearch' | 'prefix'
    >
    & Partial<Omit<
        HyperActionableConfig,
        'type' | 'mapToSearch' | 'prefix'
    >>;

export interface HyperNavigableConfig extends HyperModeBaseConfig<HyperNavigableType> {
    /**
     * Defines if the palette should automatically close.
     * 
     * - `ALWAYS`: The palette will close after the navigation is successful or an error occurs.
     * - `NEVER`: The palette will never close automatically.
     * - `ON_TRIGGER`: The palette will close before starting the navigation.
     * - `ON_SUCCESS`: The palette will close after the navigation is successful.
     * - `ON_ERROR`: The palette will close after an error occurs.
     * 
     * @default "ALWAYS"
     */
    closeOn: NavigableCloseOn;
    /**
     * Hook to handle external navigations.
     * 
     * If returns a promise, the palette will wait for it to resolve before continuing.
     * 
     * @default (url) => window.open(url, '_blank', 'noopener')
     */
    onExternal: (url: string) => MaybePromise<void>;
    /**
     * Hook to handle local navigations.
     * 
     * If returns a promise, the palette will wait for it to resolve before continuing.
     * 
     * @default (url) => window.location.href = url
     */
    onLocal: (url: string) => MaybePromise<void>;
    /**
     * Hook to call when the user triggers the navigable item.
     * 
     * If returns a promise, the palette will wait for it to resolve before continuing.
     * 
     * If provided, the `onExternal` and `onLocal` hooks will not be called.
     */
    onNavigation?: (item: HyperNavigable) => MaybePromise<void>;
    /**
     * Hook to handle errors during the navigation.
     * 
     * If not provided, the error will be silently ignored.
     */
    onError?: (args: { error: unknown, item: HyperNavigable, source: ItemRequestSource; }) => MaybePromise<void>;
}

export type HyperNavigableOptions =
    Pick<
        HyperNavigableConfig,
        'type' | 'mapToSearch' | 'prefix'
    >
    & Partial<Omit<
        HyperNavigableConfig,
        'type' | 'mapToSearch' | 'prefix'
    >>;

/**
 * @deprecated Not supported yet.
 */
export interface HyperSearchableConfig extends HyperModeBaseConfig<HyperSearchableType> { }

/**
 * @deprecated Not supported yet.
 */
export type HyperSearchableOptions =
    Pick<
        HyperSearchableConfig,
        'type' | 'mapToSearch' | 'prefix'
    >
    & Partial<Omit<
        HyperSearchableConfig,
        'type' | 'mapToSearch' | 'prefix'
    >>;

type ItemTypeToModeOptions =
    | { [K in HyperActionableType]: HyperActionableOptions }
    & { [K in HyperNavigableType]: HyperNavigableOptions }
    & { [K in HyperSearchableType]: HyperSearchableOptions };

export type AnyHyperModeOptions = {
    [T in HyperItemType]: ItemTypeToModeOptions[T];
}[HyperItemType];

export type PaletteElements = {
    palette: HTMLElement;
    panel: HTMLElement;
    form: HTMLFormElement;
    label: HTMLLabelElement;
    input: HTMLInputElement;
    item: HTMLElement;
};

export type PaletteIds = {
    [K in keyof Omit<PaletteElements, 'item'>]: string;
};

export type PaletteDefaultsOptions<T extends string = string> = {
    /**
     * Ids for the different elements of the palette.
     * 
     * If not provided, random unique ids will be generated.
     */
    ids?: PaletteIds;
    /**
     * Default mode of the palette.
     */
    mode?: T;
    /**
     * Whether the palette should be open by default.
     * 
     * @default false
     */
    open: boolean;
    /**
     * Placeholder for the search input.
     */
    placeholder?: string;
    /**
     * Initial text for the search input.
     * 
     * If provided, the palette mode will be inferred from it taking precedence over the `mode` option.
     * 
     * @default ""
     */
    search: string;
};

export type PaletteModesOptions = Record<string, AnyHyperModeOptions>;

export type PaletteOptions = {
    /**
     * Defines the action to take when the palette is closed.
     * 
     * - `KEEP`: Keeps the state as is.
     * - `KEEP_CLOSE`: Keeps the state as is and closes the palette.
     * - `RESET`: Resets the state to its initial value.
     * - `RESET_CLOSE`: Resets the state to its initial value and closes the palette.
     * 
     * @default "RESET"
     */
    closeAction: PaletteCloseAction;
    /**
     * Whether to close the palette when the user clicks outside of it.
     * 
     * @default true
     */
    closeOnClickOutside: boolean;
    /**
     * Whether to close the palette when the user presses the escape key.
     * 
     * @default true
     */
    closeOnEscape: boolean;
    /**
     * Debounce time for processing the search input in milliseconds.
     * 
     * A value greater than 0 will debounce the input. Otherwise, the input will be processed immediately.
     * 
     * @default 150
     */
    debounce: number;
    /**
     * Default values for initializing the palette.
     */
    defaults: PaletteDefaultsOptions<string>;
    /**
     * The configuration for the different modes of the palette.
     * 
     * Each key is the name of the mode and the value is the configuration for that mode.
     */
    modes: PaletteModesOptions;
    /**
     * A `Writable` store to control the open state of the palette from outside.
     */
    open: Writable<boolean>;
    /**
     * A `Writable` store to control the placeholder of the search input from outside.
     */
    placeholder: Writable<string | undefined>;
    /**
     * The target element to append the palette to.
     * 
     * - `false` no use of a portal.
     * - `string` a css selector for the portal target.
     * - `HTMLElement` the portal target.
     * 
     * @default false
     */
    portal: HTMLElement | string | false;
    /**
     * Whether to reset the palette state when it is opened.
     * 
     * Using `true` will override the `closeAction` option.
     * 
     * @default false
     */
    resetOnOpen: boolean;
};

export type CreatePaletteOptions =
    | DeepPartial<
        Pick<
            PaletteOptions,
            | 'closeAction' | 'closeOnClickOutside' | 'closeOnEscape'
            | 'debounce'
            | 'defaults'
            | 'open' | 'placeholder'
            | 'portal' | 'resetOnOpen'
        >
    >
    & Pick<PaletteOptions, 'modes'>;

export type PaletteModeSort =
    | {
        type: 'search';
        mapper: (item: any) => string;
        sorter: (items: any[]) => void;
    }
    | {
        type: 'keys';
        mapper: (item: any) => string;
        sorter: (items: any[]) => void;
    }
    | {
        type: 'custom';
        sorter: (items: any[]) => void;
    };

export type PaletteModeState<
    T extends HyperItemType = HyperItemType,
    Mode extends string = string,
    Item extends AnyHyperItem = ItemTypeToItem[T],
> =
    {
        mode: Mode;
        sort: PaletteModeSort;
        config: ItemTypeToModeOptions[T];
        items: WritableExposed<Item[]>;
        results: WritableExposed<Item[]>;
        history: WritableExposed<HyperItemId[]>;
        searcher: Searcher<Item>;
        current: WritableExposed<Item | undefined>;
        rawAll: Item[];
        rawAllSorted: Item[];
        lastInput: string;
    };

export type PaletteSelected = {
    el: HTMLElement | undefined;
    idx: number;
    id: HyperId | string | undefined;
};

export type PaletteError<T extends PaletteModesOptions, M extends string = keyof T & string> = {
    [Mode in M]: {
        error: unknown;
        mode: Mode;
        item: ItemTypeToItem[T[Mode]['type']];
        source: ItemRequestSource;
    };
}[M];

export type PaletteModesReturn<C extends PaletteModesOptions> = {
    [K in keyof C]: {
        items: Writable<ItemTypeToItem[C[K]['type']][]>;
        results: Writable<ItemTypeToItem[C[K]['type']][]>;
        history: Writable<HyperItemId[]>;
        current: Writable<ItemTypeToItem[C[K]['type']] | undefined>;
    };
};

export type CreatePaletteReturn<T extends PaletteModesOptions, M extends string = keyof T & string> = {
    elements: {
        [K in keyof PaletteElements]: any;
    };
    helpers: {
        registerItem: <Mode extends M>(mode: Mode, item: OneOrMany<ItemTypeToItem[T[Mode]['type']]>, override?: boolean, silent?: boolean) => Cleanup;
        unregisterItem: <Mode extends M>(mode: Mode, item: OneOrMany<ItemMatcher<ItemTypeToItem[T[Mode]['type']]>>) => void;
        search: (pattern: string) => void;
        openPalette: (mode?: M) => void;
        closePalette: () => void;
        togglePalette: () => void;
        registerPaletteShortcuts: () => void;
        unregisterPaletteShortcuts: () => void;
    };
    states: {
        open: Writable<boolean>;
        error: Writable<PaletteError<T> | undefined>;
        mode: Writable<M>;
        modes: PaletteModesReturn<T>;
        placeholder: Writable<string | undefined>;
        portal: Writable<HTMLElement | string | false>;
        searchInput: Writable<string>;
    };
};

function createPalette<T extends CreatePaletteOptions>(
    options: T
): CreatePaletteReturn<T['modes']> {
    return {} as any;
}

const res = createPalette({
    modes: {
        commands: {
            type: 'ACTIONABLE',
            mapToSearch: (item) => item.category + item.name,
            prefix: '!',
            closeOn: 'ALWAYS',
        },
    }
});
