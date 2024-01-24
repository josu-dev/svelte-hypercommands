import type { HyperItemType, PaletteMode, ResultsEmptyMode } from './types.js';

export const RESULTS_EMPTY_MODE = {
  ALL: 'ALL',
  HISTORY: 'HISTORY',
  NONE: 'NONE',
} as const satisfies Record<ResultsEmptyMode, string>;

export const PALETTE_MODE = {
  PAGES: 'PAGES',
  COMMANDS: 'COMMANDS',
} as const satisfies Record<PaletteMode, string>;

export const PALETTE_ITEM = {
  COMMAND: 'COMMAND',
  PAGE: 'PAGE',
} as const satisfies Record<HyperItemType, string>;
