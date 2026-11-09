// =========================================================================
// FILE: pants/pants.js
// BANK OF MIROBYTE — Модуль Коллекционных Карточек и Загона Питомцев (/pants)
// =========================================================================

const firebaseConfig = {
  databaseURL: "https://mirobyte-bank-default-rtdb.firebaseio.com"
};
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

let serverTimeOffset = 0;
const getServerTime = () => Date.now() + serverTimeOffset;
const serverTimestamp = () => firebase.database.ServerValue.TIMESTAMP;

db.ref('.info/serverTimeOffset').on('value', (snap) => {
  serverTimeOffset = Number(snap.val() || 0);
});
db.ref('.info/connected').on('value', (snap) => {
  const dot = document.getElementById('onlineDot');
  if (dot) dot.className = snap.val() ? 'w-2 h-2 rounded-full bg-emerald-400 animate-pulse' : 'w-2 h-2 rounded-full bg-amber-400';
});

const OWNER_USERNAME = 'iosif';
const HUNGER_DEATH_PERIOD_MS = 24 * 3600 * 1000; // 24 часа без еды = смерть
const MAX_STORAGE_HOURS = 24;
const P2P_MARKET_FEE = 0.05; // 5% комиссия Казны
const TOP20_CACHE_KEY = 'mb_pets_top20_cache_v1';
const TOP20_CACHE_TTL_MS = 5 * 60 * 1000; // 5 минут кэша

// -------------------------------------------------------------------------
// 1. БАЗОВЫЙ КАТАЛОГ ВСЕХ 20 КАРТОЧЕК И ВЫРЕЗАННЫХ ПИТОМЦЕВ (ИЗ PDF)
// -------------------------------------------------------------------------
const DEFAULT_RARITY_CONFIG = {
  common: {
    key: 'common', name: 'Обычный', badge: '🟢 Обычный', css: 'rarity-common',
    dropChance: 55, baseHourly: 450, reviveCost: 1200, hungerPointsRequired: 10, colorHex: '#22c55e'
  },
  rare: {
    key: 'rare', name: 'Редкий', badge: '🔵 Редкий', css: 'rarity-rare',
    dropChance: 26, baseHourly: 1800, reviveCost: 5000, hungerPointsRequired: 30, colorHex: '#3b82f6'
  },
  epic: {
    key: 'epic', name: 'Эпический', badge: '🟣 Эпический', css: 'rarity-epic',
    dropChance: 12, baseHourly: 7500, reviveCost: 22000, hungerPointsRequired: 90, colorHex: '#a855f7'
  },
  legendary: {
    key: 'legendary', name: 'Легендарный', badge: '🟡 Легендарный', css: 'rarity-legendary',
    dropChance: 5, baseHourly: 35000, reviveCost: 95000, hungerPointsRequired: 250, colorHex: '#ffd700'
  },
  secret: {
    key: 'secret', name: 'Секретный', badge: '🌌 Секретный', css: 'rarity-secret',
    dropChance: 2, baseHourly: 160000, reviveCost: 450000, hungerPointsRequired: 600, colorHex: '#c084fc'
  }
};

// Магазин корма по редкостям (Морковка подходит всем, но для легендарных/секретных её нужно много!)
const DEFAULT_FOOD_CATALOG = [
  {
    id: 'food_common', rarity: 'common', name: 'Хрустящая Морковка', icon: '🥕',
    price: 150, nutritionPoints: 10,
    desc: 'Обычный корм. 1 шт. полностью кормит Обычного питомца (для Легендарного нужно 25 шт., для Секретного — 60 шт.).'
  },
  {
    id: 'food_rare', rarity: 'rare', name: 'Спелое Лесное Яблоко', icon: '🍎',
    price: 420, nutritionPoints: 30,
    desc: 'Редкий корм. 1 шт. полностью насыщает Редкого питомца на 24 часа.'
  },
  {
    id: 'food_epic', rarity: 'epic', name: 'Синяя Изумрудная Ягода', icon: '🫐',
    price: 1150, nutritionPoints: 90,
    desc: 'Эпический корм. 1 шт. полностью насыщает Эпического питомца на 24 часа.'
  },
  {
    id: 'food_legendary', rarity: 'legendary', name: 'Золотое Молодильное Яблоко', icon: '🍏',
    price: 3000, nutritionPoints: 250,
    desc: 'Легендарный деликатес. 1 шт. полностью насыщает Легендарного питомца.'
  },
  {
    id: 'food_secret', rarity: 'secret', name: 'Звёздный Нектар Биосферы', icon: '🌌',
    price: 7000, nutritionPoints: 600,
    desc: 'Секретный космический корм. 1 шт. мгновенно насыщает любого Секретного питомца на 24 часа!'
  }
];

// 20 карточек из предоставленного PDF (страницы 1–20 карточки, страницы 21–40 прозрачные PNG)
const DEFAULT_CARDS_CATALOG = {
  // --- СЕМЕЙСТВО 1: ЗАЙЦЫ ---
  hare_common: {
    id: 'hare_common', serial: '015/100', name: 'Ушастый Заяц', family: 'hare', rarity: 'common',
    hp: 60, skillName: 'Быстрый скок', skillPower: 20,
    skillDesc: 'Быстро прыгает в траву, уворачиваясь от любых забот.',
    lore: 'Обожает хрустеть свежей морковкой и устраивать забеги по утренней росе.',
    cardImg: 'img/card_hare_common.png', petImg: 'img/pet_hare_common.png', emoji: '🐰'
  },
  hare_rare: {
    id: 'hare_rare', serial: '025/100', name: 'Синий Заяц', family: 'hare', rarity: 'rare',
    hp: 80, skillName: 'Быстрый скок', skillPower: 30,
    skillDesc: 'Мгновенно прыгает в траву, оставляя за собой синие искорки.',
    lore: 'Любит играть в прятки в синих зарослях и хрустеть спелыми ягодами.',
    cardImg: 'img/card_hare_rare.png', petImg: 'img/pet_hare_rare.png', emoji: '🐇'
  },
  hare_epic: {
    id: 'hare_epic', serial: '038/100', name: 'Лесной Заяц', family: 'hare', rarity: 'epic',
    hp: 120, skillName: 'Быстрый скок', skillPower: 50,
    skillDesc: 'Невероятно ловко прыгает по веткам и уворачивается от любых опасностей.',
    lore: 'Этот лесной чемпион способен взлетать выше кустов и шутя запутать любого, кто попытается его догнать.',
    cardImg: 'img/card_hare_epic.png', petImg: 'img/pet_hare_epic.png', emoji: '🦌'
  },
  hare_legendary: {
    id: 'hare_legendary', serial: '050/100', name: 'Золотой Прыгун', family: 'hare', rarity: 'legendary',
    hp: 200, skillName: 'Небесный прыжок', skillPower: 100,
    skillDesc: 'Взмывает до самых небес, оставляя за собой золотой след и принося удачу.',
    lore: 'Этот легендарный чемпион способен допрыгнуть до облаков, вдохновляя весь зоопарк на новые свершения.',
    cardImg: 'img/card_hare_legendary.png', petImg: 'img/pet_hare_legendary.png', emoji: '👑'
  },
  hare_secret: {
    id: 'hare_secret', serial: '001/100', name: 'Космический Прыгун', family: 'hare', rarity: 'secret',
    hp: 250, skillName: 'Космический скок', skillPower: 120,
    skillDesc: 'С лёгкостью перепрыгивает с одной планеты на другую, оставляя за собой звёздный след.',
    lore: 'Этот неутомимый ушастый странник путешествует по галактикам, принося в ваш зоопарк космические байты и удачу.',
    cardImg: 'img/card_hare_secret.png', petImg: 'img/pet_hare_secret.png', emoji: '🌌'
  },

  // --- СЕМЕЙСТВО 2: КОТЫ ---
  cat_common: {
    id: 'cat_common', serial: '017/100', name: 'Уютный Кот', family: 'cat', rarity: 'common',
    hp: 50, skillName: 'Громкое мурчание', skillPower: 10,
    skillDesc: 'Издаёт ласковые звуки, мгновенно поднимая настроение всем вокруг.',
    lore: 'Обожает спать на самых тёплых местах в доме и охотиться за солнечными зайчиками.',
    cardImg: 'img/card_cat_common.png', petImg: 'img/pet_cat_common.png', emoji: '🐱'
  },
  cat_rare: {
    id: 'cat_rare', serial: '026/100', name: 'Кот Шотландец', family: 'cat', rarity: 'rare',
    hp: 80, skillName: 'Игра с клубком', skillPower: 30,
    skillDesc: 'Запутывает всех своим синим клубком и дарит море умиления.',
    lore: 'Этот породистый малыш обожает катать синие нитки по всему дому и сладко мурчать на коленях.',
    cardImg: 'img/card_cat_rare.png', petImg: 'img/pet_cat_rare.png', emoji: '😺'
  },
  cat_epic: {
    id: 'cat_epic', serial: '034/100', name: 'Бархатный Корн', family: 'cat', rarity: 'epic',
    hp: 120, skillName: 'Ночной охотник', skillPower: 50,
    skillDesc: 'Мягко и незаметно крадётся во тьме, принося уют и покой в ваш дом.',
    lore: 'Этот грациозный ночной житель знает все тайные уголки в доме и обожает спать на самых высоких полках.',
    cardImg: 'img/card_cat_epic.png', petImg: 'img/pet_cat_epic.png', emoji: '🐈‍⬛'
  },
  cat_legendary: {
    id: 'cat_legendary', serial: '001/100', name: 'Золотой Лев', family: 'cat', rarity: 'legendary',
    hp: 200, skillName: 'Золотое касание', skillPower: 100,
    skillDesc: 'Приносит удачу, наполняя всё вокруг тёплым сиянием и радостью.',
    lore: 'Этот легендарный кот, по слухам, приносит богатство и процветание каждому, кто заслужит его доверие.',
    cardImg: 'img/card_cat_legendary.png', petImg: 'img/pet_cat_legendary.png', emoji: '🦁'
  },
  cat_secret: {
    id: 'cat_secret', serial: '001/100', name: 'Космический Кот', family: 'cat', rarity: 'secret',
    hp: 250, skillName: 'Звёздный пылесос', skillPower: 120,
    skillDesc: 'Притягивает удачу и космические байты, осыпая всё вокруг звёздной пылью.',
    lore: 'Этот кот прибыл из далёких галактик, чтобы принести тепло и таинственное сияние в ваш зоопарк. Говорят, он может спать на Млечном Пути.',
    cardImg: 'img/card_cat_secret.png', petImg: 'img/pet_cat_secret.png', emoji: '🪐'
  },

  // --- СЕМЕЙСТВО 3: ЁЖИКИ ---
  hedgehog_common: {
    id: 'hedgehog_common', serial: '012/100', name: 'Ёжик', family: 'hedgehog', rarity: 'common',
    hp: 60, skillName: 'Шуршание', skillPower: 20,
    skillDesc: 'Наносит небольшой урон, прячась в листве.',
    lore: 'Любит собирать сухие листья и тихонько сопеть в своей уютной норке.',
    cardImg: 'img/card_hedgehog_common.png', petImg: 'img/pet_hedgehog_common.png', emoji: '🦔'
  },
  hedgehog_rare: {
    id: 'hedgehog_rare', serial: '024/100', name: 'Синий Ёжик', family: 'hedgehog', rarity: 'rare',
    hp: 80, skillName: 'Быстрый шуршик', skillPower: 30,
    skillDesc: 'Мгновенно сворачивается в синий клубок и весело катится по дорожке.',
    lore: 'Обожает собирать редкие синие ягоды и тихонько сопеть в своей уютной норке.',
    cardImg: 'img/card_hedgehog_rare.png', petImg: 'img/pet_hedgehog_rare.png', emoji: '💠'
  },
  hedgehog_epic: {
    id: 'hedgehog_epic', serial: '048/100', name: 'Денежный Ёжик', family: 'hedgehog', rarity: 'epic',
    hp: 120, skillName: 'Золотой клубок', skillPower: 50,
    skillDesc: 'Сворачивается в клубок и катится, собирая монеты, полезные байты и всевозможные сокровища.',
    lore: 'Этот деловитый лесной житель знает толк в накоплениях, умудряясь находить блестящие монетки в самых неожиданных местах.',
    cardImg: 'img/card_hedgehog_epic.png', petImg: 'img/pet_hedgehog_epic.png', emoji: '💰'
  },
  hedgehog_legendary: {
    id: 'hedgehog_legendary', serial: '050/100', name: 'Золотой Ёж', family: 'hedgehog', rarity: 'legendary',
    hp: 200, skillName: 'Богатые запасы', skillPower: 100,
    skillDesc: 'Накапливает несметные лесные богатства и щедро делится ими со своим зоопарком.',
    lore: 'Этот величественный ёж собрал столько запасов, что их легко хватит на 10 жизней вперёд. Истинный хранитель изобилия.',
    cardImg: 'img/card_hedgehog_legendary.png', petImg: 'img/pet_hedgehog_legendary.png', emoji: '👑'
  },
  hedgehog_secret: {
    id: 'hedgehog_secret', serial: '001/100', name: 'Ёж-Планета', family: 'hedgehog', rarity: 'secret',
    hp: 250, skillName: 'Живая биосфера', skillPower: 120,
    skillDesc: 'Сворачивается в клубок-планету, укрывая на своей спине целые леса и принося гармонию вашему зоопарку.',
    lore: 'Этот крошечный хранитель космоса свернулся в клубочек, превратив свои иголки в цветущий мир. И тихо сопит среди звёзд.',
    cardImg: 'img/card_hedgehog_secret.png', petImg: 'img/pet_hedgehog_secret.png', emoji: '🌍'
  },

  // --- СЕМЕЙСТВО 4: ПОПУГАИ ---
  parrot_common: {
    id: 'parrot_common', serial: '077/100', name: 'Попугай Говорунчик', family: 'parrot', rarity: 'common',
    hp: 50, skillName: 'Весёлый лепет', skillPower: 10,
    skillDesc: 'Шумно и забавно лепечет, пытаясь повторить каждое услышанное слово.',
    lore: 'Этот маленький болтун обожает сидеть на ветках, задорно чирикать с утра до вечера и копировать человеческие голоса.',
    cardImg: 'img/card_parrot_common.png', petImg: 'img/pet_parrot_common.png', emoji: '🦜'
  },
  parrot_rare: {
    id: 'parrot_rare', serial: '078/100', name: 'Тропический Попугай', family: 'parrot', rarity: 'rare',
    hp: 80, skillName: 'Тропический щебет', skillPower: 30,
    skillDesc: 'Весело перекликается с обитателями джунглей, принося радость и новые байты.',
    lore: 'Этот яркий непоседа обожает лакомиться тропическими фруктами и напевать забавные мелодии.',
    cardImg: 'img/card_parrot_rare.png', petImg: 'img/pet_parrot_rare.png', emoji: '🌺'
  },
  parrot_epic: {
    id: 'parrot_epic', serial: '080/100', name: 'Волнистый Попугай', family: 'parrot', rarity: 'epic',
    hp: 120, skillName: 'Полиглот', skillPower: 50,
    skillDesc: 'С лёгкостью повторяет сложные фразы и пытается заговорить на всех языках мира.',
    lore: 'Этот волнистый эрудит умудряется запоминать десятки человеческих слов и даже банковские термины!',
    cardImg: 'img/card_parrot_epic.png', petImg: 'img/pet_parrot_epic.png', emoji: '🎓'
  },
  parrot_legendary: {
    id: 'parrot_legendary', serial: '090/100', name: 'Какаду Мудрец', family: 'parrot', rarity: 'legendary',
    hp: 200, skillName: 'Всеобщий перевод', skillPower: 100,
    skillDesc: 'Мгновенно переводит любую речь и находит общий язык со всеми обитателями зоопарка.',
    lore: 'Этот величественный какаду знает все языки мира и космоса. Говорят, он может поддержать беседу даже с древними звёздами.',
    cardImg: 'img/card_parrot_legendary.png', petImg: 'img/pet_parrot_legendary.png', emoji: '👑'
  },
  parrot_secret: {
    id: 'parrot_secret', serial: '002/100', name: 'Птица Говорун', family: 'parrot', rarity: 'secret',
    hp: 260, skillName: 'Ум и сообразительность', skillPower: 130,
    skillDesc: 'Понимает и говорит на всех языках Вселенной, помогая путешественникам в их космических странствиях.',
    lore: 'Секретная космическая птица из книг Кира Булычёва «Девочка с Земли». Птица Говорун отличается умом и сообразительностью, летая сквозь звёздные просторы.',
    cardImg: 'img/card_parrot_secret.png', petImg: 'img/pet_parrot_secret.png', emoji: '🦅'
  }
};

