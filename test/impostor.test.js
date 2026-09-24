// Impostor: a palavra não pode aparecer antes da chance final do impostor.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const impostor = require('../games/impostor/game.js');

// Sala de mentira: só o que o jogo usa da api do arcade.
function mesa(n) {
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
  const g = impostor.create(api);
  g.start();
  g.action(players[0], { t: 'begin' });
  const de = pid => players.find(p => p.pid === pid);
  return { g, players, de, tv: () => g.view(null, 'tv'), V: p => g.view(p) };
}

// Joga uma rodada até a turma pegar o impostor na votação.
function pegarImpostor(m) {
  for (const p of m.players) m.g.action(p, { t: 'seen' });
  let k = 0;
  while (m.tv().phase === 'clues') m.g.action(m.de(m.tv().speaker), { t: 'clue', text: 'dica' + (k++) });
  assert.equal(m.tv().phase, 'discuss');
  for (const p of m.players) m.g.action(p, { t: 'endnow' });
  assert.equal(m.tv().phase, 'vote');
  const imp = m.players.find(p => m.V(p).mine.impostor);
  const outro = m.players.find(p => p !== imp);
  for (const p of m.players) m.g.action(p, { t: 'vote', pid: p === imp ? outro.pid : imp.pid });
  return imp;
}

test('impostor pego: a palavra fica escondida até ele chutar', () => {
  const m = mesa(4);
  const imp = pegarImpostor(m);
  const tv = m.tv();
  assert.equal(tv.phase, 'result');
  assert.ok(tv.result.wasImp && tv.result.over && tv.needGuess);
  assert.equal(tv.word, null, 'resultado: a TV não mostra a palavra');
  assert.equal(m.V(imp).word, null, 'resultado: o impostor não recebe a palavra');
  assert.equal(m.V(imp).mine.word, '', 'o impostor continua sem a palavra no celular');

  m.g.action(m.players[0], { t: 'next' });
  assert.equal(m.tv().phase, 'guess');
  assert.equal(m.tv().word, null, 'chance final: a TV não mostra a palavra');
  assert.equal(m.V(imp).word, null, 'chance final: o impostor não recebe a palavra');
  assert.equal(m.V(imp).mine.canGuess, true);

  m.g.action(imp, { t: 'guess', text: 'chute-errado' });
  const fim = m.tv();
  assert.ok(['scores', 'end'].includes(fim.phase));
  assert.ok(fim.word, 'depois do chute a palavra aparece');
});

test('impostor desiste do chute: a palavra aparece no placar', () => {
  const m = mesa(3);
  pegarImpostor(m);
  m.g.action(m.players[0], { t: 'next' });
  assert.equal(m.tv().phase, 'guess');
  m.g.action(m.players[0], { t: 'next' });
  assert.ok(m.tv().word);
});
