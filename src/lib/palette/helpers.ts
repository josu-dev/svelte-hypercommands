import { hyperId, noop } from '$lib/internal/helpers/index.js';
import type { OneOrMany } from '$lib/internal/helpers/types.js';
import { HYPER_ITEM } from './constants.js';
import type { HyperActionable, HyperActionableDefinition, HyperNavigable, HyperNavigableDefinition, HyperSearchable, HyperSearchableDefinition } from './types.js';

export function normalizeActionable(item: HyperActionableDefinition): HyperActionable {
    return {
        type: HYPER_ITEM.ACTIONABLE,
        id: item.id ?? hyperId(),
        name: item.name,
        category: item.category ?? '',
        description: item.description ?? '',
        shortcut: Array.isArray(item.shortcut) ? item.shortcut : item.shortcut ? [item.shortcut] : [],
        onRequest: item.onRequest ?? noop,
        onAction: item.onAction,
        onError: item.onError,
        onUnregister: item.onUnregister,
        closeAction: item.closeAction,
        closeOn: item.closeOn,
        meta: item.meta ?? {},
        hcache: {},
    };
}

export function defineActionable(item: OneOrMany<HyperActionableDefinition>): HyperActionable[] {
    item = Array.isArray(item) ? item : [item];

    const normalized_items = [];
    for (const i of item) {
        normalized_items.push(normalizeActionable(i));
    }

    return normalized_items;
}

export function normalizeNavigable(page: HyperNavigableDefinition): HyperNavigable {
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
        type: HYPER_ITEM.NAVIGABLE,
        id: page.url,
        name: name,
        url: page.url,
        urlHostPathname: urlHostPathname,
        external: external,
        meta: page.meta ?? {},
        hcache: {},
    };
}

export function defineNavigable(item: OneOrMany<HyperNavigableDefinition>): HyperNavigable[] {
    item = Array.isArray(item) ? item : [item];

    const normalized_items = [];
    for (const i of item) {
        normalized_items.push(normalizeNavigable(i));
    }

    return normalized_items;
}

export function normalizeSearchable(item: HyperSearchableDefinition): HyperSearchable {
    throw new Error('Not implemented');
}

export function defineSearchable(item: OneOrMany<HyperSearchableDefinition>): HyperSearchable[] {
    item = Array.isArray(item) ? item : [item];

    const normalized_items = [];
    for (const i of item) {
        normalized_items.push(normalizeSearchable(i));
    }

    return normalized_items;
}

const dinamicRouteRegex = /\/\[[^\]]+\]/i;

export function definePagesFromRoutes({ rootName = 'root' } = { rootName: 'root' }): HyperNavigable[] {
    const modules = import.meta.glob('/src/routes/**/+page.svelte');
    const pages: HyperNavigable[] = [];
    for (const path in modules) {
        if (dinamicRouteRegex.test(path)) {
            continue;
        }

        const rawURL = path.slice(11, path.length > 24 ? -13 : -12);
        const url = rawURL.replaceAll(/\([^)]+\)\//ig, '');
        const name = url.split('/').pop() || rootName;
        pages.push(normalizeNavigable({ name: name, url: url }));
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