const DEFAULT_STICKER_PACKS = {
  pack_starter_all: {
    id: 'pack_starter_all',
    title: 'Классический Стикерпак Империи',
    family: 'all',
    price: 2500,
    icon: 'fa-box-open',
    desc: 'Содержит любую из 20 карточек всех семейств (Зайцы, Коты, Ёжики и Попугаи).'
  },
  pack_cats: {
    id: 'pack_cats',
    title: 'Стикерпак «Имперские Лапки» (Коты)',
    family: 'cat',
    price: 3200,
    icon: 'fa-cat',
    desc: 'Только семейство Котов: от Уютного Кота до Золотого Льва и Космического Кота!'
  },
  pack_hares: {
    id: 'pack_hares',
    title: 'Стикерпак «Лесные Ушки» (Зайцы)',
    family: 'hare',
    price: 3200,
    icon: 'fa-carrot',
    desc: 'Только семейство Зайцев: от Ушастого Зайца до Золотого и Космического Прыгуна!'
  },
  pack_hedgehogs: {
    id: 'pack_hedgehogs',
    title: 'Стикерпак «Золотые Иголки» (Ёжики)',
    family: 'hedgehog',
    price: 3200,
    icon: 'fa-shield-halved',
    desc: 'Только семейство Ёжиков: Денежный Ёжик, Золотой Ёж и секретный Ёж-Планета!'
  },
  pack_parrots: {
    id: 'pack_parrots',
    title: 'Стикерпак «Крылья Галактики» (Попугаи)',
    family: 'parrot',
    price: 3200,
    icon: 'fa-feather-pointed',
    desc: 'Только семейство Попугаев: Какаду Мудрец и легендарная секретная Птица Говорун!'
  },
  pack_royal_vip: {
    id: 'pack_royal_vip',
    title: 'Королевский Космо-Ларец (Повышенный шанс!)',
    family: 'all',
    price: 18000,
    icon: 'fa-crown',
    vipBoost: true,
    desc: 'Элитный пак: исключает Обычные карточки! Выпадают только Редкие, Эпические, Легендарные и Секретные карточки!'
  }
};

// -------------------------------------------------------------------------
// 2. СОСТОЯНИЕ И УТИЛИТЫ ФОРМАТИРОВАНИЯ
// -------------------------------------------------------------------------
const pState = {
  currentUser: localStorage.getItem('mirobyte_active_user') || null,
  autoConvertUnits: localStorage.getItem('mb_pref_auto_convert_units') === 'true',
  activeTab: 'packs',
  cardRarityFilter: 'all',
  userObj: null,
  allUsersSnapshot: {},
  petsMarket: {},
  config: {
    rarities: JSON.parse(JSON.stringify(DEFAULT_RARITY_CONFIG)),
    cards: JSON.parse(JSON.stringify(DEFAULT_CARDS_CATALOG)),
    packs: JSON.parse(JSON.stringify(DEFAULT_STICKER_PACKS)),
    food: JSON.parse(JSON.stringify(DEFAULT_FOOD_CATALOG))
  },
  feedingPenInstanceId: null
};

function normalizeLogin(val) {
  return String(val || '').trim().toLowerCase();
}

