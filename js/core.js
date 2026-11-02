// =========================================================================
// FILE: js/core.js
// BANK OF MIROBYTE — Ядро, Firebase Realtime DB, Кэш, Транзакции и События
// =========================================================================

import {
  MAX_LOGIN_LENGTH,
  MAX_COMMENT_LENGTH,
  MAX_IMAGE_BYTES,
  MAX_CHART_POINTS,
  MAX_USER_BUSINESSES,
  MAX_BUSINESS_LEVEL,
  OWNER_USERNAME,
  MAX_HOLDINGS_PER_ASSET,
  MAX_TRADE_QTY,
  TRADE_COOLDOWN_MS,
  ASSET_SELL_TAX_RATE,
  LUXURY_RESALE_TAX_RATE,
  P2P_BANK_FEE_RATE,
  TELEGRAPH_TTL_MS,
  TAX_DECLARATION_PERIOD_MS,
  TAX_NOTE_INSTALLMENTS_COUNT,
  POLYGON_MIN_MINES_TIME_MS,
  POLYGON_MIN_HACK_TIME_MS,
  POLYGON_DAILY_EARN_LIMIT,
  DEFAULT_BUSINESS_CATALOG,
  DEFAULT_SETTINGS,
  LUXURY_ART_CATALOG,
  LUXURY_GARAGE_CATALOG,
  REAL_ESTATE_CATALOG,
  COSMIC_EMPIRE_CATALOG,
  COSMIC_BASE_TYPES,
  SPACE_MINING_CATALOG,
  BANKNOTES_CONFIG,
  DEFAULT_MARKET_ASSETS,
  PRIVILEGE_FRAMES_CATALOG,
  PRIVILEGE_TITLES_CATALOG,
  BUILTIN_PAID_CARDS_CATALOG,
  CARD_THEMES,
  normalizeLogin,
  escapeHtml,
  validPositiveAmount,
  cleanFirebaseObject,
  formatDurationHuman,
  formatCountdownHMS,
  getAvatarFrameClass,
  getAvatarFrameCornerEmoji,
  generateRoyalArtSvgDataUrl,
  mergeBusinessCatalogWithDefaults,
  getBusinessUpgradeCost,
  calculateTotalBusinessInvestment,
  getBusinessHourlyIncome,
  computeEffectiveSlotCondition,
  getSlotMaintenanceCost,
  getBusinessUpgradeDurationMs,
  getUserBusinessSlotsEntries,
  countUserOwnedAssetById,
  getCarCurrentCondition,
  getCarServiceCost,
  calculateUserDailyTaxBill,
  calculateUserTaxDeclaration,
  calculateUserPendingBusinessRevenue,
  calculateUserRealEstateRent,
  getCosmicBaseUpgradeCost,
  getCosmicLocationHourlyYield,
  calculateUserCosmicRent,
  computeGrowingAssetMeanPrice,
  sanitizeMarketAssetRecord,
  calculateUserPortfolioValue,
  calculateCourtTransferDurationMs,
  calculateMinesNextMultiplier,
  transformToModernOldRussian,
  timingSafeEqualString,
  derivePasswordHash,
  createPasswordRecord,
  evaluatePasswordStrength
} from './math.js';

import {
  bindCoreToUI,
  formatBaity,
  getDynamicShopPrice,
  getRawSavedShopPrice,
  applyDynamicSiteIconAndManifest,
  updateOnlineIndicator,
  showToast,
  askRoyalConfirm,
  renderBankEmblem,
  applyCardThemeToDOM,
  requestRender,
  updateDesktopAndMobileNavHighlights,
  renderGlobalActiveEventBanner,
  renderCurrentView,
  renderNavBarRight,
  updatePortfolioBadgeOnCard,
  renderDashboard,
  renderPlayerAnalyticsDashboard,
  setP2PAuctionModalCategory,
  handleP2PAuctionModalSearch,
  selectP2PAuctionCardItem,
  openCreateP2PAuctionModal,
  closeCreateP2PAuctionModal,
  renderP2PAuctionsView,
  renderP2PAndCourtStatusOnDashboard,
  renderEarnAndLoansView,
  renderBusinessesCatalog,
  updateRealtimeBusinessAndHackCounters,
  renderCasinoClubView,
  renderMinesBoard,
  renderSpaceMiningView,
  updateSpaceMiningLiveProgress,
  renderMarketView,
  updateTradeTotalCost,
  drawMarketXYChart,
  renderPrivilegeShop,
  renderLuxuryArtShop,
  renderLuxuryGarageShop,
  renderRealEstateShop,
  renderCosmicEmpireShop,
  renderMarketListings,
  renderUserInventoryVault,
  renderLeaderboard,
  renderBanknotes,
  renderMailView,
  renderPublicProfileTabItems,
  drawBalanceHistoryChart,
  renderAdminView
} from './ui.js';

// -------------------------------------------------------------------------
// 1. FIREBASE INIT & SERVER TIME SYNC
// -------------------------------------------------------------------------
const firebaseConfig = {
  databaseURL: "https://mirobyte-bank-default-rtdb.firebaseio.com"
};
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
export const db = firebase.database();

let serverTimeOffset = 0;
export const getServerTime = () => Date.now() + serverTimeOffset;
export const serverTimestamp = () => firebase.database.ServerValue.TIMESTAMP;

db.ref('.info/serverTimeOffset').on('value', (snap) => {
  serverTimeOffset = Number(snap.val() || 0);
});

db.ref('.info/connected').on('value', (snap) => {
  updateOnlineIndicator(!!snap.val());
});

export function runTransaction(refOrPath, transactionUpdateFn) {
  const targetRef = typeof refOrPath === 'string' ? db.ref(refOrPath) : refOrPath;
  return targetRef.transaction(transactionUpdateFn);
}

const GEMINI_API_KEY = "";

// -------------------------------------------------------------------------
// 2. СОСТОЯНИЕ ПРИЛОЖЕНИЯ, НАСТРОЙКИ И БЫСТРЫЙ КЭШ (MirobyteCache)
// -------------------------------------------------------------------------
export const userPrefs = {
  autoConvertUnits: localStorage.getItem('mb_pref_auto_convert_units') === 'true',
  autoOldRus: localStorage.getItem('mb_pref_auto_oldrus') === 'true',
  showXYGrid: localStorage.getItem('mb_pref_xy_grid') !== 'false',
  phoneShell: localStorage.getItem('mb_pref_phone_shell') === 'true'
};

if (userPrefs.phoneShell) document.body.classList.add('phone-shell-mode');

let initialCachedProfile = null;
try {
  initialCachedProfile = JSON.parse(localStorage.getItem('mirobyte_cached_profile') || 'null');
} catch (e) {}

export const state = {
  currentUser: localStorage.getItem('mirobyte_active_user') || null,
  cachedProfile: initialCachedProfile,
  isDemoMode: false,
  authMode: 'login',
  mailFilter: 'inbox',
  activeTelegraphPeer: null,
  treasuryMode: 'grant',
  activeTabName: 'dashboard',
  currentRoute: '/',
  currentMarketSubTab: 'privileges',
  currentAdminSubTab: 'users',
  adminUserFilter: 'all',
  currentCasinoGame: 'mines',
  selectedMarketAssetId: 'SHRM',
  currentVaultFilter: 'all',
  currentPubProfileUser: null,
  currentPubProfileTab: 'business',
  lastEarnActionTime: 0
};

export const appData = {
  users: {},
  transactions: [],
  mailBox: {},
  messages: [],
  banknoteImages: {},
  cardDesigns: {},
  marketAssets: JSON.parse(JSON.stringify(DEFAULT_MARKET_ASSETS)),
  marketListings: {},
  p2pOffers: {},
  p2pAuctions: {},
  courtTransfers: {},
  loans: {},
  settings: JSON.parse(JSON.stringify(DEFAULT_SETTINGS)),
  securityLogs: [],
  bankEmblemImage: localStorage.getItem('mirobyte_cached_emblem') || null,
  customMoneySupply: null,
  bankReserve: 5000000
};

export const MirobyteCache = (() => {
  const DB_NAME = 'MirobyteBankCacheDB';
  const STORE_NAME = 'snapshots';
  const LS_PREFIX = 'mb_cache_v2_';
  let dbPromise = null;

  function openIDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve) => {
      if (!window.indexedDB) return resolve(null);
      try {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = (e) => {
          const idb = e.target.result;
          if (!idb.objectStoreNames.contains(STORE_NAME)) idb.createObjectStore(STORE_NAME);
        };
        req.onsuccess = (e) => resolve(e.target.result);
        req.onerror = () => resolve(null);
      } catch (err) { resolve(null); }
    });
    return dbPromise;
  }

  async function set(key, value) {
    try {
      if (['activeProfile', 'bankEmblemImage', 'marketAssets'].includes(key)) {
        localStorage.setItem(LS_PREFIX + key, JSON.stringify(value));
      }
    } catch (e) {}
    try {
      const idb = await openIDB();
      if (!idb) {
        try { localStorage.setItem(LS_PREFIX + key, JSON.stringify(value)); } catch (e) {}
        return;
      }
      const tx = idb.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(value, key);
    } catch (e) {}
  }

  async function get(key) {
    try {
      const idb = await openIDB();
      if (idb) {
        const val = await new Promise((resolve) => {
          const tx = idb.transaction(STORE_NAME, 'readonly');
          const req = tx.objectStore(STORE_NAME).get(key);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(undefined);
        });
        if (val !== undefined) return val;
      }
    } catch (e) {}
    try {
      const raw = localStorage.getItem(LS_PREFIX + key);
      return raw ? JSON.parse(raw) : undefined;
    } catch (e) { return undefined; }
  }

  return { set, get };
})();

const activeOperationLocks = new Set();
const processedOperationIds = new Set();

export async function withOperationLock(lockKey, buttonEl, asyncFn) {
  if (guardDemoReadOnly()) return;
  const key = String(lockKey || 'global_op');
  if (activeOperationLocks.has(key)) return;
  activeOperationLocks.add(key);

  let originalHtml = null;
  if (buttonEl && buttonEl instanceof HTMLElement) {
    originalHtml = buttonEl.innerHTML;
    buttonEl.disabled = true;
    buttonEl.classList.add('pointer-events-none', 'opacity-60');
    buttonEl.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin mr-1"></i> Обработка...`;
  }

  try {
    return await asyncFn();
  } finally {
    setTimeout(() => {
      activeOperationLocks.delete(key);
      if (buttonEl && buttonEl instanceof HTMLElement) {
        buttonEl.disabled = false;
        buttonEl.classList.remove('pointer-events-none', 'opacity-60');
        if (originalHtml !== null && buttonEl.innerHTML.includes('Обработка...')) {
          buttonEl.innerHTML = originalHtml;
        }
      }
    }, 400);
  }
}

