// =========================================================================
// FILE: js/ui.js
// BANK OF MIROBYTE — Визуальный интерфейс, рендер DOM, графики и модалки
// =========================================================================

import {
  MAX_CHART_POINTS,
  MAX_USER_BUSINESSES,
  MAX_BUSINESS_LEVEL,
  MAX_HOLDINGS_PER_ASSET,
  MAX_TRADE_QTY,
  LUXURY_RESALE_TAX_RATE,
  POLYGON_DAILY_EARN_LIMIT,
  TAX_NOTE_INSTALLMENTS_COUNT,
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
  formatBaity as rawFormatBaity,
  formatDurationHuman,
  formatCountdownHMS,
  getAvatarFrameClass,
  getAvatarFrameCornerEmoji,
  generateRoyalArtSvgDataUrl,
  getDynamicShopPrice as mathGetDynamicShopPrice,
  getRawSavedShopPrice as mathGetRawSavedShopPrice,
  mergeBusinessCatalogWithDefaults,
  getBusinessUpgradeCost,
  calculateTotalBusinessInvestment,
  getBusinessHourlyIncome,
  computeEffectiveSlotCondition,
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
  calculateUserPortfolioValue
} from './math.js';

// Ссылка на ядро (устанавливается из core.js при инициализации)
let Core = null;
export function bindCoreToUI(coreRef) {
  Core = coreRef;
}

export function formatBaity(value, options = {}) {
  const autoPref = Core ? !!Core.userPrefs.autoConvertUnits : false;
  return rawFormatBaity(value, options, autoPref);
}

export function getDynamicShopPrice(itemId, defaultPrice, category = null) {
  return mathGetDynamicShopPrice(Core?.appData?.settings, itemId, defaultPrice, category);
}

export function getRawSavedShopPrice(itemId, defaultPrice) {
  return mathGetRawSavedShopPrice(Core?.appData?.settings, itemId, defaultPrice);
}

// -------------------------------------------------------------------------
// 1. ТОСТЫ, ПОДТВЕРЖДЕНИЯ И ДИНАМИЧЕСКАЯ ИКОНКА PWA
// -------------------------------------------------------------------------
let currentManifestBlobUrl = null;

export function createDefaultEmblemDataUrl() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="#091f16" stroke="#e6c875" stroke-width="4"/><circle cx="50" cy="50" r="38" fill="none" stroke="#10b981" stroke-width="2" stroke-dasharray="3,3"/><rect x="30" y="30" width="40" height="40" rx="8" fill="#05140d" stroke="#ffd700" stroke-width="2.5"/><text x="50" y="58" font-family="Cinzel, serif" font-size="26" font-weight="900" fill="#e6c875" text-anchor="middle">฿</text></svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

export function applyDynamicSiteIconAndManifest(iconSource) {
  const finalIcon = iconSource || Core?.appData?.bankEmblemImage || localStorage.getItem('mirobyte_cached_emblem') || createDefaultEmblemDataUrl();
  const favEl = document.getElementById('dynamicFavicon');
  const appleEl = document.getElementById('dynamicAppleTouchIcon');
  if (favEl) favEl.href = finalIcon;
  if (appleEl) appleEl.href = finalIcon;

  try {
    if (currentManifestBlobUrl) URL.revokeObjectURL(currentManifestBlobUrl);
    const manifestObj = {
      name: "BANK OF MIROBYTE — Императорский Кибер-Банк (฿)",
      short_name: "Mirobyte Bank",
      description: "Государственная финансово-игровая экосистема валюты Байти (฿)",
      start_url: window.location.origin + window.location.pathname,
      display: "standalone",
      background_color: "#020604",
      theme_color: "#05110c",
      icons: [
        { src: finalIcon, sizes: "192x192", type: finalIcon.startsWith('data:image/svg') ? "image/svg+xml" : "image/png", purpose: "any maskable" },
        { src: finalIcon, sizes: "512x512", type: finalIcon.startsWith('data:image/svg') ? "image/svg+xml" : "image/png", purpose: "any maskable" }
      ]
    };
    const blob = new Blob([JSON.stringify(manifestObj)], { type: 'application/manifest+json' });
    currentManifestBlobUrl = URL.createObjectURL(blob);
    const manifestLink = document.getElementById('dynamicManifestLink');
    if (manifestLink) manifestLink.href = currentManifestBlobUrl;
  } catch (e) {}
}

export function updateOnlineIndicator(isOk) {
  const dot = document.getElementById('cloudSyncIndicator');
  const txt = document.getElementById('cloudStatusText');
  if (!dot || !txt) return;
  dot.className = isOk ? 'w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0' : 'w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-400 flex-shrink-0';
  txt.innerText = isOk ? 'Кэш + Firebase Онлайн (฿)' : 'Офлайн Кэш (฿)';
}

export function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  const colors = {
    success: 'bg-[#06291d] border-emerald-400 text-emerald-100',
    error: 'bg-[#2b0810] border-rose-500 text-rose-100',
    info: 'bg-[#081c15] border-bank-gold text-bank-gold'
  };
  const icons = {
    success: 'fa-circle-check text-emerald-400',
    error: 'fa-triangle-exclamation text-rose-400',
    info: 'fa-circle-info text-bank-gold'
  };
  toast.className = `pointer-events-auto px-3.5 py-2.5 rounded-2xl border-2 shadow-2xl flex items-center gap-2 text-xs font-semibold transition-all duration-300 ${colors[type] || colors.info}`;
  toast.innerHTML = `<i class="fa-solid ${icons[type] || icons.info} text-sm flex-shrink-0"></i><span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    setTimeout(() => toast.remove(), 300);
  }, 3400);
}

export function askRoyalConfirm({ title = 'Подтверждение операции', message = 'Вы уверены?', okText = 'Подтвердить', cancelText = 'Отмена', isDanger = false }) {
  return new Promise((resolve) => {
    const modal = document.getElementById('royalConfirmModal');
    document.getElementById('royalConfirmTitle').innerText = title;
    document.getElementById('royalConfirmMessage').innerText = message;
    const okBtn = document.getElementById('royalConfirmOkBtn');
    const cancelBtn = document.getElementById('royalConfirmCancelBtn');
    okBtn.innerText = okText;
    cancelBtn.innerText = cancelText;
    okBtn.className = isDanger
      ? 'tap-btn px-4 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-800 text-white font-royal font-bold text-xs uppercase shadow-md'
      : 'tap-btn px-4 py-1.5 rounded-xl bg-gradient-to-r from-bank-gold to-yellow-600 text-black font-royal font-bold text-xs uppercase shadow-md';

    const cleanup = (result) => {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
      okBtn.onclick = null;
      cancelBtn.onclick = null;
      resolve(result);
    };
    okBtn.onclick = () => cleanup(true);
    cancelBtn.onclick = () => cleanup(false);
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  });
}

export function renderBankEmblem() {
  const container = document.getElementById('bankEmblemContainer');
  const previewSmall = document.getElementById('currentEmblemPreviewSmall');
  if (!container) return;
  const defaultSvg = `<svg viewBox="0 0 100 100" class="w-full h-full"><circle cx="50" cy="50" r="46" fill="#091f16" stroke="#e6c875" stroke-width="2"/><circle cx="50" cy="50" r="38" fill="none" stroke="#10b981" stroke-width="1.5" stroke-dasharray="3,3"/><rect x="36" y="36" width="28" height="28" rx="6" fill="#05140d" stroke="#ffd700" stroke-width="2"/><text x="50" y="56" font-family="'Cinzel', serif" font-size="20" font-weight="900" fill="#e6c875" text-anchor="middle">฿</text></svg>`;
  const currentImg = Core?.appData?.settings?.appIcon || Core?.appData?.bankEmblemImage || localStorage.getItem('mirobyte_cached_emblem');
  container.innerHTML = currentImg ? `<img src="${currentImg}" class="w-full h-full object-cover">` : defaultSvg;
  if (previewSmall) previewSmall.innerHTML = container.innerHTML;
}

export function applyCardThemeToDOM(themeKey, cardBgImage) {
  const card = document.getElementById('citizenMainCard');
  if (!card) return;
  Object.values(CARD_THEMES).forEach(cls => cls.split(' ').forEach(c => card.classList.remove(c)));
  if (cardBgImage) {
    card.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.7)), url(${cardBgImage})`;
  } else {
    card.style.backgroundImage = '';
    (CARD_THEMES[themeKey] || CARD_THEMES.emerald).split(' ').forEach(c => card.classList.add(c));
  }
}

// -------------------------------------------------------------------------
// 2. РОУТИНГ, НАВИГАЦИЯ И ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК
// -------------------------------------------------------------------------
let renderScheduled = false;
export function requestRender() {
  if (renderScheduled) return;
  renderScheduled = true;
  requestAnimationFrame(() => {
    renderScheduled = false;
    renderCurrentView();
  });
}

export function updateDesktopAndMobileNavHighlights() {
  if (!Core) return;
  const { currentRoute, currentMarketSubTab, activeTabName } = Core.state;
  const isTorgActive = currentRoute === '/market' && ['privileges', 'art', 'garage', 'bazaar', 'realestate', 'cosmos'].includes(currentMarketSubTab);
  const isP2PAucActive = currentRoute === '/market' && currentMarketSubTab === 'p2pauction';
  const isExchangeActive = currentRoute === '/market' && currentMarketSubTab === 'exchange';

  const setSlashBtnStyle = (id, active, defaultBorder) => {
    const btn = document.getElementById(id);
    if (!btn || btn.classList.contains('hidden')) return;
    btn.className = active
      ? 'tap-btn px-3 sm:px-3.5 py-2 rounded-xl text-[11px] sm:text-xs font-royal font-bold uppercase tracking-wider transition-all bg-bank-gold text-black shadow-md whitespace-nowrap flex items-center gap-1.5'
      : `tap-btn px-3 sm:px-3.5 py-2 rounded-xl text-[11px] sm:text-xs font-royal font-bold uppercase tracking-wider transition-all bg-bank-surface ${defaultBorder} hover:bg-bank-card whitespace-nowrap flex items-center gap-1.5`;
  };

  setSlashBtnStyle('slashBtn-home', currentRoute === '/', 'text-emerald-300 border border-bank-border');
  setSlashBtnStyle('slashBtn-earn', currentRoute === '/earn', 'text-emerald-300 border border-emerald-500/30');
  setSlashBtnStyle('slashBtn-torg', isTorgActive, 'text-amber-300 border border-amber-500/40');
  setSlashBtnStyle('slashBtn-p2pauction', isP2PAucActive, 'text-rose-300 border border-rose-500/40');
  setSlashBtnStyle('slashBtn-exchange', isExchangeActive, 'text-bank-gold border border-bank-gold/40');
  setSlashBtnStyle('slashBtn-club', currentRoute === '/club', 'text-purple-300 border border-purple-500/40');

  const mobileMap = {
    dashboard: currentRoute === '/' && activeTabName === 'dashboard',
    earn: currentRoute === '/earn',
    torg: isTorgActive,
    p2pauction: isP2PAucActive,
    market: isExchangeActive,
    club: currentRoute === '/club',
    mail: currentRoute === '/' && activeTabName === 'mail',
    leaderboard: currentRoute === '/' && activeTabName === 'leaderboard',
    banknotes: currentRoute === '/' && activeTabName === 'banknotes',
    rules: currentRoute === '/' && activeTabName === 'rules',
    admin: currentRoute === '/admin'
  };

  Object.entries(mobileMap).forEach(([key, isActive]) => {
    const btn = document.getElementById(`bNavBtn-${key}`);
    if (!btn || btn.classList.contains('hidden')) return;
    btn.className = isActive
      ? 'flex-shrink-0 min-w-[54px] flex flex-col items-center justify-center py-1 px-1.5 rounded-xl text-black bg-bank-gold border border-bank-gold shadow-md transition-all'
      : 'flex-shrink-0 min-w-[54px] flex flex-col items-center justify-center py-1 px-1.5 rounded-xl text-emerald-300/85 hover:text-white transition-all';
  });
}

export function renderGlobalActiveEventBanner() {
  const banner = document.getElementById('globalActiveEventBanner');
  if (!banner || !Core) return;
  const ev = Core.appData.settings?.activeEvent;
  if (!ev || !ev.active) { banner.classList.add('hidden'); return; }

  banner.classList.remove('hidden');
  const iconEl = document.getElementById('globalEventIconBadge');
  const titleEl = document.getElementById('globalEventTitleText');
  const descEl = document.getElementById('globalEventDescText');
  const actEl = document.getElementById('globalEventActionArea');

  if (iconEl) iconEl.innerText = ev.badge || '🔥 ИВЕНТ';
  if (titleEl) titleEl.innerText = ev.title || 'Императорское Событие';
  if (descEl) descEl.innerText = ev.desc ? `• ${ev.desc}` : '';

  if (actEl) {
    if (ev.type === 'auction') {
      const curBid = Number(ev.currentBid || ev.startBid || 1000);
      const leader = ev.highestBidder ? `@${escapeHtml(ev.highestBidder)}` : 'Нет ставок';
      actEl.innerHTML = `
        <span class="px-2 py-0.5 rounded-lg bg-black/70 border border-bank-gold/50 text-[10px] font-mono text-bank-gold">
          <b>${formatBaity(curBid)}</b> (${leader})
        </span>
        <button onclick="openImperialAuctionModal()" class="px-2.5 py-1 rounded-xl bg-bank-gold text-black font-royal font-black text-[10px] uppercase shadow-md">
          🔨 Ставка
        </button>
      `;
    } else if (ev.type === 'art_boom') {
      actEl.innerHTML = `<button onclick="openMarketDirect('art')" class="px-2.5 py-1 rounded-xl bg-amber-400 text-black font-royal font-bold text-[10px] uppercase">🎨 В Галерею (-20%)</button>`;
    } else if (ev.type === 'garage_expo') {
      actEl.innerHTML = `<button onclick="openMarketDirect('garage')" class="px-2.5 py-1 rounded-xl bg-sky-400 text-black font-royal font-bold text-[10px] uppercase">🏎️ В Автопарк (-15%)</button>`;
    } else if (ev.type === 'gold_rush') {
      actEl.innerHTML = `<button onclick="navigateRoute('/earn')" class="px-2.5 py-1 rounded-xl bg-emerald-400 text-black font-royal font-bold text-[10px] uppercase">⛏️ В Промыслы (+50%)</button>`;
    } else {
      actEl.innerHTML = `<button onclick="openMarketDirect('exchange')" class="px-2.5 py-1 rounded-xl bg-purple-400 text-black font-royal font-bold text-[10px] uppercase">⚡ На Биржу</button>`;
    }
  }
}

// -------------------------------------------------------------------------
// 3. ГЛАВНЫЙ РЕНДЕР ПРИЛОЖЕНИЯ И ДАШБОРДА
// -------------------------------------------------------------------------
export function renderCurrentView() {
  if (!Core) return;
  const authSec = document.getElementById('authSection');
  const appSec = document.getElementById('appContainer');
  const deniedSec = document.getElementById('adminAccessDeniedScreen');
  const mobileBottomNav = document.getElementById('mobileBottomNav');

  const currentUser = Core.state.currentUser;
  const isDemoMode = Core.state.isDemoMode;
  const currentRoute = Core.state.currentRoute;
  const activeTabName = Core.state.activeTabName;

  if (!currentUser && !isDemoMode) {
    authSec?.classList.remove('hidden');
    appSec?.classList.add('hidden');
    deniedSec?.classList.add('hidden');
    mobileBottomNav?.classList.add('hidden');
    document.getElementById('demoModeActiveBanner')?.classList.add('hidden');
    document.getElementById('taxDebtAlertBanner')?.classList.add('hidden');
    renderNavBarRight();
    return;
  }

  const u = isDemoMode ? Core.createDemoGuestProfile() : Core.findUser(currentUser);
  if (!u) {
    if (Object.keys(Core.appData.users).length === 0 && Core.state.cachedProfile) return;
    Core.state.currentUser = null;
    localStorage.removeItem('mirobyte_active_user');
    localStorage.removeItem('mirobyte_cached_profile');
    authSec?.classList.remove('hidden');
    appSec?.classList.add('hidden');
    renderNavBarRight();
    return;
  }

  mobileBottomNav?.classList.remove('hidden');
  document.getElementById('demoModeActiveBanner')?.classList.toggle('hidden', !isDemoMode);

  const taxDecl = calculateUserTaxDeclaration(u, Core.appData.loans, Core.appData.settings, Core.getServerTime(), isDemoMode);
  const debtBanner = document.getElementById('taxDebtAlertBanner');
  const debtAlertTxt = document.getElementById('taxDebtAlertText');
  if (debtBanner) {
    debtBanner.classList.toggle('hidden', !taxDecl.isIncomeFrozen);
    if (debtAlertTxt && taxDecl.isIncomeFrozen) {
      debtAlertTxt.innerText = taxDecl.hasExpiredPromissoryNote
        ? 'Истёк срок погашения Долговой расписки! Доходы заморожены — погасите остаток или отправьте декларацию.'
        : `Истекли 72 часа на подачу налоговой декларации (${formatBaity(taxDecl.accumulatedTax)})! Доходы заморожены — оплатите налог или выпишите долговую расписку для разморозки!`;
    }
  }

  const isAdmin = Core.isCurrentUserAdmin();
  const isSuperAdmin = Core.isCurrentUserSuperAdmin();
  const isOwner = Core.isCurrentUserOwner();
  const hasAnyAdminRight = isAdmin || isSuperAdmin || isOwner;

  if (!isDemoMode) {
    const profileSnap = {
      username: u.username,
      balance: u.balance || 0,
      isAdmin,
      isSuperAdmin,
      isOwner,
      avatar: u.avatar || '',
      avatarFrame: u.avatarFrame || '',
      cardTheme: u.cardTheme || 'emerald',
      cardBgImage: u.cardBgImage || '',
      customStatus: u.customStatus || 'Полноправный гражданин'
    };
    Core.state.cachedProfile = profileSnap;
    localStorage.setItem('mirobyte_cached_profile', JSON.stringify(profileSnap));
    Core.MirobyteCache.set('activeProfile', profileSnap);
  }

  authSec?.classList.add('hidden');
  ['slashBtn-admin', 'bNavBtn-admin'].forEach(id => document.getElementById(id)?.classList.toggle('hidden', !hasAnyAdminRight));

  if (currentRoute === '/admin' && !hasAnyAdminRight) {
    appSec?.classList.add('hidden');
    deniedSec?.classList.remove('hidden');
    renderNavBarRight();
    return;
  }

  deniedSec?.classList.add('hidden');
  appSec?.classList.remove('hidden');

  const routeMap = {
    '/': 'routeView-home',
    '/earn': 'routeView-earn',
    '/club': 'routeView-club',
    '/market': 'routeView-market',
    '/admin': 'routeView-admin'
  };
  Object.entries(routeMap).forEach(([rKey, domId]) => document.getElementById(domId)?.classList.toggle('hidden', rKey !== currentRoute));

  updateDesktopAndMobileNavHighlights();
  document.getElementById('ownerDelegationSection')?.classList.toggle('hidden', !isOwner);
  document.getElementById('superAdminPanelInsideUsers')?.classList.toggle('hidden', !isSuperAdmin);

  renderNavBarRight();
  renderDashboard(u);

  if (currentRoute === '/') {
    if (activeTabName === 'leaderboard') renderLeaderboard();
    if (activeTabName === 'banknotes') renderBanknotes();
    if (activeTabName === 'mail') renderMailView();
  } else if (currentRoute === '/earn') {
    renderEarnAndLoansView();
  } else if (currentRoute === '/club') {
    renderCasinoClubView();
  } else if (currentRoute === '/market') {
    Core.switchMarketSubTab(Core.state.currentMarketSubTab);
    renderMarketView();
  } else if (currentRoute === '/admin' && hasAnyAdminRight) {
    renderAdminView();
  }
}

