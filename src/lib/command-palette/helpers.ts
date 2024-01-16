import { goto } from '$app/navigation';
import { randomID } from '$lib/utils/funcs';
import type { OneOrMany } from '$lib/utils/types';
import type { Command, CommandDefinition } from './types';

export function noopCommandAction(): void { }

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

export function defineCommand(commands: OneOrMany<CommandDefinition>): Command[] {
  commands = Array.isArray(commands) ? commands : [commands];

  const normalizedCommands = [];
  for (const command of commands) {
    normalizedCommands.push(normalizeCommand(command));
  }

  return normalizedCommands;
}

export function getAllRoutes(parem: string) {
  const modules = import.meta.glob('/src/**/+page.svelte');
  const routes = [];
  for (const path in modules) {
    const name = path.slice(11, path.length > 24 ? -13 : -12);
    routes.push({ name, path });
  }
  return routes;
}

export function routesCommands() {
  const routes = getAllRoutes('');
  const commands = [];
  for (const route of routes) {
    commands.push({
      name: route.name,
      description: `Go to ${route.name} page`,
      keywords: [route.name, 'page'],
      action: () => {
        goto(route.name);
      },
    });
  }
  return commands;
}

export function isHTMLElement(el: unknown): el is HTMLElement {
  return el instanceof HTMLElement;
}
