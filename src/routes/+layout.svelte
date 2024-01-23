<script lang="ts">
  import { appRoutesAsPages, defineCommand } from '$lib/command-palette/helpers.js';
  import CommandPalette from '$lib/default/CommandPalette.svelte';
  import '../app.css';

  const commands = defineCommand([
    {
      id: 'global:copy_current_url',
      name: 'Copy Current URL',
      description: 'Copy the current URL to your clipboard',
      onAction: () => {
        navigator.clipboard.writeText(window.location.href);
        alert('Copied URL to clipboard');
      },
    },
    {
      id: 'global:reload_window',
      name: 'Reload Window',
      description: 'Reload the current window',
      onAction: () => {
        window.location.reload();
      },
    },
  ]);

  const pages = appRoutesAsPages();
</script>

<CommandPalette {commands} {pages} />

<slot />