export function renderNavBarRight() {
  const box = document.getElementById('navBarRight');
  if (!box || !Core) return;
  if (!Core.state.currentUser && !Core.state.isDemoMode) {
    box.innerHTML = '';
    return;
  }
  const u = Core.findUser(Core.state.currentUser);
  if (!u) return;

  const isAdmin = Core.isCurrentUserAdmin() || Core.isCurrentUserSuperAdmin();
  const unread = Core.getUnreadMessagesCount(u.username);
  const avatarHtml = u.avatar ? `<img src="${u.avatar}" class="w-full h-full object-cover">` : `<i class="fa-solid fa-user text-xs text-bank-gold"></i>`;
  const frameClass = getAvatarFrameClass(u.avatarFrame);
  const cornerEmoji = getAvatarFrameCornerEmoji(u.avatarFrame);

  box.innerHTML = `
    <div class="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
      <div class="flex items-center gap-1.5 cursor-pointer p-1 rounded-xl hover:bg-bank-card/50 transition-colors" onclick="openSettingsModal()" title="Настройки профиля">
        <div class="relative flex-shrink-0">
          <div class="w-8 h-8 sm:w-9 sm:h-9 rounded-xl ${frameClass} overflow-hidden bg-black flex items-center justify-center">${avatarHtml}</div>
          ${cornerEmoji ? `<span class="avatar-corner-badge">${cornerEmoji}</span>` : ''}
        </div>
        <div class="text-right hidden sm:block">
          <div class="text-xs font-bold text-white font-royal flex items-center gap-1">
            <span>${escapeHtml(u.username)}</span>
            ${isAdmin ? '<i class="fa-solid fa-crown text-[10px] text-bank-gold"></i>' : ''}
          </div>
          <div class="text-[11px] font-mono text-bank-gold font-bold">${formatBaity(u.balance || 0)}</div>
        </div>
      </div>
      <button onclick="openQrModal('myqr')" class="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-bank-surface hover:bg-bank-card border border-bank-gold/50 text-bank-gold hover:text-white flex items-center justify-center transition-all flex-shrink-0" title="Мой QR"><i class="fa-solid fa-qrcode text-xs sm:text-sm"></i></button>
      <button onclick="openStatsModal()" class="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-bank-surface hover:bg-bank-card border border-bank-border text-emerald-400 hover:text-bank-gold flex items-center justify-center transition-all flex-shrink-0" title="Аналитика XY"><i class="fa-solid fa-chart-simple text-xs sm:text-sm"></i></button>
      <button onclick="openMessagesModal()" class="relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-bank-surface hover:bg-bank-card border border-bank-border text-emerald-400 hover:text-bank-gold flex items-center justify-center transition-all flex-shrink-0" title="Уведомления">
        <i class="fa-solid fa-bell text-xs sm:text-sm"></i>
        ${unread > 0 ? `<span class="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 text-white rounded-full text-[9px] font-bold flex items-center justify-center animate-pulse">${unread}</span>` : ''}
      </button>
      ${Core.state.isDemoMode ? `
        <button onclick="exitDemoModeToLogin()" class="px-2.5 h-8 sm:h-9 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-royal font-black text-[10px] uppercase flex items-center justify-center transition-all shadow-md flex-shrink-0" title="Выйти из Демо-режима">
          Вход
        </button>
      ` : `
        <button onclick="openSettingsModal()" class="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-bank-surface hover:bg-bank-card border border-bank-gold/60 text-bank-gold hover:text-white flex items-center justify-center transition-all shadow-md flex-shrink-0" title="Настройки"><i class="fa-solid fa-gear text-xs sm:text-sm"></i></button>
      `}
    </div>
  `;
}

export function updatePortfolioBadgeOnCard(u) {
  const badge = document.getElementById('userPortfolioBadge');
  if (!badge || !Core) return;
  const val = calculateUserPortfolioValue(u, Core.appData.marketAssets, Core.appData.settings);
  badge.innerHTML = `<i class="fa-solid fa-chart-line mr-1"></i>Активы: ${formatBaity(val)}`;
}

export function renderDashboard(u) {
  if (!u || !Core) return;
  document.getElementById('userBalanceDisplay').innerText = formatBaity(u.balance || 0);
  document.getElementById('cardHolderText').innerText = u.username.toUpperCase();
  document.getElementById('cardRegisteredText').innerText = u.registeredAt || 'Основатель';
  document.getElementById('cardRoleBadge').innerText = Core.state.isDemoMode
    ? '👁 Демо-обзор'
    : (u.isOwner ? 'Владелец Банка' : (u.isSuperAdmin ? 'Главный Админ' : (u.isAdmin ? 'Казначей' : 'Гражданин')));
  document.getElementById('cardCustomStatus').innerText = `Титул: ${u.customStatus || 'Полноправный гражданин'}`;

  const wToggle = document.getElementById('walletBottomAutoConvertToggle');
  const qBtn = document.getElementById('quickUnitModeBtn');
  if (wToggle) wToggle.checked = !!Core.userPrefs.autoConvertUnits;
  if (qBtn) qBtn.innerText = Core.userPrefs.autoConvertUnits ? 'Формат: K₿/M₿/G₿' : 'Формат: 1 000 ฿';

  const taxBadge = document.getElementById('cardTaxStatusBadge');
  if (taxBadge) {
    const taxDecl = calculateUserTaxDeclaration(u, Core.appData.loans, Core.appData.settings, Core.getServerTime(), Core.state.isDemoMode);
    if (taxDecl.isIncomeFrozen) {
      taxBadge.innerHTML = `<span class="text-rose-400 animate-pulse cursor-pointer" onclick="navigateRoute('/earn')">❄️ Просрочка 72ч (${formatBaity(taxDecl.accumulatedTax)})</span>`;
    } else if (taxDecl.activeTaxPromissoryNotes.length > 0) {
      taxBadge.innerHTML = `<span class="text-amber-300 cursor-pointer" onclick="navigateRoute('/earn')">✍️ Расписка активна (Доход идёт)</span>`;
    } else if (taxDecl.dailyBill.totalTax > 0) {
      taxBadge.innerHTML = `<span class="cursor-pointer" onclick="navigateRoute('/earn')"><i class="fa-solid fa-clock text-[9px] text-bank-gold"></i> Декларация: ${formatCountdownHMS(taxDecl.timeLeftMs)}</span>`;
    } else {
      taxBadge.innerHTML = `<i class="fa-solid fa-shield-halved text-[9px] text-bank-gold"></i> Чист перед Казной`;
    }
  }

  updatePortfolioBadgeOnCard(u);
  applyCardThemeToDOM(u.cardTheme || 'emerald', u.cardBgImage);
  renderP2PAndCourtStatusOnDashboard(u);
  renderPlayerAnalyticsDashboard(u);
  renderUserInventoryVault(u);
  updateRealtimeBusinessAndHackCounters();

  const avatarContainer = document.getElementById('cardAvatarContainer');
  const cornerBadge = document.getElementById('cardAvatarCornerEmoji');
  const frameClass = getAvatarFrameClass(u.avatarFrame);
  const cornerEmoji = getAvatarFrameCornerEmoji(u.avatarFrame);

  if (avatarContainer) {
    avatarContainer.className = `w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl ${frameClass} overflow-hidden bg-black flex items-center justify-center shadow-lg cursor-pointer transition-all relative group flex-shrink-0`;
    avatarContainer.innerHTML = u.avatar
      ? `<img src="${u.avatar}" class="w-full h-full object-cover"><div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs"><i class="fa-solid fa-gear"></i></div>`
      : `<i class="fa-solid fa-user-astronaut text-base sm:text-2xl text-bank-gold"></i><div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs"><i class="fa-solid fa-gear"></i></div>`;
  }

  if (cornerBadge) {
    if (cornerEmoji) { cornerBadge.innerText = cornerEmoji; cornerBadge.classList.remove('hidden'); }
    else cornerBadge.classList.add('hidden');
  }

  const qBar = document.getElementById('quickDenominationsBar');
  if (qBar && qBar.children.length === 0) {
    const frag = document.createDocumentFragment();
    BANKNOTES_CONFIG.forEach(n => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'px-2 py-1 bg-bank-darkest border border-bank-border rounded-lg text-[10px] sm:text-xs font-bold text-bank-gold hover:bg-bank-card transition-colors';
      btn.innerText = `+${n.value} ฿`;
      btn.onclick = () => {
        const inp = document.getElementById('transferAmount');
        inp.value = (parseInt(inp.value, 10) || 0) + n.value;
        showToast(`+${n.value} ฿ добавлено к переводу`, 'info');
      };
      frag.appendChild(btn);
    });
    qBar.appendChild(frag);
  }
}

