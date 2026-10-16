// Motor comum dos jogos de arena (shared/bash/engine.js) com uma simulação de mentira:
// vagas, CPU completando a mesa, quem pode mexer nas regras, TV pronta, 3-2-1, entradas,
// rodadas, troféu, revanche, saída de jogador (CPU assume), troca de celular e salvamento.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const bashGame = require('../shared/bash/engine');

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function until(fn, ms = 9000) { const end = Date.now() + ms; while (Date.now() < end) { const v = fn(); if (v) return v; await sleep(20); } throw new Error('tempo esgotado'); }

// Simulação de mentira: a vaga 0 vence a rodada assim que aperta A.
const seen = [];
const Sim = {
  levels: [{ id: 'um', name: 'Um', short: 'a', how: ['x'] }, { id: 'dois', name: 'Dois', short: 'b', how: ['y'] }],
  controls: () => ({ stick: 'free', buttons: [{ id: 'a', label: 'VENCER' }] }),
  create(ents, opts) { return { time: 0, fx: [], ents, opts, steps: 0 }; },
  step(w, ins) {
    w.time += 1 / 60; w.steps++;
    if (ins[0] && ins[0].ap) { seen.push(ins[0]); if (!w.result) { w.result = { winners: [0], order: [0] }; w.fx.push({ k: 'win' }); } }
  },
  bot: () => ({ x: .5, y: 0 }),
  snapshot: w => ({ n: w.ents.length }),
  private: (w, slot) => ({ status: 'vaga ' + slot }),
};

function fakeApi(players) {
  const api = {
    players, broadcasts: 0, frames: 0, tvs: 1, event: null,
    byPid: pid => players.find(p => p.pid === pid) || null,
    colorInfo: c => ({ roxo: { hex: '#a855f7' }, ciano: { hex: '#22d3ee' }, amarelo: { hex: '#facc15' } })[c],
    setEvent(t) { api.event = t; }, broadcast() { api.broadcasts++; }, stream() { api.frames++; },
    tvCount: () => api.tvs, exit() {},
  };
  return api;
}
const P = (pid, name, color) => ({ pid, name, color, av: [0, 0, 0] });

test('vagas, CPU, regras do primeiro jogador e quem pode começar', () => {
  const mod = bashGame({ id: 't', name: 'Teste' }, Sim);
  assert.equal(mod.meta.category, 'acao'); assert.equal(mod.meta.maxPlayers, 4); assert.equal(mod.meta.spectators, true);
  const players = [P('a', 'Ana', 'roxo'), P('b', 'Bia', 'ciano'), P('c', 'Caio', 'amarelo'), P('d', 'Dani', 'roxo'), P('e', 'Eva', 'ciano')];
  const api = fakeApi(players), g = mod.create(api);
  g.start();
  let v = g.view(players[0], 'phone');
  assert.equal(v.roster.length, 4, 'os 4 primeiros entram'); assert.equal(v.hostPid, 'a');
  g.action(players[4], { t: 'bash-seat' }); assert.equal(g.view(null, 'tv').roster.length, 4, 'mesa cheia: Eva continua assistindo');
  g.action(players[1], { t: 'bash-level', level: 1 }); assert.equal(g.view(null, 'tv').level, 0, 'só o primeiro escolhe');
  g.action(players[0], { t: 'bash-level', level: 1 }); assert.equal(g.view(null, 'tv').level, 1);
  g.action(players[0], { t: 'bash-level', level: 9 }); assert.equal(g.view(null, 'tv').level, 1, 'arena inválida é ignorada');
  g.action(players[0], { t: 'bash-target', n: 3 }); g.action(players[0], { t: 'bash-cpulevel', v: 2 });
  v = g.view(null, 'tv'); assert.equal(v.target, 3); assert.equal(v.cpuLevel, 2);
  // sem CPU, uma pessoa só não começa
  for (const p of players.slice(1, 4)) g.action(p, { t: 'bash-seat' });
  g.action(players[0], { t: 'bash-cpu', on: false });
  assert.equal(g.view(null, 'tv').canStart, false);
  g.action(players[0], { t: 'bash-cpu', on: true });
  assert.equal(g.view(null, 'tv').canStart, true);
  assert.deepEqual(g.serialize(), { version: 1, roster: ['a'], level: 1, cpu: true, cpuLevel: 2, target: 3 });
  g.destroy();
});

