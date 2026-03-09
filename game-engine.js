/**
 * ИГРОВОЙ ДВИЖОК (Game Engine)
 * 
 * Управляет состоянием игры и всеми переходами между фазами
 * Полностью отделен от UI - это чистая бизнес-логика
 * 
 * Преимущества:
 * - Легко тестировать
 * - Легко добавлять новые правила
 * - Полная история игры в логах
 * - Независимость от интерфейса
 */

class GameEngine {
    constructor() {
        this.reset();
    }

    /**
     * Инициализировать новую игру
     */
    reset() {
        if (typeof ConfigUtils !== 'undefined' && typeof ConfigUtils.resetPhraseHistory === 'function') {
            ConfigUtils.resetPhraseHistory();
        }

        this.players = [];
        this.roleConfig = { ...GAME_CONFIG.DEFAULT_ROLE_CONFIG };
        this.currentNight = 0;
        this.isDay = false;
        this.currentNightRoleIndex = 0;
        this.activeNightRoles = [];
        this.nightActions = {};
        this.selectedPlayerId = null;
        this.dayVotes = {};
        this.tiedPlayers = [];
        this.gameLog = [];
        this.morningReport = "";
        this.winner = null;
        this.roleStates = {};  // Для хранения состояния каждой роли (например, последняя цель Доктора)
    }

    // ========== УПРАВЛЕНИЕ ИГРОКАМИ ==========

    /**
     * Добавить игрока
     */
    addPlayer(name = '') {
        this.players.push({
            id: this.players.length,
            name: name || '',
            role: 'Citizen',
            isEliminated: false,
            voteCount: 0
        });
        return this.players[this.players.length - 1];
    }

    /**
     * Удалить игрока
     */
    removePlayer(id) {
        const player = this.players[id];
        if (player) {
            this.players.splice(id, 1);
        }
    }

    /**
     * Переименовать игрока
     */
    renamePlayer(id, newName) {
        if (this.players[id]) {
            this.players[id].name = newName;
        }
    }

    /**
     * Получить имя игрока
     */
    getPlayerName(id) {
        return this.players[id]?.name || `Игрок ${id + 1}`;
    }

    /**
     * Получить кол-во живых игроков
     */
    getAlivePlayers() {
        return this.players.filter(p => !p.isEliminated);
    }

    /**
     * Проверить валидность конфигурации ролей
     */
    isRoleConfigValid() {
        const totalRoles = Object.values(this.roleConfig).reduce((a, b) => a + b, 0);
        const mafiaCount = this.roleConfig.Mafia || 0;
        const mafiaBossCount = this.roleConfig.MafiaBoss || 0;
        const detectiveCount = this.roleConfig.Detective || 0;
        const mistressCount = this.roleConfig.Mistress || 0;
        const citizensCount = this.players.length - totalRoles;
        const mistressDependencyValid = mistressCount === 0 || detectiveCount > 0;
        const isValid = totalRoles > 0 && totalRoles < this.players.length && mafiaCount >= 1 && citizensCount >= 1 && mafiaBossCount <= 1 && mistressDependencyValid;

        console.log('Role config validation:', {
            roleConfig: this.roleConfig,
            totalRoles: totalRoles,
            playersCount: this.players.length,
            mafiaCount,
            mafiaBossCount,
            detectiveCount,
            mistressCount,
            citizensCount,
            mistressDependencyValid,
            isValid
        });
        return isValid;
    }

