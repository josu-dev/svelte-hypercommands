import { useClickOutside, usePortal } from '$lib/actions.js';
import { hyperId, log, noop, stringAsHyperId, type HyperId } from '$lib/internal/index.js';
import { addKeyBinding } from '$lib/keyboard/index.js';
import { Searcher } from '$lib/search/index.js';
import { exposeWritable, writableExposed, type WritableExposed } from '$lib/stores/index.js';
import type { OneOrMany } from '$lib/utils/index.js';
import { tick } from 'svelte';
import { derived, get, type Writable } from 'svelte/store';
import { builder } from './builder.js';
import { HYPER_ITEM_TYPE, PALETTE_CLOSE_ACTION, PALETTE_CLOSE_ON, PALETTE_MODE, PALETTE_MODE_PREFIX, RESULTS_EMPTY_MODE, SORT_MODE } from './constants.js';
import { DuplicatedIdError } from './errors.js';
import { normalizeCommand, normalizePage } from './helpers.js';
import type {
    CleanupCallback,
    CommandMatcher,
    CommandPaletteOptions,
    CreateCommandPaletteOptions,
    HyperCommand,
    HyperCommandDefinition,
    HyperPage,
    HyperPageDefinition,
    ItemRequestSource,
    PageMatcher,
    PaletteMode,
    ResultsEmptyMode,
    SortMode
} from './types.js';

const dataKey = {
    itemId: 'hyperItemId',
} as const;

function elementDataName(name?: string): string {
    return name ? `palette-${name}` : 'palette';
}

const DEFAULTS = {
    closeAction: PALETTE_CLOSE_ACTION.RESET_CLOSE,
    closeOn: PALETTE_CLOSE_ON.ALWAYS,
    commands: [],
    commandsEmptyMode: RESULTS_EMPTY_MODE.ALL,
    commandsHistory: [],
    commandsShortcut: '$mod+Shift+P',
    commandsSortMode: SORT_MODE.ASC,
    defaultInputText: '',
    defaultOpen: false,
    error: undefined,
    onNavigationExternal: async (url) => {
        window.open(url, '_blank');
    },
    onNavigationLocal: async (url) => {
        window.location.href = url;
    },
    pages: [],
    pagesEmptyMode: RESULTS_EMPTY_MODE.ALL,
    pagesHistory: [],
    pagesShortcut: '$mod+P',
    pagesSortMode: SORT_MODE.ASC,
    portal: undefined,
    resetOnOpen: true,
    searchPlaceholder: `Search pages... ${PALETTE_MODE_PREFIX.COMMANDS} for commands...`,
    selectedEl: undefined,
    selectedId: undefined,
    selectedIdx: undefined,
} satisfies CommandPaletteOptions;

