'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const tefode = require('../games/tefode/game');

function table(count = 4) {
  const players = Array.from({ length: count }, (_, i) => ({ pid: `p${i}`, name: `Jogador ${i}`, color: 'rosa' }));
  const timers = [];
  const api = { players, byPid: pid => players.find(p => p.pid === pid), setEvent() {}, addEvent() {}, clearTimer() {}, armTimer(ms) { timers.push(ms); } };
  const game = tefode.create(api);
  game.start(); game.action(players[0], { t: 'begin' });
  return { game, players, timers, view: pid => game.view(pid === null ? null : players[Number(pid.slice(1))]) };
}

test('o baralho tem 40 cartas e a vira define a manilha', () => {
  const { deck, power, trickWinner } = tefode.rules;
  assert.equal(deck().length, 40);
  assert.ok(power({ n: 5, s: 'C' }, { n: 4 }) > power({ n: 3, s: 'D' }, { n: 4 }));
  assert.equal(trickWinner([
    { pid: 'a', card: { n: 3, s: 'C' } },
    { pid: 'b', card: { n: 3, s: 'D' } },
    { pid: 'c', card: { n: 4, s: 'H' } },
  ], { n: 7 }), 'c', 'cartas iguais se anulam, e o 4 ganha');
});

test('em rodada de uma carta, cada um vê só as cartas alheias', () => {
  const t = table();
  const v = t.view('p0');
  assert.equal(v.phase, 'bid');
  assert.equal(v.handSize, 1);
  assert.equal(v.hand.length, 0);
  assert.equal(v.ownHidden, true);
  assert.equal(v.visibleOthers.length, 3);
  assert.equal(t.view(null).visibleOthers.length, 0);
  assert.equal(t.view(null).hand.length, 0);
});

test('pessoa fora da rodada não vê as cartas na testa', () => {
  const t = table();
  const saved = t.game.serialize();
  saved.s.active = ['p0', 'p1', 'p2'];
  t.game.restore(saved);
  assert.equal(t.view('p3').visibleOthers.length, 0);
  assert.equal(t.view('p3').ownHidden, false);
});

test('saída de quem já foi eliminado não interrompe a rodada', () => {
  const t = table(5);
  const saved = t.game.serialize();
  saved.s.active = ['p0', 'p1', 'p2', 'p3'];
  t.game.restore(saved);
  t.game.onPlayerLeave('p4');
  assert.equal(t.view('p0').phase, 'bid');
  assert.equal(t.view('p0').active.length, 4);
});

test('distribuidor que sai passa a vez ao próximo lugar', () => {
  const t = table();
  assert.equal(t.view('p0').dealer, 'p3');
  t.game.onPlayerLeave('p3');
  assert.equal(t.view('p0').phase, 'result');
  t.game.action(t.players[0], { t: 'next' });
  assert.equal(t.view('p0').dealer, 'p0');
});

test('última aposta não pode fazer a soma igual ao número de cartas', () => {
  const t = table();
  for (let i = 0; i < 3; i++) {
    const v = t.view('p0');
    t.game.action(t.players.find(p => p.pid === v.turn), { t: 'bid', n: 0 });
  }
  let v = t.view('p0');
  assert.equal(v.availableBids.includes(1), false);
  t.game.action(t.players.find(p => p.pid === v.turn), { t: 'bid', n: 1 });
  assert.equal(t.view('p0').phase, 'bid');
  t.game.action(t.players.find(p => p.pid === v.turn), { t: 'bid', n: 0 });
  assert.equal(t.view('p0').phase, 'play');
  for (let i = 0; i < 4; i++) {
    v = t.view('p0');
    t.game.action(t.players.find(p => p.pid === v.turn), { t: 'card' });
  }
  v = t.view('p0');
  assert.equal(v.phase, 'reveal');
  assert.equal(v.table.length, 4, 'cartas ficam visíveis na revelação');
  assert.equal(v.turn, null, 'jogadas bloqueadas até o fim da pausa');
  assert.equal(t.timers.at(-1), 3800);
  t.game.action(t.players[0], { t: 'next' });
  assert.equal(t.view('p0').phase, 'reveal', 'não pula resultado cedo');
  t.game.onTimeUp();
  v = t.view('p0');
  assert.equal(v.phase, 'result');
  assert.equal(v.trick, 1);
  assert.equal(v.roundResults.length, 4);
  assert.equal(v.roundResults.reduce((a, r) => a + r.added, 0), Object.values(v.penalties).reduce((a, b) => a + b, 0));
  assert.equal(Object.values(v.penalties).reduce((a, b) => a + b, 0) >= 1, true);
});

