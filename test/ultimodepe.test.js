// Último de Pé: física das variantes, máquina de rodadas, o que cada tela pode ver, empates,
// quem sai no meio, reinício do servidor e uma partida inteira por WebSocket.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { mkdtemp, rm } = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const WebSocket = require('ws');
const { VARIANTS, rng } = require('../games/ultimodepe/rules');
const udp = require('../games/ultimodepe/game');

const P = VARIANTS.penguins, S = VARIANTS.shootout;
const toward = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);

// ---------- regras ----------
test('pinguins: mesma entrada, mesmo resultado (determinístico)', () => {
  const bodies = P.spawn(['a', 'b', 'c', 'd', 'e', 'f'], 10, rng(3));
  const aims = { a: 1, b: 2, c: 3, d: 4, e: 5, f: 6 };
  const r1 = P.resolve(bodies.map(b => ({ ...b })), aims, 10, rng(9));
  const r2 = P.resolve(bodies.map(b => ({ ...b })), aims, 10, rng(9));
  assert.deepEqual(r1, r2);
});

test('pinguins: batida de frente no meio devolve os dois para trás, sem ninguém cair', () => {
  const r = P.resolve([{ pid: 'a', x: -3, y: 0 }, { pid: 'b', x: 3, y: 0 }], { a: 0, b: Math.PI }, 10, rng(1));
  assert.deepEqual(r.out, []);
  const a = r.final.find(f => f.pid === 'a'), b = r.final.find(f => f.pid === 'b');
  assert.ok(a.x < -4 && b.x > 4, 'os dois voltam escorregando para o próprio lado');
  assert.equal(r.replay.hits.length, 1);
});

test('pinguins: quem está perto da borda e leva a batida cai', () => {
  const r = P.resolve([{ pid: 'a', x: -6, y: 0 }, { pid: 'b', x: 0, y: 0 }], { a: 0, b: Math.PI }, 10, rng(1));
  assert.deepEqual(r.out, ['a']);
  assert.ok(r.replay.fall.a > 0);
});

test('pinguins: dash para fora do gelo é queda (a escolha tem peso)', () => {
  const r = P.resolve([{ pid: 'a', x: 5.6, y: 0 }, { pid: 'b', x: -5.6, y: 0 }], { a: 0, b: Math.PI / 2 }, 10, rng(2));
  assert.deepEqual(r.out, ['a']);
});

test('pinguins: o gelo derretido empurra para dentro quem ficou fora', () => {
  const b = P.prepare([{ pid: 'a', x: 9.5, y: 0, face: 0 }], 8);
  assert.ok(Math.hypot(b[0].x, b[0].y) < 8 - P.BODY);
});

test('tiroteio: dois que se miram caem juntos; o terceiro que errou fica', () => {
  const r = S.resolve([{ pid: 'a', x: -4, y: 0 }, { pid: 'b', x: 4, y: 0 }, { pid: 'c', x: 0, y: 5 }], { a: 0, b: Math.PI, c: 0 }, 11);
  assert.deepEqual(r.out.sort(), ['a', 'b']);
  assert.deepEqual(r.final.map(f => f.pid), ['c']);
});

test('tiroteio: o primeiro corpo segura a bala', () => {
  const r = S.resolve([{ pid: 'a', x: -6, y: 0 }, { pid: 'b', x: 0, y: 0 }, { pid: 'c', x: 5, y: 0 }], { a: 0, b: Math.PI / 2, c: Math.PI / 2 }, 11);
  assert.deepEqual(r.out, ['b']);
});

test('tiroteio: nascem espalhados, longe uns dos outros', () => {
  const pts = S.spawn(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'], 11, rng(5));
  for (const p of pts) assert.ok(Math.hypot(p.x, p.y) < 11 * .82);
  for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) assert.ok(Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y) > 2.5);
});

