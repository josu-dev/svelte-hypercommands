<script lang="ts">
  import { defineActionable } from '$lib/index.js';
  import { helpers, states } from '$lib/default/HyperPalette.svelte';
  import { onDestroy } from 'svelte';

  const command = defineActionable([
    {
      id: 'dynamic-command-1',
      name: 'Dynamic console log',
      description: 'This command was dynamically added to the command palette',
      shortcut: '$mod+1',
      onAction: () => {
        console.info('Dynamic command was executed on home page');
      },
    },
    {
      id: 'dynamic-command-2',
      name: 'Dynamic Alert',
      description: 'This command will alert you',
      shortcut: '$mod+2',
      onAction: () => {
        alert('Alert command was executed on home page');
      },
    },
    {
      id: 'dynamic-command-3',
      name: 'Dynamic copy URL',
      description: 'This command will copy the URL to your clipboard',
      shortcut: '$mod+3',
      onAction: () => {
        navigator.clipboard.writeText(window.location.href);
        alert('Copied URL to clipboard on home page');
      },
    },
    {
      id: 'dynamic-command-4',
      name: 'Dynamic console log 2',
      description: 'This command was dynamically added to the command palette',
      shortcut: '$mod+4',
      onAction: () => {
        console.info('Dynamic command was executed on home page');
      },
    },
    {
      id: 'dynamic-command-5',
      name: 'Dynamic Alert 2',
      description: 'This command will alert you',
      shortcut: '$mod+5',
      onAction: () => {
        alert('Alert command was executed on home page');
      },
    },
    {
      id: 'dynamic-command-6',
      name: 'Dynamic copy URL 2',
      description: 'This command will copy the URL to your clipboard',
      shortcut: '$mod+6',
      onAction: () => {
        navigator.clipboard.writeText(window.location.href);
        alert('Copied URL to clipboard on home page');
      },
    },
  ]);

  let unregisterCommands: () => void;

  function registerCommand() {
    unregisterCommands?.();
    unregisterCommands = helpers.registerCommand(command);
  }

  onDestroy(() => {
    unregisterCommands?.();
  });

  const { open } = states;
</script>

<main>
  <h1>Home page</h1>

  <p>Open: {$open}</p>

  <button on:click={registerCommand}> Register Command </button>
  <button on:click={() => unregisterCommands?.()}> Unregister Command </button>
</main>

<style>
  main {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
  }
</style>
