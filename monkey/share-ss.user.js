// ==UserScript==
// @name         YNO SSS (Share Screenshot)
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Add clickable links to screenshot IDs in YNO chat.
// @author       Zebraed
// @tag          Enhancement
// @match        https://ynoproject.net/*
// @icon         https://ynoproject.net/oneshot/images/ynomoji/oneShotLampSun.png
// @license      MIT
// @supportURL   https://github.com/Zebraed/yno-userscript
// @installURL   https://raw.githubusercontent.com/Zebraed/yno-userscript/refs/heads/main/monkey/share-ss-url.user.js
// @updateURL    https://raw.githubusercontent.com/Zebraed/yno-userscript/refs/heads/main/monkey/share-ss-url.user.js
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';

  function resolveSenderUuid(messageContainer) {
    if (!messageContainer) return null;

    if (messageContainer.dataset && messageContainer.dataset.senderUuid) {
      return messageContainer.dataset.senderUuid;
    }

    if (messageContainer.dataset && messageContainer.dataset.uuid) {
      return messageContainer.dataset.uuid;
    }

    const messageSender = messageContainer.querySelector('.messageSender');
    if (messageSender && messageSender.dataset && messageSender.dataset.uuid) {
      return messageSender.dataset.uuid;
    }

    const messageEl = messageContainer.querySelector('.message');
    if (messageEl && messageEl.dataset && messageEl.dataset.uuid) {
      return messageEl.dataset.uuid;
    }

    return null;
  }

  function buildScreenshotUrl(uuid, screenshotId, forceTemp, directUrl) {
    if (directUrl) return directUrl;
    const base = `https://connect.ynoproject.net/${gameId}`;
    const tempPrefix = forceTemp ? 'temp/' : '';
    return `${base}/screenshots/${tempPrefix}${uuid}/${screenshotId}.png`;
  }

  function isGlobalMessageContainer(container) {
    return !!(container && container.classList && container.classList.contains('global'));
  }

  function isGlobalChatInput(chatInput, partyChat) {
    return !!(chatInput && chatInput.dataset && chatInput.dataset.global && !partyChat);
  }

  function addScreenshotLinks() {
    const messageContainers = document.querySelectorAll('.messageContainer');
    messageContainers.forEach((container, index) => {
      if (isGlobalMessageContainer(container)) {
        return;
      }

      let messageContents = container.querySelector('.messageContents');
      if (!messageContents) {
        messageContents = container.querySelector('.messageContentsWrapper .messageContents');
      }
      if (!messageContents) {
        messageContents = container.querySelector('.message .messageContentsWrapper .messageContents');
      }

      if (!messageContents) {
        return;
      }

      if (messageContents.dataset.screenshotLinksAdded) {
        return;
      }
      const screenshotPattern = /\[(t?)(\w{16})(?::(\d+))?\]/g;
      const urlPattern = /https:\/\/connect\.ynoproject\.net\/[^\/]+\/screenshots\/(?:temp\/)?([^\/]+)\/(\w{16})\.png/g;
      let linkCount = 0;

      screenshotPattern.lastIndex = 0;

      function createScreenshotLink(displayText, href, data, onClick) {
        const link = document.createElement('a');
        link.href = href;
        link.textContent = displayText;
        link.style.color = '#007bff';
        link.style.textDecoration = 'underline';
        link.style.cursor = 'pointer';
        if (data) {
          if (data.screenshotId != null) link.dataset.screenshotId = data.screenshotId;
          if (data.isTemp != null) link.dataset.isTemp = data.isTemp ? 'true' : 'false';
          if (data.flags != null) link.dataset.flags = String(data.flags);
          if (data.uuid != null) link.dataset.uuid = data.uuid;
        }
        if (typeof onClick === 'function') {
          link.addEventListener('click', function(e) {
            e.preventDefault();
            onClick(this);
          });
        }
        return link;
      }

      function processTextNode(node) {
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent;
          const matches = [...text.matchAll(screenshotPattern)];

          if (matches.length > 0) {
            let lastIndex = 0;
            const fragment = document.createDocumentFragment();

            matches.forEach((match, matchIndex) => {
              const fullMatch = match[0];
              const isTemp = !!match[1];
              const screenshotId = match[2];
              const flags = +match[3] || 0;

              const posterUuid = resolveSenderUuid(container);

              if (match.index > lastIndex) {
                const beforeText = text.slice(lastIndex, match.index);
                fragment.appendChild(document.createTextNode(beforeText));
              }

              const link = createScreenshotLink(
                fullMatch,
                '#',
                { screenshotId, isTemp, flags, uuid: posterUuid },
                (self) => {
                  console.log('Link clicked - ID format:', {
                    screenshotId: self.dataset.screenshotId,
                    isTemp: self.dataset.isTemp,
                    flags: self.dataset.flags,
                    uuid: self.dataset.uuid
                  });
                  openScreenshotModal(self.dataset.screenshotId, self.dataset.isTemp === 'true', +self.dataset.flags, container, self.dataset.uuid);
                }
              );

              fragment.appendChild(link);
              lastIndex = match.index + fullMatch.length;
              linkCount++;
            });
            if (lastIndex < text.length) {
              const afterText = text.slice(lastIndex);
              fragment.appendChild(document.createTextNode(afterText));
            }
            node.parentNode.replaceChild(fragment, node);
            return;
          }

          const urlMatches = [...text.matchAll(urlPattern)];
          if (urlMatches.length > 0) {
            let lastIndex = 0;
            const fragment = document.createDocumentFragment();

            urlMatches.forEach(urlMatch => {
              const fullUrl = urlMatch[0];
              const uuidFromUrl = urlMatch[1];
              const idFromUrl = urlMatch[2];
              const isTempFromUrl = fullUrl.includes('/temp/');

              if (urlMatch.index > lastIndex) {
                const beforeText = text.slice(lastIndex, urlMatch.index);
                fragment.appendChild(document.createTextNode(beforeText));
              }

              const link = createScreenshotLink(
                fullUrl,
                fullUrl,
                { screenshotId: idFromUrl, isTemp: isTempFromUrl, flags: 0 },
                (self) => openScreenshotModal(self.dataset.screenshotId, self.dataset.isTemp === 'true', +self.dataset.flags, container, uuidFromUrl, fullUrl)
              );

              fragment.appendChild(link);
              lastIndex = urlMatch.index + fullUrl.length;
              linkCount++;
            });

            if (lastIndex < text.length) {
              const afterText = text.slice(lastIndex);
              fragment.appendChild(document.createTextNode(afterText));
            }

            node.parentNode.replaceChild(fragment, node);
          }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          Array.from(node.childNodes).forEach(processTextNode);
        }
      }
      Array.from(messageContents.childNodes).forEach(processTextNode);
      messageContents.dataset.screenshotLinksAdded = 'true';
    });
  }

  function openScreenshotModal(screenshotId, isTemp, flags, messageContainer, uuidFromUrl = null, directUrl = null) {
    let uuid = uuidFromUrl || getCurrentPlayerUuid();
    let ownerData = null;

    if (!uuidFromUrl && messageContainer) {
      const posterUuid = resolveSenderUuid(messageContainer);
      if (posterUuid) {
        uuid = posterUuid;
        console.log('Found poster UUID from message container:', uuid);
      }

      if (uuid && typeof globalPlayerData !== 'undefined' && globalPlayerData[uuid]) {
        ownerData = {
          uuid: uuid,
          name: globalPlayerData[uuid].name || 'Unknown'
        };
        console.log('Found owner data:', ownerData);
      }
    }

    const imageUrl = buildScreenshotUrl(uuid, screenshotId, true, directUrl);

    if (window.viewScreenshot) {
      const screenshotData = {
        id: screenshotId,
        spoiler: !!(flags & 1),
        owner: ownerData
      };

      console.log('openScreenshotModal debug:', {
        screenshotId,
        flags,
        spoiler: screenshotData.spoiler,
        imageUrl
      });

      window.viewScreenshot(imageUrl, new Date(), screenshotData);

      if (screenshotData.spoiler) {
        setTimeout(() => {
          const screenshotModal = document.getElementById('screenshotModal');
          if (screenshotModal) {
            const modalContent = screenshotModal.querySelector('.modalContent');
            const screenshotImg = modalContent?.querySelector('.screenshot');

            if (screenshotImg && modalContent) {
              const wrapper = document.createElement('div');
              wrapper.classList.add('imageItem', 'spoiler');
              wrapper.style.width = '100%';
              wrapper.style.height = '100%';
              wrapper.style.position = 'relative';
              wrapper.style.display = 'flex';
              wrapper.style.alignItems = 'center';
              wrapper.style.justifyContent = 'center';

              screenshotImg.classList.add('imageThumbnail');
              screenshotImg.parentNode.insertBefore(wrapper, screenshotImg);
              wrapper.appendChild(screenshotImg);

              const spoilerLabel = document.createElement('h3');
              spoilerLabel.classList.add('spoilerLabel', 'infoLabel', 'unselectable');
              spoilerLabel.style.position = 'absolute';
              spoilerLabel.style.top = '50%';
              spoilerLabel.style.left = '50%';
              spoilerLabel.style.transform = 'translate(-50%, -50%)';
              spoilerLabel.style.margin = '0';
              spoilerLabel.style.pointerEvents = 'none';
              spoilerLabel.style.zIndex = '10';

              if (typeof localizedMessages !== 'undefined' && localizedMessages.screenshots?.spoiler?.label) {
                if (typeof getMassagedLabel === 'function') {
                  spoilerLabel.innerHTML = getMassagedLabel(localizedMessages.screenshots.spoiler.label, true);
                } else {
                  spoilerLabel.innerHTML = localizedMessages.screenshots.spoiler.label;
                }
              } else {
                spoilerLabel.innerHTML = 'Spoiler';
              }

              wrapper.appendChild(spoilerLabel);

              wrapper.addEventListener('click', function() {
                this.classList.remove('spoiler');
              }, { once: true });
            }
          }
        }, 50);
      }
    } else {
      openScreenshotModalFallback(imageUrl, screenshotId, isTemp, flags);
    }
  }

  function openScreenshotModalFallback(imageUrl, screenshotId, isTemp, flags) {
    const screenshotModal = document.getElementById('screenshotModal');
    if (!screenshotModal) {
      console.error('Screenshot modal not found');
      return;
    }

    const screenshotModalContent = screenshotModal.querySelector('.modalContent');
    if (!screenshotModalContent) {
      console.error('Screenshot modal content not found');
      return;
    }

    const screenshot = document.createElement('img');
    screenshot.classList.add('screenshot', 'unselectable');
    screenshot.src = imageUrl;
    screenshotModalContent.innerHTML = '';
    screenshotModalContent.appendChild(screenshot);

    if (window.openModal) {
      window.openModal('screenshotModal');
    } else {
      screenshotModal.classList.remove('hidden');
    }
  }

  function getCurrentPlayerUuid() {
    if (typeof playerData !== 'undefined' && playerData && playerData.uuid) {
      return playerData.uuid;
    }
    return 'unknown';
  }

  function observeNewMessages() {
    const chatContainer = document.getElementById('messages');
    if (!chatContainer) {
      setTimeout(observeNewMessages, 1000);
      return;
    }

    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          setTimeout(addScreenshotLinks, 100);
        }
      });
    });

    observer.observe(chatContainer, {
      childList: true,
      subtree: true
    });
  }

  function extendScreenshotSharing() {
    const originalChatInputActionFired = window.chatInputActionFired;

    if (originalChatInputActionFired) {
      window.chatInputActionFired = function() {
        const chatInput = document.getElementById("chatInput");
        if (!chatInput?.value.trim().length)
          return;
        const htmlTextEl = document.createElement("span");
        htmlTextEl.innerHTML = parseMessageTextForMarkdown(chatInput.value);
        if (!htmlTextEl.innerText.trim().length)
          return;
        const partyChat = document.getElementById("chatbox").classList.contains("partyChat");
        if (!chatInput.dataset.global && !partyChat && (connStatus != 1 && connStatus != 3))
          return;
        if (chatInput.dataset.global && chatInput.dataset.blockGlobal)
          return;
        const chatTab = document.querySelector(".chatboxTab[data-tab-section='chat']");
        if (!chatTab.classList.contains("active"))
          chatTab.click();
        let message = chatInput.value.trim();

        const isGlobalChat = isGlobalChatInput(chatInput, partyChat);

        if (message.includes('[screenshot]') && chatInput.dataset.screenshotId && !isGlobalChat) {
          const flags = +chatInput.dataset.screenshotFlags;
          const isTemp = chatInput.dataset.screenshotTemp === 'temp';
          const screenshotId = chatInput.dataset.screenshotId;
          const idFormat = `[${isTemp ? 't' : ''}${screenshotId}${flags ? `:${flags}` : ''}]`;
          message = message.replace('[screenshot]', idFormat);
          delete chatInput.dataset.screenshotId;
          delete chatInput.dataset.screenshotTemp;
          delete chatInput.dataset.screenshotFlags;
        }
        if (!chatInput.dataset.global || partyChat) {
          if (!joinedPartyId || !partyChat) {
            sendSessionCommand("say", [ message ]);
          } else
            sendSessionCommand("psay", [ message ]);
        } else if (!trySendGlobalMessage(message))
          return;
        chatInput.value = "";
        document.getElementById("ynomojiContainer").classList.add("hidden");
      };
    }
  }

  function initialize() {
    setTimeout(() => {
      extendScreenshotSharing();
      addScreenshotLinks();
      observeNewMessages();
    }, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }

})();