export function newOperationId(prefix = 'MB') {
  return `${prefix}-${getServerTime()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

// -------------------------------------------------------------------------
// 3. ДЕМО-РЕЖИМ (READ-ONLY) И ПОИСК ПОЛЬЗОВАТЕЛЕЙ
// -------------------------------------------------------------------------
const DEMO_USER_LOGIN = 'Гость_Комиссии';

export function createDemoGuestProfile() {
  const now = getServerTime();
  return {
    username: DEMO_USER_LOGIN,
    balance: 285000,
    isAdmin: false,
    isSuperAdmin: false,
    isOwner: false,
    registeredAt: 'Демо-сессия 2026',
    customStatus: 'Гостевой Инспектор Комиссии (Read-Only)',
    cardTheme: 'emerald',
    avatarFrame: 'imperial_gold',
    ownedFrames: ['imperial_gold', 'emerald_crown'],
    ownedTitles: ['title_boyar'],
    ownedCards: ['emerald', 'builtin_ruby'],
    portfolio: { SHRM: 45, MGLD: 20, MINT: 15 },
    portfolioMeta: {
      SHRM: { avgBuyPrice: 118, lastTradeMs: now - 60000 },
      MGLD: { avgBuyPrice: 245, lastTradeMs: now - 60000 },
      MINT: { avgBuyPrice: 176, lastTradeMs: now - 60000 }
    },
    businesses: {
      demo_slot_1: { typeId: 'chip_forge', level: 6, condition: 88, lastCollected: now - 4200 * 1000, openedAt: now - 86400000 * 5 },
      demo_slot_2: { typeId: 'crypto_manufactory', level: 4, condition: 42, lastCollected: now - 7200 * 1000, openedAt: now - 86400000 * 3 },
      demo_slot_3: { typeId: 'imperial_datacenter', level: 8, condition: 95, lastCollected: now - 5400 * 1000, openedAt: now - 86400000 * 2 }
    },
    realEstate: {
      re_sherman_penthouse: { count: 1, status: 'active', prepEndsAt: now - 3600000, lastCollected: now - 3600000 }
    },
    cosmicBases: {
      cos_vostok_spaceport: { mining: 2, research: 1, power: 2, lastCollected: now - 3600000 }
    },
    inventory: [
      {
        id: 'art_starry_night', instanceId: 'demo_art_1', category: 'art', title: '«Звёздная ночь»',
        desc: 'Винсент ван Гог (1889) • Демо-экспонат',
        artwork: 'https://commons.wikimedia.org/wiki/Special:FilePath/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg?width=600',
        boughtFrom: 'ИМПЕРАТОРСКИЙ ЭРМИТАЖ', price: 120000000, boughtAt: '2026'
      },
      {
        id: 'car_porshe_911_gt3', instanceId: 'demo_car_1', category: 'garage', title: 'Porshe 911 GT3 MiroRS',
        desc: 'Трековый спорткар • Демо-образец', condition: 84, lastServicedMs: now - 3600000 * 8,
        artwork: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80',
        boughtFrom: 'АВТОСАЛОН МИРОБАЙТ', price: 6000000, boughtAt: '2026'
      },
      {
        id: 'cos_vostok_spaceport', instanceId: 'demo_cos_1', category: 'cosmos', title: 'Орбитальный Космопорт «Восток-Миробайт»',
        desc: 'Межпланетный терминал • Базы: Добыча Ур.2, Лаборатория Ур.1, Энергоблок Ур.2',
        artwork: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=800&q=80',
        boughtFrom: 'КОСМИЧЕСКАЯ ПАЛАТА', price: 150000000000, boughtAt: '2026'
      }
    ],
    polygonBoosters: { shield: 2, radar: 3 },
    stats: {
      income: { crafts: 194500, stocks: 68200, polygon: 42800, transfersIn: 115000 },
      expense: { craftsUpgradeAndSupply: 92400, stocksInvest: 51300, transfersOut: 34000 }
    }
  };
}

export function guardDemoReadOnly() {
  if (state.isDemoMode) {
    showToast('Демо-режим предназначен только для обзора интерфейса. Войдите в аккаунт для выполнения операций', 'info');
    return true;
  }
  return false;
}

export function enterDemoMode() {
  state.isDemoMode = true;
  state.currentUser = DEMO_USER_LOGIN;
  document.getElementById('demoModeActiveBanner')?.classList.remove('hidden');
  navigateRoute('/');
  renderCurrentView();
  showToast('Включён гостевой Демо-обзор (Read-Only). Все вкладки, Космо-базы и P2P-рынок доступны для просмотра!', 'info');
}

export function exitDemoModeToLogin() {
  state.isDemoMode = false;
  state.currentUser = null;
  document.getElementById('demoModeActiveBanner')?.classList.add('hidden');
  navigateRoute('/');
  renderCurrentView();
}

export function findUser(login) {
  if (!login) return null;
  const clean = login.trim().toLowerCase();
  if (state.isDemoMode && clean === DEMO_USER_LOGIN.toLowerCase()) {
    return createDemoGuestProfile();
  }
  if (appData.users[clean]) return appData.users[clean];
  const key = Object.keys(appData.users).find(k => k.toLowerCase() === clean);
  return key ? appData.users[key] : null;
}

export function getSystemOwner() {
  const key = Object.keys(appData.users).find(k => appData.users[k].isOwner === true || k.toLowerCase() === OWNER_USERNAME.toLowerCase());
  return key ? appData.users[key] : null;
}

export function isCurrentUserOwner() {
  if (state.isDemoMode || !state.currentUser) return false;
  const u = findUser(state.currentUser);
  return !!(u && (u.isOwner || u.username.toLowerCase() === OWNER_USERNAME.toLowerCase()));
}

export function isCurrentUserAdmin() {
  if (state.isDemoMode || !state.currentUser) return false;
  const u = findUser(state.currentUser);
  return !!(u && (u.isAdmin || u.isOwner || u.username.toLowerCase() === OWNER_USERNAME.toLowerCase()));
}

export function isCurrentUserSuperAdmin() {
  if (state.isDemoMode || !state.currentUser) return false;
  const u = findUser(state.currentUser);
  return !!(u && (u.isSuperAdmin || u.isOwner || u.username.toLowerCase() === OWNER_USERNAME.toLowerCase()));
}

export function getEffectiveTaxPercent() {
  const ev = appData.settings?.activeEvent;
  if (ev && ev.active && ev.type === 'financial_storm') return 0;
  return Number(appData.settings?.economy?.taxPercent ?? 5);
}

export function getBusinessCatalog() {
  return mergeBusinessCatalogWithDefaults(appData.settings?.business?.catalog);
}

// -------------------------------------------------------------------------
// 4. АТОМАРНЫЕ ТРАНЗАКЦИИ, ЛОГИ И ЗАПИСЬ СТАТИСТИКИ
// -------------------------------------------------------------------------
export async function atomicBalanceChange(username, delta, options = {}) {
  if (guardDemoReadOnly()) return false;
  const opId = options.operationId || null;
  if (opId && processedOperationIds.has(opId)) return false;
  const cleanDelta = Math.round(Number(delta || 0));
  if (!Number.isSafeInteger(cleanDelta) || cleanDelta === 0) return false;

  const key = normalizeLogin(username);
  const ref = db.ref(`bankData/users/${key}/balance`);
  const result = await runTransaction(ref, balance => {
    const current = Math.round(Number(balance || 0));
    if (!Number.isSafeInteger(current) || current < 0) return;
    if (options.requireFunds && current < Math.abs(cleanDelta)) return;
    const next = Math.max(0, Math.round(current + cleanDelta));
    if (!Number.isSafeInteger(next)) return;
    return next;
  });
  if (result.committed && opId) processedOperationIds.add(opId);
  return result.committed;
}

export async function addTreasuryTaxOrProfit(amount) {
  if (state.isDemoMode) return;
  const clean = Math.round(Number(amount || 0));
  if (!Number.isSafeInteger(clean) || clean <= 0) return;
  await runTransaction(db.ref('bankData/bankReserve'), v => Math.round(Number(v || 0)) + clean);
}

export async function recordPlayerFinancialStat(username, group, category, amount) {
  if (state.isDemoMode || !username) return;
  const cleanAmt = Math.round(Number(amount || 0));
  if (!Number.isSafeInteger(cleanAmt) || cleanAmt <= 0) return;
  const uKey = normalizeLogin(username);
  const statRef = db.ref(`bankData/users/${uKey}/stats/${group}/${category}`);
  try {
    await runTransaction(statRef, (cur) => Math.round(Number(cur || 0)) + cleanAmt);
  } catch (e) {}
}

export async function logSecurityEvent(title, details, level = 'info') {
  if (state.isDemoMode) return;
  const id = newOperationId('SEC');
  await db.ref(`bankData/securityLogs/${id}`).set({
    id, title: String(title || '').slice(0, 120), details: String(details || '').slice(0, 300),
    level, timestamp: new Date(getServerTime()).toLocaleTimeString('ru-RU'), timestampMs: serverTimestamp()
  });
}

export function guardAdminAction(requireSuper = false) {
  if (guardDemoReadOnly()) return false;
  const allowed = requireSuper
    ? (isCurrentUserSuperAdmin() || isCurrentUserOwner())
    : (isCurrentUserAdmin() || isCurrentUserSuperAdmin() || isCurrentUserOwner());
  if (!allowed) {
    logSecurityEvent('Попытка вызова Admin API', `@${state.currentUser || 'guest'} попытался вызвать защищённую функцию`, 'warn');
    showToast('Доступ строго запрещён Службой Безопасности Банка!', 'error');
    return false;
  }
  return true;
}

export function addSystemMessage(toUser, title, text) {
  if (state.isDemoMode) return Promise.resolve();
  const id = newOperationId('MSG');
  return db.ref(`bankData/messages/${id}`).set({
    id, to: toUser, title, text, read: false,
    timestamp: new Date(getServerTime()).toLocaleString('ru-RU'),
    timestampMs: serverTimestamp()
  });
}

export function getUnreadMessagesCount(username) {
  if (!username || state.isDemoMode) return 0;
  const low = username.toLowerCase();
  return (appData.messages || []).filter(m => m.to && m.to.toLowerCase() === low && !m.read).length;
}

// -------------------------------------------------------------------------
// 5. ЗАДАЧА 2: РУЧНАЯ НАЛОГОВАЯ ДЕКЛАРАЦИЯ (72 ЧАСА) + ДОЛГОВАЯ РАСПИСКА
// -------------------------------------------------------------------------
let isWearCycleRunning = false;

/**
 * Фоновый цикл проверки ТО автомобилей (без автосписания налогов!):
 * - Инициализирует `taxCycleStartMs` для отсчёта 72 часов, если у игрока его ещё нет.
 * - Обновляет износ машин (при 0% машина списывается на металлолом).
 */
export async function runDeviceTaxAndCarWearCycle() {
  if (state.isDemoMode || !state.currentUser || isWearCycleRunning) return;
  const u = findUser(state.currentUser);
  if (!u || u.isBlocked) return;

  isWearCycleRunning = true;
  try {
    const uKey = normalizeLogin(u.username);
    const nowServer = getServerTime();
    const deviceNow = Date.now();

    // Инициализируем старт 72-часового налогового периода, если его ещё нет в профиле
    if (!u.taxCycleStartMs) {
      await db.ref(`bankData/users/${uKey}/taxCycleStartMs`).set(nowServer);
    }

    // Проверка износа автомобилей в гараже (при 0% — списание на металлолом)
    const lsWearKey = `mb_device_car_wear_ts_${uKey}`;
    let lastWearMs = Number(localStorage.getItem(lsWearKey) || u.lastCarWearCheckMs || deviceNow);
    if (!localStorage.getItem(lsWearKey)) localStorage.setItem(lsWearKey, String(deviceNow));

    if (Array.isArray(u.inventory) && u.inventory.some(x => x && x.category === 'garage')) {
      const elapsedWearHours = (deviceNow - lastWearMs) / 3600000;
      if (elapsedWearHours >= 0.25) {
        const updatedInv = [];
        const scrappedTitles = [];
        u.inventory.forEach(item => {
          if (!item || item.category !== 'garage') {
            updatedInv.push(item);
            return;
          }
          const curCond = getCarCurrentCondition(item, deviceNow);
          if (curCond <= 0) {
            scrappedTitles.push(item.title);
          } else {
            updatedInv.push({ ...item, condition: curCond, lastServicedMs: deviceNow });
          }
        });

        localStorage.setItem(lsWearKey, String(deviceNow));
        await db.ref(`bankData/users/${uKey}/inventory`).set(cleanFirebaseObject(updatedInv));
        await db.ref(`bankData/users/${uKey}/lastCarWearCheckMs`).set(deviceNow);

        if (scrappedTitles.length > 0) {
          const msg = `Ваш автомобиль (${scrappedTitles.join(', ')}) достиг 0% состояния и был безвозвратно списан на металлолом!`;
          await addSystemMessage(u.username, '💥 Списание авто в металлолом (0% состояние)', msg);
          showToast(msg, 'error');
        }
      }
    }
  } finally {
    isWearCycleRunning = false;
  }
}

/**
 * 1) Ручная отправка налоговой декларации («Отправить в закон») и полная оплата налога за период:
 */
export async function submitManualTaxDeclaration(btnEl = null) {
  return withOperationLock('manual_tax_declare', btnEl, async () => {
    if (!state.currentUser) return showToast('Войдите в счёт!', 'error');
    const u = findUser(state.currentUser);
    if (!u || u.isBlocked) return;

    const now = getServerTime();
    const taxDecl = calculateUserTaxDeclaration(u, appData.loans, appData.settings, now, state.isDemoMode);
    const amountDue = taxDecl.accumulatedTax;

    if (amountDue <= 0) {
      return showToast('У вас пока нет накопленного налога к оплате!', 'info');
    }

    if ((u.balance || 0) < amountDue) {
      return showToast(`Недостаточно средств (${formatBaity(amountDue)})! Нажмите ниже «Выписать долговую расписку», чтобы разморозить доход и платить по частям!`, 'error');
    }

    const opId = newOperationId('TAXDECL');
    const paidOk = await atomicBalanceChange(u.username, -amountDue, { requireFunds: true, operationId: opId });
    if (!paidOk) return showToast('Не удалось списать сумму налога!', 'error');

    await addTreasuryTaxOrProfit(amountDue);
    await recordPlayerFinancialStat(u.username, 'expense', 'craftsUpgradeAndSupply', amountDue);

    const uKey = normalizeLogin(u.username);
    await db.ref(`bankData/users/${uKey}`).update({
      taxCycleStartMs: now,
      lastTaxBillMs: now,
      confiscationWarned: false
    });

    await db.ref(`bankData/transactions/${opId}`).set({
      id: opId,
      from: u.username,
      to: 'НАЛОГОВАЯ ПАЛАТА ИМПЕРИИ',
      amount: amountDue,
      comment: '📜 Ручная подача и оплата налоговой декларации (цикл 72ч обновлён)',
      timestamp: new Date(now).toLocaleString('ru-RU'),
      timestampMs: serverTimestamp()
    });

    showToast(`📜 Налоговая декларация (${formatBaity(amountDue)}) отправлена в закон и оплачена! Таймер 72ч обновлён, все доходы активны!`, 'success');
    renderEarnAndLoansView();
    requestRender();
  });
}

/**
 * 2) Оформление Долговой расписки (Отсрочка на 72ч с разбивкой на 4 части):
 *    Сразу размораживает все бизнесы и сбрасывает таймер текущего налогового цикла!
 */
export async function issueTaxPromissoryNote72h(btnEl = null) {
  return withOperationLock('issue_tax_note_72h', btnEl, async () => {
    if (!state.currentUser) return showToast('Войдите в счёт!', 'error');
    const u = findUser(state.currentUser);
    if (!u || u.isBlocked) return;

    const now = getServerTime();
    const taxDecl = calculateUserTaxDeclaration(u, appData.loans, appData.settings, now, state.isDemoMode);
    const amountDue = taxDecl.accumulatedTax;

    if (amountDue <= 0) {
      return showToast('Накопленный налог равен 0 ฿ — расписка не требуется!', 'info');
    }

    if (taxDecl.activeTaxPromissoryNotes.length >= 2) {
      return showToast('У вас уже открыты 2 налоговые расписки с рассрочкой! Сначала погасите хотя бы одну часть.', 'error');
    }

    const totalWithSmallFee = Math.max(4, Math.round(amountDue * 1.05)); // +5% сбор за рассрочку
    const noteId = newOperationId('TAXNOTE72');
    const uKey = normalizeLogin(u.username);

    const noteRecord = {
      id: noteId,
      borrower: u.username,
      principal: amountDue,
      interestPct: 5,
      totalRepay: totalWithSmallFee,
      remainingAmount: totalWithSmallFee,
      installmentsTotal: TAX_NOTE_INSTALLMENTS_COUNT,
      installmentsPaid: 0,
      isInstallmentTaxNote: true,
      reason: `✍️ Налоговая расписка в ${TAX_NOTE_INSTALLMENTS_COUNT} части (отсрочка 72ч)`,
      issuedBy: 'НАЛОГОВАЯ ПАЛАТА',
      createdAt: new Date(now).toLocaleString('ru-RU'),
      createdAtMs: now,
      dueAtMs: now + TAX_DECLARATION_PERIOD_MS,
      status: 'active'
    };

    await db.ref(`bankData/loans/${noteId}`).set(cleanFirebaseObject(noteRecord));
    // Сбрасываем таймер 72ч и обновляем `lastCollected` у бизнесов, чтобы они сразу начали капать без потерь
    const updates = {
      [`bankData/users/${uKey}/taxCycleStartMs`]: now,
      [`bankData/users/${uKey}/lastTaxBillMs`]: now
    };
    if (u.businesses && typeof u.businesses === 'object') {
      Object.keys(u.businesses).forEach(slotKey => {
        if (taxDecl.isIncomeFrozen) {
          updates[`bankData/users/${uKey}/businesses/${slotKey}/lastCollected`] = now;
        }
      });
    }
    await db.ref().update(updates);

    await addSystemMessage(
      u.username,
      '✍️ Выписана Долговая расписка (Доходы разморожены!)',
      `Накопленный налог оформлен в долговую расписку на ${formatBaity(totalWithSmallFee)} с разбивкой на ${TAX_NOTE_INSTALLMENTS_COUNT} части. Бизнесы и доходы сразу разморожены! Выплачивайте расписку частями в течение следующих 72 часов.`
    );

    showToast(`✍️ Долговая расписка оформлена! Бизнесы разморожены — выплачивайте долг в ${TAX_NOTE_INSTALLMENTS_COUNT} части!`, 'success');
    renderEarnAndLoansView();
    requestRender();
  });
}

/**
 * 3) Поэтапная выплата Долговой расписки (1 часть из 4 или весь остаток сразу):
 */
export async function payTaxNoteInstallmentPart(noteId, payAll = false, btnEl = null) {
  return withOperationLock(`pay_tax_part_${noteId}`, btnEl, async () => {
    if (!state.currentUser) return;
    const note = appData.loans?.[noteId];
    if (!note || note.status !== 'active') return showToast('Расписка уже закрыта!', 'info');

    const u = findUser(state.currentUser);
    if (!u || u.isBlocked) return;

    const totalParts = Number(note.installmentsTotal || TAX_NOTE_INSTALLMENTS_COUNT);
    const paidParts = Number(note.installmentsPaid || 0);
    const leftParts = Math.max(1, totalParts - paidParts);
    const remAmt = Math.max(1, Number(note.remainingAmount || note.totalRepay || 0));

    const payAmount = (payAll || leftParts <= 1)
      ? remAmt
      : Math.max(1, Math.ceil(remAmt / leftParts));

    if ((u.balance || 0) < payAmount) {
      return showToast(`Недостаточно средств на балансе! Требуется ${formatBaity(payAmount)}.`, 'error');
    }

    const opId = newOperationId('TAXPART');
    const paidOk = await atomicBalanceChange(u.username, -payAmount, { requireFunds: true, operationId: opId });
    if (!paidOk) return;

    await addTreasuryTaxOrProfit(payAmount);
    await recordPlayerFinancialStat(u.username, 'expense', 'craftsUpgradeAndSupply', payAmount);

    const newRem = Math.max(0, remAmt - payAmount);
    const newPaidParts = paidParts + 1;

    if (newRem <= 0 || newPaidParts >= totalParts || payAll) {
      await db.ref(`bankData/loans/${noteId}`).remove();
      showToast(`🎉 Долговая расписка полностью погашена (${formatBaity(payAmount)})!`, 'success');
    } else {
      await db.ref(`bankData/loans/${noteId}`).update({
        remainingAmount: newRem,
        installmentsPaid: newPaidParts
      });
      showToast(`✅ Оплачена часть ${newPaidParts}/${totalParts} (${formatBaity(payAmount)})! Остаток: ${formatBaity(newRem)}.`, 'success');
    }

    renderEarnAndLoansView();
    requestRender();
  });
}

// -------------------------------------------------------------------------
// 6. ЗАДАЧА 3: ПОЛНОСТЬЮ ИСПРАВЛЕННЫЙ 24Ч P2P-АУКЦИОН И СУД
// -------------------------------------------------------------------------
let pendingDirectOfferPayload = null;

export function openP2PDirectOfferModal(ownerUsername, assetCategory, assetKey, title, level, condition, valuation) {
  if (guardDemoReadOnly()) return;
  if (!state.currentUser) return showToast('Войдите в счёт!', 'error');
  if (normalizeLogin(ownerUsername) === normalizeLogin(state.currentUser)) return showToast('Это ваш собственный актив!', 'info');

  pendingDirectOfferPayload = {
    seller: ownerUsername,
    buyer: state.currentUser,
    assetCategory,
    assetKey,
    title,
    level: Number(level || 1),
    condition: Number(condition ?? 100),
    valuation: Number(valuation || 1000)
  };

  document.getElementById('p2pOfferTargetAssetTitle').innerText = `Купить «${title}» у @${ownerUsername}`;
  document.getElementById('p2pOfferTargetSub').innerText = `Уровень: ${level} • Состояние: ${condition}% • Оценка: ${formatBaity(valuation)}`;
  document.getElementById('p2pDirectOfferAmount').value = Math.max(100, Math.round(valuation * 0.85));

  const modal = document.getElementById('p2pDirectOfferModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

export function closeP2PDirectOfferModal() {
  const modal = document.getElementById('p2pDirectOfferModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

export async function submitDirectP2POffer(e) {
  e.preventDefault();
  const btn = document.getElementById('p2pOfferSubmitBtn');
  return withOperationLock('submit_p2p_offer', btn, async () => {
    if (!pendingDirectOfferPayload || !state.currentUser) return;
    const u = findUser(state.currentUser);
    const amount = parseInt(document.getElementById('p2pDirectOfferAmount')?.value || '0', 10);
    if (!u || !validPositiveAmount(amount)) return showToast('Введите корректную сумму предложения!', 'error');
    if ((u.balance || 0) < amount) return showToast(`На вашем счету недостаточно средств (${formatBaity(amount)})!`, 'error');

    const offerId = newOperationId('P2POFF');
    const offerObj = cleanFirebaseObject({
      id: offerId,
      ...pendingDirectOfferPayload,
      offerPrice: amount,
      status: 'pending',
      createdAtMs: getServerTime(),
      createdAt: new Date(getServerTime()).toLocaleString('ru-RU')
    });

    await db.ref(`bankData/p2pOffers/${offerId}`).set(offerObj);
    await addSystemMessage(
      pendingDirectOfferPayload.seller,
      `🤝 Предложение о покупке актива «${pendingDirectOfferPayload.title}»`,
      `Гражданин @${u.username} предлагает купить ваш актив «${pendingDirectOfferPayload.title}» (Ур.${pendingDirectOfferPayload.level}) за ${formatBaity(amount)}. Подтвердите или отклоните сделку во вкладке «Мой Кошелёк»!`
    );

    closeP2PDirectOfferModal();
    showToast(`Предложение на ${formatBaity(amount)} отправлено владельцу @${pendingDirectOfferPayload.seller}!`, 'success');
  });
}

/**
 * Исправленное извлечение ЛЮБОГО актива (Бизнес, Недвижимость, Космос, Автопарк, Искусство, Рынок)
 * с очисткой от undefined для 100% надёжной записи в Firebase!
 */
export async function extractAssetFromSellerForCourt(sellerObj, assetCategory, assetKey) {
  if (!sellerObj || !assetCategory || !assetKey) return null;
  const sKey = normalizeLogin(sellerObj.username);
  const now = getServerTime();

  if (assetCategory === 'business') {
    const bData = sellerObj.businesses?.[assetKey];
    if (!bData) return null;
    const cfg = getBusinessCatalog().find(c => c.id === (bData.typeId || assetKey));
    const cond = computeEffectiveSlotCondition(bData, now);
    await db.ref(`bankData/users/${sKey}/businesses/${assetKey}`).remove();
    return cleanFirebaseObject({
      category: 'business',
      title: cfg ? cfg.name : 'Предприятие',
      level: Number(bData.level || 1),
      condition: cond,
      payload: {
        typeId: bData.typeId || (cfg ? cfg.id : 'chip_forge'),
        level: Number(bData.level || 1),
        condition: cond,
        lastCollected: now,
        openedAt: Number(bData.openedAt || now)
      },
      valuation: cfg ? calculateTotalBusinessInvestment(cfg, bData.level || 1) : 10000
    });
  }

  if (assetCategory === 'realestate') {
    const rData = sellerObj.realEstate?.[assetKey];
    const cfg = REAL_ESTATE_CATALOG.find(c => c.id === assetKey);
    if (!rData || Number(rData.count || 0) <= 0 || !cfg) return null;
    if (Number(rData.count) <= 1) await db.ref(`bankData/users/${sKey}/realEstate/${assetKey}`).remove();
    else await db.ref(`bankData/users/${sKey}/realEstate/${assetKey}/count`).set(Number(rData.count) - 1);
    return cleanFirebaseObject({
      category: 'realestate',
      reId: cfg.id,
      title: cfg.title,
      level: 1,
      condition: 100,
      payload: { status: rData.status || 'active', prepEndsAt: Number(rData.prepEndsAt || 0), lastCollected: now },
      valuation: getDynamicShopPrice(cfg.id, cfg.price, 'realestate')
    });
  }

  // Для космоса, автомобилей из гаража, картин и рыночных предметов — ищем в массиве inventory
  const inv = Array.isArray(sellerObj.inventory) ? [...sellerObj.inventory] : [];
  const idx = inv.findIndex((x, i) => {
    if (!x) return false;
    const xCat = x.category || 'bazaar';
    const xKey = x.instanceId || x.id || `inv_${i}`;
    return xKey === assetKey || x.id === assetKey || (xCat === assetCategory && x.title === assetKey);
  });

  if (idx === -1) return null;
  const item = inv[idx];
  inv.splice(idx, 1);
  await db.ref(`bankData/users/${sKey}/inventory`).set(cleanFirebaseObject(inv));

  if (assetCategory === 'cosmos' || item.category === 'cosmos') {
    const basesData = sellerObj.cosmicBases?.[item.id] || { mining: 0, research: 0, power: 0 };
    const totalBaseLvl = Number(basesData.mining || 0) + Number(basesData.research || 0) + Number(basesData.power || 0);
    return cleanFirebaseObject({
      category: 'cosmos',
      cosId: item.id,
      title: item.title || 'Космическая локация',
      level: Math.max(1, totalBaseLvl),
      condition: 100,
      payload: {
        invItem: cleanFirebaseObject(item),
        bases: {
          mining: Number(basesData.mining || 0),
          research: Number(basesData.research || 0),
          power: Number(basesData.power || 0)
        }
      },
      valuation: Number(item.price || 150000000000)
    });
  }

  // Автомобили (garage), Искусство (art), Товары (bazaar)
  const isCar = assetCategory === 'garage' || item.category === 'garage';
  const cond = isCar ? getCarCurrentCondition(item, Date.now()) : 100;
  return cleanFirebaseObject({
    category: item.category || assetCategory || 'bazaar',
    title: item.title || 'Предмет Сокровищницы',
    level: 1,
    condition: cond,
    payload: {
      invItem: cleanFirebaseObject({ ...item, condition: cond, lastServicedMs: Date.now() })
    },
    valuation: Math.max(100, Number(item.price || 1000))
  });
}

export async function createCourtTransferRecord(sellerName, buyerName, category, extracted, dealPrice) {
  const now = getServerTime();
  const durationMs = dealPrice > 0
    ? calculateCourtTransferDurationMs(category, extracted.level, extracted.valuation)
    : 5000; // Если возврат лота без ставок — 5 секунд
  const courtId = newOperationId('COURT');

  const record = cleanFirebaseObject({
    id: courtId,
    seller: sellerName,
    buyer: buyerName,
    category,
    title: extracted.title || 'Актив Империи',
    level: Number(extracted.level || 1),
    condition: Number(extracted.condition ?? 100),
    extractedData: extracted,
    dealPrice: Number(dealPrice || 0),
    startedAtMs: now,
    endsAtMs: now + durationMs,
    status: 'in_court'
  });

  await db.ref(`bankData/courtTransfers/${courtId}`).set(record);
  await addSystemMessage(
    buyerName,
    `⚖️ Переоформление в суде: «${extracted.title}»`,
    `Объект «${extracted.title}» (Ур.${extracted.level || 1}, сост. ${extracted.condition ?? 100}%) поступил в Императорский Суд на переоформление. Время процедуры: ${formatDurationHuman(durationMs)}. Все улучшения полностью сохранены!`
  );
}

export async function respondToP2POffer(offerId, accept, btnEl = null) {
  return withOperationLock(`resp_p2p_${offerId}`, btnEl, async () => {
    const offer = appData.p2pOffers?.[offerId];
    if (!offer || offer.status !== 'pending') return showToast('Предложение уже неактуально!', 'info');
    if (!state.currentUser || normalizeLogin(state.currentUser) !== normalizeLogin(offer.seller)) return;

    if (!accept) {
      await db.ref(`bankData/p2pOffers/${offerId}`).remove();
      await addSystemMessage(offer.buyer, '❌ Отказ по сделке', `@${offer.seller} отклонил ваше предложение по покупке «${offer.title}».`);
      showToast('Предложение отклонено.', 'info');
      return;
    }

    const seller = findUser(offer.seller);
    const buyer = findUser(offer.buyer);
    if (!seller || !buyer) return;
    const price = Math.round(Number(offer.offerPrice || 0));
    if ((buyer.balance || 0) < price) {
      return showToast(`У покупателя @${buyer.username} сейчас недостаточно средств!`, 'error');
    }

    const extracted = await extractAssetFromSellerForCourt(seller, offer.assetCategory, offer.assetKey);
    if (!extracted) {
      await db.ref(`bankData/p2pOffers/${offerId}`).remove();
      return showToast('Актив больше не найден у продавца!', 'error');
    }

    const opId = newOperationId('P2PDEAL');
    if (!await atomicBalanceChange(buyer.username, -price, { requireFunds: true, operationId: opId })) return;

    const fee = Math.max(1, Math.round(price * P2P_BANK_FEE_RATE));
    const sellerNet = Math.max(1, price - fee);
    await atomicBalanceChange(seller.username, sellerNet, { operationId: `${opId}_SELL` });
    await addTreasuryTaxOrProfit(fee);

    await recordPlayerFinancialStat(buyer.username, 'expense', 'transfersOut', price);
    await recordPlayerFinancialStat(seller.username, 'income', 'transfersIn', sellerNet);

    await db.ref(`bankData/p2pOffers/${offerId}`).remove();
    await createCourtTransferRecord(seller.username, buyer.username, offer.assetCategory, extracted, price);

    showToast(`⚖️ Сделка заключена! Вы получили +${formatBaity(sellerNet)} (комиссия Банка 5%). Объект передан в Суд для переоформления!`, 'success');
  });
}

export async function submitCreateP2PAuction(e) {
  e.preventDefault();
  const btn = document.getElementById('p2pAuctionCreateBtn');
  return withOperationLock('create_p2p_auc', btn, async () => {
    if (!state.currentUser) return;
    const u = findUser(state.currentUser);
    if (!u || u.isBlocked) return;

    const rawVal = document.getElementById('p2pAuctionAssetSelect')?.value || '';
    const pipeIdx = rawVal.indexOf('|');
    if (pipeIdx === -1) return showToast('Выберите актив для выставления на аукцион!', 'error');

    const category = rawVal.slice(0, pipeIdx);
    const assetKey = rawVal.slice(pipeIdx + 1);
    const startPrice = parseInt(document.getElementById('p2pAuctionStartPrice')?.value || '0', 10);

    if (!category || !assetKey || !validPositiveAmount(startPrice)) {
      return showToast('Проверьте выбранный актив и стартовую цену!', 'error');
    }

    const extracted = await extractAssetFromSellerForCourt(u, category, assetKey);
    if (!extracted) return showToast('Не удалось извлечь актив для аукциона! Обновите окно.', 'error');

    const now = getServerTime();
    const aucId = newOperationId('P2PAUC');
    const aucRecord = cleanFirebaseObject({
      id: aucId,
      seller: u.username,
      category,
      title: extracted.title || 'Актив',
      level: Number(extracted.level || 1),
      condition: Number(extracted.condition ?? 100),
      extractedData: extracted,
      startPrice,
      currentBid: startPrice,
      highestBidder: null,
      startedAtMs: now,
      endsAtMs: now + 24 * 3600 * 1000,
      status: 'active'
    });

    await db.ref(`bankData/p2pAuctions/${aucId}`).set(aucRecord);
    closeCreateP2PAuctionModal();
    openMarketDirect('p2pauction');
    showToast(`🔨 Лот «${extracted.title}» успешно выставлен на 24-часовой Аукцион со стартом ${formatBaity(startPrice)}!`, 'success');
  });
}

export async function placeBidOnP2PAuction(aucId, btnEl = null) {
  return withOperationLock(`bid_p2p_auc_${aucId}`, btnEl, async () => {
    if (!state.currentUser) return showToast('Войдите в счёт!', 'error');
    const u = findUser(state.currentUser);
    const auc = appData.p2pAuctions?.[aucId];
    if (!u || u.isBlocked || !auc || auc.status !== 'active') return;
    if (normalizeLogin(u.username) === normalizeLogin(auc.seller)) return showToast('Нельзя делать ставки на собственный лот!', 'error');

    const inp = document.getElementById(`p2pBidInput_${aucId}`);
    const bidAmt = parseInt(inp?.value || '0', 10);
    const minNext = auc.highestBidder ? Math.round(auc.currentBid * 1.05) : auc.startPrice;

    if (!validPositiveAmount(bidAmt) || bidAmt < minNext) {
      return showToast(`Минимальная ставка: ${formatBaity(minNext)}!`, 'error');
    }
    if ((u.balance || 0) < bidAmt) return showToast('Недостаточно Байти на балансе!', 'error');

    const prevBidder = auc.highestBidder;
    const prevAmt = Number(auc.currentBid || 0);
    const opId = newOperationId('P2PBID');

    if (!await atomicBalanceChange(u.username, -bidAmt, { requireFunds: true, operationId: opId })) return;

    if (prevBidder && prevAmt > 0) {
      await atomicBalanceChange(prevBidder, prevAmt, { operationId: `${opId}_REF` });
      await addSystemMessage(prevBidder, `🔨 Ваша ставка на 24ч Аукционе перебита!`, `@${u.username} поставил ${formatBaity(bidAmt)} за лот «${auc.title}». Ваши ${formatBaity(prevAmt)} мгновенно возвращены на баланс.`);
    }

    await db.ref(`bankData/p2pAuctions/${aucId}`).update({
      currentBid: bidAmt,
      highestBidder: u.username
    });

    showToast(`🔨 Ставка ${formatBaity(bidAmt)} на лот «${auc.title}» принята!`, 'success');
  });
}

const finalizingCourtSet = new Set();

export async function checkAndFinalizeCourtTransfers() {
  if (state.isDemoMode) return;
  const now = getServerTime();
  const list = Object.values(appData.courtTransfers || {});
  for (const item of list) {
    if (!item || item.status !== 'in_court' || now < Number(item.endsAtMs || 0)) continue;
    if (finalizingCourtSet.has(item.id)) continue;
    finalizingCourtSet.add(item.id);

    try {
      const buyer = findUser(item.buyer);
      if (buyer) {
        const bKey = normalizeLogin(buyer.username);
        const ext = item.extractedData || {};

        if (ext.category === 'business') {
          const newSlotKey = `slot_${now}_${Math.random().toString(36).slice(2, 5)}`;
          await db.ref(`bankData/users/${bKey}/businesses/${newSlotKey}`).set(cleanFirebaseObject({
            ...ext.payload,
            lastCollected: now
          }));
        } else if (ext.category === 'realestate') {
          const curRe = buyer.realEstate?.[ext.reId] || { count: 0, status: 'active', prepEndsAt: 0, lastCollected: now };
          await db.ref(`bankData/users/${bKey}/realEstate/${ext.reId}`).set({
            count: Number(curRe.count || 0) + 1,
            status: 'active',
            prepEndsAt: 0,
            lastCollected: now
          });
        } else if (ext.category === 'cosmos') {
          const inv = Array.isArray(buyer.inventory) ? [...buyer.inventory] : [];
          if (ext.payload?.invItem) inv.unshift(ext.payload.invItem);
          await db.ref(`bankData/users/${bKey}/inventory`).set(cleanFirebaseObject(inv));
          if (ext.payload?.bases) {
            await db.ref(`bankData/users/${bKey}/cosmicBases/${ext.cosId}`).set(cleanFirebaseObject({
              ...ext.payload.bases,
              lastCollected: now
            }));
          }
        } else {
          // Автопарк (garage), Картины (art), Товары (bazaar)
          const inv = Array.isArray(buyer.inventory) ? [...buyer.inventory] : [];
          if (ext.payload?.invItem) inv.unshift(ext.payload.invItem);
          await db.ref(`bankData/users/${bKey}/inventory`).set(cleanFirebaseObject(inv));
        }

        await addSystemMessage(
          buyer.username,
          `🎉 Судебное переоформление завершено: «${item.title}»!`,
          `Суд завершил регистрацию права собственности! Объект «${item.title}» со всеми улучшениями передан в ваше владение.`
        );
      }
      await db.ref(`bankData/courtTransfers/${item.id}`).remove();
    } catch (e) {}
  }
}

const finalizingP2PAucSet = new Set();

export async function checkAndFinalizeExpiredP2PAuctions() {
  if (state.isDemoMode) return;
  const now = getServerTime();
  const list = Object.values(appData.p2pAuctions || {});
  for (const auc of list) {
    if (!auc || auc.status !== 'active' || now < Number(auc.endsAtMs || 0)) continue;
    if (finalizingP2PAucSet.has(auc.id)) continue;
    finalizingP2PAucSet.add(auc.id);

    try {
      await db.ref(`bankData/p2pAuctions/${auc.id}`).remove();
      if (auc.highestBidder) {
        const winBid = Number(auc.currentBid || auc.startPrice || 0);
        const fee = Math.max(1, Math.round(winBid * P2P_BANK_FEE_RATE));
        const sellerNet = Math.max(1, winBid - fee);

        await atomicBalanceChange(auc.seller, sellerNet, { operationId: newOperationId('AUCWINSELL') });
        await addTreasuryTaxOrProfit(fee);
        await recordPlayerFinancialStat(auc.seller, 'income', 'transfersIn', sellerNet);

        await createCourtTransferRecord(auc.seller, auc.highestBidder, auc.category, auc.extractedData, winBid);
      } else {
        await createCourtTransferRecord(auc.seller, auc.seller, auc.category, auc.extractedData, 0);
      }
    } catch (e) {}
  }
}
// -------------------------------------------------------------------------
// 7. ТО АВТОМОБИЛЕЙ, ПРОМЫСЛЫ, НЕДВИЖИМОСТЬ, КОСМО-БАЗЫ И ПРОДАЖА АКТИВОВ
// -------------------------------------------------------------------------
export async function serviceSingleCar(instanceIdOrId, btnEl = null) {
  return withOperationLock(`srv_car_${instanceIdOrId}`, btnEl, async () => {
    if (!state.currentUser) return;
    const u = findUser(state.currentUser);
    if (!u || !Array.isArray(u.inventory)) return;
    const deviceNow = Date.now();
    const inv = [...u.inventory];
    const idx = inv.findIndex(x => x && x.category === 'garage' && (x.instanceId === instanceIdOrId || x.id === instanceIdOrId));
    if (idx === -1) return showToast('Автомобиль не найден!', 'error');

    const car = inv[idx];
    const cost = getCarServiceCost(car, appData.settings, deviceNow);
    if (cost <= 0) return showToast('Автомобиль в идеальном состоянии (100%)!', 'info');
    if ((u.balance || 0) < cost) return showToast(`Для прохождения ТО требуется ${formatBaity(cost)}!`, 'error');

    const opId = newOperationId('CARSRV');
    if (!await atomicBalanceChange(u.username, -cost, { requireFunds: true, operationId: opId })) return;
    await addTreasuryTaxOrProfit(cost);
    await recordPlayerFinancialStat(u.username, 'expense', 'craftsUpgradeAndSupply', cost);

    inv[idx] = { ...car, condition: 100, lastServicedMs: deviceNow };
    await db.ref(`bankData/users/${normalizeLogin(u.username)}/inventory`).set(cleanFirebaseObject(inv));
    showToast(`🔧 Тех. обслуживание «${car.title}» выполнено до 100% (-${formatBaity(cost)})!`, 'success');
    requestRender();
  });
}

export async function serviceAllUserCars(btnEl = null) {
  return withOperationLock('srv_all_cars', btnEl, async () => {
    if (!state.currentUser) return;
    const u = findUser(state.currentUser);
    if (!u || !Array.isArray(u.inventory)) return;
    const deviceNow = Date.now();
    const inv = [...u.inventory];
    let totalCost = 0;
    let servicedCount = 0;

    inv.forEach(item => {
      if (item && item.category === 'garage') {
        const c = getCarServiceCost(item, appData.settings, deviceNow);
        if (c > 0) {
          totalCost += c;
          servicedCount++;
        }
      }
    });

    if (servicedCount === 0) return showToast('Все автомобили в вашем гараже имеют состояние 100%!', 'info');
    if ((u.balance || 0) < totalCost) return showToast(`Для ТО всех ${servicedCount} авто требуется ${formatBaity(totalCost)}!`, 'error');

    const opId = newOperationId('ALLCARSRV');
    if (!await atomicBalanceChange(u.username, -totalCost, { requireFunds: true, operationId: opId })) return;
    await addTreasuryTaxOrProfit(totalCost);
    await recordPlayerFinancialStat(u.username, 'expense', 'craftsUpgradeAndSupply', totalCost);

    const nextInv = inv.map(item => item && item.category === 'garage' ? { ...item, condition: 100, lastServicedMs: deviceNow } : item);
    await db.ref(`bankData/users/${normalizeLogin(u.username)}/inventory`).set(cleanFirebaseObject(nextInv));
    showToast(`🔧 ТО всех автомобилей (${servicedCount} шт.) завершено за ${formatBaity(totalCost)}!`, 'success');
    requestRender();
  });
}

const finalizingUpgradesSet = new Set();

export async function checkAndFinalizeCompletedUpgrades(userObj) {
  if (state.isDemoMode || !userObj || !userObj.businesses) return;
  const now = getServerTime(), uKey = normalizeLogin(userObj.username);
  const slots = getUserBusinessSlotsEntries(userObj, appData.settings);
  for (const item of slots) {
    const endsAt = Number(item.data?.upgradeEndsAt || 0);
    const curLevel = Number(item.data?.level || 0);
    const lockId = `${uKey}_${item.slotKey}_${endsAt}`;
    if (endsAt > 0 && now >= endsAt && !finalizingUpgradesSet.has(lockId)) {
      finalizingUpgradesSet.add(lockId);
      const nextLvl = Math.min(MAX_BUSINESS_LEVEL, curLevel + 1);
      try {
        await db.ref(`bankData/users/${uKey}/businesses/${item.slotKey}`).update({ level: nextLvl, upgradeStartedAt: null, upgradeEndsAt: null });
        showToast(`🏗️ Модернизация «${item.cfg.name}» завершена! Уровень ${nextLvl}!`, 'success');
      } catch (e) {}
    }
  }
}

export async function repairBusinessSlotCondition(slotKey, btnEl = null) {
  return withOperationLock(`repair_biz_${slotKey}`, btnEl, async () => {
    if (!state.currentUser) return showToast('Войдите в счёт!', 'error');
    const u = findUser(state.currentUser);
    if (!u || u.isBlocked) return;
    const targetSlot = getUserBusinessSlotsEntries(u, appData.settings).find(s => s.slotKey === slotKey);
    if (!targetSlot) return;

    const { cfg, data } = targetSlot;
    const now = getServerTime();
    const curCond = computeEffectiveSlotCondition(data, now);
    if (curCond >= 100) return showToast('Предприятие в идеальном состоянии (100%)!', 'info');

    const lvl = Number(data.level || 1);
    const cost = getSlotMaintenanceCost(cfg, lvl, curCond, appData.settings);
    if ((u.balance || 0) < cost) return showToast(`Для снабжения и ремонта требуется ${formatBaity(cost)}!`, 'error');

    const uKey = normalizeLogin(u.username);
    const userRef = db.ref(`bankData/users/${uKey}`);
    const txResult = await runTransaction(userRef, (userSnap) => {
      if (!userSnap) return userSnap;
      const bal = Math.round(Number(userSnap.balance || 0));
      if (bal < cost) return;
      if (!userSnap.businesses || !userSnap.businesses[slotKey]) return;
      userSnap.balance = bal - cost;
      userSnap.businesses[slotKey].condition = 100;
      if (!userSnap.stats) userSnap.stats = {};
      if (!userSnap.stats.expense) userSnap.stats.expense = {};
      userSnap.stats.expense.craftsUpgradeAndSupply = Math.round(Number(userSnap.stats.expense.craftsUpgradeAndSupply || 0)) + cost;
      return userSnap;
    });

    if (!txResult.committed) return showToast('Не удалось провести снабжение. Проверьте баланс!', 'error');
    await addTreasuryTaxOrProfit(cost);

    const opId = newOperationId('SUPPLY');
    await db.ref(`bankData/transactions/${opId}`).set({
      id: opId, from: u.username, to: 'СЛУЖБА СНАБЖЕНИЯ ПРОМЫСЛОВ', amount: cost,
      comment: `Снабжение и ремонт «${cfg.name}» до 100%`, timestamp: new Date(now).toLocaleString('ru-RU'), timestampMs: serverTimestamp()
    });

    showToast(`🔧 «${cfg.name}» снабжено и отремонтировано до 100% (-${formatBaity(cost)})!`, 'success');
    renderEarnAndLoansView();
  });
}

export function openNewBusinessRegistryModal() {
  if (!state.currentUser) return showToast('Войдите в счёт!', 'error');
  const u = findUser(state.currentUser);
  if (!u) return;
  const slots = getUserBusinessSlotsEntries(u, appData.settings);
  const freeSlots = Math.max(0, MAX_USER_BUSINESSES - slots.length);
  const freeLbl = document.getElementById('modalFreeSlotsCount');
  if (freeLbl) freeLbl.innerText = String(freeSlots);

  const catalog = getBusinessCatalog();
  const grid = document.getElementById('newBusinessModalCatalogGrid');
  if (grid) {
    grid.innerHTML = catalog.map(cfg => {
      const sameTypeCount = slots.filter(s => s.typeId === cfg.id).length;
      const cost = Math.round(Number(cfg.baseCost || 150));
      const hourly = getBusinessHourlyIncome(cfg, 1, 100, appData.settings);
      const maxHourly20 = getBusinessHourlyIncome(cfg, MAX_BUSINESS_LEVEL, 100, appData.settings);
      const canAfford = (u.balance || 0) >= cost;

      return `
        <div class="p-3.5 rounded-2xl bg-bank-darkest border border-bank-gold/50 flex flex-col justify-between space-y-2.5">
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-start gap-2.5">
              <div class="w-10 h-10 rounded-xl bg-black border border-bank-gold/50 text-bank-gold flex items-center justify-center text-base flex-shrink-0"><i class="fa-solid ${cfg.icon}"></i></div>
              <div class="min-w-0">
                <span class="text-[9px] font-mono uppercase text-emerald-400 block">${escapeHtml(cfg.tier)}</span>
                <h4 class="font-royal font-bold text-xs sm:text-sm text-white">${escapeHtml(cfg.name)}</h4>
                <p class="text-[10px] text-emerald-400/70 mt-0.5">${escapeHtml(cfg.desc)}</p>
              </div>
            </div>
            ${sameTypeCount > 0 ? `<span class="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-400/50 text-emerald-300 font-mono text-[9px] font-bold">У вас: ${sameTypeCount}</span>` : ''}
          </div>
          <div class="pt-2 border-t border-bank-border/60 flex items-center justify-between text-xs gap-2">
            <div>
              <span class="text-[10px] text-emerald-400/70 block">Ур.1: <b class="text-emerald-300 font-mono">+${formatBaity(hourly)}/ч</b></span>
              <span class="text-[9px] text-bank-gold/80 font-mono block">Ур.20: +${formatBaity(maxHourly20)}/ч</span>
            </div>
            <button onclick="openNewBusinessInstance('${cfg.id}', this)" class="tap-btn px-3.5 py-1.5 rounded-xl font-royal font-black text-[11px] uppercase whitespace-nowrap ${canAfford && freeSlots > 0 ? 'bg-gradient-to-r from-bank-gold to-yellow-600 text-black shadow-md' : 'bg-bank-surface border border-bank-border text-emerald-400/60'}">
              Открыть (${formatBaity(cost)})
            </button>
          </div>
        </div>
      `;
    }).join('');
  }
  const modal = document.getElementById('newBusinessRegistryModal');
  modal.classList.remove('hidden'); modal.classList.add('flex');
}

export function closeNewBusinessRegistryModal() {
  const modal = document.getElementById('newBusinessRegistryModal');
  modal.classList.add('hidden'); modal.classList.remove('flex');
}

export async function openNewBusinessInstance(typeId, btnEl = null) {
  return withOperationLock(`biz_open_${typeId}`, btnEl, async () => {
    if (!state.currentUser) return showToast('Войдите в свой счёт!', 'error');
    const u = findUser(state.currentUser);
    if (!u || u.isBlocked) return;
    const cfg = getBusinessCatalog().find(b => b.id === typeId);
    if (!cfg) return;
    if (getUserBusinessSlotsEntries(u, appData.settings).length >= MAX_USER_BUSINESSES) return showToast(`Все ${MAX_USER_BUSINESSES} слотов заняты!`, 'error');
    const cost = getBusinessUpgradeCost(cfg, 0);
    if ((u.balance || 0) < cost) return showToast(`Требуется ${formatBaity(cost)}.`, 'error');

    const uKey = normalizeLogin(u.username), now = getServerTime();
    const slotKey = `slot_${now}_${Math.random().toString(36).slice(2, 5)}`;

    const txResult = await runTransaction(db.ref(`bankData/users/${uKey}`), (userSnap) => {
      if (!userSnap) return userSnap;
      const bal = Math.round(Number(userSnap.balance || 0));
      if (bal < cost) return;
      const curSlots = userSnap.businesses ? Object.values(userSnap.businesses).filter(b => b && Number(b.level || 0) >= 1).length : 0;
      if (curSlots >= MAX_USER_BUSINESSES) return;

      userSnap.balance = bal - cost;
      if (!userSnap.businesses) userSnap.businesses = {};
      if (!userSnap.taxCycleStartMs) userSnap.taxCycleStartMs = now;
      userSnap.businesses[slotKey] = {
        typeId: cfg.id, level: 1, condition: 100, lastCollected: now,
        upgradeStartedAt: null, upgradeEndsAt: null, openedAt: now
      };
      if (!userSnap.stats) userSnap.stats = {};
      if (!userSnap.stats.expense) userSnap.stats.expense = {};
      userSnap.stats.expense.craftsUpgradeAndSupply = Math.round(Number(userSnap.stats.expense.craftsUpgradeAndSupply || 0)) + cost;
      return userSnap;
    });

    if (!txResult.committed) return showToast('Не удалось открыть предприятие. Проверьте баланс и слоты!', 'error');
    await addTreasuryTaxOrProfit(cost);

    const opId = newOperationId('BIZOPEN');
    await db.ref(`bankData/transactions/${opId}`).set({
      id: opId, from: u.username, to: 'ПАЛАТА ПРОМЫСЛОВ (КАЗНА)', amount: cost,
      comment: `Открытие «${cfg.name}» (Ур. 1)`, timestamp: new Date(now).toLocaleString('ru-RU'), timestampMs: serverTimestamp()
    });
    closeNewBusinessRegistryModal();
    showToast(`Корпорация «${cfg.name}» открыта!`, 'success');
    renderEarnAndLoansView();
  });
}

export async function upgradeBusinessSlot(slotKey, btnEl = null) {
  return withOperationLock(`biz_upgrade_${slotKey}`, btnEl, async () => {
    if (!state.currentUser) return;
    const u = findUser(state.currentUser);
    if (!u || u.isBlocked) return;
    const targetSlot = getUserBusinessSlotsEntries(u, appData.settings).find(s => s.slotKey === slotKey);
    if (!targetSlot) return;
    const { cfg, data } = targetSlot;
    const curLevel = Number(data.level || 1);
    const now = getServerTime();
    if (curLevel >= MAX_BUSINESS_LEVEL) return showToast('Достигнут максимальный 20-й уровень!', 'info');
    if (data.upgradeEndsAt && Number(data.upgradeEndsAt) > now) return showToast('Уже идёт модернизация!', 'info');

    const cost = getBusinessUpgradeCost(cfg, curLevel);
    if ((u.balance || 0) < cost) return showToast(`Требуется ${formatBaity(cost)}.`, 'error');

    const calc = calculateUserPendingBusinessRevenue(u, appData.loans, appData.settings, now, state.isDemoMode);
    const pendingThis = Math.floor(calc.perSlot[slotKey]?.earned || 0);
    const taxPct = getEffectiveTaxPercent();
    const taxAmt = pendingThis >= 1 ? Math.floor(pendingThis * (taxPct / 100)) : 0;
    const netAmt = pendingThis >= 1 ? Math.max(0, pendingThis - taxAmt) : 0;

    const uKey = normalizeLogin(u.username), durationMs = getBusinessUpgradeDurationMs(curLevel);
    const txResult = await runTransaction(db.ref(`bankData/users/${uKey}`), (userSnap) => {
      if (!userSnap) return userSnap;
      const bal = Math.round(Number(userSnap.balance || 0));
      if (bal < cost) return;
      if (!userSnap.businesses || !userSnap.businesses[slotKey]) return;

      userSnap.balance = bal - cost + netAmt;
      userSnap.businesses[slotKey].lastCollected = now;
      userSnap.businesses[slotKey].upgradeStartedAt = now;
      userSnap.businesses[slotKey].upgradeEndsAt = now + durationMs;

      if (!userSnap.stats) userSnap.stats = {};
      if (!userSnap.stats.expense) userSnap.stats.expense = {};
      userSnap.stats.expense.craftsUpgradeAndSupply = Math.round(Number(userSnap.stats.expense.craftsUpgradeAndSupply || 0)) + cost;
      if (netAmt > 0) {
        if (!userSnap.stats.income) userSnap.stats.income = {};
        userSnap.stats.income.crafts = Math.round(Number(userSnap.stats.income.crafts || 0)) + netAmt;
      }
      return userSnap;
    });

    if (!txResult.committed) return showToast('Не удалось запустить модернизацию!', 'error');
    await addTreasuryTaxOrProfit(cost + taxAmt);

    showToast(`Модернизация «${cfg.name}» до Ур. ${curLevel + 1} запущена!`, 'success');
    renderEarnAndLoansView();
  });
}

export function openBusinessInspectorModal(slotKey) {
  if (!state.currentUser) return;
  const u = findUser(state.currentUser);
  if (!u) return;
  const target = getUserBusinessSlotsEntries(u, appData.settings).find(s => s.slotKey === slotKey);
  if (!target) return;
  const { cfg, data } = target;
  const lvl = Number(data.level || 1);
  const cond = computeEffectiveSlotCondition(data, getServerTime());
  const hourly = getBusinessHourlyIncome(cfg, lvl, cond, appData.settings);
  const totalInvested = calculateTotalBusinessInvestment(cfg, lvl);
  const refund = Math.max(1, Math.round(totalInvested * 0.50));

  document.getElementById('bizInspIconBox').innerHTML = `<i class="fa-solid ${cfg.icon}"></i>`;
  document.getElementById('bizInspTierBadge').innerText = cfg.tier;
  document.getElementById('bizInspTitle').innerText = cfg.name;
  document.getElementById('bizInspLevel').innerText = `${lvl} / ${MAX_BUSINESS_LEVEL} (Состояние: ${cond}%)`;
  document.getElementById('bizInspHourly').innerText = `+${formatBaity(hourly)}/ч`;
  document.getElementById('bizInspTotalInvested').innerText = formatBaity(totalInvested);
  document.getElementById('bizInspRefundAmount').innerText = `+${formatBaity(refund)}`;

  const aucBtn = document.getElementById('bizInspAuctionBtn');
  if (aucBtn) {
    aucBtn.onclick = () => {
      closeBusinessInspectorModal();
      openCreateP2PAuctionModal(`business|${slotKey}`);
    };
  }

  const sellBtn = document.getElementById('bizInspSellConfirmBtn');
  if (sellBtn) {
    sellBtn.innerHTML = `💰 Сдать за 50% (+${formatBaity(refund)})`;
    sellBtn.onclick = () => sellBusinessSlotForHalfPrice(slotKey, sellBtn);
  }
  const modal = document.getElementById('businessInspectorModal');
  modal.classList.remove('hidden'); modal.classList.add('flex');
}

export function closeBusinessInspectorModal() {
  const modal = document.getElementById('businessInspectorModal');
  modal.classList.add('hidden'); modal.classList.remove('flex');
}

export async function sellBusinessSlotForHalfPrice(slotKey, btnEl = null) {
  return withOperationLock(`sell_biz_${slotKey}`, btnEl, async () => {
    if (!state.currentUser) return;
    const u = findUser(state.currentUser);
    if (!u || u.isBlocked) return;
    const target = getUserBusinessSlotsEntries(u, appData.settings).find(s => s.slotKey === slotKey);
    if (!target) return;
    const { cfg, data } = target;
    const lvl = Number(data.level || 1);
    const refund = Math.max(1, Math.round(calculateTotalBusinessInvestment(cfg, lvl) * 0.50));
    const calc = calculateUserPendingBusinessRevenue(u, appData.loans, appData.settings, getServerTime(), state.isDemoMode);
    const pendingThis = Math.floor(calc.perSlot[slotKey]?.earned || 0);
    const taxPct = getEffectiveTaxPercent();
    const netPending = pendingThis > 0 ? Math.max(0, pendingThis - Math.floor(pendingThis * (taxPct / 100))) : 0;

    const uKey = normalizeLogin(u.username);
    const txResult = await runTransaction(db.ref(`bankData/users/${uKey}`), (userSnap) => {
      if (!userSnap || !userSnap.businesses || !userSnap.businesses[slotKey]) return;
      delete userSnap.businesses[slotKey];
      userSnap.balance = Math.round(Number(userSnap.balance || 0)) + refund + netPending;
      if (!userSnap.stats) userSnap.stats = {};
      if (!userSnap.stats.income) userSnap.stats.income = {};
      userSnap.stats.income.crafts = Math.round(Number(userSnap.stats.income.crafts || 0)) + refund + netPending;
      return userSnap;
    });

    if (!txResult.committed) return;
    closeBusinessInspectorModal();
    showToast(`Предприятие продано! Возвращено +${formatBaity(refund + netPending)}!`, 'success');
    renderEarnAndLoansView();
  });
}

export async function collectAllBusinessRevenue(btnEl = null) {
  const btn = btnEl || document.getElementById('collectAllBusinessBtn');
  return withOperationLock('collect_all_biz', btn, async () => {
    if (!state.currentUser) return showToast('Войдите в счёт!', 'error');
    const u = findUser(state.currentUser);
    if (!u || u.isBlocked) return;
    const now = getServerTime();
    const calc = calculateUserPendingBusinessRevenue(u, appData.loans, appData.settings, now, state.isDemoMode);
    if (calc.isFrozenByDebt) {
      return showToast('❄️ Доход заморожен (просрочены 72ч декларации)! Оплатите налог или выпишите долговую расписку ниже!', 'error');
    }
    const rawTotal = Math.floor(calc.totalRaw);
    if (rawTotal < 1) return showToast('На складах ещё не накопился минимум 1 ฿!', 'info');

    const taxPct = getEffectiveTaxPercent();
    const taxAmt = Math.floor(rawTotal * (taxPct / 100));
    const netAmt = Math.max(1, rawTotal - taxAmt);
    const uKey = normalizeLogin(u.username);

    const txResult = await runTransaction(db.ref(`bankData/users/${uKey}`), (userSnap) => {
      if (!userSnap || !userSnap.businesses) return;
      userSnap.balance = Math.round(Number(userSnap.balance || 0)) + netAmt;
      Object.keys(userSnap.businesses).forEach(slotKey => {
        const b = userSnap.businesses[slotKey];
        if (b && Number(b.level || 0) > 0) {
          const curCond = computeEffectiveSlotCondition(b, now);
          b.condition = Math.max(10, curCond - 6);
          b.lastCollected = now;
        }
      });
      if (!userSnap.stats) userSnap.stats = {};
      if (!userSnap.stats.income) userSnap.stats.income = {};
      userSnap.stats.income.crafts = Math.round(Number(userSnap.stats.income.crafts || 0)) + netAmt;
      return userSnap;
    });

    if (!txResult.committed) return;
    if (taxAmt > 0) await addTreasuryTaxOrProfit(taxAmt);

    const opId = newOperationId('PROF');
    await db.ref(`bankData/transactions/${opId}`).set({
      id: opId, from: 'БОЯРСКИЕ ПРОМЫСЛЫ', to: u.username, amount: netAmt,
      comment: `Выручка корпораций (Налог ${taxPct}% = ${taxAmt} ฿)`,
      timestamp: new Date(now).toLocaleString('ru-RU'), timestampMs: serverTimestamp()
    });
    showToast(`Выручка собрана: +${formatBaity(netAmt)}!`, 'success');
  });
}

export function openCosmicBasesModal(cosId) {
  if (!state.currentUser) return showToast('Войдите в счёт!', 'error');
  const u = findUser(state.currentUser);
  const cfg = COSMIC_EMPIRE_CATALOG.find(c => c.id === cosId);
  if (!u || !cfg) return;

  const ownedCount = countUserOwnedAssetById(u, cosId);
  if (ownedCount <= 0) return showToast('Сначала приобретите эту космическую локацию!', 'info');

  const basesObj = u.cosmicBases?.[cosId] || { mining: 0, research: 0, power: 0 };
  const curHourly = getCosmicLocationHourlyYield(cfg, basesObj, ownedCount, appData.settings);

  document.getElementById('cosmicBasesModalTitle').innerText = `${cfg.title} (×${ownedCount})`;
  document.getElementById('cosmicBasesModalSub').innerText = `Максимальная отдача при 15/15 уровнях баз: ${cfg.maxHourlyRatePct}%/ч • Текущая выработка: +${formatBaity(curHourly)}/ч (0% регулярных налогов)`;

  const body = document.getElementById('cosmicBasesModalBody');
  body.innerHTML = COSMIC_BASE_TYPES.map(bt => {
    const curLvl = Math.min(5, Math.max(0, Number(basesObj[bt.key] || 0)));
    const isMax = curLvl >= 5;
    const nextCost = getCosmicBaseUpgradeCost(cfg, bt, curLvl, appData.settings);
    const canAfford = (u.balance || 0) >= nextCost;

    const singleMaxHr = getDynamicShopPrice(cfg.id, cfg.price, 'cosmos') * (cfg.maxHourlyRatePct / 100) * bt.yieldShare;
    const curBaseHr = Math.round(singleMaxHr * (curLvl / 5) * ownedCount);
    const nextBaseHr = Math.round(singleMaxHr * ((curLvl + 1) / 5) * ownedCount);

    return `
      <div class="p-3.5 rounded-2xl bg-bank-darkest border border-purple-500/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <span class="font-royal font-black text-sm text-white">${bt.name}</span>
            <span class="px-2 py-0.5 rounded-full bg-purple-950 border border-purple-400 text-purple-200 font-mono text-[10px] font-bold">Уровень ${curLvl} / 5</span>
          </div>
          <p class="text-[11px] text-emerald-300/80">${bt.desc}</p>
          <div class="text-[11px] font-mono text-bank-gold">
            Текущий вклад: <b>+${formatBaity(curBaseHr)}/ч</b> ${!isMax ? `→ На Ур.${curLvl + 1}: <b class="text-emerald-300">+${formatBaity(nextBaseHr)}/ч</b>` : ''}
          </div>
        </div>
        ${isMax
          ? `<span class="px-3 py-2 rounded-xl bg-amber-500/20 border border-bank-gold text-bank-gold font-royal font-black text-xs uppercase whitespace-nowrap">👑 Макс. Ур. 5</span>`
          : `<button type="button" onclick="upgradeCosmicBaseLevel('${cfg.id}', '${bt.key}', this)" class="tap-btn px-4 py-2 rounded-xl font-royal font-black text-xs uppercase whitespace-nowrap ${canAfford ? 'bg-gradient-to-r from-purple-500 to-amber-400 text-black shadow-lg' : 'bg-bank-surface border border-bank-border text-emerald-400/60'}">
              ${curLvl === 0 ? 'Построить Ур.1' : `Прокачать Ур.${curLvl + 1}`} (${formatBaity(nextCost)})
            </button>`
        }
      </div>
    `;
  }).join('');

  const modal = document.getElementById('cosmicBasesModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

export function closeCosmicBasesModal() {
  const modal = document.getElementById('cosmicBasesModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

export async function upgradeCosmicBaseLevel(cosId, baseKey, btnEl = null) {
  return withOperationLock(`upg_cos_base_${cosId}_${baseKey}`, btnEl, async () => {
    if (!state.currentUser) return;
    const u = findUser(state.currentUser);
    const cfg = COSMIC_EMPIRE_CATALOG.find(c => c.id === cosId);
    const bt = COSMIC_BASE_TYPES.find(b => b.key === baseKey);
    if (!u || !cfg || !bt || u.isBlocked) return;

    const ownedCount = countUserOwnedAssetById(u, cosId);
    if (ownedCount <= 0) return showToast('Сначала приобретите эту космическую локацию!', 'error');

    const basesObj = u.cosmicBases?.[cosId] || { mining: 0, research: 0, power: 0 };
    const curLvl = Math.min(5, Math.max(0, Number(basesObj[baseKey] || 0)));
    if (curLvl >= 5) return showToast('Эта база уже прокачана до максимального 5 уровня!', 'info');

    const cost = getCosmicBaseUpgradeCost(cfg, bt, curLvl, appData.settings);
    if ((u.balance || 0) < cost) return showToast(`Для строительства/улучшения базы требуется ${formatBaity(cost)}!`, 'error');

    const now = getServerTime();
    const cosCalc = calculateUserCosmicRent(u, appData.settings, now);
    const pendingThis = Math.floor(cosCalc.perItem[cosId]?.earned || 0);

    const uKey = normalizeLogin(u.username);
    const opId = newOperationId('COSBASE');
    if (!await atomicBalanceChange(u.username, -cost + pendingThis, { requireFunds: true, operationId: opId })) return;
    await addTreasuryTaxOrProfit(cost);
    await recordPlayerFinancialStat(u.username, 'expense', 'craftsUpgradeAndSupply', cost);
    if (pendingThis > 0) await recordPlayerFinancialStat(u.username, 'income', 'crafts', pendingThis);

    await db.ref(`bankData/users/${uKey}/cosmicBases/${cosId}`).update({
      [baseKey]: curLvl + 1,
      lastCollected: now
    });

    await db.ref(`bankData/transactions/${opId}`).set({
      id: opId, from: u.username, to: 'КОСМИЧЕСКИЙ ИНЖЕНЕРНЫЙ КОРПУС (КАЗНА)', amount: cost,
      comment: `Прокачка «${bt.name}» до Ур.${curLvl + 1} на «${cfg.title}»`,
      timestamp: new Date(now).toLocaleString('ru-RU'), timestampMs: serverTimestamp()
    });

    showToast(`🚀 «${bt.name}» прокачана до Ур. ${curLvl + 1}/5!`, 'success');
    openCosmicBasesModal(cosId);
    renderCosmicEmpireShop();
  });
}

// -------------------------------------------------------------------------
// 8. ОСТАЛЬНЫЕ ОБРАБОТЧИКИ (КИБЕР-ПОЛИГОН, ТОРГЪ, БИРЖА, QR, НАСТРОЙКИ, АДМИНКА)
// -------------------------------------------------------------------------
export let minesState = { active: false, bet: 0, minesCount: 3, minePositions: [], revealed: [], defusedMines: [], hasShield: false, multiplier: 1.0, busy: false, startedAtServerMs: 0 };
let gameStartTime = 0;

export function getPolygonServerDateKey() {
  const d = new Date(getServerTime());
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

export function getUserPolygonDailyEarned(userObj) {
  if (!userObj) return 0;
  const todayKey = getPolygonServerDateKey();
  if (userObj.polygonDailyDate !== todayKey) return 0;
  return Math.max(0, Math.round(Number(userObj.polygonDailyEarned || 0)));
}

export async function checkAndRecordPolygonDailyProfit(username, netProfitAmount) {
  if (state.isDemoMode || !username || netProfitAmount <= 0) return { allowed: true };
  const uKey = normalizeLogin(username);
  const todayKey = getPolygonServerDateKey();
  let exceeded = false;

  const txRes = await runTransaction(db.ref(`bankData/users/${uKey}`), (userSnap) => {
    if (!userSnap) return userSnap;
    const curDate = userSnap.polygonDailyDate || '';
    const curEarned = curDate === todayKey ? Math.round(Number(userSnap.polygonDailyEarned || 0)) : 0;
    if (curEarned + netProfitAmount > POLYGON_DAILY_EARN_LIMIT) {
      exceeded = true;
      return;
    }
    userSnap.polygonDailyDate = todayKey;
    userSnap.polygonDailyEarned = curEarned + netProfitAmount;
    return userSnap;
  });

  if (exceeded || !txRes.committed) {
    return { allowed: false, message: `Достигнут суточный лимит заработка в Кибер-Полигоне (${formatBaity(POLYGON_DAILY_EARN_LIMIT)})!` };
  }
  return { allowed: true };
}

export async function buyPolygonBooster(boosterType, btnEl = null) {
  return withOperationLock(`buy_booster_${boosterType}`, btnEl, async () => {
    if (!state.currentUser) return showToast('Войдите в счёт!', 'error');
    const u = findUser(state.currentUser);
    if (!u || u.isBlocked) return;

    const cSet = appData.settings?.casino || DEFAULT_SETTINGS.casino;
    let price = 100, title = 'Модуль';
    if (boosterType === 'shield') { price = Number(cSet.shieldPrice || 150); title = '🛡️ Бронещит Сапёра'; }
    else if (boosterType === 'radar') { price = Number(cSet.radarPrice || 100); title = '📡 Импульсный Радар'; }
    else return;

    if ((u.balance || 0) < price) return showToast(`Недостаточно Байти! Требуется ${formatBaity(price)}.`, 'error');

    const opId = newOperationId('BOOST');
    if (!await atomicBalanceChange(u.username, -price, { requireFunds: true, operationId: opId })) return;
    await addTreasuryTaxOrProfit(price);

    const uKey = normalizeLogin(u.username);
    const curCount = Number(u.polygonBoosters?.[boosterType] || 0);
    await db.ref(`bankData/users/${uKey}/polygonBoosters/${boosterType}`).set(curCount + 1);

    showToast(`Модуль «${title}» приобретён (${curCount + 1} шт.)!`, 'success');
    renderCasinoClubView();
  });
}

export function getValidatedCasinoBet() {
  if (guardDemoReadOnly()) return null;
  if (!state.currentUser) { showToast('Войдите в счёт!', 'error'); return null; }
  const u = findUser(state.currentUser);
  if (!u || u.isBlocked) { showToast('Ваш счёт заблокирован!', 'error'); return null; }
  const cSet = appData.settings?.casino || DEFAULT_SETTINGS.casino;
  if (!cSet.enabled) { showToast('Кибер-Полигон закрыт по указу Императора!', 'error'); return null; }

  const dailyEarned = getUserPolygonDailyEarned(u);
  if (dailyEarned >= POLYGON_DAILY_EARN_LIMIT) {
    showToast(`Дневной лимит заработка на Полигоне (${formatBaity(POLYGON_DAILY_EARN_LIMIT)}) исчерпан!`, 'error');
    return null;
  }

  const raw = parseInt(document.getElementById('casinoBetInput')?.value || '0', 10);
  const minBet = Number(cSet.minBet || 10);
  const maxBet = Number(cSet.maxBet || 50000);

  if (!Number.isSafeInteger(raw) || isNaN(raw) || raw <= 0) { showToast('Введите корректный энерго-пакет!', 'error'); return null; }
  if (raw < minBet) { showToast(`Минимальный энерго-пакет: ${formatBaity(minBet)}!`, 'error'); return null; }
  if (raw > maxBet) { showToast(`Максимальный энерго-пакет: ${formatBaity(maxBet)}!`, 'error'); return null; }
  if ((u.balance || 0) < raw) { showToast(`Недостаточно Байти на балансе!`, 'error'); return null; }
  return raw;
}

export function adjustCasinoBet(action) {
  const inp = document.getElementById('casinoBetInput');
  if (!inp || !state.currentUser) return;
  const u = findUser(state.currentUser);
  const bal = Number(u?.balance || 0);
  const cSet = appData.settings?.casino || DEFAULT_SETTINGS.casino;
  const minBet = Number(cSet.minBet || 10);
  const maxBet = Number(cSet.maxBet || 50000);
  let cur = parseInt(inp.value || String(minBet), 10) || minBet;

  if (action === 'min') cur = minBet;
  else if (action === 'half') cur = Math.max(minBet, Math.floor(cur / 2));
  else if (action === 'double') cur = Math.min(maxBet, Math.min(bal || maxBet, cur * 2));
  else if (action === 'max') cur = Math.max(minBet, Math.min(maxBet, bal));
  inp.value = cur;
}

export function switchCasinoGame(gameKey) {
  state.currentCasinoGame = (gameKey === 'mining') ? 'mining' : 'mines';
  ['mines', 'mining'].forEach(k => {
    const view = document.getElementById(`casinoGameView-${k}`);
    const btn = document.getElementById(`casinoTabBtn-${k}`);
    if (view) view.classList.toggle('hidden', k !== state.currentCasinoGame);
    if (btn) {
      btn.className = k === state.currentCasinoGame
        ? 'tap-btn p-2.5 rounded-2xl text-[11px] sm:text-sm font-royal font-bold uppercase bg-gradient-to-r from-emerald-500 to-emerald-700 text-emerald-950 shadow-lg flex items-center justify-center gap-1.5 transition-all'
        : 'tap-btn p-2.5 rounded-2xl text-[11px] sm:text-sm font-royal font-bold uppercase bg-bank-surface text-emerald-300 border border-bank-border hover:bg-bank-card flex items-center justify-center gap-1.5 transition-all';
    }
  });
  if (state.currentCasinoGame === 'mines') renderMinesBoard();
  if (state.currentCasinoGame === 'mining') renderSpaceMiningView();
}

export async function startMinesGame(btnEl = null) {
  return withOperationLock('casino_mines_start', btnEl || document.getElementById('minesStartBtn'), async () => {
    if (minesState.active || minesState.busy) return;
    if (appData.settings?.casino?.minesEnabled === false) return showToast('Симулятор «Кибер-Сапёр» временно отключён!', 'error');
    const bet = getValidatedCasinoBet();
    if (!bet) return;

    const minesCount = Math.min(10, Math.max(1, parseInt(document.getElementById('minesCountSelect')?.value || '3', 10)));
    minesState.busy = true;
    renderMinesBoard();

    try {
      const opId = newOperationId('MINES');
      if (!await atomicBalanceChange(state.currentUser, -bet, { requireFunds: true, operationId: opId })) return showToast('Не удалось списать энерго-пакет.', 'error');

      const u = findUser(state.currentUser);
      const uKey = normalizeLogin(u.username);
      const wantShield = !!document.getElementById('minesUseShieldCheck')?.checked;
      const shieldOwned = Number(u?.polygonBoosters?.shield || 0);
      let hasShieldForRound = false;
      if (wantShield && shieldOwned > 0) {
        hasShieldForRound = true;
        await db.ref(`bankData/users/${uKey}/polygonBoosters/shield`).set(shieldOwned - 1);
      }

      const positions = [];
      while (positions.length < minesCount) {
        const r = Math.floor(Math.random() * 25);
        if (!positions.includes(r)) positions.push(r);
      }

      gameStartTime = getServerTime();
      minesState = {
        active: true, bet, minesCount, minePositions: positions,
        revealed: [], defusedMines: [], hasShield: hasShieldForRound,
        multiplier: 1.0, busy: false, startedAtServerMs: gameStartTime
      };
      renderCasinoClubView();
      showToast(`Миссия начата! Пакет: ${formatBaity(bet)}${hasShieldForRound ? ' (🛡️ Щит активен)' : ''}`, 'info');
    } finally {
      minesState.busy = false;
      renderMinesBoard();
    }
  });
}

export async function useMinesRadarPulse(btnEl = null) {
  return withOperationLock('mines_radar_use', btnEl, async () => {
    if (!minesState.active || minesState.busy || !state.currentUser) return;
    const u = findUser(state.currentUser);
    const radarOwned = Number(u?.polygonBoosters?.radar || 0);
    if (radarOwned <= 0) return showToast('Нет Импульсных Радаров!', 'error');

    const safeHidden = [];
    for (let i = 0; i < 25; i++) {
      if (!minesState.revealed.includes(i) && !minesState.defusedMines.includes(i) && !minesState.minePositions.includes(i)) safeHidden.push(i);
    }
    if (safeHidden.length === 0) return;

    const uKey = normalizeLogin(u.username);
    await db.ref(`bankData/users/${uKey}/polygonBoosters/radar`).set(radarOwned - 1);
    const targetIdx = safeHidden[Math.floor(Math.random() * safeHidden.length)];
    showToast('📡 Радар открыл безопасный кристалл!', 'info');
    await clickMinesTile(targetIdx, true);
  });
}

export async function clickMinesTile(idx, isFromRadar = false) {
  if (guardDemoReadOnly()) return;
  if (!minesState.active || minesState.busy || minesState.revealed.includes(idx) || minesState.defusedMines.includes(idx)) return;
  minesState.busy = true;

  const houseEdge = Number(appData.settings?.casino?.houseEdge || 6);
  if (!isFromRadar && !minesState.minePositions.includes(idx) && minesState.revealed.length >= 2 && Math.random() * 100 < (houseEdge * 0.45)) {
    const unrevealedSafe = [];
    for (let i = 0; i < 25; i++) {
      if (i !== idx && !minesState.revealed.includes(i) && !minesState.defusedMines.includes(i) && !minesState.minePositions.includes(i)) unrevealedSafe.push(i);
    }
    if (unrevealedSafe.length > 0) minesState.minePositions[0] = idx;
  }

  if (minesState.minePositions.includes(idx)) {
    if (minesState.hasShield) {
      minesState.hasShield = false;
      minesState.defusedMines.push(idx);
      minesState.busy = false;
      renderMinesBoard();
      showToast('🛡️ БРОНЕЩИТ СРАБОТАЛ! Вирус обезврежен!', 'success');
      return;
    }
    minesState.revealed.push(idx);
    minesState.active = false;
    await addTreasuryTaxOrProfit(minesState.bet);
    minesState.busy = false;
    renderMinesBoard(true);
    showToast(`💥 ВЗРЫВ ВИРУСА! Пакет ${formatBaity(minesState.bet)} ушёл в Казну.`, 'error');
    return;
  }

  minesState.revealed.push(idx);
  const safeOpenedCount = minesState.revealed.filter(i => !minesState.minePositions.includes(i)).length;
  minesState.multiplier = calculateMinesNextMultiplier(minesState.minesCount, safeOpenedCount, houseEdge);
  minesState.busy = false;
  renderMinesBoard();
  if (safeOpenedCount >= (25 - minesState.minesCount)) await cashoutMinesGame();
}

export async function cashoutMinesGame(btnEl = null) {
  return withOperationLock('casino_mines_cashout', btnEl || document.getElementById('minesCashoutBtn'), async () => {
    const safeOpenedCount = minesState.revealed.filter(i => !minesState.minePositions.includes(i)).length;
    if (!minesState.active || safeOpenedCount === 0 || minesState.busy) return;
    minesState.busy = true;

    const deltaTime = getServerTime() - Number(minesState.startedAtServerMs || gameStartTime || 0);
    if (deltaTime < POLYGON_MIN_MINES_TIME_MS) {
      minesState.active = false;
      minesState.busy = false;
      logSecurityEvent('Античит Кибер-Полигона (Speedhack)', `@${state.currentUser} попытался завершить Сапёр за ${deltaTime} мс`, 'warn');
      renderMinesBoard(true);
      return showToast('Античит Службы Безопасности: физически невозможная скорость прохождения! Начисление заблокировано.', 'error');
    }

    const winAmt = Math.round(minesState.bet * minesState.multiplier);
    const netProfit = Math.max(0, winAmt - minesState.bet);

    const dailyCheck = await checkAndRecordPolygonDailyProfit(state.currentUser, netProfit);
    if (!dailyCheck.allowed) {
      await atomicBalanceChange(state.currentUser, minesState.bet, { operationId: newOperationId('MINESREF') });
      minesState.active = false;
      minesState.busy = false;
      renderMinesBoard(true);
      return showToast(dailyCheck.message, 'error');
    }

    minesState.active = false;
    try {
      const opId = newOperationId('MINESWIN');
      await atomicBalanceChange(state.currentUser, winAmt, { operationId: opId });
      await recordPlayerFinancialStat(state.currentUser, 'income', 'polygon', netProfit > 0 ? netProfit : winAmt);
      if (winAmt >= minesState.bet * 4 || winAmt >= 2000) {
        logSecurityEvent('Крупная награда в Сапёре', `@${state.currentUser} получил ${winAmt} ฿ (x${minesState.multiplier.toFixed(2)})`, 'win');
      }
      showToast(`💎 Награда +${formatBaity(winAmt)} (x${minesState.multiplier.toFixed(2)})!`, 'success');
    } finally {
      minesState.busy = false;
      renderCasinoClubView();
      renderMinesBoard(true);
    }
  });
}

export async function startSpaceMiningExpedition(missionId, btnEl = null) {
  return withOperationLock(`space_mine_start_${missionId}`, btnEl, async () => {
    if (!state.currentUser) return showToast('Войдите в счёт!', 'error');
    if (appData.settings?.casino?.miningEnabled === false) return showToast('Космические экспедиции временно приостановлены!', 'error');
    const u = findUser(state.currentUser);
    if (!u || u.isBlocked) return;
    if (u.spaceExpedition && u.spaceExpedition.active) return showToast('Уже есть активная экспедиция!', 'info');

    const dailyEarned = getUserPolygonDailyEarned(u);
    if (dailyEarned >= POLYGON_DAILY_EARN_LIMIT) {
      return showToast(`Дневной лимит заработка на Полигоне (${formatBaity(POLYGON_DAILY_EARN_LIMIT)}) исчерпан!`, 'error');
    }

    const cfg = SPACE_MINING_CATALOG.find(m => m.id === missionId);
    if (!cfg) return;
    if ((u.balance || 0) < cfg.cost) return showToast(`Требуется ${formatBaity(cfg.cost)}.`, 'error');

    const opId = newOperationId('SPMIN');
    if (!await atomicBalanceChange(u.username, -cfg.cost, { requireFunds: true, operationId: opId })) return;

    const now = getServerTime(), durationMs = cfg.durationMinutes * 60 * 1000;
    const pct = cfg.minReturnPct + Math.random() * (cfg.maxReturnPct - cfg.minReturnPct);
    const reward = Math.round(cfg.cost * (1 + pct / 100));
    const uKey = normalizeLogin(u.username);

    await db.ref(`bankData/users/${uKey}/spaceExpedition`).set({
      active: true, missionId: cfg.id, title: cfg.title, cost: cfg.cost, reward, startedAt: now, endsAt: now + durationMs
    });
    showToast(`🚀 Экспедиция «${cfg.title}» стартовала!`, 'success');
    renderSpaceMiningView();
  });
}

export async function claimSpaceMiningExpedition(btnEl = null) {
  return withOperationLock('space_mine_claim', btnEl, async () => {
    if (!state.currentUser) return;
    const u = findUser(state.currentUser);
    if (!u || !u.spaceExpedition || !u.spaceExpedition.active) return;
    const exp = u.spaceExpedition;
    const now = getServerTime();

    const minDurationMs = Math.max(60000, Number(exp.endsAt || 0) - Number(exp.startedAt || 0));
    const deltaTime = now - Number(exp.startedAt || 0);
    if (now < Number(exp.endsAt || 0) || deltaTime < minDurationMs - 2000) {
      return showToast('Корабль ещё в полёте (проверка серверного времени)!', 'info');
    }

    const reward = Math.max(1, Number(exp.reward || exp.cost || 1000));
    const netProfit = Math.max(0, reward - Number(exp.cost || 0));
    const dailyCheck = await checkAndRecordPolygonDailyProfit(u.username, netProfit);
    if (!dailyCheck.allowed) {
      showToast(dailyCheck.message, 'error');
      return;
    }

    const uKey = normalizeLogin(u.username), opId = newOperationId('SPGOLD');
    await db.ref(`bankData/users/${uKey}/spaceExpedition`).set(null);
    await atomicBalanceChange(u.username, reward, { operationId: opId });
    await recordPlayerFinancialStat(u.username, 'income', 'polygon', netProfit > 0 ? netProfit : reward);
    await db.ref(`bankData/transactions/${opId}`).set({
      id: opId, from: 'КОСМИЧЕСКАЯ ЗОЛОТОДОБЫЧА (/club)', to: u.username, amount: reward,
      comment: `Добыча золота: ${exp.title}`, timestamp: new Date(now).toLocaleString('ru-RU'), timestampMs: serverTimestamp()
    });
    showToast(`✨ Золото разгружено: +${formatBaity(reward)}!`, 'success');
    renderCasinoClubView();
  });
}

let hackSession = { attemptsLeft: 3, winningNode: 0, finished: false, busy: false, startedAtServerMs: 0 };

export function openTerminalHackModal() {
  if (!state.currentUser) return showToast('Войдите в счёт!', 'error');
  const u = findUser(state.currentUser);
  if (!u) return;

  const cSet = appData.settings?.casino || DEFAULT_SETTINGS.casino;
  const minR = Number(cSet.hackMinReward || 100), maxR = Number(cSet.hackMaxReward || 500);
  const rngLbl = document.getElementById('hackRewardRangeLabel');
  if (rngLbl) rngLbl.innerText = `${minR}–${maxR} ฿`;

  const now = getServerTime();
  const diff = (Number(u.lastTerminalHack || 0) + 24 * 3600 * 1000) - now;
  const modal = document.getElementById('terminalHackModal');
  const coolEl = document.getElementById('hackCooldownNotice');
  const attEl = document.getElementById('hackAttemptsLeft');
  const line1 = document.getElementById('hackMatrixLine1');

  if (diff > 0) {
    hackSession.finished = true;
    if (line1) line1.innerText = '> Шлюз заблокирован (1 раз в 24ч по серверному времени).';
    if (coolEl) coolEl.classList.remove('hidden');
    for (let i = 0; i < 4; i++) { const b = document.getElementById(`hackNodeBtn${i}`); if (b) b.disabled = true; }
  } else {
    gameStartTime = now;
    hackSession = { attemptsLeft: 3, winningNode: Math.floor(Math.random() * 4), finished: false, busy: false, startedAtServerMs: now };
    if (line1) line1.innerText = '> Выберите один из 4 зашифрованных узлов...';
    if (attEl) attEl.innerText = '3';
    if (coolEl) coolEl.classList.add('hidden');
    for (let i = 0; i < 4; i++) {
      const b = document.getElementById(`hackNodeBtn${i}`);
      if (b) {
        b.disabled = false;
        b.className = 'tap-btn p-3.5 rounded-2xl bg-emerald-950/50 hover:bg-emerald-900/70 border border-emerald-500/50 text-emerald-300 flex flex-col items-center justify-center gap-1 transition-all active:scale-95';
      }
    }
  }
  modal.classList.remove('hidden'); modal.classList.add('flex');
  updateRealtimeBusinessAndHackCounters();
}

export function closeTerminalHackModal() {
  const modal = document.getElementById('terminalHackModal');
  modal.classList.add('hidden'); modal.classList.remove('flex');
}

export async function attemptTerminalNodeHack(nodeIdx, btnEl = null) {
  return withOperationLock(`hack_node_${nodeIdx}`, btnEl, async () => {
    if (hackSession.finished || hackSession.busy || !state.currentUser) return;
    const u = findUser(state.currentUser);
    if (!u) return;
    const btn = document.getElementById(`hackNodeBtn${nodeIdx}`);
    if (!btn) return;

    const now = getServerTime();
    const deltaTime = now - Number(hackSession.startedAtServerMs || gameStartTime || 0);
    if (deltaTime < POLYGON_MIN_HACK_TIME_MS) {
      return showToast('Античит: слишком быстрое нажатие на шлюз!', 'error');
    }

    hackSession.busy = true;
    btn.disabled = true;
    hackSession.attemptsLeft--;

    const attEl = document.getElementById('hackAttemptsLeft');
    const line1 = document.getElementById('hackMatrixLine1');
    if (attEl) attEl.innerText = String(hackSession.attemptsLeft);

    const cSet = appData.settings?.casino || DEFAULT_SETTINGS.casino;
    const minR = Number(cSet.hackMinReward || 100), maxR = Number(cSet.hackMaxReward || 500), consolation = Number(cSet.hackConsolation || 25);
    const uKey = normalizeLogin(u.username);

    if (nodeIdx === hackSession.winningNode) {
      hackSession.finished = true;
      btn.className = 'tap-btn p-3.5 rounded-2xl bg-emerald-600 text-black border-2 border-bank-gold flex flex-col items-center justify-center gap-1 shadow-[0_0_25px_rgba(16,185,129,0.9)]';
      const reward = Math.floor(minR + Math.random() * Math.max(10, maxR - minR));
      const dailyCheck = await checkAndRecordPolygonDailyProfit(u.username, reward);
      if (!dailyCheck.allowed) {
        hackSession.busy = false;
        return showToast(dailyCheck.message, 'error');
      }

      const opId = newOperationId('HACK');
      await db.ref(`bankData/users/${uKey}/lastTerminalHack`).set(now);
      await atomicBalanceChange(u.username, reward, { operationId: opId });
      await recordPlayerFinancialStat(u.username, 'income', 'polygon', reward);
      await db.ref(`bankData/transactions/${opId}`).set({
        id: opId, from: 'ТЕРМИНАЛ КАЗНЫ (ВЗЛОМ)', to: u.username, amount: reward,
        comment: 'Успешный взлом защитного шлюза', timestamp: new Date(now).toLocaleString('ru-RU'), timestampMs: serverTimestamp()
      });
      if (line1) line1.innerText = `> ДОСТУП ПОЛУЧЕН! Переведено +${reward} ฿!`;
      showToast(`🔓 ТЕРМИНАЛ ВЗЛОМАН! Грант +${formatBaity(reward)}!`, 'success');
    } else if (hackSession.attemptsLeft <= 0) {
      hackSession.finished = true;
      btn.className = 'tap-btn p-3.5 rounded-2xl bg-rose-950/70 border border-rose-500 text-rose-300 flex flex-col items-center justify-center gap-1';
      await db.ref(`bankData/users/${uKey}/lastTerminalHack`).set(now);
      await atomicBalanceChange(u.username, consolation, { operationId: newOperationId('HACKCONS') });
      await recordPlayerFinancialStat(u.username, 'income', 'polygon', consolation);
      if (line1) line1.innerText = `> Защита сработала. Бонус +${consolation} ฿!`;
      showToast(`Утешительный бонус: +${formatBaity(consolation)}!`, 'info');
    } else {
      btn.className = 'tap-btn p-3.5 rounded-2xl bg-rose-950/50 border border-rose-500/40 text-rose-400 flex flex-col items-center justify-center gap-1 opacity-60';
      if (line1) line1.innerText = `> Узел #${nodeIdx + 1} пуст. Попробуйте другой!`;
    }
    hackSession.busy = false;
  });
}

