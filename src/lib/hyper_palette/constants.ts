export const HYPER_ITEM_TYPE = {
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

export const PALETTE_CLOSE_ACTION = {
    RESET: 'RESET',
    KEEP: 'KEEP',
} as const;

export const PALETTE_ELEMENTS = ['palette', 'panel', 'form', 'label', 'input'] as const;

export const RESULTS_EMPTY_MODE = {
    ALL: 'ALL',
    HISTORY: 'HISTORY',
    NONE: 'NONE',
} as const;

export const SORT_MODE = {
    SORTED: 'SORTED',
    REVERSED: 'REVERSED',
    UNSORTED: 'UNSORTED',
} as const;
