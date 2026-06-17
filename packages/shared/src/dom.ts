export interface WaitOptions {
  timeout?: number;
  root?: ParentNode;
}

/** Resolve once a node matching `selector` appears in the DOM. */
export function waitForElement<E extends Element = Element>(
  selector: string,
  { timeout = 10_000, root = document }: WaitOptions = {},
): Promise<E> {
  return new Promise((resolve, reject) => {
    const existing = root.querySelector<E>(selector);
    if (existing) {
      resolve(existing);
      return;
    }
    const observer = new MutationObserver(() => {
      const el = root.querySelector<E>(selector);
      if (el) {
        observer.disconnect();
        resolve(el);
      }
    });
    const target =
      root instanceof Document ? root.documentElement : (root as Element);
    observer.observe(target, { childList: true, subtree: true });
    if (timeout > 0) {
      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`waitForElement timeout: ${selector}`));
      }, timeout);
    }
  });
}
