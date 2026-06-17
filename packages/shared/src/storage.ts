import {
  GM_getValue,
  GM_setValue,
  GM_deleteValue,
} from "vite-plugin-monkey/dist/client";

/** Typed wrapper around Tampermonkey's GM value store. */
export function createStore<T>(key: string, initial: T) {
  return {
    get(): T {
      return GM_getValue(key, initial);
    },
    set(value: T): void {
      GM_setValue(key, value);
    },
    remove(): void {
      GM_deleteValue(key);
    },
  };
}
