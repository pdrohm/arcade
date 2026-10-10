'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const pife = require('../games/pife/game');

function table(count = 3) {
  const players = Array.from({ length: count }, (_, i) => ({ pid: `p${i}`, name: `Pessoa ${i}`, color: 'azul' }));
  const events = [];
  const api = { players, byPid: pid => players.find(p => p.pid === pid), setEvent: text => events.push(text), clearTimer() {} };
  const game = pife.create(api);
  game.start();
  return { game, players, events, view: pid => game.view(pid === null ? null : players[Number(pid.slice(1))]) };
}

test('aceita de 2 a 10 pessoas e distribui todas as cartas', () => {
  assert.equal(pife.meta.minPlayers, 2);
  assert.equal(pife.meta.maxPlayers, 10);
  for (const jokers of [false, true]) {
    for (const count of [2, 10]) {
      const t = table(count);
      t.game.action(t.players[0], { t: 'config', cfg: { jokers } });
      t.game.action(t.players[0], { t: 'begin' });
      const tv = t.view(null);
      assert.equal(tv.phase, 'play');
      assert.equal(tv.order.length, count);
      assert.equal(tv.deckN, (jokers ? 108 : 104) - count * 9 - 1);
      const all = t.players.flatMap(p => t.view(p.pid).hand.map(c => c.id));
      assert.equal(all.length, count * 9);
      assert.equal(new Set(all).size, all.length);
      assert.equal(tv.hand.length, 0);
    }
  }
  for (const count of [1, 11]) {
    const t = table(count);
    t.game.action(t.players[0], { t: 'begin' });
    assert.equal(t.view('p0').phase, 'setup');
  }
});

test('com 10 pessoas, o monte volta a usar os descartes sem travar', () => {
  const t = table(10);
  t.game.action(t.players[0], { t: 'begin' });
  for (let move = 0; move < 24; move++) {
    const turn = t.view('p0').turn;
    const player = t.players.find(p => p.pid === turn);
    t.game.action(player, { t: 'draw', from: 'stock' });
    const hand = t.view(turn).hand;
    assert.equal(hand.length, 10, `compra ${move + 1}`);
    t.game.action(player, { t: 'discard', id: hand[0].id });
    assert.equal(t.view(turn).hand.length, 9, `descarte ${move + 1}`);
  }
  assert.equal(t.view('p0').phase, 'play');
  assert.equal(t.view('p0').order.length, 10);
});

test('a escolha de coringa vale antes da partida', () => {
  const t = table();
  assert.equal(t.view('p0').phase, 'setup');
  t.game.action(t.players[0], { t: 'config', cfg: { jokers: false } });
  assert.equal(t.view('p1').cfg.jokers, false);
  t.game.action(t.players[0], { t: 'begin' });
  assert.equal(t.view('p0').phase, 'play');
  assert.equal(t.view('p0').hand.length, 9);
  assert.equal(t.view('p1').hand.length, 9);
  assert.ok(t.view('p0').hand.every(card => !card.joker));
  t.game.action(t.players[1], { t: 'config', cfg: { jokers: true } });
  assert.equal(t.view('p0').cfg.jokers, false, 'não muda as regras durante a partida');
});

test('cada mão é privada; a TV recebe só a mesa', () => {
  const t = table();
  t.game.action(t.players[0], { t: 'begin' });
  const own = t.view('p0');
  const other = t.view('p1');
  const tv = t.view(null);
  assert.equal(own.hand.length, 9);
  assert.equal(other.hand.length, 9);
  assert.notDeepEqual(own.hand.map(c => c.id), other.hand.map(c => c.id));
  assert.equal(tv.hand.length, 0);
  assert.equal(JSON.stringify(tv).includes(JSON.stringify(own.hand[0])), false);
});

test('só quem está na vez pode comprar e descartar', () => {
  const t = table();
  t.game.action(t.players[0], { t: 'begin' });
  const turn = t.view('p0').turn;
  const current = t.players.find(p => p.pid === turn);
  const wrong = t.players.find(p => p.pid !== turn);
  const before = t.view(turn).hand.map(c => c.id);
  t.game.action(wrong, { t: 'draw', from: 'stock' });
  assert.deepEqual(t.view(turn).hand.map(c => c.id), before);
  t.game.action(current, { t: 'draw', from: 'stock' });
  assert.equal(t.view(turn).hand.length, 10);
  t.game.action(current, { t: 'draw', from: 'stock' });
  assert.equal(t.view(turn).hand.length, 10, 'não compra duas vezes');
  t.game.action(current, { t: 'discard', id: 'not-a-card' });
  assert.equal(t.view(turn).hand.length, 10, 'não descarta carta que não tem');
  const id = t.view(turn).hand[0].id;
  t.game.action(current, { t: 'discard', id });
  assert.equal(t.view(turn).hand.length, 9);
  assert.equal(t.view('p0').discardTop.id, id);
  assert.notEqual(t.view('p0').turn, turn);
});