// -------------------------------------------------------------------------
// 9. СЛУШАТЕЛИ FIREBASE, НАВИГАЦИЯ И ПРОБРОС В WINDOW
// -------------------------------------------------------------------------
export function toggleQuickAutoConvert(explicitVal) {
  userPrefs.autoConvertUnits = explicitVal !== undefined ? !!explicitVal : !userPrefs.autoConvertUnits;
  localStorage.setItem('mb_pref_auto_convert_units', String(userPrefs.autoConvertUnits));
  const cBox = document.getElementById('prefAutoConvertUnits');
  const wBox = document.getElementById('walletBottomAutoConvertToggle');
  const qBtn = document.getElementById('quickUnitModeBtn');
  if (cBox) cBox.checked = userPrefs.autoConvertUnits;
  if (wBox) wBox.checked = userPrefs.autoConvertUnits;
  if (qBtn) qBtn.innerText = userPrefs.autoConvertUnits ? 'Формат: K₿/M₿/G₿' : 'Формат: 1 000 ฿';
  requestRender();
  showToast(userPrefs.autoConvertUnits ? 'Включена авто-конвертация купюр (K₿, M₿, G₿, T₿, P₿)' : 'Включён полный числовой формат (1 000 ฿)', 'info');
}

export function togglePhoneShellMode() {
  userPrefs.phoneShell = !userPrefs.phoneShell;
  localStorage.setItem('mb_pref_phone_shell', String(userPrefs.phoneShell));
  document.body.classList.toggle('phone-shell-mode', userPrefs.phoneShell);
  showToast(userPrefs.phoneShell ? 'Включён мобильный контейнер (Phone Shell 480px)' : 'Включён широкоэкранный режим', 'info');
  setTimeout(() => {
    if (state.currentRoute === '/market') {
      const sel = appData.marketAssets[state.selectedMarketAssetId];
      if (sel) drawMarketXYChart(sel);
    }
  }, 100);
}

