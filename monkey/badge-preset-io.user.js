// ==UserScript==
// @name         YNO Badge Preset IO
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Import and Export for Badge Presets on YNO.
// @author       Zebraed
// @tag          Enhancement
// @match        https://ynoproject.net/*
// @icon         https://ynoproject.net/genie/images/badge/badge_amulet_2.png
// @license      MIT
// @supportURL   https://github.com/Zebraed/yno-userscript
// @installURL   https://raw.githubusercontent.com/Zebraed/yno-userscript/refs/heads/main/monkey/badge-preset-io.user.js
// @updateURL    https://raw.githubusercontent.com/Zebraed/yno-userscript/refs/heads/main/monkey/badge-preset-io.user.js
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';

  const INIT_CHECK_INTERVAL = 100;
  const DEFAULT_ROWS = 1;
  const DEFAULT_COLS = 3;

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
        exportButton: 'Export',
        importButton: 'Import',
        exportSuccess: 'Badge preset exported successfully.',
        exportEmpty: 'The badge preset to export is empty.',
        exportFailed: 'Export failed: ',
        exportFetchFailed: 'Failed to fetch preset from server',
        importEmpty: 'The badge preset to import is empty.',
        importInvalidFormat: 'Invalid preset format',
        importReadFailed: 'Failed to read the JSON file: ',
        importFileReadFailed: 'Failed to read the file.',
        importRequiredElementsNotFound: 'Required elements not found',
        importFetchSlotsFailed: 'Failed to fetch current slots',
        importSetSlotsFailed: 'Failed to set slots ({0}/{1}).',
        importSaveFailed: 'Failed to save the preset.',
        importPresetFailed: 'Failed to import the badgepreset: '
      },
      ja: {
        exportButton: 'エクスポート',
        importButton: 'インポート',
        exportSuccess: 'バッジプリセットのエクスポートに成功しました。',
        exportEmpty: 'エクスポートするバッジプリセットが空です。',
        exportFailed: 'エクスポートに失敗しました: ',
        exportFetchFailed: 'プリセットの取得に失敗しました',
        importEmpty: 'インポートするバッジプリセットが空です。',
        importInvalidFormat: '無効なプリセット形式です',
        importReadFailed: 'JSONファイルの読み込みに失敗しました: ',
        importFileReadFailed: 'ファイルの読み込みに失敗しました。',
        importRequiredElementsNotFound: '必要な要素が見つかりません',
        importFetchSlotsFailed: '現在のスロットの取得に失敗しました',
        importSetSlotsFailed: 'スロットの設定に失敗しました（{0}/{1}）。',
        importSaveFailed: '保存に失敗しました。',
        importPresetFailed: 'バッジプリセットのインポートに失敗しました: '
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

  function getSlotDimensions(backupSlots) {
    const rows = typeof badgeSlotRows !== 'undefined'
      ? badgeSlotRows
      : (backupSlots?.length || DEFAULT_ROWS);
    const cols = typeof badgeSlotCols !== 'undefined'
      ? badgeSlotCols
      : (backupSlots?.[0]?.length || DEFAULT_COLS);
    return { rows, cols };
  }

  function normalizeBadgeSlots(badgeSlots, rows, cols) {
    return Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) => {
        const id = badgeSlots?.[r]?.[c] || 'null';
        return id || 'null';
      })
    );
  }

  function trimEmptyRows(badgeSlots) {
    const trimmed = [...badgeSlots];
    while (trimmed.length > 0) {
      const lastRow = trimmed[trimmed.length - 1];
      const isEmptyRow = lastRow.every(badge => badge === 'null' || badge === null);
      if (isEmptyRow) {
        trimmed.pop();
      } else {
        break;
      }
    }
    return trimmed;
  }

  function downloadJSON(data, filename) {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function setAllSlots(badgeSlots, rows, cols) {
    const promises = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const id = badgeSlots[r][c];
        promises.push(
          apiFetch(`badge?command=slotSet&id=${id}&row=${r + 1}&col=${c + 1}`)
            .then(resp => ({
              ok: resp.ok,
              row: r + 1,
              col: c + 1,
              id,
              status: resp.status,
              statusText: resp.statusText
            }))
            .catch(err => ({
              ok: false,
              row: r + 1,
              col: c + 1,
              id,
              error: err?.message || String(err)
            }))
        );
      }
    }
    return await Promise.all(promises);
  }

  async function rollbackSlots(backupSlots) {
    if (!Array.isArray(backupSlots)) return;

    const rows = backupSlots.length;
    const cols = backupSlots[0]?.length || 0;
    const promises = [];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const id = backupSlots[r]?.[c] || 'null';
        promises.push(
          apiFetch(`badge?command=slotSet&id=${id}&row=${r + 1}&col=${c + 1}`)
            .catch(err => err)
        );
      }
    }

    await Promise.all(promises);
  }

  async function getPresetData(presetId) {
    if (typeof badgePresetCache !== 'undefined' && !isEmptyBadgeSlots(badgePresetCache)) {
      return badgePresetCache;
    }

    if (typeof apiFetch === 'undefined') {
      throw new Error(getMessage('importRequiredElementsNotFound'));
    }

    const response = await apiFetch(`badge?command=presetGet&preset=${presetId}`);
    if (!response.ok) {
      throw new Error(getMessage('exportFetchFailed'));
    }

    return await response.json();
  }

  // Initialization
  function waitForInit() {
    if (typeof badgeSlotCache === 'undefined' ||
        typeof updatePlayerBadgeSlot === 'undefined' ||
        typeof updateBadgeSlots === 'undefined' ||
        typeof initBadgeGalleryModal === 'undefined' ||
        typeof initBadgePresetModal === 'undefined' ||
        typeof isEmptyBadgeSlots === 'undefined' ||
        !document.getElementById('badgePresetModal')) {
      setTimeout(waitForInit, INIT_CHECK_INTERVAL);
      return;
    }
    init();
  }

  function updateButtonTexts() {
    const exportButton = document.getElementById('badgePresetExport');
    const importButton = document.getElementById('badgePresetImport');
    if (exportButton) {
      exportButton.textContent = getMessage('exportButton');
    }
    if (importButton) {
      importButton.textContent = getMessage('importButton');
    }
  }

  function init() {
    const modalFooter = document.querySelector('#badgePresetModal .modalFooter');
    if (!modalFooter) {
      setTimeout(init, INIT_CHECK_INTERVAL);
      return;
    }

    let exportButton = document.getElementById('badgePresetExport');
    let importButton = document.getElementById('badgePresetImport');

    if (!exportButton) {
      exportButton = document.createElement('button');
      exportButton.id = 'badgePresetExport';
      exportButton.className = 'unselectable';
      exportButton.type = 'button';
      exportButton.onclick = handleExport;
      modalFooter.appendChild(exportButton);
    }

    if (!importButton) {
      importButton = document.createElement('button');
      importButton.id = 'badgePresetImport';
      importButton.className = 'unselectable';
      importButton.type = 'button';
      importButton.onclick = handleImport;
      modalFooter.appendChild(importButton);
    }

    updateButtonTexts();

    if (typeof initBadgePresetModal === 'function') {
      const originalInitBadgePresetModal = initBadgePresetModal;
      window.initBadgePresetModal = function() {
        originalInitBadgePresetModal.apply(this, arguments);
        setTimeout(updateButtonTexts, 200);
      };
    }

    const presetModal = document.getElementById('badgePresetModal');
    if (presetModal) {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            if (!presetModal.classList.contains('hidden')) {
              updateButtonTexts();
            }
          }
        });
      });
      observer.observe(presetModal, {
        attributes: true,
        attributeFilter: ['class']
      });
    }
  }

  // Export handler
  async function handleExport() {
    try {
      const presetSelection = document.getElementById('badgePresetSelection');
      if (!presetSelection) {
        alert(getMessage('importRequiredElementsNotFound'));
        return;
      }

      const presetId = presetSelection.value;
      const badgeSlotsToExport = await getPresetData(presetId);

      if (isEmptyBadgeSlots(badgeSlotsToExport)) {
        alert(getMessage('exportEmpty'));
        return;
      }

      const trimmedBadgeSlots = trimEmptyRows(badgeSlotsToExport);
      const presetData = {
        version: 1,
        timestamp: new Date().toISOString(),
        presetId: parseInt(presetId),
        badgeSlots: trimmedBadgeSlots
      };

      const filename = `badge-preset-${parseInt(presetId) + 1}-${new Date().toISOString().slice(0, 10)}.json`;
      downloadJSON(presetData, filename);
    } catch (err) {
      console.error('Export failed:', err);
      alert(getMessage('exportFailed') + err.message);
    }
  }

  // Import handler
  function handleImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (event) => {
      const file = event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const presetData = JSON.parse(e.target.result);
          let badgeSlots;

          if (presetData.badgeSlots) {
            badgeSlots = presetData.badgeSlots;
          } else if (Array.isArray(presetData)) {
            badgeSlots = presetData;
          } else {
            throw new Error(getMessage('importInvalidFormat'));
          }

          if (isEmptyBadgeSlots(badgeSlots)) {
            alert(getMessage('importEmpty'));
            return;
          }

          applyBadgePresetFromData(badgeSlots);
        } catch (err) {
          console.error('Import failed:', err);
          alert(getMessage('importReadFailed') + err.message);
        }
      };
      reader.onerror = () => {
        alert(getMessage('importFileReadFailed'));
      };
      reader.readAsText(file);
    };
    input.click();
  }

  async function applyBadgePresetFromData(badgeSlots) {
    const presetModal = document.getElementById('badgePresetModal');
    let backupSlots = null;
    let changedServerSlots = false;

    try {
      if (presetModal && typeof addLoader !== 'undefined') {
        addLoader(presetModal, true);
      }

      const presetSelection = document.getElementById('badgePresetSelection');
      if (!presetSelection || typeof apiFetch === 'undefined') {
        throw new Error(getMessage('importRequiredElementsNotFound'));
      }

      const presetId = presetSelection.value;

      const backupResp = await apiFetch('badge?command=slotList');
      if (!backupResp.ok) {
        throw new Error(getMessage('importFetchSlotsFailed'));
      }
      backupSlots = await backupResp.json();

      const { rows, cols } = getSlotDimensions(backupSlots);
      const normalized = normalizeBadgeSlots(badgeSlots, rows, cols);
      const setResults = await setAllSlots(normalized, rows, cols);
      changedServerSlots = true;

      const failures = setResults.filter(r => !r.ok);
      if (failures.length) {
        throw new Error(getMessage('importSetSlotsFailed', failures.length, setResults.length));
      }

      const saveResp = await apiFetch(`badge?command=presetSave&preset=${presetId}`);
      if (!saveResp.ok) {
        throw new Error(getMessage('importSaveFailed'));
      }

      if (typeof initBadgePresetModal === 'function') {
        try {
          initBadgePresetModal();
          setTimeout(updateButtonTexts, 200);
        } catch (_) {
        }
      }
    } catch (err) {
      console.error('Import preset failed:', err);
      alert(getMessage('importPresetFailed') + err.message);
    } finally {
      try {
        if (changedServerSlots && backupSlots) {
          await rollbackSlots(backupSlots);
        }
      } catch (rollbackErr) {
        console.error('Rollback failed:', rollbackErr);
      }

      if (presetModal && typeof removeLoader !== 'undefined') {
        removeLoader(presetModal);
      }
    }
  }

  waitForInit();
})();
