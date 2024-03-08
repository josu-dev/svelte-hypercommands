import type { Register } from '$lib/index.js';
import type { HyperId } from '$lib/internal/index.js';
import type { MaybePromise, Values } from '$lib/utils/index.js';
import type { Writable } from 'svelte/store';
import type * as C from './constants.js';

//
// User defined preferences
//

export type UserDefinedCommand = Register extends { HyperCommand: infer _Config; }
    ? _Config extends {
        prefix?: string;
        meta?: Record<string, any>;
    } ? _Config : never
    : never;

export type UserDefinedPage = Register extends { HyperPage: infer _Config; }
    ? _Config extends {
        prefix?: string;
        meta?: Record<string, any>;
    } ? _Config : never
    : never;

export type HyperUserCustomItems = {
    [Type in string]: {
        prefix: string;
        name: string;
        type: Type;
        meta?: Record<string, any>;
    }
};

type UserDefinedItems = Register extends { HyperCustomItems: infer _Items; }
    ? _Items extends HyperUserCustomItems ? _Items : never
    : never;

export type HyperCustomTypes = UserDefinedItems[keyof UserDefinedItems]['type'];

export type HyperCustomPrefixes = UserDefinedItems[keyof UserDefinedItems]['prefix'];

export type HyperCustomNames = UserDefinedItems[keyof UserDefinedItems]['name'];

//
// Constants
//

export type HyperCommandType = typeof C.HYPER_ITEM_TYPE.COMMAND;

export type HyperCommandPrefix = UserDefinedCommand extends never ? typeof C.DEFAULT_PALETTE_MODE_PREFIX.COMMANDS
    : UserDefinedCommand extends { prefix: infer _Prefix; }
    ? _Prefix extends string ? _Prefix : never
    : typeof C.DEFAULT_PALETTE_MODE_PREFIX.COMMANDS;

export type HyperCommandName = UserDefinedCommand extends never ? 'commands'
    : UserDefinedCommand extends { name: infer _Name; }
    ? _Name extends string ? _Name : never
    : 'commands';

export type HyperPageType = typeof C.HYPER_ITEM_TYPE.PAGE;

export type HyperPagePrefix = UserDefinedPage extends never ? typeof C.DEFAULT_PALETTE_MODE_PREFIX.PAGES
    : UserDefinedPage extends { prefix: infer _Prefix; }
    ? _Prefix extends string ? _Prefix : never
    : typeof C.DEFAULT_PALETTE_MODE_PREFIX.PAGES;

export type HyperPageName = UserDefinedPage extends never ? 'pages'
    : UserDefinedPage extends { name: infer _Name; }
    ? _Name extends string ? _Name : never
    : 'pages';


export type HyperItemType = HyperCommandType | HyperPageType | HyperCustomTypes;

export type PaletteMode = HyperItemType;

export type PaletteCloseAction = Values<typeof C.PALETTE_CLOSE_ACTION>;

export type PaletteCloseOn = Values<typeof C.PALETTE_CLOSE_ON>;

export type ResultsEmptyMode = Values<typeof C.RESULTS_EMPTY_MODE>;

export type SortMode = Values<typeof C.SORT_MODE>;

//
// Item traits
//

type DefaultMeta = Record<string, any>;

export type HyperCommandMeta = UserDefinedCommand extends never ? DefaultMeta
    : UserDefinedCommand extends { meta: infer _Meta; }
    ? _Meta extends Record<string, any> ? _Meta : never
    : Record<string, any>;

export type HyperPageMeta = UserDefinedPage extends never ? DefaultMeta
    : UserDefinedPage extends { meta: infer _Meta; }
    ? _Meta extends Record<string, any> ? _Meta : never
    : Record<string, any>;

export type ItemRequestSource =
    | { type: 'submit'; }
    | { type: 'shortcut'; event: KeyboardEvent; shortcut: string; }
    | { type: 'click'; event: MouseEvent; };

export type ItemHookArgs<T extends HyperItemBase = HyperItemBase> = {
    item: T;
    source: ItemRequestSource;
};

export type ItemRequestHook<T extends HyperItemBase = HyperItemBase, RT = void> = (args: ItemHookArgs<T>) => MaybePromise<false | RT>;

export type ItemActionHook<T extends HyperItemBase = HyperItemBase, RT = void> = (args: ItemHookArgs<T> & { rargs: RT; }) => MaybePromise<void>;

export type ItemErrorHook<T extends HyperItemBase = HyperItemBase> = (args: ItemHookArgs<T> & { error: unknown; }) => MaybePromise<void>;

export type ItemUnregisterHook<T extends HyperItemBase = HyperItemBase> = (item: T) => MaybePromise<void>;

