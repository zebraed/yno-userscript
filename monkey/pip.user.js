// ==UserScript==
// @name         YNO Picture in Picture
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Picture in Picture for YNO Project
// @author       Zebraed
// @tag          Enhancement
// @match        https://ynoproject.net/*
// @icon         https://ynoproject.net/flow/images/badge/empty_boxes.png
// @license      MIT
// @supportURL   https://github.com/Zebraed/yno-userscript
// @installURL   https://raw.githubusercontent.com/Zebraed/yno-userscript/refs/heads/main/monkey/pip.user.js
// @updateURL    https://raw.githubusercontent.com/Zebraed/yno-userscript/refs/heads/main/monkey/pip.user.js
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';

  const PIP_ICON_SVG = `<svg viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" width="24" height="24" aria-hidden="true">
<g transform="scale(0.75)">
<path vector-effect="non-scaling-stroke" d="M11 21H10C6.22876 21 4.34315 21 3.17157 19.8284C2 18.6569 2 16.7712 2 13V11M22 11C22 7.22876 22 5.34315 20.8284 4.17157C19.6569 3 17.7712 3 14 3H10C6.22876 3 4.34315 3 3.17157 4.17157C2.51839 4.82475 2.22937 5.69989 2.10149 7"/>
<path vector-effect="non-scaling-stroke" d="M13 17C13 15.1144 13 14.1716 13.5858 13.5858C14.1716 13 15.1144 13 17 13H18C19.8856 13 20.8284 13 21.4142 13.5858C22 14.1716 22 15.1144 22 17C22 18.8856 22 19.8284 21.4142 20.4142C20.8284 21 19.8856 21 18 21H17C15.1144 21 14.1716 21 13.5858 20.4142C13 19.8284 13 18.8856 13 17Z"/>
</g>
</svg>`;

  const button = document.createElement('button');
  button.id = 'pipButton';
  button.type = 'button';
  button.className = 'iconButton unselectable';
  button.innerHTML = PIP_ICON_SVG;
  button.setAttribute('aria-label', 'Enable Picture in Picture');
  button.title = 'Enable Picture in Picture';

  let video = null;
  let activeStream = null;
  let pipWindow = null;

  function getBrowserPipSupportState() {
    return {
      videoPip: typeof HTMLVideoElement.prototype.requestPictureInPicture === 'function',
      documentPip: typeof window.documentPictureInPicture?.requestWindow === 'function',
      firefoxNativePipLikely:
        navigator.userAgent.includes('Firefox') &&
        typeof HTMLVideoElement.prototype.requestPictureInPicture !== 'function',
    };
  }

  function supportsPip() {
    const state = getBrowserPipSupportState();
    return state.videoPip || state.documentPip;
  }

  function isPipActive() {
    if (video && document.pictureInPictureElement === video) {
      return true;
    }
    if (pipWindow && !pipWindow.closed) {
      return true;
    }
    return false;
  }

  function injectButtonStyle() {
    if (document.getElementById('yno-pip-button-style')) {
      return;
    }
    const style = document.createElement('style');
    style.id = 'yno-pip-button-style';
    style.textContent = `
      #pipButton {
        position: fixed;
        bottom: 12px;
        right: 12px;
        z-index: 1000;
        margin: 0;
        padding: 0;
        border: none !important;
        border-image: none !important;
        background: transparent !important;
        background-color: transparent !important;
        box-shadow: none;
      }
      #pipButton path {
        stroke-width: 1;
      }
    `;
    document.head.appendChild(style);
  }

  function updateButtonState() {
    const inPip = isPipActive();
    button.classList.toggle('toggled', inPip);
    if (inPip) {
      button.setAttribute('aria-label', 'Exit Picture in Picture');
      button.title = 'Exit Picture in Picture';
    } else {
      button.setAttribute('aria-label', 'Enable Picture in Picture');
      button.title = 'Enable Picture in Picture';
    }
  }

  function stopActiveStream() {
    if (!activeStream) {
      return;
    }
    for (const track of activeStream.getTracks()) {
      track.stop();
    }
    activeStream = null;
  }

  function releasePipVideo() {
    stopActiveStream();
    if (video) {
      video.srcObject = null;
    }
  }

  function closePip() {
    if (pipWindow && !pipWindow.closed) {
      pipWindow.close();
    }
    pipWindow = null;

    if (video && document.pictureInPictureElement === video) {
      document.exitPictureInPicture();
    }
    releasePipVideo();
  }

  function getOrCreateVideo() {
    if (video) {
      return video;
    }

    video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    Object.assign(video.style, {
      position: 'fixed',
      left: '-9999px',
      top: '-9999px',
      width: '1px',
      height: '1px',
    });
    video.addEventListener('enterpictureinpicture', updateButtonState);
    video.addEventListener('leavepictureinpicture', () => {
      releasePipVideo();
      updateButtonState();
    });
    document.body.appendChild(video);
    return video;
  }

  function getGameCanvas() {
    const canvas = document.querySelector('canvas');
    if (!canvas) {
      console.warn('YNO PiP: Canvas not found. Please reload the game screen and try again.');
      return null;
    }
    if (!canvas.captureStream) {
      console.warn('YNO PiP: This browser does not support canvas.captureStream().');
      return null;
    }
    return canvas;
  }

  function createStreamFromCanvas(canvas) {
    stopActiveStream();
    activeStream = canvas.captureStream(30);
    return activeStream;
  }

  async function openVideoPip(canvas) {
    const pipVideo = getOrCreateVideo();
    pipVideo.srcObject = createStreamFromCanvas(canvas);
    await pipVideo.play();
    await pipVideo.requestPictureInPicture();
  }

  async function openDocumentPip(canvas) {
    const width = canvas.clientWidth || 640;
    const height = canvas.clientHeight || 480;

    pipWindow = await window.documentPictureInPicture.requestWindow({
      width: width,
      height: height,
    });

    const pipDocument = pipWindow.document;
    pipDocument.body.style.margin = '0';
    pipDocument.body.style.padding = '0';
    pipDocument.body.style.overflow = 'hidden';
    pipDocument.body.style.background = '#000';

    const pipVideo = pipDocument.createElement('video');
    pipVideo.muted = true;
    pipVideo.playsInline = true;
    pipVideo.autoplay = true;
    pipVideo.style.width = '100%';
    pipVideo.style.height = '100%';
    pipVideo.style.display = 'block';
    pipVideo.style.objectFit = 'contain';
    pipVideo.srcObject = createStreamFromCanvas(canvas);
    pipDocument.body.appendChild(pipVideo);

    pipWindow.addEventListener('pagehide', () => {
      pipWindow = null;
      releasePipVideo();
      updateButtonState();
    });

    await pipVideo.play();

    if (typeof pipVideo.requestPictureInPicture === 'function') {
      await pipVideo.requestPictureInPicture();
      pipWindow.close();
      pipWindow = null;
    }
  }

  async function openPip(canvas) {
    const state = getBrowserPipSupportState();

    if (state.videoPip) {
      await openVideoPip(canvas);
      return;
    }
    if (state.firefoxNativePipLikely) {
      console.warn(
        'YNO PiP: Firefox does not support the requestPictureInPicture() Web API.' +
        ' Opening Document PiP window. Hover over the video and click the PiP button.'
      );
      if (state.documentPip) {
        await openDocumentPip(canvas);
      }
      return;
    }
    if (state.documentPip) {
      await openDocumentPip(canvas);
      return;
    }
    console.warn('YNO PiP: This browser does not support Picture in Picture.');
  }

  function init() {
    if (!document.body) {
      return;
    }
    injectButtonStyle();
    if (!button.isConnected) {
      document.body.appendChild(button);
    }
  }

  button.addEventListener('click', async () => {
    try {
      if (!supportsPip()) {
        console.warn('YNO PiP: This browser does not support Picture in Picture.');
        return;
      }

      if (isPipActive()) {
        closePip();
        updateButtonState();
        return;
      }

      const canvas = getGameCanvas();
      if (!canvas) {
        return;
      }

      await openPip(canvas);
      updateButtonState();
    } catch (err) {
      closePip();
      updateButtonState();
      console.warn(
        'YNO PiP: Failed to enable Picture in Picture:',
        err?.name || err,
        err?.message || '',
        err
      );
    }
  });

  init();
})();
