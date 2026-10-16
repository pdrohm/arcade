const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { mkdtemp, rm } = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const WebSocket = require('ws');
const Sim = require('../games/pogo/sim');

const DT = 1 / 60, { N, idx } = Sim._t;
const R = [0, 1, 2, 3];
const ents = (n = 4) => R.slice(0, n).map(s => ({ slot: s, bot: false, name: 'P' + s, color: '#f00' }));
function world(level, n = 4) {
  const w = Sim.create(ents(n), { level, cpuLevel: 1 });
  w.crateT = Infinity; w.itemT = Infinity;            // nada aparece sozinho nos testes de regra
  if (w.npc) w.npc = null;
  return w;
}
const place = (w, s, c, r) => { const p = w.p[s]; p.c = p.fc = p.tc = c; p.r = p.fr = p.tr = r; p.h = -1; };
const idle = () => ({ x: 0, y: 0 });
// segura uma direção até a pessoa terminar um pulo
function hop(w, s, dx, dy) {
  const ins = []; for (const p of w.p) ins[p.slot] = idle();
  ins[s] = { x: dx, y: dy };
  Sim.step(w, ins, DT);
  const ins2 = []; for (const p of w.p) ins2[p.slot] = idle();
  for (let i = 0; i < 40 && w.p[s].h >= 0; i++) Sim.step(w, ins2, DT);
}
const run = (w, sec, ins = []) => { for (let i = 0; i < sec * 60; i++) Sim.step(w, ins, DT); };

test('níveis e controles', () => {
  assert.deepEqual(Sim.levels.map(l => l.id), ['painter', 'gogo', 'loco', 'padlock']);
  for (const l of Sim.levels) { assert.ok(l.how.length >= 3 && l.how.length <= 5); const c = Sim.controls(l.id); assert.equal(c.stick, 'grid'); assert.ok(c.buttons.every(b => b.label.length <= 8)); }
});

test('começa nos cantos com a casa pintada; pular pinta e repinta a casa dos outros', () => {
  const w = world('painter');
  assert.equal(w.tiles[idx(0, 0)], 0); assert.equal(w.tiles[idx(N - 1, N - 1)], 3);
  hop(w, 0, 1, 0);
  assert.equal(w.p[0].c, 1); assert.equal(w.tiles[idx(1, 0)], 0);
  place(w, 1, 2, 0); hop(w, 1, -1, 0);            // a vaga 1 pula na casa nova da vaga 0
  assert.equal(w.p[1].c, 2, 'casa ocupada: volta para trás');
  place(w, 0, 0, 1); hop(w, 1, -1, 0);
  assert.equal(w.p[1].c, 1); assert.equal(w.tiles[idx(1, 0)], 1, 'repintou');
});

test('casa ocupada devolve o pulo (bump) e a borda não deixa sair', () => {
  const w = world('painter');
  place(w, 1, 1, 0);
  hop(w, 0, 1, 0);
  assert.equal(w.p[0].c, 0);
  assert.ok(w.fx.some(f => f.k === 'bump'));
  hop(w, 0, -1, 0); assert.equal(w.p[0].c, 0); assert.equal(w.p[0].h, -1);
  // o eixo maior manda: (0.9, 0.5) é para a direita
  place(w, 1, 5, 5); hop(w, 0, 0.5, 0.9); assert.equal(w.p[0].r, 1);
});

test('caixa: troca as casas por pontos, que voltam a ficar brancas; nova caixa depois', () => {
  const w = world('painter');
  for (const c of [1, 2, 3]) w.tiles[idx(c, 0)] = 0;
  w.crate = { c: 0, r: 1 };
  hop(w, 0, 0, 1);
  assert.equal(w.p[0].sc, 5, 'casa de saída + 3 + a casa da caixa');
  assert.equal(w.tiles.filter(t => t === 0).length, 0);
  assert.equal(w.crate, null);
  const f = w.fx.find(x => x.k === 'bank'); assert.equal(f.n, 5); assert.equal(f.tl.length, 5);
  w.crateT = 0.1; run(w, 0.2, [idle(), idle(), idle(), idle()]);
  assert.ok(w.crate);
});

