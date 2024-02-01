export { createCommandPalette } from './command_palette/create.js';
export { appRoutesAsPages, defineCommand, definePage, getAppRoutes } from './command_palette/helpers.js';


export interface Register { }

export type RegisteredHyperCommandMeta = Register extends {
    HyperCommandMeta: infer _Meta;
}
    ? _Meta extends Record<string, any> ? _Meta
    : Record<string, any> : Record<string, any>;
