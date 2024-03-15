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

export const OPEN_ACTION = {
    NO_ACTION: 'NO_ACTION',
    RESET: 'RESET',
    UPDATE: 'UPDATE',
} as const;

export const UPDATE_ACTION = {
    NO_ACTION: 'NO_ACTION',
    UPDATE: 'UPDATE',
    UPDATE_IF_OPEN: 'UPDATE_IF_OPEN',
    UPDATE_IF_CURRENT: 'UPDATE_IF_CURRENT',
} as const;

export const CLOSE_ACTION = {
    NO_ACTION: 'NO_ACTION',
    CLOSE: 'CLOSE',
    RESET: 'RESET',
    RESET_CLOSE: 'RESET_CLOSE',
} as const;

export const NO_RESULTS_MODE = {
    ALL: 'ALL',
    HISTORY: 'HISTORY',
    EMPTY: 'EMPTY',
} as const;

export const SORT_MODE = {
    SORTED: 'SORTED',
    REVERSED: 'REVERSED',
    UNSORTED: 'UNSORTED',
} as const;

export const PALETTE_ELEMENTS_IDS = ['palette', 'panel', 'form', 'label', 'input'] as const;

export const HC = {
    HYPER_ITEM,
    ACTIONABLE_CLOSE_ON,
    NAVIGABLE_CLOSE_ON,
    SEARCHABLE_CLOSE_ON,
    OPEN_ACTION,
    UPDATE_ACTION,
    CLOSE_ACTION,
    NO_RESULTS_MODE,
    SORT_MODE,
} as const;