    /**
     * Максимально допустимое количество конкретной роли
     * с учетом текущего числа игроков и остальных ролей.
     */
    getMaxAllowedRoleCount(role) {
        if (!GAME_CONFIG.ROLES[role]) return 0;

        const playersCount = this.players.length;
        if (playersCount <= 0) return 0;

        const totalOtherRoles = Object.keys(this.roleConfig)
            .filter(r => r !== role)
            .reduce((sum, r) => sum + (this.roleConfig[r] || 0), 0);

        // Должен остаться минимум один мирный.
        const byCitizensRule = Math.max(0, (playersCount - 1) - totalOtherRoles);

        let maxAllowed = byCitizensRule;

        if (role === 'MafiaBoss') {
            maxAllowed = Math.min(maxAllowed, 1);
        }

        // Любовница доступна только если есть Детектив.
        if (role === 'Mistress' && (this.roleConfig.Detective || 0) <= 0) {
            maxAllowed = 0;
        }

        return Math.max(0, maxAllowed);
    }

    // ========== РАСПРЕДЕЛЕНИЕ РОЛЕЙ ==========

    /**
     * Раздать роли игрокам
     */
    distributeRoles(roleAssignments) {
        // roleAssignments: массив { playerId, role }
        this.players.forEach(p => p.role = 'Citizen');
        
        roleAssignments.forEach(assignment => {
            if (this.players[assignment.playerId]) {
                this.players[assignment.playerId].role = assignment.role;
            }
        });

        this.activeNightRoles = ConfigUtils.getActiveNightRoles(this.roleConfig);
    }

    /**
     * Изменить кол-во роли в конфигурации
     */
    setRoleCount(role, count) {
        if (GAME_CONFIG.ROLES[role]) {
            const baseNormalized = role === 'MafiaBoss'
                ? Math.min(1, Math.max(0, count))
                : Math.max(0, count);

            const maxAllowed = this.getMaxAllowedRoleCount(role);
            const normalizedCount = Math.min(baseNormalized, maxAllowed);

            this.roleConfig[role] = normalizedCount;

            // Если Детектива стало 0, Любовница автоматически снимается.
            if (role === 'Detective' && normalizedCount === 0 && (this.roleConfig.Mistress || 0) > 0) {
                this.roleConfig.Mistress = 0;
            }
        }
    }

    // ========== ФАЗЫ ИГРЫ ==========

    /**
     * Начать первый день (представление ролей)
     */
    startFirstDay() {
        this.isDay = true;
        this.currentNight = 1;
        this.morningReport = "Город проснулся. Все живы. Ненадолго.";
        this.activeNightRoles = ConfigUtils.getActiveNightRoles(this.roleConfig);

        this.log(this.getSetupSummaryHtml());
        this.log(`<span class="log-day">--- ДЕНЬ 1: ДЕНЬ ЗНАКОМСТВА ---</span>`);
        this.log("📢 Ведущий открыл игру. Маски на местах");
        
        return {
            phase: 'DAY',
            night: this.currentNight,
            isFirstDay: true,
            message: "Город проснулся. Пусть прикинут, кто кого переживет."
        };
    }

    /**
     * Начать ночь
     */
    startNight() {
        this.isDay = false;
        this.currentNightRoleIndex = 0;
        this.nightActions = {};
        this.selectedPlayerId = null;

        // Защита действует только в пределах одной ночи.
        if (this.roleStates.Doctor) {
            this.roleStates.Doctor.protected = null;
        }

        if (this.roleStates.Bodyguard) {
            this.roleStates.Bodyguard.protected = null;
        }

        if (this.roleStates.Mistress) {
            this.roleStates.Mistress.target = null;
        }
        
        // Обновить активные ночные роли по фактически живым ролям в текущей партии.
        // Это защищает от рассинхронизации roleConfig и реального распределения.
        const aliveNightRoles = new Set(
            this.players
                .filter(player => !player.isEliminated && GAME_CONFIG.ROLES[player.role]?.isNightRole)
                .map(player => player.role)
        );
        this.activeNightRoles = GAME_CONFIG.NIGHT_ROLE_ORDER.filter(role => aliveNightRoles.has(role));

        // Любовница ходит только если в живых есть Детектив.
        const aliveDetectiveCount = this.getAlivePlayersWithRole('Detective').length;
        if (aliveDetectiveCount === 0) {
            this.activeNightRoles = this.activeNightRoles.filter(role => role !== 'Mistress');
        }

        // Если обычной мафии не осталось, но жив Босс - Босс берет ночной выстрел.
        const aliveMafiaCount = this.getAlivePlayersWithRole('Mafia').length;
        const aliveBossCount = this.getAlivePlayersWithRole('MafiaBoss').length;
        if (aliveMafiaCount > 0) {
            this.activeNightRoles = this.activeNightRoles.filter(role => role !== 'MafiaBoss');
        } else if (aliveBossCount > 0 && !this.activeNightRoles.includes('MafiaBoss')) {
            this.activeNightRoles.push('MafiaBoss');
        }

        this.activeNightRoles.sort((a, b) => GAME_CONFIG.NIGHT_ROLE_ORDER.indexOf(a) - GAME_CONFIG.NIGHT_ROLE_ORDER.indexOf(b));
        
        this.log(`<span class="log-night">--- НОЧЬ ${this.currentNight} ---</span>`);
        
        return {
            phase: 'NIGHT',
            night: this.currentNight,
            currentRole: this.getCurrentNightRole(),
            message: `Ночь ${this.currentNight}`
        };
    }

