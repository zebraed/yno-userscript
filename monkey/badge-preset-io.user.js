// ==UserScript==
// @name         YNO Badge Preset IO (Deprecated)
// @namespace    http://tampermonkey.net/
// @version      1.1.0
// @description  Deprecated: Badge preset Export/Import is built into YNO Project. Please uninstall.
// @author       Zebraed
// @tag          Enhancement
// @match        https://ynoproject.net/*
// @icon         https://ynoproject.net/2kki/images/badge/badge_amulet_2.png
// @license      MIT
// @supportURL   https://github.com/Zebraed/yno-userscript
// @installURL   https://raw.githubusercontent.com/Zebraed/yno-userscript/refs/heads/main/monkey/badge-preset-io.user.js
// @updateURL    https://raw.githubusercontent.com/Zebraed/yno-userscript/refs/heads/main/monkey/badge-preset-io.user.js
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';

  const MESSAGE_EN = 'YNO Badge Preset IO is deprecated. Badge preset Export/Import is now built into YNO Project. Please uninstall this Tampermonkey script.';
  const MESSAGE_JA = 'YNO Badge Preset IO は非推奨です。バッジプリセットのエクスポート/インポートは YNO Project に標準搭載されました。Tampermonkey からこのスクリプトを削除してください。';

  function getMessage() {
    const lang = navigator.language || '';
    if (lang.startsWith('ja'))
      return MESSAGE_JA;
    return MESSAGE_EN;
  }

  const message = getMessage();
  console.info(`[YNO Badge Preset IO] ${message}`);

  function tryNotify() {
    if (typeof showToastMessage !== 'function')
      return false;
    showToastMessage(message, 'info', true);
    return true;
  }

  if (tryNotify())
    return;

  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    if (tryNotify() || attempts >= 20)
      clearInterval(timer);
  }, 500);
})();