test('Pogo-a-Gogo: contorno fechado com 2 casas dentro pontua 2 e apaga', () => {
  const w = world('gogo');
  w.tiles[idx(0, 0)] = -1;                         // dentro: (0,0) e (1,0); a borda vale como parede
  for (const [c, r] of [[2, 0], [0, 1], [1, 1]]) w.tiles[idx(c, r)] = 0;
  place(w, 0, 2, 2); hop(w, 0, 0, -1);           // pula em (2,1) e fecha o contorno
  assert.equal(w.p[0].sc, 2);
  assert.equal(w.tiles[idx(0, 0)], -1); assert.equal(w.tiles[idx(2, 1)], -1, 'o laço apaga');
  assert.ok(w.fx.some(f => f.k === 'loop' && f.n === 2));
});

test('Pogo-a-Gogo: bolso de 1 casa não pontua nem apaga', () => {
  const w = world('gogo');
  w.tiles[idx(0, 0)] = -1;
  for (const [c, r] of [[1, 0], [0, 1]]) w.tiles[idx(c, r)] = 0;
  place(w, 0, 1, 2); hop(w, 0, 0, -1);           // (1,1) fecha o canto (0,0)
  assert.equal(w.p[0].sc, 0);
  assert.equal(w.tiles[idx(1, 0)], 0); assert.equal(w.tiles[idx(1, 1)], 0, 'o contorno fica');
  assert.ok(!w.fx.some(f => f.k === 'loop'));
});

test('Pogo-a-Gogo: furo na diagonal, gente dentro ou o maior pedaço não fecham', () => {
  let w = world('gogo');
  w.tiles[idx(0, 0)] = -1;
  for (const [c, r] of [[2, 0], [0, 1]]) w.tiles[idx(c, r)] = 0;
  place(w, 0, 1, 2); hop(w, 0, 0, -1);           // falta (2,1): vaza pela diagonal
  assert.equal(w.p[0].sc, 0);
  w = world('gogo');
  w.tiles[idx(0, 0)] = -1;
  for (const [c, r] of [[2, 0], [0, 1], [1, 1]]) w.tiles[idx(c, r)] = 0;
  place(w, 1, 1, 0);                               // a vaga 1 está dentro
  place(w, 0, 2, 2); hop(w, 0, 0, -1);
  assert.equal(w.p[0].sc, 0);
  assert.deepEqual(Sim._t.enclosed(world('gogo'), 0, 2, true), [], 'sem parede não tem laço');
});

test('El Pogo Loco: laço pinta tudo dentro da sua cor (sem ponto direto)', () => {
  const w = world('loco');
  w.tiles[idx(0, 0)] = -1;
  for (const [c, r] of [[1, 0], [0, 1], [2, 1]]) w.tiles[idx(c, r)] = 0;
  w.tiles[idx(1, 1)] = 2;
  place(w, 0, 1, 3); hop(w, 0, 0, -1);
  assert.equal(w.p[0].sc, 0);
  assert.equal(w.tiles[idx(1, 1)], 0); assert.equal(w.tiles[idx(0, 0)], 0);
});

test('El Pogo Loco: dinamite explode em 3 s, apaga 3×3 e deixa tonto', () => {
  const w = world('loco');
  for (let c = 2; c <= 4; c++) for (let r = 2; r <= 4; r++) w.tiles[idx(c, r)] = 1;
  place(w, 1, 4, 4);
  w.tnt.push({ id: 99, c: 3, r: 3, t: 3, fly: 0 });
  run(w, 2.9, [idle(), idle(), idle(), idle()]);
  assert.equal(w.tnt.length, 1);
  run(w, 0.2, [idle(), idle(), idle(), idle()]);
  assert.equal(w.tnt.length, 0);
  assert.equal(w.tiles[idx(3, 3)], -1); assert.equal(w.tiles[idx(4, 4)], -1);
  assert.ok(w.p[1].stun > 0);
  // pisou na dinamite: explode na hora
  w.tnt.push({ id: 100, c: 1, r: 0, t: 3, fly: 0 });
  hop(w, 0, 1, 0);
  assert.equal(w.tnt.length, 0); assert.ok(w.p[0].stun > 0);
});

