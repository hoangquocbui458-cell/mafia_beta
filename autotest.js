const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = __dirname;

function loadScript(fileName) {
  const code = fs.readFileSync(path.join(ROOT, fileName), 'utf8');
  vm.runInThisContext(code, { filename: fileName });
}

global.window = global;

loadScript('config.js');
loadScript('roles.js');
loadScript('game-engine.js');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}. expected=${expected}, actual=${actual}`);
  }
}

function assertIncludes(haystack, needle, message) {
  if (!String(haystack).includes(String(needle))) {
    throw new Error(`${message}. missing='${needle}'`);
  }
}

function aliveCount(game, role) {
  return game.players.filter(p => p.role === role && !p.isEliminated).length;
}

function makeGame(players) {
  const g = new GameEngine();
  g.players = players.map((p, i) => ({
    id: i,
    name: p.name || `P${i + 1}`,
    role: p.role,
    isEliminated: !!p.isEliminated,
    voteCount: 0,
  }));

  g.roleConfig = {
    Mafia: g.players.filter(p => p.role === 'Mafia').length,
    MafiaBoss: g.players.filter(p => p.role === 'MafiaBoss').length,
    Maniac: g.players.filter(p => p.role === 'Maniac').length,
    Detective: g.players.filter(p => p.role === 'Detective').length,
    Doctor: g.players.filter(p => p.role === 'Doctor').length,
    Bodyguard: g.players.filter(p => p.role === 'Bodyguard').length,
    Lucky: g.players.filter(p => p.role === 'Lucky').length,
    Mistress: g.players.filter(p => p.role === 'Mistress').length,
  };

  g.currentNight = 1;
  return g;
}

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

// ---------- Validation / Setup ----------

test('Role config valid: requires mafia + citizens and only one boss', () => {
  const g = new GameEngine();
  g.players = [{}, {}, {}, {}, {}];
  g.roleConfig = { Mafia: 1, MafiaBoss: 0, Maniac: 0, Detective: 1, Doctor: 1, Bodyguard: 0, Lucky: 0, Mistress: 0 };
  assert(g.isRoleConfigValid(), 'Expected valid role config');

  g.roleConfig.Mafia = 0;
  assert(!g.isRoleConfigValid(), 'No mafia must be invalid');

  g.roleConfig.Mafia = 1;
  g.roleConfig.Detective = 4;
  assert(!g.isRoleConfigValid(), 'No citizens left must be invalid');

  g.roleConfig.Detective = 1;
  g.roleConfig.MafiaBoss = 2;
  assert(!g.isRoleConfigValid(), 'More than one boss must be invalid');

  g.roleConfig.MafiaBoss = 0;
  g.roleConfig.Mistress = 1;
  g.roleConfig.Detective = 0;
  assert(!g.isRoleConfigValid(), 'Mistress without Detective must be invalid');
});

test('setRoleCount clamps boss to [0..1] and others to [0..inf)', () => {
  const g = new GameEngine();
  g.players = [{}, {}, {}, {}];
  g.roleConfig = { Mafia: 1, MafiaBoss: 0, Maniac: 0, Detective: 1, Doctor: 1, Bodyguard: 0, Lucky: 0, Mistress: 0 };

  g.setRoleCount('MafiaBoss', 5);
  assertEqual(g.roleConfig.MafiaBoss, 1, 'MafiaBoss must clamp to 1');

  g.setRoleCount('MafiaBoss', -2);
  assertEqual(g.roleConfig.MafiaBoss, 0, 'MafiaBoss must clamp to 0');

  g.setRoleCount('Doctor', -10);
  assertEqual(g.roleConfig.Doctor, 0, 'Regular roles must clamp min at 0');

  g.setRoleCount('Mafia', 10);
  assertEqual(g.roleConfig.Mafia, 3, 'Role count must be capped to keep at least one citizen');
});

test('Mistress count is blocked without Detective and dropped if Detective removed', () => {
  const g = new GameEngine();
  g.players = [{}, {}, {}, {}, {}];
  g.roleConfig = { Mafia: 1, MafiaBoss: 0, Maniac: 0, Detective: 0, Doctor: 0, Bodyguard: 0, Lucky: 0, Mistress: 0 };

  g.setRoleCount('Mistress', 1);
  assertEqual(g.roleConfig.Mistress, 0, 'Mistress should stay 0 without Detective');

  g.setRoleCount('Detective', 1);
  g.setRoleCount('Mistress', 1);
  assertEqual(g.roleConfig.Mistress, 1, 'Mistress should be allowed with Detective');

  g.setRoleCount('Detective', 0);
  assertEqual(g.roleConfig.Mistress, 0, 'Mistress must auto-reset when Detective is removed');
});

test('distributeRoles resets everyone to Citizen and applies assignments', () => {
  const g = makeGame([
    { role: 'Mafia' },
    { role: 'Doctor' },
    { role: 'Citizen' },
  ]);

  g.distributeRoles([{ playerId: 2, role: 'Detective' }]);
  assertEqual(g.players[0].role, 'Citizen', 'Player 0 must reset to Citizen');
  assertEqual(g.players[1].role, 'Citizen', 'Player 1 must reset to Citizen');
  assertEqual(g.players[2].role, 'Detective', 'Player 2 must get assigned role');
});

test('startFirstDay sets day state and initializes first day metadata', () => {
  const g = makeGame([
    { role: 'Mafia' },
    { role: 'Doctor' },
    { role: 'Citizen' },
  ]);
  const out = g.startFirstDay();
  assertEqual(g.isDay, true, 'Must be day after startFirstDay');
  assertEqual(g.currentNight, 1, 'Night counter must be 1 on first day');
  assertEqual(out.phase, 'DAY', 'Phase must be DAY');
  assertEqual(out.isFirstDay, true, 'Must mark first day');
});

// ---------- Night Order / Sequencing ----------

test('Night order follows GAME_CONFIG.NIGHT_ROLE_ORDER', () => {
  const g = makeGame([
    { role: 'Doctor' },
    { role: 'Bodyguard' },
    { role: 'Mafia' },
    { role: 'Maniac' },
    { role: 'Mistress' },
    { role: 'Detective' },
    { role: 'Citizen' },
  ]);
  g.startNight();
  const expected = ['Doctor', 'Bodyguard', 'Mafia', 'Maniac', 'Mistress', 'Detective'];
  assertEqual(g.activeNightRoles.join(','), expected.join(','), 'Night role order mismatch');
});

test('MafiaBoss is shooter only when no alive regular Mafia', () => {
  const withMafia = makeGame([
    { role: 'MafiaBoss' },
    { role: 'Mafia' },
    { role: 'Citizen' },
  ]);
  withMafia.startNight();
  assert(!withMafia.activeNightRoles.includes('MafiaBoss'), 'Boss must be removed when mafia alive');

  withMafia.players[1].isEliminated = true;
  withMafia.startNight();
  assert(withMafia.activeNightRoles.includes('MafiaBoss'), 'Boss must activate when no mafia alive');
});

test('startNight clears per-night temporary states', () => {
  const g = makeGame([
    { role: 'Doctor' },
    { role: 'Bodyguard' },
    { role: 'Mistress' },
    { role: 'Mafia' },
  ]);
  g.roleStates.Doctor = { protected: 1, lastTarget: 1 };
  g.roleStates.Bodyguard = { protected: 2 };
  g.roleStates.Mistress = { target: 0 };

  g.startNight();
  assertEqual(g.roleStates.Doctor.protected, null, 'Doctor nightly protection must reset');
  assertEqual(g.roleStates.Bodyguard.protected, null, 'Bodyguard nightly protection must reset');
  assertEqual(g.roleStates.Mistress.target, null, 'Mistress nightly target must reset');
  assertEqual(g.roleStates.Doctor.lastTarget, 1, 'Doctor lastTarget should persist across nights');
});

test('submitNightAction advances role index and ends night after last role', () => {
  const g = makeGame([
    { role: 'Doctor' },
    { role: 'Mafia' },
    { role: 'Citizen' },
  ]);
  g.startNight();
  const first = g.submitNightAction(2);
  assertEqual(first.phase, 'NIGHT', 'Must continue night after non-last action');
  assertEqual(g.getCurrentNightRole(), 'Mafia', 'Next role should be Mafia');
  const second = g.submitNightAction(2);
  assertEqual(second.phase, 'END_NIGHT', 'Must end night after last action');
});

test('skipNightAction for Doctor clears protection and consecutive lock', () => {
  const g = makeGame([
    { role: 'Doctor' },
    { role: 'Mafia' },
    { role: 'Citizen' },
  ]);
  g.startNight();
  g.roleStates.Doctor = { protected: 1, lastTarget: 1 };
  g.skipNightAction();
  assertEqual(g.roleStates.Doctor.protected, null, 'Doctor protected must be null after skip');
  assertEqual(g.roleStates.Doctor.lastTarget, null, 'Doctor lastTarget must reset after skip');
});

// ---------- Role Restrictions ----------

test('Doctor cannot select eliminated or same target twice in row', () => {
  const g = makeGame([
    { role: 'Doctor' },
    { role: 'Citizen' },
    { role: 'Citizen', isEliminated: true },
  ]);
  g.roleStates.Doctor = { lastTarget: 1 };
  assertEqual(RoleUtils.canSelectTarget('Doctor', 2, g), false, 'Doctor must not target eliminated');
  assertEqual(RoleUtils.canSelectTarget('Doctor', 1, g), false, 'Doctor must not target same consecutive player');
  assertEqual(RoleUtils.canSelectTarget('Doctor', 0, g), true, 'Doctor should be able to self-heal');
});

test('Detective cannot inspect self or already inspected targets', () => {
  const g = makeGame([
    { role: 'Detective' },
    { role: 'Citizen' },
    { role: 'Mafia' },
  ]);
  g.roleStates.Detective = { checkedPlayers: [1] };
  assertEqual(RoleUtils.canSelectTarget('Detective', 0, g), false, 'Detective must not target self');
  assertEqual(RoleUtils.canSelectTarget('Detective', 1, g), false, 'Detective must not re-check same target');
  assertEqual(RoleUtils.canSelectTarget('Detective', 2, g), true, 'Detective should inspect fresh target');
});

test('Bodyguard cannot select self and cannot select eliminated', () => {
  const g = makeGame([
    { role: 'Bodyguard' },
    { role: 'Citizen' },
    { role: 'Citizen', isEliminated: true },
  ]);
  assertEqual(RoleUtils.canSelectTarget('Bodyguard', 0, g), false, 'Bodyguard must not protect self');
  assertEqual(RoleUtils.canSelectTarget('Bodyguard', 2, g), false, 'Bodyguard must not protect eliminated');
  assertEqual(RoleUtils.canSelectTarget('Bodyguard', 1, g), true, 'Bodyguard should protect alive non-self');
});

test('submitNightAction returns error for invalid target', () => {
  const g = makeGame([
    { role: 'Detective' },
    { role: 'Citizen' },
  ]);
  g.startNight();
  const out = g.submitNightAction(0);
  assertEqual(!!out.error, true, 'Invalid detective self-target must produce error');
});

// ---------- Night Conflict Matrix ----------

test('Doctor protection prevents kill', () => {
  const g = makeGame([
    { role: 'Doctor' },
    { role: 'Mafia' },
    { role: 'Citizen' },
  ]);
  g.startNight();
  g.roleStates.Doctor = { protected: 2, lastTarget: 2 };
  g.nightActions.Mafia = { target: 2 };
  const out = g.processNight();
  assertEqual(out.killed.length, 0, 'Doctor must prevent kill on protected target');
});

test('Bodyguard intercepts attack and dies instead of protected target', () => {
  const g = makeGame([
    { role: 'Bodyguard' },
    { role: 'Citizen' },
    { role: 'Mafia' },
  ]);
  g.startNight();
  g.roleStates.Bodyguard = { protected: 1 };
  g.nightActions.Mafia = { target: 1 };
  g.processNight();
  assertEqual(g.players[0].isEliminated, true, 'Bodyguard must die on interception');
  assertEqual(g.players[1].isEliminated, false, 'Protected target must survive');
});

test('Doctor can save Bodyguard after interception', () => {
  const g = makeGame([
    { role: 'Bodyguard' },
    { role: 'Citizen' },
    { role: 'Doctor' },
    { role: 'Mafia' },
  ]);
  g.startNight();
  g.roleStates.Bodyguard = { protected: 1 };
  g.roleStates.Doctor = { protected: 0, lastTarget: 0 };
  g.nightActions.Mafia = { target: 1 };
  const out = g.processNight();
  assertEqual(out.killed.length, 0, 'Doctor on bodyguard should save everyone in this scenario');
});

test('Multiple attackers same target cause only one death entry', () => {
  const g = makeGame([
    { role: 'Mafia' },
    { role: 'Maniac' },
    { role: 'Citizen' },
  ]);
  g.startNight();
  g.nightActions.Mafia = { target: 2 };
  g.nightActions.Maniac = { target: 2 };
  const out = g.processNight();
  assertEqual(out.killed.length, 1, 'One unique target must yield one death');
  assertEqual(out.killed[0], 2, 'Killed target index mismatch');
});

test('Lucky survives first lethal night and dies on second', () => {
  const g = makeGame([
    { role: 'Lucky' },
    { role: 'Mafia' },
    { role: 'Citizen' },
  ]);
  g.startNight();
  g.nightActions.Mafia = { target: 0 };
  let out = g.processNight();
  assertEqual(out.killed.length, 0, 'Lucky should survive first lethal night');
  assertEqual(g.roleStates.Lucky.used, true, 'Lucky passive must be consumed');

  g.currentNight += 1;
  g.startNight();
  g.nightActions.Mafia = { target: 0 };
  out = g.processNight();
  assertEqual(out.killed.length, 1, 'Lucky should die on second lethal night');
  assertEqual(g.players[0].isEliminated, true, 'Lucky should be eliminated second time');
});

test('Mistress flips detective result: evil target becomes clean', () => {
  const g = makeGame([
    { role: 'Mafia' },
    { role: 'Detective' },
    { role: 'Mistress' },
  ]);
  g.startNight();
  g.roleStates.Mistress = { target: 0 };
  g.nightActions.Detective = { target: 0 };
  g.processNight();

  const logs = g.getLog().map(l => l.text).join('\n');
  assertIncludes(logs, 'ЧИСТ 😊', 'Evil target should appear clean after Mistress');
  assertIncludes(logs, 'Любовница вмешалась', 'Must log mistress interference');
});

test('Mistress flips detective result: clean target becomes mafia', () => {
  const g = makeGame([
    { role: 'Citizen' },
    { role: 'Detective' },
    { role: 'Mistress' },
  ]);
  g.startNight();
  g.roleStates.Mistress = { target: 0 };
  g.nightActions.Detective = { target: 0 };
  g.processNight();

  const logs = g.getLog().map(l => l.text).join('\n');
  assertIncludes(logs, 'МАФИЯ 👺', 'Clean target should appear evil after Mistress');
});

test('Boss transfer triggers when boss dies and alive mafia exists', () => {
  const g = makeGame([
    { role: 'MafiaBoss', isEliminated: true },
    { role: 'Mafia' },
    { role: 'Citizen' },
  ]);
  g.handleMafiaBossTransferIfNeeded(0);
  assertEqual(g.players[1].role, 'MafiaBoss', 'Alive mafia must inherit boss role');
});

test('Boss transfer does nothing if no alive mafia remains', () => {
  const g = makeGame([
    { role: 'MafiaBoss', isEliminated: true },
    { role: 'Mafia', isEliminated: true },
    { role: 'Citizen' },
  ]);
  g.handleMafiaBossTransferIfNeeded(0);
  assertEqual(aliveCount(g, 'MafiaBoss'), 0, 'No alive boss should exist when no successor');
});

// ---------- Voting / Day Phase ----------

test('vote ignores eliminated players and clamps at zero', () => {
  const g = makeGame([
    { role: 'Citizen' },
    { role: 'Citizen', isEliminated: true },
  ]);
  g.isDay = true;
  g.vote(1, 1);
  assertEqual(g.dayVotes[1], undefined, 'Eliminated players must not receive votes');
  g.vote(0, -1);
  assertEqual(g.dayVotes[0], undefined, 'Votes must not go below zero');
});

test('vote during revote only allows tied players', () => {
  const g = makeGame([
    { role: 'Citizen' },
    { role: 'Citizen' },
    { role: 'Citizen' },
  ]);
  g.isDay = true;
  g.tiedPlayers = [0, 1];
  g.vote(2, 1);
  assertEqual(g.dayVotes[2], undefined, 'Non-tied players must be locked in revote');
  g.vote(0, 1);
  assertEqual(g.dayVotes[0], 1, 'Tied players should accept votes');
});

test('castVote returns NO_EXILE when nobody has votes', () => {
  const g = makeGame([
    { role: 'Citizen' },
    { role: 'Citizen' },
    { role: 'Mafia' },
  ]);
  g.isDay = true;
  const out = g.castVote();
  assertEqual(out.phase, 'NO_EXILE', 'No votes should lead to NO_EXILE');
});

test('castVote handles first tie then second tie', () => {
  const g = makeGame([
    { role: 'Citizen' },
    { role: 'Citizen' },
    { role: 'Mafia' },
  ]);
  g.isDay = true;
  g.vote(0, 1);
  g.vote(1, 1);
  let out = g.castVote();
  assertEqual(out.phase, 'FIRST_TIE', 'First tie should trigger revote');
  assertEqual(g.tiedPlayers.length, 2, 'Two players must be tied');

  g.vote(g.tiedPlayers[0], 1);
  g.vote(g.tiedPlayers[1], 1);
  out = g.castVote();
  assertEqual(out.phase, 'SECOND_TIE', 'Second tie should end day without exile');
});

test('castVote exiles single leader and can trigger win immediately', () => {
  const g = makeGame([
    { role: 'Mafia' },
    { role: 'Citizen' },
    { role: 'Citizen' },
  ]);
  g.isDay = true;
  g.vote(0, 2);
  const out = g.castVote();
  assertEqual(out.phase, 'WIN', 'Exiling last mafia should trigger Citizens win');
  assertEqual(out.winner, 'Citizens', 'Winner must be Citizens');
});

test('castVote exiling boss transfers role to alive mafia', () => {
  const g = makeGame([
    { role: 'MafiaBoss' },
    { role: 'Mafia' },
    { role: 'Citizen' },
    { role: 'Citizen' },
  ]);
  g.isDay = true;
  g.vote(0, 3);
  const out = g.castVote();
  assertEqual(out.phase, 'EXILE', 'Exile should complete normally');
  assertEqual(g.players[1].role, 'MafiaBoss', 'Boss role should transfer on exile death');
});

// ---------- Win Conditions / Lifecycle ----------

test('Mafia wins at parity (including MafiaBoss in mafia side)', () => {
  const g = makeGame([
    { role: 'MafiaBoss' },
    { role: 'Citizen' },
  ]);
  const out = g.checkWinCondition();
  assertEqual(out.winner, 'Mafia', 'Mafia side must include MafiaBoss');
});

test('Maniac wins only when <=2 alive and mafia side is dead', () => {
  const g = makeGame([
    { role: 'Maniac' },
    { role: 'Citizen' },
  ]);
  let out = g.checkWinCondition();
  assertEqual(out.winner, 'Maniac', 'Maniac should win in 1v1 without mafia');

  const g2 = makeGame([
    { role: 'Maniac' },
    { role: 'Mafia' },
  ]);
  out = g2.checkWinCondition();
  assertEqual(out.winner, 'Mafia', 'Mafia has priority when mafia alive and parity reached');
});

test('Citizens win when no mafia and no maniac alive', () => {
  const g = makeGame([
    { role: 'Citizen' },
    { role: 'Doctor' },
  ]);
  const out = g.checkWinCondition();
  assertEqual(out.winner, 'Citizens', 'Citizens should win when evil/neutral killers gone');
});

test('endNight increments night and respects win checks', () => {
  const g = makeGame([
    { role: 'Mafia' },
    { role: 'Citizen' },
  ]);
  g.currentNight = 3;
  const out = g.endNight();
  assertEqual(out.gameEnded, true, 'Game should end if win condition met');
  assertEqual(g.currentNight, 4, 'Night counter must increment in endNight');
});

test('endDay returns NIGHT phase if no winner', () => {
  const g = makeGame([
    { role: 'Mafia' },
    { role: 'Citizen' },
    { role: 'Doctor' },
  ]);
  const out = g.endDay();
  assertEqual(out.phase, 'NIGHT', 'If no winner after day, game should go to night');
});

// ---------- Utility / Alignment ----------

test('RoleUtils fallback handler and alignment lookup are stable', () => {
  const g = makeGame([{ role: 'Citizen' }]);
  assertEqual(RoleUtils.canSelectTarget('UnknownRole', 0, g), false, 'Unknown role should fallback to Citizen logic');
  assertEqual(RoleUtils.getAlignment('MafiaBoss'), 'evil', 'MafiaBoss alignment must be evil');
  assertEqual(RoleUtils.getAlignment('NonExistentRole'), 'neutral', 'Unknown alignment should fallback to neutral');
});

// ---------- Runner ----------

let passed = 0;
const failed = [];

for (const t of tests) {
  try {
    t.fn();
    passed += 1;
    console.log(`PASS: ${t.name}`);
  } catch (err) {
    failed.push({ name: t.name, error: err.message });
    console.log(`FAIL: ${t.name} -> ${err.message}`);
  }
}

console.log('\n==== AUTOTEST SUMMARY ====');
console.log(`Total: ${tests.length}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed.length}`);

if (failed.length) {
  console.log('\nFailures:');
  failed.forEach(f => console.log(`- ${f.name}: ${f.error}`));
  process.exitCode = 1;
}
