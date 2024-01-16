<script>
  import { defineCommand } from '$lib/command-palette/helpers';
  import CommandPalette from '$lib/default/CommandPalette.svelte';
  import '../app.css';

  /** @type {import('$lib/command-palette/types').Command[]}*/
  const commands = defineCommand([
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
    }
  ]);
</script>

<CommandPalette {commands} />

<slot />
