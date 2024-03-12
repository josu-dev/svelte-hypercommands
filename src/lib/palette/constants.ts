export const HYPER_ITEM = {
    ACTIONABLE: 'ACTIONABLE',
    NAVIGABLE: 'NAVIGABLE',
    SEARCHABLE: 'SEARCHABLE',
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

export const SEARCHABLE_CLOSE_ON = {
    ALWAYS: 'ALWAYS',
    NEVER: 'NEVER',
    ON_TRIGGER: 'ON_TRIGGER',
    ON_ERROR: 'ON_ERROR',
    ON_SUCCESS: 'ON_SUCCESS',
} as const;

export const PALETTE_CLOSE_ACTION = {
    KEEP: 'KEEP',
    KEEP_CLOSE: 'KEEP_CLOSE',
    RESET: 'RESET',
    RESET_CLOSE: 'RESET_CLOSE',
} as const;

export const PALETTE_ELEMENTS = ['palette', 'panel', 'form', 'label', 'input'] as const;

export const NO_RESULTS_MODE = {
    ALL: 'ALL',
    HISTORY: 'HISTORY',
    NONE: 'NONE',
} as const;

export const SORT_MODE = {
    SORTED: 'SORTED',
    REVERSED: 'REVERSED',
    UNSORTED: 'UNSORTED',
} as const;

export const HC = {
    HYPER_ITEM: HYPER_ITEM,
    ACTIONABLE_CLOSE_ON: ACTIONABLE_CLOSE_ON,
    NAVIGABLE_CLOSE_ON: NAVIGABLE_CLOSE_ON,
    PALETTE_CLOSE_ACTION: PALETTE_CLOSE_ACTION,
    NO_RESULTS_MODE: NO_RESULTS_MODE,
    SORT_MODE: SORT_MODE,
} as const;
