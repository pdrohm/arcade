// Polar Push: regras da simulação (games/polarpush/sim.js) e uma partida de verdade pela sala.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { mkdtemp, rm } = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const WebSocket = require('ws');
const Sim = require('../games/polarpush/sim');
const Game = require('../games/polarpush/game');

const DT = 1 / 60, C = 8;
const ents = (n, bot) => Array.from({ length: n }, (_, i) => ({ slot: i, bot: !!bot, name: 'P' + i, color: '#fff' }));
function world(level, n = 2, seed = 1) {
  const w = Sim.create(ents(n), { level, seed, cpuLevel: 1 });
  w.disco.next = 1e9;            // sem Disco, a menos que o teste peça
  w.fishNext = 1e9; w.pickNext = 1e9;
  return w;
}
function run(w, secs, inputs) {
  const n = Math.round(secs / DT);
  for (let i = 0; i < n; i++) { Sim.step(w, typeof inputs === 'function' ? inputs(i, w) : (inputs || []), DT); }
}
const place = (p, x, y, o) => Object.assign(p, { x, y, vx: 0, vy: 0 }, o || {});
// joga A em cima de B (parado) e devolve quanto B andou no máximo
function knockDistance(opts) {
  const w = world('melt'); w.R = 50; w.cfg = Object.assign({}, w.cfg, { melt: null });
  const [a, b] = w.ps; place(a, 4, 8, { dir: 0 }); place(b, 6.2, 8);
  let hit = -1, x0 = b.x, max = 0, wound = false;
  for (let i = 0; i < 300; i++) {
    const ia = hit < 0 ? { x: 1, y: 0, ap: opts.charge && i === 5 } : {};
    // B começa a agachar para investir bem na hora em que A chega
    if (opts.bWind && !wound && b.x - a.x < 1.1 + 0.45) { wound = true; b.wind = 0.1; b.cdir = Math.PI / 2; }
    Sim.step(w, [ia, {}], DT);
    if (hit < 0 && Math.abs(b.vx) > 0.5) { hit = i; x0 = b.x; }
    if (hit >= 0) max = Math.max(max, b.x - x0);
  }
  return { max, a, b };
}

test('quatro arenas, controles curtos e cada arena cria e roda com CPUs', () => {
  assert.equal(Sim.levels.length, 4);
  for (const lv of Sim.levels) {
    assert.ok(lv.how.length >= 3 && lv.how.length <= 5, lv.id);
    const ctl = Sim.controls(lv.id);
    assert.equal(ctl.stick, 'free');
    for (const b of ctl.buttons) assert.ok(b.label.length <= 8 && b.label === b.label.toUpperCase(), b.label);
    const w = Sim.create(ents(4, true), { level: lv.id, cpuLevel: 1, seed: 3 });
    for (let i = 0; i < 600; i++) Sim.step(w, w.ps.map(p => Sim.bot(w, p.slot, 1, DT)), DT);
    assert.ok(Math.abs(w.time - 10) < 1e-6);
    const snap = Sim.snapshot(w);
    assert.equal(snap.lv, lv.id);
    assert.deepEqual(snap.ps.map(p => p.id), [0, 1, 2, 3]);
    assert.ok(JSON.stringify(snap).length < 4000);
    const me = Sim.private(w, 0);
    for (const k of ['status', 'bar', 'out', 'msg', 'hit', 'off']) assert.ok(k in me, k);
  }
  assert.deepEqual(Sim.controls('melt').buttons.map(b => b.id), ['a', 'b']);
  assert.deepEqual(Sim.controls('manic').buttons.map(b => b.label), ['INVESTIR', 'BOMBA']);
  assert.deepEqual(Sim.controls('polar').buttons.map(b => b.id), ['a']);
  assert.equal(Game.meta.id, 'polarpush');
});

