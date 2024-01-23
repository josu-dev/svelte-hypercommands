import { goto } from '$app/navigation';
import { addKeyBinding, removeKeyBinding } from '$lib/keyboard/index.js';
import { Searcher } from '$lib/search/index.js';
import { useClickOutside, usePortal } from '$lib/utils/actions.js';
import { log, randomID } from '$lib/utils/functions.js';
import { addValueAccessor, writableWithValue, writablesFromRecord } from '$lib/utils/stores.js';
import type { OneOrMany } from '$lib/utils/types.js';
import { tick } from 'svelte';
import { get, type Writable } from 'svelte/store';
import { builder } from './builder.js';
import { PALETTE_ITEM, PALETTE_MODE, RESULTS_EMPTY_MODE } from './enums.js';
import { DuplicatedIDError } from './errors.js';
import { normalizeCommand, normalizePage } from './helpers.js';
import type {
  CommandMatcher,
  CreateCommandPaletteOptions,
  CommandRequestSource as ExecutionSource,
  HyperCommand,
  HyperCommandDefinition,
  HyperId,
  HyperItem,
  HyperPage,
  HyperPageDefinition,
  InternalItem,
  PageMatcher,
  PaletteMode,
  ResultsEmptyMode
} from './types.js';

const dataKey = {
  itemId: 'hyperItemId',
} as const;

function elementDataName(name?: string): string {
  return name ? `palette-${name}` : 'palette';
}

const defaults = {
  defaultOpen: false,
  onOpenChange: undefined,
  commands: [],
  history: [],
  inputText: '',
  error: undefined as { error: unknown; item: HyperItem; } | undefined,
  currentCommand: undefined as HyperCommand | undefined,
  currentPage: undefined as HyperPage | undefined,
  element: undefined,
  selectedIdx: undefined,
  selectedId: undefined,
  emptyMode: RESULTS_EMPTY_MODE.ALL,
  portal: false as const,
  pages: []
};

const screenReaderStyles = `
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  border: none;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
`;

