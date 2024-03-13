# Hypercommands

**svelte-hypercommands** is a dependancy free Headless Palette for creating command/navigation/search palettes for your [Svelte][svelte] and [SvelteKit][svelte-kit] app.

The main objetive is enabling complete customization and extensibility of a base Command Palette component while providing a default implementation that can be used out of the box.

Its important to remark that the `headless logic` comes from [Melt-UI][melt-ui] and the `keybindings logic` is a modified version of [Tinykeys][tinykeys]. Each of these libraries deserve all the credit for their work.

> [!IMPORTANT]
> This library is still in early development and the API is subject to breaking changes.


## Features

- Actionable/Navigable/Searchable types
- Default implementation (commmands/pages modes)
- Dependency free
- Dynamic registration
- Fully typed
- Headless logic
- Keybindings support for actionables
- SSR support


## Installation

```bash
npm install svelte-hypercommands
# or
pnpm add svelte-hypercommands
# or
yarn add svelte-hypercommands
```


## Getting started

The library is composed of two main parts: the default implementation and the headless logic.

The default implementation is a standalone component that can be used out of the box, while the headless logic can be used to create your own implementation for different palettes.


### Default implementation

The default implementation mimics the behavior of the VSCode Command Palette, with two modes: `commands` and `pages`.

The `commands` mode is used to display a list of actionable items, while the `pages` mode is used to display a list of routes to navigate to.

If you want the palette to be globally available, use it in your global layout or in a layout that is used in all your pages.

```svelte
<script>
  import { navigablesFromRoutes } from 'svelte-hypercommands';
  import HyperPalette, { defineCommand } from 'svelte-hypercommands/HyperPalette.svelte';

  const globalCommands = defineCommand(
    {
      name: 'Copy Current URL',
      description: 'Copy the current URL to your clipboard',
      shortcut: ['$mod+Shift+C'],
      onAction: () => {
        navigator.clipboard.writeText(window.location.href);
        alert('Copied URL to clipboard');
      }
    },
    {
      name: 'Reload Window',
      description: 'Reload the current window',
      shortcut: ['$mod+Shift+R'],
      onAction: () => {
        window.location.reload();
      }
    }
  );

  const globalPages = navigablesFromRoutes();
</script>

<HyperPalette commands={globalCommands} pages={globalPages} />

<slot />

<!-- or in svelte 5 -->

{@render children()}
```

For adding dynamic commands/pages you can use the helpers exported by the component:

```svelte
<script>
  import { defineCommand, definePage, helpers } from 'svelte-hypercommands/HyperPalette.svelte';
  import { onMount } from 'svelte';

  onMount(() => {
    const cleanupCommands = helpers.registerCommand(
      defineCommand(
        {
          name: 'Say hello world',
          description: 'Alerts hello world',
          onAction: () => {
            alert('Hello World');
          },
        }
      )
    );

    const cleanupPages = helpers.registerPage(
      definePage(
        {
          name: 'SvelteKit Docs',
          description: 'Link to the Official SvelteKit documentation',
          url: 'https://kit.svelte.dev/docs/introduction',
        }
      )
    );

    return () => {
      cleanupCommands();
      cleanupPages();
    };
  });
</script>

<main>
  <h1>Home</h1>
</main>
```


### Headless usage

The library exposes a `createPalette` function that can be used to create all the logic and state handling for a custom palette.

For an implementation reference, you can check the [HyperPalette.svelte](./src/lib/default/HyperPalette.svelte).

When creating your own implementation the `createPalette` receives an options object to configure the behavior of the palette and the modes that it will handle of the shape:

```ts
type PaletteOptions = {
    /**
     * Whether to close the palette when the user clicks outside of it.
     * 
     * @default true
     */
    closeOnClickOutside?: boolean;
    /**
     * Whether to close the palette when the user presses the escape key.
     * 
     * @default true
     */
    closeOnEscape?: boolean;
    /**
     * Debounce time for processing the search input in milliseconds.
     * 
     * A value greater than 0 will debounce the input. Otherwise, the input will be processed immediately.
     * 
     * @default 150
     */
    debounce?: number;
    /**
     * Default values for initializing the palette.
     */
    defaults?: PaletteDefaultsOptions<string>;
    /**
     * The configuration for the different modes of the palette.
     * 
     * Each key is the name of the mode and the value is the configuration for that mode.
     */
    modes: PaletteModesOptions;
    /**
     * A `Writable` store to control the open state of the palette from outside.
     */
    open?: Writable<boolean>;
    /**
     * A `Writable` store to control the placeholder of the search input from outside.
     */
    placeholder?: Writable<string | undefined>;
    /**
     * The target element to append the palette to.
     * 
     * - `false` portal is disabled.
     * - `string` a css selector for the portal target.
     * - `HTMLElement` the portal target.
     * 
     * @default false
     */
    portal?: HTMLElement | string | false;
    /**
     * Whether to reset the palette state when it is opened.
     * 
     * When set to `true` takes precedence over the `closeAction` of the modes.
     * 
     * @default false
     */
    resetOnOpen?: boolean;
};
```

The function returns an object of the shape:

```ts
type CreatePaletteReturn = {
    elements: {
        palette: BuilderPalette,
        panel: BuilderPanel,
        form: BuilderForm,
        label: BuilderLabel,
        input: BuilderInput,
        item: BuilderItem,
    },
    helpers: {
        registerItem: (mode: Mode, item: OneOrMany<AnyHyperItem>, override?: boolean, silent?: boolean) => Cleanup;
        unregisterItem: (mode: Mode, item: OneOrMany<ItemMatcher<AnyHyperItem>>) => void;
        search: (pattern: string) => void;
        openPalette: (mode?: Modes) => void;
        closePalette: () => void;
        togglePalette: () => void;
        registerPaletteShortcuts: () => void;
        unregisterPaletteShortcuts: () => void;
    };
    states: {
        open: Writable<boolean>;
        error: Writable<PaletteError | undefined>;
        mode: Writable<Modes>;
        modes: {
            [Mode in Modes] : {
                items: Writable<AnyHyperItem[]>;
                results: Writable<AnyHyperItem[]>;
                history: Writable<HyperItemId[]>;
                current: Writable<AnyHyperItem | undefined>;
            };
            placeholder: Writable<string | undefined>;
            portal: Writable<HTMLElement | string | false>;
            searchInput: Writable<string>;
        };
    };
};
```

The `elements` object contains the builders for the different elements needed to create the palette markup.

The `states` object contains the stores that hold the internal state of the palette.

The `helpers` object contains the functions to interact with the palette and its items.


### Caution

Altering the internal state of the palette directly with the stores of the `states` object isn't guaranteed to work as expected. The `helpers` object should be used to interact with the palette state and its items.


## Acknowledgements

- [Melt-UI][melt-ui]
- [Tinykeys][tinykeys]


## Contributing

Any kind of contribution is welcome.

If you have any suggestions, feedback or issues, please [open an issue][issues] or submit a pull request with your fix or feature.


## License

[MIT](./LICENSE)


[issues]: https://github.com/J-Josu/svelte-hypercommands/issues
[melt-ui]: https://github.com/melt-ui/melt-ui
[svelte]: https://svelte.dev/
[svelte-kit]: https://github.com/sveltejs/kit
[tinykeys]: https://github.com/jamiebuilds/tinykeys
