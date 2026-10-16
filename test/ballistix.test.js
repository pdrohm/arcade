// BALLISTIX: regras da simulação (games/ballistix/sim.js) e uma partida de verdade pela sala.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { mkdtemp, rm } = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const WebSocket = require('ws');
const Sim = require('../games/ballistix/sim');
const C = Sim._;
const DT = 1 / 60;

const four = () => [0, 1, 2, 3].map(s => ({ slot: s, bot: true, name: 'C' + s, color: '#fff' }));
const idle = w => w.players.map(() => ({ x: 0, y: 0 }));
function quiet(level, entrants) {
  // mundo sem lançador: as bolas do teste são as únicas na quadra
  const w = Sim.create(entrants || four(), { level: level || 'quadra' });
  w.disp.cool = 1e9; if (w.turret) w.turret.cool = 1e9; w.pickT = 1e9;
  if (w.sky) w.sky.t = 1e9;
  w.time = -1e6;   // segura a contagem de bolas e a morte súbita
  return w;
}
function ball(w, x, y, vx, vy) {
  const b = C.addBall(w, x, y, vx, vy, Math.hypot(vx, vy));
  b.vx = vx; b.vy = vy;
  return b;
}
function run(w, secs, inputs) { for (let t = 0; t < secs; t += DT) Sim.step(w, inputs ? inputs(w) : idle(w), DT); }

test('quatro arenas, controles num eixo só e pontos por arena', () => {
  assert.deepEqual(Sim.levels.map(l => l.id), ['quadra', 'praia', 'canhao', 'ceu']);
  for (const l of Sim.levels) { assert.ok(l.how.length >= 3 && l.how.length <= 5); assert.ok(l.name && l.short); }
  assert.equal(Sim.controls('quadra').stick, 'axis');
  assert.deepEqual(Sim.controls('quadra').buttons.map(b => b.id), ['a', 'b']);
  assert.deepEqual(Sim.controls('praia').buttons.map(b => b.id), ['a', 'b', 'c']);
  for (const id of ['quadra', 'praia', 'canhao', 'ceu']) for (const b of Sim.controls(id).buttons) assert.ok(b.label.length <= 8 && b.label === b.label.toUpperCase());
  const pts = { quadra: 15, praia: 12, canhao: 20, ceu: 20 };
  for (const id in pts) assert.ok(Sim.create(four(), { level: id }).players.every(p => p.pts === pts[id]));
  const w = Sim.create(four(), { level: 'quadra' });
  assert.deepEqual([0, 1, 2, 3].map(s => Sim.private(w, s).axis), ['h', 'h', 'v', 'v']);
});

test('o trenó anda só no seu eixo, com turbo, sem passar dos postes', () => {
  const w = quiet();
  const inp = () => [{ x: 1, y: 1 }, { x: -1, b: true }, { y: 1, x: 1 }, { y: -1 }];
  run(w, 0.1, inp);
  assert.ok(w.players[0].p > 7 && w.players[1].p < 7, 'embaixo e em cima usam o x');
  assert.ok(w.players[2].p > 7 && w.players[3].p < 7, 'esquerda e direita usam o y');
  assert.ok(Math.abs(w.players[1].v) > Math.abs(w.players[0].v), 'turbo é mais rápido');
  run(w, 3, inp);
  assert.equal(w.players[0].p, C.P_MAX); assert.equal(w.players[1].p, C.P_MIN);
});

test('bola no gol tira 1 ponto; com 0 o gol fecha e vira parede', () => {
  const w = quiet();
  const pl = w.players[0];
  pl.p = C.P_MIN;                                     // trenó longe da bola
  ball(w, 10, 12, 0.3, 8);
  run(w, 1);
  assert.equal(pl.pts, 14); assert.equal(pl.hit, 1);
  assert.equal(w.balls.length, 0);
  pl.pts = 1;
  ball(w, 10, 12, 0.3, 8);
  let fx = [];
  for (let t = 0; t < 1; t += DT) { Sim.step(w, idle(w), DT); fx = fx.concat(w.fx); w.fx.length = 0; }
  assert.ok(pl.out, 'saiu');
  assert.ok(fx.some(f => f.k === 'goal') && fx.some(f => f.k === 'out' && f.slot === 0));
  assert.equal(Sim.private(w, 0).out, true);
  // agora o lado de baixo é parede: a bola volta
  const b = ball(w, 10, 12, 0.3, 8);
  run(w, 0.5);
  assert.equal(pl.pts, 0); assert.ok(w.balls.includes(b)); assert.ok(b.vy < 0, 'quicou na parede');
});

