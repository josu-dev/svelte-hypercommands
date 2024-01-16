<script>
  import { defineCommand } from '$lib/command-palette/helpers';
  import { helpers, states } from '$lib/default/CommandPalette.svelte';
  import { onDestroy } from 'svelte';

  const command = defineCommand([
    {
      id: 'dynamic-command',
      name: 'Home Dynamic Command',
      description: 'This command was dynamically added to the command palette',
      action: () => {
        console.log('Dynamic command was executed');
      },
    },
    {
      id: 'alert-command',
      name: 'Home Alert Command',
      description: 'This command will alert you',
      action: () => {
        alert('Alert command was executed');
      },
    },
    {
      id: 'alert-command3',
      name: 'Home Alert Command',
      description: 'This command will alert you',
      action: () => {
        navigator.clipboard.writeText(window.location.href);
        alert('Copied URL to clipboard');
      },
      shortcut: '$mod+Y',
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

  <p><a href="/test">Test</a></p>

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
