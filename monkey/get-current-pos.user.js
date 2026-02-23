// ==UserScript==
// @name         YNO Get Current Position
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Show current map ID and player X,Y below the location text in the chat box info on YNO games.
// @author       Zebraed
// @tag          Debug
// @match        https://ynoproject.net/*
// @icon         https://ynoproject.net/2kki/images/badge/compass.png
// @license      MIT
// @supportURL   https://github.com/Zebraed/yno-userscript
// @installURL   https://raw.githubusercontent.com/Zebraed/yno-userscript/refs/heads/main/monkey/get-current-pos.js
// @updateURL    https://raw.githubusercontent.com/Zebraed/yno-userscript/refs/heads/main/monkey/get-current-pos.js
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';

  const POSITION_ELEMENT_ID = 'playerPositionInfo';
  const UPDATE_INTERVAL_MS = 100;

  let textElement = null;
  let updateIntervalId = null;

  function getCurrentPosition() {
    try {
      const mapId = cachedMapId;

      if (!mapId) {
        return null;
      }

      if (!easyrpgPlayer?.api?.getPlayerCoords) {
        return null;
      }

      const coords = easyrpgPlayer.api.getPlayerCoords();
      if (!Array.isArray(coords) || coords.length < 2) {
        return null;
      }

      return {
        mapId: mapId,
        x: coords[0],
        y: coords[1]
      };
    } catch (e) {
      return null;
    }
  }

  function ensurePositionElement() {
    if (textElement) {
      return textElement;
    }

    const wrapper = document.createElement('div');
    wrapper.id = POSITION_ELEMENT_ID;
    wrapper.className = 'info';

    const textSpan = document.createElement('span');
    textSpan.id = POSITION_ELEMENT_ID + 'Text';
    textSpan.className = 'infoText nofilter';
    textSpan.style.textAlign = 'right';
    textSpan.textContent = '(initializing...)';
    wrapper.appendChild(textSpan);

    const chatboxInfo = document.getElementById('chatboxInfo');
    if (chatboxInfo) {
      chatboxInfo.appendChild(wrapper);
    }

    textElement = textSpan;
    return textSpan;
  }

  function formatPositionText(pos) {
    if (!pos) {
      return 'Position: (waiting for player...)';
    }
    const { mapId, x, y } = pos;
    return `MapID: ${mapId}   X: ${x}   Y: ${y}`;
  }

  function startUpdater() {
    if (updateIntervalId) {
      return;
    }

    const tick = () => {
      const pos = getCurrentPosition();
      textElement.textContent = formatPositionText(pos);
    };

    tick();
    updateIntervalId = setInterval(tick, UPDATE_INTERVAL_MS);
  }

  function initWhenReady() {
    const chatboxInfo = document.getElementById('chatboxInfo');
    if (!chatboxInfo) {
      setTimeout(initWhenReady, 500);
      return;
    }

    ensurePositionElement();
    startUpdater();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWhenReady);
  } else {
    initWhenReady();
  }
})();