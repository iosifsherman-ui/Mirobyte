// =========================================================================
// FILE: js/math.js
// BANK OF MIROBYTE — Математическое ядро, формулы, каталоги и криптография
// =========================================================================

export const PASSWORD_ITERATIONS = 120000;
export const MAX_LOGIN_LENGTH = 32;
export const MAX_COMMENT_LENGTH = 300;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_CHART_POINTS = 20;
export const MAX_USER_BUSINESSES = 10;
export const MAX_BUSINESS_LEVEL = 20;
export const BASE_UPGRADE_DURATION_MS = 5 * 60 * 1000;
export const OWNER_USERNAME = 'iosif';

export const MAX_HOLDINGS_PER_ASSET = 1000;
export const MAX_TRADE_QTY = 200;
export const TRADE_COOLDOWN_MS = 20000;
export const ASSET_SELL_TAX_RATE = 0.10;
export const LUXURY_RESALE_TAX_RATE = 0.25;
export const P2P_BANK_FEE_RATE = 0.05; // 5% комиссия Банка при P2P-сделках и 24ч Аукционе
export const TELEGRAPH_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 дней (168 часов) для автоочистки Телеграфа

// Налоговый период: ровно 72 часа (259 200 000 мс) на ручную подачу декларации
export const TAX_DECLARATION_PERIOD_MS = 72 * 3600 * 1000;
export const TAX_NOTE_INSTALLMENTS_COUNT = 4; // Разбивка долговой расписки на 4 части

export const POLYGON_MIN_MINES_TIME_MS = 1800;
export const POLYGON_MIN_HACK_TIME_MS = 900;
export const POLYGON_DAILY_EARN_LIMIT = 2500000;

// -------------------------------------------------------------------------
// 1. СПРАВОЧНИКИ И КАТАЛОГИ ИМПЕРИИ
// -------------------------------------------------------------------------
export const BAITY_UNITS = [
  { threshold: 1e15, suffix: 'P₿', name: 'Петабайти' },
  { threshold: 1e12, suffix: 'T₿', name: 'Терабайти' },
  { threshold: 1e9,  suffix: 'G₿', name: 'Гигабайти' },
  { threshold: 1e6,  suffix: 'M₿', name: 'Мегабайти' },
  { threshold: 1e3,  suffix: 'K₿', name: 'Килобайти' }
];

export const DEFAULT_BUSINESS_CATALOG = [
  { id: 'chip_forge', name: 'Кузница микросхем', tier: '1. Малое предприятие', icon: 'fa-microchip', baseCost: 150, baseHourly: 22, desc: 'Пайка кремниевых плат и базовых кристаллов Миробайта' },
  { id: 'traffic_guild', name: 'Торговая Гильдия Трафика', tier: '2. Купеческая артель', icon: 'fa-network-wired', baseCost: 650, baseHourly: 85, desc: 'Магистральные оптоволоконные караваны и купеческие шлюзы' },
  { id: 'crypto_manufactory', name: 'Боярская Крипто-Мануфактура', tier: '3. Средняя мануфактура', icon: 'fa-server', baseCost: 2400, baseHourly: 320, desc: 'Вычислительные фермы под охраной стрелецких брандмауэров' },
  { id: 'imperial_datacenter', name: 'Императорский Дата-Центр «Миробайт»', tier: '4. Крупный узел', icon: 'fa-building-shield', baseCost: 9500, baseHourly: 1250, desc: 'Квантовое ядро Государственного Банка с высокой рентой' },
  { id: 'caravan_logistics', name: 'Логистический Холдинг «Экспресс-Караван»', tier: '5. Торговый холдинг', icon: 'fa-truck-fast', baseCost: 85000, baseHourly: 9500, desc: 'Межрегиональные воздушные и сухопутные грузоперевозки Империи' },
  { id: 'sherman_construction_trust', name: 'Имперский Строительный Трест «Шерманстрой»', tier: '6. Строительный трест', icon: 'fa-city', baseCost: 1200000, baseHourly: 120000, desc: 'Возведение небоскрёбов, мостов и правительственных кварталов' },
  { id: 'cyber_bank_syndicate', name: 'Финансово-Промышленный Синдикат', tier: '7. Инвестиционный синдикат', icon: 'fa-landmark', baseCost: 15000000, baseHourly: 1350000, desc: 'Межбанковский клиринг, управление капиталом и лизинг заводов' },
  { id: 'telecom_6g', name: 'Телекоммуникационная Корпорация «МироСвязь»', tier: '8. Мега-Корпорация', icon: 'fa-satellite-dish', baseCost: 250000000, baseHourly: 18000000, desc: 'Спутниковая группировка связи и квантовый телеграф всей Империи' },
  { id: 'imperial_oil_extraction', name: 'Нефтегазовая Корпорация «Чёрное Золото»', tier: '9. Сырьевой Гигант', icon: 'fa-oil-well', baseCost: 2500000000, baseHourly: 125000000, desc: 'Глубоководные буровые платформы и перерабатывающие заводы' },
  { id: 'orbital_energy_complex', name: 'Орбитальный Термоядерный Комплекс «Гелиос»', tier: '10. Высшая Имперская Корпорация', icon: 'fa-sun', baseCost: 25000000000, baseHourly: 250000000, desc: 'Космические солнечные электростанции и термоядерные реакторы' }
];

export const DEFAULT_SETTINGS = {
  economy: { startBalance: 50, taxPercent: 5 },
  business: { globalMultiplier: 1, maxStorageHours: 24, catalog: DEFAULT_BUSINESS_CATALOG },
  casino: { enabled: true, minesEnabled: true, miningEnabled: true, minBet: 10, maxBet: 50000, houseEdge: 6, shieldPrice: 150, radarPrice: 100, hackMinReward: 100, hackMaxReward: 500, hackConsolation: 25 },
  shopPrices: {},
  activeEvent: null,
  appIcon: null
};

