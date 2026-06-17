import { defineConfig } from "vite";
import monkey from "vite-plugin-monkey";
import pkg from "./package.json";

const RAW_BASE =
  "https://raw.githubusercontent.com/CN-Aryz/userscripts-monorepo/main/userscripts/bili-quickcopy/dist";

const shortName = pkg.name.split("/").pop()!; // "bili-quickcopy"

export default defineConfig({
  plugins: [
    monkey({
      entry: "src/main.ts",
      build: {
        fileName: `${shortName}.user.js`,
        metaFileName: true,
      },
      userscript: {
        name: "B站VRChat链接复制（下拉选项版）",
        namespace: "https://github.com/CN-Aryz",
        version: pkg.version,
        description: "B站VRChat链接复制（下拉选项版）",
        author: "Aryz",
        homepageURL: "https://github.com/CN-Aryz/userscripts-monorepo",
        supportURL: "https://github.com/CN-Aryz/userscripts-monorepo/issues",
        match: ["https://www.bilibili.com/video/BV*", "https://live.bilibili.com/*"],
        icon: "https://www.bilibili.com/favicon.ico",
        license: "MIT",
        "run-at": "document-idle",
        updateURL: `${RAW_BASE}/${shortName}.meta.js`,
        downloadURL: `${RAW_BASE}/${shortName}.user.js`,
      },
    }),
  ],
});
