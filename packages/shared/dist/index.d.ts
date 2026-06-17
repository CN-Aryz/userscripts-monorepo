/** Typed wrapper around Tampermonkey's GM value store. */
declare function createStore<T>(key: string, initial: T): {
    get(): T;
    set(value: T): void;
    remove(): void;
};

interface WaitOptions {
    timeout?: number;
    root?: ParentNode;
}
/** Resolve once a node matching `selector` appears in the DOM. */
declare function waitForElement<E extends Element = Element>(selector: string, { timeout, root }?: WaitOptions): Promise<E>;

declare function createLogger(scope: string): {
    info: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
};

declare function copyText(text: string): Promise<boolean>;

export { type WaitOptions, copyText, createLogger, createStore, waitForElement };