    /**
     * Получить текущую ночную роль
     */
    getCurrentNightRole() {
        return this.activeNightRoles[this.currentNightRoleIndex] || null;
    }

    /**
     * Получить всех живых игроков, которые еще имеют текущую роль
     */
    getAlivePlayersWithRole(role) {
        return this.players.filter(p => p.role === role && !p.isEliminated);
    }

    // ========== НОЧНЫЕ ДЕЙСТВИЯ ==========

    /**
     * Выполнить ночное действие для текущей роли
     */
    submitNightAction(playerTarget = null) {
        const currentRole = this.getCurrentNightRole();
        if (!currentRole) return null;

        if (playerTarget !== null) {
            // Проверить, может ли цель быть выбрана
            if (!RoleUtils.canSelectTarget(currentRole, playerTarget, this)) {
                return { error: "Эту цель выбрать нельзя" };
            }

            // Выполнить действие роли
            const result = RoleUtils.executeNightAction(currentRole, playerTarget, this);
            this.nightActions[currentRole] = result;
            this.log(result.message);
        }

        // Перейти к следующей роли
        this.currentNightRoleIndex++;
        
        if (this.currentNightRoleIndex >= this.activeNightRoles.length) {
            // Ночь закончилась
            return { phase: 'END_NIGHT', nextPhase: 'PROCESS_NIGHT' };
        }

        return {
            phase: 'NIGHT',
            currentRole: this.getCurrentNightRole(),
            roleIndex: this.currentNightRoleIndex
        };
    }

    /**
     * Пропустить ночное действие
     */
    skipNightAction() {
        const currentRole = this.getCurrentNightRole();
        if (!currentRole) return null;

        const roleInfo = ConfigUtils.getRoleInfo(currentRole);
        if (roleInfo && roleInfo.canSkip === false) {
            return { error: `Роль ${roleInfo.displayName} не имеет права пропускать ход` };
        }

        // Пропуск доктора снимает ночную защиту и сбрасывает запрет "подряд".
        if (currentRole === 'Doctor') {
            this.roleStates.Doctor = this.roleStates.Doctor || {};
            this.roleStates.Doctor.protected = null;
            this.roleStates.Doctor.lastTarget = null;
        }

        this.nightActions[currentRole] = {
            type: 'SKIP',
            message: `💤 ${ConfigUtils.getRoleInfo(currentRole).displayName} пропустила ход`
        };
        this.log(this.nightActions[currentRole].message);

        this.currentNightRoleIndex++;
        
        if (this.currentNightRoleIndex >= this.activeNightRoles.length) {
            return { phase: 'END_NIGHT', nextPhase: 'PROCESS_NIGHT' };
        }

        return {
            phase: 'NIGHT',
            currentRole: this.getCurrentNightRole()
        };
    }

