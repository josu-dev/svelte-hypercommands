export const DEFAULT_PALETTE_MODE = {
    COMMAND: 'COMMAND',
    PAGE: 'PAGE',
} as const;

export const DEFAULT_PALETTE_MODE_PREFIX = {
    COMMAND: '>',
    PAGE: '',
} as const;

export const HYPER_ITEM_TYPE = DEFAULT_PALETTE_MODE;

export const PALETTE_CLOSE_ACTION = {
    RESET: 'RESET',
    KEEP: 'KEEP',
} as const;

export const ACTIONABLE_CLOSE_ON = {
    ALWAYS: 'ALWAYS',
    NEVER: 'NEVER',
    ON_TRIGGER: 'ON_TRIGGER',
    ON_CANCEL: 'ON_CANCEL',
    ON_SUCCESS: 'ON_SUCCESS',
    ON_ERROR: 'ON_ERROR',
} as const;

export const NAVIGABLE_CLOSE_ON = {
    ALWAYS: 'ALWAYS',
    NEVER: 'NEVER',
    ON_TRIGGER: 'ON_TRIGGER',
    ON_SUCCESS: 'ON_SUCCESS',
    ON_ERROR: 'ON_ERROR',
} as const;

export const RESULTS_EMPTY_MODE = {
    ALL: 'ALL',
    HISTORY: 'HISTORY',
    NONE: 'NONE',
} as const;

export const SORT_MODE = {
    ASC: 'ASC',
    DESC: 'DESC',
    NONE: 'NONE',
} as const;
