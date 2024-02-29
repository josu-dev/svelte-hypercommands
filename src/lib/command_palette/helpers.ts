import { hyperId, type HyperId } from '$lib/internal/index.js';
import type { OneOrMany } from '$lib/utils/index.js';
import { PALETTE_ITEM } from './constants.js';
import type { HyperCommand, HyperCommandDefinition, HyperPage, HyperPageDefinition } from './types.js';


function noopCommandRequest(): void { }

function noopCommandAction(): void { }

export function normalizeCommand(command: HyperCommandDefinition): HyperCommand {
    return {
        type: PALETTE_ITEM.COMMAND,
        id: (command.id ?? hyperId()) as HyperId,
        name: command.name,
        description: command.description ?? '',
        category: command.category ?? '',
        keywords: command.keywords ?? [],
        shortcut: Array.isArray(command.shortcut) ? command.shortcut : command.shortcut ? [command.shortcut] : [],
        onRequest: command.onRequest ?? noopCommandRequest,
        onAction: command.onAction ?? noopCommandAction,
        onError: command.onError,
        onUnregister: command.onUnregister,
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
        type: PALETTE_ITEM.PAGE,
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

export function definePagesFromRoutes({ rootName = 'root' } = { rootName: 'root' }): HyperPage[] {
    const modules = import.meta.glob('/src/**/+page.svelte');
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


export function shortcutToKbd(shortcut: string) {
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
