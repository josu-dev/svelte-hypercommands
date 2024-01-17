<script>
  import { defineCommand, definePage, projectRoutesAsPages } from '$lib/command-palette/helpers';
  import CommandPalette from '$lib/default/CommandPalette.svelte';
  import '../app.css';

  /** @type {import('$lib/command-palette/types').HyperCommand[]}*/
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
  const pages = projectRoutesAsPages();
</script>

<CommandPalette {commands} {pages} />

<slot />