export interface HyperItemIdentifier<T = HyperItemType> {
    /**
     * @internal
     * 
     * Discriminator for the type of HyperItem.
     */
    readonly type: T;
    /**
     * A unique identifier for the HyperItem. It must be unique across all items.
     * 
     * If not provided, a random unique identifier will be generated.
     */
    readonly id: HyperId;
    /**
     * Display name of the HyperItem.
     */
    name: string;
}

export interface HyperItemBase {
    /**
     * Category of the HyperItem. Can be used to group items in the palette.
     */
    category: string;
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
    onRequest: ItemRequestHook;
    /**
     * Hook to call when the user triggers the HyperItem.
     * 
     * If its async, the palette will wait for it to resolve before continuing.
     */
    onAction: ItemActionHook;
    /**
     * Hook to handle errors during the execution of the HyperItem.
     * 
     * If not provided, the error will be silently ignored.
     */
    onError?: ItemErrorHook;
    /**
     * Hook for cleaning up resources when the HyperItem is unregistered.
     */
    onUnregister?: ItemUnregisterHook;
    /**
     * Overrides the default close action for the palette when the item is executed.
     * 
     * @see {@link HyperPaletteOptions.closeAction} for more information.
     */
    closeAction?: PaletteCloseAction;
    /**
     * Overrides the default close on for the palette when the item is executed.
     * 
     * @see {@link HyperPaletteOptions.closeOn} for more information.
     */
    closeOn?: PaletteCloseOn;
    /**
     * User-defined metadata of the shape `Record<string, unknown>`.
     * 
     * Can be set by extending the `Register` interface with the `HyperPageMeta` prop in the `svelte-hypercommands` module.
     */
    meta: Record<string, any>;
}

export interface HyperCommand extends HyperItemBase, HyperItemIdentifier<HyperCommandType> {
    /**
     * Display name of the HyperCommand.
     */
    name: string;
    /**
     * Description of the HyperCommand. Can be used to provide additional information in the palette.
     */
    description: string;
    /**
     * User-defined metadata of the shape `Record<string, unknown>`.
     * 
     * Can be set by extending the `Register` interface with the `HyperCommandMeta` prop in the `svelte-hypercommands` module.
     */
    meta: HyperCommandMeta;
}

export type HyperCommandDefinition =
    | Pick<HyperCommand, 'name' | 'onAction'>
    & { id?: string; shortcut?: string | string[]; }
    & Partial<Pick<HyperCommand, 'category' | 'description' | 'onRequest' | 'onError' | 'onUnregister' | 'closeAction' | 'closeOn' | 'meta'>>;

export interface HyperPage extends HyperItemIdentifier<HyperPageType> {
    /**
     * Display name of the HyperPage.
     * 
     * If not provided, the last segment of the page's URL path will be used as the name.
     */
    name: string;
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
     * User-defined metadata of the shape `Record<string, unknown>`.
     * 
     * Can be set by extending the `Register` interface with the `HyperPageMeta` prop in the `svelte-hypercommands` module.
     */
    meta: HyperPageMeta;
}

export type HyperPageDefinition = Pick<HyperPage, 'url'> & Partial<Pick<HyperPage, 'id' | 'name' | 'meta'>>;

export interface HyperCustomItem<T extends HyperCustomTypes = HyperCustomTypes> extends HyperItemBase, HyperItemIdentifier<T> {
    meta: UserDefinedItems[T]['meta'] extends never ? DefaultMeta : UserDefinedItems[T]['meta'];
}

export type HyperCustomItemDefinition<T extends HyperCustomTypes = HyperCustomTypes> =
    | HyperItemIdentifier<T>
    & Partial<HyperItemBase>
    & Pick<HyperCustomItem<T>, 'onAction'>;

export type HyperItem = HyperCommand | HyperPage | { [T in HyperCustomTypes]: HyperCustomItem<T>; }[HyperCustomTypes];

export type ItemMatcher<T extends HyperItem> = HyperId | T | ((item: T) => boolean);

export type CommandMatcher = ItemMatcher<HyperCommand>;

export type PageMatcher = ItemMatcher<HyperPage>;

export type CleanupCallback = () => void;

export type HyperItemTypeMap =
    | Record<HyperCommandType, HyperCommand>
    & Record<HyperPageType, HyperPage>
    & { [T in HyperCustomTypes]: HyperCustomItem<T>; };

export type HyperItemPrefixMap =
    | Record<HyperCommandType, HyperCommandPrefix>
    & Record<HyperPageType, HyperPagePrefix>
    & { [T in HyperCustomTypes]: UserDefinedItems[T]['prefix']; };


export type PaletteItemConfig<T extends HyperItemType, Item = HyperItemTypeMap[T]> = {
    /**
     * Prefix used in the search input for setting the mode.
     */
    prefix: HyperItemPrefixMap[T];
    // /**
    //  * The registered items.
    //  */
    // items: Item[];
    // /**
    //  * History of items triggered.
    //  */
    // history: HyperId[];
    /**
     * How to sort the items results.
     * 
     * @default "ASC"
     */
    sortMode: SortMode;
    /**
     * What set of items to display if there is no input.
     * 
     * @default "ALL"
     */
    emptyMode: ResultsEmptyMode;
    /**
     * The shortcut to open the palette in the given mode.
     */
    shortcut: string[];
    /**
     * The function to map an item to a string for searching.
     */
    mapToSearch: (item: Item) => string;
};

