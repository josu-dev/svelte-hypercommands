import type { RegisteredHyperCommandMeta } from '$lib/index.js';
import type { MaybePromise, RecordToWritables } from '$lib/utils/types.js';
import type { Action } from 'svelte/action';
import type { Writable } from 'svelte/store';

export type HyperCommandType = "COMMAND";

export type HyperPageType = "PAGE";

export type HyperItemType = HyperCommandType | HyperPageType;

export type PaletteMode = "PAGES" | "COMMANDS";

export type ResultsEmptyMode = 'ALL' | 'HISTORY' | 'NONE';

export type SortMode = 'ASC' | 'DESC' | 'NONE';

export type ChangeFn<T> = (args: { curr: T; next: T; }) => T;

export type CreateCommandPaletteOptions = {
  defaultOpen?: boolean;
  open?: Writable<boolean>;
  onOpenChange?: ChangeFn<boolean>;
  commands?: HyperCommand[];
  history?: HyperId[];
  selectedIdx?: number | undefined;
  selectedId?: HyperId;
  element?: HTMLElement | undefined;
  inputText?: string;
  emptyMode?: ResultsEmptyMode;
  portal?: HTMLElement | string | false | undefined;
  pages?: HyperPage[];
  sortPages?: SortMode;
};

export type HyperPaletteState = undefined | Writable<any>;

export type CommandPaletteState = {
  commands: HyperCommand[];
  results: HyperCommand[];
  history: HyperId[];
  selectedIdx?: number;
  currentCommand?: HyperCommand;
  element?: HTMLElement;
  error?: { error: Error; command: HyperCommand; };
  inputText: string;
  open: boolean;
};

export type CommandPaletteStateStores = RecordToWritables<CommandPaletteState>;

export type HyperId = string;

export type CommandRequestSource = {
  type: 'keyboard';
} | {
  type: 'shortcut';
  shortcut: string;
} | {
  type: 'click';
  event: MouseEvent;
};

export type CommandRequestHook = (command: HyperCommand, source: CommandRequestSource) => MaybePromise<boolean | void>;

export type CommandActionArgs = {
  command: HyperCommand;
  state: HyperPaletteState;
  source: CommandRequestSource;
};

export type CommandActionHook = (args: CommandActionArgs) => MaybePromise<void>;

export type CommandErrorHook = (args: CommandActionArgs & { error: unknown; }) => MaybePromise<void>;

export type CommandUnregisterHook = (command: HyperCommand) => MaybePromise<void>;

export type CommandMeta = RegisteredHyperCommandMeta;

export type HyperCommandDefinition = {
  id?: HyperId;
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

export type HyperPageDefinition = {
  id?: string;
  name?: string;
  description?: string;
  url: string;
};

export type HyperPage = {
  type: HyperPageType;
  id: string;
  name: string;
  description: string;
  external: boolean;
  url: string;
  urlHostPathname: string;
};

export type HyperItem = HyperCommand | HyperPage;

export type HyperElementAction<T extends HyperItem> = Action<HTMLElement, T>;

export type InternalItem<T extends HyperItem> = {
  item: T;
};

type ItemMatcher<T extends HyperItem> = HyperId | T | ((item: T) => boolean);

export type CommandMatcher = ItemMatcher<HyperCommand>;

export type PageMatcher = ItemMatcher<HyperPage>;