test('partida: TV pronta, 3-2-1, entradas, rodadas, troféu, revanche, saída e salvamento', { timeout: 40000 }, async () => {
  const mod = bashGame({ id: 't', name: 'Teste' }, Sim);
  const players = [P('a', 'Ana', 'roxo'), P('b', 'Bia', 'ciano')];
  const api = fakeApi(players), g = mod.create(api);
  g.start();
  g.action(players[0], { t: 'bash-target', n: 2 });
  g.action(players[0], { t: 'bash-start' });
  let tv = g.view(null, 'tv');
  assert.equal(tv.phase, 'loading'); assert.equal(tv.seats.length, 4, 'CPU completa até 4');
  assert.deepEqual(tv.seats.map(s => s.bot), [false, false, true, true]);
  assert.ok(new Set(tv.seats.map(s => s.color)).size === 4, 'cada vaga com uma cor');
  assert.ok(tv.world, 'a TV recebe o mundo');
  const ph = g.view(players[1], 'phone');
  assert.equal(ph.world, null, 'o celular não recebe o mundo'); assert.equal(ph.me.slot, 1); assert.equal(ph.me.status, 'vaga 1');
  assert.equal(g.tvAction({ t: 'bash-tv-ready', matchId: 'outra' }), false);
  g.tvAction({ t: 'bash-tv-ready', matchId: tv.matchId });
  await until(() => g.view(null, 'tv').phase === 'countdown');
  // entrada de outra partida ou de quem não joga é ignorada
  g.input(players[0], { t: 'input', matchId: 'velha', a: true, active: true });
  await until(() => g.view(null, 'tv').phase === 'playing', 5000);
  const id = g.view(null, 'tv').matchId;
  const press = async () => { g.input(players[0], { t: 'input', matchId: id, x: 9, y: -9, a: true, active: true }); await sleep(40); g.input(players[0], { t: 'input', matchId: id, a: false, active: true }); };
  await press();
  await until(() => g.view(null, 'tv').phase === 'roundEnd');
  assert.equal(seen[0].x, 1, 'eixo limitado a –1..1'); assert.equal(seen[0].y, -1);
  tv = g.view(null, 'tv');
  assert.deepEqual(tv.roundWinners, [0]); assert.equal(tv.seats[0].wins, 1);
  assert.ok(tv.world.fx.some(f => f.k === 'win' && f.id), 'efeito com id para a TV');
  await until(() => g.view(null, 'tv').phase === 'playing', 9000);
  assert.equal(g.view(null, 'tv').roundNo, 2);
  await press();
  await until(() => g.view(null, 'tv').phase === 'results', 9000);
  tv = g.view(null, 'tv');
  assert.deepEqual(tv.champions, [0]); assert.equal(tv.seats[0].wins, 2);
  assert.match(api.event, /Ana ganhou o troféu/);
  // revanche só pelo primeiro jogador
  g.action(players[1], { t: 'bash-again' }); assert.equal(g.view(null, 'tv').phase, 'results');
  g.action(players[0], { t: 'bash-again' }); assert.equal(g.view(null, 'tv').phase, 'loading');
  assert.equal(g.view(null, 'tv').seats[0].wins, 0, 'revanche zera os troféus');
  // Bia sai: a CPU assume a vaga dela
  players.splice(1, 1); g.onPlayerLeave('b');
  tv = g.view(null, 'tv');
  assert.equal(tv.seats[1].bot, true); assert.match(tv.seats[1].name, /CPU/);
  // Ana troca de celular
  g.rekey('a', 'a2'); players[0].pid = 'a2';
  assert.equal(g.view(players[0], 'phone').me.slot, 0);
  const saved = g.serialize();
  g.destroy();
  const g2 = mod.create(fakeApi(players)); g2.restore(saved);
  const v2 = g2.view(players[0], 'phone');
  assert.equal(v2.phase, 'setup'); assert.deepEqual(v2.roster.map(p => p.pid), ['a2']);
  g2.destroy();
});

test('sem TV aberta a partida volta para a preparação com aviso', { timeout: 15000 }, async () => {
  const mod = bashGame({ id: 't', name: 'Teste' }, Sim);
  const players = [P('a', 'Ana', 'roxo')];
  const api = fakeApi(players); api.tvs = 0;
  const g = mod.create(api); g.start();
  g.action(players[0], { t: 'bash-start' });
  await until(() => g.view(null, 'tv').phase === 'setup', 9000);
  assert.match(g.view(null, 'tv').error, /TV/);
  g.destroy();
});
