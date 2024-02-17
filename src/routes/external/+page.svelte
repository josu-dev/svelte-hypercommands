<script lang="ts">
  import { helpers } from '$lib/default/CommandPalette.svelte';
  import { onMount } from 'svelte';

  onMount(() => {
    const pagesCleanup = helpers.registerPage([
      {
        url: 'https://github.com/J-Josu/svelte-hypercommands',
        name: 'Project Repository',
        description: 'The link to the GitHub repository for this project',
      },
      {
        url: 'https://kit.svelte.dev/docs/introduction',
        name: 'SvelteKit Docs',
        description: 'The link to the Official SvelteKit documentation',
      },
      {
        url: 'https://google.com',
        name: 'Google',
        description: 'The link to Google',
      },
      {
        url: 'http://localhost:5173/external?page=external#id',
        name: 'External Page',
        description: 'The link to this page',
      },
      {
        url: '///weird_local_page?unusual=param',
        description: 'The link to this page',
      },
      {
        url: '/ending//slash///',
        description: 'The link to this page',
      },
    ]);

    return pagesCleanup;
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
