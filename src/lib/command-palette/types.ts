import type { RecordToWritables } from '$lib/utils/types';
import type { Action } from 'svelte/action';
import type { Writable } from 'svelte/store';

export type ChangeFn<T> = (args: { curr: T; next: T; }) => T;

export type CreateCommandPaletteOptions = {
  defaultOpen?: boolean;
  open?: Writable<boolean>;
  onOpenChange?: ChangeFn<boolean>;
  commands?: Command[];
  results?: Command[];
  history?: CommandID[];
  selectedIdx?: number | undefined;
  selectedId?: CommandID;
  currentCommand?: Command | undefined;
  element?: HTMLElement | undefined;
  error?:
  | {
    error: unknown;
    command: Command;
  }
  | undefined;
  inputText?: string;
  emptyMode?: 'all' | 'none' | 'history';
  portal?: HTMLElement | string | false | undefined;
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
  command: Command;
  hcState: HCState;
  event: Event;
  source: CommandExecutionSource;
};

export type CommandAction = (args: CommandActionArgs) => void | Promise<void>;

export type CommandUnregisterCallbackArgs = { command: Command; hcState: HCState; };
export type CommandUnregisterCallback = (arg: CommandUnregisterCallbackArgs) => void;

export type CommandDefinition = {
  id?: CommandID;
  name: string;
  description?: string;
  keywords?: string[];
  category?: string;
  shortcut?: string | string[];
  action?: CommandAction;
  unregisterCallback?: CommandUnregisterCallback;
};

export type Command = {
  id: CommandID;
  name: string;
  description: string;
  keywords: string[];
  category: string;
  action: CommandAction;
  unregisterCallback?: CommandUnregisterCallback;
  shortcut?: string[];
};

export type CommandElementAction = Action<HTMLElement, Command>;

export type InternalCommand = {
  command: Command;
  action: CommandElementAction;
};

export type CommandPaletteState = {
  commands: Command[];
  results: Command[];
  history: CommandID[];
  selectedIdx?: number;
  currentCommand?: Command;
  element?: HTMLElement;
  error?: { error: Error; command: Command; };
  inputText: string;
  open: boolean;
};

export type CommandPaletteStateStores = RecordToWritables<CommandPaletteState>;

export type CommandMatcher = CommandID | Command | ((command: Command) => boolean);

export type UnregisterCommand = (id: CommandID) => void;

export type UnregisterCallback = () => void;

export type RegisterCommand = <
  T extends CommandDefinition | Command | Command[] | CommandDefinition[],
>(
  command: T,
  override?: boolean,
) => UnregisterCallback;

export type EmptyModes = 'all' | 'history' | 'none';
