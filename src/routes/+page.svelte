<script>
  import { defineCommands } from '$lib/command-palette/helpers';
  import { methods, states } from '$lib/default/CommandPalette.svelte';
  import { onDestroy } from 'svelte';

  const command = defineCommands([
    {
      id: 'dynamic-command',
      name: 'Dynamic Command',
      description: 'This command was dynamically added to the command palette',
      action: () => {
        console.log('Dynamic command was executed');
      },
    },
    {
      id: 'alert-command',
      name: 'Alert Command',
      description: 'This command will alert you',
      action: () => {
        alert('Alert command was executed');
      },
    },
  ]);

  /** @type {() => void}*/
  let unregisterCommands;

  function registerCommand() {
    unregisterCommands?.();
    unregisterCommands = methods.registerCommand(command);
  }

  onDestroy(() => {
    unregisterCommands?.();
  });

  const { open } = states;
</script>

<main>
  <h1>open: {$open}</h1>

  <h1>waitings for commands...</h1>

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
