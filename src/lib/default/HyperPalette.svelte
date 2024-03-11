<script lang="ts" context="module">
  import type {
    HyperActionable,
    HyperActionableDefinition,
    HyperNavigable,
    HyperNavigableDefinition,
    ItemMatcher,
    OneOrMany,
  } from '$lib/index.js';
  import {
    HYPER_ITEM,
    createPalette,
    defineActionable,
    defineNavigable,
  } from '$lib/index.js';

  export const MODE = {
    COMMANDS: 'commands',
    PAGES: 'pages',
  } as const;

  const state = createPalette({
    defaults: {
      placeholder: 'Search pages... > for commands...',
    },
    items: {
      commands: {
        type: HYPER_ITEM.ACTIONABLE,
        prefix: '>',
        mapToSearch: (command) => command.category + command.name,
        shortcut: ['$mod+Shift+P'],
      },
      pages: {
        type: HYPER_ITEM.NAVIGABLE,
        prefix: '',
        mapToSearch: (page) => page.name + page.urlHostPathname,
        shortcut: ['$mod+P'],
      },
    },
    resetOnOpen: true,
  });

  function registerCommand(items: OneOrMany<HyperActionable>) {
    return state.helpers.registerItem(MODE.COMMANDS, items);
  }

  function registerPage(items: OneOrMany<HyperNavigable>) {
    return state.helpers.registerItem(MODE.PAGES, items);
  }

  function unregisterCommand(
    selector: OneOrMany<ItemMatcher<HyperActionable>>,
  ) {
    return state.helpers.unregisterItem(MODE.COMMANDS, selector);
  }

  function unregisterPage(selector: OneOrMany<ItemMatcher<HyperNavigable>>) {
    return state.helpers.unregisterItem(MODE.PAGES, selector);
  }

  export const elements = state.elements;
  export const states = state.states;
  export const helpers = {
    registerCommand,
    registerPage,
    unregisterCommand,
    unregisterPage,
    openAsCommands: () => state.helpers.openPalette(MODE.COMMANDS),
    openAsPages: () => state.helpers.openPalette(MODE.PAGES),
    toggleOpen: () => state.helpers.togglePalette(),
    close: () => state.helpers.closePalette(),
    search: (query: string) => state.helpers.search(query),
    registerDefaultShortcuts: () => state.helpers.registerPaletteShortcuts(),
    unregisterDefaultShortcuts: () =>
      state.helpers.unregisterPaletteShortcuts(),
  };
  export function defineCommand(items: OneOrMany<HyperActionableDefinition>) {
    return defineActionable(items);
  }
  export function definePage(items: OneOrMany<HyperNavigableDefinition>) {
    return defineNavigable(items);
  }
</script>

<script lang="ts">
  import { shortcutToKbd, type Cleanup } from '$lib/index.js';
  import { isBrowser } from '$lib/internal/helpers/index.js';
  import { onMount } from 'svelte';

  export let commands: HyperActionable[] = [];
  export let pages: HyperNavigable[] = [];
  export let a11yInputLabel = 'Palette search';

  const { palette, panel, form, label, input, item } = elements;
  const { open, mode, items } = states;

  const { results: matchingCommands } = items.commands;
  const { results: matchingPages } = items.pages;

  let unregisterCommands: Cleanup;
  let unregisterPages: Cleanup;

  $: if (isBrowser) {
    unregisterCommands?.();
    unregisterCommands = helpers.registerCommand(commands);
  }
  $: if (isBrowser) {
    unregisterPages?.();
    unregisterPages = helpers.registerPage(pages);
  }

  onMount(() => {
    return () => {
      unregisterCommands?.();
      unregisterPages?.();
    };
  });
</script>

