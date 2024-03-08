import { ACTIONABLE_CLOSE_ON, DEFAULT_PALETTE_MODE, DEFAULT_PALETTE_MODE_PREFIX, NAVIGABLE_CLOSE_ON, PALETTE_CLOSE_ACTION, RESULTS_EMPTY_MODE, SORT_MODE } from './constants.js';
import type { CreatePaletteOptions, HyperPaletteOptions } from './types.js';

const defaults = {
    closeAction: PALETTE_CLOSE_ACTION.RESET,
    closeOnClickOutside: true,
    closeOnEscape: true,
    debounce: 150,
    defaultSearch: '',
    defaultMode: DEFAULT_PALETTE_MODE.PAGE,
    defaultOpen: false,
    defaultPlaceholder: 'Search pages... use > to search commands...',
    itemsOptions: {
        COMMAND: {
            closeOn: ACTIONABLE_CLOSE_ON.ALWAYS,
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

export function createPalette(options: CreatePaletteOptions = {}) {

}
