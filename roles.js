/**
 * ЛОГИКА РОЛЕЙ
 * 
 * Каждая роль может иметь свою специальную логику через RoleHandler
 * Это позволяет легко добавлять новые роли и менять их поведение
 * 
 * Структура RoleHandler:
 * - canSelectTarget(target, gameState): проверить, можно ли выбрать эту цель
 * - onNightAction(target, gameState): обработать ночное действие
 * - getRestrictions(): получить ограничения роли
 */

const RoleHandlers = {
    /**
     * DOCTOR (Доктор)
     * - Может спасать одного игрока за ночь
     * - Не может спасать одного и того же два раза подряд
     */
    Doctor: {
        canSelectTarget(targetIdx, gameState) {
            const player = gameState.players[targetIdx];
            
            // Не мертв
            if (player.isEliminated) return false;
            
            // Не может спасать одного и того же два раза подряд
            if (targetIdx === gameState.roleStates.Doctor?.lastTarget) {
                return false;
            }
            
            return true;
        },

        onNightAction(targetIdx, gameState) {
            gameState.roleStates.Doctor = gameState.roleStates.Doctor || {};
            gameState.roleStates.Doctor.lastTarget = targetIdx;
            gameState.roleStates.Doctor.protected = targetIdx;
            
            return {
                type: 'DOCTOR_ACTION',
                target: targetIdx,
                message: `💊 Доктор возился с: <b>${gameState.getPlayerName(targetIdx)}</b>`
            };
        },

        getRestrictions() {
            return { preventConsecutive: true };
        }
    },

    /**
     * CITIZEN (Мирный)
     * - Никаких действий
     */
    Citizen: {
        canSelectTarget(targetIdx, gameState) {
            return false; // Мирные не выбирают цели
        },

        onNightAction(targetIdx, gameState) {
            return {
                type: 'CITIZEN_ACTION',
                message: `😊 Мирный спал спокойно`
            };
        },

        getRestrictions() {
            return {};
        }
    },

    /**
     * MAFIA (Мафия)
     * - Может убивать одного игрока за ночь
     * - Может пропустить
     */
    Mafia: {
        canSelectTarget(targetIdx, gameState) {
            const player = gameState.players[targetIdx];
            
            // Не мертв
            if (player.isEliminated) return false;
            
            return true;
        },

        onNightAction(targetIdx, gameState) {
            gameState.roleStates.Mafia = gameState.roleStates.Mafia || {};
            gameState.roleStates.Mafia.target = targetIdx;
            
            return {
                type: 'MAFIA_ACTION',
                target: targetIdx,
                message: `👺 Мафия целилась в: <b>${gameState.getPlayerName(targetIdx)}</b>`
            };
        },

        getRestrictions() {
            return {};
        }
    },

    /**
     * MAFIA BOSS (Босс мафии)
     * - Может выполнить убийство, если обычной мафии не осталось
     */
    MafiaBoss: {
        canSelectTarget(targetIdx, gameState) {
            const player = gameState.players[targetIdx];
            return !!player && !player.isEliminated;
        },

        onNightAction(targetIdx, gameState) {
            gameState.roleStates.MafiaBoss = gameState.roleStates.MafiaBoss || {};
            gameState.roleStates.MafiaBoss.target = targetIdx;

            return {
                type: 'MAFIA_BOSS_ACTION',
                target: targetIdx,
                message: `🕴️ Босс мафии выбрал цель: <b>${gameState.getPlayerName(targetIdx)}</b>`
            };
        },

        getRestrictions() {
            return {};
        }
    },

    /**
     * DETECTIVE (Детектив)
     * - Может проверять одного игрока за ночь
     * - Узнает, мафия они или нет
     * - Не может проверять одного и того же два раза
     */
    Detective: {
        canSelectTarget(targetIdx, gameState) {
            const player = gameState.players[targetIdx];
            
            // Не мертв
            if (player.isEliminated) return false;
            
            // Не может проверять себя
            const detective = gameState.players.find(p => p.role === 'Detective' && !p.isEliminated);
            if (detective && gameState.players.indexOf(detective) === targetIdx) {
                return false;
            }
            
            // Не может проверять одного и того же
            if (gameState.roleStates.Detective?.checkedPlayers?.includes(targetIdx)) {
                return false;
            }
            
            return true;
        },

        onNightAction(targetIdx, gameState) {
            gameState.roleStates.Detective = gameState.roleStates.Detective || {};
            gameState.roleStates.Detective.checkedPlayers = 
                gameState.roleStates.Detective.checkedPlayers || [];
            
            if (!gameState.roleStates.Detective.checkedPlayers.includes(targetIdx)) {
                gameState.roleStates.Detective.checkedPlayers.push(targetIdx);
            }
            
            return {
                type: 'DETECTIVE_ACTION',
                target: targetIdx,
                message: `🔍 Детектив изучал досье на: <b>${gameState.getPlayerName(targetIdx)}</b>`
            };
        },

        getRestrictions() {
            return { preventSameTwice: true };
        }
    },

    /**
     * BODYGUARD (Телохранитель)
     * - Выбирает цель для защиты
     * - Не может защищать себя
     */
    Bodyguard: {
        canSelectTarget(targetIdx, gameState) {
            const player = gameState.players[targetIdx];
            if (player.isEliminated) return false;

            const myIdx = gameState.players.findIndex(p => p.role === 'Bodyguard' && !p.isEliminated);
            if (myIdx === targetIdx) return false;

            return true;
        },

        onNightAction(targetIdx, gameState) {
            gameState.roleStates.Bodyguard = gameState.roleStates.Bodyguard || {};
            gameState.roleStates.Bodyguard.protected = targetIdx;

            return {
                type: 'BODYGUARD_ACTION',
                target: targetIdx,
                message: `🛡️ Телохранитель прикрывает: <b>${gameState.getPlayerName(targetIdx)}</b>`
            };
        },

        getRestrictions() {
            return { noSelfProtect: true };
        }
    },

    /**
     * LUCKY (Счастливчик)
     * - Пассивная роль: один раз выживает при ночной атаке
     */
    Lucky: {
        canSelectTarget() {
            return false;
        },

        onNightAction(targetIdx, gameState) {
            return {
                type: 'NO_ACTION',
                message: '🍀 Счастливчик надеется на удачу'
            };
        },

        getRestrictions() {
            return {};
        }
    },

    /**
     * MISTRESS (Любовница)
     * - Выбирает цель
     * - Если цель проверяет Детектив, ответ должен быть ложным
     */
    Mistress: {
        canSelectTarget(targetIdx, gameState) {
            const player = gameState.players[targetIdx];
            return !player.isEliminated;
        },

        onNightAction(targetIdx, gameState) {
            gameState.roleStates.Mistress = gameState.roleStates.Mistress || {};
            gameState.roleStates.Mistress.target = targetIdx;

            return {
                type: 'MISTRESS_ACTION',
                target: targetIdx,
                message: `💋 Любовница выбрала цель: <b>${gameState.getPlayerName(targetIdx)}</b>`
            };
        },

        getRestrictions() {
            return {};
        }
    },

    /**
     * MANIAC (Маньяк)
     * - Может убивать одного игрока за ночь
     * - Не может пропускать
     * - Может убивать своих
     */
    Maniac: {
        canSelectTarget(targetIdx, gameState) {
            const player = gameState.players[targetIdx];
            
            // Не мертв
            if (player.isEliminated) return false;
            
            return true;
        },

        onNightAction(targetIdx, gameState) {
            gameState.roleStates.Maniac = gameState.roleStates.Maniac || {};
            gameState.roleStates.Maniac.target = targetIdx;
            
            return {
                type: 'MANIAC_ACTION',
                target: targetIdx,
                message: `🔪 Маньяк целилась в: <b>${gameState.getPlayerName(targetIdx)}</b>`
            };
        },

        getRestrictions() {
            return {};
        }
    },

    
};

/**
 * Вспомогательные функции для работы с ролями
 */
const RoleUtils = {
    /**
     * Получить обработчик роли
     */
    getHandler(roleName) {
        return RoleHandlers[roleName] || RoleHandlers.Citizen;
    },

    /**
     * Проверить, может ли роль выбирать цели
     */
    canSelectTarget(roleName, targetIdx, gameState) {
        const handler = this.getHandler(roleName);
        return handler.canSelectTarget(targetIdx, gameState);
    },

    /**
     * Выполнить ночное действие роли
     */
    executeNightAction(roleName, targetIdx, gameState) {
        const handler = this.getHandler(roleName);
        return handler.onNightAction(targetIdx, gameState);
    },

    /**
     * Получить ограничения роли
     */
    getRestrictions(roleName) {
        const handler = this.getHandler(roleName);
        return handler.getRestrictions();
    },

    /**
     * Определить сторону (alignment) роли для проверки побед
     */
    getAlignment(roleName) {
        const roleInfo = ConfigUtils.getRoleInfo(roleName);
        return roleInfo?.alignment || 'neutral';
    }
};

// Явно публикуем роли в window для стабильной работы между скриптами.
window.RoleHandlers = RoleHandlers;
window.RoleUtils = RoleUtils;
