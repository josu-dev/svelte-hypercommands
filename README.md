# Hypercommands

**svelte-hypercommands** is a dependancy free Headless Command Palette for SvelteKit with a default component implementation.

It originally started as a rework of [Svelte-Command-Palette][svelte-command-palette] with the main objective of making it fully headless for enabling complete customization and extensibility as well as adding some extra features like dynamic commands and support for page navigation. It ended up being a complete rewrite with a different approach and a different API.

Its important to remark that the `headless logic` is the one implemented by [Melt-UI][melt-ui] and the `keybindings logic` is a modified version of [Tinykeys][tinykeys]. Each of these libraries deserve all the credit for their work.

> [!IMPORTANT]
> This library is still in early development and the API is subject to breaking changes.


## Features

- Headless logic
- Default implementation
- Pages/Commands mode
- Dynamic pages/commands
- Keybindings support for commands
- Dependency free
- Fully typed


## Installation

```bash
npm install svelte-hypercommands
# or
pnpm add svelte-hypercommands
# or
yarn add svelte-hypercommands
```


## Getting started

The library has a default implementation that can be used as a standalone component styled as the VSCode Command Palette.

It can be used in your root `+layout.svelte` as follows:

```svelte
<script lang="ts">
  import { appRoutesAsPages, defineCommand } from 'svelte-hypercommands';
  import CommandPalette from 'svelte-hypercommands/CommandPalette.svelte';

  const globalCommands = defineCommand([
    {
      name: 'Copy Current URL',
      description: 'Copy the current URL to your clipboard',
      shortcut: '$mod+Shift+C',
      onAction: () => {
        navigator.clipboard.writeText(window.location.href);
        alert('Copied URL to clipboard');
      },
    },
    {
      name: 'Reload Window',
      description: 'Reload the current window',
      shortcut: '$mod+Shift+R',
      onAction: () => {
        window.location.reload();
      },
    },
  ]);

  const globalPages = appRoutesAsPages();
</script>

<CommandPalette pages={globalPages} commands={globalCommands} />

<slot />
```

For adding dynamic pages/commands, you can use the helpers exported by the component:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { helpers } from 'svelte-hypercommands/CommandPalette.svelte';

  onMount(() => {
    const unregisterPages = helpers.registerPage([
      {
        url: 'https://kit.svelte.dev/docs/introduction',
        name: 'SvelteKit Docs',
        description: 'Link to the Official SvelteKit documentation',
      },
      {
        url: 'https://google.com',
        name: 'Google',
        description: 'Link to Google',
      },
    ]);
    
    const unregisterCommands = helpers.registerCommand([
      {
        name: 'Say hello world',
        description: 'Alerts hello world',
        onAction: () => {
          alert('Hello World');
        },
      },
    ]);

    return () => {
      unregisterPages();
      unregisterCommands();
    };
  });
</script>

<main>
  <h1>Home</h1>
</main>
```


## Headless usage

The core of the library is the headless logic that can be used to create your own implementation of the Command Palette.

For reference, the default implementation can be found [here](./src/lib/default/CommandPalette.svelte).

When creating your own implementation, the `createCommandPalette` can recive an optional options object with the following properties:

```ts
type CreateCommandPaletteOptions = {
  portal?: HTMLElement | string | false | undefined;
  emptyMode?: ResultsEmptyMode;
  defaultOpen?: boolean;
  open?: Writable<boolean>;
  pages?: HyperPage[];
  commands?: HyperCommand[];
  history?: HyperId[];
  selectedIdx?: number | undefined;
  selectedId?: HyperId;
  inputText?: string;
};
```

The `createCommandPalette` function returns an object with the following properties:

```ts
type CreateCommandPaletteReturn = {
    elements: {
      portal: builderPortal,
      palette: builderPalette,
      panel: builderPanel,
      form: builderForm,
      label: builderLabel,
      input: builderInput,
      command: builderCommand,
      page: builderPage,
    },
    states: {
      commands: Writable<HyperCommand[]>,
      matchingCommands: Readable<HyperCommand[]>,
      pages: Writable<HyperPage[]>,
      matchingPages: Readable<HyperPage[]>,
      history: Writable<HyperId[]>,
      inputText: Writable<string>,
      currentCommand: Readable<HyperCommand | undefined>,
      error: Readable<unknown | undefined>,
      open: Writable<boolean>,
      portalTarget: Writable<HTMLElement | undefined>,
      paletteMode: Readable<PaletteMode>,
    },
    helpers: {
      openPalette,
      closePalette,
      togglePalette,
      registerPage,
      unregisterPage,
      registerCommand,
      unregisterCommand,
      registerDefaultShortcuts,
      search,
    },
}
```

The `elements` object contains the builders for the different elements that compose the Command Palette.

The `states` object contains the stores that can be used to subscribe to the state of the Command Palette.

The `helpers` object contains the exposed functions that can be used to interact with the internal state of the Command Palette.


## License

[MIT](./LICENSE)


## Contributing

Contributions are welcome and appreciated.

If you have any suggestions, feedback or issues, please [open an issue](./issues/new) on this repository or submit a pull request.


## Acknowledgements

- [Svelte-Command-Palette][svelte-command-palette]
- [Melt-UI][melt-ui]
- [Tinykeys][tinykeys]


[svelte-command-palette]: https://github.com/rohitpotato/svelte-command-palette
[melt-ui]: https://github.com/melt-ui/melt-ui
[tinykeys]: https://github.com/jamiebuilds/tinykeys
