import { hyperId, noop, type HyperId } from '$lib/internal/index.js';
import type { OneOrMany } from '$lib/utils/index.js';
import { HYPER_ITEM_TYPE } from './constants.js';
import type { HyperCommand, HyperCommandDefinition, HyperCustomItem, HyperCustomItemDefinition, HyperCustomTypes, HyperPage, HyperPageDefinition } from './types.js';

export function normalizeCommand(command: HyperCommandDefinition): HyperCommand {
    return {
        type: HYPER_ITEM_TYPE.COMMAND,
        id: (command.id ?? hyperId()) as HyperId,
        name: command.name,
        category: command.category ?? '',
        description: command.description ?? '',
        shortcut: Array.isArray(command.shortcut) ? command.shortcut : command.shortcut ? [command.shortcut] : [],
        onRequest: command.onRequest ?? noop,
        onAction: command.onAction,
        onError: command.onError,
        onUnregister: command.onUnregister,
        closeAction: command.closeAction,
        closeOn: command.closeOn,
        meta: command.meta ?? {},
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
    const external = !page.url.startsWith('/');
    let cleanUrl = page.url.split('?')[0];
    let urlHostPathname;

    if (external) {
        const _url = new URL(page.url);
        urlHostPathname = _url.host + _url.pathname;
    }
    else {
        cleanUrl = cleanUrl.replaceAll(/\/{2,}/g, '/');
        urlHostPathname = cleanUrl;
    }

    if (urlHostPathname !== '/') {
        urlHostPathname = urlHostPathname.replace(/\/{1,}$/, '');
    }

    const name = page.name ?? (cleanUrl.split('/').at(-1) || 'index');

    return {
        type: HYPER_ITEM_TYPE.PAGE,
        id: page.url as HyperId,
        name: name,
        url: page.url,
        urlHostPathname: urlHostPathname,
        external: external,
        meta: page.meta ?? {},
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

export function normalizeCustomItem(item: HyperCustomItemDefinition): HyperCustomItem<HyperCustomTypes> {
    return {
        type: item.type,
        id: item.id ?? hyperId(),
        name: item.name,
        category: item.category ?? '',
        shortcut: Array.isArray(item.shortcut) ? item.shortcut : item.shortcut ? [item.shortcut] : [],
        onRequest: item.onRequest ?? noop,
        onAction: item.onAction,
        onError: item.onError,
        onUnregister: item.onUnregister,
        closeAction: item.closeAction,
        closeOn: item.closeOn,
        meta: item.meta ?? {},
    };
}

export function defineCustomItem<T extends HyperCustomTypes>(item: OneOrMany<HyperCustomItemDefinition<T>>): HyperCustomItem<T>[] {
    item = Array.isArray(item) ? item : [item];

    const normalizedItems = [];
    for (const i of item) {
        normalizedItems.push(normalizeCustomItem(i));
    }

    return normalizedItems;
}

const dinamicRouteRegex = /\/\[[^\]]+\]/i;

export function definePagesFromRoutes({ rootName = 'root' } = { rootName: 'root' }): HyperPage[] {
    const modules = import.meta.glob('/src/routes/**/+page.svelte');
    const pages: HyperPage[] = [];
    for (const path in modules) {
        if (dinamicRouteRegex.test(path)) {
            continue;
        }

        const rawURL = path.slice(11, path.length > 24 ? -13 : -12);
        const url = rawURL.replaceAll(/\([^)]+\)\//ig, '');
        const name = url.split('/').pop() || rootName;
        pages.push(normalizePage({ name: name, url: url }));
    }
    return pages;
}

export function getProjectRoutes(): { name: string; path: string; }[] {
    const modules = import.meta.glob('/src/routes/**/+page.svelte');
    const routes = [];
    for (const path in modules) {
        const name = path.slice(11, path.length > 24 ? -13 : -12);
        routes.push({ name, path });
    }
    return routes;
}

export function shortcutToKbd(shortcut: string): string[] {
    const parts = shortcut.split('+');
    const kdbs: string[] = [];

    for (const part of parts) {
        if (part === '$mod') {
            kdbs.push('Ctrl');
        } else if (part === 'Shift') {
            kdbs.push('Shift');
        } else if (part === 'Ctrl') {
            kdbs.push('Ctrl');
        } else if (part === 'Alt') {
            kdbs.push('Alt');
        } else {
            kdbs.push(part);
        }
    }

    return kdbs;
}