test('rebote no trenó: meio volta reto, ponta sai de lado, nunca quase paralela', () => {
  const w = quiet();
  const pl = w.players[0]; pl.p = 7;
  const mid = ball(w, 7, 10, 0, 7);
  run(w, 0.6);
  assert.ok(mid.vy < 0, 'voltou para a quadra');
  const midAng = Math.abs(Math.atan2(mid.vx, -mid.vy));
  const w2 = quiet(); w2.players[0].p = 7;
  const edge = ball(w2, 8.05, 10, 0, 7);
  run(w2, 0.6);
  const edgeAng = Math.abs(Math.atan2(edge.vx, -edge.vy));
  assert.ok(edge.vy < 0 && edge.vx > 0, 'bateu na ponta direita e foi para a direita');
  assert.ok(edgeAng > midAng + 0.4, `ponta (${edgeAng.toFixed(2)}) mais aberta que o meio (${midAng.toFixed(2)})`);
  for (const b of [mid, edge]) {
    const sp = Math.hypot(b.vx, b.vy);
    assert.ok(Math.abs(b.vx) >= C.MIN_COMP * sp - 1e-9 && Math.abs(b.vy) >= C.MIN_COMP * sp - 1e-9, 'ângulo mínimo');
    assert.ok(sp > 7, 'rebote acelera um pouco');
  }
});

test('velocidade cresce com os rebotes mas tem teto', () => {
  const w = quiet();
  for (const p of w.players) p.p = 7;
  const b = ball(w, 7, 7, 3, 6);
  let top = 0;
  for (let t = 0; t < 60; t += DT) {
    // os trenós seguem a bola: ninguém leva gol
    const ins = w.players.map(p => { const s = C.SIDES[p.side], a = C.along(s, b.x, b.y); const d = a - p.p; return s.ax ? { x: Math.max(-1, Math.min(1, d * 4)), b: true } : { y: Math.max(-1, Math.min(1, d * 4)), b: true }; });
    Sim.step(w, ins, DT); w.fx.length = 0;
    top = Math.max(top, Math.hypot(b.vx, b.vy));
    assert.ok(Number.isFinite(b.x) && b.x > -1 && b.x < 15 && b.y > -1 && b.y < 15);
  }
  assert.ok(top > 9, 'acelerou: ' + top);
  assert.ok(top <= C.VMAX + 1e-6, 'teto: ' + top);
});

test('chute: a bola volta forte, gasta carga e a carga volta', () => {
  const w = quiet();
  const pl = w.players[0]; pl.p = 7;
  const b = ball(w, 7, 11.5, 0.2, 6);
  let press = true;
  for (let t = 0; t < 0.7; t += DT) {
    const d = (14 - C.DEPTH - C.SLED_R - C.R) - b.y;
    const ins = idle(w);
    if (press && d < 0.3) { ins[0] = { a: true, ap: true }; press = false; }
    Sim.step(w, ins, DT);
  }
  assert.ok(b.vy < 0 && Math.hypot(b.vx, b.vy) >= 12, 'chutada: ' + Math.hypot(b.vx, b.vy));
  assert.ok(pl.charges < C.KICK_MAX, 'gastou carga');
  assert.ok(Sim.private(w, 0).bar < 1);
  run(w, 3);
  assert.equal(pl.charges, C.KICK_MAX, 'carga voltou');
  // sem carga não chuta
  pl.charges = 0.5;
  Sim.step(w, [{ a: true, ap: true }, {}, {}, {}], DT);
  assert.equal(pl.kickT, 0);
  assert.equal(Sim.private(w, 0).off.a, true);
});

