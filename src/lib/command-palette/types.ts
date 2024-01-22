import type { RecordToWritables } from '$lib/utils/types';
import type { Action } from 'svelte/action';
import type { Writable } from 'svelte/store';

export type PaletteMode = "PAGES" | "COMMANDS";

export type ResultsEmptyMode = 'ALL' | 'HISTORY' | 'NONE';

export type ChangeFn<T> = (args: { curr: T; next: T; }) => T;

export type CreateCommandPaletteOptions = {
  defaultOpen?: boolean;
  open?: Writable<boolean>;
  onOpenChange?: ChangeFn<boolean>;
  commands?: HyperCommand[];
  history?: CommandID[];
  selectedIdx?: number | undefined;
  selectedId?: CommandID;
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


export type HCState = undefined | Writable<any>;

export type CommandID = string;

export type CommandExecutionSource = {
  type: 'command-palette';
} | {
  type: 'shortcut';
  shortcut: string;
} | {
  type: 'click';
  event: MouseEvent;
};

export type CommandActionArgs = {
  command: HyperCommand;
  hcState: HCState;
  event: Event;
  source: CommandExecutionSource;
};

export type CommandAction = (args: CommandActionArgs) => void | Promise<void>;

export type CommandUnregisterCallbackArgs = { command: HyperCommand; hcState: HCState; };
export type CommandUnregisterCallback = (arg: CommandUnregisterCallbackArgs) => void;

export type HCommandDefinition = {
  id?: CommandID;
  name: string;
  description?: string;
  keywords?: string[];
  category?: string;
  shortcut?: string | string[];
  action?: CommandAction;
  unregisterCallback?: CommandUnregisterCallback;
};

export type HyperCommand = {
  type: 'command';
  id: CommandID;
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
  type: 'page';
  id: string;
  name: string;
  description: string;
  url: string;
  external: boolean;
};

export type HyperItems = HyperCommand | HyperPage;

export type HyperElementAction<T extends HyperItems> = Action<HTMLElement, T>;

export type InternalItem<T extends HyperItems> = {
  item: T;
  action: HyperElementAction<T>;
};

export type CommandPaletteState = {
  commands: HyperCommand[];
  results: HyperCommand[];
  history: CommandID[];
  selectedIdx?: number;
  currentCommand?: HyperCommand;
  element?: HTMLElement;
  error?: { error: Error; command: HyperCommand; };
  inputText: string;
  open: boolean;
};

export type CommandPaletteStateStores = RecordToWritables<CommandPaletteState>;

export type CommandMatcher = CommandID | HyperCommand | ((command: HyperCommand) => boolean);

export type PageMatcher = CommandID | HyperPage | ((page: HyperPage) => boolean);

export type UnregisterCommand = (id: CommandID) => void;

export type UnregisterCallback = () => void;

export type RegisterCommand = <
  T extends HCommandDefinition | HyperCommand | HyperCommand[] | HCommandDefinition[],
>(
  command: T,
  override?: boolean,
) => UnregisterCallback;
