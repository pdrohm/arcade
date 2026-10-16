// Crate Crush: regras da simulação (caixas, TNT, Nitro, frutas, buracos, pinguim, armas, fim da rodada),
// CPU jogando sozinha e uma sala de verdade por WebSocket (TV + celulares).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { mkdtemp, rm } = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const WebSocket = require('ws');
const Sim = require('../games/cratecrush/sim');
const Game = require('../games/cratecrush/game');
const { DMG, FUSE, HP } = Sim._;

const DT = 1 / 60;
const idle = () => ({ x: 0, y: 0, a: false, b: false, c: false, ap: false, bp: false, cp: false });
const ents = n => Array.from({ length: n }, (_, i) => ({ slot: i, bot: false, name: 'P' + i, color: '#fff' }));
function world(level, n = 2, seed = 7) {
  const w = Sim.create(ents(n), { level, seed });
  w.crates = []; w.spawnT = 1e9;           // arena limpa e sem caixa caindo: cada teste monta a sua
  if (w.penguin) w.penguin.t = 1e9;        // pinguim dorme até o teste acordar
  return w;
}
function put(w, slot, x, y, dir = 0) { const p = w.players[slot]; p.x = x; p.y = y; p.dir = dir; p.vx = p.vy = p.kx = p.ky = 0; return p; }
function crate(w, k, x, y) { const c = Sim._.newCrate(w, k, x, y, 'g'); w.crates.push(c); return c; }
function run(w, sec, inp = {}) { for (let t = 0; t < sec; t += DT) Sim.step(w, w.players.map(p => Object.assign(idle(), inp[p.slot] || {})), DT); }
function press(w, slot, btn, extra = {}) { Sim.step(w, w.players.map(p => p.slot === slot ? Object.assign(idle(), { [btn]: true }, extra) : idle()), DT); }
const fxOf = (w, k) => w.fx.filter(f => f.k === k);

test('quatro arenas, controles e meta', () => {
  assert.deepEqual(Sim.levels.map(l => l.id), ['jungle', 'space', 'snow', 'drain']);
  for (const l of Sim.levels) {
    assert.ok(l.how.length >= 3 && l.how.length <= 5, l.id);
    const c = Sim.controls(l.id);
    assert.equal(c.stick, 'free');
    assert.deepEqual(c.buttons.map(b => b.id), ['a', 'b', 'c']);
    for (const b of c.buttons) assert.ok(b.label.length <= 8 && b.label === b.label.toUpperCase());
  }
  assert.equal(Game.meta.id, 'cratecrush');
  assert.equal(Game.meta.category, 'acao');
  assert.ok(Game.meta.glyph.length <= 3);
});

test('cada arena cria, roda e gera um retrato pequeno com ids estáveis', () => {
  for (const l of Sim.levels) {
    const w = Sim.create(ents(4).map((e, i) => Object.assign(e, { bot: i > 0 })), { level: l.id, seed: 3 });
    for (let i = 0; i < 600; i++) Sim.step(w, w.players.map(p => p.bot ? Sim.bot(w, p.slot, 1, DT) : idle()), DT);
    assert.ok(Math.abs(w.time - 10) < 0.05, 'world.time anda');
    const s = Sim.snapshot(w);
    assert.equal(s.lv, l.id);
    assert.ok(s.clock < 81 && s.clock > 79);
    assert.equal(s.p.length, 4);
    assert.ok(s.c.every(c => Number.isInteger(c.id)));
    assert.equal(new Set(s.c.map(c => c.id)).size, s.c.length);
    assert.ok(JSON.stringify(s).length < 4000, 'snapshot pequeno');
    if (l.id === 'snow') assert.ok(s.pg); else assert.equal(s.pg, undefined);
  }
});

