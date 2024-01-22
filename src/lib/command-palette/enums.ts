import type { PaletteMode, ResultsEmptyMode } from './types';

export const RESULTS_EMPTY_MODE = {
  ALL: 'ALL',
  HISTORY: 'HISTORY',
  NONE: 'NONE',
} as const satisfies Record<ResultsEmptyMode, string>;

export const PALETTE_MODE = {
  PAGES: 'PAGES',
  COMMANDS: 'COMMANDS',
} as const satisfies Record<PaletteMode, string>;