test('choque de bolas é elástico (troca as velocidades na batida de frente)', () => {
  const w = quiet();
  const a = ball(w, 5, 7, 5, 1.5), b = ball(w, 9, 7, -5, 1.5);
  run(w, 0.5);
  assert.ok(a.vx < 0 && b.vx > 0, 'voltaram');
  assert.ok(Math.abs(Math.hypot(a.vx, a.vy) - Math.hypot(b.vx, b.vy)) < 0.5);
});

test('vitória do último com pontos e empate quando os dois últimos caem juntos', () => {
  const w = quiet();
  w.players[2].pts = 0; w.players[2].out = true; w.players[2].outAt = -3e6;
  w.players[3].pts = 0; w.players[3].out = true; w.players[3].outAt = -2e6;
  w.players[1].pts = 1; w.players[1].p = C.P_MIN;
  ball(w, 10, 2, 0.3, -8);
  run(w, 1);
  assert.deepEqual(w.result, { winners: [0], order: [0, 1, 3, 2] });
  const after = JSON.stringify(w.result);
  run(w, 2);
  assert.equal(JSON.stringify(w.result), after, 'o resultado não muda na festa');

  const t = quiet();
  t.players[2].out = true; t.players[2].pts = 0; t.players[3].out = true; t.players[3].pts = 0;
  t.players[0].pts = 1; t.players[0].p = C.P_MIN; t.players[1].pts = 1; t.players[1].p = C.P_MIN;
  ball(t, 10, 12, 0.3, 8); ball(t, 10, 2, 0.3, -8);
  run(t, 1);
  assert.ok(t.result, 'acabou');
  assert.deepEqual(t.result.winners, [], 'empate: ninguém vence');
});

test('só 2 pessoas: os lados vazios são parede desde o começo', () => {
  const w = Sim.create([{ slot: 0, bot: false }, { slot: 1, bot: false }], { level: 'quadra' });
  w.disp.cool = 1e9; w.time = -1e6;
  const b = ball(w, 3, 7, -8, 0.5);
  run(w, 0.6);
  assert.ok(b.vx > 0, 'quicou na esquerda');
  assert.equal(w.players.length, 2); assert.ok(!w.result);
});

test('Praia: o ímã puxa e guarda bolas, solta todas fortes, e esquenta se segurar demais', () => {
  const w = quiet('praia');
  const pl = w.players[0]; pl.p = 7;
  const a = ball(w, 6.5, 10.5, 0.4, 1), b = ball(w, 7.6, 10.2, -0.4, 1);
  const hold = [{ c: true, cp: true }, {}, {}, {}], keep = [{ c: true }, {}, {}, {}];
  Sim.step(w, hold, DT);
  for (let t = 0; t < 1.2; t += DT) Sim.step(w, keep, DT);
  assert.equal(pl.held.length, 2, 'guardou as duas');
  assert.equal(Sim.private(w, 0).msg, 'ÍMÃ 2/' + C.MAG_MAX);
  Sim.step(w, [{ c: false, cr: true }, {}, {}, {}], DT);
  assert.equal(pl.held.length, 0);
  for (const x of [a, b]) { assert.equal(x.held, -1); assert.ok(x.vy < 0 && Math.hypot(x.vx, x.vy) > 14, 'atirou forte'); }
  // segurar demais: esquenta, solta e desliga por um tempo
  const w2 = quiet('praia'); w2.players[0].p = 7;
  ball(w2, 7, 10.5, 0, 1);
  Sim.step(w2, hold, DT);
  for (let t = 0; t < C.MAG_HEAT + 0.2; t += DT) Sim.step(w2, keep, DT);
  assert.equal(w2.players[0].held.length, 0); assert.ok(w2.players[0].cool > 0);
  assert.equal(Sim.private(w2, 0).off.c, true);
});