// ---------- motor de rodadas com uma sala de mentira ----------
function sala(n) {
  const players = [];
  const cores = ['roxo', 'rosa', 'ciano', 'amarelo', 'verde', 'vermelho', 'azul', 'branco'];
  for (let i = 0; i < n; i++) players.push({ pid: 'p' + i, name: 'J' + i, color: cores[i], on: true });
  let timer = null;
  const api = {
    players,
    colorInfo: k => ({ key: k, hex: '#123456' }),
    byPid: pid => players.find(p => p.pid === pid) || null,
    setEvent() {}, addEvent() {},
    armTimer(ms) { timer = ms; }, clearTimer() { timer = null; },
    get timer() { return timer; },
    broadcast() {}, stream() {}, exit() {},
  };
  const g = udp.create(api);
  g.start();
  const V = (pid, type) => g.view(pid ? players.find(p => p.pid === pid) : null, type || 'phone');
  const tick = () => g.onTimeUp();
  const until = (phase, max) => { for (let i = 0; i < (max || 20) && V('p0').phase !== phase; i++) tick(); assert.equal(V('p0').phase, phase); };
  return { g, api, players, V, tick, until };
}
function aimAll(m, aims) { const v = m.V('p0'); for (const pid of Object.keys(aims)) m.g.input(m.players.find(p => p.pid === pid), { t: 'input', matchId: v.matchId, round: v.round, aim: aims[pid] }); }
// posições combinadas: injeta um estado de partida (restore volta para o MEMORIZE)
function montar(m, variant, bodies, extra) {
  const st = Object.assign({
    version: 1, phase: 'reveal', variant, matchId: 'm-test', roster: m.players.map(p => ({ pid: p.pid, name: p.name, color: '#123456' })),
    alive: bodies.map(b => b.pid), outList: [], bodies, aims: {}, radius: VARIANTS[variant].R0, round: 1, tie: 0, tiebreak: false, winners: [],
  }, extra || {});
  m.g.restore(st);
}

test('só o primeiro jogador escolhe a variante e começa; precisa de 2', () => {
  const m = sala(3);
  m.g.action(m.players[1], { t: 'udp-variant', variant: 'shootout' });
  assert.equal(m.V('p0').variant, 'penguins');
  m.g.action(m.players[0], { t: 'udp-variant', variant: 'shootout' });
  assert.equal(m.V('p0').variant, 'shootout');
  m.g.action(m.players[1], { t: 'udp-start' });
  assert.equal(m.V('p0').phase, 'setup');
  m.g.action(m.players[0], { t: 'udp-start' });
  assert.equal(m.V('p0').phase, 'intro');
  assert.equal(m.V('p0').roster.length, 3);
});

test('fases na ordem certa, com o servidor armando cada uma', () => {
  const m = sala(2);
  m.g.action(m.players[0], { t: 'udp-start' });
  const seq = [];
  for (let i = 0; i < 7; i++) { seq.push(m.V('p0').phase); assert.ok(m.api.timer > 0, 'toda fase tem relógio'); m.tick(); }
  assert.deepEqual(seq, ['intro', 'reveal', 'aim', 'ready', 'lock', 'action', 'result'].slice(0, 7));
});

test('escondido: cada celular só recebe a própria posição; a TV nenhuma; ninguém vê mira alheia', () => {
  const m = sala(3);
  m.g.action(m.players[0], { t: 'udp-start' });
  m.until('reveal');
  assert.equal(m.V('p0').bodies.length, 3, 'no MEMORIZE todo mundo aparece');
  m.tick();   // aim
  aimAll(m, { p1: 1.234 });
  for (const ph of ['aim', 'ready', 'lock']) {
    assert.equal(m.V('p0').phase, ph);
    const mine = m.V('p0');
    assert.deepEqual(mine.bodies.map(b => b.pid), ['p0']);
    assert.equal(m.V(null, 'tv').bodies.length, 0);
    assert.equal(mine.action, null);
    assert.ok(!JSON.stringify(mine).includes('1.234'), 'a mira de p1 não vaza para p0');
    assert.equal(m.V('p1').you.aim, 1.234, 'mas volta para o próprio dono');
    m.tick();
  }
  assert.equal(m.V('p0').phase, 'action');
  assert.equal(m.V(null, 'tv').bodies.length, 3, 'na execução todo mundo aparece de novo');
  assert.ok(m.V(null, 'tv').action.replay);
});