export function detectInitialSlashRoute() {
  const path = (window.location.pathname || '').toLowerCase();
  const hash = (window.location.hash || '').replace(/^#/, '').toLowerCase();
  const searchRoute = (new URLSearchParams(window.location.search).get('route') || '').toLowerCase();
  if (path.endsWith('/admin') || path.includes('/admin/') || hash === '/admin' || searchRoute === 'admin') return '/admin';
  if (path.endsWith('/market') || path.includes('/market/') || hash === '/market' || searchRoute === 'market') return '/market';
  if (path.endsWith('/earn') || path.includes('/earn/') || hash === '/earn' || searchRoute === 'earn') return '/earn';
  if (path.endsWith('/club') || path.includes('/club/') || hash === '/club' || searchRoute === 'club') return '/club';
  return '/';
}

export function openMarketDirect(subTab) {
  state.currentMarketSubTab = subTab || 'privileges';
  navigateRoute('/market');
  switchMarketSubTab(state.currentMarketSubTab);
}

export function navigateRoute(route) {
  const normalized = ['/admin', '/market', '/earn', '/club'].includes(route) ? route : '/';
  state.currentRoute = normalized;
  try {
    if (normalized === '/') {
      if (window.location.hash) window.history.replaceState(null, document.title, window.location.pathname + window.location.search);
    } else {
      window.location.hash = normalized;
    }
  } catch (e) {}
  const badge = document.getElementById('currentSlashRouteBadge');
  const pathTxt = document.getElementById('activeRoutePathText');
  if (badge) badge.innerText = normalized;
  if (pathTxt) pathTxt.innerText = `mirobyte.bank${normalized}`;
  renderCurrentView();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

export function navigateTab(tabName) {
  state.activeTabName = tabName;
  if (state.currentRoute !== '/') navigateRoute('/');
  ['dashboard', 'mail', 'leaderboard', 'banknotes', 'rules'].forEach(t => {
    document.getElementById(`tabContent-${t}`)?.classList.toggle('hidden', t !== tabName);
    const deskBtn = document.getElementById(`tabBtn-${t}`);
    if (deskBtn) {
      deskBtn.className = t === tabName
        ? 'tap-btn px-3.5 py-2 rounded-xl text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all bg-emerald-600 text-emerald-950 shadow-md whitespace-nowrap'
        : 'tap-btn px-3.5 py-2 rounded-xl text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all bg-bank-surface text-emerald-300 hover:bg-bank-card whitespace-nowrap';
    }
  });
  updateDesktopAndMobileNavHighlights();
  if (tabName === 'mail') renderMailView();
  if (tabName === 'leaderboard') renderLeaderboard();
  if (tabName === 'banknotes') renderBanknotes();
}

export function switchMarketSubTab(sub) {
  state.currentMarketSubTab = sub;
  ['exchange', 'privileges', 'art', 'garage', 'bazaar', 'realestate', 'cosmos', 'p2pauction'].forEach(k => {
    const view = document.getElementById(`mktSubView-${k}`);
    const btn = document.getElementById(`mktSubBtn-${k}`);
    if (view) view.classList.toggle('hidden', k !== sub);
    if (btn) {
      btn.className = k === sub
        ? 'tap-btn flex-shrink-0 px-2.5 py-2 rounded-2xl text-[10px] sm:text-[11px] font-royal font-bold uppercase bg-bank-gold text-black shadow-md transition-all flex items-center justify-center gap-1 whitespace-nowrap'
        : 'tap-btn flex-shrink-0 px-2.5 py-2 rounded-2xl text-[10px] sm:text-[11px] font-royal font-bold uppercase bg-bank-surface text-emerald-300 border border-bank-border hover:bg-bank-card transition-all flex items-center justify-center gap-1 whitespace-nowrap';
    }
  });
  updateDesktopAndMobileNavHighlights();

  if (sub === 'exchange') {
    setTimeout(() => { const sel = appData.marketAssets[state.selectedMarketAssetId]; if (sel) drawMarketXYChart(sel); }, 30);
  } else if (sub === 'privileges') renderPrivilegeShop();
  else if (sub === 'art') renderLuxuryArtShop();
  else if (sub === 'garage') renderLuxuryGarageShop();
  else if (sub === 'bazaar') renderMarketListings();
  else if (sub === 'realestate') renderRealEstateShop();
  else if (sub === 'cosmos') renderCosmicEmpireShop();
  else if (sub === 'p2pauction') renderP2PAuctionsView();
}

export function switchAdminTab(tabKey) {
  state.currentAdminSubTab = tabKey;
  ['users', 'economy', 'business', 'casino'].forEach(k => {
    const v = document.getElementById(`adminTabView-${k}`);
    const b = document.getElementById(`adminTabBtn-${k}`);
    if (v) v.classList.toggle('hidden', k !== tabKey);
    if (b) {
      b.className = k === tabKey
        ? 'tap-btn p-2 rounded-2xl text-[10px] sm:text-xs font-royal font-bold uppercase bg-bank-gold text-black shadow-lg flex items-center justify-center gap-1 transition-all'
        : 'tap-btn p-2 rounded-2xl text-[10px] sm:text-xs font-royal font-bold uppercase bg-bank-surface text-emerald-300 border border-bank-border hover:bg-bank-card flex items-center justify-center gap-1 transition-all';
    }
  });
  if (tabKey === 'users') renderAdminUsersCompactCards();
  if (tabKey === 'economy') { populateAdminShopPriceEditor(); renderTreasuryCardDesigns(); renderAdminLoansList(); }
  if (tabKey === 'business') { renderAdminBusinessConfigInputs(); renderAdminTopMagnates(); }
  if (tabKey === 'casino') { populateAdminCasinoForm(); renderAdminSecurityLogs(); renderAdminTransactionsTable(); renderAdminAllMailsView(); }
}

// Остальные функции Торга, Биржи, Почты, Настроек, QR и Админки
export function selectMarketAsset(assetId) {
  if (!appData.marketAssets[assetId]) return;
  state.selectedMarketAssetId = assetId;
  renderMarketView();
}

export function setMaxBuyQty() {
  if (!state.currentUser) return;
  const u = findUser(state.currentUser);
  const sel = appData.marketAssets[state.selectedMarketAssetId];
  if (!u || !sel || sel.price <= 0) return;
  const curOwned = Number(u.portfolio?.[sel.id] || 0);
  const roomLeft = Math.max(0, MAX_HOLDINGS_PER_ASSET - curOwned);
  const canAfford = Math.floor((u.balance || 0) / sel.price);
  const maxBuy = Math.max(1, Math.min(MAX_TRADE_QTY, roomLeft > 0 ? Math.min(roomLeft, canAfford) : MAX_TRADE_QTY));
  document.getElementById('tradeAssetQty').value = maxBuy;
  updateTradeTotalCost();
}

export async function executeAssetTrade(mode, btnEl = null) {
  return withOperationLock(`asset_trade_${mode}_${state.selectedMarketAssetId}`, btnEl, async () => {
    if (!state.currentUser) return showToast('Войдите в счёт для торговли на Бирже!', 'error');
    const u = findUser(state.currentUser);
    const asset = appData.marketAssets[state.selectedMarketAssetId];
    if (!u || !asset || u.isBlocked) return showToast('Ваш счёт заблокирован!', 'error');

    const qty = parseInt(document.getElementById('tradeAssetQty').value, 10);
    if (!validPositiveAmount(qty, MAX_TRADE_QTY)) {
      return showToast(`За одну сделку можно купить или продать от 1 до ${MAX_TRADE_QTY} бумаг!`, 'error');
    }

    const uKey = normalizeLogin(u.username);
    const now = getServerTime();
    const meta = (u.portfolioMeta && u.portfolioMeta[asset.id]) || {};

    if (meta.lastTradeMs && (now - Number(meta.lastTradeMs)) < TRADE_COOLDOWN_MS) {
      const waitSec = Math.ceil((TRADE_COOLDOWN_MS - (now - Number(meta.lastTradeMs))) / 1000);
      return showToast(`Защита Биржи от спекуляций: подождите ${waitSec} сек. перед следующей сделкой по ${asset.id}!`, 'info');
    }

    const minMean = Math.max(5, Number(asset.minMeanPrice || DEFAULT_MARKET_ASSETS[asset.id]?.minMeanPrice || 100));
    const maxAllowedMean = Math.round(minMean * 2.5);
    const minAllowedPrice = Math.max(5, Math.round(minMean * 0.75));
    const maxAllowedPrice = Math.round(minMean * 3.0);
    const curMean = Math.min(maxAllowedMean, Math.max(minMean, Number(asset.meanPrice || minMean)));
    const curPrice = Math.min(maxAllowedPrice, Math.max(minAllowedPrice, Number(asset.price || curMean)));
    const opId = newOperationId('MKT');

    if (mode === 'buy') {
      const totalCost = Math.round(qty * curPrice);
      let failReason = '';

      const userTx = await runTransaction(db.ref(`bankData/users/${uKey}`), (userSnap) => {
        if (!userSnap) return userSnap;
        const bal = Math.round(Number(userSnap.balance || 0));
        const curOwned = Math.max(0, Number(userSnap.portfolio?.[asset.id] || 0));
        if (curOwned + qty > MAX_HOLDINGS_PER_ASSET) {
          failReason = `Лимит портфеля: максимум ${MAX_HOLDINGS_PER_ASSET} акций ${asset.id} в одни руки!`;
          return;
        }
        if (bal < totalCost) {
          failReason = `Недостаточно Байти! Требуется ${formatBaity(totalCost)}.`;
          return;
        }
        const prevAvg = Number(userSnap.portfolioMeta?.[asset.id]?.avgBuyPrice || curPrice);
        const newAvgBuyPrice = Math.round(((curOwned * prevAvg) + (qty * curPrice)) / (curOwned + qty));

        userSnap.balance = bal - totalCost;
        if (!userSnap.portfolio) userSnap.portfolio = {};
        userSnap.portfolio[asset.id] = curOwned + qty;
        if (!userSnap.portfolioMeta) userSnap.portfolioMeta = {};
        userSnap.portfolioMeta[asset.id] = { avgBuyPrice: newAvgBuyPrice, lastTradeMs: now };

        if (!userSnap.stats) userSnap.stats = {};
        if (!userSnap.stats.expense) userSnap.stats.expense = {};
        userSnap.stats.expense.stocksInvest = Math.round(Number(userSnap.stats.expense.stocksInvest || 0)) + totalCost;
        return userSnap;
      });

      if (!userTx.committed) return showToast(failReason || 'Сделка покупки отклонена.', 'error');

      await runTransaction(db.ref(`bankData/marketAssets/${asset.id}`), (aSnap) => {
        const cur = aSnap || asset;
        const cShares = Math.max(0, Number(cur.totalSharesBought || 0)) + qty;
        const cMean = Math.min(maxAllowedMean, Math.max(minMean, Math.round(Number(cur.meanPrice || minMean) + minMean * 0.0005 * qty)));
        const cPrice = Math.min(maxAllowedPrice, Math.max(minAllowedPrice, Math.round(cMean * (1 + Math.min(0.03, qty * 0.00015)))));
        const cHist = [...(cur.history || []).slice(-(MAX_CHART_POINTS - 1)), cPrice];
        return { ...cur, minMeanPrice: minMean, totalSharesBought: cShares, meanPrice: cMean, prevPrice: curPrice, price: cPrice, history: cHist };
      });

      await db.ref(`bankData/transactions/${opId}`).set({
        id: opId, from: u.username, to: `БИРЖА МИРОБАЙТ (${asset.id})`, amount: totalCost,
        comment: `Покупка ${qty} шт. «${asset.name}» по ${curPrice} ฿`, timestamp: new Date(now).toLocaleString('ru-RU'), timestampMs: serverTimestamp()
      });
      showToast(`Куплено ${qty} шт. ${asset.id}!`, 'success');
    } else {
      const nextMean = Math.min(maxAllowedMean, Math.max(minMean, Math.round(curMean - minMean * 0.0006 * qty)));
      const droppedPrice = Math.min(maxAllowedPrice, Math.max(minAllowedPrice, Math.round(nextMean * (1 - Math.min(0.035, qty * 0.0002)))));
      const userAvgBuy = Math.max(minAllowedPrice, Number(meta.avgBuyPrice || minMean));
      const effectiveUnitSellPrice = Math.min(droppedPrice, Math.round(userAvgBuy * 1.35), maxAllowedPrice);
      const grossPayout = Math.round(qty * effectiveUnitSellPrice);
      const taxAmt = Math.max(1, Math.round(grossPayout * ASSET_SELL_TAX_RATE));
      const netPayout = Math.max(1, grossPayout - taxAmt);

      let failReason = '';
      const userTx = await runTransaction(db.ref(`bankData/users/${uKey}`), (userSnap) => {
        if (!userSnap) return userSnap;
        const curOwned = Math.max(0, Number(userSnap.portfolio?.[asset.id] || 0));
        if (curOwned < qty) {
          failReason = `У вас только ${curOwned} шт. актива ${asset.id}!`;
          return;
        }
        userSnap.portfolio[asset.id] = curOwned - qty;
        if (!userSnap.portfolioMeta) userSnap.portfolioMeta = {};
        if (!userSnap.portfolioMeta[asset.id]) userSnap.portfolioMeta[asset.id] = {};
        userSnap.portfolioMeta[asset.id].lastTradeMs = now;
        userSnap.balance = Math.round(Number(userSnap.balance || 0)) + netPayout;

        if (!userSnap.stats) userSnap.stats = {};
        if (!userSnap.stats.income) userSnap.stats.income = {};
        userSnap.stats.income.stocks = Math.round(Number(userSnap.stats.income.stocks || 0)) + netPayout;
        return userSnap;
      });

      if (!userTx.committed) return showToast(failReason || 'Сделка продажи отклонена.', 'error');
      await addTreasuryTaxOrProfit(taxAmt);

      await runTransaction(db.ref(`bankData/marketAssets/${asset.id}`), (aSnap) => {
        const cur = aSnap || asset;
        const cShares = Math.max(0, Number(cur.totalSharesBought || 0) - qty);
        const cHist = [...(cur.history || []).slice(-(MAX_CHART_POINTS - 1)), droppedPrice];
        return { ...cur, minMeanPrice: minMean, totalSharesBought: cShares, meanPrice: nextMean, prevPrice: curPrice, price: droppedPrice, history: cHist };
      });

      await db.ref(`bankData/transactions/${opId}`).set({
        id: opId, from: `БИРЖА МИРОБАЙТ (${asset.id})`, to: u.username, amount: netPayout,
        comment: `Продажа ${qty} шт. «${asset.name}» (Налог Казны 10% = ${taxAmt} ฿)`, timestamp: new Date(now).toLocaleString('ru-RU'), timestampMs: serverTimestamp()
      });
      showToast(`Продано ${qty} шт. ${asset.id}! Чистая выплата: +${formatBaity(netPayout)}.`, 'success');
    }
  });
}

export function triggerMarketTick(isManual = false) {
  if (state.isDemoMode || !state.currentUser) return;
  if (!isManual && Math.random() < 0.45) return;
  const updates = {};
  const isStorm = appData.settings?.activeEvent?.active && appData.settings?.activeEvent?.type === 'financial_storm';
  Object.values(appData.marketAssets).forEach(a => {
    const minMean = Math.max(5, Number(a.minMeanPrice || DEFAULT_MARKET_ASSETS[a.id]?.minMeanPrice || 100));
    const maxMean = Math.round(minMean * 2.5);
    const mean = Math.min(maxMean, Math.max(minMean, Number(a.meanPrice || minMean)));
    const dailyPct = (Number(a.dailyPct || 5) / 100) * (isStorm ? 1.6 : 1);
    const pull = ((mean - a.price) / Math.max(1, mean)) * 0.4;
    const step = (Math.random() * 2 - 1) * (dailyPct * 0.55);
    const rawNext = Math.round(a.price * (1 + pull + step));
    const minAllowed = Math.max(5, Math.round(minMean * 0.75));
    const maxAllowed = Math.round(minMean * 3.0);
    const nextPrice = Math.min(maxAllowed, Math.max(minAllowed, rawNext));

    updates[`bankData/marketAssets/${a.id}/meanPrice`] = mean;
    updates[`bankData/marketAssets/${a.id}/prevPrice`] = a.price;
    updates[`bankData/marketAssets/${a.id}/price`] = nextPrice;
    updates[`bankData/marketAssets/${a.id}/history`] = [...(a.history || []).slice(-(MAX_CHART_POINTS - 1)), nextPrice];
  });
  db.ref().update(updates).then(() => { if (isManual) showToast('Котировки Биржи синхронизированы!', 'info'); });
}

export function openAssetPhotoInspectorModal(itemId, category) {
  const u = state.currentUser ? findUser(state.currentUser) : null;
  let item = null;
  let catBadge = 'ПАЛАТА РОСКОШИ И АКТИВОВ';

  if (category === 'art') {
    item = LUXURY_ART_CATALOG.find(x => x.id === itemId);
    catBadge = '🎨 ИМПЕРАТОРСКИЙ ЭРМИТАЖ И ФИЛАТЕЛИЯ';
  } else if (category === 'garage') {
    item = LUXURY_GARAGE_CATALOG.find(x => x.id === itemId);
    catBadge = '🏎️ ИМПЕРАТОРСКИЙ ГАРАЖ (ИЗНОС И ТО)';
  } else if (category === 'realestate') {
    item = REAL_ESTATE_CATALOG.find(x => x.id === itemId);
    catBadge = '🏙️ ДОХОДНАЯ НЕДВИЖИМОСТЬ (5%/ЧАС)';
  } else if (category === 'cosmos') {
    item = COSMIC_EMPIRE_CATALOG.find(x => x.id === itemId);
    catBadge = '🌌 КОСМИЧЕСКАЯ ЛОКАЦИЯ И БАЗЫ (1–5 УР.)';
  }

  const invMatch = (u && Array.isArray(u.inventory)) ? u.inventory.find(x => x && (x.id === itemId || x.instanceId === itemId)) : null;
  if (!item && invMatch) {
    item = { id: invMatch.id, title: invMatch.title, subtitle: invMatch.desc || '', price: invMatch.price || 0, image: invMatch.artwork };
  }
  if (!item) return;

  const unitPrice = getDynamicShopPrice(item.id, item.price, category);
  let ownedCount = 0;
  if (category === 'realestate') {
    ownedCount = Number(u?.realEstate?.[item.id]?.count || 0);
  } else {
    ownedCount = countUserOwnedAssetById(u, item.id);
  }

  const carCond = (category === 'garage' && invMatch) ? getCarCurrentCondition(invMatch, Date.now()) : 100;
  const effectiveVal = category === 'garage' ? Math.round(unitPrice * (carCond / 100)) : unitPrice;

  document.getElementById('assetInspectorCategoryBadge').innerText = catBadge;
  document.getElementById('assetInspectorTitle').innerText = item.title;
  document.getElementById('assetInspectorSubtitle').innerText = (item.author ? `${item.author} • ` : (item.subtitle ? `${item.subtitle} • ` : '')) + (item.info || '') + (category === 'garage' && ownedCount > 0 ? ` • Текущее состояние: ${carCond}%` : '');
  document.getElementById('assetInspectorImage').src = item.image || generateRoyalArtSvgDataUrl('crown', item.title);
  document.getElementById('assetInspectorOwnedBadge').innerText = `В собственности: ${ownedCount} шт.${category === 'garage' && ownedCount > 0 ? ` (Сост: ${carCond}%)` : ''}`;
  document.getElementById('assetInspectorUnitPrice').innerText = formatBaity(unitPrice);
  document.getElementById('assetInspectorCountText').innerText = `${ownedCount} шт.`;
  document.getElementById('assetInspectorTotalValuation').innerText = formatBaity(effectiveVal * ownedCount);

  const srvBtn = document.getElementById('assetInspectorServiceBtn');
  if (srvBtn) {
    if (category === 'garage' && invMatch && carCond < 100) {
      const srvCost = getCarServiceCost(invMatch, appData.settings, Date.now());
      srvBtn.classList.remove('hidden');
      srvBtn.innerHTML = `🔧 Провести ТО до 100% (${formatBaity(srvCost)})`;
      srvBtn.onclick = () => {
        closeAssetPhotoInspectorModal();
        serviceSingleCar(invMatch.instanceId || invMatch.id, srvBtn);
      };
    } else {
      srvBtn.classList.add('hidden');
    }
  }

  const sellBtn = document.getElementById('assetInspectorSellBtn');
  if (sellBtn) {
    if (ownedCount > 0) {
      const netRefund = Math.max(1, Math.round(effectiveVal * (1 - LUXURY_RESALE_TAX_RATE)));
      sellBtn.classList.remove('hidden');
      sellBtn.innerHTML = `💰 Продать 1 шт. (+${formatBaity(netRefund)} | -25% налог)`;
      sellBtn.onclick = () => {
        closeAssetPhotoInspectorModal();
        sellLuxuryOrVaultAsset(category, item.id, sellBtn);
      };
    } else {
      sellBtn.classList.add('hidden');
    }
  }

  const buyBtn = document.getElementById('assetInspectorBuyMoreBtn');
  if (buyBtn) {
    if (category === 'realestate') {
      buyBtn.classList.remove('hidden');
      buyBtn.innerHTML = `<i class="fa-solid fa-cart-plus mr-1"></i> Докупить (+1 за ${formatBaity(unitPrice)})`;
      buyBtn.onclick = () => {
        closeAssetPhotoInspectorModal();
        buyRealEstateObject(item.id, buyBtn);
      };
    } else if (['art', 'garage', 'cosmos'].includes(category)) {
      buyBtn.classList.remove('hidden');
      buyBtn.innerHTML = `<i class="fa-solid fa-cart-plus mr-1"></i> Докупить (+1 за ${formatBaity(unitPrice)})`;
      buyBtn.onclick = () => {
        closeAssetPhotoInspectorModal();
        buyLuxuryCatalogAsset(item.id, category, buyBtn);
      };
    } else {
      buyBtn.classList.add('hidden');
    }
  }

  const modal = document.getElementById('assetPhotoInspectorModal');
  modal.classList.remove('hidden'); modal.classList.add('flex');
}

export function closeAssetPhotoInspectorModal() {
  const modal = document.getElementById('assetPhotoInspectorModal');
  modal.classList.add('hidden'); modal.classList.remove('flex');
}

export async function sellLuxuryOrVaultAsset(category, itemId, btnEl = null) {
  return withOperationLock(`sell_asset_${category}_${itemId}`, btnEl, async () => {
    if (!state.currentUser) return showToast('Войдите в счёт!', 'error');
    const u = findUser(state.currentUser);
    if (!u || u.isBlocked) return;
    const uKey = normalizeLogin(u.username), now = getServerTime();

    if (category === 'realestate') {
      const reCfg = REAL_ESTATE_CATALOG.find(x => x.id === itemId);
      const curData = u.realEstate?.[itemId];
      const curCount = Number(curData?.count || 0);
      if (!reCfg || curCount <= 0) return showToast('У вас нет этого объекта недвижимости!', 'error');

      const unitPrice = getDynamicShopPrice(reCfg.id, reCfg.price, 'realestate');
      const taxAmt = Math.max(1, Math.round(unitPrice * LUXURY_RESALE_TAX_RATE));
      const netRefund = Math.max(1, unitPrice - taxAmt);

      const ok = await askRoyalConfirm({
        title: 'Продажа объекта недвижимости',
        message: `Продать 1 ед. «${reCfg.title}» государству?\n• Оценка: ${formatBaity(unitPrice)}\n• Налог в Казну (25%): -${formatBaity(taxAmt)}\n• Чистыми к выплате (75%): +${formatBaity(netRefund)}`,
        okText: `Продать за +${formatBaity(netRefund)}`
      });
      if (!ok) return;

      const reCalc = calculateUserRealEstateRent(u, appData.settings, now, false);
      const pendingRent = Math.floor(reCalc.perItem[itemId]?.earned || 0);

      const opId = newOperationId('RESELL');
      if (curCount - 1 <= 0) {
        await db.ref(`bankData/users/${uKey}/realEstate/${itemId}`).remove();
      } else {
        await db.ref(`bankData/users/${uKey}/realEstate/${itemId}`).update({ count: curCount - 1, lastCollected: now });
      }

      await atomicBalanceChange(u.username, netRefund + pendingRent, { operationId: opId });
      await addTreasuryTaxOrProfit(taxAmt);
      await db.ref(`bankData/transactions/${opId}`).set({
        id: opId, from: 'ПАЛАТА НЕДВИЖИМОСТИ (ВЫКУП 75%)', to: u.username, amount: netRefund + pendingRent,
        comment: `Продажа 1 ед. «${reCfg.title}» (Налог Казны 25% = ${taxAmt} ฿)`,
        timestamp: new Date(now).toLocaleString('ru-RU'), timestampMs: serverTimestamp()
      });

      showToast(`🏢 Продан 1 объект «${reCfg.title}»! Выплачено +${formatBaity(netRefund + pendingRent)}.`, 'success');
      renderMarketView();
      return;
    }

    const inv = Array.isArray(u.inventory) ? [...u.inventory] : [];
    const matchIndex = inv.findIndex(x => x && (x.id === itemId || x.instanceId === itemId || x.title === itemId));
    if (matchIndex === -1) return showToast('Этот предмет не найден в вашей Сокровищнице!', 'error');

    const targetItem = inv[matchIndex];
    let catCatalog = null;
    if (category === 'art') catCatalog = LUXURY_ART_CATALOG.find(x => x.id === targetItem.id);
    else if (category === 'garage') catCatalog = LUXURY_GARAGE_CATALOG.find(x => x.id === targetItem.id);
    else if (category === 'cosmos') catCatalog = COSMIC_EMPIRE_CATALOG.find(x => x.id === targetItem.id);

    const rawPrice = catCatalog ? getDynamicShopPrice(catCatalog.id, catCatalog.price, category) : Math.max(10, Number(targetItem.price || 100));
    const carCond = (category === 'garage' || targetItem.category === 'garage') ? getCarCurrentCondition(targetItem, Date.now()) : 100;
    const basePrice = Math.max(10, Math.round(rawPrice * (carCond / 100)));
    const taxAmt = Math.max(1, Math.round(basePrice * LUXURY_RESALE_TAX_RATE));
    const netRefund = Math.max(1, basePrice - taxAmt);

    const ok = await askRoyalConfirm({
      title: 'Продажа имущества в Казну',
      message: `Продать 1 шт. «${targetItem.title}»${carCond < 100 ? ` (Состояние авто: ${carCond}%)` : ''}?\n• Оценка с учётом состояния: ${formatBaity(basePrice)}\n• Пошлина в Казну (25%): -${formatBaity(taxAmt)}\n• Чистая выплата на ваш счёт (75%): +${formatBaity(netRefund)}`,
      okText: `Продать за +${formatBaity(netRefund)}`
    });
    if (!ok) return;

    let cosmicBonusRent = 0;
    if (category === 'cosmos' || targetItem.category === 'cosmos') {
      const cosCalc = calculateUserCosmicRent(u, appData.settings, now);
      cosmicBonusRent = Math.floor(cosCalc.perItem[targetItem.id]?.earned || 0);
      await db.ref(`bankData/users/${uKey}/cosmicBases/${targetItem.id}/lastCollected`).set(now);
    }

    inv.splice(matchIndex, 1);
    const opId = newOperationId('LUXSELL');
    await db.ref(`bankData/users/${uKey}/inventory`).set(cleanFirebaseObject(inv));
    await atomicBalanceChange(u.username, netRefund + cosmicBonusRent, { operationId: opId });
    await addTreasuryTaxOrProfit(taxAmt);

    await db.ref(`bankData/transactions/${opId}`).set({
      id: opId, from: 'КАЗНАЧЕЙСКИЙ ВЫКУП (75%)', to: u.username, amount: netRefund + cosmicBonusRent,
      comment: `Продажа «${targetItem.title}» (Налог 25% в Казну = ${taxAmt} ฿)`,
      timestamp: new Date(now).toLocaleString('ru-RU'), timestampMs: serverTimestamp()
    });

    showToast(`💰 Продано «${targetItem.title}»! Получено +${formatBaity(netRefund + cosmicBonusRent)}.`, 'success');
    renderMarketView();
  });
}

export async function buyRealEstateObject(reId, btnEl = null) {
  return withOperationLock(`buy_re_${reId}`, btnEl, async () => {
    if (!state.currentUser) return showToast('Войдите в счёт!', 'error');
    const u = findUser(state.currentUser);
    if (!u || u.isBlocked) return;
    const item = REAL_ESTATE_CATALOG.find(x => x.id === reId);
    if (!item) return;
    const price = getDynamicShopPrice(item.id, item.price, 'realestate');
    if ((u.balance || 0) < price) return showToast(`Требуется ${formatBaity(price)}.`, 'error');

    const uKey = normalizeLogin(u.username), now = getServerTime();
    const curData = u.realEstate?.[reId] || { count: 0, status: 'idle', prepEndsAt: 0, lastCollected: now };
    const curCount = Number(curData.count || 0);
    const reCalc = calculateUserRealEstateRent(u, appData.settings, now, false);
    const pendingThis = Math.floor(reCalc.perItem[reId]?.earned || 0);

    const opId = newOperationId('REBUY');
    if (!await atomicBalanceChange(u.username, -price, { requireFunds: true, operationId: opId })) return;
    await addTreasuryTaxOrProfit(price);
    if (pendingThis >= 1) {
      await atomicBalanceChange(u.username, pendingThis);
      await recordPlayerFinancialStat(u.username, 'income', 'crafts', pendingThis);
    }

    await db.ref(`bankData/users/${uKey}/realEstate/${reId}`).set({
      count: curCount + 1, status: curData.status || 'idle', prepEndsAt: curData.prepEndsAt || 0, lastCollected: now
    });
    await db.ref(`bankData/transactions/${opId}`).set({
      id: opId, from: u.username, to: 'ПАЛАТА НЕДВИЖИМОСТИ (КАЗНА)', amount: price,
      comment: `Покупка недвижимости: «${item.title}» (${curCount + 1} шт.)`, timestamp: new Date(now).toLocaleString('ru-RU'), timestampMs: serverTimestamp()
    });
    showToast(`🏢 «${item.title}» приобретён (${curCount + 1} шт.)!`, 'success');
    renderRealEstateShop();
  });
}

export async function activateRealEstateRental(reId, btnEl = null) {
  return withOperationLock(`act_re_${reId}`, btnEl, async () => {
    if (!state.currentUser) return;
    const u = findUser(state.currentUser);
    const item = REAL_ESTATE_CATALOG.find(x => x.id === reId);
    if (!u || !item) return;
    const rData = u.realEstate?.[reId];
    if (!rData || Number(rData.count || 0) <= 0) return;

    const now = getServerTime(), prepEndsAt = now + (item.prepMinutes || 10) * 60 * 1000;
    await db.ref(`bankData/users/${normalizeLogin(u.username)}/realEstate/${reId}`).update({ status: 'active', prepEndsAt, lastCollected: prepEndsAt });
    showToast(`🔑 Подготовка «${item.title}» начата (${item.prepMinutes} мин)!`, 'success');
    renderRealEstateShop();
  });
}

export async function collectAllRealEstateRent(btnEl = null) {
  return withOperationLock('collect_re_rent', btnEl, async () => {
    if (!state.currentUser) return showToast('Войдите в счёт!', 'error');
    const u = findUser(state.currentUser);
    if (!u || u.isBlocked) return;
    const now = getServerTime();
    const taxDecl = calculateUserTaxDeclaration(u, appData.loans, appData.settings, now, state.isDemoMode);
    if (taxDecl.isIncomeFrozen) {
      return showToast('❄️ Рента заморожена из-за просрочки налоговой декларации (72ч)! Оплатите налог или выпишите расписку в разделе «Промыслы».', 'error');
    }
    const reCalc = calculateUserRealEstateRent(u, appData.settings, now, false);
    const totalFloor = Math.floor(reCalc.totalPending);
    if (totalFloor < 1) return showToast('На счетах аренды ещё не накопился 1 ฿!', 'info');

    const uKey = normalizeLogin(u.username), updates = {};
    Object.keys(u.realEstate || {}).forEach(reId => {
      if (u.realEstate[reId]?.status === 'active' && now >= Number(u.realEstate[reId]?.prepEndsAt || 0)) {
        updates[`bankData/users/${uKey}/realEstate/${reId}/lastCollected`] = now;
      }
    });

    const opId = newOperationId('RENT');
    await db.ref().update(updates);
    await atomicBalanceChange(u.username, totalFloor, { operationId: opId });
    await recordPlayerFinancialStat(u.username, 'income', 'crafts', totalFloor);
    await db.ref(`bankData/transactions/${opId}`).set({
      id: opId, from: 'АРЕНДА НЕДВИЖИМОСТИ (5%/Ч)', to: u.username, amount: totalFloor,
      comment: 'Сбор арендной платы недвижимости', timestamp: new Date(now).toLocaleString('ru-RU'), timestampMs: serverTimestamp()
    });
    showToast(`🏢 Арендная плата собрана: +${formatBaity(totalFloor)}!`, 'success');
    renderRealEstateShop();
  });
}

export async function collectAllCosmicRent(btnEl = null) {
  return withOperationLock('collect_cosmic_rent', btnEl, async () => {
    if (!state.currentUser) return showToast('Войдите в счёт!', 'error');
    const u = findUser(state.currentUser);
    if (!u || u.isBlocked) return;

    const now = getServerTime();
    const cosCalc = calculateUserCosmicRent(u, appData.settings, now);
    const totalFloor = Math.floor(cosCalc.totalPending);
    if (totalFloor < 1) return showToast('На складах космических баз ещё не накопился минимум 1 ฿! Постройте и прокачайте базы внутри локаций.', 'info');

    const uKey = normalizeLogin(u.username), updates = {};
    COSMIC_EMPIRE_CATALOG.forEach(cfg => {
      if (countUserOwnedAssetById(u, cfg.id) > 0) {
        updates[`bankData/users/${uKey}/cosmicBases/${cfg.id}/lastCollected`] = now;
        updates[`bankData/users/${uKey}/cosmicRentLastCollected/${cfg.id}`] = now;
      }
    });

    const opId = newOperationId('COSRENT');
    await db.ref().update(updates);
    await atomicBalanceChange(u.username, totalFloor, { operationId: opId });
    await recordPlayerFinancialStat(u.username, 'income', 'crafts', totalFloor);
    await db.ref(`bankData/transactions/${opId}`).set({
      id: opId, from: 'ИНФРАСТРУКТУРНЫЕ БАЗЫ КОСМОСА', to: u.username, amount: totalFloor,
      comment: 'Сбор выработки космических баз (0% налогов)', timestamp: new Date(now).toLocaleString('ru-RU'), timestampMs: serverTimestamp()
    });

    showToast(`🪐 Выработка Космо-Баз собрана: +${formatBaity(totalFloor)}!`, 'success');
    renderCosmicEmpireShop();
  });
}

export async function buyLuxuryCatalogAsset(itemId, category, btnEl = null) {
  return withOperationLock(`buy_luxury_${itemId}`, btnEl, async () => {
    if (!state.currentUser) return showToast('Войдите в счёт!', 'error');
    const u = findUser(state.currentUser);
    if (!u || u.isBlocked) return;

    let catalog = LUXURY_ART_CATALOG, treasuryName = 'ИМПЕРАТОРСКИЙ ЭРМИТАЖ';
    if (category === 'garage') { catalog = LUXURY_GARAGE_CATALOG; treasuryName = 'АВТОСАЛОН МИРОБАЙТ'; }
    else if (category === 'cosmos') { catalog = COSMIC_EMPIRE_CATALOG; treasuryName = 'КОСМИЧЕСКАЯ ПАЛАТА ИМПЕРИИ'; }

    const item = catalog.find(x => x.id === itemId);
    if (!item) return;
    const curInv = Array.isArray(u.inventory) ? [...u.inventory] : [];
    const ownedCount = countUserOwnedAssetById(u, item.id);
    const price = getDynamicShopPrice(item.id, item.price, category);

    if ((u.balance || 0) < price) return showToast(`Требуется ${formatBaity(price)}.`, 'error');

    let bonusCosRent = 0;
    const uKey = normalizeLogin(u.username), now = getServerTime();
    if (category === 'cosmos') {
      const cosCalc = calculateUserCosmicRent(u, appData.settings, now);
      bonusCosRent = Math.floor(cosCalc.perItem[item.id]?.earned || 0);
      if (!u.cosmicBases?.[item.id]) {
        await db.ref(`bankData/users/${uKey}/cosmicBases/${item.id}`).set({ mining: 0, research: 0, power: 0, lastCollected: now });
      } else {
        await db.ref(`bankData/users/${uKey}/cosmicBases/${item.id}/lastCollected`).set(now);
      }
    }

    const opId = newOperationId('LUX');
    if (!await atomicBalanceChange(u.username, -price, { requireFunds: true, operationId: opId })) return;
    await addTreasuryTaxOrProfit(price);
    if (bonusCosRent >= 1) {
      await atomicBalanceChange(u.username, bonusCosRent);
      await recordPlayerFinancialStat(u.username, 'income', 'crafts', bonusCosRent);
    }

    const newInvItem = {
      id: item.id,
      instanceId: newOperationId('INST'),
      category,
      title: item.title,
      desc: item.author ? `${item.author} • ${item.info}` : `${item.subtitle} • ${item.info}`,
      artwork: item.image,
      boughtFrom: treasuryName,
      price,
      prestige: item.prestige || 100,
      boughtAt: new Date(now).toLocaleDateString('ru-RU')
    };

    if (category === 'garage') {
      newInvItem.condition = 100;
      newInvItem.lastServicedMs = Date.now();
    }

    curInv.unshift(newInvItem);
    const nextPrestige = Number(u.prestigeScore || 0) + Number(item.prestige || 100);
    await db.ref(`bankData/users/${uKey}`).update({ inventory: cleanFirebaseObject(curInv), prestigeScore: nextPrestige });

    await db.ref(`bankData/transactions/${opId}`).set({
      id: opId, from: u.username, to: `${treasuryName} (КАЗНА)`, amount: price,
      comment: `Покупка: «${item.title}» (${ownedCount + 1} шт.)`, timestamp: new Date(now).toLocaleString('ru-RU'), timestampMs: serverTimestamp()
    });
    showToast(`🎉 «${item.title}» приобретён (в наличии: ${ownedCount + 1} шт.)!`, 'success');
    renderMarketView();
  });
}

export async function buyPrivilegeFrame(frameId, btnEl = null) {
  return withOperationLock(`buy_frame_${frameId}`, btnEl, async () => {
    if (!state.currentUser) return;
    const frame = PRIVILEGE_FRAMES_CATALOG.find(f => f.id === frameId);
    const u = findUser(state.currentUser);
    if (!frame || !u) return;
    const price = getDynamicShopPrice(frame.id, frame.price);
    if ((u.balance || 0) < price) return showToast(`Требуется ${formatBaity(price)}.`, 'error');
    const opId = newOperationId('FRAME');
    if (!await atomicBalanceChange(u.username, -price, { requireFunds: true, operationId: opId })) return;
    await addTreasuryTaxOrProfit(price);
    const uKey = normalizeLogin(u.username);
    const owned = Array.isArray(u.ownedFrames) ? [...u.ownedFrames] : [];
    if (!owned.includes(frame.id)) owned.push(frame.id);
    await db.ref(`bankData/users/${uKey}/ownedFrames`).set(owned);
    await db.ref(`bankData/users/${uKey}/avatarFrame`).set(frame.id);
    showToast(`VIP-рамка «${frame.name}» надета!`, 'success');
  });
}

export function equipAvatarFrame(frameId) {
  if (guardDemoReadOnly() || !state.currentUser) return;
  db.ref(`bankData/users/${normalizeLogin(state.currentUser)}/avatarFrame`).set(frameId === 'default' ? null : frameId).then(() => {
    showToast(frameId === 'default' ? 'Стандартная рамка возвращена.' : 'VIP-обводка применена!', 'info');
  });
}

export async function buyPrivilegeTitle(titleId, btnEl = null) {
  return withOperationLock(`buy_title_${titleId}`, btnEl, async () => {
    if (!state.currentUser) return;
    const item = PRIVILEGE_TITLES_CATALOG.find(t => t.id === titleId);
    const u = findUser(state.currentUser);
    if (!item || !u) return;
    const price = getDynamicShopPrice(item.id, item.price);
    if ((u.balance || 0) < price) return showToast(`Требуется ${formatBaity(price)}.`, 'error');
    const opId = newOperationId('TITLE');
    if (!await atomicBalanceChange(u.username, -price, { requireFunds: true, operationId: opId })) return;
    await addTreasuryTaxOrProfit(price);
    const uKey = normalizeLogin(u.username);
    const owned = Array.isArray(u.ownedTitles) ? [...u.ownedTitles] : [];
    if (!owned.includes(item.id)) owned.push(item.id);
    await db.ref(`bankData/users/${uKey}/ownedTitles`).set(owned);
    await db.ref(`bankData/users/${uKey}/customStatus`).set(item.title);
    showToast(`Титул «${item.title}» установлен!`, 'success');
  });
}

export function equipPrivilegeTitle(titleId) {
  if (guardDemoReadOnly() || !state.currentUser) return;
  const item = PRIVILEGE_TITLES_CATALOG.find(t => t.id === titleId);
  if (item) db.ref(`bankData/users/${normalizeLogin(state.currentUser)}/customStatus`).set(item.title).then(() => showToast(`Титул «${item.title}» установлен!`, 'success'));
}

export async function buyPrivilegeCardDesign(cardId, price, themeKey, name, btnEl = null) {
  return withOperationLock(`buy_card_${cardId}`, btnEl, async () => {
    if (!state.currentUser) return;
    const u = findUser(state.currentUser);
    const actualPrice = getDynamicShopPrice(cardId, price);
    if (!u || (u.balance || 0) < actualPrice) return showToast('Недостаточно Байти!', 'error');
    const opId = newOperationId('CARD');
    if (!await atomicBalanceChange(u.username, -actualPrice, { requireFunds: true, operationId: opId })) return;
    await addTreasuryTaxOrProfit(actualPrice);
    const uKey = normalizeLogin(u.username);
    const owned = Array.isArray(u.ownedCards) ? [...u.ownedCards] : ['emerald'];
    if (!owned.includes(cardId)) owned.push(cardId);
    const customObj = appData.cardDesigns && appData.cardDesigns[cardId];
    await db.ref(`bankData/users/${uKey}/ownedCards`).set(owned);
    await db.ref(`bankData/users/${uKey}/cardTheme`).set(themeKey);
    await db.ref(`bankData/users/${uKey}/cardBgImage`).set(customObj?.bgImage || null);
    showToast(`Дизайн «${name}» применён!`, 'success');
  });
}

export function handleCreateMarketListing(e) {
  e.preventDefault();
  const submitBtn = document.getElementById('marketCreateLotSubmitBtn');
  return withOperationLock('create_market_lot', submitBtn, async () => {
    if (!state.currentUser) return;
    const u = findUser(state.currentUser);
    if (!u || u.isBlocked) return;
    const title = document.getElementById('marketItemTitle').value.trim();
    const desc = document.getElementById('marketItemDesc').value.trim();
    const price = parseInt(document.getElementById('marketItemPrice').value, 10);
    const preset = document.getElementById('marketItemArtPreset')?.value || 'crown';
    const fileInput = document.getElementById('marketItemImageFile');
    const file = fileInput?.files?.[0];
    if (!title || !desc || !validPositiveAmount(price, 100000000000)) return showToast('Проверьте поля лота!', 'error');

    const saveListing = async (artworkUrl) => {
      const itemId = newOperationId('LOT');
      await db.ref(`bankData/marketListings/${itemId}`).set({
        id: itemId, seller: u.username, title, desc, price, artwork: artworkUrl,
        createdAt: new Date(getServerTime()).toLocaleString('ru-RU'), timestampMs: serverTimestamp()
      });
      document.getElementById('marketItemTitle').value = '';
      document.getElementById('marketItemDesc').value = '';
      document.getElementById('marketItemPrice').value = '';
      if (fileInput) fileInput.value = '';
      showToast(`Товар «${title}» выставлен за ${formatBaity(price)}!`, 'success');
    };

    if (file) {
      const dataUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = function(evt) {
          const img = new Image();
          img.onload = function() {
            const canvas = document.getElementById('marketItemCanvas');
            let w = img.width, h = img.height;
            if (w > 420) { h = Math.round((h * 420) / w); w = 420; }
            canvas.width = w; canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL('image/jpeg', 0.8));
          };
          img.src = evt.target.result;
        };
        reader.readAsDataURL(file);
      });
      await saveListing(dataUrl);
    } else {
      await saveListing(generateRoyalArtSvgDataUrl(preset, title));
    }
  });
}

