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

type AwemeFeedResponse = {
  aweme_list?: Array<{
    aweme_id?: string;
    video?: DouyinVideo | null;
  }>;
};

type DouyinApiType = "detail" | "feed";

type TrackedXHR = XMLHttpRequest & {
  __douyinRequestUrl?: string;
};

type CopyMode = "play" | "direct";

type CopyOption = {
  label: string;
  mode: CopyMode;
  disabled: boolean;
};

const ROOT_ID = "aryz-douyin-copy-root";
const AWEME_DETAIL_PATH = "/aweme/v1/web/aweme/detail/";
const AWEME_FEED_PATHS = [
  "/aweme/v1/web/tab/feed/",
  "/aweme/v2/web/module/feed/",
];

const DIRECT_LINK_PREFIX = "https://vrc.aryz.dpdns.org/douyin/";
const MAIN_BUTTON_TEXT_DEFAULT = "复制抖音链接给VRChat使用";
const MAIN_BUTTON_SUCCESS = "复制成功";
const MAIN_BUTTON_FAILED = "复制失败";
const MAIN_BUTTON_IDLE_BG = "#fe2c55";
const MENU_LABEL_PLAY_READY = "复制直链";
const MENU_LABEL_PLAY_NO_VIDEO = "复制直链（未识别视频ID）";
const MENU_LABEL_PLAY_WAITING = "复制直链（等待解析）";
const MENU_LABEL_DIRECT_READY = "复制解析链接（推荐）";
const MENU_LABEL_DIRECT_WAITING = "复制解析链接（未识别视频ID）";
const FLASH_NO_VIDEO_ID = "未识别到当前视频ID";
const FLASH_PLAY_WAITING = "播放链接还没准备好";

const playableUrlByAwemeId = new Map<string, string>();

let currentAwemeId: string | null = null;
let currentPlayUrl: string | null = null;

let mainButtonEl: HTMLDivElement | null = null;
let menuEl: HTMLDivElement | null = null;
let hideMenuTimer: number | null = null;
let resetMainButtonTimer: number | null = null;
let lastObservedHref = "";

function getTargetWindow(): Window & typeof globalThis {
  if (typeof unsafeWindow !== "undefined") {
    return unsafeWindow as Window & typeof globalThis;
  }
  return window;
}

function getCurrentAwemeId(): string | null {
  const modalId = new URLSearchParams(location.search).get("modal_id");
  if (modalId && /^\d+$/.test(modalId)) return modalId;

  const pathMatch = location.pathname.match(/\/video\/(\d+)/);
  if (pathMatch?.[1]) return pathMatch[1];

  const feedActiveVideo = document.querySelector<HTMLElement>(
    '[data-e2e="feed-active-video"]',
  );
  if (feedActiveVideo) {
    const vid = feedActiveVideo.getAttribute("data-e2e-vid");
    if (vid && /^\d+$/.test(vid)) return vid;
  }

  return null;
}

function getDouyinApiInfo(
  rawUrl: string,
): { url: URL; type: DouyinApiType } | null {
  let url: URL;
  try {
    url = new URL(rawUrl, location.href);
  } catch {
    return null;
  }

  if (!/(\.|^)douyin\.com$/i.test(url.hostname)) return null;
  if (url.pathname.startsWith(AWEME_DETAIL_PATH)) {
    return { url, type: "detail" };
  }
  if (AWEME_FEED_PATHS.some((path) => url.pathname.startsWith(path))) {
    return { url, type: "feed" };
  }
  return null;
}

function pickPreferredUrl(urlList: string[] | undefined): string | null {
  if (!Array.isArray(urlList)) return null;

  const cleaned = urlList.filter((url): url is string => Boolean(url));
  if (cleaned.length === 0) return null;

  return cleaned.find((url) => url.includes("/aweme/v1/play/?")) ?? cleaned[0];
}