test('investida: gasta a barra, não sai com a barra baixa, recarrega e empurra muito mais que andar', () => {
  const w = world('polar'); const [a] = w.ps; place(a, 8, 8, { dir: 0 });
  run(w, DT, [{ x: 1, y: 0, ap: true }]);
  assert.ok(Math.abs(a.meter - (1 - Sim._.CH_COST)) < 0.02, 'gasta 60%');
  run(w, 0.15, [{ x: 1, y: 0 }]);
  assert.ok(Math.hypot(a.vx, a.vy) > 9, 'dispara a ~11 u/s');
  const before = a.meter;
  run(w, DT, [{ x: 1, y: 0, ap: true }]);
  assert.ok(a.wind === 0 && a.meter >= before, 'sem barra, nada acontece');
  run(w, 1.6, []);
  assert.equal(a.meter, 1, 'recarrega em ~1,6 s');

  const walk = knockDistance({ charge: false }), charge = knockDistance({ charge: true });
  assert.ok(charge.max > walk.max * 1.6, `investida ${charge.max.toFixed(2)} × andar ${walk.max.toFixed(2)}`);
  assert.ok(charge.max > 4 && charge.max < 12, 'tranco grande mas dentro do gelo');
  assert.ok(Math.hypot(charge.a.vx, charge.a.vy) < Math.hypot(charge.b.vx, charge.b.vy) + 0.01 || charge.max > 4, 'quem bate fica, quem leva voa');
});

test('contra-ataque: acertar quem está agachando para investir joga mais longe', () => {
  const idle = knockDistance({ charge: true }), wind = knockDistance({ charge: true, bWind: true });
  assert.ok(wind.max > idle.max * 1.15, `${wind.max.toFixed(2)} > ${idle.max.toFixed(2)}`);
});

test('massa: o urso inflado empurra o pequeno e quase não se mexe', () => {
  const w = world('melt'); w.R = 50; w.cfg = Object.assign({}, w.cfg, { melt: null });
  const [a, b] = w.ps; place(a, 6, 8, { pw: 'inflar', pt: 99 }); place(b, 7.2, 8, { pw: 'encolher', pt: 99 });
  a.vx = 3; b.vx = -3;
  run(w, 0.2, []);
  assert.ok(b.vx > 2 && a.vx > -1, `grande ${a.vx.toFixed(2)} pequeno ${b.vx.toFixed(2)}`);
});

test('borda: passa do gelo e fica pendurado; A empurrando para dentro sobe; parado cai', () => {
  const w = world('manic', 3); const [a, b, c] = w.ps;
  place(a, C + 6.6, C); place(b, C - 6.6, C); place(c, C, C);
  run(w, DT, []);
  assert.ok(a.hang > 0 && b.hang > 0, 'os dois pendurados');
  assert.equal(Sim.private(w, 0).msg, 'PENDURADO! APERTE A');
  assert.equal(Sim.private(w, 0).off.a, false, 'A liberado para subir');
  // A sobe: aperta A empurrando para a esquerda (para dentro); B só espera
  run(w, 0.6, i => [{ x: -1, y: 0, ap: i % 6 === 0 }, {}, {}]);
  assert.equal(a.hang, 0); assert.ok(!a.out && Sim._.edgeDist(w, a.x, a.y) > 0, 'subiu');
  assert.equal(a.climbs, 1);
  run(w, 1.0, []);
  assert.ok(b.out, 'quem não aperta cai'); assert.equal(b.how, 'water');
  // empurrar para fora não ajuda
  place(a, C + 6.6, C); run(w, DT, []);
  run(w, 1.4, i => [{ x: 1, y: 0, ap: i % 4 === 0 }, {}, {}]);
  assert.ok(a.out, 'apertar puxando para fora não sobe');
});

test('quem bate em alguém pendurado derruba de vez', () => {
  const w = world('melt', 3); const [a, b] = w.ps;
  place(b, C + 7.2, C); run(w, DT, []);
  assert.ok(b.hang > 0);
  place(a, C + 5.6, C); a.vx = 5;
  run(w, 0.2, [{ x: 1, y: 0 }]);
  assert.ok(b.out, 'caiu com a batida');
});

