// src/storage.ts
import {
  GM_getValue,
  GM_setValue,
  GM_deleteValue
} from "vite-plugin-monkey/dist/client";
function createStore(key, initial) {
  return {
    get() {
      return GM_getValue(key, initial);
    },
    set(value) {
      GM_setValue(key, value);
    },
    remove() {
      GM_deleteValue(key);
    }
  };
}

// src/dom.ts
function waitForElement(selector, { timeout = 1e4, root = document } = {}) {
  return new Promise((resolve, reject) => {
    const existing = root.querySelector(selector);
    if (existing) {
      resolve(existing);
      return;
    }
    const observer = new MutationObserver(() => {
      const el = root.querySelector(selector);
      if (el) {
        observer.disconnect();
        resolve(el);
      }
    });
    const target = root instanceof Document ? root.documentElement : root;
    observer.observe(target, { childList: true, subtree: true });
    if (timeout > 0) {
      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`waitForElement timeout: ${selector}`));
      }, timeout);
    }
  });
}

// src/log.ts
function createLogger(scope) {
  const prefix = `%c[${scope}]`;
  const style = "color:#7c3aed;font-weight:bold";
  return {
    info: (...args) => console.log(prefix, style, ...args),
    warn: (...args) => console.warn(prefix, style, ...args),
    error: (...args) => console.error(prefix, style, ...args)
  };
}

// src/clipboard.ts
import { GM_setClipboard } from "vite-plugin-monkey/dist/client";
async function copyText(text) {
  try {
    GM_setClipboard(text, "text");
    return true;
  } catch {
  }
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
    return true;
  } catch {
    return false;
  }
}
export {
  copyText,
  createLogger,
  createStore,
  waitForElement
};