test('pegar e jogar uma caixa: 22 de dano, a caixa quebra', () => {
  const w = world('jungle');
  put(w, 0, 4, 6, 0); const b = put(w, 1, 8, 6, Math.PI);
  crate(w, 'w', 4.9, 6);
  press(w, 0, 'ap');
  assert.ok(w.players[0].hold, 'segurando');
  assert.equal(w.crates[0].st, 'h');
  assert.equal(Sim.private(w, 0).off.c, true, 'chute desligado segurando caixa');
  run(w, 0.1);
  press(w, 0, 'ap', { x: 1, y: 0 });
  assert.equal(w.players[0].hold, null);
  run(w, 0.6);
  assert.equal(b.hp, HP - DMG.throw);
  assert.equal(w.crates.length, 0, 'quebrou');
  assert.ok(b.hits === 1);
});

test('mirar com o analógico na hora de jogar muda a direção', () => {
  const w = world('jungle');
  put(w, 0, 8, 6, 0); const b = put(w, 1, 8, 2, 0);
  crate(w, 'w', 8.9, 6);
  press(w, 0, 'ap');
  press(w, 0, 'ap', { x: 0, y: -1 });   // olhava para a direita, joga para cima
  run(w, 0.6);
  assert.equal(b.hp, HP - DMG.throw);
});

test('chute: 8 de dano, imunidade só contra chute, e faz caixa deslizar', () => {
  const w = world('jungle', 3);
  put(w, 0, 5, 6, 0); const b = put(w, 1, 6, 6, 0); put(w, 2, 12, 9);
  press(w, 0, 'cp');
  assert.equal(b.hp, HP - DMG.kick);
  run(w, 0.55);
  press(w, 0, 'cp');
  const after = b.hp;
  assert.ok(after >= HP - 2 * DMG.kick);
  // caixa chutada desliza e acerta quem estiver na frente
  const w2 = world('jungle');
  put(w2, 0, 3, 6, 0); const t = put(w2, 1, 9, 6, Math.PI);
  crate(w2, 'w', 3.9, 6);
  press(w2, 0, 'cp');
  assert.equal(w2.crates[0].st, 's');
  run(w2, 1.2);
  assert.equal(t.hp, HP - DMG.slide);
});

test('TNT: pegar acende 3 s, dá para jogar contando, explode com raio', () => {
  const w = world('jungle', 3);
  put(w, 0, 4, 6, 0); put(w, 1, 14, 2); put(w, 2, 14, 10);
  const c = crate(w, 't', 4.9, 6);
  press(w, 0, 'ap');
  assert.ok(Math.abs(c.fuse - FUSE) < 0.05);
  assert.match(Sim.private(w, 0).msg, /SEGURANDO TNT! 3/);
  run(w, 1.2);
  assert.match(Sim.private(w, 0).msg, /TNT! 2/);
  run(w, 2);
  assert.ok(c.dead, 'explodiu na mão');
  assert.equal(w.players[0].hp, HP - DMG.tnt);
  assert.equal(w.players[1].hp, HP, 'longe não leva');
  // TNT jogada explode ao acertar alguém
  const w2 = world('jungle');
  put(w2, 0, 4, 6, 0); const b = put(w2, 1, 8, 6);
  crate(w2, 't', 4.9, 6);
  press(w2, 0, 'ap'); press(w2, 0, 'ap', { x: 1, y: 0 });
  run(w2, 0.5);
  assert.ok(b.hp <= HP - 30, 'explosão no alvo');
  assert.ok(w2.players[0].hp > HP - 25, 'quem jogou ficou mais longe');
});

test('pular em cima da TNT acende; explosão em cadeia', () => {
  const w = world('jungle');
  put(w, 0, 6, 6); put(w, 1, 14, 10);
  const t1 = crate(w, 't', 6, 6), t2 = crate(w, 't', 7.5, 6), wood = crate(w, 'w', 6, 7.5);
  w.players[0].z = 0.9; w.players[0].vz = -1;
  run(w, DT * 2);
  assert.ok(t1.fuse > 0, 'acendeu');
  run(w, 3.2);
  assert.ok(t1.dead && t2.dead && wood.dead, 'cadeia levou a outra TNT e a caixa');
});

