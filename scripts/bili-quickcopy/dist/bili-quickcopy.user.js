// ==UserScript==
// @name B站VRChat链接复制（下拉选项版）
// @namespace https://github.com/CN-Aryz/userscripts-monorepo
// @version 1.0.1
// @description B站VRChat链接复制（下拉选项版）
// @author Aryz
// @match https://www.bilibili.com/video/BV*
// @match https://live.bilibili.com/*
// @icon https://www.bilibili.com/favicon.ico
// @license MIT
// @run-at document-idle
// @updateURL https://github.com/CN-Aryz/userscripts-monorepo/raw/main/scripts/bili-quickcopy/dist/bili-quickcopy.user.js
// @downloadURL https://github.com/CN-Aryz/userscripts-monorepo/raw/main/scripts/bili-quickcopy/dist/bili-quickcopy.user.js
// @grant GM_setClipboard
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
  const prefixes = [
    { label: "直接复制当前连接", isDirectLink: true, prefix: "" },
    { label: "纯K", prefix: "http://ckapi.sevenbrothers.cn/bili/api?id=" },
    { label: "api xin", prefix: "http://api.xin.moe/" },
    { label: "Aryz", prefix: "https://vrc.aryz.dpdns.org/bilibili/" }
  ];
  function getQueryString(name) {
    const reg = new RegExp(`(^|&)${name}=([^&]*)(&|$)`, "i");
    const result = window.location.search.slice(1).match(reg);
    if (!result) return null;
    return decodeURIComponent(result[2]);
  }
  function getUrlParameter() {
    const videoRe = /^.*(BV[0-9a-zA-Z]+).*$/;
    const liveRe = /^\/([0-9]+)\?*.*$/;
    const video = videoRe.exec(window.location.pathname);
    const live = liveRe.exec(window.location.pathname);
    let parameter = "";
    if (video && video.length === 2) {
      parameter = video[1];
      const page = getQueryString("p");
      if (page) parameter = `${parameter}/${page}`;
    } else if (live && live.length === 2) {
      parameter = live[1];
    }
    return parameter;
  }
  function updateMainButtonText(mainButton, text) {
    const chineseChars = text.match(/[\u3400-\u9FBF]/g);
    const chineseCount = chineseChars ? chineseChars.length : 0;
    const englishCount = text.length - chineseCount;
    const padding = 16;
    const width = `${chineseCount * 16 + englishCount * 10 + padding}px`;
    mainButton.style.width = width;
    mainButton.textContent = text;
  }
  function mount() {
    if (document.getElementById("aryz-vrchat-copy-root")) return;
    const containerDiv = document.createElement("div");
    containerDiv.id = "aryz-vrchat-copy-root";
    containerDiv.style.position = "fixed";
    containerDiv.style.bottom = "1vh";
    containerDiv.style.left = "0.5vw";
    containerDiv.style.zIndex = "999";
    containerDiv.style.fontSize = "16px";
    containerDiv.style.lineHeight = "16px";
    containerDiv.style.fontFamily = "sans-serif";
    const mainButton = document.createElement("div");
    mainButton.style.boxSizing = "border-box";
    mainButton.style.display = "flex";
    mainButton.style.justifyContent = "center";
    mainButton.style.alignItems = "center";
    mainButton.style.whiteSpace = "nowrap";
    mainButton.style.overflow = "hidden";
    mainButton.style.textOverflow = "ellipsis";
    mainButton.style.background = "#FB7299";
    mainButton.style.color = "#FFF";
    mainButton.style.padding = "6px 8px";
    mainButton.style.borderRadius = "8px";
    mainButton.style.cursor = "pointer";
    mainButton.style.transition = "all 0.3s ease-in";
    updateMainButtonText(mainButton, "复制链接给VRChat使用");
    const menuDiv = document.createElement("div");
    menuDiv.style.position = "absolute";
    menuDiv.style.bottom = "100%";
    menuDiv.style.left = "0";
    menuDiv.style.marginBottom = "4px";
    menuDiv.style.background = "#FFF";
    menuDiv.style.border = "1px solid #ccc";
    menuDiv.style.borderRadius = "4px";
    menuDiv.style.boxShadow = "0 2px 6px rgba(0,0,0,0.2)";
    menuDiv.style.display = "none";
    menuDiv.style.flexDirection = "column";
    menuDiv.style.minWidth = "200px";
    menuDiv.style.fontSize = "14px";
    menuDiv.style.color = "#333";
    menuDiv.style.overflow = "hidden";
    const updateMenu = () => {
      menuDiv.innerHTML = "";
      for (const option of prefixes) {
        const item = document.createElement("div");
        item.textContent = option.label;
        item.style.padding = "8px 12px";
        item.style.cursor = "pointer";
        item.style.borderBottom = "1px solid #eee";
        item.addEventListener("mouseover", () => {
          item.style.background = "#f5f5f5";
        });
        item.addEventListener("mouseout", () => {
          item.style.background = "#FFF";
        });
        item.addEventListener("click", () => {
          const link = option.isDirectLink ? `${window.location.origin}${window.location.pathname}` : `${option.prefix}${getUrlParameter()}`;
          copyText(link).then(() => {
            updateMainButtonText(mainButton, "复制成功");
          }).catch(() => {
            updateMainButtonText(mainButton, "复制失败");
          });
          window.setTimeout(() => {
            menuDiv.style.display = "none";
          }, 300);
          window.setTimeout(() => {
            updateMainButtonText(mainButton, "复制链接给VRChat使用");
          }, 5e3);
        });
        menuDiv.appendChild(item);
      }
    };
    containerDiv.append(mainButton, menuDiv);
    document.body.appendChild(containerDiv);
    updateMenu();
    let hideMenuTimer = null;
    containerDiv.addEventListener("mouseenter", () => {
      if (hideMenuTimer) {
        clearTimeout(hideMenuTimer);
        hideMenuTimer = null;
      }
      menuDiv.style.display = "flex";
    });
    containerDiv.addEventListener("mouseleave", () => {
      hideMenuTimer = window.setTimeout(() => {
        menuDiv.style.display = "none";
        hideMenuTimer = null;
      }, 300);
    });
  }
  mount();
})();
