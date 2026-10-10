'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const truco = require('../games/truco/game');

function table(variant, count = 2) {
  const players = Array.from({ length: count }, (_, i) => ({ pid: `p${i}`, name: `Jogador ${i}`, color: 'verde' }));
  let timerMs = null, timerEnd = null;
  const api = { players, byPid: pid => players.find(p => p.pid === pid), setEvent() {}, addEvent() {},
    armTimer(ms) { timerMs = ms; timerEnd = Date.now() + ms; },
    clearTimer() { timerMs = null; timerEnd = null; },
    get timerEnd() { return timerEnd; } };
  const game = truco.create(api);
  game.start(); game.action(players[0], { t: 'config', variant }); game.action(players[0], { t: 'begin' });
  return { game, players, view: pid => game.view(pid === null ? null : players[Number(pid.slice(1))]),
    tick() { assert.ok(timerMs > 0); timerMs = null; timerEnd = null; game.onTimeUp(); },
    get timerMs() { return timerMs; } };
}

test('três variantes têm baralhos e manilhas próprios', () => {
  const { deck, strength } = truco.rules;
  const french = deck('paulista'), spanish = deck('gaucho');
  assert.equal(french.length, 40);
  assert.equal(spanish.length, 40);
  assert.deepEqual([...new Set(spanish.map(c => c.s))].sort(), ['B', 'C', 'E', 'O']);
  assert.equal(spanish.some(c => c.n === 8 || c.n === 9), false);
  assert.ok(strength({ n: 1, s: 'E' }, 'gaucho') > strength({ n: 1, s: 'B' }, 'gaucho'));
  assert.ok(strength({ n: 1, s: 'B' }, 'gaucho') > strength({ n: 7, s: 'E' }, 'gaucho'));
  assert.ok(strength({ n: 4, s: 'C' }, 'mineiro') > strength({ n: 7, s: 'H' }, 'mineiro'));
  assert.ok(strength({ n: 5, s: 'C' }, 'paulista', { n: 4 }) > strength({ n: 5, s: 'H' }, 'paulista', { n: 4 }));
});

test('TV e outros celulares não recebem a mão privada', () => {
  const t = table('gaucho', 4);
  const mine = t.view('p0');
  const other = t.view('p1');
  const tv = t.view(null);
  assert.equal(mine.hand.length, 3);
  assert.equal(other.hand.length, 3);
  assert.equal(tv.hand.length, 0);
  assert.equal(JSON.stringify(tv).includes(JSON.stringify(mine.hand[0])), false);
  assert.equal(Object.keys(mine.teams).length, 4);
  assert.equal(mine.teams.p0, mine.teams.p2);
});

test('truco exige resposta e recusa dá o valor anterior', () => {
  const t = table('paulista');
  const first = t.view('p0').turn;
  const caller = t.players.find(p => p.pid === first);
  const responder = t.players.find(p => p.pid !== first);
  t.game.action(caller, { t: 'call', kind: 'truco' });
  assert.equal(t.view('p0').bid.points, 3);
  t.game.action(caller, { t: 'accept' });
  assert.equal(t.view('p0').stake, 1);
  t.game.action(responder, { t: 'reject' });
  const v = t.view('p0');
  assert.equal(v.phase, 'reveal');
  assert.equal(v.reveal.kind, 'hand');
  assert.equal(v.scores[v.teams[first]], 1);
  t.tick();
  assert.equal(t.view('p0').phase, 'round');
});

test('gaudério calcula envido e flor com figuras valendo zero', () => {
  const { envidoValue, florValue } = truco.rules;
  assert.equal(envidoValue([{ n: 7, s: 'O' }, { n: 6, s: 'O' }, { n: 12, s: 'C' }]), 33);
  assert.equal(florValue([{ n: 7, s: 'E' }, { n: 6, s: 'E' }, { n: 5, s: 'E' }]), 38);
  assert.equal(florValue([{ n: 7, s: 'E' }, { n: 6, s: 'E' }, { n: 5, s: 'C' }]), null);
});

test('opções de envido não revelam a flor oculta de outra pessoa', () => {
  const t = table('gaucho');
  const saved = t.game.serialize();
  saved.s.turn = 'p0';
  saved.s.dealHands.p0 = [{ n: 7, s: 'O' }, { n: 6, s: 'O' }, { n: 5, s: 'C' }];
  saved.s.dealHands.p1 = [{ n: 7, s: 'E' }, { n: 6, s: 'E' }, { n: 5, s: 'C' }];
  t.game.restore(saved);
  const withoutFlor = t.view('p0').availableCalls;
  saved.s.dealHands.p1[2].s = 'E';
  t.game.restore(saved);
  assert.deepEqual(t.view('p0').availableCalls, withoutFlor);
  assert.ok(withoutFlor.includes('envido'));
  t.game.action(t.players[0], { t: 'call', kind: 'envido' });
  assert.equal(t.view('p0').scores[1], 3);
  assert.equal(t.view('p0').florDone, true);
});

test('mão de onze deixa a dupla ver as cartas do parceiro e correr', () => {
  const t = table('paulista', 4);
  const saved = t.game.serialize();
  saved.s.scores = [11, 5]; saved.s.phase = 'round';
  t.game.restore(saved);
  t.game.action(t.players[0], { t: 'next' });
  const own = t.view('p0'), opponent = t.view('p1'), tv = t.view(null);
  assert.equal(own.phase, 'eleven');
  assert.equal(own.partnerHand.length, 3);
  assert.equal(opponent.partnerHand.length, 0);
  assert.equal(tv.partnerHand.length, 0);
  t.game.action(t.players[0], { t: 'eleven_run' });
  assert.equal(t.view('p0').scores[1], 6);
});