    /**
     * Обработать результаты ночи (смерти, информация детективу)
     */
    processNight() {
        const attacks = [];
        const doctorProtected = this.roleStates.Doctor ? this.roleStates.Doctor.protected : null;
        const bodyguardProtected = this.roleStates.Bodyguard ? this.roleStates.Bodyguard.protected : null;
        const nightReasons = [];

        let aliveBodyguardIdx = -1;
        for (let i = 0; i < this.players.length; i++) {
            if (this.players[i].role === 'Bodyguard' && !this.players[i].isEliminated) {
                aliveBodyguardIdx = i;
                break;
            }
        }

        // Собрать все ночные атаки
        const attackRoles = ['Mafia', 'MafiaBoss', 'Maniac'];
        for (let i = 0; i < attackRoles.length; i++) {
            const role = attackRoles[i];
            const action = this.nightActions[role];
            if (action && action.target !== undefined && action.target !== null) {
                attacks.push({ role: role, target: action.target });
            }
        }

        // Телохранитель принимает удар на себя.
        if (aliveBodyguardIdx !== -1 && bodyguardProtected !== null && bodyguardProtected !== undefined) {
            let hasAttackOnProtected = false;
            for (let i = 0; i < attacks.length; i++) {
                if (attacks[i].target === bodyguardProtected) {
                    hasAttackOnProtected = true;
                    break;
                }
            }

            if (hasAttackOnProtected) {
                this.log(`🛡️ Телохранитель закрыл <b>${this.getPlayerName(bodyguardProtected)}</b> собой и поймал удар`);
                nightReasons.push(`Телохранитель перехватил удар по <b>${this.getPlayerName(bodyguardProtected)}</b>`);
                for (let i = 0; i < attacks.length; i++) {
                    if (attacks[i].target === bodyguardProtected) {
                        attacks[i].target = aliveBodyguardIdx;
                    }
                }
            }
        }

        // Применить защиту доктора
        const filteredAttacks = [];
        for (let i = 0; i < attacks.length; i++) {
            if (attacks[i].target !== doctorProtected) {
                filteredAttacks.push(attacks[i]);
            } else {
                nightReasons.push(`Доктор спас <b>${this.getPlayerName(doctorProtected)}</b>`);
            }
        }

        // Убить уникальные цели
        const killedMap = {};
        for (let i = 0; i < filteredAttacks.length; i++) {
            killedMap[filteredAttacks[i].target] = true;
        }

        const finalKilled = [];
        for (let idxStr in killedMap) {
            const idx = Number(idxStr);
            if (!this.players[idx]) continue;

            const player = this.players[idx];

            // Счастливчик переживает первую смертельную НОЧНУЮ атаку.
            if (player.role === 'Lucky') {
                this.roleStates.Lucky = this.roleStates.Lucky || {};
                if (!this.roleStates.Lucky.used) {
                    this.roleStates.Lucky.used = true;
                    this.log(`🍀 Счастливчик <b>${this.getPlayerName(idx)}</b> вывернулся и пережил ночной удар`);
                    nightReasons.push(`Счастливчик <b>${this.getPlayerName(idx)}</b> пережил первую смертельную атаку`);
                    continue;
                }
            }

            this.players[idx].isEliminated = true;
            this.log(`☠️ Выбыл ночью: <b>${this.getPlayerName(idx)}</b>`);
            this.handleMafiaBossTransferIfNeeded(idx);
            finalKilled.push(idx);
        }

        // Итог проверки Детектива с учетом Любовницы.
        const detectiveAction = this.nightActions.Detective;
        if (detectiveAction && detectiveAction.target !== undefined && detectiveAction.target !== null) {
            const targetIdx = detectiveAction.target;
            const target = this.players[targetIdx];
            const mistressTarget = this.roleStates.Mistress ? this.roleStates.Mistress.target : null;

            let isEvil = target.role === 'Mafia' || target.role === 'MafiaBoss' || target.role === 'Maniac';
            let falseInfoApplied = false;

            if (mistressTarget === targetIdx) {
                isEvil = !isEvil;
                falseInfoApplied = true;
            }

            this.log(`🔍 Проверка Детектива по <b>${this.getPlayerName(targetIdx)}</b>: ${isEvil ? 'ГРЯЗНЫЙ 👺' : 'ЧИСТЫЙ 😊'}`);

            if (falseInfoApplied) {
                this.log(`💋 Любовница вмешалась: ответ по <b>${this.getPlayerName(targetIdx)}</b> намеренно искажен`);
            }
        }

        // Установить отчет о утре
        if (finalKilled.length > 0) {
            const names = finalKilled.map(idx => `<b>${this.getPlayerName(idx)}</b>`).join(', ');
            this.morningReport = ConfigUtils.getRandomPhrase('morningKilled', null, { name: names });
            this.log(`🧾 Ночной итог: выбыло ${finalKilled.length}. ${names}`);
            if (nightReasons.length > 0) {
                this.log(`🧾 Дополнительно: ${nightReasons.join('; ')}`);
            }
        } else {
            this.morningReport = ConfigUtils.getRandomPhrase('morningSafe');
            if (nightReasons.length > 0) {
                this.log(`🧾 Ночной итог: никто не выбыл. Причины: ${nightReasons.join('; ')}`);
            } else {
                this.log('🧾 Ночной итог: никто не выбыл. Причины: атак не было или все действия разошлись по целям без летального исхода.');
            }
        }

        this.log(`<span class="log-day">УТРО ${this.currentNight}: ${this.morningReport}</span>`);

        this.isDay = true;
        this.dayVotes = {};
        this.tiedPlayers = [];

        return {
            phase: 'DAWN',
            killed: finalKilled,
            message: this.morningReport
        };
    }

