/**
 * ГЛОБАЛЬНАЯ КОНФИГУРАЦИЯ ИГРЫ
 * Здесь определены все роли, фразы, правила и параметры
 * 
 * Для добавления новой роли:
 * 1. Добавить объект в ROLES
 * 2. Добавить фразы в PHRASES
 * 3. Опционально - добавить специальную логику в roles.js
 */

const GAME_CONFIG = {
    /**
     * РОЛИ - определение и параметры
     * 
     * Параметры:
     * - displayName: имя роли на русском
     * - emoji: эмодзи роли
     * - cssClass: CSS класс для стилизации
     * - alignment: 'evil' | 'good' | 'neutral' (для проверки побед)
     * - actionType: 'select' | 'none' (требует ли выбора цели)
     * - canSkip: может ли роль пропустить ход
     * - temperament: 'peaceful' | 'aggressive' (для подбора фраз)
     * - restrictions: { preventSameTwice: true } (дополнительные правила)
     */
    ROLES: {
        Citizen: {
            displayName: 'Мирный',
            emoji: '😊',
            cssClass: 'tag-Citizen',
            alignment: 'good',
            actionType: 'none',
            isNightRole: false,
            temperament: null
        },
        Mafia: {
            displayName: 'Мафия',
            emoji: '👺',
            cssClass: 'tag-Mafia',
            alignment: 'evil',
            actionType: 'select',
            isNightRole: true,
            canSkip: true,
            temperament: 'aggressive'
        },
        MafiaBoss: {
            displayName: 'Босс Мафии',
            emoji: '🕴️',
            cssClass: 'tag-MafiaBoss',
            alignment: 'evil',
            actionType: 'select',
            isNightRole: true,
            canSkip: true,
            temperament: 'aggressive'
        },
        Detective: {
            displayName: 'Детектив',
            emoji: '🕵️‍♂️',
            cssClass: 'tag-Detective',
            alignment: 'good',
            actionType: 'select',
            isNightRole: true,
            canSkip: false,
            temperament: 'peaceful',
            restrictions: { preventSameTwice: true }
        },
        Doctor: {
            displayName: 'Доктор',
            emoji: '💊',
            cssClass: 'tag-Doctor',
            alignment: 'good',
            actionType: 'select',
            isNightRole: true,
            canSkip: false,
            temperament: 'peaceful',
            restrictions: { preventConsecutive: true }
        },
        Bodyguard: {
            displayName: 'Телохранитель',
            emoji: '🛡️',
            cssClass: 'tag-Bodyguard',
            alignment: 'good',
            actionType: 'select',
            isNightRole: true,
            canSkip: true,
            temperament: 'peaceful',
            restrictions: { noSelfProtect: true }
        },
        Lucky: {
            displayName: 'Счастливчик',
            emoji: '🍀',
            cssClass: 'tag-Lucky',
            alignment: 'good',
            actionType: 'none',
            isNightRole: false,
            temperament: null
        },
        Mistress: {
            displayName: 'Любовница',
            emoji: '💋',
            cssClass: 'tag-Mistress',
            alignment: 'neutral',
            actionType: 'select',
            isNightRole: true,
            canSkip: false,
            temperament: 'peaceful'
        },
        Maniac: {
            displayName: 'Маньяк',
            emoji: '🔪',
            cssClass: 'tag-Maniac',
            alignment: 'neutral',
            actionType: 'select',
            isNightRole: true,
            canSkip: false,
            temperament: 'aggressive'
        }
    },

    /**
     * ПОРЯДОК АКТИВАЦИИ РОЛЕЙ НОЧЬЮ
     * Определяет, в каком порядке активируются роли
     */
    NIGHT_ROLE_ORDER: ['Doctor', 'Bodyguard', 'MafiaBoss', 'Mafia', 'Maniac', 'Mistress', 'Detective'],

    /**
     * СТАНДАРТНЫЕ КОНФИГУРАЦИИ ИГРЫ
     */
    DEFAULT_ROLE_CONFIG: {
        Mafia: 1,
        MafiaBoss: 0,
        Maniac: 0,
        Detective: 1,
        Doctor: 1,
        Bodyguard: 0,
        Lucky: 0,
        Mistress: 0
    },

    /**
     * УСЛОВИЯ ПОБЕДЫ
     * Проверяются после каждого события
     */
    WIN_CONDITIONS: {
        mafia: {
            check: (alive, mafia, maniac) => mafia > 0 && mafia >= (alive - mafia - maniac),
            message: 'winMafia'
        },
        maniac: {
            check: (alive, mafia, maniac) => maniac > 0 && alive <= 2 && mafia === 0,
            message: 'winManiac'
        },
        citizens: {
            check: (alive, mafia, maniac) => mafia === 0 && maniac === 0,
            message: 'winCitizen'
        }
    },

    /**
     * ФРАЗЫ И СООБЩЕНИЯ
     * Структурирована по типам событий
     */
    PHRASES: {
        // Начало ночи (по темпераменту роли)
        nightStart: {
            peaceful: [
                "Город заткнулся, а {role} выходит на смену. 🕯️",
                "Тишина стоит как на похоронах. Ход за {role}.",
                "Наступила ночь. На сцену выходит {role}.",
                "Чужая жизнь снова зависит от {role}. Красота.",
                "Лишние вопросы потом. Сейчас работает {role}.",
                "Город спит, совесть тоже. {role}, действуй.",
                "Все молчат. {role} делает грязную работу тихо.",
                "Ночь без шума. {role}, просто сделай, что нужно.",
                "Пока остальные дышат в подушку, {role} решает судьбы."
            ],
            aggressive: [
                "Свет погас, мораль вышла из чата. Ходит {role}. 🌙",
                "В городе снова пахнет бедой. {role}, выбирай цель.",
                "Ночь любит тех, кто не церемонится. {role}, вперед.",
                "Город замер. Сейчас решает {role}.",
                "Кому-то сегодня будет чертовски не до сна. {role}, работай.",
                "Никто не святой, но {role} сегодня особенно старается.",
                "Адвокатов на эту смену не вызывали. {role}, твой ход.",
                "Шоу дерьмовое, но рейтинг высокий. Выходит {role}.",
                "Сейчас будет больно кому-то одному. {role}, не тяни.",
                "Ночь короткая, список жертв длинный. Работает {role}.",
                "Городу нужен новый труп. {role}, обеспечь сервис."
            ]
        },

        // Промпты для каждой роли
        rolePrompts: {
            'Doctor': [
                "Кому сегодня выпишем внеплановую жизнь? 💉",
                "Кого вытянем за воротник с края могилы?",
                "Кому поставить заплатку, пока не развалился?",
                "Чью фамилию пока вычеркиваем из списка трупов?",
                "Кому сегодня повезет с бесплатной реанимацией?",
                "Выбирай, кого смерть подождет до завтра.",
                "Кого сегодня просто не отдадим земле?",
                "Кому накинуть еще один день жизни в кредит?"
            ],
            'Mafia': [
                "Кого город завтра не досчитается? 👺",
                "Кому выпишем билет в один конец?",
                "Чью фамилию отправляем в черный список навсегда?",
                "Кто сегодня услышит последнее 'ну бывает'?",
                "Выбирай того, кому не повезло родиться здесь.",
                "Кого этой ночью аккуратно выключаем?",
                "Кого оставим лежать в завтрашней сводке?",
                "Укажи, кто сегодня не проснется."
            ],
            'MafiaBoss': [
                "Босс решает лично. Кто лишний до рассвета? 🕴️",
                "Приказ простой: выбрать цель и не промахнуться.",
                "Последнее слово за Боссом. Кто падает первым?",
                "Кого Босс вычеркивает из игры этой ночью?",
                "Подпись Босса под одним приговором. Кому?"
            ],
            'Bodyguard': [
                "Кого закрываем грудью этой ночью? 🛡️",
                "Кому сегодня дарим броню из собственного тела?",
                "Чью дверь берем под жесткий контроль?",
                "Кого охраняем так, будто завтра суда не будет?",
                "Кого сегодня прикрываем от всей этой херни?"
            ],
            'Maniac': [
                "Кто сегодня попадет под горячую руку? 🔪",
                "Выбери, кому ночь устроит персональный ад.",
                "Кому не повезло оказаться в твоем списке?",
                "Кто сегодня статистика, а не человек?",
                "Чья история сейчас оборвется без титров?",
                "Кого сегодня вычеркиваем без разговоров?",
                "Кто станет еще одной ошибкой в протоколе?"
            ],
            'Mistress': [
                "Кого сегодня пустим по ложному следу? 💋",
                "Кому аккуратно подменим правду красивой ложью?",
                "Чья проверка сегодня превратится в цирк?",
                "Кого закроем туманом, чтобы Детектив сел в лужу?",
                "По кому сегодня правда получит фальшивый грим?"
            ],
            'Detective': [
                "Чье досье вскрываем сегодня? 🔍",
                "Кто врет так нагло, что даже стены морщатся?",
                "Кого проверяем на запах пороха и паники?",
                "Кто выглядит слишком чистым, чтобы быть чистым?",
                "Выбирай, кому сегодня устроим рентген совести.",
                "Кто сегодня пойдет под лампу допроса?",
                "С кого срываем маску в эту смену?"
            ]
        },

        // Пропуск хода
        confirmSkip: [
            "{role} пропускает ход. Идем дальше? 💤",
            "У {role} сегодня выходной. Подтверждаешь?",
            "Цель не выбрана. Оставляем как есть?",
            "{role} решила не марать руки. Продолжаем?",
            "Ход в молоко. Фиксируем пропуск?",
            "{role} уходит в пас. Подтверди."
        ],

        // Убийства
        morningKilled: [
            "Утренний отчет: минус {name}. Город не скучал. ⚰️",
            "Рассвет принес плохие новости: {name} выбыл(а).",
            "Ночь отработала грязно: {name} больше не в игре.",
            "Кофе не помог. {name} до утра не дотянул(а).",
            "Утро началось с минуса: {name} покинул(а) стол.",
            "Сегодняшний список потерь открыт именем: {name}."
        ],

        // Безопасные ночи
        morningSafe: [
            "Все живы. Ночь промахнулась, бывает. 😴",
            "Трупов нет. Подозрительно тихая смена.",
            "Город отделался легким испугом. Пока что.",
            "Ночью никто не выбыл. Даже скучно.",
            "Тишина. Ни выстрела, ни крика, ни тела."
        ],

        // День - изгнание
        dayExile: [
            "Толпа выбрала {name}. Исполняем? ⚖️",
            "Город хочет вышвырнуть {name}. Подтвердить?",
            "Вердикт по {name} готов. Приводим в действие?",
            "Голоса сошлись на {name}. Финализируем?",
            "Суд толпы по {name} готов. Закрываем вопрос?",
            "По {name} решение принято. Жмем на приговор?"
        ],

        // Победы
        winMafia: [
            "Порядок мертв, мафия жива. И это их любимый финал. 🥂",
            "Город сломан. Мафия закрывает сезон аплодисментами. 👺",
            "Мафия пережила всех, а закон отправила в утиль.",
            "Финал простой: мафия сверху, остальные в протоколе."
        ],
        winCitizen: [
            "Грязь вычищена. Мирные выжили, чудеса случаются. 😊",
            "Город отбился и даже не развалился. Почти подвиг. 🏛️",
            "Мирные дожали партию. Удивительно, но факт.",
            "Город выстоял. Ненадолго, но этого достаточно."
        ],
        winManiac: [
            "Остался один победитель и тонна плохих решений. 🩸",
            "Маньяк пережил всех. Занавес, аплодировать некому. 🔪",
            "Финал кровавый и предельно честный: Маньяк один на сцене.",
            "Маньяк закрыл партию в соло. Мерзко, но эффективно."
        ]
    }
};

