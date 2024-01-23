<script>
  import { defineCommand } from '$lib/command-palette/helpers';
  import { helpers, states } from '$lib/default/CommandPalette.svelte';
  import { onDestroy } from 'svelte';

  const command = defineCommand([
    {
      id: 'dynamic-command-1',
      name: 'Dynamic console log',
      description: 'This command was dynamically added to the command palette',
      shortcut: '$mod+1',
      action: () => {
        console.log('Dynamic command was executed on home page');
      },
    },
    {
      id: 'dynamic-command-2',
      name: 'Dynamic Alert',
      description: 'This command will alert you',
      shortcut: '$mod+2',
      action: () => {
        alert('Alert command was executed on home page');
      },
    },
    {
      id: 'dynamic-command-3',
      name: 'Dynamic copy URL',
      description: 'This command will copy the URL to your clipboard',
      shortcut: '$mod+3',
      action: () => {
        navigator.clipboard.writeText(window.location.href);
        alert('Copied URL to clipboard on home page');
      },
    },
  ]);

  /** @type {() => void}*/
  let unregisterCommands;

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

  <p><a href="/dynamic">Test</a></p>

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