test('mira só vale escondido, na rodada certa e de quem está vivo', () => {
  const m = sala(2);
  montar(m, 'shootout', [{ pid: 'p0', x: -4, y: 0, face: Math.PI / 2 }, { pid: 'p1', x: 4, y: 0, face: Math.PI / 2 }]);
  assert.equal(m.V('p0').phase, 'reveal');
  aimAll(m, { p0: 0 });                                    // durante o MEMORIZE: ignorado
  m.tick();                                                // aim
  m.g.input(m.players[0], { t: 'input', matchId: 'outra', round: 1, aim: 0 });
  m.g.input(m.players[0], { t: 'input', matchId: 'm-test', round: 7, aim: 0 });
  m.g.input(m.players[0], { t: 'input', matchId: 'm-test', round: 1, aim: 'x' });
  m.until('action');
  assert.deepEqual(m.V('p0').action.out, [], 'nenhuma dessas miras valeu: os dois atiraram para cima');
});

test('a mira que chega na folga do fechamento (lock) ainda vale; depois dela, não', () => {
  const m = sala(2);
  montar(m, 'shootout', [{ pid: 'p0', x: -4, y: 0, face: Math.PI / 2 }, { pid: 'p1', x: 4, y: 0, face: Math.PI / 2 }]);
  m.until('lock');
  aimAll(m, { p0: 0 });                                    // chegou atrasada pelo ping, mas antes de resolver
  m.tick();                                                // action
  aimAll(m, { p1: Math.PI });                              // depois de resolvido: não muda nada
  assert.deepEqual(m.V('p0').action.out, ['p1']);
  m.tick();
  assert.equal(m.V('p0').phase, 'result');
  assert.equal(m.V('p0').phase, 'result');
});

test('tiroteio: último de pé vence e a classificação guarda a ordem', () => {
  const m = sala(3);
  montar(m, 'shootout', [{ pid: 'p0', x: -5, y: 0, face: 0 }, { pid: 'p1', x: 0, y: 0, face: 0 }, { pid: 'p2', x: 0, y: 6, face: 0 }]);
  m.until('aim');
  aimAll(m, { p0: 0, p1: Math.PI / 2, p2: -Math.PI / 2 });   // p0 acerta p1; p1 acerta p2; p2 acerta p1
  m.until('result');
  const v = m.V('p0');
  assert.deepEqual(v.result.out.sort(), ['p1', 'p2']);
  assert.ok(v.ending);
  assert.deepEqual(v.winners, ['p0']);
  m.tick();
  assert.equal(m.V('p0').phase, 'end');
  assert.deepEqual(m.V('p0').outList.map(o => o.pid).sort(), ['p1', 'p2']);
});

test('todos os que restam saem juntos: desempate só entre eles; 3 seguidos = vitória dividida', () => {
  const m = sala(3);
  // p2 já tinha saído; p0 e p1 se acertam
  montar(m, 'shootout', [{ pid: 'p0', x: -4, y: 0, face: 0 }, { pid: 'p1', x: 4, y: 0, face: 0 }], { outList: [{ pid: 'p2', round: 1 }], round: 2 });
  for (let k = 1; k <= 3; k++) {
    m.until('aim');
    const v = m.V('p0'), a = m.V('p0').bodies[0], b = m.V('p1').bodies[0];
    aimAll(m, { p0: toward(a, b), p1: toward(b, a) });
    m.until('result');
    const r = m.V('p0');
    assert.equal(r.result.tie, true);
    if (k < 3) {
      assert.equal(r.tiebreak, true);
      assert.deepEqual(r.alive.sort(), ['p0', 'p1'], 'os dois voltam para o desempate');
      m.tick();
      assert.equal(m.V('p0').phase, 'reveal');
      assert.equal(m.V('p0').tiebreak, true);
      assert.equal(m.V('p0').round, v.round + 1);
      assert.equal(m.V('p2').you.alive, false, 'quem já tinha saído não volta');
    } else {
      assert.deepEqual(r.winners.sort(), ['p0', 'p1']);
      m.tick();
      assert.equal(m.V('p0').phase, 'end');
    }
  }
});

