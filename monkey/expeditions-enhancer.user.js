// ==UserScript==
// @name         YNO Expeditions Enhancer
// @namespace    http://tampermonkey.net/
// @version      1.1.1
// @description  Expansion Script for Expeditions on YNO.
// @author       Zebraed
// @tag          Enhancement
// @match        https://ynoproject.net/*
// @icon         https://ynoproject.net/2kki/images/badge/compass_diamond.gif
// @license      MIT
// @supportURL   https://github.com/Zebraed/yno-userscript
// @installURL   https://raw.githubusercontent.com/Zebraed/yno-userscript/refs/heads/main/monkey/expeditions-enhancer.user.js
// @updateURL    https://raw.githubusercontent.com/Zebraed/yno-userscript/refs/heads/main/monkey/expeditions-enhancer.user.js
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';

  let depthVisible = false;
  let nextLocationDepthHTML = '';
  let temporaryPollingInterval = null;
  let temporaryPollingTimeout = null;
  let lastRecordedLoc = null;
  let lastRecordedTime = 0;
  const THRESHOLD_MS = 2000;
  let latestDepthInfo = null;
  let latestMapName = null;

  function startTemporaryPolling() {
      if (temporaryPollingInterval) clearInterval(temporaryPollingInterval);
      if (temporaryPollingTimeout) clearTimeout(temporaryPollingTimeout);
      temporaryPollingInterval = setInterval(() => {
          findNextLocationAndShow();
      }, 500);
      temporaryPollingTimeout = setTimeout(() => {
          clearInterval(temporaryPollingInterval);
          temporaryPollingInterval = null;
          temporaryPollingTimeout = null;
      }, 5000);
  }

  function initialPolling() {
      let attempts = 0;
      const maxAttempts = 10000 / 500;
      const interval = setInterval(() => {
          attempts++;
          if (findNextLocationAndShow() === true || attempts >= maxAttempts) {
              clearInterval(interval);
          }
      }, 500);
  }

  function cloneWithComputedStyle(element) {
      const clone = element.cloneNode(true);
      const computedStyle = window.getComputedStyle(element);
      let styleString = "";
      for (let i = 0; i < computedStyle.length; i++) {
          const prop = computedStyle[i];
          styleString += `${prop}: ${computedStyle.getPropertyValue(prop)}; `;
      }
      clone.style.cssText = styleString;
      if (
          element.classList.contains('depthFillContainer') ||
          element.classList.contains('maxDepthFillContainer') ||
          element.classList.contains('minDepthFillContainer') ||
          element.classList.contains('depthOutlineContainer')
      ) {
          clone.style.position = 'absolute';
          clone.style.top = '0';
          clone.style.left = '0';
          clone.style.margin = '0';
          clone.style.padding = '0';
          clone.style.transform = 'none';
      }
      const childIcons = clone.querySelectorAll('.starIcon.icon');
      childIcons.forEach(icon => {
          icon.style.margin = '0';
          icon.style.padding = '0';
          icon.style.transform = 'none';
          icon.style.top = '0';
          icon.style.left = '0';
      });
      return clone;
  }

  const styleElem = document.createElement('style');
  styleElem.textContent = `
    .hidden {
      display: none !important;
    }
    #nextDestinationInfoWrapper {
      width: 100% !important;
      display: flex;
      padding-bottom: 8px;
    }
    #nextDestinationStars {
      text-align: end;
      display: flex !important;
      justify-content: flex-end;
      flex-wrap: nowrap;
      align-items: center;
      position: relative;
      transform: translateX(-60px);
      padding-bottom: 10px !important;
      margin-top: 4px !important;
    }
    .icon.fillIcon.iconButton {
      background: transparent;
      border: none;
      cursor: pointer;
      -webkit-appearance: button;
      appearance: button;
      padding: 0;
      margin-right: 4px;
    }
    #toggleNextDestinationIcon {
      transition: margin-top 0.5s ease-in-out, padding 0.5s ease-in-out;
      align-self: baseline;
      padding: 0 4px 0 0;
      z-index: 1;
    }
    #nextDestinationStars .starContainer {
      width: 14px;
      height: 14px;
      position: relative;
      display: inline-block;
      margin: 0 2px 0 0;
    }
    .starContainer .depthContainer {
      position: absolute;
      top: 0;
      left: 0;
    }
    #nextDestinationStars .starContainer .starIcon.icon {
      width: 14px !important;
      height: 14px !important;
      margin: 0 !important;
      display: inline-block !important;
    }
    #nextDestinationStars svg {
      width: 14px !important;
      height: 14px !important;
    }
    #expeditionSettingsModal .toast-child {
      margin-left: 20px;
    }
    #expeditionSettingsModal .formControls {
      list-style: none !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    #expeditionSettingsModal .formControlRow {
      display: flex !important;
      align-items: center !important;
      margin-bottom: 8px !important;
      padding: 4px 0 !important;
    }
    #expeditionSettingsModal .formControlRow label {
      margin: 0 !important;
      margin-right: 10px !important;
      flex: 0 0 auto !important;
    }
    #expeditionSettingsModal .formControlRow > div {
      display: flex !important;
      align-items: center !important;
    }
    #expeditionSettingsModal .checkboxButton {
      vertical-align: middle !important;
      margin: 0 !important;
      padding: 0 !important;
    }
  `;
  document.head.appendChild(styleElem);

  const CONFIG_KEY = 'toastConfig';
  const defaultConfig = {
      enableToast: true,
      autoHideToast: true,
      enableAllFeatures: true,
      enableExpeditionsLog: true
  };
  function loadConfig() {
      try {
          return Object.assign({}, defaultConfig, JSON.parse(localStorage.getItem(CONFIG_KEY)));
      } catch {
          return { ...defaultConfig };
      }
  }
  function saveConfig(cfg) {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
  }
  const config = loadConfig();

  function getLangKey() {
      try {
          return JSON.parse(localStorage.getItem('config'))?.lang || 'en';
      } catch {
          return 'en';
      }
  }
  const toastLabel = {
      ja: "次の目的地",
      en: "Next destination",
      fr: "Prochaine destination",
      es: "Siguiente ubicación",
      de: "Nächster Ort",
      zh: "下一个地点",
      ko: "다음 장소",
      it: "Prossima destinazione",
      pl: "Następna lokalizacja",
      ro: "Locație următoare",
      tr: "Sonraki konum",
      ru: "Следующее место",
      vi: "Địa điểm tiếp theo",
      ar: "الموقع التالي",
      eo: "Sekva loko",
      pt: "Próxima localização"
  };
  const uiText = {
      expeditionsButton: {
          ja: 'ドリームラリー',
          en: 'Expeditions',
          fr: 'Expéditions',
          es: 'Expediciones',
          de: 'Expeditionen',
          zh: '梦远征',
          ko: '탐험',
          it: 'Spedizioni',
          pl: 'Ekspedycje',
          ro: 'Expediții',
          tr: 'Seyahatler',
          ru: 'Походs',
          vi: 'Thám hiểm',
          ar: 'الرحلات الاستكشافية',
          eo: 'Ekspediĉoj',
          pt: 'Expedições'
      },
      title: {
          ja: 'ドリームラリー設定',
          en: 'Expedition Settings',
          fr: 'Paramètres d\'expédition',
          es: 'Configuración de Expedición',
          de: 'Expeditionseinstellungen',
          zh: '梦远征设置',
          ko: '탐험 설정',
          it: 'Impostazioni Spedizioni',
          pl: 'Ustawienia Ekspedycji',
          ro: 'Setări expediție',
          tr: 'Seyahat Ayarları',
          ru: 'Настройки походs',
          vi: 'Cài đặt thám hiểm',
          ar: 'إعدادات الرحلات',
          eo: 'Ekspediĉaj agordoj',
          pt: 'Configurações de Expedição'
      },
      enableToastLabel: {
          ja: '目的地到達通知を有効にする',
          en: 'Enable Notification',
          fr: 'Activer la notification',
          es: 'Habilitar notificación',
          de: 'Benachrichtigung aktivieren',
          zh: '启用通知',
          ko: '알림 활성화',
          it: 'Abilita notifica',
          pl: 'Włącz powiadomienie',
          ro: 'Activează notificarea',
          tr: 'Bildirimleri etkinleştir',
          ru: 'Включить уведомление',
          vi: 'Bật thông báo',
          ar: 'تفعيل الإشعار',
          eo: 'Aktivigi notifikon',
          pt: 'Ativar notificação'
      },
      autoHideToastLabel: {
          ja: '目的地到達通知を自動で閉じる',
          en: 'Auto-hide Notification',
          fr: 'Masquer automatiquement la notification',
          es: 'Ocultar automáticamente la notificación',
          de: 'Benachrichtigung automatisch ausblenden',
          zh: '自动关闭通知',
          ko: '알림 자동 닫기',
          it: 'Chiudi notifica automaticamente',
          pl: 'Automatycznie ukryj powiadomienie',
          ro: 'Ascundere automată notificare',
          tr: 'Bildirimi otomatik kapat',
          ru: 'Автоматически скрывать уведомление',
          vi: 'Tự động ẩn thông báo',
          ar: 'إغلاق الإشعار تلقائياً',
          eo: 'Aŭtomate kaŝi notifikon',
          pt: 'Ocultar notificação automaticamente'
      },
      reset: {
          ja: 'リセット',
          en: 'Reset',
          fr: 'Réinitialiser',
          es: 'Restablecer',
          de: 'Zurücksetzen',
          zh: '重置',
          ko: '초기화',
          it: 'Ripristina',
          pl: 'Zresetuj',
          ro: 'Resetare',
          tr: 'Sıfırla',
          ru: 'Сброс',
          vi: 'Đặt lại',
          ar: 'إعادة تعيين',
          eo: 'Restarigi',
          pt: 'Redefinir'
      },
      displayFixed: {
          ja: '画面に固定表示',
          en: 'Fixed on Screen',
          fr: 'Fixé à l\'écran',
          es: 'Fijado en pantalla',
          de: 'Auf dem Bildschirm fixiert',
          zh: '固定在屏幕上',
          ko: '화면에 고정',
          it: 'Fisso sullo schermo',
          pl: 'Na stałe na ekranie',
          ro: 'Fix pe ecran',
          tr: 'Ekranda sabit',
          ru: 'Закреплено на экране',
          vi: 'Cố định trên màn',
          ar: 'مثبت على الشاشة',
          eo: 'Fiksita sur ekrano',
          pt: 'Fixo na tela'
      },
      expeditionsLogHeader: {
        ja: '到達場所ログ',
        en: 'Destination Logs',
        fr: 'Journaux de destination',
        es: 'Registros de destino',
        de: 'Zielprotokolle',
        zh: '目的地日志',
        ko: '도달 위치 로그',
        it: 'Registri delle destinazioni',
        pl: 'Rejestry miejsc docelowych',
        ro: 'Jurnale de destinație',
        tr: 'Hedef Kayıtları',
        ru: 'Журналы пунктов назначения',
        vi: 'Nhật ký điểm đến',
        ar: 'سجلات الوجهة',
        eo: 'Protokoloj de celolokoj',
        pt: 'Registros de Destino'
      },
      selectDate: {
        ja: '日付選択',
        en: 'Select Date',
        fr: 'Sélectionner la date',
        es: 'Seleccionar fecha',
        de: 'Datum auswählen',
        zh: '选择日期',
        ko: '날짜 선택',
        it: 'Seleziona data',
        pl: 'Wybierz datę',
        ro: 'Selectează data',
        tr: 'Tarih Seç',
        ru: 'Выбрать дату',
        vi: 'Chọn ngày',
        ar: 'اختر التاريخ',
        eo: 'Elektu daton',
        pt: 'Selecionar data'
      },
      readLog: {
        ja: 'ログ表示',
        en: 'Show Log',
        fr: 'Afficher le journal',
        es: 'Mostrar registro',
        de: 'Protokoll anzeigen',
        zh: '显示日志',
        ko: '로그 표시',
        it: 'Mostra registro',
        pl: 'Pokaż dziennik',
        ro: 'Afișează jurnalul',
        tr: 'Günlüğü göster',
        ru: 'Показать журнал',
        vi: 'Hiển thị nhật ký',
        ar: 'عرض السجل',
        eo: 'Montri protokolon',
        pt: 'Exibir registro'
      },
      downloadLog: {
        ja: 'ダウンロード',
        en: 'Download',
        fr: 'Télécharger',
        es: 'Descargar',
        de: 'Herunterladen',
        zh: '下载',
        ko: '다운로드',
        it: 'Scarica',
        pl: 'Pobierz',
        ro: 'Descarcă',
        tr: 'İndir',
        ru: 'Скачать',
        vi: 'Tải xuống',
        ar: 'تنزيل',
        eo: 'Elŝuti',
        pt: 'Baixar'
      },
      deleteLog: {
        ja: '削除',
        en: 'Delete',
        fr: 'Supprimer',
        es: 'Eliminar',
        de: 'Löschen',
        zh: '删除',
        ko: '삭제',
        it: 'Elimina',
        pl: 'Usuń',
        ro: 'Ștergere',
        tr: 'Sil',
        ru: 'Удалить',
        vi: 'Xóa',
        ar: 'حذف',
        eo: 'Forigi',
        pt: 'Excluir'
      },
      noLog: {
        ja: '(ログがありません)',
        en: '(No log data)',
        fr: '(Aucune donnée de journal)',
        es: '(Sin datos de registro)',
        de: '(Keine Protokolldaten)',
        zh: '(无日志数据)',
        ko: '(로그 데이터 없음)',
        it: '(Nessun dato di registro)',
        pl: '(Brak danych dziennika)',
        ro: '(Nu există date de jurnal)',
        tr: '(Günlük verisi yok)',
        ru: '(Никаких журналов)',
        vi: '(Không có dữ liệu nhật ký)',
        ar: '(لا يوجد سجل)',
        eo: '(Neniu protokoldato disponebla)',
        pt: '(Sem dados de registro)'
      },
      enableLogLabel: {
        ja: '到達場所ログを有効にする',
        en: 'Enable Destination Logs',
        fr: 'Activer les journaux de destination',
        es: 'Habilitar registros de destino',
        de: 'Zielprotokolle aktivieren',
        zh: '启用目的地日志',
        ko: '도달 위치 로그 활성화',
        it: 'Abilita registri delle destinazioni',
        pl: 'Włącz rejestry miejsc docelowych',
        ro: 'Activează jurnalele de destinație',
        tr: 'Hedef Günlüklerini Etkinleştir',
        ru: 'Включить журнал пунктов назначения',
        vi: 'Bật nhật ký điểm đến',
        ar: 'قم بتمكين سجلات الوجهة',
        eo: 'Ebligi cellokajn protokolojn',
        pt: 'Ativar registros de destino'
      }
  };

  function isGameNameElement(el) {
      if (el.classList.contains('gameLink')) {
        return true;
      }
      return false;
    }

  function getLocalizedMapName(detailsContainer) {
    if (!detailsContainer) return '';

    let candidateChildren = Array.from(detailsContainer.children);

    candidateChildren = candidateChildren.filter(el => {
      if (isGameNameElement(el)) return false;
      if (!el.innerText.trim()) return false;
      return true;
    });

    if (candidateChildren.length === 0) {
      return '';
    } else if (candidateChildren.length === 1) {
      return candidateChildren[0].innerText.trim();
    } else {
      // is this necessary?
      return candidateChildren[0].innerText.trim();
    }
  }

  function showMessage(html, type) {
      let wrapper = document.getElementById('nextDestinationInfoWrapper');
      if (!wrapper) {
          wrapper = document.createElement('div');
          wrapper.id = 'nextDestinationInfoWrapper';
          wrapper.className = 'info';

          const toggleButton = document.createElement('button');
          toggleButton.id = 'toggleNextDestinationIcon';
          toggleButton.className = 'icon fillIcon iconButton';
          toggleButton.setAttribute('data-i18n', '[title]tooltips.chat.toggleNextLocation');
          toggleButton.setAttribute('i18n-options', '{}');
          toggleButton.innerHTML = `
        <svg viewBox="0 0 18 18" width="14" height="14">
          <path d="m0 9l6.5-1.5-1.5-2.5 2.5 1.5 1.5-6.5 1.5 6.5 2.5-1.5-1.5 2.5 6.5 1.5-6.5 1.5 1.5 2.5-2.5-1.5-1.5 6.5-1.5-6.5-2.5 1.5 1.5-2.5-6.5-1.5"/>
        </svg>
      `;
          toggleButton.addEventListener('click', () => {
              let starsDiv = document.getElementById('nextDestinationStars');
              if (!starsDiv) return;
              depthVisible = !depthVisible;
              if (depthVisible) {
                  starsDiv.classList.remove('hidden');
              } else {
                  starsDiv.classList.add('hidden');
              }
          });
          wrapper.appendChild(toggleButton);

          const labelSpan = document.createElement('span');
          labelSpan.id = 'nextDestinationLabel';
          const refLabel = document.getElementById('locationLabel');
          labelSpan.className = refLabel ? refLabel.className : 'infoLabel nowrap';
          wrapper.appendChild(labelSpan);

          const textSpan = document.createElement('span');
          textSpan.id = 'nextDestinationText';
          const refText = document.getElementById('locationText');
          textSpan.className = refText ? refText.className : 'infoText nofilter';
          textSpan.style.textAlign = 'right';
          wrapper.appendChild(textSpan);

          const chatboxInfo = document.getElementById('chatboxInfo');
          if (chatboxInfo) {
              chatboxInfo.appendChild(wrapper);
          } else {
              document.body.appendChild(wrapper);
          }
      }

      const lang = getLangKey();
      const labelText = toastLabel[lang] || toastLabel.en;
      document.getElementById('nextDestinationLabel').textContent = labelText + ': ';

      const textEl = document.getElementById('nextDestinationText');
      textEl.innerHTML = html;
      textEl.style.textAlign = 'right';

      let starsDiv = document.getElementById('nextDestinationStars');
      if (!starsDiv) {
          starsDiv = document.createElement('div');
          starsDiv.id = 'nextDestinationStars';
          const refText = document.getElementById('locationText');
          if (refText) {
              starsDiv.className = refText.className;
          }
          if (!depthVisible) {
              starsDiv.classList.add('hidden');
          }
          const chatboxInfo = document.getElementById('chatboxInfo');
          if (chatboxInfo) {
              chatboxInfo.appendChild(starsDiv);
          } else {
              document.body.appendChild(starsDiv);
          }
      }
      starsDiv.innerHTML = nextLocationDepthHTML;
  }

  function findNextLocationAndShow() {
      if (!config.enableAllFeatures) {
          const wrapper = document.getElementById('nextDestinationInfoWrapper');
          if (wrapper) wrapper.style.display = 'none';
          return false;
      }
      const wrapper = document.getElementById('nextDestinationInfoWrapper');
      if (wrapper) wrapper.style.display = '';

      const entries = document.querySelectorAll('.eventLocationListEntry');
      for (const entry of entries) {
        const checkbox = entry.querySelector('.checkbox');
        const isIncomplete = checkbox && !checkbox.classList.contains('toggled');
        if (!isIncomplete) continue;

        const detailsContainer = entry.querySelector('.detailsContainer');
        if (!detailsContainer) continue;

        const mapName = getLocalizedMapName(detailsContainer);
        const depthInfo = getDepthInfo(detailsContainer)
        latestMapName = mapName;
        latestDepthInfo = [depthInfo[0], depthInfo[1]];

        let placeElement = null;
        for (const child of detailsContainer.children) {
          if (!child.innerText.trim()) continue;
          if (isGameNameElement(child)) continue;
          placeElement = child;
          break;
        }
        if (!placeElement) continue;
        const clone = placeElement.cloneNode(true);
        let placeHTML = `<div>${clone.outerHTML}</div>`;

      const gameLinkEl = entry.querySelector('.gameLink');
      if (gameLinkEl && gameLinkEl.href) {
        const match = gameLinkEl.href.match(/https:\/\/ynoproject\.net\/([^\/]+)\//);
        if (match && match[1]) {
          placeHTML += ` (<a href="${gameLinkEl.href}" target="_blank">${gameLinkEl.innerText.trim()}</a>)`;
        }
      }

      const depthOutline = entry.querySelector('.detailsContainer .depthContainer.depthOutlineContainer');
      const outlineHTML = depthOutline ? cloneWithComputedStyle(depthOutline).outerHTML : '';

      const fillElements = entry.querySelectorAll(
          '.detailsContainer .depthContainer.depthFillContainer, ' +
          '.detailsContainer .depthContainer.maxDepthFillContainer, ' +
          '.detailsContainer .depthContainer.minDepthFillContainer'
      );
      let fillHTML = '';
      fillElements.forEach(el => {
          const cloneEl = cloneWithComputedStyle(el);
          fillHTML += cloneEl.outerHTML;
      });

      if (outlineHTML) {
          nextLocationDepthHTML = `<div class="starContainer">` + outlineHTML + fillHTML + `</div>`;
      } else {
          nextLocationDepthHTML = '';
      }
      showMessage(placeHTML, 'expedition');
      return true;
  }
  nextLocationDepthHTML = '';
  latestDepthInfo = null;
  latestMapName = null;

  return false;
}

let lastToastTime = 0;
const TOAST_INTERVAL = 3000;

function callExpeditionUpdate() {
  return new Promise((resolve) => {
    setTimeout(() => {
      const foundNext = findNextLocationAndShow();
      requestAnimationFrame(() => {
        if (foundNext && config.enableToast && config.enableAllFeatures) {
          const now = Date.now();
          if (now - lastToastTime > TOAST_INTERVAL) {
            lastToastTime = now;
            const lang = getLangKey();
            const labelText = toastLabel[lang] || toastLabel.en;
            const nextDestinationHTML = document.getElementById('nextDestinationText').innerHTML;
            showToastMessage(
              labelText + ': ' + nextDestinationHTML,
              'expedition',
              true,
              undefined,
              !config.autoHideToast
            );

            if (navigator.userAgent.includes('Firefox')) {
              const toastEls = document.querySelectorAll('.toast');
              const toastEl = toastEls[toastEls.length - 1];
              if (toastEl) {
                let handled = false;

                const fix = () => {
                  if (handled) return;
                  handled = true;
                  const range = document.createRange();
                  range.selectNodeContents(toastEl);
                  const selection = window.getSelection();
                  selection.removeAllRanges();
                  selection.addRange(range);
                  setTimeout(() => {
                    selection.removeAllRanges();
                  }, 50);
                };

                toastEl.addEventListener('animationend', fix, { once: true });
                setTimeout(fix, 200);
              }
            }
          }
        }
        resolve();
      });
    }, 600);
  });
}

function hookExpedition() {
  const interval = setInterval(() => {
      let wrappedCount = 0;

      if (typeof window.onClaimEventLocationPoints === 'function') {
        if (!window.onClaimEventLocationPoints._expeditionWrapped) {
          const origFn = window.onClaimEventLocationPoints;
          window.onClaimEventLocationPoints = function(loc, free, result) {
            origFn.call(this, loc, free, result);

            if (result < 0) {
              return;
            }

            const now = Date.now();
            if (loc === lastRecordedLoc && (now - lastRecordedTime) < THRESHOLD_MS) {
              return;
            }
            lastRecordedLoc = loc;
            lastRecordedTime = now;

            const mapName = latestMapName || loc;
            const depthInfo = latestDepthInfo || [0, 0];

            startTemporaryPolling();
            callExpeditionUpdate()
              .then(() => {
                if (config.enableExpeditionsLog) {
                  addExpeditionsLog(gameId, mapName, depthInfo);
                }
              })
              .catch(err => {
                console.error("callExpeditionUpdate Error:", err);
              });
          };
          window.onClaimEventLocationPoints._expeditionWrapped = true;
        }
        wrappedCount++;
      }

      if (typeof window.onUpdateEventPeriod === 'function') {
        if (!window.onUpdateEventPeriod._expeditionWrapped) {
          const origFn = window.onUpdateEventPeriod;
          window.onUpdateEventPeriod = function(eventPeriod) {
            origFn.call(this, eventPeriod);
            callExpeditionUpdate();
          };
          window.onUpdateEventPeriod._expeditionWrapped = true;
        }
        wrappedCount++;
      }

      if (typeof window.fetchAndUpdatePlayerInfo === 'function') {
        if (!window.fetchAndUpdatePlayerInfo._expeditionWrapped) {
          const origFn = window.fetchAndUpdatePlayerInfo;
          window.fetchAndUpdatePlayerInfo = function() {
            const ret = origFn.apply(this, arguments);
            if (ret && typeof ret.then === 'function') {
              ret.then(() => callExpeditionUpdate());
            } else {
              setTimeout(callExpeditionUpdate, 2000);
            }
            return ret;
          };
          window.fetchAndUpdatePlayerInfo._expeditionWrapped = true;
        }
        wrappedCount++;
      }

      if (wrappedCount === 3) {
        clearInterval(interval);
      }
    }, 300);
}

function waitForUI() {
  const uiInterval = setInterval(() => {
      const settingsModal = document.getElementById('settingsModal');
      if (settingsModal?.querySelector('.buttonRow')) {
          clearInterval(uiInterval);
          injectUI();
          document.getElementById('lang')?.addEventListener('change', () => {
              setTimeout(injectUI, 300);
              setTimeout(findNextLocationAndShow, 2000);
          });
      }
  }, 400);
}

hookExpedition();
waitForUI();
if (document.readyState === "complete") {
  initialPolling();
} else {
  window.addEventListener('load', () => {
      initialPolling();
  });
}

function getCurrentUTCDateString() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

function addExpeditionsLog(gameId, locationName, depthInfo) {
  let logText = '';
  if ( !depthInfo[1] ){
    logText = `${locationName} (${depthInfo[0]})`;
  } else {
    logText = `${locationName} (${depthInfo[0]}, ${depthInfo[1]})`;
  }
  const dateStr = getCurrentUTCDateString();
  const key = `expeditionsLog_${gameId}_${dateStr}`;

  const rawData = localStorage.getItem(key);
  let logArr = [];
  try {
    logArr = rawData ? JSON.parse(rawData) : [];
  } catch (err) {
    console.warn("[DEBUG] parse error on existing data:", err);
    logArr = [];
  }

  logArr.push(logText);

  localStorage.setItem(key, JSON.stringify(logArr));
}

function refreshExpeditionsLogDates(gameId) {
  const modal = document.getElementById('expeditionSettingsModal');
  if (!modal) return;

  const expeditionsLogDateSelect = modal.querySelector('#expeditionsLogDateSelect');
  if (!expeditionsLogDateSelect) return;

  expeditionsLogDateSelect.innerHTML = '';

  const dateList = [];
  for (let i = 0; i < localStorage.length; i++) {
    const keyName = localStorage.key(i);
    if (keyName && keyName.startsWith(`expeditionsLog_${gameId}_`)) {
      const dateStr = keyName.replace(`expeditionsLog_${gameId}_`, '');
      dateList.push(dateStr);
    }
  }

  dateList.sort().reverse();

  for (let dateStr of dateList) {
    const option = document.createElement('option');
    option.value = dateStr;
    option.textContent = dateStr;
    expeditionsLogDateSelect.appendChild(option);
  }
}

function parseDepth(containerEl) {
  if (!containerEl) return 0;

  const starIcons = containerEl.querySelectorAll('.starIcon.icon');
  let depthTotal = 0;

  starIcons.forEach(iconEl => {
    if (iconEl.classList.contains('fillIcon')) {
      depthTotal += 1.0;
    } else {
      depthTotal += 0.5;
    }
  });
  return depthTotal;
}

function getDepthInfo(detailsContainer) {
  if (!detailsContainer) return [0, 0];

  const minEl = detailsContainer.querySelector('.depthContainer.minDepthFillContainer');
  const maxEl = detailsContainer.querySelector('.depthContainer.maxDepthFillContainer');
  const fallbackEl = detailsContainer.querySelector('.depthContainer.depthFillContainer');

  let actualDepth = 0;
  let maxDepth    = 0;

  if (minEl) {
    actualDepth = parseDepth(minEl);
  } else if (fallbackEl) {
    actualDepth = parseDepth(fallbackEl);
  }

  if (maxEl) {
    maxDepth = parseDepth(maxEl);
  }

  return [actualDepth, maxDepth];
}

function injectUI() {
  document.getElementById('expeditionSettingsModal')?.remove();
  document.getElementById('openExpeditionSettingsButton')?.remove();

  const settingsModal = document.getElementById('settingsModal');
  const buttonRow = settingsModal?.querySelector('.buttonRow');
  if (!buttonRow) return;

  const lang = getLangKey();
  const openButton = document.createElement('button');
  openButton.type = 'button';
  openButton.id = 'openExpeditionSettingsButton';
  openButton.innerText = uiText.expeditionsButton[lang] || uiText.expeditionsButton.en;
  openButton.classList.add('unselectable');
  buttonRow.appendChild(openButton);

  function getUiLogText(textObj, key, lang) {
    if (textObj[key]?.[lang]) {
      return textObj[key][lang];
    } else {
      return textObj[key].en;
    }
  }

  const modal = document.createElement('div');
  modal.id = 'expeditionSettingsModal';
  modal.classList.add('modal', 'hidden');
  modal.style.opacity = '1';

  modal.innerHTML = `
  <div class="modalHeader">
    <h1 class="modalTitle">${uiText.title[lang]}</h1>
    <a href="javascript:void(0);" class="modalClose">✖</a>
  </div>
  <div class="modalContent">
    <ul class="formControls" style="width:100%">
      <li class="formControlRow">
        <label class="unselectable">${uiText.displayFixed[lang] || uiText.displayFixed.en}</label>
        <div>
          <button id="enableAllFeaturesToggleButton" class="checkboxButton unselectable ${config.enableAllFeatures ? 'toggled' : ''}">
            <span></span>
          </button>
        </div>
      </li>
      <li class="formControlRow">
        <label class="unselectable">${uiText.enableToastLabel[lang]}</label>
        <div>
          <button id="enableToastToggleButton" class="checkboxButton unselectable ${config.enableToast ? 'toggled' : ''}">
            <span></span>
          </button>
        </div>
      </li>
      <li class="formControlRow toast-child" id="autoHideToastRow" style="display: ${config.enableToast ? 'flex' : 'none'};">
        <label class="unselectable">${uiText.autoHideToastLabel[lang]}</label>
        <div>
          <button id="autoHideToastToggleButton" class="checkboxButton unselectable ${config.autoHideToast ? 'toggled' : ''}">
            <span></span>
          </button>
        </div>
      </li>

      <li class="formControlRow">
        <label class="unselectable">${ getUiLogText(uiText, 'enableLogLabel', lang) }</label>
        <div>
          <button id="enableExpeditionsLogToggleButton" class="checkboxButton unselectable ${config.enableExpeditionsLog ? 'toggled' : ''}">
            <span></span>
          </button>
        </div>
      </li>
    </ul>

    <h2 style="margin-top:16px;" id="expeditionsLogHeader">
      ${ getUiLogText(uiText, 'expeditionsLogHeader', lang) }
    </h2>
    <div id="expeditionsLogControls">
      <label class="unselectable">${ getUiLogText(uiText, 'selectDate', lang) }:
        <select id="expeditionsLogDateSelect" style="margin-left:4px;" class="infoText"></select>
      </label>
      <button id="readExpeditionsLogButton" type="button" class="unselectable" style="margin-left:8px;">
        ${ getUiLogText(uiText, 'readLog', lang) }
      </button>
      <button id="downloadExpeditionsLogButton" type="button" class="unselectable" style="margin-left:8px;">
        ${ getUiLogText(uiText, 'downloadLog', lang) }
      </button>
      <button id="deleteExpeditionsLogButton" type="button" class="unselectable" style="margin-left:8px;">
        ${ getUiLogText(uiText, 'deleteLog', lang) }
      </button>
      <div id="expeditionsLogDisplay" style="
        margin-top: 12px;
        border: 1px solid #ccc;
        padding: 8px;
        min-height: 80px;
        max-height: 200px;
        overflow-x: auto;
      ">
        ${ getUiLogText(uiText, 'noLog', lang) }
      </div>
    </div>
  </div>
  <div class="modalFooter">
    <button id="resetExpeditionSettings" class="unselectable" type="button">${uiText.reset[lang]}</button>
  </div>
  `;
  settingsModal.insertAdjacentElement('afterend', modal);

  const enableAllFeaturesToggleButton = modal.querySelector('#enableAllFeaturesToggleButton');
  enableAllFeaturesToggleButton.onclick = () => {
    config.enableAllFeatures = !config.enableAllFeatures;
    enableAllFeaturesToggleButton.classList.toggle('toggled', config.enableAllFeatures);
    saveConfig(config);
    const wrapper = document.getElementById('nextDestinationInfoWrapper');
    if (wrapper) {
      wrapper.style.setProperty('display', config.enableAllFeatures ? '' : 'none', 'important');
    }
    const starsDiv = document.getElementById('nextDestinationStars');
    if (starsDiv) {
      starsDiv.style.setProperty('display', config.enableAllFeatures ? '' : 'none', 'important');
    }
  };

  const enableToastToggleButton = modal.querySelector('#enableToastToggleButton');
  enableToastToggleButton.onclick = () => {
      config.enableToast = !config.enableToast;
      enableToastToggleButton.classList.toggle('toggled', config.enableToast);

      const autoHideRow = modal.querySelector('#autoHideToastRow');
      if (autoHideRow) {
          autoHideRow.style.setProperty('display', config.enableToast ? 'flex' : 'none', 'important');
      }
      saveConfig(config);
  };

  const autoHideToastToggleButton = modal.querySelector('#autoHideToastToggleButton');
  autoHideToastToggleButton.onclick = () => {

      config.autoHideToast = !config.autoHideToast;
      autoHideToastToggleButton.classList.toggle('toggled', config.autoHideToast);
      saveConfig(config);
  };

  const enableExpeditionsLogToggleButton = modal.querySelector('#enableExpeditionsLogToggleButton');
  enableExpeditionsLogToggleButton.onclick = () => {
    config.enableExpeditionsLog = !config.enableExpeditionsLog;
    enableExpeditionsLogToggleButton.classList.toggle('toggled', config.enableExpeditionsLog);
    saveConfig(config);

    const expeditionsLogHeader = document.getElementById('expeditionsLogHeader');
    const expeditionsLogControls = document.getElementById('expeditionsLogControls');
    if (!config.enableExpeditionsLog) {
      expeditionsLogHeader.classList.add('hidden');
      expeditionsLogControls.classList.add('hidden');
    } else {
      expeditionsLogHeader.classList.remove('hidden');
      expeditionsLogControls.classList.remove('hidden');
    }
  };

  modal.querySelector('#resetExpeditionSettings').onclick = () => {
      config.enableToast = defaultConfig.enableToast;
      config.autoHideToast = defaultConfig.autoHideToast;
      config.enableAllFeatures = defaultConfig.enableAllFeatures;
      config.enableExpeditionsLog = defaultConfig.enableExpeditionsLog;

      enableToastToggleButton.classList.toggle('toggled', config.enableToast);
      autoHideToastToggleButton.classList.toggle('toggled', config.autoHideToast);
      enableAllFeaturesToggleButton.classList.toggle('toggled', config.enableAllFeatures);
      enableExpeditionsLogToggleButton.classList.toggle('toggled', config.enableExpeditionsLog);

      const autoHideRow = modal.querySelector('#autoHideToastRow');
      if (autoHideRow) {
          autoHideRow.style.setProperty('display', config.enableToast ? 'flex' : 'none', 'important');
      }
      const wrapper = document.getElementById('nextDestinationInfoWrapper');
      if (wrapper) {
          wrapper.style.display = config.enableAllFeatures ? '' : 'none';
      }
      saveConfig(config);

      findNextLocationAndShow();

      const expeditionsLogHeader = document.getElementById('expeditionsLogHeader');
      const expeditionsLogControls = document.getElementById('expeditionsLogControls');
      if (!config.enableExpeditionsLog) {
        expeditionsLogHeader.classList.add('hidden');
        expeditionsLogControls.classList.add('hidden');
      } else {
        expeditionsLogHeader.classList.remove('hidden');
        expeditionsLogControls.classList.remove('hidden');
      }
  };

  openButton.onclick = () => {
    refreshExpeditionsLogDates(gameId);
    openModal('expeditionSettingsModal', null, 'settingsModal');
  };
  modal.querySelector('.modalClose')?.addEventListener('click', () => {
      closeModal(modal.id, 'settingsModal');
  });

  const expeditionsLogDateSelect = modal.querySelector('#expeditionsLogDateSelect');
  expeditionsLogDateSelect.innerHTML = '';

  for (let i = 0; i < localStorage.length; i++) {
    const keyName = localStorage.key(i);
    if (keyName && keyName.startsWith(`expeditionsLog_${gameId}_`)) {
      const dateStr = keyName.replace(`expeditionsLog_${gameId}_`, '');
      const option = document.createElement('option');
      option.value = dateStr;
      option.textContent = dateStr;
      expeditionsLogDateSelect.appendChild(option);
    }
  }

  const expeditionsLogDisplay = modal.querySelector('#expeditionsLogDisplay');
  function showExpeditionsLog(gameId, dateStr) {
    const key = `expeditionsLog_${gameId}_${dateStr}`;
    const raw = localStorage.getItem(key);
    let logArr = [];
    if (raw) {
      try {
        logArr = JSON.parse(raw);
      } catch (err) {
        logArr = [];
      }
    }
    if (!logArr.length) {
      expeditionsLogDisplay.innerHTML = uiText.noLog[lang];
      return;
    }

    const ul = document.createElement('ul');
    logArr.forEach((locationName) => {
      const li = document.createElement('li');
      li.textContent = locationName;
      ul.appendChild(li);
    });
    expeditionsLogDisplay.innerHTML = '';
    expeditionsLogDisplay.appendChild(ul);
  }

  const readExpeditionsLogButton = modal.querySelector('#readExpeditionsLogButton');
  readExpeditionsLogButton.onclick = () => {
    const dateStr = expeditionsLogDateSelect.value;
    if (!dateStr) return;
    showExpeditionsLog(gameId, dateStr);
  };

  const downloadExpeditionsLogButton = modal.querySelector('#downloadExpeditionsLogButton');
  downloadExpeditionsLogButton.onclick = () => {
    const dateStr = expeditionsLogDateSelect.value;
    if (!dateStr) return;
    const key = `expeditionsLog_${gameId}_${dateStr}`;
    const raw = localStorage.getItem(key);
    if (!raw) return;
    let logArr = [];
    try {
      logArr = JSON.parse(raw);
    } catch (err) {
      logArr = [];
    }
    const content = logArr.join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expeditionsLog_${gameId}_${dateStr}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const deleteExpeditionsLogButton = modal.querySelector('#deleteExpeditionsLogButton');
  deleteExpeditionsLogButton.onclick = () => {
    const dateStr = expeditionsLogDateSelect.value;
    if (!dateStr) return;
    const key = `expeditionsLog_${gameId}_${dateStr}`;
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key);
      showExpeditionsLog(gameId, dateStr);
    }
  };
}
})();