// Amigos de Merda: votação, empate (troca de voto e desempate de quem leu) e coroa.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const adm = require('../games/amigosdemerda/game.js');

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
  const g = adm.create(api);
  g.start();
  if (cfg) g.action(players[0], { t: 'config', cfg });
  g.action(players[0], { t: 'begin' });
  const de = pid => players.find(p => p.pid === pid);
  const tv = () => g.view(null, 'tv');
  const comprar = () => { g.action(de(tv().reader), { t: 'draw' }); assert.equal(tv().phase, 'vote'); };
  return { g, players, de, tv, comprar, V: p => g.view(p) };
}
const votar = (m, mapa) => { for (const [de, em] of Object.entries(mapa)) m.g.action(m.de(de), { t: 'vote', pid: em }); };

test('não vale votar em si mesmo; o mais apontado fica com a carta', () => {
  const m = mesa(4);
  m.comprar();
  m.g.action(m.de('p0'), { t: 'vote', pid: 'p0' });
  assert.equal(m.V(m.de('p0')).myVote, null, 'voto em si mesmo é ignorado');
  assert.equal(m.tv().votes, null, 'votos ficam escondidos durante a votação');
  votar(m, { p0: 'p1', p1: 'p2', p2: 'p1', p3: 'p1' });
  m.g.onTimeUp();
  const v = m.tv();
  assert.equal(v.phase, 'result');
  assert.equal(v.result.win, 'p1');
  assert.equal(v.cards.p1, 1);
  assert.equal(v.votes.p3, 'p1', 'no resultado, todo mundo vê quem apontou em quem');
});

test('empate: quem votou fora dos empatados troca e desempata', () => {
  const m = mesa(5);
  m.comprar();
  // p1 e p2 empatam com 2; p4 votou em p3 e pode trocar
  votar(m, { p0: 'p1', p1: 'p2', p2: 'p1', p3: 'p2', p4: 'p3' });
  m.g.onTimeUp();
  let v = m.tv();
  assert.equal(v.phase, 'tie');
  assert.deepEqual(v.tops.sort(), ['p1', 'p2']);
  assert.deepEqual(v.tieElig, ['p4']);
  m.g.action(m.de('p0'), { t: 'vote', pid: 'p2' });
  assert.equal(m.tv().votes.p0, 'p1', 'quem já votou num empatado não troca');
  m.g.action(m.de('p4'), { t: 'vote', pid: 'p2' });
  v = m.tv();
  assert.equal(v.phase, 'result');
  assert.equal(v.result.win, 'p2');
  assert.equal(v.result.how, 'troca');
});

test('empate que continua: o voto de quem leu a carta desempata', () => {
  const m = mesa(4);
  m.comprar();
  const r = m.tv().reader;
  const outros = m.players.map(p => p.pid).filter(x => x !== r);
  // r vota em outros[0]; outros[0] vota em outros[1]; os outros dois dividem → 2 x 2
  votar(m, { [r]: outros[0], [outros[0]]: outros[1], [outros[1]]: outros[0], [outros[2]]: outros[1] });
  m.g.onTimeUp();
  const v = m.tv();
  assert.equal(v.phase, 'result');
  assert.equal(v.result.win, outros[0]);
  assert.equal(v.result.how, 'leitor');
});

test('empate sem o voto de quem leu: ele escolhe entre os empatados', () => {
  const m = mesa(4);
  m.comprar();
  const r = m.tv().reader;
  const o = m.players.map(p => p.pid).filter(x => x !== r);
  // o[0] e o[1] empatam com 1 voto; quem leu não votou; ninguém fora do empate votou
  votar(m, { [o[0]]: o[1], [o[1]]: o[0] });
  m.g.onTimeUp();
  assert.equal(m.tv().phase, 'decide');
  m.g.action(m.de(o[2]), { t: 'vote', pid: o[0] });
  assert.equal(m.tv().phase, 'decide', 'só quem leu desempata');
  m.g.action(m.de(r), { t: 'vote', pid: o[1] });
  assert.equal(m.tv().result.win, o[1]);
});

test('quem junta a meta de cartas é coroado; a vez passa adiante', () => {
  const m = mesa(3, { goal: 3 });
  const leitores = [];
  for (let i = 0; i < 3; i++) {
    m.comprar();
    leitores.push(m.tv().reader);
    votar(m, { p0: 'p2', p1: 'p2', p2: 'p0' });
    m.g.onTimeUp();
    if (i < 2) { assert.equal(m.tv().phase, 'result'); m.g.action(m.de('p0'), { t: 'next' }); }
  }
  assert.equal(new Set(leitores).size, 3, 'cada um lê uma vez na roda');
  const v = m.tv();
  assert.equal(v.phase, 'end');
  assert.equal(v.champ, 'p2');
  assert.equal(v.won.p2.length, 3);
  m.g.action(m.de('p1'), { t: 'again' });
  assert.equal(m.tv().phase, 'setup');
});

test('quem leu sai da sala na hora de comprar: a vez passa', () => {
  const m = mesa(4);
  const r = m.tv().reader;
  const i = m.players.findIndex(p => p.pid === r);
  m.players.splice(i, 1);
  m.g.onPlayerLeave(r, i);
  const v = m.tv();
  assert.equal(v.phase, 'draw');
  assert.notEqual(v.reader, r);
  assert.ok(m.players.some(p => p.pid === v.reader));
});

test('salvar e restaurar no meio da votação', () => {
  const m = mesa(3);
  m.comprar();
  votar(m, { p0: 'p1' });
  const dump = JSON.parse(JSON.stringify(m.g.serialize()));
  const g2 = adm.create({ ...m.g, players: m.players, byPid: pid => m.players.find(p => p.pid === pid), setEvent() {}, armTimer() {}, clearTimer() {}, timerEnd: null, broadcast() {} });
  g2.restore(dump);
  const v = g2.view(m.players[0]);
  assert.equal(v.phase, 'vote');
  assert.equal(v.myVote, 'p1');
  assert.ok(v.q);
});