// -------------------------------------------------------------------------
// 4. ФИНАНСОВАЯ АНАЛИТИКА ИГРОКА (DONUT-ДИАГРАММА)
// -------------------------------------------------------------------------
export function renderPlayerAnalyticsDashboard(u) {
  if (!u || !Core) return;
  const inc = u.stats?.income || {};
  const exp = u.stats?.expense || {};

  let incCrafts = Math.round(Number(inc.crafts || 0));
  let incStocks = Math.round(Number(inc.stocks || 0));
  let incPolygon = Math.round(Number(inc.polygon || 0));
  let incTransfers = Math.round(Number(inc.transfersIn || 0));

  let expCrafts = Math.round(Number(exp.craftsUpgradeAndSupply || 0));
  let expStocks = Math.round(Number(exp.stocksInvest || 0));
  let expTransfers = Math.round(Number(exp.transfersOut || 0));

  const hasAnyStats = (incCrafts + incStocks + incPolygon + incTransfers + expCrafts + expStocks + expTransfers) > 0;
  if (!hasAnyStats && Array.isArray(Core.appData.transactions)) {
    const uLow = u.username.toLowerCase();
    Core.appData.transactions.forEach(t => {
      const amt = Math.round(Number(t.amount || 0));
      if (amt <= 0) return;
      const fromLow = String(t.from || '').toLowerCase();
      const toLow = String(t.to || '').toLowerCase();
      if (toLow === uLow) {
        if (fromLow.includes('промысл') || fromLow.includes('аренд') || fromLow.includes('рента') || fromLow.includes('космо')) incCrafts += amt;
        else if (fromLow.includes('биржа')) incStocks += amt;
        else if (fromLow.includes('полигон') || fromLow.includes('терминал') || fromLow.includes('золотодобыча')) incPolygon += amt;
        else incTransfers += amt;
      } else if (fromLow === uLow) {
        if (toLow.includes('промысл') || toLow.includes('снабжен') || toLow.includes('налог') || toLow.includes('гараж')) expCrafts += amt;
        else if (toLow.includes('биржа')) expStocks += amt;
        else expTransfers += amt;
      }
    });
  }

  const totalIncome = incCrafts + incStocks + incPolygon + incTransfers;
  const totalExpense = expCrafts + expStocks + expTransfers;
  const totalTurnover = totalIncome + totalExpense;
  const netFlow = totalIncome - totalExpense;

  const netBadge = document.getElementById('analyticsNetCashflowBadge');
  if (netBadge) {
    netBadge.innerText = `Чистый поток: ${formatBaity(netFlow, { showPlus: true })}`;
    netBadge.className = `px-2.5 py-1 rounded-full bg-bank-darkest border ${netFlow >= 0 ? 'border-emerald-500/50 text-emerald-300' : 'border-rose-500/50 text-rose-300'} text-[10px] sm:text-xs font-mono font-bold`;
  }

  const totTurnEl = document.getElementById('analyticsTotalTurnoverText');
  const totIncEl = document.getElementById('analyticsTotalIncomeVal');
  const totExpEl = document.getElementById('analyticsTotalExpenseVal');
  if (totTurnEl) totTurnEl.innerText = formatBaity(totalTurnover, { forceShort: true });
  if (totIncEl) totIncEl.innerText = `+${formatBaity(totalIncome)}`;
  if (totExpEl) totExpEl.innerText = `-${formatBaity(totalExpense)}`;

  const incItems = [
    { label: 'Промыслы, Рента и Космос', val: incCrafts, color: 'bg-emerald-400', icon: 'fa-industry' },
    { label: 'Биржа акций', val: incStocks, color: 'bg-bank-gold', icon: 'fa-chart-line' },
    { label: 'Кибер-Полигон', val: incPolygon, color: 'bg-purple-400', icon: 'fa-shuttle-space' },
    { label: 'Входящие и P2P-продажи', val: incTransfers, color: 'bg-sky-400', icon: 'fa-arrow-down-long' }
  ];

  const expItems = [
    { label: 'Прокачка, ТО, Налоги и Снабжение', val: expCrafts, color: 'bg-amber-500', icon: 'fa-screwdriver-wrench' },
    { label: 'Инвестиции в акции', val: expStocks, color: 'bg-rose-400', icon: 'fa-coins' },
    { label: 'Исходящие переводы и P2P', val: expTransfers, color: 'bg-pink-500', icon: 'fa-paper-plane' }
  ];

  const incListEl = document.getElementById('analyticsIncomeBreakdownList');
  if (incListEl) {
    incListEl.innerHTML = incItems.map(item => {
      const pct = totalIncome > 0 ? Math.round((item.val / totalIncome) * 100) : 0;
      return `
        <div class="space-y-0.5">
          <div class="flex items-center justify-between text-[11px]">
            <span class="text-emerald-100 flex items-center gap-1.5"><i class="fa-solid ${item.icon} text-[10px] text-emerald-400"></i>${item.label}</span>
            <span class="font-mono font-bold text-emerald-300">+${formatBaity(item.val)} <span class="text-[9px] text-emerald-500">(${pct}%)</span></span>
          </div>
          <div class="h-1.5 w-full bg-black rounded-full overflow-hidden">
            <div class="h-full ${item.color}" style="width: ${pct}%"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  const expListEl = document.getElementById('analyticsExpenseBreakdownList');
  if (expListEl) {
    expListEl.innerHTML = expItems.map(item => {
      const pct = totalExpense > 0 ? Math.round((item.val / totalExpense) * 100) : 0;
      return `
        <div class="space-y-0.5">
          <div class="flex items-center justify-between text-[11px]">
            <span class="text-emerald-100 flex items-center gap-1.5"><i class="fa-solid ${item.icon} text-[10px] text-rose-400"></i>${item.label}</span>
            <span class="font-mono font-bold text-rose-300">-${formatBaity(item.val)} <span class="text-[9px] text-rose-400/70">(${pct}%)</span></span>
          </div>
          <div class="h-1.5 w-full bg-black rounded-full overflow-hidden">
            <div class="h-full ${item.color}" style="width: ${pct}%"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  const donutCanvas = document.getElementById('playerAnalyticsDonutCanvas');
  if (donutCanvas) {
    const ctx = donutCanvas.getContext('2d');
    const w = donutCanvas.width, h = donutCanvas.height;
    const cx = w / 2, cy = h / 2, r = Math.min(cx, cy) - 10;
    ctx.clearRect(0, 0, w, h);
    ctx.lineWidth = 12;

    if (totalTurnover <= 0) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = '#1a4735';
      ctx.stroke();
    } else {
      const segments = [
        { val: incCrafts, color: '#10b981' },
        { val: incStocks, color: '#e6c875' },
        { val: incPolygon, color: '#a855f7' },
        { val: incTransfers, color: '#38bdf8' },
        { val: expCrafts, color: '#f59e0b' },
        { val: expStocks, color: '#fb7185' },
        { val: expTransfers, color: '#ec4899' }
      ].filter(s => s.val > 0);

      let startAngle = -Math.PI / 2;
      segments.forEach(seg => {
        const sliceAngle = (seg.val / totalTurnover) * (Math.PI * 2);
        ctx.beginPath();
        ctx.arc(cx, cy, r, startAngle, startAngle + sliceAngle);
        ctx.strokeStyle = seg.color;
        ctx.stroke();
        startAngle += sliceAngle;
      });
    }
  }
}

// -------------------------------------------------------------------------
// 5. P2P-АУКЦИОН 24Ч: НОВЫЙ УДОБНЫЙ UX ВЫБОРА АКТИВОВ (ФИЛЬТР + ПОИСК + СЕТКА)
// -------------------------------------------------------------------------
let p2pModalFilterCat = 'all';
let p2pModalSearchQuery = '';
let p2pSelectedOptionVal = '';

export function setP2PAuctionModalCategory(cat) {
  p2pModalFilterCat = cat || 'all';
  ['all', 'business', 'realestate', 'cosmos', 'vault'].forEach(k => {
    const btn = document.getElementById(`p2pCatFilterBtn-${k}`);
    if (btn) {
      btn.className = k === p2pModalFilterCat
        ? 'px-2.5 py-1 rounded-xl bg-bank-gold text-black font-royal font-bold text-[10px] uppercase whitespace-nowrap shadow-md'
        : 'px-2.5 py-1 rounded-xl bg-bank-darkest border border-bank-border text-emerald-300 font-royal font-bold text-[10px] uppercase whitespace-nowrap hover:bg-bank-card';
    }
  });
  renderP2PAuctionSelectableItems();
}

export function handleP2PAuctionModalSearch(val) {
  p2pModalSearchQuery = String(val || '').trim().toLowerCase();
  renderP2PAuctionSelectableItems();
}

export function collectUserAuctionableAssets(u) {
  if (!u || !Core) return [];
  const items = [];
  const now = Core.getServerTime();
  const deviceNow = Date.now();

  // 1. Бизнесы / Промыслы
  getUserBusinessSlotsEntries(u, Core.appData.settings).forEach(({ slotKey, cfg, data }) => {
    const cond = computeEffectiveSlotCondition(data, now);
    const val = calculateTotalBusinessInvestment(cfg, data.level || 1);
    const hr = getBusinessHourlyIncome(cfg, data.level || 1, cond, Core.appData.settings);
    items.push({
      val: `business|${slotKey}`,
      categoryGroup: 'business',
      badge: `🏭 Промысел • Ур.${data.level || 1}/20`,
      title: cfg.name,
      sub: `Сост: ${cond}% • Доход: +${formatBaity(hr)}/ч`,
      icon: cfg.icon || 'fa-industry',
      recommendedPrice: Math.max(100, Math.round(val * 0.85)),
      valuation: val
    });
  });

  // 2. Земная Недвижимость
  REAL_ESTATE_CATALOG.forEach(cfg => {
    const cnt = Number(u.realEstate?.[cfg.id]?.count || 0);
    if (cnt > 0) {
      const val = getDynamicShopPrice(cfg.id, cfg.price, 'realestate');
      items.push({
        val: `realestate|${cfg.id}`,
        categoryGroup: 'realestate',
        badge: `🏢 Недвижимость (×${cnt})`,
        title: cfg.title,
        sub: `Рента 5%/ч • Оценка: ${formatBaity(val)}`,
        icon: 'fa-building',
        image: cfg.image,
        recommendedPrice: Math.max(1000, Math.round(val * 0.85)),
        valuation: val
      });
    }
  });

  // 3. Космос и Инвентарь (Автопарк, Картины, Товары)
  const inv = Array.isArray(u.inventory) ? u.inventory : [];
  inv.forEach((item, idx) => {
    if (!item) return;
    const cat = item.category || 'bazaar';
    const itemKey = item.instanceId || item.id || `inv_${idx}`;

    if (cat === 'cosmos') {
      const b = u.cosmicBases?.[item.id] || { mining: 0, research: 0, power: 0 };
      const lvls = Number(b.mining || 0) + Number(b.research || 0) + Number(b.power || 0);
      const val = Number(item.price || 150000000000);
      items.push({
        val: `cosmos|${item.id}`,
        categoryGroup: 'cosmos',
        badge: `🌌 Космос • Базы: ${lvls}/15`,
        title: item.title,
        sub: `Оценка: ${formatBaity(val)}`,
        icon: 'fa-globe',
        image: item.artwork,
        recommendedPrice: Math.max(10000, Math.round(val * 0.85)),
        valuation: val
      });
    } else if (cat === 'garage') {
      const cond = getCarCurrentCondition(item, deviceNow);
      const val = Math.max(1000, Math.round(Number(item.price || 6000000) * (cond / 100)));
      items.push({
        val: `garage|${itemKey}`,
        categoryGroup: 'vault',
        badge: `🏎️ Автопарк • Сост: ${cond}%`,
        title: item.title,
        sub: `Оценка с учётом ТО: ${formatBaity(val)}`,
        icon: 'fa-car-side',
        image: item.artwork,
        recommendedPrice: Math.max(500, Math.round(val * 0.85)),
        valuation: val
      });
    } else {
      const val = Math.max(100, Number(item.price || 1000));
      items.push({
        val: `${cat}|${itemKey}`,
        categoryGroup: 'vault',
        badge: cat === 'art' ? '🎨 Шедевр искусства' : '📦 Предмет Рынка',
        title: item.title,
        sub: `Оценка: ${formatBaity(val)}`,
        icon: cat === 'art' ? 'fa-palette' : 'fa-gem',
        image: item.artwork,
        recommendedPrice: Math.max(100, Math.round(val * 0.85)),
        valuation: val
      });
    }
  });

  return items;
}

export function selectP2PAuctionCardItem(encodedVal, recPrice) {
  p2pSelectedOptionVal = encodedVal;
  const hiddenSel = document.getElementById('p2pAuctionAssetSelect');
  if (hiddenSel) hiddenSel.value = encodedVal;
  const priceInp = document.getElementById('p2pAuctionStartPrice');
  if (priceInp && recPrice) priceInp.value = recPrice;
  renderP2PAuctionSelectableItems();
}

export function renderP2PAuctionSelectableItems() {
  if (!Core || !Core.state.currentUser) return;
  const u = Core.findUser(Core.state.currentUser);
  if (!u) return;

  const allItems = collectUserAuctionableAssets(u);
  const filtered = allItems.filter(it => {
    if (p2pModalFilterCat !== 'all' && it.categoryGroup !== p2pModalFilterCat) return false;
    if (p2pModalSearchQuery && !it.title.toLowerCase().includes(p2pModalSearchQuery) && !it.badge.toLowerCase().includes(p2pModalSearchQuery)) return false;
    return true;
  });

  if (!p2pSelectedOptionVal && filtered.length > 0) {
    p2pSelectedOptionVal = filtered[0].val;
    const priceInp = document.getElementById('p2pAuctionStartPrice');
    if (priceInp && !priceInp.value) priceInp.value = filtered[0].recommendedPrice;
  }

  const hiddenSel = document.getElementById('p2pAuctionAssetSelect');
  if (hiddenSel) {
    hiddenSel.innerHTML = allItems.map(o => `<option value="${escapeHtml(o.val)}">${escapeHtml(o.badge)} — ${escapeHtml(o.title)}</option>`).join('');
    if (p2pSelectedOptionVal) hiddenSel.value = p2pSelectedOptionVal;
  }

  const grid = document.getElementById('p2pAuctionQuickSelectGrid');
  if (!grid) return;

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="col-span-full py-5 text-center text-xs text-emerald-400/70">В этой категории ничего не найдено</div>`;
    return;
  }

  grid.innerHTML = filtered.map(it => {
    const isSel = it.val === p2pSelectedOptionVal;
    return `
      <div onclick="selectP2PAuctionCardItem('${escapeHtml(it.val)}', ${it.recommendedPrice})" class="cursor-pointer p-2.5 rounded-2xl border transition-all flex items-center justify-between gap-2.5 ${isSel ? 'bg-bank-card border-2 border-bank-gold shadow-[0_0_15px_rgba(230,200,117,0.3)]' : 'bg-bank-darkest/90 border-bank-border hover:border-bank-gold/50'}">
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="w-9 h-9 rounded-xl bg-black border border-bank-gold/50 text-bank-gold flex items-center justify-center flex-shrink-0 overflow-hidden">
            ${it.image ? `<img src="${it.image}" class="w-full h-full object-cover">` : `<i class="fa-solid ${it.icon} text-xs"></i>`}
          </div>
          <div class="min-w-0">
            <span class="text-[9px] font-mono text-amber-300 block truncate">${escapeHtml(it.badge)}</span>
            <div class="font-royal font-bold text-xs text-white truncate">${escapeHtml(it.title)}</div>
            <div class="text-[10px] text-emerald-400/80 font-mono truncate">${escapeHtml(it.sub)}</div>
          </div>
        </div>
        <div class="flex-shrink-0">
          ${isSel
            ? `<span class="px-2 py-1 rounded-lg bg-bank-gold text-black font-royal font-black text-[9px] uppercase">✓ Выбран</span>`
            : `<span class="px-2 py-1 rounded-lg bg-bank-surface text-emerald-300 text-[9px] font-bold">Выбрать</span>`
          }
        </div>
      </div>
    `;
  }).join('');
}

export function openCreateP2PAuctionModal(preselectKey = null) {
  if (!Core) return;
  if (Core.guardDemoReadOnly()) return;
  if (!Core.state.currentUser) return showToast('Войдите в счёт!', 'error');
  const u = Core.findUser(Core.state.currentUser);
  if (!u) return;

  const allItems = collectUserAuctionableAssets(u);
  if (allItems.length === 0) {
    return showToast('У вас пока нет бизнесов, недвижимости, космоса или предметов для выставления на 24ч Аукцион!', 'info');
  }

  p2pModalFilterCat = 'all';
  p2pModalSearchQuery = '';
  const searchInp = document.getElementById('p2pAuctionSearchInput');
  if (searchInp) searchInp.value = '';

  if (preselectKey) {
    const match = allItems.find(o => o.val === preselectKey || o.val.endsWith(`|${preselectKey}`));
    if (match) {
      p2pSelectedOptionVal = match.val;
      const priceInp = document.getElementById('p2pAuctionStartPrice');
      if (priceInp) priceInp.value = match.recommendedPrice;
    }
  } else {
    p2pSelectedOptionVal = allItems[0].val;
    const priceInp = document.getElementById('p2pAuctionStartPrice');
    if (priceInp) priceInp.value = allItems[0].recommendedPrice;
  }

  setP2PAuctionModalCategory('all');

  const modal = document.getElementById('createP2PAuctionModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

export function closeCreateP2PAuctionModal() {
  const modal = document.getElementById('createP2PAuctionModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

export function renderP2PAuctionsView() {
  const grid = document.getElementById('p2pAuctionsActiveGrid');
  if (!grid || !Core) return;
  const now = Core.getServerTime();
  const list = Object.values(Core.appData.p2pAuctions || {}).filter(a => a && a.status === 'active').sort((a, b) => (a.endsAtMs || 0) - (b.endsAtMs || 0));

  if (list.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full p-6 rounded-3xl bg-bank-darkest/80 border border-dashed border-bank-gold/40 text-center space-y-2">
        <div class="text-2xl">🔨</div>
        <div class="font-royal font-bold text-sm text-white">На 24-часовом P2P-Аукционе пока нет активных лотов</div>
        <p class="text-xs text-emerald-400/75">Выставьте своё предприятие, недвижимость, космо-объект или предмет первым в 2 клика!</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = list.map(auc => {
    const leftMs = Math.max(0, Number(auc.endsAtMs || 0) - now);
    const minNext = auc.highestBidder ? Math.round(auc.currentBid * 1.05) : auc.startPrice;
    const isMy = Core.state.currentUser && normalizeLogin(Core.state.currentUser) === normalizeLogin(auc.seller);

    return `
      <div class="p-4 rounded-3xl bg-bank-darkest border-2 border-bank-gold/60 flex flex-col justify-between space-y-3 shadow-xl">
        <div>
          <div class="flex items-center justify-between text-[10px] font-mono mb-1">
            <span class="px-2 py-0.5 rounded bg-rose-950 border border-rose-500/40 text-rose-300">⏱ Осталось: ${formatCountdownHMS(leftMs)}</span>
            <span class="text-emerald-300 cursor-pointer hover:underline" onclick="openPlayerPublicProfileModal('${escapeHtml(auc.seller)}')">Продавец: @${escapeHtml(auc.seller)}</span>
          </div>
          <h4 class="font-royal font-black text-sm sm:text-base text-white">${escapeHtml(auc.title)}</h4>
          <div class="text-[11px] text-emerald-300/85 mt-0.5">
            Уровень / Базы: <b class="text-bank-gold">${auc.level || 1}</b> • Состояние: <b class="text-emerald-300">${auc.condition ?? 100}%</b>
          </div>
        </div>

        <div class="p-2.5 rounded-2xl bg-bank-surface/90 border border-bank-border space-y-1 text-xs">
          <div class="flex justify-between">
            <span class="text-emerald-400/75">Текущая ставка:</span>
            <span class="font-royal font-black text-bank-gold">${formatBaity(auc.currentBid)}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-emerald-400/75">Лидер торгов:</span>
            <span class="font-mono font-bold text-white">${auc.highestBidder ? '@' + escapeHtml(auc.highestBidder) : 'Ставок пока нет'}</span>
          </div>
        </div>

        ${!isMy ? `
          <div class="flex gap-1.5">
            <input type="number" id="p2pBidInput_${auc.id}" value="${minNext}" min="${minNext}" class="tap-btn flex-1 bg-bank-surface border border-bank-gold/60 rounded-xl px-2.5 text-xs font-mono font-bold text-bank-gold focus:outline-none">
            <button type="button" onclick="placeBidOnP2PAuction('${auc.id}', this)" class="tap-btn px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-bank-gold to-yellow-600 text-black font-royal font-black text-xs uppercase shadow-md">
              🔨 Ставка
            </button>
          </div>
        ` : `<div class="text-center py-1.5 rounded-xl bg-bank-surface border border-bank-border text-[10px] font-mono text-emerald-400">Это ваш актив на торгах</div>`}
      </div>
    `;
  }).join('');
}

export function renderP2PAndCourtStatusOnDashboard(u) {
  const box = document.getElementById('p2pAndCourtStatusBox');
  const offersEl = document.getElementById('incomingP2POffersList');
  const courtEl = document.getElementById('activeCourtTransfersList');
  if (!box || !offersEl || !courtEl || !u || !Core) return;

  const uLow = normalizeLogin(u.username);
  const myIncomingOffers = Object.values(Core.appData.p2pOffers || {}).filter(o => o && o.status === 'pending' && normalizeLogin(o.seller) === uLow);
  const myCourtItems = Object.values(Core.appData.courtTransfers || {}).filter(c => c && c.status === 'in_court' && (normalizeLogin(c.buyer) === uLow || normalizeLogin(c.seller) === uLow));

  if (myIncomingOffers.length === 0 && myCourtItems.length === 0) {
    box.classList.add('hidden');
    return;
  }

  box.classList.remove('hidden');
  const now = Core.getServerTime();

  offersEl.innerHTML = myIncomingOffers.map(o => `
    <div class="p-3 rounded-2xl bg-bank-darkest border border-emerald-500/60 flex flex-wrap items-center justify-between gap-2 text-xs">
      <div>
        <span class="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-mono text-[9px] uppercase">Входящее P2P-предложение</span>
        <div class="font-bold text-white mt-0.5">@${escapeHtml(o.buyer)} предлагает купить «${escapeHtml(o.title)}» (Ур.${o.level}) за <b class="text-bank-gold">${formatBaity(o.offerPrice)}</b></div>
      </div>
      <div class="flex gap-1.5">
        <button onclick="respondToP2POffer('${o.id}', true, this)" class="px-3 py-1.5 rounded-xl bg-emerald-600 text-emerald-950 font-royal font-black text-[10px] uppercase">✅ Согласиться</button>
        <button onclick="respondToP2POffer('${o.id}', false, this)" class="px-3 py-1.5 rounded-xl bg-rose-900 text-white font-royal font-bold text-[10px] uppercase">✕ Отказаться</button>
      </div>
    </div>
  `).join('');

  courtEl.innerHTML = myCourtItems.map(c => {
    const leftMs = Math.max(0, Number(c.endsAtMs || 0) - now);
    return `
      <div class="p-3 rounded-2xl bg-amber-950/30 border border-amber-400/60 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div>
          <span class="px-2 py-0.5 rounded bg-amber-500 text-black font-royal font-black text-[9px] uppercase">⚖️ Переоформление в суде</span>
          <div class="font-bold text-white mt-0.5">«${escapeHtml(c.title)}» (Ур.${c.level}, сост. ${c.condition}%) • От @${escapeHtml(c.seller)} к @${escapeHtml(c.buyer)}</div>
        </div>
        <span class="px-3 py-1 rounded-xl bg-black border border-bank-gold text-bank-gold font-mono font-black text-xs">${formatCountdownHMS(leftMs)}</span>
      </div>
    `;
  }).join('');
}

// -------------------------------------------------------------------------
// 6. РЕНДЕР ПРОМЫСЛОВ (/earn) И НОВОЙ НАЛОГОВОЙ ПАЛАТЫ (72 ЧАСА + РАСПИСКА)
// -------------------------------------------------------------------------
export function renderEarnAndLoansView() {
  if (!Core || !Core.state.currentUser) return;
  const u = Core.findUser(Core.state.currentUser);
  if (!u) return;

  const balEl = document.getElementById('earnUserBalanceLabel');
  if (balEl) balEl.innerText = formatBaity(u.balance || 0);

  renderBusinessesCatalog();
  updateRealtimeBusinessAndHackCounters();

  const now = Core.getServerTime();
  const taxDecl = calculateUserTaxDeclaration(u, Core.appData.loans, Core.appData.settings, now, Core.state.isDemoMode);

  const taxMini = document.getElementById('userTaxSummaryMiniBadge');
  if (taxMini) {
    taxMini.innerText = taxDecl.dailyBill.totalTax > 0
      ? `Таймер 72ч: ${formatCountdownHMS(taxDecl.timeLeftMs)}`
      : 'Налог: 0 ฿';
  }

  const box = document.getElementById('citizenLoansContainer');
  if (!box) return;

  // Формируем интерактивную карточку Налоговой Декларации (72ч) + Список Расписок с оплатой по частям
  let html = '';

  if (taxDecl.dailyBill.totalTax > 0) {
    const canPayFull = (u.balance || 0) >= taxDecl.accumulatedTax;
    html += `
      <div class="p-3 rounded-2xl bg-bank-darkest border-2 ${taxDecl.isOverdue72h ? 'border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.35)]' : 'border-bank-gold/60'} space-y-2">
        <div class="flex items-center justify-between text-[10px] font-mono">
          <span class="${taxDecl.isOverdue72h ? 'text-rose-400 font-black animate-pulse' : 'text-emerald-300'}">
            ${taxDecl.isOverdue72h ? '❄️ ПРОСРОЧЕНО (>72ч) • ДОХОД ЗАМОРОЖЕН' : '⏳ Срок подачи декларации (72ч):'}
          </span>
          <span id="earnTaxCountdownTimer" class="px-2 py-0.5 rounded bg-black border border-bank-gold/50 text-bank-gold font-bold">
            ${formatCountdownHMS(taxDecl.timeLeftMs)}
          </span>
        </div>

        <div class="flex items-baseline justify-between pt-0.5">
          <span class="text-[11px] text-emerald-200">Накопленный налог к уплате:</span>
          <span id="earnAccumulatedTaxVal" class="font-royal font-black text-sm sm:text-base text-bank-gold">${formatBaity(taxDecl.accumulatedTax)}</span>
        </div>
        <div class="text-[9px] text-emerald-400/75 font-mono">
          Суточная ставка: ${formatBaity(taxDecl.dailyBill.totalTax)}/сут (Бизнес: ${formatBaity(taxDecl.dailyBill.bizTax)}, Недвиж: ${formatBaity(taxDecl.dailyBill.reTax)}, Гараж: ${formatBaity(taxDecl.dailyBill.garageRent)})
        </div>

        <div class="grid grid-cols-1 gap-1.5 pt-1">
          <button type="button" onclick="submitManualTaxDeclaration(this)" class="tap-btn w-full py-2 px-3 rounded-xl font-royal font-black text-[10px] sm:text-xs uppercase shadow-md transition-all ${canPayFull ? 'bg-gradient-to-r from-emerald-400 to-emerald-600 text-emerald-950 hover:brightness-110' : 'bg-bank-surface border border-bank-border text-emerald-300/70'}">
            📜 Отправить в закон и оплатить (${formatBaity(taxDecl.accumulatedTax)})
          </button>
          <button type="button" onclick="issueTaxPromissoryNote72h(this)" class="tap-btn w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:brightness-110 text-black font-royal font-black text-[10px] sm:text-xs uppercase shadow-md transition-all">
            ✍️ Выписать долговую расписку (Разморозить + платить в ${TAX_NOTE_INSTALLMENTS_COUNT} части)
          </button>
        </div>
      </div>
    `;
  } else {
    html += `
      <div class="p-3 rounded-2xl bg-bank-darkest/80 border border-emerald-500/30 text-center text-xs text-emerald-300">
        <i class="fa-solid fa-shield-check text-bank-gold mr-1"></i> Налогооблагаемого земного имущества пока нет (0 ฿)
      </div>
    `;
  }

  // Вывод активных расписок с возможностью выплаты по частям (долям)
  taxDecl.activeTaxPromissoryNotes.forEach(note => {
    const totalParts = Number(note.installmentsTotal || TAX_NOTE_INSTALLMENTS_COUNT);
    const paidParts = Number(note.installmentsPaid || 0);
    const leftParts = Math.max(1, totalParts - paidParts);
    const partAmt = Math.max(1, Math.ceil(Number(note.remainingAmount || note.totalRepay || 0) / leftParts));
    const remAmt = Math.max(1, Number(note.remainingAmount || note.totalRepay || 0));
    const dueLeftMs = Math.max(0, Number(note.dueAtMs || (now + 72 * 3600000)) - now);

    html += `
      <div class="p-3 rounded-2xl bg-amber-950/30 border border-amber-400/70 space-y-2 text-xs">
        <div class="flex items-center justify-between">
          <span class="font-royal font-bold text-amber-300 text-[11px]">✍️ Расписка (${paidParts}/${totalParts} частей оплачено)</span>
          <span class="text-[9px] font-mono text-emerald-300">Срок: ${formatCountdownHMS(dueLeftMs)}</span>
        </div>
        <div class="flex justify-between text-[11px]">
          <span class="text-emerald-200">Остаток долга:</span>
          <span class="font-mono font-black text-bank-gold">${formatBaity(remAmt)}</span>
        </div>
        <div class="h-1.5 w-full bg-black rounded-full overflow-hidden">
          <div class="h-full bg-gradient-to-r from-emerald-400 to-bank-gold" style="width: ${Math.round((paidParts / totalParts) * 100)}%"></div>
        </div>
        <div class="grid grid-cols-2 gap-1.5 pt-0.5">
          <button type="button" onclick="payTaxNoteInstallmentPart('${note.id}', false, this)" class="py-1.5 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-emerald-950 font-royal font-black text-[10px] uppercase">
            Часть 1/${leftParts} (${formatBaity(partAmt)})
          </button>
          <button type="button" onclick="payTaxNoteInstallmentPart('${note.id}', true, this)" class="py-1.5 px-2 rounded-xl bg-bank-gold hover:bg-yellow-500 text-black font-royal font-black text-[10px] uppercase">
            Весь остаток (${formatBaity(remAmt)})
          </button>
        </div>
      </div>
    `;
  });

  // Прочие государственные ссуды/кредиты
  taxDecl.otherActiveLoans.forEach(l => {
    html += `
      <div class="p-2.5 rounded-2xl bg-bank-darkest border border-amber-500/50 flex items-center justify-between gap-2">
        <div class="text-xs">
          <div class="font-bold text-white">${escapeHtml(l.reason)}</div>
          <div class="text-[10px] text-emerald-400/70 font-mono">К погашению: <b class="text-bank-gold">${formatBaity(l.totalRepay)}</b></div>
        </div>
        <button onclick="repayStateLoan('${l.id}', this)" class="px-3 py-1 rounded-xl bg-bank-gold text-black font-royal font-bold text-[10px] uppercase">Погасить</button>
      </div>
    `;
  });

  box.innerHTML = html;
}

export function renderBusinessesCatalog() {
  const grid = document.getElementById('businessesCatalogGrid');
  if (!grid || !Core || !Core.state.currentUser) return;
  const u = Core.findUser(Core.state.currentUser);
  if (!u) return;

  Core.checkAndFinalizeCompletedUpgrades(u);
  const slots = getUserBusinessSlotsEntries(u, Core.appData.settings);
  const calc = calculateUserPendingBusinessRevenue(u, Core.appData.loans, Core.appData.settings, Core.getServerTime(), Core.state.isDemoMode);
  const mult = Number(Core.appData.settings?.business?.globalMultiplier || 1);
  const ev = Core.appData.settings?.activeEvent;
  const isGoldRush = ev && ev.active && ev.type === 'gold_rush';
  const taxPct = Core.getEffectiveTaxPercent();

  const tLbl1 = document.getElementById('earnTaxPercentLabel');
  const tLbl2 = document.getElementById('earnTaxPercentLabel2');
  if (tLbl1) tLbl1.innerText = String(taxPct);
  if (tLbl2) tLbl2.innerText = String(taxPct);

  const freezeBadge = document.getElementById('bizDebtFreezeBadge');
  if (freezeBadge) {
    freezeBadge.classList.toggle('hidden', !calc.isFrozenByDebt);
    if (calc.isFrozenByDebt) {
      freezeBadge.innerText = '❄️ ДОХОД ЗАМОРОЖЕН (ПРОСРОЧЕНА ДЕКЛАРАЦИЯ 72Ч — ОПЛАТИТЕ ИЛИ ВЫПИШИТЕ РАСПИСКУ!)';
    }
  }

  const slotsBadge = document.getElementById('earnOwnedSlotsBadge');
  const countText = document.getElementById('myActiveBizCountText');
  if (slotsBadge) slotsBadge.innerText = `${calc.ownedCount} / ${MAX_USER_BUSINESSES}`;
  if (countText) countText.innerText = String(calc.ownedCount);

  const multBadge = document.getElementById('bizGlobalMultiplierBadge');
  if (multBadge) {
    const showMult = mult > 1 || isGoldRush;
    multBadge.classList.toggle('hidden', !showMult);
    multBadge.innerText = isGoldRush ? `🔥 ЗОЛОТАЯ ЛИХОРАДКА (+50% ДОХОД)` : `🔥 ИВЕНТ x${mult} ДОХОД`;
  }

  const openModalBtn = document.getElementById('openNewBusinessModalBtn');
  if (openModalBtn) {
    const freeSlots = Math.max(0, MAX_USER_BUSINESSES - calc.ownedCount);
    openModalBtn.innerHTML = `<i class="fa-solid fa-plus-circle"></i> Открыть (${freeSlots} св.)`;
  }

  if (slots.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full p-6 rounded-3xl bg-bank-surface/90 border-2 border-dashed border-bank-gold/50 text-center space-y-3">
        <div class="w-12 h-12 mx-auto rounded-2xl bg-bank-darkest border border-bank-gold flex items-center justify-center text-bank-gold text-xl shadow-lg">
          <i class="fa-solid fa-industry"></i>
        </div>
        <div>
          <h4 class="font-royal text-sm sm:text-lg font-bold text-white">У вас пока нет действующих предприятий</h4>
          <p class="text-xs text-emerald-400/80 max-w-md mx-auto mt-1">Откройте своё первое предприятие в Реестре Корпораций (до 10 слотов) или купите готовый бизнес на 24ч Аукционе!</p>
        </div>
        <button onclick="openNewBusinessRegistryModal()" class="tap-btn px-5 py-2.5 bg-gradient-to-r from-bank-gold to-yellow-600 text-black font-royal font-black rounded-2xl text-xs uppercase shadow-xl">
          <i class="fa-solid fa-plus mr-1"></i> Открыть предприятие (от 150 ฿)
        </button>
      </div>
    `;
    return;
  }

  const cardsHtml = slots.map(({ slotKey, cfg, data }, idx) => {
    const lvl = Number(data.level || 1);
    const isMaxLevel = lvl >= MAX_BUSINESS_LEVEL;
    const nextCost = getBusinessUpgradeCost(cfg, lvl);
    const info = calc.perSlot[slotKey] || { earned: 0, hourly: 0, condition: 100, isWornOut: false, repairCost: 0, fillPct: 0, isFull: false, isUpgrading: false, upgLeftMs: 0, upgPct: 0 };
    const curHourly = info.hourly;
    const nextHourly = getBusinessHourlyIncome(cfg, lvl + 1, 100, Core.appData.settings);
    const nextDurationMs = getBusinessUpgradeDurationMs(lvl);
    const canAfford = (u.balance || 0) >= nextCost;

    const condColor = info.condition < 50 ? 'text-rose-400' : (info.condition < 80 ? 'text-amber-300' : 'text-emerald-300');
    const condBarColor = info.condition < 50 ? 'bg-rose-500' : (info.condition < 80 ? 'bg-amber-400' : 'bg-emerald-400');

    let actionButtonHtml = '';
    if (isMaxLevel && !info.isUpgrading) {
      actionButtonHtml = `<div class="w-full py-2 px-3 rounded-2xl bg-amber-500/20 border border-bank-gold text-bank-gold font-royal font-black text-[11px] uppercase text-center">👑 МАКС. УРОВЕНЬ (${lvl}/${MAX_BUSINESS_LEVEL})</div>`;
    } else if (info.isUpgrading) {
      actionButtonHtml = `
        <div class="p-2.5 rounded-2xl bg-amber-950/40 border border-amber-400/60 space-y-1">
          <div class="flex items-center justify-between text-[10px] font-mono">
            <span class="text-amber-300 font-bold"><i class="fa-solid fa-gears fa-spin mr-1"></i> Ур. ${lvl + 1}...</span>
            <span id="bizUpgTimer-${slotKey}" class="text-white font-black">${formatCountdownHMS(info.upgLeftMs)}</span>
          </div>
          <div class="h-1.5 w-full bg-black rounded-full overflow-hidden border border-amber-500/40">
            <div id="bizUpgBar-${slotKey}" class="h-full bg-gradient-to-r from-amber-500 to-yellow-400" style="width: ${info.upgPct.toFixed(1)}%"></div>
          </div>
        </div>
      `;
    } else {
      actionButtonHtml = `
        <button onclick="upgradeBusinessSlot('${slotKey}', this)" class="tap-btn w-full py-2 px-3 rounded-2xl font-royal font-black text-[11px] uppercase tracking-wider transition-all shadow-md flex items-center justify-between ${canAfford ? 'bg-gradient-to-r from-bank-gold to-yellow-600 text-black hover:brightness-110' : 'bg-bank-darkest border border-bank-border text-emerald-400/60'}">
          <span><i class="fa-solid fa-arrow-up-right-dots mr-1"></i> Ур. ${lvl + 1} (${formatDurationHuman(nextDurationMs)})</span>
          <span class="font-mono font-black">${formatBaity(nextCost)}</span>
        </button>
      `;
    }

    return `
      <div class="p-3.5 sm:p-5 rounded-3xl bg-bank-surface/95 border ${calc.isFrozenByDebt || info.isWornOut ? 'border-rose-500/80' : 'border-emerald-500/60'} shadow-lg guilloche-panel flex flex-col justify-between space-y-2.5">
        <div class="flex items-start justify-between gap-2">
          <div class="flex items-center gap-2.5 min-w-0">
            <div onclick="openBusinessInspectorModal('${slotKey}')" class="cursor-pointer w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-bank-darkest border border-bank-gold/60 text-bank-gold flex items-center justify-center text-base sm:text-xl flex-shrink-0 shadow-md">
              <i class="fa-solid ${cfg.icon}"></i>
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-1 flex-wrap">
                <span class="px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-500/40 text-[8px] font-mono text-emerald-300 uppercase">#${idx + 1}</span>
                <span class="px-1.5 py-0.5 rounded bg-bank-darkest border border-bank-gold/50 text-[9px] font-mono font-bold text-bank-gold">Ур. ${lvl}/${MAX_BUSINESS_LEVEL}</span>
                ${calc.isFrozenByDebt ? `<span class="px-1.5 py-0.5 rounded bg-rose-700 text-[8px] font-mono font-black text-white">❄️ 72ч НАЛОГ</span>` : (info.isWornOut ? `<span class="px-1.5 py-0.5 rounded bg-rose-950 border border-rose-500 text-[8px] font-mono font-bold text-rose-300 animate-pulse">⚠️ ИЗНОС (60%)</span>` : '')}
              </div>
              <h4 class="font-royal font-black text-xs sm:text-base text-white mt-0.5 truncate">${escapeHtml(cfg.name)}</h4>
            </div>
          </div>
          <div class="flex gap-1 flex-shrink-0">
            <button onclick="openCreateP2PAuctionModal('business|${slotKey}')" class="px-2 py-1 rounded-xl bg-bank-darkest hover:bg-amber-950 border border-bank-gold/50 text-bank-gold text-[10px] font-bold" title="Выставить на 24ч Аукцион">
              🔨 Аукцион
            </button>
            <button onclick="openBusinessInspectorModal('${slotKey}')" class="px-2 py-1 rounded-xl bg-bank-darkest hover:bg-rose-950/60 border border-bank-border text-emerald-300 text-[10px] font-bold">
              <i class="fa-solid fa-gear"></i>
            </button>
          </div>
        </div>

        <div class="p-2.5 rounded-2xl bg-bank-darkest/90 border border-bank-border space-y-1.5">
          <div class="flex items-center justify-between text-[11px]">
            <span class="text-emerald-400/80">Доход:</span>
            <span class="font-mono font-bold ${calc.isFrozenByDebt || info.isWornOut ? 'text-rose-300' : 'text-emerald-300'}">+${formatBaity(curHourly)}/ч ${calc.isFrozenByDebt ? '(Заморожен)' : (info.isWornOut ? '(60%)' : '')}</span>
          </div>
          ${!isMaxLevel ? `<div class="flex items-center justify-between text-[10px]"><span class="text-emerald-400/70">На Ур. ${lvl + 1}:</span><span class="font-mono text-bank-gold">+${formatBaity(nextHourly)}/ч</span></div>` : ''}
          
          <div class="pt-1 border-t border-bank-border/60 space-y-1">
            <div class="flex items-center justify-between text-[10px] font-mono">
              <span class="text-emerald-400/80"><i class="fa-solid fa-screwdriver-wrench text-[9px] mr-1 text-bank-gold"></i>Состояние снабжения:</span>
              <span id="bizCondText-${slotKey}" class="font-bold ${condColor}">${info.condition}%</span>
            </div>
            <div class="h-1.5 w-full bg-black rounded-full overflow-hidden">
              <div id="bizCondBar-${slotKey}" class="h-full ${condBarColor} transition-all" style="width: ${info.condition}%"></div>
            </div>
            ${info.condition < 100 ? `
              <button type="button" onclick="repairBusinessSlotCondition('${slotKey}', this)" class="mt-1 w-full py-1 px-2 rounded-xl ${info.isWornOut ? 'bg-gradient-to-r from-rose-600 to-amber-600 text-white font-black' : 'bg-bank-surface hover:bg-bank-card border border-bank-gold/40 text-bank-gold font-bold'} text-[10px] uppercase transition-all flex items-center justify-between">
                <span>🔧 Обслужить / Снабдить до 100%</span>
                <span class="font-mono">${formatBaity(info.repairCost)}</span>
              </button>
            ` : ''}
          </div>

          <div class="pt-1 border-t border-bank-border/60 space-y-1">
            <div class="flex justify-between text-[10px] font-mono">
              <span class="text-emerald-400">Касса:</span>
              <span id="bizAccText-${slotKey}" class="text-bank-gold font-bold">${formatBaity(info.earned, { decimals: 2 })}</span>
            </div>
            <div class="h-1.5 w-full bg-black rounded-full overflow-hidden">
              <div id="bizFillBar-${slotKey}" class="h-full bg-gradient-to-r from-emerald-500 to-bank-gold" style="width: ${info.fillPct.toFixed(1)}%"></div>
            </div>
          </div>
        </div>
        ${actionButtonHtml}
      </div>
    `;
  }).join('');

  const addMoreCard = calc.ownedCount < MAX_USER_BUSINESSES ? `
    <div onclick="openNewBusinessRegistryModal()" class="cursor-pointer p-4 rounded-3xl bg-bank-darkest/70 hover:bg-bank-card/70 border-2 border-dashed border-bank-gold/50 flex flex-col items-center justify-center text-center space-y-1.5 min-h-[160px] transition-all">
      <div class="w-10 h-10 rounded-2xl bg-bank-surface border border-bank-gold/50 text-bank-gold flex items-center justify-center text-lg"><i class="fa-solid fa-plus"></i></div>
      <div class="font-royal font-black text-xs text-bank-gold uppercase">Открыть предприятие</div>
      <div class="text-[10px] text-emerald-400/80 font-mono">Свободно: ${MAX_USER_BUSINESSES - calc.ownedCount} из ${MAX_USER_BUSINESSES}</div>
    </div>
  ` : '';

  grid.innerHTML = cardsHtml + addMoreCard;
}

export function updateRealtimeBusinessAndHackCounters() {
  if (!Core || !Core.state.currentUser) return;
  const u = Core.findUser(Core.state.currentUser);
  if (!u) return;

  Core.checkAndFinalizeCompletedUpgrades(u);
  const now = Core.getServerTime();
  const calc = calculateUserPendingBusinessRevenue(u, Core.appData.loans, Core.appData.settings, now, Core.state.isDemoMode);
  const taxPct = Core.getEffectiveTaxPercent();
  const rawFloor = calc.totalRaw;
  const taxAmt = Math.floor(rawFloor * (taxPct / 100));
  const netAmt = Math.max(0, Math.floor(rawFloor) - taxAmt);

  const dashQuick = document.getElementById('dashBusinessQuickStatus');
  if (dashQuick) {
    dashQuick.innerText = calc.isFrozenByDebt ? '❄️ Доход заморожен!' : `Касса: ${formatBaity(Math.floor(rawFloor))}`;
  }

  // Живой таймер 72 часов для налоговой декларации
  const taxTimerEl = document.getElementById('earnTaxCountdownTimer');
  const taxAccEl = document.getElementById('earnAccumulatedTaxVal');
  if (taxTimerEl) taxTimerEl.innerText = formatCountdownHMS(calc.taxDecl.timeLeftMs);
  if (taxAccEl) taxAccEl.innerText = formatBaity(calc.taxDecl.accumulatedTax);

  const reCalc = calculateUserRealEstateRent(u, Core.appData.settings, now, calc.isFrozenByDebt);
  const cosCalc = calculateUserCosmicRent(u, Core.appData.settings, now);
  const dashReQuick = document.getElementById('dashRealEstateQuickStatus');
  if (dashReQuick) {
    const combinedRent = Math.floor(reCalc.totalPending + cosCalc.totalPending);
    dashReQuick.innerText = (reCalc.totalHourly + cosCalc.totalHourly) > 0
      ? `Рента: ${formatBaity(combinedRent)}`
      : 'Аренда 5%/ч и Базы';
  }

  if (Core.state.currentRoute === '/market' && Core.state.currentMarketSubTab === 'realestate') {
    const reTotEl = document.getElementById('totalPendingRealEstateRent');
    const reHrEl = document.getElementById('totalRealEstateHourlyBadge');
    if (reTotEl) reTotEl.innerText = formatBaity(reCalc.totalPending, { decimals: 2 });
    if (reHrEl) reHrEl.innerText = `+${formatBaity(reCalc.totalHourly)} / час`;
    Object.entries(reCalc.perItem).forEach(([reId, info]) => {
      const timerEl = document.getElementById(`rePrepTimer-${reId}`);
      const earnedEl = document.getElementById(`reEarnedText-${reId}`);
      const barEl = document.getElementById(`reFillBar-${reId}`);
      if (info.state === 'preparing' && timerEl) timerEl.innerText = formatCountdownHMS(info.leftMs);
      else if (info.state === 'renting') {
        if (earnedEl) earnedEl.innerText = formatBaity(info.earned, { decimals: 2 });
        if (barEl) barEl.style.width = `${info.fillPct.toFixed(1)}%`;
      }
    });
  }

  if (Core.state.currentRoute === '/market' && Core.state.currentMarketSubTab === 'cosmos') {
    const cosTotEl = document.getElementById('totalPendingCosmicRent');
    const cosHrEl = document.getElementById('totalCosmicHourlyBadge');
    if (cosTotEl) cosTotEl.innerText = formatBaity(cosCalc.totalPending, { decimals: 2 });
    if (cosHrEl) cosHrEl.innerText = `+${formatBaity(cosCalc.totalHourly)} / час`;
    Object.entries(cosCalc.perItem).forEach(([cosId, info]) => {
      const earnedEl = document.getElementById(`cosEarnedText-${cosId}`);
      const barEl = document.getElementById(`cosFillBar-${cosId}`);
      if (earnedEl) earnedEl.innerText = formatBaity(info.earned, { decimals: 2 });
      if (barEl) barEl.style.width = `${info.fillPct.toFixed(1)}%`;
    });
  }

  if (Core.state.currentRoute === '/earn') {
    const totEl = document.getElementById('totalPendingBusinessProfit');
    const hrEl = document.getElementById('totalHourlyIncomeBadge');
    const netEl = document.getElementById('netPendingBusinessProfit');
    const taxEl = document.getElementById('taxPendingBusinessProfit');
    if (totEl) totEl.innerText = formatBaity(rawFloor, { decimals: 2 });
    if (hrEl) hrEl.innerText = calc.isFrozenByDebt ? '❄️ Заморожено (72ч налог)' : `+${formatBaity(calc.totalHourly)} / час`;
    if (netEl) netEl.innerText = formatBaity(netAmt);
    if (taxEl) taxEl.innerText = formatBaity(taxAmt);

    Object.entries(calc.perSlot).forEach(([slotKey, info]) => {
      const accEl = document.getElementById(`bizAccText-${slotKey}`);
      const barEl = document.getElementById(`bizFillBar-${slotKey}`);
      if (accEl) accEl.innerText = formatBaity(info.earned, { decimals: 2 });
      if (barEl) barEl.style.width = `${info.fillPct.toFixed(1)}%`;
      if (info.isUpgrading) {
        const tEl = document.getElementById(`bizUpgTimer-${slotKey}`);
        const bEl = document.getElementById(`bizUpgBar-${slotKey}`);
        if (tEl) tEl.innerText = formatCountdownHMS(info.upgLeftMs);
        if (bEl) bEl.style.width = `${info.upgPct.toFixed(1)}%`;
      }
    });
  }

  if (Core.state.currentRoute === '/club' && Core.state.currentCasinoGame === 'mining') {
    updateSpaceMiningLiveProgress(u);
  }

  const lastHack = Number(u.lastTerminalHack || 0);
  const diff = (lastHack + 24 * 3600 * 1000) - now;
  const dashTermTxt = document.getElementById('dashTerminalTimerText');
  if (diff <= 0) {
    if (dashTermTxt) dashTermTxt.innerText = 'Взлом шлюза!';
  } else {
    const h = String(Math.floor(diff / 3600000)).padStart(2, '0');
    const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
    const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
    if (dashTermTxt) dashTermTxt.innerText = `${h}:${m}:${s}`;
    const modalNotice = document.getElementById('hackCooldownNotice');
    if (modalNotice && !modalNotice.classList.contains('hidden')) modalNotice.innerText = `> Перезарядка шлюза: ${h}:${m}:${s}`;
  }
}

// -------------------------------------------------------------------------
// 7. КИБЕР-ПОЛИГОН (/club — САПЁР И ЗОЛОТО АСТЕРОИДОВ)
// -------------------------------------------------------------------------
export function renderCasinoClubView() {
  if (!Core || !Core.state.currentUser) return;
  const u = Core.findUser(Core.state.currentUser);
  if (!u) return;

  const cSet = Core.appData.settings?.casino || DEFAULT_SETTINGS.casino;
  const balEl = document.getElementById('clubUserBalanceDisplay');
  if (balEl) balEl.innerText = formatBaity(u.balance || 0);

  const dailyProfEl = document.getElementById('clubDailyProfitBadge');
  if (dailyProfEl) {
    const dailyVal = Core.getUserPolygonDailyEarned(u);
    dailyProfEl.innerText = `${formatBaity(dailyVal)} / ${formatBaity(POLYGON_DAILY_EARN_LIMIT)}`;
  }

  const limText = document.getElementById('clubMinMaxBetText');
  const limBadge = document.getElementById('clubBetLimitsBadge');
  if (limText) limText.innerText = `${formatBaity(cSet.minBet || 10)} – ${formatBaity(cSet.maxBet || 50000)}`;
  if (limBadge) limBadge.innerText = `Мин: ${formatBaity(cSet.minBet || 10)} | Макс: ${formatBaity(cSet.maxBet || 50000)}`;

  const boosters = u.polygonBoosters || {};
  const shCount = Number(boosters.shield || 0);
  const rdCount = Number(boosters.radar || 0);

  const elShC = document.getElementById('userBoosterShieldCount');
  const elRdC = document.getElementById('userBoosterRadarCount');
  if (elShC) elShC.innerText = `${shCount} шт`;
  if (elRdC) elRdC.innerText = `${rdCount} шт`;

  const shSt = document.getElementById('minesShieldStatusTxt');
  if (shSt) shSt.innerText = `в запасе: ${shCount}`;

  const pSh = document.getElementById('boosterPriceShieldLbl');
  const pRd = document.getElementById('boosterPriceRadarLbl');
  if (pSh) pSh.innerText = String(cSet.shieldPrice || 150);
  if (pRd) pRd.innerText = String(cSet.radarPrice || 100);

  const maintBanner = document.getElementById('casinoMaintenanceBanner');
  const activeWrap = document.getElementById('casinoActiveContentWrap');
  if (maintBanner && activeWrap) {
    maintBanner.classList.toggle('hidden', !!cSet.enabled);
    activeWrap.classList.toggle('hidden', !cSet.enabled);
  }

  renderMinesBoard();
  renderSpaceMiningView();
}

export function renderMinesBoard(revealAll = false) {
  const grid = document.getElementById('minesGridContainer');
  if (!grid || !Core) return;
  const minesState = Core.minesState;
  const frag = document.createDocumentFragment();

  for (let idx = 0; idx < 25; idx++) {
    const isRev = minesState.revealed.includes(idx);
    const isDefused = minesState.defusedMines.includes(idx);
    const isMine = minesState.minePositions.includes(idx);
    const btn = document.createElement('button');
    btn.type = 'button';

    if (isDefused) {
      btn.className = 'w-full h-full rounded-xl bg-amber-900/90 border-2 border-amber-400 text-amber-200 flex items-center justify-center text-lg shadow-[0_0_15px_rgba(251,191,36,0.7)]';
      btn.innerHTML = '🛡️';
    } else if (isRev) {
      btn.className = isMine
        ? 'w-full h-full rounded-xl bg-rose-900 border-2 border-rose-400 text-white flex items-center justify-center text-lg shadow-[0_0_15px_rgba(244,63,94,0.8)] animate-bounce'
        : 'w-full h-full rounded-xl bg-emerald-900/90 border-2 border-emerald-400 text-bank-gold flex items-center justify-center text-lg shadow-[0_0_12px_rgba(16,185,129,0.5)]';
      btn.innerHTML = isMine ? '💣' : '💎';
    } else if (revealAll && isMine) {
      btn.className = 'w-full h-full rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-300 flex items-center justify-center text-base opacity-80';
      btn.innerHTML = '💣';
    } else {
      btn.className = `w-full h-full rounded-xl bg-bank-darkest hover:bg-bank-card border ${minesState.active ? 'border-emerald-500/50 hover:border-bank-gold cursor-pointer' : 'border-bank-border opacity-75'} flex items-center justify-center text-emerald-500/40 text-xs font-mono transition-all active:scale-95`;
      btn.innerHTML = '<i class="fa-solid fa-cube"></i>';
      if (minesState.active) btn.onclick = () => Core.clickMinesTile(idx);
    }
    frag.appendChild(btn);
  }
  grid.innerHTML = '';
  grid.appendChild(frag);

  const safeOpenedCount = minesState.revealed.filter(i => !minesState.minePositions.includes(i)).length;
  const multLbl = document.getElementById('minesCurrentMultLabel');
  const revLbl = document.getElementById('minesRevealedCountLabel');
  const shBadge = document.getElementById('minesActiveShieldBadge');
  const startBtn = document.getElementById('minesStartBtn');
  const cashBtn = document.getElementById('minesCashoutBtn');
  const radarBtn = document.getElementById('minesUseRadarBtn');

  if (multLbl) multLbl.innerText = `x${minesState.multiplier.toFixed(2)}`;
  if (revLbl) revLbl.innerText = String(safeOpenedCount);
  if (shBadge) {
    shBadge.innerText = minesState.hasShield ? '🛡️ ДА' : 'Нет';
    shBadge.className = minesState.hasShield ? 'text-amber-300 font-mono font-bold' : 'text-emerald-400/60 font-mono';
  }
  if (startBtn) startBtn.disabled = minesState.active || minesState.busy;

  const u = Core.state.currentUser ? Core.findUser(Core.state.currentUser) : null;
  const radarCount = Number(u?.polygonBoosters?.radar || 0);
  if (radarBtn) {
    radarBtn.disabled = !minesState.active || minesState.busy || radarCount <= 0;
    radarBtn.innerText = `📡 Радар (${radarCount})`;
  }

  if (cashBtn) {
    const winAmt = Math.round(minesState.bet * minesState.multiplier);
    cashBtn.disabled = !minesState.active || safeOpenedCount === 0 || minesState.busy;
    cashBtn.innerText = minesState.active && safeOpenedCount > 0 ? `Забрать: ${formatBaity(winAmt)}` : 'Забрать: 0 ฿';
  }
}

export function renderSpaceMiningView() {
  const grid = document.getElementById('spaceMiningMissionsGrid');
  if (!grid || !Core || !Core.state.currentUser) return;
  const u = Core.findUser(Core.state.currentUser);
  if (!u) return;

  const activeExp = u.spaceExpedition && u.spaceExpedition.active ? u.spaceExpedition : null;
  grid.innerHTML = SPACE_MINING_CATALOG.map(m => {
    const canAfford = (u.balance || 0) >= m.cost;
    const minReward = Math.round(m.cost * (1 + m.minReturnPct / 100));
    const maxReward = Math.round(m.cost * (1 + m.maxReturnPct / 100));

    return `
      <div class="p-3.5 sm:p-5 rounded-3xl bg-bank-darkest/95 border border-amber-500/40 hover:border-bank-gold flex flex-col justify-between space-y-2.5 shadow-xl transition-all">
        <div>
          <div class="flex items-center justify-between gap-2 mb-1.5">
            <div class="w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-amber-950 border border-bank-gold/60 text-bank-gold flex items-center justify-center text-base sm:text-xl shadow-md">
              <i class="fa-solid ${m.icon}"></i>
            </div>
            <span class="px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-400/50 text-emerald-300 font-mono text-[10px] font-bold">
              ⏱ ${m.durationMinutes} мин
            </span>
          </div>
          <h4 class="font-royal font-black text-xs sm:text-base text-white">${escapeHtml(m.title)}</h4>
          <p class="text-[10px] sm:text-[11px] text-emerald-300/80 mt-0.5">${escapeHtml(m.desc)}</p>
        </div>

        <div class="p-2.5 rounded-2xl bg-bank-surface/80 border border-bank-border space-y-1 text-xs">
          <div class="flex justify-between">
            <span class="text-emerald-400/75">Запуск:</span>
            <span class="font-mono font-bold text-white">${formatBaity(m.cost)}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-emerald-400/75">Выработка:</span>
            <span class="font-mono font-black text-bank-gold">${formatBaity(minReward)} – ${formatBaity(maxReward)}</span>
          </div>
        </div>

        <button onclick="startSpaceMiningExpedition('${m.id}', this)" ${activeExp ? 'disabled' : ''} class="tap-btn w-full py-2 rounded-2xl font-royal font-black text-xs uppercase shadow-lg transition-all ${activeExp ? 'bg-bank-surface text-emerald-500/50 opacity-50' : (canAfford ? 'bg-gradient-to-r from-bank-gold to-yellow-600 text-black hover:brightness-110' : 'bg-bank-surface border border-bank-border text-emerald-400/60')}">
          ${activeExp ? 'Флот в полёте' : `🚀 Отправить (${formatBaity(m.cost)})`}
        </button>
      </div>
    `;
  }).join('');

  updateSpaceMiningLiveProgress(u);
}

export function updateSpaceMiningLiveProgress(u) {
  const box = document.getElementById('activeSpaceExpeditionBox');
  const badge = document.getElementById('spaceMiningStatusBadge');
  if (!box || !u || !Core) return;

  const exp = u.spaceExpedition;
  if (!exp || !exp.active) {
    box.classList.add('hidden');
    if (badge) badge.innerText = 'Флот готов к старту';
    return;
  }

  box.classList.remove('hidden');
  const now = Core.getServerTime();
  const leftMs = Math.max(0, Number(exp.endsAt || 0) - now);
  const totalMs = Math.max(1, Number(exp.endsAt || 0) - Number(exp.startedAt || 0));
  const pct = Math.min(100, Math.max(0, ((now - Number(exp.startedAt || 0)) / totalMs) * 100));

  document.getElementById('activeSpaceExpTitle').innerText = exp.title || 'Космическая экспедиция';
  document.getElementById('activeSpaceExpCost').innerText = formatBaity(Number(exp.cost || 0));
  document.getElementById('activeSpaceExpReward').innerText = formatBaity(Number(exp.reward || 0));

  const countEl = document.getElementById('activeSpaceExpCountdown');
  const barEl = document.getElementById('activeSpaceExpProgressBar');
  const claimBtn = document.getElementById('claimSpaceMiningBtn');

  if (barEl) barEl.style.width = `${pct.toFixed(1)}%`;

  if (leftMs <= 0) {
    if (countEl) countEl.innerText = 'ГОТОВО!';
    if (badge) badge.innerText = '✨ Золото доставлено!';
    if (claimBtn) {
      claimBtn.disabled = false;
      claimBtn.innerHTML = `<i class="fa-solid fa-gem mr-1"></i> Забрать (+${formatBaity(Number(exp.reward || 0))})`;
    }
  } else {
    if (countEl) countEl.innerText = formatCountdownHMS(leftMs);
    if (badge) badge.innerText = `В полёте: ${formatCountdownHMS(leftMs)}`;
    if (claimBtn) {
      claimBtn.disabled = true;
      claimBtn.innerText = `⛏️ Добыча (${formatCountdownHMS(leftMs)})...`;
    }
  }
}

// -------------------------------------------------------------------------
// 8. БИРЖА АКЦИЙ (XY ГРАФИК) И БОЯРСКИЙ ТОРГЪ (8 ПАЛАТ)
// -------------------------------------------------------------------------
let marketHoverIndex = null;

export function renderMarketView() {
  if (!Core || !Core.state.currentUser) return;
  const u = Core.findUser(Core.state.currentUser);
  if (!u) return;

  const cashLbl = document.getElementById('marketUserCashLabel');
  const portLbl = document.getElementById('marketPortfolioTotalLabel');
  const portVal = calculateUserPortfolioValue(u, Core.appData.marketAssets, Core.appData.settings);
  if (cashLbl) cashLbl.innerText = formatBaity(u.balance || 0);
  if (portLbl) portLbl.innerText = formatBaity(portVal);

  const selectedMarketAssetId = Core.state.selectedMarketAssetId;
  const listEl = document.getElementById('marketAssetsList');
  if (listEl) {
    const frag = document.createDocumentFragment();
    Object.values(Core.appData.marketAssets).forEach(asset => {
      const isSel = asset.id === selectedMarketAssetId;
      const minMean = Number(asset.minMeanPrice || DEFAULT_MARKET_ASSETS[asset.id]?.minMeanPrice || 100);
      const curMean = Math.min(Math.round(minMean * 2.5), Math.max(minMean, Number(asset.meanPrice || minMean)));
      const diff = (asset.price || 0) - (asset.prevPrice || asset.price || 1);
      const pct = ((diff / Math.max(1, asset.prevPrice || asset.price)) * 100).toFixed(1);
      const isUp = diff >= 0;
      const ownedQty = Number((u.portfolio && u.portfolio[asset.id]) || 0);

      const item = document.createElement('div');
      item.className = `p-2.5 sm:p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${isSel ? 'bg-bank-card border-bank-gold shadow-lg ring-1 ring-bank-gold/50' : 'bg-bank-darkest/80 border-bank-border hover:border-bank-gold/40'}`;
      item.onclick = () => {
        Core.state.selectedMarketAssetId = asset.id;
        marketHoverIndex = null;
        renderMarketView();
      };
      item.innerHTML = `
        <div class="flex items-center gap-2 min-w-0">
          <div class="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-black border border-bank-gold/40 flex items-center justify-center text-bank-gold flex-shrink-0">
            <i class="fa-solid ${asset.icon} text-xs sm:text-sm"></i>
          </div>
          <div class="truncate">
            <div class="text-xs font-bold text-white flex items-center gap-1">
              <span class="truncate">${escapeHtml(asset.name)}</span>
              ${ownedQty > 0 ? `<span class="px-1.5 py-0.2 bg-emerald-900 text-emerald-300 rounded text-[9px] font-mono">${ownedQty}/${MAX_HOLDINGS_PER_ASSET}</span>` : ''}
            </div>
            <div class="text-[9px] sm:text-[10px] font-mono text-emerald-400/70">${asset.id} • Норма: ${formatBaity(curMean)}</div>
          </div>
        </div>
        <div class="text-right flex-shrink-0 ml-2">
          <div class="font-royal font-bold text-xs sm:text-sm text-bank-gold">${formatBaity(asset.price || 0)}</div>
          <div class="text-[9px] sm:text-[10px] font-mono font-bold ${isUp ? 'text-emerald-400' : 'text-rose-400'}">${isUp ? '▲+' : '▼'}${pct}%</div>
        </div>
      `;
      frag.appendChild(item);
    });
    listEl.innerHTML = '';
    listEl.appendChild(frag);
  }

  const holdList = document.getElementById('userHoldingsSummaryList');
  if (holdList) {
    const entries = Object.entries(u.portfolio || {}).filter(([, q]) => Number(q) > 0);
    holdList.innerHTML = entries.length === 0
      ? `<div class="text-emerald-500/60 text-[11px] py-2 text-center">Нет купленных акций</div>`
      : entries.map(([ticker, qty]) => {
          const a = Core.appData.marketAssets[ticker];
          const avgB = Number(u.portfolioMeta?.[ticker]?.avgBuyPrice || a?.price || 0);
          return `<div class="flex justify-between py-1 border-b border-bank-border/40 text-[11px]"><span><b>${ticker}</b> × ${Number(qty).toLocaleString()} шт. <span class="text-[9px] text-emerald-400/70">(ср.пок: ${formatBaity(Math.round(avgB))})</span></span><span class="font-mono font-bold text-bank-gold">${formatBaity((a ? a.price : 0) * qty)}</span></div>`;
        }).join('');
  }

  const unifiedTbody = document.getElementById('marketUnifiedTableBody');
  if (unifiedTbody) {
    unifiedTbody.innerHTML = Object.values(Core.appData.marketAssets).map(a => {
      const owned = Number((u.portfolio && u.portfolio[a.id]) || 0);
      const minMean = Number(a.minMeanPrice || DEFAULT_MARKET_ASSETS[a.id]?.minMeanPrice || 100);
      const curMean = Math.min(Math.round(minMean * 2.5), Math.max(minMean, Number(a.meanPrice || minMean)));
      const totalBought = Number(a.totalSharesBought || 0);
      return `
        <tr class="hover:bg-bank-card/50 cursor-pointer transition-colors" onclick="selectMarketAsset('${a.id}')">
          <td class="py-2 px-2 font-bold text-white flex items-center gap-1.5"><i class="fa-solid ${a.icon} text-bank-gold"></i><span>${escapeHtml(a.name)} (<span class="text-bank-gold font-mono">${a.id}</span>)</span></td>
          <td class="py-2 px-2 text-right font-royal font-bold text-bank-gold">${formatBaity(a.price || 0)}</td>
          <td class="py-2 px-2 text-right font-mono text-emerald-300">${formatBaity(curMean)} <span class="text-[9px] text-emerald-500">(мин ${minMean})</span></td>
          <td class="py-2 px-2 text-right font-mono text-amber-300 hidden sm:table-cell">${totalBought.toLocaleString()} шт.</td>
          <td class="py-2 px-2 text-right font-mono font-bold text-white">${owned} / ${MAX_HOLDINGS_PER_ASSET} шт.</td>
        </tr>
      `;
    }).join('');
  }

  const sel = Core.appData.marketAssets[selectedMarketAssetId] || Object.values(Core.appData.marketAssets)[0];
  if (sel) {
    const minMean = Number(sel.minMeanPrice || DEFAULT_MARKET_ASSETS[sel.id]?.minMeanPrice || 100);
    const curMean = Math.min(Math.round(minMean * 2.5), Math.max(minMean, Number(sel.meanPrice || minMean)));
    document.getElementById('selectedAssetIconBox').innerHTML = `<i class="fa-solid ${sel.icon}"></i>`;
    document.getElementById('selectedAssetTitle').innerText = sel.name;
    document.getElementById('selectedAssetTicker').innerText = sel.id;
    document.getElementById('selectedAssetPrice').innerText = formatBaity(sel.price || 0);
    const calBadge = document.getElementById('selectedAssetCalibrationBadge');
    if (calBadge) calBadge.innerText = `Норма: ${formatBaity(curMean)} (Макс: ${formatBaity(Math.round(minMean * 2.5))})`;

    const diff = sel.price - (sel.prevPrice || sel.price);
    const pct = ((diff / Math.max(1, sel.prevPrice || sel.price)) * 100).toFixed(1);
    const chEl = document.getElementById('selectedAssetChange');
    chEl.innerText = `${diff >= 0 ? '+' : ''}${pct}%`;
    chEl.className = `text-[10px] sm:text-xs font-mono font-bold ${diff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`;

    const userQty = Number((u.portfolio && u.portfolio[sel.id]) || 0);
    document.getElementById('userOwnedSelectedAssetQty').innerText = `У вас: ${userQty} / ${MAX_HOLDINGS_PER_ASSET} шт.`;
    updateTradeTotalCost();
    if (Core.state.currentRoute === '/market' && Core.state.currentMarketSubTab === 'exchange') drawMarketXYChart(sel);
  }

  const sub = Core.state.currentMarketSubTab;
  if (sub === 'privileges') renderPrivilegeShop();
  if (sub === 'art') renderLuxuryArtShop();
  if (sub === 'garage') renderLuxuryGarageShop();
  if (sub === 'bazaar') renderMarketListings();
  if (sub === 'realestate') renderRealEstateShop();
  if (sub === 'cosmos') renderCosmicEmpireShop();
  if (sub === 'p2pauction') renderP2PAuctionsView();
}

export function updateTradeTotalCost() {
  if (!Core) return;
  const sel = Core.appData.marketAssets[Core.state.selectedMarketAssetId];
  if (!sel) return;
  const rawQty = parseInt(document.getElementById('tradeAssetQty')?.value || '1', 10);
  const qty = Math.min(MAX_TRADE_QTY, Math.max(1, isNaN(rawQty) ? 1 : rawQty));
  const lbl = document.getElementById('tradeTotalCostLabel');
  if (lbl) lbl.innerText = formatBaity(qty * sel.price);
}

export function drawMarketXYChart(asset) {
  const canvas = document.getElementById('marketXYCanvas');
  if (!canvas || !asset || !Core) return;
  const ctx = canvas.getContext('2d');
  const rect = canvas.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;

  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  const w = rect.width, h = rect.height;
  ctx.clearRect(0, 0, w, h);

  const rawHist = Array.isArray(asset.history) && asset.history.length >= 2 ? asset.history : [Math.round(asset.price * 0.94), asset.price];
  const points = rawHist.slice(-MAX_CHART_POINTS);
  const minVal = Math.max(1, Math.floor(Math.min(...points) * 0.92));
  const maxVal = Math.ceil(Math.max(...points) * 1.08);
  const valRange = Math.max(5, maxVal - minVal);

  const padLeft = 64, padRight = 18, padTop = 22, padBottom = 34;
  const plotW = w - padLeft - padRight, plotH = h - padTop - padBottom;
  const getX = (idx) => padLeft + (idx / Math.max(1, points.length - 1)) * plotW;
  const getY = (val) => padTop + plotH - ((val - minVal) / valRange) * plotH;

  if (Core.userPrefs.showXYGrid) {
    ctx.strokeStyle = 'rgba(26, 71, 53, 0.45)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    for (let i = 0; i <= 4; i++) {
      const yVal = minVal + (valRange / 4) * i;
      const py = getY(yVal);
      ctx.beginPath(); ctx.moveTo(padLeft, py); ctx.lineTo(w - padRight, py); ctx.stroke();
      ctx.fillStyle = '#6ee7b7'; ctx.font = '600 9px monospace'; ctx.textAlign = 'right';
      ctx.fillText(formatBaity(Math.round(yVal)), padLeft - 6, py + 3);
    }
    ctx.setLineDash([]);
  }

  ctx.strokeStyle = '#e6c875'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(padLeft, padTop); ctx.lineTo(padLeft, padTop + plotH); ctx.lineTo(w - padRight, padTop + plotH); ctx.stroke();

  ctx.fillStyle = '#e6c875';
  ctx.font = '700 10px Cinzel, serif';
  ctx.textAlign = 'left';
  ctx.fillText('Заработок (฿)', 6, 13);
  ctx.textAlign = 'right';
  ctx.fillText('Время →', w - padRight, h - 8);

  ctx.fillStyle = '#6ee7b7';
  ctx.font = '600 9px monospace';
  ctx.textAlign = 'center';
  for (let i = 0; i < points.length; i += Math.max(1, Math.floor(points.length / 5))) {
    ctx.fillText(`T${i + 1}`, getX(i), padTop + plotH + 14);
  }

  const isPositive = points[points.length - 1] >= points[0];
  const lineColor = isPositive ? '#10b981' : '#f43f5e';
  const grad = ctx.createLinearGradient(0, padTop, 0, padTop + plotH);
  grad.addColorStop(0, isPositive ? 'rgba(16, 185, 129, 0.36)' : 'rgba(244, 63, 94, 0.34)');
  grad.addColorStop(1, 'rgba(5, 17, 12, 0.0)');

  ctx.beginPath();
  ctx.moveTo(getX(0), getY(points[0]));
  for (let i = 1; i < points.length; i++) ctx.lineTo(getX(i), getY(points[i]));
  ctx.lineTo(getX(points.length - 1), padTop + plotH);
  ctx.lineTo(getX(0), padTop + plotH);
  ctx.closePath();
  ctx.fillStyle = grad; ctx.fill();

  ctx.beginPath();
  ctx.moveTo(getX(0), getY(points[0]));
  for (let i = 1; i < points.length; i++) ctx.lineTo(getX(i), getY(points[i]));
  ctx.strokeStyle = lineColor; ctx.lineWidth = 2.5; ctx.stroke();

  points.forEach((val, idx) => {
    ctx.beginPath();
    ctx.arc(getX(idx), getY(val), marketHoverIndex === idx ? 5 : 3.2, 0, Math.PI * 2);
    ctx.fillStyle = marketHoverIndex === idx ? '#ffd700' : '#e6c875';
    ctx.fill();
  });

  const handlePointer = (clientX) => {
    const r = canvas.getBoundingClientRect();
    const mx = clientX - r.left;
    let closestIdx = 0, minDist = Infinity;
    for (let i = 0; i < points.length; i++) {
      const dist = Math.abs(getX(i) - mx);
      if (dist < minDist) { minDist = dist; closestIdx = i; }
    }
    if (marketHoverIndex !== closestIdx) {
      marketHoverIndex = closestIdx;
      const lbl = document.getElementById('xyChartHoverCoords');
      if (lbl) lbl.innerText = `[Время X:${closestIdx + 1}, Заработок Y:${formatBaity(points[closestIdx])}]`;
      drawMarketXYChart(asset);
    }
  };
  canvas.onmousemove = (ev) => handlePointer(ev.clientX);
  canvas.ontouchmove = (ev) => { if (ev.touches && ev.touches[0]) handlePointer(ev.touches[0].clientX); };
}

