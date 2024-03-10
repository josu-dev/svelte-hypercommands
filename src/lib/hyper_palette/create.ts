import { browser } from '$app/environment';
import { hyperId, type HyperId } from '$lib/internal/index.js';
import { addKeyBinding } from '$lib/keyboard/keystroke.js';
import { Searcher } from '$lib/search/index.js';
import { exposeWritable, writableExposed, type WritableExposed } from '$lib/stores/index.js';
import type { OneOrMany } from '$lib/utils/index.js';
import { tick } from 'svelte';
import { ACTIONABLE_CLOSE_ON, DEFAULT_PALETTE_MODE, DEFAULT_PALETTE_MODE_PREFIX, NAVIGABLE_CLOSE_ON, PALETTE_CLOSE_ACTION, PALETTE_ELEMENTS, RESULTS_EMPTY_MODE, SORT_MODE } from './constants.js';
import { HyperCommandError } from './errors.js';
import { type CleanupCallback, type CreatePaletteOptions, type HyperCommand, type HyperItem, type HyperItemType, type HyperItemTypeMap, type HyperPage, type HyperPaletteIds, type HyperPaletteOptions, type HyperPaletteSelected, type ItemMatcher, type ItemRequestSource, type PaletteActionableConfig, type PaletteError, type PaletteItems, type PaletteModeState, type PaletteNavigableConfig } from './types.js';

const INTERNAL_KEY = {
    OPEN_PALETTE: '__hyper_open_palette',
    CLOSE_PALETTE: '__hyper_close_palette',
} as const;

const defaults = {
    closeAction: PALETTE_CLOSE_ACTION.RESET,
    closeOnClickOutside: true,
    closeOnEscape: true,
    debounce: 150,
    defaultSearch: '',
    defaultMode: DEFAULT_PALETTE_MODE.PAGE,
    defaultOpen: false,
    defaultPlaceholder: `Search pages... use ${DEFAULT_PALETTE_MODE_PREFIX.COMMAND} to search commands...`,
    items: {
        COMMAND: {
            closeOn: ACTIONABLE_CLOSE_ON.ALWAYS,
            enabled: true,
            emptyMode: RESULTS_EMPTY_MODE.ALL,
            mapToSearch: (item) => {
                return item.category + item.name;
            },
            prefix: DEFAULT_PALETTE_MODE_PREFIX.COMMAND,
            shortcut: ['$mod+Shift+P'],
            sortMode: SORT_MODE.DESC
        },
        PAGE: {
            closeOn: NAVIGABLE_CLOSE_ON.ALWAYS,
            enabled: true,
            emptyMode: RESULTS_EMPTY_MODE.ALL,
            mapToSearch: (item) => {
                return item.url;
            },
            onExternal: (url) => {
                window.open(url, '_blank', 'noopener');
            },
            onLocal: (url) => {
                window.location.href = url;
            },
            onNavigation: (page) => {
                if (page.external) {
                    window.open(page.url, '_blank', 'noopener');
                    return;
                }
                window.location.href = page.url;
            },
            prefix: DEFAULT_PALETTE_MODE_PREFIX.PAGE,
            shortcut: ['$mod+P'],
            sortMode: SORT_MODE.DESC
        },
    },
    portal: false,
    resetOnOpen: false,
} satisfies Omit<HyperPaletteOptions, 'ids' | 'open' | 'selected'>;

function createActionableState(options: PaletteActionableConfig) {
    return {
        ...options,
        items: writableExposed<HyperCommand[]>([]),
        history: writableExposed<HyperId[]>([]),
        searcher: new Searcher<HyperCommand>({
            mapper: options.mapToSearch,
        }),
        current: writableExposed<HyperCommand | undefined>(undefined),
        rawAll: [] as HyperCommand[],
        rawFiltered: [] as HyperCommand[],
    };
}

function createNavigableState(options: PaletteNavigableConfig) {
    return {
        ...options,
        items: writableExposed<HyperPage[]>([]),
        history: writableExposed<HyperId[]>([]),
        searcher: new Searcher<HyperPage>({
            mapper: options.mapToSearch,
        }),
        current: writableExposed<HyperPage | undefined>(undefined),
        rawAll: [] as HyperPage[],
        rawFiltered: [] as HyperPage[],
    };
}

function createModeState<T extends HyperItemType>(type: T, options: PaletteItems[T]): PaletteModeState<T> {
    return {
        type: type,
        config: options,
        items: writableExposed([]),
        results: writableExposed([]),
        history: writableExposed([]),
        searcher: new Searcher({ mapper: options.mapToSearch as any }),
        current: writableExposed(undefined),
        rawAll: [],
        rawAllSorted: [],
        lastInput: '',
    };
}