test('batida inventada não ganha a rodada', () => {
  const t = table();
  t.game.action(t.players[0], { t: 'begin' });
  const turn = t.view('p0').turn;
  const current = t.players.find(p => p.pid === turn);
  t.game.action(current, { t: 'draw', from: 'stock' });
  t.game.action(current, { t: 'knock', discardId: 'fake', groups: [['a','b','c'],['d','e','f'],['g','h','i']] });
  assert.equal(t.view('p0').phase, 'play');
  assert.equal(t.view(turn).hand.length, 10);
});

test('trincas, sequências e coringas seguem as regras escolhidas', () => {
  const c = (id, n, s, joker = false) => ({ id, n, s, joker });
  const { validMeld, validWin } = pife.rules;
  assert.equal(validMeld([c(1, 7, 'S'), c(2, 7, 'H'), c(3, 7, 'D')], false), true);
  assert.equal(validMeld([c(1, 7, 'S'), c(2, 7, 'S'), c(3, 7, 'D')], false), false);
  assert.equal(validMeld([c(1, 7, 'H'), c(2, 8, 'H'), c(3, 9, 'H')], false), true);
  assert.equal(validMeld([c(1, 12, 'H'), c(2, 13, 'H'), c(3, 1, 'H')], false), true);
  assert.equal(validMeld([c(1, 13, 'H'), c(2, 1, 'H'), c(3, 2, 'H')], false), false);
  assert.equal(validMeld([c(1, 7, 'S'), c(2, 8, 'S'), c(3, 0, null, true)], false), false);
  assert.equal(validMeld([c(1, 7, 'S'), c(2, 8, 'S'), c(3, 0, null, true)], true), true);
  assert.equal(validMeld([c(1, 7, 'S'), c(2, 0, null, true), c(3, 0, null, true)], true), false);
  const hand = [c(1, 2, 'S'), c(2, 3, 'S'), c(3, 4, 'S'), c(4, 7, 'S'), c(5, 7, 'H'), c(6, 7, 'D'),
    c(7, 10, 'C'), c(8, 11, 'C'), c(9, 12, 'C'), c(10, 5, 'H')];
  assert.equal(validWin(hand, 10, [[1, 2, 3], [4, 5, 6], [7, 8, 9]], false), true);
  assert.equal(validWin(hand, 10, [[1, 2, 3], [4, 5, 6], [7, 8, 8]], false), false);
});

test('uma batida válida fecha a rodada e marca um ponto', () => {
  const t = table();
  t.game.action(t.players[0], { t: 'begin' });
  const saved = t.game.serialize();
  const c = (id, n, s) => ({ id, n, s, joker: false });
  saved.s.hands.p0 = [c(1, 2, 'S'), c(2, 3, 'S'), c(3, 4, 'S'), c(4, 7, 'S'), c(5, 7, 'H'),
    c(6, 7, 'D'), c(7, 10, 'C'), c(8, 11, 'C'), c(9, 12, 'C'), c(10, 5, 'H')];
  saved.s.turn = 'p0';
  saved.s.step = 'discard';
  t.game.restore(saved);
  t.game.action(t.players[0], { t: 'knock', discardId: 10, groups: [[1, 2, 3], [4, 5, 6], [7, 8, 9]] });
  assert.equal(t.view('p0').phase, 'round');
  assert.equal(t.view('p0').roundWinner, 'p0');
  assert.equal(t.view('p0').scores.p0, 1);
});

test('cada pessoa arruma a ordem da própria mão; ordem inválida é ignorada', () => {
  const t = table(2);
  t.game.action(t.players[0], { t: 'begin' });
  const turn = t.view('p0').turn, other = turn === 'p0' ? 'p1' : 'p0';
  const who = pid => t.players.find(p => p.pid === pid);
  const ids = t.view(other).hand.map(c => c.id);
  const reversed = [...ids].reverse();
  // fora da vez também pode arrumar
  t.game.action(who(other), { t: 'reorder', ids: reversed });
  assert.deepEqual(t.view(other).hand.map(c => c.id), reversed);
  // entradas ruins: faltando carta, carta repetida, carta de outra pessoa, lixo
  const foreign = t.view(turn).hand[0].id;
  for (const bad of [reversed.slice(1), [reversed[0], ...reversed.slice(0, -1)], [foreign, ...reversed.slice(1)], 'abc', null, [...reversed, 999]]) {
    t.game.action(who(other), { t: 'reorder', ids: bad });
    assert.deepEqual(t.view(other).hand.map(c => c.id), reversed);
  }
  // a carta comprada vai para o fim da mão arrumada
  const mine = t.view(turn).hand.map(c => c.id);
  const shuffled = [...mine.slice(4), ...mine.slice(0, 4)];
  t.game.action(who(turn), { t: 'reorder', ids: shuffled });
  t.game.action(who(turn), { t: 'draw', from: 'stock' });
  const after = t.view(turn).hand.map(c => c.id);
  assert.deepEqual(after.slice(0, 9), shuffled);
  assert.equal(after.length, 10);
  // a ordem continua depois de salvar e restaurar
  const copy = pife.create({ players: t.players, byPid: pid => t.players.find(p => p.pid === pid), setEvent() {}, clearTimer() {} });
  copy.restore(JSON.parse(JSON.stringify(t.game.serialize())));
  assert.deepEqual(copy.view(who(turn)).hand.map(c => c.id), after);
});
