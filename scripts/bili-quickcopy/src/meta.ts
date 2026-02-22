import type { UserscriptMeta } from "@us/tools";

const repo = "https://github.com/CN-Aryz/userscripts-monorepo";
const scriptPath = "scripts/bili-quickcopy/dist/bili-quickcopy.user.js";
const rawBase = `${repo}/raw/main/${scriptPath}`;

export const meta: UserscriptMeta = {
  name: "B站VRChat链接复制（下拉选项版）",
  namespace: repo,
  version: "1.0.0",
  description: "B站VRChat链接复制（下拉选项版）",
  author: "Aryz",
  homepageURL: repo,
  supportURL: `${repo}/issues`,
  match: ["https://www.bilibili.com/video/BV*", "https://live.bilibili.com/*"],
  icon: "https://www.bilibili.com/favicon.ico",
  license: "MIT",
  runAt: "document-idle",
  updateURL: rawBase,
  downloadURL: rawBase,
  grant: ["GM_setClipboard"],
};