test('pinguins: os dois últimos caindo juntos também vão para o desempate', () => {
  const m = sala(2);
  montar(m, 'penguins', [{ pid: 'p0', x: 6.5, y: 0, face: 0 }, { pid: 'p1', x: -6.5, y: 0, face: Math.PI }]);
  m.until('aim');
  aimAll(m, { p0: 0, p1: Math.PI });
  m.until('result');
  assert.equal(m.V('p0').result.tie, true);
  m.tick();
  const v = m.V('p0');
  assert.equal(v.phase, 'reveal');
  assert.equal(v.bodies.length, 2);
  for (const b of v.bodies) assert.ok(Math.hypot(b.x, b.y) < v.radius - 1, 'o desempate começa com todos de volta no gelo');
});

test('rodada sem ninguém caindo segue, e o gelo derrete', () => {
  const m = sala(2);
  montar(m, 'penguins', [{ pid: 'p0', x: 0, y: -3, face: 0 }, { pid: 'p1', x: 0, y: 3, face: 0 }]);
  m.until('aim');
  aimAll(m, { p0: 0, p1: Math.PI });
  m.until('result');
  assert.equal(m.V('p0').result.none, true);
  const r1 = m.V('p0').radius;
  m.tick();
  assert.equal(m.V('p0').phase, 'reveal');
  assert.ok(m.V('p0').radius < r1);
  assert.equal(m.V('p0').shrunk, true);
});

test('quem sai da sala no meio da rodada escondida: o outro vence na hora', () => {
  const m = sala(2);
  m.g.action(m.players[0], { t: 'udp-start' });
  m.until('aim');
  m.players.splice(1, 1);                                  // o núcleo tira a vaga e avisa o jogo
  m.g.onPlayerLeave('p1');
  const v = m.V('p0');
  assert.equal(v.phase, 'result');
  assert.deepEqual(v.winners, ['p0']);
  m.tick();
  assert.equal(m.V('p0').phase, 'end');
});

test('quem sai durante a execução não conta como eliminado nem trava a rodada', () => {
  const m = sala(3);
  montar(m, 'shootout', [{ pid: 'p0', x: -5, y: 0, face: 0 }, { pid: 'p1', x: 5, y: 0, face: 0 }, { pid: 'p2', x: 0, y: 6, face: 0 }]);
  m.until('aim');
  aimAll(m, { p0: Math.PI / 2 + .3, p1: Math.PI / 2 - .3, p2: -Math.PI / 2 + .3 });
  m.until('action');
  m.players.splice(2, 1); m.g.onPlayerLeave('p2');
  m.tick();
  const v = m.V('p0');
  assert.deepEqual(v.alive.sort(), ['p0', 'p1']);
  assert.equal(v.phase, 'result');
});

test('trocou de celular no meio da rodada (rekey): a vaga, a mira e o corpo vão junto', () => {
  const m = sala(2);
  montar(m, 'shootout', [{ pid: 'p0', x: -4, y: 0, face: Math.PI / 2 }, { pid: 'p1', x: 4, y: 0, face: Math.PI / 2 }]);
  m.until('aim');
  aimAll(m, { p0: 0 });
  m.g.rekey('p0', 'novo'); m.players[0].pid = 'novo';
  const v = m.V('novo');
  assert.equal(v.you.alive, true);
  assert.equal(v.you.aim, 0);
  assert.deepEqual(v.bodies.map(b => b.pid), ['novo']);
  m.until('action');
  assert.deepEqual(m.V('novo').action.out, ['p1']);
});

