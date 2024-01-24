export const isBrowser = typeof document !== 'undefined';

export function randomID(): string {
  return crypto.getRandomValues(new Uint32Array(1))[0].toString(16);
}

function _log(type: 'log' | 'info' | 'warn' | 'error', ...args: any[]): void {
  console[type](...args);
}

export const log = process.env.NODE_ENV === 'development' ? _log : undefined;

export function shortcutToKbd(shortcut: string) {
  const parts = shortcut.split('+');
  const kdbs: string[] = [];

  for (const part of parts) {
    if (part === '$mod') {
      kdbs.push('Ctrl');
    } else if (part === 'Shift') {
      kdbs.push('Shift');
    } else if (part === 'Ctrl') {
      kdbs.push('Ctrl');
    } else if (part === 'Alt') {
      kdbs.push('Alt');
    } else {
      kdbs.push(part);
    }
  }

  return kdbs;
}
