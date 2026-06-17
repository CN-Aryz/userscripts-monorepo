import { defineConfig } from "vite";
import monkey from "vite-plugin-monkey";
import pkg from "./package.json";

const SCRIPT_NAME = "template"; // change to your script slug
const RAW_BASE = `https://raw.githubusercontent.com/YOUR_NAME/userscripts-monorepo/main/userscripts/${SCRIPT_NAME}/dist`;

export default defineConfig({
  plugins: [
    monkey({
      entry: "src/main.ts",
      build: {
        fileName: `${SCRIPT_NAME}.user.js`,
        metaFileName: true,
      },
      userscript: {
        name: "Template Script",
        namespace: "https://github.com/YOUR_NAME",
        version: pkg.version,
        description: "A minimal userscript template.",
        match: ["https://example.com/*"],
        updateURL: `${RAW_BASE}/${SCRIPT_NAME}.meta.js`,
        downloadURL: `${RAW_BASE}/${SCRIPT_NAME}.user.js`,
      },
    }),
  ],
});