test('o Doido pula na borda, joga dinamite e no fim atira', () => {
  const w = Sim.create(ents(), { level: 'loco', cpuLevel: 1 });
  let toss = 0, fire = 0, offEdge = 0;
  for (let i = 0; i < 90 * 60; i++) {
    Sim.step(w, [idle(), idle(), idle(), idle()], DT);
    const [c, r] = Sim._t.RING[w.npc.k]; if (c > 0 && c < N - 1 && r > 0 && r < N - 1) offEdge++;
    for (const f of w.fx) { if (f.k === 'toss') toss++; if (f.k === 'fire' && f.s === -1) fire++; }
    w.fx.length = 0;
  }
  assert.equal(offEdge, 0); assert.ok(toss > 10, 'jogou dinamite: ' + toss); assert.ok(fire > 2, 'atirou no fim: ' + fire);
});

test('Pogo Padlock: pular na própria cor apaga tudo; cadeado protege e tranca', () => {
  const w = world('padlock');
  for (const c of [2, 3]) w.tiles[idx(c, 0)] = 0;
  hop(w, 0, 1, 0);                                  // (1,0) é branca: pinta
  assert.equal(w.tiles[idx(1, 0)], 0);
  hop(w, 0, 1, 0);                                  // (2,0) é dela: perde tudo
  assert.equal(w.tiles.filter(t => t === 0).length, 0);
  assert.ok(w.fx.some(f => f.k === 'wipe'));
  // com cadeado
  const v = world('padlock');
  for (const c of [1, 2]) v.tiles[idx(c, 0)] = 0;
  v.p[0].lock = 8;
  hop(v, 0, 1, 0);
  assert.equal(v.tiles.filter(t => t === 0).length, 3, 'não apagou');
  place(v, 1, 3, 1); hop(v, 1, 0, -1); hop(v, 1, -1, 0);   // a vaga 1 tenta repintar (2,0)
  assert.equal(v.tiles[idx(2, 0)], 0, 'casa trancada');
});

test('míssil: deixa tonto; no Padlock o atirador leva as casas (mesmo com cadeado)', () => {
  const w = world('padlock');
  place(w, 1, 5, 0); w.p[1].lock = 8;
  for (const c of [5, 6, 7]) w.tiles[idx(c, 1)] = 1;
  w.p[0].mis = true;
  Sim.step(w, [{ x: 1, y: 0, ap: true, a: true }, idle(), idle(), idle()], DT);
  assert.equal(w.p[0].mis, false);
  run(w, 1, [idle(), idle(), idle(), idle()]);
  assert.ok(w.p[1].stun > 0);
  assert.equal(w.tiles.filter(t => t === 1).length, 0);
  assert.ok(w.tiles.filter(t => t === 0).length >= 4);
  // tonto não pula
  const c = w.p[1].c; hop(w, 1, 1, 0); assert.equal(w.p[1].c, c);
  // Pogo-a-Gogo: sai para os 4 lados
  const g = world('gogo'); place(g, 0, 3, 3); g.p[0].mis = true;
  Sim.step(g, [{ x: 0, y: 0, ap: true, a: true }, idle(), idle(), idle()], DT);
  assert.equal(g.missiles.length, 4);
});

test('seta pinta a fila até a borda; botas deixam o pulo mais rápido', () => {
  const w = world('painter');
  w.items.push({ id: 1, k: 'arrow', c: 1, r: 0, d: 1, ttl: 10 });
  hop(w, 0, 1, 0);
  for (let r = 0; r < N; r++) assert.equal(w.tiles[idx(1, r)], 0);
  w.items.push({ id: 2, k: 'boots', c: 2, r: 0, d: 0, ttl: 10 });
  hop(w, 0, 1, 0);
  assert.ok(w.p[0].boots > 0);
  Sim.step(w, [{ x: 1, y: 0 }, idle(), idle(), idle()], DT);
  assert.equal(w.p[0].dur, Sim._t.HOP_FAST);
});