<div {...$palette} use:palette class="palette-portal">
  {#if $open}
    <div {...$panel} use:panel class="palette-panel">
      <form {...$form} use:form class="palette-search">
        <!-- svelte-ignore a11y-label-has-associated-control - $label has the missing for attribute -->
        <label {...$label} use:label>{a11yInputLabel}</label>
        <input {...$input} use:input class="search-input" />
      </form>
      <ul class="palette-results">
        {#if $mode === MODE.PAGES}
          {#each $matchingPages as p (p.id)}
            <li class="result" {...$item} use:item={p}>
              <div class="result-container">
                <div class="result-page-icon">
                  {#if p.external}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      class="lucide lucide-globe"
                      ><circle cx="12" cy="12" r="10" /><path
                        d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"
                      /><path d="M2 12h20" /></svg
                    >
                  {:else}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      class="lucide lucide-home"
                      ><path
                        d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
                      /><polyline points="9 22 9 12 15 12 15 22" /></svg
                    >
                  {/if}
                </div>
                <div class="result-label" title={p.url}>
                  <span class="result-label-name">{p.name}</span
                  >{#if p.name !== p.url}
                    <span class="result-page-url">{p.urlHostPathname}</span>
                  {/if}
                </div>
              </div>
            </li>
          {/each}
          {#if $matchingPages.length === 0}
            <li class="result">
              <div class="result-name">No pages found</div>
            </li>
          {/if}
        {:else}
          {#each $matchingCommands as c (c.id)}
            <li class="result" {...$item} use:item={c}>
              <div class="result-container">
                <div class="result-label" title={c.description}>
                  {#if c.category}
                    <span class="result-label-name">{c.category}: {c.name}</span
                    >
                  {:else}
                    <span class="result-label-name">{c.name}</span>
                  {/if}
                </div>
                <div class="keybindings">
                  {#each c.shortcut as s (s)}
                    <kbd class="keybinding">
                      {#each shortcutToKbd(s) as kbd (kbd)}
                        <kbd class="keybinding-key">{kbd}</kbd>
                        <span class="keybinding-key-separator">+</span>
                      {/each}
                    </kbd>
                  {/each}
                </div>
              </div>
            </li>
          {/each}
          {#if $matchingCommands.length === 0}
            <li class="result">
              <div class="result-name">No commands found</div>
            </li>
          {/if}
        {/if}
      </ul>
    </div>
  {/if}
</div>

<style>
  .palette-container {
    display: contents;
  }

  .palette-panel {
    position: fixed;
    top: 10vh;
    left: 50%;
    right: 50%;
    z-index: 10;
    transform: translate(-50%, 0);
    display: flex;
    flex-direction: column;
    width: 90vw;
    max-width: 640px;
    max-height: 80vh;
    pointer-events: auto;
    color: hsl(240, 6%, 85%);
    border-style: solid;
    border-width: 1px;
    border-color: rgb(48, 48, 54);
    border-radius: 0.25rem;
    background-color: #1f1f1f;
    overflow-y: hidden;
    font-size: 1rem;
    box-shadow: 0px 0px 10px 2px rgba(0, 0, 0, 0.25);
  }
  @media (min-width: 640px) {
    .palette-container {
      width: 80vw;
    }
  }

  .palette-search {
    display: flex;
    padding-block: 10px;
    padding-inline: 8px;
  }

  .search-input {
    width: 100%;
    padding-block: 0.25rem;
    padding-inline: 0.5rem;
    border: none;
    border-radius: 0.125rem;
    font-size: 1rem /* 16px */;
    line-height: 1.5rem /* 24px */;
    font-family:
      system-ui,
      -apple-system,
      BlinkMacSystemFont,
      'Segoe UI',
      Roboto,
      Oxygen,
      Ubuntu,
      Cantarell,
      'Open Sans',
      'Helvetica Neue',
      sans-serif;
    --tw-ring-color: rgb(113 113 122 / 0.25);
    --tw-ring-offset-width: 1px;
    --tw-ring-inset: inset;
    --tw-ring-shadow: inset 0 0 0 1px var(--tw-ring-color);
    box-shadow: var(--tw-ring-shadow);
    background-color: rgb(49, 49, 49);
    color: rgb(228 228 231);
  }
  .search-input,
  .search-input:focus {
    outline: none;
  }
  .search-input:focus {
    --tw-ring-color: rgb(0, 120, 212);
    --tw-ring-offset-shadow: var(--tw-ring-inset) 0 0 0
      var(--tw-ring-offset-width) var(--tw-ring-offset-color);
    --tw-ring-shadow: var(--tw-ring-inset) 0 0 0
      calc(var(--tw-ring-offset-width)) var(--tw-ring-color);
  }

  .palette-results {
    padding: 0;
    margin: 0;
    padding-bottom: 10px;
    padding-inline: 8px;
    overflow-y: auto;
  }
  @media (min-width: 640px) {
    .palette-results {
      max-height: 40vh;
    }
  }

  .palette-results::-webkit-scrollbar {
    width: 10px;
  }
  .palette-results::-webkit-scrollbar-thumb {
    background-color: rgba(72 72 81 / 0.5);
  }

  .palette-results > li {
    list-style: none;
  }

  .result {
    display: flex;
    flex-direction: column;
    padding-inline: 10px;
    padding-block: 4px;
    border-radius: 0.25rem;
    opacity: 0.75;
    cursor: pointer;
  }

  .result:hover {
    opacity: 1;
    background-color: rgba(72 72 81 / 0.2);
  }
  .result[data-selected] {
    opacity: 1;
    background-color: rgb(8 51 68 / 0.75);
  }

  .result-container {
    display: flex;
    flex-direction: row;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    text-wrap: nowrap;
  }

  .result-page-icon {
    display: flex;
    flex-direction: row;
    align-items: center;
    padding-right: 6px;
  }
  .result-page-icon :is(svg, img) {
    width: 16px;
    height: 16px;
  }

  .result-label {
    font-weight: 400;
    color: hsl(240, 5%, 90%);
    font-size: 1rem;
    line-height: 1.5rem;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
  }
  .result-label-name {
    font-weight: 400;
    color: hsl(240, 5%, 90%);
    font-size: 1rem;
    line-height: 1.5rem;
    padding-right: 6px;
  }

  .result-page-url {
    font-size: 0.875em;
    line-height: 1.5rem;
    opacity: 0.75;
  }

  .keybindings {
    display: flex;
    flex-direction: row;
    align-items: center;
    line-height: 12px;
  }

  .keybinding {
    display: inline-flex;
    align-items: center;
  }

  .keybindings kbd {
    font-family: inherit;
  }

  .keybinding-key {
    background-color: rgb(49, 49, 49);
    border-color: hsl(0, 0%, 25%);
    border-bottom-color: hsl(0, 0%, 35%);
    box-shadow: inset 0 -1px 0 hsl(206, 100%, 20%);
    display: inline-block;
    border-style: solid;
    border-width: 1px;
    border-radius: 3px;
    vertical-align: middle;
    font-size: 11px;
    padding: 3px 5px;
    margin: 0 2px;
  }

  .result[data-selected] .keybinding-key {
    box-shadow: inset 0 -1px 0 hsl(206, 100%, 40%);
  }

  .keybinding-key-separator {
    display: inline-block;
  }
  .keybinding-key-separator:last-child {
    display: none;
  }
</style>
