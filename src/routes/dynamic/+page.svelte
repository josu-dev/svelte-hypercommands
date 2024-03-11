<script lang="ts">
  import { defineActionable } from '$lib/index.js';
  import { helpers, states } from '$lib/palette/HyperPalette.svelte';
  import { onDestroy } from 'svelte';

  const commands = defineActionable([
    {
      id: 'dynamic-command-1',
      name: 'Test Dynamic',
      description: 'This command was dynamically added to the command palette',
      shortcut: '$mod+1',
      onAction: ({ source }) => {
        console.info('Dynamic command was executed', source);
      },
    },
    {
      id: 'dynamic-command-2',
      name: 'Test Alert',
      description: 'This command will alert you',
      shortcut: '$mod+2',
      onAction: () => {
        alert('Alert command was executed');
      },
    },
  ]);

  let unregisterCommands: () => void;

  function registerCommand() {
    unregisterCommands?.();
    unregisterCommands = helpers.registerCommand(commands);
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
  <button on:click={() => setTimeout(registerCommand, 5000)}>
    Delayed register
  </button>
  <button on:click={() => setTimeout(() => unregisterCommands?.(), 5000)}>
    Delayed Unregister
  </button>
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
