<script lang="ts">
  import { appRoutesAsPages, defineCommand, definePage } from '$lib/command-palette/helpers.js';
  import CommandPalette from '$lib/default/CommandPalette.svelte';
  import '../app.css';

  /** @type {import('$lib/command-palette/types.js').HyperCommand[]}*/
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
    },
    {
      id: 'open-snackbar',
      name: 'Open Snackbar',
      description: 'Open the snackbar',
      action: () => {
        console.log('Open snackbar');
      },
    },
    {
      id: 'open-toast',
      name: 'Open Toast',
      description: 'Open the toast',
      action: () => {
        console.log('Open toast');
      },
    },
    {
      id: 'open-menu',
      name: 'Open Menu',
      description: 'Open the menu',
      action: () => {
        console.log('Open menu');
      },
    },
    {
      id: 'open-popover',
      name: 'Open Popover',
      description: 'Open the popover',
      action: () => {
        console.log('Open popover');
      },
    },
    {
      id: 'open-tooltip',
      name: 'Open Tooltip',
      description: 'Open the tooltip',
      action: () => {
        console.log('Open tooltip');
      },
    },
  ]);
  const pages = appRoutesAsPages();
  pages.push(...definePage({
    name: 'Google',
    description: 'Test',
    url: 'https://google.com',
  }))
</script>

<CommandPalette {commands} {pages} />

<slot />
