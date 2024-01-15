import { randomID } from '$lib/utils/funcs';
import type { OneOrMany } from '$lib/utils/types';
import type { Command, CommandDefinition } from './types';

export function noopCommandAction(): void {}

export function normalizeCommand(command: CommandDefinition): Command {
  return {
    id: command.id ?? randomID(),
    name: command.name,
    description: command.description ?? '',
    keywords: command.keywords ?? [],
    category: command.category ?? '',
    action: command.action ?? noopCommandAction,
    unregisterCallback: command.unregisterCallback,
    shortcut: Array.isArray(command.shortcut) ? command.shortcut : command.shortcut ? [command.shortcut] : [],
  };
}

export function defineCommands(commands: OneOrMany<CommandDefinition>): Command[] {
  commands = Array.isArray(commands) ? commands : [commands];

  const normalizedCommands = [];
  for (const command of commands) {
    normalizedCommands.push(normalizeCommand(command));
  }

  return normalizedCommands;
}