export const LUXURY_ART_CATALOG = [
  { id: 'art_mona_lisa', category: 'art', title: '«Мона Лиза»', author: 'Леонардо да Винчи (1503)', info: 'Мировая оценка: ~$860 млн • Шедевр эпохи Возрождения (Public Domain)', price: 850000000, prestige: 8500, image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Mona_Lisa,_by_Leonardo_da_Vinci,_from_C2RMF_retouched.jpg?width=600' },
  { id: 'art_starry_night', category: 'art', title: '«Звёздная ночь»', author: 'Винсент ван Гог (1889)', info: 'Мировая оценка: ~$100+ млн • Постимпрессионизм (Public Domain)', price: 120000000, prestige: 1500, image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg?width=600' },
  { id: 'art_ninth_wave', category: 'art', title: '«Девятый вал»', author: 'Иван Айвазовский (1850)', info: 'Бесценное достояние русской маринистики (Public Domain)', price: 95000000, prestige: 1200, image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Hovhannes_Aivazovsky_-_The_Ninth_Wave_-_Google_Art_Project.jpg?width=600' },
  { id: 'art_the_scream', category: 'art', title: '«Крик»', author: 'Эдвард Мунк (1893)', info: 'Мировая оценка: ~$120 млн • Икона экспрессионизма (Public Domain)', price: 110000000, prestige: 1400, image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Edvard_Munch,_1893,_The_Scream,_oil,_tempera_and_pastel_on_cardboard,_91_x_73_cm,_National_Gallery_of_Norway.jpg?width=600' },
  { id: 'art_kanagawa_wave', category: 'art', title: '«Большая волна в Канагаве»', author: 'Кацусика Хокусай (1831)', info: 'Знаменитая гравюра укиё-э на дереве (Public Domain)', price: 45000000, prestige: 600, image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Tsunami_by_hokusai_19th_century.jpg?width=600' },
  { id: 'stamp_blue_mauritius', category: 'art', title: 'Марка «Голубой Маврикий» (1847)', author: 'Британская империя (1847)', info: 'Редчайшая почтовая марка Британской империи (Public Domain)', price: 25000000, prestige: 400, image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Blue_Mauritius_1847.jpg?width=400' },
  { id: 'stamp_inverted_jenny', category: 'art', title: 'Марка «Перевёрнутая Дженни» (1918)', author: 'Почтовая служба США (1918)', info: 'Легендарная авиапочтовая марка США с ошибкой печати (Public Domain)', price: 18000000, prestige: 300, image: 'https://commons.wikimedia.org/wiki/Special:FilePath/US_Airmail_inverted_Jenny_24c_1918_issue.jpg?width=500' }
];

export const LUXURY_GARAGE_CATALOG = [
  { id: 'car_porshe_911_gt3', category: 'garage', title: 'Porshe 911 GT3 MiroRS', subtitle: 'Трековый спорткар', info: 'Атмосферный оппозитный мотор и безупречная аэродинамика', price: 6000000, prestige: 120, image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80' },
  { id: 'car_merkur_gwagon_800', category: 'garage', title: 'Merkur G-Wagon 800 Brabus-M', subtitle: 'Бронированный внедорожник', info: 'Кортежный внедорожник высших казначеев и бояр', price: 8500000, prestige: 150, image: 'https://images.unsplash.com/photo-1520031441872-265e4ff70366?auto=format&fit=crop&w=800&q=80' },
  { id: 'car_aurus_senat', category: 'garage', title: 'Aurus Senat Imperial Limo', subtitle: 'Бронированный лимузин Казначейства', info: 'Правительственный представительский седан высшей защиты', price: 12000000, prestige: 200, image: 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=800&q=80' },
  { id: 'car_royal_royce_phantom', category: 'garage', title: 'Royal-Royce MiroPhantom', subtitle: 'Представительский люкс', info: 'Ручная сборка, звёздное небо в салоне и абсолютная тишина', price: 15000000, prestige: 250, image: 'https://images.unsplash.com/photo-1631295868223-63265b40d9e4?auto=format&fit=crop&w=800&q=80' },
  { id: 'car_lambo_revuelto', category: 'garage', title: 'Miroborghini Revuelto Cyber-V12', subtitle: 'Гибридный гиперкар 1015 л.с.', info: 'Футуристический клиновидный кузов и мощь 12 цилиндров', price: 28000000, prestige: 420, image: 'https://images.unsplash.com/photo-1544829099-b9a0c07fad1a?auto=format&fit=crop&w=800&q=80' },
  { id: 'car_mirogatti_shiron', category: 'garage', title: 'MiroGatti Shiron Pur', subtitle: 'Гиперкар 1500 л.с.', info: 'Карбоновый монокок и предельная скорость Империи', price: 35000000, prestige: 500, image: 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?auto=format&fit=crop&w=800&q=80' },
  { id: 'car_jesko_absolut', category: 'garage', title: 'Koenigsegg Jesko Absolut Miro', subtitle: 'Рекордсмен скорости 530 км/ч', info: 'Шведско-имперский шедевр гиперстроения', price: 65000000, prestige: 900, image: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=800&q=80' },
  { id: 'car_imperial_convoy', category: 'garage', title: 'Кортеж «Императорский Эскорт» (3 авто)', subtitle: 'Полный правительственный кортеж с охраной', info: 'Флагманский лимузин и два бронированных внедорожника спецсвязи', price: 110000000, prestige: 1600, image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80' },
  { id: 'jet_mirostream_g700', category: 'garage', title: 'MiroStream G700 VIP', subtitle: 'Частный бизнес-джет', info: 'Межконтинентальный лайнер для дипломатических визитов', price: 250000000, prestige: 3000, image: 'https://images.unsplash.com/photo-1540962351504-03099e0a754b?auto=format&fit=crop&w=800&q=80' },
  { id: 'yacht_emerald_super', category: 'garage', title: 'Океанская суперъяхта «Эмеральд»', subtitle: '115-метровая мега-яхта', info: 'Вертолётная площадка, бассейн и золотая отделка палуб', price: 500000000, prestige: 6000, image: 'https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?auto=format&fit=crop&w=800&q=80' },
  { id: 'ship_nuclear_icebreaker', category: 'garage', title: 'Атомный Ледокол «Арктика-Миробайт»', subtitle: 'Атомный флагман Северного пути', info: 'Двухреакторный исполин, прокладывающий торговые пути сквозь льды', price: 1200000000, prestige: 15000, image: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=800&q=80' }
];

export const REAL_ESTATE_CATALOG = [
  { id: 're_sherman_penthouse', category: 'realestate', title: 'Пентхаус в «Башне Шерманстрой»', subtitle: 'Панорамный 85-й этаж в деловом центре', info: 'Собственный лифт, зимний сад и вертолётная площадка на крыше', price: 15000000, prepMinutes: 10, hourlyRatePct: 5, prestige: 300, image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80' },
  { id: 're_imperial_mansion', category: 'realestate', title: 'Особняк на Императорской Рублёвке', subtitle: 'Резиденция с парком, колоннами и бункером', info: 'Закрытое боярское поместье с мраморными залами', price: 75000000, prepMinutes: 20, hourlyRatePct: 5, prestige: 1200, image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80' },
  { id: 're_mirobyte_plaza', category: 'realestate', title: 'ТРК «Миробайт Плаза»', subtitle: 'Крупнейший торгово-развлекательный молл', info: 'Сотни бутиков, атриум из золотого стекла и поток арендаторов', price: 400000000, prepMinutes: 30, hourlyRatePct: 5, prestige: 5500, image: 'https://images.unsplash.com/photo-1519567241046-7f570eee3ce6?auto=format&fit=crop&w=800&q=80' },
  { id: 're_emerald_palace_hotel', category: 'realestate', title: 'Гранд-Отель «Изумрудный Дворец» 5★', subtitle: 'Курортный комплекс для бояр и дипломатов', info: 'Президентские люксы и королевские приёмы на берегу залива', price: 2000000000, prepMinutes: 45, hourlyRatePct: 5, prestige: 25000, image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80' },
  { id: 're_golden_lagoon_island', category: 'realestate', title: 'Частный Архипелаг «Золотая Лагуна»', subtitle: 'Тропические острова с мариной для суперъяхт', info: 'Суверенная курортная зона с частным аэродромом', price: 12000000000, prepMinutes: 60, hourlyRatePct: 5, prestige: 140000, image: 'https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?auto=format&fit=crop&w=800&q=80' },
  { id: 're_imperial_tower_hq', category: 'realestate', title: 'Небоскрёб-Штаб «Империал Тауэр» (120 эт.)', subtitle: 'Главная финансовая цитадель столицы', info: 'Штаб-квартира крупнейших корпораций и синдикатов Империи', price: 60000000000, prepMinutes: 90, hourlyRatePct: 5, prestige: 700000, image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80' }
];

export const COSMIC_EMPIRE_CATALOG = [
  { id: 'cos_vostok_spaceport', category: 'cosmos', title: 'Орбитальный Космопорт «Восток-Миробайт»', subtitle: 'Межпланетный терминал • Макс. отдача баз: 2.4%/ч', info: 'Сама локация даёт 0 ฿/ч. Постройте внутри Добычу сырья, Лабораторию и Энергоблок (1–5 ур.)!', price: 150000000000, maxHourlyRatePct: 2.4, prestige: 150000, image: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=800&q=80' },
  { id: 'cos_selena_moonbase', category: 'cosmos', title: 'Лунный Сектор «Селена-1»', subtitle: 'Кратерная территория на Луне • Макс. отдача баз: 1.8%/ч', info: 'Сам участок даёт 0 ฿/ч. Раскачивайте 3 типа лунных баз до 5 уровня (0% налогов)!', price: 500000000000, maxHourlyRatePct: 1.8, prestige: 500000, image: 'https://images.unsplash.com/photo-1522030299830-16b8d3d049fe?auto=format&fit=crop&w=800&q=80' },
  { id: 'cos_psyche_gold_asteroid', category: 'cosmos', title: 'Рудный Астероид «Психея-16»', subtitle: 'Цельнометаллический астероид • Макс. отдача баз: 1.35%/ч', info: 'Без буровых баз доход 0 ฿/ч. Требует поэтапного возведения шахт и энергоблоков (1–5 ур.)!', price: 1800000000000, maxHourlyRatePct: 1.35, prestige: 1800000, image: 'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?auto=format&fit=crop&w=800&q=80' },
  { id: 'cos_terraformed_eden', category: 'cosmos', title: 'Экзопланета «Новый Эдем»', subtitle: 'Суверенная планета • Макс. отдача баз: 0.95%/ч', info: 'Обратная прогрессия: триллионная стоимость требует долгой прокачки планетарных баз (1–5 ур.)!', price: 7500000000000, maxHourlyRatePct: 0.95, prestige: 7500000, image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80' },
  { id: 'cos_dyson_sphere', category: 'cosmos', title: 'Кольцо-Сфера Дайсона «Гелиос-Прайм»', subtitle: 'Мегаструктура вокруг звезды • Макс. отдача баз: 0.65%/ч', info: 'Высшая астроинженерия. Доход генерируют только прокачанные коллекторы и энергоблоки (1–5 ур.)!', price: 35000000000000, maxHourlyRatePct: 0.65, prestige: 35000000, image: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=800&q=80' },
  { id: 'cos_imperial_star_system', category: 'cosmos', title: 'Звёздная Система «Императорский Престол»', subtitle: 'Созвездие из 7 планет • Макс. отдача баз: 0.42%/ч', info: 'Абсолютный эндгейм для мульти-триллионеров (150 T₿). Поэтапная раскачка 15 уровней баз!', price: 150000000000000, maxHourlyRatePct: 0.42, prestige: 150000000, image: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=800&q=80' }
];

export const COSMIC_BASE_TYPES = [
  { key: 'mining', name: '⛏️ База добычи сырья', icon: 'fa-bore-hole', costShare: 0.12, yieldShare: 0.35, desc: 'Глубинные лазерные шахты и экстракторы редких изотопов' },
  { key: 'research', name: '🔬 Исследовательская станция', icon: 'fa-flask-vial', costShare: 0.15, yieldShare: 0.35, desc: 'Квантовые лаборатории и синтез сверхпроводников' },
  { key: 'power', name: '⚡ Термоядерный энергоблок', icon: 'fa-atom', costShare: 0.18, yieldShare: 0.30, desc: 'Гелиевые реакторы, питающие всю инфраструктуру сектора' }
];

export const SPACE_MINING_CATALOG = [
  { id: 'probe_alpha', title: '1. Малый Разведывательный Зонд «Гефест»', durationMinutes: 5, cost: 2500, minReturnPct: 25, maxReturnPct: 35, icon: 'fa-satellite', desc: 'Быстрый 5-минутный вылет к метеоритам (+25..35%)' },
  { id: 'corvette_beta', title: '2. Орбитальный Буровой Корвет «Психея»', durationMinutes: 15, cost: 50000, minReturnPct: 35, maxReturnPct: 50, icon: 'fa-shuttle-space', desc: 'Глубокое лазерное бурение золотоносных жил (+35..50%)' },
  { id: 'harvester_omega', title: '3. Планетарный Рудо-Комбайн «Титан»', durationMinutes: 30, cost: 1000000, minReturnPct: 45, maxReturnPct: 65, icon: 'fa-meteor', desc: 'Масштабная 30-минутная экспедиция (+45..65%)' }
];

export const BANKNOTES_CONFIG = [
  { value: 1, titleRu: 'ОДИН БАЙТИ', titleEn: 'ONE BAITY', motif: 'Bausherman & Строительный мотив', description: 'Символизирует фундамент и развитие инфраструктуры', icon: 'fa-house-shield' },
  { value: 5, titleRu: 'ПЯТЬ БАЙТИ', titleEn: 'FIVE BAITY', motif: 'Классический Фасад Банка с Колоннами', description: 'Олицетворяет надежность Центрального Казначейства', icon: 'fa-building-columns' },
  { value: 10, titleRu: 'ДЕСЯТЬ БАЙТИ', titleEn: 'TEN BAITY', motif: 'Портрет девочки с косичками в поле', description: 'Символ природы и юного поколения государства', icon: 'fa-wheat-awn' },
  { value: 25, titleRu: 'ДВАДЦАТЬ ПЯТЬ БАЙТИ', titleEn: 'TWENTY FIVE BAITY', motif: 'Юноша в джинсовой куртке на фоне банкнот', description: 'Энергия, созидание и экономическая активность', icon: 'fa-user-graduate' },
  { value: 50, titleRu: 'ПЯТЬДЕСЯТ БАЙТИ', titleEn: 'FIFTY BAITY', motif: 'Девушка в очках среди цветочного луга', description: 'Символ науки, процветания и знаний', icon: 'fa-glasses' },
  { value: 100, titleRu: 'СТО БАЙТИ', titleEn: 'ONE HUNDRED BAITY', motif: 'Молодой человек в очках и свитере', description: 'Интеллектуальный потенциал и цифровая эпоха Миробайт', icon: 'fa-laptop-code' },
  { value: 250, titleRu: 'ДВЕСТИ ПЯТЬДЕСЯТ БАЙТИ', titleEn: 'TWO HUNDRED FIFTY BAITY', motif: 'Благородная девушка на фоне гор', description: 'Величие, стойкость и национальное достояние Банка', icon: 'fa-mountain-sun' },
  { value: 1000, titleRu: 'ТЫСЯЧА БАЙТИ', titleEn: 'ONE THOUSAND BAITY', motif: 'Мастер в папахе & Шерманстрой', description: 'Высший номинал. Государственная мощь и стройки', icon: 'fa-hammer' }
];

export const DEFAULT_MARKET_ASSETS = {
  SHRM: { id: 'SHRM', name: 'Акции «Шерманстрой»', desc: 'Имперский строительный синдикат Миробайта', icon: 'fa-hammer', price: 120, prevPrice: 116, minMeanPrice: 120, meanPrice: 120, totalSharesBought: 0, dailyPct: 5, weeklyPct: 15, history: [112, 114, 117, 115, 118, 121, 119, 122, 120, 117, 116, 120] },
  TLGR: { id: 'TLGR', name: 'Телеграфъ Миробайт', desc: 'Государственная сеть депеш и дальней связи', icon: 'fa-paper-plane', price: 85, prevPrice: 82, minMeanPrice: 85, meanPrice: 85, totalSharesBought: 0, dailyPct: 5, weeklyPct: 18, history: [78, 80, 81, 83, 82, 85, 87, 84, 86, 83, 82, 85] },
  MGLD: { id: 'MGLD', name: 'Золотой Резерв Mirobyte', desc: 'Золотой эталон Королевского Казначейства', icon: 'fa-coins', price: 250, prevPrice: 246, minMeanPrice: 250, meanPrice: 250, totalSharesBought: 0, dailyPct: 5, weeklyPct: 12, history: [238, 240, 244, 242, 247, 251, 249, 253, 248, 245, 246, 250] },
  MINT: { id: 'MINT', name: 'Императорский Монетный Двор', desc: 'Чеканка монеты и выпуск ассигнаций Байти', icon: 'fa-stamp', price: 180, prevPrice: 175, minMeanPrice: 180, meanPrice: 180, totalSharesBought: 0, dailyPct: 5, weeklyPct: 14, history: [168, 170, 174, 172, 177, 181, 179, 183, 178, 176, 175, 180] },
  FLOT: { id: 'FLOT', name: 'Боярский Торговый Флот', desc: 'Караваны, морские фактории и оптовые поставки', icon: 'fa-anchor', price: 95, prevPrice: 97, minMeanPrice: 95, meanPrice: 95, totalSharesBought: 0, dailyPct: 5, weeklyPct: 20, history: [88, 91, 93, 90, 94, 98, 96, 99, 95, 96, 97, 95] }
};

export const PRIVILEGE_FRAMES_CATALOG = [
  { id: 'autumn_gold', name: 'Осеннее золото 🍁', price: 380000, cssClass: 'avatar-frame-autumn_gold', badgeEmoji: '🍁', desc: 'Сезонная янтарно-золотая обводка с кленовым листом 🍁' },
  { id: 'royal_crown_badge', name: 'Королевский Венец 👑', price: 950, cssClass: 'avatar-frame-royal_crown_badge', badgeEmoji: '👑', desc: 'Сияющая императорская обводка с золотой короной 👑' },
  { id: 'emerald_gem_badge', name: 'Изумрудный Кристалл 💎', price: 620, cssClass: 'avatar-frame-emerald_gem_badge', badgeEmoji: '💎', desc: 'Изумрудное неоновое свечение с кристаллом 💎' },
  { id: 'imperial_gold', name: 'Золотая Корона Империи', price: 250, cssClass: 'avatar-frame-imperial_gold', badgeEmoji: '', desc: 'Сияющая золотая обводка аватара на карте и в Рейтинге' },
  { id: 'emerald_crown', name: 'Изумрудный Венец Казны', price: 180, cssClass: 'avatar-frame-emerald_crown', badgeEmoji: '', desc: 'Благородное изумрудное свечение вокруг портрета' },
  { id: 'ruby_fire', name: 'Багряный Рубин Боярина', price: 320, cssClass: 'avatar-frame-ruby_fire', badgeEmoji: '', desc: 'Яркая рубиновая печать могущества и богатства' },
  { id: 'diamond_boyar', name: 'Алмазное Сияние Севера', price: 500, cssClass: 'avatar-frame-diamond_boyar', badgeEmoji: '', desc: 'Кристальная голубая обводка высшего сословия' },
  { id: 'amethyst_tsar', name: 'Аметистовая Печать Царя', price: 750, cssClass: 'avatar-frame-amethyst_tsar', badgeEmoji: '', desc: 'Редчайшая пурпурная королевская рамка' },
  { id: 'dragon_emerald', name: 'Изумрудный Дракон 🐉', price: 1500000, cssClass: 'avatar-frame-dragon_emerald', badgeEmoji: '🐉', desc: 'Мифическая нефритово-золотая аура с печатью Дракона 🐉' },
  { id: 'planetary_lord', name: 'Планетарный Властелин 🪐', price: 25000000, cssClass: 'avatar-frame-planetary_lord', badgeEmoji: '🪐', desc: 'Орбитальное сапфирово-неоновое кольцо с Сатурном 🪐' },
  { id: 'galactic_emperor', name: 'Галактический Император 🌌', price: 500000000, cssClass: 'avatar-frame-galactic_emperor', badgeEmoji: '🌌', desc: 'Высшая межзвёздная коронация для владельцев звёздных систем 🌌' }
];

export const PRIVILEGE_TITLES_CATALOG = [
  { id: 'title_merchant1', title: 'Почётный Купец I Гильдии', price: 120, icon: 'fa-scale-balanced' },
  { id: 'title_boyar', title: 'Знатный Боярин Миробайта', price: 300, icon: 'fa-chess-king' },
  { id: 'title_goldkeeper', title: 'Хранитель Злата и Ассигнаций', price: 450, icon: 'fa-vault' },
  { id: 'title_magnate', title: 'Биржевой Магнат Империи', price: 650, icon: 'fa-chart-line' },
  { id: 'title_grandduke', title: 'Великий Князь Палат Миробайта', price: 1200, icon: 'fa-crown' },
  { id: 'title_re_tycoon', title: 'Магнат Имперской Недвижимости', price: 5000000, icon: 'fa-city' },
  { id: 'title_orbit_commander', title: 'Верховный Командор Орбиты', price: 100000000, icon: 'fa-shuttle-space' },
  { id: 'title_star_sovereign', title: 'Властелин Планет и Созвездий', price: 5000000000, icon: 'fa-globe' }
];

export const BUILTIN_PAID_CARDS_CATALOG = [
  { id: 'builtin_ruby', name: 'Имперский Рубин', theme: 'ruby', price: 200, desc: 'Багряный бархатный фон с золотым тиснением' },
  { id: 'builtin_sapphire', name: 'Королевский Сапфир', theme: 'sapphire', price: 220, desc: 'Глубокий сапфировый стиль морских факторий' },
  { id: 'builtin_obsidian', name: 'Обсидиановое Золото', theme: 'obsidian', price: 350, desc: 'Чёрный монолит с золотой гравировкой Резерва' },
  { id: 'builtin_cyber', name: 'Неоновый Миробайт', theme: 'cyber', price: 400, desc: 'Футуристический имперский кибер-стиль' }
];

export const CARD_THEMES = {
  emerald: 'bg-gradient-to-br from-[#0e3124] via-[#081f16] to-[#040d09]',
  ruby: 'bg-gradient-to-br from-[#4a0e17] via-[#24060b] to-[#120205]',
  sapphire: 'bg-gradient-to-br from-[#0c2340] via-[#051124] to-[#020812]',
  obsidian: 'bg-gradient-to-br from-[#1c1917] via-[#0c0a09] to-[#000000]',
  cyber: 'bg-gradient-to-br from-[#1e1b4b] via-[#0f172a] to-[#06202a]'
};

export const OLD_RUS_DICTIONARY = [
  { reg: /\bпривет\b/gi, rep: 'челом бью да здравия желаю' },
  { reg: /\bздравствуй(те)?\b/gi, rep: 'многая лета вам, бояре' },
  { reg: /\bспасибо\b/gi, rep: 'поклон земной да благодарность великая' },
  { reg: /\bпожалуйста\b/gi, rep: 'не сочти за труд, мил человек' },
  { reg: /\bденьги\b/gi, rep: 'злато-серебро казначейское (Байти ฿)' },
  { reg: /\bденег\b/gi, rep: 'казны златой (Байти ฿)' },
  { reg: /\bперевод\b/gi, rep: 'жалованье златое' },
  { reg: /\bпереведи\b/gi, rep: 'отсыпь из казны своей' },
  { reg: /\bскинь\b/gi, rep: 'жалуй в казну мою' },
  { reg: /\bотправь\b/gi, rep: 'пошли с гонцом верным' },
  { reg: /\bдолг\b/gi, rep: 'заём купеческий по чести' },
  { reg: /\bверни\b/gi, rep: 'возверни по совести боярской' },
  { reg: /\bкупить\b/gi, rep: 'приобрести на торжище' },
  { reg: /\bпродать\b/gi, rep: 'уступить за злато доброе' }
];

// -------------------------------------------------------------------------
// 2. БАЗОВЫЕ УТИЛИТЫ И ФОРМАТИРОВАНИЕ ВАЛЮТЫ (฿, K₿, M₿, G₿, T₿, P₿)
// -------------------------------------------------------------------------
export function normalizeLogin(value) {
  return String(value || '').trim().toLowerCase();
}

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[ch]));
}

export function validPositiveAmount(value, max = 1000000000000000) {
  return Number.isSafeInteger(value) && value > 0 && value <= max;
}

// Глубокая очистка объекта от undefined перед записью в Firebase Realtime Database
export function cleanFirebaseObject(obj) {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(item => cleanFirebaseObject(item)).filter(item => item !== undefined);
  }
  const cleaned = {};
  Object.keys(obj).forEach(key => {
    const val = obj[key];
    if (val !== undefined) {
      cleaned[key] = cleanFirebaseObject(val);
    }
  });
  return cleaned;
}

export function formatBaity(value, options = {}, autoConvertPref = false) {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return '0 ฿';
  const sign = num < 0 ? '-' : (options.showPlus && num > 0 ? '+' : '');
  const abs = Math.abs(num);
  const useShort = options.forceShort !== undefined ? options.forceShort : autoConvertPref;

  if (useShort && abs >= 1000) {
    for (const u of BAITY_UNITS) {
      if (abs >= u.threshold) {
        const scaled = abs / u.threshold;
        const formatted = scaled >= 100 ? scaled.toFixed(1) : scaled.toFixed(2);
        return `${sign}${formatted.replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')} ${u.suffix}`;
      }
    }
  }
  if (options.decimals !== undefined && abs < 1000) {
    return `${sign}${abs.toFixed(options.decimals)} ฿`;
  }
  return `${sign}${Math.round(abs).toLocaleString('ru-RU')} ฿`;
}

export function formatDurationHuman(ms) {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const d = Math.floor(totalSec / 86400);
  const h = String(Math.floor((totalSec % 86400) / 3600));
  const m = String(Math.floor((totalSec % 3600) / 60));
  const s = totalSec % 60;
  if (d > 0) return `${d}д ${h}ч ${m}м`;
  if (Number(h) > 0) return `${h}ч ${m}м`;
  if (Number(m) > 0) return `${m} мин`;
  return `${s} сек`;
}

export function formatCountdownHMS(ms) {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const h = String(Math.floor(totalSec / 3600)).padStart(2, '0');
  const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
  const s = String(totalSec % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export function getAvatarFrameClass(frameId) {
  const f = PRIVILEGE_FRAMES_CATALOG.find(item => item.id === frameId);
  return f ? f.cssClass : 'avatar-frame-default';
}

export function getAvatarFrameCornerEmoji(frameId) {
  const f = PRIVILEGE_FRAMES_CATALOG.find(item => item.id === frameId);
  return (f && f.badgeEmoji) ? f.badgeEmoji : '';
}

export function generateRoyalArtSvgDataUrl(preset, title) {
  const icons = { crown: '👑', chalice: '🏆', scroll: '📜', sword: '⚔️', gem: '💎', chest: '🧰' };
  const emoji = icons[preset] || '👑';
  const cleanTitle = String(title || 'Реликвия').slice(0, 22).replace(/[<>&"']/g, '');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200"><rect width="320" height="200" rx="18" fill="#071f16" stroke="#e6c875" stroke-width="4"/><circle cx="160" cy="85" r="42" fill="#05110c" stroke="#ffd700" stroke-width="2"/><text x="160" y="102" font-size="42" text-anchor="middle">${emoji}</text><text x="160" y="165" font-family="Cinzel, serif" font-size="14" font-weight="bold" fill="#e6c875" text-anchor="middle">${cleanTitle}</text></svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

// -------------------------------------------------------------------------
// 3. МАТЕМАТИКА ЦЕН МАГАЗИНА, ПРОМЫСЛОВ, НЕДВИЖИМОСТИ И КОСМОСА
// -------------------------------------------------------------------------
export function getDynamicShopPrice(settingsObj, itemId, defaultPrice, category = null) {
  const overrides = settingsObj?.shopPrices || {};
  const base = (overrides[itemId] !== undefined && overrides[itemId] !== null && !isNaN(Number(overrides[itemId])))
    ? Math.max(0, Math.round(Number(overrides[itemId])))
    : Math.round(Number(defaultPrice || 0));

  const ev = settingsObj?.activeEvent;
  if (ev && ev.active) {
    if (ev.type === 'art_boom' && category === 'art') return Math.max(1, Math.round(base * 0.80));
    if (ev.type === 'garage_expo' && category === 'garage') return Math.max(1, Math.round(base * 0.85));
  }
  return base;
}

export function getRawSavedShopPrice(settingsObj, itemId, defaultPrice) {
  const overrides = settingsObj?.shopPrices || {};
  if (overrides[itemId] !== undefined && overrides[itemId] !== null && !isNaN(Number(overrides[itemId]))) {
    return Math.max(0, Math.round(Number(overrides[itemId])));
  }
  return Math.round(Number(defaultPrice || 0));
}

export function mergeBusinessCatalogWithDefaults(savedCatalog) {
  if (!Array.isArray(savedCatalog) || savedCatalog.length === 0) {
    return JSON.parse(JSON.stringify(DEFAULT_BUSINESS_CATALOG));
  }
  const byId = {};
  savedCatalog.forEach(item => { if (item && item.id) byId[item.id] = item; });
  return DEFAULT_BUSINESS_CATALOG.map((def, idx) => {
    const saved = byId[def.id] || savedCatalog[idx];
    if (!saved) return { ...def };
    let fixedHourly = Number(saved.baseHourly || def.baseHourly);
    if (def.id === 'orbital_energy_complex' && fixedHourly > 1000000000) fixedHourly = 250000000;
    return { ...def, ...saved, id: def.id, name: saved.name || def.name, baseCost: Number(saved.baseCost || def.baseCost), baseHourly: fixedHourly };
  });
}

export function getBusinessUpgradeCost(bizConfig, currentLevel) {
  const lvl = Math.max(0, Number(currentLevel || 0));
  if (lvl === 0) return Math.round(Number(bizConfig.baseCost || 150));
  return Math.round(Number(bizConfig.baseCost || 150) * Math.pow(1.18, lvl));
}

export function calculateTotalBusinessInvestment(bizConfig, currentLevel) {
  const lvl = Math.max(0, Number(currentLevel || 0));
  let sum = 0;
  for (let i = 0; i < lvl; i++) sum += getBusinessUpgradeCost(bizConfig, i);
  return sum;
}

export function getBusinessHourlyIncome(bizConfig, level, conditionPercent = 100, settingsObj = null) {
  const lvl = Math.max(0, Number(level || 0));
  if (lvl <= 0) return 0;
  let mult = Number(settingsObj?.business?.globalMultiplier || 1);
  const ev = settingsObj?.activeEvent;
  if (ev && ev.active && ev.type === 'gold_rush') mult *= 1.5;
  const baseCost = Math.max(100, Number(bizConfig.baseCost || 150));
  const baseHourly = Math.max(1, Number(bizConfig.baseHourly || 22));
  const targetMaxHourly = bizConfig.id === 'chip_forge' ? baseCost * 12 : baseCost * 3.0;
  let rawHourly = baseHourly;
  if (lvl > 1) {
    const progress = (lvl - 1) / (MAX_BUSINESS_LEVEL - 1);
    rawHourly = baseHourly + (targetMaxHourly - baseHourly) * Math.pow(progress, 1.35);
  }
  const wearMultiplier = Number(conditionPercent ?? 100) < 50 ? 0.60 : 1.0;
  return Math.max(1, Math.round(rawHourly * mult * wearMultiplier));
}

export function computeEffectiveSlotCondition(bData, nowMs) {
  const baseCond = (bData && bData.condition !== undefined && bData.condition !== null) ? Number(bData.condition) : 100;
  const lastCol = Number(bData?.lastCollected || nowMs);
  const elapsedHours = Math.max(0, (nowMs - lastCol) / 3600000);
  const timeDecay = Math.min(10, Math.floor(elapsedHours * 0.42));
  return Math.max(0, Math.min(100, Math.round(baseCond - timeDecay)));
}

export function getSlotMaintenanceCost(bizConfig, level, currentCondition, settingsObj = null) {
  const wearMissing = Math.max(0, 100 - Number(currentCondition ?? 100));
  if (wearMissing <= 0) return 0;
  const nominalHourly = getBusinessHourlyIncome(bizConfig, level, 100, settingsObj);
  return Math.max(10, Math.round(nominalHourly * 0.45 * (wearMissing / 20)));
}

export function getBusinessUpgradeDurationMs(currentLevel) {
  const lvl = Math.max(1, Number(currentLevel || 1));
  return Math.min(24 * 3600 * 1000, BASE_UPGRADE_DURATION_MS * Math.pow(1.45, lvl - 1));
}

export function getUserBusinessSlotsEntries(userObj, settingsObj = null) {
  if (!userObj || !userObj.businesses || typeof userObj.businesses !== 'object') return [];
  const catalog = mergeBusinessCatalogWithDefaults(settingsObj?.business?.catalog);
  const entries = [];
  Object.entries(userObj.businesses).forEach(([slotKey, bData]) => {
    if (!bData || Number(bData.level || 0) < 1) return;
    const typeId = bData.typeId || slotKey;
    const cfg = catalog.find(c => c.id === typeId);
    if (cfg) entries.push({ slotKey, typeId, cfg, data: bData });
  });
  return entries;
}

export function countUserOwnedAssetById(userObj, itemId) {
  if (!userObj) return 0;
  const inv = Array.isArray(userObj.inventory) ? userObj.inventory : [];
  return inv.filter(x => x && x.id === itemId).length;
}

// -------------------------------------------------------------------------
// 4. ГАРАЖ (ИЗНОС И ТО АВТОМОБИЛЕЙ)
// -------------------------------------------------------------------------
export function getCarCurrentCondition(carItem, nowDeviceMs = Date.now()) {
  if (!carItem) return 100;
  const baseCond = (carItem.condition !== undefined && carItem.condition !== null) ? Number(carItem.condition) : 100;
  const lastSrv = Number(carItem.lastServicedMs || nowDeviceMs);
  const elapsedHours = Math.max(0, (nowDeviceMs - lastSrv) / 3600000);
  const wearLoss = Math.floor(elapsedHours * 1.2);
  return Math.max(0, Math.min(100, Math.round(baseCond - wearLoss)));
}

export function getCarServiceCost(carItem, settingsObj = null, nowDeviceMs = Date.now()) {
  const cond = getCarCurrentCondition(carItem, nowDeviceMs);
  const missing = Math.max(0, 100 - cond);
  if (missing <= 0) return 0;
  const basePrice = getDynamicShopPrice(settingsObj, carItem.id, carItem.price || 6000000, 'garage');
  return Math.max(500, Math.round(basePrice * 0.002 * missing));
}

// -------------------------------------------------------------------------
// 5. НОВАЯ СИСТЕМА НАЛОГОВ (РУЧНАЯ ДЕКЛАРАЦИЯ РАЗ В 72 ЧАСА + РАСПИСКА)
// -------------------------------------------------------------------------
export function calculateUserDailyTaxBill(userObj, settingsObj = null) {
  if (!userObj) return { totalTax: 0, bizTax: 0, reTax: 0, garageRent: 0, carCount: 0 };
  const slots = getUserBusinessSlotsEntries(userObj, settingsObj);
  let bizTax = 0;
  slots.forEach(({ cfg, data }) => {
    const lvl = Number(data.level || 1);
    const hr = getBusinessHourlyIncome(cfg, lvl, 100, settingsObj);
    bizTax += Math.round(hr * 0.65);
  });

  let reTax = 0;
  if (userObj.realEstate && typeof userObj.realEstate === 'object') {
    REAL_ESTATE_CATALOG.forEach(cfg => {
      const cnt = Number(userObj.realEstate[cfg.id]?.count || 0);
      if (cnt > 0) {
        const p = getDynamicShopPrice(settingsObj, cfg.id, cfg.price, 'realestate');
        reTax += Math.round(p * cnt * 0.008);
      }
    });
  }

  const inv = Array.isArray(userObj.inventory) ? userObj.inventory : [];
  const cars = inv.filter(x => x && x.category === 'garage');
  let garageRent = 0;
  cars.forEach(c => {
    const p = getDynamicShopPrice(settingsObj, c.id, c.price || 6000000, 'garage');
    garageRent += Math.max(2500, Math.round(p * 0.004));
  });

  const totalTax = bizTax + reTax + garageRent;
  return { totalTax, bizTax, reTax, garageRent, carCount: cars.length };
}

/**
 * Расчёт состояния Налоговой Декларации (72-часовой цикл):
 * - Налоги накапливаются плавно от суточной ставки (dailyTaxBill.totalTax) в течение 72 часов.
 * - Если прошло > 72 часов (timeLeftMs === 0) и накопленный налог > 0, но расписка не оформлена —
 *   включается заморозка доходов (isOverdueFrozen = true).
 * - Если игрок нажал «Выписать долговую расписку» — долг переносится в расписку (разбивается на 4 части),
 *   таймер 72ч перезапускается, а бизнесы сразу РАЗМОРАЖИВАЮТСЯ!
 */
export function calculateUserTaxDeclaration(userObj, loansMap = {}, settingsObj = null, nowMs = Date.now(), isDemoMode = false) {
  const dailyBill = calculateUserDailyTaxBill(userObj, settingsObj);
  if (!userObj || isDemoMode) {
    return {
      dailyBill,
      cycleStartMs: nowMs,
      elapsedMs: 0,
      timeLeftMs: TAX_DECLARATION_PERIOD_MS,
      accumulatedTax: 0,
      full72hTaxEstimate: dailyBill.totalTax * 3,
      isOverdue72h: false,
      isIncomeFrozen: false,
      activeTaxPromissoryNotes: [],
      otherActiveLoans: []
    };
  }

  const uLow = normalizeLogin(userObj.username);
  const allUserLoans = Object.values(loansMap || {}).filter(
    l => l && l.status === 'active' && normalizeLogin(l.borrower) === uLow
  );

  // Долговые расписки с рассрочкой (отсрочкой на 72ч), которые НЕ замораживают доход, пока не просрочены
  const activeTaxPromissoryNotes = allUserLoans.filter(l => l.isInstallmentTaxNote === true);
  // Старые/штрафные расписки без рассрочки
  const otherActiveLoans = allUserLoans.filter(l => !l.isInstallmentTaxNote);

  const cycleStartMs = Number(userObj.taxCycleStartMs || userObj.lastTaxBillMs || nowMs);
  const elapsedMs = Math.max(0, nowMs - cycleStartMs);
  const timeLeftMs = Math.max(0, TAX_DECLARATION_PERIOD_MS - elapsedMs);

  // Налог копится пропорционально прошедшим часам (максимум за 72ч = 3 суток, далее ждёт оплаты)
  const cappedElapsedHours = Math.min(72, elapsedMs / 3600000);
  const hourlyTaxRate = dailyBill.totalTax / 24;
  const accumulatedTax = dailyBill.totalTax > 0
    ? Math.max(1, Math.round(hourlyTaxRate * Math.max(0.1, cappedElapsedHours)))
    : 0;

  const isOverdue72h = dailyBill.totalTax > 0 && elapsedMs >= TAX_DECLARATION_PERIOD_MS;

  // Проверяем, не просрочена ли сама выписанная ранее долговая расписка (72ч на выплату частей)
  const hasExpiredPromissoryNote = activeTaxPromissoryNotes.some(
    note => note.dueAtMs && nowMs > Number(note.dueAtMs)
  );

  // Доходы замораживаются ТОЛЬКО если:
  // 1) Прошло 72 часа, налог > 0, и игрок ещё не оплатил декларацию и не выписал расписку
  // 2) Или истёк 72-часовой срок самой выписанной расписки
  const isIncomeFrozen = isOverdue72h || hasExpiredPromissoryNote;

  return {
    dailyBill,
    cycleStartMs,
    elapsedMs,
    timeLeftMs,
    accumulatedTax,
    full72hTaxEstimate: dailyBill.totalTax * 3,
    isOverdue72h,
    hasExpiredPromissoryNote,
    isIncomeFrozen,
    activeTaxPromissoryNotes,
    otherActiveLoans
  };
}

// -------------------------------------------------------------------------
// 6. РАСЧЁТ ВЫРУЧКИ ПРОМЫСЛОВ, НЕДВИЖИМОСТИ И КОСМО-БАЗ
// -------------------------------------------------------------------------
export function calculateUserPendingBusinessRevenue(userObj, loansMap = {}, settingsObj = null, nowMs = Date.now(), isDemoMode = false) {
  const slots = getUserBusinessSlotsEntries(userObj, settingsObj);
  const taxDecl = calculateUserTaxDeclaration(userObj, loansMap, settingsObj, nowMs, isDemoMode);
  const isFrozenByDebt = taxDecl.isIncomeFrozen;

  if (slots.length === 0) {
    return { totalRaw: 0, totalHourly: 0, perSlot: {}, ownedCount: 0, isFrozenByDebt, taxDecl };
  }

  const maxMs = Number(settingsObj?.business?.maxStorageHours || 24) * 3600 * 1000;
  let totalRaw = 0, totalHourly = 0;
  const perSlot = {};

  slots.forEach(({ slotKey, cfg, data }) => {
    const lvl = Number(data.level || 1);
    const condition = computeEffectiveSlotCondition(data, nowMs);
    const isWornOut = condition < 50;
    const hourly = isFrozenByDebt ? 0 : getBusinessHourlyIncome(cfg, lvl, condition, settingsObj);
    const nominalHourly = getBusinessHourlyIncome(cfg, lvl, 100, settingsObj);
    totalHourly += hourly;

    const lastCol = Number(data.lastCollected || nowMs);
    const elapsedMs = Math.max(0, Math.min(maxMs, nowMs - lastCol));
    const earned = isFrozenByDebt ? 0 : (hourly / 3600000) * elapsedMs;
    const fillPct = isFrozenByDebt ? 0 : Math.min(100, (elapsedMs / maxMs) * 100);
    const upgStart = Number(data.upgradeStartedAt || 0), upgEnd = Number(data.upgradeEndsAt || 0);
    const isUpgrading = upgEnd > nowMs;
    const upgLeftMs = isUpgrading ? Math.max(0, upgEnd - nowMs) : 0;
    const upgTotalMs = (upgEnd > upgStart && upgStart > 0) ? (upgEnd - upgStart) : getBusinessUpgradeDurationMs(lvl);
    const upgPct = isUpgrading ? Math.min(100, Math.max(0, ((nowMs - upgStart) / Math.max(1, upgTotalMs)) * 100)) : 0;
    const repairCost = getSlotMaintenanceCost(cfg, lvl, condition, settingsObj);

    perSlot[slotKey] = {
      earned, hourly, nominalHourly, condition, isWornOut, repairCost,
      fillPct, elapsedMs, isFull: elapsedMs >= maxMs, isUpgrading, upgLeftMs, upgPct
    };
    totalRaw += earned;
  });

  return { totalRaw, totalHourly, perSlot, ownedCount: slots.length, isFrozenByDebt, taxDecl };
}

export function calculateUserRealEstateRent(userObj, settingsObj = null, nowMs = Date.now(), isFrozenByTax = false) {
  if (!userObj || !userObj.realEstate || typeof userObj.realEstate !== 'object') {
    return { totalPending: 0, totalHourly: 0, perItem: {}, totalValuation: 0 };
  }
  const maxMs = 24 * 3600 * 1000;
  let totalPending = 0, totalHourly = 0, totalValuation = 0;
  const perItem = {};

  REAL_ESTATE_CATALOG.forEach(cfg => {
    const rData = userObj.realEstate[cfg.id];
    const count = Number(rData?.count || 0);
    if (count <= 0) return;
    const dynPrice = getDynamicShopPrice(settingsObj, cfg.id, cfg.price, 'realestate');
    totalValuation += dynPrice * count;
    const prepEndsAt = Number(rData.prepEndsAt || 0);
    const status = rData.status || 'idle';
    const rawHourly = Math.round(dynPrice * count * ((cfg.hourlyRatePct || 5) / 100));
    const hourly = isFrozenByTax ? 0 : rawHourly;

    if (status === 'active') {
      if (nowMs < prepEndsAt) {
        perItem[cfg.id] = { count, state: 'preparing', leftMs: Math.max(0, prepEndsAt - nowMs), earned: 0, hourly, fillPct: 0 };
      } else {
        totalHourly += hourly;
        const startPoint = Math.max(Number(rData.lastCollected || 0), prepEndsAt);
        const elapsedMs = Math.max(0, Math.min(maxMs, nowMs - startPoint));
        const earned = isFrozenByTax ? 0 : (hourly / 3600000) * elapsedMs;
        const fillPct = isFrozenByTax ? 0 : Math.min(100, (elapsedMs / maxMs) * 100);
        totalPending += earned;
        perItem[cfg.id] = { count, state: 'renting', leftMs: 0, earned, hourly, fillPct, isFull: elapsedMs >= maxMs };
      }
    } else {
      perItem[cfg.id] = { count, state: 'idle', leftMs: 0, earned: 0, hourly, fillPct: 0 };
    }
  });
  return { totalPending, totalHourly, perItem, totalValuation };
}

export function getCosmicBaseUpgradeCost(cosCfg, baseTypeCfg, currentLevel, settingsObj = null) {
  const locPrice = getDynamicShopPrice(settingsObj, cosCfg.id, cosCfg.price, 'cosmos');
  const lvl = Math.max(0, Number(currentLevel || 0));
  return Math.max(1000, Math.round(locPrice * baseTypeCfg.costShare * Math.pow(1.45, lvl)));
}

export function getCosmicLocationHourlyYield(cosCfg, basesObj, ownedCount = 1, settingsObj = null) {
  if (!cosCfg || !basesObj || ownedCount <= 0) return 0;
  const locPrice = getDynamicShopPrice(settingsObj, cosCfg.id, cosCfg.price, 'cosmos');
  const maxHourlyAtFull15 = locPrice * ((cosCfg.maxHourlyRatePct || 1.0) / 100);
  let hourlySingle = 0;

  COSMIC_BASE_TYPES.forEach(bt => {
    const lvl = Math.min(5, Math.max(0, Number(basesObj[bt.key] || 0)));
    if (lvl > 0) {
      hourlySingle += maxHourlyAtFull15 * bt.yieldShare * (lvl / 5);
    }
  });
  return Math.round(hourlySingle * ownedCount);
}

export function calculateUserCosmicRent(userObj, settingsObj = null, nowMs = Date.now()) {
  if (!userObj) return { totalPending: 0, totalHourly: 0, perItem: {}, totalValuation: 0 };
  const maxMs = 24 * 3600 * 1000;
  let totalPending = 0, totalHourly = 0, totalValuation = 0;
  const perItem = {};

  COSMIC_EMPIRE_CATALOG.forEach(cfg => {
    const count = countUserOwnedAssetById(userObj, cfg.id);
    if (count <= 0) return;
    const dynPrice = getDynamicShopPrice(settingsObj, cfg.id, cfg.price, 'cosmos');
    totalValuation += dynPrice * count;

    const basesObj = userObj.cosmicBases?.[cfg.id] || { mining: 0, research: 0, power: 0 };
    const totalBaseLevels = Number(basesObj.mining || 0) + Number(basesObj.research || 0) + Number(basesObj.power || 0);
    const hourly = getCosmicLocationHourlyYield(cfg, basesObj, count, settingsObj);
    totalHourly += hourly;

    const lastCol = Number(basesObj.lastCollected || userObj.cosmicRentLastCollected?.[cfg.id] || nowMs);
    const elapsedMs = Math.max(0, Math.min(maxMs, nowMs - lastCol));
    const earned = hourly > 0 ? (hourly / 3600000) * elapsedMs : 0;
    const fillPct = hourly > 0 ? Math.min(100, (elapsedMs / maxMs) * 100) : 0;
    totalPending += earned;
    perItem[cfg.id] = { count, earned, hourly, fillPct, totalBaseLevels, basesObj, isFull: elapsedMs >= maxMs };
  });

  return { totalPending, totalHourly, perItem, totalValuation };
}

// -------------------------------------------------------------------------
// 7. БИРЖА АКЦИЙ, ПОРТФЕЛЬ, СУД И КИБЕР-САПЁР
// -------------------------------------------------------------------------
export function computeGrowingAssetMeanPrice(minMeanPrice, totalSharesBought) {
  const base = Math.max(5, Number(minMeanPrice || 100));
  const maxMean = Math.round(base * 2.5);
  const shares = Math.max(0, Number(totalSharesBought || 0));
  if (shares <= 0) return base;
  const growth = Math.round(shares * (base * 0.0005));
  return Math.min(maxMean, base + growth);
}

export function sanitizeMarketAssetRecord(def, saved) {
  const minMean = Math.max(5, Number(def.minMeanPrice || def.meanPrice || 100));
  const maxAllowedMean = Math.round(minMean * 2.5);
  const minAllowedPrice = Math.max(5, Math.round(minMean * 0.75));
  const maxAllowedPrice = Math.round(minMean * 3.0);

  let shares = Math.max(0, Math.min(50000, Math.round(Number(saved?.totalSharesBought || 0))));
  let rawMean = Number(saved?.meanPrice || minMean);
  let rawPrice = Number(saved?.price || minMean);
  let needsDbRepair = false;

  if (!Number.isFinite(rawMean) || rawMean < minMean || rawMean > maxAllowedMean) {
    rawMean = Math.min(maxAllowedMean, Math.max(minMean, computeGrowingAssetMeanPrice(minMean, Math.min(shares, 3000))));
    needsDbRepair = true;
  }
  if (!Number.isFinite(rawPrice) || rawPrice < minAllowedPrice || rawPrice > maxAllowedPrice) {
    rawPrice = rawMean;
    needsDbRepair = true;
  }

  const rawHist = Array.isArray(saved?.history) ? saved.history : def.history;
  const cleanHist = rawHist.map(v => {
    const num = Number(v);
    if (!Number.isFinite(num) || num < minAllowedPrice || num > maxAllowedPrice) return rawPrice;
    return Math.round(num);
  }).slice(-MAX_CHART_POINTS);

  return {
    asset: {
      ...def,
      ...saved,
      minMeanPrice: minMean,
      totalSharesBought: shares,
      meanPrice: Math.round(rawMean),
      price: Math.round(rawPrice),
      prevPrice: Math.min(maxAllowedPrice, Math.max(minAllowedPrice, Math.round(Number(saved?.prevPrice || rawPrice)))),
      history: cleanHist.length >= 2 ? cleanHist : [...def.history]
    },
    needsDbRepair
  };
}

export function calculateUserPortfolioValue(userObj, marketAssetsMap = {}, settingsObj = null) {
  if (!userObj) return 0;
  let total = 0;
  if (userObj.portfolio) {
    Object.entries(userObj.portfolio).forEach(([ticker, qty]) => {
      const asset = marketAssetsMap[ticker];
      if (asset && Number(qty) > 0) total += Math.round(Number(asset.price || 0) * Math.min(MAX_HOLDINGS_PER_ASSET, Number(qty)));
    });
  }
  if (Array.isArray(userObj.inventory)) {
    const deviceNow = Date.now();
    userObj.inventory.forEach(item => {
      if (!item) return;
      if (item.category === 'garage') {
        const cond = getCarCurrentCondition(item, deviceNow);
        total += Math.round(Number(item.price || 0) * (cond / 100));
      } else {
        total += Math.round(Number(item.price || 0));
      }
    });
  }
  if (userObj.realEstate && typeof userObj.realEstate === 'object') {
    REAL_ESTATE_CATALOG.forEach(cfg => {
      const cnt = Number(userObj.realEstate[cfg.id]?.count || 0);
      if (cnt > 0) total += getDynamicShopPrice(settingsObj, cfg.id, cfg.price, 'realestate') * cnt;
    });
  }
  return total;
}

export function calculateCourtTransferDurationMs(assetType, level = 1, valuation = 10000) {
  const baseMinutes = 5 * Math.max(1, Number(level || 1));
  const storageBonusMinutes = Math.min(35, Math.floor(Math.log10(Math.max(100, Number(valuation || 1000))) * 1.5));
  return (baseMinutes + storageBonusMinutes) * 60 * 1000;
}

export function calculateMinesNextMultiplier(minesCount, revealedSafeCount, houseEdgePct = 6) {
  const edge = (100 - Number(houseEdgePct || 6)) / 100;
  let prob = 1;
  for (let i = 0; i < revealedSafeCount; i++) prob *= (25 - minesCount - i) / (25 - i);
  return Math.min(250, Math.max(1.05, Number((edge / Math.max(0.0001, prob)).toFixed(2))));
}

export function transformToModernOldRussian(rawText, recipientName = 'Боярин', style = 'boyar') {
  let text = String(rawText || '').trim();
  const recipient = String(recipientName || 'Боярин').trim();
  if (!text) return `Челом бью, достопочтенный боярин @${recipient}! Да пребудет казна твоя в достатке!`;
  text = text.replace(/^📜 \[Боярская Грамота\]:\s*/i, '').replace(/^👑 \[Княжеский Указъ\]:\s*/i, '').replace(/^⚖️ \[Купеческий Слогъ\]:\s*/i, '');
  OLD_RUS_DICTIONARY.forEach(item => { text = text.replace(item.reg, item.rep); });
  if (style === 'decree') return `👑 [Княжеский Указъ]: Внемли же, гражданин @${recipient}! ${text}. Скреплено печатью Банка Миробайт (฿).`;
  if (style === 'merchant') return `⚖️ [Купеческий Слогъ]: Почтенный купец @${recipient}, дело верное говорю: ${text}. Ударим по рукам за звонкие Байти (฿)!`;
  return `📜 [Боярская Грамота]: Челом бью, славный @${recipient}! Поведаю тебе: ${text}. Многая лета да полной казны Байти (฿)!`;
}

// -------------------------------------------------------------------------
// 8. КРИПТОГРАФИЯ PBKDF2-SHA256 И ПРОВЕРКА ПАРОЛЕЙ
// -------------------------------------------------------------------------
export function bytesToBase64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export function base64ToBytes(base64) {
  const binary = atob(base64);
  return Uint8Array.from(binary, ch => ch.charCodeAt(0));
}

export function timingSafeEqualString(a, b) {
  const strA = String(a || ''), strB = String(b || '');
  const len = Math.max(strA.length, strB.length);
  let diff = strA.length ^ strB.length;
  for (let i = 0; i < len; i++) diff |= (strA.charCodeAt(i) || 0) ^ (strB.charCodeAt(i) || 0);
  return diff === 0;
}

export async function derivePasswordHash(password, saltBase64) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const salt = base64ToBytes(saltBase64);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: PASSWORD_ITERATIONS, hash: 'SHA-256' }, keyMaterial, 256);
  return bytesToBase64(new Uint8Array(bits));
}

export async function createPasswordRecord(password, timestampValue = Date.now()) {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const saltBase64 = bytesToBase64(salt);
  return {
    passwordHash: await derivePasswordHash(password, saltBase64),
    passwordSalt: saltBase64,
    passwordVersion: 2,
    updatedAt: timestampValue
  };
}

export function evaluatePasswordStrength(password, username = '') {
  const p = String(password || '');
  if (p.length < 6) return { score: 15, label: 'Слишком короткий (мин. 6 симв.)', color: 'bg-rose-500', valid: false };
  const weakList = ['123456', '12345678', '123456789', 'password', 'qwerty', '111111', '000000', 'пароль'];
  if (weakList.includes(p.toLowerCase()) || (username && p.toLowerCase() === username.trim().toLowerCase())) {
    return { score: 25, label: 'Слишком простой пароль!', color: 'bg-rose-500', valid: false };
  }
  let score = 45;
  if (p.length >= 8) score += 20;
  if (p.length >= 12) score += 15;
  if (/\d/.test(p)) score += 10;
  if (/[^A-Za-zА-Яа-яЁё0-9]/.test(p)) score += 10;
  if (score < 60) return { score, label: 'Средний пароль', color: 'bg-amber-400', valid: true };
  if (score < 85) return { score, label: 'Надёжный пароль', color: 'bg-emerald-400', valid: true };
  return { score: 100, label: 'Максимальная защита ฿', color: 'bg-bank-gold', valid: true };
}