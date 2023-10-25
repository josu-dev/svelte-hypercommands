import { noopAction, randomId } from '$lib/utils/funcs';
import type { Command, CommandDefinition } from './types';


export function normalizeCommand(command:CommandDefinition):Command {
  return {
    id: command.id ?? randomId(),
    name: command.name,
    description: command.description ?? '',
    keywords: command.keywords ?? [],
    category: command.category ?? '',
    action: command.action ?? noopAction,
    onUnregister: command.onUnregister,
  }
}

export function defineCommands(commands:CommandDefinition | CommandDefinition[]) :Command[]{
  if (!Array.isArray(commands)) {
    return [normalizeCommand(commands)];
  }

  const normalizedCommands = [];
  for (const command of commands) {
    normalizedCommands.push(normalizeCommand(command));
  }

  return normalizedCommands;
}