export function renderPrivilegeShop() {
  if (!Core || !Core.state.currentUser) return;
  const u = Core.findUser(Core.state.currentUser);
  if (!u) return;

  const ownedFrames = Array.isArray(u.ownedFrames) ? u.ownedFrames : [];
  const ownedTitles = Array.isArray(u.ownedTitles) ? u.ownedTitles : [];
  const ownedCards = Array.isArray(u.ownedCards) ? u.ownedCards : ['emerald'];

  const framesGrid = document.getElementById('privilegeFramesGrid');
  if (framesGrid) {
    framesGrid.innerHTML = PRIVILEGE_FRAMES_CATALOG.map(f => {
      const isOwned = ownedFrames.includes(f.id);
      const isEquipped = u.avatarFrame === f.id;
      const dynPrice = getDynamicShopPrice(f.id, f.price);
      return `
        <div class="p-3 sm:p-4 rounded-2xl bg-bank-darkest/90 border ${isEquipped ? 'border-bank-gold ring-1 ring-bank-gold' : 'border-bank-border'} flex flex-col justify-between space-y-2.5">
          <div class="flex items-center gap-2.5">
            <div class="relative flex-shrink-0">
              <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-black flex items-center justify-center ${f.cssClass}">
                <i class="fa-solid fa-user-astronaut text-bank-gold"></i>
              </div>
              ${f.badgeEmoji ? `<span class="avatar-corner-badge">${f.badgeEmoji}</span>` : ''}
            </div>
            <div>
              <h4 class="font-royal font-bold text-xs sm:text-sm text-white">${escapeHtml(f.name)}</h4>
              <p class="text-[10px] text-emerald-400/75 line-clamp-2">${escapeHtml(f.desc)}</p>
            </div>
          </div>
          <div class="pt-2 border-t border-bank-border/60 flex items-center justify-between gap-2">
            <span class="font-royal font-black text-xs sm:text-sm text-bank-gold">${formatBaity(dynPrice)}</span>
            ${isEquipped
              ? `<button onclick="equipAvatarFrame('default')" class="px-2.5 py-1 rounded-xl bg-emerald-950 text-emerald-300 text-[10px] font-bold uppercase">Снять</button>`
              : isOwned
                ? `<button onclick="equipAvatarFrame('${f.id}')" class="px-3 py-1 rounded-xl bg-bank-gold text-black font-royal font-bold text-[10px] uppercase">Надеть</button>`
                : `<button onclick="buyPrivilegeFrame('${f.id}', this)" class="px-3 py-1 rounded-xl bg-emerald-600 text-emerald-950 font-royal font-bold text-[10px] uppercase shadow-md">Купить</button>`
            }
          </div>
        </div>
      `;
    }).join('');
  }

  const titlesGrid = document.getElementById('privilegeTitlesGrid');
  if (titlesGrid) {
    titlesGrid.innerHTML = PRIVILEGE_TITLES_CATALOG.map(t => {
      const isOwned = ownedTitles.includes(t.id);
      const isEquipped = u.customStatus === t.title;
      const dynPrice = getDynamicShopPrice(t.id, t.price);
      return `
        <div class="p-3 sm:p-4 rounded-2xl bg-bank-darkest/90 border ${isEquipped ? 'border-bank-gold' : 'border-bank-border'} flex flex-col justify-between space-y-2.5">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-xl bg-emerald-950 border border-bank-gold/40 text-bank-gold flex items-center justify-center flex-shrink-0"><i class="fa-solid ${t.icon} text-xs"></i></div>
            <h4 class="font-royal font-bold text-xs sm:text-sm text-white">«${escapeHtml(t.title)}»</h4>
          </div>
          <div class="pt-2 border-t border-bank-border/60 flex items-center justify-between gap-2">
            <span class="font-royal font-black text-xs sm:text-sm text-bank-gold">${formatBaity(dynPrice)}</span>
            ${isEquipped
              ? `<span class="text-[10px] font-mono text-emerald-400 font-bold">Активен</span>`
              : isOwned
                ? `<button onclick="equipPrivilegeTitle('${t.id}')" class="px-3 py-1 rounded-xl bg-bank-gold text-black font-royal font-bold text-[10px] uppercase">Выбрать</button>`
                : `<button onclick="buyPrivilegeTitle('${t.id}', this)" class="px-3 py-1 rounded-xl bg-bank-gold text-black font-royal font-bold text-[10px] uppercase shadow-md">Купить</button>`
            }
          </div>
        </div>
      `;
    }).join('');
  }

  const cardsGrid = document.getElementById('privilegeCardsShopGrid');
  if (cardsGrid) {
    const customDesigns = Object.values(Core.appData.cardDesigns || {}).map(d => ({
      id: d.id, name: d.name, theme: d.theme || 'emerald', bgImage: d.bgImage || null, price: Number(d.price ?? 250), desc: 'Эксклюзивный выпуск карты'
    }));
    const allCards = [...BUILTIN_PAID_CARDS_CATALOG, ...customDesigns];
    cardsGrid.innerHTML = allCards.map(c => {
      const dynPrice = getDynamicShopPrice(c.id, c.price);
      const isOwned = ownedCards.includes(c.id) || dynPrice === 0;
      const bgClass = CARD_THEMES[c.theme] || CARD_THEMES.emerald;
      const previewStyle = c.bgImage ? `background-image: url(${c.bgImage}); background-size: cover;` : '';
      return `
        <div class="p-3 sm:p-4 rounded-2xl bg-bank-darkest/90 border border-bank-border flex flex-col justify-between space-y-2.5">
          <div>
            <div class="h-16 sm:h-20 rounded-xl ${!c.bgImage ? bgClass : ''} border border-bank-gold/50 p-2.5 flex flex-col justify-between mb-1.5" style="${previewStyle}">
              <span class="text-[8px] font-royal uppercase tracking-widest text-bank-gold bg-black/50 px-1.5 py-0.5 rounded w-fit">Mirobyte Reserve</span>
              <span class="font-royal font-bold text-xs text-white drop-shadow">${escapeHtml(c.name)}</span>
            </div>
            <p class="text-[10px] text-emerald-400/75">${escapeHtml(c.desc)}</p>
          </div>
          <div class="flex items-center justify-between pt-2 border-t border-bank-border/60">
            <span class="font-royal font-black text-xs sm:text-sm text-bank-gold">${formatBaity(dynPrice)}</span>
            ${isOwned
              ? `<button onclick="selectCardTheme('${c.theme}', '${c.bgImage || ''}', '${escapeHtml(c.name)}')" class="px-3 py-1 rounded-xl bg-bank-gold text-black font-royal font-bold text-[10px] uppercase">Применить</button>`
              : `<button onclick="buyPrivilegeCardDesign('${c.id}', ${dynPrice}, '${c.theme}', '${escapeHtml(c.name)}', this)" class="px-3 py-1 rounded-xl bg-emerald-600 text-emerald-950 font-royal font-bold text-[10px] uppercase shadow-md">Купить</button>`
            }
          </div>
        </div>
      `;
    }).join('');
  }
}

