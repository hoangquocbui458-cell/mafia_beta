/**
 * MAIN SCRIPT - Инициализация и управление потоком игры
 * 
 * Этот файл:
 * 1. Инициализирует компоненты при загрузке
 * 2. Управляет основным потоком игры
 * 3. Содержит function callbacks для HTML элементов
 * 
 * Архитектура:
 * - config.js: конфигурация игры
 * - roles.js: логика ролей
 * - game-engine.js: основная игровая логика
 * - ui-manager.js: управление интерфейсом
 * - script.js (этот файл): инициализация и интеграция
 */

// ========== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ СОВМЕСТИМОСТИ ==========

// Для совместимости со старым HTML
window.selId = null;
window.msgCallback = null;
window.noExileMessage = '';
window.roleAssignmentOrder = [];
window.ps = window.ps || [];
window.actionTapGuard = { key: '', at: 0 };
window.roleRecommendationOffset = 0;

function isRapidRepeatTap(actionKey, thresholdMs = 380) {
    const now = Date.now();
    const guard = window.actionTapGuard || { key: '', at: 0 };
    const isRepeat = guard.key === actionKey && (now - guard.at) < thresholdMs;

    window.actionTapGuard = { key: actionKey, at: now };
    return isRepeat;
}

// ps - это ссылка на players из gameEngine (будет доступна после инициализации)
// Используется в HTML: ps.length, ps[i].n и т.д.

// ========== ИНИЦИАЛИЗАЦИЯ ==========

window.onload = () => {
    if (!window.gameEngine && typeof GameEngine !== 'undefined') {
        window.gameEngine = new GameEngine();
    }

    if (!window.gameEngine) {
        console.error('GameEngine not initialized');
        return;
    }

    window.gameEngine.reset();

    // По умолчанию сразу создаем стартовый состав из 5 игроков.
    if (window.gameEngine.players.length === 0) {
        for (let i = 0; i < 5; i++) {
            window.gameEngine.addPlayer('');
        }
    }
    // Создаем ссылку ps на players gameEngine
    window.ps = window.gameEngine.players;

    if (window.UIManager) {
        window.UIManager.showScreen(0);
    }
};

// ========== СОВМЕСТИМОСТЬ СО СТАРЫМ HTML ==========
// Эти функции поддерживают старый HTML, но используют новый движок

/**
 * Добавить игрока (старое имя функции для HTML)
 */
function addP() {
    if (!window.gameEngine && typeof GameEngine !== 'undefined') {
        window.gameEngine = new GameEngine();
    }

    gameEngine.addPlayer();
    window.ps = gameEngine.players;
    UIManager.renderPlayerSetup();
    UIManager.updateHeader(1);
}

/**
 * Удалить игрока (старое имя функции для HTML)
 */
function delP(index) {
    gameEngine.removePlayer(index);
    window.ps = gameEngine.players;
    UIManager.renderPlayerSetup();
    UIManager.updateHeader(1);
}

/**
 * Перейти на экран (старое имя функции для HTML)
 */
function go(screenNum) {
    if (isRapidRepeatTap(`go-${screenNum}`)) return;
    UIManager.showScreen(screenNum);
}

function toggleGuide() {
    UIManager.toggleGuide();
}

function refreshRoleRecommendation() {
    window.roleRecommendationOffset = (window.roleRecommendationOffset || 0) + 1;
    UIManager.renderRoleConfig();
}

function applyRoleRecommendation() {
    const recommendationPack = gameEngine.getRoleRecommendations(window.roleRecommendationOffset || 0);
    if (!recommendationPack || !recommendationPack.recommended) {
        alert('Сейчас не удалось подобрать валидную рекомендацию для этого стола.');
        return;
    }

    gameEngine.applyRoleConfig(recommendationPack.recommended.config);
    UIManager.renderRoleConfig();
}

function switchGuideTab(tabName) {
    UIManager.switchGuideTab(tabName);
}

function openFeedbackOverlay() {
    const overlay = document.getElementById('feedback-overlay');
    if (overlay) overlay.style.display = 'block';
}

