import { tick } from "svelte";

export const use_noop = () => {
    return {
        destroy() { },
        update() { }
    };
};

/**
 * Original source: https://github.com/romkor/svelte-portal/blob/a650e7b762344a1bb0ad9e218660ed1ee66e3f90/src/Portal.svelte
 */
export function use_portal(el: HTMLElement, target: HTMLElement | string | false | undefined) {
    if (typeof target !== 'string' && !(target instanceof HTMLElement)) {
        if (target === false) {
            el.hidden = false;
        }
        return {
            destroy() { },
            update() { }
        };
    }

    let targetEl;

    async function update(newTarget: HTMLElement | string | false | undefined) {
        const document = el.ownerDocument;
        target = newTarget;
        if (newTarget === undefined) {
            el.hidden = true;
            return;
        }

        if (newTarget === false) {
            el.hidden = false;
            return;
        }

        if (typeof target === "string") {
            targetEl = document.querySelector(target);
            if (targetEl === null) {
                await tick();
                targetEl = document.querySelector(target);
            }
            if (targetEl === null) {
                throw new Error(
                    `No element found matching css selector: "${target}"`
                );
            }
        }
        else if (target instanceof HTMLElement) {
            targetEl = target;
        }
        else {
            throw new TypeError(
                `Unknown portal target type: ${target === null ? "null" : typeof target
                }. Allowed types: string (CSS selector), HTMLElement or "false".`
            );
        }
        targetEl.appendChild(el);
        el.hidden = false;
    }

    function destroy() {
        if (el.parentNode) {
            el.parentNode.removeChild(el);
        }
    }

    update(target);

    return {
        update,
        destroy,
    };
}

type ClickTypeToEvent = {
    click: MouseEvent;
    pointerdown: PointerEvent;
    pointerup: PointerEvent;
};

export type UseClickOutsideOptions<K extends keyof ClickTypeToEvent> = {
    type?: K;
    handler: (event: ClickTypeToEvent[K]) => void;
};

export function use_clickoutside<K extends keyof ClickTypeToEvent>(el: HTMLElement, options: UseClickOutsideOptions<K>) {
    const document = el.ownerDocument;
    let event_type = (options.type || "click") as K;
    let event_handler = options.handler;

    function on_event(event: ClickTypeToEvent[K]) {
        if (!el.contains(event.target as Node) && !event.defaultPrevented) {
            event_handler(event);
        }
    }

    const config = { passive: false, capture: true };
    document.addEventListener(event_type, on_event, config);

    return {
        destroy() {
            document.removeEventListener(event_type, on_event, config);
        },
        update(updated: Partial<UseClickOutsideOptions<K>>) {
            if (!updated.type) {
                updated.type = event_type;
            }
            if (updated.type !== event_type) {
                document.removeEventListener(event_type, on_event, config);
                event_type = updated.type;
                document.addEventListener(event_type, on_event, config);
            }
            if (updated.handler) {
                event_handler = updated.handler;
            }
        }
    };
}
