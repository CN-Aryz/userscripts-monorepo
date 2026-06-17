import { defineConfig } from "vite";
import monkey from "vite-plugin-monkey";
import pkg from "./package.json";

const RAW_BASE =
  "https://raw.githubusercontent.com/CN-Aryz/userscripts-monorepo/main/userscripts/douyin-quickcopy/dist";

const shortName = pkg.name.split("/").pop()!; // "douyin-quickcopy"

export default defineConfig({
  plugins: [
    monkey({
      entry: "src/main.ts",
      build: {
        fileName: `${shortName}.user.js`,
        metaFileName: true,
      },
      userscript: {
        name: "抖音播放链接快速复制",
        namespace: "https://github.com/CN-Aryz",
        version: pkg.version,
        description: "在抖音视频页快速复制当前视频的播放链接（优先 MP4/H264）",
        author: "Aryz",
        homepageURL: "https://github.com/CN-Aryz/userscripts-monorepo",
        supportURL: "https://github.com/CN-Aryz/userscripts-monorepo/issues",
        match: ["https://www.douyin.com/*"],
        icon: "https://www.douyin.com/favicon.ico",
        license: "MIT",
        "run-at": "document-start",
        grant: ["unsafeWindow"],
        updateURL: `${RAW_BASE}/${shortName}.meta.js`,
        downloadURL: `${RAW_BASE}/${shortName}.user.js`,
      },
    }),
  ],
});