test('fim: mais pontos ganha; empate divide; zero a zero é empate', () => {
  let w = world('painter'); w.p[2].sc = 9; w.p[1].sc = 4; w.clock = DT / 2;
  run(w, DT * 2, [idle(), idle(), idle(), idle()]);
  assert.deepEqual(w.result.winners, [2]); assert.equal(w.result.order[0], 2);
  w = world('painter'); w.p[0].sc = 5; w.p[3].sc = 5; w.clock = DT / 2; run(w, DT * 2, []);
  assert.deepEqual(w.result.winners, [0, 3]);
  w = world('painter'); w.clock = DT / 2; run(w, DT * 2, []);
  assert.deepEqual(w.result.winners, []);
  const res = JSON.stringify(w.result); run(w, 3.6, []); assert.equal(JSON.stringify(w.result), res, 'resultado não muda na festa');
});

test('cada arena roda só com CPU até o fim, CPUs pulam e pontuam', () => {
  for (const lv of Sim.levels) for (const skill of [0, 1, 2]) {
    const w = Sim.create(R.map(s => ({ slot: s, bot: true, name: 'C' + s, color: '#0f0' })), { level: lv.id, cpuLevel: skill });
    const moved = [0, 0, 0, 0];
    let i = 0;
    for (; i < 100 * 60 && !w.result; i++) {
      const ins = []; for (const p of w.p) ins[p.slot] = Sim.bot(w, p.slot, skill, DT);
      const was = w.p.map(p => p.h);
      Sim.step(w, ins, DT);
      w.p.forEach((p, k) => { if (was[k] < 0 && p.h >= 0) moved[k]++; });
      w.fx.length = 0;
    }
    assert.ok(w.result, lv.id + ' terminou');
    assert.ok(i <= 91 * 60);
    assert.ok(Math.min(...moved) > 80, `${lv.id}/${skill} todos pulam: ${moved}`);
    assert.ok(w.p.some(p => p.sc > 10), `${lv.id}/${skill} alguém pontua`);
    const snap = Sim.snapshot(w), txt = JSON.stringify(snap);
    assert.ok(txt.length < 3000); assert.equal(snap.g.length, 64);
    assert.ok(!/\d\.\d{3}/.test(JSON.stringify(Object.assign({}, snap, { g: '' }))), 'números arredondados');
  }
});

test('CPU difícil ganha da fácil na maioria das partidas', () => {
  let hard = 0;
  for (let k = 0; k < 6; k++) {
    const w = Sim.create(R.map(s => ({ slot: s, bot: true, name: 'C' + s, color: '#0f0' })), { level: 'painter', cpuLevel: 1 });
    while (!w.result) { const ins = []; for (const p of w.p) ins[p.slot] = Sim.bot(w, p.slot, p.slot < 2 ? 2 : 0, DT); Sim.step(w, ins, DT); w.fx.length = 0; }
    if (w.p[0].sc + w.p[1].sc > w.p[2].sc + w.p[3].sc) hard++;
  }
  assert.ok(hard >= 5, 'difícil venceu ' + hard + '/6');
});

test('celular: placar, aviso do míssil e botão A apagado sem míssil', () => {
  const w = world('painter');
  let me = Sim.private(w, 0);
  assert.match(me.status, /0 PTS · 1 CASAS/); assert.equal(me.off.a, true);
  w.p[0].mis = true; me = Sim.private(w, 0);
  assert.equal(me.msg, 'MÍSSIL! APERTE A'); assert.equal(me.off.a, false);
  Sim.makeBot(w, 0); assert.equal(w.p[0].bot, true);
  assert.ok(Sim.bot(w, 0, 1, DT));
});