test('Nitro: não dá para pegar e explode ao encostar (40)', () => {
  const w = world('jungle');
  put(w, 0, 4, 6, 0); put(w, 1, 14, 10);
  const n = crate(w, 'n', 5.2, 6);
  press(w, 0, 'ap');
  assert.equal(w.players[0].hold, null);
  run(w, 0.5, { 0: { x: 1, y: 0 } });
  assert.ok(n.dead);
  assert.ok(w.players[0].hp <= HP - 30 && w.players[0].hp >= HP - DMG.nitro);
});

test('caixa de fruta solta 3 frutas e cada uma cura 5', () => {
  const w = world('jungle');
  const p = put(w, 0, 6, 6); put(w, 1, 14, 10);
  const f = crate(w, 'f', 9, 6);
  f.st = 'f'; f.z = 0.3; f.vx = 0; f.vy = 0; f.vz = -1; f.owner = 1;   // cai no chão e quebra
  run(w, 0.2);
  assert.equal(w.fruits.length, 3);
  p.hp = 50;
  run(w, 1);
  for (const fr of w.fruits.slice()) { put(w, 0, fr.x, fr.y); run(w, DT * 2); }
  assert.equal(p.hp, 50 + 3 * Sim._.FRUIT);
  assert.equal(w.fruits.length, 0);
});

test('levar golpe segurando caixa faz soltar; caixa caindo do céu machuca', () => {
  const w = world('jungle');
  const a = put(w, 0, 6, 6, 0); const b = put(w, 1, 7.1, 6, Math.PI);
  crate(w, 'w', 5.1, 6);
  a.dir = Math.PI; press(w, 0, 'ap');
  assert.ok(a.hold);
  press(w, 1, 'cp');
  assert.equal(a.hold, null, 'soltou');
  assert.equal(w.crates[0].st, 'g');
  const w2 = world('jungle');
  const p = put(w2, 0, 8, 6); put(w2, 1, 14, 10);
  const c = Sim._.newCrate(w2, 'w', 8, 6, 'd'); w2.crates.push(c);
  run(w2, 1.1);
  assert.equal(p.hp, HP - DMG.drop);
  assert.ok(b.hp === HP);
});

test('Space Bash: explosão abre buraco; andar no buraco elimina; pular por cima não', () => {
  const w = world('space', 3);
  put(w, 0, 3, 6); put(w, 1, 14, 2); put(w, 2, 14, 10);
  Sim._.explode(w, crate(w, 't', 8, 6));
  assert.equal(w.holes.length, 1);
  // pula por cima correndo
  put(w, 0, 4.6, 6, 0);
  run(w, 0.3, { 0: { x: 1, y: 0 } });
  press(w, 0, 'bp', { x: 1, y: 0 });
  run(w, 0.5, { 0: { x: 1, y: 0 } });
  assert.equal(w.players[0].out, false, 'passou pulando');
  assert.ok(w.players[0].x > 9);
  // agora anda para dentro
  run(w, 0.3);
  run(w, 0.9, { 0: { x: -1, y: 0 } });
  assert.equal(w.players[0].out, true);
  assert.equal(w.players[0].why, 'hole');
  assert.equal(Sim.private(w, 0).outText, 'Caiu no buraco!');
  assert.equal(Sim.snapshot(w).ho.length, 1);
});

test('Snow Bash: gelo escorrega, pinguim gira e machuca, caixa deixa tonto', () => {
  const w = world('snow');
  const a = put(w, 0, 2, 2); put(w, 1, 14, 10);
  run(w, 0.5, { 0: { x: 1, y: 0 } });
  const x0 = a.x; run(w, 0.5);
  assert.ok(a.x - x0 > 0.6, 'continua deslizando sem o analógico');
  const pg = w.penguin;
  pg.t = 0; run(w, 1.2);
  assert.equal(pg.st, 'run');
  // fica no caminho do pinguim até levar uma
  let hit = false;
  for (let i = 0; i < 600 && !hit; i++) { put(w, 1, pg.x + Math.cos(pg.dir) * 1.1, pg.y + Math.sin(pg.dir) * 1.1); run(w, DT); hit = w.players[1].hp < HP; }
  assert.ok(hit);
  assert.equal(w.players[1].hp, HP - DMG.peng);
  // caixa jogada no pinguim
  pg.st = 'run'; pg.t = 5;
  const c = crate(w, 'w', pg.x - 0.2, pg.y); c.st = 'f'; c.z = 0.5; c.vz = 0; c.owner = 0;
  run(w, DT * 2);
  assert.equal(pg.st, 'dizzy');
});

