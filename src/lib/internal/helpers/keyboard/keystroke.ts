/**
 * Original source:
 * @see https://github.com/jamiebuilds/tinykeys/blob/111955cb6604fb5b8c4f152cb75b7f2cb63da913/src/tinykeys.ts
 *
 * This is a modified version of tinykeys that allows a more fine-grained
 * control over the keydown and keyup events.
 */

/**
 * A KeyBindingPress is a tuple of modifiers and a key.
 */
type KeyBindingPress = [string[], string];

type KeyBindingCallback = {
    (event: KeyboardEvent): void;
    once?: boolean;
};

export interface KeyBindingHandlerOptions {
    /**
     * Keybinding sequences will wait this long between key presses before  
     * cancelling (default: 1000).
     *
     * **Note:** Setting this value too low (i.e. `300`) will be too fast for many
     * of your users.
     */
    timeout?: number;
}

/**
 * Options to configure the behavior of keybindings.
 */
export type KeyBindingOptions = KeyBindingHandlerOptions & {
    /**
     * Key presses will listen to this event (default: "keydown").
     */
    event: 'keydown' | 'keyup';
    /**
     * Whether the keybinding should only fire once.
     */
    once: boolean;
    /**
     * A function that returns whether the keybinding should run.
     */
    shouldRun: (event: KeyboardEvent) => boolean;
};

/**
 * Options to configure the behavior of keybindings.
 */
export type AddKeyBindOptions = KeyBindingHandlerOptions & {
    /**
     * Key presses will listen to this event (default: "keydown").
     */
    event?: 'keydown' | 'keyup';
    /**
     * Whether the keybinding should only fire once.
     */
    once?: boolean;
    /**
     * A function that returns whether the keybinding should run.
     */
    shouldRun?: (event: KeyboardEvent) => boolean;
};

/**
 * These are the modifier keys that change the meaning of keybindings.
 *
 * Note: Ignoring "AltGraph" because it is covered by the others.
 */
const KEYBINDING_MODIFIER_KEYS = ['Shift', 'Meta', 'Alt', 'Control'] as const;

/**
 * Keybinding sequences should timeout if individual key presses are more than
 * 1s apart by default.
 */
const DEFAULT_TIMEOUT = 1000;

/**
 * Keybinding sequences should bind to this event by default.
 */
const DEFAULT_EVENT = 'keydown';

const DEFAULT_SHOULD_RUN = () => true;

/**
 * Platform detection code.
 * @see https://github.com/jamiebuilds/tinykeys/issues/184
 */
const PLATFORM = typeof navigator === 'object' ? navigator.platform : '';
const APPLE_DEVICE = /Mac|iPod|iPhone|iPad/.test(PLATFORM);

/**
 * An alias for creating platform-specific keybinding aliases.
 */
const MOD = APPLE_DEVICE ? 'Meta' : 'Control';

/**
 * Meaning of `AltGraph`, from MDN:
 * - Windows: Both Alt and Ctrl keys are pressed, or AltGr key is pressed
 * - Mac: ⌥ Option key pressed
 * - Linux: Level 3 Shift key (or Level 5 Shift key) pressed
 * - Android: Not supported
 * @see https://github.com/jamiebuilds/tinykeys/issues/185
 */
const ALT_GRAPH_ALIASES = PLATFORM === 'Win32' ? ['Control', 'Alt'] : APPLE_DEVICE ? ['Alt'] : [];

/**
 * There's a bug in Chrome that causes event.getModifierState not to exist on
 * KeyboardEvent's for F1/F2/etc keys.
 */
function getModifierState(event: KeyboardEvent, mod: string) {
    return typeof event.getModifierState === 'function'
        ? event.getModifierState(mod) ||
        (ALT_GRAPH_ALIASES.includes(mod) && event.getModifierState('AltGraph'))
        : false;
}

/**
 * Parses a "Key Binding String" into its parts
 *
 * grammar    = `<sequence>`
 * <sequence> = `<press> <press> <press> ...`
 * <press>    = `<key>` or `<mods>+<key>`
 * <mods>     = `<mod>+<mod>+...`
 */
export function parseKeybinding(str: string): KeyBindingPress[] {
    return str
        .trim()
        .split(' ')
        .map((press) => {
            let mods = press.split(/\b\+/);
            const key = mods.pop() as string;
            mods = mods.map((mod) => (mod === '$mod' ? MOD : mod));
            return [mods, key];
        });
}

/**
 * This tells us if a series of events matches a key binding sequence either
 * partially or exactly.
 */