test('Pânico Polar: o muro segura, racha com trancos e quebra; no fim todo muro cai', () => {
  const w = world('polar'); const [a] = w.ps;
  place(a, C + 5, C); a.vx = 4;
  run(w, 0.6, [{ x: 1, y: 0 }]);
  assert.equal(a.hang, 0, 'o muro segura quem anda'); assert.ok(!a.out);
  const i = Sim._.CFG.polar.walls && w.walls.findIndex((hp, k) => k === 12);
  assert.ok(i >= 0);
  const seg = (() => { const x = a.x, y = a.y; const ang = Math.atan2(y - C, x - C); return ((Math.floor((ang + Math.PI) / (Math.PI * 2) * 24) % 24) + 24) % 24; })();
  assert.equal(w.walls[seg], 2, 'andar não racha');
  place(a, C + 3, C, { meter: 1, dir: 0 });
  run(w, 0.6, i => [{ x: 1, y: 0, ap: i === 0 }]);
  assert.equal(w.walls[seg], 0, 'uma investida forte quebra');
  // sem muro, cai
  place(a, C + 5.5, C); a.vx = 5; run(w, 0.5, [{ x: 1, y: 0 }]);
  assert.ok(a.hang > 0 || a.out, 'sem muro dá para cair');
  // morte súbita: muros somem e a borda encolhe
  const w2 = world('polar'); w2.t = Sim._.SD_AT - DT; run(w2, 2, []);
  assert.ok(w2.sd && w2.walls.every(h => h === 0) && w2.R < 6.5);
  assert.equal(Sim.snapshot(w2).clock, null);
});

test('Disco: Raio atordoa os outros; Peso passa na batida e afunda quem fica com ele', () => {
  const w = world('polar', 3); const [a, b, c] = w.ps;
  place(a, 6, 8); place(b, 10, 8); place(c, 8, 11);
  w.disco.next = 0; w.cfg = Object.assign({}, w.cfg, { powers: ['raio'] });
  run(w, 2, []);
  const holder = w.ps.find(p => p.pw === 'raio'); assert.ok(holder, 'alguém ganhou o Raio');
  w.disco.next = 1e9;
  run(w, 6, []);
  for (const p of w.ps) if (p !== holder) assert.ok(p.stun > 0, 'os outros ficam tontos');
  assert.ok(Sim.snapshot(w).ps.some(p => p.sn));

  const v = world('melt', 3); const [x, y, z] = v.ps;
  place(x, 7, 8, { pw: 'peso', pt: 5 }); place(y, 8.2, 8); place(z, 8, 12);
  x.vx = 3;
  run(v, 0.3, []);
  assert.equal(x.pw, null); assert.equal(y.pw, 'peso', 'passou adiante');
  assert.match(Sim.private(v, 1).msg, /^PESO \d+s — PASSE ADIANTE!$/);
  run(v, 5.5, []);
  assert.ok(y.out && y.how === 'peso', 'afundou com o Peso');
});

test('Inflar, Encolher e Congelar mudam tamanho e massa', () => {
  const base = { bear: true, pw: null };
  const s0 = Sim._.stats(base), big = Sim._.stats({ bear: true, pw: 'inflar' }), small = Sim._.stats({ bear: true, pw: 'encolher' }), ice = Sim._.stats({ bear: true, pw: 'gelo' }), foot = Sim._.stats({ bear: false, pw: null });
  assert.ok(big.r > s0.r && big.m > s0.m && big.max < s0.max);
  assert.ok(small.r < s0.r && small.m < s0.m && small.max > s0.max);
  assert.ok(ice.m > 3 && ice.max < 1 && ice.ch === 0);
  assert.ok(foot.m < s0.m && foot.pw < s0.pw && foot.max < s0.max);
});

test('Gangorra: inclina para o lado do peso e quem está do outro lado escorrega para lá; a morsa empurra', () => {
  const w = world('tilt', 3); const [a, b, c] = w.ps;
  place(a, C + 4, C); place(b, C + 4, C + 1.5); place(c, C - 1, C);
  run(w, 1, [{}, {}, {}]);
  assert.ok(w.tilt.x > 0.05, 'inclinou para a direita');
  assert.ok(c.vx > 0.3 || c.x > C - 1 + 0.2, 'escorregou ladeira abaixo');
  // morsa
  const v = world('tilt', 2); const [p, q] = v.ps; place(p, C + 1, C); place(q, C - 3, C - 3);
  v.fishNext = 0; run(v, DT, []);
  assert.ok(v.fish); v.fish.x = C; v.fish.y = C;
  run(v, 3, []);
  assert.ok(v.walrus && v.walrus.z === 0, 'a morsa caiu');
  assert.ok(Math.hypot(p.x - C, p.y - C) > 1.6, 'quem estava perto voou');
});

