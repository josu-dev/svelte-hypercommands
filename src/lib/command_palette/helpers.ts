import { randomID } from '$lib/utils/functions.js';
import type { OneOrMany } from '$lib/utils/types.js';
import { PALETTE_ITEM } from './enums.js';
import type { HyperCommand, HyperCommandDefinition, HyperPage, HyperPageDefinition } from './types.js';


export function noopCommandRequest(): void { }

export function noopCommandAction(): void { }

export function normalizeCommand(command: HyperCommandDefinition): HyperCommand {
  return {
    type: PALETTE_ITEM.COMMAND,
    id: command.id ?? randomID(),
    name: command.name,
    description: command.description ?? '',
    category: command.category ?? '',
    keywords: command.keywords ?? [],
    shortcut: Array.isArray(command.shortcut) ? command.shortcut : command.shortcut ? [command.shortcut] : [],
    onRequest: command.onRequest ?? noopCommandRequest,
    onAction: command.onAction ?? noopCommandAction,
    onError: command.onError,
    onUnregister: command.onUnregister,
  };
}

export function defineCommand(commands: OneOrMany<HyperCommandDefinition>): HyperCommand[] {
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

const dinamicRouteRegex = /\/\[[^\]]+\]/i;

export function appRoutesAsPages({ rootName = 'root' } = { rootName: 'root' }): HyperPage[] {
  const modules = import.meta.glob('/src/**/+page.svelte');
  const pages: HyperPage[] = [];
  for (const path in modules) {
    if (dinamicRouteRegex.test(path)) {
      continue;
    }

    const rawURL = path.slice(11, path.length > 24 ? -13 : -12);
    const url = rawURL.replaceAll(/\([^)]+\)\//ig, '');
    const name = url.split('/').pop() || rootName;
    pages.push(normalizePage({
      name: name,
      url: url,
      description: '',
    }));
  }
  return pages;
}