const screenReaderStyles = `
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

export function createCommandPalette(options: CreateCommandPaletteOptions = {}) {
    const safeOptions = { ...DEFAULTS, ...options };

    const _paletteCleanup = new Map<string, CleanupCallback>();
    const _onPageNavigation = safeOptions.onNavigation ?? ((page) => {
        if (page.external) {
            return safeOptions.onNavigationExternal(page.url);
        }
        return safeOptions.onNavigationLocal(page.url);
    });

    const open = options?.open ? exposeWritable(options.open) : writableExposed(safeOptions.defaultOpen);
    // @ts-expect-error - open no infers the optional unsubscribe property
    if (open.unsubscribe) {
        // @ts-expect-error - open no infers the optional unsubscribe property
        _paletteCleanup.push(open.unsubscribe);
    }

    const _closeAction = safeOptions.closeAction;
    const _closeOn = safeOptions.closeOn;

    const inputText = writableExposed(safeOptions.defaultInputText);
    const paletteMode = writableExposed<PaletteMode>(PALETTE_MODE.PAGES);

    const commands = writableExposed<HyperCommand[]>(safeOptions.commands);
    const commandsEmptyMode = writableExposed(safeOptions.commandsEmptyMode);
    const commandsHistory = writableExposed(safeOptions.commandsHistory);
    const commandsSortMode = writableExposed(safeOptions.commandsSortMode);
    const error = writableExposed<CommandPaletteOptions['error']>(safeOptions.error);
    const pages = writableExposed<HyperPage[]>(safeOptions.pages);
    const pagesEmptyMode = writableExposed(safeOptions.pagesEmptyMode);
    const pagesHistory = writableExposed(safeOptions.pagesHistory);
    const pagesSortMode = writableExposed(safeOptions.pagesSortMode);
    const portal = writableExposed(safeOptions.portal);
    const resetOnOpen = writableExposed(safeOptions.resetOnOpen);
    const searchPlaceholder = writableExposed(safeOptions.searchPlaceholder);
    const selectedEl = writableExposed<CommandPaletteOptions['selectedEl']>(safeOptions.selectedEl);
    const selectedId = writableExposed<CommandPaletteOptions['selectedId']>(safeOptions.selectedId);
    const selectedIdx = writableExposed<CommandPaletteOptions['selectedIdx']>(safeOptions.selectedIdx);

    const currentCommand = writableExposed<HyperCommand | undefined>(undefined);
    const currentPage = writableExposed<HyperPage | undefined>(undefined);

    const ids = {
        container: hyperId(),
        panel: hyperId(),
        searchForm: hyperId(),
        searchLabel: hyperId(),
        searchInput: hyperId(),
    };

    let _inputElement: HTMLInputElement | null = null;

    const _searcherCommands = new Searcher<HyperCommand>({
        mapper: (item) => item.name + item.description + item.keywords.join('') + item.category,
    });
    const _searcherPages = new Searcher<HyperPage>({
        mapper: (item) => item.urlHostPathname,
    });

    const _allCommands: HyperCommand[] = [];
    const _allCommandsSorted: HyperCommand[] = [];
    const _allPages: HyperPage[] = [];
    const _allPagesSorted: HyperPage[] = [];

    const commandResults = writableExposed<HyperCommand[]>([]);
    const pageResults = writableExposed<HyperPage[]>([]);

    let _currentAllItems: HyperCommand[] | HyperPage[] = _allPagesSorted;
    let _currentResults: Writable<HyperCommand[] | HyperPage[]> = pageResults;
    let _currentSearcher: Searcher<HyperCommand> | Searcher<HyperPage> = _searcherPages;
    let _currentEmptyMode: ResultsEmptyMode = pagesEmptyMode.value;
    let _currentHistory: WritableExposed<HyperId[]> = pagesHistory;

    derived([paletteMode, commandsEmptyMode, pagesEmptyMode], ([$paletteMode, $commandsEmptyMode, $pagesEmptyMode]) => {
        _currentEmptyMode = $paletteMode === PALETTE_MODE.COMMANDS ? $commandsEmptyMode : $pagesEmptyMode;
    });

    function _openPalette(mode: PaletteMode) {
        let initialText = safeOptions.defaultInputText;
        if (mode === PALETTE_MODE.COMMANDS) {
            _currentAllItems = _allCommands;
            _currentHistory = commandsHistory;
            _currentResults = commandResults;
            _currentSearcher = _searcherCommands;
            initialText = '>' + initialText;
        }
        else {
            _currentAllItems = _allPagesSorted;
            _currentHistory = pagesHistory;
            _currentResults = pageResults;
            _currentSearcher = _searcherPages;
        }

        tick().then(() => {
            if (_inputElement) {
                if (resetOnOpen.value) {
                    _inputElement.value = initialText;
                }
                _inputElement.focus();
            }
        });

        paletteMode.set(mode);

        if (!open.value) {
            open.set(true);
            registerEscKey();
        }

        if (!resetOnOpen.value) {
            return;
        }

        selectedIdx.set(undefined);
        selectedId.set(undefined);
        inputText.set(initialText);
        currentCommand.set(undefined);
        updateResults(true);
    }

    function openPalette() {
        _openPalette(paletteMode.value);
    }

    function openPaletteCommands() {
        _openPalette(PALETTE_MODE.COMMANDS);
    }

    function openPalettePages() {
        _openPalette(PALETTE_MODE.PAGES);
    }

    function closePalette() {
        if (open.value) {
            open.set(false);
            cleanupEscKey();
        }
    }

    function togglePaletteOpen() {
        if (open.value) {
            closePalette();
        } else {
            openPalette();
        }
    }

    const commandsShortcutsCleanup: Map<HyperId, (() => void)[]> = new Map();

    function registerEscKey() {
        const cleanup = addKeyBinding(window, 'Escape', (event) => {
            closePalette();
        });
        if (cleanup) {
            commandsShortcutsCleanup.set(stringAsHyperId('CLOSE_PALETTE'), [cleanup]);
        }
    }

    function cleanupEscKey() {
        for (const cleanup of commandsShortcutsCleanup.get(stringAsHyperId('CLOSE_PALETTE')) ?? []) {
            cleanup();
        }
    }

    function shortcutOpenCommandPalette(event: KeyboardEvent) {
        event.preventDefault();

        _openPalette(PALETTE_MODE.COMMANDS);
    }

    function shortcutOpenPagePalette(event: KeyboardEvent) {
        event.preventDefault();

        _openPalette(PALETTE_MODE.PAGES);
    }

    function syncSortedPages() {
        _allPagesSorted.length = 0;
        for (const page of _allPages) {
            _allPagesSorted.push(page);
        }
        sortPageItems(pagesSortMode.value);
    }

    function sortPageItems(mode: SortMode) {
        if (mode === SORT_MODE.ASC) {
            _allPagesSorted.sort((a, b) => a.urlHostPathname.localeCompare(b.urlHostPathname));
            _searcherPages.sortItems((a, b) => a.item.urlHostPathname.localeCompare(b.item.urlHostPathname));
            return;
        }
        if (mode === SORT_MODE.DESC) {
            _allPagesSorted.sort((a, b) => b.urlHostPathname.localeCompare(a.urlHostPathname));
            _searcherPages.sortItems((a, b) => b.item.urlHostPathname.localeCompare(a.item.urlHostPathname));
            return;
        }
        _allPagesSorted.length = 0;
        for (const page of _allPages) {
            _allPagesSorted.push(page);
        }
        _searcherPages.sortItems((a, b) => a.AID - b.AID);
    }

    function clearInput() {
        const newValue = paletteMode.value === PALETTE_MODE.COMMANDS ? PALETTE_MODE_PREFIX.COMMANDS : PALETTE_MODE_PREFIX.PAGES;
        if (_inputElement) {
            _inputElement.value = newValue;
        }
        inputText.set(newValue);
    }

    function resetPalette() {
        selectedIdx.set(undefined);
        selectedId.set(undefined);
        currentCommand.set(undefined);
        clearInput();
        searchFn('');
    }

    function resetCurrentState() {

    }

    function updateResults(force = false) {
        let query = inputText.value;

        if (paletteMode.value === PALETTE_MODE.COMMANDS) {
            query = query.slice(PALETTE_MODE_PREFIX.COMMANDS.length);
        }
        if (!force && !query) {
            return;
        }

        searchFn(query);
    }

    async function executeCommand(command: HyperCommand, source: ItemRequestSource) {
        if (!command) {
            log?.('warn', 'No command provided to executeCommand');
            return;
        }

        currentCommand.set(command);

        const abortExecution = (await command.onRequest(command, source)) === false;
        if (abortExecution) {
            return;
        }

        try {
            await command.onAction({
                command,
                source,
            });
            error.set(undefined);
        }
        catch (err) {
            const _error = { error: err, command: command };
            error.set(_error);

            if (command.onError) {
                command.onError({ command, error: err, source });
            }
            else {
                log?.('error', _error);
            }
        }

        commandsHistory.value.unshift(command.id);
        commandsHistory.sync();
        selectedIdx.set(undefined);
        selectedId.set(undefined);
        clearInput();
        closePalette();
    }

    async function navigateToPage(page: HyperPage, source: ItemRequestSource) {
        if (!page) {
            log?.('warn', 'No page provided to navigateToPage');
            return;
        }

        currentPage.set(page);

        try {
            await _onPageNavigation(page);
            error.set(undefined);
        }
        catch (err) {
            const _error = { error: err, page: page };
            error.set(_error);
        }

        pagesHistory.value.unshift(page.id);
        pagesHistory.sync();
        selectedIdx.set(undefined);
        selectedId.set(undefined);
        clearInput();
        closePalette();
    }

    function registerCommandShortcuts(command: HyperCommand) {
        const shortcuts = command.shortcut;
        if (!shortcuts || shortcuts.length === 0) {
            return;
        }

        const cleanupShortcuts: (() => void)[] = [];
        for (const shortcut of shortcuts) {
            const cleanup = addKeyBinding(window, shortcut, (event) => {
                event.preventDefault();
                executeCommand(command, { type: 'shortcut', shortcut });
            });
            if (cleanup) {
                cleanupShortcuts.push(cleanup);
            }
        }

        commandsShortcutsCleanup.set(command.id, cleanupShortcuts);
    }

    function cleanupCommandShortcuts(command: HyperCommand) {
        const cleanupCallbacks = commandsShortcutsCleanup.get(command.id);
        if (!cleanupCallbacks) {
            return;
        }

        for (const cleanup of cleanupCallbacks) {
            cleanup();
        }
        commandsShortcutsCleanup.delete(command.id);
    }

    function registerCommand(
        command: OneOrMany<HyperCommandDefinition> | OneOrMany<HyperCommand>,
        override: boolean = false,
        silentError: boolean = true,
    ) {
        const unsafeCommands = Array.isArray(command) ? command : [command];

        const newCommands: HyperCommand[] = [];
        const removedCommands: HyperCommand[] = [];

        commands.update(($commands) => {
            for (const unsafeCommand of unsafeCommands) {
                const newCommand = normalizeCommand(unsafeCommand);
                const existingIndex = $commands.findIndex((command) => {
                    return command.id === newCommand.id;
                });

                if (existingIndex < 0) {
                    newCommands.push(newCommand);
                    $commands.push(newCommand);
                    registerCommandShortcuts(newCommand);
                    continue;
                }

                if (!override) {
                    if (silentError) {
                        continue;
                    }
                    throw new DuplicatedIdError(
                        `ID ${newCommand.id} is not unique, shared between existing command ${$commands[existingIndex].name} and new command ${newCommand.name}`,
                    );
                }

                newCommands.push(newCommand);
                const [oldCommand] = $commands.splice(existingIndex, 1, newCommand);
                registerCommandShortcuts(newCommand);

                cleanupCommandShortcuts(oldCommand);
                oldCommand.onUnregister?.(oldCommand);
                removedCommands.push(oldCommand);
            }

            return $commands;
        });

        for (const newCommand of newCommands) {
            _allCommands.push(newCommand);
            _searcherCommands.add(newCommand);
        }
        for (const removedCommand of removedCommands) {
            const idx = _allCommands.findIndex((result) => result.id === removedCommand.id);
            if (idx >= 0) {
                _allCommands.splice(idx, 1);
            }
            _searcherCommands.remove((cmd) => cmd.id === removedCommand.id);
        }

        if (open.value) {
            updateResults(true);
        }

        return () => {
            commands.update(($commands) => {
                for (const newCommand of newCommands) {
                    const index = $commands.findIndex((command) => command.id === newCommand.id);
                    if (index < 0) {
                        continue;
                    }

                    const [oldCommand] = $commands.splice(index, 1);
                    cleanupCommandShortcuts(oldCommand);
                    oldCommand.onUnregister?.(oldCommand);
                    const idx = _allCommands.findIndex((result) => result.id === oldCommand.id);
                    if (idx >= 0) {
                        _allCommands.splice(idx, 1);
                    }
                    _searcherCommands.remove((doc) => doc.id === oldCommand.id);
                }

                return $commands;
            });

            if (open.value) {
                updateResults(true);
            }
        };
    }

    function unregisterCommand(selector: OneOrMany<CommandMatcher>) {
        const matchers = Array.isArray(selector) ? selector : [selector];

        const removedCommands: HyperCommand[] = [];

        commands.update(($commands) => {
            for (const matcher of matchers) {
                let index: number;
                if (typeof matcher === 'function') {
                    index = $commands.findIndex(matcher);
                } else if (typeof matcher === 'object') {
                    index = $commands.findIndex((command) => command.id === matcher.id);
                } else {
                    index = $commands.findIndex((command) => command.id === matcher);
                }

                if (index < 0) {
                    continue;
                }

                const [oldCommand] = $commands.splice(index, 1);
                cleanupCommandShortcuts(oldCommand);
                oldCommand.onUnregister?.(oldCommand);
                removedCommands.push(oldCommand);
            }

            for (const removedCommand of removedCommands) {
                _searcherCommands.remove((doc) => doc.id === removedCommand.id);
            }

            return $commands;
        });

        if (open.value && paletteMode.value === PALETTE_MODE.COMMANDS) {
            updateResults(true);
        }
    }

    function registerPage(
        page: OneOrMany<HyperPageDefinition | HyperPage>,
        override: boolean = false,
        silentError: boolean = true,
    ) {
        const unsafePages = Array.isArray(page) ? page : [page];

        const newPages: HyperPage[] = [];
        const removedPages: HyperPage[] = [];

        pages.update(($pages) => {
            for (const unsafePage of unsafePages) {
                const newPage = normalizePage(unsafePage);
                const existingIndex = $pages.findIndex(($page) => $page.id === newPage.id);

                if (existingIndex < 0) {
                    newPages.push(newPage);
                    $pages.push(newPage);
                    continue;
                }
                if (!override) {
                    if (silentError) {
                        continue;
                    }
                    throw new DuplicatedIdError(
                        `ID ${newPage.id} is not unique, shared between existing page ${$pages[existingIndex].name} and new page ${newPage.name}`,
                    );
                }

                newPages.push(newPage);
                const [oldPage] = $pages.splice(existingIndex, 1, newPage);
                removedPages.push(oldPage);
            }

            return $pages;
        });

        for (const newPage of newPages) {
            _allPages.push(newPage);
            _searcherPages.add(newPage);
        }
        for (const removedPage of removedPages) {
            const idx = _allPages.findIndex((result) => result.id === removedPage.id);
            if (idx >= 0) {
                _allPages.splice(idx, 1);
            }
            _searcherPages.remove((cmd) => cmd.id === removedPage.id);
        }

        syncSortedPages();

        if (open.value) {
            updateResults(true);
        }

        return () => {
            pages.update(($pages) => {
                for (const newCommand of newPages) {
                    const index = $pages.findIndex((command) => command.id === newCommand.id);
                    if (index < 0) {
                        continue;
                    }

                    const [oldPage] = $pages.splice(index, 1);
                    const idx = _allPages.findIndex((result) => result.id === oldPage.id);
                    if (idx >= 0) {
                        _allPages.splice(idx, 1);
                    }
                    _searcherPages.remove((doc) => doc.id === oldPage.id);
                }

                return $pages;
            });

            syncSortedPages();

            if (open.value && paletteMode.value === PALETTE_MODE.COMMANDS) {
                updateResults(true);
            }
        };
    }

    function unregisterPage(selector: OneOrMany<PageMatcher>) {
        const matchers = Array.isArray(selector) ? selector : [selector];

        const removedPages: HyperPage[] = [];

        pages.update(($pages) => {
            for (const matcher of matchers) {
                let index: number;
                if (typeof matcher === 'function') {
                    index = $pages.findIndex(matcher);
                } else if (typeof matcher === 'object') {
                    index = $pages.findIndex((command) => command.id === matcher.id);
                } else {
                    index = $pages.findIndex((command) => command.id === matcher);
                }

                if (index < 0) {
                    continue;
                }

                const [oldPage] = $pages.splice(index, 1);
                removedPages.push(oldPage);
            }

            for (const removedPage of removedPages) {
                _searcherPages.remove((doc) => doc.id === removedPage.id);
            }

            return $pages;
        });

        syncSortedPages();

        if (open.value && paletteMode.value === PALETTE_MODE.PAGES) {
            updateResults(true);
        }
    }

    function searchFn(pattern: string) {
        let newResults: HyperCommand[] | HyperPage[] = [];
        if (pattern === '') {
            if (_currentEmptyMode === RESULTS_EMPTY_MODE.ALL) {
                newResults = _currentAllItems;
            }
            else if (_currentEmptyMode === RESULTS_EMPTY_MODE.HISTORY) {
                const ids = _currentHistory.value;
                newResults = _currentAllItems
                    .filter(
                        (result) => ids.includes(result.id)
                    ) as HyperCommand[] | HyperPage[];
            }
            else if (_currentEmptyMode === RESULTS_EMPTY_MODE.NONE) {
                newResults = [];
            }
            else {
                log?.('warn', 'Invalid empty mode', _currentEmptyMode);
            }
        }
        else {
            const searchResult = _currentSearcher.search(pattern);
            newResults = searchResult;
        }

        _currentResults.set(newResults);

        if (newResults.length === 0) {
            selectedIdx.set(undefined);
            selectedId.set(undefined);
            return;
        }

        selectedIdx.set(0);
        selectedId.set(newResults[0].id);
    }

    function nextResult() {
        const $results = get(_currentResults);
        const $selectedIdx = get(selectedIdx);
        if ($results.length === 0) {
            return;
        }

        if ($selectedIdx === undefined) {
            selectedIdx.update(($selectedIdx) => {
                $selectedIdx = 0;
                return $selectedIdx;
            });
            selectedId.update(($selectedId) => {
                $selectedId = $results[0].id;
                return $selectedId;
            });
            return;
        }

        selectedIdx.update(() => {
            const newIdx = ($selectedIdx + 1) % $results.length;
            selectedId.update(($selectedId) => {
                $selectedId = $results[newIdx].id;
                return $selectedId;
            });
            return newIdx;
        });
    }

    function prevResult() {
        const $results = get(_currentResults);
        const $selectedIdx = get(selectedIdx);
        if ($results.length === 0) {
            return;
        }

        if ($selectedIdx === undefined) {
            selectedIdx.update(($selectedIdx) => {
                $selectedIdx = $results.length - 1;
                return $selectedIdx;
            });
            selectedId.update(($selectedId) => {
                $selectedId = $results[$results.length - 1].id;
                return $selectedId;
            });
            return;
        }

        selectedIdx.update(() => {
            const newIdx = ($results.length + $selectedIdx - 1) % $results.length;
            selectedId.update(($selectedId) => {
                $selectedId = $results[newIdx].id;
                return $selectedId;
            });
            return newIdx;
        });
    }

    function registerDefaultShortcuts() {
        const cleanupShortcuts = [
            addKeyBinding(window, '$mod+Shift+P', shortcutOpenCommandPalette) ?? noop,
            addKeyBinding(window, '$mod+P', shortcutOpenPagePalette) ?? noop,
        ];

        commandsShortcutsCleanup.set(stringAsHyperId('OPEN_PALETTE'), cleanupShortcuts);
    }

    function cleanupDefaultsShorcuts() {
        let cleanupCallbacks = commandsShortcutsCleanup.get(stringAsHyperId('OPEN_PALETTE'));
        if (cleanupCallbacks) {
            for (const cleanup of cleanupCallbacks) {
                cleanup();
            }
            commandsShortcutsCleanup.delete(stringAsHyperId('OPEN_PALETTE'));
        }
        cleanupCallbacks = commandsShortcutsCleanup.get(stringAsHyperId('CLOSE_PALETTE'));
        if (cleanupCallbacks) {
            for (const cleanup of cleanupCallbacks) {
                cleanup();
            }
            commandsShortcutsCleanup.delete(stringAsHyperId('CLOSE_PALETTE'));
        }
    }

    const builderPortal = builder(elementDataName(), {
        stores: [portal],
        returned: ([$target]) => {
            return {
                'data-portal': $target ? '' : undefined,
            };
        },
        action: (node) => {
            const actionCleanup = usePortal(node, portal.value);

            const unsubscribe = portal.subscribe(actionCleanup.update);

            return {
                destroy() {
                    actionCleanup.destroy();
                    unsubscribe();
                },
            };
        },
    });

    const builderPalette = builder(elementDataName('palette'), {
        stores: [],
        returned: () => {
            return {
                id: ids.container,
            };
        },
        action: (node) => {
            registerDefaultShortcuts();

            return {
                destroy() {
                    cleanupDefaultsShorcuts();
                },
            };
        },
    });

    const builderPanel = builder(elementDataName('panel'), {
        stores: [],
        returned: () => {
            return {
                id: ids.panel
            };
        },
        action: (node) => {
            // Type 'pointerdown' has the least amount of delay between the event and the action
            const cleanupClickOutside = useClickOutside(node, {
                type: "pointerdown",
                handler: (event) => {
                    closePalette();
                },
            });

            return {
                destroy() {
                    cleanupClickOutside.destroy();
                },
            };
        },
    });

    const builderForm = builder(elementDataName('search-form'), {
        stores: [],
        returned: () => {
            return {
                id: ids.searchForm,
            };
        },
        action: (node: HTMLFormElement) => {
            function onSubmit(event: SubmitEvent) {
                event.preventDefault();
                const $selectedIdx = get(selectedIdx);
                if ($selectedIdx === undefined) {
                    return;
                }

                const $results = get(_currentResults);
                const item = $results[$selectedIdx];
                if (!item) {
                    return;
                }

                const domElement = document.querySelector(`[data-command-id="${item.id}"]`) as HTMLElement | null;
                if (domElement) {
                    selectedEl.set(domElement);
                }

                if (item.type === HYPER_ITEM_TYPE.PAGE) {
                    navigateToPage(item, { type: 'keyboard' });
                    return;
                }

                executeCommand(item, { type: 'keyboard' });
            }

            node.addEventListener('submit', onSubmit);

            return {
                destroy() {
                    node.removeEventListener('submit', onSubmit);
                },
            };
        },
    });

    const builderLabel = builder(elementDataName('search-label'), {
        stores: [],
        returned: () => {
            return {
                id: ids.searchLabel,
                for: ids.searchInput,
                style: screenReaderStyles,
            };
        },
    });

    const builderInput = builder(elementDataName('search-input'), {
        stores: [searchPlaceholder],
        returned: ([$searchPlaceholder]) => {
            return {
                id: ids.searchInput,
                type: 'text',
                autocomplete: 'off',
                spellcheck: false,
                placeholder: $searchPlaceholder || undefined,
                'aria-labelledby': ids.searchLabel,
            };
        },
        action: (node) => {
            _inputElement = node as unknown as HTMLInputElement;

            let debounceTimeout: ReturnType<typeof setTimeout>;

            function onInput(event: Event) {
                const el = event.target as HTMLInputElement;
                const rawValue = el.value;
                inputText.set(rawValue);
                let query = rawValue;

                const newInputMode = rawValue.startsWith(PALETTE_MODE_PREFIX.COMMANDS) ? PALETTE_MODE.COMMANDS : PALETTE_MODE.PAGES;

                if (newInputMode === PALETTE_MODE.PAGES) {
                    _currentAllItems = _allPagesSorted;
                    _currentHistory = pagesHistory;
                    _currentResults = pageResults;
                    _currentSearcher = _searcherPages;
                }
                else {
                    _currentAllItems = _allCommands;
                    _currentHistory = commandsHistory;
                    _currentResults = commandResults;
                    _currentSearcher = _searcherCommands;
                    query = query.slice(1);
                }

                if (newInputMode !== paletteMode.value) {
                    selectedIdx.set(undefined);
                    selectedId.set(undefined);
                    paletteMode.set(newInputMode);
                    searchFn(query);
                    return;
                }

                clearTimeout(debounceTimeout);
                debounceTimeout = setTimeout(() => {
                    searchFn(query);
                }, 200);
            }
            node.addEventListener('input', onInput);

            function onKeydown(event: KeyboardEvent) {
                if (event.key === 'ArrowDown') {
                    event.preventDefault();
                    nextResult();
                } else if (event.key === 'ArrowUp') {
                    event.preventDefault();
                    prevResult();
                } else if (event.key === 'Escape') {
                    event.preventDefault();
                    event.stopImmediatePropagation();
                    resetPalette();
                }
                else if (event.key === 'Tab') {
                    event.preventDefault();
                    event.stopImmediatePropagation();
                }
            }
            node.addEventListener('keydown', onKeydown);

            tick().then(() => {
                if (open.value) {
                    _inputElement?.focus();
                }
            });

            return {
                destroy() {
                    _inputElement = null;
                    node.removeEventListener('input', onInput);
                    node.removeEventListener('keydown', onKeydown);
                },
            };
        },
    });

    const builderPage = builder(elementDataName('page'), {
        stores: [],
        returned: () => {
            return {
                role: 'button',
            };
        },
        action: (node: HTMLElement, page: HyperPage) => {
            function onClick(event: MouseEvent) {
                event.preventDefault();
                const el = event.currentTarget as HTMLElement | null;
                if (!el) {
                    return;
                }
                const id = el.dataset[dataKey.itemId];
                const $pages = get(pages);
                const pageIdx = $pages.findIndex((command) => command.id === id);
                if (pageIdx < 0) {
                    return;
                }

                const page = $pages[pageIdx];
                selectedEl.set(el);
                navigateToPage(page, { type: 'click', event });
            }
            node.addEventListener('click', onClick);

            node.dataset[dataKey.itemId] = page.id.toString();

            const unsunscribe = selectedId.subscribe(($selectedId) => {
                if ($selectedId === undefined || $selectedId !== page.id) {
                    delete node.dataset['selected'];
                    return;
                }

                node.dataset['selected'] = 'true';
                node.scrollIntoView({ behavior: 'instant', 'block': 'nearest' });
            });

            return {
                destroy() {
                    node.removeEventListener('click', onClick);
                    unsunscribe();
                },
            };
        },
    });

    const builderCommand = builder(elementDataName('command'), {
        stores: [],
        returned: () => {
            return {
                role: 'button',
            };
        },
        action: (node: HTMLElement, command: HyperCommand) => {
            function onClick(event: MouseEvent) {
                event.preventDefault();
                const el = event.currentTarget as HTMLElement | null;
                if (!el) {
                    return;
                }
                const id = el.dataset[dataKey.itemId];
                const $commands = get(commands);
                const commandIdx = $commands.findIndex((command) => command.id === id);
                if (commandIdx < 0) {
                    return;
                }

                const command = $commands[commandIdx];
                selectedEl.set(el);

                executeCommand(command, { type: 'click', event });
            }
            node.addEventListener('click', onClick);

            node.dataset[dataKey.itemId] = command.id.toString();
            const unsunscribe = selectedId.subscribe(($selectedId) => {
                if ($selectedId === undefined || $selectedId !== command.id) {
                    delete node.dataset['selected'];
                    return;
                }

                node.dataset['selected'] = 'true';
                node.scrollIntoView({ behavior: 'instant', 'block': 'end', inline: 'nearest' });
            });

            return {
                destroy() {
                    node.removeEventListener('click', onClick);
                    unsunscribe();
                },
            };
        },
    });

    return {
        elements: {
            portal: builderPortal,
            palette: builderPalette,
            panel: builderPanel,
            form: builderForm,
            label: builderLabel,
            input: builderInput,
            command: builderCommand,
            page: builderPage,
        },
        states: {
            commands,
            matchingCommands: commandResults,
            pages,
            matchingPages: pageResults,
            inputText,
            currentCommand,
            error,
            open,
            portalTarget: portal,
            paletteMode,
        },
        helpers: {
            registerCommand,
            unregisterCommand,
            search: searchFn,
            openAsCommands: openPaletteCommands,
            openPalette,
            openAsPages: openPalettePages,
            closePalette,
            registerDefaultShortcuts,
            registerPage,
            unregisterPage,
        },
    };
}
