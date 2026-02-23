import { copyText } from "@us/shared";

type UrlListContainer = {
  url_list?: string[];
};

type BitRateItem = {
  format?: string;
  bit_rate?: number;
  is_h265?: number;
  is_bytevc1?: number;
  play_addr?: UrlListContainer;
};

type DouyinVideo = {
  play_addr_h264?: UrlListContainer;
  play_addr?: UrlListContainer;
  bit_rate?: BitRateItem[];
};

type AwemeDetailResponse = {
  aweme_detail?: {
    aweme_id?: string;
    video?: DouyinVideo;
  };
};

type TrackedXHR = XMLHttpRequest & {
  __douyinRequestUrl?: string;
};

const ROOT_ID = "aryz-douyin-copy-root";
const AWEME_DETAIL_PATH = "/aweme/v1/web/aweme/detail/";

const BUTTON_LABEL_READY = "\u590d\u5236\u5f53\u524d\u89c6\u9891\u64ad\u653e\u94fe\u63a5";
const BUTTON_LABEL_WAITING = "\u7b49\u5f85\u5f53\u524d\u89c6\u9891\u94fe\u63a5";
const BUTTON_LABEL_NO_VIDEO = "\u672a\u8bc6\u522b\u89c6\u9891ID";

const playableUrlByAwemeId = new Map<string, string>();

let currentAwemeId: string | null = null;
let currentPlayUrl: string | null = null;

let buttonEl: HTMLButtonElement | null = null;
let resetButtonTimer: number | null = null;
let lastObservedHref = "";

function getTargetWindow(): Window & typeof globalThis {
  if (typeof unsafeWindow !== "undefined") {
    return unsafeWindow as Window & typeof globalThis;
  }
  return window;
}

function getCurrentAwemeId(): string | null {
  const pathMatch = location.pathname.match(/\/video\/(\d+)/);
  if (pathMatch?.[1]) return pathMatch[1];

  const modalId = new URLSearchParams(location.search).get("modal_id");
  if (modalId && /^\d+$/.test(modalId)) return modalId;

  return null;
}

function isDouyinDetailApi(rawUrl: string): URL | null {
  let url: URL;
  try {
    url = new URL(rawUrl, location.href);
  } catch {
    return null;
  }

  if (!/(\.|^)douyin\.com$/i.test(url.hostname)) return null;
  if (!url.pathname.startsWith(AWEME_DETAIL_PATH)) return null;
  return url;
}

function pickPreferredUrl(urlList: string[] | undefined): string | null {
  if (!Array.isArray(urlList)) return null;

  const cleaned = urlList.filter((url): url is string => Boolean(url));
  if (cleaned.length === 0) return null;

  return cleaned.find((url) => url.includes("/aweme/v1/play/?")) ?? cleaned[0];
}

function getMostCompatiblePlayUrl(video: DouyinVideo | undefined): string | null {
  if (!video) return null;

  const urlLists: Array<string[] | undefined> = [];

  urlLists.push(video.play_addr_h264?.url_list);

  const mp4H264Rates = (video.bit_rate ?? [])
    .filter((item) => item.format === "mp4" && item.is_h265 !== 1 && item.is_bytevc1 !== 1)
    .sort((a, b) => (b.bit_rate ?? 0) - (a.bit_rate ?? 0));

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

function flashButtonLabel(text: string, background: string, ms = 1500) {
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
    flashButtonLabel("\u672a\u8bc6\u522b\u5230\u5f53\u524d\u89c6\u9891ID", "#9ca3af");
    return;
  }

  if (!currentPlayUrl) {
    flashButtonLabel("\u94fe\u63a5\u8fd8\u6ca1\u51c6\u5907\u597d", "#9ca3af");
    return;
  }

  try {
    const success = await copyText(currentPlayUrl);
    flashButtonLabel(success ? "\u590d\u5236\u6210\u529f" : "\u590d\u5236\u5931\u8d25", success ? "#16a34a" : "#dc2626");
  } catch {
    flashButtonLabel("\u590d\u5236\u5931\u8d25", "#dc2626");
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

function cachePlayableUrl(requestUrl: string, payload: unknown) {
  const apiUrl = isDouyinDetailApi(requestUrl);
  if (!apiUrl) return;

  const response = payload as AwemeDetailResponse;
  const awemeId = apiUrl.searchParams.get("aweme_id") || response.aweme_detail?.aweme_id;
  if (!awemeId) return;

  const playUrl = getMostCompatiblePlayUrl(response.aweme_detail?.video);
  if (!playUrl) return;

  playableUrlByAwemeId.set(awemeId, playUrl);

  if (awemeId === currentAwemeId) {
    currentPlayUrl = playUrl;
    renderButtonLabel();
  }
}

function installFetchInterceptor() {
  const targetWindow = getTargetWindow();
  if (typeof targetWindow.fetch !== "function") return;

  const originalFetch = targetWindow.fetch.bind(targetWindow);
  targetWindow.fetch = (async (...args: Parameters<typeof fetch>) => {
    const response = await originalFetch(...args);

    let requestUrl = "";
    const requestInfo = args[0];
    if (typeof requestInfo === "string") {
      requestUrl = requestInfo;
    } else if (requestInfo && typeof requestInfo === "object" && "url" in requestInfo) {
      const maybeUrl = (requestInfo as { url?: unknown }).url;
      if (typeof maybeUrl === "string") requestUrl = maybeUrl;
    }

    if (requestUrl && isDouyinDetailApi(requestUrl)) {
      response
        .clone()
        .json()
        .then((payload) => {
          cachePlayableUrl(requestUrl, payload);
        })
        .catch(() => {});
    }

    return response;
  }) as typeof fetch;
}

function installXhrInterceptor() {
  const targetWindow = getTargetWindow();
  const XHR = targetWindow.XMLHttpRequest;

  const open = XHR.prototype.open;
  const send = XHR.prototype.send;

  XHR.prototype.open = function (this: TrackedXHR, ...args: unknown[]) {
    const urlArg = args[1];
    this.__douyinRequestUrl =
      typeof urlArg === "string" ? urlArg : urlArg != null ? String(urlArg) : "";
    return open.apply(this, args as Parameters<XMLHttpRequest["open"]>);
  };

  XHR.prototype.send = function (this: TrackedXHR, ...args: unknown[]) {
    const requestUrl = this.__douyinRequestUrl ?? "";
    if (!isDouyinDetailApi(requestUrl)) {
      return send.apply(this, args as Parameters<XMLHttpRequest["send"]>);
    }

    let handled = false;

    const tryCapture = () => {
      if (handled) return;

      try {
        let payload: unknown = null;

        if (this.responseType === "json" && this.response) {
          payload = this.response;
        } else if (typeof this.response === "string" && this.response) {
          payload = JSON.parse(this.response) as unknown;
        } else if (typeof this.responseText === "string" && this.responseText) {
          payload = JSON.parse(this.responseText) as unknown;
        }

        if (!payload || typeof payload !== "object") return;

        handled = true;
        cachePlayableUrl(requestUrl, payload);
      } catch {}
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

    return send.apply(this, args as Parameters<XMLHttpRequest["send"]>);
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