function generateIds(initials: Partial<HyperPaletteIds>): HyperPaletteIds {
    const ids = {} as HyperPaletteIds;
    for (const name of PALETTE_ELEMENTS) {
        ids[name] = initials[name] || hyperId();
    }
    return ids;
}

export function createPalette(options: CreatePaletteOptions = {}) {
    const safeOptions = { ...defaults, ...options } as HyperPaletteOptions;
    if (options.items) {
        if (options.items.COMMAND) {
            safeOptions.items.COMMAND = { ...defaults.items.COMMAND, ...options.items.COMMAND };
        }
        if (options.items.PAGE) {
            safeOptions.items.PAGE = { ...defaults.items.PAGE, ...options.items.PAGE };
        }
        // TODO: validate custom items
    }

    const _internal_cleanup = new Map<string, CleanupCallback>();

    let open: WritableExposed<boolean>;
    if (options.open) {
        const _open = exposeWritable(options.open);
        if (!browser) {
            _open.unsubscribe();
        }
        else {
            _internal_cleanup.set('open', _open.unsubscribe);
        }
        open = _open;
    }
    else {
        open = writableExposed(safeOptions.defaultOpen);
    }

    const ids = generateIds(safeOptions.ids ?? {});
    const searchText = writableExposed('');
    const paletteMode = writableExposed(safeOptions.defaultMode);
    const error = writableExposed<PaletteError | undefined>(undefined);
    const portal = writableExposed(safeOptions.portal);
    const placeholder = writableExposed(safeOptions.defaultPlaceholder);
    const debounce = writableExposed(safeOptions.debounce);
    const closeAction = writableExposed(safeOptions.closeAction);
    const closeOnClickOutside = writableExposed(safeOptions.closeOnClickOutside);
    const closeOnEscape = writableExposed(safeOptions.closeOnEscape);
    const resetOnOpen = writableExposed(safeOptions.resetOnOpen);
    const selected = writableExposed<HyperPaletteSelected>({
        el: undefined,
        idx: -1,
        id: undefined,
    });

    const modes = new Map<HyperItemType, PaletteModeState>();

    for (const [type, options] of Object.entries(safeOptions.items)) {
        if (type === DEFAULT_PALETTE_MODE.COMMAND) {
            if (options.enabled) {
                const dCommands = createModeState(DEFAULT_PALETTE_MODE.COMMAND, options as PaletteItems['COMMAND']);
                // @ts-expect-error - generic type is not inferred
                modes.set(DEFAULT_PALETTE_MODE.COMMAND, dCommands);
            }
            continue;
        }
        if (type === DEFAULT_PALETTE_MODE.PAGE) {
            if (options.enabled) {
                const dPages = createModeState(DEFAULT_PALETTE_MODE.PAGE, options as PaletteItems['PAGE']);
                // @ts-expect-error - generic type is not inferred
                modes.set(DEFAULT_PALETTE_MODE.PAGE, dPages);
            }
            continue;
        }
        const state = createModeState(type as HyperItemType, options);
        modes.set(type as HyperItemType, state);
    }

    const initialMode = modes.get(safeOptions.defaultMode);
    if (!initialMode) {
        throw new HyperCommandError(`Invalid default mode: ${safeOptions.defaultMode} is not registered`);
    }

    let _mode_state: PaletteModeState<HyperItemType> = initialMode;
    let _input_el: HTMLInputElement | undefined;

    function _reset_current_state() {
        searchText.set('');
        selected.value.el = undefined;
        selected.value.id = undefined;
        selected.value.idx = -1;
        selected.sync();
        _mode_state.current.set(undefined);
    }

    function _search_and_update(pattern: string) {
        // TODO: use the sorted raw items instead of sorting the results
        let results: HyperItem[];
        if (pattern === '') {
            switch (_mode_state.config.emptyMode) {
                case RESULTS_EMPTY_MODE.ALL:
                    results = [..._mode_state.rawAll];
                    break;
                case RESULTS_EMPTY_MODE.HISTORY:
                    results = [];
                    for (const id of _mode_state.history.value) {
                        for (const item of _mode_state.rawAll) {
                            if (item.id === id) {
                                results.push(item);
                                break;
                            }
                        }
                    }
                    break;
                case RESULTS_EMPTY_MODE.NONE:
                    results = [];
                    break;
                default:
                    throw new HyperCommandError(`Invalid empty mode: ${_mode_state.config.emptyMode}`);
            }
        }
        else {
            results = _mode_state.searcher.search(pattern);
        }

        _mode_state.results.set(results);

        if (results.length === 0) {
            selected.value.id = undefined;
            selected.value.idx = -1;
            selected.sync();
        }
        else {
            selected.value.id = results[0].id;
            selected.value.idx = 0;
            selected.sync();
        }
    }

    function _update_results() {
        let query = searchText.value;
        // POSSIBLE BUG: assuming that the prefix is always at the start of the query
        query = query.slice(_mode_state.config.prefix.length);
        _search_and_update(query);
    }

    function _open_palette(mode: HyperItemType) {
        _mode_state = modes.get(mode) as PaletteModeState<HyperItemType>;

        tick().then(() => {
            if (!open.value || !_input_el) {
                return;
            }
            if (resetOnOpen.value) {
                _input_el.value = _mode_state.config.prefix;
            }
            else {
                _input_el.value = _mode_state.config.prefix + searchText.value;
            }
            _input_el.focus();
        });

        paletteMode.set(mode);

        if (!resetOnOpen.value) {
            return;
        }
        _reset_current_state();
        _update_results();
    }

    function _close_palette() {
        if (!open.value) {
            return;
        }
        open.set(false);
        if (closeAction.value === PALETTE_CLOSE_ACTION.KEEP) {
            // POSSIBLE BUG: maybe is a good idea to save the last input
            return;
        }

        _reset_current_state();
    }

    async function _resolve_actionable(item: HyperCommand, source: ItemRequestSource) {
        _mode_state.current.set(item);

        if (item.closeOn === ACTIONABLE_CLOSE_ON.ON_TRIGGER) {
            // TODO: close and reset if necessary
        }
        const preAction = await item.onRequest({ item, source });
        if (preAction === false) {
            if (
                item.closeOn === ACTIONABLE_CLOSE_ON.ON_CANCEL
                || item.closeOn === ACTIONABLE_CLOSE_ON.ALWAYS
            ) {
                // TODO: close and reset if necessary
            }
            return;
        }

        try {
            await item.onAction({ item, source, rargs: preAction });
            error.set(undefined);
        }
        catch (e) {
            error.set({
                error: e,
                item: item,
                source: source,
                type: item.type,
            });
            if (item.onError) {
                item.onError({ error: e, item: item, source: source });
            }
            if (
                item.closeOn === ACTIONABLE_CLOSE_ON.ON_ERROR
                || item.closeOn === ACTIONABLE_CLOSE_ON.ALWAYS
            ) {
                // TODO: close and reset if necessary
                return;
            }
        }
        finally {
            _mode_state.history.value.unshift(item.id);
            _mode_state.history.sync();
        }

        if (
            !(item.closeOn === ACTIONABLE_CLOSE_ON.ON_SUCCESS)
            && !(item.closeOn === ACTIONABLE_CLOSE_ON.ALWAYS)
        ) {
            return;
        }

        // TODO: close and reset if necessary
    }

    async function _resolve_navigable(item: HyperPage, source: ItemRequestSource) {
        _mode_state.current.set(item);
        const config = _mode_state.config as PaletteNavigableConfig;
        if (item.closeOn === NAVIGABLE_CLOSE_ON.ON_TRIGGER) {
            // TODO: close and reset if necessary
        }

        try {
            if (config.onNavigation) {
                await config.onNavigation(item);
            }
            else if (item.external) {
                await config.onExternal(item.url);
            }
            else {
                await config.onLocal(item.url);
            }
            error.set(undefined);
        }
        catch (e) {
            error.set({
                error: e,
                item: item,
                source: source,
                type: item.type,
            });
            if (config.onError) {
                config.onError({ error: e, item: item, source: source });
            }
            if (
                item.closeOn === NAVIGABLE_CLOSE_ON.ON_ERROR
                || item.closeOn === NAVIGABLE_CLOSE_ON.ALWAYS
            ) {
                // TODO: close and reset if necessary
                return;
            }
        }
        finally {
            _mode_state.history.value.unshift(item.id);
            _mode_state.history.sync();
        }

        if (
            !(item.closeOn === NAVIGABLE_CLOSE_ON.ON_SUCCESS)
            && !(item.closeOn === NAVIGABLE_CLOSE_ON.ALWAYS)
        ) {
            return;
        }

        // TODO: close and reset if necessary
    }

    const _shorcuts_cleanup = new Map<string, CleanupCallback[]>();
    _internal_cleanup.set('shortcuts', () => {
        for (const cleanups of _shorcuts_cleanup.values()) {
            for (const c of cleanups) {
                c();
            }
        }
    });

    function _register_shortcut(item: HyperCommand) {
        const shortcuts = item.shortcut;
        if (shortcuts.length === 0) {
            return;
        }

        const cleanup: CleanupCallback[] = [];
        for (const s of shortcuts) {
            const c = addKeyBinding(window, s, (event) => {
                event.preventDefault();
                _resolve_actionable(
                    item,
                    { type: 'shortcut', event: event, shortcut: s }
                );
            });
            if (c) {
                cleanup.push(c);
            }
        }

        _shorcuts_cleanup.set(item.id, cleanup);
    }

    function _unregister_shortcut(item: HyperCommand) {
        const cleanup = _shorcuts_cleanup.get(item.id);
        if (cleanup) {
            for (const c of cleanup) {
                c();
            }
            _shorcuts_cleanup.delete(item.id);
        }
    }

    function _register_palette_shortcuts() {
        const cleanup: CleanupCallback[] = [];
        for (const mode of modes.values()) {
            if (!mode.config.shortcut) {
                continue;
            }
            for (const s of mode.config.shortcut) {
                const c = addKeyBinding(window, s, (event) => {
                    event.preventDefault();
                    _open_palette(mode.type);
                });
                if (c) {
                    cleanup.push(c);
                }
            }
        }
        _shorcuts_cleanup.set(INTERNAL_KEY.OPEN_PALETTE, cleanup);
    }

    function _register_escape_shortcut() {
        const cleanup = addKeyBinding(window, 'Escape', (event) => {
            event.preventDefault();
            _close_palette();
        }, { once: true });
        if (cleanup) {
            _internal_cleanup.set(INTERNAL_KEY.CLOSE_PALETTE, cleanup);
        }
    }

    function _unregister_escape_shortcut() {
        const cleanup = _internal_cleanup.get(INTERNAL_KEY.CLOSE_PALETTE);
        if (cleanup) {
            cleanup();
            _internal_cleanup.delete(INTERNAL_KEY.CLOSE_PALETTE);
        }
    }

    function _unregister_palette_shortcuts() {
        for (const key of [INTERNAL_KEY.OPEN_PALETTE, INTERNAL_KEY.CLOSE_PALETTE]) {
            const cleanup = _shorcuts_cleanup.get(key);
            if (cleanup) {
                for (const c of cleanup) {
                    c();
                }
                _shorcuts_cleanup.delete(key);
            }
        }
    }

    function _select_next_result() {
        const results = _mode_state.items.value;
        if (!results.length) {
            return;
        }

        const selectedIdx = selected.value.idx;
        if (selectedIdx === -1) {
            selected.value.idx = 0;
            selected.value.id = results[0].id;
        }
        else {
            const newIdx = (selectedIdx + 1) % results.length;
            selected.value.idx = newIdx;
            selected.value.id = results[newIdx].id;
        }

        selected.sync();
    }

    function _select_previous_result() {
        const results = _mode_state.items.value;
        if (!results.length) {
            return;
        }

        const selectedIdx = selected.value.idx;
        if (selectedIdx === -1) {
            selected.value.idx = results.length - 1;
            selected.value.id = results[results.length - 1].id;
        }
        else {
            const newIdx = (selectedIdx - 1 + results.length) % results.length;
            selected.value.idx = newIdx;
            selected.value.id = results[newIdx].id;
        }

        selected.sync();
    }

    function _register_item<T extends HyperItemType = HyperItemType>(type: T, item: OneOrMany<HyperItem>, override: boolean = false, silent: boolean = true) {
        const mode = modes.get(type) as PaletteModeState<HyperItemType>;
        const unsafe_items: HyperItem[] = Array.isArray(item) ? item : [item];
        const new_items: HyperItem[] = [];
        const removed_items: HyperItem[] = [];

        for (const unsafe_item of unsafe_items) {
            const new_item = unsafe_item;
            let found_idx = -1;
            for (let i = 0; i < mode.rawAll.length; i++) {
                if (mode.rawAll[i].id === new_item.id) {
                    found_idx = i;
                    break;
                }
            }
            if (found_idx === -1) {
                new_items.push(new_item);
                mode.rawAll.push(new_item);
                mode.items.value.push(new_item);
                if ('shortcut' in new_item) {
                    _register_shortcut(new_item);
                }
                continue;
            }

            if (override) {
                // removing old item
                const removed = mode.rawAll[found_idx];
                if ('shortcut' in removed) {
                    _unregister_shortcut(removed);
                }
                if ('onUnregister' in removed) {
                    removed.onUnregister?.(removed);
                }
                // any is used because the type doesn't narrow down to the correct type
                mode.searcher.remove(removed as any);
                removed_items.push(removed);

                // adding new item
                mode.rawAll[found_idx] = new_item;
                if ('shortcut' in new_item) {
                    _register_shortcut(new_item);
                }
                mode.items.value[found_idx] = new_item;
                mode.searcher.add(new_item);
                continue;
            }

            if (silent) {
                continue;
            }

            throw new HyperCommandError(`Item with id ${new_item.id} already exists in the palette, current ${mode.rawAll[found_idx]} new ${new_item}`);
        }

        // TODO: sort items, better than sorting on search?

        mode.items.sync();

        if (open.value && _mode_state.type === type) {
            _update_results();
        }

        return () => {
            const mode = modes.get(type);
            if (!mode) {
                return;
            }

            for (const new_item of new_items) {
                let idx = -1;
                for (let i = 0; i < mode.rawAll.length; i++) {
                    if (mode.rawAll[i].id === new_item.id) {
                        idx = i;
                        break;
                    }
                }
                if (idx === -1) {
                    continue;
                }

                mode.rawAll.splice(idx, 1);
                mode.items.value.splice(idx, 1);
                // EXCUSE: any is used because the type doesn't narrow down to the correct type
                mode.searcher.remove(new_item as any);
                if ('shortcut' in new_item) {
                    _unregister_shortcut(new_item);
                }
                if ('onUnregister' in new_item) {
                    new_item.onUnregister?.(new_item);
                }
            }

            // EXCUSE: no need to sort items because removing items doesn't change the order

            mode.items.sync();
            if (open.value && _mode_state.type === type) {
                _update_results();
            }
        };
    }

    function _unregister_item<T extends HyperItemType = HyperItemType>(type: T, selector: OneOrMany<ItemMatcher<HyperItem>>) {
        const mode = modes.get(type) as PaletteModeState<HyperItemType>;
        const selectors = Array.isArray(selector) ? selector : [selector];

        let removed_count = 0;
        const to_remove: number[] = [];
        for (const selector of selectors) {
            to_remove.length = 0;
            if (typeof selector === 'string') {
                for (let i = 0; i < mode.rawAll.length; i++) {
                    if (mode.rawAll[i].id === selector) {
                        to_remove.push(i);
                        break;
                    }
                }
            }
            else if (typeof selector === 'function') {
                for (let i = 0; i < mode.rawAll.length; i++) {
                    if (selector(mode.rawAll[i])) {
                        to_remove.push(i);
                    }
                }
            }
            else {
                for (let i = 0; i < mode.rawAll.length; i++) {
                    if (selector === mode.rawAll[i]) {
                        to_remove.push(i);
                        break;
                    }
                }
            }

            if (!to_remove.length) {
                continue;
            }

            removed_count += to_remove.length;

            for (let i = to_remove.length - 1; i >= 0; i--) {
                const idx = to_remove[i];
                const removed = mode.rawAll[idx];
                mode.rawAll.splice(idx, 1);
                mode.items.value.splice(idx, 1);
                mode.searcher.remove(removed as any);
                if ('shortcut' in removed) {
                    _unregister_shortcut(removed);
                }
                if ('onUnregister' in removed) {
                    removed.onUnregister?.(removed);
                }
            }
        }

        if (removed_count === 0) {
            return;
        }

        mode.items.sync();
        if (open.value && _mode_state.type === type) {
            _update_results();
        }
    }

    return {
        helpers: {
            registerItem: <T extends HyperItemType>(type: T, item: OneOrMany<HyperItemTypeMap[T]>, override: boolean = false, silent: boolean = true) => {
                if (!modes.has(type)) {
                    throw new HyperCommandError(`Custom mode ${type} was not registered`);
                }

                return _register_item(type, item, override, silent);
            },
            unregisterItem: <T extends HyperItemType>(type: T, selector: OneOrMany<ItemMatcher<HyperItemTypeMap[T]>>) => {
                if (!modes.has(type)) {
                    throw new HyperCommandError(`Custom mode ${type} was not registered`);
                }

                // @ts-expect-error - type is not inferred correctly
                return _unregister_item(type, selector);
            },
            search: (pattern: string) => {
                pattern = pattern.trim();
                _search_and_update(pattern);
            },
            openPalette: (mode?: HyperItemType) => {
                _open_palette(mode ?? _mode_state.type);
            },
            closePalette: _close_palette,
            togglePalette: () => {
                if (open.value) {
                    _close_palette();
                }
                else {
                    _open_palette(_mode_state.type);
                }
            },
            registerPaletteShortcuts: _register_palette_shortcuts,
            unregisterPaletteShortcuts: _unregister_palette_shortcuts,
        }
    };
}
