import { Searcher } from '$lib/search';
import { log, randomID } from '$lib/utils/funcs';
import { addValueAccessor, writableWithValue, writablesFromRecord } from '$lib/utils/stores';
import { get, type Writable } from 'svelte/store';
import { builder } from './builder';
import { DuplicatedIDError } from './errors';
import { normalizeCommand } from './helpers';
import type {
  Command,
  CommandDefinition,
  CommandMatcher,
  CreateCommandPaletteOptions,
  EmptyModes,
  InternalCommand,
} from './types';

function dataName(name?: string): string {
  return name ? `command-palette-${name}` : 'command-palette';
}

const defaults = {
  defaultOpen: false,
  onOpenChange: undefined,
  commands: [],
  results: [],
  history: [],
  inputText: '',
  error: undefined,
  currentCommand: undefined,
  element: undefined,
  selectedIdx: undefined,
  selectedId: undefined,
  emptyMode: 'all' as EmptyModes,
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
  const open: Writable<boolean> & { unsubscribe?(): void; get value(): boolean } = options?.open
    ? addValueAccessor(options.open)
    : writableWithValue(defaultOpen);

  const safeOptions = { ...defaults, ...options };
  const _options = writablesFromRecord(safeOptions, ['defaultOpen', 'open']);

  const {
    commands,
    results,
    history,
    inputText,
    currentCommand,
    error,
    element,
    emptyMode,
    selectedId,
    selectedIdx,
  } = _options;

  const ids = {
    container: randomID(),
    label: randomID(),
    searchForm: randomID(),
    searchInput: randomID(),
    resultList: randomID(),
  };

  const _results: InternalCommand[] = [];

  let _emptyMode: EmptyModes = defaults.emptyMode;

  let _inputElement: HTMLInputElement | null = null;

  const searcher = new Searcher<InternalCommand>({
    mapper: (item) =>
      item.command.name +
      item.command.description +
      item.command.keywords.join('') +
      item.command.category,
  });

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
      open.update(($open) => {
        $open = false;
        return $open;
      });
    }
  }

  const cleanupCallbacks: (() => void)[] = [
    emptyMode.subscribe(($emptyMode) => {
      _emptyMode = $emptyMode;
    }),
  ];
  if (open.unsubscribe) {
    cleanupCallbacks.push(open.unsubscribe);
  }

  // function registerDefaultListeners() {
  // 	cleanupCallbacks = [bindShortcut('ctrl+shift+p,ctrl+p', togglePalette)];
  // 	return () => {
  // 		for (const unsubscribe of cleanupCallbacks) {
  // 			unsubscribe();
  // 		}
  // 	};
  // }

  function clearInput() {
    if (_inputElement) {
      _inputElement.value = '';
    }

    inputText.update(($inputText) => {
      $inputText = '';
      return $inputText;
    });
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

  /**
   *
   * @param {import('./types.js').Command} command
   * @returns
   */
  function executeCommand(command: Command) {
    if (!command) {
      log?.('warn', 'No command provided to executeCommand');
      return;
    }

    currentCommand.update(($currentCommand) => {
      $currentCommand = command;
      return $currentCommand;
    });

    try {
      command.action({} as any);
      error.update(($error) => {
        $error = undefined;
        return $error;
      });
    } catch (err) {
      error.update(($error) => {
        $error = { error: err, command };
        return $error;
      });
    }

    history.update(($history) => {
      $history.push(command.id);
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

  function commandClick(event: MouseEvent & { currentTarget: HTMLElement }) {
    event.preventDefault();
    const el = event.currentTarget;
    const id = el.dataset['commandId'];
    const $commands = get(commands);
    const commandIdx = $commands.findIndex((command) => command.id === id);
    if (commandIdx < 0) {
      return;
    }
    const command = $commands[commandIdx];
    element.update(($element) => {
      $element = event.currentTarget;
      return $element;
    });

    executeCommand(command);

    closePalette();
  }

  /**
   * @type {import('./types.js').CommandElementAction}
   */
  function commandAction(node: HTMLElement, command: Command) {
    node.addEventListener('click', commandClick as any);
    node.dataset['command-id'] = command.id;
    const unsunscribe = selectedId.subscribe(($selectedId) => {
      if ($selectedId === undefined) {
        return;
      }
      if ($selectedId !== command.id) {
        delete node.dataset['selected'];
        return;
      }
      node.dataset['selected'] = 'true';
    });
    return {
      destroy() {
        node.removeEventListener('click', commandClick as any);
        unsunscribe();
      },
    };
  }

  function registerCommand<T extends CommandDefinition | Command | Command[] | CommandDefinition[]>(
    command: T,
    override: boolean = false,
  ) {
    const unsafeCommands = Array.isArray(command) ? command : [command];

    const newCommands: Command[] = [];
    const removedCommands: Command[] = [];

    commands.update(($commands) => {
      for (const unsafeCommand of unsafeCommands) {
        const newCommand = normalizeCommand(unsafeCommand);
        const existingIndex = $commands.findIndex((command) => {
          return command.id === newCommand.id;
        });

        if (existingIndex < 0) {
          newCommands.push(newCommand);
          $commands.push(newCommand);
          continue;
        }

        if (!override) {
          throw new DuplicatedIDError(
            `ID ${newCommand.id} is not unique, shared between existing command ${$commands[existingIndex].name} and new command ${newCommand.name}`,
          );
        }

        newCommands.push(newCommand);
        const [oldCommand] = $commands.splice(existingIndex, 1, newCommand);

        oldCommand.unregisterCallback?.({ command: oldCommand, hcState: undefined });
        removedCommands.push(oldCommand);
      }

      return $commands;
    });

    for (const newCommand of newCommands) {
      const _command = {
        command: newCommand,
        action: commandAction,
      };
      _results.push(_command);
      searcher.add(_command);
    }
    for (const removedCommand of removedCommands) {
      const idx = _results.findIndex((result) => result.command.id === removedCommand.id);
      if (idx >= 0) {
        _results.splice(idx, 1);
      }
      searcher.remove((cmd) => cmd.command.id === removedCommand.id);
    }

    updateResults(true);

    return () => {
      commands.update(($commands) => {
        for (const newCommand of newCommands) {
          const index = $commands.findIndex((command) => command.id === newCommand.id);
          if (index < 0) {
            continue;
          }

          const [oldCommand] = $commands.splice(index, 1);

          oldCommand.unregisterCallback?.({ command: oldCommand, hcState: undefined });
          const idx = _results.findIndex((result) => result.command.id === oldCommand.id);
          if (idx >= 0) {
            _results.splice(idx, 1);
          }
          searcher.remove((doc) => doc.command.id === oldCommand.id);
        }

        const $inputText = get(inputText);
        if ($inputText !== '') {
          searchFn($inputText);
        }

        return $commands;
      });
    };
  }

  function unregisterCommand(selector: CommandMatcher | CommandMatcher[]) {
    const matchers = Array.isArray(selector) ? selector : [selector];

    const removedCommands: Command[] = [];

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

        oldCommand.unregisterCallback?.({ command: oldCommand, hcState: undefined });
        removedCommands.push(oldCommand);
      }

      for (const removedCommand of removedCommands) {
        searcher.remove((doc) => doc.command.id === removedCommand.id);
      }

      return $commands;
    });

    updateResults(true);
  }

  function searchFn(pattern: string) {
    if (pattern === '') {
      if (_emptyMode === 'all') {
        results.update(($state) => {
          $state = _results.map((result) => result.command);
          return $state;
        });
        return;
      } else if (_emptyMode === 'history') {
        results.update(($state) => {
          const ids = get(history);
          $state = _results
            .filter((result) => ids.includes(result.command.id))
            .map((result) => result.command);
          return $state;
        });
        return;
      } else if (_emptyMode === 'none') {
        results.update(() => {
          return [];
        });
        return;
      }
    }
    const fuseResult = searcher.search(pattern);
    const commandResults = fuseResult.map((cmd) => cmd.command);

    results.update(($state) => {
      $state = commandResults;
      return $state;
    });
  }

  function nextCommand() {
    const $results = get(results);
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

  function prevCommand() {
    const $results = get(results);
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

  const commandPalette = builder(dataName(), {
    stores: [],
    returned: () => {
      return {
        id: ids.container,
      };
    },
    action: (node) => {
      // const cleanupDefaults = registerDefaultListeners();

      return {
        destroy() {
          // cleanupDefaults();
          for (const cleanup of cleanupCallbacks) {
            cleanup();
          }
        },
      };
    },
  });

  const label = builder(dataName('label'), {
    stores: [],
    returned: () => {
      return {
        id: ids.label,
        for: ids.searchInput,
        style: screenReaderStyles,
      };
    },
  });

  const form = builder(dataName('search-form'), {
    stores: [],
    returned: () => {
      return {
        id: ids.searchForm,
      };
    },
    action: (node) => {
      function onSubmit(event: SubmitEvent) {
        event.preventDefault();
        const $selectedIdx = get(selectedIdx);
        if ($selectedIdx === undefined) {
          return;
        }

        const $results = get(results);
        const command = $results[$selectedIdx];
        if (!command) {
          return;
        }

        const domElement = document.querySelector(`[data-command-id="${command.id}"]`);
        if (domElement) {
          element.update(($element) => {
            $element = domElement as HTMLElement;
            return $element;
          });
        }

        executeCommand(command);
      }

      node.addEventListener('submit', onSubmit);

      return {
        destroy() {
          node.removeEventListener('submit', onSubmit);
        },
      };
    },
  });

  const input = builder(dataName('search-input'), {
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
        const value = el.value;
        inputText.update(($inputText) => {
          $inputText = value;
          return $inputText;
        });

        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
          searchFn(value);
        }, 250);
      }
      node.addEventListener('input', onInput);

      function onKeydown(event: KeyboardEvent) {
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          nextCommand();
        } else if (event.key === 'ArrowUp') {
          event.preventDefault();
          prevCommand();
        } else if (event.key === 'Escape') {
          event.preventDefault();
          resetPalette();
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

  const result = builder(dataName('result'), {
    stores: [],
    returned: () => {
      return {
        role: 'button',
      };
    },
    action: (node, command: Command) => {
      function onClick(event: MouseEvent) {
        event.preventDefault();
        const el = event.currentTarget as HTMLElement | null;
        if (!el) {
          return;
        }
        const id = el.dataset['commandId'];
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

        executeCommand(command);
      }
      node.addEventListener('click', onClick);

      node.dataset['commandId'] = command.id.toString();
      const unsunscribe = selectedId.subscribe(($selectedId) => {
        if ($selectedId === undefined || $selectedId !== command.id) {
          delete node.dataset['selected'];
          return;
        }

        node.dataset['selected'] = 'true';
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
      commandPalette: commandPalette,
      label: label,
      form: form,
      input: input,
      result: result,
    },
    states: {
      commands,
      results,
      history,
      inputText,
      currentCommand,
      error,
      open,
    },
    options,
    methods: {
      registerCommand,
      unregisterCommand,
      search: searchFn,
      openPalette,
      closePalette,
      togglePalette,
    },
  };
}