export async function buyMarketListingItem(lotId, btnEl = null) {
  return withOperationLock(`buy_lot_${lotId}`, btnEl, async () => {
    if (!state.currentUser) return showToast('Войдите в счёт!', 'error');
    const lot = appData.marketListings[lotId];
    if (!lot) return showToast('Лот уже куплен!', 'error');
    const buyer = findUser(state.currentUser), seller = findUser(lot.seller);
    if (!buyer || !seller || buyer.isBlocked) return;
    if (normalizeLogin(buyer.username) === normalizeLogin(seller.username)) return showToast('Это ваш собственный лот!', 'error');
    const price = Number(lot.price || 0);
    if ((buyer.balance || 0) < price) return showToast(`Нужно ${formatBaity(price)}.`, 'error');

    const ok = await askRoyalConfirm({ title: 'Покупка на Рынке', message: `Приобрести «${lot.title}» у @${seller.username} за ${formatBaity(price)}?`, okText: `Купить` });
    if (!ok) return;

    const opId = newOperationId('FAIR');
    if (!await atomicBalanceChange(buyer.username, -price, { requireFunds: true, operationId: opId })) return;
    await atomicBalanceChange(seller.username, price, { operationId: `${opId}_SELL` });
    await recordPlayerFinancialStat(buyer.username, 'expense', 'transfersOut', price);
    await recordPlayerFinancialStat(seller.username, 'income', 'transfersIn', price);
    await db.ref(`bankData/marketListings/${lotId}`).remove();

    const bKey = normalizeLogin(buyer.username);
    const curInv = Array.isArray(buyer.inventory) ? [...buyer.inventory] : [];
    curInv.unshift({ id: lot.id, instanceId: lot.id, category: 'bazaar', title: lot.title, desc: lot.desc, artwork: lot.artwork, boughtFrom: seller.username, price, boughtAt: new Date(getServerTime()).toLocaleDateString('ru-RU') });
    await db.ref(`bankData/users/${bKey}/inventory`).set(cleanFirebaseObject(curInv));
    showToast(`«${lot.title}» куплен в Сокровищницу!`, 'success');
  });
}

export function removeMarketListingItem(lotId) {
  if (guardDemoReadOnly()) return;
  const lot = appData.marketListings[lotId];
  if (!lot) return;
  const isMy = state.currentUser && normalizeLogin(lot.seller) === normalizeLogin(state.currentUser);
  if (!isMy && !isCurrentUserAdmin() && !isCurrentUserSuperAdmin()) return;
  db.ref(`bankData/marketListings/${lotId}`).remove().then(() => showToast('Лот снят с Рынка.', 'info'));
}

export function setVaultCategoryFilter(filterKey) {
  state.currentVaultFilter = filterKey || 'all';
  ['all', 'art', 'garage', 'realestate', 'cosmos', 'bazaar'].forEach(k => {
    const b = document.getElementById(`vaultTabBtn-${k}`);
    if (b) {
      b.className = k === state.currentVaultFilter
        ? 'px-2.5 py-1 rounded-xl bg-bank-gold text-black text-[10px] font-royal font-bold uppercase whitespace-nowrap shadow-md'
        : 'px-2.5 py-1 rounded-xl bg-bank-darkest border border-bank-border text-emerald-300 text-[10px] font-royal font-bold uppercase whitespace-nowrap hover:bg-bank-card';
    }
  });
  if (state.currentUser) {
    const u = findUser(state.currentUser);
    if (u) renderUserInventoryVault(u);
  }
}

export function switchPublicProfileTab(tabKey) {
  state.currentPubProfileTab = tabKey || 'business';
  ['business', 'realestate', 'cosmos', 'garage', 'art'].forEach(k => {
    const b = document.getElementById(`pubTabBtn-${k}`);
    if (b) {
      b.className = k === state.currentPubProfileTab
        ? 'px-2.5 py-1.5 rounded-xl bg-bank-gold text-black font-royal font-bold text-[10px] uppercase whitespace-nowrap shadow-md'
        : 'px-2.5 py-1.5 rounded-xl bg-bank-darkest border border-bank-border text-emerald-300 font-royal font-bold text-[10px] uppercase whitespace-nowrap hover:bg-bank-card';
    }
  });
  if (state.currentPubProfileUser) renderPublicProfileTabItems(state.currentPubProfileUser);
}

export function openPlayerPublicProfileModal(username) {
  const target = findUser(username);
  if (!target) return showToast('Профиль гражданина не найден!', 'error');
  state.currentPubProfileUser = target;

  const avatarBox = document.getElementById('pubProfAvatarBox');
  const cornerEmoji = document.getElementById('pubProfCornerEmoji');
  const frameClass = getAvatarFrameClass(target.avatarFrame);
  const emoji = getAvatarFrameCornerEmoji(target.avatarFrame);

  if (avatarBox) {
    avatarBox.className = `w-14 h-14 sm:w-20 sm:h-20 rounded-2xl ${frameClass} overflow-hidden bg-black flex items-center justify-center shadow-xl`;
    avatarBox.innerHTML = target.avatar
      ? `<img src="${target.avatar}" class="w-full h-full object-cover">`
      : `<i class="fa-solid fa-user-astronaut text-xl sm:text-2xl text-bank-gold"></i>`;
  }
  if (cornerEmoji) {
    if (emoji) { cornerEmoji.innerText = emoji; cornerEmoji.classList.remove('hidden'); }
    else cornerEmoji.classList.add('hidden');
  }

  const roleText = target.isOwner ? 'Владелец Банка' : (target.isSuperAdmin ? 'Главный Администратор' : (target.isAdmin ? 'Казначей' : 'Гражданин'));
  const regText = target.registeredAt || 'Основатель';
  const now = getServerTime();
  const netWorth = calculateUserPortfolioValue(target, appData.marketAssets, appData.settings);
  const calcBiz = calculateUserPendingBusinessRevenue(target, appData.loans, appData.settings, now, state.isDemoMode);
  const reCalc = calculateUserRealEstateRent(target, appData.settings, now, calcBiz.isFrozenByDebt);
  const cosCalc = calculateUserCosmicRent(target, appData.settings, now);

  document.getElementById('pubProfRoleBadge').innerText = roleText;
  document.getElementById('pubProfUsername').innerText = `@${target.username}`;
  document.getElementById('pubProfStatusText').innerHTML = `<i class="fa-solid fa-award"></i> <span>${escapeHtml(target.customStatus || 'Полноправный гражданин')}</span>`;
  document.getElementById('pubProfBalance').innerText = formatBaity(target.balance || 0);
  document.getElementById('pubProfRegDate').innerText = regText;
  document.getElementById('pubProfNetWorth').innerText = formatBaity(netWorth);

  const vCard = document.getElementById('pubProfVisualCard');
  if (vCard) {
    Object.values(CARD_THEMES).forEach(cls => cls.split(' ').forEach(c => vCard.classList.remove(c)));
    if (target.cardBgImage) {
      vCard.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.75)), url(${target.cardBgImage})`;
    } else {
      vCard.style.backgroundImage = '';
      const themeCls = CARD_THEMES[target.cardTheme || 'emerald'] || CARD_THEMES.emerald;
      themeCls.split(' ').forEach(c => vCard.classList.add(c));
    }
  }
  const cardHash = Math.abs(Array.from(target.username).reduce((acc, ch) => acc * 31 + ch.charCodeAt(0), 7)) % 9000 + 1000;
  document.getElementById('pubProfCardNumberText').innerText = `MB-${cardHash}-2026`;
  document.getElementById('pubProfCardBigBalance').innerText = formatBaity(target.balance || 0);
  document.getElementById('pubProfCardHolder').innerText = target.username.toUpperCase();
  document.getElementById('pubProfCardReg').innerText = regText;

  const countBadge = document.getElementById('pubProfAssetsCountBadge');
  if (countBadge) {
    const totalHourlyAll = calcBiz.totalHourly + reCalc.totalHourly + cosCalc.totalHourly;
    countBadge.innerText = `Доход и рента: +${formatBaity(totalHourlyAll)}/ч`;
  }

  switchPublicProfileTab('business');

  const sendMoneyBtn = document.getElementById('pubProfSendMoneyBtn');
  const sendMailBtn = document.getElementById('pubProfSendMailBtn');
  if (sendMoneyBtn) {
    sendMoneyBtn.onclick = () => {
      closePlayerPublicProfileModal();
      document.getElementById('transferTarget').value = target.username;
      navigateRoute('/'); navigateTab('dashboard');
    };
  }
  if (sendMailBtn) {
    sendMailBtn.onclick = () => {
      closePlayerPublicProfileModal();
      openTelegraphChatWithUser(target.username);
    };
  }

  const modal = document.getElementById('playerPublicProfileModal');
  modal.classList.remove('hidden'); modal.classList.add('flex');
}

export function closePlayerPublicProfileModal() {
  const modal = document.getElementById('playerPublicProfileModal');
  modal.classList.add('hidden'); modal.classList.remove('flex');
}

export function handlePublicProfileBackdropClick(e) {
  if (e.target && e.target.id === 'playerPublicProfileModal') closePlayerPublicProfileModal();
}

export async function executeEarnContract(type, reward, title, btnEl = null) {
  return withOperationLock(`earn_contract_${type}`, btnEl, async () => {
    if (!state.currentUser) return showToast('Войдите в счёт!', 'error');
    const now = getServerTime(), cooldownMs = 12000;
    if (now - state.lastEarnActionTime < cooldownMs) return showToast(`Подождите ${Math.ceil((cooldownMs - (now - state.lastEarnActionTime)) / 1000)} сек.!`, 'info');
    const u = findUser(state.currentUser);
    if (!u || u.isBlocked) return;
    state.lastEarnActionTime = now;
    const opId = newOperationId('WORK');
    if (!await atomicBalanceChange(u.username, reward, { operationId: opId })) return;
    await recordPlayerFinancialStat(u.username, 'income', 'crafts', reward);
    await db.ref(`bankData/transactions/${opId}`).set({
      id: opId, from: 'КАЗЁННЫЙ ПРОМЫСЕЛ (/earn)', to: u.username, amount: reward,
      comment: `Подряд: ${title}`, timestamp: new Date(now).toLocaleString('ru-RU'), timestampMs: serverTimestamp()
    });
    showToast(`Подряд «${title}» выполнен! +${reward} ฿`, 'success');
    renderEarnAndLoansView();
  });
}

// -------------------------------------------------------------------------
// 10. GEMINI AI, ТЕЛЕГРАФ, ПЕРЕВОДЫ, АВТОРИЗАЦИЯ И НАСТРОЙКИ
// -------------------------------------------------------------------------
export async function callRoyalGeminiAI(userPrompt, systemPrompt) {
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`;
  const payload = {
    contents: [{ parts: [{ text: userPrompt }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] }
  };
  const delays = [800, 1600];
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text && text.trim()) return text.trim();
      throw new Error('Empty Gemini response');
    } catch (err) {
      if (attempt === delays.length) return null;
      await new Promise(r => setTimeout(r, delays[attempt]));
    }
  }
  return null;
}

export function performLazyTelegraphCleanup() {
  if (state.isDemoMode || !appData.mailBox || typeof appData.mailBox !== 'object') return;
  const now = Date.now();
  const updates = {};
  let removedCount = 0;

  Object.entries(appData.mailBox).forEach(([key, msg]) => {
    if (!msg) return;
    const msgTime = Number(msg.timestampMs || msg.createdAtMs || 0);
    if (msgTime > 0 && (now - msgTime) > TELEGRAPH_TTL_MS) {
      updates[`bankData/mailBox/${key}`] = null;
      delete appData.mailBox[key];
      removedCount++;
    }
  });

  if (removedCount > 0) {
    db.ref().update(updates).catch(() => {});
  }
}

export async function applyOldRusNeuralTransform(style = 'boyar') {
  const textarea = document.getElementById('mailText');
  if (!textarea) return;
  const recipient = (document.getElementById('mailRecipient')?.value || 'Боярин').trim();
  const raw = textarea.value.trim();
  const aiResponse = await callRoyalGeminiAI(raw ? `Перепиши этот текст для получателя @${recipient}: "${raw}"` : `Сочини депешу для @${recipient}`, 'Ты — Нейро-Дьяк Банка Миробайт. Преобразуй текст в торжественный боярский старорусский слог длиной 150-250 символов.');
  textarea.value = aiResponse || transformToModernOldRussian(raw, recipient, style);
  calculateMailCost();
  showToast('Депеша украшена!', 'success');
}

export async function stylizeTransferCommentAI() {
  const inp = document.getElementById('transferComment');
  if (!inp) return;
  const raw = inp.value.trim();
  const aiRes = await callRoyalGeminiAI(raw ? `Укрась комментарий к переводу: "${raw}"` : 'Придумай короткий боярский комментарий к переводу Байти (฿)', 'Напиши одну короткую красивую фразу в боярском стиле (до 70 символов).');
  inp.value = aiRes ? aiRes.replace(/^["«]|["»]$/g, '').slice(0, 100) : (raw ? `📜 По грамоте: ${raw} (฿)` : 'Жалованье боярское за службу верную ฿');
  showToast('Комментарий украшен!', 'info');
}

export async function stylizeMarketItemDescAI() {
  const title = (document.getElementById('marketItemTitle')?.value || 'Диковинный товар').trim();
  const descInp = document.getElementById('marketItemDesc');
  if (!descInp) return;
  const cur = descInp.value.trim();
  const aiRes = await callRoyalGeminiAI(`Товар: "${title}". Описание: "${cur || 'редкий предмет'}".`, 'Напиши яркое купеческое описание товара на 1-2 предложения (до 140 символов).');
  descInp.value = aiRes ? aiRes.replace(/^["«]|["»]$/g, '').slice(0, 175) : `Эксклюзивная диковина «${title}» из лучших палат Миробайта!`;
  showToast('Описание составлено!', 'success');
}

export async function generateAiMarketForecast() {
  const sel = appData.marketAssets[state.selectedMarketAssetId] || Object.values(appData.marketAssets)[0];
  if (!sel) return;
  const oracleEl = document.getElementById('aiMarketOracleText');
  const badgeEl = document.getElementById('marketAiStatusBadge');
  if (badgeEl) badgeEl.innerText = '⏳ Gemini...';
  const summary = Object.values(appData.marketAssets).map(a => `${a.name} (${a.id}): курс ${a.price} ฿, норма ${a.meanPrice || a.price} ฿`).join('; ');
  const aiText = await callRoyalGeminiAI(`Проанализируй актив "${sel.name}" (${sel.id}, курс ${sel.price} ฿) на фоне рынка: ${summary}.`, 'Ты — Боярин-Аналитик Императорской Биржи Банка Миробайт. Дай краткий совет игроку (2 предложения).');
  if (oracleEl) {
    oracleEl.innerText = aiText
      ? `📜 Gemini «Боярин-Аналитик»: «${aiText.replace(/^["«]|["»]$/g, '')}»`
        : `📜 Боярин-Аналитик: «Актив ${sel.name} (${sel.id}) торгуется по ${sel.price} ฿ при норме ${sel.meanPrice || sel.price} ฿!»`;
  }
  if (badgeEl) badgeEl.innerText = '✨ Gemini AI';
  showToast('Прогноз Биржи обновлён!', 'success');
}

export function openAiAssistantModal() {
  const modal = document.getElementById('aiAssistantModal');
  modal.classList.remove('hidden'); modal.classList.add('flex');
  const box = document.getElementById('aiChatMessagesBox');
  if (box && box.children.length === 0) {
    appendAiChatMessage('ai', `Челом бью, гражданин ${state.currentUser ? '@' + state.currentUser : 'Миробайта'}! Я — **Премудрый Дьяк** на базе **Google Gemini**. Подскажу по деноминации **K₿ / M₿ / G₿ / T₿ / P₿**, **P2P-Суду и 24ч Аукциону**, **Космо-Базам (1–5 ур.)**, **ТО Гаража** и **Налоговой декларации (72ч + Расписка)**!`);
  }
}

export function closeAiAssistantModal() {
  const modal = document.getElementById('aiAssistantModal');
  modal.classList.add('hidden'); modal.classList.remove('flex');
}

export function appendAiChatMessage(role, text) {
  const box = document.getElementById('aiChatMessagesBox');
  if (!box) return;
  const div = document.createElement('div');
  if (role === 'user') {
    div.className = 'ml-auto max-w-[85%] p-2.5 rounded-2xl bg-emerald-800/80 text-white text-xs';
    div.innerText = text;
  } else {
    div.className = 'mr-auto max-w-[92%] p-3 rounded-2xl bg-bank-darkest border border-bank-gold/50 text-emerald-100 text-xs leading-relaxed shadow-md';
    div.innerHTML = `<div class="font-royal font-bold text-bank-gold text-[10px] uppercase mb-1"><i class="fa-solid fa-wand-magic-sparkles mr-1"></i> Нейро-Дьяк Gemini:</div><div>${escapeHtml(text).replace(/\*\*(.*?)\*\*/g, '<b class="text-bank-gold">$1</b>')}</div>`;
  }
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

export function askRoyalAiPreset(topic) {
  if (topic === 'guide') appendAiChatMessage('ai', 'В **BANK OF MIROBYTE** действует система кратных купюр (**1 K₿ = 1 000 ฿, 1 M₿ = 10⁶ ฿, 1 G₿ = 10⁹ ฿, 1 T₿ = 10¹² ฿, 1 P₿ = 10¹⁵ ฿**). Включить авто-сокращение можно в «Настройках» или внизу Кошелька!');
  else if (topic === 'business') appendAiChatMessage('ai', 'Налоги на земное имущество теперь оплачиваются **вручную раз в 72 часа** («Отправить в закон»)! Если за 72ч не оплатить — доходы заморозятся. Если денег нет — нажми **«Выписать долговую расписку»**, чтобы сразу разморозить бизнес и выплатить налог в 4 части!');
  else if (topic === 'club') appendAiChatMessage('ai', 'На **«Кибер-Полигоне» (/club)** работают **Кибер-Сапёр 5×5** и **Космическая Золотодобыча** с античит-проверкой серверного времени.');
  else if (topic === 'market') appendAiChatMessage('ai', 'Покупка самой **Космо-локации** даёт **0 ฿/ч**, пока вы не прокачаете внутри неё **3 базы (Добыча, Наука, Энергоблок от 1 до 5 ур.)**. А свои прокачанные бизнесы и предметы можно в 2 клика выставлять на **24ч Аукцион**!');
  else if (topic === 'audit') {
    if (!state.currentUser) return appendAiChatMessage('ai', 'Сперва войдите в счёт!');
    const u = findUser(state.currentUser);
    const now = getServerTime();
    const calc = calculateUserPendingBusinessRevenue(u, appData.loans, appData.settings, now, state.isDemoMode);
    const reCalc = calculateUserRealEstateRent(u, appData.settings, now, calc.isFrozenByDebt);
    const cosCalc = calculateUserCosmicRent(u, appData.settings, now);
    appendAiChatMessage('ai', `Гражданин **@${u.username}**: Баланс **${formatBaity(u.balance || 0)}**, Промыслы **+${formatBaity(calc.totalHourly)}/ч**, Недвижимость **+${formatBaity(reCalc.totalHourly)}/ч**, Космо-Базы **+${formatBaity(cosCalc.totalHourly)}/ч**, Накопленный налог **${formatBaity(calc.taxDecl.accumulatedTax)}**!`);
  }
}

export function handleSendAiChatQuestion(e) {
  e.preventDefault();
  const inp = document.getElementById('aiUserQuestionInput');
  const q = (inp.value || '').trim();
  if (!q) return;
  inp.value = '';
  appendAiChatMessage('user', q);
  callRoyalGeminiAI(q, 'Ты — Премудрый Дьяк игрового Банка Миробайт (валюта Байти ฿, K₿, M₿, G₿, T₿, P₿). Отвечай кратко в боярском кибер-стиле (2 предложения).').then(res => {
    appendAiChatMessage('ai', res || `Разумил слово твоё: «**${transformToModernOldRussian(q, state.currentUser || 'Боярин', 'boyar')}**»`);
  });
}

// -------------------------------------------------------------------------
// 11. QR-ПЛАТЕЖИ, АВТОРИЗАЦИЯ, ПЕРЕВОДЫ, ТЕЛЕГРАФ И АДМИНКА
// -------------------------------------------------------------------------
let qrVideoStream = null;
let qrScanRafId = null;
let lastScannedQrData = null;

export function buildQrPaymentPayload(username, amount, comment) {
  const baseUrl = window.location.origin + window.location.pathname;
  const params = new URLSearchParams();
  params.set('payTo', username);
  if (amount && Number(amount) > 0) params.set('amount', String(amount));
  if (comment && comment.trim()) params.set('comment', comment.trim());
  return `${baseUrl}?${params.toString()}`;
}

export function parseQrPayloadString(rawText) {
  const raw = String(rawText || '').trim();
  if (!raw) return null;
  try {
    if (raw.startsWith('http') || raw.includes('?payTo=')) {
      const url = new URL(raw, window.location.origin);
      const to = url.searchParams.get('payTo');
      if (to) return { to: to.trim(), amount: parseInt(url.searchParams.get('amount') || '0', 10) || null, comment: (url.searchParams.get('comment') || '').trim() };
    }
  } catch (e) {}
  const cleanedLogin = raw.replace(/^@/, '').trim();
  const matchedUser = findUser(cleanedLogin);
  if (matchedUser) return { to: matchedUser.username, amount: null, comment: '' };
  return null;
}

export function openQrModal(mode = 'myqr', prefill = false) {
  if (!state.currentUser) return showToast('Войдите в счёт!', 'error');
  if (prefill) {
    document.getElementById('qrReqAmount').value = document.getElementById('transferAmount')?.value || '';
    document.getElementById('qrReqComment').value = document.getElementById('transferComment')?.value || '';
  }
  const modal = document.getElementById('qrModal');
  modal.classList.remove('hidden'); modal.classList.add('flex');
  switchQrTab(mode);
}

export function closeQrModal() {
  stopQrCameraScanner();
  const modal = document.getElementById('qrModal');
  modal.classList.add('hidden'); modal.classList.remove('flex');
}

export function switchQrTab(mode) {
  const myView = document.getElementById('qrViewMy'), scanView = document.getElementById('qrViewScan');
  const btnMy = document.getElementById('qrTabBtnMy'), btnScan = document.getElementById('qrTabBtnScan');
  if (mode === 'myqr') {
    stopQrCameraScanner();
    myView.classList.remove('hidden'); scanView.classList.add('hidden');
    btnMy.className = 'tap-btn py-1.5 rounded-xl text-xs font-royal font-bold uppercase transition-all bg-bank-gold text-black shadow-md';
    btnScan.className = 'tap-btn py-1.5 rounded-xl text-xs font-royal font-bold uppercase transition-all text-emerald-300 hover:text-white';
    generateMyQrCode();
  } else {
    myView.classList.add('hidden'); scanView.classList.remove('hidden');
    btnScan.className = 'tap-btn py-1.5 rounded-xl text-xs font-royal font-bold uppercase transition-all bg-emerald-600 text-emerald-950 shadow-md';
    btnMy.className = 'tap-btn py-1.5 rounded-xl text-xs font-royal font-bold uppercase transition-all text-emerald-300 hover:text-white';
  }
}

export function resetMyQrFields() {
  document.getElementById('qrReqAmount').value = '';
  document.getElementById('qrReqComment').value = '';
  generateMyQrCode();
}

export function generateMyQrCode() {
  if (!state.currentUser) return;
  const amt = parseInt(document.getElementById('qrReqAmount')?.value || '0', 10);
  const comment = (document.getElementById('qrReqComment')?.value || '').trim();
  const box = document.getElementById('qrCodeRenderBox');
  const nameLbl = document.getElementById('qrMyUsernameLabel');
  const summaryBadge = document.getElementById('qrInvoiceSummaryBadge');
  if (nameLbl) nameLbl.innerText = `@${state.currentUser.toUpperCase()}`;
  if (summaryBadge) {
    summaryBadge.innerText = amt > 0 ? `Сумма: ${formatBaity(amt)}${comment ? ' • ' + comment : ''}` : 'Свободная сумма перевода';
  }
  if (!box) return;
  box.innerHTML = '';
  const payload = buildQrPaymentPayload(state.currentUser, amt > 0 ? amt : null, comment);
  if (typeof QRCode !== 'undefined') new QRCode(box, { text: payload, width: 176, height: 176, colorDark: '#04120c', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.H });
}

export function copyMyQrPaymentLink() {
  if (!state.currentUser) return;
  const amt = parseInt(document.getElementById('qrReqAmount')?.value || '0', 10);
  const comment = (document.getElementById('qrReqComment')?.value || '').trim();
  const link = buildQrPaymentPayload(state.currentUser, amt > 0 ? amt : null, comment);
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(link).then(() => showToast('QR-ссылка скопирована!', 'success'));
  }
}