test('servidor reiniciou no meio: a rodada volta para o MEMORIZE com as mesmas posições', () => {
  const m = sala(3);
  m.g.action(m.players[0], { t: 'udp-start' });
  m.until('ready');
  const saved = JSON.parse(JSON.stringify(m.g.serialize()));
  assert.equal(saved.action, null, 'o replay não vai para o disco');
  const m2 = sala(3);
  m2.g.restore(saved);
  const v = m2.V('p0');
  assert.equal(v.phase, 'reveal');
  assert.equal(v.round, 1);
  assert.equal(v.bodies.length, 3);
  assert.deepEqual(v.bodies.map(b => [b.pid, b.x, b.y]).sort(), saved.bodies.map(b => [b.pid, b.x, b.y]).sort());
});

test('jogar de novo começa outra partida com a mesma variante', () => {
  const m = sala(2);
  m.g.action(m.players[0], { t: 'udp-variant', variant: 'shootout' });
  montar(m, 'shootout', [{ pid: 'p0', x: -4, y: 0, face: 0 }, { pid: 'p1', x: 4, y: 3, face: 0 }]);
  m.until('aim');
  aimAll(m, { p0: toward({ x: -4, y: 0 }, { x: 4, y: 3 }), p1: Math.PI / 2 });
  m.until('end', 30);
  m.g.action(m.players[1], { t: 'udp-again' });
  assert.equal(m.V('p0').phase, 'end', 'só o primeiro jogador reinicia');
  m.g.action(m.players[0], { t: 'udp-again' });
  assert.equal(m.V('p0').phase, 'intro', 'jogar de novo começa outra partida, sem voltar ao menu');
  assert.equal(m.V('p0').variant, 'shootout');
});

test('pinguins: força do dash muda o alcance; fraco não cai da borda, forte cai', () => {
  const at = p => P.resolve([{ pid: 'a', x: 2, y: 0 }], { a: 0 }, 10, rng(1), { a: p });
  assert.deepEqual(at(.3).out, [], 'dash fraco para antes da borda');
  assert.deepEqual(at(1).out, ['a'], 'dash forte passa da borda');
  assert.ok(P.reachTable[0][1] < P.reachTable[P.reachTable.length - 1][1]);
});

test('força: só nos pinguins, presa entre o mínimo e 100%, e nunca vaza para os outros', () => {
  const m = sala(2);
  montar(m, 'penguins', [{ pid: 'p0', x: 2, y: 0, face: Math.PI }, { pid: 'p1', x: -2, y: 5, face: Math.PI }]);
  m.until('aim');
  const v = m.V('p0');
  assert.equal(v.power, true);
  assert.equal(v.you.power, P.POWER_DEF, 'começa na força padrão');
  m.g.input(m.players[0], { t: 'input', matchId: v.matchId, round: v.round, aim: 0, power: 7 });
  assert.equal(m.V('p0').you.power, 1);
  m.g.input(m.players[0], { t: 'input', matchId: v.matchId, round: v.round, aim: 0, power: .05 });
  assert.equal(m.V('p0').you.power, P.POWER_MIN);
  m.g.input(m.players[1], { t: 'input', matchId: v.matchId, round: v.round, aim: Math.PI, power: .77 });
  assert.ok(!JSON.stringify(m.V('p0')).includes('0.77'));
  m.g.input(m.players[0], { t: 'input', matchId: v.matchId, round: v.round, aim: 0, power: 1 });
  m.until('result');
  assert.deepEqual(m.V('p0').result.out, ['p0'], 'força cheia para fora do gelo: caiu');
});