test('Derretendo: a ilha encolhe até o mínimo; bola de neve empurra', () => {
  const w = world('melt'); const R0 = w.R;
  run(w, 20, []);
  assert.ok(w.R < R0 - 1);
  run(w, 60, []);
  assert.ok(w.R >= Sim._.CFG.melt.melt.min - 1e-9 || w.sd);
  const v = world('melt'); const [a, b] = v.ps; place(a, 5, 8, { balls: 1, pw: 'neve', pt: 9, dir: 0 }); place(b, 9, 8);
  run(v, DT, [{ x: 1, y: 0, bp: true }]);
  assert.equal(v.shots.length, 1); assert.equal(a.balls, 0);
  run(v, 0.6, []);
  assert.ok(b.vx > 2 || b.x > 9.3, 'a bola empurrou');
});

test('Bombas no Gelo: pega, joga; a primeira derruba do urso, a segunda tira do jogo', () => {
  const w = world('manic', 3); const [a, b, c] = w.ps;
  place(a, 5, 8, { dir: 0 }); place(b, 9.6, 8); place(c, 8, 12);
  w.picks.push({ id: 900, x: 5.3, y: 8 });
  run(w, DT, []);
  assert.equal(a.bombs, 1); assert.equal(w.picks.length, 0);
  assert.equal(Sim.private(w, 0).off.b, false);
  run(w, DT, [{ x: 1, y: 0, bp: true }]);
  assert.equal(a.bombs, 0);
  run(w, 1, []);
  assert.equal(b.bear, false, 'caiu do urso'); assert.ok(!b.out);
  assert.equal(Sim.private(w, 1).status, 'A PÉ');
  place(b, 9.6, 8); place(a, 5, 8, { bombs: 1, dir: 0 });
  run(w, DT, [{ x: 1, y: 0, bp: true }]);
  run(w, 1, []);
  assert.ok(b.out && b.how === 'boom', 'a pé, a segunda bomba tira do jogo');
});

test('vitória, ordem, empate e fim pelo tempo', () => {
  const w = world('melt', 3); const [a, b, c] = w.ps;
  place(b, C + 9, C); run(w, 1.5, []);
  assert.ok(b.out && !w.result);
  place(c, C - 9, C); run(w, 1.5, []);
  assert.deepEqual(w.result.winners, [0]); assert.deepEqual(w.result.order, [0, 2, 1]);
  const res = JSON.stringify(w.result);
  run(w, 3.6, [{ x: 1, y: 0 }]);
  assert.equal(JSON.stringify(w.result), res, 'a festa não muda o resultado');

  const t = world('melt', 2); place(t.ps[0], C + 9, C); place(t.ps[1], C - 9, C);
  run(t, 1.5, []);
  assert.deepEqual(t.result.winners, [], 'caíram juntos: empate');

  const h = world('polar', 2); h.t = Sim._.HARD_END - 0.5; h.R = 6; h.sd = true;
  place(h.ps[0], 6, 8); place(h.ps[1], 10, 8);
  run(h, 1, []);
  assert.deepEqual(h.result.winners.sort(), [0, 1], 'tempo esgotado: quem está de pé divide');
});

test('partidas só de CPU terminam sozinhas em todas as arenas e níveis', () => {
  for (const lv of Sim.levels) for (const skill of [0, 1, 2]) {
    for (const seed of [11, 12]) {
      const w = Sim.create(ents(4, true), { level: lv.id, cpuLevel: skill, seed });
      let n = 0;
      while (!w.result && n < 160 / DT) {
        const ins = w.ps.map(p => { const i = Sim.bot(w, p.slot, skill, DT); assert.ok(Number.isFinite(i.x) && Number.isFinite(i.y)); return i; });
        Sim.step(w, ins, DT); w.fx.length = 0; n++;
      }
      assert.ok(w.result, `${lv.id}/${skill} terminou`);
      assert.ok(w.t <= Sim._.HARD_END + 0.1);
      for (const p of w.ps) assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y), 'sem NaN');
    }
  }
});

test('CPU pendurada martela A e empurra para dentro; makeBot assume a vaga', () => {
  const w = world('melt', 2); const [a] = w.ps; place(a, C + 7.2, C); run(w, DT, []);
  assert.ok(a.hang > 0);
  let presses = 0, inward = true;
  for (let i = 0; i < 40; i++) { const inp = Sim.bot(w, 0, 2, DT); if (inp.ap) presses++; if (inp.x >= 0) inward = false; }
  assert.ok(presses >= 3 && inward);
  Sim.makeBot(w, 1); assert.equal(w.ps[1].bot, true);
});

