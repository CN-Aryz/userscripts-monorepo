import type { UserscriptMeta } from "@us/tools";

const repo = "https://github.com/CN-Aryz/userscripts-monorepo";
const scriptPath = "scripts/douyin-quickcopy/dist/douyin-quickcopy.user.js";
const rawBase = `${repo}/raw/main/${scriptPath}`;

export const meta: UserscriptMeta = {
  name: "抖音播放链接快速复制",
  namespace: repo,
  version: "1.0.1",
  description: "在抖音视频页快速复制当前视频的播放链接（优先 MP4/H264）",
  author: "Aryz",
  homepageURL: repo,
  supportURL: `${repo}/issues`,
  match: ["https://www.douyin.com/video/*"],
  icon: "https://www.douyin.com/favicon.ico",
  license: "MIT",
  runAt: "document-start",
  updateURL: rawBase,
  downloadURL: rawBase,
  grant: ["GM_setClipboard", "unsafeWindow"],
};