test('mão de ferro esconde a própria mão e proíbe truco', () => {
  const t = table('paulista');
  const saved = t.game.serialize();
  saved.s.scores = [11, 11]; saved.s.phase = 'round';
  t.game.restore(saved);
  t.game.action(t.players[0], { t: 'next' });
  let v = t.view('p0');
  assert.equal(v.iron, true);
  assert.equal(v.hand.length, 0);
  assert.equal(v.availableCalls.includes('truco'), false);
  t.game.action(t.players.find(p => p.pid === v.turn), { t: 'card' });
  v = t.view('p0');
  assert.equal(v.table.length, 1);
});

test('uma mão completa passa por até três vazas e soma os pontos', () => {
  const t = table('mineiro');
  for (let step = 0; step < 10 && t.view('p0').phase !== 'round'; step++) {
    if (t.view('p0').phase === 'reveal') { t.tick(); continue; }
    const pid = t.view('p0').turn;
    const card = t.view(pid).hand[0];
    t.game.action(t.players.find(p => p.pid === pid), { t: 'card', id: card.id });
  }
  if (t.view('p0').phase === 'reveal') t.tick();
  const v = t.view('p0');
  assert.equal(v.phase, 'round');
  assert.equal(v.tricks.length >= 2, true);
  assert.equal(v.scores[0] + v.scores[1], 2);
});

test('vaza mantém todas as cartas e bloqueia jogadas até acabar a pausa', () => {
  const t = table('paulista');
  for (let i = 0; i < 2; i++) {
    const pid = t.view('p0').turn;
    const card = t.view(pid).hand[0];
    t.game.action(t.players.find(p => p.pid === pid), { t: 'card', id: card.id });
  }
  const held = t.view('p0');
  assert.equal(held.phase, 'reveal');
  assert.equal(held.reveal.kind, 'trick');
  assert.equal(held.reveal.trick, 1);
  assert.equal(held.table.length, 2);
  assert.equal(held.turn, null);
  assert.equal(t.timerMs, 3200);
  assert.ok(held.reveal.endsAt > Date.now());
  const waitingHand = held.hand.length;
  t.game.action(t.players[0], { t: 'card', id: held.hand[0].id });
  assert.equal(t.view('p0').hand.length, waitingHand);
  t.tick();
  assert.equal(t.view('p0').phase, 'play');
  assert.equal(t.view('p0').table.length, 0);
  assert.equal(t.view('p0').trick, 1);
  assert.ok(t.view('p0').turn);
});

test('mão e partida final exibem o resultado antes de avançar', () => {
  const t = table('mineiro');
  const saved = t.game.serialize();
  saved.s.scores = [10, 0];
  saved.s.turn = 'p0';
  t.game.restore(saved);
  t.game.action(t.players[0], { t: 'call', kind: 'truco' });
  t.game.action(t.players[1], { t: 'reject' });
  const held = t.view('p0');
  assert.equal(held.phase, 'reveal');
  assert.equal(held.reveal.kind, 'match');
  assert.equal(held.reveal.winner, 0);
  assert.equal(held.reveal.points, 2);
  assert.equal(t.timerMs, 4500);
  t.tick();
  assert.equal(t.view('p0').phase, 'end');
  assert.equal(t.view('p0').winner, 0);
});

test('Gaudério joga até 12 por padrão e pode ir até 24', () => {
  const t = table('gaucho');
  assert.equal(t.view('p0').target, 12);
  t.game.start();
  t.game.action(t.players[0], { t: 'config', variant: 'gaucho' });
  t.game.action(t.players[0], { t: 'config', target: 24 });
  t.game.action(t.players[0], { t: 'config', target: 99 });
  t.game.action(t.players[0], { t: 'begin' });
  assert.equal(t.view('p0').target, 24);
  assert.match(t.view('p0').rules, /24 pontos/);
});

test('sorteio de lugares muda as duplas e a mesa guarda as vazas', () => {
  const t = table('paulista', 4);
  t.game.start();
  for (let i = 0; i < 20 && t.view('p0').seats.join() === 'p0,p1,p2,p3'; i++) t.game.action(t.players[0], { t: 'shuffle' });
  const seats = t.view('p0').seats;
  assert.notEqual(seats.join(), 'p0,p1,p2,p3');
  t.game.action(t.players[0], { t: 'begin' });
  const v = t.view('p0');
  assert.deepEqual(v.order, seats);
  assert.equal(v.teams[seats[0]], v.teams[seats[2]]);
  assert.equal(v.trickLead, v.turn);
  for (let i = 0; i < 4; i++) {
    const pid = t.view('p0').turn;
    const card = t.view(pid).hand[0];
    t.game.action(t.players[Number(pid.slice(1))], { t: 'card', id: card.id });
  }
  const after = t.view(null);
  assert.equal(after.history.length, 1);
  assert.equal(after.history[0].plays.length, 4);
  assert.ok(after.reveal.best.length >= 1);
  assert.equal(after.hand.length, 0);
});

test('pedido de truco fica registrado para a TV mostrar', () => {
  const t = table('paulista');
  const first = t.view('p0').turn;
  const caller = t.players.find(p => p.pid === first);
  const responder = t.players.find(p => p.pid !== first);
  t.game.action(caller, { t: 'call', kind: 'truco' });
  assert.equal(t.view(null).lastCall.pid, first);
  assert.equal(t.view(null).lastCall.points, 3);
  t.game.action(responder, { t: 'accept' });
  assert.equal(t.view(null).lastAnswer.accept, true);
  assert.equal(t.view(first).hand.some(c => c.top === (c.n === t.view(first).manilha)), true);
});