export function downloadMyQrCard() {
  if (!state.currentUser) return;
  const qrBox = document.getElementById('qrCodeRenderBox');
  const qrCanvasOrImg = qrBox.querySelector('canvas') || qrBox.querySelector('img');
  if (!qrCanvasOrImg) return showToast('Сначала сгенерируйте QR!', 'error');
  const amt = parseInt(document.getElementById('qrReqAmount')?.value || '0', 10);
  const canvas = document.getElementById('qrExportCanvas');
  canvas.width = 600; canvas.height = 780;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#04120c'; ctx.fillRect(0, 0, 600, 780);
  ctx.strokeStyle = '#e6c875'; ctx.lineWidth = 4; ctx.strokeRect(20, 20, 560, 740);
  ctx.fillStyle = '#e6c875'; ctx.font = '900 28px Cinzel, serif'; ctx.textAlign = 'center';
  ctx.fillText('BANK OF MIROBYTE', 300, 85);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(130, 150, 340, 340);
  ctx.drawImage(qrCanvasOrImg, 150, 170, 300, 300);
  ctx.fillStyle = '#ffffff'; ctx.font = '800 26px Cinzel, serif';
  ctx.fillText(`@${state.currentUser.toUpperCase()}`, 300, 545);
  if (amt > 0) { ctx.fillStyle = '#ffd700'; ctx.fillText(`СУММА: ${formatBaity(amt)}`, 300, 595); }
  const link = document.createElement('a');
  link.download = `Mirobyte_QR_${state.currentUser}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

export async function startQrCameraScanner() {
  const video = document.getElementById('qrVideoPreview'), overlay = document.getElementById('qrScannerOverlay'), placeholder = document.getElementById('qrCameraPlaceholder'), stopBtn = document.getElementById('btnStopQrCam');
  stopQrCameraScanner();
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return showToast('Камера недоступна.', 'error');
  try {
    qrVideoStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } });
    video.srcObject = qrVideoStream;
    await video.play();
    video.classList.remove('hidden'); overlay.classList.remove('hidden'); placeholder.classList.add('hidden'); stopBtn.classList.remove('hidden');
    const scanCanvas = document.getElementById('qrScanCanvas'), scanCtx = scanCanvas.getContext('2d', { willReadFrequently: true });
    const tick = () => {
      if (!qrVideoStream) return;
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        scanCanvas.width = video.videoWidth; scanCanvas.height = video.videoHeight;
        scanCtx.drawImage(video, 0, 0, scanCanvas.width, scanCanvas.height);
        const imageData = scanCtx.getImageData(0, 0, scanCanvas.width, scanCanvas.height);
        if (typeof jsQR !== 'undefined') {
          const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });
          if (code && code.data) {
            const parsed = parseQrPayloadString(code.data);
            if (parsed) { stopQrCameraScanner(); presentScannedQrResult(parsed); return; }
          }
        }
      }
      qrScanRafId = requestAnimationFrame(tick);
    };
    qrScanRafId = requestAnimationFrame(tick);
  } catch (err) { showToast('Не удалось включить камеру.', 'error'); }
}

export function stopQrCameraScanner() {
  if (qrScanRafId) { cancelAnimationFrame(qrScanRafId); qrScanRafId = null; }
  if (qrVideoStream) { qrVideoStream.getTracks().forEach(t => t.stop()); qrVideoStream = null; }
  document.getElementById('qrVideoPreview')?.classList.add('hidden');
  document.getElementById('qrScannerOverlay')?.classList.add('hidden');
  document.getElementById('qrCameraPlaceholder')?.classList.remove('hidden');
  document.getElementById('btnStopQrCam')?.classList.add('hidden');
}

export function handleQrImageUpload(e) {
  const file = e.target.files[0]; e.target.value = '';
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(evt) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.getElementById('qrScanCanvas'), ctx = canvas.getContext('2d', { willReadFrequently: true });
      canvas.width = img.width; canvas.height = img.height; ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = typeof jsQR !== 'undefined' ? jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'attemptBoth' }) : null;
      if (!code || !code.data) return showToast('QR-код не найден!', 'error');
      const parsed = parseQrPayloadString(code.data);
      if (!parsed) return showToast('Неверный формат QR!', 'error');
      stopQrCameraScanner(); presentScannedQrResult(parsed);
    };
    img.src = evt.target.result;
  };
  reader.readAsDataURL(file);
}

export function presentScannedQrResult(parsed) {
  const targetUser = findUser(parsed.to);
  if (!targetUser) return showToast(`Гражданин @${parsed.to} не найден!`, 'error');
  lastScannedQrData = { to: targetUser.username, amount: parsed.amount || '', comment: parsed.comment || '' };
  document.getElementById('qrScanTargetName').innerText = `@${targetUser.username}`;
  document.getElementById('qrScanTargetStatus').innerText = targetUser.customStatus || 'Гражданин';
  document.getElementById('qrScanTargetAvatar').innerHTML = targetUser.avatar ? `<img src="${targetUser.avatar}" class="w-full h-full object-cover">` : `<i class="fa-solid fa-user text-bank-gold"></i>`;
  document.getElementById('qrScanPayAmount').value = parsed.amount || '';
  document.getElementById('qrScanPayComment').value = parsed.comment || 'Оплата по QR-коду';
  document.getElementById('qrScannedResultBox').classList.remove('hidden');
  showToast(`QR @${targetUser.username} считан!`, 'success');
}

export function applyQrToTransferForm() {
  if (!lastScannedQrData) return;
  document.getElementById('transferTarget').value = lastScannedQrData.to;
  document.getElementById('transferAmount').value = document.getElementById('qrScanPayAmount').value || '';
  document.getElementById('transferComment').value = document.getElementById('qrScanPayComment').value || 'Оплата по QR-коду';
  closeQrModal(); navigateRoute('/'); navigateTab('dashboard');
}

export async function executeInstantQrPayment(btnEl = null) {
  return withOperationLock('instant_qr_pay', btnEl, async () => {
    if (!lastScannedQrData || !state.currentUser) return;
    const to = lastScannedQrData.to;
    const amt = parseInt(document.getElementById('qrScanPayAmount').value, 10);
    const comment = (document.getElementById('qrScanPayComment').value || 'Оплата по QR-коду').trim().slice(0, MAX_COMMENT_LENGTH);
    if (!validPositiveAmount(amt)) return showToast('Укажите сумму!', 'error');
    const sender = findUser(state.currentUser), recipient = findUser(to);
    if (!sender || !recipient || sender.isBlocked || recipient.isBlocked) return;
    if (normalizeLogin(sender.username) === normalizeLogin(recipient.username)) return showToast('Нельзя оплатить свой QR!', 'error');

    const opId = newOperationId('QR');
    if (!await atomicBalanceChange(sender.username, -amt, { requireFunds: true, operationId: `${opId}_DEBIT` })) return showToast('Недостаточно Байти!', 'error');
    await atomicBalanceChange(recipient.username, amt, { operationId: `${opId}_CREDIT` });
    await recordPlayerFinancialStat(sender.username, 'expense', 'transfersOut', amt);
    await recordPlayerFinancialStat(recipient.username, 'income', 'transfersIn', amt);

    saveRecentRecipient(recipient.username);
    await db.ref(`bankData/transactions/${opId}`).set({
      id: opId, from: sender.username, to: recipient.username, amount: amt,
      comment: `📱 [QR-Оплата]: ${comment}`, timestamp: new Date(getServerTime()).toLocaleString('ru-RU'), timestampMs: serverTimestamp()
    });
    addSystemMessage(recipient.username, 'Поступление по QR', `Вам поступила QR-оплата +${formatBaity(amt)} от @${sender.username}.`);
    closeQrModal();
    showToast(`QR оплачен: ${formatBaity(amt)} → @${recipient.username}!`, 'success');
  });
}

export function checkUrlPaymentParams() {
  try {
    const url = new URL(window.location.href);
    const payTo = url.searchParams.get('payTo');
    if (!payTo) return;
    const amount = parseInt(url.searchParams.get('amount') || '0', 10) || null;
    const comment = (url.searchParams.get('comment') || '').trim();
    window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
    if (state.currentUser) { openQrModal('scan'); presentScannedQrResult({ to: payTo, amount, comment }); }
  } catch (e) {}
}

export function saveRecentRecipient(targetUsername) {
  if (state.isDemoMode || !state.currentUser || !targetUsername) return;
  const cleanTarget = String(targetUsername).trim();
  if (normalizeLogin(cleanTarget) === normalizeLogin(state.currentUser)) return;
  const lsKey = `mb_recent_recipients_${normalizeLogin(state.currentUser)}`;
  try {
    let arr = JSON.parse(localStorage.getItem(lsKey) || '[]');
    if (!Array.isArray(arr)) arr = [];
    arr = arr.filter(x => normalizeLogin(x) !== normalizeLogin(cleanTarget));
    arr.unshift(cleanTarget);
    localStorage.setItem(lsKey, JSON.stringify(arr.slice(0, 15)));
  } catch (e) {}
}

export function getRecentRecipients() {
  if (!state.currentUser) return [];
  const lsKey = `mb_recent_recipients_${normalizeLogin(state.currentUser)}`;
  try {
    const arr = JSON.parse(localStorage.getItem(lsKey) || '[]');
    return Array.isArray(arr) ? arr.slice(0, 15) : [];
  } catch (e) {
    return [];
  }
}

export function handleAutocompleteFocus(e) { handleAutocompleteInput(e); }

export function handleAutocompleteInput(e) {
  const input = e.target;
  const query = input.value.trim().toLowerCase();
  const dropdown = document.getElementById(`${input.id}-dropdown`);
  if (!dropdown) return;

  const isAdmin = isCurrentUserAdmin() || isCurrentUserSuperAdmin();
  const recentLogins = getRecentRecipients();
  const recentSet = new Set(recentLogins.map(x => normalizeLogin(x)));

  let candidates = [];
  if (!query) {
    const recentUsers = recentLogins.map(l => findUser(l)).filter(u => u && (isAdmin || !u.hiddenFromAll));
    if (recentUsers.length > 0) {
      candidates = recentUsers.slice(0, 15);
    } else {
      candidates = Object.values(appData.users || {})
        .filter(u => u && (isAdmin || !u.hiddenFromAll))
        .sort((a, b) => (b.balance || 0) - (a.balance || 0))
        .slice(0, 12);
    }
  } else {
    const allVisible = Object.values(appData.users || {}).filter(u => u && (isAdmin || !u.hiddenFromAll));
    const startsWith = [];
    const contains = [];
    allVisible.forEach(u => {
      const low = u.username.toLowerCase();
      if (low.startsWith(query)) startsWith.push(u);
      else if (low.includes(query)) contains.push(u);
    });
    candidates = [...startsWith, ...contains].slice(0, 15);
  }

  if (candidates.length === 0) {
    dropdown.innerHTML = `<div class="p-2.5 text-[11px] text-emerald-500/60 text-center">Гражданин по запросу «${escapeHtml(query)}» не найден</div>`;
    dropdown.classList.remove('hidden');
    return;
  }

  const frag = document.createDocumentFragment();
  candidates.forEach(u => {
    const isRec = recentSet.has(normalizeLogin(u.username));
    const avatarMini = u.avatar ? `<img src="${u.avatar}" class="w-full h-full object-cover" loading="lazy">` : `<i class="fa-solid fa-user text-[10px] text-bank-gold"></i>`;
    const row = document.createElement('div');
    row.className = 'px-3 py-2 hover:bg-bank-card/90 cursor-pointer flex items-center justify-between border-b border-bank-border/30 last:border-0 transition-colors';
    row.innerHTML = `
      <div class="flex items-center gap-2 min-w-0">
        <div class="w-6 h-6 rounded-md bg-black ring-1 ring-bank-gold/40 overflow-hidden flex items-center justify-center flex-shrink-0">${avatarMini}</div>
        <div class="truncate">
          <div class="font-royal font-bold text-xs text-white flex items-center gap-1.5">
            <span class="truncate">${escapeHtml(u.username)}</span>
            ${isRec ? '<span class="px-1.5 py-0.2 rounded bg-emerald-950 border border-emerald-500/40 text-[8px] font-mono text-emerald-300">🕒 Недавний</span>' : ''}
          </div>
          <div class="text-[10px] text-emerald-400/70 font-mono">${formatBaity(u.balance || 0)}</div>
        </div>
      </div>
      <span class="text-[10px] text-bank-gold font-semibold uppercase ml-2 flex-shrink-0">Выбрать</span>
    `;
    row.onmousedown = (ev) => {
      ev.preventDefault();
      input.value = u.username;
      dropdown.classList.add('hidden');
      if (input.id === 'mailRecipient') selectTelegraphDialogPeer(u.username);
      input.focus();
    };
    frag.appendChild(row);
  });
  dropdown.innerHTML = ''; dropdown.appendChild(frag); dropdown.classList.remove('hidden');
}

export function openTelegraphChatWithUser(peerUsername) {
  if (!peerUsername) return;
  state.activeTelegraphPeer = peerUsername;
  state.mailFilter = 'dialog';
  const recInput = document.getElementById('mailRecipient');
  if (recInput) recInput.value = peerUsername;
  navigateRoute('/');
  navigateTab('mail');
  renderMailView();
}

export function selectTelegraphDialogPeer(peerUsername) {
  const clean = String(peerUsername || '').replace(/^@/, '').trim();
  const inlineLbl = document.getElementById('mailTargetLabelInline');
  if (inlineLbl) inlineLbl.innerText = clean ? `@${clean}` : '@...';
  const found = findUser(clean);
  if (found) {
    state.activeTelegraphPeer = found.username;
    state.mailFilter = 'dialog';
    renderMailView();
  }
}

export async function promptDeleteMail(mailKey, isMine) {
  if (guardDemoReadOnly() || !mailKey) return;
  if (isMine || isCurrentUserAdmin() || isCurrentUserSuperAdmin()) {
    const ok = await askRoyalConfirm({
      title: 'Физическое удаление сообщения из БД',
      message: 'Удалить это сообщение безвозвратно из базы данных Телеграфа?',
      okText: 'Удалить из БД',
      isDanger: true
    });
    if (ok) {
      await db.ref(`bankData/mailBox/${mailKey}`).remove();
      showToast('Сообщение физически удалено из базы данных!', 'info');
    }
  } else {
    await db.ref(`bankData/mailBox/${mailKey}/deletedByRecipient`).set(true);
    showToast('Сообщение скрыто у вас.', 'info');
  }
}

export function setMailFilter(m) {
  state.mailFilter = m;
  renderMailView();
}

export function addAmountToTransferInput(val) {
  const inp = document.getElementById('transferAmount');
  inp.value = (parseInt(inp.value, 10) || 0) + val;
  navigateRoute('/'); navigateTab('dashboard');
  showToast(`+${val} ฿ добавлено к переводу`, 'info');
}

export function openBanknoteModal(val) {
  const note = BANKNOTES_CONFIG.find(n => n.value === val);
  if (!note) return;
  document.getElementById('modalNoteTitle').innerText = `${note.value} БАЙТИ (฿) — ${note.titleEn}`;
  document.getElementById('modalNominalValueText').innerText = `${note.value} ฿`;
  const renderBox = document.getElementById('modalBanknoteRender');
  const customImg = appData.banknoteImages && appData.banknoteImages[note.value];
  renderBox.innerHTML = customImg
    ? `<img src="${customImg}" class="w-full h-full object-cover rounded-xl">`
    : `<div class="my-auto text-center py-6"><i class="fa-solid ${note.icon} text-4xl text-bank-gold mb-2"></i><div class="font-royal font-bold text-lg text-white">${note.motif} (${note.value} ฿)</div></div>`;
  document.getElementById('modalAddToTransferBtn').onclick = () => { addAmountToTransferInput(note.value); closeBanknoteModal(); };
  document.getElementById('banknoteModal').classList.remove('hidden');
  document.getElementById('banknoteModal').classList.add('flex');
}

export function closeBanknoteModal() {
  document.getElementById('banknoteModal').classList.add('hidden');
  document.getElementById('banknoteModal').classList.remove('flex');
}

// -------------------------------------------------------------------------
// 12. ФУНКЦИИ АДМИНКИ (/admin), КАЗНЫ И САНКЦИЙ
// -------------------------------------------------------------------------
export function launchPresetBankEvent(presetKey) {
  if (!guardAdminAction(false)) return;
  const presets = {
    art_boom: { active: true, type: 'art_boom', badge: '🎨 АУКЦИОННЫЙ БУМ', title: 'Скидка 20% на все Шедевры Живописи и Редкие Марки!', desc: 'Пополните коллекцию в разделе «Искусство»', startedAt: serverTimestamp() },
    gold_rush: { active: true, type: 'gold_rush', badge: '⛏️ ЗОЛОТАЯ ЛИХОРАДКА', title: '+50% к почасовому доходу всех предприятий «Боярские Промыслы»!', desc: 'Все корпорации приносят повышенную ренту', startedAt: serverTimestamp() },
    garage_expo: { active: true, type: 'garage_expo', badge: '🏎️ АВТОСАЛОН ИМПЕРИИ', title: 'Скидка 15% на Гиперкары, Лимузины, Джеты и Яхты!', desc: 'Распродажа в разделе «Автопарк»', startedAt: serverTimestamp() },
    financial_storm: { active: true, type: 'financial_storm', badge: '⚡ ФИНАНСОВЫЙ ШТОРМ', title: '0% налог Казны при сборе выручки Промыслов!', desc: 'Собирайте 100% прибыли без удержаний', startedAt: serverTimestamp() }
  };
  const chosen = presets[presetKey];
  if (!chosen) return;
  db.ref('bankData/settings/activeEvent').set(chosen).then(() => showToast(`Ивент «${chosen.badge}» запущен!`, 'success'));
}

export function stopGlobalActiveEvent() {
  if (!guardAdminAction(false)) return;
  db.ref('bankData/settings/activeEvent').set(null).then(() => showToast('Активный ивент завершён.', 'info'));
}

export function launchImperialAuctionEvent(e) {
  e.preventDefault();
  if (!guardAdminAction(false)) return;
  const title = (document.getElementById('auctionLotTitleInput')?.value || '').trim();
  const startBid = Math.max(100, parseInt(document.getElementById('auctionStartBidInput')?.value || '50000', 10));
  if (!title) return showToast('Введите название лота!', 'error');
  const eventObj = {
    active: true, type: 'auction', badge: '🔨 АУКЦИОН', title: `Торги за лот: «${title}»`,
    desc: 'Победитель получит артефакт в Сокровищницу', lotTitle: title, startBid, currentBid: startBid, highestBidder: null, startedAt: serverTimestamp()
  };
  db.ref('bankData/settings/activeEvent').set(eventObj).then(() => showToast(`Аукцион «${title}» открыт!`, 'success'));
}

export function openImperialAuctionModal() {
  if (!state.currentUser) return showToast('Войдите в счёт!', 'error');
  const ev = appData.settings?.activeEvent;
  if (!ev || !ev.active || ev.type !== 'auction') return showToast('Нет активного аукциона!', 'info');
  document.getElementById('auctionModalLotTitle').innerText = ev.lotTitle || ev.title;
  const curBid = Number(ev.currentBid || ev.startBid || 1000);
  document.getElementById('auctionModalCurrentBid').innerText = formatBaity(curBid);
  document.getElementById('auctionModalLeader').innerText = ev.highestBidder ? `@${ev.highestBidder}` : 'Ставок пока нет';
  document.getElementById('auctionUserBidInput').value = curBid + Math.max(100, Math.round(curBid * 0.1));
  const modal = document.getElementById('imperialAuctionModal');
  modal.classList.remove('hidden'); modal.classList.add('flex');
}

export function closeImperialAuctionModal() {
  const modal = document.getElementById('imperialAuctionModal');
  modal.classList.add('hidden'); modal.classList.remove('flex');
}

export async function submitImperialAuctionBid(e) {
  e.preventDefault();
  const btn = document.getElementById('auctionBidSubmitBtn');
  return withOperationLock('auction_bid_op', btn, async () => {
    if (!state.currentUser) return;
    const u = findUser(state.currentUser), ev = appData.settings?.activeEvent;
    if (!u || u.isBlocked || !ev || !ev.active || ev.type !== 'auction') return;
    const newBid = parseInt(document.getElementById('auctionUserBidInput')?.value || '0', 10);
    const curBid = Number(ev.currentBid || ev.startBid || 100);
    if (!validPositiveAmount(newBid) || newBid <= curBid) return showToast(`Ставка должна быть выше ${formatBaity(curBid)}!`, 'error');
    if ((u.balance || 0) < newBid) return showToast('Недостаточно Байти на балансе!', 'error');

    const prevBidder = ev.highestBidder, prevBidAmt = Number(ev.currentBid || 0);
    const opId = newOperationId('BID');
    if (!await atomicBalanceChange(u.username, -newBid, { requireFunds: true, operationId: opId })) return;

    if (prevBidder && prevBidAmt > 0) {
      await atomicBalanceChange(prevBidder, prevBidAmt, { operationId: `${opId}_REFUND` });
      addSystemMessage(prevBidder, '🔨 Ваша ставка перебита!', `Гражданин @${u.username} предложил ${formatBaity(newBid)} за лот «${ev.lotTitle}». Ваши ${formatBaity(prevBidAmt)} возвращены.`);
    }
    await db.ref('bankData/settings/activeEvent').update({ currentBid: newBid, highestBidder: u.username });
    closeImperialAuctionModal();
    showToast(`🔨 Ваша ставка ${formatBaity(newBid)} принята!`, 'success');
  });
}

export async function finalizeImperialAuctionWinner() {
  if (!guardAdminAction(false)) return;
  const ev = appData.settings?.activeEvent;
  if (!ev || !ev.active || ev.type !== 'auction') return showToast('Нет активного аукциона!', 'error');
  if (!ev.highestBidder) { await db.ref('bankData/settings/activeEvent').set(null); return showToast('Аукцион закрыт без ставок.', 'info'); }
  const winner = findUser(ev.highestBidder), winBid = Number(ev.currentBid || 0);
  if (winner) {
    const wKey = normalizeLogin(winner.username);
    const inv = Array.isArray(winner.inventory) ? [...winner.inventory] : [];
    inv.unshift({
      id: newOperationId('AUCLOT'), instanceId: newOperationId('AUCLOT'), category: 'bazaar', title: `🏆 [Аукцион] ${ev.lotTitle}`,
      desc: `Выиграно на торгах за ${formatBaity(winBid)}`, artwork: generateRoyalArtSvgDataUrl('crown', ev.lotTitle),
      boughtFrom: 'ИМПЕРАТОРСКИЙ АУКЦИОН', price: winBid, boughtAt: new Date(getServerTime()).toLocaleDateString('ru-RU')
    });
    await db.ref(`bankData/users/${wKey}/inventory`).set(cleanFirebaseObject(inv));
    await addTreasuryTaxOrProfit(winBid);
  }
  await db.ref('bankData/settings/activeEvent').set(null);
  showToast(`🏆 Лот вручён победителю @${ev.highestBidder}!`, 'success');
}

export function getAllShopConfigurableItems() {
  const items = [];
  PRIVILEGE_FRAMES_CATALOG.forEach(f => items.push({ id: f.id, filterKey: 'frames', group: 'Рамка', name: f.name, defaultPrice: f.price }));
  PRIVILEGE_TITLES_CATALOG.forEach(t => items.push({ id: t.id, filterKey: 'frames', group: 'Титул', name: t.title, defaultPrice: t.price }));
  BUILTIN_PAID_CARDS_CATALOG.forEach(c => items.push({ id: c.id, filterKey: 'cards', group: 'Скин карты', name: c.name, defaultPrice: c.price }));
  Object.values(appData.cardDesigns || {}).forEach(d => items.push({ id: d.id, filterKey: 'cards', group: 'Кастом карта', name: d.name, defaultPrice: Number(d.price ?? 250) }));
  LUXURY_ART_CATALOG.forEach(a => items.push({ id: a.id, filterKey: 'art', group: 'Искусство', name: a.title, defaultPrice: a.price }));
  LUXURY_GARAGE_CATALOG.forEach(g => items.push({ id: g.id, filterKey: 'garage', group: 'Автопарк', name: g.title, defaultPrice: g.price }));
  REAL_ESTATE_CATALOG.forEach(r => items.push({ id: r.id, filterKey: 'realestate', group: 'Недвижимость', name: r.title, defaultPrice: r.price }));
  COSMIC_EMPIRE_CATALOG.forEach(c => items.push({ id: c.id, filterKey: 'cosmos', group: 'Космос', name: c.title, defaultPrice: c.price }));
  return items;
}

export function populateAdminShopPriceEditor() {
  const sel = document.getElementById('adminShopPriceItemSelect');
  if (!sel) return;
  const filterVal = document.getElementById('adminShopCategoryFilter')?.value || 'ALL';
  const prevVal = sel.value;
  const all = getAllShopConfigurableItems().filter(x => filterVal === 'ALL' || x.filterKey === filterVal);
  sel.innerHTML = all.map(item => `<option value="${item.id}">[${escapeHtml(item.group)}] ${escapeHtml(item.name)} — ${formatBaity(getRawSavedShopPrice(item.id, item.defaultPrice))}</option>`).join('');
  if (prevVal && all.some(x => x.id === prevVal)) sel.value = prevVal;
  syncAdminSelectedShopItemPrice();
}

export function syncAdminSelectedShopItemPrice() {
  const sel = document.getElementById('adminShopPriceItemSelect');
  const inp = document.getElementById('adminShopPriceValueInput');
  if (!sel || !inp) return;
  const all = getAllShopConfigurableItems();
  const found = all.find(x => x.id === sel.value) || all[0];
  if (found) inp.value = getRawSavedShopPrice(found.id, found.defaultPrice);
}

export function handleAdminSaveShopItemPrice(e) {
  e.preventDefault();
  if (!guardAdminAction(false)) return;
  const itemId = document.getElementById('adminShopPriceItemSelect')?.value;
  const newPrice = parseInt(document.getElementById('adminShopPriceValueInput')?.value || '0', 10);
  if (!itemId || isNaN(newPrice) || newPrice < 0) return showToast('Введите корректную цену!', 'error');
  const updates = { [`bankData/settings/shopPrices/${itemId}`]: newPrice };
  if (appData.cardDesigns && appData.cardDesigns[itemId]) updates[`bankData/cardDesigns/${itemId}/price`] = newPrice;
  db.ref().update(updates).then(() => { populateAdminShopPriceEditor(); showToast(`Цена (${formatBaity(newPrice)}) сохранена!`, 'success'); });
}

export function resetAllShopPricesToDefault() {
  if (!guardAdminAction(false)) return;
  db.ref('bankData/settings/shopPrices').set(null).then(() => { populateAdminShopPriceEditor(); showToast('Все цены магазина сброшены!', 'info'); });
}

export function setAdminUserFilter(filterKey) {
  state.adminUserFilter = filterKey;
  ['all', 'magnates', 'admins', 'blocked'].forEach(k => {
    const b = document.getElementById(`admFilterBtn-${k}`);
    if (b) {
      b.className = k === filterKey
        ? 'px-2.5 py-1 rounded-xl text-[11px] font-royal font-bold bg-bank-gold text-black shadow-md'
        : 'px-2.5 py-1 rounded-xl text-[11px] font-royal font-bold bg-bank-darkest text-emerald-300 border border-bank-border hover:bg-bank-card';
    }
  });
  renderAdminUsersCompactCards();
}

export function renderAdminUsersCompactCards() {
  const grid = document.getElementById('adminUsersCardsGrid');
  const totalEl = document.getElementById('statTotalUsers');
  if (!grid) return;

  const usersList = Object.values(appData.users || {}).sort((a, b) => (b.balance || 0) - (a.balance || 0));
  if (totalEl) totalEl.innerText = String(usersList.length);

  const q = (document.getElementById('adminUserSearchInput')?.value || '').trim().toLowerCase();
  const filtered = usersList.filter(u => {
    if (state.adminUserFilter === 'magnates' && getUserBusinessSlotsEntries(u, appData.settings).length === 0) return false;
    if (state.adminUserFilter === 'admins' && !(u.isAdmin || u.isSuperAdmin || u.isOwner)) return false;
    if (state.adminUserFilter === 'blocked' && !u.isBlocked) return false;
    if (!q) return true;
    return u.username.toLowerCase().includes(q) || (u.customStatus && u.customStatus.toLowerCase().includes(q));
  });

  grid.innerHTML = filtered.map(u => {
    const isOwnerAcc = u.isOwner || normalizeLogin(u.username) === OWNER_USERNAME;
    const calc = calculateUserPendingBusinessRevenue(u, appData.loans, appData.settings, getServerTime(), state.isDemoMode);
    const slots = getUserBusinessSlotsEntries(u, appData.settings);
    const totalLevels = slots.reduce((acc, s) => acc + Number(s.data?.level || 0), 0);
    const safeKey = normalizeLogin(u.username);

    return `
      <div class="p-3 sm:p-4 rounded-2xl bg-bank-darkest/95 border ${u.isBlocked ? 'border-rose-500/70' : 'border-bank-border hover:border-bank-gold/50'} flex flex-col justify-between gap-2.5 shadow-md">
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <div class="font-royal font-bold text-xs sm:text-sm text-white flex items-center gap-1 flex-wrap">
              <span class="cursor-pointer hover:text-bank-gold" onclick="fillAdminTarget('${escapeHtml(u.username)}')">@${escapeHtml(u.username)}</span>
              ${isOwnerAcc ? '<span class="px-1.5 py-0.2 bg-bank-gold text-black rounded text-[8px] font-bold">OWNER</span>' : (u.isSuperAdmin ? '<span class="px-1.5 py-0.2 bg-purple-900 text-purple-200 rounded text-[8px]">SUPER</span>' : (u.isAdmin ? '<span class="px-1.5 py-0.2 bg-emerald-900 text-emerald-200 rounded text-[8px]">КАЗНАЧЕЙ</span>' : ''))}
              ${u.isBlocked ? '<span class="px-1.5 py-0.2 bg-rose-900 text-white rounded text-[8px]">БЛОК</span>' : ''}
            </div>
            <div class="text-[10px] text-emerald-400/80 truncate">${escapeHtml(u.customStatus || 'Гражданин')}</div>
            <div class="text-[9px] font-mono text-amber-300/90">🏭 ${calc.ownedCount}/10 (Ур:${totalLevels}) • +${formatBaity(calc.totalHourly)}/ч</div>
          </div>
          <div class="text-right flex-shrink-0">
            <div class="font-mono font-black text-xs sm:text-base text-bank-gold">${formatBaity(u.balance || 0)}</div>
            <button onclick="openPlayerPublicProfileModal('${escapeHtml(u.username)}')" class="text-[9px] text-emerald-400 underline">Профиль</button>
          </div>
        </div>
        <div class="pt-2 border-t border-bank-border/50 space-y-1.5">
          <div class="flex items-center gap-1">
            <input type="number" id="admCardAmt_${safeKey}" min="1" placeholder="Сумма ฿..." class="w-24 bg-bank-surface border border-bank-border rounded-lg px-2 py-1 text-xs font-bold text-bank-gold focus:outline-none">
            <button onclick="adminCardCustomSumAction('${escapeHtml(u.username)}', 'admCardAmt_${safeKey}', 'grant', this)" class="px-2 py-1 bg-emerald-600 text-emerald-950 font-bold rounded-lg text-[10px] uppercase">+Дать</button>
            <button onclick="adminCardCustomSumAction('${escapeHtml(u.username)}', 'admCardAmt_${safeKey}', 'deduct', this)" class="px-2 py-1 bg-rose-700 text-white font-bold rounded-lg text-[10px] uppercase">-Снять</button>
            <div class="ml-auto flex gap-1">
              <button onclick="adminQuickAction('${escapeHtml(u.username)}', 1000, 'grant', this)" class="px-2 py-1 bg-bank-surface border border-bank-gold/40 text-bank-gold rounded-lg text-[10px] font-bold">+1К</button>
              <button onclick="adminQuickAction('${escapeHtml(u.username)}', 1000000, 'grant', this)" class="px-2 py-1 bg-bank-surface border border-bank-gold/40 text-bank-gold rounded-lg text-[10px] font-bold">+1М</button>
            </div>
          </div>
          <div class="flex items-center justify-between gap-1">
            <button onclick="adminFinishUserUpgrades('${escapeHtml(u.username)}')" class="px-2 py-1 bg-amber-950/70 border border-amber-500/40 text-amber-300 rounded-lg text-[10px]">
              ⚡ Завершить стройки
            </button>
            ${!isOwnerAcc ? `
              <div class="flex gap-1">
                <button onclick="adminToggleBlockDirect('${escapeHtml(u.username)}')" class="px-2 py-1 bg-bank-surface border border-rose-500/40 text-rose-300 rounded-lg text-[10px]"><i class="fa-solid ${u.isBlocked ? 'fa-unlock' : 'fa-lock'}"></i></button>
                <button onclick="adminToggleHideDirect('${escapeHtml(u.username)}')" class="px-2 py-1 bg-bank-surface border border-indigo-500/40 text-indigo-300 rounded-lg text-[10px]"><i class="fa-solid fa-eye-slash"></i></button>
                <button onclick="adminZeroUserDirect('${escapeHtml(u.username)}')" class="px-2 py-1 bg-amber-950/60 border border-amber-500/40 text-amber-300 rounded-lg text-[10px]">0฿</button>
              </div>
            ` : '<span class="text-[9px] text-bank-gold font-mono">Неприкосновенен</span>'}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

export async function adminCardCustomSumAction(username, inputId, mode, btnEl = null) {
  if (!guardAdminAction(false)) return;
  const inp = document.getElementById(inputId);
  const val = parseInt(inp?.value || '0', 10);
  if (!validPositiveAmount(val)) return showToast('Введите сумму!', 'error');
  await adminQuickAction(username, val, mode, btnEl);
  if (inp) inp.value = '';
}

export async function adminFinishUserUpgrades(username) {
  if (!guardAdminAction(false)) return;
  const u = findUser(username);
  if (!u) return;
  const uKey = normalizeLogin(u.username), updates = {}, now = getServerTime();
  let count = 0;

  Object.entries(u.businesses || {}).forEach(([slotKey, bData]) => {
    if (bData && Number(bData.upgradeEndsAt || 0) > now) {
      updates[`bankData/users/${uKey}/businesses/${slotKey}/level`] = Math.min(MAX_BUSINESS_LEVEL, Number(bData.level || 1) + 1);
      updates[`bankData/users/${uKey}/businesses/${slotKey}/upgradeStartedAt`] = null;
      updates[`bankData/users/${uKey}/businesses/${slotKey}/upgradeEndsAt`] = null;
      count++;
    }
  });
  Object.entries(u.realEstate || {}).forEach(([reId, rData]) => {
    if (rData && Number(rData.prepEndsAt || 0) > now) {
      updates[`bankData/users/${uKey}/realEstate/${reId}/prepEndsAt`] = now - 1000;
      updates[`bankData/users/${uKey}/realEstate/${reId}/lastCollected`] = now - 1000;
      count++;
    }
  });
  if (count === 0) return showToast(`Нет активных строек у @${u.username}`, 'info');
  await db.ref().update(updates);
  showToast(`⚡ Завершено ${count} таймеров у @${u.username}!`, 'success');
}

export async function adminFinishAllUpgradesNow() {
  if (!guardAdminAction(false)) return;
  const updates = {}, now = getServerTime();
  let totalFinished = 0;
  Object.values(appData.users || {}).forEach(u => {
    if (!u) return;
    const uKey = normalizeLogin(u.username);
    Object.entries(u.businesses || {}).forEach(([slotKey, bData]) => {
      if (bData && Number(bData.upgradeEndsAt || 0) > now) {
        updates[`bankData/users/${uKey}/businesses/${slotKey}/level`] = Math.min(MAX_BUSINESS_LEVEL, Number(bData.level || 1) + 1);
        updates[`bankData/users/${uKey}/businesses/${slotKey}/upgradeStartedAt`] = null;
        updates[`bankData/users/${uKey}/businesses/${slotKey}/upgradeEndsAt`] = null;
        totalFinished++;
      }
    });
    Object.entries(u.realEstate || {}).forEach(([reId, rData]) => {
      if (rData && Number(rData.prepEndsAt || 0) > now) {
        updates[`bankData/users/${uKey}/realEstate/${reId}/prepEndsAt`] = now - 1000;
        updates[`bankData/users/${uKey}/realEstate/${reId}/lastCollected`] = now - 1000;
        totalFinished++;
      }
    });
  });
  if (totalFinished === 0) return showToast('Сейчас нет активных строек.', 'info');
  await db.ref().update(updates);
  showToast(`⚡ Завершено ${totalFinished} строек у всех игроков!`, 'success');
}

export function adminToggleBlockDirect(username) {
  if (!guardAdminAction(false)) return;
  const u = findUser(username);
  if (!u || normalizeLogin(u.username) === OWNER_USERNAME) return showToast('Аккаунт Владельца защищён!', 'error');
  const next = !u.isBlocked;
  db.ref(`bankData/users/${normalizeLogin(u.username)}/isBlocked`).set(next).then(() => showToast(next ? `@${u.username} заблокирован!` : `@${u.username} разблокирован!`, next ? 'error' : 'success'));
}

export function adminToggleHideDirect(username) {
  if (!guardAdminAction(false)) return;
  const u = findUser(username);
  if (!u || normalizeLogin(u.username) === OWNER_USERNAME) return;
  const next = !u.hiddenFromAll;
  db.ref(`bankData/users/${normalizeLogin(u.username)}/hiddenFromAll`).set(next).then(() => showToast(next ? `@${u.username} скрыт` : `@${u.username} виден всем`, 'info'));
}

export async function adminZeroUserDirect(username) {
  if (!guardAdminAction(false)) return;
  const u = findUser(username);
  if (!u || normalizeLogin(u.username) === OWNER_USERNAME) return;
  const bal = Number(u.balance || 0);
  if (bal <= 0) return showToast('Баланс уже 0 ฿', 'info');
  const ok = await askRoyalConfirm({ title: 'Обнуление баланса', message: `Списать все ${formatBaity(bal)} со счёта @${u.username} в Казну?`, okText: 'Обнулить', isDanger: true });
  if (!ok) return;
  await atomicBalanceChange(u.username, -bal, { requireFunds: true, operationId: newOperationId('ZERO') });
  await addTreasuryTaxOrProfit(bal);
  showToast(`Баланс @${u.username} обнулён!`, 'info');
}

export function saveEconomySettingsForm(e) {
  e.preventDefault();
  if (!guardAdminAction(false)) return;
  const startBalance = Math.max(0, parseInt(document.getElementById('econStartBalanceInput').value || '50', 10));
  const taxPercent = Math.min(50, Math.max(0, parseInt(document.getElementById('econTaxPercentInput').value || '5', 10)));
  db.ref('bankData/settings/economy').update({ startBalance, taxPercent }).then(() => showToast(`Сохранено: старт ${startBalance} ฿, налог ${taxPercent}%!`, 'success'));
}

export async function executeImperialGlobalGrant(btnEl = null) {
  return withOperationLock('admin_global_grant', btnEl, async () => {
    if (!guardAdminAction(false)) return;
    const amt = parseInt(document.getElementById('globalGrantAmountInput')?.value || '0', 10);
    if (!validPositiveAmount(amt, 100000000000)) return showToast('Укажите сумму раздачи!', 'error');
    const ok = await askRoyalConfirm({ title: 'Императорская Раздача', message: `Начислить по +${formatBaity(amt)} каждому активному гражданину?`, okText: `Раздать по ${formatBaity(amt)}` });
    if (!ok) return;

    for (const u of Object.values(appData.users || {})) {
      if (!u || u.isBlocked) continue;
      await atomicBalanceChange(u.username, amt, { operationId: newOperationId('GGRANT') });
      await recordPlayerFinancialStat(u.username, 'income', 'transfersIn', amt);
      addSystemMessage(u.username, 'Императорский Грант', `Вам начислено +${formatBaity(amt)}!`);
    }
    const txId = newOperationId('GRANT');
    await db.ref(`bankData/transactions/${txId}`).set({
      id: txId, from: 'ИМПЕРАТОРСКАЯ КАЗНА', to: 'ВСЕМ ГРАЖДАНАМ', amount: amt,
      comment: 'Глобальная раздача грантов', timestamp: new Date(getServerTime()).toLocaleString('ru-RU'), timestampMs: serverTimestamp()
    });
    showToast(`Всем начислено по +${formatBaity(amt)}!`, 'success');
  });
}

export function setGlobalBusinessMultiplier(mult) {
  if (!guardAdminAction(false)) return;
  db.ref('bankData/settings/business/globalMultiplier').set(mult).then(() => showToast(mult > 1 ? `🔥 Включён x${mult} Доход Промыслов!` : 'Стандартный доход (x1).', 'success'));
}

export function renderAdminBusinessConfigInputs() {
  const box = document.getElementById('adminBusinessConfigList');
  if (!box) return;
  const cat = getBusinessCatalog();
  const mult = Number(appData.settings?.business?.globalMultiplier || 1);

  const b1 = document.getElementById('bizMultBtn1'), b2 = document.getElementById('bizMultBtn2'), b3 = document.getElementById('bizMultBtn3');
  if (b1) b1.className = mult === 1 ? 'tap-btn px-3 py-1.5 rounded-xl font-royal font-bold text-xs uppercase bg-emerald-600 text-emerald-950' : 'tap-btn px-3 py-1.5 rounded-xl font-royal font-bold text-xs uppercase bg-bank-darkest border border-bank-border text-emerald-300';
  if (b2) b2.className = mult === 2 ? 'tap-btn px-3 py-1.5 rounded-xl font-royal font-bold text-xs uppercase bg-bank-gold text-black' : 'tap-btn px-3 py-1.5 rounded-xl font-royal font-bold text-xs uppercase bg-bank-darkest border border-bank-gold text-bank-gold';
  if (b3) b3.className = mult === 3 ? 'tap-btn px-3 py-1.5 rounded-xl font-royal font-bold text-xs uppercase bg-purple-600 text-white' : 'tap-btn px-3 py-1.5 rounded-xl font-royal font-bold text-xs uppercase bg-bank-darkest border border-purple-400 text-purple-300';

  box.innerHTML = cat.map((item, idx) => `
    <div class="p-3 rounded-2xl bg-bank-darkest border border-bank-border space-y-1.5">
      <div class="font-royal font-bold text-xs text-white flex items-center justify-between gap-2">
        <span><i class="fa-solid ${item.icon} text-bank-gold mr-1"></i>${escapeHtml(item.name)}</span>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div><label class="block text-[9px] text-emerald-400 uppercase">Цена (฿)</label><input type="number" id="admBizCost_${idx}" value="${item.baseCost}" min="10" class="tap-btn w-full bg-bank-surface border border-bank-border rounded-xl px-2 text-xs font-bold text-bank-gold"></div>
        <div><label class="block text-[9px] text-emerald-400 uppercase">Доход/ч (฿)</label><input type="number" id="admBizHourly_${idx}" value="${item.baseHourly}" min="1" class="tap-btn w-full bg-bank-surface border border-bank-border rounded-xl px-2 text-xs font-bold text-emerald-300"></div>
      </div>
    </div>
  `).join('');
}

export function saveAdminBusinessCatalog() {
  if (!guardAdminAction(false)) return;
  const cat = getBusinessCatalog().map((item, idx) => {
    const newCost = parseInt(document.getElementById(`admBizCost_${idx}`)?.value || String(item.baseCost), 10);
    const newHourly = parseInt(document.getElementById(`admBizHourly_${idx}`)?.value || String(item.baseHourly), 10);
    return { ...item, baseCost: Math.max(10, isNaN(newCost) ? item.baseCost : newCost), baseHourly: Math.max(1, isNaN(newHourly) ? item.baseHourly : newHourly) };
  });
  db.ref('bankData/settings/business/catalog').set(cat).then(() => showToast('Параметры 10 корпораций сохранены!', 'success'));
}

export function resetBusinessCatalogToDefault() {
  if (!guardAdminAction(false)) return;
  db.ref('bankData/settings/business/catalog').set(DEFAULT_BUSINESS_CATALOG).then(() => showToast('Каталог корпораций сброшен!', 'info'));
}

export function renderAdminTopMagnates() {
  const box = document.getElementById('adminTopMagnatesList');
  if (!box) return;
  const list = Object.values(appData.users || {}).map(u => {
    const calc = calculateUserPendingBusinessRevenue(u, appData.loans, appData.settings, getServerTime(), state.isDemoMode);
    const slots = getUserBusinessSlotsEntries(u, appData.settings);
    const levels = slots.reduce((s, b) => s + Number(b.data?.level || 0), 0);
    return { username: u.username, hourly: calc.totalHourly, levels, ownedCount: calc.ownedCount };
  }).filter(x => x.levels > 0).sort((a, b) => b.hourly - a.hourly).slice(0, 15);

  box.innerHTML = list.length === 0
    ? `<div class="text-center py-3 text-emerald-500/60 text-xs">Пока никто не открыл корпорации</div>`
    : list.map((m, i) => `
        <div class="p-2 rounded-xl bg-bank-darkest border border-bank-border flex items-center justify-between text-xs">
          <div><span class="font-mono text-bank-gold mr-1.5">#${i + 1}</span><span class="font-royal font-bold text-white">@${escapeHtml(m.username)}</span> <span class="text-[10px] text-emerald-400/70">(${m.ownedCount}/10 • Ур:${m.levels})</span></div>
          <span class="font-mono font-bold text-emerald-300">+${formatBaity(m.hourly)}/ч</span>
        </div>
      `).join('');
}

export function populateAdminCasinoForm() {
  const cSet = appData.settings?.casino || DEFAULT_SETTINGS.casino;
  const setChk = (id, val) => { const el = document.getElementById(id); if (el) el.checked = !!val; };
  const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
  setChk('admCasinoMasterSwitch', cSet.enabled !== false);
  setChk('admGameMinesSwitch', cSet.minesEnabled !== false);
  setChk('admGameMiningSwitch', cSet.miningEnabled !== false);
  setVal('admCasinoMinBet', cSet.minBet || 10);
  setVal('admCasinoMaxBet', cSet.maxBet || 50000);
  setVal('admCasinoHouseEdge', cSet.houseEdge || 6);
  setVal('admBoosterShieldPrice', cSet.shieldPrice || 150);
  setVal('admBoosterRadarPrice', cSet.radarPrice || 100);
  setVal('admHackMinReward', cSet.hackMinReward || 100);
  setVal('admHackMaxReward', cSet.hackMaxReward || 500);
}

export function saveAdminCasinoSettings() {
  if (!guardAdminAction(false)) return;
  const newCasino = {
    enabled: !!document.getElementById('admCasinoMasterSwitch')?.checked,
    minesEnabled: !!document.getElementById('admGameMinesSwitch')?.checked,
    miningEnabled: !!document.getElementById('admGameMiningSwitch')?.checked,
    minBet: Math.max(1, parseInt(document.getElementById('admCasinoMinBet')?.value || '10', 10)),
    maxBet: Math.max(10, parseInt(document.getElementById('admCasinoMaxBet')?.value || '50000', 10)),
    houseEdge: Math.min(45, Math.max(1, parseInt(document.getElementById('admCasinoHouseEdge')?.value || '6', 10))),
    shieldPrice: Math.max(10, parseInt(document.getElementById('admBoosterShieldPrice')?.value || '150', 10)),
    radarPrice: Math.max(10, parseInt(document.getElementById('admBoosterRadarPrice')?.value || '100', 10)),
    hackMinReward: Math.max(5, parseInt(document.getElementById('admHackMinReward')?.value || '100', 10)),
    hackMaxReward: Math.max(20, parseInt(document.getElementById('admHackMaxReward')?.value || '500', 10)),
    hackConsolation: 25
  };
  db.ref('bankData/settings/casino').set(newCasino).then(() => showToast('Настройки Полигона сохранены!', 'success'));
}

export function renderAdminSecurityLogs() {
  const box = document.getElementById('adminSecurityLogsContainer');
  if (!box) return;
  const logs = appData.securityLogs || [];
  box.innerHTML = logs.length === 0
    ? `<div class="text-center py-4 text-emerald-500/60 text-xs">Событий нет</div>`
    : logs.map(l => `
        <div class="p-2 rounded-xl bg-bank-darkest border border-purple-500/30 flex items-start justify-between gap-2">
          <div><div class="font-bold text-bank-gold text-[10px]">${escapeHtml(l.title)}</div><div class="text-[10px] text-emerald-200">${escapeHtml(l.details)}</div></div>
          <span class="text-[8px] font-mono text-emerald-500 whitespace-nowrap">${escapeHtml(l.timestamp || '')}</span>
        </div>
      `).join('');
}

export function clearSecurityLogsAdmin() {
  if (!guardAdminAction(false)) return;
  db.ref('bankData/securityLogs').set(null).then(() => showToast('Логи очищены!', 'info'));
}

export function populateCalibrationForm() {
  const selId = document.getElementById('calibAssetSelect')?.value || 'SHRM';
  const a = appData.marketAssets[selId] || DEFAULT_MARKET_ASSETS[selId];
  if (!a) return;
  document.getElementById('calibMeanPrice').value = a.minMeanPrice || a.meanPrice || 100;
  document.getElementById('calibDailyPct').value = a.dailyPct || 5;
  document.getElementById('calibWeeklyPct').value = a.weeklyPct || 15;
}

export function handleSaveMarketCalibration(e) {
  e.preventDefault();
  if (!guardAdminAction(false)) return;
  const selId = document.getElementById('calibAssetSelect').value;
  const minMeanPrice = Math.max(5, parseInt(document.getElementById('calibMeanPrice').value, 10) || 100);
  const dailyPct = parseFloat(document.getElementById('calibDailyPct').value) || 5;
  const weeklyPct = parseFloat(document.getElementById('calibWeeklyPct').value) || 15;
  if (!selId) return;
  const curAsset = appData.marketAssets[selId] || DEFAULT_MARKET_ASSETS[selId];
  const newMean = computeGrowingAssetMeanPrice(minMeanPrice, curAsset.totalSharesBought || 0);
  db.ref(`bankData/marketAssets/${selId}`).update({
    minMeanPrice, meanPrice: newMean, price: newMean, prevPrice: newMean, dailyPct, weeklyPct,
    history: [...(curAsset.history || []).slice(-(MAX_CHART_POINTS - 1)), newMean]
  }).then(() => showToast(`Базовая норма ${selId}: ${formatBaity(minMeanPrice)}!`, 'success'));
}

export function adminShiftMarketTick(multiplier) {
  if (!guardAdminAction(false)) return;
  const updates = {};
  Object.values(appData.marketAssets).forEach(a => {
    const minMean = Math.max(5, Number(a.minMeanPrice || 100));
    const nextPrice = Math.min(Math.round(minMean * 3.0), Math.max(Math.round(minMean * 0.75), Math.round(a.price * multiplier)));
    updates[`bankData/marketAssets/${a.id}/prevPrice`] = a.price;
    updates[`bankData/marketAssets/${a.id}/price`] = nextPrice;
    updates[`bankData/marketAssets/${a.id}/history`] = [...(a.history || []).slice(-(MAX_CHART_POINTS - 1)), nextPrice];
  });
  db.ref().update(updates).then(() => showToast('Импульс рынка применён!', 'success'));
}

export function handleIssueStateLoan(e) {
  e.preventDefault();
  const btn = document.getElementById('loanIssueSubmitBtn');
  return withOperationLock('admin_issue_loan', btn, async () => {
    if (!guardAdminAction(false)) return;
    const targetName = document.getElementById('loanTargetUser').value.trim();
    const principal = parseInt(document.getElementById('loanPrincipalAmount').value, 10);
    const interestPct = parseFloat(document.getElementById('loanInterestPct').value) || 0;
    const reason = (document.getElementById('loanNoteReason').value || 'Казначейская ссуда').trim();
    const target = findUser(targetName);
    if (!target || !validPositiveAmount(principal, 100000000000)) return showToast('Проверьте поля!', 'error');
    const totalRepay = Math.round(principal * (1 + interestPct / 100));
    const loanId = newOperationId('LOAN');
    if (!await atomicBalanceChange(target.username, principal, { operationId: loanId })) return;
    await db.ref(`bankData/loans/${loanId}`).set({
      id: loanId, borrower: target.username, principal, interestPct, totalRepay, reason,
      issuedBy: state.currentUser, createdAt: new Date(getServerTime()).toLocaleString('ru-RU'), createdAtMs: Date.now(), status: 'active'
    });
    addSystemMessage(target.username, '📜 Долговая Расписка Казны', `Выдана ссуда +${formatBaity(principal)}. К возврату: ${formatBaity(totalRepay)}.`);
    document.getElementById('loanPrincipalAmount').value = ''; document.getElementById('loanNoteReason').value = '';
    showToast(`Кредит ${formatBaity(principal)} выдан @${target.username}!`, 'success');
  });
}

export async function repayStateLoan(loanId, btnEl = null) {
  return withOperationLock(`repay_loan_${loanId}`, btnEl, async () => {
    if (!state.currentUser) return;
    const loan = appData.loans[loanId];
    if (!loan || loan.status !== 'active') return;
    const u = findUser(state.currentUser);
    const payAmt = Number(loan.remainingAmount || loan.totalRepay || 0);
    if (!u || (u.balance || 0) < payAmt) return showToast(`Требуется ${formatBaity(payAmt)}!`, 'error');
    const opId = newOperationId('REPAY');
    if (!await atomicBalanceChange(u.username, -payAmt, { requireFunds: true, operationId: opId })) return;
    await addTreasuryTaxOrProfit(payAmt);
    await recordPlayerFinancialStat(u.username, 'expense', 'craftsUpgradeAndSupply', payAmt);
    await db.ref(`bankData/loans/${loanId}`).remove();
    await db.ref(`bankData/users/${normalizeLogin(u.username)}/confiscationWarned`).set(false);
    showToast(`✅ Долговая расписка погашена!`, 'success');
  });
}

export function forgiveStateLoan(loanId) {
  if (!guardAdminAction(false)) return;
  db.ref(`bankData/loans/${loanId}`).remove().then(() => showToast('Расписка аннулирована!', 'info'));
}

export function renderAdminLoansList() {
  const box = document.getElementById('adminAllLoansList');
  if (!box) return;
  const all = Object.values(appData.loans || {}).filter(l => l && l.status === 'active');
  box.innerHTML = all.length === 0
    ? `<div class="text-center py-2 text-emerald-500/60 text-xs">Активных расписок нет</div>`
    : all.map(l => `
        <div class="p-2 rounded-xl bg-bank-darkest border border-bank-border flex items-center justify-between text-[11px]">
          <span><b class="text-bank-gold">@${escapeHtml(l.borrower)}</b> — ${formatBaity(l.remainingAmount || l.totalRepay)}</span>
          <button onclick="forgiveStateLoan('${l.id}')" class="text-rose-400 underline text-[10px]">Списать</button>
        </div>
      `).join('');
}

export function renderAdminTransactionsTable() {
  const tbody = document.getElementById('adminLiveTxBody');
  if (!tbody) return;
  const filterTerm = (document.getElementById('adminTxFilterInput')?.value || '').trim().toLowerCase();
  let txs = appData.transactions || [];
  if (filterTerm) txs = txs.filter(t => (t.from && t.from.toLowerCase().includes(filterTerm)) || (t.to && t.to.toLowerCase().includes(filterTerm)) || (t.comment && t.comment.toLowerCase().includes(filterTerm)));

  tbody.innerHTML = txs.length === 0
    ? `<tr><td colspan="4" class="py-4 text-center text-emerald-500/60">Переводов нет</td></tr>`
    : txs.slice(0, 80).map(t => `
        <tr class="hover:bg-bank-card/60 transition-colors">
          <td class="py-1.5 px-2 text-[9px] text-emerald-500/80 font-mono whitespace-nowrap">${escapeHtml(t.timestamp || '—')}</td>
          <td class="py-1.5 px-2 font-bold text-white"><span class="cursor-pointer hover:text-bank-gold" onclick="fillAdminTarget('${escapeHtml(t.from)}')">@${escapeHtml(t.from)}</span> → <span class="text-emerald-300 cursor-pointer hover:text-bank-gold" onclick="fillAdminTarget('${escapeHtml(t.to)}')">@${escapeHtml(t.to)}</span></td>
          <td class="py-1.5 px-2 text-right font-mono font-bold text-bank-gold whitespace-nowrap">+${formatBaity(t.amount || 0)}</td>
          <td class="py-1.5 px-2 text-[10px] text-emerald-200/80 max-w-[140px] truncate">${escapeHtml(t.comment || '—')}</td>
        </tr>
      `).join('');
}

export function renderAdminAllMailsView() {
  const container = document.getElementById('adminAllMailsContainer'), badge = document.getElementById('adminTotalMailsBadge');
  if (!container) return;
  const allMails = Object.entries(appData.mailBox || {}).map(([key, item]) => ({ ...item, _dbKey: key })).sort((a, b) => (b.timestampMs || 0) - (a.timestampMs || 0));
  if (badge) badge.innerText = String(allMails.length);
  container.innerHTML = allMails.length === 0
    ? `<div class="text-center py-4 text-emerald-500/60 text-xs">Депеш нет</div>`
    : allMails.slice(0, 40).map(m => `
        <div class="p-2 rounded-xl bg-bank-darkest border border-purple-500/30 space-y-1 text-xs">
          <div class="flex items-center justify-between text-[10px] border-b border-bank-border/40 pb-1">
            <span><b class="text-purple-300">@${escapeHtml(m.from)}</b> → <b class="text-bank-gold">@${escapeHtml(m.to)}</b></span>
            <button onclick="deleteAdminMailDirect('${m._dbKey}')" class="text-rose-400 hover:text-white"><i class="fa-solid fa-trash-can"></i></button>
          </div>
          <p class="text-white text-[11px] whitespace-pre-wrap">${escapeHtml(m.text)}</p>
        </div>
      `).join('');
}

export async function deleteAdminMailDirect(mailKey) {
  if (!guardAdminAction(false)) return;
  db.ref(`bankData/mailBox/${mailKey}`).remove().then(() => showToast('Депеша удалена!', 'info'));
}

export async function promptClearAllTransactions() {
  if (!guardAdminAction(true)) return;
  const ok = await askRoyalConfirm({ title: 'Очистка журнала переводов', message: 'Очистить всю историю переводов?', okText: 'Очистить', isDanger: true });
  if (ok) db.ref('bankData/transactions').set(null).then(() => showToast('История очищена!', 'info'));
}

export function fillAdminTarget(username) {
  const clean = String(username || '').replace('@', '').trim();
  if (!clean) return;
  ['treasuryTargetUser', 'adminWarnTarget', 'fineTargetUser', 'sanctionTargetUser', 'statusTargetUser'].forEach(id => { const el = document.getElementById(id); if (el) el.value = clean; });
  showToast(`Гражданин @${clean} выбран`, 'info');
}

export function handleSendAdminWarning(e) {
  e.preventDefault();
  if (!guardAdminAction(false)) return;
  const target = document.getElementById('adminWarnTarget').value.trim(), title = document.getElementById('adminWarnTitle').value.trim(), text = document.getElementById('adminWarnText').value.trim();
  const user = findUser(target);
  if (!user) return showToast('Гражданин не найден!', 'error');
  addSystemMessage(user.username, `⚠️ [АДМИНИСТРАЦИЯ]: ${title}`, `${text} (От @${state.currentUser})`).then(() => {
    showToast(`Предупреждение отправлено @${user.username}!`, 'success');
    document.getElementById('adminWarnTitle').value = ''; document.getElementById('adminWarnText').value = '';
  });
}

export function handleCreateCardDesign(e) {
  e.preventDefault();
  if (!guardAdminAction(false)) return;
  const name = document.getElementById('newDesignName').value.trim(), theme = document.getElementById('newDesignTheme').value, price = parseInt(document.getElementById('newDesignPrice')?.value || '2500', 10) || 0;
  const file = document.getElementById('newDesignImageFile')?.files?.[0];
  if (!name) return showToast('Введите название стиля!', 'error');

  const designId = 'design_' + getServerTime();
  const saveDesignObj = (bgImg) => {
    db.ref(`bankData/cardDesigns/${designId}`).set({ id: designId, name, theme, price, bgImage: bgImg || null, createdAt: serverTimestamp() }).then(() => {
      document.getElementById('newDesignName').value = '';
      showToast(`Стиль «${name}» добавлен!`, 'success');
    });
  };

  if (file) {
    const reader = new FileReader();
    reader.onload = function(evt) {
      const img = new Image();
      img.onload = function() {
        const canvas = document.getElementById('cardBgCanvas');
        let w = img.width, h = img.height;
        if (w > 800) { h = Math.round((h * 800) / w); w = 800; }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        saveDesignObj(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
  } else saveDesignObj(null);
}

export function handleDeleteCardDesign(designId) {
  if (!guardAdminAction(false)) return;
  db.ref(`bankData/cardDesigns/${designId}`).remove().then(() => showToast('Стиль удалён!', 'info'));
}

export function renderTreasuryCardDesigns() {
  const container = document.getElementById('treasuryCardDesignsList');
  if (!container) return;
  const list = Object.values(appData.cardDesigns || {});
  container.innerHTML = list.length === 0
    ? `<div class="col-span-full text-center py-2 text-emerald-500/60 text-xs">Кастомных дизайнов пока нет</div>`
    : list.map(d => `
        <div class="p-2.5 rounded-xl bg-bank-darkest border border-bank-gold/40 flex items-center justify-between text-xs">
          <span class="font-bold text-white truncate">${escapeHtml(d.name)} (<span class="text-bank-gold font-mono">${formatBaity(getDynamicShopPrice(d.id, d.price))}</span>)</span>
          <button onclick="handleDeleteCardDesign('${d.id}')" class="text-rose-400 hover:text-white ml-2"><i class="fa-solid fa-trash"></i></button>
        </div>
      `).join('');
}

export function openCardCustomizerModal() {
  if (guardDemoReadOnly()) return;
  const grid = document.getElementById('citizenAvailableDesignsGrid');
  if (!grid) return;
  grid.innerHTML = '';
  const u = findUser(state.currentUser), currentTheme = (u && u.cardTheme) || 'emerald', currentBg = (u && u.cardBgImage) || '';
  const ownedCards = Array.isArray(u?.ownedCards) ? u.ownedCards : ['emerald'];
  const isAdmin = isCurrentUserAdmin() || isCurrentUserSuperAdmin();

  addDesignOptionToModal(grid, 'Изумрудная Классика', 'emerald', null, currentTheme === 'emerald' && !currentBg);
  BUILTIN_PAID_CARDS_CATALOG.forEach(c => { if (ownedCards.includes(c.id) || isAdmin) addDesignOptionToModal(grid, c.name, c.theme, null, !currentBg && currentTheme === c.theme); });
  Object.values(appData.cardDesigns || {}).forEach(d => {
    if (ownedCards.includes(d.id) || Number(d.price || 0) === 0 || isAdmin) {
      addDesignOptionToModal(grid, d.name, d.theme, d.bgImage, (d.bgImage && currentBg === d.bgImage) || (!d.bgImage && !currentBg && currentTheme === d.theme));
    }
  });
  document.getElementById('cardCustomizerModal').classList.remove('hidden');
  document.getElementById('cardCustomizerModal').classList.add('flex');
}

export function addDesignOptionToModal(container, name, themeKey, bgImage, isSelected) {
  const bgClass = CARD_THEMES[themeKey] || CARD_THEMES.emerald;
  const previewStyle = bgImage ? `background-image: url(${bgImage}); background-size: cover;` : '';
  const item = document.createElement('div');
  item.className = `p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${isSelected ? 'bg-bank-darkest border-bank-gold ring-1 ring-bank-gold shadow-lg' : 'bg-bank-darkest/70 border-bank-border/80 hover:border-bank-gold/40'}`;
  item.innerHTML = `
    <div class="flex items-center gap-3">
      <div class="w-10 h-7 rounded-lg ${!bgImage ? bgClass : ''} border border-bank-gold/50 flex-shrink-0" style="${previewStyle}"></div>
      <div><div class="text-xs font-bold text-white">${escapeHtml(name)}</div><div class="text-[10px] text-emerald-400/70">${isSelected ? 'Активный стиль' : 'Нажмите для выбора'}</div></div>
    </div>
    ${isSelected ? '<i class="fa-solid fa-circle-check text-bank-gold text-base"></i>' : '<span class="text-[10px] text-emerald-300 font-bold">Выбрать</span>'}
  `;
  item.onclick = () => selectCardTheme(themeKey, bgImage, name);
  container.appendChild(item);
}

export function selectCardTheme(themeKey, bgImage, themeName) {
  if (guardDemoReadOnly() || !state.currentUser) return;
  const uKey = normalizeLogin(state.currentUser);
  Promise.all([db.ref(`bankData/users/${uKey}/cardTheme`).set(themeKey), db.ref(`bankData/users/${uKey}/cardBgImage`).set(bgImage || null)]).then(() => {
    applyCardThemeToDOM(themeKey, bgImage);
    closeCardCustomizerModal();
    showToast(`Стиль карточки изменён на «${themeName}»!`, 'success');
  });
}

export function closeCardCustomizerModal() {
  document.getElementById('cardCustomizerModal').classList.add('hidden');
  document.getElementById('cardCustomizerModal').classList.remove('flex');
}

export function setTreasuryMode(mode) {
  state.treasuryMode = mode;
  document.getElementById('btnModeGrant').className = mode === 'grant' ? 'px-2.5 py-1 rounded-lg bg-emerald-600 text-emerald-950 font-bold transition-all' : 'px-2.5 py-1 rounded-lg text-emerald-400 hover:text-white transition-all';
  document.getElementById('btnModeDeduct').className = mode === 'deduct' ? 'px-2.5 py-1 rounded-lg bg-rose-600 text-white font-bold transition-all' : 'px-2.5 py-1 rounded-lg text-rose-400 hover:text-white transition-all';
}

export async function executeTreasuryAction(e) {
  e.preventDefault();
  const btn = document.getElementById('treasurySubmitBtn');
  return withOperationLock('treasury_form_op', btn, async () => {
    if (!guardAdminAction(false)) return;
    const target = document.getElementById('treasuryTargetUser').value.trim();
    const amt = parseInt(document.getElementById('treasuryAmount').value, 10);
    const reason = document.getElementById('treasuryReason').value.trim().slice(0, MAX_COMMENT_LENGTH);
    if (!validPositiveAmount(amt)) return showToast('Введите сумму!', 'error');
    const user = findUser(target);
    if (!user) return showToast('Гражданин не найден!', 'error');

    const txId = newOperationId('TX');
    let actual = amt;
    if (state.treasuryMode === 'grant') {
      if (!await atomicBalanceChange(user.username, amt, { operationId: txId })) return;
      await recordPlayerFinancialStat(user.username, 'income', 'transfersIn', amt);
    } else {
      actual = Math.min(Number(user.balance || 0), amt);
      if (actual <= 0 || !await atomicBalanceChange(user.username, -actual, { requireFunds: true, operationId: txId })) return showToast('Баланс уже 0 ฿!', 'error');
      await addTreasuryTaxOrProfit(actual);
    }

    await db.ref(`bankData/transactions/${txId}`).set({
      id: txId, from: state.treasuryMode === 'grant' ? 'ГОСУДАРСТВЕННОЕ КАЗНАЧЕЙСТВО' : user.username,
      to: state.treasuryMode === 'grant' ? user.username : 'КАЗНА БАНКА МИРОБАЙТ', amount: actual,
      comment: reason || (state.treasuryMode === 'grant' ? 'Государственная эмиссия' : 'Списание казначеем'),
      timestamp: new Date(getServerTime()).toLocaleString('ru-RU'), timestampMs: serverTimestamp()
    });
    showToast(state.treasuryMode === 'grant' ? `+${formatBaity(actual)} → @${user.username}!` : `Списано ${formatBaity(actual)} у @${user.username}!`, 'success');
    document.getElementById('treasuryAmount').value = ''; document.getElementById('treasuryReason').value = '';
  });
}

export async function adminQuickAction(username, val, mode, btnEl = null) {
  return withOperationLock(`quick_${mode}_${username}_${val}`, btnEl, async () => {
    if (!guardAdminAction(false)) return;
    const user = findUser(username);
    if (!user) return;
    const txId = newOperationId('QTX');
    let actual = Number(val);
    if (mode === 'grant') {
      if (!await atomicBalanceChange(user.username, actual, { operationId: txId })) return;
      await recordPlayerFinancialStat(user.username, 'income', 'transfersIn', actual);
    } else {
      actual = Math.min(Number(user.balance || 0), actual);
      if (actual <= 0 || !await atomicBalanceChange(user.username, -actual, { requireFunds: true, operationId: txId })) return showToast('Баланс уже 0 ฿.', 'error');
      await addTreasuryTaxOrProfit(actual);
    }
    await db.ref(`bankData/transactions/${txId}`).set({
      id: txId, from: mode === 'grant' ? 'ГОСУДАРСТВЕННОЕ КАЗНАЧЕЙСТВО' : user.username,
      to: mode === 'grant' ? user.username : 'КАЗНА БАНКА МИРОБАЙТ', amount: actual,
      comment: mode === 'grant' ? 'Быстрое начисление Казначея' : 'Быстрое списание Казначеем',
      timestamp: new Date(getServerTime()).toLocaleString('ru-RU'), timestampMs: serverTimestamp()
    });
    showToast(mode === 'grant' ? `+${formatBaity(actual)} → @${user.username}` : `-${formatBaity(actual)} у @${user.username}`, mode === 'grant' ? 'success' : 'info');
  });
}

export async function fetchUserCredentials(username, fallbackUserObj = null) {
  const key = normalizeLogin(username);
  try {
    const snap = await db.ref(`bankSecurity/credentials/${key}`).once('value');
    const creds = snap.val();
    if (creds && creds.passwordHash && creds.passwordSalt) return creds;
  } catch (e) {}
  const fallback = fallbackUserObj || findUser(username);
  if (fallback) {
    if (fallback.passwordHash && fallback.passwordSalt) {
      return { passwordHash: fallback.passwordHash, passwordSalt: fallback.passwordSalt, passwordVersion: fallback.passwordVersion || 1, _isLegacy: true };
    }
    if (typeof fallback.password === 'string') {
      return { plainPassword: fallback.password, _isPlainLegacy: true };
    }
  }
  return null;
}

export async function verifyPasswordRecord(credentials, inputPassword) {
  if (!credentials || typeof inputPassword !== 'string') return false;
  if (credentials._isPlainLegacy) return timingSafeEqualString(credentials.plainPassword, inputPassword);
  if (credentials.passwordHash && credentials.passwordSalt) {
    const hash = await derivePasswordHash(inputPassword, credentials.passwordSalt);
    return timingSafeEqualString(hash, credentials.passwordHash);
  }
  return false;
}

export async function migrateUserCredentialsToSecureNode(username, password) {
  const key = normalizeLogin(username);
  const record = await createPasswordRecord(password, serverTimestamp());
  await db.ref(`bankSecurity/credentials/${key}`).set(record);
  await db.ref(`bankData/users/${key}/password`).remove();
  await db.ref(`bankData/users/${key}/passwordHash`).remove();
  await db.ref(`bankData/users/${key}/passwordSalt`).remove();
  await db.ref(`bankData/users/${key}/passwordVersion`).remove();
}

export async function handleManageAdminAccess(e) {
  e.preventDefault();
  const btn = document.getElementById('accessConfirmBtn');
  return withOperationLock('owner_manage_access', btn, async () => {
    if (!isCurrentUserOwner()) return showToast('Только Владелец Банка (Iosif)!', 'error');
    const targetUser = document.getElementById('accessTargetUser').value.trim(), action = document.getElementById('accessActionSelect').value, passConfirm = document.getElementById('accessAdminPasswordConfirm').value;
    const ownerUser = getSystemOwner();
    if (!ownerUser) return;
    const ownerCreds = await fetchUserCredentials(ownerUser.username, ownerUser);
    if (!(await verifyPasswordRecord(ownerCreds, passConfirm))) return showToast('Неверный пароль Владельца!', 'error');
    const target = findUser(targetUser);
    if (!target) return showToast(`Гражданин @${targetUser} не найден!`, 'error');
    const targetKey = normalizeLogin(target.username);
    if (targetKey === OWNER_USERNAME) return showToast('Права Владельца неприкосновенны!', 'error');

    if (action === 'grant_treasury') await db.ref(`bankData/users/${targetKey}/isAdmin`).set(true);
    else if (action === 'revoke_treasury') await db.ref(`bankData/users/${targetKey}/isAdmin`).set(false);
    else if (action === 'grant_superadmin') await db.ref(`bankData/users/${targetKey}/isSuperAdmin`).set(true);
    else if (action === 'revoke_superadmin') await db.ref(`bankData/users/${targetKey}/isSuperAdmin`).set(false);

    document.getElementById('accessAdminPasswordConfirm').value = '';
    showToast(`Полномочия @${target.username} обновлены!`, 'success');
  });
}

export async function executeSanctionAction(action, btnEl = null) {
  return withOperationLock(`sanction_${action}`, btnEl, async () => {
    if (!guardAdminAction(true)) return;
    const targetInput = document.getElementById('sanctionTargetUser'), targetName = targetInput.value.trim();
    const user = findUser(targetName);
    if (!user) return showToast('Гражданин не найден!', 'error');
    if (normalizeLogin(user.username) === OWNER_USERNAME || user.isOwner) return showToast('Аккаунт Владельца защищён!', 'error');
    const uKey = normalizeLogin(user.username);
    if (action === 'zero') await adminZeroUserDirect(user.username);
    else if (action === 'toggleBlock') adminToggleBlockDirect(user.username);
    else if (action === 'toggleHide') adminToggleHideDirect(user.username);
    else if (action === 'delete') {
      const ok = await askRoyalConfirm({ title: 'Удаление счёта', message: `Безвозвратно удалить аккаунт @${user.username}?`, okText: 'Удалить', isDanger: true });
      if (!ok) return;
      await db.ref(`bankData/users/${uKey}`).remove();
      await db.ref(`bankSecurity/credentials/${uKey}`).remove();
      targetInput.value = '';
      showToast(`Аккаунт @${user.username} удалён!`, 'success');
    }
  });
}

export function promptEditBankReserve() {
  if (!guardAdminAction(false)) return;
  document.getElementById('inputBankReserveAmount').value = Math.round(appData.bankReserve || 0);
  document.getElementById('bankReserveModal').classList.remove('hidden');
  document.getElementById('bankReserveModal').classList.add('flex');
}
export function closeBankReserveModal() { document.getElementById('bankReserveModal').classList.add('hidden'); document.getElementById('bankReserveModal').classList.remove('flex'); }
export function saveBankReserve(e) {
  e.preventDefault();
  if (!guardAdminAction(false)) return;
  const val = parseInt(document.getElementById('inputBankReserveAmount').value, 10);
  if (!isNaN(val) && val >= 0) db.ref('bankData/bankReserve').set(val).then(() => { closeBankReserveModal(); showToast(`Казна: ${formatBaity(val)}`, 'success'); });
}

export function promptEditMoneySupply() {
  if (!guardAdminAction(false)) return;
  const currentMass = appData.customMoneySupply !== null ? appData.customMoneySupply : Object.values(appData.users).reduce((s, u) => s + (u.balance || 0), 0);
  document.getElementById('inputCustomMoneySupply').value = currentMass;
  document.getElementById('moneySupplyModal').classList.remove('hidden');
  document.getElementById('moneySupplyModal').classList.add('flex');
}
export function closeMoneySupplyModal() { document.getElementById('moneySupplyModal').classList.add('hidden'); document.getElementById('moneySupplyModal').classList.remove('flex'); }
export function saveCustomMoneySupply(e) {
  e.preventDefault();
  if (!guardAdminAction(false)) return;
  const val = parseInt(document.getElementById('inputCustomMoneySupply').value, 10);
  if (!isNaN(val) && val >= 0) db.ref('bankData/customMoneySupply').set(val).then(() => { closeMoneySupplyModal(); showToast(`Денежная масса: ${formatBaity(val)}`, 'success'); });
}
export function resetMoneySupplyToAuto() {
  if (!guardAdminAction(false)) return;
  db.ref('bankData/customMoneySupply').set(null).then(() => showToast('Денежная масса в авто-режиме', 'info'));
}

export function setAuthMode(m) {
  state.authMode = m;
  document.getElementById('authTabLogin').className = m === 'login' ? 'tap-btn flex-1 pb-2 text-xs sm:text-sm font-semibold border-b-2 border-bank-gold text-bank-gold' : 'tap-btn flex-1 pb-2 text-xs sm:text-sm font-semibold border-b-2 border-transparent text-emerald-400/60';
  document.getElementById('authTabRegister').className = m === 'register' ? 'tap-btn flex-1 pb-2 text-xs sm:text-sm font-semibold border-b-2 border-bank-gold text-bank-gold' : 'tap-btn flex-1 pb-2 text-xs sm:text-sm font-semibold border-b-2 border-transparent text-emerald-400/60';
  const startBal = Number(appData.settings?.economy?.startBalance ?? 50);
  document.getElementById('authSubmitBtn').innerText = m === 'login' ? 'Войти в Личный Кабинет' : `Создать счёт (+${startBal} ฿)`;
  document.getElementById('authPassStrengthBox')?.classList.toggle('hidden', m !== 'register');
}

export function updateAuthPasswordStrength() {
  const box = document.getElementById('authPassStrengthBox');
  if (!box || state.authMode !== 'register') return;
  const pass = document.getElementById('inputPassword').value;
  const user = document.getElementById('inputUsername').value;
  const res = evaluatePasswordStrength(pass, user);
  const bar = document.getElementById('authPassStrengthBar');
  const txt = document.getElementById('authPassStrengthText');
  if (bar) { bar.style.width = `${res.score}%`; bar.className = `h-full transition-all duration-300 ${res.color}`; }
  if (txt) txt.innerText = res.label;
}

export function updateSettingsPasswordStrength() {
  const pass = document.getElementById('inputNewPassword')?.value || '';
  const lbl = document.getElementById('settingsPassStrengthLabel');
  if (!lbl) return;
  if (!pass) { lbl.innerText = 'Рекомендуется использовать буквы и цифры'; return; }
  const res = evaluatePasswordStrength(pass, state.currentUser || '');
  lbl.innerText = `Надёжность: ${res.label}`;
  lbl.className = `text-[10px] font-semibold ${res.valid ? 'text-emerald-400' : 'text-rose-400'}`;
}

const AUTH_RATE_LIMIT = { maxAttempts: 5, baseLockMs: 30000 };
function getRateLimitState(scopeKey) {
  try { return JSON.parse(sessionStorage.getItem(`mb_rl_${scopeKey}`) || '{"fails":0,"lockUntil":0}'); }
  catch (e) { return { fails: 0, lockUntil: 0 }; }
}
function checkRateLimitAllowed(scopeKey) {
  const st = getRateLimitState(scopeKey);
  const now = getServerTime();
  if (st.lockUntil && now < st.lockUntil) {
    const waitSec = Math.ceil((st.lockUntil - now) / 1000);
    showToast(`Защита от перебора: подождите ${waitSec} сек.`, 'error');
    return false;
  }
  return true;
}
function recordAuthFailure(scopeKey) {
  const st = getRateLimitState(scopeKey);
  st.fails = (st.fails || 0) + 1;
  if (st.fails >= AUTH_RATE_LIMIT.maxAttempts) {
    const multiplier = Math.min(8, Math.pow(2, st.fails - AUTH_RATE_LIMIT.maxAttempts));
    st.lockUntil = getServerTime() + AUTH_RATE_LIMIT.baseLockMs * multiplier;
  }
  try { sessionStorage.setItem(`mb_rl_${scopeKey}`, JSON.stringify(st)); } catch (e) {}
}
function resetAuthFailures(scopeKey) {
  try { sessionStorage.removeItem(`mb_rl_${scopeKey}`); } catch (e) {}
}

export async function processAuthForm(e) {
  e.preventDefault();
  state.isDemoMode = false;
  const btn = document.getElementById('authSubmitBtn');
  return withOperationLock('auth_submit', btn, async () => {
    const u = document.getElementById('inputUsername').value.trim(), p = document.getElementById('inputPassword').value;
    if (!u || !p) return showToast('Заполните логин и пароль!', 'error');
    if (u.length > MAX_LOGIN_LENGTH || !/^[\p{L}\p{N}_.-]+$/u.test(u)) return showToast('Некорректный логин!', 'error');
    const rateKey = `login_${normalizeLogin(u)}`;
    if (!checkRateLimitAllowed(rateKey)) return;

    const existing = findUser(u);
    if (state.authMode === 'login') {
      if (!existing) { recordAuthFailure(rateKey); return showToast('Гражданин не найден!', 'error'); }
      if (existing.isBlocked && normalizeLogin(existing.username) !== OWNER_USERNAME) return showToast('Ваш счёт заблокирован (Долговая Тюрьма)!', 'error');
      const creds = await fetchUserCredentials(existing.username, existing);
      if (await verifyPasswordRecord(creds, p)) {
        resetAuthFailures(rateKey);
        if (creds._isLegacy || creds._isPlainLegacy || existing.passwordHash || existing.password) {
          try { await migrateUserCredentialsToSecureNode(existing.username, p); } catch (err) {}
        }
        state.currentUser = existing.username;
        localStorage.setItem('mirobyte_active_user', state.currentUser);
        renderCurrentView();
        showToast(`Добро пожаловать, ${state.currentUser}!`, 'success');
      } else { recordAuthFailure(rateKey); showToast('Неверный логин или пароль!', 'error'); }
    } else {
      if (existing) return showToast('Логин уже занят!', 'error');
      const strength = evaluatePasswordStrength(p, u);
      if (!strength.valid) return showToast(strength.label, 'error');
      const key = normalizeLogin(u), isOwnerAcc = (key === OWNER_USERNAME.toLowerCase());
      const startBal = Number(appData.settings?.economy?.startBalance ?? 50);
      const passwordRecord = await createPasswordRecord(p, serverTimestamp());
      await db.ref(`bankSecurity/credentials/${key}`).set(passwordRecord);
      const now = getServerTime();
      const createResult = await runTransaction(db.ref(`bankData/users/${key}`), existingValue => {
        if (existingValue !== null) return;
        return {
          username: u, balance: isOwnerAcc ? 100000 : startBal, isAdmin: isOwnerAcc, isSuperAdmin: isOwnerAcc, isOwner: isOwnerAcc,
          registeredAt: new Date(now).toLocaleDateString('ru-RU'),
          customStatus: isOwnerAcc ? 'Создатель и Владелец Банка' : 'Полноправный гражданин',
          cardTheme: 'emerald', isBlocked: false, hiddenFromAll: false,
          taxCycleStartMs: now, lastTaxBillMs: now, lastCarWearCheckMs: Date.now()
        };
      });
      if (!createResult.committed) return showToast('Логин уже занят!', 'error');
      state.currentUser = u;
      localStorage.setItem('mirobyte_active_user', state.currentUser);
      renderCurrentView();
      showToast(`Счёт открыт (+${startBal} ฿)!`, 'success');
    }
  });
}

export async function executeTransfer(e) {
  e.preventDefault();
  const btn = document.getElementById('transferSubmitBtn');
  return withOperationLock('transfer_execute', btn, async () => {
    const to = document.getElementById('transferTarget').value.trim();
    const amt = parseInt(document.getElementById('transferAmount').value, 10);
    const comment = document.getElementById('transferComment').value.trim().slice(0, MAX_COMMENT_LENGTH);
    const isProxy = document.getElementById('proxyTransferCheck').checked;
    if (!validPositiveAmount(amt)) return showToast('Введите корректную сумму!', 'error');
    const recipient = findUser(to);
    if (!recipient) return showToast('Получатель не найден!', 'error');
    let sender = findUser(state.currentUser);
    if (!sender) return;

    if (isProxy) {
      const pLog = document.getElementById('proxySenderLogin').value.trim(), pPass = document.getElementById('proxySenderPassword').value;
      const pUser = findUser(pLog);
      if (!pUser) return showToast('Плательщик не найден!', 'error');
      const creds = await fetchUserCredentials(pUser.username, pUser);
      if (!(await verifyPasswordRecord(creds, pPass))) return showToast('Неверный пароль плательщика!', 'error');
      sender = pUser;
    }

    if (sender.isBlocked || recipient.isBlocked) return showToast('Счёт заблокирован!', 'error');
    if (normalizeLogin(sender.username) === normalizeLogin(recipient.username)) return showToast('Нельзя перевести самому себе!', 'error');

    const opId = newOperationId('TX');
    if (!await atomicBalanceChange(sender.username, -amt, { requireFunds: true, operationId: `${opId}_DEBIT` })) return showToast('Недостаточно Байти!', 'error');
    await atomicBalanceChange(recipient.username, amt, { operationId: `${opId}_CREDIT` });

    await recordPlayerFinancialStat(sender.username, 'expense', 'transfersOut', amt);
    await recordPlayerFinancialStat(recipient.username, 'income', 'transfersIn', amt);

    saveRecentRecipient(recipient.username);
    const now = getServerTime();
    const tx = { id: opId, from: sender.username, to: recipient.username, amount: amt, comment: comment || 'Перевод средств', timestamp: new Date(now).toLocaleString('ru-RU'), timestampMs: serverTimestamp() };
    await db.ref(`bankData/transactions/${tx.id}`).set(tx);
    addSystemMessage(recipient.username, 'Поступление перевода', `Вам поступил перевод +${formatBaity(amt)} от @${sender.username}. ${tx.comment}`);
    showToast(`Переведено ${formatBaity(amt)} → @${recipient.username}!`, 'success');
    document.getElementById('transferAmount').value = ''; document.getElementById('transferComment').value = '';
  });
}

export function calculateMailCost() {
  const len = (document.getElementById('mailText')?.value || '').length;
  document.getElementById('charCountLabel').innerText = `${len} симв.`;
  const btn = document.getElementById('submitMailBtn'), badge = document.getElementById('calculatedCostBadge');
  if (len < 10) { badge.innerText = 'Минимум 10 симв.'; btn.disabled = true; return 0; }
  if (len <= 100) { badge.innerText = '1 Байти (฿)'; btn.disabled = false; return 1; }
  badge.innerText = '10 Байти (฿)'; btn.disabled = false; return 10;
}

export async function sendMailMessage(e) {
  e.preventDefault();
  const btn = document.getElementById('submitMailBtn');
  return withOperationLock('send_mail_op', btn, async () => {
    const to = (document.getElementById('mailRecipient').value || state.activeTelegraphPeer || '').trim();
    let txt = document.getElementById('mailText').value.trim();
    if (userPrefs.autoOldRus && !txt.startsWith('📜')) txt = transformToModernOldRussian(txt, to, 'boyar');
    const cost = calculateMailCost();
    if (cost <= 0) return;
    const recipient = findUser(to), sender = findUser(state.currentUser);
    if (!sender || sender.isBlocked || !recipient || (sender.balance || 0) < cost) return showToast('Проверьте получателя и баланс!', 'error');

    const mailId = newOperationId('MAIL');
    if (!await atomicBalanceChange(sender.username, -cost, { requireFunds: true, operationId: mailId })) return;
    await addTreasuryTaxOrProfit(cost);
    saveRecentRecipient(recipient.username);
    const now = Date.now();
    await db.ref(`bankData/mailBox/${mailId}`).set({
      id: mailId, from: sender.username, to: recipient.username, text: txt, cost,
      timestamp: new Date(getServerTime()).toLocaleString('ru-RU'),
      createdAtMs: now,
      timestampMs: now
    });
    addSystemMessage(recipient.username, 'Новая телеграмма', `Вам пришла депеша от @${sender.username}.`);
    showToast(`Телеграмма отправлена @${recipient.username}!`, 'success');
    state.activeTelegraphPeer = recipient.username;
    state.mailFilter = 'dialog';
    document.getElementById('mailText').value = '';
    calculateMailCost();
    renderMailView();
  });
}

export async function executeStateFine(e) {
  e.preventDefault();
  const btn = document.getElementById('fineSubmitBtn');
  return withOperationLock('state_fine_op', btn, async () => {
    if (!guardAdminAction(false)) return;
    const target = document.getElementById('fineTargetUser').value.trim();
    const amt = parseInt(document.getElementById('fineAmount').value, 10);
    const reason = document.getElementById('fineReason').value.trim();
    const user = findUser(target);
    if (!user || !validPositiveAmount(amt)) return showToast('Проверьте логин и сумму штрафа!', 'error');

    const curBal = Math.max(0, Number(user.balance || 0));
    const actualFine = Math.min(curBal, amt);
    const unpaidDebt = Math.max(0, amt - actualFine);
    const txId = newOperationId('FINE');

    if (actualFine > 0) {
      await atomicBalanceChange(user.username, -actualFine, { requireFunds: true, operationId: txId });
      await addTreasuryTaxOrProfit(actualFine);
      await db.ref(`bankData/transactions/${txId}`).set({
        id: txId, from: user.username, to: 'КАЗНА БАНКА МИРОБАЙТ', amount: actualFine,
        comment: `Штраф: ${reason}`, timestamp: new Date(getServerTime()).toLocaleString('ru-RU'), timestampMs: serverTimestamp()
      });
    }

    if (unpaidDebt > 0) {
      const loanId = newOperationId('FINELOAN');
      const totalWithPenalty = Math.round(unpaidDebt * 1.05);
      await db.ref(`bankData/loans/${loanId}`).set({
        id: loanId, borrower: user.username, principal: unpaidDebt, interestPct: 5, totalRepay: totalWithPenalty,
        remainingAmount: totalWithPenalty, installmentsTotal: 4, installmentsPaid: 0, isInstallmentTaxNote: true,
        dueAtMs: getServerTime() + TAX_DECLARATION_PERIOD_MS,
        reason: `⚖️ Гос. долговая расписка по штрафу (${reason})`, issuedBy: state.currentUser,
        createdAt: new Date(getServerTime()).toLocaleString('ru-RU'), createdAtMs: Date.now(), status: 'active'
      });
      addSystemMessage(user.username, '🚨 Взыскание Штрафа и Расписка!', `Списано ${formatBaity(actualFine)}, а на остаток оформлена Долговая Расписка (${formatBaity(totalWithPenalty)}) на 72 часа.`);
      showToast(`Списано ${formatBaity(actualFine)} + оформлена расписка ${formatBaity(totalWithPenalty)} на @${user.username}!`, 'info');
    } else {
      addSystemMessage(user.username, '⚖️ Взыскан Государственный Штраф', `С вашего счёта взыскан штраф ${formatBaity(actualFine)} (${reason}).`);
      showToast(`Штраф ${formatBaity(actualFine)} полностью взыскан с @${user.username}!`, 'info');
    }
    document.getElementById('fineAmount').value = '';
    document.getElementById('fineReason').value = '';
  });
}

export function processAssignStatus(e) {
  e.preventDefault();
  const btn = document.getElementById('statusAssignSubmitBtn');
  return withOperationLock('assign_status_op', btn, async () => {
    if (!guardAdminAction(false)) return;
    const target = document.getElementById('statusTargetUser').value.trim(), st = document.getElementById('statusNewValue').value.trim();
    const user = findUser(target);
    if (!user || !st) return showToast('Гражданин не найден!', 'error');
    await db.ref(`bankData/users/${normalizeLogin(user.username)}/customStatus`).set(st);
    showToast(`Титул @${user.username} обновлён: «${st}»!`, 'success');
    document.getElementById('statusTargetUser').value = ''; document.getElementById('statusNewValue').value = '';
  });
}

export function openBanknoteManagerModal() {
  if (!guardAdminAction(false)) return;
  document.getElementById('banknoteManagerModal').classList.remove('hidden');
  document.getElementById('banknoteManagerModal').classList.add('flex');
}
export function closeBanknoteManagerModal() {
  document.getElementById('banknoteManagerModal').classList.add('hidden');
  document.getElementById('banknoteManagerModal').classList.remove('flex');
}
export function handleSaveBanknoteImage() {
  if (!guardAdminAction(false)) return;
  const denom = document.getElementById('bmDenomSelect').value;
  const file = document.getElementById('bmFileInput')?.files?.[0];
  if (!file) return showToast('Выберите файл купюры!', 'error');

  const reader = new FileReader();
  reader.onload = function(evt) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.getElementById('banknoteCanvas');
      let w = img.width, h = img.height;
      if (w > 720) { h = Math.round((h * 720) / w); w = 720; }
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.84);
      db.ref(`bankData/banknoteImages/${denom}`).set(dataUrl).then(() => {
        closeBanknoteManagerModal();
        showToast(`Дизайн купюры ${denom} ฿ сохранён!`, 'success');
      });
    };
    img.src = evt.target.result;
  };
  reader.readAsDataURL(file);
}

export function handleSaveBankEmblem() {
  if (!guardAdminAction(false)) return;
  const file = document.getElementById('bankEmblemFileInput')?.files?.[0];
  if (!file) return showToast('Выберите файл герба!', 'error');
  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.getElementById('emblemCanvas'); canvas.width = 192; canvas.height = 192;
      const sSize = Math.min(img.width, img.height);
      canvas.getContext('2d').drawImage(img, (img.width - sSize) / 2, (img.height - sSize) / 2, sSize, sSize, 0, 0, 192, 192);
      const compressed = canvas.toDataURL('image/png');
      Promise.all([
        db.ref('bankData/bankEmblemImage').set(compressed),
        db.ref('bankData/settings/appIcon').set(compressed),
        db.ref('settings/appIcon').set(compressed)
      ]).then(() => {
        applyDynamicSiteIconAndManifest(compressed);
        showToast('Герб Банка и динамическая иконка сайта обновлены!', 'success');
      });
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

export function handleResetBankEmblem() {
  if (!guardAdminAction(false)) return;
  Promise.all([
    db.ref('bankData/bankEmblemImage').set(null),
    db.ref('bankData/settings/appIcon').set(null),
    db.ref('settings/appIcon').set(null)
  ]).then(() => {
    applyDynamicSiteIconAndManifest(null);
    showToast('Эмблема и иконка сброшены на ฿!', 'info');
  });
}

export function openSettingsModal() {
  if (guardDemoReadOnly()) return;
  if (!state.currentUser) return;
  const u = findUser(state.currentUser);
  const prev = document.getElementById('settingsAvatarPreview');
  const cornerBadge = document.getElementById('settingsAvatarCornerEmoji');
  if (prev && u) {
    prev.className = `w-11 h-11 rounded-xl ${getAvatarFrameClass(u.avatarFrame)} overflow-hidden bg-black flex items-center justify-center`;
    prev.innerHTML = u.avatar ? `<img src="${u.avatar}" class="w-full h-full object-cover">` : `<i class="fa-solid fa-user text-bank-gold"></i>`;
    const emoji = getAvatarFrameCornerEmoji(u.avatarFrame);
    if (cornerBadge) {
      if (emoji) { cornerBadge.innerText = emoji; cornerBadge.classList.remove('hidden'); }
      else cornerBadge.classList.add('hidden');
    }
  }
  const cUnits = document.getElementById('prefAutoConvertUnits');
  const c1 = document.getElementById('prefAutoOldRus');
  const c2 = document.getElementById('prefShowXYGrid');
  if (cUnits) cUnits.checked = !!userPrefs.autoConvertUnits;
  if (c1) c1.checked = !!userPrefs.autoOldRus;
  if (c2) c2.checked = userPrefs.showXYGrid !== false;

  document.getElementById('settingsModal').classList.remove('hidden');
  document.getElementById('settingsModal').classList.add('flex');
}

export function closeSettingsModal() {
  document.getElementById('settingsModal').classList.add('hidden');
  document.getElementById('settingsModal').classList.remove('flex');
}

export function saveUserLocalPrefs() {
  if (guardDemoReadOnly()) return;
  userPrefs.autoConvertUnits = !!document.getElementById('prefAutoConvertUnits')?.checked;
  userPrefs.autoOldRus = !!document.getElementById('prefAutoOldRus')?.checked;
  userPrefs.showXYGrid = !!document.getElementById('prefShowXYGrid')?.checked;
  localStorage.setItem('mb_pref_auto_convert_units', String(userPrefs.autoConvertUnits));
  localStorage.setItem('mb_pref_auto_oldrus', String(userPrefs.autoOldRus));
  localStorage.setItem('mb_pref_xy_grid', String(userPrefs.showXYGrid));
  requestRender();
  showToast('Настройки сохранены!', 'info');
}

export function triggerAvatarSelect() {
  if (guardDemoReadOnly()) return;
  document.getElementById('avatarFileInput')?.click();
}

export function handleAvatarSelected(e) {
  if (guardDemoReadOnly()) return;
  const file = e.target.files?.[0];
  e.target.value = '';
  if (!file || !state.currentUser) return;
  if (file.size > MAX_IMAGE_BYTES) return showToast('Файл больше 5 МБ!', 'error');

  const reader = new FileReader();
  reader.onload = function(evt) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.getElementById('avatarCanvas');
      const size = 180;
      canvas.width = size; canvas.height = size;
      const minSide = Math.min(img.width, img.height);
      canvas.getContext('2d').drawImage(img, (img.width - minSide) / 2, (img.height - minSide) / 2, minSide, minSide, 0, 0, size, size);
      const compressed = canvas.toDataURL('image/jpeg', 0.85);
      db.ref(`bankData/users/${normalizeLogin(state.currentUser)}/avatar`).set(compressed).then(() => {
        const prev = document.getElementById('settingsAvatarPreview');
        if (prev) prev.innerHTML = `<img src="${compressed}" class="w-full h-full object-cover">`;
        showToast('Аватар обновлён!', 'success');
      });
    };
    img.src = evt.target.result;
  };
  reader.readAsDataURL(file);
}

