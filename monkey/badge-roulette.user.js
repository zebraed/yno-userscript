// ==UserScript==
// @name         YNO Badge Roulette
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Roulette for Badges on YNO. Enjoy Gambling with Badges!
// @author       Zebraed
// @tag          Enhancement
// @match        https://ynoproject.net/*
// @icon         https://ynoproject.net/2kki/images/badge/turntable_fairy.gif
// @license      MIT
// @supportURL   https://github.com/Zebraed/yno-userscript
// @installURL   https://raw.githubusercontent.com/Zebraed/yno-userscript/refs/heads/main/monkey/badge-roulette.user.js
// @updateURL    https://raw.githubusercontent.com/Zebraed/yno-userscript/refs/heads/main/monkey/badge-roulette.user.js
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';

  const INIT_CHECK_INTERVAL = 100;
  const ROULETTE_SPEED_INITIAL = 50;
  const ROULETTE_SPEED_MIN = 200;
  const ROULETTE_DECELERATION = 1.05;

  function getLangKey() {
    try {
      return JSON.parse(localStorage.getItem('config'))?.lang || 'en';
    } catch {
      return 'en';
    }
  }

  function getMessage(key, ...args) {
    const lang = getLangKey();
    const messages = {
      en: {
        rouletteButton: 'Badge Roulette',
        rouletteTitle: 'Badge Roulette',
        includeUnlocked: 'Include Unlocked',
        includeLocked: 'Include Locked',
        startButton: 'Start',
        stopButton: 'Stop',
        updateRouletteButton: 'Update Roulette',
        noBadgesAvailable: 'No badges available with current filters.',
        selectedBadge: 'Selected Badge',
        nextBadge: 'Next Badge',
        includeLoser: 'Include Loser'
      },
      ja: {
        rouletteButton: 'バッジルーレット',
        rouletteTitle: 'バッジルーレット',
        includeUnlocked: '取得済みを含める',
        includeLocked: '未取得を含める',
        startButton: '開始',
        stopButton: '停止',
        updateRouletteButton: 'ルーレットを更新',
        noBadgesAvailable: '現在のフィルターで利用可能なバッジがありません。',
        selectedBadge: '当選バッジ',
        nextBadge: '次のバッジ',
        includeLoser: String.fromCharCode(12383, 12431, 12375, 12434, 36861, 21152)
      }
    };
    let msg = messages[lang]?.[key] || messages.en[key] || key;
    if (args.length > 0) {
      msg = msg.replace(/\{(\d+)\}/g, (match, index) => {
        const idx = parseInt(index);
        return args[idx] !== undefined ? args[idx] : match;
      });
    }
    return msg;
  }

  let rouletteModal = null;
  let rouletteInterval = null;
  let currentBadgeIndex = 0;
  let availableBadges = [];
  let isSpinning = false;
  let currentSpeed = ROULETTE_SPEED_INITIAL;
  let rouletteSvg = null;
  let rouletteAngle = 0;
  let rouletteAnimationId = null;
  let badgeImages = [];
  let svgSize = 400;
  let selectedBadgeIds = new Set();
  let currentRouletteBadges = [];
  let loserFeatureUnlocked = false;
  let rouletteClickCount = 0;
  let rouletteClickTimer = null;
  let rouletteStopping = false;
  let rouletteStopStartTime = 0;
  let rouletteStopStartAngle = 0;
  let rouletteStopRotations = 0;
  let rouletteStopDuration = 0;

  function createRouletteModal() {
    if (rouletteModal) return rouletteModal;

    const modalContainer = document.getElementById('modalContainer');
    if (!modalContainer) {
      console.error('modalContainer not found');
      return null;
    }

    if (!document.getElementById('roulettePointerStyles')) {
      const style = document.createElement('style');
      style.id = 'roulettePointerStyles';
      style.textContent = `
        #roulettePointer path {
          stroke: rgb(var(--modal-base-color, 255 255 255));
          filter: drop-shadow(1.5px 1.5px rgb(var(--modal-shadow-color, 0 0 0)));
        }
      `;
      document.head.appendChild(style);
    }

    const modal = document.createElement('div');
    modal.id = 'badgeRouletteModal';
    modal.className = 'modal wideModal hidden';

    const closeLink = document.createElement('a');
    closeLink.href = 'javascript:void(0);';
    closeLink.className = 'modalClose';
    closeLink.textContent = '✖';
    closeLink.onclick = () => closeRouletteModal();
    modal.appendChild(closeLink);

    const header = document.createElement('div');
    header.className = 'modalHeader';
    const title = document.createElement('h1');
    title.className = 'modalTitle';
    title.textContent = getMessage('rouletteTitle');
    header.appendChild(title);
    modal.appendChild(header);

    const content = document.createElement('div');
    content.className = 'modalContent';
    content.style.cssText = 'flex-direction: column; align-items: center;';

    const optionsContainer = document.createElement('div');
    optionsContainer.style.cssText = 'margin-bottom: 20px; padding: 15px; background: rgba(0,0,0,0.1); border-radius: 5px; width: 100%; box-sizing: border-box;';

    const unlockedCheckbox = document.createElement('input');
    unlockedCheckbox.type = 'checkbox';
    unlockedCheckbox.id = 'rouletteIncludeUnlocked';
    unlockedCheckbox.checked = true;
    unlockedCheckbox.style.cssText = 'cursor: pointer; margin-right: 8px; pointer-events: auto; z-index: 1; position: relative;';
    unlockedCheckbox.onchange = async () => {
      await updateRouletteByConditions();
    };
    const unlockedLabel = document.createElement('label');
    unlockedLabel.htmlFor = 'rouletteIncludeUnlocked';
    unlockedLabel.className = 'unselectable';
    unlockedLabel.textContent = getMessage('includeUnlocked');
    unlockedLabel.style.cssText = 'margin-right: 20px; cursor: pointer; display: inline-flex; align-items: center; pointer-events: auto; position: relative; z-index: 1;';
    unlockedLabel.insertBefore(unlockedCheckbox, unlockedLabel.firstChild);
    optionsContainer.appendChild(unlockedLabel);

    const lockedCheckbox = document.createElement('input');
    lockedCheckbox.type = 'checkbox';
    lockedCheckbox.id = 'rouletteIncludeLocked';
    lockedCheckbox.checked = true;
    lockedCheckbox.style.cssText = 'cursor: pointer; margin-right: 8px; pointer-events: auto; z-index: 1; position: relative;';
    lockedCheckbox.onchange = async () => {
      await updateRouletteByConditions();
    };
    const lockedLabel = document.createElement('label');
    lockedLabel.htmlFor = 'rouletteIncludeLocked';
    lockedLabel.className = 'unselectable';
    lockedLabel.textContent = getMessage('includeLocked');
    lockedLabel.style.cssText = 'cursor: pointer; display: inline-flex; align-items: center; pointer-events: auto; position: relative; z-index: 1; margin-right: 20px;';
    lockedLabel.insertBefore(lockedCheckbox, lockedLabel.firstChild);
    optionsContainer.appendChild(lockedLabel);

    const loserCheckbox = document.createElement('input');
    loserCheckbox.type = 'checkbox';
    loserCheckbox.id = 'rouletteIncludeLoser';
    loserCheckbox.checked = false;
    loserCheckbox.style.cssText = 'cursor: pointer; margin-right: 8px; pointer-events: auto; z-index: 1; position: relative;';
    loserCheckbox.onchange = async () => {
      await resetRoulette();
    };
    const loserLabel = document.createElement('label');
    loserLabel.htmlFor = 'rouletteIncludeLoser';
    loserLabel.id = 'rouletteLoserLabel';
    loserLabel.className = 'unselectable';
    loserLabel.textContent = getMessage('includeLoser');
    loserLabel.style.cssText = 'cursor: pointer; display: none; align-items: center; pointer-events: auto; position: relative; z-index: 1;';
    loserLabel.insertBefore(loserCheckbox, loserLabel.firstChild);
    optionsContainer.appendChild(loserLabel);

    content.appendChild(optionsContainer);

    const rouletteWrapper = document.createElement('div');
    rouletteWrapper.id = 'rouletteWrapper';
    rouletteWrapper.style.cssText = 'position: relative; display: flex; justify-content: center; align-items: center; min-height: 400px; padding: 20px; width: 100%; box-sizing: border-box;';

    const pointerSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    pointerSvg.id = 'roulettePointer';
    pointerSvg.setAttribute('width', '40');
    pointerSvg.setAttribute('height', '40');
    pointerSvg.setAttribute('viewBox', '0 0 40 40');
    pointerSvg.style.cssText = 'position: absolute; top: 20px; left: calc(50% - 20px); z-index: 10; pointer-events: none;';

    const arrowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    arrowPath.setAttribute('d', 'M 20 40 L 5 5 L 20 10 L 35 5 Z');
    arrowPath.setAttribute('fill', 'none');
    arrowPath.setAttribute('stroke-width', '2');
    arrowPath.setAttribute('stroke-linejoin', 'round');
    arrowPath.setAttribute('stroke-linecap', 'round');
    pointerSvg.appendChild(arrowPath);

    rouletteWrapper.appendChild(pointerSvg);

    const rouletteContainer = document.createElement('div');
    rouletteContainer.id = 'rouletteBadgeContainer';
    rouletteContainer.style.cssText = 'position: relative; display: flex; justify-content: center; align-items: center;';

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = 'rouletteSvg';
    svg.setAttribute('width', svgSize);
    svg.setAttribute('height', svgSize);
    svg.setAttribute('viewBox', `0 0 ${svgSize} ${svgSize}`);
    svg.style.cssText = 'max-width: 100%; height: auto;';

    const rouletteGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    rouletteGroup.id = 'rouletteGroup';
    rouletteGroup.setAttribute('transform', `translate(${svgSize / 2}, ${svgSize / 2})`);
    svg.appendChild(rouletteGroup);

    rouletteContainer.appendChild(svg);
    rouletteWrapper.appendChild(rouletteContainer);

    rouletteSvg = svg;

    rouletteContainer.addEventListener('click', () => {
      if (isSpinning) return;

      if (rouletteClickTimer) {
        clearTimeout(rouletteClickTimer);
      }

      rouletteClickCount++;
      rouletteClickTimer = setTimeout(() => {
        rouletteClickCount = 0;
      }, 3000);

      if (rouletteClickCount >= 28) {
        rouletteClickCount = 0;
        if (rouletteClickTimer) {
          clearTimeout(rouletteClickTimer);
          rouletteClickTimer = null;
        }
        loserFeatureUnlocked = !loserFeatureUnlocked;
        try {
          localStorage.setItem('badgeRouletteLoserFeature', loserFeatureUnlocked ? '1' : '0');
        } catch (e) {
          console.error('Failed to save loser feature state:', e);
        }
        const loserLabel = document.getElementById('rouletteLoserLabel');
        if (loserLabel) {
          loserLabel.style.display = loserFeatureUnlocked ? 'inline-flex' : 'none';
        }
      }
    });

    content.appendChild(rouletteWrapper);
    modal.appendChild(content);

    const footer = document.createElement('div');
    footer.className = 'modalFooter';

    const startButton = document.createElement('button');
    startButton.id = 'rouletteStartButton';
    startButton.className = 'unselectable';
    startButton.type = 'button';
    startButton.textContent = getMessage('startButton');
    startButton.onclick = () => startRoulette();
    footer.appendChild(startButton);

    const stopButton = document.createElement('button');
    stopButton.id = 'rouletteStopButton';
    stopButton.className = 'unselectable';
    stopButton.type = 'button';
    stopButton.textContent = getMessage('stopButton');
    stopButton.disabled = true;
    stopButton.onclick = () => stopRoulette();
    footer.appendChild(stopButton);

    const updateButton = document.createElement('button');
    updateButton.id = 'rouletteUpdateButton';
    updateButton.className = 'unselectable';
    updateButton.type = 'button';
    updateButton.textContent = getMessage('updateRouletteButton');
    updateButton.onclick = () => updateRoulette();
    footer.appendChild(updateButton);

    modal.appendChild(footer);

    modalContainer.appendChild(modal);
    rouletteModal = modal;
    return modal;
  }

  async function openRouletteModal() {
    if (!rouletteModal) {
      if (!createRouletteModal()) {
        console.error('Failed to create roulette modal');
        return;
      }
    }

    try {
      const savedState = localStorage.getItem('badgeRouletteLoserFeature');
      loserFeatureUnlocked = savedState === '1';
      const loserLabel = document.getElementById('rouletteLoserLabel');
      if (loserLabel) {
        loserLabel.style.display = loserFeatureUnlocked ? 'inline-flex' : 'none';
      }
    } catch (e) {
      console.error('Failed to load loser feature state:', e);
    }

    if (typeof fetchPlayerBadges === 'function') {
      try {
        await fetchPlayerBadges();
      } catch (err) {
        console.error('Failed to fetch badges:', err);
      }
    }

    try {
      const savedDataStr = localStorage.getItem('badgeRouletteState');
      if (savedDataStr) {
        const savedData = JSON.parse(savedDataStr);
        const currentGameId = typeof gameId !== 'undefined' ? gameId : null;

        if (savedData.gameId === currentGameId) {
          const unlockedCheckbox = document.getElementById('rouletteIncludeUnlocked');
          const lockedCheckbox = document.getElementById('rouletteIncludeLocked');
          const loserCheckbox = document.getElementById('rouletteIncludeLoser');
          if (unlockedCheckbox && savedData.includeUnlocked !== undefined) {
            unlockedCheckbox.checked = savedData.includeUnlocked;
          }
          if (lockedCheckbox && savedData.includeLocked !== undefined) {
            lockedCheckbox.checked = savedData.includeLocked;
          }
          if (loserCheckbox && savedData.includeLoser !== undefined) {
            loserCheckbox.checked = savedData.includeLoser;
          }

          if (typeof badgeCache !== 'undefined' && badgeCache && Array.isArray(badgeCache)) {
          const restoredBadges = [];
          for (const savedBadge of savedData.badges || []) {
            const latestBadge = badgeCache.find(b =>
              b.badgeId === savedBadge.badgeId && b.game === savedBadge.game
            );
            if (latestBadge) {
              restoredBadges.push(latestBadge);
            }
          }

          const conditions = getCurrentFilterConditions();
          const validBadges = restoredBadges.filter(badge => badgeMatchesConditions(badge, conditions));

          selectedBadgeIds = new Set(savedData.selectedBadgeIds || []);

          const filteredBadges = validBadges.filter(badge => !selectedBadgeIds.has(badge.badgeId));

          if (filteredBadges.length > 0) {
            currentRouletteBadges = filteredBadges;
          }
          }
        }
      }
    } catch (e) {
      console.error('Failed to restore roulette state:', e);
    }

    if (typeof openModal === 'function') {
      const activeModal = document.querySelector('#modalContainer .modal:not(.hidden)');
      const lastModalId = activeModal ? activeModal.id : null;
      openModal('badgeRouletteModal', null, lastModalId);
    } else {
      rouletteModal.classList.remove('hidden');
    }

    validateCurrentRouletteBadges();

    await resetRoulette();
  }

  function removeSelectedBadgePopup(andCloseModal = true) {
    const popup = document.getElementById('rouletteSelectedBadgeModal');
    if (popup) {
      popup.remove();
      if (andCloseModal && typeof closeModal === 'function') {
        closeModal();
      }
    }
  }

  function closeRouletteModal() {
    if (rouletteModal) {
      stopRoulette();

      removeSelectedBadgePopup(true);

      try {
        const unlockedCheckbox = document.getElementById('rouletteIncludeUnlocked');
        const lockedCheckbox = document.getElementById('rouletteIncludeLocked');
        const loserCheckbox = document.getElementById('rouletteIncludeLoser');
        const currentGameId = typeof gameId !== 'undefined' ? gameId : null;
        const savedData = {
          gameId: currentGameId,
          badges: currentRouletteBadges.map(badge => ({
            badgeId: badge.badgeId,
            game: badge.game
          })),
          selectedBadgeIds: Array.from(selectedBadgeIds),
          includeUnlocked: unlockedCheckbox ? unlockedCheckbox.checked : true,
          includeLocked: lockedCheckbox ? lockedCheckbox.checked : true,
          includeLoser: loserCheckbox ? loserCheckbox.checked : false
        };
        localStorage.setItem('badgeRouletteState', JSON.stringify(savedData));
      } catch (e) {
        console.error('Failed to save roulette state:', e);
      }

      if (typeof closeModal === 'function') {
        closeModal();
      } else {
        rouletteModal.classList.add('hidden');
      }
    }
  }

  function getCurrentFilterConditions() {
    const includeUnlocked = document.getElementById('rouletteIncludeUnlocked')?.checked ?? true;
    const includeLocked = document.getElementById('rouletteIncludeLocked')?.checked ?? true;
    return { includeUnlocked, includeLocked };
  }

  function badgeMatchesConditions(badge, conditions) {
    if (badge.secret && !badge.unlocked) return false;
    if (badge.hidden && !badge.unlocked) return false;
    if (badge.unlocked && !conditions.includeUnlocked) return false;
    if (!badge.unlocked && !conditions.includeLocked) return false;
    return true;
  }

  function getBadgeName(badge) {
    if (typeof localizedBadges !== 'undefined' && localizedBadges[badge.game] && localizedBadges[badge.game][badge.badgeId]) {
      return localizedBadges[badge.game][badge.badgeId].name || badge.badgeId;
    }
    return badge.badgeId;
  }

  function showSelectedBadgePopup(badge) {
    const modalContainer = document.getElementById('modalContainer');
    if (!modalContainer) {
      console.error('modalContainer not found');
      return;
    }

    removeSelectedBadgePopup();

    const popup = document.createElement('div');
    popup.id = 'rouletteSelectedBadgeModal';
    popup.className = 'modal';

    if (!document.getElementById('rouletteModalSizeStyles')) {
      const style = document.createElement('style');
      style.id = 'rouletteModalSizeStyles';
      style.textContent = `
        #rouletteSelectedBadgeModal {
          width: auto !important;
          max-width: 200px !important;
          min-width: 150px !important;
          display: flex !important;
          flex-direction: column !important;
          justify-content: center !important;
          align-items: center !important;
        }
        #rouletteSelectedBadgeModal .modalHeader {
          padding: 10px 15px !important;
          text-align: center !important;
        }
        #rouletteSelectedBadgeModal .modalTitle {
          font-size: 16px !important;
          background-image: var(--modal-base-gradient) !important;
          -webkit-background-clip: text !important;
          -webkit-text-fill-color: transparent !important;
          background-clip: text !important;
          white-space: normal !important;
          overflow: visible !important;
        }
        #rouletteSelectedBadgeModal .modalContent {
          min-height: auto !important;
          height: auto !important;
          padding: 15px !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
        }
        #rouletteSelectedBadgeModal .modalContent.itemContainer {
          padding: 15px !important;
          justify-content: center !important;
          align-items: center !important;
        }
        #rouletteSelectedBadgeModal .itemContainer .badgeItem {
          margin: 0 auto !important;
          display: block !important;
          float: none !important;
        }
        #rouletteSelectedBadgeModal .itemContainer > div {
          width: 100% !important;
          display: flex !important;
          justify-content: center !important;
          align-items: center !important;
        }
        #rouletteSelectedBadgeModal .modalClose {
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
          z-index: 9999 !important;
          background-image: var(--modal-base-gradient) !important;
          -webkit-background-clip: text !important;
          -webkit-text-fill-color: transparent !important;
          background-clip: text !important;
          cursor: pointer !important;
        }
      `;
      document.head.appendChild(style);
    }

    let systemName = null;
    if (typeof modalUiTheme !== 'undefined' && modalUiTheme) {
      systemName = modalUiTheme.replace(/ /g, '_');
      if (typeof applyThemeStyles === 'function') {
        applyThemeStyles(popup, systemName, badge.game || gameId);
      }
      popup.classList.add(`theme_${systemName}`);
    } else if (badge.game && typeof getDefaultUiTheme === 'function') {
      systemName = getDefaultUiTheme(badge.game).replace(/ /g, '_');
      if (typeof applyThemeStyles === 'function') {
        applyThemeStyles(popup, systemName, badge.game);
      }
      popup.classList.add(`theme_${systemName}`);
    }

    const closeButton = document.createElement('a');
    closeButton.href = 'javascript:void(0);';
    closeButton.className = 'modalClose';
    closeButton.textContent = '✖';
    closeButton.onclick = () => {
      removeSelectedBadgePopup(true);
    };
    popup.appendChild(closeButton);

    const header = document.createElement('div');
    header.className = 'modalHeader';
    const nextBadgeTitle = document.createElement('h4');
    nextBadgeTitle.className = 'modalTitle';
    nextBadgeTitle.textContent = getMessage('nextBadge');
    nextBadgeTitle.style.cssText = 'font-size: 14px !important; margin-bottom: 5px !important;';
    header.appendChild(nextBadgeTitle);

    const badgeTitle = document.createElement('h2');
    badgeTitle.className = 'modalTitle';
    badgeTitle.textContent = getBadgeName(badge);
    badgeTitle.style.cssText = 'font-size: 16px !important; margin-top: 0 !important;';
    header.appendChild(badgeTitle);
    popup.appendChild(header);

    const content = document.createElement('div');
    content.className = 'modalContent itemContainer';
    content.style.cssText = 'display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 15px; min-height: auto;';

    if (typeof getBadgeItem === 'function') {
      try {
        const badgeItem = getBadgeItem(badge, true, false, true, true, false, null, false);
        badgeItem.style.cssText = 'margin: 0 auto !important; display: block !important; float: none !important;';
        const badgeWrapper = document.createElement('div');
        badgeWrapper.style.cssText = 'display: flex !important; justify-content: center !important; align-items: center !important; width: 100% !important;';
        badgeWrapper.appendChild(badgeItem);
        if (systemName) {
          badgeItem.classList.add(`theme_${systemName}`);
          if (typeof applyThemeStyles === 'function') {
            applyThemeStyles(badgeItem, systemName, badge.game || gameId);
          }
        }
        content.appendChild(badgeWrapper);
      } catch (err) {
        console.error('Failed to create badge item:', err);
        const badgeIdText = document.createElement('div');
        badgeIdText.textContent = badge.badgeId;
        badgeIdText.className = 'infoLabel';
        content.appendChild(badgeIdText);
      }
    } else {
      const badgeIdText = document.createElement('div');
      badgeIdText.textContent = badge.badgeId;
      badgeIdText.className = 'infoLabel';
      content.appendChild(badgeIdText);
    }

    popup.appendChild(content);

    modalContainer.appendChild(popup);

    const popupObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          if (popup.classList.contains('hidden')) {
            popupObserver.disconnect();
            popup.remove();
          }
        }
      });
    });
    popupObserver.observe(popup, { attributes: true, attributeFilter: ['class'] });

    if (typeof openModal === 'function') {
      const activeModal = document.querySelector('#modalContainer .modal:not(.hidden)');
      const lastModalId = activeModal ? activeModal.id : null;
      openModal('rouletteSelectedBadgeModal', null, lastModalId);
    } else {
      popup.classList.remove('hidden');
    }
  }

  function updateAvailableBadges() {
    if (typeof badgeCache === 'undefined' || !badgeCache || !Array.isArray(badgeCache)) {
      availableBadges = [];
      return;
    }
    const conditions = getCurrentFilterConditions();

    const currentGameId = typeof gameId !== 'undefined' ? gameId : null;

    availableBadges = badgeCache.filter(badge => {
      if (currentGameId && badge.game !== currentGameId) return false;
      if (!badgeMatchesConditions(badge, conditions)) return false;
      if (selectedBadgeIds.has(badge.badgeId)) return false;
      return true;
    });
  }

  function validateCurrentRouletteBadges() {
    if (currentRouletteBadges.length === 0) return true;

    const conditions = getCurrentFilterConditions();

    if (typeof badgeCache !== 'undefined' && badgeCache && Array.isArray(badgeCache)) {
      const updatedBadges = [];
      for (const oldBadge of currentRouletteBadges) {
        const latestBadge = badgeCache.find(b => b.badgeId === oldBadge.badgeId && b.game === oldBadge.game);
        if (latestBadge && badgeMatchesConditions(latestBadge, conditions)) {
          updatedBadges.push(latestBadge);
        }
      }

      if (updatedBadges.length !== currentRouletteBadges.length) {
        currentRouletteBadges = updatedBadges;
        return false;
      }

      currentRouletteBadges = updatedBadges;
    }

    const allMatch = currentRouletteBadges.every(badge => badgeMatchesConditions(badge, conditions));

    if (!allMatch) {
      currentRouletteBadges = [];
      selectedBadgeIds.clear();
      return false;
    }

    return true;
  }

  async function updateRouletteByConditions() {
    currentRouletteBadges = [];
    selectedBadgeIds.clear();
    await resetRoulette();
  }

  function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  async function updateRoulette() {
    selectedBadgeIds.clear();

    updateAvailableBadges();
    if (availableBadges.length === 0) {
      alert(getMessage('noBadgesAvailable'));
      return;
    }

    const maxBadges = Math.min(availableBadges.length, 24);
    const shuffled = shuffleArray(availableBadges);
    currentRouletteBadges = shuffled.slice(0, maxBadges);

    await resetRoulette();
  }

  async function loadBadgeImages(badges) {
    badgeImages = [];
    const maxBadges = Math.min(badges.length, 24);
    const badgesToShow = badges.slice(0, maxBadges);

    badgeImages = badgesToShow.map((badge) => {
      return { badge, name: getBadgeName(badge) };
    });

    const includeLoser = document.getElementById('rouletteIncludeLoser')?.checked ?? false;
    if (includeLoser) {
      const lang = getLangKey();
      const loserText = lang === 'ja' ? String.fromCharCode(12383, 12431, 12375) : 'Miss';
      badgeImages.push({ badge: null, name: loserText, isLoser: true });
    }
  }

  function drawRoulette() {
    if (!rouletteSvg || badgeImages.length === 0) return;

    const rouletteGroup = rouletteSvg.querySelector('#rouletteGroup');
    if (!rouletteGroup) return;

    while (rouletteGroup.firstChild) {
      rouletteGroup.removeChild(rouletteGroup.firstChild);
    }

    const radius = svgSize / 2 - 10;
    const sectorAngle = (2 * Math.PI) / badgeImages.length;

    const rotateGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    rotateGroup.setAttribute('transform', `rotate(${(rouletteAngle * 180) / Math.PI})`);
    rouletteGroup.appendChild(rotateGroup);

    badgeImages.forEach((badgeData, index) => {
      const startAngle = index * sectorAngle;
      const endAngle = (index + 1) * sectorAngle;

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const x1 = Math.cos(startAngle) * radius;
      const y1 = Math.sin(startAngle) * radius;
      const x2 = Math.cos(endAngle) * radius;
      const y2 = Math.sin(endAngle) * radius;
      const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;

      const pathData = `M 0,0 L ${x1},${y1} A ${radius},${radius} 0 ${largeArc},1 ${x2},${y2} Z`;
      path.setAttribute('d', pathData);

      if (badgeData.isLoser) {
        path.setAttribute('fill', 'rgba(255, 50, 50, 0.4)');
      } else {
        if (index % 2 === 0) {
          path.setAttribute('fill', 'rgba(100, 100, 100, 0.3)');
        } else {
          path.setAttribute('fill', 'rgba(150, 150, 150, 0.3)');
        }
      }
      path.setAttribute('stroke', 'rgba(255, 255, 255, 0.5)');
      path.setAttribute('stroke-width', '2');
      rotateGroup.appendChild(path);

      const textRadius = radius * 0.7;
      const textAngle = startAngle + sectorAngle / 2;
      const textX = Math.cos(textAngle) * textRadius;
      const textY = Math.sin(textAngle) * textRadius;

      const badgeName = badgeData.name || badgeData.badge?.badgeId || '?';

      const arcLength = sectorAngle * textRadius;

      const textGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      textGroup.setAttribute('transform', `translate(${textX}, ${textY}) rotate(${(textAngle * 180) / Math.PI})`);

      let fontSize = badgeData.isLoser ? 16 : 8;

      const measureText = (text, size) => {
        const temp = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        temp.setAttribute('font-family', 'Arial');
        temp.setAttribute('font-weight', 'bold');
        temp.setAttribute('font-size', size);
        temp.setAttribute('opacity', '0');
        temp.setAttribute('visibility', 'hidden');
        temp.textContent = text;
        rouletteSvg.appendChild(temp);
        const width = temp.getComputedTextLength();
        rouletteSvg.removeChild(temp);
        return width;
      };

      const maxWidth = arcLength * 2.0;
      const lines = [];

      if (badgeData.isLoser) {
        lines.push(badgeName);
      } else {
        const chars = Array.from(badgeName);
        let currentLine = '';

        for (let i = 0; i < chars.length; i++) {
          const testLine = currentLine + chars[i];
          const width = measureText(testLine, fontSize);
          if (width > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = chars[i];
            if (lines.length >= 4) {
              const remainingText = badgeName.substring(badgeName.indexOf(currentLine));
              currentLine = remainingText;
              break;
            }
          } else {
            currentLine = testLine;
          }
        }
        if (currentLine && lines.length < 4) {
          lines.push(currentLine);
        }
      }

      const minFontSize = badgeData.isLoser ? 10 : 7;
      while (fontSize >= minFontSize) {
        let allLinesFit = true;
        for (const line of lines) {
          if (measureText(line, fontSize) > maxWidth) {
            allLinesFit = false;
            break;
          }
        }
        if (allLinesFit) break;
        fontSize -= 0.5;
      }

      const textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      textElement.setAttribute('font-family', 'Arial');
      textElement.setAttribute('font-weight', 'bold');
      textElement.setAttribute('font-size', fontSize);
      textElement.setAttribute('fill', 'white');
      textElement.setAttribute('text-anchor', 'middle');
      textElement.setAttribute('dominant-baseline', 'middle');

      const lineHeight = fontSize * 1.2;

      lines.forEach((line, lineIndex) => {
        const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
        tspan.setAttribute('x', '0');
        tspan.setAttribute('y', (lineIndex - (lines.length - 1) / 2) * lineHeight);
        tspan.textContent = line;
        textElement.appendChild(tspan);
      });

      textGroup.appendChild(textElement);
      rotateGroup.appendChild(textGroup);
    });
  }

  async function resetRoulette() {
    stopRoulette();
    isSpinning = false;
    rouletteStopping = false;
    currentBadgeIndex = 0;
    currentSpeed = ROULETTE_SPEED_INITIAL;
    rouletteAngle = 0;

    if (currentRouletteBadges.length === 0) {
      updateAvailableBadges();
      if (availableBadges.length === 0) {
        if (rouletteSvg) {
          const rouletteGroup = rouletteSvg.querySelector('#rouletteGroup');
          if (rouletteGroup) {
            while (rouletteGroup.firstChild) {
              rouletteGroup.removeChild(rouletteGroup.firstChild);
            }
            const errorText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            errorText.setAttribute('x', '0');
            errorText.setAttribute('y', '0');
            errorText.setAttribute('text-anchor', 'middle');
            errorText.setAttribute('dominant-baseline', 'middle');
            errorText.setAttribute('fill', '#999');
            errorText.setAttribute('font-size', '14');
            errorText.textContent = getMessage('noBadgesAvailable');
            rouletteGroup.appendChild(errorText);
          }
        }
        const startButton = document.getElementById('rouletteStartButton');
        const stopButton = document.getElementById('rouletteStopButton');
        const updateButton = document.getElementById('rouletteUpdateButton');
        if (startButton) startButton.disabled = false;
        if (stopButton) stopButton.disabled = true;
        if (updateButton) updateButton.disabled = false;
        return;
      }
      const maxBadges = Math.min(availableBadges.length, 24);
      const shuffled = shuffleArray(availableBadges);
      currentRouletteBadges = shuffled.slice(0, maxBadges);
    }

    if (currentRouletteBadges.length > 0) {
      await loadBadgeImages(currentRouletteBadges);
      drawRoulette();
    } else {
      if (rouletteSvg) {
        const rouletteGroup = rouletteSvg.querySelector('#rouletteGroup');
        if (rouletteGroup) {
          while (rouletteGroup.firstChild) {
            rouletteGroup.removeChild(rouletteGroup.firstChild);
          }
          const errorText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          errorText.setAttribute('x', '0');
          errorText.setAttribute('y', '0');
          errorText.setAttribute('text-anchor', 'middle');
          errorText.setAttribute('dominant-baseline', 'middle');
          errorText.setAttribute('fill', '#999');
          errorText.setAttribute('font-size', '14');
          errorText.textContent = getMessage('noBadgesAvailable');
          rouletteGroup.appendChild(errorText);
        }
      }
    }
    const startButton = document.getElementById('rouletteStartButton');
    const stopButton = document.getElementById('rouletteStopButton');
    if (startButton) startButton.disabled = false;
    if (stopButton) stopButton.disabled = true;
  }

  async function startRoulette() {
    validateCurrentRouletteBadges();

    const filteredBadges = currentRouletteBadges.filter(badge => !selectedBadgeIds.has(badge.badgeId));

    if (filteredBadges.length === 0) {
      alert(getMessage('noBadgesAvailable'));
      return;
    }

    await loadBadgeImages(filteredBadges);
    if (badgeImages.length === 0) {
      alert(getMessage('noBadgesAvailable'));
      return;
    }

    rouletteAngle = 0;
    drawRoulette();

    isSpinning = true;
    rouletteStopping = false;
    const startTime = performance.now();

    const startButton = document.getElementById('rouletteStartButton');
    const stopButton = document.getElementById('rouletteStopButton');
    const updateButton = document.getElementById('rouletteUpdateButton');
    if (startButton) startButton.disabled = true;
    if (stopButton) stopButton.disabled = false;
    if (updateButton) updateButton.disabled = true;

    const unlockedCheckbox = document.getElementById('rouletteIncludeUnlocked');
    const lockedCheckbox = document.getElementById('rouletteIncludeLocked');
    const loserCheckbox = document.getElementById('rouletteIncludeLoser');
    if (unlockedCheckbox) unlockedCheckbox.disabled = true;
    if (lockedCheckbox) lockedCheckbox.disabled = true;
    if (loserCheckbox) loserCheckbox.disabled = true;

    function animate(currentTime) {
      if (!isSpinning) return;

      if (!rouletteStopping) {
        const badgeCount = badgeImages.length;
        const baseSpeed = 600;
        const minSpeed = 150;
        const maxCount = 24;
        const speed = Math.max(minSpeed, baseSpeed - (baseSpeed - minSpeed) * (1 - badgeCount / maxCount));

        const elapsed = currentTime - startTime;
        rouletteAngle = (elapsed / speed) * Math.PI * 2;
        drawRoulette();
        rouletteAnimationId = requestAnimationFrame(animate);
      } else {
        const stopElapsed = currentTime - rouletteStopStartTime;

        if (stopElapsed < rouletteStopDuration) {
          const badgeCount = badgeImages.length;
          const baseSpeed = 600;
          const minSpeed = 150;
          const maxCount = 24;
          const speed = Math.max(minSpeed, baseSpeed - (baseSpeed - minSpeed) * (1 - badgeCount / maxCount));
          const normalAngularVelocity = (Math.PI * 2) / speed;
          const progress = stopElapsed / rouletteStopDuration;
          const easeIn = 1 - Math.pow(progress, 2);
          const currentVelocity = normalAngularVelocity * easeIn;
          const deltaTime = 16.67;
          rouletteAngle += currentVelocity * deltaTime;
          drawRoulette();
          rouletteAnimationId = requestAnimationFrame(animate);
        } else {
          rouletteAngle = rouletteAngle % (2 * Math.PI);
          drawRoulette();

          const correctedAngle = (rouletteAngle + Math.PI / 2) % (2 * Math.PI);
          const sectorAngle = (2 * Math.PI) / badgeImages.length;
          const sectorIndex = Math.floor(correctedAngle / sectorAngle) % badgeImages.length;
          currentBadgeIndex = (badgeImages.length - 1 - sectorIndex) % badgeImages.length;

          if (badgeImages[currentBadgeIndex]) {
            const selectedItem = badgeImages[currentBadgeIndex];
            if (selectedItem.isLoser) {
            } else if (selectedItem.badge) {
              const selectedBadge = selectedItem.badge;
              selectedBadgeIds.add(selectedBadge.badgeId);
              showSelectedBadgePopup(selectedBadge);
            }
          }

          isSpinning = false;
          rouletteStopping = false;
          if (startButton) startButton.disabled = false;
          if (stopButton) stopButton.disabled = true;
          if (updateButton) updateButton.disabled = false;
          if (unlockedCheckbox) unlockedCheckbox.disabled = false;
          if (lockedCheckbox) lockedCheckbox.disabled = false;
          if (loserCheckbox) loserCheckbox.disabled = false;
        }
      }
    }

    rouletteAnimationId = requestAnimationFrame(animate);
  }

  function stopRoulette() {
    if (!isSpinning || rouletteStopping) return;

    rouletteStopping = true;
    rouletteStopStartTime = performance.now();
    rouletteStopStartAngle = rouletteAngle;
    rouletteStopRotations = 8;
    rouletteStopDuration = Math.floor(Math.random() * 3000) + 2000;

    const stopButton = document.getElementById('rouletteStopButton');
    if (stopButton) stopButton.disabled = true;
  }

  function waitForInit() {
    const badgesModal = document.getElementById('badgesModal');
    const modalContainer = document.getElementById('modalContainer');
    if (!badgesModal || !modalContainer) {
      setTimeout(waitForInit, INIT_CHECK_INTERVAL);
      return;
    }
    init();
  }

  function init() {
    const badgesModal = document.getElementById('badgesModal');
    if (!badgesModal) {
      setTimeout(init, INIT_CHECK_INTERVAL);
      return;
    }

    const modalFooter = badgesModal.querySelector('.modalFooter');
    if (!modalFooter) {
      setTimeout(init, INIT_CHECK_INTERVAL);
      return;
    }

    let rouletteButton = document.getElementById('badgeRouletteButton');
    if (!rouletteButton) {
      rouletteButton = document.createElement('button');
      rouletteButton.id = 'badgeRouletteButton';
      rouletteButton.className = 'unselectable';
      rouletteButton.type = 'button';
      rouletteButton.textContent = getMessage('rouletteButton');
      rouletteButton.onclick = openRouletteModal;
      modalFooter.appendChild(rouletteButton);
    }

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          if (!badgesModal.classList.contains('hidden')) {
            const btn = document.getElementById('badgeRouletteButton');
            if (btn) btn.textContent = getMessage('rouletteButton');
          }
        }
      });
    });
    observer.observe(badgesModal, {
      attributes: true,
      attributeFilter: ['class']
    });
  }

  waitForInit();
})();