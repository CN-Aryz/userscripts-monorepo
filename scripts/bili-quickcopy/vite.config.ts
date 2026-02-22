import path from "node:path";
import { defineConfig } from "vite";
import { meta } from "./src/meta";
import { metaToHeader, userscriptHeaderInject } from "@us/tools";

const fileName = "bili-quickcopy.user.js";

export default defineConfig({
  plugins: [userscriptHeaderInject(metaToHeader(meta), fileName)],
  build: {
    outDir: path.resolve(process.cwd(), "dist"),
    emptyOutDir: true,
    minify: false,
    rollupOptions: {
      input: path.resolve(process.cwd(), "src/main.ts"),
      output: {
        format: "iife",
        entryFileNames: fileName,
      },
    },
  },
});
