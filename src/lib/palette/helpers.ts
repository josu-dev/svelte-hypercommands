import { hyperId, noop } from '$lib/internal/helpers/index.js';
import { HYPER_ITEM } from './constants.js';
import type { HyperActionable, HyperActionableDef, HyperNavigable, HyperNavigableDef, HyperSearchable, HyperSearchableDef } from './types.js';

export type ActionablesDefinition<T extends any[] = any[]> = {
    [K in keyof T]: HyperActionableDef<T[K]>;
};

export type NavigablesDefinition = HyperNavigableDef[];

export type SearchablesDefinition = HyperSearchableDef[];

export function normalizeActionable(item: HyperActionableDef): HyperActionable {
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

export function defineActionable<T extends [any, ...any]>(items: ActionablesDefinition<T>): HyperActionable[] {
    const normalized = [];
    for (const item of items) {
        normalized.push(normalizeActionable(item));
    }

    return normalized;
}

export function normalizeNavigable(item: HyperNavigableDef): HyperNavigable {
    const external = !item.url.startsWith('/');
    let cleanUrl = item.url.split('?')[0];
    let urlHostPathname;

    if (external) {
        const _url = new URL(item.url);
        urlHostPathname = _url.host + _url.pathname;
    }
    else {
        cleanUrl = cleanUrl.replaceAll(/\/{2,}/g, '/');
        urlHostPathname = cleanUrl;
    }

    if (urlHostPathname !== '/') {
        urlHostPathname = urlHostPathname.replace(/\/{1,}$/, '');
    }

    const name = item.name ?? (cleanUrl.split('/').at(-1) || 'index');

    return {
        type: HYPER_ITEM.NAVIGABLE,
        id: item.id ?? item.url,
        name: name,
        url: item.url,
        urlHostPathname: urlHostPathname,
        external: external,
        meta: item.meta ?? {},
        hcache: {},
    };
}

export function defineNavigable(items: NavigablesDefinition): HyperNavigable[] {
    const normalized = [];
    for (const item of items) {
        normalized.push(normalizeNavigable(item));
    }

    return normalized;
}

export function normalizeSearchable(item: HyperSearchableDef): HyperSearchable {
    throw new Error('Not implemented');
}

export function defineSearchable(items: SearchablesDefinition): HyperSearchable[] {
    const normalized = [];
    for (const item of items) {
        normalized.push(normalizeSearchable(item));
    }

    return normalized;
}

const dinamicRouteRegex = /\/\[[^\]]+\]/i;

export function definePagesFromRoutes({ root = 'index' } = { root: 'index' }): HyperNavigable[] {
    const modules = import.meta.glob('/src/routes/**/+page.svelte');
    const pages: HyperNavigable[] = [];
    for (const path in modules) {
        if (dinamicRouteRegex.test(path)) {
            continue;
        }

        const rawURL = path.slice(11, path.length > 24 ? -13 : -12);
        const url = rawURL.replaceAll(/\([^)]+\)\//ig, '');
        const name = url.split('/').pop() || root;
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
