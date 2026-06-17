// ==UserScript==
// @name         Template Script
// @namespace    https://github.com/YOUR_NAME
// @version      0.1.0
// @description  A minimal userscript template.
// @downloadURL  https://raw.githubusercontent.com/YOUR_NAME/userscripts-monorepo/main/userscripts/template/dist/template.user.js
// @updateURL    https://raw.githubusercontent.com/YOUR_NAME/userscripts-monorepo/main/userscripts/template/dist/template.meta.js
// @match        https://example.com/*
// ==/UserScript==

(function () {
  'use strict';

  function createLogger(scope) {
    const prefix = `%c[${scope}]`;
    const style = "color:#7c3aed;font-weight:bold";
    return {
      info: (...args) => console.log(prefix, style, ...args),
      warn: (...args) => console.warn(prefix, style, ...args),
      error: (...args) => console.error(prefix, style, ...args)
    };
  }
  const log = createLogger("template");
  async function main() {
    log.info("script loaded");
  }
  void main().catch((err) => log.error(err));

})();