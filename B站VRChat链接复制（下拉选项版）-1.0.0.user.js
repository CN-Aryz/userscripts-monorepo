// ==UserScript==
// @name         B站VRChat链接复制（下拉选项版）
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  B站VRChat链接复制（下拉选项版）
// @author       Aryz
// @match        https://www.bilibili.com/video/BV*
// @match        https://live.bilibili.com/*
// @grant        none
// ==/UserScript==
(() => {
  // src/index.ts
  var prefixes = [
    { label: "\u76F4\u63A5\u590D\u5236\u5F53\u524D\u8FDE\u63A5", isDirectLink: true, prefix: "" },
    { label: "\u7EAFK", prefix: "http://ckapi.sevenbrothers.cn/bili/api?id=" },
    { label: "api xin", prefix: "http://api.xin.moe/" },
    { label: "\u5907\u7528\u94FE\u63A5", prefix: "http://anotherprefix.com/link?id=" }
  ];
  function getQueryString(name) {
    let reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)", "i");
    let r = window.location.search.substr(1).match(reg);
    if (r != null) {
      return decodeURIComponent(r[2]);
    }
    return null;
  }
  function getUrlParameter() {
    const re = /^.*(BV[0-9a-zA-Z]+).*$/;
    const re2 = /^\/([0-9]+)\?*.*$/;
    const uri = re.exec(window.location.pathname);
    const uri2 = re2.exec(window.location.pathname);
    let parameter = "";
    if (uri && uri.length === 2) {
      parameter = uri[1];
      let page = getQueryString("p");
      if (page) parameter = parameter + "/" + page;
    } else if (uri2 && uri2.length === 2) {
      parameter = uri2[1];
    }
    return parameter;
  }
  var containerDiv = document.createElement("div");
  containerDiv.style.position = "fixed";
  containerDiv.style.bottom = "1vh";
  containerDiv.style.left = "0.5vw";
  containerDiv.style.zIndex = "999";
  containerDiv.style.fontSize = "16px";
  containerDiv.style.lineHeight = "16px";
  containerDiv.style.fontFamily = "sans-serif";
  var mainButton = document.createElement("div");
  mainButton.textContent = "\u590D\u5236\u94FE\u63A5\u7ED9VRChat\u4F7F\u7528";
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
  function updateMainButtonText(newText) {
    const numChinese = newText.match(/[\u3400-\u9FBF]/g) ? newText.match(/[\u3400-\u9FBF]/g).length : 0;
    const numEnglish = newText.length - numChinese;
    const padding = 16;
    const width = numChinese * 16 + numEnglish * 10 + padding + "px";
    mainButton.style.width = width;
    mainButton.textContent = newText;
  }
  updateMainButtonText("\u590D\u5236\u94FE\u63A5\u7ED9VRChat\u4F7F\u7528");
  var menuDiv = document.createElement("div");
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
  function updateMenu() {
    menuDiv.innerHTML = "";
    prefixes.forEach((option) => {
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
        const link = option.isDirectLink ? window.location.origin + window.location.pathname : option.prefix + getUrlParameter();
        navigator.clipboard.writeText(link).then(() => {
          updateMainButtonText("\u590D\u5236\u6210\u529F");
        }).catch(() => {
          updateMainButtonText("\u590D\u5236\u5931\u8D25");
        });
        setTimeout(() => {
          menuDiv.style.display = "none";
        }, 300);
        setTimeout(() => {
          updateMainButtonText("\u590D\u5236\u94FE\u63A5\u7ED9VRChat\u4F7F\u7528");
        }, 5e3);
      });
      menuDiv.appendChild(item);
    });
  }
  containerDiv.appendChild(mainButton);
  containerDiv.appendChild(menuDiv);
  document.body.appendChild(containerDiv);
  updateMenu();
  var hideMenuTimer = null;
  containerDiv.addEventListener("mouseenter", () => {
    if (hideMenuTimer) {
      clearTimeout(hideMenuTimer);
      hideMenuTimer = null;
    }
    menuDiv.style.display = "flex";
  });
  containerDiv.addEventListener("mouseleave", () => {
    hideMenuTimer = setTimeout(() => {
      menuDiv.style.display = "none";
      hideMenuTimer = null;
    }, 300);
  });
})();