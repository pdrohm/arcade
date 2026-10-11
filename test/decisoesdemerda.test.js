// Decisões de Merda: os outros escolhem; quem está na vez aposta (1, 2 ou empate) e pontua se acertar.
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
  // jogada: escolhas dos outros { pid: 1|2 } e a aposta de quem está na vez (1, 2 ou 0 = empate)
  const jogar = (escolhas, aposta) => {
    for (const [pid, v] of Object.entries(escolhas)) g.action(de(pid), { t: 'pick', v });
    if (aposta != null) g.action(de(tv().reader), { t: 'bet', v: aposta });
    g.onTimeUp();
  };
  const outros = () => players.map(p => p.pid).filter(x => x !== tv().reader);
  return { g, players, de, tv, virar, jogar, outros, V: p => g.view(p) };
}

test('só os outros escolhem; quem está na vez aposta e ganha o ponto se acertar a maioria', () => {
  const m = mesa(4);
  m.virar();
  const r = m.tv().reader, o = m.outros();
  assert.equal(m.tv().card.length, 2);
  m.g.action(m.de(r), { t: 'pick', v: 1 });
  assert.equal(m.V(m.de(r)).myPick, null, 'quem está na vez não escolhe');
  m.g.action(m.de(o[0]), { t: 'bet', v: 1 });
  assert.equal(m.V(m.de(o[0])).myBet, null, 'só quem está na vez aposta');
  assert.equal(m.tv().result, null, 'nada aparece antes de revelar');
  m.jogar({ [o[0]]: 2, [o[1]]: 2, [o[2]]: 1 }, 2);
  const v = m.tv();
  assert.equal(v.phase, 'result');
  assert.equal(v.result.maj, 2);
  assert.equal(v.result.hit, true);
  assert.deepEqual(v.scores, { [r]: 1 });
});

test('apostar no empate: acerta quando as opções empatam', () => {
  const m = mesa(5);
  m.virar();
  const r = m.tv().reader, o = m.outros();
  m.jogar({ [o[0]]: 1, [o[1]]: 2, [o[2]]: 1, [o[3]]: 2 }, 0);
  const v = m.tv();
  assert.equal(v.result.maj, 0);
  assert.equal(v.result.hit, true);
  assert.equal(v.scores[r], 1);
});

test('errou a aposta: ninguém pontua', () => {
  const m = mesa(4);
  m.virar();
  const o = m.outros();
  m.jogar({ [o[0]]: 1, [o[1]]: 1, [o[2]]: 2 }, 0);
  assert.equal(m.tv().result.hit, false);
  assert.deepEqual(m.tv().scores, {});
});

test('a vez passa em roda e quem chega à meta vence', () => {
  const m = mesa(3, { goal: 3 });
  const leitores = [];
  for (let i = 0; i < 7 && m.tv().phase !== 'end'; i++) {
    m.virar();
    leitores.push(m.tv().reader);
    const o = m.outros();
    m.jogar({ [o[0]]: 1, [o[1]]: 1 }, 1);   // todo mundo acerta na sua vez
    if (m.tv().phase === 'result') m.g.action(m.de('p0'), { t: 'next' });
  }
  assert.equal(new Set(leitores.slice(0, 3)).size, 3, 'cada um tem sua vez na roda');
  const v = m.tv();
  assert.equal(v.phase, 'end');
  assert.equal(v.champs.length, 1);
  assert.equal(v.scores[v.champs[0]], 3);
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
  const o = m.outros()[0];
  m.g.action(m.de(o), { t: 'pick', v: 2 });
  const dump = JSON.parse(JSON.stringify(m.g.serialize()));
  const g2 = ddm.create({ players: m.players, byPid: pid => m.players.find(p => p.pid === pid), setEvent() {}, armTimer() {}, clearTimer() {}, timerEnd: null, broadcast() {} });
  g2.restore(dump);
  const v = g2.view(m.de(o));
  assert.equal(v.phase, 'vote');
  assert.equal(v.myPick, 2);
});