test('opção "mostrar todo mundo antes" desligada: só o intro da partida mostra; as rodadas não', () => {
  const m = sala(3);
  m.g.action(m.players[1], { t: 'udp-show', on: false });
  assert.equal(m.V('p0').showOthers, true, 'só o primeiro jogador muda a opção');
  m.g.action(m.players[0], { t: 'udp-show', on: false });
  assert.equal(m.V('p0').showOthers, false);
  m.g.action(m.players[0], { t: 'udp-variant', variant: 'shootout' });
  assert.equal(m.V('p0').showOthers, false, 'trocar a variante mantém a opção');
  m.g.action(m.players[0], { t: 'udp-start' });
  assert.equal(m.V('p0').phase, 'intro');
  assert.equal(m.V('p0').bodies.length, 3, 'o intro mostra todo mundo uma vez (senão a 1ª rodada é sorte)');
  m.tick();
  for (const ph of ['reveal', 'aim']) {
    assert.equal(m.V('p0').phase, ph);
    assert.deepEqual(m.V('p0').bodies.map(b => b.pid), ['p0']);
    assert.equal(m.V(null, 'tv').bodies.length, 0);
    assert.equal(m.V('p0').blind, true);
    m.tick();
  }
  m.until('action');
  assert.equal(m.V(null, 'tv').bodies.length, 3, 'a execução continua à vista de todos');
});

test('tiroteio sem espiar: ninguém muda de lugar entre rodadas (a memória vale)', () => {
  const m = sala(3);
  m.g.action(m.players[0], { t: 'udp-show', on: false });
  montar(m, 'shootout', [{ pid: 'p0', x: -4, y: 0, face: Math.PI / 2 }, { pid: 'p1', x: 4, y: 0, face: Math.PI / 2 }, { pid: 'p2', x: 0, y: 5, face: 0 }], { showOthers: false });
  m.until('result');
  m.tick();
  const pos = m.V(null, 'tv');
  m.until('action');
  assert.deepEqual(m.V(null, 'tv').bodies.map(b => [b.pid, b.x, b.y]).sort(), [['p0', -4, 0], ['p1', 4, 0], ['p2', 0, 5]]);
  assert.ok(pos);
});

test('tiroteio: no 3, 2, 1 o lugar fica fixo; só a mira ainda muda', () => {
  const m = sala(2);
  montar(m, 'shootout', [{ pid: 'p0', x: -4, y: 0, face: 0 }, { pid: 'p1', x: 4, y: 0, face: Math.PI }]);
  m.tick();   // aim
  const v = m.V('p1');
  m.g.input(m.players[1], { t: 'input', matchId: v.matchId, round: v.round, aim: Math.PI, mx: 4, my: 2 });
  const antes = m.V('p1').you.move;
  assert.ok(antes && Math.hypot(antes.x - 4, antes.y - 2) < 1e-6, 'na fase de mira dá para andar');
  m.until('ready');
  m.g.input(m.players[1], { t: 'input', matchId: v.matchId, round: v.round, aim: Math.PI / 2, mx: 4, my: -2 });
  const depois = m.V('p1').you;
  assert.deepEqual(depois.move, antes, 'no 3, 2, 1 o lugar não muda');
  assert.ok(Math.abs(depois.aim - Math.PI / 2) < 1e-6, 'no 3, 2, 1 a mira muda');
});

