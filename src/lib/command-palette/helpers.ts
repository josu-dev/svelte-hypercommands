import { randomID } from '$lib/utils/funcs.js';
import type { OneOrMany } from '$lib/utils/types.js';
import { PALETTE_ITEM } from './enums.js';
import type { HCommandDefinition, HyperCommand, HyperPage, HyperPageDefinition } from './types.js';


export function isHTMLElement(el: unknown): el is HTMLElement {
  return el instanceof HTMLElement;
}

export function noopCommandAction(): void { }

export function normalizeCommand(command: HCommandDefinition): HyperCommand {
  return {
    type: PALETTE_ITEM.COMMAND,
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

export function defineCommand(commands: OneOrMany<HCommandDefinition>): HyperCommand[] {
  commands = Array.isArray(commands) ? commands : [commands];

  const normalizedCommands = [];
  for (const command of commands) {
    normalizedCommands.push(normalizeCommand(command));
  }

  return normalizedCommands;
}


export function normalizePage(page: HyperPageDefinition): HyperPage {
  return {
    type: PALETTE_ITEM.PAGE,
    id: page.url,
    name: page.name,
    description: page.description ?? '',
    url: page.url,
    external: !page.url.startsWith('/')
  };
}

export function definePage(pages: OneOrMany<HyperPageDefinition>): HyperPage[] {
  pages = Array.isArray(pages) ? pages : [pages];

  const normalizedPage = [];
  for (const page of pages) {
    normalizedPage.push(normalizePage(page));
  }

  return normalizedPage;
}


export function getAppRoutes(): { name: string; path: string; }[] {
  const modules = import.meta.glob('/src/**/+page.svelte');
  const routes = [];
  for (const path in modules) {
    const name = path.slice(11, path.length > 24 ? -13 : -12);
    routes.push({ name, path });
  }
  return routes;
}

export function appRoutesAsPages({ rootName = 'root' } = { rootName: 'root' }): HyperPage[] {
  const modules = import.meta.glob('/src/**/+page.svelte');
  const pages: HyperPage[] = [];
  for (const path in modules) {
    const url = path.slice(11, path.length > 24 ? -13 : -12);
    const name = url.split('/').pop() || rootName;
    pages.push(normalizePage({
      name: name,
      url: url,
      description: ""
    }));
  }
  return pages;
}
