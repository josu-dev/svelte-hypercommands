import type { RegisteredHyperCommandMeta, RegisteredHyperPageMeta } from '$lib/index.js';
import type { HyperId } from '$lib/internal/index.js';
import type { MaybePromise } from '$lib/utils/index.js';
import type { Action } from 'svelte/action';
import type { Writable } from 'svelte/store';

export type HyperCommandType = "COMMAND";

export type HyperPageType = "PAGE";

export type HyperItemType = HyperCommandType | HyperPageType;

export type PaletteMode = "PAGES" | "COMMANDS";

export type ResultsEmptyMode = 'ALL' | 'HISTORY' | 'NONE';

export type SortMode = 'ASC' | 'DESC' | 'NONE';

export type ChangeFn<T> = (args: { curr: T; next: T; }) => T;

export type CommandPaletteOptions = {
    commands?: HyperCommand[];
    commandsEmptyMode?: ResultsEmptyMode;
    commandsHistory?: HyperId[];
    commandsShortcut?: string;
    commandsSortMode?: SortMode;
    defaultInputText?: string;
    defaultOpen?: boolean;
    error?: { error: unknown; command?: HyperCommand; page?: HyperPage; };
    onNavigation?: (page: HyperPage) => MaybePromise<void>;
    onNavigationExternal?: (url: string) => MaybePromise<void>;
    onNavigationLocal?: (url: string) => MaybePromise<void>;
    open?: Writable<boolean>;
    pages?: HyperPage[];
    pagesEmptyMode?: ResultsEmptyMode;
    pagesHistory?: HyperId[];
    pagesShortcut?: string;
    pagesSortMode?: SortMode;
    portal?: HTMLElement | string | false | undefined;
    resetOnOpen?: boolean;
    searchPlaceholder?: string | false;
    selectedEl?: HTMLElement | undefined;
    selectedId?: HyperId;
    selectedIdx?: number | undefined;
};

export type CreateCommandPaletteOptions = Pick<
    CommandPaletteOptions,
    | 'commands' | 'commandsEmptyMode' | 'commandsHistory' | 'commandsSortMode'
    | 'defaultInputText' | 'defaultOpen'
    | 'onNavigation' | 'onNavigationExternal' | 'onNavigationLocal' | 'open'
    | 'pages' | 'pagesEmptyMode' | 'pagesHistory' | 'pagesSortMode'
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

export type CommandMeta = RegisteredHyperCommandMeta;

export type HyperCommandDefinition = {
    id?: string;
    category?: string;
    name: string;
    description?: string;
    keywords?: string[];
    shortcut?: string | string[];
    onRequest?: CommandRequestHook;
    onAction?: CommandActionHook;
    onError?: CommandErrorHook;
    onUnregister?: CommandUnregisterHook;
    meta?: CommandMeta;
};

export type HyperCommand = {
    type: HyperCommandType;
    id: HyperId;
    category: string;
    name: string;
    description: string;
    keywords: string[];
    shortcut: string[];
    onRequest: CommandRequestHook;
    onAction: CommandActionHook;
    onError?: CommandErrorHook;
    onUnregister?: CommandUnregisterHook;
    meta: CommandMeta;
};

export type PageMeta = RegisteredHyperPageMeta;

export type HyperPageDefinition = {
    id?: string;
    name?: string;
    url: string;
    meta?: PageMeta;
};

export type HyperPage = {
    type: HyperPageType;
    id: HyperId;
    name: string;
    external: boolean;
    url: string;
    urlHostPathname: string;
    meta: PageMeta;
};

export type HyperItem = HyperCommand | HyperPage;

export type HyperElementAction<T extends HyperItem> = Action<HTMLElement, T>;

type ItemMatcher<T extends HyperItem> = HyperId | T | ((item: T) => boolean);

export type CommandMatcher = ItemMatcher<HyperCommand>;

export type PageMatcher = ItemMatcher<HyperPage>;

export type CleanupCallback = () => void;