function closeFeedback() {
    const overlay = document.getElementById('feedback-overlay');
    const praiseForm = document.getElementById('feedback-praise-form');
    const roastForm = document.getElementById('feedback-roast-form');
    const result = document.getElementById('feedback-result');
    const praiseInput = document.getElementById('feedback-input');
    const roastInput = document.getElementById('feedback-roast-input');

    if (overlay) overlay.style.display = 'none';
    if (praiseForm) praiseForm.style.display = 'flex';
    if (roastForm) roastForm.style.display = 'none';
    if (result) result.style.display = 'none';
    if (praiseInput) praiseInput.value = '';
    if (roastInput) roastInput.value = '';
}

function openPraiseFlow() {
    const title = document.getElementById('feedback-title');
    const subtitle = document.getElementById('feedback-subtitle');
    const praiseForm = document.getElementById('feedback-praise-form');
    const roastForm = document.getElementById('feedback-roast-form');
    const result = document.getElementById('feedback-result');
    const input = document.getElementById('feedback-input');

    if (title) title.innerText = 'Давай, хвали меня';
    if (subtitle) subtitle.innerText = 'Пиши красиво. Автору это жизненно необходимо.';
    if (praiseForm) praiseForm.style.display = 'flex';
    if (roastForm) roastForm.style.display = 'none';
    if (result) result.style.display = 'none';
    if (input) {
        input.value = '';
        input.focus();
    }

    openFeedbackOverlay();
}

function submitPraise() {
    const input = document.getElementById('feedback-input');
    const value = input ? String(input.value || '').trim() : '';

    if (!value) {
        alert('Сначала напиши хоть пару слов. Пустую лесть не принимаем.');
        return;
    }

    const title = document.getElementById('feedback-title');
    const form = document.getElementById('feedback-praise-form');
    const result = document.getElementById('feedback-result');
    const image = document.getElementById('feedback-image');
    const text = document.getElementById('feedback-result-text');

    if (title) title.innerText = 'Похвала принята';
    if (image) image.src = 'https://images.cybersport.ru/images/as-is/plain/78/7827588e-fcd6-4d20-aa1e-26b4e2355859.jpg@jpg';
    if (text) text.innerText = 'Сообщение отправлено автору через спутник, черную дыру и отдел лести. Тебе +1 к карме и +10 к вкусу.';
    if (form) form.style.display = 'none';
    if (result) result.style.display = 'flex';
}

function openRoastFlow() {
    const title = document.getElementById('feedback-title');
    const subtitle = document.getElementById('feedback-roast-subtitle');
    const praiseForm = document.getElementById('feedback-praise-form');
    const roastForm = document.getElementById('feedback-roast-form');
    const result = document.getElementById('feedback-result');
    const input = document.getElementById('feedback-roast-input');

    if (title) title.innerText = 'Ну давай, ругай';
    if (subtitle) subtitle.innerText = 'Излей душу. Это безопасно для тебя и почти безопасно для автора.';
    if (praiseForm) praiseForm.style.display = 'none';
    if (roastForm) roastForm.style.display = 'flex';
    if (result) result.style.display = 'none';
    if (input) {
        input.value = '';
        input.focus();
    }

    openFeedbackOverlay();
}

function submitRoast() {
    const input = document.getElementById('feedback-roast-input');
    const value = input ? String(input.value || '').trim() : '';

    if (!value) {
        alert('Сначала напиши, что тебя бесит. Иначе ругань не засчитывается.');
        return;
    }

    const title = document.getElementById('feedback-title');
    const roastForm = document.getElementById('feedback-roast-form');
    const result = document.getElementById('feedback-result');
    const image = document.getElementById('feedback-image');
    const text = document.getElementById('feedback-result-text');

    if (title) title.innerText = 'Жалоба принята к несерьезному рассмотрению';
    if (image) image.src = 'https://otvet.imgsmail.ru/download/296144656_6f2cda2880957f486a71b8c11797a425.jpg';
    if (text) text.innerText = 'Ты же не думал, что жалоба реально дойдет? Мы красиво упаковали ее и отправили в папку «поныть и выдохнуть».';
    if (roastForm) roastForm.style.display = 'none';
    if (result) result.style.display = 'flex';
}