export function renderLuxuryArtShop() {
  const grid = document.getElementById('luxuryArtCatalogGrid');
  if (!grid || !Core || !Core.state.currentUser) return;
  const u = Core.findUser(Core.state.currentUser);
  if (!u) return;

  const ev = Core.appData.settings?.activeEvent;
  const discBadge = document.getElementById('artDiscountEventBadge');
  if (discBadge) discBadge.classList.toggle('hidden', !(ev && ev.active && ev.type === 'art_boom'));

  grid.innerHTML = LUXURY_ART_CATALOG.map(item => {
    const ownedCount = countUserOwnedAssetById(u, item.id);
    const dynPrice = getDynamicShopPrice(item.id, item.price, 'art');
    return `
      <div class="group p-2.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-bank-darkest/95 border ${ownedCount > 0 ? 'border-emerald-500/70' : 'border-amber-500/40 hover:border-bank-gold'} flex flex-col justify-between space-y-2 shadow-xl transition-all">
        <div>
          <div onclick="openAssetPhotoInspectorModal('${item.id}', 'art')" class="cursor-pointer w-full h-28 sm:h-44 rounded-xl sm:rounded-2xl overflow-hidden bg-black border border-bank-gold/40 shadow-md mb-2 relative">
            <img src="${item.image}" alt="${escapeHtml(item.title)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" onerror="this.onerror=null;this.src=generateRoyalArtSvgDataUrl('crown', this.alt||'MIROBYTE');">
            ${ownedCount > 0 ? `<span class="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-lg bg-emerald-950/95 border border-emerald-400 text-emerald-300 text-[9px] font-mono font-black">🖼️ ×${ownedCount}</span>` : ''}
          </div>
          <div class="text-[9px] font-mono text-amber-300 uppercase truncate">${escapeHtml(item.author)}</div>
          <h4 class="font-royal font-black text-xs sm:text-base text-white truncate">${escapeHtml(item.title)}</h4>
          <p class="text-[10px] text-emerald-300/80 mt-0.5 hidden sm:block">${escapeHtml(item.info)}</p>
        </div>
        <div class="pt-2 border-t border-bank-border/60 space-y-1.5">
          <div class="font-royal font-black text-xs sm:text-base text-bank-gold">${formatBaity(dynPrice)}</div>
          <div class="flex items-center gap-1">
            <button onclick="buyLuxuryCatalogAsset('${item.id}', 'art', this)" class="tap-btn flex-1 py-1.5 px-2 rounded-xl bg-gradient-to-r from-bank-gold to-yellow-600 text-black font-royal font-black text-[10px] sm:text-xs uppercase shadow-md">
              ${ownedCount > 0 ? '+1 шт.' : 'Купить'}
            </button>
            ${ownedCount > 0 ? `
              <button onclick="openCreateP2PAuctionModal('art|${item.id}')" class="tap-btn py-1.5 px-2 rounded-xl bg-bank-surface border border-bank-gold/50 text-bank-gold font-bold text-[10px]" title="На 24ч Аукцион">🔨</button>
              <button onclick="sellLuxuryOrVaultAsset('art', '${item.id}', this)" class="tap-btn py-1.5 px-2 rounded-xl bg-rose-950/80 hover:bg-rose-800 border border-rose-500/50 text-rose-200 font-bold text-[10px]" title="Продать (-25%)">💰</button>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

export function renderLuxuryGarageShop() {
  const grid = document.getElementById('luxuryGarageCatalogGrid');
  if (!grid || !Core || !Core.state.currentUser) return;
  const u = Core.findUser(Core.state.currentUser);
  if (!u) return;

  const taxInfo = calculateUserDailyTaxBill(u, Core.appData.settings);
  const countEl = document.getElementById('garageOwnedCarsCount');
  const rentEl = document.getElementById('garageDailyRentCost');
  if (countEl) countEl.innerText = `${taxInfo.carCount} шт.`;
  if (rentEl) rentEl.innerText = `${formatBaity(taxInfo.garageRent)}/сут`;

  const ev = Core.appData.settings?.activeEvent;
  const discBadge = document.getElementById('garageDiscountEventBadge');
  if (discBadge) discBadge.classList.toggle('hidden', !(ev && ev.active && ev.type === 'garage_expo'));

  const deviceNow = Date.now();
  const inv = Array.isArray(u.inventory) ? u.inventory : [];

  grid.innerHTML = LUXURY_GARAGE_CATALOG.map(item => {
    const ownedCars = inv.filter(x => x && x.id === item.id);
    const ownedCount = ownedCars.length;
    const firstCar = ownedCars[0];
    const carCond = firstCar ? getCarCurrentCondition(firstCar, deviceNow) : 100;
    const srvCost = firstCar ? getCarServiceCost(firstCar, Core.appData.settings, deviceNow) : 0;
    const dynPrice = getDynamicShopPrice(item.id, item.price, 'garage');

    return `
      <div class="group p-2.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-bank-darkest/95 border ${ownedCount > 0 ? (carCond < 40 ? 'border-rose-500' : 'border-emerald-500/70') : 'border-sky-500/40 hover:border-bank-gold'} flex flex-col justify-between space-y-2 shadow-xl transition-all">
        <div>
          <div onclick="openAssetPhotoInspectorModal('${item.id}', 'garage')" class="cursor-pointer w-full h-28 sm:h-44 rounded-xl sm:rounded-2xl overflow-hidden bg-black border border-bank-gold/40 shadow-md mb-2 relative">
            <img src="${item.image}" alt="${escapeHtml(item.title)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" onerror="this.onerror=null;this.src=generateRoyalArtSvgDataUrl('crown', this.alt||'MIROBYTE');">
            ${ownedCount > 0 ? `<span class="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-lg bg-emerald-950/95 border border-emerald-400 text-emerald-300 text-[9px] font-mono font-black">🏎️ ×${ownedCount} (${carCond}%)</span>` : ''}
          </div>
          <div class="text-[9px] font-mono text-sky-300 uppercase truncate">${escapeHtml(item.subtitle)}</div>
          <h4 class="font-royal font-black text-xs sm:text-base text-white truncate">${escapeHtml(item.title)}</h4>
          <p class="text-[10px] text-emerald-300/80 mt-0.5 hidden sm:block">${escapeHtml(item.info)}</p>
        </div>
        ${ownedCount > 0 ? `
          <div class="p-2 rounded-xl bg-bank-surface/90 border border-bank-border space-y-1 text-[10px]">
            <div class="flex justify-between font-mono">
              <span class="text-emerald-300">Состояние:</span>
              <span class="font-bold ${carCond < 40 ? 'text-rose-400 animate-pulse' : 'text-bank-gold'}">${carCond}% (при 0% — утиль)</span>
            </div>
            <div class="h-1.5 w-full bg-black rounded-full overflow-hidden">
              <div class="h-full ${carCond < 40 ? 'bg-rose-500' : 'bg-sky-400'}" style="width: ${carCond}%"></div>
            </div>
            ${carCond < 100 ? `<button type="button" onclick="serviceSingleCar('${firstCar.instanceId || firstCar.id}', this)" class="w-full py-1 rounded-lg bg-sky-500 hover:bg-sky-400 text-black font-royal font-black uppercase text-[9px]">🔧 Провести ТО (${formatBaity(srvCost)})</button>` : ''}
          </div>
        ` : ''}
        <div class="pt-2 border-t border-bank-border/60 space-y-1.5">
          <div class="font-royal font-black text-xs sm:text-base text-bank-gold">${formatBaity(dynPrice)}</div>
          <div class="flex items-center gap-1">
            <button onclick="buyLuxuryCatalogAsset('${item.id}', 'garage', this)" class="tap-btn flex-1 py-1.5 px-2 rounded-xl bg-gradient-to-r from-sky-400 to-blue-600 text-black font-royal font-black text-[10px] sm:text-xs uppercase shadow-md">
              ${ownedCount > 0 ? '+1 шт.' : 'Купить'}
            </button>
            ${ownedCount > 0 ? `
              <button onclick="openCreateP2PAuctionModal('garage|${firstCar.instanceId || firstCar.id}')" class="tap-btn py-1.5 px-2 rounded-xl bg-bank-surface border border-bank-gold/50 text-bank-gold font-bold text-[10px]" title="На 24ч Аукцион">🔨</button>
              <button onclick="sellLuxuryOrVaultAsset('garage', '${item.id}', this)" class="tap-btn py-1.5 px-2 rounded-xl bg-rose-950/80 hover:bg-rose-800 border border-rose-500/50 text-rose-200 font-bold text-[10px]" title="Продать (-25%)">💰</button>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

export function renderRealEstateShop() {
  const grid = document.getElementById('realEstateCatalogGrid');
  if (!grid || !Core || !Core.state.currentUser) return;
  const u = Core.findUser(Core.state.currentUser);
  if (!u) return;

  const now = Core.getServerTime();
  const taxDecl = calculateUserTaxDeclaration(u, Core.appData.loans, Core.appData.settings, now, Core.state.isDemoMode);
  const reCalc = calculateUserRealEstateRent(u, Core.appData.settings, now, taxDecl.isIncomeFrozen);
  const totEl = document.getElementById('totalPendingRealEstateRent');
  const hrEl = document.getElementById('totalRealEstateHourlyBadge');
  if (totEl) totEl.innerText = formatBaity(reCalc.totalPending, { decimals: 2 });
  if (hrEl) hrEl.innerText = `+${formatBaity(reCalc.totalHourly)} / час`;

  grid.innerHTML = REAL_ESTATE_CATALOG.map(item => {
    const rData = u.realEstate?.[item.id] || { count: 0, status: 'idle' };
    const count = Number(rData.count || 0);
    const dynPrice = getDynamicShopPrice(item.id, item.price, 'realestate');
    const unitHourly = Math.round(dynPrice * ((item.hourlyRatePct || 5) / 100));
    const info = reCalc.perItem[item.id] || { state: 'idle', leftMs: 0, earned: 0, hourly: unitHourly * Math.max(1, count), fillPct: 0 };

    let statusSectionHtml = '';
    if (count > 0) {
      if (info.state === 'idle') {
        statusSectionHtml = `<button onclick="activateRealEstateRental('${item.id}', this)" class="tap-btn w-full py-1.5 rounded-xl bg-emerald-600 text-emerald-950 font-royal font-black text-[10px] uppercase">🔑 Сдать (⏱ ${item.prepMinutes}м)</button>`;
      } else if (info.state === 'preparing') {
        statusSectionHtml = `<div class="p-2 rounded-xl bg-amber-950/60 border border-amber-400/50 flex items-center justify-between text-[10px] font-mono"><span class="text-amber-300">Подготовка...</span><span id="rePrepTimer-${item.id}" class="text-white font-bold">${formatCountdownHMS(info.leftMs)}</span></div>`;
      } else {
        statusSectionHtml = `
          <div class="p-2 rounded-xl bg-bank-surface border border-emerald-500/40 space-y-1">
            <div class="flex justify-between text-[10px] font-mono">
              <span class="text-emerald-300">+${formatBaity(info.hourly)}/ч:</span>
              <span id="reEarnedText-${item.id}" class="text-bank-gold font-bold">${formatBaity(info.earned, { decimals: 2 })}</span>
            </div>
            <div class="h-1 w-full bg-black rounded-full overflow-hidden"><div id="reFillBar-${item.id}" class="h-full bg-emerald-400" style="width: ${info.fillPct.toFixed(1)}%"></div></div>
          </div>
        `;
      }
    }

    return `
      <div class="group p-2.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-bank-darkest/95 border ${count > 0 ? 'border-emerald-400/70' : 'border-emerald-500/30 hover:border-bank-gold'} flex flex-col justify-between space-y-2 shadow-xl transition-all">
        <div>
          <div onclick="openAssetPhotoInspectorModal('${item.id}', 'realestate')" class="cursor-pointer w-full h-28 sm:h-44 rounded-xl sm:rounded-2xl overflow-hidden bg-black border border-bank-gold/40 shadow-md mb-2 relative">
            <img src="${item.image}" alt="${escapeHtml(item.title)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" onerror="this.onerror=null;this.src=generateRoyalArtSvgDataUrl('crown', this.alt||'MIROBYTE');">
            <span class="absolute top-1.5 right-1.5 px-2 py-0.5 rounded-full bg-black/85 border border-emerald-400/60 text-emerald-300 text-[9px] font-mono font-bold">+${formatBaity(unitHourly)}/ч</span>
            ${count > 0 ? `<span class="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-lg bg-emerald-950/95 border border-emerald-400 text-emerald-300 text-[9px] font-mono font-black">🏢 ×${count}</span>` : ''}
          </div>
          <h4 class="font-royal font-black text-xs sm:text-base text-white truncate">${escapeHtml(item.title)}</h4>
          <p class="text-[10px] text-emerald-300/80 mt-0.5 hidden sm:block">${escapeHtml(item.info)}</p>
        </div>
        ${statusSectionHtml}
        <div class="pt-2 border-t border-bank-border/60 space-y-1.5">
          <div class="font-royal font-black text-xs sm:text-base text-bank-gold">${formatBaity(dynPrice)}</div>
          <div class="flex items-center gap-1">
            <button onclick="buyRealEstateObject('${item.id}', this)" class="tap-btn flex-1 py-1.5 px-2 rounded-xl bg-gradient-to-r from-bank-gold to-yellow-600 text-black font-royal font-black text-[10px] sm:text-xs uppercase shadow-md">
              ${count > 0 ? '+1 шт.' : 'Купить'}
            </button>
            ${count > 0 ? `
              <button onclick="openCreateP2PAuctionModal('realestate|${item.id}')" class="tap-btn py-1.5 px-2 rounded-xl bg-bank-surface border border-bank-gold/50 text-bank-gold font-bold text-[10px]" title="Выставить на 24ч Аукцион">🔨</button>
              <button onclick="sellLuxuryOrVaultAsset('realestate', '${item.id}', this)" class="tap-btn py-1.5 px-2 rounded-xl bg-rose-950/80 hover:bg-rose-800 border border-rose-500/50 text-rose-200 font-bold text-[10px]">💰</button>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

export function renderCosmicEmpireShop() {
  const grid = document.getElementById('cosmicEmpireCatalogGrid');
  if (!grid || !Core || !Core.state.currentUser) return;
  const u = Core.findUser(Core.state.currentUser);
  if (!u) return;

  const cosCalc = calculateUserCosmicRent(u, Core.appData.settings, Core.getServerTime());
  const totEl = document.getElementById('totalPendingCosmicRent');
  const hrEl = document.getElementById('totalCosmicHourlyBadge');
  if (totEl) totEl.innerText = formatBaity(cosCalc.totalPending, { decimals: 2 });
  if (hrEl) hrEl.innerText = `+${formatBaity(cosCalc.totalHourly)} / час`;

  grid.innerHTML = COSMIC_EMPIRE_CATALOG.map(item => {
    const ownedCount = countUserOwnedAssetById(u, item.id);
    const dynPrice = getDynamicShopPrice(item.id, item.price, 'cosmos');
    const info = cosCalc.perItem[item.id] || { earned: 0, hourly: 0, fillPct: 0, totalBaseLevels: 0, basesObj: { mining: 0, research: 0, power: 0 } };
    const bObj = info.basesObj || { mining: 0, research: 0, power: 0 };

    const rentBoxHtml = ownedCount > 0 ? `
      <div class="p-2.5 rounded-2xl bg-purple-950/50 border border-purple-400/50 space-y-1.5">
        <div class="flex items-center justify-between text-[10px] font-mono">
          <span class="text-purple-200">Уровни баз: <b class="text-bank-gold">${info.totalBaseLevels} / 15</b></span>
          <span class="text-emerald-300 font-bold">+${formatBaity(info.hourly)}/ч</span>
        </div>
        <div class="grid grid-cols-3 gap-1 text-[9px] font-mono text-center">
          <div class="p-1 rounded bg-black/60 border border-purple-500/30">⛏️ Добыча: <b>${bObj.mining || 0}/5</b></div>
          <div class="p-1 rounded bg-black/60 border border-purple-500/30">🔬 Наука: <b>${bObj.research || 0}/5</b></div>
          <div class="p-1 rounded bg-black/60 border border-purple-500/30">⚡ Энерго: <b>${bObj.power || 0}/5</b></div>
        </div>
        <div class="flex justify-between text-[10px] font-mono pt-0.5">
          <span class="text-purple-200">Накоплено:</span>
          <span id="cosEarnedText-${item.id}" class="text-bank-gold font-bold">${formatBaity(info.earned, { decimals: 2 })}</span>
        </div>
        <div class="h-1 w-full bg-black rounded-full overflow-hidden"><div id="cosFillBar-${item.id}" class="h-full bg-gradient-to-r from-purple-400 to-bank-gold" style="width: ${info.fillPct.toFixed(1)}%"></div></div>
        <button type="button" onclick="openCosmicBasesModal('${item.id}')" class="w-full py-1.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-royal font-black text-[10px] uppercase shadow-md">
          🛰️ Управление базами (${info.totalBaseLevels}/15 ур.)
        </button>
      </div>
    ` : '';

    return `
      <div class="group p-3 sm:p-4 rounded-2xl sm:rounded-3xl bg-bank-darkest/95 border ${ownedCount > 0 ? 'border-purple-400 ring-1 ring-purple-400/50' : 'border-purple-500/40 hover:border-bank-gold'} flex flex-col justify-between space-y-2 shadow-2xl transition-all">
        <div>
          <div onclick="openAssetPhotoInspectorModal('${item.id}', 'cosmos')" class="cursor-pointer w-full h-28 sm:h-40 rounded-xl sm:rounded-2xl overflow-hidden bg-black border border-bank-gold/40 shadow-md mb-2 relative">
            <img src="${item.image}" alt="${escapeHtml(item.title)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" onerror="this.onerror=null;this.src=generateRoyalArtSvgDataUrl('crown', this.alt||'MIROBYTE');">
            <span class="absolute top-1.5 right-1.5 px-2 py-0.5 rounded-full bg-black/85 border border-purple-400/60 text-purple-200 text-[9px] font-mono font-bold">Макс. баз: ${item.maxHourlyRatePct}%/ч</span>
            ${ownedCount > 0 ? `<span class="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-lg bg-purple-950/95 border border-purple-400 text-purple-200 text-[9px] font-mono font-black">🌌 ×${ownedCount}</span>` : ''}
          </div>
          <div class="text-[9px] font-mono text-purple-300 uppercase truncate">${escapeHtml(item.subtitle)}</div>
          <h4 class="font-royal font-black text-xs sm:text-base text-white truncate">${escapeHtml(item.title)}</h4>
          <p class="text-[10px] text-emerald-300/80 mt-0.5">${escapeHtml(item.info)}</p>
        </div>
        ${rentBoxHtml}
        <div class="pt-2 border-t border-bank-border/60 space-y-1.5">
          <div class="font-royal font-black text-xs sm:text-base text-bank-gold">${formatBaity(dynPrice)}</div>
          <div class="flex items-center gap-1">
            <button onclick="buyLuxuryCatalogAsset('${item.id}', 'cosmos', this)" class="tap-btn flex-1 py-1.5 px-2 rounded-xl bg-gradient-to-r from-purple-500 via-fuchsia-500 to-amber-500 text-black font-royal font-black text-[10px] sm:text-xs uppercase shadow-lg">
              ${ownedCount > 0 ? '+1 Локация' : 'Купить локацию'}
            </button>
            ${ownedCount > 0 ? `
              <button onclick="openCreateP2PAuctionModal('cosmos|${item.id}')" class="tap-btn py-1.5 px-2 rounded-xl bg-bank-surface border border-bank-gold/50 text-bank-gold font-bold text-[10px]" title="Выставить на 24ч Аукцион">🔨</button>
              <button onclick="sellLuxuryOrVaultAsset('cosmos', '${item.id}', this)" class="tap-btn py-1.5 px-2 rounded-xl bg-rose-950/80 hover:bg-rose-800 border border-rose-500/50 text-rose-200 font-bold text-[10px]">💰</button>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

export function renderMarketListings() {
  const grid = document.getElementById('marketListingsGrid');
  const badge = document.getElementById('marketListingsCountBadge');
  if (!grid || !Core) return;
  const items = Object.values(Core.appData.marketListings || {}).sort((a, b) => (b.timestampMs || 0) - (a.timestampMs || 0));
  if (badge) badge.innerText = `${items.length} лотов`;
  if (items.length === 0) {
    grid.innerHTML = `<div class="col-span-full text-center py-6 text-emerald-500/60 text-xs">На Купеческом Рынке пока нет товаров.</div>`;
    return;
  }
  grid.innerHTML = items.map(lot => {
    const isMy = Core.state.currentUser && normalizeLogin(lot.seller) === normalizeLogin(Core.state.currentUser);
    const canRemove = isMy || Core.isCurrentUserAdmin() || Core.isCurrentUserSuperAdmin();
    return `
      <div class="p-2.5 sm:p-4 rounded-2xl bg-bank-darkest/90 border border-bank-border hover:border-bank-gold/60 flex flex-col justify-between space-y-2 shadow-lg">
        <div>
          <div class="w-full h-28 sm:h-36 rounded-xl overflow-hidden bg-black border border-bank-gold/30 mb-2">
            <img src="${lot.artwork || generateRoyalArtSvgDataUrl('crown', lot.title)}" class="w-full h-full object-cover" loading="lazy" onerror="this.onerror=null;this.src=generateRoyalArtSvgDataUrl('crown', 'MIROBYTE');">
          </div>
          <div class="text-[9px] text-bank-gold font-mono truncate cursor-pointer" onclick="openPlayerPublicProfileModal('${escapeHtml(lot.seller)}')">@${escapeHtml(lot.seller)}</div>
          <h4 class="font-royal font-bold text-xs sm:text-sm text-white truncate">${escapeHtml(lot.title)}</h4>
          <p class="text-[10px] text-emerald-200/80 line-clamp-2 mt-0.5">${escapeHtml(lot.desc)}</p>
        </div>
        <div class="pt-2 border-t border-bank-border/60 flex items-center justify-between gap-1">
          <span class="font-royal font-black text-xs sm:text-base text-bank-gold">${formatBaity(lot.price || 0)}</span>
          <div class="flex gap-1">
            ${!isMy ? `<button onclick="buyMarketListingItem('${lot.id}', this)" class="px-2.5 py-1 bg-emerald-600 text-emerald-950 font-royal font-bold rounded-xl text-[10px] uppercase">Купить</button>` : ''}
            ${canRemove ? `<button onclick="removeMarketListingItem('${lot.id}')" class="px-2 py-1 bg-rose-950/70 border border-rose-600/40 text-rose-300 rounded-xl text-[10px]"><i class="fa-solid fa-trash-can"></i></button>` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// -------------------------------------------------------------------------
// 9. СОКРОВИЩНИЦА, ПУБЛИЧНЫЙ ПРОФИЛЬ, РЕЙТИНГ, ТЕЛЕГРАФ И КУПЮРЫ
// -------------------------------------------------------------------------
export function renderUserInventoryVault(u) {
  const grid = document.getElementById('userInventoryVaultGrid');
  if (!grid || !u || !Core) return;
  const inv = Array.isArray(u.inventory) ? u.inventory : [];
  const deviceNow = Date.now();
  const groupedMap = new Map();

  if (u.realEstate && typeof u.realEstate === 'object') {
    REAL_ESTATE_CATALOG.forEach(re => {
      const cnt = Number(u.realEstate[re.id]?.count || 0);
      if (cnt > 0) {
        groupedMap.set(re.id, {
          id: re.id, instanceId: re.id, category: 'realestate', title: re.title, desc: re.subtitle,
          artwork: re.image, price: getDynamicShopPrice(re.id, re.price, 'realestate'), count: cnt
        });
      }
    });
  }

  inv.forEach(item => {
    if (!item) return;
    let cat = item.category || 'bazaar';
    if (cat === 'auction') cat = 'bazaar';
    const key = cat === 'garage' ? (item.instanceId || item.id + '_' + Math.random()) : (item.id || item.title);
    if (groupedMap.has(key)) {
      groupedMap.get(key).count += 1;
    } else {
      const cond = cat === 'garage' ? getCarCurrentCondition(item, deviceNow) : 100;
      const srvCost = cat === 'garage' ? getCarServiceCost(item, Core.appData.settings, deviceNow) : 0;
      groupedMap.set(key, {
        id: item.id || key,
        instanceId: item.instanceId || item.id,
        category: cat,
        title: item.title,
        desc: item.desc || '',
        artwork: item.artwork,
        price: Number(item.price || 0),
        condition: cond,
        srvCost,
        count: 1
      });
    }
  });

  let groupedList = Array.from(groupedMap.values());
  const currentVaultFilter = Core.state.currentVaultFilter;
  if (currentVaultFilter !== 'all') {
    groupedList = groupedList.filter(x => x.category === currentVaultFilter);
  }

  if (groupedList.length === 0) {
    grid.innerHTML = `<div class="col-span-full text-center py-5 text-emerald-500/60 text-xs">В выбранном бланке Сокровищницы пока нет активов.</div>`;
    return;
  }

  grid.innerHTML = groupedList.map(item => {
    let badgeHtml = '';
    if (item.category === 'art') badgeHtml = '<span class="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-amber-950/90 border border-amber-400/50 text-[8px] font-mono text-amber-300 uppercase">🎨 Арт</span>';
    else if (item.category === 'garage') badgeHtml = `<span class="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded ${item.condition < 40 ? 'bg-rose-900 border-rose-400 text-white animate-pulse' : 'bg-sky-950/90 border-sky-400/50 text-sky-300'} border text-[8px] font-mono uppercase">🏎️ Сост: ${item.condition}%</span>`;
    else if (item.category === 'realestate') badgeHtml = '<span class="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-emerald-950/90 border border-emerald-400/50 text-[8px] font-mono text-emerald-300 uppercase">🏢 5%/ч</span>';
    else if (item.category === 'cosmos') {
      const b = u.cosmicBases?.[item.id] || { mining: 0, research: 0, power: 0 };
      const lvls = Number(b.mining || 0) + Number(b.research || 0) + Number(b.power || 0);
      badgeHtml = `<span class="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-purple-950/90 border border-purple-400/50 text-[8px] font-mono text-purple-200 uppercase">🌌 Базы: ${lvls}/15</span>`;
    }

    const effectiveVal = item.category === 'garage' ? Math.round(item.price * (item.condition / 100)) : item.price;

    return `
      <div class="group p-2.5 rounded-2xl bg-bank-darkest border border-bank-gold/40 hover:border-bank-gold flex flex-col justify-between space-y-1.5 shadow-md transition-all">
        <div onclick="openAssetPhotoInspectorModal('${escapeHtml(item.id)}', '${escapeHtml(item.category)}')" class="cursor-pointer">
          <div class="w-full h-24 sm:h-32 rounded-xl overflow-hidden bg-black border border-bank-gold/30 mb-1.5 relative">
            <img src="${item.artwork || generateRoyalArtSvgDataUrl('crown', item.title)}" alt="${escapeHtml(item.title)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" onerror="this.onerror=null;this.src=generateRoyalArtSvgDataUrl('crown', this.alt||'MIROBYTE');">
            ${badgeHtml}
            <span class="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/90 border border-bank-gold text-bank-gold font-mono font-black text-[9px]">×${item.count}</span>
          </div>
          <div class="font-royal font-bold text-[11px] sm:text-xs text-white truncate">${escapeHtml(item.title)}</div>
          <div class="text-[10px] font-mono text-bank-gold">${formatBaity(effectiveVal * item.count)}</div>
        </div>
        <div class="pt-1 border-t border-bank-border/50 flex flex-wrap items-center justify-between gap-1">
          ${item.category === 'garage' && item.condition < 100 ? `
            <button onclick="serviceSingleCar('${escapeHtml(item.instanceId)}', this)" class="w-full py-1 rounded-lg bg-sky-500 text-black font-royal font-black text-[9px] uppercase">🔧 ТО до 100% (${formatBaity(item.srvCost)})</button>
          ` : ''}
          ${item.category === 'cosmos' ? `
            <button onclick="openCosmicBasesModal('${escapeHtml(item.id)}')" class="w-full py-1 rounded-lg bg-purple-600 text-white font-royal font-bold text-[9px] uppercase">🛰️ Базы (1–5 ур.)</button>
          ` : ''}
          <button onclick="openCreateP2PAuctionModal('${escapeHtml(item.category)}|${escapeHtml(item.instanceId || item.id)}')" class="flex-1 py-1 rounded-lg bg-bank-surface hover:bg-bank-card border border-bank-gold/40 text-[9px] font-bold text-bank-gold" title="Выставить на 24ч Аукцион">🔨 Аукцион</button>
          <button onclick="sellLuxuryOrVaultAsset('${escapeHtml(item.category)}', '${escapeHtml(item.id)}', this)" class="flex-1 py-1 rounded-lg bg-rose-950/80 hover:bg-rose-800 border border-rose-500/40 text-[9px] font-bold text-rose-200" title="Продать (-25% налог)">💰 Продать</button>
        </div>
      </div>
    `;
  }).join('');
}

export function renderLeaderboard() {
  const tbody = document.getElementById('leaderboardTableBody');
  if (!tbody || !Core) return;

  const isAdmin = Core.isCurrentUserAdmin() || Core.isCurrentUserSuperAdmin();
  let usersList = Object.values(Core.appData.users);
  if (!isAdmin) usersList = usersList.filter(u => !u.hiddenFromAll);
  usersList.sort((a, b) => (b.balance || 0) - (a.balance || 0));

  const searchQ = (document.getElementById('globalCitizenSearchInput')?.value || '').trim().toLowerCase();
  let displayList = [];
  if (searchQ) {
    displayList = usersList.filter(u => u && (u.username.toLowerCase().includes(searchQ) || (u.customStatus && u.customStatus.toLowerCase().includes(searchQ))));
  } else {
    displayList = usersList.slice(0, 20);
  }

  const countBadge = document.getElementById('leaderboardCountBadge');
  if (countBadge) countBadge.innerText = searchQ ? `Найдено: ${displayList.length}` : `Топ-${displayList.length} из ${usersList.length}`;

  const frag = document.createDocumentFragment();
  displayList.forEach(u => {
    const isMe = Core.state.currentUser && Core.state.currentUser.toLowerCase() === u.username.toLowerCase();
    const tr = document.createElement('tr');
    tr.className = `cursor-pointer transition-colors ${isMe ? 'bg-emerald-900/30 font-semibold hover:bg-emerald-900/50' : 'hover:bg-bank-card/60'}`;
    tr.onclick = () => Core.openPlayerPublicProfileModal(u.username);

    const globalRank = usersList.findIndex(x => x.username === u.username) + 1;
    let medal = `<span class="font-mono text-emerald-500">#${globalRank}</span>`;
    if (globalRank === 1) medal = `🥇 1`;
    if (globalRank === 2) medal = `🥈 2`;
    if (globalRank === 3) medal = `🥉 3`;

    const avatarMini = u.avatar ? `<img src="${u.avatar}" class="w-full h-full object-cover" loading="lazy">` : `<i class="fa-solid fa-user text-[10px] text-bank-gold"></i>`;
    const frameClass = getAvatarFrameClass(u.avatarFrame);
    const cornerEmoji = getAvatarFrameCornerEmoji(u.avatarFrame);
    const calc = calculateUserPendingBusinessRevenue(u, Core.appData.loans, Core.appData.settings, Core.getServerTime(), Core.state.isDemoMode);
    const invCount = Array.isArray(u.inventory) ? u.inventory.length : 0;

    tr.innerHTML = `
      <td class="py-2 px-1.5 sm:px-3 font-bold text-bank-gold whitespace-nowrap">${medal}</td>
      <td class="py-2 px-1.5 sm:px-3">
        <div class="flex items-center gap-2">
          <div class="relative flex-shrink-0">
            <div class="w-7 h-7 sm:w-8 sm:h-8 rounded-lg ${frameClass} bg-black overflow-hidden flex items-center justify-center">${avatarMini}</div>
            ${cornerEmoji ? `<span class="avatar-corner-badge" style="font-size:9px;top:-4px;left:-4px;">${cornerEmoji}</span>` : ''}
          </div>
          <div class="font-bold text-white font-royal flex items-center gap-1 truncate max-w-[115px] sm:max-w-none">
            <span class="hover:text-bank-gold underline decoration-bank-gold/40 truncate">${escapeHtml(u.username)}</span>
            ${isMe ? '<span class="text-[8px] px-1 py-0.2 bg-emerald-700 text-white rounded">Вы</span>' : ''}
            ${u.isOwner ? '<i class="fa-solid fa-crown text-[9px] text-yellow-400"></i>' : (u.isSuperAdmin ? '<i class="fa-solid fa-user-shield text-[9px] text-purple-400"></i>' : (u.isAdmin ? '<i class="fa-solid fa-crown text-[9px] text-bank-gold"></i>' : ''))}
          </div>
        </div>
      </td>
      <td class="py-2 px-2 sm:px-3 text-[11px] text-bank-gold/90 hidden sm:table-cell">
        ${escapeHtml(u.customStatus || 'Гражданин')}
        ${calc.ownedCount > 0 ? `<span class="ml-1 text-[10px] font-mono text-emerald-400">(🏭 ${calc.ownedCount}/10)</span>` : ''}
        ${invCount > 0 ? `<span class="ml-1 text-[10px] font-mono text-amber-300">(💎 ${invCount})</span>` : ''}
      </td>
      <td class="py-2 px-1.5 sm:px-3 text-right font-mono font-bold text-bank-gold whitespace-nowrap text-[11px] sm:text-xs">${formatBaity(u.balance || 0)}</td>
      <td class="py-2 px-1.5 sm:px-3 text-right whitespace-nowrap">
        <div class="inline-flex items-center gap-1">
          <button onclick="event.stopPropagation(); openPlayerPublicProfileModal('${escapeHtml(u.username)}');" class="px-2.5 py-1 bg-bank-darkest hover:bg-bank-gold hover:text-black border border-bank-gold/50 text-bank-gold rounded-lg text-[9px] sm:text-[10px] font-royal font-bold uppercase">Посмотреть профиль</button>
          ${!isMe ? `<button onclick="event.stopPropagation(); openTelegraphChatWithUser('${escapeHtml(u.username)}');" class="px-2 py-1 bg-emerald-600/30 hover:bg-emerald-600 text-emerald-200 hover:text-black rounded-lg text-[9px] sm:text-[10px] font-bold hidden sm:inline-block" title="Открыть чат"><i class="fa-solid fa-comments"></i></button>` : ''}
        </div>
      </td>
    `;
    frag.appendChild(tr);
  });

  tbody.innerHTML = '';
  tbody.appendChild(frag);
}

export function renderBanknotes() {
  const grid = document.getElementById('banknotesCatalogGrid');
  if (!grid || !Core) return;
  const frag = document.createDocumentFragment();
  BANKNOTES_CONFIG.forEach(n => {
    const customImg = Core.appData.banknoteImages && Core.appData.banknoteImages[n.value];
    const card = document.createElement('div');
    card.className = 'group bg-bank-surface border border-bank-border hover:border-bank-gold/60 rounded-2xl p-2.5 sm:p-4 flex flex-col justify-between transition-all cursor-pointer';
    card.innerHTML = `
      <div class="aspect-[16/9] rounded-xl border border-bank-border bg-[#071911] p-2 sm:p-3 flex flex-col justify-between overflow-hidden mb-2 banknote-pattern relative">
        ${customImg ? `<img src="${customImg}" class="w-full h-full object-cover rounded-lg" loading="lazy">` : `<div class="text-center my-auto text-bank-gold"><i class="fa-solid ${n.icon} text-xl sm:text-3xl mb-1"></i><div class="font-royal font-bold text-sm sm:text-lg">${n.value} ฿</div><div class="text-[8px] sm:text-[9px] text-emerald-400/70 font-mono">${n.titleEn}</div></div>`}
      </div>
      <div>
        <div class="flex items-baseline justify-between mb-0.5">
          <span class="font-royal font-bold text-bank-gold text-xs sm:text-base">${n.value} ฿</span>
          <span class="text-[9px] sm:text-[10px] text-emerald-300 font-semibold truncate ml-1">${n.titleRu}</span>
        </div>
        <p class="text-[9px] sm:text-[10px] text-emerald-400/70 line-clamp-1 hidden sm:block">${n.description || n.motif}</p>
      </div>
      <div class="mt-2 pt-1.5 border-t border-bank-border flex items-center gap-1">
        <button onclick="event.stopPropagation(); openBanknoteModal(${n.value});" class="flex-1 py-1 bg-bank-darkest hover:bg-bank-border text-emerald-300 rounded-lg text-[9px] sm:text-[10px] font-bold uppercase">Осмотр</button>
        <button onclick="event.stopPropagation(); addAmountToTransferInput(${n.value});" class="flex-1 py-1 bg-emerald-600/30 hover:bg-emerald-600 text-emerald-200 hover:text-black rounded-lg text-[9px] sm:text-[10px] font-bold uppercase">+Перевод</button>
      </div>
    `;
    card.onclick = () => Core.openBanknoteModal(n.value);
    frag.appendChild(card);
  });
  grid.innerHTML = '';
  grid.appendChild(frag);
}

export function renderMailView() {
  if (!Core) return;
  Core.performLazyTelegraphCleanup();
  const container = document.getElementById('mailItemsContainer');
  const peersBox = document.getElementById('telegraphPeersList');
  const currentUser = Core.state.currentUser;
  if (!container || !currentUser) return;

  const uLow = currentUser.toLowerCase();
  const all = Object.entries(Core.appData.mailBox || {})
    .map(([key, item]) => ({ ...item, _dbKey: key }))
    .filter(m => m && ((m.to && m.to.toLowerCase() === uLow) || (m.from && m.from.toLowerCase() === uLow)))
    .sort((a, b) => (a.timestampMs || 0) - (b.timestampMs || 0));

  const peersMap = new Map();
  all.forEach(m => {
    const isIncoming = m.to && m.to.toLowerCase() === uLow;
    const peerName = isIncoming ? m.from : m.to;
    if (!peerName) return;
    const pLow = peerName.toLowerCase();
    peersMap.set(pLow, { username: peerName, lastMsg: m.text, lastTime: m.timestamp || '', ts: m.timestampMs || 0 });
  });

  const peersList = Array.from(peersMap.values()).sort((a, b) => b.ts - a.ts);
  const { activeTelegraphPeer, mailFilter } = Core.state;

  if (peersBox) {
    peersBox.innerHTML = peersList.length === 0
      ? `<div class="text-center py-4 text-emerald-500/60 text-[11px]">Диалогов пока нет. Выберите гражданина выше!</div>`
      : peersList.map(p => {
          const isSel = activeTelegraphPeer && normalizeLogin(activeTelegraphPeer) === normalizeLogin(p.username) && mailFilter === 'dialog';
          const uObj = Core.findUser(p.username);
          const av = uObj?.avatar ? `<img src="${uObj.avatar}" class="w-full h-full object-cover">` : `<i class="fa-solid fa-user text-bank-gold text-[10px]"></i>`;
          return `
            <div onclick="openTelegraphChatWithUser('${escapeHtml(p.username)}')" class="p-2 rounded-xl cursor-pointer border transition-all flex items-center justify-between gap-2 ${isSel ? 'bg-bank-card border-bank-gold shadow-md' : 'bg-bank-darkest/80 border-bank-border hover:border-bank-gold/40'}">
              <div class="flex items-center gap-2 min-w-0">
                <div class="w-7 h-7 rounded-lg bg-black border border-bank-gold/40 overflow-hidden flex items-center justify-center flex-shrink-0">${av}</div>
                <div class="min-w-0">
                  <div class="font-royal font-bold text-xs text-white truncate">@${escapeHtml(p.username)}</div>
                  <div class="text-[10px] text-emerald-400/75 truncate">${escapeHtml(p.lastMsg)}</div>
                </div>
              </div>
            </div>
          `;
        }).join('');
  }

  const hdr = document.getElementById('activeTelegraphChatHeader');
  const sub = document.getElementById('activeTelegraphChatSub');
  const profBtn = document.getElementById('openPeerProfileFromChatBtn');
  const inlineLbl = document.getElementById('mailTargetLabelInline');

  ['inbox', 'sent', 'dialog'].forEach(k => {
    const b = document.getElementById(`mailTab${k.charAt(0).toUpperCase() + k.slice(1)}`);
    if (b) b.className = mailFilter === k ? 'px-2 py-1 rounded-lg bg-emerald-700 text-white font-bold' : 'px-2 py-1 rounded-lg text-emerald-400 hover:text-white';
  });

  let filtered = [];
  if (mailFilter === 'dialog' && activeTelegraphPeer) {
    const pLow = activeTelegraphPeer.toLowerCase();
    if (hdr) hdr.innerText = `Диалог с @${activeTelegraphPeer}`;
    if (sub) sub.innerText = 'Сообщения хранятся ровно 7 дней (168ч)';
    if (profBtn) profBtn.classList.remove('hidden');
    if (inlineLbl) inlineLbl.innerText = `@${activeTelegraphPeer}`;
    const recInp = document.getElementById('mailRecipient');
    if (recInp && !recInp.value) recInp.value = activeTelegraphPeer;

    filtered = all.filter(m =>
      (m.from?.toLowerCase() === uLow && m.to?.toLowerCase() === pLow && !m.deletedBySender) ||
      (m.from?.toLowerCase() === pLow && m.to?.toLowerCase() === uLow && !m.deletedByRecipient)
    );
  } else {
    if (profBtn) profBtn.classList.add('hidden');
    if (mailFilter === 'inbox') {
      if (hdr) hdr.innerText = 'Входящие депеши';
      filtered = [...all].reverse().filter(m => m.to && m.to.toLowerCase() === uLow && !m.deletedByRecipient);
    } else {
      if (hdr) hdr.innerText = 'Исходящие депеши';
      filtered = [...all].reverse().filter(m => m.from && m.from.toLowerCase() === uLow && !m.deletedBySender);
    }
  }

  container.innerHTML = filtered.length === 0
    ? `<div class="text-center py-8 text-emerald-500/60 text-xs">Сообщений в этом окне пока нет</div>`
    : filtered.map(m => {
        const isMine = m.from && m.from.toLowerCase() === uLow;
        const peer = isMine ? m.to : m.from;
        const ageHours = m.timestampMs ? Math.max(0, Math.floor((Date.now() - Number(m.timestampMs)) / 3600000)) : 0;
        const leftHours = Math.max(1, 168 - ageHours);

        return `
          <div class="p-3 rounded-2xl ${isMine ? 'ml-auto bg-emerald-950/80 border border-emerald-500/50' : 'mr-auto bg-bank-darkest border border-bank-gold/40'} max-w-[92%] space-y-1 text-xs shadow-md">
            <div class="flex justify-between items-center gap-3 text-[10px] text-emerald-400 border-b border-bank-border/40 pb-1">
              <span class="font-bold text-bank-gold cursor-pointer hover:underline" onclick="openTelegraphChatWithUser('${escapeHtml(peer)}')">
                ${isMine ? 'Вы → @' + escapeHtml(m.to) : 'От: @' + escapeHtml(m.from)}
              </span>
              <span class="font-mono text-[9px] text-emerald-500">${escapeHtml(m.timestamp || '')} • ⏳ ${leftHours}ч</span>
            </div>
            <p class="text-white whitespace-pre-wrap leading-relaxed">${escapeHtml(m.text)}</p>
            <div class="flex items-center justify-end gap-2 pt-1">
              <button onclick="openPlayerPublicProfileModal('${escapeHtml(peer)}')" class="text-[9px] text-emerald-400 hover:underline">Профиль</button>
              <button onclick="promptDeleteMail('${m._dbKey}', ${isMine})" class="px-2 py-0.5 bg-rose-950/70 hover:bg-rose-800 border border-rose-600/40 text-rose-200 rounded text-[9px] font-bold">
                <i class="fa-solid fa-trash-can mr-0.5"></i> Удалить
              </button>
            </div>
          </div>
        `;
      }).join('');

  if (mailFilter === 'dialog') {
    container.scrollTop = container.scrollHeight;
  }
}

export function renderPublicProfileTabItems(target) {
  const luxGrid = document.getElementById('pubProfLuxuryGrid');
  if (!luxGrid || !target || !Core) return;
  const isMe = Core.state.currentUser && normalizeLogin(Core.state.currentUser) === normalizeLogin(target.username);
  const currentPubProfileTab = Core.state.currentPubProfileTab;

  if (currentPubProfileTab === 'business') {
    const slots = getUserBusinessSlotsEntries(target, Core.appData.settings);
    if (slots.length === 0) {
      luxGrid.innerHTML = `<div class="col-span-full text-center py-5 text-emerald-500/60 text-xs">У гражданина нет открытых корпораций в «Боярских Промыслах»</div>`;
      return;
    }
    luxGrid.innerHTML = slots.map(({ slotKey, cfg, data }, i) => {
      const lvl = Number(data.level || 1);
      const cond = computeEffectiveSlotCondition(data, Core.getServerTime());
      const hr = getBusinessHourlyIncome(cfg, lvl, cond, Core.appData.settings);
      const val = calculateTotalBusinessInvestment(cfg, lvl);
      return `
        <div class="p-3 rounded-2xl bg-bank-darkest border border-emerald-500/40 flex flex-col justify-between gap-2">
          <div class="flex items-center gap-2.5">
            <div class="w-10 h-10 rounded-xl bg-black border border-bank-gold/50 text-bank-gold flex items-center justify-center flex-shrink-0"><i class="fa-solid ${cfg.icon}"></i></div>
            <div class="min-w-0 flex-1">
              <div class="text-[9px] font-mono text-emerald-400">Слот #${i + 1} • Уровень ${lvl}/20 • Сост: ${cond}%</div>
              <div class="font-royal font-bold text-xs text-white truncate">${escapeHtml(cfg.name)}</div>
              <div class="text-[10px] font-mono text-bank-gold">Доход: +${formatBaity(hr)}/ч</div>
            </div>
          </div>
          ${!isMe ? `
            <button type="button" onclick="openP2PDirectOfferModal('${escapeHtml(target.username)}', 'business', '${slotKey}', '${escapeHtml(cfg.name)}', ${lvl}, ${cond}, ${val})" class="w-full py-1.5 rounded-xl bg-gradient-to-r from-bank-gold to-yellow-600 text-black font-royal font-black text-[10px] uppercase shadow-md">
              🤝 Предложить цену (P2P)
            </button>
          ` : ''}
        </div>
      `;
    }).join('');
    return;
  }

  if (currentPubProfileTab === 'realestate') {
    const reItems = [];
    REAL_ESTATE_CATALOG.forEach(re => {
      const cnt = Number(target.realEstate?.[re.id]?.count || 0);
      if (cnt > 0) {
        const p = getDynamicShopPrice(re.id, re.price, 'realestate');
        reItems.push({ cfg: re, count: cnt, price: p, hourly: Math.round(p * 0.05) });
      }
    });
    if (reItems.length === 0) {
      luxGrid.innerHTML = `<div class="col-span-full text-center py-5 text-emerald-500/60 text-xs">У гражданина нет земной недвижимости</div>`;
      return;
    }
    luxGrid.innerHTML = reItems.map(({ cfg, count, price, hourly }) => `
      <div class="p-3 rounded-2xl bg-bank-darkest border border-emerald-500/40 flex flex-col justify-between gap-2">
        <div>
          <div class="text-[9px] font-mono text-emerald-400">Недвижимость ×${count} шт. • Сост: 100%</div>
          <div class="font-royal font-bold text-xs text-white truncate">${escapeHtml(cfg.title)}</div>
          <div class="text-[10px] font-mono text-bank-gold">Рента 1 шт.: +${formatBaity(hourly)}/ч</div>
        </div>
        ${!isMe ? `
          <button type="button" onclick="openP2PDirectOfferModal('${escapeHtml(target.username)}', 'realestate', '${cfg.id}', '${escapeHtml(cfg.title)}', 1, 100, ${price})" class="w-full py-1.5 rounded-xl bg-gradient-to-r from-bank-gold to-yellow-600 text-black font-royal font-black text-[10px] uppercase shadow-md">
            🤝 Предложить цену (P2P)
          </button>
        ` : ''}
      </div>
    `).join('');
    return;
  }

  if (currentPubProfileTab === 'cosmos') {
    const inv = Array.isArray(target.inventory) ? target.inventory.filter(x => x && x.category === 'cosmos') : [];
    if (inv.length === 0) {
      luxGrid.innerHTML = `<div class="col-span-full text-center py-5 text-emerald-500/60 text-xs">У гражданина пока нет космических баз и локаций</div>`;
      return;
    }
    luxGrid.innerHTML = inv.map(item => {
      const cfg = COSMIC_EMPIRE_CATALOG.find(c => c.id === item.id);
      const b = target.cosmicBases?.[item.id] || { mining: 0, research: 0, power: 0 };
      const lvls = Number(b.mining || 0) + Number(b.research || 0) + Number(b.power || 0);
      const hr = cfg ? getCosmicLocationHourlyYield(cfg, b, 1, Core.appData.settings) : 0;
      return `
        <div class="p-3 rounded-2xl bg-bank-darkest border border-purple-500/50 flex flex-col justify-between gap-2">
          <div>
            <div class="text-[9px] font-mono text-purple-300">Базы: Добыча ${b.mining || 0}/5 • Наука ${b.research || 0}/5 • Энерго ${b.power || 0}/5</div>
            <div class="font-royal font-bold text-xs text-white truncate">${escapeHtml(item.title)}</div>
            <div class="text-[10px] font-mono text-bank-gold">Выработка баз: +${formatBaity(hr)}/ч</div>
          </div>
          ${!isMe ? `
            <button type="button" onclick="openP2PDirectOfferModal('${escapeHtml(target.username)}', 'cosmos', '${item.id}', '${escapeHtml(item.title)}', ${Math.max(1, lvls)}, 100, ${Number(item.price || 150000000000)})" class="w-full py-1.5 rounded-xl bg-gradient-to-r from-purple-500 to-amber-400 text-black font-royal font-black text-[10px] uppercase shadow-md">
              🤝 Предложить цену (P2P)
            </button>
          ` : ''}
        </div>
      `;
    }).join('');
    return;
  }

  const inv = Array.isArray(target.inventory) ? target.inventory.filter(x => x && x.category === currentPubProfileTab) : [];
  if (inv.length === 0) {
    luxGrid.innerHTML = `<div class="col-span-full text-center py-5 text-emerald-500/60 text-xs">В этом разделе у гражданина пока нет предметов</div>`;
    return;
  }

  const deviceNow = Date.now();
  luxGrid.innerHTML = inv.map(item => {
    const cond = item.category === 'garage' ? getCarCurrentCondition(item, deviceNow) : 100;
    return `
      <div class="p-2.5 rounded-2xl bg-bank-darkest border border-bank-gold/40 flex flex-col justify-between space-y-1.5">
        <div class="w-full h-24 rounded-xl overflow-hidden bg-black border border-bank-border relative">
          <img src="${item.artwork || generateRoyalArtSvgDataUrl('crown', item.title)}" class="w-full h-full object-cover" loading="lazy">
          ${item.category === 'garage' ? `<span class="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded bg-black/90 border border-sky-400 text-sky-300 font-mono text-[9px]">Сост: ${cond}%</span>` : ''}
        </div>
        <div class="font-royal font-bold text-xs text-white truncate">${escapeHtml(item.title)}</div>
        <div class="text-[10px] font-mono text-bank-gold">${formatBaity(item.price || 0)}</div>
      </div>
    `;
  }).join('');
}

// -------------------------------------------------------------------------
// 10. ГРАФИК ИСТОРИИ БАЛАНСА И АДМИН-ПАНЕЛЬ (/admin)
// -------------------------------------------------------------------------
export function drawBalanceHistoryChart(u) {
  const canvas = document.getElementById('balanceHistoryCanvas');
  if (!canvas || !u || !Core) return;
  const ctx = canvas.getContext('2d'), rect = canvas.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;

  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  const w = rect.width, h = rect.height;
  ctx.clearRect(0, 0, w, h);

  const uLow = u.username.toLowerCase();
  const myTxs = (Core.appData.transactions || []).filter(t => (t.from && t.from.toLowerCase() === uLow) || (t.to && t.to.toLowerCase() === uLow)).sort((a, b) => (a.timestampMs || 0) - (b.timestampMs || 0));

  let totalIn = 0, totalOut = 0;
  myTxs.forEach(t => {
    const amt = Number(t.amount || 0);
    if (t.to && t.to.toLowerCase() === uLow) totalIn += amt; else totalOut += amt;
  });

  const recentTxs = myTxs.slice(-(MAX_CHART_POINTS - 1));
  const nodes = [];
  let runningBal = Number(u.balance || 0);
  nodes.unshift({ bal: runningBal });

  for (let i = recentTxs.length - 1; i >= 0; i--) {
    const tx = recentTxs[i], amt = Number(tx.amount || 0), isIncoming = tx.to && tx.to.toLowerCase() === uLow;
    const prevBal = Math.max(0, isIncoming ? runningBal - amt : runningBal + amt);
    nodes.unshift({ bal: prevBal });
    runningBal = prevBal;
  }

  if (nodes.length < 2) {
    nodes.unshift({ bal: Math.max(0, runningBal - 5000) });
  }

  const finalNodes = nodes.slice(-MAX_CHART_POINTS);
  const vals = finalNodes.map(n => n.bal);
  const minVal = Math.max(0, Math.floor(Math.min(...vals) * 0.9));
  const maxVal = Math.max(minVal + 10, Math.ceil(Math.max(...vals) * 1.1));
  const range = Math.max(10, maxVal - minVal);
  const padL = 68, padR = 16, padT = 24, padB = 34;
  const plotW = w - padL - padR, plotH = h - padT - padB;
  const getX = (i) => padL + (i / Math.max(1, finalNodes.length - 1)) * plotW;
  const getY = (v) => padT + plotH - ((v - minVal) / range) * plotH;

  ctx.strokeStyle = 'rgba(26, 71, 53, 0.45)';
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  for (let i = 0; i <= 4; i++) {
    const yVal = minVal + (range / 4) * i;
    const py = getY(yVal);
    ctx.beginPath(); ctx.moveTo(padL, py); ctx.lineTo(w - padR, py); ctx.stroke();
    ctx.fillStyle = '#6ee7b7';
    ctx.font = '600 9px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(formatBaity(Math.round(yVal)), padL - 6, py + 3);
  }
  ctx.setLineDash([]);

  ctx.strokeStyle = '#e6c875';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(padL, padT);
  ctx.lineTo(padL, padT + plotH);
  ctx.lineTo(w - padR, padT + plotH);
  ctx.stroke();

  ctx.fillStyle = '#e6c875';
  ctx.font = '700 10px Cinzel, serif';
  ctx.textAlign = 'left';
  ctx.fillText('Заработок (฿)', 6, 14);
  ctx.textAlign = 'right';
  ctx.fillText('Время →', w - padR, h - 6);

  ctx.fillStyle = '#6ee7b7';
  ctx.font = '600 9px monospace';
  ctx.textAlign = 'center';
  for (let i = 0; i < finalNodes.length; i += Math.max(1, Math.floor(finalNodes.length / 4))) {
    ctx.fillText(`T${i + 1}`, getX(i), padT + plotH + 14);
  }

  ctx.beginPath();
  ctx.moveTo(getX(0), getY(finalNodes[0].bal));
  for (let i = 1; i < finalNodes.length; i++) ctx.lineTo(getX(i), getY(finalNodes[i].bal));
  ctx.strokeStyle = '#10b981'; ctx.lineWidth = 2.5; ctx.stroke();

  finalNodes.forEach((node, idx) => {
    ctx.beginPath();
    ctx.arc(getX(idx), getY(node.bal), 3.2, 0, Math.PI * 2);
    ctx.fillStyle = '#e6c875'; ctx.fill();
  });

  const body = document.getElementById('statsModalBody');
  const now = Core.getServerTime();
  const portVal = calculateUserPortfolioValue(u, Core.appData.marketAssets, Core.appData.settings);
  const calcBiz = calculateUserPendingBusinessRevenue(u, Core.appData.loans, Core.appData.settings, now, Core.state.isDemoMode);
  const reCalc = calculateUserRealEstateRent(u, Core.appData.settings, now, calcBiz.isFrozenByDebt);
  const cosCalc = calculateUserCosmicRent(u, Core.appData.settings, now);
  if (body) {
    body.innerHTML = `
      <div class="p-2 rounded-xl bg-bank-darkest border border-bank-border"><span class="text-[8px] text-emerald-400 uppercase block">Баланс</span><span class="font-royal font-bold text-bank-gold text-xs">${formatBaity(u.balance || 0)}</span></div>
      <div class="p-2 rounded-xl bg-bank-darkest border border-bank-border"><span class="text-[8px] text-emerald-400 uppercase block">Активы</span><span class="font-royal font-bold text-emerald-300 text-xs">${formatBaity(portVal)}</span></div>
      <div class="p-2 rounded-xl bg-bank-darkest border border-bank-border"><span class="text-[8px] text-emerald-400 uppercase block">Доход + Рента/ч</span><span class="font-mono font-bold text-bank-gold text-xs">+${formatBaity(calcBiz.totalHourly + reCalc.totalHourly + cosCalc.totalHourly)}/ч</span></div>
      <div class="p-2 rounded-xl bg-bank-darkest border border-bank-border"><span class="text-[8px] text-emerald-400 uppercase block">Операций</span><span class="font-mono font-bold text-white text-xs">${myTxs.length}</span></div>
    `;
  }
  const aiBox = document.getElementById('statsAiSummaryBox');
  if (aiBox) aiBox.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles text-bank-gold mr-1"></i> <b>Счёт @${escapeHtml(u.username)}:</b> Поступило <b>+${formatBaity(totalIn)}</b>, отправлено/инвестировано <b>-${formatBaity(totalOut)}</b>.`;
}

export function renderAdminView() {
  if (!Core) return;
  const usersList = Object.values(Core.appData.users);
  const reserve = Core.appData.bankReserve !== undefined ? Core.appData.bankReserve : 5000000;
  const statRes = document.getElementById('statBankReserve');
  if (statRes) statRes.innerText = formatBaity(reserve);

  const displayMass = (Core.appData.customMoneySupply !== null && Core.appData.customMoneySupply !== undefined)
    ? Core.appData.customMoneySupply
    : usersList.reduce((sum, u) => sum + (u.balance || 0), 0);
  const statMass = document.getElementById('statMoneySupply');
  if (statMass) statMass.innerText = formatBaity(displayMass);

  const econStart = document.getElementById('econStartBalanceInput');
  const econTax = document.getElementById('econTaxPercentInput');
  if (econStart) econStart.value = Core.appData.settings?.economy?.startBalance ?? 50;
  if (econTax) econTax.value = Core.appData.settings?.economy?.taxPercent ?? 5;

  Core.renderAdminUsersCompactCards();
  Core.populateAdminShopPriceEditor();
  Core.renderTreasuryCardDesigns();
  Core.populateCalibrationForm();
  Core.renderAdminLoansList();
  Core.renderAdminBusinessConfigInputs();
  Core.renderAdminTopMagnates();
  Core.populateAdminCasinoForm();
  Core.renderAdminSecurityLogs();
  Core.renderAdminTransactionsTable();
  Core.renderAdminAllMailsView();
}