export type PaletteItems =
    | { [K in HyperCommandType]: PaletteItemConfig<HyperCommandType> }
    & { [K in HyperPageType]: PaletteItemConfig<HyperPageType> & {
        /**
         * The hook to call when the user triggers a page navigation.
         */
        onNavigation: (page: HyperPage) => MaybePromise<void>;
        /**
         * The hook to call when the user triggers a page navigation to an external URL.
         * When is provided the `onNavigation` hook will not be called.
         * 
         * If returns a promise, the palette will wait for it to resolve before continuing.
         * 
         * @default (url) => window.open(url, '_blank', 'noopener')
         */
        onNavigationExternal: (url: string) => MaybePromise<void>;
        /**
         * The hook to call when the user triggers a page navigation to a local URL.
         * When is provided the `onNavigation` hook will not be called.
         * 
         * If returns a promise, the palette will wait for it to resolve before continuing.
         * 
         * @default (url) => window.location.href = url
         */
        onNavigationLocal: (url: string) => MaybePromise<void>;
    } }
    & { [K in HyperCustomTypes]: PaletteItemConfig<K> & {
        /**
         * The value used as the type discriminator for the custom item.
         */
        type: K;
    }; };

export type HyperPaletteItemsOptions =
    | { [K in HyperCommandType]: Partial<PaletteItemConfig<HyperCommandType>> }
    & { [K in HyperPageType]: Partial<PaletteItemConfig<HyperPageType>> }
    & { [K in HyperCustomTypes]: PaletteItemConfig<K>; };

export type HyperPaletteElements = {
    palette: HTMLElement;
    panel: HTMLElement;
    form: HTMLFormElement;
    label: HTMLLabelElement;
    input: HTMLInputElement;
    command: HTMLElement;
    pages: HTMLElement;
    custom: HTMLElement;
};

export type HyperPaletteIds = {
    [K in keyof Pick<HyperPaletteElements, 'palette' | 'panel' | 'form' | 'label' | 'input'>]: string;
};

export type HyperPaletteOptions = {
    /**
     * Defines the action to take when the palette is closed.
     * 
     * - `RESET`: Resets the state to its initial value.
     * - `KEEP`: Keeps the state as is.
     * 
     * @default "RESET"
     */
    closeAction: PaletteCloseAction;
    /**
     * Defines when to close the palette.
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
    closeOn: PaletteCloseOn;
    /**
     * Default input text when the palette is opened.
     * 
     * @default ""
     */
    defaultSearch: string;
    /**
     * Default mode of the palette.
     * 
     * @default "PAGES"
     */
    defaultMode: PaletteMode;
    /**
     * Placeholder for the search input.
     * 
     * @default "Search pages... use > to search commands..."
     */
    defaultPlaceholder: string | false;
    /**
     * Whether the palette should be open by default.
     * 
     * @default false
     */
    defaultOpen: boolean;
    /**
     * Ids for the different elements of the palette.
     * 
     * If not provided, random unique ids will be generated.
     */
    ids: HyperPaletteIds;
    /**
     * The configuration for the different types of items in the palette.
     * 
     * Providing more items than the default types will create a custom items in the palette.
     * The types can be Registered in the `Register` interface under the `HyperCustomTypes` prop in the `svelte-hypercommands` module.
     */
    itemsOptions: HyperPaletteItemsOptions;
    /**
     * A `Writable` store to control the open state of the palette from outside.
     */
    open: Writable<boolean>;
    /**
     * The target element to append the palette to.
     * 
     * - `false` no use of a portal.
     * - `string` a css selector for the portal target.
     * - `HTMLElement` the portal target.
     * 
     * @default false
     */
    portal: HTMLElement | string | false | undefined;
    /**
     * Whether to reset the palette state when it is opened.
     * 
     * Using `true` will override the `closeAction` option.
     * 
     * @default true
     */
    resetOnOpen: boolean;
    /**
     * The `HTMLElement` ref of the currently selected result.
     */
    selected: Writable<{
        el: HTMLElement | undefined;
        idx: number;
        id: HyperId | string | undefined;
    }>;
};

export type CreatePaletteOptions = Partial<Pick<
    HyperPaletteOptions,
    | 'closeAction' | 'closeOn'
    | 'defaultSearch' | 'defaultMode' | 'defaultPlaceholder' | 'defaultOpen'
    | 'ids' | 'itemsOptions'
    | 'open' | 'portal' | 'resetOnOpen'
    | 'selected'
>>;
