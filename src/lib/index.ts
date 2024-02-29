export { createCommandPalette } from './command_palette/create.js';
export { defineCommand, definePage, definePagesFromRoutes, getAppRoutes, shortcutToKbd } from './command_palette/helpers.js';

export interface Register { }

export type RegisteredHyperCommandMeta =
    Register extends { HyperCommandMeta: infer _Meta; }
    ? (
        _Meta extends Record<string, any>
        ? _Meta : never
    )
    : Record<string, any>;

export type RegisteredHyperPageMeta =
    Register extends { HyperPageMeta: infer _Meta; }
    ? (
        _Meta extends Record<string, any>
        ? _Meta : never
    )
    : Record<string, any>;
