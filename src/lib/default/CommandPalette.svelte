<script lang="ts" context="module">
  import { createCommandPalette } from '$lib/command-palette/create.js';

  const state = createCommandPalette();

  export const elements = state.elements;
  export const states = state.states;
  export const helpers = state.helpers;
</script>

<script lang="ts">
  import { PALETTE_MODE } from '$lib/command-palette/enums.js';
  import { removeAllKeyBindings } from '$lib/keyboard/keystroke.js';
  import { isBrowser } from '$lib/utils/funcs.js';
  import { onMount } from 'svelte';

  export let commands: import('$lib/command-palette/types.js').HyperCommand[] = [];
  export let pages: import('$lib/command-palette/types.js').HyperPage[] = [];
  export let placeholder = 'Search for commands...';
  export let a11yInputLabel = 'Palette Search';

  const { portal, palette, form, label, input, page, command } = elements;
  const { open, paletteMode, matchingCommands, matchingPages } = states;

  let unregisterCommands: () => void;
  let unregisterPages: () => void;

  $: if (isBrowser) {
    unregisterCommands?.();
    unregisterCommands = helpers.registerCommand(commands);
  }
  $: if (isBrowser) {
    unregisterPages?.();
    unregisterPages = helpers.registerPage(pages);
  }

  onMount(() => {
    // TODO: This should be done in a better way?

    // ensure that all keybindings are removed (in case of hot reload)
    removeAllKeyBindings(window);
    helpers.registerDefaultShortcuts();

    // helpers.search('');

    return () => {
      unregisterCommands?.();
      unregisterPages?.();
      console
    };
  });
</script>

<div class="palette-portal" use:portal hidden>
  <!-- {#if $open || true} -->
  {#if $open}
    <div {...$palette} use:palette class="palette-container">
      <form {...$form} use:form class="palette-search">
        <!-- svelte-ignore a11y-label-has-associated-control - $label has the missing for attribute -->
        <label {...$label} use:label>{a11yInputLabel}</label>
        <input {...$input} use:input {placeholder} class="search-input" />
      </form>
      <ul class="palette-results">
        {#if $paletteMode === PALETTE_MODE.PAGES}
          {#each $matchingPages as p (p.id)}
            <li class="result" {...$page} use:page={p} title={p.description}>
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
                    <!-- <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      class="lucide lucide-map-pin"
                      ><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle
                        cx="12"
                        cy="10"
                        r="3"
                      /></svg
                    > -->
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
                      ><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline
                        points="9 22 9 12 15 12 15 22"
                      /></svg
                    >
                  {/if}
                </div>
                <div class="result-label">
                  <span class="result-label-name">{p.name}</span>{#if p.name !== p.url}
                    <span class="result-page-url">{p.url.replace(/^https?:\/\//, '')}</span>
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
            <li class="result" {...$command} use:command={c}>
              <div class="result-name">{c.name}</div>
              <div class="result-description">{c.description}</div>
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
  /* .palette-portal {
    display: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 10;
  } */

  .palette-container {
    position: fixed;
    top: 10vh;
    left: 50%;
    right: 50%;
    transform: translate(-50%, 0);
    display: flex;
    flex-direction: column;
    width: 90vw;
    max-width: 640px;
    max-height: 80vh;
    pointer-events: auto;
    color: white;
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
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu,
      Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
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
    --tw-ring-offset-shadow: var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width)
      var(--tw-ring-offset-color);
    --tw-ring-shadow: var(--tw-ring-inset) 0 0 0 calc(var(--tw-ring-offset-width))
      var(--tw-ring-color);
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
    /* width: 10px; */
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
    color: rgb(244 244 245);
    font-size: 1rem;
    line-height: 1.5rem;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .result-label-name {
    font-weight: 400;
    color: rgb(244 244 245);
    font-size: 1rem;
    line-height: 1.5rem;
    padding-right: 6px;
  }

  .result-page-url {
    font-size: 0.875em;
    line-height: 1.5rem;
    opacity: 0.75;
  }

  .result-description {
    color: rgb(228 228 231);
    font-weight: 300;
    font-size: 0.875rem;
    line-height: 1.25rem;
  }
</style>