function match(event: KeyboardEvent, press: KeyBindingPress): boolean {
    // prettier-ignore
    return !(
        // Allow either the `event.key` or the `event.code`
        // MDN event.key: https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key
        // MDN event.code: https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code
        (
            press[1].toUpperCase() !== event.key.toUpperCase() &&
            press[1] !== event.code
        ) ||

        // Ensure all the modifiers in the keybinding are pressed.
        press[0].find(mod => {
            return !getModifierState(event, mod);
        }) ||

        // KEYBINDING_MODIFIER_KEYS (Shift/Control/etc) change the meaning of a
        // keybinding. So if they are pressed but aren't part of the current
        // keybinding press, then we don't have a match.
        KEYBINDING_MODIFIER_KEYS.find(mod => {
            return !press[0].includes(mod) && press[1] !== mod && getModifierState(event, mod);
        })
    );
}

class KeyBindingHandler {
    keyBindings: [KeyBindingPress[], (KeyBindingCallback)[]][];
    #possibleMatches: Map<KeyBindingPress[], KeyBindingPress[]>;
    #timeoutID: number | undefined;
    #timeout: number;
    event: 'keydown' | 'keyup';

    constructor(options: KeyBindingOptions = { event: DEFAULT_EVENT, once: false, shouldRun: DEFAULT_SHOULD_RUN }) {
        this.keyBindings = [];
        this.#possibleMatches = new Map<KeyBindingPress[], KeyBindingPress[]>();
        this.#timeoutID = undefined;
        this.#timeout = options.timeout ?? DEFAULT_TIMEOUT;
        this.event = options.event ?? DEFAULT_EVENT;
    }

    onKeyEvent = (event: KeyboardEvent) => {
        // Ensure and stop any event that isn't a full keyboard event.
        // Autocomplete option navigation and selection would fire a instanceof Event,
        // instead of the expected KeyboardEvent
        if (!(event instanceof KeyboardEvent)) {
            return;
        }

        for (let i = 0; i < this.keyBindings.length; i++) {
            const keyBinding = this.keyBindings[i]!;
            const sequence = keyBinding[0]!;
            const callback = keyBinding[1]!;

            const prev = this.#possibleMatches.get(sequence);
            const remainingExpectedPresses = prev ? prev : sequence;
            const currentExpectedPress = remainingExpectedPresses[0]!;

            const matches = match(event, currentExpectedPress);

            if (!matches) {
                // Modifier keydown events shouldn't break sequences
                // Note: This works because:
                // - non-modifiers will always return false
                // - if the current keypress is a modifier then it will return true when we check its state
                // MDN: https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/getModifierState
                if (!getModifierState(event, event.key)) {
                    this.#possibleMatches.delete(sequence);
                }
            } else if (remainingExpectedPresses.length > 1) {
                this.#possibleMatches.set(sequence, remainingExpectedPresses.slice(1));
            } else {
                this.#possibleMatches.delete(sequence);

                const callbacksToRemove: number[] = [];
                for (let i = 0; i < callback.length; i++) {
                    const cb = callback[i]!;
                    if (cb.once) {
                        callbacksToRemove.push(i);
                    }
                    cb(event);
                }
                for (let i = callbacksToRemove.length - 1; i >= 0; i--) {
                    callback.splice(callbacksToRemove[i]!, 1);
                }
            }
        }

        clearTimeout(this.#timeoutID);
        this.#timeoutID = setTimeout(
            this.#possibleMatches.clear.bind(this.#possibleMatches),
            this.#timeout,
        );
    };

    addKeyBinding(
        keyBinding: KeyBindingPress[],
        callback: KeyBindingCallback,
        options: KeyBindingOptions,
    ) {
        if (options.timeout !== undefined) {
            if (options.timeout < 1) {
                throw new Error('timeout must be a positive number greater than 0');
            }
            if (options.timeout < this.#timeout) {
                this.#timeout = options.timeout;
            }
        }

        let existingKeyBindingIndex = -1;
        for (let i = 0; i < this.keyBindings.length; i++) {
            const existingKeyBinding = this.keyBindings[i]![0]!;
            if (existingKeyBinding.length !== keyBinding.length) {
                continue;
            }
            let match = true;
            for (let j = 0; j < existingKeyBinding.length; j++) {
                if (existingKeyBinding[j]![0].length !== keyBinding[j]![0].length) {
                    match = false;
                    break;
                }
                if (existingKeyBinding[j]![1] !== keyBinding[j]![1]) {
                    match = false;
                    break;
                }
            }
            if (match) {
                existingKeyBindingIndex = i;
                break;
            }
        }
        Object.assign(callback, { once: options.once ?? false });
        if (existingKeyBindingIndex === -1) {
            this.keyBindings.push([keyBinding, [callback]]);
        } else {
            this.keyBindings[existingKeyBindingIndex]![1].push(callback);
        }
    }

