import type { Action } from 'svelte/action';
import type { Writable } from 'svelte/store';

export type ChangeFn<T> = (args: { curr: T; next: T }) => T;

export type CreateCommandPaletteOptions = {
	defaultOpen?: boolean;
	open?: Writable<boolean>;
	onOpenChange?: ChangeFn<boolean>;
	commands?: Command[];
	results?: Command[];
	history?: CommandId[];
	selectedIdx?: number | undefined;
	selectedId?: CommandId;
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
};

// export type CommandPalette = BuilderReturn<typeof createCommandPalette>;
// export type CommandPaletteElements = CommandPalette['elements'];
// export type CommandPaletteOptions = CommandPalette['options'];
// export type CommandPaletteStates = CommandPalette['states'];

export type CommandId = string;

export type CommandActionArgs = {
	event: Event;
	commandsState: Writable<any>;
};

export type CommandAction = (args: CommandActionArgs) => void | Promise<void>;

export type CommandDefinition = {
	id?: CommandId;
	name: string;
	description?: string;
	keywords?: string[];
	category?: string;
	action?: CommandAction;
	onUnregister?: () => void;
};

export type Command = {
	id: CommandId;
	name: string;
	description: string;
	keywords: string[];
	category: string;
	action: CommandAction;
	onUnregister?: () => void;
};

export type CommandElementAction = Action<HTMLElement, Command>;

export type CommandInternal = {
	command: Command;
	action: CommandElementAction;
};

export type CommandPaletteState = {
	commands: Command[];
	results: Command[];
	history: CommandId[];
	selectedIdx?: number;
	currentCommand?: Command;
	element?: HTMLElement;
	error?: { error: Error; command: Command };
	inputText: string;
	open: boolean;
};

export type RecordToWritables<T extends Record<string, any>> = {
	[K in keyof T]: Writable<T[K]>;
};

export type CommandPaletteStateStores = RecordToWritables<CommandPaletteState>;

export type CommandMatcher = CommandId | Command | ((command: Command) => boolean);

export type UnregisterCommand = (id: CommandId) => void;

export type UnregisterCallback = () => void;

export type RegisterCommand = <
	T extends CommandDefinition | Command | Command[] | CommandDefinition[]
>(
	command: T,
	override?: boolean
) => UnregisterCallback;

export type EmptyModes = 'all' | 'history' | 'none';