test('Drain Bash: caixa roxa dá arma, C usa, golpe faz perder', () => {
  const w = world('drain', 3);
  const a = put(w, 0, 3, 6, 0); const b = put(w, 1, 12, 6); put(w, 2, 14, 11);
  crate(w, 'i', 3.9, 6);
  press(w, 0, 'ap');
  assert.ok(a.item, 'ganhou arma');
  assert.match(Sim.private(w, 0).msg, /^C: /);
  a.item = { k: 'ball', n: 3 };
  press(w, 0, 'cp');
  assert.equal(a.item.n, 2);
  run(w, 2.5);
  assert.equal(b.hp, HP - DMG.ball, 'bola elétrica persegue');
  a.item = { k: 'missile', n: 2 };
  run(w, 0.5); press(w, 0, 'cp');
  assert.equal(w.shots.length, 8, 'míssil em 8 direções');
  a.item = { k: 'shield', n: 1 };
  run(w, 1.5); press(w, 0, 'cp');
  assert.ok(a.shield > 0 && !a.item);
  const before = a.hp;
  Sim._.hurt(w, a, 22, a.x + 1, a.y, 10, 'throw');
  assert.equal(a.hp, before, 'escudo segura');
  a.shield = 0; a.item = { k: 'ball', n: 3 };
  Sim._.hurt(w, a, 8, a.x + 1, a.y, 7, 'kick');
  assert.equal(a.item, null, 'perdeu a arma');
});

test('eliminação, vitória, empate e relógio', () => {
  const w = world('jungle', 3);
  put(w, 0, 3, 3); put(w, 1, 13, 3); put(w, 2, 8, 9);
  w.players[1].hp = 5; Sim._.hurt(w, w.players[1], 22, 0, 0, 5, 'throw');
  assert.equal(w.players[1].out, true);
  run(w, DT);
  assert.equal(w.result, null);
  w.players[2].hp = 5; Sim._.hurt(w, w.players[2], 22, 0, 0, 5, 'throw');
  run(w, DT);
  assert.deepEqual(w.result.winners, [0]);
  assert.deepEqual(w.result.order, [0, 2, 1]);
  const keep = JSON.stringify(w.result);
  w.players[0].hp = 1; Sim._.hurt(w, w.players[0], 50, 0, 0, 5, 'throw');
  run(w, 2);
  assert.equal(JSON.stringify(w.result), keep, 'resultado não muda na festa');
  assert.equal(w.players[0].out, false);
  // empate: os dois últimos caem na mesma explosão
  const d = world('jungle');
  put(d, 0, 7.5, 6); put(d, 1, 8.5, 6);
  d.players[0].hp = 10; d.players[1].hp = 10;
  Sim._.explode(d, crate(d, 'n', 8, 6));
  run(d, DT);
  assert.deepEqual(d.result.winners, []);
  // tempo acabou: mais vida vence; vida igual = vários vencedores
  const c = world('jungle', 3);
  c.players[0].hp = 60; c.players[1].hp = 80; c.players[2].hp = 80;
  c.clock = 0.01; run(c, DT * 2);
  assert.deepEqual(c.result.winners.sort(), [1, 2]);
  assert.equal(c.result.order[2], 0);
});

