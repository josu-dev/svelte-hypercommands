import { browser } from '$app/environment';
import { use_clickoutside, use_portal } from '$lib/internal/actions.js';
import type { Cleanup, OneOrMany, WritableExposed } from '$lib/internal/helpers/index.js';
import { Searcher, addKeyBinding, builder, exposeWritable, hyperId, writableExposed } from '$lib/internal/helpers/index.js';
import { tick } from 'svelte';
import { ACTIONABLE_CLOSE_ON, HYPER_ITEM, NAVIGABLE_CLOSE_ON, NO_RESULTS_MODE, PALETTE_CLOSE_ACTION, PALETTE_ELEMENTS, SORT_MODE } from './constants.js';
import { HyperPaletteError } from './errors.js';
import type { AnyHyperItem, CreatePaletteOptions, CreatePaletteReturn, HyperActionable, HyperItemConfig, HyperItemType, HyperNavigable, HyperNavigableConfiguration, HyperPaletteOptions, HyperSearchable, ItemMatcher, ItemRequestSource, PaletteError, PaletteIds, PaletteItemsOptions, PaletteModeState, PaletteSelected } from './types.js';

const INTERNAL_KEY = {
    OPEN_PALETTE: '__hyper_open_palette',
    CLOSE_PALETTE: '__hyper_close_palette',
    DATASET_HYPER_ID: 'dataHyperId',
} as const;

const SR_STYLE = `
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  border: none;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
`;


function elementName(name?: string): string {
    return name ? `palette-${name}` : 'palette';
}

const itemModeDefaults = {
    [HYPER_ITEM.ACTIONABLE]: {
        emptyMode: NO_RESULTS_MODE.ALL,
        shortcut: [],
        sortMode: SORT_MODE.SORTED,
        closeOn: ACTIONABLE_CLOSE_ON.ALWAYS,
    },
    [HYPER_ITEM.NAVIGABLE]: {
        emptyMode: NO_RESULTS_MODE.ALL,
        shortcut: [],
        sortMode: SORT_MODE.SORTED,
        onExternal: (url: string) => {
            window.open(url, '_blank');
        },
        onLocal: (url: string) => {
            window.location.href = url;
        }
    },
    [HYPER_ITEM.SEARCHABLE]: {
        emptyMode: NO_RESULTS_MODE.ALL,
        shortcut: [],
        sortMode: SORT_MODE.SORTED,
    },
};

const defaults = {
    closeAction: PALETTE_CLOSE_ACTION.RESET,
    closeOnClickOutside: true,
    closeOnEscape: true,
    debounce: 150,
    defaults: {
        open: false,
        searchText: '',
        placeholder: undefined,
    },
    portal: false,
    resetOnOpen: false,
} satisfies (
        Omit<HyperPaletteOptions, 'defaults' | 'items' | 'open' | 'placeholder'>
        & { defaults: Pick<HyperPaletteOptions['defaults'], 'open' | 'placeholder' | 'searchText'>; }
    );

function parseItemsConfig<T extends PaletteItemsOptions>(items: T) {
    if (typeof items !== 'object' || items === null) {
        throw new HyperPaletteError(
            `Invalid items configuration, expected Record<string, PaletteItemConfig> got ${typeof items}`
        );
    }

    const safeItems = {} as any;
    const registeredPrefixes = new Set<string>();
    const validTypes = new Set<HyperItemType>(Object.values(HYPER_ITEM));

    for (const [mode, config] of Object.entries(items)) {
        if (typeof config !== 'object' || config === null) {
            throw new HyperPaletteError(
                `Invalid item configuration, expected PaletteItemConfig got ${typeof config}`
            );
        }
        if (mode in safeItems) {
            throw new HyperPaletteError(`Duplicate item mode: ${mode}`);
        }
        if (registeredPrefixes.has(config.prefix)) {
            throw new HyperPaletteError(`Duplicate item prefix: ${config.prefix}`);
        }
        if (!validTypes.has(config.type as any)) {
            throw new HyperPaletteError(`Invalid item type: ${config.type}`);
        }

        safeItems[mode] = {
            ...itemModeDefaults[config.type],
            ...config,
        };
    }

    return safeItems;
}

function generateIds(initials: Partial<PaletteIds>): PaletteIds {
    const ids = {} as PaletteIds;
    for (const name of PALETTE_ELEMENTS) {
        ids[name] = initials[name] || hyperId();
    }
    return ids;
}