function getMostCompatiblePlayUrl(
  video: DouyinVideo | undefined,
): string | null {
  if (!video) return null;

  const urlLists: Array<string[] | undefined> = [];

  urlLists.push(video.play_addr_h264?.url_list);

  const mp4H264Rates = (video.bit_rate ?? [])
    .filter(
      (item) =>
        item.format === "mp4" && item.is_h265 !== 1 && item.is_bytevc1 !== 1,
    )
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

function updateMainButtonText(text: string) {
  if (!mainButtonEl) return;

  const chineseChars = text.match(/[\u3400-\u9FBF]/g);
  const chineseCount = chineseChars ? chineseChars.length : 0;
  const englishCount = text.length - chineseCount;
  const width = `${chineseCount * 16 + englishCount * 10 + 16}px`;

  mainButtonEl.style.width = width;
  mainButtonEl.textContent = text;
}

function resetMainButtonState() {
  if (!mainButtonEl) return;

  mainButtonEl.style.background = MAIN_BUTTON_IDLE_BG;
  updateMainButtonText(MAIN_BUTTON_TEXT_DEFAULT);
}

function flashMainButtonLabel(text: string, background: string, ms = 1500) {
  if (!mainButtonEl) return;

  if (resetMainButtonTimer) {
    clearTimeout(resetMainButtonTimer);
    resetMainButtonTimer = null;
  }

  mainButtonEl.style.background = background;
  updateMainButtonText(text);

  resetMainButtonTimer = window.setTimeout(() => {
    resetMainButtonState();
    resetMainButtonTimer = null;
  }, ms);
}

function getCopyOptions(): CopyOption[] {
  const playLabel = !currentAwemeId
    ? MENU_LABEL_PLAY_NO_VIDEO
    : currentPlayUrl
      ? MENU_LABEL_PLAY_READY
      : MENU_LABEL_PLAY_WAITING;

  return [
    {
      label: playLabel,
      mode: "play",
      disabled: !currentAwemeId || !currentPlayUrl,
    },
    {
      label: currentAwemeId
        ? MENU_LABEL_DIRECT_READY
        : MENU_LABEL_DIRECT_WAITING,
      mode: "direct",
      disabled: !currentAwemeId,
    },
  ];
}

function hideMenu() {
  if (!menuEl) return;
  menuEl.style.display = "none";
}

async function onCopyClick(mode: CopyMode) {
  hideMenu();

  let target = "";
  if (mode === "play") {
    if (!currentAwemeId) {
      flashMainButtonLabel(FLASH_NO_VIDEO_ID, "#9ca3af");
      return;
    }
    if (!currentPlayUrl) {
      flashMainButtonLabel(FLASH_PLAY_WAITING, "#9ca3af");
      return;
    }
    target = currentPlayUrl;
  } else {
    if (!currentAwemeId) {
      flashMainButtonLabel(FLASH_NO_VIDEO_ID, "#9ca3af");
      return;
    }
    target = `${DIRECT_LINK_PREFIX}${currentAwemeId}`;
  }

  try {
    const success = await copyText(target);
    flashMainButtonLabel(
      success ? MAIN_BUTTON_SUCCESS : MAIN_BUTTON_FAILED,
      success ? "#16a34a" : "#dc2626",
    );
  } catch {
    flashMainButtonLabel(MAIN_BUTTON_FAILED, "#dc2626");
  }
}

function renderMenuOptions() {
  if (!menuEl) return;

  menuEl.innerHTML = "";
  const options = getCopyOptions();

  for (const [index, option] of options.entries()) {
    const item = document.createElement("div");
    item.textContent = option.label;
    item.style.padding = "8px 12px";
    item.style.cursor = option.disabled ? "not-allowed" : "pointer";
    item.style.color = option.disabled ? "#9ca3af" : "#333";
    if (index !== options.length - 1) {
      item.style.borderBottom = "1px solid #eee";
    }

    item.addEventListener("mouseover", () => {
      item.style.background = option.disabled ? "#FFF" : "#f5f5f5";
    });
    item.addEventListener("mouseout", () => {
      item.style.background = "#FFF";
    });

    item.addEventListener("click", () => {
      void onCopyClick(option.mode);
    });

    menuEl.appendChild(item);
  }
}

function syncCopyUi() {
  renderMenuOptions();
  if (!resetMainButtonTimer) {
    resetMainButtonState();
  }
}

function updateCurrentVideoState() {
  const nextAwemeId = getCurrentAwemeId();
  if (nextAwemeId === currentAwemeId) return;

  currentAwemeId = nextAwemeId;
  currentPlayUrl = currentAwemeId
    ? (playableUrlByAwemeId.get(currentAwemeId) ?? null)
    : null;
  syncCopyUi();
}

function mount() {
  if (document.getElementById(ROOT_ID)) return;

  const containerDiv = document.createElement("div");
  containerDiv.id = ROOT_ID;
  containerDiv.style.position = "fixed";
  containerDiv.style.left = "12px";
  containerDiv.style.bottom = "12px";
  containerDiv.style.zIndex = "999999";
  containerDiv.style.fontFamily = "sans-serif";
  containerDiv.style.fontSize = "16px";
  containerDiv.style.lineHeight = "16px";

  const mainButton = document.createElement("div");
  mainButton.style.boxSizing = "border-box";
  mainButton.style.display = "flex";
  mainButton.style.justifyContent = "center";
  mainButton.style.alignItems = "center";
  mainButton.style.whiteSpace = "nowrap";
  mainButton.style.overflow = "hidden";
  mainButton.style.textOverflow = "ellipsis";
  mainButton.style.background = MAIN_BUTTON_IDLE_BG;
  mainButton.style.color = "#FFF";
  mainButton.style.padding = "8px 10px";
  mainButton.style.borderRadius = "10px";
  mainButton.style.cursor = "pointer";
  mainButton.style.transition = "all 0.2s ease";
  mainButton.style.boxShadow = "0 6px 20px rgba(0, 0, 0, 0.25)";

  const dropdown = document.createElement("div");
  dropdown.style.position = "absolute";
  dropdown.style.bottom = "100%";
  dropdown.style.left = "0";
  dropdown.style.marginBottom = "4px";
  dropdown.style.background = "#FFF";
  dropdown.style.border = "1px solid #ccc";
  dropdown.style.borderRadius = "6px";
  dropdown.style.boxShadow = "0 2px 6px rgba(0,0,0,0.2)";
  dropdown.style.display = "none";
  dropdown.style.flexDirection = "column";
  dropdown.style.minWidth = "220px";
  dropdown.style.fontSize = "14px";
  dropdown.style.color = "#333";
  dropdown.style.overflow = "hidden";

  containerDiv.append(mainButton, dropdown);
  document.body.appendChild(containerDiv);

  mainButtonEl = mainButton;
  menuEl = dropdown;
  syncCopyUi();

  mainButton.addEventListener("click", () => {
    if (!menuEl) return;
    menuEl.style.display = menuEl.style.display === "flex" ? "none" : "flex";
  });

  containerDiv.addEventListener("mouseenter", () => {
    if (hideMenuTimer) {
      clearTimeout(hideMenuTimer);
      hideMenuTimer = null;
    }
    if (!menuEl) return;
    menuEl.style.display = "flex";
  });

  containerDiv.addEventListener("mouseleave", () => {
    hideMenuTimer = window.setTimeout(() => {
      hideMenu();
      hideMenuTimer = null;
    }, 300);
  });
}

function mountWhenReady() {
  if (document.body) {
    mount();
    return;
  }

  window.addEventListener("DOMContentLoaded", mount, { once: true });
}

function cacheAwemeVideo(
  awemeId: string | undefined,
  video: DouyinVideo | null | undefined,
) {
  if (!awemeId) return;

  const playUrl = getMostCompatiblePlayUrl(video ?? undefined);
  if (!playUrl) return;

  playableUrlByAwemeId.set(awemeId, playUrl);

  if (awemeId === currentAwemeId) {
    currentPlayUrl = playUrl;
    syncCopyUi();
  }
}

function cachePlayableUrl(requestUrl: string, payload: unknown) {
  const apiInfo = getDouyinApiInfo(requestUrl);
  if (!apiInfo) return;

  if (apiInfo.type === "detail") {
    const response = payload as AwemeDetailResponse;
    const awemeId =
      apiInfo.url.searchParams.get("aweme_id") ||
      response.aweme_detail?.aweme_id;
    cacheAwemeVideo(awemeId, response.aweme_detail?.video);
    return;
  }

  const feedResponse = payload as AwemeFeedResponse;
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
  targetWindow.fetch = (async (...args: Parameters<typeof fetch>) => {
    const response = await originalFetch(...args);

    let requestUrl = "";
    const requestInfo = args[0];
    if (typeof requestInfo === "string") {
      requestUrl = requestInfo;
    } else if (
      requestInfo &&
      typeof requestInfo === "object" &&
      "url" in requestInfo
    ) {
      const maybeUrl = (requestInfo as { url?: unknown }).url;
      if (typeof maybeUrl === "string") requestUrl = maybeUrl;
    }

    if (requestUrl && getDouyinApiInfo(requestUrl)) {
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
      typeof urlArg === "string"
        ? urlArg
        : urlArg != null
          ? String(urlArg)
          : "";
    return open.apply(this, args as Parameters<XMLHttpRequest["open"]>);
  };

  XHR.prototype.send = function (this: TrackedXHR, ...args: unknown[]) {
    const requestUrl = this.__douyinRequestUrl ?? "";
    if (!getDouyinApiInfo(requestUrl)) {
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
        syncCopyUi();
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