test('Canhão: escudo no canto fecha o gol por um tempo; bolas batem no Canhão', () => {
  const w = quiet('canhao');
  const pl = w.players[0];
  w.pick = { c: C.END_CORNER[0][1], t: 9 };
  pl.p = C.P_MAX;
  Sim.step(w, idle(w), DT);
  assert.ok(pl.shield > 5 && !w.pick, 'pegou o escudo');
  assert.match(Sim.private(w, 0).msg, /^ESCUDO \ds$/);
  pl.p = C.P_MIN;
  const b = ball(w, 10, 12, 0.3, 8);
  run(w, 0.6);
  assert.equal(pl.pts, 20, 'escudo segurou'); assert.ok(b.vy < 0);
  const c = ball(w, 4, 7, 7, 0.2);
  run(w, 0.35);
  assert.ok(c.vx < 0, 'quicou no Canhão');
  // o Canhão atira sozinho
  const w2 = Sim.create(four(), { level: 'canhao' });
  let shots = 0;
  for (let t = 0; t < 5; t += DT) { Sim.step(w2, idle(w2), DT); shots += w2.fx.filter(f => f.k === 'fire').length; w2.fx.length = 0; }
  assert.ok(shots >= 2, 'tiros: ' + shots);
});

test('Céu: um motor falha, o chão inclina e a bola faz curva', () => {
  const w = Sim.create(four(), { level: 'ceu' });
  w.disp.cool = 1e9;
  run(w, 6.5);
  assert.ok(w.sky.cur >= 0, 'um motor falhou');
  assert.ok(Math.hypot(w.sky.gx, w.sky.gy) > 1.5, 'gravidade ligada');
  const S = Sim.snapshot(w);
  assert.ok(S.sky && typeof S.sky.gx === 'number');
  const b = ball(w, 7, 7, 0, 0.01);
  b.vx = 2; b.vy = 2; const v0 = { x: b.vx, y: b.vy };
  for (let t = 0; t < 0.4; t += DT) { Sim.step(w, idle(w), DT); }
  const turn = Math.atan2(b.vy, b.vx) - Math.atan2(v0.y, v0.x);
  assert.ok(Math.abs(turn) > 0.01 || Math.hypot(b.vx, b.vy) !== Math.hypot(v0.x, v0.y), 'a gravidade mexeu na bola');
});

test('previsão da CPU acha onde a bola cruza o gol (com tabela na parede)', () => {
  const w = quiet();
  const pr = C.predict(w, { x: 7, y: 7, vx: 0.2 * 6, vy: 6 }, 0, 3);
  assert.ok(pr && Math.abs(pr.a - (7 + 0.2 * 6 * pr.t)) < 0.3);
  const w2 = quiet(); w2.players[2].out = true;   // esquerda vira parede
  const pr2 = C.predict(w2, { x: 4, y: 8, vx: -4, vy: 3 }, 0, 3);
  assert.ok(pr2 && pr2.a > 1.6 && pr2.a < 4, 'tabelou na parede da esquerda');
  assert.equal(C.predict(w, { x: 7, y: 7, vx: 0.5, vy: -6 }, 0, 3), null, 'bola indo para o outro gol');
});

test('cada arena cria e roda com CPUs; a bola nunca escapa; mais bolas com o tempo', () => {
  for (const l of Sim.levels) {
    const w = Sim.create(four(), { level: l.id });
    let max = 0;
    for (let t = 0; t < 40; t += DT) {
      Sim.step(w, w.players.map(p => Sim.bot(w, p.slot, 1, DT)), DT);
      w.fx.length = 0;
      max = Math.max(max, w.balls.length);
      for (const b of w.balls) assert.ok(Number.isFinite(b.x + b.y + b.vx + b.vy) && b.x > -1 && b.x < 15 && b.y > -1 && b.y < 15, l.id);
    }
    assert.ok(max >= 4, l.id + ' chegou a ' + max + ' bolas');
    const S = Sim.snapshot(w);
    assert.ok(JSON.stringify(S).length < 3000, 'snapshot pequeno');
    assert.ok(S.balls.every(b => b.id && Math.abs(Math.round(b.x * 100) - b.x * 100) < 1e-6));
    for (const p of w.players) { const me = Sim.private(w, p.slot); assert.match(me.status, /PTS|FORA/); assert.equal(typeof me.hit, 'number'); }
  }
});