test('tiroteio: trocar de lugar escondido; o tiro sai do lugar novo; o destino é limitado', () => {
  const m = sala(2);
  montar(m, 'shootout', [{ pid: 'p0', x: -4, y: 0, face: 0 }, { pid: 'p1', x: 4, y: 0, face: Math.PI }]);
  aimAll(m, {});
  const v0 = m.V('p0');
  m.g.input(m.players[0], { t: 'input', matchId: v0.matchId, round: v0.round, aim: 0, mx: -4, my: 3 });   // durante o MEMORIZE: não vale
  m.tick();   // aim
  const v = m.V('p0');
  m.g.input(m.players[1], { t: 'input', matchId: v.matchId, round: v.round, aim: Math.PI, mx: 4, my: 50 });   // longe demais: vai só até o limite
  assert.ok(!JSON.stringify(m.V('p0')).includes('"move":{'), 'o lugar novo de p1 não vaza para p0');
  const mv = m.V('p1').you.move;
  assert.ok(Math.hypot(mv.x - 4, mv.y) <= S.MOVE + 1e-6);
  m.g.input(m.players[0], { t: 'input', matchId: v.matchId, round: v.round, aim: Math.PI / 2 });
  m.until('action');
  const r = m.V('p0').action;
  assert.deepEqual(r.out, [], 'p1 saiu da linha e p0 atirou para baixo: ninguém caiu');
  assert.deepEqual(r.replay.moves.p1.slice(0, 2), [4, 0]);
  const shot = r.replay.shots.find(x => x.pid === 'p1');
  assert.ok(Math.hypot(shot.x - mv.x, shot.y - mv.y) < 1.2, 'o tiro sai do lugar novo');
  m.until('result');
  const p1 = m.V('p1').bodies.find(b => b.pid === 'p1');
  assert.deepEqual([p1.x, p1.y], [mv.x, mv.y]);
});

test('arena cresce com a turma: 8 jogadores têm mais espaço que 4', () => {
  const small = sala(4), big = sala(8);
  for (const m of [small, big]) m.g.action(m.players[0], { t: 'udp-start' });
  assert.ok(big.V('p0').radius > small.V('p0').radius + 3);
  assert.ok(big.V('p0').zoom > 1);
  assert.equal(small.V('p0').zoom, 1);
});

test('alguém sai da sala no resultado e só sobra um: vence em vez de jogar sozinho', () => {
  const m = sala(3);
  montar(m, 'shootout', [{ pid: 'p0', x: -5, y: 0, face: 0 }, { pid: 'p1', x: 5, y: 5, face: 0 }, { pid: 'p2', x: 5, y: -5, face: 0 }]);
  m.until('aim');
  aimAll(m, { p0: Math.PI, p1: 0, p2: 0 });   // todo mundo erra
  m.until('result');
  assert.equal(m.V('p0').result.none, true);
  m.players.splice(2, 1); m.g.onPlayerLeave('p2');
  m.players.splice(1, 1); m.g.onPlayerLeave('p1');
  m.tick();
  const v = m.V('p0');
  assert.equal(v.phase, 'result');
  assert.ok(v.ending);
  assert.deepEqual(v.winners, ['p0']);
});

test('reiniciou no meio: o MEMORIZE de volta tem o tempo inteiro', () => {
  const m = sala(2);
  m.g.action(m.players[0], { t: 'udp-start' });
  m.until('aim');
  const saved = JSON.parse(JSON.stringify(m.g.serialize()));
  const m2 = sala(2);
  m2.g.restore(saved);
  assert.equal(m2.V('p0').phase, 'reveal');
  assert.equal(m2.api.timer, m2.V('p0').phaseMs, 'o relógio foi armado com o tempo da fase');
});

test('rekey de alguém da torcida para dentro de um vivo não elimina o vivo', () => {
  const m = sala(3);
  m.g.action(m.players[0], { t: 'udp-start' });
  m.until('aim');
  m.g.rekey('fantasma', 'p1');
  assert.ok(m.V('p1').alive.includes('p1'));
  assert.equal(m.V('p1').you.alive, true);
});

// ---------- partida de verdade, por WebSocket ----------
async function freePort() {
  const s = net.createServer();
  await new Promise(r => s.listen(0, '127.0.0.1', r));
  const port = s.address().port;
  await new Promise(r => s.close(r));
  return port;
}
async function until(fn, timeout) {
  const end = Date.now() + (timeout || 8000);
  while (Date.now() < end) { const v = fn(); if (v) return v; await new Promise(r => setTimeout(r, 15)); }
  throw new Error('tempo esgotado esperando a sala');
}
async function connect(port, hello) {
  const ws = new WebSocket(`ws://127.0.0.1:${port}`);
  const c = { ws, game: null, core: null, you: null, seen: [], send: m => ws.send(JSON.stringify(m)) };
  ws.on('message', raw => { const m = JSON.parse(raw); if (m.t === 'state') { c.core = m.core; c.game = m.game; c.you = m.you; if (m.game) c.seen.push(m.game); } });
  await new Promise((res, rej) => { ws.once('open', res); ws.once('error', rej); });
  c.send(hello);
  await until(() => c.core);
  return c;
}