function getRoleAssignmentIntro(roleName) {
    const roleInfo = ConfigUtils.getRoleInfo(roleName);
    const roleLabel = '<b>' + roleInfo.displayName + '</b>';

    const passiveRoleIntro = {
        Lucky: `${roleInfo.emoji} На очереди ${roleLabel}. Эта роль ночных целей не выбирает, но однажды может пережить смертельный удар.`
    };

    if (passiveRoleIntro[roleName]) {
        return passiveRoleIntro[roleName];
    }

    if (roleInfo.temperament) {
        const msg = ConfigUtils.getRandomPhrase('nightStart', null, {
            role: roleLabel,
            roleType: roleInfo.temperament
        });
        if (msg) return msg;
    }

    return `${roleInfo.emoji} Назначаем роль ${roleLabel}.`;
}

/**
 * Проверить конфигурацию ролей и начать распределение (старое имя)
 */
function checkR() {
    if (isRapidRepeatTap('checkR')) return;
    console.log('Starting role check with:', {
        playersCount: gameEngine.players.length,
        roleConfig: gameEngine.roleConfig
    });
    if (!gameEngine.isRoleConfigValid()) {
        alert("Состав сломан: нужна минимум 1 Мафия и 1 Мирный, Босс только один, а Любовница без Детектива не играет.");
        return;
    }

    const configuredRoles = Object.keys(gameEngine.roleConfig)
        .filter(role => (gameEngine.roleConfig[role] || 0) > 0);

    const orderedNightRoles = GAME_CONFIG.NIGHT_ROLE_ORDER.filter(role => configuredRoles.includes(role));
    const remainingRoles = configuredRoles.filter(
        role => role !== 'Lucky' && !orderedNightRoles.includes(role)
    );
    const luckyLast = configuredRoles.includes('Lucky') ? ['Lucky'] : [];

    window.roleAssignmentOrder = [...orderedNightRoles, ...remainingRoles, ...luckyLast];

    gameEngine.activeNightRoles = ConfigUtils.getActiveNightRoles(gameEngine.roleConfig);
    gameEngine.currentNightRoleIndex = 0;
    gameEngine.players.forEach((p, idx) => {
        if (!p.name || !String(p.name).trim()) {
            p.name = `Игрок ${idx + 1}`;
        }
        p.role = 'Citizen';
        p.isEliminated = false;
        p.voteCount = 0;
    });

    const firstRole = window.roleAssignmentOrder[0];
    if (!firstRole) {
        alert('Не выбрана ни одна спецроль. С таким набором шоу не запустится.');
        return;
    }
    const msg = getRoleAssignmentIntro(firstRole);

    UIManager.showMessage("Раздача ролей 🌙", msg, () => UIManager.showScreen(3));
}

/**
 * Установить роль игроку (старое имя)
 */
function setRole(playerIdx, roleName) {
    const player = gameEngine.players[playerIdx];
    const requiredCount = gameEngine.roleConfig[roleName];
    const currentCount = gameEngine.players.filter(p => p.role === roleName).length;

    if (player.role === roleName) {
        player.role = 'Citizen';
    } else {
        if (currentCount < requiredCount) {
            if (requiredCount === 1) {
                gameEngine.players.forEach(p => {
                    if (p.role === roleName) p.role = 'Citizen';
                });
            }
            player.role = roleName;
        }
    }

    UIManager.renderRoleDistribution();
}

/**
 * Подтвердить распределение роли (старое имя)
 */