function createModeState<T extends HyperItemConfig>(mode: string, options: T): PaletteModeState<T['type']> {
    return {
        mode: mode,
        config: options,
        items: writableExposed([]),
        results: writableExposed([]),
        history: writableExposed([]),
        searcher: new Searcher({ mapper: options.mapToSearch as any }),
        current: writableExposed(undefined),
        rawAll: [],
        rawAllSorted: [],
        lastInput: '',
    } as any;
}

export function createPalette<T extends CreatePaletteOptions, Items extends T['items']>(options: T): CreatePaletteReturn<Items> {
    const safeOptions = { ...defaults, ...options } as HyperPaletteOptions;
    safeOptions.items = parseItemsConfig(safeOptions.items);
    safeOptions.defaults = { ...defaults.defaults, ...safeOptions.defaults };

    const _modes = new Map<string, PaletteModeState>();

    for (const [mode, options] of Object.entries(safeOptions.items)) {
        const state = createModeState(mode, options);
        _modes.set(mode, state);
    }

    // TODO: make search text define the initial moder
    let initialMode: PaletteModeState;
    if (safeOptions.defaults.mode) {
        // @ts-expect-error - is valid since the throw will stop the execution
        initialMode = _modes.get(safeOptions.defaults.mode);
        if (!initialMode) {
            throw new HyperPaletteError(`Invalid default mode: ${safeOptions.defaults.mode} is not registered`);
        }
    }
    else {
        initialMode = _modes.values().next().value;
    }

    const _internal_cleanup = new Map<string, Cleanup>();

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
        open = writableExposed(safeOptions.defaults.open);
    }

    // ids are optional must be nullish coalesced to avoid undefined
    const ids = generateIds(safeOptions.defaults.ids ?? {});
    // TODO: make search text define the initial mode
    const searchText = writableExposed('');
    // TODO: check if default mode exists, defualt to first if not passed in
    const paletteMode = writableExposed(initialMode.mode);
    const error = writableExposed<PaletteError<any> | undefined>(undefined);
    const portal = writableExposed(safeOptions.portal);
    const placeholder = writableExposed(safeOptions.defaults.placeholder);
    const debounce = writableExposed(safeOptions.debounce);
    const closeAction = writableExposed(safeOptions.closeAction);
    const closeOnClickOutside = writableExposed(safeOptions.closeOnClickOutside);
    const closeOnEscape = writableExposed(safeOptions.closeOnEscape);
    const resetOnOpen = writableExposed(safeOptions.resetOnOpen);
    const selected = writableExposed<PaletteSelected>({
        el: undefined,
        idx: -1,
        id: undefined,
    });

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

    function _set_empty_results() {
        _mode_state.results.set([]);
        selected.value.id = undefined;
        selected.value.idx = -1;
        selected.sync();
    }

    function _search_and_update(pattern: string) {
        // TODO: use the sorted raw items instead of sorting the results
        let results: AnyHyperItem[];
        if (pattern === '') {
            switch (_mode_state.config.emptyMode) {
                case NO_RESULTS_MODE.ALL:
                    results = [..._mode_state.rawAll];
                    break;
                case NO_RESULTS_MODE.HISTORY:
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
                case NO_RESULTS_MODE.NONE:
                    results = [];
                    break;
                default:
                    throw new HyperPaletteError(`Invalid empty mode: ${_mode_state.config.emptyMode}`);
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

    function _open_palette(mode: string) {
        _mode_state = _modes.get(mode) as PaletteModeState<HyperItemType>;

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
        open.set(true);

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

    async function _resolve_actionable(item: HyperActionable, source: ItemRequestSource) {
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
                mode: item.type,
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

    async function _resolve_navigable(item: HyperNavigable, source: ItemRequestSource) {
        _mode_state.current.set(item);
        const config = _mode_state.config as HyperNavigableConfiguration;
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
                mode: item.type,
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

    async function _resolve_searchable(item: HyperSearchable, source: ItemRequestSource) {
        throw new HyperPaletteError(
            `Unimplemented searchable item: ${item} source: ${source}`
        );
    }

    const _shorcuts_cleanup = new Map<string, Cleanup[]>();
    _internal_cleanup.set('shortcuts', () => {
        for (const cleanups of _shorcuts_cleanup.values()) {
            for (const c of cleanups) {
                c();
            }
        }
    });

    function _register_shortcut(item: HyperActionable) {
        const shortcuts = item.shortcut;
        if (shortcuts.length === 0) {
            return;
        }

        const cleanup: Cleanup[] = [];
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

    function _unregister_shortcut(item: HyperActionable) {
        const cleanup = _shorcuts_cleanup.get(item.id);
        if (cleanup) {
            for (const c of cleanup) {
                c();
            }
            _shorcuts_cleanup.delete(item.id);
        }
    }

    function _register_palette_shortcuts() {
        const cleanup: Cleanup[] = [];
        for (const mode of _modes.values()) {
            if (!mode.config.shortcut) {
                continue;
            }
            for (const s of mode.config.shortcut) {
                const c = addKeyBinding(window, s, (event) => {
                    event.preventDefault();
                    _open_palette(mode.mode);
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

    function _register_item<T extends string>(mode: T, item: OneOrMany<AnyHyperItem>, override: boolean = false, silent: boolean = true) {
        const _mode = _modes.get(mode) as PaletteModeState<HyperItemType>;
        const unsafe_items: AnyHyperItem[] = Array.isArray(item) ? item : [item];
        const new_items: AnyHyperItem[] = [];
        const removed_items: AnyHyperItem[] = [];

        for (const unsafe_item of unsafe_items) {
            const new_item = unsafe_item;
            let found_idx = -1;
            for (let i = 0; i < _mode.rawAll.length; i++) {
                if (_mode.rawAll[i].id === new_item.id) {
                    found_idx = i;
                    break;
                }
            }
            if (found_idx === -1) {
                new_items.push(new_item);
                _mode.rawAll.push(new_item);
                _mode.items.value.push(new_item);
                if ('shortcut' in new_item) {
                    _register_shortcut(new_item);
                }
                continue;
            }

            if (override) {
                // removing old item
                const removed = _mode.rawAll[found_idx];
                if ('shortcut' in removed) {
                    _unregister_shortcut(removed);
                }
                if ('onUnregister' in removed) {
                    removed.onUnregister?.(removed);
                }
                // any is used because the type doesn't narrow down to the correct type
                _mode.searcher.remove(removed as any);
                removed_items.push(removed);

                // adding new item
                _mode.rawAll[found_idx] = new_item;
                if ('shortcut' in new_item) {
                    _register_shortcut(new_item);
                }
                _mode.items.value[found_idx] = new_item;
                _mode.searcher.add(new_item);
                continue;
            }

            if (silent) {
                continue;
            }

            throw new HyperPaletteError(`Item with id ${new_item.id} already exists in the palette, current ${_mode.rawAll[found_idx]} new ${new_item}`);
        }

        // TODO: sort items, better than sorting on search?

        _mode.items.sync();

        if (open.value && _mode_state.mode === mode) {
            _update_results();
        }

        return () => {
            const _mode = _modes.get(mode);
            if (!_mode) {
                return;
            }

            for (const new_item of new_items) {
                let idx = -1;
                for (let i = 0; i < _mode.rawAll.length; i++) {
                    if (_mode.rawAll[i].id === new_item.id) {
                        idx = i;
                        break;
                    }
                }
                if (idx === -1) {
                    continue;
                }

                _mode.rawAll.splice(idx, 1);
                _mode.items.value.splice(idx, 1);
                // EXCUSE: any is used because the type doesn't narrow down to the correct type
                _mode.searcher.remove(new_item as any);
                if ('shortcut' in new_item) {
                    _unregister_shortcut(new_item);
                }
                if ('onUnregister' in new_item) {
                    new_item.onUnregister?.(new_item);
                }
            }

            // EXCUSE: no need to sort items because removing items doesn't change the order

            _mode.items.sync();
            if (open.value && _mode_state.mode === mode) {
                _update_results();
            }
        };
    }

    function _unregister_item<T extends string>(mode: T, selector: OneOrMany<ItemMatcher<AnyHyperItem>>) {
        const _mode = _modes.get(mode) as PaletteModeState<HyperItemType>;
        const selectors = Array.isArray(selector) ? selector : [selector];

        let removed_count = 0;
        const to_remove: number[] = [];
        for (const selector of selectors) {
            to_remove.length = 0;
            if (typeof selector === 'string') {
                for (let i = 0; i < _mode.rawAll.length; i++) {
                    if (_mode.rawAll[i].id === selector) {
                        to_remove.push(i);
                        break;
                    }
                }
            }
            else if (typeof selector === 'function') {
                for (let i = 0; i < _mode.rawAll.length; i++) {
                    if (selector(_mode.rawAll[i])) {
                        to_remove.push(i);
                    }
                }
            }
            else {
                for (let i = 0; i < _mode.rawAll.length; i++) {
                    if (selector === _mode.rawAll[i]) {
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
                const removed = _mode.rawAll[idx];
                _mode.rawAll.splice(idx, 1);
                _mode.items.value.splice(idx, 1);
                _mode.searcher.remove(removed as any);
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

        _mode.items.sync();
        if (open.value && _mode_state.mode === mode) {
            _update_results();
        }
    }

    //
    // Elements
    //

    const builderPalette = builder(elementName(), {
        stores: [portal],
        returned: ([$portal]) => {
            return {
                'data-portal': $portal ? '' : undefined,
                id: ids.palette,
            };
        },
        action: (node) => {
            const cleanup: Cleanup[] = [];

            if (safeOptions.portal) {
                const _portal = use_portal(node, safeOptions.portal);
                const _unsubscribe = portal.subscribe((value) => {
                    _portal.update(value);
                });
                cleanup.push(() => {
                    _portal.destroy();
                    _unsubscribe();
                });
            }

            _register_palette_shortcuts();
            cleanup.push(_unregister_palette_shortcuts);
            for (const mode of _modes.values()) {
                for (const shorcut of mode.config.shortcut ?? []) {
                    const c = addKeyBinding(window, shorcut, (event) => {
                        event.preventDefault();
                        _open_palette(mode.mode);
                    });
                    if (c) {
                        cleanup.push(c);
                    }
                }
            }

            return {
                destroy() {
                    for (const c of cleanup) {
                        c();
                    }
                }
            };
        }
    });

    const builderPanel = builder(elementName('panel'), {
        returned: () => {
            return {
                id: ids.panel,
            };
        },
        action: (node) => {
            const cleanup: Cleanup[] = [];

            if (safeOptions.closeOnClickOutside) {
                cleanup.push(
                    use_clickoutside(node, {
                        "type": "pointerdown",
                        handler: _close_palette
                    }).destroy
                );
            }

            if (safeOptions.closeOnEscape) {
                _register_escape_shortcut();
                cleanup.push(_unregister_escape_shortcut);
            }

            return {
                destroy() {
                    for (const c of cleanup) {
                        c();
                    }
                }
            };
        }
    });

    const builderForm = builder(elementName('search-form'), {
        returned: () => {
            return {
                id: ids.form,
            };
        },
        action: (node) => {
            function on_submit(event: SubmitEvent) {
                event.preventDefault();
                // eslint-disable-next-line prefer-const
                let selectedIdx = selected.value.idx;
                if (selectedIdx < 0) {
                    // TODO: get the first element if available
                    return;
                }

                const item = _mode_state.results.value[selectedIdx];
                const mode = _modes.get(item.type);
                if (!item || !mode) {
                    // this should never happen
                    throw new HyperPaletteError(
                        `Invalid selected index: ${selectedIdx} for ${_mode_state}`
                    );
                }

                const source: ItemRequestSource = { type: 'submit', event: event };

                if (mode.mode === HYPER_ITEM.ACTIONABLE) {
                    _resolve_actionable(item as HyperActionable, source);
                }
                else if (mode.mode === HYPER_ITEM.NAVIGABLE) {
                    _resolve_navigable(item as HyperNavigable, source);
                }
                else {
                    _resolve_searchable(item as HyperSearchable, source);
                }
            }

            node.addEventListener('submit', on_submit);

            return {
                destroy() {
                    node.removeEventListener('submit', on_submit);
                }
            };
        }
    });

    const builderLabel = builder(elementName('search-label'), {
        returned: () => {
            return {
                id: ids.label,
                for: ids.input,
                style: SR_STYLE,
            };
        },
    });

    const builderInput = builder(elementName('search-input'), {
        stores: [placeholder],
        returned: ([$placeholder]) => {
            return {
                id: ids.input,
                type: 'text',
                autocomplete: 'off',
                spellcheck: false,
                placeholder: $placeholder || undefined,
                'aria-labelledby': ids.label,
            };
        },
        action: (node) => {
            _input_el = node as unknown as HTMLInputElement;

            let debounce_id: number | undefined;

            function on_input(event: Event) {
                const el = event.target as HTMLInputElement;
                const raw_value = el.value;
                searchText.set(raw_value);
                let query = raw_value;
                let newInputMode = paletteMode.value;
                let changedMode = false;
                if (!query.startsWith(_mode_state.config.prefix) || !_mode_state.config.prefix) {
                    for (const mode of _modes.values()) {
                        if (query.startsWith(mode.config.prefix)) {
                            newInputMode = mode.mode;
                            break;
                        }
                    }
                }

                if (newInputMode !== paletteMode.value) {
                    changedMode = true;
                    const mode = _modes.get(newInputMode);
                    if (!mode) {
                        _set_empty_results();
                        return;
                    }
                    _mode_state = mode;
                    paletteMode.set(newInputMode);
                }

                query = query.slice(_mode_state.config.prefix.length);
                if (safeOptions.debounce <= 0 || changedMode) {
                    _search_and_update(query);
                    return;
                }

                clearTimeout(debounce_id);
                debounce_id = setTimeout(
                    _search_and_update,
                    safeOptions.debounce,
                    query
                );
            }

            function on_keydown(event: KeyboardEvent) {
                if (event.key === 'ArrowDown') {
                    event.preventDefault();
                    _select_next_result();
                }
                else if (event.key === 'ArrowUp') {
                    event.preventDefault();
                    _select_previous_result();
                }
                else if (event.key === 'Escape') {
                    // noop?
                }
                else if (event.key === 'Tab') {
                    event.preventDefault();
                    event.stopImmediatePropagation();
                }
            }

            node.addEventListener('input', on_input);
            node.addEventListener('keydown', on_keydown);

            return {
                destroy() {
                    _input_el = undefined;
                    node.removeEventListener('input', on_input);
                    node.removeEventListener('keydown', on_keydown);
                }
            };
        }
    });

    const builderItem = builder(elementName('item'), {
        stores: [],
        returned: () => {
            return {
                role: 'button',
            };
        },
        action: (node: HTMLElement, item: AnyHyperItem) => {
            function on_click(event: MouseEvent) {
                event.preventDefault();
                const el = event.currentTarget as HTMLElement;
                const source: ItemRequestSource = { type: 'click', event: event };
                const id = el.getAttribute('data-hyper-id');
                let idx = -1;
                for (let i = 0; i < _mode_state.results.value.length; i++) {
                    if (_mode_state.results.value[i].id === id) {
                        idx = i;
                        break;
                    }
                }
                if (idx === -1) {
                    throw new HyperPaletteError(`Invalid item id: ${id}`);
                }

                const item = _mode_state.results.value[idx];
                if (!item) {
                    throw new HyperPaletteError(`Invalid item: ${item} mode: ${_mode_state}`);
                }

                if (_mode_state.mode === HYPER_ITEM.ACTIONABLE) {
                    _resolve_actionable(item as HyperActionable, source);
                }
                else if (_mode_state.mode === HYPER_ITEM.NAVIGABLE) {
                    _resolve_navigable(item as HyperNavigable, source);
                }
                else {
                    _resolve_searchable(item as HyperSearchable, source);
                }

            }

            node.dataset[INTERNAL_KEY.DATASET_HYPER_ID] = item.id.toString();

            node.addEventListener('click', on_click);

            const unsubscribe_selected = selected.subscribe((value) => {
                if (value.id !== item.id) {
                    delete node.dataset['selected'];
                    return;
                }

                node.dataset['selected'] = '';
                node.scrollIntoView({ behavior: 'instant', 'block': 'nearest' });
            });

            return {
                destroy() {
                    node.removeEventListener('click', on_click);
                    unsubscribe_selected();
                }
            };
        }
    });

    function _exposed_state(): CreatePaletteReturn<Items>['states'] {
        const items: Record<string, any> = {};
        for (const [type, mode] of _modes) {
            items[mode.mode] = {
                items: mode.items,
                results: mode.results,
                current: mode.current,
                history: mode.history,
            };
        }
        return {
            open,
            searchText,
            mode: paletteMode,
            error,
            portal,
            placeholder,
            items: items as any
        };
    }

    return {
        elements: {
            palette: builderPalette,
            panel: builderPanel,
            form: builderForm,
            label: builderLabel,
            input: builderInput,
            item: builderItem,
        },
        helpers: {
            registerItem: (type, item, override = false, silent = true) => {
                if (!_modes.has(type)) {
                    throw new HyperPaletteError(`Custom mode ${type} was not registered`);
                }

                return _register_item(type, item, override, silent);
            },
            unregisterItem: (mode, selector) => {
                if (!_modes.has(mode)) {
                    throw new HyperPaletteError(`Custom mode ${mode} was not registered`);
                }

                // TODO: improve the typing of the _unregister_item function
                return _unregister_item(mode, selector as any);
            },
            search: (pattern) => {
                pattern = pattern.trim();
                _search_and_update(pattern);
            },
            openPalette: (mode) => {
                _open_palette(mode ?? _mode_state.mode);
            },
            closePalette: _close_palette,
            togglePalette: () => {
                if (open.value) {
                    _close_palette();
                }
                else {
                    _open_palette(_mode_state.mode);
                }
            },
            registerPaletteShortcuts: _register_palette_shortcuts,
            unregisterPaletteShortcuts: _unregister_palette_shortcuts,
        },
        states: _exposed_state()
    };
}
