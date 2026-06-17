import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  // Keep GM_* client imports as bare specifiers. vite-plugin-monkey resolves
  // `vite-plugin-monkey/dist/client` to real GM_* globals when it bundles the
  // consuming userscript, so we must NOT inline it here.
  external: ["vite-plugin-monkey/dist/client"],
});
