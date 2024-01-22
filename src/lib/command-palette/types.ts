import type { RecordToWritables } from '$lib/utils/types.js';
import type { Action } from 'svelte/action';
import type { Writable } from 'svelte/store';

export type HyperCommandType = "COMMAND";

export type HyperPageType = "PAGE";

export type HyperItemType = HyperCommandType | HyperPageType;

export type PaletteMode = "PAGES" | "COMMANDS";

export type ResultsEmptyMode = 'ALL' | 'HISTORY' | 'NONE';

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
  error?:
  | {
    error: unknown;
    command: HyperCommand;
  }
  | undefined;
  inputText?: string;
  emptyMode?: ResultsEmptyMode;
  portal?: HTMLElement | string | false | undefined;
  pages?: HyperPage[];
};

// export type CommandPalette = BuilderReturn<typeof createCommandPalette>;
// export type CommandPaletteElements = CommandPalette['elements'];
// export type CommandPaletteOptions = CommandPalette['options'];
// export type CommandPaletteStates = CommandPalette['states'];


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

export type CommandExecutionSource = {
  type: 'keyboard';
} | {
  type: 'shortcut';
  shortcut: string;
} | {
  type: 'click';
  event: MouseEvent;
};

export type CommandActionArgs = {
  command: HyperCommand;
  hpState: HyperPaletteState;
  event: Event;
  source: CommandExecutionSource;
};

export type CommandAction = (args: CommandActionArgs) => void | Promise<void>;

export type CommandUnregisterCallbackArgs = { command: HyperCommand; hpState: HyperPaletteState; };
export type CommandUnregisterCallback = (arg: CommandUnregisterCallbackArgs) => void;

export type HCommandDefinition = {
  id?: HyperId;
  name: string;
  description?: string;
  keywords?: string[];
  category?: string;
  shortcut?: string | string[];
  action?: CommandAction;
  unregisterCallback?: CommandUnregisterCallback;
};

export type HyperCommand = {
  type: HyperCommandType;
  id: HyperId;
  name: string;
  description: string;
  keywords: string[];
  category: string;
  action: CommandAction;
  unregisterCallback?: CommandUnregisterCallback;
  shortcut?: string[];
};

export type HyperPageDefinition = {
  name: string;
  description?: string;
  url: string;
};

export type HyperPage = {
  type: HyperPageType;
  id: string;
  name: string;
  description: string;
  url: string;
  external: boolean;
};

export type HyperItem = HyperCommand | HyperPage;

export type HyperElementAction<T extends HyperItem> = Action<HTMLElement, T>;

export type InternalItem<T extends HyperItem> = {
  item: T;
};

type ItemMatcher<T extends HyperItem> = HyperId | T | ((item: T) => boolean);

export type CommandMatcher = ItemMatcher<HyperCommand>;

export type PageMatcher = ItemMatcher<HyperPage>;
