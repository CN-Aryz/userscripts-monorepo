export function createLogger(scope: string) {
  const prefix = `%c[${scope}]`;
  const style = "color:#7c3aed;font-weight:bold";
  return {
    info: (...args: unknown[]) => console.log(prefix, style, ...args),
    warn: (...args: unknown[]) => console.warn(prefix, style, ...args),
    error: (...args: unknown[]) => console.error(prefix, style, ...args),
  };
}
