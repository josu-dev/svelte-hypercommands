import type { Register } from '$lib/index.js';
import type { HyperId } from '$lib/internal/index.js';
import type { MaybePromise } from '$lib/utils/index.js';
import type { Writable } from 'svelte/store';

export type HyperCommandType = "COMMAND";

export type HyperPageType = "PAGE";

export type HyperItemType = HyperCommandType | HyperPageType;

export type PaletteMode = "PAGES" | "COMMANDS";

export type ResultsEmptyMode = 'ALL' | 'HISTORY' | 'NONE';

export type SortMode = 'ASC' | 'DESC' | 'NONE';

export type CommandPaletteOptions = {
    /**
     * Commands to display in the commands mode of the palette.
     */
    commands?: HyperCommand[];
    /**
     * What set of commands to display there there is no input.
     * 
     * @default "ALL"
     */
    commandsEmptyMode?: ResultsEmptyMode;
    /**
     * History of commands executed.
     */
    commandsHistory?: HyperId[];
    /**
     * Shortcut to open the palette in commands mode.
     * 
     * @default "$mod+Shift+P"
     */
    commandsShortcut?: string;
    /**
     * @todo
     * 
     * How to sort the commands results (by name).
     * 
     * @default "ASC"
     */
    commandsSortMode?: SortMode;
    /**
     * Default input text to display in the search input on palette reset.
     */
    defaultInputText?: string;
    /**
     * Whether the palette should be open by default.
     */
    defaultOpen?: boolean;
    /**
     * Error captured during command execution or page navigation.
     */
    error?: { error: unknown; command?: HyperCommand; page?: HyperPage; };
    /**
     * The hook to call when the user triggers a page navigation.
     */
    onNavigation?: (page: HyperPage) => MaybePromise<void>;
    /**
     * The hook to call when the user triggers a page navigation to an external URL.
     * When is provided the `onNavigation` hook will not be called.
     * 
     * If returns a promise, the palette will wait for it to resolve before continuing.
     * 
     * @default (url) => window.open(url, '_blank')
     */
    onNavigationExternal?: (url: string) => MaybePromise<void>;
    /**
     * The hook to call when the user triggers a page navigation to a local URL.
     * When is provided the `onNavigation` hook will not be called.
     * 
     * If returns a promise, the palette will wait for it to resolve before continuing.
     * 
     * @default (url) => window.location.href = url
     */
    onNavigationLocal?: (url: string) => MaybePromise<void>;
    /**
     * A `Writable` store to control the open state of the palette from outside.
     */
    open?: Writable<boolean>;
    /**
     * Pages to display in the pages mode of the palette.
     */
    pages?: HyperPage[];
    /**
     * What set of pages to display there there is no input.
     * 
     * @default "ALL"
     */
    pagesEmptyMode?: ResultsEmptyMode;
    /**
     * History of pages navigated to.
     */
    pagesHistory?: HyperId[];
    /**
     * Shortcut to open the palette in pages mode.
     * 
     * @default "$mod+P"
     */
    pagesShortcut?: string;
    /**
     * How to sort the pages results (by urlHostPathname).
     * @default "ASC"
     */
    pagesSortMode?: SortMode;
    /**
     * The target element to append the palette to.
     * 
     * - `false` the portal will be hidden.
     * - `undefined` the portal will keep in the same place.
     * - `string` it will be used as a CSS selector to find the target element.
     * - `HTMLElement` it will be used as the target element to append the palette to.
     * 
     * @default undefined
     */
    portal?: HTMLElement | string | false | undefined;
    /**
     * Whether to reset the input text when the palette is opened.
     * 
     * @default true
     */
    resetOnOpen?: boolean;
    /**
     * Placeholder text for the search input.
     * 
     * @default "Search pages... use > to search commands..."
     */
    searchPlaceholder?: string | false;
    /**
     * The `HTMLElement` ref of the currently selected result.
     */
    selectedEl?: HTMLElement | undefined;
    /**
     * The id of the currently selected result.
     */
    selectedId?: HyperId;
    /**
     * The index of the currently selected result.
     */
    selectedIdx?: number | undefined;
};

export type CreateCommandPaletteOptions = Pick<
    CommandPaletteOptions,
    | 'commandsEmptyMode' | 'commandsHistory' | 'commandsSortMode'
    | 'defaultInputText' | 'defaultOpen'
    | 'onNavigation' | 'onNavigationExternal' | 'onNavigationLocal' | 'open'
    | 'pagesEmptyMode' | 'pagesHistory' | 'pagesSortMode'
    | 'portal' | 'resetOnOpen' | 'searchPlaceholder'
>;