test('private: vida, barra, recados e fora', () => {
  const w = world('jungle');
  const me = Sim.private(w, 0);
  assert.equal(me.status, '♥ 100'); assert.equal(me.bar, 1); assert.equal(me.out, false); assert.equal(me.hit, 0);
  Sim._.hurt(w, w.players[0], 22, 0, 0, 5, 'throw');
  const m2 = Sim.private(w, 0);
  assert.equal(m2.status, '♥ 78'); assert.equal(m2.hit, 1); assert.ok(Math.abs(m2.bar - 0.78) < 1e-9);
  w.players[0].hp = 1; Sim._.hurt(w, w.players[0], 22, 0, 0, 5, 'throw');
  const m3 = Sim.private(w, 0);
  assert.equal(m3.out, true); assert.equal(m3.outText, 'Sem vida!');
});

function cpuMatch(level, skills, seed) {
  const w = Sim.create(skills.map((_, i) => ({ slot: i, bot: true, name: 'c' + i, color: '#fff' })), { level, seed });
  let t = 0;
  while (!w.result && t < 120) { Sim.step(w, w.players.map(p => Sim.bot(w, p.slot, skills[p.slot], DT)), DT); w.fx.length = 0; t += DT; }
  return { w, t };
}

test('partida só de CPUs termina sozinha em cada arena e nível', () => {
  for (const l of Sim.levels) for (const sk of [0, 1, 2]) {
    const times = [];
    for (let seed = 1; seed <= 4; seed++) {
      const { w, t } = cpuMatch(l.id, [sk, sk, sk, sk], seed * 31 + sk);
      assert.ok(w.result, `${l.id}/${sk} termina`);
      assert.ok(t <= 90.1, 'o relógio garante o fim');
      times.push(t);
    }
    times.sort((a, b) => a - b);
    assert.ok(times[1] < 89, `${l.id}/${sk}: a maioria termina por eliminação (${times.map(x => x.toFixed(0))})`);
  }
});

test('CPU difícil ganha da fácil; CPU anda e não trava', () => {
  let hard = 0, easy = 0;
  for (let seed = 1; seed <= 16; seed++) {
    const { w } = cpuMatch('jungle', [0, 0, 2, 2], seed);
    for (const s of w.result.winners) { if (s >= 2) hard++; else easy++; }
  }
  assert.ok(hard > easy * 2, `difícil ${hard} × fácil ${easy}`);
  for (const l of Sim.levels) {
    const w = Sim.create(ents(4).map(e => Object.assign(e, { bot: true })), { level: l.id, seed: 5 });
    const moved = [0, 0, 0, 0], last = w.players.map(p => [p.x, p.y]);
    for (let i = 0; i < 600; i++) {
      Sim.step(w, w.players.map(p => Sim.bot(w, p.slot, 1, DT)), DT);
      w.players.forEach((p, k) => { moved[k] += Math.hypot(p.x - last[k][0], p.y - last[k][1]); last[k] = [p.x, p.y]; });
    }
    assert.ok(moved.every(m => m > 6), `${l.id}: todos andaram ${moved.map(m => m.toFixed(1))}`);
  }
  // quem sai vira CPU
  const w = Sim.create(ents(2), { level: 'jungle', seed: 1 });
  Sim.makeBot(w, 1);
  assert.equal(w.players[1].bot, true);
  const inp = Sim.bot(w, 1, 1, DT);
  assert.ok(typeof inp.x === 'number' && typeof inp.ap === 'boolean');
});

// ---------- sala de verdade ----------
async function freePort() {
  const s = net.createServer();
  await new Promise(r => s.listen(0, '127.0.0.1', r));
  const port = s.address().port;
  await new Promise(r => s.close(r));
  return port;
}
async function until(pred, timeout = 10000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) { const v = pred(); if (v) return v; await new Promise(r => setTimeout(r, 20)); }
  throw new Error('tempo esgotado esperando a sala');
}
async function connect(port, hello) {
  const ws = new WebSocket(`ws://127.0.0.1:${port}`);
  const c = { ws, frames: 0, game: null, core: null, send: m => ws.send(JSON.stringify(m)) };
  ws.on('message', raw => {
    const m = JSON.parse(raw);
    if (m.t === 'state') { c.core = m.core; c.game = m.game; }
    if (m.t === 'game-frame') { c.frames++; c.game = m.game; }
  });
  await new Promise((res, rej) => { ws.once('open', res); ws.once('error', rej); });
  c.send(hello);
  await until(() => c.core);
  return c;
}