export function createCommandPalette(options: CreateCommandPaletteOptions = {}) {
  const defaultOpen = options?.defaultOpen ?? defaults.defaultOpen;
  const open: Writable<boolean> & { unsubscribe?(): void; get value(): boolean; } = options?.open
    ? addValueAccessor(options.open)
    : writableWithValue(defaultOpen);

  const safeOptions = { ...defaults, ...options };
  const _options = writablesFromRecord(safeOptions, ['defaultOpen', 'open']);

  const {
    commands,
    history,
    inputText,
    currentCommand,
    currentPage,
    error,
    element,
    emptyMode,
    selectedId,
    selectedIdx,
    portal: portalTarget,
    pages,
  } = _options;

  const ids = {
    container: randomID(),
    label: randomID(),
    searchForm: randomID(),
    searchInput: randomID(),
    resultList: randomID(),
  };

  let _emptyMode: ResultsEmptyMode = defaults.emptyMode;

  let _inputElement: HTMLInputElement | null = null;

  const paletteMode = writableWithValue<PaletteMode>(PALETTE_MODE.PAGES);

  const _allCommands: InternalItem<HyperCommand>[] = [];

  const _commandSearcher = new Searcher<InternalItem<HyperCommand>>({
    mapper: (item) =>
      item.item.name +
      item.item.description +
      item.item.keywords.join('') +
      item.item.category,
  });

  const _allPages: InternalItem<HyperPage>[] = [];

  const _pageSearcher = new Searcher<InternalItem<HyperPage>>({
    mapper: (item) => item.item.name + item.item.url + item.item.description,
  });

  const commandResults = writableWithValue<HyperCommand[]>([]);
  const pageResults = writableWithValue<HyperPage[]>([]);

  let _currentAllItems: InternalItem<HyperCommand>[] | InternalItem<HyperPage>[] = _allPages;
  let _currentSearcher: Searcher<InternalItem<HyperCommand>> | Searcher<InternalItem<HyperPage>> = _pageSearcher;
  let _currentResults: Writable<HyperCommand[] | HyperPage[]> = pageResults;

  function togglePalette() {
    open.update(($open) => {
      $open = !$open;
      return $open;
    });
  }

  function openPalette() {
    if (!open.value) {
      open.update(($open) => {
        $open = true;
        return $open;
      });
    }
  }

  function closePalette() {
    if (open.value) {
      open.set(false);
    }
  }

  function registerEscKey() {
    addKeyBinding(window, 'Escape', (event) => {
      closePalette();
    });
  }

  function cleanupEscKey() {
    removeKeyBinding(window, 'Escape');
  }

  function shortcutOpenCommandPalette(event: KeyboardEvent) {
    event.preventDefault();

    _currentAllItems = _allCommands;
    _currentSearcher = _commandSearcher;
    _currentResults = commandResults;

    paletteMode.set(PALETTE_MODE.COMMANDS);
    selectedIdx.set(undefined);
    selectedId.set(undefined);
    inputText.set('');

    if (!open.value) {
      open.set(true);
      registerEscKey();
    }

    updateResults(true);

    tick().then(() => {
      if (_inputElement) {
        _inputElement.value = '>';
        _inputElement.focus();
      }
    });
  }

  function shortcutOpenPagePalette(event: KeyboardEvent) {
    event.preventDefault();

    _currentAllItems = _allPages;
    _currentSearcher = _pageSearcher;
    _currentResults = pageResults;

    paletteMode.set(PALETTE_MODE.PAGES);
    selectedIdx.set(undefined);
    selectedId.set(undefined);
    inputText.set('');

    if (!open.value) {
      open.set(true);
      registerEscKey();
    }

    updateResults(true);

    tick().then(() => {
      if (_inputElement) {
        _inputElement.value = '';
        _inputElement.focus();
      }
    });
  }

  const _cleanupCallbacks: (() => void)[] = [
    emptyMode.subscribe(($emptyMode) => {
      _emptyMode = $emptyMode;
    }),
  ];
  if (open.unsubscribe) {
    _cleanupCallbacks.push(open.unsubscribe);
  }

  const commandShortcutsCleanup: Map<HyperId, (() => void)[]> = new Map();

  function clearInput() {
    const newValue = paletteMode.value === PALETTE_MODE.COMMANDS ? '>' : '';
    if (_inputElement) {
      _inputElement.value = newValue;
    }
    inputText.set(newValue);
  }

  function resetPalette() {
    selectedIdx.update(($selectedIdx) => {
      $selectedIdx = undefined;
      return $selectedIdx;
    });
    selectedId.update(($selectedId) => {
      $selectedId = undefined;
      return $selectedId;
    });
    currentCommand.update(($currentCommand) => {
      $currentCommand = undefined;
      return $currentCommand;
    });
    clearInput();
    searchFn('');
  }

  function updateResults(force = false) {
    const $inputText = get(inputText);

    if (!force && $inputText === '') {
      return;
    }

    searchFn($inputText);
  }

  async function executeCommand(command: HyperCommand, source: ExecutionSource) {
    if (!command) {
      log?.('warn', 'No command provided to executeCommand');
      return;
    }

    currentCommand.set(command);

    const abortExecution = (await command.onRequest(command, source)) === false;
    if (abortExecution) {
      return;
    }

    try {
      await command.onAction({
        command,
        state: undefined,
        source,
      });
      error.set(undefined);
    } catch (err) {
      error.update(($error) => {
        $error = { error: err, item: command };
        return $error;
      });

      if (command.onError) {
        command.onError({ error: err, command, source, state: undefined });
      }
      else {
        log?.('error', err);
      }
    }

    history.update(($history) => {
      $history.unshift(command.id);
      return $history;
    });
    selectedIdx.set(undefined);
    selectedId.set(undefined);
    clearInput();
    closePalette();
  }

  async function navigateToPage(page: HyperPage, source: ExecutionSource) {
    if (!page) {
      log?.('warn', 'No page provided to navigateToPage');
      return;
    }

    currentPage.set(page);

    if (page.external) {
      window.open(page.url, '_blank');
    }
    else {
      try {
        await goto(page.url);
        error.set(undefined);
      } catch (err) {
        error.update(($error) => {
          $error = { error: err, item: page };
          return $error;
        });
      }
    }

    history.update(($history) => {
      $history.unshift(page.id);
      return $history;
    });
    selectedIdx.update(($selectedIdx) => {
      $selectedIdx = undefined;
      return $selectedIdx;
    });
    selectedId.update(($selectedId) => {
      $selectedId = undefined;
      return $selectedId;
    });
    clearInput();
    closePalette();
  }

  function registerCommandShortcuts(command: HyperCommand) {
    const shortcuts = command.shortcut;
    if (!shortcuts || shortcuts.length === 0) {
      return;
    }

    const cleanupShortcuts: (() => void)[] = [];
    for (const shortcut of shortcuts) {
      const cleanup = addKeyBinding(window, shortcut, (event) => {
        event.preventDefault();
        executeCommand(command, { type: 'shortcut', shortcut });
      });
      if (cleanup) {
        cleanupShortcuts.push(cleanup);
      }
    }

    commandShortcutsCleanup.set(command.id, cleanupShortcuts);
  }

  function cleanupCommandShortcuts(command: HyperCommand) {
    const cleanupCallbacks = commandShortcutsCleanup.get(command.id);
    if (!cleanupCallbacks) {
      return;
    }

    for (const cleanup of cleanupCallbacks) {
      cleanup();
    }
    commandShortcutsCleanup.delete(command.id);
  }

  function registerCommand(
    command: OneOrMany<HyperCommandDefinition> | OneOrMany<HyperCommand>,
    override: boolean = false,
  ) {
    const unsafeCommands = Array.isArray(command) ? command : [command];

    const newCommands: HyperCommand[] = [];
    const removedCommands: HyperCommand[] = [];

    commands.update(($commands) => {
      for (const unsafeCommand of unsafeCommands) {
        const newCommand = normalizeCommand(unsafeCommand);
        const existingIndex = $commands.findIndex((command) => {
          return command.id === newCommand.id;
        });

        if (existingIndex < 0) {
          newCommands.push(newCommand);
          $commands.push(newCommand);
          registerCommandShortcuts(newCommand);
          continue;
        }

        if (!override) {
          throw new DuplicatedIDError(
            `ID ${newCommand.id} is not unique, shared between existing command ${$commands[existingIndex].name} and new command ${newCommand.name}`,
          );
        }

        newCommands.push(newCommand);
        const [oldCommand] = $commands.splice(existingIndex, 1, newCommand);
        registerCommandShortcuts(newCommand);

        cleanupCommandShortcuts(oldCommand);
        oldCommand.onUnregister?.(oldCommand);
        removedCommands.push(oldCommand);
      }

      return $commands;
    });

    for (const newCommand of newCommands) {
      const _command = {
        item: newCommand,
        action: () => { console.log('action', newCommand); },
      };
      _allCommands.push(_command);
      _commandSearcher.add(_command);
    }
    for (const removedCommand of removedCommands) {
      const idx = _allCommands.findIndex((result) => result.item.id === removedCommand.id);
      if (idx >= 0) {
        _allCommands.splice(idx, 1);
      }
      _commandSearcher.remove((cmd) => cmd.item.id === removedCommand.id);
    }

    if (open.value) {
      updateResults(true);
    }

    return () => {
      commands.update(($commands) => {
        for (const newCommand of newCommands) {
          const index = $commands.findIndex((command) => command.id === newCommand.id);
          if (index < 0) {
            continue;
          }

          const [oldCommand] = $commands.splice(index, 1);
          cleanupCommandShortcuts(oldCommand);
          oldCommand.onUnregister?.(oldCommand);
          const idx = _allCommands.findIndex((result) => result.item.id === oldCommand.id);
          if (idx >= 0) {
            _allCommands.splice(idx, 1);
          }
          _commandSearcher.remove((doc) => doc.item.id === oldCommand.id);
        }

        const $inputText = get(inputText);
        if ($inputText !== '') {
          searchFn($inputText);
        }

        return $commands;
      });

      if (open.value) {
        updateResults(true);
      }
    };
  }

  function unregisterCommand(selector: OneOrMany<CommandMatcher>) {
    const matchers = Array.isArray(selector) ? selector : [selector];

    const removedCommands: HyperCommand[] = [];

    commands.update(($commands) => {
      for (const matcher of matchers) {
        let index: number;
        if (typeof matcher === 'function') {
          index = $commands.findIndex(matcher);
        } else if (typeof matcher === 'object') {
          index = $commands.findIndex((command) => command.id === matcher.id);
        } else {
          index = $commands.findIndex((command) => command.id === matcher);
        }

        if (index < 0) {
          continue;
        }

        const [oldCommand] = $commands.splice(index, 1);

        oldCommand.onUnregister?.(oldCommand);
        removedCommands.push(oldCommand);
      }

      for (const removedCommand of removedCommands) {
        _commandSearcher.remove((doc) => doc.item.id === removedCommand.id);
      }

      return $commands;
    });

    if (open.value && paletteMode.value === PALETTE_MODE.COMMANDS) {
      updateResults(true);
    }
  }

  function registerPage(
    page: OneOrMany<HyperPageDefinition | HyperPage>,
    override: boolean = false,
    silentError: boolean = true,
  ) {
    const unsafePages = Array.isArray(page) ? page : [page];

    const newPages: HyperPage[] = [];
    const removedPages: HyperPage[] = [];

    pages.update(($pages) => {
      for (const unsafePage of unsafePages) {
        const newPage = normalizePage(unsafePage);
        const existingIndex = $pages.findIndex((command) => {
          return command.id === newPage.id;
        });

        if (existingIndex < 0) {
          newPages.push(newPage);
          $pages.push(newPage);
          continue;
        }

        if (!override && !silentError) {
          throw new DuplicatedIDError(
            `ID ${newPage.id} is not unique, shared between existing page ${$pages[existingIndex].name} and new page ${newPage.name}`,
          );
        }

        newPages.push(newPage);
        const [oldPage] = $pages.splice(existingIndex, 1, newPage);
        removedPages.push(oldPage);
      }

      return $pages;
    });

    for (const newPage of newPages) {
      const _page = {
        item: newPage,
        action: () => { console.log('action', newPage); },
      };
      _allPages.push(_page);
      _pageSearcher.add(_page);
    }
    for (const removedPage of removedPages) {
      const idx = _allPages.findIndex((result) => result.item.id === removedPage.id);
      if (idx >= 0) {
        _allPages.splice(idx, 1);
      }
      _pageSearcher.remove((cmd) => cmd.item.id === removedPage.id);
    }

    if (open.value) {
      updateResults(true);
    }

    return () => {
      pages.update(($pages) => {
        for (const newCommand of newPages) {
          const index = $pages.findIndex((command) => command.id === newCommand.id);
          if (index < 0) {
            continue;
          }

          const [oldCommand] = $pages.splice(index, 1);
          const idx = _allPages.findIndex((result) => result.item.id === oldCommand.id);
          if (idx >= 0) {
            _allPages.splice(idx, 1);
          }
          _commandSearcher.remove((doc) => doc.item.id === oldCommand.id);
        }

        const $inputText = get(inputText);
        if ($inputText !== '') {
          searchFn($inputText);
        }

        return $pages;
      });

      if (open.value) {
        updateResults(true);
      }
    };
  }

  function unregisterPage(selector: OneOrMany<PageMatcher>) {
    const matchers = Array.isArray(selector) ? selector : [selector];

    const removedPages: HyperPage[] = [];

    pages.update(($pages) => {
      for (const matcher of matchers) {
        let index: number;
        if (typeof matcher === 'function') {
          index = $pages.findIndex(matcher);
        } else if (typeof matcher === 'object') {
          index = $pages.findIndex((command) => command.id === matcher.id);
        } else {
          index = $pages.findIndex((command) => command.id === matcher);
        }

        if (index < 0) {
          continue;
        }

        const [oldPage] = $pages.splice(index, 1);
        removedPages.push(oldPage);
      }

      for (const removedPage of removedPages) {
        _pageSearcher.remove((doc) => doc.item.id === removedPage.id);
      }

      return $pages;
    });

    if (open.value && paletteMode.value === PALETTE_MODE.PAGES) {
      updateResults(true);
    }
  }

  function searchFn(pattern: string) {
    let newResults: HyperCommand[] | HyperPage[] = [];
    if (pattern === '') {
      if (_emptyMode === RESULTS_EMPTY_MODE.ALL) {
        _currentResults.update(($state) => {
          $state = _currentAllItems.map((result) => result.item) as HyperCommand[] | HyperPage[];
          newResults = $state;
          return $state;
        });
      } else if (_emptyMode === RESULTS_EMPTY_MODE.HISTORY) {
        _currentResults.update(($state) => {
          const ids = get(history);
          $state = _currentAllItems
            .filter((result) => ids.includes(result.item.id))
            .map((result) => result.item) as HyperCommand[] | HyperPage[];
          newResults = $state;
          return $state;
        });
      } else if (_emptyMode === RESULTS_EMPTY_MODE.NONE) {
        _currentResults.update(() => {
          newResults = [];
          return [];
        });
      }
    }
    else {
      const searchResult = _currentSearcher.search(pattern);
      newResults = searchResult.map((cmd) => cmd.item) as HyperCommand[] | HyperPage[];

      _currentResults.set(newResults);
    }

    if (newResults.length === 0) {
      selectedIdx.set(undefined);
      selectedId.set(undefined);
      return;
    }

    selectedIdx.set(0);
    selectedId.set(newResults[0].id);
  }

  function nextResult() {
    const $results = get(_currentResults);
    const $selectedIdx = get(selectedIdx);
    if ($results.length === 0) {
      return;
    }

    if ($selectedIdx === undefined) {
      selectedIdx.update(($selectedIdx) => {
        $selectedIdx = 0;
        return $selectedIdx;
      });
      selectedId.update(($selectedId) => {
        $selectedId = $results[0].id;
        return $selectedId;
      });
      return;
    }

    selectedIdx.update(() => {
      const newIdx = ($selectedIdx + 1) % $results.length;
      selectedId.update(($selectedId) => {
        $selectedId = $results[newIdx].id;
        return $selectedId;
      });
      return newIdx;
    });
  }

  function prevResult() {
    const $results = get(_currentResults);
    const $selectedIdx = get(selectedIdx);
    if ($results.length === 0) {
      return;
    }

    if ($selectedIdx === undefined) {
      selectedIdx.update(($selectedIdx) => {
        $selectedIdx = $results.length - 1;
        return $selectedIdx;
      });
      selectedId.update(($selectedId) => {
        $selectedId = $results[$results.length - 1].id;
        return $selectedId;
      });
      return;
    }

    selectedIdx.update(() => {
      const newIdx = ($results.length + $selectedIdx - 1) % $results.length;
      selectedId.update(($selectedId) => {
        $selectedId = $results[newIdx].id;
        return $selectedId;
      });
      return newIdx;
    });
  }

  function registerDefaultShortcuts() {
    const cleanupShortcuts: (() => void)[] = [];
    const cleanupOpenPalette1 = addKeyBinding(window, '$mod+Shift+P', shortcutOpenCommandPalette);
    const cleanupOpenPalette2 = addKeyBinding(window, '$mod+P', shortcutOpenPagePalette);
    if (cleanupOpenPalette1) {
      cleanupShortcuts.push(cleanupOpenPalette1);
    }
    if (cleanupOpenPalette2) {
      cleanupShortcuts.push(cleanupOpenPalette2);
    }

    commandShortcutsCleanup.set('default', cleanupShortcuts);
  }

  function cleanupDefaultsShorcuts() {
    cleanupEscKey();
    const cleanupCallbacks = commandShortcutsCleanup.get('default');
    if (!cleanupCallbacks) {
      return;
    }

    for (const cleanup of cleanupCallbacks) {
      cleanup();
    }
    commandShortcutsCleanup.delete('default');
  }

  // Elements Builders

  const builderPortal = builder(elementDataName(), {
    stores: [portalTarget],
    returned: ([$target]) => {
      return {
        'data-portal': $target ? '' : undefined,
      };
    },
    action: (node) => {
      const actionCleanup = usePortal(node, get(portalTarget));

      const unsubscribe = portalTarget.subscribe(actionCleanup.update);

      return {
        destroy() {
          actionCleanup.destroy();
          unsubscribe();
        },
      };
    },
  });

  const builderPalette = builder(elementDataName('container'), {
    stores: [],
    returned: () => {
      return {
        id: ids.container,
      };
    },
    action: (node) => {
      registerDefaultShortcuts();

      // Type 'pointerdown' has the least amount of delay between the event and the action
      const cleanupClickOutside = useClickOutside(node, {
        type: "pointerdown",
        handler: (event) => {
          closePalette();
        },
      });


      return {
        destroy() {
          cleanupDefaultsShorcuts();
          cleanupClickOutside.destroy();
        },
      };
    },
  });

  const builderForm = builder(elementDataName('search-form'), {
    stores: [],
    returned: () => {
      return {
        id: ids.searchForm,
      };
    },
    action: (node: HTMLFormElement) => {
      function onSubmit(event: SubmitEvent) {
        event.preventDefault();
        const $selectedIdx = get(selectedIdx);
        if ($selectedIdx === undefined) {
          return;
        }

        const $results = get(_currentResults);
        const item = $results[$selectedIdx];
        if (!item) {
          return;
        }

        const domElement = document.querySelector(`[data-command-id="${item.id}"]`);
        if (domElement) {
          element.update(($element) => {
            $element = domElement as HTMLElement;
            return $element;
          });
        }

        if (item.type === PALETTE_ITEM.PAGE) {
          navigateToPage(item, { type: 'keyboard' });
          return;
        }

        executeCommand(item, { type: 'keyboard' });
      }

      node.addEventListener('submit', onSubmit);

      return {
        destroy() {
          node.removeEventListener('submit', onSubmit);
        },
      };
    },
  });

  const builderLabel = builder(elementDataName('search-label'), {
    stores: [],
    returned: () => {
      return {
        id: ids.label,
        for: ids.searchInput,
        style: screenReaderStyles,
      };
    },
  });

  const builderInput = builder(elementDataName('search-input'), {
    stores: [],
    returned: () => {
      return {
        id: ids.searchInput,
        type: 'text',
        placeholder: 'Search for commands...',
        'aria-labelledby': ids.label,
      };
    },
    action: (node) => {
      _inputElement = node as unknown as HTMLInputElement;

      let debounceTimeout: ReturnType<typeof setTimeout>;

      function onInput(event: Event) {
        const el = event.target as HTMLInputElement;
        const rawValue = el.value;
        inputText.update(($inputText) => {
          $inputText = rawValue;
          return $inputText;
        });
        let query = rawValue;

        const newInputMode = rawValue.startsWith('>') ? PALETTE_MODE.COMMANDS : PALETTE_MODE.PAGES;

        if (newInputMode === PALETTE_MODE.PAGES) {
          _currentAllItems = _allPages;
          _currentSearcher = _pageSearcher;
          _currentResults = pageResults;
        }
        else {
          _currentAllItems = _allCommands;
          _currentSearcher = _commandSearcher;
          _currentResults = commandResults;
          query = query.slice(1);
        }

        if (newInputMode !== paletteMode.value) {
          selectedIdx.set(undefined);
          selectedId.set(undefined);
          paletteMode.set(newInputMode);
          searchFn(query);
          return;
        }

        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
          searchFn(query);
        }, 200);
      }
      node.addEventListener('input', onInput);

      function onKeydown(event: KeyboardEvent) {
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          nextResult();
        } else if (event.key === 'ArrowUp') {
          event.preventDefault();
          prevResult();
        } else if (event.key === 'Escape') {
          event.preventDefault();
          resetPalette();
        } else if (event.key === 'Tab') {
          event.preventDefault();
        }
      }
      node.addEventListener('keydown', onKeydown);

      return {
        destroy() {
          node.removeEventListener('input', onInput);
          node.removeEventListener('keydown', onKeydown);
        },
      };
    },
  });

  const builderPage = builder(elementDataName('page'), {
    stores: [],
    returned: () => {
      return {
        role: 'button',
      };
    },
    action: (node: HTMLElement, page: HyperPage) => {
      function onClick(event: MouseEvent) {
        event.preventDefault();
        const el = event.currentTarget as HTMLElement | null;
        if (!el) {
          return;
        }
        const id = el.dataset[dataKey.itemId];
        const $pages = get(pages);
        const pageIdx = $pages.findIndex((command) => command.id === id);
        if (pageIdx < 0) {
          return;
        }

        const page = $pages[pageIdx];

        element.update(($element) => {
          $element = el;
          return $element;
        });

        navigateToPage(page, { type: 'click', event });
      }
      node.addEventListener('click', onClick);

      node.dataset[dataKey.itemId] = page.id.toString();

      const unsunscribe = selectedId.subscribe(($selectedId) => {
        if ($selectedId === undefined || $selectedId !== page.id) {
          delete node.dataset['selected'];
          return;
        }

        node.dataset['selected'] = 'true';
        node.scrollIntoView({ behavior: 'instant', 'block': 'nearest' });
      });

      return {
        destroy() {
          node.removeEventListener('click', onClick);
          unsunscribe();
        },
      };
    },
  });

  const builderCommand = builder(elementDataName('command'), {
    stores: [],
    returned: () => {
      return {
        role: 'button',
      };
    },
    action: (node: HTMLElement, command: HyperCommand) => {
      function onClick(event: MouseEvent) {
        event.preventDefault();
        const el = event.currentTarget as HTMLElement | null;
        if (!el) {
          return;
        }
        const id = el.dataset[dataKey.itemId];
        const $commands = get(commands);
        const commandIdx = $commands.findIndex((command) => command.id === id);
        if (commandIdx < 0) {
          return;
        }

        const command = $commands[commandIdx];

        element.update(($element) => {
          $element = el;
          return $element;
        });

        executeCommand(command, { type: 'click', event });
      }
      node.addEventListener('click', onClick);

      node.dataset[dataKey.itemId] = command.id.toString();
      const unsunscribe = selectedId.subscribe(($selectedId) => {
        if ($selectedId === undefined || $selectedId !== command.id) {
          delete node.dataset['selected'];
          return;
        }

        node.dataset['selected'] = 'true';
        node.scrollIntoView({ behavior: 'instant', 'block': 'end', inline: 'nearest' });
      });

      return {
        destroy() {
          node.removeEventListener('click', onClick);
          unsunscribe();
        },
      };
    },
  });

  return {
    elements: {
      portal: builderPortal,
      palette: builderPalette,
      form: builderForm,
      label: builderLabel,
      input: builderInput,
      command: builderCommand,
      page: builderPage,
    },
    states: {
      commands,
      matchingCommands: commandResults,
      pages,
      matchingPages: pageResults,
      history,
      inputText,
      currentCommand,
      error,
      open,
      portalTarget,
      paletteMode,
    },
    helpers: {
      registerCommand,
      unregisterCommand,
      search: searchFn,
      openPalette,
      closePalette,
      togglePalette,
      registerDefaultShortcuts,
      registerPage,
      unregisterPage,
    },
  };
}