function nextRS() {
    if (isRapidRepeatTap('nextRS')) return;
    const currentRole = window.roleAssignmentOrder[gameEngine.currentNightRoleIndex];
    if (!currentRole) return;

    const count = gameEngine.players.filter(p => p.role === currentRole).length;
    const required = gameEngine.roleConfig[currentRole];

    if (count !== required) {
        alert(`Назначь всех: ${ConfigUtils.getRoleInfo(currentRole).displayName}. Недокомплект не принимается.`);
        return;
    }

    gameEngine.currentNightRoleIndex++;

    if (gameEngine.currentNightRoleIndex >= window.roleAssignmentOrder.length) {
        UIManager.showMessage(
            "Роли выданы ✅",
            "Все игроки получили роли. Начинается ночь знакомства: ведущий знакомится с ночными ролями и их порядком хода.",
            () => startFirstDay()
        );
    } else {
        const nextRole = window.roleAssignmentOrder[gameEngine.currentNightRoleIndex];
        const msg = getRoleAssignmentIntro(nextRole);

        UIManager.showMessage(
            `${ConfigUtils.getRoleInfo(currentRole).displayName} уходит в тень 💤`,
            msg,
            () => UIManager.renderRoleDistribution()
        );
    }
}

/**
 * Кликнуть на игрока (выбрать для ночного действия)
 */
function clickP(i) {
    window.selId = (window.selId === i) ? null : i;
    UIManager.renderGameScreen();
}

/**
 * Проголосовать в дневной фазе
 */
function vote(playerIdx, direction) {
    gameEngine.vote(playerIdx, direction);
    UIManager.renderGameScreen();
}

/**
 * Начать первый день
 */
function startFirstDay() {
    gameEngine.startFirstDay();
    UIManager.showScreen(4);
}

/**
 * Начать ночь
 */
function startNight() {
    if (isRapidRepeatTap('startNight')) return;
    const result = gameEngine.startNight();
    const firstRole = result.currentRole;
    
    if (firstRole) {
        const roleInfo = ConfigUtils.getRoleInfo(firstRole);
        const rolePrompt = ConfigUtils.getRandomPhrase('rolePrompts', null, { role: firstRole });
        const msg = ConfigUtils.getRandomPhrase('nightStart', null, {
            role: '<b>' + roleInfo.displayName + '</b>',
            roleType: roleInfo.temperament
        });

        UIManager.showMessage(
            `Ночь ${gameEngine.currentNight} 🌙`,
            `${msg}<br><br>${rolePrompt}`,
            () => UIManager.renderGameScreen()
        );
    }
}

/**
 * Основной обработчик действий (ночных и дневных)
 * Это основная функция, которая вызывается из HTML
 */