export async function processChangeNickname(e, btnEl = null) {
  if (e) e.preventDefault();
  return withOperationLock('change_nick_op', btnEl, async () => {
    if (!state.currentUser) return;
    const newNick = (document.getElementById('inputNewNickname')?.value || '').trim();
    const pass = document.getElementById('inputNickConfirmPassword')?.value || '';
    if (!newNick || !pass) return showToast('Заполните новый логин и пароль!', 'error');
    if (newNick.length > MAX_LOGIN_LENGTH || !/^[\p{L}\p{N}_.-]+$/u.test(newNick)) return showToast('Некорректный формат имени!', 'error');
    if (normalizeLogin(state.currentUser) === OWNER_USERNAME) return showToast('Логин Создателя и Владельца Банка (Iosif) неизменен!', 'error');
    if (findUser(newNick)) return showToast('Этот логин уже занят!', 'error');

    const u = findUser(state.currentUser);
    if (!u || (u.balance || 0) < 150) return showToast('Для смены никнейма требуется 150 ฿!', 'error');

    const oldKey = normalizeLogin(u.username), newKey = normalizeLogin(newNick);
    const creds = await fetchUserCredentials(u.username, u);
    if (!(await verifyPasswordRecord(creds, pass))) return showToast('Неверный текущий пароль!', 'error');

    const opId = newOperationId('NICK');
    if (!await atomicBalanceChange(u.username, -150, { requireFunds: true, operationId: opId })) return;
    await addTreasuryTaxOrProfit(150);

    const updatedUser = { ...u, username: newNick, balance: Math.max(0, (u.balance || 150) - 150) };
    await db.ref(`bankSecurity/credentials/${newKey}`).set(creds);
    await db.ref(`bankData/users/${newKey}`).set(updatedUser);
    await db.ref(`bankData/users/${oldKey}`).remove();
    await db.ref(`bankSecurity/credentials/${oldKey}`).remove();

    state.currentUser = newNick;
    localStorage.setItem('mirobyte_active_user', state.currentUser);
    closeSettingsModal();
    showToast(`Ваш никнейм изменён на @${newNick}!`, 'success');
  });
}

