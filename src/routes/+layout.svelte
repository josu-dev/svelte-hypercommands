<script lang="ts">
  import HyperPalette, {
    defineCommand,
  } from '$lib/default/HyperPalette.svelte';
  import { definePagesFromRoutes } from '$lib/index.js';
  import '../app.css';

  const commands = defineCommand([
    {
      id: 'global:copy_current_url',
      category: 'Global',
      name: 'Copy Current URL',
      description: 'Copy the current URL to your clipboard',
      shortcut: '$mod+Shift+C',
      onAction: () => {
        navigator.clipboard.writeText(window.location.href);
        alert('Copied URL to clipboard');
      },
    },
    {
      id: 'global:reload_window',
      category: 'Global',
      name: 'Reload Window',
      description: 'Reload the current window',
      shortcut: '$mod+Shift+R',
      onAction: () => {
        window.location.reload();
      },
    },
  ]);

  const pages = definePagesFromRoutes();
</script>

<HyperPalette {commands} {pages} />

<slot />