/**
 * Вспомогательные функции для работы с конфигурацией
 */
const ConfigUtils = {
    _phraseState: {},

    resetPhraseHistory() {
        this._phraseState = {};
    },

    /**
     * Получить случайную фразу по ключу
     */
    getRandomPhrase(key, subKey = null, data = {}) {
        let list;

        // Определяем базовый список фраз
        if (key === 'nightStart' && data.roleType) {
            list = GAME_CONFIG.PHRASES.nightStart[data.roleType];
        } else if (key === 'rolePrompts') {
            list = GAME_CONFIG.PHRASES.rolePrompts[data.role];
        } else {
            list = subKey 
                ? GAME_CONFIG.PHRASES[key]?.[subKey] 
                : GAME_CONFIG.PHRASES[key];
        }

        // Fallback
        if (!list || !list.length) {
            console.warn(`Phrases not found for: ${key}${subKey ? '.' + subKey : ''}`);
            return ""; 
        }

        // Стараемся не повторять фразы, пока не пройдем весь пул.
        const bucketId = [
            key,
            subKey || '',
            data.roleType || '',
            data.role || ''
        ].join('|');

        if (!this._phraseState[bucketId]) {
            this._phraseState[bucketId] = { remaining: [], lastIdx: null };
        }

        const state = this._phraseState[bucketId];

        if (!state.remaining.length) {
            state.remaining = list.map((_, idx) => idx);

            // При новом цикле исключаем последнюю использованную фразу, если есть альтернатива.
            if (list.length > 1 && state.lastIdx !== null) {
                state.remaining = state.remaining.filter(idx => idx !== state.lastIdx);
            }
        }

        const randomPos = Math.floor(Math.random() * state.remaining.length);
        const chosenIdx = state.remaining.splice(randomPos, 1)[0];
        state.lastIdx = chosenIdx;

        let str = list[chosenIdx];

        // Подстановка данных
        for (let k in data) {
            str = str.replaceAll(`{${k}}`, data[k]);
        }

        return str;
    },

    /**
     * Получить информацию о роли
     */
    getRoleInfo(roleName) {
        return GAME_CONFIG.ROLES[roleName];
    },

    /**
     * Получить все ночные роли (активные)
     */
    getNightRoles() {
        return GAME_CONFIG.NIGHT_ROLE_ORDER.filter(r => GAME_CONFIG.ROLES[r].isNightRole);
    },

    /**
     * Получить только ночные роли, которые активны в текущей игре
     */
    getActiveNightRoles(gameRoles) {
        return GAME_CONFIG.NIGHT_ROLE_ORDER.filter(r => 
            gameRoles[r] && gameRoles[r] > 0 && GAME_CONFIG.ROLES[r].isNightRole
        );
    }
};

// Явно публикуем конфиг в window для inline-обработчиков и кросс-скриптового доступа.
window.GAME_CONFIG = GAME_CONFIG;
window.ConfigUtils = ConfigUtils;