export async function processPasswordChange(e, btnEl = null) {
  if (e) e.preventDefault();
  return withOperationLock('change_pass_op', btnEl, async () => {
    if (!state.currentUser) return;
    const oldPass = document.getElementById('inputOldPassword')?.value || '', newPass = document.getElementById('inputNewPassword')?.value || '';
    if (!oldPass || !newPass) return showToast('Введите текущий и новый пароль!', 'error');
    const strength = evaluatePasswordStrength(newPass, state.currentUser);
    if (!strength.valid) return showToast(strength.label, 'error');
    const u = findUser(state.currentUser);
    const creds = await fetchUserCredentials(state.currentUser, u);
    if (!(await verifyPasswordRecord(creds, oldPass))) return showToast('Текущий пароль введён неверно!', 'error');
    const newRecord = await createPasswordRecord(newPass, serverTimestamp());
    await db.ref(`bankSecurity/credentials/${normalizeLogin(state.currentUser)}`).set(newRecord);
    document.getElementById('inputOldPassword').value = ''; document.getElementById('inputNewPassword').value = '';
    showToast('Пароль успешно обновлён!', 'success');
  });
}

export function handleLogout() {
  state.isDemoMode = false;
  state.currentUser = null;
  localStorage.removeItem('mirobyte_active_user');
  localStorage.removeItem('mirobyte_cached_profile');
   document.getElementById('demoModeActiveBanner')?.classList.add('hidden');
   closeSettingsModal();
  navigateRoute('/');
  renderCurrentView();
  showToast('Вы вышли из личного кабинета.', 'info');
}

export function openMessagesModal() {
  if (!state.currentUser) return;
  const low = state.currentUser.toLowerCase();
  const myMsgs = (appData.messages || []).filter(m => m.to && m.to.toLowerCase() === low);
  const box = document.getElementById('messagesListContainer');
  if (box) {
    box.innerHTML = myMsgs.length === 0
      ? `<div class="text-center py-6 text-emerald-500/60 text-xs">Уведомлений пока нет</div>`
      : myMsgs.map(m => `
          <div class="p-3 rounded-2xl bg-bank-darkest border ${m.read ? 'border-bank-border/60' : 'border-bank-gold'} space-y-1">
            <div class="flex justify-between text-[10px] text-emerald-400">
              <span class="font-bold text-bank-gold">${escapeHtml(m.title)}</span>
              <span>${escapeHtml(m.timestamp || '')}</span>
            </div>
            <p class="text-xs text-emerald-100">${escapeHtml(m.text)}</p>
          </div>
        `).join('');
  }
  if (!state.isDemoMode) {
    myMsgs.forEach(m => { if (!m.read && m._dbKey) db.ref(`bankData/messages/${m._dbKey}/read`).set(true); });
  }
  document.getElementById('messagesModal').classList.remove('hidden');
  document.getElementById('messagesModal').classList.add('flex');
}

export function closeMessagesModal() {
  document.getElementById('messagesModal').classList.add('hidden');
  document.getElementById('messagesModal').classList.remove('flex');
}

export function clearUserMessages() {
  if (guardDemoReadOnly() || !state.currentUser) return;
  const low = state.currentUser.toLowerCase(), updates = {};
  (appData.messages || []).forEach(m => { if (m.to && m.to.toLowerCase() === low && m._dbKey) updates[`bankData/messages/${m._dbKey}`] = null; });
  db.ref().update(updates).then(() => { closeMessagesModal(); showToast('Уведомления очищены!', 'info'); });
}

export function openStatsModal() {
  if (!state.currentUser) return;
  const u = findUser(state.currentUser);
  if (!u) return;
  document.getElementById('statsModal').classList.remove('hidden');
  document.getElementById('statsModal').classList.add('flex');
  setTimeout(() => drawBalanceHistoryChart(u), 30);
}

export function closeStatsModal() {
  document.getElementById('statsModal').classList.add('hidden');
  document.getElementById('statsModal').classList.remove('flex');
}

export function toggleProxySection() {
  const chk = document.getElementById('proxyTransferCheck'), box = document.getElementById('proxyFieldsContainer');
  if (box && chk) box.classList.toggle('hidden', !chk.checked);
}

export function togglePassVisibility(inputId, iconId) {
  const inp = document.getElementById(inputId), icon = document.getElementById(iconId);
  if (!inp) return;
  inp.type = inp.type === 'password' ? 'text' : 'password';
  if (icon) icon.className = inp.type === 'password' ? 'fa-solid fa-eye text-xs' : 'fa-solid fa-eye-slash text-xs';
}

// -------------------------------------------------------------------------
// 13. ГИДРАТАЦИЯ КЭША, СЛУШАТЕЛИ FIREBASE И ПРОБРОС В WINDOW
// -------------------------------------------------------------------------
async function hydrateFromMirobyteCache() {
  try {
    const [cachedUsers, cachedBanknotes, cachedCardDesigns, cachedEmblem, cachedMarketAssets, cachedMarketListings, cachedTxs, cachedSettings] = await Promise.all([
      MirobyteCache.get('users'), MirobyteCache.get('banknoteImages'), MirobyteCache.get('cardDesigns'),
      MirobyteCache.get('bankEmblemImage'), MirobyteCache.get('marketAssets'), MirobyteCache.get('marketListings'),
      MirobyteCache.get('transactions'), MirobyteCache.get('settings')
    ]);
    if (cachedUsers && typeof cachedUsers === 'object') appData.users = cachedUsers;
    if (cachedBanknotes && typeof cachedBanknotes === 'object') appData.banknoteImages = cachedBanknotes;
    if (cachedCardDesigns && typeof cachedCardDesigns === 'object') appData.cardDesigns = cachedCardDesigns;
    if (cachedEmblem) appData.bankEmblemImage = cachedEmblem;
    if (cachedMarketAssets && typeof cachedMarketAssets === 'object') appData.marketAssets = cachedMarketAssets;
    if (cachedMarketListings && typeof cachedMarketListings === 'object') appData.marketListings = cachedMarketListings;
    if (Array.isArray(cachedTxs)) appData.transactions = cachedTxs;
    if (cachedSettings && typeof cachedSettings === 'object') {
      appData.settings = {
        economy: { ...DEFAULT_SETTINGS.economy, ...(cachedSettings.economy || {}) },
        business: { ...DEFAULT_SETTINGS.business, ...(cachedSettings.business || {}), catalog: mergeBusinessCatalogWithDefaults(cachedSettings.business?.catalog) },
        casino: { ...DEFAULT_SETTINGS.casino, ...(cachedSettings.casino || {}) },
        shopPrices: cachedSettings.shopPrices || {},
        activeEvent: cachedSettings.activeEvent || null,
        appIcon: cachedSettings.appIcon || null
      };
    }
    renderBankEmblem();
    applyDynamicSiteIconAndManifest(appData.settings?.appIcon || appData.bankEmblemImage);
    renderBanknotes();
    renderGlobalActiveEventBanner();
    requestRender();
  } catch (e) {}
}

// Связываем Core и UI
const CoreExport = {
  db, state, appData, userPrefs, minesState, MirobyteCache,
  getServerTime, serverTimestamp, findUser, createDemoGuestProfile,
  guardDemoReadOnly, isCurrentUserOwner, isCurrentUserAdmin, isCurrentUserSuperAdmin,
  getEffectiveTaxPercent, getBusinessCatalog, getUnreadMessagesCount,
  checkAndFinalizeCompletedUpgrades, getUserPolygonDailyEarned, clickMinesTile,
  switchMarketSubTab, openPlayerPublicProfileModal, openBanknoteModal,
  performLazyTelegraphCleanup, renderAdminUsersCompactCards, populateAdminShopPriceEditor,
  renderTreasuryCardDesigns, populateCalibrationForm, renderAdminLoansList,
  renderAdminBusinessConfigInputs, renderAdminTopMagnates, populateAdminCasinoForm,
  renderAdminSecurityLogs, renderAdminTransactionsTable, renderAdminAllMailsView
};
bindCoreToUI(CoreExport);

// Мгновенный старт из кэша
renderBankEmblem();
applyDynamicSiteIconAndManifest(appData.bankEmblemImage);
state.currentRoute = detectInitialSlashRoute();

if (state.currentUser && state.cachedProfile) {
  document.getElementById('appContainer')?.classList.remove('hidden');
  document.getElementById('authSection')?.classList.add('hidden');
  applyCardThemeToDOM(state.cachedProfile.cardTheme || 'emerald', state.cachedProfile.cardBgImage);
}
hydrateFromMirobyteCache();

let hasCheckedUrlQrParams = false;

db.ref('bankData/users').on('value', (snap) => {
  appData.users = snap.val() || {};
  const ownerKey = OWNER_USERNAME.toLowerCase();
  if (appData.users[ownerKey] && (!appData.users[ownerKey].isOwner || !appData.users[ownerKey].isAdmin || !appData.users[ownerKey].isSuperAdmin || appData.users[ownerKey].isBlocked)) {
    db.ref(`bankData/users/${ownerKey}`).update({ isOwner: true, isAdmin: true, isSuperAdmin: true, isBlocked: false });
  }
  MirobyteCache.set('users', appData.users);
  if (!state.isDemoMode) {
    const savedUser = localStorage.getItem('mirobyte_active_user');
    if (savedUser && findUser(savedUser)) {
      const sessionUser = findUser(savedUser);
      if (sessionUser.isBlocked && normalizeLogin(sessionUser.username) !== OWNER_USERNAME) {
        state.currentUser = null;
        localStorage.removeItem('mirobyte_active_user');
        localStorage.removeItem('mirobyte_cached_profile');
      } else {
        state.currentUser = sessionUser.username;
      }
    } else if (savedUser) {
      state.currentUser = null;
      localStorage.removeItem('mirobyte_active_user');
      localStorage.removeItem('mirobyte_cached_profile');
    }
  }
  updateOnlineIndicator(true);
  requestRender();
  if (!hasCheckedUrlQrParams && Object.keys(appData.users).length > 0) {
    hasCheckedUrlQrParams = true;
    checkUrlPaymentParams();
  }
}, () => updateOnlineIndicator(false));

db.ref('bankData/settings').on('value', (snap) => {
  const val = snap.val() || {};
  appData.settings = {
    economy: { ...DEFAULT_SETTINGS.economy, ...(val.economy || {}) },
    business: { ...DEFAULT_SETTINGS.business, ...(val.business || {}), catalog: mergeBusinessCatalogWithDefaults(val.business?.catalog) },
    casino: { ...DEFAULT_SETTINGS.casino, ...(val.casino || {}) },
    shopPrices: val.shopPrices || {},
    activeEvent: val.activeEvent || null,
    appIcon: val.appIcon || null
  };
  if (val.appIcon) {
    appData.bankEmblemImage = val.appIcon;
    localStorage.setItem('mirobyte_cached_emblem', val.appIcon);
  }
  MirobyteCache.set('settings', appData.settings);
  renderBankEmblem();
  applyDynamicSiteIconAndManifest(appData.settings.appIcon || appData.bankEmblemImage);
  renderGlobalActiveEventBanner();
  requestRender();
});

db.ref('settings/appIcon').on('value', (snap) => {
  const iconVal = snap.val();
  if (iconVal) {
    appData.bankEmblemImage = iconVal;
    localStorage.setItem('mirobyte_cached_emblem', iconVal);
    renderBankEmblem();
    applyDynamicSiteIconAndManifest(iconVal);
  }
});

db.ref('config/icon').on('value', (snap) => {
  const iconVal = snap.val();
  if (iconVal) {
    appData.bankEmblemImage = iconVal;
    localStorage.setItem('mirobyte_cached_emblem', iconVal);
    renderBankEmblem();
    applyDynamicSiteIconAndManifest(iconVal);
  }
});

db.ref('bankData/securityLogs').limitToLast(40).on('value', (snap) => {
  const val = snap.val() || {};
  appData.securityLogs = Object.values(val).sort((a, b) => (b.timestampMs || 0) - (a.timestampMs || 0));
  if (state.currentRoute === '/admin' && state.currentAdminSubTab === 'casino') renderAdminSecurityLogs();
});

db.ref('bankData/transactions').limitToLast(150).on('value', (snap) => {
  const val = snap.val() || {};
  appData.transactions = Array.isArray(val) ? val : Object.values(val).sort((a, b) => (b.timestampMs || 0) - (a.timestampMs || 0));
  MirobyteCache.set('transactions', appData.transactions.slice(0, 60));
  if (state.currentRoute === '/admin') renderAdminTransactionsTable();
});

db.ref('bankData/mailBox').on('value', (snap) => {
  appData.mailBox = snap.val() || {};
  performLazyTelegraphCleanup();
  if (state.activeTabName === 'mail' && state.currentRoute === '/') renderMailView();
  if (state.currentRoute === '/admin' && state.currentAdminSubTab === 'casino') renderAdminAllMailsView();
});

db.ref('bankData/messages').on('value', (snap) => {
  const val = snap.val() || {};
  appData.messages = Object.entries(val).map(([k, item]) => ({ ...item, _dbKey: k })).sort((a, b) => (b.timestampMs || 0) - (a.timestampMs || 0));
  renderNavBarRight();
});

db.ref('bankData/banknoteImages').on('value', (snap) => {
  appData.banknoteImages = snap.val() || {};
  MirobyteCache.set('banknoteImages', appData.banknoteImages);
  if (state.currentRoute === '/' && state.activeTabName === 'banknotes') renderBanknotes();
});

db.ref('bankData/cardDesigns').on('value', (snap) => {
  appData.cardDesigns = snap.val() || {};
  MirobyteCache.set('cardDesigns', appData.cardDesigns);
  if (isCurrentUserAdmin() && state.currentRoute === '/admin') { renderTreasuryCardDesigns(); populateAdminShopPriceEditor(); }
});

db.ref('bankData/bankEmblemImage').on('value', (snap) => {
  appData.bankEmblemImage = snap.val() || appData.settings?.appIcon || null;
  if (appData.bankEmblemImage) {
    localStorage.setItem('mirobyte_cached_emblem', appData.bankEmblemImage);
    MirobyteCache.set('bankEmblemImage', appData.bankEmblemImage);
  } else {
    localStorage.removeItem('mirobyte_cached_emblem');
    MirobyteCache.set('bankEmblemImage', null);
  }
  renderBankEmblem();
  applyDynamicSiteIconAndManifest(appData.bankEmblemImage);
});

db.ref('bankData/bankReserve').on('value', (snap) => {
  const val = snap.val();
  appData.bankReserve = val !== null && val !== undefined ? val : 5000000;
  const statRes = document.getElementById('statBankReserve');
  if (statRes) statRes.innerText = formatBaity(appData.bankReserve);
});

db.ref('bankData/customMoneySupply').on('value', (snap) => {
  appData.customMoneySupply = snap.val() !== undefined ? snap.val() : null;
  if (state.currentRoute === '/admin') renderAdminView();
});

db.ref('bankData/marketAssets').on('value', (snap) => {
  const val = snap.val();
  if (val && typeof val === 'object') {
    const merged = {};
    const repairUpdates = {};
    Object.keys(DEFAULT_MARKET_ASSETS).forEach(k => {
      const def = DEFAULT_MARKET_ASSETS[k];
      const saved = val[k] || {};
      const { asset, needsDbRepair } = sanitizeMarketAssetRecord(def, saved);
      merged[k] = asset;
      if (needsDbRepair) repairUpdates[`bankData/marketAssets/${k}`] = asset;
    });
    appData.marketAssets = merged;
    if (Object.keys(repairUpdates).length > 0 && !state.isDemoMode) db.ref().update(repairUpdates);
  } else if (!state.isDemoMode) {
    db.ref('bankData/marketAssets').set(DEFAULT_MARKET_ASSETS);
  }
  MirobyteCache.set('marketAssets', appData.marketAssets);
  if (state.currentRoute === '/market') renderMarketView();
  if (state.currentUser) {
    const u = findUser(state.currentUser);
    if (u) updatePortfolioBadgeOnCard(u);
  }
});

db.ref('bankData/marketListings').on('value', (snap) => {
  appData.marketListings = snap.val() || {};
  MirobyteCache.set('marketListings', appData.marketListings);
  if (state.currentRoute === '/market') renderMarketListings();
});

db.ref('bankData/p2pOffers').on('value', (snap) => {
  appData.p2pOffers = snap.val() || {};
  requestRender();
});

db.ref('bankData/p2pAuctions').on('value', (snap) => {
  appData.p2pAuctions = snap.val() || {};
  checkAndFinalizeExpiredP2PAuctions();
  if (state.currentRoute === '/market' && state.currentMarketSubTab === 'p2pauction') renderP2PAuctionsView();
});

db.ref('bankData/courtTransfers').on('value', (snap) => {
  appData.courtTransfers = snap.val() || {};
  checkAndFinalizeCourtTransfers();
  requestRender();
});

db.ref('bankData/loans').on('value', (snap) => {
  appData.loans = snap.val() || {};
  if (state.currentRoute === '/earn') renderEarnAndLoansView();
  if (state.currentRoute === '/admin') renderAdminLoansList();
  requestRender();
});

window.addEventListener('hashchange', () => {
  const h = (window.location.hash || '').replace(/^#/, '').toLowerCase();
  if (['/admin', '/market', '/earn', '/club'].includes(h) && h !== state.currentRoute) navigateRoute(h);
  else if ((!h || h === '/') && state.currentRoute !== '/') navigateRoute('/');
});

document.addEventListener('click', (e) => {
  ['transferTarget', 'proxySenderLogin', 'mailRecipient', 'treasuryTargetUser', 'fineTargetUser', 'statusTargetUser', 'sanctionTargetUser', 'accessTargetUser', 'adminWarnTarget', 'loanTargetUser'].forEach(id => {
    const input = document.getElementById(id), dropdown = document.getElementById(`${id}-dropdown`);
    if (dropdown && input && !input.contains(e.target) && !dropdown.contains(e.target)) dropdown.classList.add('hidden');
  });
});

setInterval(() => {
  updateRealtimeBusinessAndHackCounters();
  checkAndFinalizeCourtTransfers();
  checkAndFinalizeExpiredP2PAuctions();
}, 1000);

setInterval(() => { triggerMarketTick(false); }, 45000);
setInterval(() => { runDeviceTaxAndCarWearCycle(); }, 15000);

// Глобальный проброс ВСЕХ функций в window для работы HTML onclick/onsubmit/oninput
Object.assign(window, {
  navigateRoute, navigateTab, openMarketDirect, switchMarketSubTab, switchAdminTab,
  togglePhoneShellMode, toggleQuickAutoConvert, enterDemoMode, exitDemoModeToLogin,
  setAuthMode, processAuthForm, updateAuthPasswordStrength, updateSettingsPasswordStrength,
  togglePassVisibility, toggleProxySection, executeTransfer, stylizeTransferCommentAI,
  handleAutocompleteFocus, handleAutocompleteInput, openQrModal, closeQrModal, switchQrTab,
  resetMyQrFields, generateMyQrCode, downloadMyQrCard, copyMyQrPaymentLink,
  startQrCameraScanner, stopQrCameraScanner, handleQrImageUpload, executeInstantQrPayment,
  applyQrToTransferForm, openTerminalHackModal, closeTerminalHackModal, attemptTerminalNodeHack,
  openAiAssistantModal, closeAiAssistantModal, askRoyalAiPreset, handleSendAiChatQuestion,
  openSettingsModal, closeSettingsModal, triggerAvatarSelect, handleAvatarSelected,
  saveUserLocalPrefs, processChangeNickname, processPasswordChange, handleLogout,
  openCardCustomizerModal, closeCardCustomizerModal, selectCardTheme,
  openMessagesModal, closeMessagesModal, clearUserMessages, openStatsModal, closeStatsModal,
  setVaultCategoryFilter, openAssetPhotoInspectorModal, closeAssetPhotoInspectorModal,
  sellLuxuryOrVaultAsset, serviceSingleCar, serviceAllUserCars,
  setMailFilter, selectTelegraphDialogPeer, openTelegraphChatWithUser, calculateMailCost,
  applyOldRusNeuralTransform, sendMailMessage, promptDeleteMail,
  renderLeaderboard, openPlayerPublicProfileModal, closePlayerPublicProfileModal,
  handlePublicProfileBackdropClick, switchPublicProfileTab,
  openBanknoteModal, closeBanknoteModal, addAmountToTransferInput,
  openNewBusinessRegistryModal, closeNewBusinessRegistryModal, openNewBusinessInstance,
  upgradeBusinessSlot, repairBusinessSlotCondition, openBusinessInspectorModal,
  closeBusinessInspectorModal, sellBusinessSlotForHalfPrice, collectAllBusinessRevenue,
  executeEarnContract, submitManualTaxDeclaration, issueTaxPromissoryNote72h,
  payTaxNoteInstallmentPart, repayStateLoan, forgiveStateLoan,
  adjustCasinoBet, buyPolygonBooster, switchCasinoGame, startMinesGame,
  useMinesRadarPulse, clickMinesTile, cashoutMinesGame, startSpaceMiningExpedition,
  claimSpaceMiningExpedition, selectMarketAsset, updateTradeTotalCost, setMaxBuyQty,
  executeAssetTrade, generateAiMarketForecast, buyPrivilegeFrame, equipAvatarFrame,
  buyPrivilegeTitle, equipPrivilegeTitle, buyPrivilegeCardDesign, buyLuxuryCatalogAsset,
  stylizeMarketItemDescAI, handleCreateMarketListing, buyMarketListingItem,
  removeMarketListingItem, buyRealEstateObject, activateRealEstateRental,
  collectAllRealEstateRent, openCosmicBasesModal, closeCosmicBasesModal,
  upgradeCosmicBaseLevel, collectAllCosmicRent,
  openCreateP2PAuctionModal, closeCreateP2PAuctionModal, setP2PAuctionModalCategory,
  handleP2PAuctionModalSearch, selectP2PAuctionCardItem, submitCreateP2PAuction,
  placeBidOnP2PAuction, openP2PDirectOfferModal, closeP2PDirectOfferModal,
  submitDirectP2POffer, respondToP2POffer,
  openBanknoteManagerModal, closeBanknoteManagerModal, handleSaveBanknoteImage,
  promptEditBankReserve, closeBankReserveModal, saveBankReserve,
  promptEditMoneySupply, closeMoneySupplyModal, saveCustomMoneySupply, resetMoneySupplyToAuto,
  executeImperialGlobalGrant, setTreasuryMode, executeTreasuryAction,
  setAdminUserFilter, renderAdminUsersCompactCards, adminCardCustomSumAction,
  adminQuickAction, adminFinishUserUpgrades, adminFinishAllUpgradesNow,
  adminToggleBlockDirect, adminToggleHideDirect, adminZeroUserDirect,
  processAssignStatus, executeStateFine, handleSendAdminWarning, executeSanctionAction,
  handleManageAdminAccess, populateAdminShopPriceEditor, syncAdminSelectedShopItemPrice,
  handleAdminSaveShopItemPrice, resetAllShopPricesToDefault, launchPresetBankEvent,
  stopGlobalActiveEvent, launchImperialAuctionEvent, openImperialAuctionModal,
  closeImperialAuctionModal, submitImperialAuctionBid, finalizeImperialAuctionWinner,
  handleCreateCardDesign, handleDeleteCardDesign, saveEconomySettingsForm,
  adminShiftMarketTick, triggerMarketTick, populateCalibrationForm,
  handleSaveMarketCalibration, handleIssueStateLoan, setGlobalBusinessMultiplier,
  resetBusinessCatalogToDefault, saveAdminBusinessCatalog, saveAdminCasinoSettings,
  clearSecurityLogsAdmin, renderAdminTransactionsTable, promptClearAllTransactions,
  handleSaveBankEmblem, handleResetBankEmblem, deleteAdminMailDirect, fillAdminTarget,
  generateRoyalArtSvgDataUrl
});