    /**
     * Если погиб Босс мафии, роль переходит случайному живому члену мафии.
     */
    handleMafiaBossTransferIfNeeded(deadPlayerIdx) {
        const deadPlayer = this.players[deadPlayerIdx];
        if (!deadPlayer || deadPlayer.role !== 'MafiaBoss') return;

        const aliveMafia = this.players
            .map((p, idx) => ({ player: p, idx }))
            .filter(item => !item.player.isEliminated && item.player.role === 'Mafia');

        if (!aliveMafia.length) {
            this.log('🕴️ Босс пал. Передавать корону уже некому');
            return;
        }

        const successor = aliveMafia[Math.floor(Math.random() * aliveMafia.length)];
        this.players[successor.idx].role = 'MafiaBoss';
        this.log(`🕴️ Новый Босс мафии: <b>${this.getPlayerName(successor.idx)}</b>`);
    }

    // ========== ДНЕВНЫЕ ДЕЙСТВИЯ (ГОЛОСОВАНИЕ) ==========

    /**
     * Проголосовать за игрока
     */
    vote(playerIdx, voteChange) {
        const player = this.players[playerIdx];
        if (!player || player.isEliminated) return;

        // При переголосовании можно голосовать только за участников ничьи.
        if (this.tiedPlayers.length > 0 && !this.tiedPlayers.includes(playerIdx)) return;

        const votes = this.dayVotes[playerIdx] || 0;
        const totalVotes = Object.values(this.dayVotes).reduce((sum, value) => sum + value, 0);
        const maxTotalVotes = this.getAlivePlayers().length;

        if (voteChange > 0 && totalVotes >= maxTotalVotes) {
            return;
        }

        const newVotes = Math.max(0, votes + voteChange);
        
        if (newVotes > 0) {
            this.dayVotes[playerIdx] = newVotes;
        } else {
            delete this.dayVotes[playerIdx];
        }
    }