export type ItemRequestSource =
    | { type: 'keyboard'; }
    | { type: 'shortcut'; shortcut: string; }
    | { type: 'click'; event: MouseEvent; };

export type CommandRequestHook = (command: HyperCommand, source: ItemRequestSource) => MaybePromise<boolean | void>;

export type CommandActionArgs = {
    command: HyperCommand;
    source: ItemRequestSource;
};

export type CommandActionHook = (args: CommandActionArgs) => MaybePromise<void>;

export type CommandErrorHook = (args: CommandActionArgs & CommandPaletteOptions['error']) => MaybePromise<void>;

export type CommandUnregisterHook = (command: HyperCommand) => MaybePromise<void>;

export type CommandMeta = Register extends { HyperCommandMeta: infer _Meta; }
    ? (
        _Meta extends Record<string, any>
        ? _Meta
        : never
    )
    : Record<string, any>;

export type HyperCommand = {
    /** @internal */
    type: HyperCommandType;
    /**
     * A unique identifier for the HyperCommand. It must be unique across all commands and pages.
     * 
     * If not provided, a random unique identifier will be generated.
     */
    id: HyperId;
    /**
     * The category of the HyperCommand. Can be used to group commands in the palette.
     */
    category: string;
    /**
     * The display name of the HyperCommand.
     */
    name: string;
    /**
     * A description of the HyperCommand. Can be used to provide additional information in the palette.
     */
    description: string;
    /**
     * Keywords that can be used to search for the HyperCommand. This will be used to match the input text.
     */
    keywords: string[];
    /**
     * A shortcut/s to trigger the HyperCommand.
     */
    shortcut: string[];
    /**
     * The hook that determines whether the HyperCommand can be executed.
     * 
     * Returning `false` prevents the command from being executed and the palette will not close.
     * 
     * If its async, the palette will wait for it to resolve before continuing.
     */
    onRequest: CommandRequestHook;
    /**
     * The hook to call when the user triggers the HyperCommand.
     * 
     * If its async, the palette will wait for it to resolve before continuing.
     */
    onAction: CommandActionHook;
    /**
     * The hook to call when an error occurs during the execution of the HyperCommand.
     * 
     * If not provided, the error will be logged to the console.
     */
    onError?: CommandErrorHook;
    /**
     * The hook for cleaning up resources when the HyperCommand is unregistered.
     */
    onUnregister?: CommandUnregisterHook;
    /**
     * User-defined metadata of the shape `Record<string, unknown>`.
     * 
     * Can be set by extending the `Register` interface with the `HyperPageMeta` prop in the `svelte-hypercommands` module.
     */
    meta: CommandMeta;
};

export type HyperCommandDefinition =
    | Pick<HyperCommand, 'name' | 'onAction'>
    & { id?: string; shortcut?: string | string[]; }
    & Partial<Pick<HyperCommand, 'category' | 'description' | 'keywords' | 'onRequest' | 'onError' | 'onUnregister' | 'meta'>>;

export type HyperPageMeta = Register extends { HyperPageMeta: infer _Meta; }
    ? (
        _Meta extends Record<string, any>
        ? _Meta
        : never
    )
    : Record<string, any>;

export type HyperPage = {
    /** @internal */
    type: HyperPageType;
    /**
     * A unique identifier for the HyperPage. It must be unique across all commands and pages.
     * 
     * If not provided, the URL of the page will be used as the identifier.
     */
    id: HyperId;
    /**
     * The display name of the HyperPage.
     * 
     * If not provided, the last segment of the page's URL path will be used as the name.
     */
    name: string;
    /**
     * A flag indicating whether the HyperPage is an external URL. This is inferred from the URL of the page.
     */
    external: boolean;
    /**
     * The url of the HyperPage.
     * 
     * If the url starts with a '/', it is considered a local url. Otherwise, it is treated as an external url.
     * 
     * External urls must be valid according to the URL standard.
     */
    url: string;
    /**
     * The host and pathname of the HyperPage's URL.
     * 
     * For local URLs, this is equivalent to the pathname.
     */
    urlHostPathname: string;
    /**
     * User-defined metadata of the shape `Record<string, unknown>`.
     * 
     * Can be set by extending the `Register` interface with the `HyperPageMeta` prop in the `svelte-hypercommands` module.
     */
    meta: HyperPageMeta;
};

export type HyperPageDefinition = Pick<HyperPage, 'url'> & Partial<Pick<HyperPage, 'id' | 'name' | 'meta'>>;

export type HyperItem = HyperCommand | HyperPage;

type ItemMatcher<T extends HyperItem> = HyperId | T | ((item: T) => boolean);

export type CommandMatcher = ItemMatcher<HyperCommand>;

export type PageMatcher = ItemMatcher<HyperPage>;

export type CleanupCallback = () => void;
