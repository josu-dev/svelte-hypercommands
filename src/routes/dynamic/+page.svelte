<script lang="ts">
  import { defineCommand } from '$lib/command-palette/helpers.js';
  import { helpers, states } from '$lib/default/CommandPalette.svelte';
  import { onDestroy } from 'svelte';

  const command = defineCommand([
    {
      id: 'dynamic-command-1',
      name: 'Test Dynamic',
      description: 'This command was dynamically added to the command palette',
      shortcut: '$mod+1',
      action: ({ source }) => {
        console.log('Dynamic command was executed', source);
      },
    },
    {
      id: 'dynamic-command-2',
      name: 'Test Alert',
      description: 'This command will alert you',
      shortcut: '$mod+2',
      action: () => {
        alert('Alert command was executed');
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
  <h1>open: {$open}</h1>

  <p><a href="/">Home</a></p>

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