test('partida só de CPUs termina sozinha em cada arena e em cada nível', () => {
  for (const l of Sim.levels) for (const skill of [0, 2]) {
    const w = Sim.create(four(), { level: l.id });
    while (!w.result && w.time < 400) { Sim.step(w, w.players.map(p => Sim.bot(w, p.slot, skill, DT)), DT); w.fx.length = 0; }
    assert.ok(w.result, `${l.id}/${skill} terminou (${w.time.toFixed(0)} s)`);
    assert.equal(w.result.order.length, 4);
    assert.ok(w.result.winners.length <= 1);
  }
});

test('CPU difícil ganha da fácil na maioria das vezes', () => {
  let hard = 0;
  for (let i = 0; i < 6; i++) {
    const w = Sim.create(four(), { level: 'quadra' });
    while (!w.result && w.time < 400) { Sim.step(w, w.players.map(p => Sim.bot(w, p.slot, p.slot % 2 ? 2 : 0, DT)), DT); w.fx.length = 0; }
    if (w.result.winners.length && w.result.winners[0] % 2) hard++;
  }
  assert.ok(hard >= 5, 'difícil venceu ' + hard + ' de 6');
});

test('quem sai vira CPU sem travar (makeBot)', () => {
  const w = Sim.create(four(), { level: 'praia' });
  run(w, 5, x => x.players.map(p => Sim.bot(x, p.slot, 1, DT)));
  Sim.makeBot(w, 0);
  run(w, 5, x => x.players.map(p => Sim.bot(x, p.slot, 1, DT)));
  assert.ok(w.time > 9.9);
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
  while (Date.now() < end) { const value = predicate(); if (value) return value; await new Promise(resolve => setTimeout(resolve, 20)); }
  throw new Error('Timed out waiting for room state');
}
async function connect(port, hello) {
  const ws = new WebSocket(`ws://127.0.0.1:${port}`);
  const client = { ws, frames: 0, game: null, core: null, you: null, phases: new Set(), send: msg => ws.send(JSON.stringify(msg)) };
  ws.on('message', raw => {
    const msg = JSON.parse(raw);
    if (msg.t === 'state') { client.core = msg.core; client.game = msg.game; client.you = msg.you; }
    if (msg.t === 'game-frame') { client.frames++; client.game = msg.game; }
    if (client.game && client.game.phase) client.phases.add(client.game.phase);
  });
  await new Promise((resolve, reject) => { ws.once('open', resolve); ws.once('error', reject); });
  client.send(hello);
  await until(() => client.core);
  return client;
}

test('sala: TV + 2 celulares, loading → 3-2-1 → jogo; TV recebe o mundo e o celular só o seu', { timeout: 40000 }, async t => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'arcade-ballistix-'));
  const port = await freePort();
  const server = spawn(process.execPath, ['server.js'], { cwd: path.resolve(__dirname, '..'), env: { ...process.env, PORT: String(port), STATE_FILE: path.join(dir, 'state.json'), STATS_KEY: 'test-only', NO_LAN: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = ''; server.stdout.on('data', d => output += d); server.stderr.on('data', d => output += d);
  const clients = [];
  t.after(async () => { for (const c of clients) c.ws.terminate(); server.kill(); await new Promise(resolve => server.exitCode !== null ? resolve() : server.once('exit', resolve)); await rm(dir, { recursive: true, force: true }); });
  await until(() => output.includes('ARCADE DA CASA'));
  const add = async hello => { const c = await connect(port, hello); clients.push(c); return c; };
  const tv = await add({ t: 'tv', room: 'BALX' });
  const a = await add({ t: 'join', room: 'BALX', pid: 'alpha', name: 'Ana', color: 'roxo' });
  const b = await add({ t: 'join', room: 'BALX', pid: 'bravo', name: 'Bia', color: 'ciano' });
  a.send({ t: 'play', id: 'ballistix' });
  await until(() => a.game && a.game.phase === 'setup');
  assert.equal(a.game.levels.length, 4);
  assert.equal(a.game.controls.stick, 'axis');
  a.send({ t: 'bash-level', level: 1 });
  await until(() => a.game.level === 1);
  assert.equal(a.game.controls.buttons.length, 3, 'Praia tem o ímã');
  a.send({ t: 'bash-start' });
  await until(() => tv.game && tv.game.phase === 'loading');
  tv.send({ t: 'bash-tv-ready', matchId: tv.game.matchId });
  await until(() => a.phases.has('countdown'));
  const pump = setInterval(() => {
    if (!a.game || !a.game.matchId) return;
    a.send({ t: 'input', matchId: a.game.matchId, x: 1, y: 0, a: false, b: true, c: false, active: true });
    b.send({ t: 'input', matchId: b.game.matchId, x: 0, y: 0, a: false, b: false, c: false, active: true });
  }, 50);
  t.after(() => clearInterval(pump));
  await until(() => a.game.phase === 'playing', 8000);
  const frames = tv.frames;
  await new Promise(resolve => setTimeout(resolve, 900));
  assert.ok(tv.frames > frames + 5, 'a TV recebe quadros');
  const W = tv.game.world;
  assert.ok(W && W.lv === 'praia' && W.pl.length === 4 && Array.isArray(W.balls));
  const me = W.pl.find(p => p.slot === a.game.me.slot);
  assert.ok(me.p > 9, 'o celular move o trenó: ' + me.p);
  assert.equal(a.game.world, null, 'o celular não recebe o mundo');
  assert.ok(a.game.me && /PTS/.test(a.game.me.status) && a.game.me.axis === 'h' && typeof a.game.me.bar === 'number');
  assert.equal(b.game.me.axis, 'h');
  assert.equal(tv.game.me, null);
});

// A TV para de desenhar de vez se o draw() jogar um erro: desenha todos os estados num canvas falso.
test('TV desenha todos os estados (escudo, ímã, motor, eliminado, morte súbita) sem erro', () => {
  const vm = require('node:vm');
  const noop = () => {};
  const ctx = new Proxy({}, { get: (o, k) => (k in o ? o[k] : (k === 'createPattern' ? () => ({}) : noop)), set: (o, k, v) => { o[k] = v; return true; } });
  let game = null;
  const sandbox = {
    window: { BashTV: { register: (id, g) => { assert.equal(id, 'ballistix'); game = g; } } },
    document: { createElement: () => ({ getContext: () => ctx, width: 0, height: 0 }), head: { appendChild: noop } },
    Math, String, parseInt, Object, Array,
  };
  vm.runInNewContext(require('node:fs').readFileSync(path.join(__dirname, '../games/ballistix/tv.js'), 'utf8'), sandbox);
  assert.ok(game && game.draw && game.fx && game.hud);
  const K = {
    ctx, s: 40, tilt: 0.8, time: 1, dt: 0.016, W: 1280, H: 720,
    X: x => x * 40, Y: (y, z) => y * 32 - (z || 0) * 40, ell: noop, shadow: noop, char: noop, text: noop, pix: noop,
    spawn: noop, burst: noop, ring: noop, float: noop, shake: noop, sfx: noop, color: () => '#ff8a1f', seat: () => ({}),
  };
  for (const l of Sim.levels) {
    const w = Sim.create(four(), { level: l.id });
    run(w, 12, x => x.players.map(p => Sim.bot(x, p.slot, 1, DT)));
    w.players[0].shield = 3; w.players[1].mag = true; w.players[1].magT = 2; w.players[2].out = true; w.players[3].flash = 0.4;
    w.pick = { c: 1, t: 2 }; w.sd = 1;
    if (w.sky) { w.sky.phase = 'warn'; w.sky.next = 2; }
    const S = JSON.parse(JSON.stringify(Sim.snapshot(w)));
    assert.deepEqual(game.arena(S).w > 14, true);
    game.draw(K, S, {});
    for (const k of ['goal', 'out', 'hit', 'kick', 'bump', 'spawn', 'fire', 'shield', 'grab', 'blast', 'heat', 'engine', 'sd']) game.fx(K, { k, x: 3, y: 4, slot: 0, side: 0, c: 1 }, S);
    assert.match(game.hud(0, S).text, /PTS/); assert.equal(game.hud(2, S).out, true);
  }
});
