<script context="module">
  import { createCommandPalette } from '$lib/command-palette/create';
  import { removeAllKeyBindings } from '$lib/keyboard/keystroke';
  import { isBrowser } from '$lib/utils/funcs';

  const state = createCommandPalette();

  export const elements = state.elements;
  export const states = state.states;
  export const helpers = state.helpers;
</script>

<script>
  import { onDestroy, onMount } from 'svelte';

  /**
   * @type {import('$lib/command-palette/types').Command[]}
   */
  export let commands = [];
  export let placeholder = 'Search for commands...';
  export let a11yInputLabel = 'Command Palette Search';

  const { portal, palette, form, label, input, result } = elements;
  const { open, results } = states;

  /** @type {() => void}*/
  let unregisterCommands;

  $: if (isBrowser) {
    unregisterCommands?.();
    unregisterCommands = helpers.registerCommand(commands);
  }

  onMount(() => {
    if (isBrowser) {
      removeAllKeyBindings(window);
      helpers.registerDefaultShortcuts();
    }
  });

  onDestroy(() => {
    if (isBrowser) {
      unregisterCommands?.();
    }
  });
</script>

<div class="palette-portal" use:portal hidden>
  {#if $open}
    <div {...$palette} use:palette class="palette-container">
      <form {...$form} use:form class="palette-search">
        <!-- svelte-ignore a11y-label-has-associated-control - $label has the missing for attribute -->
        <label {...$label} use:label>{a11yInputLabel}</label>
        <input {...$input} use:input {placeholder} class="search-input" />
      </form>
      <div class="palette-results">
        {#each $results as command (command.id)}
          <div class="command" {...$result} use:result={command}>
            <div class="command-name">{command.name}</div>
            <div class="command-description">{command.description}</div>
          </div>
        {/each}
      </div>
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
    padding-top: 0.75rem;
    padding-bottom: 0.75rem;
    padding-left: 0.5rem;
    padding-right: 0.5rem;
  }

  .search-input {
    width: 100%;
    padding-top: 0.25rem;
    padding-left: 0.5rem;
    padding-bottom: 0.25rem;
    padding-right: 0.5rem;
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
    --tw-ring-shadow: var(--tw-ring-inset) 0 0 0 calc(1px + var(--tw-ring-offset-width))
      var(--tw-ring-color);
  }

  .palette-results {
    margin-bottom: 0.75rem;
    overflow-y: auto;
  }
  @media (min-width: 640px) {
    .palette-results {
      max-height: 40vh;
    }
  }

  .command {
    display: flex;
    flex-direction: column;
    padding-top: 0.5rem;
    padding-right: 0.75rem;
    padding-bottom: 0.5rem;
    padding-left: 0.75rem;
    border-radius: 0.25rem;
    opacity: 0.75;
    cursor: pointer;
  }

  .command:hover {
    opacity: 1;
    background-color: rgba(72 72 81 / 0.2);
  }
  .command[data-selected] {
    opacity: 1;
    background-color: rgb(8 51 68 / 0.75);
  }

  .command-name {
    font-weight: 500;
    color: rgb(244 244 245);
    font-size: 1rem;
    line-height: 1.5rem;
  }

  .command-description {
    color: rgb(228 228 231);
    font-weight: 300;
    font-size: 0.875rem;
    line-height: 1.25rem;
  }
</style>