test('partida inteira por WebSocket: TV + 3 celulares, sem vazar posição escondida', { timeout: 60000 }, async t => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'arcade-udp-'));
  const port = await freePort();
  const server = spawn(process.execPath, ['server.js'], { cwd: path.resolve(__dirname, '..'), env: { ...process.env, PORT: String(port), STATE_FILE: path.join(dir, 'state.json'), NO_LAN: '1', ULTIMO_TIME_SCALE: '0.06' }, stdio: ['ignore', 'pipe', 'pipe'] });
  let out = ''; server.stdout.on('data', d => out += d); server.stderr.on('data', d => out += d);
  const clients = [];
  t.after(async () => { for (const c of clients) c.ws.terminate(); server.kill(); await new Promise(r => server.exitCode !== null ? r() : server.once('exit', r)); await rm(dir, { recursive: true, force: true }); });
  await until(() => out.includes('ARCADE DA CASA'));
  const add = async h => { const c = await connect(port, h); clients.push(c); return c; };
  const tv = await add({ t: 'tv', room: 'UDPT' });
  const a = await add({ t: 'join', room: 'UDPT', pid: 'alpha', name: 'Ana', color: 'roxo' });
  const b = await add({ t: 'join', room: 'UDPT', pid: 'bravo', name: 'Bia', color: 'ciano' });
  const c = await add({ t: 'join', room: 'UDPT', pid: 'charlie', name: 'Caio', color: 'amarelo' });
  a.send({ t: 'play', id: 'ultimodepe' });
  await until(() => a.game && a.game.phase === 'setup');
  a.send({ t: 'udp-variant', variant: 'shootout' });
  await until(() => a.game.variant === 'shootout');
  a.send({ t: 'udp-start' });
  await until(() => a.game.phase === 'intro');
  // cada um mira no vizinho que viu no MEMORIZE (memória perfeita), rodada após rodada
  const phones = [a, b, c];
  const aimed = new Set();
  await until(() => {
    for (const p of phones) {
      const g = p.game;
      if (!g || !['aim', 'ready'].includes(g.phase) || !g.you.alive) continue;
      const k = p.you.pid + ':' + g.round;
      if (aimed.has(k)) continue;
      const seen = [...p.seen].reverse().find(s => s.phase === 'reveal' && s.round === g.round);
      if (!seen) continue;
      const me = seen.bodies.find(x => x.pid === p.you.pid), other = seen.bodies.find(x => x.pid !== p.you.pid);
      p.send({ t: 'input', matchId: g.matchId, round: g.round, aim: toward(me, other) });
      aimed.add(k);
    }
    return a.game.phase === 'end';
  }, 45000);
  assert.ok(a.game.winners.length >= 1);
  // nenhuma tela recebeu, numa fase escondida, a posição de outra pessoa
  for (const s of tv.seen) if (['aim', 'ready', 'lock'].includes(s.phase)) assert.equal(s.bodies.length, 0, 'TV em fase escondida');
  for (const p of phones) for (const s of p.seen) if (['aim', 'ready', 'lock'].includes(s.phase)) assert.ok(s.bodies.every(x => x.pid === p.you.pid), 'celular em fase escondida');
  // e a partida pode recomeçar e voltar para a biblioteca
  a.send({ t: 'udp-again' });
  await until(() => a.game && a.game.phase === 'intro');
  a.send({ t: 'quit' });
  await until(() => a.core.screen === 'library');
});