test('sala: TV + 2 celulares, loading → 3-2-1 → jogando; TV recebe o mundo, celular recebe só o seu', { timeout: 40000 }, async t => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'arcade-cratecrush-'));
  const port = await freePort();
  const server = spawn(process.execPath, ['server.js'], { cwd: path.resolve(__dirname, '..'), env: { ...process.env, PORT: String(port), STATE_FILE: path.join(dir, 'state.json'), STATS_KEY: 'test-only', NO_LAN: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
  let out = ''; server.stdout.on('data', d => out += d); server.stderr.on('data', d => out += d);
  const clients = [];
  t.after(async () => { for (const c of clients) c.ws.terminate(); server.kill(); await new Promise(r => (server.exitCode !== null ? r() : server.once('exit', r))); await rm(dir, { recursive: true, force: true }); });
  await until(() => out.includes('ARCADE DA CASA'));
  const add = async h => { const c = await connect(port, h); clients.push(c); return c; };
  const tv = await add({ t: 'tv', room: 'CRAT' });
  const a = await add({ t: 'join', room: 'CRAT', pid: 'alpha', name: 'Ana', color: 'roxo' });
  const b = await add({ t: 'join', room: 'CRAT', pid: 'bravo', name: 'Bia', color: 'ciano' });
  a.send({ t: 'play', id: 'cratecrush' });
  await until(() => a.game && a.game.phase === 'setup');
  assert.equal(a.game.levels.length, 4);
  assert.deepEqual(a.game.controls.buttons.map(x => x.label), ['PEGAR', 'PULAR', 'CHUTE']);
  b.send({ t: 'bash-level', level: 3 });            // só o primeiro jogador escolhe
  await new Promise(r => setTimeout(r, 150));
  assert.equal(a.game.level, 0);
  a.send({ t: 'bash-level', level: 1 });
  await until(() => a.game.level === 1);
  a.send({ t: 'bash-start' });
  await until(() => tv.game && tv.game.phase === 'loading');
  tv.send({ t: 'bash-tv-ready', matchId: tv.game.matchId });
  await until(() => a.game.phase === 'countdown');
  assert.equal(a.game.seats.length, 4, 'CPU completa as vagas');
  await until(() => a.game.phase === 'playing', 6000);
  const pump = setInterval(() => {
    a.send({ t: 'input', matchId: a.game.matchId, active: true, x: 1, y: 0, a: false, b: false, c: false });
    b.send({ t: 'input', matchId: b.game.matchId, active: true, x: -1, y: 0, a: false, b: false, c: false });
  }, 50);
  t.after(() => clearInterval(pump));
  const f0 = tv.frames;
  await new Promise(r => setTimeout(r, 800));
  clearInterval(pump);
  assert.ok(tv.frames - f0 > 8, 'TV recebe quadros rápidos');
  const W = tv.game.world;
  assert.ok(W && W.lv === 'space' && W.p.length === 4 && typeof W.clock === 'number');
  assert.equal(tv.game.me, null);
  assert.equal(a.game.world, null, 'celular não recebe o mundo');
  assert.equal(a.game.me.slot, 0);
  assert.match(a.game.me.status, /^♥ \d+/);
  assert.equal(typeof a.game.me.bar, 'number');
  const pa = W.p.find(p => p.id === 0), pb = W.p.find(p => p.id === 1);
  assert.ok(pa.x > 3.5, 'Ana andou para a direita');
  assert.ok(pb.x < 12.5, 'Bia andou para a esquerda');
  for (const url of ['/games/cratecrush/tv.js', '/games/cratecrush/phone.js']) {
    const r = await fetch(`http://127.0.0.1:${port}${url}`); assert.equal(r.status, 200, url);
  }
  assert.equal((await fetch(`http://127.0.0.1:${port}/games/cratecrush/sim.js`)).status, 404, 'simulação fica no servidor');
});