    /**
     * Провести голосование (изгнание)
     */
    castVote(playerIdx = null) {
        const alivePlayers = this.getAlivePlayers();
        const candidates = this.tiedPlayers.length > 0 
            ? alivePlayers.filter(p => this.tiedPlayers.includes(this.players.indexOf(p)))
            : alivePlayers;

        const voteSnapshot = candidates
            .map(p => ({
                idx: this.players.indexOf(p),
                votes: this.dayVotes[this.players.indexOf(p)] || 0
            }))
            .sort((a, b) => b.votes - a.votes)
            .map(item => `<b>${this.getPlayerName(item.idx)}</b>: ${item.votes}`)
            .join(', ');

        if (voteSnapshot) {
            this.log(`🗳️ Голоса дня: ${voteSnapshot}`);
        }

        if (candidates.length === 0) {
            this.log('🗳️ Голосование сорвано: не осталось кандидатов.');
            return { phase: 'NO_EXILE', message: 'Голосовать не за кого. Кандидаты закончились.' };
        }

        const maxVotes = Math.max(...candidates.map(p => this.dayVotes[this.players.indexOf(p)] || 0));

        if (maxVotes === 0) {
            this.log('🗳️ Никто не получил ни одного голоса. Изгнание не проводится.');
            return { phase: 'NO_EXILE', message: "Ноль голосов. Сегодня палач без работы." };
        }

        const leaders = candidates.filter(p => (this.dayVotes[this.players.indexOf(p)] || 0) === maxVotes);

        if (leaders.length === 1) {
            // Одна жертва
            const victim = leaders[0];
            const victimIdx = this.players.indexOf(victim);
            victim.isEliminated = true;
            this.log(`⚖️ Изгнан днем: <b>${this.getPlayerName(victimIdx)}</b> (${maxVotes} голосов)`);
            this.handleMafiaBossTransferIfNeeded(victimIdx);
            
            // Проверить победу после изгнания
            const winCondition = this.checkWinCondition();
            if (winCondition) {
                return { phase: 'WIN', ...winCondition };
            }
            
            return {
                phase: 'EXILE',
                exiled: victimIdx,
                message: `Город выпроводил <b>${this.getPlayerName(victimIdx)}</b>. Без апелляций.`
            };
        } else {
            // Ничья
            if (this.tiedPlayers.length > 0) {
                // Вторая ничья - никого не убиваем
                const tiedNames = leaders.map(p => `<b>${this.getPlayerName(this.players.indexOf(p))}</b>`).join(', ');
                this.log(`⚖️ Вторая ничья между: ${tiedNames}. Приговор сорван, город уходит в ночь`);
                return {
                    phase: 'SECOND_TIE',
                    message: "Повторная ничья. Никого не трогаем, ночь забирает смену."
                };
            } else {
                // Первая ничья
                this.tiedPlayers = leaders.map(p => this.players.indexOf(p));
                const tiedNames = leaders.map(p => `<b>${this.getPlayerName(this.players.indexOf(p))}</b>`).join(', ');
                this.log(`⚖️ Первая ничья. Переголосование между: ${tiedNames}`);
                this.dayVotes = {};
                return {
                    phase: 'FIRST_TIE',
                    message: "Ничья. Переголосование только между лидерами.",
                    tiedPlayers: this.tiedPlayers
                };
            }
        }
    }

    // ========== ПРОВЕРКА ПОБЕД ==========