test('a TV vê o resultado da vaza, mas não as mãos privadas', () => {
  const t = table();
  for (let i = 0; i < 4; i++) {
    const v = t.view('p0');
    t.game.action(t.players.find(p => p.pid === v.turn), { t: 'bid', n: 0 });
  }
  for (let i = 0; i < 4; i++) {
    const v = t.view('p0');
    t.game.action(t.players.find(p => p.pid === v.turn), { t: 'card' });
  }
  const tv = t.view(null);
  assert.equal(tv.phase, 'reveal');
  assert.equal(tv.table.length, 4);
  assert.equal(tv.hand.length, 0);
  assert.equal(tv.visibleOthers.length, 0);
  assert.ok(tv.reveal && tv.reveal.trick === 1);
});

test('rodadas completas eliminam pessoas e terminam com duas vencedoras', () => {
  const t = table();
  for (let step = 0; step < 500 && t.view('p0').phase !== 'end'; step++) {
    const v = t.view('p0');
    if (v.phase === 'result') { t.game.action(t.players[0], { t: 'next' }); continue; }
    if (v.phase === 'reveal') { t.game.onTimeUp(); continue; }
    const player = t.players.find(p => p.pid === v.turn);
    if (v.phase === 'bid') {
      const available = t.view(v.turn).availableBids;
      t.game.action(player, { t: 'bid', n: available.includes(0) ? 0 : available[0] });
    } else if (v.phase === 'play') {
      const card = t.view(v.turn).hand[0];
      t.game.action(player, { t: 'card', id: card && card.id });
    }
  }
  const v = t.view('p0');
  assert.equal(v.phase, 'end');
  assert.equal(v.winners.length, 2);
});

test('a mesa recebe ordem da vez, manilha, palpite proibido e a última jogada', () => {
  const t = table();
  let v = t.view(null);
  assert.deepEqual(v.seq, ['p0', 'p1', 'p2', 'p3'], 'quem fica depois do distribuidor dá o primeiro palpite');
  assert.equal(v.manilha, tefode.rules.manilhaOf(v.vira));
  assert.equal(v.forbiddenBid, null);
  for (let i = 0; i < 3; i++) t.game.action(t.players[i], { t: 'bid', n: 0 });
  assert.equal(t.view(null).forbiddenBid, 1, 'soma 0 com 1 carta: a última não pode dizer 1');
  t.game.action(t.players[3], { t: 'bid', n: 0 });
  v = t.view(null);
  assert.equal(v.phase, 'play');
  assert.equal(v.forbiddenBid, null);
  assert.equal(v.seq[0], v.turn);
  t.game.action(t.players.find(p => p.pid === v.turn), { t: 'card' });
  v = t.view(null);
  assert.equal(v.lastPlay.pid, v.table[0].pid);
  assert.deepEqual(v.lastPlay.card, v.table[0].card);
});

test('cartas iguais aparecem como anuladas na revelação', () => {
  const { cancelledPids } = tefode.rules;
  assert.deepEqual(cancelledPids([
    { pid: 'a', card: { n: 3, s: 'C' } },
    { pid: 'b', card: { n: 3, s: 'D' } },
    { pid: 'c', card: { n: 4, s: 'H' } },
  ], { n: 7 }), ['a', 'b']);
  const t = table();
  for (let i = 0; i < 4; i++) t.game.action(t.players[i], { t: 'bid', n: 0 });
  for (let i = 0; i < 4; i++) { const v = t.view(null); t.game.action(t.players.find(p => p.pid === v.turn), { t: 'card' }); }
  const v = t.view(null);
  assert.ok(Array.isArray(v.reveal.cancelled));
});

test('resultado marca quem foi eliminado na rodada', () => {
  const t = table(5);
  const saved = t.game.serialize();
  saved.s.penalties = { p0: 4, p1: 0, p2: 0, p3: 0, p4: 0 };
  t.game.restore(saved);
  const bidder = () => t.players.find(p => p.pid === t.view(null).turn);
  // p0 aposta 1 e as outras apostam 0 até a última, que precisa fugir da soma 1
  for (let i = 0; i < 5; i++) {
    const p = bidder(), opts = t.view(p.pid).availableBids;
    t.game.action(p, { t: 'bid', n: p.pid === 'p0' ? 1 : opts.includes(0) ? 0 : opts[0] });
  }
  for (let i = 0; i < 5; i++) t.game.action(bidder(), { t: 'card' });
  t.game.onTimeUp();
  const v = t.view(null);
  const row = v.roundResults.find(r => r.pid === 'p0');
  assert.equal(row.out, row.added > 0);
  assert.equal(v.active.includes('p0'), row.added === 0);
});