    removeKeyBinding(keyBinding: KeyBindingPress[], callback: (event: KeyboardEvent) => void) {
        const existingKeyBindingIndex = this.keyBindings.findIndex(
            ([existingKeyBinding, existingCallbacks]) => {
                if (existingKeyBinding.length !== keyBinding.length) {
                    return false;
                }
                let match = true;
                for (let j = 0; j < existingKeyBinding.length; j++) {
                    if (existingKeyBinding[j]![0].length !== keyBinding[j]![0].length) {
                        match = false;
                        break;
                    }
                    if (existingKeyBinding[j]![1] !== keyBinding[j]![1]) {
                        match = false;
                        break;
                    }
                }
                if (!match) {
                    return false;
                }
                return existingCallbacks.includes(callback);
            },
        );
        if (existingKeyBindingIndex === -1) {
            return;
        }
        const existingCallbacks = this.keyBindings[existingKeyBindingIndex]![1];
        existingCallbacks.splice(existingCallbacks.indexOf(callback), 1);
        if (existingCallbacks.length === 0) {
            this.keyBindings.splice(existingKeyBindingIndex, 1);
        }
    }
}

const registeredKeydownListeners = new WeakMap<Window | HTMLElement, KeyBindingHandler>();
const registeredKeyupListeners = new WeakMap<Window | HTMLElement, KeyBindingHandler>();

export function addKeyBinding(
    target: Window | HTMLElement | string,
    keyBinding: string,
    callback: (event: KeyboardEvent) => void,
    options: AddKeyBindOptions = {},
) {
    const targetElement =
        typeof target === 'string' ? document.querySelector<HTMLElement>(target) : target;
    if (!targetElement) {
        return undefined;
    }
    const _options = {
        event: options.event ?? DEFAULT_EVENT,
        once: options.once ?? false,
        shouldRun: options.shouldRun ?? DEFAULT_SHOULD_RUN,
    };

    const eventType = options.event ?? DEFAULT_EVENT;
    const listenerMap = (eventType === 'keydown' ? registeredKeydownListeners : registeredKeyupListeners);
    let handler = listenerMap.get(targetElement);
    if (!handler) {
        handler = new KeyBindingHandler(_options);
        listenerMap.set(targetElement, handler);
        targetElement.addEventListener(handler.event, handler.onKeyEvent as any);
    }
    const keyBindingPress = parseKeybinding(keyBinding);
    handler.addKeyBinding(keyBindingPress, callback, _options);
    return () => {
        handler?.removeKeyBinding(keyBindingPress, callback);
    };
}

export function removeKeyBindingCallback(
    target: Window | HTMLElement | string,
    keyBinding: string,
    callback: (event: KeyboardEvent) => void,
    event: 'keydown' | 'keyup' = 'keydown',
) {
    const targetElement =
        typeof target === 'string' ? document.querySelector<HTMLElement>(target) : target;
    if (!targetElement) {
        return false;
    }

    const listenerMap = (event === 'keydown' ? registeredKeydownListeners : registeredKeyupListeners);
    const handler = listenerMap.get(targetElement);
    if (!handler) {
        return false;
    }
    const keyBindingPress = parseKeybinding(keyBinding);
    handler.removeKeyBinding(keyBindingPress, callback);
    if (handler.keyBindings.length === 0) {
        listenerMap.delete(targetElement);
        targetElement.removeEventListener(handler.event, handler.onKeyEvent as any);
    }
    return true;
}

export function removeKeyBinding(target: Window | HTMLElement | string, keyBinding: string, event: 'keydown' | 'keyup' = 'keydown') {
    const targetElement =
        typeof target === 'string' ? document.querySelector<HTMLElement>(target) : target;
    if (!targetElement) {
        return false;
    }

    const listenerMap = (event === 'keydown' ? registeredKeydownListeners : registeredKeyupListeners);
    const handler = listenerMap.get(targetElement);
    if (!handler) {
        return false;
    }
    const keyBindingPress = parseKeybinding(keyBinding);
    handler.removeKeyBinding(keyBindingPress, () => { });
    if (handler.keyBindings.length === 0) {
        listenerMap.delete(targetElement);
        targetElement.removeEventListener(handler.event, handler.onKeyEvent as any);
    }
    return true;
}

export function removeAllKeyBindings(target: Window | HTMLElement | string, event: 'keydown' | 'keyup' = 'keydown') {
    const targetElement =
        typeof target === 'string' ? document.querySelector<HTMLElement>(target) : target;
    if (!targetElement) {
        return false;
    }

    const listenerMap = (event === 'keydown' ? registeredKeydownListeners : registeredKeyupListeners);
    const handler = listenerMap.get(targetElement);
    if (!handler) {
        return false;
    }
    listenerMap.delete(targetElement);
    targetElement.removeEventListener(handler.event, handler.onKeyEvent as any);
    return true;
}

// In order to use this implementation we need to use Map instead os WeakMap
// because we need to be able to iterate over the entries.
//
// export function removeAllListeners() {
//   for (const listener of registeredKeydownListeners) {
//     listener[0].removeEventListener("keydown", listener[1].onKeyEvent as any);
//   }
//   registeredKeydownListeners.clear();
//   for (const listener of registeredKeyupListeners) {
//     listener[0].removeEventListener("keyup", listener[1].onKeyEvent as any);
//   }
// }