// ---------- sala de verdade ----------
async function freePort() {
  const socket = net.createServer();
  await new Promise(resolve => socket.listen(0, '127.0.0.1', resolve));
  const port = socket.address().port;
  await new Promise(resolve => socket.close(resolve));
  return port;
}
async function until(predicate, timeout = 10000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) { const v = predicate(); if (v) return v; await new Promise(r => setTimeout(r, 20)); }
  throw new Error('Timed out waiting for room state');
}
async function connect(port, hello) {
  const ws = new WebSocket(`ws://127.0.0.1:${port}`);
  const client = { ws, game: null, core: null, frames: 0, send: m => ws.send(JSON.stringify(m)) };
  ws.on('message', raw => {
    const msg = JSON.parse(raw);
    if (msg.t === 'state') { client.core = msg.core; client.game = msg.game; }
    if (msg.t === 'game-frame') { client.frames++; client.game = msg.game; }
  });
  await new Promise((resolve, reject) => { ws.once('open', resolve); ws.once('error', reject); });
  client.send(hello);
  await until(() => client.core);
  return client;
}

test('sala: TV + 2 celulares + CPU, contagem, pulos e visão certa de cada um', { timeout: 30000 }, async t => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'arcade-pogo-'));
  const port = await freePort();
  const server = spawn(process.execPath, ['server.js'], { cwd: path.resolve(__dirname, '..'), env: { ...process.env, PORT: String(port), STATE_FILE: path.join(dir, 'state.json'), STATS_KEY: 'test-only', NO_LAN: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = ''; server.stdout.on('data', d => output += d); server.stderr.on('data', d => output += d);
  const clients = [];
  t.after(async () => { for (const c of clients) c.ws.terminate(); server.kill(); await new Promise(r => server.exitCode !== null ? r() : server.once('exit', r)); await rm(dir, { recursive: true, force: true }); });
  await until(() => output.includes('ARCADE DA CASA'));
  const add = async hello => { const c = await connect(port, hello); clients.push(c); return c; };
  const tv = await add({ t: 'tv', room: 'POGO' });
  const a = await add({ t: 'join', room: 'POGO', pid: 'alpha', name: 'Ana', color: 'roxo' });
  const b = await add({ t: 'join', room: 'POGO', pid: 'bravo', name: 'Bia', color: 'ciano' });
  a.send({ t: 'play', id: 'pogo' });
  await until(() => a.game && a.game.phase === 'setup');
  assert.equal(a.game.levels.length, 4); assert.equal(a.game.controls.stick, 'grid');
  a.send({ t: 'bash-level', level: 2 });
  await until(() => a.game.level === 2);
  a.send({ t: 'bash-start' });
  await until(() => tv.game && tv.game.phase === 'loading');
  tv.send({ t: 'bash-tv-ready', matchId: tv.game.matchId });
  await until(() => tv.game.phase === 'countdown');
  assert.equal(tv.game.seats.length, 4, 'CPU completa as 4 vagas');
  await until(() => tv.game.phase === 'playing', 6000);
  const start = tv.game.world.p.find(p => p.id === 0);
  const pump = setInterval(() => { a.send({ t: 'input', matchId: a.game.matchId, x: 1, y: 0, a: false, active: true }); b.send({ t: 'input', matchId: b.game.matchId, x: 0, y: 1, a: false, active: true }); }, 50);
  t.after(() => clearInterval(pump));
  await new Promise(r => setTimeout(r, 900));
  clearInterval(pump);
  const w = tv.game.world;
  assert.ok(w && w.g && w.g.length === 64, 'TV recebe o mundo');
  assert.equal(w.lv, 'loco'); assert.ok(w.npc, 'o Doido está na arena');
  const pa = w.p.find(p => p.id === 0);
  assert.ok(pa.x > start.x + 1, 'a Ana pulou para a direita');
  assert.ok(w.g.split('').filter(ch => ch === '0').length >= 2, 'pintou casas');
  assert.ok(typeof w.clock === 'number' && w.clock < 90);
  assert.ok(a.game.me && /PTS/.test(a.game.me.status), 'celular recebe o próprio placar');
  assert.equal(a.game.world, null, 'celular não recebe o mundo');
  assert.equal(tv.game.me, null);
  assert.ok(tv.frames > 10, 'a TV recebe quadros rápidos');
  for (const url of ['/games/pogo/tv.js', '/games/pogo/phone.js', '/shared/bash/tv.js']) assert.equal((await fetch(`http://127.0.0.1:${port}${url}`)).status, 200, url);
  assert.equal((await fetch(`http://127.0.0.1:${port}/games/pogo/sim.js`)).status, 404);
});