function escapeHtml(val) {
  return String(val ?? '').replace(/[&<>'"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));
}

const BAITY_UNITS = [
  { threshold: 1e15, suffix: 'P₿' },
  { threshold: 1e12, suffix: 'T₿' },
  { threshold: 1e9,  suffix: 'G₿' },
  { threshold: 1e6,  suffix: 'M₿' },
  { threshold: 1e3,  suffix: 'K₿' }
];

function formatBaity(value, options = {}) {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return '0 ฿';
  const sign = num < 0 ? '-' : (options.showPlus && num > 0 ? '+' : '');
  const abs = Math.abs(num);
  if (pState.autoConvertUnits && abs >= 1000 && !options.forceFull) {
    for (const u of BAITY_UNITS) {
      if (abs >= u.threshold) {
        const scaled = abs / u.threshold;
        const formatted = scaled >= 100 ? scaled.toFixed(1) : scaled.toFixed(2);
        return `${sign}${formatted.replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')} ${u.suffix}`;
      }
    }
  }
  if (options.decimals !== undefined && abs < 1000) return `${sign}${abs.toFixed(options.decimals)} ฿`;
  return `${sign}${Math.round(abs).toLocaleString('ru-RU')} ฿`;
}

function formatCountdownHMS(ms) {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const h = String(Math.floor(totalSec / 3600)).padStart(2, '0');
  const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
  const s = String(totalSec % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  const colors = {
    success: 'bg-[#06291d] border-emerald-400 text-emerald-100',
    error: 'bg-[#2b0810] border-rose-500 text-rose-100',
    info: 'bg-[#081c15] border-bank-gold text-bank-gold'
  };
  toast.className = `pointer-events-auto px-3.5 py-2.5 rounded-2xl border-2 shadow-2xl flex items-center gap-2 text-xs font-semibold transition-all duration-300 ${colors[type] || colors.info}`;
  toast.innerHTML = `<i class="fa-solid fa-paw text-bank-gold"></i><span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3400);
}

// Генератор красивого SVG-плейсхолдера, если файл в pants/img/ ещё не загружен
function generateCardFallbackSvg(card, isPetOnly = false) {
  const rCfg = pState.config.rarities[card.rarity] || DEFAULT_RARITY_CONFIG.common;
  const cHex = rCfg.colorHex || '#10b981';
  if (isPetOnly) {
    const svgPet = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"><circle cx="150" cy="160" r="110" fill="rgba(16,185,129,0.12)" stroke="${cHex}" stroke-width="4" stroke-dasharray="6,6"/><text x="150" y="190" font-size="115" text-anchor="middle">${card.emoji || '🐾'}</text></svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svgPet);
  }
  const svgCard = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 500">
    <rect width="360" height="500" rx="22" fill="#071a12" stroke="${cHex}" stroke-width="8"/>
    <rect x="18" y="18" width="324" height="40" rx="10" fill="#04100b" stroke="${cHex}" stroke-width="2"/>
    <text x="30" y="43" font-family="Inter, sans-serif" font-size="13" font-weight="bold" fill="${cHex}">${rCfg.name.toUpperCase()}</text>
    <text x="330" y="43" font-family="Inter, sans-serif" font-size="15" font-weight="900" fill="#ffffff" text-anchor="end">HP ${card.hp}</text>
    <rect x="24" y="70" width="312" height="220" rx="16" fill="#0b281c" stroke="${cHex}" stroke-width="2"/>
    <text x="180" y="205" font-size="95" text-anchor="middle">${card.emoji || '🐾'}</text>
    <text x="180" y="325" font-family="Cinzel, serif" font-size="20" font-weight="900" fill="#ffffff" text-anchor="middle">${card.name.toUpperCase()}</text>
    <rect x="24" y="345" width="312" height="95" rx="12" fill="#04100b" stroke="${cHex}" stroke-width="1.5"/>
    <text x="38" y="372" font-family="Inter, sans-serif" font-size="13" font-weight="bold" fill="#ffd700">⚡ ${card.skillName}: +${card.skillPower}</text>
    <text x="180" y="476" font-family="Cinzel, serif" font-size="13" font-weight="bold" fill="#e6c875" text-anchor="middle">MIROBYTE BANK • #${card.serial || '001/100'}</text>
  </svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svgCard);
}

// -------------------------------------------------------------------------
// 3. МАТЕМАТИКА ДОХОДА И СОСТОЯНИЯ ПИТОМЦЕВ В ЗАГОНЕ
// -------------------------------------------------------------------------
function getPetHourlyIncome(cardCfg) {
  if (!cardCfg) return 100;
  const rCfg = pState.config.rarities[cardCfg.rarity] || DEFAULT_RARITY_CONFIG.common;
  const base = Number(rCfg.baseHourly || 450);
  const statBonus = 1 + ((Number(cardCfg.hp || 50) + Number(cardCfg.skillPower || 10)) / 400);
  return Math.max(10, Math.round(base * statBonus));
}

function evaluateUserPenStatus(userObj, nowMs = getServerTime()) {
  const penMap = userObj?.petsData?.pen || {};
  const entries = Object.entries(penMap);
  let totalPending = 0;
  let totalHourly = 0;
  let deadCount = 0;
  const perPet = {};
  const maxStorageMs = MAX_STORAGE_HOURS * 3600 * 1000;

  entries.forEach(([instId, pData]) => {
    if (!pData) return;
    const cardCfg = pState.config.cards[pData.cardId] || DEFAULT_CARDS_CATALOG[pData.cardId];
    if (!cardCfg) return;

    const lastFed = Number(pData.lastFed || pData.createdAt || nowMs);
    const timeSinceFed = Math.max(0, nowMs - lastFed);
    const hungerLeftMs = Math.max(0, HUNGER_DEATH_PERIOD_MS - timeSinceFed);
    const isDead = pData.isDead === true || timeSinceFed >= HUNGER_DEATH_PERIOD_MS;

    const hourly = isDead ? 0 : getPetHourlyIncome(cardCfg);
    totalHourly += hourly;
    if (isDead) deadCount++;

    // Доход начисляется только пока питомец жив (до момента смерти lastFed + 24ч)
    const effectiveEndMs = isDead ? Math.min(nowMs, lastFed + HUNGER_DEATH_PERIOD_MS) : nowMs;
    const lastCol = Number(pData.lastCollected || lastFed);
    const elapsedMs = Math.max(0, Math.min(maxStorageMs, effectiveEndMs - lastCol));
    const earned = isDead ? 0 : (hourly / 3600000) * elapsedMs;

    totalPending += earned;
    perPet[instId] = {
      instId,
      cardCfg,
      pData,
      isDead,
      hourly,
      earned,
      hungerLeftMs,
      hungerPct: Math.min(100, (hungerLeftMs / HUNGER_DEATH_PERIOD_MS) * 100)
    };
  });

  return { totalPending, totalHourly, deadCount, perPet, totalPets: entries.length };
}

// -------------------------------------------------------------------------
// 4. АТОМАРНЫЕ ТРАНЗАКЦИИ С БАЛАНСОМ И КАЗНОЙ БАНКА
// -------------------------------------------------------------------------
async function changeUserBaityAtomic(username, delta, requireFunds = false) {
  const cleanDelta = Math.round(Number(delta || 0));
  if (!Number.isSafeInteger(cleanDelta) || cleanDelta === 0) return false;
  const uKey = normalizeLogin(username);
  const res = await db.ref(`bankData/users/${uKey}/balance`).transaction(bal => {
    const cur = Math.round(Number(bal || 0));
    if (requireFunds && cur < Math.abs(cleanDelta)) return;
    return Math.max(0, cur + cleanDelta);
  });
  return res.committed;
}

async function addBankTreasuryReserve(amount) {
  const clean = Math.round(Number(amount || 0));
  if (clean <= 0) return;
  await db.ref('bankData/bankReserve').transaction(v => Math.round(Number(v || 0)) + clean);
}

function isCurrentUserAdmin() {
  const u = pState.userObj;
  if (!u) return false;
  return !!(u.isOwner || u.isSuperAdmin || u.isAdmin || normalizeLogin(u.username) === OWNER_USERNAME);
}

// -------------------------------------------------------------------------
// 5. ОТКРЫТИЕ СТИКЕРПАКОВ И РОЛЛ КАРТОЧЕК ПО ПРОЦЕНТАМ
// -------------------------------------------------------------------------
function rollRarityByConfig(vipBoost = false) {
  const rMap = pState.config.rarities;
  const pool = vipBoost
    ? ['rare', 'epic', 'legendary', 'secret']
    : ['common', 'rare', 'epic', 'legendary', 'secret'];

  let totalWeight = 0;
  pool.forEach(k => { totalWeight += Math.max(0.1, Number(rMap[k]?.dropChance || 1)); });

  let rand = Math.random() * totalWeight;
  for (const k of pool) {
    const w = Math.max(0.1, Number(rMap[k]?.dropChance || 1));
    if (rand <= w) return k;
    rand -= w;
  }
  return pool[0];
}

let isOpeningPack = false;

async function buyAndOpenStickerPack(packId, btnEl) {
  if (isOpeningPack) return;
  if (!pState.currentUser || !pState.userObj) return showToast('Сначала войдите в свой счёт в Банке!', 'error');

  const pack = pState.config.packs[packId];
  if (!pack) return;
  const price = Math.round(Number(pack.price || 2500));
  if ((pState.userObj.balance || 0) < price) {
    return showToast(`Недостаточно Байти! Требуется ${formatBaity(price)}.`, 'error');
  }

  isOpeningPack = true;
  if (btnEl) btnEl.disabled = true;

  try {
    const paid = await changeUserBaityAtomic(pState.currentUser, -price, true);
    if (!paid) return showToast('Не удалось списать Байти.', 'error');
    await addBankTreasuryReserve(price);

    const rolledRarity = rollRarityByConfig(!!pack.vipBoost);
    let candidateCards = Object.values(pState.config.cards).filter(c => c.rarity === rolledRarity);
    if (pack.family && pack.family !== 'all') {
      const famCards = candidateCards.filter(c => c.family === pack.family);
      if (famCards.length > 0) candidateCards = famCards;
    }
    if (candidateCards.length === 0) candidateCards = Object.values(pState.config.cards);

    const wonCard = candidateCards[Math.floor(Math.random() * candidateCards.length)];
    const uKey = normalizeLogin(pState.currentUser);

    await db.ref(`bankData/users/${uKey}/petsData/cards/${wonCard.id}`).transaction(cnt => Math.round(Number(cnt || 0)) + 1);
    await db.ref(`bankData/users/${uKey}/stats/expense/craftsUpgradeAndSupply`).transaction(v => Math.round(Number(v || 0)) + price);

    openCardRevealModal(wonCard, true);
    showToast(`🎉 Выпала карточка: «${wonCard.name}»!`, 'success');
  } finally {
    isOpeningPack = false;
    if (btnEl) btnEl.disabled = false;
  }
}

function openCardRevealModal(cardCfg, isNewDrop = false) {
  if (!cardCfg) return;
  const rCfg = pState.config.rarities[cardCfg.rarity] || DEFAULT_RARITY_CONFIG.common;
  const badge = document.getElementById('revealModalHeaderBadge');
  const frameBox = document.getElementById('revealCardFrameBox');
  const imgEl = document.getElementById('revealCardImgEl');
  const titleEl = document.getElementById('revealCardTitleEl');
  const statsEl = document.getElementById('revealCardStatsEl');
  const descEl = document.getElementById('revealCardDescEl');

  if (badge) badge.innerText = isNewDrop ? `🎉 ВЫПАЛА КАРТОЧКА: ${rCfg.name.toUpperCase()}!` : `${rCfg.badge} • Серия #${cardCfg.serial || '001/100'}`;
  if (frameBox) frameBox.className = `pet-card-frame ${rCfg.css}`;
  if (imgEl) {
    imgEl.onerror = () => { imgEl.onerror = null; imgEl.src = generateCardFallbackSvg(cardCfg, false); };
    imgEl.src = cardCfg.cardImg;
  }
  if (titleEl) titleEl.innerText = cardCfg.name;
  const hourly = getPetHourlyIncome(cardCfg);
  if (statsEl) statsEl.innerText = `HP ${cardCfg.hp} • ${cardCfg.skillName} (${cardCfg.skillPower}) • Доход в загоне: +${formatBaity(hourly)}/ч`;
  if (descEl) descEl.innerText = `${cardCfg.skillDesc} ${cardCfg.lore || ''}`;

  const modal = document.getElementById('cardRevealModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeCardRevealModal() {
  const modal = document.getElementById('cardRevealModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

// -------------------------------------------------------------------------
// 6. КРАФТ (СОЕДИНЕНИЕ 2 ОДИНАКОВЫХ КАРТОЧЕК → ЖИВОТНОЕ В ЗАГОН)
// -------------------------------------------------------------------------
async function craftPetFromCard(cardId, btnEl) {
  if (!pState.currentUser || !pState.userObj) return;
  const cardCfg = pState.config.cards[cardId];
  if (!cardCfg) return;

  const ownedQty = Number(pState.userObj?.petsData?.cards?.[cardId] || 0);
  if (ownedQty < 2) {
    return showToast('Для крафта питомца нужно минимум 2 одинаковые карточки этого вида!', 'error');
  }

  if (btnEl) btnEl.disabled = true;
  try {
    const uKey = normalizeLogin(pState.currentUser);
    const cardRef = db.ref(`bankData/users/${uKey}/petsData/cards/${cardId}`);
    const tx = await cardRef.transaction(cur => {
      const c = Math.round(Number(cur || 0));
      if (c < 2) return;
      return c - 2;
    });

    if (!tx.committed) return showToast('Недостаточно карточек для крафта!', 'error');

    const now = getServerTime();
    const instId = `pet_${now}_${Math.random().toString(36).slice(2, 6)}`;
    const hourly = getPetHourlyIncome(cardCfg);

    await db.ref(`bankData/users/${uKey}/petsData/pen/${instId}`).set({
      instanceId: instId,
      cardId: cardCfg.id,
      rarity: cardCfg.rarity,
      hourlyIncome: hourly,
      lastFed: now,
      lastCollected: now,
      isDead: false,
      createdAt: now
    });

    await syncUserTotalHourlyInDb();
    showToast(`🐾 Питомец «${cardCfg.name}» успешно скрафчен и помещён в ваш Загон (+${formatBaity(hourly)}/ч)!`, 'success');
    switchPetsTab('pen');
  } finally {
    if (btnEl) btnEl.disabled = false;
  }
}

async function craftAllReadyDuplicateCards(btnEl) {
  if (!pState.currentUser || !pState.userObj) return;
  const cardsMap = pState.userObj?.petsData?.cards || {};
  const readyIds = Object.keys(cardsMap).filter(id => Number(cardsMap[id] || 0) >= 2 && pState.config.cards[id]);

  if (readyIds.length === 0) {
    return showToast('У вас пока нет дубликатов (2+ одинаковых карточек) для авто-крафта!', 'info');
  }

  for (const cardId of readyIds) {
    await craftPetFromCard(cardId, btnEl);
  }
}

async function syncUserTotalHourlyInDb() {
  if (!pState.currentUser) return;
  const uKey = normalizeLogin(pState.currentUser);
  const snap = await db.ref(`bankData/users/${uKey}`).once('value');
  const uVal = snap.val();
  if (!uVal) return;
  const status = evaluateUserPenStatus(uVal, getServerTime());
  const cardsCount = Object.values(uVal?.petsData?.cards || {}).reduce((a, b) => a + Number(b || 0), 0);
  await db.ref(`bankData/users/${uKey}/petsData/summary`).set({
    totalHourly: status.totalHourly,
    penCount: status.totalPets,
    cardsCount,
    updatedAt: getServerTime()
  });
}

// -------------------------------------------------------------------------
// 7. КОРМЛЕНИЕ ПИТОМЦЕВ, СБОР ДОХОДА И ВОЗРОЖДЕНИЕ
// -------------------------------------------------------------------------
async function buyPetFood(foodId, qty = 1, btnEl = null) {
  if (!pState.currentUser || !pState.userObj) return showToast('Войдите в счёт!', 'error');
  const foodCfg = pState.config.food.find(f => f.id === foodId);
  if (!foodCfg) return;

  const cleanQty = Math.max(1, Math.round(Number(qty || 1)));
  const totalCost = Math.round(Number(foodCfg.price || 150) * cleanQty);
  if ((pState.userObj.balance || 0) < totalCost) {
    return showToast(`Недостаточно Байти! Требуется ${formatBaity(totalCost)}.`, 'error');
  }

  if (btnEl) btnEl.disabled = true;
  try {
    const paid = await changeUserBaityAtomic(pState.currentUser, -totalCost, true);
    if (!paid) return;
    await addBankTreasuryReserve(totalCost);

    const uKey = normalizeLogin(pState.currentUser);
    await db.ref(`bankData/users/${uKey}/petsData/food/${foodId}`).transaction(c => Math.round(Number(c || 0)) + cleanQty);
    showToast(`${foodCfg.icon} Куплено: ${foodCfg.name} (×${cleanQty}) за ${formatBaity(totalCost)}!`, 'success');
  } finally {
    if (btnEl) btnEl.disabled = false;
  }
}

function openFeedPetModal(instanceId) {
  if (!pState.userObj) return;
  const pData = pState.userObj?.petsData?.pen?.[instanceId];
  if (!pData) return;
  const cardCfg = pState.config.cards[pData.cardId] || DEFAULT_CARDS_CATALOG[pData.cardId];
  const rCfg = pState.config.rarities[cardCfg.rarity] || DEFAULT_RARITY_CONFIG.common;
  const reqPoints = Number(rCfg.hungerPointsRequired || 10);

  pState.feedingPenInstanceId = instanceId;
  document.getElementById('feedModalPetTitle').innerText = `Накормить «${cardCfg.name}» (${rCfg.name})`;
  document.getElementById('feedModalPetSub').innerText = `Для полного насыщения на 24 часа требуется ${reqPoints} ед. сытости:`;

  const userFood = pState.userObj?.petsData?.food || {};
  const box = document.getElementById('feedModalFoodOptions');

  box.innerHTML = pState.config.food.map(f => {
    const owned = Number(userFood[f.id] || 0);
    const unitsNeeded = Math.max(1, Math.ceil(reqPoints / Number(f.nutritionPoints || 10)));
    const canFeed = owned >= unitsNeeded;

    return `
      <div class="p-3 rounded-2xl bg-bank-darkest border border-bank-border flex items-center justify-between gap-2 text-xs">
        <div>
          <div class="font-bold text-white">${f.icon} ${escapeHtml(f.name)} <span class="text-bank-gold font-mono">(У вас: ${owned} шт.)</span></div>
          <div class="text-[10px] text-emerald-400/80">Нужно для полного насыщения (24ч): <b>${unitsNeeded} шт.</b></div>
        </div>
        ${canFeed
          ? `<button onclick="feedPetWithSpecificFood('${instanceId}', '${f.id}', ${unitsNeeded}, this)" class="px-3.5 py-1.5 rounded-xl bg-emerald-500 text-black font-royal font-black text-[10px] uppercase">Покормить (${unitsNeeded} шт.)</button>`
          : `<button onclick="buyPetFood('${f.id}', ${unitsNeeded - owned}, this)" class="px-3 py-1.5 rounded-xl bg-bank-gold text-black font-royal font-bold text-[10px] uppercase">Докупить (${formatBaity((unitsNeeded - owned) * f.price)})</button>`
        }
      </div>
    `;
  }).join('');

  const modal = document.getElementById('feedPetModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeFeedPetModal() {
  const modal = document.getElementById('feedPetModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

async function feedPetWithSpecificFood(instanceId, foodId, unitsNeeded, btnEl) {
  if (!pState.currentUser || !pState.userObj) return;
  const uKey = normalizeLogin(pState.currentUser);
  const foodRef = db.ref(`bankData/users/${uKey}/petsData/food/${foodId}`);

  if (btnEl) btnEl.disabled = true;
  try {
    const tx = await foodRef.transaction(cur => {
      const c = Math.round(Number(cur || 0));
      if (c < unitsNeeded) return;
      return c - unitsNeeded;
    });
    if (!tx.committed) return showToast('Недостаточно выбранного корма!', 'error');

    const now = getServerTime();
    await db.ref(`bankData/users/${uKey}/petsData/pen/${instanceId}`).update({
      lastFed: now,
      isDead: false
    });
    closeFeedPetModal();
    showToast('🥕 Питомец сыт и доволен! Таймер жизни обновлён на 24 часа.', 'success');
  } finally {
    if (btnEl) btnEl.disabled = false;
  }
}

async function feedAllPetsQuick(btnEl) {
  if (!pState.currentUser || !pState.userObj) return;
  const status = evaluateUserPenStatus(pState.userObj, getServerTime());
  const alivePets = Object.values(status.perPet).filter(p => !p.isDead);
  if (alivePets.length === 0) return showToast('Нет активных живых питомцев для кормления!', 'info');

  let fedCount = 0;
  for (const pet of alivePets) {
    const rCfg = pState.config.rarities[pet.cardCfg.rarity] || DEFAULT_RARITY_CONFIG.common;
    const reqPoints = Number(rCfg.hungerPointsRequired || 10);
    // Ищем подходящий корм в инвентаре (сначала профильный, потом любой доступный)
    const userFood = pState.userObj?.petsData?.food || {};
    const matchingFood = pState.config.food.find(f => {
      const need = Math.max(1, Math.ceil(reqPoints / Number(f.nutritionPoints || 10)));
      return Number(userFood[f.id] || 0) >= need;
    });
    if (matchingFood) {
      const need = Math.max(1, Math.ceil(reqPoints / Number(matchingFood.nutritionPoints || 10)));
      await feedPetWithSpecificFood(pet.instId, matchingFood.id, need, btnEl);
      fedCount++;
    }
  }
  if (fedCount === 0) {
    showToast('Не хватило корма в запасах! Загляните в «Лавку Корма».', 'error');
    switchPetsTab('food');
  } else {
    showToast(`🥕 Покормлено питомцев: ${fedCount} шт.!`, 'success');
  }
}

async function reviveDeadPet(instanceId, btnEl) {
  if (!pState.currentUser || !pState.userObj) return;
  const pData = pState.userObj?.petsData?.pen?.[instanceId];
  if (!pData) return;
  const cardCfg = pState.config.cards[pData.cardId] || DEFAULT_CARDS_CATALOG[pData.cardId];
  const rCfg = pState.config.rarities[cardCfg.rarity] || DEFAULT_RARITY_CONFIG.common;
  const cost = Math.round(Number(rCfg.reviveCost || 1500));

  if ((pState.userObj.balance || 0) < cost) {
    return showToast(`Для возрождения «${cardCfg.name}» требуется штраф ${formatBaity(cost)}!`, 'error');
  }

  if (btnEl) btnEl.disabled = true;
  try {
    const paid = await changeUserBaityAtomic(pState.currentUser, -cost, true);
    if (!paid) return;
    await addBankTreasuryReserve(cost);

    const now = getServerTime();
    const uKey = normalizeLogin(pState.currentUser);
    await db.ref(`bankData/users/${uKey}/petsData/pen/${instanceId}`).update({
      isDead: false,
      lastFed: now,
      lastCollected: now
    });
    await syncUserTotalHourlyInDb();
    showToast(`✨ Питомец «${cardCfg.name}» возрождён и снова приносит Байти!`, 'success');
  } finally {
    if (btnEl) btnEl.disabled = false;
  }
}

async function collectAllPetsIncome(btnEl) {
  if (!pState.currentUser || !pState.userObj) return showToast('Войдите в счёт!', 'error');
  const now = getServerTime();
  const status = evaluateUserPenStatus(pState.userObj, now);
  const amount = Math.floor(status.totalPending);

  if (amount < 1) {
    return showToast('В кассе Загона ещё не накопился минимум 1 ฿!', 'info');
  }

  if (btnEl) btnEl.disabled = true;
  try {
    const uKey = normalizeLogin(pState.currentUser);
    const updates = {};
    Object.values(status.perPet).forEach(p => {
      if (!p.isDead) {
        updates[`bankData/users/${uKey}/petsData/pen/${p.instId}/lastCollected`] = now;
      } else {
        updates[`bankData/users/${uKey}/petsData/pen/${p.instId}/isDead`] = true;
      }
    });

    await db.ref().update(updates);
    await changeUserBaityAtomic(pState.currentUser, amount, false);
    await db.ref(`bankData/users/${uKey}/stats/income/crafts`).transaction(v => Math.round(Number(v || 0)) + amount);

    const txId = `PETS-${now}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    await db.ref(`bankData/transactions/${txId}`).set({
      id: txId,
      from: 'ИМПЕРАТОРСКИЙ ЗООПАРК (/pants)',
      to: pState.currentUser,
      amount,
      comment: `Сбор дохода питомцев (${status.totalPets} в загоне)`,
      timestamp: new Date(now).toLocaleString('ru-RU'),
      timestampMs: serverTimestamp()
    });

    await syncUserTotalHourlyInDb();
    showToast(`💰 Собрана выручка Загона: +${formatBaity(amount)}!`, 'success');
  } finally {
    if (btnEl) btnEl.disabled = false;
  }
}

// -------------------------------------------------------------------------
// 8. ТОРГОВАЯ ПЛОЩАДКА (P2P МАРКЕТ КАРТОЧЕК И КОРМА)
// -------------------------------------------------------------------------
function populateMarketLotSelect() {
  const sel = document.getElementById('marketLotItemSelect');
  if (!sel || !pState.userObj) return;
  const opts = [];

  const cardsMap = pState.userObj?.petsData?.cards || {};
  Object.entries(cardsMap).forEach(([cardId, qty]) => {
    const cnt = Number(qty || 0);
    const cfg = pState.config.cards[cardId];
    if (cnt > 0 && cfg) {
      const rCfg = pState.config.rarities[cfg.rarity] || DEFAULT_RARITY_CONFIG.common;
      opts.push(`<option value="card|${cardId}">🃏 [Карточка ${rCfg.name}] ${escapeHtml(cfg.name)} (В наличии: ${cnt} шт.)</option>`);
    }
  });

  const foodMap = pState.userObj?.petsData?.food || {};
  pState.config.food.forEach(f => {
    const cnt = Number(foodMap[f.id] || 0);
    if (cnt > 0) {
      opts.push(`<option value="food|${f.id}">${f.icon} [Корм] ${escapeHtml(f.name)} (В наличии: ${cnt} шт.)</option>`);
    }
  });

  sel.innerHTML = opts.length > 0
    ? opts.join('')
    : '<option value="">У вас нет карточек или корма для продажи</option>';
}

async function handleCreatePetMarketLot(e) {
  e.preventDefault();
  if (!pState.currentUser || !pState.userObj) return;

  const rawVal = document.getElementById('marketLotItemSelect')?.value || '';
  if (!rawVal.includes('|')) return showToast('Выберите предмет для продажи!', 'error');
  const [itemType, itemId] = rawVal.split('|');

  const qty = Math.max(1, parseInt(document.getElementById('marketLotQtyInput')?.value || '1', 10));
  const price = Math.max(10, parseInt(document.getElementById('marketLotPriceInput')?.value || '0', 10));
  if (!Number.isSafeInteger(price) || price < 10) return showToast('Минимальная цена лота: 10 ฿!', 'error');

  const uKey = normalizeLogin(pState.currentUser);
  const path = itemType === 'card'
    ? `bankData/users/${uKey}/petsData/cards/${itemId}`
    : `bankData/users/${uKey}/petsData/food/${itemId}`;

  const tx = await db.ref(path).transaction(cur => {
    const c = Math.round(Number(cur || 0));
    if (c < qty) return;
    return c - qty;
  });

  if (!tx.committed) return showToast(`У вас нет ${qty} шт. выбранного предмета!`, 'error');

  let title = itemId;
  let rarity = 'common';
  let img = '';
  if (itemType === 'card') {
    const cCfg = pState.config.cards[itemId];
    title = cCfg ? cCfg.name : itemId;
    rarity = cCfg ? cCfg.rarity : 'common';
    img = cCfg ? cCfg.cardImg : '';
  } else {
    const fCfg = pState.config.food.find(f => f.id === itemId);
    title = fCfg ? `${fCfg.icon} ${fCfg.name}` : itemId;
    rarity = fCfg ? fCfg.rarity : 'common';
  }

  const lotId = `PLOT_${getServerTime()}_${Math.random().toString(36).slice(2, 6)}`;
  await db.ref(`bankData/petsMarket/${lotId}`).set({
    id: lotId,
    seller: pState.currentUser,
    itemType,
    itemId,
    title,
    rarity,
    img,
    qty,
    price,
    createdAtMs: getServerTime()
  });

  showToast(`⚖️ Лот «${title}» (×${qty}) выставлен за ${formatBaity(price)}!`, 'success');
}

async function buyPetMarketLot(lotId, btnEl) {
  if (!pState.currentUser || !pState.userObj) return showToast('Войдите в счёт!', 'error');
  const lot = pState.petsMarket[lotId];
  if (!lot) return showToast('Этот лот уже куплен!', 'error');

  if (normalizeLogin(lot.seller) === normalizeLogin(pState.currentUser)) {
    return showToast('Нельзя купить собственный лот (вы можете снять его с продажи)!', 'info');
  }

  const price = Math.round(Number(lot.price || 0));
  if ((pState.userObj.balance || 0) < price) {
    return showToast(`Недостаточно Байти! Требуется ${formatBaity(price)}.`, 'error');
  }

  if (btnEl) btnEl.disabled = true;
  try {
    // Атомарно забираем лот, чтобы два игрока не купили одновременно
    const lotClaim = await db.ref(`bankData/petsMarket/${lotId}`).transaction(cur => {
      if (cur === null) return;
      return null;
    });
    if (!lotClaim.committed) return showToast('Лот уже был куплен другим игроком!', 'error');

    const paid = await changeUserBaityAtomic(pState.currentUser, -price, true);
    if (!paid) {
      // =========================================================================
// FILE: pants/pants.js
// BANK OF MIROBYTE — Модуль Коллекционных Карточек и Загона Питомцев (/pants)
// =========================================================================

const firebaseConfig = {
  databaseURL: "https://mirobyte-bank-default-rtdb.firebaseio.com"
};
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

let serverTimeOffset = 0;
const getServerTime = () => Date.now() + serverTimeOffset;
const serverTimestamp = () => firebase.database.ServerValue.TIMESTAMP;

db.ref('.info/serverTimeOffset').on('value', (snap) => {
  serverTimeOffset = Number(snap.val() || 0);
});
db.ref('.info/connected').on('value', (snap) => {
  const dot = document.getElementById('onlineDot');
  if (dot) dot.className = snap.val() ? 'w-2 h-2 rounded-full bg-emerald-400 animate-pulse' : 'w-2 h-2 rounded-full bg-amber-400';
});

const OWNER_USERNAME = 'iosif';
const HUNGER_DEATH_PERIOD_MS = 24 * 3600 * 1000; // 24 часа без еды = смерть
const MAX_STORAGE_HOURS = 24;
const P2P_MARKET_FEE = 0.05; // 5% комиссия Казны
const TOP20_CACHE_KEY = 'mb_pets_top20_cache_v1';
const TOP20_CACHE_TTL_MS = 5 * 60 * 1000; // 5 минут кэша

// -------------------------------------------------------------------------
// 1. БАЗОВЫЙ КАТАЛОГ ВСЕХ 20 КАРТОЧЕК И ВЫРЕЗАННЫХ ПИТОМЦЕВ (ИЗ PDF)
// -------------------------------------------------------------------------
const DEFAULT_RARITY_CONFIG = {
  common: {
    key: 'common', name: 'Обычный', badge: '🟢 Обычный', css: 'rarity-common',
    dropChance: 55, baseHourly: 450, reviveCost: 1200, hungerPointsRequired: 10, colorHex: '#22c55e'
  },
  rare: {
    key: 'rare', name: 'Редкий', badge: '🔵 Редкий', css: 'rarity-rare',
    dropChance: 26, baseHourly: 1800, reviveCost: 5000, hungerPointsRequired: 30, colorHex: '#3b82f6'
  },
  epic: {
    key: 'epic', name: 'Эпический', badge: '🟣 Эпический', css: 'rarity-epic',
    dropChance: 12, baseHourly: 7500, reviveCost: 22000, hungerPointsRequired: 90, colorHex: '#a855f7'
  },
  legendary: {
    key: 'legendary', name: 'Легендарный', badge: '🟡 Легендарный', css: 'rarity-legendary',
    dropChance: 5, baseHourly: 35000, reviveCost: 95000, hungerPointsRequired: 250, colorHex: '#ffd700'
  },
  secret: {
    key: 'secret', name: 'Секретный', badge: '🌌 Секретный', css: 'rarity-secret',
    dropChance: 2, baseHourly: 160000, reviveCost: 450000, hungerPointsRequired: 600, colorHex: '#c084fc'
  }
};

const DEFAULT_FOOD_CATALOG = [
  {
    id: 'food_common', rarity: 'common', name: 'Хрустящая Морковка', icon: '🥕',
    price: 150, nutritionPoints: 10,
    desc: 'Обычный корм. 1 шт. полностью кормит Обычного питомца (для Легендарного нужно 25 шт., для Секретного — 60 шт.).'
  },
  {
    id: 'food_rare', rarity: 'rare', name: 'Спелое Лесное Яблоко', icon: '🍎',
    price: 420, nutritionPoints: 30,
    desc: 'Редкий корм. 1 шт. полностью насыщает Редкого питомца на 24 часа.'
  },
  {
    id: 'food_epic', rarity: 'epic', name: 'Синяя Изумрудная Ягода', icon: '🫐',
    price: 1150, nutritionPoints: 90,
    desc: 'Эпический корм. 1 шт. полностью насыщает Эпического питомца на 24 часа.'
  },
  {
    id: 'food_legendary', rarity: 'legendary', name: 'Золотое Молодильное Яблоко', icon: '🍏',
    price: 3000, nutritionPoints: 250,
    desc: 'Легендарный деликатес. 1 шт. полностью насыщает Легендарного питомца.'
  },
  {
    id: 'food_secret', rarity: 'secret', name: 'Звёздный Нектар Биосферы', icon: '🌌',
    price: 7000, nutritionPoints: 600,
    desc: 'Секретный космический корм. 1 шт. мгновенно насыщает любого Секретного питомца на 24 часа!'
  }
];

const DEFAULT_CARDS_CATALOG = {
  // --- СЕМЕЙСТВО 1: ЗАЙЦЫ ---
  hare_common: {
    id: 'hare_common', serial: '015/100', name: 'Ушастый Заяц', family: 'hare', rarity: 'common',
    hp: 60, skillName: 'Быстрый скок', skillPower: 20,
    skillDesc: 'Быстро прыгает в траву, уворачиваясь от любых забот.',
    lore: 'Обожает хрустеть свежей морковкой и устраивать забеги по утренней росе.',
    cardImg: 'img/card_hare_common.png', petImg: 'img/pet_hare_common.png', emoji: '🐰'
  },
  hare_rare: {
    id: 'hare_rare', serial: '025/100', name: 'Синий Заяц', family: 'hare', rarity: 'rare',
    hp: 80, skillName: 'Быстрый скок', skillPower: 30,
    skillDesc: 'Мгновенно прыгает в траву, оставляя за собой синие искорки.',
    lore: 'Любит играть в прятки в синих зарослях и хрустеть спелыми ягодами.',
    cardImg: 'img/card_hare_rare.png', petImg: 'img/pet_hare_rare.png', emoji: '🐇'
  },
  hare_epic: {
    id: 'hare_epic', serial: '038/100', name: 'Лесной Заяц', family: 'hare', rarity: 'epic',
    hp: 120, skillName: 'Быстрый скок', skillPower: 50,
    skillDesc: 'Невероятно ловко прыгает по веткам и уворачивается от любых опасностей.',
    lore: 'Этот лесной чемпион способен взлетать выше кустов и шутя запутать любого, кто попытается его догнать.',
    cardImg: 'img/card_hare_epic.png', petImg: 'img/pet_hare_epic.png', emoji: '🦌'
  },
  hare_legendary: {
    id: 'hare_legendary', serial: '050/100', name: 'Золотой Прыгун', family: 'hare', rarity: 'legendary',
    hp: 200, skillName: 'Небесный прыжок', skillPower: 100,
    skillDesc: 'Взмывает до самых небес, оставляя за собой золотой след и принося удачу.',
    lore: 'Этот легендарный чемпион способен допрыгнуть до облаков, вдохновляя весь зоопарк на новые свершения.',
    cardImg: 'img/card_hare_legendary.png', petImg: 'img/pet_hare_legendary.png', emoji: '👑'
  },
  hare_secret: {
    id: 'hare_secret', serial: '001/100', name: 'Космический Прыгун', family: 'hare', rarity: 'secret',
    hp: 250, skillName: 'Космический скок', skillPower: 120,
    skillDesc: 'С лёгкостью перепрыгивает с одной планеты на другую, оставляя за собой звёздный след.',
    lore: 'Этот неутомимый ушастый странник путешествует по галактикам, принося в ваш зоопарк космические байты и удачу.',
    cardImg: 'img/card_hare_secret.png', petImg: 'img/pet_hare_secret.png', emoji: '🌌'
  },

  // --- СЕМЕЙСТВО 2: КОТЫ ---
  cat_common: {
    id: 'cat_common', serial: '017/100', name: 'Уютный Кот', family: 'cat', rarity: 'common',
    hp: 50, skillName: 'Громкое мурчание', skillPower: 10,
    skillDesc: 'Издаёт ласковые звуки, мгновенно поднимая настроение всем вокруг.',
    lore: 'Обожает спать на самых тёплых местах в доме и охотиться за солнечными зайчиками.',
    cardImg: 'img/card_cat_common.png', petImg: 'img/pet_cat_common.png', emoji: '🐱'
  },
  cat_rare: {
    id: 'cat_rare', serial: '026/100', name: 'Кот Шотландец', family: 'cat', rarity: 'rare',
    hp: 80, skillName: 'Игра с клубком', skillPower: 30,
    skillDesc: 'Запутывает всех своим синим клубком и дарит море умиления.',
    lore: 'Этот породистый малыш обожает катать синие нитки по всему дому и сладко мурчать на коленях.',
    cardImg: 'img/card_cat_rare.png', petImg: 'img/pet_cat_rare.png', emoji: '😺'
  },
  cat_epic: {
    id: 'cat_epic', serial: '034/100', name: 'Бархатный Корн', family: 'cat', rarity: 'epic',
    hp: 120, skillName: 'Ночной охотник', skillPower: 50,
    skillDesc: 'Мягко и незаметно крадётся во тьме, принося уют и покой в ваш дом.',
    lore: 'Этот грациозный ночной житель знает все тайные уголки в доме и обожает спать на самых высоких полках.',
    cardImg: 'img/card_cat_epic.png', petImg: 'img/pet_cat_epic.png', emoji: '🐈‍⬛'
  },
  cat_legendary: {
    id: 'cat_legendary', serial: '001/100', name: 'Золотой Лев', family: 'cat', rarity: 'legendary',
    hp: 200, skillName: 'Золотое касание', skillPower: 100,
    skillDesc: 'Приносит удачу, наполняя всё вокруг тёплым сиянием и радостью.',
    lore: 'Этот легендарный кот, по слухам, приносит богатство и процветание каждому, кто заслужит его доверие.',
    cardImg: 'img/card_cat_legendary.png', petImg: 'img/pet_cat_legendary.png', emoji: '🦁'
  },
  cat_secret: {
    id: 'cat_secret', serial: '001/100', name: 'Космический Кот', family: 'cat', rarity: 'secret',
    hp: 250, skillName: 'Звёздный пылесос', skillPower: 120,
    skillDesc: 'Притягивает удачу и космические байты, осыпая всё вокруг звёздной пылью.',
    lore: 'Этот кот прибыл из далёких галактик, чтобы принести тепло и таинственное сияние в ваш зоопарк. Говорят, он может спать на Млечном Пути.',
    cardImg: 'img/card_cat_secret.png', petImg: 'img/pet_cat_secret.png', emoji: '🪐'
  },

  // --- СЕМЕЙСТВО 3: ЁЖИКИ ---
  hedgehog_common: {
    id: 'hedgehog_common', serial: '012/100', name: 'Ёжик', family: 'hedgehog', rarity: 'common',
    hp: 60, skillName: 'Шуршание', skillPower: 20,
    skillDesc: 'Наносит небольшой урон, прячась в листве.',
    lore: 'Любит собирать сухие листья и тихонько сопеть в своей уютной норке.',
    cardImg: 'img/card_hedgehog_common.png', petImg: 'img/pet_hedgehog_common.png', emoji: '🦔'
  },
  hedgehog_rare: {
    id: 'hedgehog_rare', serial: '024/100', name: 'Синий Ёжик', family: 'hedgehog', rarity: 'rare',
    hp: 80, skillName: 'Быстрый шуршик', skillPower: 30,
    skillDesc: 'Мгновенно сворачивается в синий клубок и весело катится по дорожке.',
    lore: 'Обожает собирать редкие синие ягоды и тихонько сопеть в своей уютной норке.',
    cardImg: 'img/card_hedgehog_rare.png', petImg: 'img/pet_hedgehog_rare.png', emoji: '💠'
  },
  hedgehog_epic: {
    id: 'hedgehog_epic', serial: '048/100', name: 'Денежный Ёжик', family: 'hedgehog', rarity: 'epic',
    hp: 120, skillName: 'Золотой клубок', skillPower: 50,
    skillDesc: 'Сворачивается в клубок и катится, собирая монеты, полезные байты и всевозможные сокровища.',
    lore: 'Этот деловитый лесной житель знает толк в накоплениях, умудряясь находить блестящие монетки в самых неожиданных местах.',
    cardImg: 'img/card_hedgehog_epic.png', petImg: 'img/pet_hedgehog_epic.png', emoji: '💰'
  },
  hedgehog_legendary: {
    id: 'hedgehog_legendary', serial: '050/100', name: 'Золотой Ёж', family: 'hedgehog', rarity: 'legendary',
    hp: 200, skillName: 'Богатые запасы', skillPower: 100,
    skillDesc: 'Накапливает несметные лесные богатства и щедро делится ими со своим зоопарком.',
    lore: 'Этот величественный ёж собрал столько запасов, что их легко хватит на 10 жизней вперёд. Истинный хранитель изобилия.',
    cardImg: 'img/card_hedgehog_legendary.png', petImg: 'img/pet_hedgehog_legendary.png', emoji: '👑'
  },
  hedgehog_secret: {
    id: 'hedgehog_secret', serial: '001/100', name: 'Ёж-Планета', family: 'hedgehog', rarity: 'secret',
    hp: 250, skillName: 'Живая биосфера', skillPower: 120,
    skillDesc: 'Сворачивается в клубок-планету, укрывая на своей спине целые леса и принося гармонию вашему зоопарку.',
    lore: 'Этот крошечный хранитель космоса свернулся в клубочек, превратив свои иголки в цветущий мир. И тихо сопит среди звёзд.',
    cardImg: 'img/card_hedgehog_secret.png', petImg: 'img/pet_hedgehog_secret.png', emoji: '🌍'
  },

  // --- СЕМЕЙСТВО 4: ПОПУГАИ ---
  parrot_common: {
    id: 'parrot_common', serial: '077/100', name: 'Попугай Говорунчик', family: 'parrot', rarity: 'common',
    hp: 50, skillName: 'Весёлый лепет', skillPower: 10,
    skillDesc: 'Шумно и забавно лепечет, пытаясь повторить каждое услышанное слово.',
    lore: 'Этот маленький болтун обожает сидеть на ветках, задорно чирикать с утра до вечера и копировать человеческие голоса.',
    cardImg: 'img/card_parrot_common.png', petImg: 'img/pet_parrot_common.png', emoji: '🦜'
  },
  parrot_rare: {
    id: 'parrot_rare', serial: '078/100', name: 'Тропический Попугай', family: 'parrot', rarity: 'rare',
    hp: 80, skillName: 'Тропический щебет', skillPower: 30,
    skillDesc: 'Весело перекликается с обитателями джунглей, принося радость и новые байты.',
    lore: 'Этот яркий непоседа обожает лакомиться тропическими фруктами и напевать забавные мелодии.',
    cardImg: 'img/card_parrot_rare.png', petImg: 'img/pet_parrot_rare.png', emoji: '🌺'
  },
  parrot_epic: {
    id: 'parrot_epic', serial: '080/100', name: 'Волнистый Попугай', family: 'parrot', rarity: 'epic',
    hp: 120, skillName: 'Полиглот', skillPower: 50,
    skillDesc: 'С лёгкостью повторяет сложные фразы и пытается заговорить на всех языках мира.',
    lore: 'Этот волнистый эрудит умудряется запоминать десятки человеческих слов и даже банковские термины!',
    cardImg: 'img/card_parrot_epic.png', petImg: 'img/pet_parrot_epic.png', emoji: '🎓'
  },
  parrot_legendary: {
    id: 'parrot_legendary', serial: '090/100', name: 'Какаду Мудрец', family: 'parrot', rarity: 'legendary',
    hp: 200, skillName: 'Всеобщий перевод', skillPower: 100,
    skillDesc: 'Мгновенно переводит любую речь и находит общий язык со всеми обитателями зоопарка.',
    lore: 'Этот величественный какаду знает все языки мира и космоса. Говорят, он может поддержать беседу даже с древними звёздами.',
    cardImg: 'img/card_parrot_legendary.png', petImg: 'img/pet_parrot_legendary.png', emoji: '👑'
  },
  parrot_secret: {
    id: 'parrot_secret', serial: '002/100', name: 'Птица Говорун', family: 'parrot', rarity: 'secret',
    hp: 260, skillName: 'Ум и сообразительность', skillPower: 130,
    skillDesc: 'Понимает и говорит на всех языках Вселенной, помогая путешественникам в их космических странствиях.',
    lore: 'Секретная космическая птица из книг Кира Булычёва «Девочка с Земли». Птица Говорун отличается умом и сообразительностью, летая сквозь звёздные просторы.',
    cardImg: 'img/card_parrot_secret.png', petImg: 'img/pet_parrot_secret.png', emoji: '🦅'
  }
};

const DEFAULT_STICKER_PACKS = {
  pack_starter_all: {
    id: 'pack_starter_all',
    title: 'Классический Стикерпак Империи',
    family: 'all',
    price: 2500,
    icon: 'fa-box-open',
    desc: 'Содержит любую из 20 карточек всех семейств (Зайцы, Коты, Ёжики и Попугаи).'
  },
  pack_cats: {
    id: 'pack_cats',
    title: 'Стикерпак «Имперские Лапки» (Коты)',
    family: 'cat',
    price: 3200,
    icon: 'fa-cat',
    desc: 'Только семейство Котов: от Уютного Кота до Золотого Льва и Космического Кота!'
  },
  pack_hares: {
    id: 'pack_hares',
    title: 'Стикерпак «Лесные Ушки» (Зайцы)',
    family: 'hare',
    price: 3200,
    icon: 'fa-carrot',
    desc: 'Только семейство Зайцев: от Ушастого Зайца до Золотого и Космического Прыгуна!'
  },
  pack_hedgehogs: {
    id: 'pack_hedgehogs',
    title: 'Стикерпак «Золотые Иголки» (Ёжики)',
    family: 'hedgehog',
    price: 3200,
    icon: 'fa-shield-halved',
    desc: 'Только семейство Ёжиков: Денежный Ёжик, Золотой Ёж и секретный Ёж-Планета!'
  },
  pack_parrots: {
    id: 'pack_parrots',
    title: 'Стикерпак «Крылья Галактики» (Попугаи)',
    family: 'parrot',
    price: 3200,
    icon: 'fa-feather-pointed',
    desc: 'Только семейство Попугаев: Какаду Мудрец и легендарная секретная Птица Говорун!'
  },
  pack_royal_vip: {
    id: 'pack_royal_vip',
    title: 'Королевский Космо-Ларец (Повышенный шанс!)',
    family: 'all',
    price: 18000,
    icon: 'fa-crown',
    vipBoost: true,
    desc: 'Элитный пак: исключает Обычные карточки! Выпадают только Редкие, Эпические, Легендарные и Секретные карточки!'
  }
};

// -------------------------------------------------------------------------
// 2. СОСТОЯНИЕ И УТИЛИТЫ ФОРМАТИРОВАНИЯ
// -------------------------------------------------------------------------
const pState = {
  currentUser: localStorage.getItem('mirobyte_active_user') || null,
  autoConvertUnits: localStorage.getItem('mb_pref_auto_convert_units') === 'true',
  activeTab: 'packs',
  cardRarityFilter: 'all',
  userObj: null,
  petsMarket: {},
  config: {
    rarities: JSON.parse(JSON.stringify(DEFAULT_RARITY_CONFIG)),
    cards: JSON.parse(JSON.stringify(DEFAULT_CARDS_CATALOG)),
    packs: JSON.parse(JSON.stringify(DEFAULT_STICKER_PACKS)),
    food: JSON.parse(JSON.stringify(DEFAULT_FOOD_CATALOG))
  },
  feedingPenInstanceId: null
};

function normalizeLogin(val) {
  return String(val || '').trim().toLowerCase();
}

function escapeHtml(val) {
  return String(val ?? '').replace(/[&<>'"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));
}

const BAITY_UNITS = [
  { threshold: 1e15, suffix: 'P₿' },
  { threshold: 1e12, suffix: 'T₿' },
  { threshold: 1e9,  suffix: 'G₿' },
  { threshold: 1e6,  suffix: 'M₿' },
  { threshold: 1e3,  suffix: 'K₿' }
];

function formatBaity(value, options = {}) {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return '0 ฿';
  const sign = num < 0 ? '-' : (options.showPlus && num > 0 ? '+' : '');
  const abs = Math.abs(num);
  if (pState.autoConvertUnits && abs >= 1000 && !options.forceFull) {
    for (const u of BAITY_UNITS) {
      if (abs >= u.threshold) {
        const scaled = abs / u.threshold;
        const formatted = scaled >= 100 ? scaled.toFixed(1) : scaled.toFixed(2);
        return `${sign}${formatted.replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')} ${u.suffix}`;
      }
    }
  }
  if (options.decimals !== undefined && abs < 1000) return `${sign}${abs.toFixed(options.decimals)} ฿`;
  return `${sign}${Math.round(abs).toLocaleString('ru-RU')} ฿`;
}

function formatCountdownHMS(ms) {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const h = String(Math.floor(totalSec / 3600)).padStart(2, '0');
  const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
  const s = String(totalSec % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  const colors = {
    success: 'bg-[#06291d] border-emerald-400 text-emerald-100',
    error: 'bg-[#2b0810] border-rose-500 text-rose-100',
    info: 'bg-[#081c15] border-bank-gold text-bank-gold'
  };
  toast.className = `pointer-events-auto px-3.5 py-2.5 rounded-2xl border-2 shadow-2xl flex items-center gap-2 text-xs font-semibold transition-all duration-300 ${colors[type] || colors.info}`;
  toast.innerHTML = `<i class="fa-solid fa-paw text-bank-gold"></i><span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3400);
}

function generateCardFallbackSvg(card, isPetOnly = false) {
  const rCfg = pState.config.rarities[card.rarity] || DEFAULT_RARITY_CONFIG.common;
  const cHex = rCfg.colorHex || '#10b981';
  if (isPetOnly) {
    const svgPet = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"><circle cx="150" cy="160" r="110" fill="rgba(16,185,129,0.12)" stroke="${cHex}" stroke-width="4" stroke-dasharray="6,6"/><text x="150" y="190" font-size="115" text-anchor="middle">${card.emoji || '🐾'}</text></svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svgPet);
  }
  const svgCard = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 500">
    <rect width="360" height="500" rx="22" fill="#071a12" stroke="${cHex}" stroke-width="8"/>
    <rect x="18" y="18" width="324" height="40" rx="10" fill="#04100b" stroke="${cHex}" stroke-width="2"/>
    <text x="30" y="43" font-family="Inter, sans-serif" font-size="13" font-weight="bold" fill="${cHex}">${rCfg.name.toUpperCase()}</text>
    <text x="330" y="43" font-family="Inter, sans-serif" font-size="15" font-weight="900" fill="#ffffff" text-anchor="end">HP ${card.hp}</text>
    <rect x="24" y="70" width="312" height="220" rx="16" fill="#0b281c" stroke="${cHex}" stroke-width="2"/>
    <text x="180" y="205" font-size="95" text-anchor="middle">${card.emoji || '🐾'}</text>
    <text x="180" y="325" font-family="Cinzel, serif" font-size="20" font-weight="900" fill="#ffffff" text-anchor="middle">${card.name.toUpperCase()}</text>
    <rect x="24" y="345" width="312" height="95" rx="12" fill="#04100b" stroke="${cHex}" stroke-width="1.5"/>
    <text x="38" y="372" font-family="Inter, sans-serif" font-size="13" font-weight="bold" fill="#ffd700">⚡ ${card.skillName}: +${card.skillPower}</text>
    <text x="180" y="476" font-family="Cinzel, serif" font-size="13" font-weight="bold" fill="#e6c875" text-anchor="middle">MIROBYTE BANK • #${card.serial || '001/100'}</text>
  </svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svgCard);
}

// -------------------------------------------------------------------------
// 3. МАТЕМАТИКА ДОХОДА И СОСТОЯНИЯ ПИТОМЦЕВ В ЗАГОНЕ
// -------------------------------------------------------------------------
function getPetHourlyIncome(cardCfg) {
  if (!cardCfg) return 100;
  const rCfg = pState.config.rarities[cardCfg.rarity] || DEFAULT_RARITY_CONFIG.common;
  const base = Number(rCfg.baseHourly || 450);
  const statBonus = 1 + ((Number(cardCfg.hp || 50) + Number(cardCfg.skillPower || 10)) / 400);
  return Math.max(10, Math.round(base * statBonus));
}

function evaluateUserPenStatus(userObj, nowMs = getServerTime()) {
  const penMap = userObj?.petsData?.pen || {};
  const entries = Object.entries(penMap);
  let totalPending = 0;
  let totalHourly = 0;
  let deadCount = 0;
  const perPet = {};
  const maxStorageMs = MAX_STORAGE_HOURS * 3600 * 1000;

  entries.forEach(([instId, pData]) => {
    if (!pData) return;
    const cardCfg = pState.config.cards[pData.cardId] || DEFAULT_CARDS_CATALOG[pData.cardId];
    if (!cardCfg) return;

    const lastFed = Number(pData.lastFed || pData.createdAt || nowMs);
    const timeSinceFed = Math.max(0, nowMs - lastFed);
    const hungerLeftMs = Math.max(0, HUNGER_DEATH_PERIOD_MS - timeSinceFed);
    const isDead = pData.isDead === true || timeSinceFed >= HUNGER_DEATH_PERIOD_MS;

    const hourly = isDead ? 0 : getPetHourlyIncome(cardCfg);
    totalHourly += hourly;
    if (isDead) deadCount++;

    const effectiveEndMs = isDead ? Math.min(nowMs, lastFed + HUNGER_DEATH_PERIOD_MS) : nowMs;
    const lastCol = Number(pData.lastCollected || lastFed);
    const elapsedMs = Math.max(0, Math.min(maxStorageMs, effectiveEndMs - lastCol));
    const earned = isDead ? 0 : (hourly / 3600000) * elapsedMs;

    totalPending += earned;
    perPet[instId] = {
      instId,
      cardCfg,
      pData,
      isDead,
      hourly,
      earned,
      hungerLeftMs,
      hungerPct: Math.min(100, (hungerLeftMs / HUNGER_DEATH_PERIOD_MS) * 100)
    };
  });

  return { totalPending, totalHourly, deadCount, perPet, totalPets: entries.length };
}

// -------------------------------------------------------------------------
// 4. АТОМАРНЫЕ ТРАНЗАКЦИИ С БАЛАНСОМ И КАЗНОЙ БАНКА
// -------------------------------------------------------------------------
async function changeUserBaityAtomic(username, delta, requireFunds = false) {
  const cleanDelta = Math.round(Number(delta || 0));
  if (!Number.isSafeInteger(cleanDelta) || cleanDelta === 0) return false;
  const uKey = normalizeLogin(username);
  const res = await db.ref(`bankData/users/${uKey}/balance`).transaction(bal => {
    const cur = Math.round(Number(bal || 0));
    if (requireFunds && cur < Math.abs(cleanDelta)) return;
    return Math.max(0, cur + cleanDelta);
  });
  return res.committed;
}

async function addBankTreasuryReserve(amount) {
  const clean = Math.round(Number(amount || 0));
  if (clean <= 0) return;
  await db.ref('bankData/bankReserve').transaction(v => Math.round(Number(v || 0)) + clean);
}

function isCurrentUserAdmin() {
  const u = pState.userObj;
  if (!u) return false;
  return !!(u.isOwner || u.isSuperAdmin || u.isAdmin || normalizeLogin(u.username) === OWNER_USERNAME);
}

// -------------------------------------------------------------------------
// 5. ОТКРЫТИЕ СТИКЕРПАКОВ И РОЛЛ КАРТОЧЕК ПО ПРОЦЕНТАМ
// -------------------------------------------------------------------------
function rollRarityByConfig(vipBoost = false) {
  const rMap = pState.config.rarities;
  const pool = vipBoost
    ? ['rare', 'epic', 'legendary', 'secret']
    : ['common', 'rare', 'epic', 'legendary', 'secret'];

  let totalWeight = 0;
  pool.forEach(k => { totalWeight += Math.max(0.1, Number(rMap[k]?.dropChance || 1)); });

  let rand = Math.random() * totalWeight;
  for (const k of pool) {
    const w = Math.max(0.1, Number(rMap[k]?.dropChance || 1));
    if (rand <= w) return k;
    rand -= w;
  }
  return pool[0];
}

let isOpeningPack = false;

async function buyAndOpenStickerPack(packId, btnEl) {
  if (isOpeningPack) return;
  if (!pState.currentUser || !pState.userObj) return showToast('Сначала войдите в свой счёт в Банке!', 'error');

  const pack = pState.config.packs[packId];
  if (!pack) return;
  const price = Math.round(Number(pack.price || 2500));
  if ((pState.userObj.balance || 0) < price) {
    return showToast(`Недостаточно Байти! Требуется ${formatBaity(price)}.`, 'error');
  }

  isOpeningPack = true;
  if (btnEl) btnEl.disabled = true;

  try {
    const paid = await changeUserBaityAtomic(pState.currentUser, -price, true);
    if (!paid) return showToast('Не удалось списать Байти.', 'error');
    await addBankTreasuryReserve(price);

    const rolledRarity = rollRarityByConfig(!!pack.vipBoost);
    let candidateCards = Object.values(pState.config.cards).filter(c => c.rarity === rolledRarity);
    if (pack.family && pack.family !== 'all') {
      const famCards = candidateCards.filter(c => c.family === pack.family);
      if (famCards.length > 0) candidateCards = famCards;
    }
    if (candidateCards.length === 0) candidateCards = Object.values(pState.config.cards);

    const wonCard = candidateCards[Math.floor(Math.random() * candidateCards.length)];
    const uKey = normalizeLogin(pState.currentUser);

    await db.ref(`bankData/users/${uKey}/petsData/cards/${wonCard.id}`).transaction(cnt => Math.round(Number(cnt || 0)) + 1);
    await db.ref(`bankData/users/${uKey}/stats/expense/craftsUpgradeAndSupply`).transaction(v => Math.round(Number(v || 0)) + price);

    await syncUserTotalHourlyInDb();
    openCardRevealModal(wonCard, true);
    showToast(`🎉 Выпала карточка: «${wonCard.name}»!`, 'success');
  } finally {
    isOpeningPack = false;
    if (btnEl) btnEl.disabled = false;
  }
}

function openCardRevealModal(cardCfg, isNewDrop = false) {
  if (!cardCfg) return;
  const rCfg = pState.config.rarities[cardCfg.rarity] || DEFAULT_RARITY_CONFIG.common;
  const badge = document.getElementById('revealModalHeaderBadge');
  const frameBox = document.getElementById('revealCardFrameBox');
  const imgEl = document.getElementById('revealCardImgEl');
  const titleEl = document.getElementById('revealCardTitleEl');
  const statsEl = document.getElementById('revealCardStatsEl');
  const descEl = document.getElementById('revealCardDescEl');

  if (badge) badge.innerText = isNewDrop ? `🎉 ВЫПАЛА КАРТОЧКА: ${rCfg.name.toUpperCase()}!` : `${rCfg.badge} • Серия #${cardCfg.serial || '001/100'}`;
  if (frameBox) frameBox.className = `pet-card-frame ${rCfg.css}`;
  if (imgEl) {
    imgEl.onerror = () => { imgEl.onerror = null; imgEl.src = generateCardFallbackSvg(cardCfg, false); };
    imgEl.src = cardCfg.cardImg;
  }
  if (titleEl) titleEl.innerText = cardCfg.name;
  const hourly = getPetHourlyIncome(cardCfg);
  if (statsEl) statsEl.innerText = `HP ${cardCfg.hp} • ${cardCfg.skillName} (${cardCfg.skillPower}) • Доход в загоне: +${formatBaity(hourly)}/ч`;
  if (descEl) descEl.innerText = `${cardCfg.skillDesc} ${cardCfg.lore || ''}`;

  const modal = document.getElementById('cardRevealModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeCardRevealModal() {
  const modal = document.getElementById('cardRevealModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

// -------------------------------------------------------------------------
// 6. КРАФТ (СОЕДИНЕНИЕ 2 ОДИНАКОВЫХ КАРТОЧЕК → ЖИВОТНОЕ В ЗАГОН)
// -------------------------------------------------------------------------
async function craftPetFromCard(cardId, btnEl) {
  if (!pState.currentUser || !pState.userObj) return;
  const cardCfg = pState.config.cards[cardId];
  if (!cardCfg) return;

  const ownedQty = Number(pState.userObj?.petsData?.cards?.[cardId] || 0);
  if (ownedQty < 2) {
    return showToast('Для крафта питомца нужно минимум 2 одинаковые карточки этого вида!', 'error');
  }

  if (btnEl) btnEl.disabled = true;
  try {
    const uKey = normalizeLogin(pState.currentUser);
    const cardRef = db.ref(`bankData/users/${uKey}/petsData/cards/${cardId}`);
    const tx = await cardRef.transaction(cur => {
      const c = Math.round(Number(cur || 0));
      if (c < 2) return;
      return c - 2;
    });

    if (!tx.committed) return showToast('Недостаточно карточек для крафта!', 'error');

    const now = getServerTime();
    const instId = `pet_${now}_${Math.random().toString(36).slice(2, 6)}`;
    const hourly = getPetHourlyIncome(cardCfg);

    await db.ref(`bankData/users/${uKey}/petsData/pen/${instId}`).set({
      instanceId: instId,
      cardId: cardCfg.id,
      rarity: cardCfg.rarity,
      hourlyIncome: hourly,
      lastFed: now,
      lastCollected: now,
      isDead: false,
      createdAt: now
    });

    await syncUserTotalHourlyInDb();
    showToast(`🐾 Питомец «${cardCfg.name}» успешно скрафчен и помещён в ваш Загон (+${formatBaity(hourly)}/ч)!`, 'success');
    switchPetsTab('pen');
  } finally {
    if (btnEl) btnEl.disabled = false;
  }
}

async function craftAllReadyDuplicateCards(btnEl) {
  if (!pState.currentUser || !pState.userObj) return;
  const cardsMap = pState.userObj?.petsData?.cards || {};
  const readyIds = Object.keys(cardsMap).filter(id => Number(cardsMap[id] || 0) >= 2 && pState.config.cards[id]);

  if (readyIds.length === 0) {
    return showToast('У вас пока нет дубликатов (2+ одинаковых карточек) для авто-крафта!', 'info');
  }

  for (const cardId of readyIds) {
    await craftPetFromCard(cardId, btnEl);
  }
}

async function syncUserTotalHourlyInDb() {
  if (!pState.currentUser) return;
  const uKey = normalizeLogin(pState.currentUser);
  const snap = await db.ref(`bankData/users/${uKey}`).once('value');
  const uVal = snap.val();
  if (!uVal) return;
  const status = evaluateUserPenStatus(uVal, getServerTime());
  const cardsCount = Object.values(uVal?.petsData?.cards || {}).reduce((a, b) => a + Number(b || 0), 0);
  await db.ref(`bankData/users/${uKey}/petsData/summary`).set({
    totalHourly: status.totalHourly,
    penCount: status.totalPets,
    cardsCount,
    updatedAt: getServerTime()
  });
}

// -------------------------------------------------------------------------
// 7. КОРМЛЕНИЕ ПИТОМЦЕВ, СБОР ДОХОДА И ВОЗРОЖДЕНИЕ
// -------------------------------------------------------------------------
async function buyPetFood(foodId, qty = 1, btnEl = null) {
  if (!pState.currentUser || !pState.userObj) return showToast('Войдите в счёт!', 'error');
  const foodCfg = pState.config.food.find(f => f.id === foodId);
  if (!foodCfg) return;

  const cleanQty = Math.max(1, Math.round(Number(qty || 1)));
  const totalCost = Math.round(Number(foodCfg.price || 150) * cleanQty);
  if ((pState.userObj.balance || 0) < totalCost) {
    return showToast(`Недостаточно Байти! Требуется ${formatBaity(totalCost)}.`, 'error');
  }

  if (btnEl) btnEl.disabled = true;
  try {
    const paid = await changeUserBaityAtomic(pState.currentUser, -totalCost, true);
    if (!paid) return;
    await addBankTreasuryReserve(totalCost);

    const uKey = normalizeLogin(pState.currentUser);
    await db.ref(`bankData/users/${uKey}/petsData/food/${foodId}`).transaction(c => Math.round(Number(c || 0)) + cleanQty);
    showToast(`${foodCfg.icon} Куплено: ${foodCfg.name} (×${cleanQty}) за ${formatBaity(totalCost)}!`, 'success');
  } finally {
    if (btnEl) btnEl.disabled = false;
  }
}

function openFeedPetModal(instanceId) {
  if (!pState.userObj) return;
  const pData = pState.userObj?.petsData?.pen?.[instanceId];
  if (!pData) return;
  const cardCfg = pState.config.cards[pData.cardId] || DEFAULT_CARDS_CATALOG[pData.cardId];
  const rCfg = pState.config.rarities[cardCfg.rarity] || DEFAULT_RARITY_CONFIG.common;
  const reqPoints = Number(rCfg.hungerPointsRequired || 10);

  pState.feedingPenInstanceId = instanceId;
  document.getElementById('feedModalPetTitle').innerText = `Накормить «${cardCfg.name}» (${rCfg.name})`;
  document.getElementById('feedModalPetSub').innerText = `Для полного насыщения на 24 часа требуется ${reqPoints} ед. сытости:`;

  const userFood = pState.userObj?.petsData?.food || {};
  const box = document.getElementById('feedModalFoodOptions');

  box.innerHTML = pState.config.food.map(f => {
    const owned = Number(userFood[f.id] || 0);
    const unitsNeeded = Math.max(1, Math.ceil(reqPoints / Number(f.nutritionPoints || 10)));
    const canFeed = owned >= unitsNeeded;

    return `
      <div class="p-3 rounded-2xl bg-bank-darkest border border-bank-border flex items-center justify-between gap-2 text-xs">
        <div>
          <div class="font-bold text-white">${f.icon} ${escapeHtml(f.name)} <span class="text-bank-gold font-mono">(У вас: ${owned} шт.)</span></div>
          <div class="text-[10px] text-emerald-400/80">Нужно для полного насыщения (24ч): <b>${unitsNeeded} шт.</b></div>
        </div>
        ${canFeed
          ? `<button onclick="feedPetWithSpecificFood('${instanceId}', '${f.id}', ${unitsNeeded}, this)" class="px-3.5 py-1.5 rounded-xl bg-emerald-500 text-black font-royal font-black text-[10px] uppercase">Покормить (${unitsNeeded} шт.)</button>`
          : `<button onclick="buyPetFood('${f.id}', ${unitsNeeded - owned}, this)" class="px-3 py-1.5 rounded-xl bg-bank-gold text-black font-royal font-bold text-[10px] uppercase">Докупить (${formatBaity((unitsNeeded - owned) * f.price)})</button>`
        }
      </div>
    `;
  }).join('');

  const modal = document.getElementById('feedPetModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeFeedPetModal() {
  const modal = document.getElementById('feedPetModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

async function feedPetWithSpecificFood(instanceId, foodId, unitsNeeded, btnEl) {
  if (!pState.currentUser || !pState.userObj) return;
  const uKey = normalizeLogin(pState.currentUser);
  const foodRef = db.ref(`bankData/users/${uKey}/petsData/food/${foodId}`);

  if (btnEl) btnEl.disabled = true;
  try {
    const tx = await foodRef.transaction(cur => {
      const c = Math.round(Number(cur || 0));
      if (c < unitsNeeded) return;
      return c - unitsNeeded;
    });
    if (!tx.committed) return showToast('Недостаточно выбранного корма!', 'error');

    const now = getServerTime();
    await db.ref(`bankData/users/${uKey}/petsData/pen/${instanceId}`).update({
      lastFed: now,
      isDead: false
    });
    closeFeedPetModal();
    showToast('🥕 Питомец сыт и доволен! Таймер жизни обновлён на 24 часа.', 'success');
  } finally {
    if (btnEl) btnEl.disabled = false;
  }
}

async function feedAllPetsQuick(btnEl) {
  if (!pState.currentUser || !pState.userObj) return;
  const status = evaluateUserPenStatus(pState.userObj, getServerTime());
  const alivePets = Object.values(status.perPet).filter(p => !p.isDead);
  if (alivePets.length === 0) return showToast('Нет активных живых питомцев для кормления!', 'info');

  let fedCount = 0;
  for (const pet of alivePets) {
    const rCfg = pState.config.rarities[pet.cardCfg.rarity] || DEFAULT_RARITY_CONFIG.common;
    const reqPoints = Number(rCfg.hungerPointsRequired || 10);
    const userFood = pState.userObj?.petsData?.food || {};
    const matchingFood = pState.config.food.find(f => {
      const need = Math.max(1, Math.ceil(reqPoints / Number(f.nutritionPoints || 10)));
      return Number(userFood[f.id] || 0) >= need;
    });
    if (matchingFood) {
      const need = Math.max(1, Math.ceil(reqPoints / Number(matchingFood.nutritionPoints || 10)));
      await feedPetWithSpecificFood(pet.instId, matchingFood.id, need, btnEl);
      fedCount++;
    }
  }
  if (fedCount === 0) {
    showToast('Не хватило корма в запасах! Загляните в «Лавку Корма».', 'error');
    switchPetsTab('food');
  } else {
    showToast(`🥕 Покормлено питомцев: ${fedCount} шт.!`, 'success');
  }
}

async function reviveDeadPet(instanceId, btnEl) {
  if (!pState.currentUser || !pState.userObj) return;
  const pData = pState.userObj?.petsData?.pen?.[instanceId];
  if (!pData) return;
  const cardCfg = pState.config.cards[pData.cardId] || DEFAULT_CARDS_CATALOG[pData.cardId];
  const rCfg = pState.config.rarities[cardCfg.rarity] || DEFAULT_RARITY_CONFIG.common;
  const cost = Math.round(Number(rCfg.reviveCost || 1500));

  if ((pState.userObj.balance || 0) < cost) {
    return showToast(`Для возрождения «${cardCfg.name}» требуется штраф ${formatBaity(cost)}!`, 'error');
  }

  if (btnEl) btnEl.disabled = true;
  try {
    const paid = await changeUserBaityAtomic(pState.currentUser, -cost, true);
    if (!paid) return;
    await addBankTreasuryReserve(cost);

    const now = getServerTime();
    const uKey = normalizeLogin(pState.currentUser);
    await db.ref(`bankData/users/${uKey}/petsData/pen/${instanceId}`).update({
      isDead: false,
      lastFed: now,
      lastCollected: now
    });
    await syncUserTotalHourlyInDb();
    showToast(`✨ Питомец «${cardCfg.name}» возрождён и снова приносит Байти!`, 'success');
  } finally {
    if (btnEl) btnEl.disabled = false;
  }
}

async function collectAllPetsIncome(btnEl) {
  if (!pState.currentUser || !pState.userObj) return showToast('Войдите в счёт!', 'error');
  const now = getServerTime();
  const status = evaluateUserPenStatus(pState.userObj, now);
  const amount = Math.floor(status.totalPending);

  if (amount < 1) {
    return showToast('В кассе Загона ещё не накопился минимум 1 ฿!', 'info');
  }

  if (btnEl) btnEl.disabled = true;
  try {
    const uKey = normalizeLogin(pState.currentUser);
    const updates = {};
    Object.values(status.perPet).forEach(p => {
      if (!p.isDead) {
        updates[`bankData/users/${uKey}/petsData/pen/${p.instId}/lastCollected`] = now;
      } else {
        updates[`bankData/users/${uKey}/petsData/pen/${p.instId}/isDead`] = true;
      }
    });

    await db.ref().update(updates);
    await changeUserBaityAtomic(pState.currentUser, amount, false);
    await db.ref(`bankData/users/${uKey}/stats/income/crafts`).transaction(v => Math.round(Number(v || 0)) + amount);

    const txId = `PETS-${now}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    await db.ref(`bankData/transactions/${txId}`).set({
      id: txId,
      from: 'ИМПЕРАТОРСКИЙ ЗООПАРК (/pants)',
      to: pState.currentUser,
      amount,
      comment: `Сбор дохода питомцев (${status.totalPets} в загоне)`,
      timestamp: new Date(now).toLocaleString('ru-RU'),
      timestampMs: serverTimestamp()
    });

    await syncUserTotalHourlyInDb();
    showToast(`💰 Собрана выручка Загона: +${formatBaity(amount)}!`, 'success');
  } finally {
    if (btnEl) btnEl.disabled = false;
  }
}

// -------------------------------------------------------------------------
// 8. ТОРГОВАЯ ПЛОЩАДКА (P2P МАРКЕТ КАРТОЧЕК И КОРМА)
// -------------------------------------------------------------------------
function populateMarketLotSelect() {
  const sel = document.getElementById('marketLotItemSelect');
  if (!sel || !pState.userObj) return;
  const opts = [];

  const cardsMap = pState.userObj?.petsData?.cards || {};
  Object.entries(cardsMap).forEach(([cardId, qty]) => {
    const cnt = Number(qty || 0);
    const cfg = pState.config.cards[cardId];
    if (cnt > 0 && cfg) {
      const rCfg = pState.config.rarities[cfg.rarity] || DEFAULT_RARITY_CONFIG.common;
      opts.push(`<option value="card|${cardId}">🃏 [Карточка ${rCfg.name}] ${escapeHtml(cfg.name)} (В наличии: ${cnt} шт.)</option>`);
    }
  });

  const foodMap = pState.userObj?.petsData?.food || {};
  pState.config.food.forEach(f => {
    const cnt = Number(foodMap[f.id] || 0);
    if (cnt > 0) {
      opts.push(`<option value="food|${f.id}">${f.icon} [Корм] ${escapeHtml(f.name)} (В наличии: ${cnt} шт.)</option>`);
    }
  });

  sel.innerHTML = opts.length > 0
    ? opts.join('')
    : '<option value="">У вас нет карточек или корма для продажи</option>';
}

async function handleCreatePetMarketLot(e) {
  e.preventDefault();
  if (!pState.currentUser || !pState.userObj) return;

  const rawVal = document.getElementById('marketLotItemSelect')?.value || '';
  if (!rawVal.includes('|')) return showToast('Выберите предмет для продажи!', 'error');
  const [itemType, itemId] = rawVal.split('|');

  const qty = Math.max(1, parseInt(document.getElementById('marketLotQtyInput')?.value || '1', 10));
  const price = Math.max(10, parseInt(document.getElementById('marketLotPriceInput')?.value || '0', 10));
  if (!Number.isSafeInteger(price) || price < 10) return showToast('Минимальная цена лота: 10 ฿!', 'error');

  const uKey = normalizeLogin(pState.currentUser);
  const path = itemType === 'card'
    ? `bankData/users/${uKey}/petsData/cards/${itemId}`
    : `bankData/users/${uKey}/petsData/food/${itemId}`;

  const tx = await db.ref(path).transaction(cur => {
    const c = Math.round(Number(cur || 0));
    if (c < qty) return;
    return c - qty;
  });

  if (!tx.committed) return showToast(`У вас нет ${qty} шт. выбранного предмета!`, 'error');

  let title = itemId;
  let rarity = 'common';
  let img = '';
  if (itemType === 'card') {
    const cCfg = pState.config.cards[itemId];
    title = cCfg ? cCfg.name : itemId;
    rarity = cCfg ? cCfg.rarity : 'common';
    img = cCfg ? cCfg.cardImg : '';
  } else {
    const fCfg = pState.config.food.find(f => f.id === itemId);
    title = fCfg ? `${fCfg.icon} ${fCfg.name}` : itemId;
    rarity = fCfg ? fCfg.rarity : 'common';
  }

  const lotId = `PLOT_${getServerTime()}_${Math.random().toString(36).slice(2, 6)}`;
  await db.ref(`bankData/petsMarket/${lotId}`).set({
    id: lotId,
    seller: pState.currentUser,
    itemType,
    itemId,
    title,
    rarity,
    img,
    qty,
    price,
    createdAtMs: getServerTime()
  });

  showToast(`⚖️ Лот «${title}» (×${qty}) выставлен за ${formatBaity(price)}!`, 'success');
}

async function buyPetMarketLot(lotId, btnEl) {
  if (!pState.currentUser || !pState.userObj) return showToast('Войдите в счёт!', 'error');
  const lot = pState.petsMarket[lotId];
  if (!lot) return showToast('Этот лот уже куплен!', 'error');

  if (normalizeLogin(lot.seller) === normalizeLogin(pState.currentUser)) {
    return showToast('Нельзя купить собственный лот (вы можете снять его с продажи)!', 'info');
  }

  const price = Math.round(Number(lot.price || 0));
  if ((pState.userObj.balance || 0) < price) {
    return showToast(`Недостаточно Байти! Требуется ${formatBaity(price)}.`, 'error');
  }

  if (btnEl) btnEl.disabled = true;
  try {
    const lotClaim = await db.ref(`bankData/petsMarket/${lotId}`).transaction(cur => {
      if (cur === null) return;
      return null;
    });
    if (!lotClaim.committed) return showToast('Лот уже был куплен другим игроком!', 'error');

    const paid = await changeUserBaityAtomic(pState.currentUser, -price, true);
    if (!paid) {
      await db.ref(`bankData/petsMarket/${lotId}`).set(lot);
      return showToast('Недостаточно Байти на балансе!', 'error');
    }

    const fee = Math.max(1, Math.round(price * P2P_MARKET_FEE));
    const sellerNet = Math.max(1, price - fee);
    await changeUserBaityAtomic(lot.seller, sellerNet, false);
    await addBankTreasuryReserve(fee);

    const buyerKey = normalizeLogin(pState.currentUser);
    const targetPath = lot.itemType === 'card'
      ? `bankData/users/${buyerKey}/petsData/cards/${lot.itemId}`
      : `bankData/users/${buyerKey}/petsData/food/${lot.itemId}`;

    await db.ref(targetPath).transaction(c => Math.round(Number(c || 0)) + Number(lot.qty || 1));
    await syncUserTotalHourlyInDb();

    showToast(`🤝 Куплено «${lot.title}» (×${lot.qty}) у @${lot.seller} за ${formatBaity(price)}!`, 'success');
  } finally {
    if (btnEl) btnEl.disabled = false;
  }
}

async function cancelMyPetMarketLot(lotId, btnEl) {
  if (!pState.currentUser) return;
  const lot = pState.petsMarket[lotId];
  if (!lot) return;
  const isMine = normalizeLogin(lot.seller) === normalizeLogin(pState.currentUser);
  if (!isMine && !isCurrentUserAdmin()) return;

  if (btnEl) btnEl.disabled = true;
  try {
    await db.ref(`bankData/petsMarket/${lotId}`).remove();
    const sellerKey = normalizeLogin(lot.seller);
    const targetPath = lot.itemType === 'card'
      ? `bankData/users/${sellerKey}/petsData/cards/${lot.itemId}`
      : `bankData/users/${sellerKey}/petsData/food/${lot.itemId}`;
    await db.ref(targetPath).transaction(c => Math.round(Number(c || 0)) + Number(lot.qty || 1));
    showToast(`Лот «${lot.title}» снят с торгов и возвращён в инвентарь.`, 'info');
  } finally {
    if (btnEl) btnEl.disabled = false;
  }
}

// -------------------------------------------------------------------------
// 9. ТОП-20 ЗООПАРКОВ С КЭШИРОВАНИЕМ В LOCALSTORAGE (5 МИНУТ)
// -------------------------------------------------------------------------
async function loadTop20Players(forceRefresh = false) {
  const tbody = document.getElementById('petsTop20TableBody');
  const cacheBadge = document.getElementById('topCacheTimestampBadge');
  if (!tbody) return;

  if (!forceRefresh) {
    try {
      const cachedRaw = localStorage.getItem(TOP20_CACHE_KEY);
      if (cachedRaw) {
        const parsed = JSON.parse(cachedRaw);
        if (parsed && parsed.ts && (Date.now() - parsed.ts) < TOP20_CACHE_TTL_MS && Array.isArray(parsed.list)) {
          renderTop20TableRows(parsed.list);
          if (cacheBadge) cacheBadge.innerText = `Из кэша (${new Date(parsed.ts).toLocaleTimeString('ru-RU')})`;
          return;
        }
      }
    } catch (e) {}
  }

  if (cacheBadge) cacheBadge.innerText = 'Загрузка из Firebase...';

  try {
    const snap = await db.ref('bankData/users')
      .orderByChild('petsData/summary/totalHourly')
      .limitToLast(20)
      .once('value');

    const val = snap.val() || {};
    const list = Object.values(val)
      .filter(u => u && !u.hiddenFromAll)
      .map(u => {
        const st = evaluateUserPenStatus(u, getServerTime());
        const cardsCount = Object.values(u?.petsData?.cards || {}).reduce((a, b) => a + Number(b || 0), 0);
        return {
          username: u.username,
          penCount: st.totalPets,
          cardsCount,
          totalHourly: st.totalHourly
        };
      })
      .sort((a, b) => b.totalHourly - a.totalHourly || b.cardsCount - a.cardsCount)
      .slice(0, 20);

    localStorage.setItem(TOP20_CACHE_KEY, JSON.stringify({ ts: Date.now(), list }));
    if (cacheBadge) cacheBadge.innerText = `Обновлено: ${new Date().toLocaleTimeString('ru-RU')}`;
    renderTop20TableRows(list);
  } catch (err) {
    if (cacheBadge) cacheBadge.innerText = 'Ошибка чтения';
  }
}

function renderTop20TableRows(list) {
  const tbody = document.getElementById('petsTop20TableBody');
  if (!tbody) return;

  if (!list || list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-emerald-500/60">В рейтинге пока нет активных зоопарков</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map((item, idx) => {
    const rank = idx + 1;
    const medal = rank === 1 ? '🥇 1' : (rank === 2 ? '🥈 2' : (rank === 3 ? '🥉 3' : `#${rank}`));
    return `
      <tr class="hover:bg-bank-card/50 transition-colors">
        <td class="py-2.5 px-2 font-bold text-bank-gold">${medal}</td>
        <td class="py-2.5 px-2 font-royal font-bold text-white">@${escapeHtml(item.username)}</td>
        <td class="py-2.5 px-2 font-mono text-emerald-300">🐾 ${item.penCount} шт.</td>
        <td class="py-2.5 px-2 font-mono text-amber-300">🃏 ${item.cardsCount} шт.</td>
        <td class="py-2.5 px-2 text-right font-mono font-black text-bank-gold">+${formatBaity(item.totalHourly)}/ч</td>
      </tr>
    `;
  }).join('');
}

// -------------------------------------------------------------------------
// 10. АДМИН-ПАНЕЛЬ ЗООПАРКА (СТАТИСТИКА, ШАНСЫ, КАРТОЧКИ, ПАКИ)
// -------------------------------------------------------------------------
async function renderAdminPetsPanel() {
  if (!isCurrentUserAdmin()) return;

  // Заполняем поля шансов выпадения
  ['common', 'rare', 'epic', 'legendary', 'secret'].forEach(rKey => {
    const inp = document.getElementById(`admRate_${rKey}`);
    if (inp) inp.value = pState.config.rarities[rKey]?.dropChance ?? DEFAULT_RARITY_CONFIG[rKey].dropChance;
  });

  // Заполняем поля дохода и возрождения
  const econBox = document.getElementById('adminRarityEconomyInputs');
  if (econBox) {
    econBox.innerHTML = ['common', 'rare', 'epic', 'legendary', 'secret'].map(rKey => {
      const rCfg = pState.config.rarities[rKey] || DEFAULT_RARITY_CONFIG[rKey];
      return `
        <div class="grid grid-cols-3 gap-2 items-center p-2 rounded-xl bg-bank-darkest border border-bank-border text-xs">
          <span class="font-bold text-white">${rCfg.badge}</span>
          <div>
            <label class="block text-[9px] text-emerald-400">Доход ฿/ч</label>
            <input type="number" id="admHourly_${rKey}" value="${rCfg.baseHourly}" min="10" required class="w-full bg-bank-surface border border-bank-border rounded-lg px-2 py-1 text-emerald-300 font-mono font-bold">
          </div>
          <div>
            <label class="block text-[9px] text-rose-300">Возрождение ฿</label>
            <input type="number" id="admRevive_${rKey}" value="${rCfg.reviveCost}" min="0" required class="w-full bg-bank-surface border border-bank-border rounded-lg px-2 py-1 text-bank-gold font-mono font-bold">
          </div>
        </div>
      `;
    }).join('');
  }

  // Считаем глобальную статистику по всем игрокам
  const statsGrid = document.getElementById('adminGlobalPetsStatsGrid');
  if (statsGrid) {
    const snap = await db.ref('bankData/users').once('value');
    const allUsers = snap.val() || {};
    const totalsByRarity = { common: 0, rare: 0, epic: 0, legendary: 0, secret: 0 };
    let totalAlivePen = 0;

    Object.values(allUsers).forEach(u => {
      const cards = u?.petsData?.cards || {};
      Object.entries(cards).forEach(([cId, q]) => {
        const cCfg = pState.config.cards[cId];
        if (cCfg && totalsByRarity[cCfg.rarity] !== undefined) {
          totalsByRarity[cCfg.rarity] += Number(q || 0);
        }
      });
      const pen = u?.petsData?.pen || {};
      totalAlivePen += Object.keys(pen).length;
    });

    statsGrid.innerHTML = ['common', 'rare', 'epic', 'legendary', 'secret'].map(rKey => {
      const rCfg = pState.config.rarities[rKey] || DEFAULT_RARITY_CONFIG[rKey];
      return `
        <div class="p-3 rounded-2xl bg-bank-darkest border border-bank-border text-center">
          <div class="text-[10px] font-bold text-emerald-300">${rCfg.badge}</div>
          <div class="font-royal font-black text-base text-white mt-0.5">${totalsByRarity[rKey]} карт</div>
          <div class="text-[9px] font-mono text-bank-gold">Шанс: ${rCfg.dropChance}%</div>
        </div>
      `;
    }).join('');
  }
}

async function saveAdminDropRates(e) {
  e.preventDefault();
  if (!isCurrentUserAdmin()) return;
  const updates = {};
  ['common', 'rare', 'epic', 'legendary', 'secret'].forEach(rKey => {
    const val = parseFloat(document.getElementById(`admRate_${rKey}`)?.value || '1');
    updates[`bankData/petsConfig/rarities/${rKey}/dropChance`] = Math.max(0.1, isNaN(val) ? 1 : val);
  });
  await db.ref().update(updates);
  showToast('✅ Проценты выпадения в стикерпаках сохранены!', 'success');
}

async function saveAdminRarityEconomy(e) {
  e.preventDefault();
  if (!isCurrentUserAdmin()) return;
  const updates = {};
  ['common', 'rare', 'epic', 'legendary', 'secret'].forEach(rKey => {
    const hr = parseInt(document.getElementById(`admHourly_${rKey}`)?.value || '450', 10);
    const rev = parseInt(document.getElementById(`admRevive_${rKey}`)?.value || '1200', 10);
    updates[`bankData/petsConfig/rarities/${rKey}/baseHourly`] = Math.max(10, isNaN(hr) ? 450 : hr);
    updates[`bankData/petsConfig/rarities/${rKey}/reviveCost`] = Math.max(0, isNaN(rev) ? 1200 : rev);
  });
  await db.ref().update(updates);
  showToast('✅ Доходность и стоимость возрождения обновлены!', 'success');
}

async function handleAdminSaveCardConfig(e) {
  e.preventDefault();
  if (!isCurrentUserAdmin()) return;
  const id = (document.getElementById('admCardId')?.value || '').trim();
  const name = (document.getElementById('admCardName')?.value || '').trim();
  const family = document.getElementById('admCardFamily')?.value || 'cat';
  const rarity = document.getElementById('admCardRarity')?.value || 'common';
  const hp = parseInt(document.getElementById('admCardHp')?.value || '100', 10);
  const skillPower = parseInt(document.getElementById('admCardPower')?.value || '50', 10);
  const skillName = (document.getElementById('admCardSkill')?.value || 'Умение').trim();
  const cardImg = (document.getElementById('admCardImg')?.value || '').trim();
  const petImg = (document.getElementById('admPetImg')?.value || '').trim();

  if (!id || !name || !cardImg || !petImg) return showToast('Заполните все поля карточки!', 'error');

  await db.ref(`bankData/petsConfig/cards/${id}`).set({
    id, serial: 'NEW/100', name, family, rarity, hp, skillName, skillPower,
    skillDesc: `Особое умение «${skillName}» приносит дополнительные Байти в загоне.`,
    lore: 'Эксклюзивная карточка Императорского Зоопарка Миробайт.',
    cardImg, petImg, emoji: '🐾'
  });
  showToast(`🃏 Карточка «${name}» сохранена в каталог!`, 'success');
}

async function handleAdminSaveStickerPack(e) {
  e.preventDefault();
  if (!isCurrentUserAdmin()) return;
  const id = (document.getElementById('admPackId')?.value || '').trim();
  const title = (document.getElementById('admPackTitle')?.value || '').trim();
  const family = document.getElementById('admPackFamily')?.value || 'all';
  const price = Math.max(10, parseInt(document.getElementById('admPackPrice')?.value || '2500', 10));
  if (!id || !title) return;

  await db.ref(`bankData/petsConfig/packs/${id}`).set({
    id, title, family, price, icon: 'fa-box-open',
    desc: `Эксклюзивный стикерпак «${title}» (Семейство: ${family}).`
  });
  showToast(`📦 Стикерпак «${title}» сохранён!`, 'success');
}

async function resetPetsConfigToDefaults() {
  if (!isCurrentUserAdmin()) return;
  await db.ref('bankData/petsConfig').set({
    rarities: DEFAULT_RARITY_CONFIG,
    cards: DEFAULT_CARDS_CATALOG,
    packs: DEFAULT_STICKER_PACKS,
    food: DEFAULT_FOOD_CATALOG
  });
  showToast('Конфигурация питомцев и карточек сброшена к заводской!', 'info');
}

// -------------------------------------------------------------------------
// 11. РЕНДЕР ВСЕХ ВКЛАДОК ИНТЕРФЕЙСА
// -------------------------------------------------------------------------
function switchPetsTab(tabKey) {
  pState.activeTab = tabKey;
  ['packs', 'cards', 'pen', 'food', 'market', 'top', 'admin'].forEach(k => {
    const view = document.getElementById(`pTabView-${k}`);
    const btn = document.getElementById(`pTabBtn-${k}`);
    if (view) view.classList.toggle('hidden', k !== tabKey);
    if (btn && !btn.classList.contains('hidden')) {
      btn.className = k === tabKey
        ? 'tap-btn flex-shrink-0 px-3 py-2 rounded-xl text-[11px] sm:text-xs font-royal font-bold uppercase bg-bank-gold text-black shadow-md flex items-center justify-center gap-1.5 whitespace-nowrap'
        : 'tap-btn flex-shrink-0 px-3 py-2 rounded-xl text-[11px] sm:text-xs font-royal font-bold uppercase bg-bank-surface text-emerald-300 border border-bank-border hover:bg-bank-card flex items-center justify-center gap-1.5 whitespace-nowrap';
    }
  });

  renderAllPetsUI();
  if (tabKey === 'top') loadTop20Players(false);
  if (tabKey === 'admin') renderAdminPetsPanel();
}

function setCardRarityFilter(rarityKey) {
  pState.cardRarityFilter = rarityKey || 'all';
  ['all', 'common', 'rare', 'epic', 'legendary', 'secret'].forEach(k => {
    const b = document.getElementById(`cardFlt-${k}`);
    if (b) {
      b.className = k === pState.cardRarityFilter
        ? 'px-3 py-1.5 rounded-xl bg-bank-gold text-black font-royal font-bold text-[10px] sm:text-xs uppercase shadow-md'
        : 'px-3 py-1.5 rounded-xl bg-bank-darkest border border-bank-border text-emerald-300 font-royal font-bold text-[10px] sm:text-xs uppercase';
    }
  });
  renderCardsInventory();
}

function renderStickerPacksShop() {
  const grid = document.getElementById('stickerPacksGrid');
  const oddsBadge = document.getElementById('dropOddsSummaryBadge');
  if (!grid) return;

  const r = pState.config.rarities;
  if (oddsBadge) {
    oddsBadge.innerText = `Шансы: Обычн. ${r.common?.dropChance}% | Редк. ${r.rare?.dropChance}% | Эпич. ${r.epic?.dropChance}% | Легенд. ${r.legendary?.dropChance}% | Секрет. ${r.secret?.dropChance}%`;
  }

  const packs = Object.values(pState.config.packs || DEFAULT_STICKER_PACKS);
  const userBal = Number(pState.userObj?.balance || 0);

  grid.innerHTML = packs.map(p => {
    const canAfford = userBal >= p.price;
    return `
      <div class="p-4 sm:p-5 rounded-3xl bg-bank-darkest/95 border-2 ${p.vipBoost ? 'border-purple-400 shadow-[0_0_25px_rgba(168,85,247,0.3)]' : 'border-bank-gold/50 hover:border-bank-gold'} flex flex-col justify-between space-y-3 shadow-xl transition-all">
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <div class="w-12 h-12 rounded-2xl bg-black border border-bank-gold text-bank-gold flex items-center justify-center text-xl shadow-md">
              <i class="fa-solid ${p.icon || 'fa-box-open'}"></i>
            </div>
            <span class="px-2.5 py-0.5 rounded-full ${p.vipBoost ? 'bg-purple-950 border border-purple-400 text-purple-200' : 'bg-emerald-950 border border-emerald-500/40 text-emerald-300'} text-[10px] font-mono uppercase">
              ${p.vipBoost ? '🔥 БЕЗ ОБЫЧНЫХ КАРТ' : '1 Карточка'}
            </span>
          </div>
          <h3 class="font-royal font-black text-sm sm:text-base text-white">${escapeHtml(p.title)}</h3>
          <p class="text-xs text-emerald-300/80 leading-relaxed">${escapeHtml(p.desc || '')}</p>
        </div>
        <div class="pt-3 border-t border-bank-border flex items-center justify-between gap-2">
          <span class="font-royal font-black text-sm sm:text-lg text-bank-gold">${formatBaity(p.price)}</span>
          <button onclick="buyAndOpenStickerPack('${p.id}', this)" class="tap-btn px-4 py-2 rounded-xl font-royal font-black text-xs uppercase shadow-lg transition-all ${canAfford ? 'bg-gradient-to-r from-bank-gold to-yellow-600 text-black hover:brightness-110' : 'bg-bank-surface border border-bank-border text-emerald-400/50'}">
            🎁 Открыть пак
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function renderCardsInventory() {
  const grid = document.getElementById('cardsCatalogGrid');
  if (!grid) return;

  const onlyOwned = !!document.getElementById('onlyOwnedCardsCheck')?.checked;
  const userCards = pState.userObj?.petsData?.cards || {};
  let list = Object.values(pState.config.cards || DEFAULT_CARDS_CATALOG);

  if (pState.cardRarityFilter !== 'all') {
    list = list.filter(c => c.rarity === pState.cardRarityFilter);
  }
  if (onlyOwned) {
    list = list.filter(c => Number(userCards[c.id] || 0) > 0);
  }

  if (list.length === 0) {
    grid.innerHTML = `<div class="col-span-full py-8 text-center text-xs text-emerald-400/70">В выбранном фильтре пока нет карточек. Откройте стикерпак!</div>`;
    return;
  }

  grid.innerHTML = list.map(c => {
    const qty = Number(userCards[c.id] || 0);
    const rCfg = pState.config.rarities[c.rarity] || DEFAULT_RARITY_CONFIG.common;
    const hourly = getPetHourlyIncome(c);
    const canCraft = qty >= 2;

    return `
      <div class="p-2.5 sm:p-3 rounded-2xl bg-bank-darkest/95 border ${qty > 0 ? 'border-bank-gold/60' : 'border-bank-border opacity-75'} flex flex-col justify-between space-y-2 shadow-lg">
        <div>
          <div onclick="openCardRevealModalById('${c.id}')" class="cursor-pointer pet-card-frame ${rCfg.css} mb-2">
            <img src="${c.cardImg}" alt="${escapeHtml(c.name)}" class="pet-card-img" loading="lazy" onerror="this.onerror=null;this.src=generateCardFallbackSvgById('${c.id}', false);">
            <span class="absolute top-2 right-2 px-2 py-0.5 rounded-lg bg-black/85 border border-bank-gold text-bank-gold font-mono font-black text-[10px]">
              ×${qty} шт.
            </span>
          </div>
          <div class="flex items-center justify-between text-[9px] font-mono">
            <span class="text-emerald-300">${rCfg.badge}</span>
            <span class="text-bank-gold">+${formatBaity(hourly)}/ч</span>
          </div>
          <h4 class="font-royal font-black text-xs sm:text-sm text-white truncate mt-0.5">${escapeHtml(c.name)}</h4>
          <div class="text-[10px] text-emerald-400/80 truncate">HP ${c.hp} • ${escapeHtml(c.skillName)} (${c.skillPower})</div>
        </div>

        <button onclick="craftPetFromCard('${c.id}', this)" ${!canCraft ? 'disabled' : ''} class="tap-btn w-full py-1.5 px-2 rounded-xl font-royal font-black text-[10px] uppercase transition-all ${canCraft ? 'bg-gradient-to-r from-emerald-400 to-emerald-600 text-black shadow-md animate-pulse' : 'bg-bank-surface border border-bank-border text-emerald-400/50'}">
          ${canCraft ? `✨ Крафт в Загон (${qty}/2)` : `Нужно 2 шт. (${qty}/2)`}
        </button>
      </div>
    `;
  }).join('');
}

function renderPetsPen() {
  const grid = document.getElementById('petsPenGrid');
  if (!grid) return;

  const status = evaluateUserPenStatus(pState.userObj, getServerTime());
  const list = Object.values(status.perPet);

  if (list.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full p-8 rounded-3xl bg-bank-darkest/80 border-2 border-dashed border-bank-gold/50 text-center space-y-3">
        <div class="text-4xl">🏡</div>
        <h3 class="font-royal text-base sm:text-lg font-black text-white">Ваш Загон Питомцев пока пуст</h3>
        <p class="text-xs text-emerald-300/80 max-w-md mx-auto">Откройте стикерпаки и соедините 2 одинаковые карточки во вкладке «Карточки & Крафт», чтобы заселить сюда первого питомца!</p>
        <button onclick="switchPetsTab('packs')" class="tap-btn px-5 py-2.5 rounded-xl bg-bank-gold text-black font-royal font-black text-xs uppercase shadow-lg">
          Перейти к Стикерпакам →
        </button>
      </div>
    `;
    return;
  }

  grid.innerHTML = list.map(pet => {
    const { instId, cardCfg, isDead, hourly, earned, hungerLeftMs, hungerPct } = pet;
    const rCfg = pState.config.rarities[cardCfg.rarity] || DEFAULT_RARITY_CONFIG.common;
    const reviveCost = Math.round(Number(rCfg.reviveCost || 1200));

    return `
      <div class="p-3.5 sm:p-4 rounded-3xl bg-bank-darkest/95 border-2 ${isDead ? 'border-rose-600' : 'border-emerald-500/60'} flex flex-col justify-between space-y-3 shadow-xl relative overflow-hidden">
        <div>
          <div class="flex items-center justify-between text-[10px] font-mono mb-1">
            <span class="px-2 py-0.5 rounded bg-black/80 border border-bank-gold/40 text-bank-gold">${rCfg.badge}</span>
            <span class="${isDead ? 'text-rose-400 font-black' : 'text-emerald-300 font-bold'}">
              ${isDead ? '💀 ПОГИБ (0 ฿/ч)' : `+${formatBaity(hourly)}/ч`}
            </span>
          </div>

          <!-- Вырезанный прозрачный PNG питомца в загоне -->
          <div class="w-full h-36 sm:h-44 rounded-2xl bg-gradient-to-b from-[#082419] to-[#04100b] border border-bank-border p-3 flex items-center justify-center relative overflow-hidden my-1.5">
            <img src="${cardCfg.petImg}" alt="${escapeHtml(cardCfg.name)}" class="${isDead ? 'pet-pen-sprite-dead' : 'pet-pen-sprite-alive'}" loading="lazy" onerror="this.onerror=null;this.src=generateCardFallbackSvgById('${cardCfg.id}', true);">
            ${isDead ? `<div class="absolute inset-0 bg-rose-950/40 flex items-center justify-center"><span class="px-3 py-1 rounded-xl bg-rose-600 text-white font-royal font-black text-xs uppercase shadow-lg">💀 Требуется возрождение</span></div>` : ''}
          </div>

          <h4 class="font-royal font-black text-sm sm:text-base text-white text-center">${escapeHtml(cardCfg.name)}</h4>
        </div>

        <div class="p-2.5 rounded-2xl bg-bank-surface/90 border border-bank-border space-y-1.5 text-xs">
          <div class="flex justify-between font-mono text-[11px]">
            <span class="text-emerald-400">Накоплено:</span>
            <span id="penEarned_${instId}" class="text-bank-gold font-bold">${formatBaity(earned, { decimals: 2 })}</span>
          </div>
          <div class="flex justify-between font-mono text-[10px]">
            <span class="text-amber-300">Сытость (24ч):</span>
            <span id="penHungerTimer_${instId}" class="${hungerLeftMs < 3600000 * 4 ? 'text-rose-400 font-black' : 'text-white'}">${isDead ? '00:00:00' : formatCountdownHMS(hungerLeftMs)}</span>
          </div>
          <div class="h-1.5 w-full bg-black rounded-full overflow-hidden">
            <div class="h-full ${isDead ? 'bg-rose-600' : 'bg-gradient-to-r from-amber-500 to-emerald-400'}" style="width: ${isDead ? 0 : hungerPct.toFixed(1)}%"></div>
          </div>
        </div>

        ${isDead
          ? `<button onclick="reviveDeadPet('${instId}', this)" class="tap-btn w-full py-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 text-white font-royal font-black text-xs uppercase shadow-lg">
              ✨ Возродить (${formatBaity(reviveCost)})
            </button>`
          : `<button onclick="openFeedPetModal('${instId}')" class="tap-btn w-full py-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-royal font-black text-xs uppercase shadow-md">
              🥕 Покормить (на 24ч)
            </button>`
        }
      </div>
    `;
  }).join('');
}

function renderFoodShop() {
  const grid = document.getElementById('foodShopGrid');
  if (!grid) return;
  const userFood = pState.userObj?.petsData?.food || {};

  grid.innerHTML = pState.config.food.map(f => {
    const owned = Number(userFood[f.id] || 0);
    const rCfg = pState.config.rarities[f.rarity] || DEFAULT_RARITY_CONFIG.common;
    return `
      <div class="p-4 rounded-3xl bg-bank-darkest/95 border border-bank-gold/40 flex flex-col justify-between space-y-3 shadow-lg">
        <div class="space-y-1.5">
          <div class="flex items-center justify-between">
            <span class="text-3xl">${f.icon}</span>
            <span class="px-2 py-0.5 rounded bg-bank-surface border border-bank-gold/40 text-bank-gold font-mono text-[10px] font-bold">У вас: ${owned} шт.</span>
          </div>
          <div class="text-[10px] font-mono text-emerald-400">${rCfg.badge} • +${f.nutritionPoints} сытости</div>
          <h4 class="font-royal font-black text-sm text-white">${escapeHtml(f.name)}</h4>
          <p class="text-[11px] text-emerald-300/80 leading-relaxed">${escapeHtml(f.desc)}</p>
        </div>

        <div class="pt-2 border-t border-bank-border space-y-1.5">
          <div class="font-royal font-black text-sm text-bank-gold">${formatBaity(f.price)} / 1 шт.</div>
          <div class="grid grid-cols-2 gap-1.5">
            <button onclick="buyPetFood('${f.id}', 1, this)" class="tap-btn py-1.5 rounded-xl bg-emerald-600 text-black font-royal font-black text-[10px] uppercase">+1 шт.</button>
            <button onclick="buyPetFood('${f.id}', 10, this)" class="tap-btn py-1.5 rounded-xl bg-bank-gold text-black font-royal font-black text-[10px] uppercase">+10 шт.</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderPetsMarketplace() {
  populateMarketLotSelect();
  const grid = document.getElementById('petsMarketLotsGrid');
  const badge = document.getElementById('marketLotsCountBadge');
  if (!grid) return;

  const lots = Object.values(pState.petsMarket || {}).sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
  if (badge) badge.innerText = `${lots.length} лотов`;

  if (lots.length === 0) {
    grid.innerHTML = `<div class="col-span-full py-8 text-center text-xs text-emerald-400/70">На торговой площадке пока нет выставленных карточек или корма.</div>`;
    return;
  }

  grid.innerHTML = lots.map(lot => {
    const isMine = pState.currentUser && normalizeLogin(lot.seller) === normalizeLogin(pState.currentUser);
    const rCfg = pState.config.rarities[lot.rarity] || DEFAULT_RARITY_CONFIG.common;
    return `
      <div class="p-3.5 rounded-2xl bg-bank-darkest border border-bank-gold/50 flex flex-col justify-between space-y-2.5 shadow-lg">
        <div>
          <div class="flex items-center justify-between text-[10px] font-mono mb-1">
            <span class="text-emerald-300">${rCfg.badge}</span>
            <span class="text-bank-gold">Продавец: @${escapeHtml(lot.seller)}</span>
          </div>
          <h4 class="font-royal font-bold text-sm text-white">${escapeHtml(lot.title)} <span class="text-bank-gold font-mono">×${lot.qty} шт.</span></h4>
        </div>
        <div class="pt-2 border-t border-bank-border flex items-center justify-between gap-2">
          <span class="font-royal font-black text-sm text-bank-gold">${formatBaity(lot.price)}</span>
          ${isMine
            ? `<button onclick="cancelMyPetMarketLot('${lot.id}', this)" class="px-3 py-1.5 rounded-xl bg-rose-900 text-white font-bold text-[10px] uppercase">Снять</button>`
            : `<button onclick="buyPetMarketLot('${lot.id}', this)" class="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-700 text-black font-royal font-black text-[10px] uppercase">Купить</button>`
          }
        </div>
      </div>
    `;
  }).join('');
}

function renderAllPetsUI() {
  const unauthBanner = document.getElementById('unauthBanner');
  const hdrUser = document.getElementById('headerUsername');
  const hdrBal = document.getElementById('headerUserBalance');
  const hdrHourly = document.getElementById('headerPenHourly');
  const admBtn = document.getElementById('pTabBtn-admin');

  if (!pState.currentUser || !pState.userObj) {
    unauthBanner?.classList.remove('hidden');
    if (hdrUser) hdrUser.innerText = '@ГОСТЬ';
    if (hdrBal) hdrBal.innerText = '0 ฿';
  } else {
    unauthBanner?.classList.add('hidden');
    if (hdrUser) hdrUser.innerText = `@${pState.userObj.username}`;
    if (hdrBal) hdrBal.innerText = formatBaity(pState.userObj.balance || 0);
  }

  if (admBtn) admBtn.classList.toggle('hidden', !isCurrentUserAdmin());

  const status = evaluateUserPenStatus(pState.userObj, getServerTime());
  const cardsCount = Object.values(pState.userObj?.petsData?.cards || {}).reduce((a, b) => a + Number(b || 0), 0);
  const foodCount = Object.values(pState.userObj?.petsData?.food || {}).reduce((a, b) => a + Number(b || 0), 0);

  if (hdrHourly) hdrHourly.innerText = `+${formatBaity(status.totalHourly)}/ч`;
  const pendEl = document.getElementById('totalPendingPetsIncome');
  const hrBadge = document.getElementById('totalPetsHourlyBadge');
  const countsBadge = document.getElementById('totalCardsAndPetsBadge');
  const foodBadge = document.getElementById('quickTotalFoodCount');
  const deadWarn = document.getElementById('deadPetsWarningBadge');

  if (pendEl) pendEl.innerText = formatBaity(status.totalPending, { decimals: 2 });
  if (hrBadge) hrBadge.innerText = `+${formatBaity(status.totalHourly)} / час`;
  if (countsBadge) countsBadge.innerText = `Карточек: ${cardsCount} • В загоне: ${status.totalPets}`;
  if (foodBadge) foodBadge.innerText = String(foodCount);
  if (deadWarn) deadWarn.classList.toggle('hidden', status.deadCount === 0);

  if (pState.activeTab === 'packs') renderStickerPacksShop();
  if (pState.activeTab === 'cards') renderCardsInventory();
  if (pState.activeTab === 'pen') renderPetsPen();
  if (pState.activeTab === 'food') renderFoodShop();
  if (pState.activeTab === 'market') renderPetsMarketplace();
}

function openCardRevealModalById(cardId) {
  const c = pState.config.cards[cardId] || DEFAULT_CARDS_CATALOG[cardId];
  if (c) openCardRevealModal(c, false);
}

function generateCardFallbackSvgById(cardId, isPetOnly) {
  const c = pState.config.cards[cardId] || DEFAULT_CARDS_CATALOG[cardId];
  return c ? generateCardFallbackSvg(c, isPetOnly) : '';
}

// -------------------------------------------------------------------------
// 12. ПОДПИСКИ FIREBASE И ЖИВОЙ ТАЙМЕР КАЖДУЮ СЕКУНДУ
// -------------------------------------------------------------------------
db.ref('bankData/petsConfig').on('value', (snap) => {
  const val = snap.val();
  if (val) {
    pState.config.rarities = { ...DEFAULT_RARITY_CONFIG, ...(val.rarities || {}) };
    pState.config.cards = { ...DEFAULT_CARDS_CATALOG, ...(val.cards || {}) };
    pState.config.packs = { ...DEFAULT_STICKER_PACKS, ...(val.packs || {}) };
    if (Array.isArray(val.food)) pState.config.food = val.food;
  }
  renderAllPetsUI();
});

db.ref('bankData/petsMarket').on('value', (snap) => {
  pState.petsMarket = snap.val() || {};
  if (pState.activeTab === 'market') renderPetsMarketplace();
});

if (pState.currentUser) {
  const uKey = normalizeLogin(pState.currentUser);
  db.ref(`bankData/users/${uKey}`).on('value', (snap) => {
    pState.userObj = snap.val() || null;
    renderAllPetsUI();
  });
} else {
  renderAllPetsUI();
}

// Живой тик раз в секунду для обновления кассы и 24ч таймеров сытости
setInterval(() => {
  if (!pState.userObj) return;
  const status = evaluateUserPenStatus(pState.userObj, getServerTime());
  const pendEl = document.getElementById('totalPendingPetsIncome');
  if (pendEl) pendEl.innerText = formatBaity(status.totalPending, { decimals: 2 });

  if (pState.activeTab === 'pen') {
    Object.values(status.perPet).forEach(p => {
      const eEl = document.getElementById(`penEarned_${p.instId}`);
      const tEl = document.getElementById(`penHungerTimer_${p.instId}`);
      if (eEl) eEl.innerText = formatBaity(p.earned, { decimals: 2 });
      if (tEl) tEl.innerText = p.isDead ? '00:00:00' : formatCountdownHMS(p.hungerLeftMs);
    });
  }
}, 1000);

// Экспорт всех обработчиков в window
Object.assign(window, {
  switchPetsTab,
  setCardRarityFilter,
  buyAndOpenStickerPack,
  openCardRevealModalById,
  closeCardRevealModal,
  generateCardFallbackSvgById,
  craftPetFromCard,
  craftAllReadyDuplicateCards,
  buyPetFood,
  openFeedPetModal,
  closeFeedPetModal,
  feedPetWithSpecificFood,
  feedAllPetsQuick,
  reviveDeadPet,
  collectAllPetsIncome,
  handleCreatePetMarketLot,
  buyPetMarketLot,
  cancelMyPetMarketLot,
  loadTop20Players,
  saveAdminDropRates,
  saveAdminRarityEconomy,
  handleAdminSaveCardConfig,
  handleAdminSaveStickerPack,
  resetPetsConfigToDefaults
});