    /**
     * Проверить условия побед
     */
    checkWinCondition() {
        const alivePlayers = this.getAlivePlayers();
        const mafia = alivePlayers.filter(p => p.role === 'Mafia' || p.role === 'MafiaBoss').length;
        const maniac = alivePlayers.filter(p => p.role === 'Maniac').length;
        const total = alivePlayers.length;

        // Мафия
        if (mafia > 0 && mafia >= (total - mafia - maniac)) {
            this.winner = 'Mafia';
            const msg = ConfigUtils.getRandomPhrase('winMafia');
            this.log(`🏆 <b>${msg}</b>`);
            return { winner: 'Mafia', message: msg };
        }

        // Маньяк
        if (maniac > 0 && total <= 2 && mafia === 0) {
            this.winner = 'Maniac';
            const msg = ConfigUtils.getRandomPhrase('winManiac');
            this.log(`🏆 <b>${msg}</b>`);
            return { winner: 'Maniac', message: msg };
        }

        // Граждане
        if (mafia === 0 && maniac === 0) {
            this.winner = 'Citizens';
            const msg = ConfigUtils.getRandomPhrase('winCitizen');
            this.log(`🏆 <b>${msg}</b>`);
            return { winner: 'Citizens', message: msg };
        }

        return null;
    }

    /**
     * Завершить ночь и проверить победу
     */
    endNight() {
        this.currentNight++;
        const winCondition = this.checkWinCondition();
        
        if (winCondition) {
            return { gameEnded: true, ...winCondition };
        }

        return { phase: 'DAY', night: this.currentNight };
    }

    /**
     * Попытаться изгнать игрока и проверить победу
     */
    endDay() {
        const winCondition = this.checkWinCondition();
        
        if (winCondition) {
            return { gameEnded: true, ...winCondition };
        }

        return { phase: 'NIGHT', night: this.currentNight };
    }

    // ========== ЛОГИРОВАНИЕ ==========

    getSetupSummaryHtml() {
        const roleOrder = ['MafiaBoss', 'Mafia', 'Maniac', 'Detective', 'Doctor', 'Bodyguard', 'Mistress', 'Lucky', 'Citizen'];
        const roleCounts = roleOrder
            .map(role => {
                const count = this.players.filter(p => p.role === role).length;
                if (count <= 0) return null;
                const roleInfo = ConfigUtils.getRoleInfo(role);
                return `${roleInfo.emoji} ${roleInfo.displayName}: <b>${count}</b>`;
            })
            .filter(Boolean)
            .join(' | ');

        const roster = this.players
            .map((p, idx) => {
                const roleInfo = ConfigUtils.getRoleInfo(p.role);
                return `${idx + 1}. <b>${this.getPlayerName(idx)}</b> — ${roleInfo.emoji} ${roleInfo.displayName}`;
            })
            .join('<br>');

        return `👥 Игроков: <b>${this.players.length}</b><br>🎛️ Роли: ${roleCounts}<br><br>${roster}`;
    }

    stripHtml(rawText) {
        return String(rawText || '').replace(/<[^>]*>/g, '');
    }

    /**
     * Добавить запись в лог
     */
    log(message, options = {}) {
        const scope = options.scope || 'timeline';
        this.gameLog.push({
            timestamp: new Date().toLocaleTimeString('ru-RU'),
            text: String(message),
            phase: this.isDay ? 'День' : 'Ночь',
            night: this.currentNight,
            scope
        });
    }

    /**
     * Получить весь лог
     */
    getLog() {
        return this.gameLog;
    }

    /**
     * Получить лог только по ходу партии (без технических записей).
     */
    getTimelineLog() {
        return this.gameLog.filter(item => item.scope !== 'technical');
    }

    /**
     * Подготовленный текстовый формат для будущего экспорта.
     */
    getExportLogText() {
        return this.getTimelineLog()
            .map(item => `[${item.timestamp}] ${item.phase} ${item.night || '-'}: ${this.stripHtml(item.text)}`)
            .join('\n');
    }

    /**
     * Получить состояние игры для отладки
     */
    getGameState() {
        return {
            players: this.players,
            roleConfig: this.roleConfig,
            currentNight: this.currentNight,
            isDay: this.isDay,
            currentNightRoleIndex: this.currentNightRoleIndex,
            activeNightRoles: this.activeNightRoles,
            nightActions: this.nightActions,
            winner: this.winner
        };
    }
}

// Создаем глобальный экземпляр движка
var gameEngine = new GameEngine();
window.gameEngine = gameEngine;
