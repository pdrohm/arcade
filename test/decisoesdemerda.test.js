// Decisões de Merda: escolha secreta, aposta na maioria, ponto para quem acerta, empate sem ponto e fim.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const ddm = require('../games/decisoesdemerda/game.js');

function mesa(n, cfg) {
  const players = [];
  for (let i = 0; i < n; i++) players.push({ pid: 'p' + i, name: 'J' + i, color: 'cor' + i, on: true });
  let timerEnd = null;
  const api = {
    players,
    byPid: pid => players.find(p => p.pid === pid) || null,
    setEvent() {}, addEvent() {},
    armTimer(ms) { timerEnd = Date.now() + ms; },
    clearTimer() { timerEnd = null; },
    get timerEnd() { return timerEnd; },
    broadcast() {}, stream() {}, exit() {},
  };
  const g = ddm.create(api);
  g.start();
  if (cfg) g.action(players[0], { t: 'config', cfg });
  g.action(players[0], { t: 'begin' });
  const de = pid => players.find(p => p.pid === pid);
  const tv = () => g.view(null, 'tv');
  const virar = () => { g.action(de(tv().reader), { t: 'draw' }); assert.equal(tv().phase, 'vote'); };
  // jogada: { pid: [escolha, aposta] }
  const jogar = j => { for (const [pid, [pk, bt]] of Object.entries(j)) { g.action(de(pid), { t: 'pick', v: pk }); g.action(de(pid), { t: 'bet', v: bt }); } g.onTimeUp(); };
  return { g, players, de, tv, virar, jogar, V: p => g.view(p) };
}

test('quem aposta na escolha da maioria ganha 1 ponto; escolhas ficam escondidas até revelar', () => {
  const m = mesa(4);
  m.virar();
  assert.equal(m.tv().card.length, 2);
  m.g.action(m.de('p0'), { t: 'pick', v: 1 });
  assert.equal(m.tv().result, null);
  assert.deepEqual(m.tv().ready, [], 'só escolher não basta: falta a aposta');
  m.g.action(m.de('p0'), { t: 'bet', v: 3 });
  assert.equal(m.V(m.de('p0')).myBet, null, 'aposta inválida é ignorada');
  m.jogar({ p0: [1, 2], p1: [1, 1], p2: [1, 2], p3: [2, 1] });
  const v = m.tv();
  assert.equal(v.phase, 'result');
  assert.equal(v.result.maj, 1);
  assert.deepEqual(v.result.hit.sort(), ['p1', 'p3']);
  assert.equal(v.scores.p1, 1);
  assert.equal(v.scores.p0 || 0, 0);
});

test('empate entre as opções: ninguém pontua', () => {
  const m = mesa(4);
  m.virar();
  m.jogar({ p0: [1, 1], p1: [2, 2], p2: [1, 1], p3: [2, 2] });
  const v = m.tv();
  assert.equal(v.result.maj, 0);
  assert.deepEqual(v.result.hit, []);
  assert.deepEqual(v.scores, {});
});

test('a vez passa em roda e quem chega à meta vence (empate no fim = vitória dividida)', () => {
  const m = mesa(3, { goal: 3 });
  const leitores = [];
  for (let i = 0; i < 3; i++) {
    m.virar();
    leitores.push(m.tv().reader);
    m.jogar({ p0: [1, 1], p1: [1, 1], p2: [1, 2] });
    if (i < 2) { assert.equal(m.tv().phase, 'result'); m.g.action(m.de('p2'), { t: 'next' }); }
  }
  assert.equal(new Set(leitores).size, 3);
  const v = m.tv();
  assert.equal(v.phase, 'end');
  assert.deepEqual(v.champs.sort(), ['p0', 'p1']);
  m.g.action(m.de('p0'), { t: 'again' });
  assert.equal(m.tv().phase, 'setup');
});

test('só quem está na vez vira a carta; sem conexão, outro vira ou pula', () => {
  const m = mesa(3);
  const r = m.tv().reader, outro = m.players.find(p => p.pid !== r);
  m.g.action(outro, { t: 'draw' });
  assert.equal(m.tv().phase, 'draw');
  m.de(r).on = false;
  m.g.action(outro, { t: 'skip' });
  assert.notEqual(m.tv().reader, r);
});

test('salvar e restaurar no meio da escolha', () => {
  const m = mesa(3);
  m.virar();
  m.g.action(m.de('p1'), { t: 'pick', v: 2 });
  const dump = JSON.parse(JSON.stringify(m.g.serialize()));
  const g2 = ddm.create({ players: m.players, byPid: pid => m.players.find(p => p.pid === pid), setEvent() {}, armTimer() {}, clearTimer() {}, timerEnd: null, broadcast() {} });
  g2.restore(dump);
  const v = g2.view(m.players[1]);
  assert.equal(v.phase, 'vote');
  assert.equal(v.myPick, 2);
});
