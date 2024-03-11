<script lang="ts">
  import { defineCommand, helpers } from '$lib/default/HyperPalette.svelte';
  import { onMount } from 'svelte';

  onMount(() => {
    const commandsCleanup = helpers.registerCommand(
      defineCommand([
        {
          id: 'dynamic-command-no-execute',
          name: 'This command will not execute',
          description:
            'This command was dynamically added to the command palette',
          onRequest: () => {
            return false;
          },
          onAction: () => {
            alert('This message should not appear');
          },
        },
        {
          id: 'dynamic-command-execute',
          name: 'This command will execute',
          description:
            'This command was dynamically added to the command palette',
          onRequest: () => {
            return true;
          },
          onAction: () => {
            console.info('This message should appear');
          },
        },
        {
          id: 'dynamic-command-log-error',
          name: 'This command will log an error',
          description:
            'This command was dynamically added to the command palette',
          onAction: () => {
            throw new Error('This error should appear');
          },
          onError: (error) => {
            console.error(error);
          },
        },
        {
          id: 'dynamic-command-log-when-unregistered',
          name: 'This command will log when unregistered',
          description:
            'This command was dynamically added to the command palette',
          onAction: () => {},
          onUnregister: (command) => {
            console.info('Unregistered command from /hooks', command);
          },
        },
      ]),
    );

    return commandsCleanup;
  });
</script>

<main>
  <p><a href="/">Home</a></p>
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