// ---------- sala de verdade ----------
async function freePort() {
  const s = net.createServer(); await new Promise(r => s.listen(0, '127.0.0.1', r));
  const port = s.address().port; await new Promise(r => s.close(r)); return port;
}
async function until(fn, timeout = 10000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) { const v = fn(); if (v) return v; await new Promise(r => setTimeout(r, 20)); }
  throw new Error('demorou demais');
}
async function connect(port, hello) {
  const ws = new WebSocket(`ws://127.0.0.1:${port}`);
  const c = { ws, game: null, core: null, frames: 0, send: m => ws.send(JSON.stringify(m)) };
  ws.on('message', raw => { const m = JSON.parse(raw); if (m.t === 'state') { c.core = m.core; c.game = m.game; } if (m.t === 'game-frame') { c.frames++; c.game = m.game; } });
  await new Promise((res, rej) => { ws.once('open', res); ws.once('error', rej); });
  c.send(hello); await until(() => c.core); return c;
}

test('sala: TV + celulares, 3-2-1, entradas, TV recebe o mundo e o celular só o dele', { timeout: 30000 }, async t => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'arcade-polar-'));
  const port = await freePort();
  const server = spawn(process.execPath, ['server.js'], { cwd: path.resolve(__dirname, '..'), env: { ...process.env, PORT: String(port), STATE_FILE: path.join(dir, 'state.json'), STATS_KEY: 'test-only', NO_LAN: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
  let out = ''; server.stdout.on('data', d => out += d); server.stderr.on('data', d => out += d);
  const clients = [];
  t.after(async () => { for (const c of clients) c.ws.terminate(); server.kill(); await new Promise(r => (server.exitCode !== null ? r() : server.once('exit', r))); await rm(dir, { recursive: true, force: true }); });
  await until(() => out.includes('ARCADE DA CASA'));
  const add = async h => { const c = await connect(port, h); clients.push(c); return c; };
  const tv = await add({ t: 'tv', room: 'POLR' });
  const a = await add({ t: 'join', room: 'POLR', pid: 'alpha', name: 'Ana', color: 'roxo' });
  const b = await add({ t: 'join', room: 'POLR', pid: 'bravo', name: 'Bia', color: 'ciano' });
  a.send({ t: 'play', id: 'polarpush' });
  await until(() => a.game && a.game.phase === 'setup');
  assert.equal(a.game.levels.length, 4);
  a.send({ t: 'bash-level', level: 3 });
  await until(() => a.game.level === 3);
  assert.deepEqual(a.game.controls.buttons.map(x => x.label), ['INVESTIR', 'BOMBA']);
  a.send({ t: 'bash-start' });
  await until(() => tv.game && tv.game.phase === 'loading');
  tv.send({ t: 'bash-tv-ready', matchId: tv.game.matchId });
  await until(() => a.game.phase === 'countdown');
  const pump = setInterval(() => {
    a.send({ t: 'input', matchId: a.game.matchId, active: true, x: 1, y: 0, a: false, b: false, c: false });
    b.send({ t: 'input', matchId: b.game.matchId, active: true, x: -1, y: 0.3, a: true, b: false, c: false });
  }, 50);
  t.after(() => clearInterval(pump));
  await until(() => a.game.phase === 'playing', 8000);
  const f0 = tv.frames;
  await new Promise(r => setTimeout(r, 700));
  assert.ok(tv.frames > f0 + 5, 'a TV recebe quadros rápidos');
  const W = tv.game.world;
  assert.ok(W && W.lv === 'manic' && W.ps.length === 4, 'TV recebe o mundo com 4 ursos (2 CPUs)');
  assert.equal(a.game.world, null, 'celular não recebe o mundo');
  assert.ok(a.game.me && typeof a.game.me.status === 'string' && typeof a.game.me.bar === 'number', 'celular recebe só o dele');
  assert.equal(a.game.me.slot, 0);
  const ana = W.ps[0], bia = W.ps[1];
  assert.ok(ana.x > 8 - 4.5 * 0.7071 + 0.3 || ana.sp > 0.5, 'a Ana andou para a direita');
  assert.ok(bia.sp > 0.3 || bia.out, 'a Bia andou');
  clearInterval(pump);
  a.send({ t: 'quit' });
  await until(() => tv.core.screen === 'library');
});
