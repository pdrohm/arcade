// Jogos de fora (shared/ext/game.js): quem fica com o controle e o que chega na TV.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const externalGame = require('../shared/ext/game');

function sala(n, pads) {
  const players = [];
  for (let i = 0; i < n; i++) players.push({ pid: 'p' + i, name: 'J' + i, color: 'cor' + i, on: true });
  let streams = 0;
  const api = {
    players,
    byPid: pid => players.find(p => p.pid === pid) || null,
    setEvent() {}, broadcast() {}, stream() { streams++; },
  };
  const mod = externalGame({ id: 'teste', name: 'Teste', upstream: 'https://exemplo.com/', pads });
  const g = mod.create(api);
  g.start();
  return { mod, g, players, tv: () => g.view(null, 'tv'), cel: i => g.view(players[i], 'phone'), streams: () => streams };
}

test('a configuração vira um jogo do arcade', () => {
  const s = sala(1, 1);
  assert.equal(s.mod.meta.id, 'teste');
  assert.equal(s.mod.meta.minPlayers, 1);
  assert.equal(s.mod.meta.spectators, true);
  assert.equal(s.mod.ext.upstream, 'https://exemplo.com');
  assert.equal(s.tv().path, '/ext/teste/');
  s.g.destroy();
});

test('com 1 controle e 3 pessoas, o primeiro joga e os outros esperam', () => {
  const s = sala(3, 1);
  assert.deepEqual(s.tv().seats.map(p => p && p.pid), ['p0']);
  assert.equal(s.cel(0).mine, 0);
  assert.equal(s.cel(1).mine, -1);
  s.g.destroy();
});

test('qualquer um escolhe quem joga, e a pessoa sai do controle antigo', () => {
  const s = sala(3, 2);
  assert.deepEqual(s.tv().seats.map(p => p.pid), ['p0', 'p1']);
  s.g.action(s.players[2], { t: 'seat', slot: 0, pid: 'p2' });
  assert.deepEqual(s.tv().seats.map(p => p && p.pid), ['p2', 'p1']);
  s.g.action(s.players[0], { t: 'seat', slot: 0, pid: 'p1' });   // p1 muda do controle 2 para o 1
  assert.deepEqual(s.tv().seats.map(p => p && p.pid), ['p1', null]);
  s.g.action(s.players[0], { t: 'seat', slot: 9, pid: 'p0' });   // vaga que não existe: nada muda
  s.g.action(s.players[0], { t: 'seat', slot: 1, pid: 'zz' });   // pessoa que não está na sala: nada muda
  assert.deepEqual(s.tv().seats.map(p => p && p.pid), ['p1', null]);
  s.g.destroy();
});

test('só quem está no controle mexe nele, e os valores são limpos', () => {
  const s = sala(2, 1);
  s.g.input(s.players[1], { t: 'input', b: 1, a: [1, 1, 1, 1] });
  assert.deepEqual(s.tv().state[0], { b: 0, a: [0, 0, 0, 0] });
  s.g.input(s.players[0], { t: 'input', b: (1 << 20) | 1, a: [5, -0.5, 'x', null] });
  assert.deepEqual(s.tv().state[0], { b: 1, a: [1, -0.5, 0, 0] });
  assert.equal(s.streams(), 1);
  assert.equal(s.cel(0).state, undefined);   // o celular não recebe o estado dos controles
  s.g.destroy();
});

test('quem sai da sala libera o controle para o próximo', () => {
  const s = sala(2, 1);
  const gone = s.players.shift();
  s.g.onPlayerLeave(gone.pid);
  assert.deepEqual(s.tv().seats.map(p => p && p.pid), ['p1']);
  s.g.rekey('p1', 'p9');
  s.players[0].pid = 'p9';
  assert.deepEqual(s.tv().seats.map(p => p && p.pid), ['p9']);
  s.g.destroy();
});