function doAction(targetId) {
    if (isRapidRepeatTap(`doAction-${gameEngine.isDay ? 'day' : 'night'}`)) return;
    // Если это дневная фаза
    if (gameEngine.isDay) {
        // Дневное голосование
        const tV = Object.values(gameEngine.dayVotes).reduce((a, b) => a + b, 0);
        
        if (tV === 0 && gameEngine.tiedPlayers.length === 0) {
            // Пропустить, если никто не голосовал
            if (confirm("Голоса нулевые. Никого не трогаем и валим в ночь?")) {
                UIManager.showMessage("Наступает ночь", "Толпа устала, палач в пролете.", () => startNight());
            }
            return;
        }

        // Провести голосование
        const result = gameEngine.castVote();

        if (result.phase === 'WIN') {
            UIManager.showMessage("Финал 🏆", result.message, () => UIManager.showScreen(5));
        } else if (result.phase === 'EXILE') {
            const victimIdx = result.exiled;
            UIManager.showMessage(
                "Приговор исполнен",
                result.message,
                () => {
                    const winCheck = gameEngine.checkWinCondition();
                    if (winCheck) {
                        UIManager.showMessage("Финал 🏆", winCheck.message, () => UIManager.showScreen(5));
                    } else {
                        startNight();
                    }
                }
            );
        } else if (result.phase === 'FIRST_TIE') {
            gameEngine.tiedPlayers = result.tiedPlayers;
            UIManager.showMessage("Ничья", result.message, () => UIManager.renderGameScreen());
        } else if (result.phase === 'SECOND_TIE') {
            UIManager.showMessage("Ничья", result.message, () => startNight());
        } else if (result.phase === 'NO_EXILE') {
            UIManager.showNoExileConfirmation(result.message);
        }
    } else {
        // Ночное действие
        const currentRole = gameEngine.getCurrentNightRole();
        const currentRoleInfo = ConfigUtils.getRoleInfo(currentRole);
        
        if (targetId === null) {
            if (currentRoleInfo.canSkip === false) {
                UIManager.showMessage(
                    "Пропуск запрещен",
                    `${currentRoleInfo.displayName} обязан(а) сделать ход. Выбери цель.`,
                    () => UIManager.renderGameScreen()
                );
                return;
            }

            // Пропустить
            const skipMsg = ConfigUtils.getRandomPhrase('confirmSkip', null, {
                role: currentRoleInfo.displayName
            });

            if (!confirm(skipMsg)) return;

            const skipResult = gameEngine.skipNightAction();
            if (skipResult?.error) {
                UIManager.showMessage("Ход сорван", skipResult.error, () => UIManager.renderGameScreen());
                return;
            }
            window.selId = null;
        } else {
            // Выбрать цель
            const result = gameEngine.submitNightAction(targetId);
            window.selId = null;
            
            if (!result) return;
            
            if (result.error) {
                alert(result.error);
                return;
            }
            
            if (result.phase === 'END_NIGHT') {
                UIManager.showMessage(
                    `${currentRoleInfo.displayName} уходит в тень 💤`,
                    "Ночная смена завершена. Наступает день.",
                    () => UIManager.endNightPhase()
                );
                return;
            } else if (result.currentRole) {
                const nextRole = result.currentRole;
                const nextRoleInfo = ConfigUtils.getRoleInfo(nextRole);
                const rolePrompt = ConfigUtils.getRandomPhrase('rolePrompts', null, { role: nextRole });
                
                UIManager.showMessage(
                    `${currentRoleInfo.displayName} уходит в тень 💤`,
                    `${ConfigUtils.getRandomPhrase('nightStart', null, {
                        role: '<b>' + nextRoleInfo.displayName + '</b>',
                        roleType: nextRoleInfo.temperament
                    })}<br><br>${rolePrompt}`,
                    () => UIManager.renderGameScreen()
                );
            }
        }

        UIManager.renderGameScreen();
    }
}

// ========== ОБЩИЕ УПРАВЛЕНИЯ ==========

/**
 * Переключить видимость лога
 */
function toggleLog() {
    UIManager.toggleLog();
}

function exportLogsTxt() {
    UIManager.exportLogsTxt();
}

/**
 * Подтвердить сброс игры
 */
function confirmReset() {
    if (isRapidRepeatTap('confirmReset')) return;
    if (confirm("Обнулить весь бардак и начать заново?")) {
        location.reload();
    }
}

/**
 * Закрыть модальное сообщение
 */
function closeMsg() {
    UIManager.closeMessage();
}

/**
 * Подтвердить переход к ночи после дня без изгнания
 */
function confirmNoExileToNight() {
    if (isRapidRepeatTap('confirmNoExileToNight')) return;
    startNight();
}

// ========== ОТЛАДКА ==========

/**
 * Вывести состояние игры в консоль
 */
function debugGameState() {
    console.log('🎮 Game State:', gameEngine.getGameState());
    console.log('📋 Game Log:', gameEngine.getLog());
}

// Явно экспортируем callbacks для inline-onclick в HTML.
window.addP = addP;
window.delP = delP;
window.go = go;
window.checkR = checkR;
window.setRole = setRole;
window.nextRS = nextRS;
window.clickP = clickP;
window.vote = vote;
window.startFirstDay = startFirstDay;
window.startNight = startNight;
window.doAction = doAction;
window.toggleLog = toggleLog;
window.exportLogsTxt = exportLogsTxt;
window.confirmReset = confirmReset;
window.closeMsg = closeMsg;
window.confirmNoExileToNight = confirmNoExileToNight;
window.openPraiseFlow = openPraiseFlow;
window.openRoastFlow = openRoastFlow;
window.submitPraise = submitPraise;
window.submitRoast = submitRoast;
window.closeFeedback = closeFeedback;
window.refreshRoleRecommendation = refreshRoleRecommendation;
window.applyRoleRecommendation = applyRoleRecommendation;

