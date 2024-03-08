type Values<T = any> = T[keyof T];

export const HYPER_ITEM_TYPE = {
    COMMAND: 'COMMAND',
    PAGE: 'PAGE',
} as const;

export type HyperCommandType = 'COMMAND';

export type HyperPageType = 'PAGE';

export type HyperItemType = Values<typeof HYPER_ITEM_TYPE>;

export const PALETTE_MODE = {
    COMMANDS: 'COMMANDS',
    PAGES: 'PAGES',
} as const;

export type PaletteMode = Values<typeof PALETTE_MODE>;

export const PALETTE_MODE_PREFIX = {
    COMMANDS: '>',
    PAGES: '',
} as const;

export const PALETTE_CLOSE_ACTION = {
    RESET: 'RESET',
    RESET_CLOSE: 'RESET_CLOSE',
    KEEP: 'KEEP',
    KEEP_CLOSE: 'KEEP_CLOSE',
} as const;

export type PaletteCloseMode = Values<typeof PALETTE_CLOSE_ACTION>;

export const PALETTE_CLOSE_ON = {
    ALWAYS: 'ALWAYS',
    ON_REQUEST: 'ON_REQUEST',
    ON_CANCEL: 'ON_CANCEL',
    ON_SUCCESS: 'ON_SUCCESS',
    ON_ERROR: 'ON_ERROR',
    NEVER: 'NEVER',
} as const;

export type PaletteCloseOn = Values<typeof PALETTE_CLOSE_ON>;

export const RESULTS_EMPTY_MODE = {
    ALL: 'ALL',
    HISTORY: 'HISTORY',
    NONE: 'NONE',
} as const;

export type ResultsEmptyMode = Values<typeof RESULTS_EMPTY_MODE>;

export const SORT_MODE = {
    ASC: 'ASC',
    DESC: 'DESC',
    NONE: 'NONE',
} as const;

export type SortMode = Values<typeof SORT_MODE>;
