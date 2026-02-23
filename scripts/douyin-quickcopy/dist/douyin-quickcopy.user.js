// ==UserScript==
// @name 抖音播放链接快速复制
// @namespace https://github.com/CN-Aryz/userscripts-monorepo
// @version 1.0.1
// @description 在抖音视频页快速复制当前视频的播放链接（优先 MP4/H264）
// @author Aryz
// @match https://www.douyin.com/*
// @icon https://www.douyin.com/favicon.ico
// @license MIT
// @run-at document-start
// @updateURL https://github.com/CN-Aryz/userscripts-monorepo/raw/main/scripts/douyin-quickcopy/dist/douyin-quickcopy.user.js
// @downloadURL https://github.com/CN-Aryz/userscripts-monorepo/raw/main/scripts/douyin-quickcopy/dist/douyin-quickcopy.user.js
// @grant GM_setClipboard
// @grant unsafeWindow
// @homepageURL https://github.com/CN-Aryz/userscripts-monorepo
// @supportURL https://github.com/CN-Aryz/userscripts-monorepo/issues
// ==/UserScript==

(function() {
  "use strict";
  async function copyText(text) {
    if (typeof GM_setClipboard === "function") {
      GM_setClipboard(text, "text");
      return true;
    }
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
    }
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      return true;
    } catch {
      return false;
    }
  }
  const ROOT_ID = "aryz-douyin-copy-root";
  const AWEME_DETAIL_PATH = "/aweme/v1/web/aweme/detail/";
  const AWEME_FEED_PATH = "/aweme/v1/web/tab/feed/";
  const BUTTON_LABEL_READY = "复制当前视频播放链接";
  const BUTTON_LABEL_WAITING = "等待当前视频链接";
  const BUTTON_LABEL_NO_VIDEO = "未识别视频ID";
  const playableUrlByAwemeId = /* @__PURE__ */ new Map();
  let currentAwemeId = null;
  let currentPlayUrl = null;
  let buttonEl = null;
  let resetButtonTimer = null;
  let lastObservedHref = "";
  function getTargetWindow() {
    if (typeof unsafeWindow !== "undefined") {
      return unsafeWindow;
    }
    return window;
  }
  function getCurrentAwemeId() {
    const modalId = new URLSearchParams(location.search).get("modal_id");
    if (modalId && /^\d+$/.test(modalId)) return modalId;
    const pathMatch = location.pathname.match(/\/video\/(\d+)/);
    if (pathMatch?.[1]) return pathMatch[1];
    const feedActiveVideo = document.querySelector(
      '[data-e2e="feed-active-video"]'
    );
    if (feedActiveVideo) {
      const vid = feedActiveVideo.getAttribute("data-e2e-vid");
      if (vid && /^\d+$/.test(vid)) return vid;
    }
    return null;
  }
  function getDouyinApiInfo(rawUrl) {
    let url;
    try {
      url = new URL(rawUrl, location.href);
    } catch {
      return null;
    }
    if (!/(\.|^)douyin\.com$/i.test(url.hostname)) return null;
    if (url.pathname.startsWith(AWEME_DETAIL_PATH)) {
      return { url, type: "detail" };
    }
    if (url.pathname.startsWith(AWEME_FEED_PATH)) {
      return { url, type: "feed" };
    }
    return null;
  }
  function pickPreferredUrl(urlList) {
    if (!Array.isArray(urlList)) return null;
    const cleaned = urlList.filter((url) => Boolean(url));
    if (cleaned.length === 0) return null;
    return cleaned.find((url) => url.includes("/aweme/v1/play/?")) ?? cleaned[0];
  }
  function getMostCompatiblePlayUrl(video) {
    if (!video) return null;
    const urlLists = [];
    urlLists.push(video.play_addr_h264?.url_list);
    const mp4H264Rates = (video.bit_rate ?? []).filter(
      (item) => item.format === "mp4" && item.is_h265 !== 1 && item.is_bytevc1 !== 1
    ).sort((a, b) => (b.bit_rate ?? 0) - (a.bit_rate ?? 0));
    for (const rate of mp4H264Rates) {
      urlLists.push(rate.play_addr?.url_list);
    }
    urlLists.push(video.play_addr?.url_list);
    for (const urlList of urlLists) {
      const preferred = pickPreferredUrl(urlList);
      if (preferred) return preferred;
    }
    return null;
  }
  function updateCurrentVideoState() {
    const nextAwemeId = getCurrentAwemeId();
    if (nextAwemeId === currentAwemeId) return;
    currentAwemeId = nextAwemeId;
    currentPlayUrl = currentAwemeId ? playableUrlByAwemeId.get(currentAwemeId) ?? null : null;
    renderButtonLabel();
  }
  function renderButtonLabel() {
    if (!buttonEl) return;
    if (!currentAwemeId) {
      buttonEl.textContent = BUTTON_LABEL_NO_VIDEO;
      return;
    }
    buttonEl.textContent = currentPlayUrl ? BUTTON_LABEL_READY : BUTTON_LABEL_WAITING;
  }
  function flashButtonLabel(text, background, ms = 1500) {
    if (!buttonEl) return;
    if (resetButtonTimer) {
      clearTimeout(resetButtonTimer);
      resetButtonTimer = null;
    }
    buttonEl.textContent = text;
    buttonEl.style.background = background;
    resetButtonTimer = window.setTimeout(() => {
      if (!buttonEl) return;
      buttonEl.style.background = "#fe2c55";
      renderButtonLabel();
      resetButtonTimer = null;
    }, ms);
  }
  async function onCopyClick() {
    if (!currentAwemeId) {
      flashButtonLabel(
        "未识别到当前视频ID",
        "#9ca3af"
      );
      return;
    }
    if (!currentPlayUrl) {
      flashButtonLabel("链接还没准备好", "#9ca3af");
      return;
    }
    try {
      const success = await copyText(currentPlayUrl);
      flashButtonLabel(
        success ? "复制成功" : "复制失败",
        success ? "#16a34a" : "#dc2626"
      );
    } catch {
      flashButtonLabel("复制失败", "#dc2626");
    }
  }
  function mount() {
    if (document.getElementById(ROOT_ID)) return;
    const root = document.createElement("div");
    root.id = ROOT_ID;
    root.style.position = "fixed";
    root.style.left = "12px";
    root.style.bottom = "12px";
    root.style.zIndex = "999999";
    root.style.fontFamily = "sans-serif";
    const button = document.createElement("button");
    button.type = "button";
    button.style.border = "none";
    button.style.borderRadius = "10px";
    button.style.padding = "10px 14px";
    button.style.fontSize = "14px";
    button.style.fontWeight = "600";
    button.style.color = "#fff";
    button.style.background = "#fe2c55";
    button.style.cursor = "pointer";
    button.style.boxShadow = "0 6px 20px rgba(0, 0, 0, 0.25)";
    button.style.transition = "background .2s ease";
    button.addEventListener("click", () => {
      void onCopyClick();
    });
    root.appendChild(button);
    document.body.appendChild(root);
    buttonEl = button;
    renderButtonLabel();
  }
  function mountWhenReady() {
    if (document.body) {
      mount();
      return;
    }
    window.addEventListener("DOMContentLoaded", mount, { once: true });
  }
  function cacheAwemeVideo(awemeId, video) {
    if (!awemeId) return;
    const playUrl = getMostCompatiblePlayUrl(video ?? void 0);
    if (!playUrl) return;
    playableUrlByAwemeId.set(awemeId, playUrl);
    if (awemeId === currentAwemeId) {
      currentPlayUrl = playUrl;
      renderButtonLabel();
    }
  }
  function cachePlayableUrl(requestUrl, payload) {
    const apiInfo = getDouyinApiInfo(requestUrl);
    if (!apiInfo) return;
    if (apiInfo.type === "detail") {
      const response = payload;
      const awemeId = apiInfo.url.searchParams.get("aweme_id") || response.aweme_detail?.aweme_id;
      cacheAwemeVideo(awemeId, response.aweme_detail?.video);
      return;
    }
    const feedResponse = payload;
    const awemeList = feedResponse.aweme_list;
    if (!Array.isArray(awemeList)) return;
    for (const aweme of awemeList) {
      cacheAwemeVideo(aweme.aweme_id, aweme.video);
    }
  }
  function installFetchInterceptor() {
    const targetWindow = getTargetWindow();
    if (typeof targetWindow.fetch !== "function") return;
    const originalFetch = targetWindow.fetch.bind(targetWindow);
    targetWindow.fetch = (async (...args) => {
      const response = await originalFetch(...args);
      let requestUrl = "";
      const requestInfo = args[0];
      if (typeof requestInfo === "string") {
        requestUrl = requestInfo;
      } else if (requestInfo && typeof requestInfo === "object" && "url" in requestInfo) {
        const maybeUrl = requestInfo.url;
        if (typeof maybeUrl === "string") requestUrl = maybeUrl;
      }
      if (requestUrl && getDouyinApiInfo(requestUrl)) {
        response.clone().json().then((payload) => {
          cachePlayableUrl(requestUrl, payload);
        }).catch(() => {
        });
      }
      return response;
    });
  }
  function installXhrInterceptor() {
    const targetWindow = getTargetWindow();
    const XHR = targetWindow.XMLHttpRequest;
    const open = XHR.prototype.open;
    const send = XHR.prototype.send;
    XHR.prototype.open = function(...args) {
      const urlArg = args[1];
      this.__douyinRequestUrl = typeof urlArg === "string" ? urlArg : urlArg != null ? String(urlArg) : "";
      return open.apply(this, args);
    };
    XHR.prototype.send = function(...args) {
      const requestUrl = this.__douyinRequestUrl ?? "";
      if (!getDouyinApiInfo(requestUrl)) {
        return send.apply(this, args);
      }
      let handled = false;
      const tryCapture = () => {
        if (handled) return;
        try {
          let payload = null;
          if (this.responseType === "json" && this.response) {
            payload = this.response;
          } else if (typeof this.response === "string" && this.response) {
            payload = JSON.parse(this.response);
          } else if (typeof this.responseText === "string" && this.responseText) {
            payload = JSON.parse(this.responseText);
          }
          if (!payload || typeof payload !== "object") return;
          handled = true;
          cachePlayableUrl(requestUrl, payload);
        } catch {
        }
      };
      const timer = window.setInterval(() => {
        if (handled) {
          clearInterval(timer);
          return;
        }
        if (this.readyState === 4) {
          tryCapture();
          clearInterval(timer);
        }
      }, 50);
      this.addEventListener("readystatechange", () => {
        if (this.readyState === 4) {
          tryCapture();
          clearInterval(timer);
        }
      });
      this.addEventListener("load", tryCapture);
      this.addEventListener("loadend", () => {
        tryCapture();
        clearInterval(timer);
      });
      return send.apply(this, args);
    };
  }
  function watchLocationChange() {
    lastObservedHref = location.href;
    window.setInterval(() => {
      const latestAwemeId = getCurrentAwemeId();
      if (latestAwemeId !== currentAwemeId) {
        updateCurrentVideoState();
        return;
      }
      if (location.href !== lastObservedHref) {
        lastObservedHref = location.href;
        updateCurrentVideoState();
        return;
      }
      if (!currentPlayUrl && currentAwemeId) {
        const cached = playableUrlByAwemeId.get(currentAwemeId) ?? null;
        if (cached !== currentPlayUrl) {
          currentPlayUrl = cached;
          renderButtonLabel();
        }
      }
    }, 500);
  }
  function main() {
    updateCurrentVideoState();
    installFetchInterceptor();
    installXhrInterceptor();
    watchLocationChange();
    mountWhenReady();
  }
  main();
})();
