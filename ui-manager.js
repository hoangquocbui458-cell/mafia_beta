/**
 * UI MANAGER (Управление интерфейсом)
 * 
 * Полностью отделен от бизнес-логики (game-engine.js)
 * Слушает события от Game Engine и обновляет интерфейс
 * 
 * Основные методы:
 * - showScreen(screenName): показать экран
 * - renderPlayerList(): отрисовать список игроков
 * - renderNightPhase(): отрисовать ночную фазу
 * - renderDayPhase(): отрисовать дневную фазу
 */

const UIManager = {
        renderLogItems(logEntries) {
            let html = '';
            let currentGroupKey = '';

            logEntries.forEach(log => {
                const phaseLabel = log.phase || 'Фаза';
                const nightValue = Number.isFinite(log.night) ? log.night : '-';
                const groupKey = `${phaseLabel}-${nightValue}`;

                if (groupKey !== currentGroupKey) {
                    html += `
                        <div class="log-group-header">
                            <span class="log-group-phase">${phaseLabel}</span>
                            <span class="log-group-night">#${nightValue}</span>
                        </div>
                    `;
                    currentGroupKey = groupKey;
                }

                const timeLabel = log.timestamp || '--:--:--';
                html += `
                    <div class="log-item">
                        <div class="log-item-meta">
                            <span class="log-time">${timeLabel}</span>
                        </div>
                        <div class="log-item-text">${log.text}</div>
                    </div>
                `;
            });

            return html;
        },

        getDisplayLog() {
            if (gameEngine && typeof gameEngine.getTimelineLog === 'function') {
                return gameEngine.getTimelineLog();
            }
            return gameEngine.getLog();
        },

        exportLogsTxt() {
            let exportText = '';

            if (gameEngine && typeof gameEngine.getExportLogText === 'function') {
                exportText = gameEngine.getExportLogText();
            } else {
                exportText = this.getDisplayLog()
                    .map(item => {
                        const plain = String(item.text || '').replace(/<[^>]*>/g, '');
                        return `[${item.timestamp || '--:--:--'}] ${item.phase || 'Фаза'} ${item.night || '-'}: ${plain}`;
                    })
                    .join('\n');
            }

            const blob = new Blob([exportText], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            const now = new Date();
            const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;

            link.href = url;
            link.download = `mafia-log-${stamp}.txt`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        },

    // ========== МОДАЛКИ И СООБЩЕНИЯ ==========

    toggleGuide() {
        const overlay = document.getElementById('guide-overlay');
        if (!overlay) return;
        const isOpen = overlay.style.display === 'block';
        overlay.style.display = isOpen ? 'none' : 'block';
        if (!isOpen) {
            this.switchGuideTab('roles');
        }
    },

    switchGuideTab(tabName) {
        const rolesPanel = document.getElementById('guide-panel-roles');
        const flowPanel = document.getElementById('guide-panel-flow');
        const rolesBtn = document.getElementById('guide-tab-roles');
        const flowBtn = document.getElementById('guide-tab-flow');

        if (!rolesPanel || !flowPanel || !rolesBtn || !flowBtn) return;

        const showFlow = tabName === 'flow';
        rolesPanel.classList.toggle('active', !showFlow);
        flowPanel.classList.toggle('active', showFlow);
        rolesBtn.classList.toggle('active', !showFlow);
        flowBtn.classList.toggle('active', showFlow);
    },

    /**
     * Показать модальное сообщение
     */
    showMessage(title, text, callback = null) {
        document.getElementById('msg-text').innerHTML = String(text);
        document.getElementById('msg-scr').style.display = 'flex';
        window.msgCallback = callback;
    },

    /**
     * Закрыть модальное сообщение
     */
    closeMessage() {
        document.getElementById('msg-scr').style.display = 'none';
        if (window.msgCallback) {
            const callback = window.msgCallback;
            window.msgCallback = null;
            callback();
        }
    },

    // ========== НАВИГАЦИЯ ПО ЭКРАНАМ ==========

    /**
     * Показать экран по номеру
     */
    showScreen(screenNum) {
        document.querySelectorAll('.s').forEach(x => x.classList.remove('a'));

        const id = 's' + screenNum;

        const target = document.getElementById(id);
        if (target) {
            target.classList.add('a');
            window.scrollTo(0, 0);
            this.updateHeader(screenNum);
            
            // Триггеры рендеринга для конкретных экранов
            if (screenNum === 3) this.renderRoleDistribution();
            else if (screenNum === 4) this.renderGameScreen();
            else if (screenNum === 5) this.renderGameEnd();
            else this.renderMainScreens(screenNum);
        }
    },

    /**
     * Обновить заголовок
     */
    updateHeader(screenNum) {
        const hdr = document.querySelector('.hdr');
        if (hdr) {
            hdr.classList.toggle('welcome-mode', screenNum === 0);
        }

        const titles = {
            0: "Главное меню",
            1: `Игроков: ${gameEngine.players.length}`,
            2: "Настройка ролей",
            3: "Раздача ролей",
            4: gameEngine.isDay 
                ? (gameEngine.currentNight === 1 ? "День знакомства" : `День ${gameEngine.currentNight}`)
                : `Ночь ${gameEngine.currentNight}`,
            5: "Финал партии",
            6: "Вердикт дня"
        };
        document.getElementById('main-title').innerText = titles[screenNum] || "";
        this.updateHeaderSummary();
    },

    /**
     * Краткое саммари по живым ролям в шапке
     */
    updateHeaderSummary() {
        const summaryEl = document.getElementById('header-summary');
        const gameScreen = document.getElementById('s4');
        const isGameScreenActive = !!(gameScreen && gameScreen.classList.contains('a'));

        if (!summaryEl || !gameEngine || !Array.isArray(gameEngine.players) || gameEngine.players.length === 0) {
            if (summaryEl) {
                summaryEl.innerHTML = '';
                summaryEl.classList.remove('visible');
            }
            return;
        }

        const shouldShow = isGameScreenActive && gameEngine.currentNight >= 1;
        if (!shouldShow) {
            summaryEl.innerHTML = '';
            summaryEl.classList.remove('visible');
            summaryEl.classList.remove('night-order-mode');
            return;
        }

        if (!gameEngine.isDay) {
            summaryEl.innerHTML = this.renderNightRoleOrder();
            summaryEl.classList.add('visible');
            summaryEl.classList.add('night-order-mode');
            return;
        }

        summaryEl.classList.remove('night-order-mode');

        const alivePlayers = gameEngine.players.filter(p => !p.isEliminated);
        const aliveByRole = {};

        alivePlayers.forEach(player => {
            const role = player.role || 'Citizen';
            aliveByRole[role] = (aliveByRole[role] || 0) + 1;
        });

        const roleOrder = ['MafiaBoss', 'Mafia', 'Maniac', 'Detective', 'Doctor', 'Bodyguard', 'Mistress', 'Lucky', 'Citizen'];
        const roleParts = roleOrder
            .filter(role => aliveByRole[role] > 0)
            .map(role => {
                const roleInfo = ConfigUtils.getRoleInfo(role);
                return `<span class="summary-chip"><span>${roleInfo.emoji} ${roleInfo.displayName}</span><strong>${aliveByRole[role]}</strong></span>`;
            });

        summaryEl.innerHTML = `<span class="summary-chip total">В игре <strong>${alivePlayers.length}</strong></span>${roleParts.join('')}`;
        summaryEl.classList.add('visible');
    },

    renderNightRoleOrder() {
        const roles = Array.isArray(gameEngine.activeNightRoles) ? gameEngine.activeNightRoles : [];
        if (roles.length === 0) {
            return '';
        }

        const currentIdx = Math.max(0, gameEngine.currentNightRoleIndex || 0);
        const chips = roles.map((role, idx) => {
            const roleInfo = ConfigUtils.getRoleInfo(role);
            let stateClass = 'upcoming';

            if (idx < currentIdx) {
                stateClass = 'done';
            } else if (idx === currentIdx) {
                stateClass = 'active';
            } else if (idx === currentIdx + 1) {
                stateClass = 'next';
            }

            return `<span class="summary-chip night-phase ${stateClass}">${roleInfo.emoji} ${roleInfo.displayName}</span>`;
        });

        const dawnStateClass = currentIdx >= roles.length ? 'active' : 'upcoming';
        chips.push(`<span class="summary-chip night-phase dawn ${dawnStateClass}">☀️ Город просыпается</span>`);

        return chips.join('<span class="summary-arrow">→</span>');
    },

    getNightRoleActorLabel(roleName) {
        // Специальная логика для мафии: если есть босс, показываем его; иначе показываем рядовую мафию
        if (roleName === 'Mafia') {
            const aliveBoss = gameEngine.players.find(p => !p.isEliminated && p.role === 'MafiaBoss');
            if (aliveBoss) {
                // Если есть живой босс, показываем его вместо рядовой мафии
                return gameEngine.getPlayerName(gameEngine.players.indexOf(aliveBoss));
            }

            // Нет босса - показываем рядовую мафию
            const actors = gameEngine.players
                .map((player, index) => ({ player, index }))
                .filter(({ player }) => !player.isEliminated && player.role === 'Mafia');

            if (actors.length === 0) {
                return 'нет активного игрока';
            }

            if (actors.length === 1) {
                return gameEngine.getPlayerName(actors[0].index);
            }

            return `${gameEngine.getPlayerName(actors[0].index)} +${actors.length - 1}`;
        }

        // Для остальных ролей - стандартная логика
        const actors = gameEngine.players
            .map((player, index) => ({ player, index }))
            .filter(({ player }) => !player.isEliminated && player.role === roleName);

        if (actors.length === 0) {
            return 'нет активного игрока';
        }

        if (actors.length === 1) {
            return gameEngine.getPlayerName(actors[0].index);
        }

        return `${gameEngine.getPlayerName(actors[0].index)} +${actors.length - 1}`;
    },

    /**
     * Вернуть игроков с сортировкой: живые сверху, мертвые снизу
     */
    getPlayersAliveFirst() {
        return gameEngine.players
            .map((p, i) => ({ p, i }))
            .sort((a, b) => Number(a.p.isEliminated) - Number(b.p.isEliminated));
    },

    // ========== ОСНОВНЫЕ ЭКРАНЫ (1-2) ==========

    renderMainScreens(screenNum) {
        if (screenNum === 0) {
            return;
        } else if (screenNum === 1) {
            this.renderPlayerSetup();
        } else if (screenNum === 2) {
            this.renderRoleConfig();
        } else if (screenNum === 6) {
            this.renderNoExileConfirmation();
        }
    },

    /**
     * Экран 6: Подтверждение дня без изгнания
     */
    renderNoExileConfirmation() {
        const message = window.noExileMessage || 'Сегодня никто не вылетает. Подтверди переход к ночи.';
        const messageEl = document.getElementById('noExileMessage');
        if (messageEl) {
            messageEl.innerText = message;
        }
    },

    /**
     * Открыть экран подтверждения для NO_EXILE
     */
    showNoExileConfirmation(message) {
        window.noExileMessage = message;
        this.showScreen(6);
    },

    /**
     * Экран 1: Добавление игроков
     */
    renderPlayerSetup() {
        const l1 = document.getElementById('l1');
        if (!l1) return;

        l1.innerHTML = gameEngine.players.map((p, i) => `
            <div class="r">
                <b class="p-num">${i + 1}</b>
                <input 
                    value="${p.name}" 
                    oninput="gameEngine.renamePlayer(${i}, this.value)" 
                    placeholder="Игрок ${i + 1}">
                <button class="del-btn" onclick="gameEngine.removePlayer(${i}); UIManager.renderPlayerSetup(); UIManager.updateHeader(1)">✕</button>
            </div>
        `).join('');
    },

    /**
     * Экран 2: Конфигурация ролей
     */
    renderRoleConfig() {
        const lp = document.getElementById('lp');
        if (!lp) return;

        lp.innerHTML = Object.keys(GAME_CONFIG.ROLES)
            .filter(r => r !== 'Citizen')  // Не показываем Гражданина
            .map(r => {
                const roleInfo = ConfigUtils.getRoleInfo(r);
                const currentCount = gameEngine.roleConfig[r];
                const maxAllowed = gameEngine.getMaxAllowedRoleCount(r);
                const canDecrement = currentCount > 0;
                const canIncrement = currentCount < maxAllowed;
                const isUnavailable = (r === 'Mistress' && (gameEngine.roleConfig.Detective || 0) === 0);
                return `
                    <div class="r role-row ${currentCount === 0 ? 'role-zero' : ''} ${isUnavailable ? 'role-unavailable' : ''}">
                        <div class="role-meta">
                            <span class="role-title">${roleInfo.emoji} ${roleInfo.displayName}</span>
                            ${isUnavailable ? '<small class="role-note">Нужен живой Детектив</small>' : ''}
                        </div>
                        <div class="v-wrap">
                            <button class="v-btn" ${canDecrement ? '' : 'disabled'} onclick="gameEngine.setRoleCount('${r}', Math.max(0, gameEngine.roleConfig['${r}'] - 1)); UIManager.renderRoleConfig()">-</button>
                            <div class="v-cnt">${currentCount}</div>
                            <button class="v-btn" ${canIncrement ? '' : 'disabled'} onclick="gameEngine.setRoleCount('${r}', gameEngine.roleConfig['${r}'] + 1); UIManager.renderRoleConfig()">+</button>
                        </div>
                    </div>
                `;
            }).join('');

        const totalRoles = Object.values(gameEngine.roleConfig).reduce((a, b) => a + b, 0);
        const totalCitizens = Math.max(0, gameEngine.players.length - totalRoles);
        
        document.getElementById('totalC').innerText = gameEngine.players.length;
        document.getElementById('citC').innerText = totalCitizens;
    },

    // ========== РАСПРЕДЕЛЕНИЕ РОЛЕЙ (ЭКРАН 3) ==========

    /**
     * Экран 3: Распределение ролей
     */
    renderRoleDistribution() {
        const currentRole = (window.roleAssignmentOrder || [])[gameEngine.currentNightRoleIndex];
        if (!currentRole) return;

        const roleInfo = ConfigUtils.getRoleInfo(currentRole);
        const count = gameEngine.players.filter(p => p.role === currentRole).length;

        document.getElementById('roleLimitInfo').innerHTML = `
            <h3>${roleInfo.emoji} ${roleInfo.displayName}</h3>
            <div class="role-count-badge">${count} / ${gameEngine.roleConfig[currentRole]}</div>
        `;

        const orderedPlayers = gameEngine.players
            .map((p, i) => ({ p, i }))
            .sort((a, b) => {
                const group = (player) => {
                    if (player.role !== 'Citizen' && player.role !== currentRole) return 1;
                    return 0;
                };

                const groupDelta = group(a.p) - group(b.p);
                if (groupDelta !== 0) return groupDelta;
                return a.i - b.i;
            });

        document.getElementById('l3').innerHTML = orderedPlayers.map(({ p, i }) => {
            const isSel = (p.role === currentRole);
            const isOther = (p.role !== 'Citizen' && p.role !== currentRole);
            
            return `
                <div class="r ${isSel ? 'sel-' + currentRole : ''} ${isOther ? 'isOut' : ''}" 
                     onclick="${isOther ? '' : `setRole(${i}, '${currentRole}')`}">
                    <b class="p-num">${i + 1}</b>
                    <div class="p-info"><span class="p-name">${gameEngine.getPlayerName(i)}</span></div>
                    ${p.role !== 'Citizen' 
                        ? `<span class="tag ${GAME_CONFIG.ROLES[p.role].cssClass} tag-right">${GAME_CONFIG.ROLES[p.role].displayName}</span>` 
                        : ''}
                </div>
            `;
        }).join('');
        this.updateHeaderSummary();
    },

    // ========== ИГРОВОЙ ЭКРАН (ЭКРАН 4) ==========

    /**
     * Экран 4: Основной игровой экран
     */
    renderGameScreen() {
        this.updateHeader(4);

        const nP = document.getElementById('nightStatusPanel');
        const l4 = document.getElementById('l4');
        const ctrl = document.getElementById('game-controls');
        const vS = document.getElementById('voteStat');
        const topInfoStack = document.getElementById('topInfoStack');

        if (!gameEngine.isDay) {
            // НОЧНАЯ ФАЗА
            const currentRole = gameEngine.getCurrentNightRole();
            if (!currentRole) {
                this.endNightPhase();
                return;
            }

            ctrl.style.display = 'flex';
            const roleInfo = ConfigUtils.getRoleInfo(currentRole);
            
            if (topInfoStack) {
                topInfoStack.className = 'top-info-stack';
            }
            const actorLabel = this.getNightRoleActorLabel(currentRole);
            nP.innerHTML = `<h3>Ходит ${roleInfo.displayName} ${roleInfo.emoji} → ${actorLabel}</h3>`;
            vS.innerText = '';

            if (currentRole === 'Detective' && gameEngine.roleStates.Mistress?.target !== undefined && gameEngine.roleStates.Mistress?.target !== null) {
                const targetIdx = gameEngine.roleStates.Mistress.target;
                nP.innerHTML += `<p class="night-alert-false-check">Проверка по <b>${gameEngine.getPlayerName(targetIdx)}</b> должна быть ложной</p>`;
            }
            
            document.getElementById('cfB').innerText = 
                (gameEngine.currentNightRoleIndex === gameEngine.activeNightRoles.length - 1) 
                    ? "Наступает день" 
                    : "Следующая роль";

            const canSkip = roleInfo.canSkip !== false;
            
            document.getElementById('cfB').style.display = (window.selId !== null) ? "flex" : "none";
            document.getElementById('skB').style.display = (window.selId === null && canSkip) ? "flex" : "none";
            document.getElementById('cfB').onclick = () => doAction(window.selId);
            document.getElementById('skB').onclick = () => doAction(null);

            l4.innerHTML = this.getPlayersAliveFirst().map(({ p, i }) => {
                let status = '';
                let canClick = true;
                let note = '';

                if (p.isEliminated) {
                    status = 'isOut';
                    canClick = false;
                }

                // Проверить ограничения роли
                if (currentRole === 'Doctor' && i === gameEngine.roleStates.Doctor?.lastTarget) {
                    note = '(Два раза подряд нельзя)';
                    status = 'locked';
                    canClick = false;
                }

                if (currentRole === 'Detective' && (gameEngine.roleStates.Detective?.checkedPlayers?.includes(i) || 
                    (p.role === 'Detective' && !p.isEliminated))) {
                    note = (p.role === 'Detective' ? 'Себя не проверяешь' : 'Уже проверен');
                    status = 'locked';
                    canClick = false;
                }

                if (currentRole === 'Detective' && i === gameEngine.roleStates.Mistress?.target) {
                    note = note ? `${note} | Инфа будет ложной` : 'Инфа будет ложной';
                }

                if (currentRole === 'Bodyguard') {
                    const bodyguardIdx = gameEngine.players.findIndex(pl => pl.role === 'Bodyguard' && !pl.isEliminated);
                    if (i === bodyguardIdx) {
                        note = 'Себя защищать нельзя';
                        status = 'locked';
                        canClick = false;
                    }
                }

                return `
                    <div class="r ${status} ${window.selId === i ? 'player-selected' : ''}" 
                         onclick="${canClick ? `clickP(${i})` : ''}">
                        <b class="p-num">${i + 1}</b>
                        <div class="p-info"><span class="p-name">${gameEngine.getPlayerName(i)}</span></div>
                        <span class="tag ${GAME_CONFIG.ROLES[p.role].cssClass}">${GAME_CONFIG.ROLES[p.role].displayName}</span>
                        <small class="player-note">${note}</small>
                    </div>
                `;
            }).join('');
            this.updateHeaderSummary();

        } else if (gameEngine.currentNight === 1) {
            // ПЕРВЫЙ ДЕНЬ - ПРЕДСТАВЛЕНИЕ
            ctrl.style.display = 'flex';
            if (topInfoStack) {
                topInfoStack.className = 'top-info-stack';
            }
            nP.innerHTML = `<h3>Игроки знакомятся друг с другом</h3><p>Коротко представляются и задают тон всей партии.</p>`;
            vS.innerText = '';

            document.getElementById('cfB').innerText = 'Наступает ночь';
            document.getElementById('cfB').style.display = 'flex';
            document.getElementById('skB').style.display = 'none';
            document.getElementById('cfB').onclick = () => startNight();
            
            l4.innerHTML = gameEngine.players.map((p, i) => `
                <div class="r">
                    <b class="p-num">${i + 1}</b>
                    <div class="p-info"><span class="p-name">${gameEngine.getPlayerName(i)}</span></div>
                    <span class="tag ${GAME_CONFIG.ROLES[p.role].cssClass} tag-right">${GAME_CONFIG.ROLES[p.role].displayName}</span>
                </div>
            `).join('');
            this.updateHeaderSummary();

        } else {
            // ДНЕВНАЯ ФАЗА - ГОЛОСОВАНИЕ
            ctrl.style.display = 'flex';
            const tV = Object.values(gameEngine.dayVotes).reduce((a, b) => a + b, 0);
            const aC = gameEngine.getAlivePlayers().length;
            
            if (topInfoStack) {
                topInfoStack.className = 'top-info-stack mode-lynch';
            }
            vS.innerText = `Голоса: ${tV} / ${aC}`;
            nP.innerHTML = `<h3>Голосование</h3><p>Игроки обсуждают события ночи и выдвигают подозрения.</p>`;
            
            document.getElementById('cfB').innerText = "Вынести приговор";
            document.getElementById('cfB').style.display = (tV > 0) ? "flex" : "none";
            document.getElementById('skB').style.display = (tV === 0 && gameEngine.tiedPlayers.length === 0) ? "flex" : "none";
            document.getElementById('cfB').onclick = () => doAction(window.selId);
            document.getElementById('skB').onclick = () => doAction(null);

            l4.innerHTML = this.getPlayersAliveFirst().map(({ p, i }) => {
                let status = '';
                let votes = gameEngine.dayVotes[i] || 0;
                const canVoteTarget = !p.isEliminated &&
                    (gameEngine.tiedPlayers.length === 0 || gameEngine.tiedPlayers.includes(i));
                
                if (!canVoteTarget) {
                    status = 'isOut';
                }

                return `
                    <div class="r ${status} ${votes > 0 ? 'vote-selected' : ''}">
                        <b class="p-num">${i + 1}</b>
                        <div class="p-info"><span class="p-name">${gameEngine.getPlayerName(i)}</span></div>
                        <span class="tag ${GAME_CONFIG.ROLES[p.role].cssClass} tag-right tag-with-votes">${GAME_CONFIG.ROLES[p.role].displayName}</span>
                        <div class="v-wrap">
                            <button class="v-btn" ${canVoteTarget ? '' : 'disabled'} onclick="gameEngine.vote(${i}, -1); UIManager.renderGameScreen()">-</button>
                            <div class="v-cnt">${votes}</div>
                            <button class="v-btn" ${canVoteTarget ? '' : 'disabled'} onclick="gameEngine.vote(${i}, 1); UIManager.renderGameScreen()">+</button>
                        </div>
                    </div>
                `;
            }).join('');
            this.updateHeaderSummary();
        }
    },

    // ========== ЗАВЕРШЕНИЕ ИГРЫ (ЭКРАН 5) ==========

    /**
     * Экран 5: Итоги игры
     */
    renderGameEnd() {
        const timelineLog = this.getDisplayLog();
        const lastLog = timelineLog[timelineLog.length - 1];
        const winText = lastLog ? lastLog.text : "Партия завершена";
        
        document.getElementById('finalResultsPanel').innerHTML = 
            `<div class="welcome-card final-win-card"><h3>${winText}</h3></div>`;
        
        document.getElementById('finalLogList').innerHTML = this.renderLogItems(timelineLog);
    },

    // ========== ЛОГ ==========

    /**
     * Переключить видимость лога
     */
    toggleLog() {
        const el = document.getElementById('log-overlay');
        const list = document.getElementById('log-list');
        
        if (el.style.display === 'block') {
            el.style.display = 'none';
        } else {
            list.innerHTML = this.renderLogItems(this.getDisplayLog());
            el.style.display = 'block';
        }
    },

    // ========== ВСПОМОГАТЕЛЬНЫЕ ==========

    endNightPhase() {
        gameEngine.processNight();
        const checkWin = gameEngine.endNight();
        
        if (checkWin.gameEnded) {
            UIManager.showMessage("Финал 🏆", checkWin.message, () => UIManager.showScreen(5));
        } else {
            UIManager.showMessage("Рассвет ☀️", gameEngine.morningReport, () => UIManager.showScreen(4));
        }
    }
};

// Публикуем UI менеджер в window для inline-callbacks.
window.UIManager = UIManager;
