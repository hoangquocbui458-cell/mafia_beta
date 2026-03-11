# Mafia Moderator Helper

Приложение для ведущего игры в Мафию с модульной архитектурой, гибкой настройкой ролей, рекомендациями состава и подробным логом партии.

## Основные возможности

- Настройка состава игроков и ролей на отдельных экранах.
- Автоматическая рекомендация ролей по числу игроков.
- Ручной конструктор ролей с ограничениями:
  - минимум 1 Мафия;
  - минимум 1 Мирный;
  - Босс Мафии не более 1;
  - Любовница доступна только при Детективе.
- Поэтапная раздача ролей с брифами для ведущего.
- Полный игровой цикл:
  - день знакомства;
  - ночные ходы по порядку;
  - дневное голосование;
  - первая и вторая ничья;
  - экран подтверждения дня без изгнания.
- Журнал партии с группировкой по фазам и экспортом в txt.
- Встроенная вкладка правил и сценария ведущего.
- Модалка обратной связи на главном экране.

## Структура репозитория

```text
mafia_beta/
├── index.html
├── style.css
├── config.js
├── roles.js
├── game-engine.js
├── ui-manager.js
├── script.js
├── autotest.js
├── script-old.js
├── README.md
├── QUICK_START.md
├── ARCHITECTURE.md
└── INTRO.md
```

## Роли в текущей версии

- Citizen
- Mafia
- MafiaBoss
- Detective
- Doctor
- Bodyguard
- Lucky
- Mistress
- Maniac

## Быстрый запуск

1. Открой index.html в браузере.
2. Либо запусти любой локальный статический сервер из корня репозитория и открой страницу через localhost.

## Тестирование

Автотесты покрывают движок игры и ключевые правила.

```bash
node autotest.js
```

Что проверяется:

- валидация конфигурации ролей;
- порядок ночных ролей;
- ограничения ролей и ночные действия;
- обработка атак, защиты и выбытий;
- логика ничьих и голосования;
- условия победы.

## Архитектура по слоям

- config.js: источник конфигурации, фраз и утилит доступа.
- roles.js: обработчики RoleHandlers и фасад RoleUtils.
- game-engine.js: состояние игры и бизнес-правила.
- ui-manager.js: рендер экранов и интерфейсные сценарии.
- script.js: интеграция, глобальные callbacks и переходы фаз.

Подробная схема в ARCHITECTURE.md.

## Ключевые API

### GameEngine

- reset
- addPlayer
- removePlayer
- renamePlayer
- isRoleConfigValid
- setRoleCount
- applyRoleConfig
- clearRoleConfig
- getRoleRecommendations
- startFirstDay
- startNight
- getCurrentNightRole
- submitNightAction
- skipNightAction
- processNight
- vote
- castVote
- checkWinCondition
- endNight
- getLog
- getTimelineLog
- getExportLogText
- getGameState

### UIManager

- showScreen
- updateHeader
- renderPlayerSetup
- renderRoleConfig
- renderRoleDistribution
- renderGameScreen
- renderGameEnd
- toggleGuide
- switchGuideTab
- toggleLog
- exportLogsTxt
- showMessage
- closeMessage

### ConfigUtils

- getRandomPhrase
- getRoleInfo
- getNightRoleBrief
- getNightRoles
- getActiveNightRoles
- resetPhraseHistory

### RoleUtils

- getHandler
- canSelectTarget
- executeNightAction
- getRestrictions
- getAlignment

## Как добавить новую роль

1. Добавь объект роли в GAME_CONFIG.ROLES в config.js.
2. Добавь фразы роли в GAME_CONFIG.PHRASES.rolePrompts.
3. Добавь обработчик роли в RoleHandlers в roles.js.
4. Если роль ночная, добавь ее в GAME_CONFIG.NIGHT_ROLE_ORDER.
5. При необходимости добавь визуальные стили роли в style.css.

## Где что менять

- Баланс и параметры ролей: config.js.
- Тексты и атмосфера сообщений: config.js.
- Специальные правила ролей: roles.js.
- Общие правила фазы и побед: game-engine.js.
- Экраны и визуальное поведение: ui-manager.js и style.css.
- События кнопок и глобальные функции из HTML: script.js.

## Примечания по совместимости

- Публичные callbacks экспортируются в window из script.js.
- UI опирается на inline-onclick из index.html.
- script-old.js сохранен как историческая версия.

## Документация

- QUICK_START.md: быстрые рабочие инструкции.
- ARCHITECTURE.md: подробная архитектурная картина.
- INTRO.md: краткий вход в проект.
