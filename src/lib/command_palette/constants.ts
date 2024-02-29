import type { HyperItemType, PaletteMode, ResultsEmptyMode, SortMode } from './types.js';

export const RESULTS_EMPTY_MODE = {
    ALL: 'ALL',
    HISTORY: 'HISTORY',
    NONE: 'NONE',
} as const satisfies Record<string, ResultsEmptyMode>;

export const PALETTE_MODE = {
    COMMANDS: 'COMMANDS',
    PAGES: 'PAGES',
} as const satisfies Record<string, PaletteMode>;

export const PALETTE_MODE_PREFIX = {
    COMMANDS: '>',
    PAGES: '',
} as const satisfies Record<string, string>;

export const PALETTE_ITEM = {
    COMMAND: 'COMMAND',
    PAGE: 'PAGE',
} as const satisfies Record<string, HyperItemType>;

export const SORT_MODE = {
    ASC: 'ASC',
    DESC: 'DESC',
    NONE: 'NONE',
} as const satisfies Record<string, SortMode>;
