<script>
  import { defineCommands } from '$lib/command-palette/helpers';
  import CommandPalette from '$lib/default/CommandPalette.svelte';
  import { removeAllKeyBindings } from '../../.ignored/custom_tinykeys';
  import { onMount } from 'svelte';
  import '../app.css';

  /** @type {import('$lib/command-palette/types').Command[]}*/
  let commands = [];

  onMount(() => {
    commands = defineCommands([
      {
        id: 'command-palette',
        name: 'Command Palette',
        description: 'Open the command palette',
        action: () => {
          console.log('Open command palette');
        },
      },
      {
        id: 'open-dialog',
        name: 'Open Dialog',
        description: 'Open the dialog',
        action: () => {
          console.log('Open dialog');
        },
      },
    ]);
    removeAllKeyBindings(window);
  });
</script>

<div class="container">
  <CommandPalette {commands} />
</div>

<slot />

<style>
  .container {
    position: absolute;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
  }
</style>
