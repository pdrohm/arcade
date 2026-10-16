// BALLISTIX — pong de quatro lados. Cada pessoa guarda um lado da quadra quadrada (o seu gol)
// num trenó flutuante que corre na linha do gol. Bola no seu gol tira 1 ponto; com 0 o gol fecha
// (vira parede) e você sai. O último com pontos vence. Só o servidor roda este arquivo.
//
// Mundo: quadra de N×N unidades, x para a direita, y para baixo (em direção à câmera).
// Lados: 0 embaixo (perto da câmera), 1 em cima, 2 esquerda, 3 direita. A vaga N guarda o lado N.
// Cada lado tem um eixo próprio: "along" corre na linha do gol e "depth" entra na quadra.
'use strict';

const N = 14, POST = 1.6, R = 0.38;                       // quadra, poste de canto, raio da bola
const SLED_W = 2.4, HALF = SLED_W / 2, SLED_R = 0.35, SEG = HALF - SLED_R, DEPTH = 0.6;
const P_MIN = POST + HALF, P_MAX = N - POST - HALF;       // o trenó vai de um poste ao outro
const MOVE = 8, TURBO = 13, ACC = 75;                     // velocidade do trenó (u/s) e arranque
const V0 = 6, VMAX = 14, VKICK = 15.5, VMIN = 4.5;        // velocidades da bola
const MAX_ANG = 1.08, MIN_COMP = 0.28;                    // 62° na ponta do trenó; nunca quase paralela à parede
const KICK_WIN = 0.2, KICK_MAX = 2, KICK_REC = 1.5, KICK_REACH = 0.22;
const MAG_R = 4.6, MAG_ACC = 24, MAG_MAX = 4, MAG_HEAT = 2.5, MAG_COOL = 3, MAG_FIRE = 15.5;
const SHIELD_T = 6, PICK_EVERY = 8, PICK_LIFE = 10;
const TURRET_R = 1.0, GRAV = 2.6, TILT_T = 8, TILT_WARN = 2;
const STALL = 10;                                         // bola que ninguém toca por 10 s ganha um empurrão
const SD_AT = 120, SD_EVERY = 20;                         // morte súbita: mais bolas e mais rápidas

const SIDES = [
  { ox: 0, oy: N, ax: 1, ay: 0, nx: 0, ny: -1 },
  { ox: 0, oy: 0, ax: 1, ay: 0, nx: 0, ny: 1 },
  { ox: 0, oy: 0, ax: 0, ay: 1, nx: 1, ny: 0 },
  { ox: N, oy: 0, ax: 0, ay: 1, nx: -1, ny: 0 },
];
// cantos: 0 cima-esq, 1 cima-dir, 2 baixo-esq, 3 baixo-dir; END_CORNER[lado] = [canto da ponta menor, da maior]
const CORNERS = [[0, 0], [N, 0], [0, N], [N, N]];
const END_CORNER = [[2, 3], [0, 1], [0, 2], [1, 3]];
const POSTS = [[0, 0, POST, POST], [N - POST, 0, N, POST], [0, N - POST, POST, N], [N - POST, N - POST, N, N]];

const LEVELS = [
  { id: 'quadra', name: 'Crashball', short: 'O clássico: 4 gols e cada vez mais bolas.', pts: 15, balls: 5,
    how: ['Cada um guarda um lado da quadra: o seu gol.', 'Ande na linha do gol e rebata as bolas.', 'Bola no seu gol tira 1 ponto. Com 0, o gol fecha e você sai.', 'A = CHUTE (a bola volta forte). B = TURBO.', 'Bater na ponta do trenó manda a bola mais de lado.'] },
  { id: 'praia', name: 'Beach Ball', short: 'Bolas de praia e um ímã que guarda até 4 bolas.', pts: 12, balls: 6,
    how: ['Segure C (ÍMÃ) para puxar e guardar até 4 bolas.', 'Solte C para atirar todas de uma vez, bem forte.', 'Segurou demais? O ímã esquenta e solta as bolas.', 'A = CHUTE. B = TURBO.'] },
  { id: 'canhao', name: 'N. Ballism', short: 'O Canhão no meio gira e atira. Pegue o escudo nos cantos.', pts: 20, balls: 5,
    how: ['O Canhão no meio gira, mira num gol e atira.', 'As bolas também batem no Canhão.', 'Um escudo aparece num canto: vá até a ponta do seu gol para pegar.', 'O escudo fecha o seu gol por 6 segundos.'] },
  { id: 'ceu', name: 'Sky Balls', short: 'Plataforma no céu: um motor falha e as bolas descem.', pts: 20, balls: 5,
    how: ['A quadra flutua com 4 motores, um em cada canto.', 'Quando um motor falha, o chão inclina para aquele canto.', 'As bolas fazem curva e descem para o lado baixo.', 'O motor treme e solta fumaça antes de falhar.'] },
];
const levelOf = id => LEVELS.find(l => l.id === id) || LEVELS[0];

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const r2 = v => Math.round(v * 100) / 100;
const r1 = v => Math.round(v * 10) / 10;
const along = (s, x, y) => (x - s.ox) * s.ax + (y - s.oy) * s.ay;
const depth = (s, x, y) => (x - s.ox) * s.nx + (y - s.oy) * s.ny;
const sideOf = slot => slot;

function controls(levelId) {
  const buttons = [{ id: 'a', label: 'CHUTE' }, { id: 'b', label: 'TURBO', hold: true }];
  if (levelId === 'praia') buttons.push({ id: 'c', label: 'ÍMÃ', hold: true });
  return { stick: 'axis', buttons };
}

function create(entrants, opts) {
  const lv = levelOf(opts && opts.level);
  const players = entrants.map(e => ({
    slot: e.slot, side: sideOf(e.slot), bot: !!e.bot, name: e.name, pts: lv.pts, max: lv.pts, out: false, outAt: 0,
    p: N / 2, v: 0, kickT: 0, charges: KICK_MAX, shield: 0, hit: 0, flash: 0,
    mag: false, magT: 0, cool: 0, held: [], msgT: 0, msg: '',
  }));
  const owner = [-1, -1, -1, -1];
  for (const p of players) owner[p.side] = p.slot;
  const world = {
    lv: lv.id, time: 0, fx: [], players, owner, balls: [], nextId: 1, result: null, bots: {},
    target: 2, sd: 0, cap: VMAX, launch: V0,
    disp: { warn: 0, cool: 1.2, a: 0, side: -1 },
    turret: lv.id === 'canhao' ? { a: Math.random() * Math.PI * 2, aim: null, warn: 0, cool: 1.2 } : null,
    pick: null, pickT: 5,
    sky: lv.id === 'ceu' ? { cur: -1, next: -1, phase: 'calm', t: 4, gx: 0, gy: 0, tx: 0, ty: 0 } : null,
  };
  return world;
}

// ---------- geometria ----------
function closed(world, side) {
  const o = world.owner[side];
  return o < 0 || world.players[o].out || !!world.result;
}
function sledXY(pl) {
  const s = SIDES[pl.side];
  return { x: s.ox + s.ax * pl.p + s.nx * DEPTH, y: s.oy + s.ay * pl.p + s.ny * DEPTH };
}
// Nunca deixa a bola andar quase paralela a uma parede: cada componente tem pelo menos MIN_COMP.
function fixAngle(b) {
  const sp = Math.hypot(b.vx, b.vy) || V0;
  let ux = b.vx / sp, uy = b.vy / sp;
  if (Math.abs(ux) < MIN_COMP) { ux = (ux < 0 ? -1 : 1) * MIN_COMP; uy = (uy < 0 ? -1 : 1) * Math.sqrt(1 - ux * ux); }
  else if (Math.abs(uy) < MIN_COMP) { uy = (uy < 0 ? -1 : 1) * MIN_COMP; ux = (ux < 0 ? -1 : 1) * Math.sqrt(1 - uy * uy); }
  b.vx = ux * sp; b.vy = uy * sp;
}
function reflect(b, nx, ny) {
  const d = b.vx * nx + b.vy * ny;
  if (d < 0) { b.vx -= 2 * d * nx; b.vy -= 2 * d * ny; return true; }
  return false;
}
// Paredes, gols, postes e o Canhão. Devolve o lado do gol onde a bola entrou (ou -1).
// Também serve para a previsão da CPU (b é um objeto solto { x, y, vx, vy }).
function bounceStatic(world, b) {
  let hit = false;
  for (let side = 0; side < 4; side++) {
    const s = SIDES[side], d = depth(s, b.x, b.y);
    if (d >= R) continue;
    const a = along(s, b.x, b.y);
    const shut = closed(world, side) || (world.owner[side] >= 0 && world.players[world.owner[side]].shield > 0);
    if (shut || a < POST || a > N - POST) {
      if (d < R) { b.x += s.nx * (R - d); b.y += s.ny * (R - d); if (reflect(b, s.nx, s.ny)) hit = true; }
    } else if (d < -0.1) return side;
  }
  for (const q of POSTS) {
    const cx = clamp(b.x, q[0], q[2]), cy = clamp(b.y, q[1], q[3]);
    let dx = b.x - cx, dy = b.y - cy, dd = Math.hypot(dx, dy);
    if (dd >= R) continue;
    if (dd < 1e-6) { dx = N / 2 - b.x; dy = N / 2 - b.y; dd = Math.hypot(dx, dy) || 1; }
    const nx = dx / dd, ny = dy / dd;
    b.x = cx + nx * R; b.y = cy + ny * R;
    if (reflect(b, nx, ny)) hit = true;
  }
  if (world.turret) {
    const dx = b.x - N / 2, dy = b.y - N / 2, dd = Math.hypot(dx, dy);
    if (dd < TURRET_R + R && dd > 1e-6) {
      const nx = dx / dd, ny = dy / dd;
      b.x = N / 2 + nx * (TURRET_R + R); b.y = N / 2 + ny * (TURRET_R + R);
      if (reflect(b, nx, ny)) hit = true;
    }
  }
  if (hit) fixAngle(b);
  b.bounced = hit;
  return -1;
}

// ---------- trenó ----------
// A bola sai do trenó num ângulo que depende de onde ela bateu (ponta = mais de lado),
// mais um pouco do embalo do trenó. Chute: mais forte e um pouco mais de lado.
function deflect(world, pl, b, kick) {
  const s = SIDES[pl.side];
  const off = clamp((along(s, b.x, b.y) - pl.p) / (HALF + R * 0.5), -1, 1);
  const ang = off * MAX_ANG * (kick ? 1.1 : 1);
  let ua = Math.sin(ang) + clamp(pl.v / TURBO, -1, 1) * 0.22, un = Math.cos(ang);
  const va = b.vx * s.ax + b.vy * s.ay;
  if (Math.abs(ua) < MIN_COMP) ua = (ua !== 0 ? Math.sign(ua) : (va < 0 ? -1 : 1)) * MIN_COMP;
  const m = Math.hypot(ua, un); ua /= m; un /= m;
  let sp = Math.hypot(b.vx, b.vy);
  sp = kick ? clamp(Math.max(sp * 1.3, 12), 12, VKICK) : Math.min(world.cap, Math.max(sp * 1.06, sp + 0.25));
  b.vx = (s.ax * ua + s.nx * un) * sp; b.vy = (s.ay * ua + s.ny * un) * sp;
  fixAngle(b);
}
function sledHit(world, pl, b) {
  if (b.ign === pl.slot && b.ignT > 0) return;
  const s = SIDES[pl.side];
  const ba = along(s, b.x, b.y), bd = depth(s, b.x, b.y);
  const ca = pl.p + clamp(ba - pl.p, -SEG, SEG);
  const da = ba - ca, dd = bd - DEPTH, dist = Math.hypot(da, dd);
  const kick = pl.kickT > 0;
  const reach = R + SLED_R + (kick ? KICK_REACH : 0);
  if (dist >= reach || dist < 1e-6) return;
  const na = da / dist, nd = dd / dist;
  const vd = b.vx * s.nx + b.vy * s.ny;
  if (nd > -0.2) {
    // bola na frente do trenó: rebate para dentro da quadra
    const push = Math.max(dist, R + SLED_R);
    const wa = ca + na * push, wd = DEPTH + nd * push;
    b.x = s.ox + s.ax * wa + s.nx * wd; b.y = s.oy + s.ay * wa + s.ny * wd;
    if (vd > 0.5 && !kick) return;                     // já está indo embora
    if (kick && b.kicked === pl.slot && b.kickedT > 0) return;
    deflect(world, pl, b, kick);
    b.last = pl.slot; b.idle = 0;
    if (kick) { b.kicked = pl.slot; b.kickedT = 0.25; b.hot = 1.2; world.fx.push({ k: 'kick', x: r2(b.x), y: r2(b.y), slot: pl.slot }); pl.kickFx = 0.25; }
    else world.fx.push({ k: 'hit', x: r2(b.x), y: r2(b.y), slot: pl.slot });
  } else {
    // bola atrás do trenó (já passou): só empurra; ela segue para o gol
    const wa = ca + na * (R + SLED_R), wd = DEPTH + nd * (R + SLED_R);
    b.x = s.ox + s.ax * wa + s.nx * wd; b.y = s.oy + s.ay * wa + s.ny * wd;
    const nx = s.ax * na + s.nx * nd, ny = s.ay * na + s.ny * nd;
    reflect(b, nx, ny);
  }
}

// ---------- bolas ----------
function addBall(world, x, y, dx, dy, sp) {
  const m = Math.hypot(dx, dy) || 1;
  const b = { id: world.nextId++, x, y, vx: dx / m * sp, vy: dy / m * sp, held: -1, last: -1, idle: 0, hot: 0, ign: -1, ignT: 0, kicked: -1, kickedT: 0 };
  fixAngle(b);
  world.balls.push(b);
  return b;
}
function living(world) { return world.players.filter(p => !p.out); }
// Lado que vai receber a próxima bola: o que tem menos bolas indo na direção dele (empate: sorteio).
function pickSide(world) {
  const alive = living(world);
  if (!alive.length) return -1;
  let best = [], low = Infinity;
  for (const pl of alive) {
    const s = SIDES[pl.side];
    let n = 0;
    for (const b of world.balls) if (b.held < 0 && b.vx * s.nx + b.vy * s.ny < 0) n++;
    if (n < low) { low = n; best = [pl.side]; } else if (n === low) best.push(pl.side);
  }
  return best[Math.floor(Math.random() * best.length)];
}
function aimAt(side) {
  const s = SIDES[side], a = 3 + Math.random() * (N - 6);
  const tx = s.ox + s.ax * a, ty = s.oy + s.ay * a;
  return Math.atan2(ty - N / 2, tx - N / 2);
}
function centerClear(world, r) {
  return !world.balls.some(b => b.held < 0 && Math.hypot(b.x - N / 2, b.y - N / 2) < r);
}
function spawning(world, dt) {
  const want = world.balls.length < world.target;
  if (world.turret) {
    // o Canhão gira devagar; quando precisa de bola, vira para um gol, avisa e atira
    const t = world.turret;
    t.cool -= dt;
    if (!t.aim && want && t.cool <= 0) { const side = pickSide(world); if (side >= 0) t.aim = { side, a: aimAt(side) }; }
    if (t.aim) {
      let d = t.aim.a - t.a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
      const step = 2.6 * dt;
      if (Math.abs(d) > step) { t.a += Math.sign(d) * step; t.warn = 0; }
      else {
        t.a = t.aim.a; t.warn += dt;
        if (t.warn >= 0.45) {
          const dx = Math.cos(t.a), dy = Math.sin(t.a), o = TURRET_R + R + 0.05;
          addBall(world, N / 2 + dx * o, N / 2 + dy * o, dx, dy, world.launch + 1);
          world.fx.push({ k: 'fire', x: r2(N / 2 + dx * o), y: r2(N / 2 + dy * o), a: r2(t.a) });
          t.aim = null; t.warn = 0; t.cool = 0.9;
        }
      }
    } else t.a += 0.7 * dt;
    return;
  }
  const d = world.disp;
  if (d.side >= 0) {
    d.warn += dt;
    if (d.warn >= 0.7 && centerClear(world, 1.0)) {
      addBall(world, N / 2, N / 2, Math.cos(d.a), Math.sin(d.a), world.launch);
      world.fx.push({ k: 'spawn', x: N / 2, y: N / 2, a: r2(d.a) });
      d.side = -1; d.warn = 0; d.cool = 0.9;
    }
  } else {
    d.cool -= dt;
    if (want && d.cool <= 0) { const side = pickSide(world); if (side >= 0) { d.side = side; d.a = aimAt(side); d.warn = 0; } }
  }
}

// ---------- arenas ----------
function pickups(world, dt) {
  if (world.lv !== 'canhao') return;
  if (world.pick) {
    world.pick.t -= dt;
    if (world.pick.t <= 0) { world.pick = null; world.pickT = PICK_EVERY; return; }
    // pega quem chegar na ponta do próprio gol, do lado daquele canto
    for (const pl of world.players) {
      if (pl.out) continue;
      const ends = END_CORNER[pl.side];
      const atEnd = (ends[0] === world.pick.c && pl.p <= P_MIN + 0.35) || (ends[1] === world.pick.c && pl.p >= P_MAX - 0.35);
      if (atEnd) {
        pl.shield = SHIELD_T;
        world.fx.push({ k: 'shield', slot: pl.slot, c: world.pick.c, x: CORNERS[world.pick.c][0], y: CORNERS[world.pick.c][1] });
        world.pick = null; world.pickT = PICK_EVERY; return;
      }
    }
    return;
  }
  world.pickT -= dt;
  if (world.pickT > 0) return;
  const ok = [0, 1, 2, 3].filter(c => world.players.some(pl => !pl.out && END_CORNER[pl.side].includes(c)));
  if (!ok.length) return;
  world.pick = { c: ok[Math.floor(Math.random() * ok.length)], t: PICK_LIFE };
}
// Céu: um motor por vez falha e a quadra inclina para aquele canto (gravidade puxa as bolas).
function tilt(world, dt) {
  const k = world.sky; if (!k) return;
  k.t -= dt;
  if (k.t <= 0) {
    if (k.phase === 'warn') {
      k.cur = k.next; k.next = -1; k.phase = 'tilt'; k.t = TILT_T;
      const c = CORNERS[k.cur], dx = c[0] - N / 2, dy = c[1] - N / 2, m = Math.hypot(dx, dy);
      k.tx = dx / m * GRAV; k.ty = dy / m * GRAV;
      world.fx.push({ k: 'engine', c: k.cur, x: c[0], y: c[1] });
    } else {
      // escolhe um canto com alguém vivo ao lado (de preferência outro)
      const ok = [0, 1, 2, 3].filter(c => c !== k.cur && world.players.some(pl => !pl.out && END_CORNER[pl.side].includes(c)));
      const list = ok.length ? ok : [0, 1, 2, 3];
      k.next = list[Math.floor(Math.random() * list.length)]; k.phase = 'warn'; k.t = TILT_WARN;
    }
  }
  const f = Math.min(1, dt * 2);
  k.gx += (k.tx - k.gx) * f; k.gy += (k.ty - k.gy) * f;
}

// ---------- jogadores ----------
function release(world, pl, fire) {
  const s = SIDES[pl.side], n = pl.held.length;
  if (!n) return;
  const skew = clamp(pl.v / MOVE, -1, 1) * 0.35;
  pl.held.forEach((id, i) => {
    const b = world.balls.find(x => x.id === id); if (!b) return;
    b.held = -1; b.ign = pl.slot; b.ignT = 0.2; b.idle = 0; b.last = pl.slot;
    const ang = (n === 1 ? 0 : -0.5 + i / (n - 1)) + skew;
    const ua = Math.sin(ang), un = Math.cos(ang), sp = fire ? MAG_FIRE : 4.5;
    b.vx = (s.ax * ua + s.nx * un) * sp; b.vy = (s.ay * ua + s.ny * un) * sp;
    if (fire) b.hot = 1.2;
    fixAngle(b);
  });
  pl.held = [];
  const c = sledXY(pl);
  world.fx.push({ k: fire ? 'blast' : 'drop', slot: pl.slot, x: r2(c.x), y: r2(c.y), n });
}
function movePlayer(world, pl, inp, dt) {
  if (pl.out) return;
  const s = SIDES[pl.side];
  const raw = s.ax ? (+inp.x || 0) : (+inp.y || 0);
  const want = clamp(raw, -1, 1) * (inp.b ? TURBO : MOVE);
  const dv = want - pl.v, mx = ACC * dt;
  pl.v += clamp(dv, -mx, mx);
  pl.p += pl.v * dt;
  if (pl.p < P_MIN) { pl.p = P_MIN; pl.v = Math.max(0, pl.v); }
  if (pl.p > P_MAX) { pl.p = P_MAX; pl.v = Math.min(0, pl.v); }
  // chute: janela curta; carga volta com o tempo
  pl.kickT = Math.max(0, pl.kickT - dt);
  pl.kickFx = Math.max(0, (pl.kickFx || 0) - dt);
  if (inp.ap && pl.charges >= 1 && pl.kickT <= 0) { pl.kickT = KICK_WIN; pl.charges -= 1; }
  pl.charges = Math.min(KICK_MAX, pl.charges + dt / KICK_REC);
  pl.shield = Math.max(0, pl.shield - dt);
  pl.flash = Math.max(0, pl.flash - dt);
  pl.msgT = Math.max(0, pl.msgT - dt);
  // ímã (só na Praia)
  if (world.lv !== 'praia') return;
  pl.cool = Math.max(0, pl.cool - dt);
  if (inp.c && pl.cool <= 0 && !world.result) {
    pl.mag = true; pl.magT += dt;
    if (pl.magT >= MAG_HEAT) {
      release(world, pl, false);
      pl.mag = false; pl.magT = 0; pl.cool = MAG_COOL; pl.msg = 'QUENTE!'; pl.msgT = 1.2;
      world.fx.push({ k: 'heat', slot: pl.slot, x: r2(sledXY(pl).x), y: r2(sledXY(pl).y) });
    }
  } else if (pl.mag) {
    release(world, pl, true);
    pl.mag = false; pl.magT = 0;
  }
}
function magnet(world, pl, b, dt) {
  if (!pl.mag || pl.out) return;
  const c = sledXY(pl), s = SIDES[pl.side];
  const dx = c.x - b.x, dy = c.y - b.y, dd = Math.hypot(dx, dy);
  if (dd > MAG_R || depth(s, b.x, b.y) < DEPTH) return;
  if (pl.held.length < MAG_MAX && dd < R + SLED_R + 0.5) {
    b.held = pl.slot; pl.held.push(b.id); b.vx = 0; b.vy = 0; b.hot = 0;
    world.fx.push({ k: 'grab', slot: pl.slot, x: r2(b.x), y: r2(b.y) });
    return;
  }
  if (pl.held.length >= MAG_MAX) return;
  const f = MAG_ACC * dt * (1 - dd / (MAG_R + 0.5));
  b.vx += dx / dd * f; b.vy += dy / dd * f;
}
function heldPos(world, pl) {
  const s = SIDES[pl.side], n = pl.held.length;
  pl.held.forEach((id, i) => {
    const b = world.balls.find(x => x.id === id); if (!b) return;
    const a = clamp(pl.p + (i - (n - 1) / 2) * 0.8, POST + R, N - POST - R), d = DEPTH + SLED_R + R + 0.12;
    b.x = s.ox + s.ax * a + s.nx * d; b.y = s.oy + s.ay * a + s.ny * d;
  });
}

// ---------- passo ----------
function goal(world, b, side) {
  const o = world.owner[side];
  world.balls.splice(world.balls.indexOf(b), 1);
  if (o < 0) return;
  const pl = world.players[o];
  pl.pts = Math.max(0, pl.pts - 1); pl.hit++; pl.flash = 0.6;
  world.fx.push({ k: 'goal', slot: o, side, x: r2(clamp(b.x, 0, N)), y: r2(clamp(b.y, 0, N)), pts: pl.pts, by: b.last });
  if (pl.pts <= 0 && !pl.out) {
    pl.out = true; pl.outAt = world.time;
    release(world, pl, false);
    pl.mag = false; pl.shield = 0;
    world.fx.push({ k: 'out', slot: o, side });
  }
}
function step(world, inputs, dt) {
  world.time += dt;
  const T = world.time;
  // mais bolas com o tempo; depois de 2 min, morte súbita
  const lv = levelOf(world.lv);
  const sd = T >= SD_AT ? 1 + Math.floor((T - SD_AT) / SD_EVERY) : 0;
  if (sd !== world.sd) { world.sd = sd; world.fx.push({ k: 'sd', n: sd }); for (const pl of world.players) if (!pl.out) { pl.msg = 'MORTE SÚBITA!'; pl.msgT = 2; } }
  world.target = Math.min(lv.balls, 2 + Math.floor(T / 10)) + Math.min(3, sd);
  world.launch = V0 + Math.min(1.5, T / 60) + Math.min(3, sd * 0.8);
  world.cap = VMAX + Math.min(1.5, sd * 0.5);

  for (const pl of world.players) movePlayer(world, pl, (inputs && inputs[pl.slot]) || {}, dt);
  if (!world.result) { spawning(world, dt); pickups(world, dt); tilt(world, dt); }
  const g = world.sky && !world.result ? world.sky : null;

  for (const pl of world.players) heldPos(world, pl);
  const free = world.balls.filter(b => b.held < 0);
  for (const b of free) {
    if (g) { b.vx += g.gx * dt; b.vy += g.gy * dt; }
    for (const pl of world.players) magnet(world, pl, b, dt);
    if (b.held >= 0) continue;
    let sp = Math.hypot(b.vx, b.vy);
    const top = Math.max(world.cap, b.hot > 0 ? VKICK : 0);
    if (sp > world.cap) sp = Math.max(world.cap, Math.min(top, sp) - 3 * dt);
    if (sp < VMIN) sp = VMIN;
    const m = Math.hypot(b.vx, b.vy) || 1; b.vx = b.vx / m * sp; b.vy = b.vy / m * sp;
    b.x += b.vx * dt; b.y += b.vy * dt;
    b.hot = Math.max(0, b.hot - dt); b.ignT = Math.max(0, b.ignT - dt); b.kickedT = Math.max(0, b.kickedT - dt);
    b.idle += dt;
    if (b.idle > STALL && living(world).length) {
      // ninguém toca nesta bola faz tempo: manda para um gol vivo
      const side = pickSide(world), a = aimAt(side), s2 = Math.max(sp, 7);
      const tx = N / 2 + Math.cos(a) * 5, ty = N / 2 + Math.sin(a) * 5, dx = tx - b.x, dy = ty - b.y, dm = Math.hypot(dx, dy) || 1;
      b.vx = dx / dm * s2; b.vy = dy / dm * s2; b.idle = 0; fixAngle(b);
    }
    for (const pl of world.players) if (!pl.out) sledHit(world, pl, b);
    const side = bounceStatic(world, b);
    if (side >= 0) goal(world, b, side);
  }
  // bola com bola: choque elástico (massas iguais)
  const list = world.balls;
  for (let i = 0; i < list.length; i++) {
    const a = list[i]; if (a.held >= 0) continue;
    for (let j = i + 1; j < list.length; j++) {
      const b = list[j]; if (b.held >= 0) continue;
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
      if (d >= 2 * R || d < 1e-6) continue;
      const nx = dx / d, ny = dy / d, o = (2 * R - d) / 2;
      a.x -= nx * o; a.y -= ny * o; b.x += nx * o; b.y += ny * o;
      const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
      if (rel <= 0) continue;
      a.vx -= rel * nx; a.vy -= rel * ny; b.vx += rel * nx; b.vy += rel * ny;
      fixAngle(a); fixAngle(b);
      if (rel > 3) world.fx.push({ k: 'bump', x: r2((a.x + b.x) / 2), y: r2((a.y + b.y) / 2) });
    }
  }
  if (!world.result) judge(world);
}
function judge(world) {
  if (world.players.length < 2) return;
  const alive = living(world);
  if (alive.length > 1) return;
  const outs = world.players.filter(p => p.out).sort((a, b) => b.outAt - a.outAt);
  world.result = { winners: alive.map(p => p.slot), order: alive.map(p => p.slot).concat(outs.map(p => p.slot)) };
  for (const pl of world.players) if (pl.held.length) release(world, pl, false);
}

// ---------- CPU ----------
const SKILL = [
  { react: 0.6, err: 2.6, speed: 0.55, kick: 0.1, turbo: 5, aim: 0, mag: 0.15, lapse: 0.45 },
  { react: 0.24, err: 0.75, speed: 0.9, kick: 0.45, turbo: 2.6, aim: 0.6, mag: 0.5, lapse: 0.1 },
  { react: 0.09, err: 0.22, speed: 1, kick: 0.75, turbo: 1.8, aim: 1, mag: 0.85, lapse: 0 },
];
// Onde (e quando) a bola cruza a linha do meu trenó, com tabelas nas paredes e a gravidade do Céu.
function predict(world, b, side, maxT) {
  const s = SIDES[side], h = 1 / 40, tmp = { x: b.x, y: b.y, vx: b.vx, vy: b.vy };
  const g = world.sky || { gx: 0, gy: 0 };
  const line = DEPTH + SLED_R + R;
  for (let t = 0; t < maxT; t += h) {
    tmp.vx += g.gx * h; tmp.vy += g.gy * h;
    tmp.x += tmp.vx * h; tmp.y += tmp.vy * h;
    const d = depth(s, tmp.x, tmp.y), vd = tmp.vx * s.nx + tmp.vy * s.ny;
    if (d <= line && vd < 0) {
      const a = along(s, tmp.x, tmp.y);
      if (a > POST - R && a < N - POST + R) return { t, a: clamp(a, POST, N - POST) };
    }
    const into = bounceStatic(world, tmp);
    if (into >= 0) return into === side ? { t, a: along(s, tmp.x, tmp.y) } : null;
  }
  return null;
}
function makeBot(world, slot) { delete world.bots[slot]; }
function bot(world, slot, skill, dt) {
  const out = { x: 0, y: 0, a: false, b: false, c: false, ap: false, bp: false, cp: false, ar: false, br: false, cr: false };
  const pl = world.players[slot];
  if (!pl || pl.out) return out;
  const sk = SKILL[clamp(skill | 0, 0, 2)], s = SIDES[pl.side];
  const m = world.bots[slot] || (world.bots[slot] = { think: 0, target: N / 2, threat: -1, tt: 9, err: 0, rolls: {}, prevA: false, prevC: false, magHold: 0 });
  m.think -= dt;
  if (m.think <= 0 && !world.result) {
    m.think = sk.react * (0.7 + Math.random() * 0.6);
    let best = null, second = null;
    for (const b of world.balls) {
      if (b.held >= 0) continue;
      const pr = predict(world, b, pl.side, 3);
      if (!pr) continue;
      const c = { t: pr.t, a: pr.a, id: b.id };
      if (!best || c.t < best.t) { second = best; best = c; } else if (!second || c.t < second.t) second = c;
    }
    // distração: a CPU fácil às vezes olha para a bola errada
    if (second && m.threat !== best.id && Math.random() < sk.lapse) best = second;
    if (best) {
      if (best.id !== m.threat) {
        m.threat = best.id; m.err = (Math.random() * 2 - 1) * sk.err;
        m.rolls[best.id] = { kick: Math.random() < sk.kick, mag: Math.random() < sk.mag };
      }
      m.tt = best.t;
      // mirar: bater com a ponta certa do trenó para mandar a bola no gol mais fraco
      let aim = 0;
      if (sk.aim && best.t > 0.45) {
        let foe = null;
        for (const o of world.players) if (!o.out && o.slot !== slot && (!foe || o.pts < foe.pts)) foe = o;
        if (foe) {
          const fs = SIDES[foe.side], fx = fs.ox + fs.ax * (N / 2) + fs.nx * 0.5, fy = fs.oy + fs.ay * (N / 2) + fs.ny * 0.5;
          const ix = s.ox + s.ax * best.a + s.nx * (DEPTH + 1), iy = s.oy + s.ay * best.a + s.ny * (DEPTH + 1);
          const wa = (fx - ix) * s.ax + (fy - iy) * s.ay, wn = (fx - ix) * s.nx + (fy - iy) * s.ny;
          const ang = clamp(Math.atan2(wa, Math.max(0.5, wn)), -MAX_ANG, MAX_ANG);
          aim = -clamp(ang / MAX_ANG, -1, 1) * HALF * 0.75 * sk.aim;
        }
      }
      m.target = best.a + aim + m.err * Math.min(1, best.t / 0.8 + 0.3);
    } else {
      m.threat = -1; m.tt = 9;
      // nada vindo: pega o escudo (Canhão) ou volta para o meio
      let goal = N / 2;
      if (world.pick) { const e = END_CORNER[pl.side].indexOf(world.pick.c); if (e >= 0) goal = e ? P_MAX : P_MIN; }
      m.target = goal;
    }
  }
  const diff = m.target - pl.p;
  let v = Math.abs(diff) < 0.08 ? 0 : clamp(diff * 3, -1, 1) * sk.speed;
  const turbo = Math.abs(diff) > sk.turbo;
  if (s.ax) out.x = v; else out.y = v;
  out.b = turbo; out.bp = turbo && !m.prevB; out.br = !turbo && !!m.prevB; m.prevB = turbo;
  // chute na hora do contato (olha todo quadro, sem esperar a próxima decisão)
  let kick = false;
  const tb = m.threat >= 0 ? world.balls.find(b => b.id === m.threat && b.held < 0) : null;
  if (tb && pl.charges >= 1 && m.rolls[tb.id] && m.rolls[tb.id].kick) {
    const d = depth(s, tb.x, tb.y) - DEPTH - SLED_R - R, vd = tb.vx * s.nx + tb.vy * s.ny;
    const tt = vd < 0 ? d / -vd : 9;
    if (tt < 0.09 && Math.abs(along(s, tb.x, tb.y) - pl.p) < HALF + 0.3) kick = true;
  }
  out.a = kick; out.ap = kick && !m.prevA; out.ar = !kick && m.prevA; m.prevA = kick;
  // ímã na Praia: segura quando uma bola chega perto e solta antes de esquentar
  let mag = false;
  if (world.lv === 'praia' && pl.cool <= 0) {
    if (m.prevC) {
      m.magHold += dt;
      const near = world.balls.some(b => b.held < 0 && Math.hypot(b.x - sledXY(pl).x, b.y - sledXY(pl).y) < MAG_R);
      mag = m.magHold < 1.9 && (pl.held.length < 3 && (near || m.magHold < 0.5));
    } else if (tb && m.rolls[tb.id] && m.rolls[tb.id].mag && m.tt < 0.6) { mag = true; m.magHold = 0; }
  }
  out.c = mag; out.cp = mag && !m.prevC; out.cr = !mag && m.prevC; m.prevC = mag;
  return out;
}

// ---------- o que sai ----------
function snapshot(world) {
  const S = {
    lv: world.lv, n: N, sd: world.sd,
    pl: world.players.map(p => ({ slot: p.slot, side: p.side, pts: p.pts, max: p.max, out: p.out, p: r2(p.p), k: p.kickFx > 0 ? 1 : 0, ch: r1(p.charges), sh: r1(p.shield), mg: p.mag ? 1 : 0, ht: r2(p.magT / MAG_HEAT), cl: p.cool > 0 ? 1 : 0, f: r2(p.flash), hd: p.held.length })),
    balls: world.balls.map(b => ({ id: b.id, x: r2(b.x), y: r2(b.y), s: r1(Math.hypot(b.vx, b.vy)), h: b.held, l: b.last, hot: b.hot > 0 ? 1 : 0 })),
  };
  if (world.turret) S.tur = { a: r2(world.turret.a), w: r2(world.turret.warn) };
  else S.disp = { w: world.disp.side >= 0 ? r2(world.disp.warn / 0.7) : 0, a: r2(world.disp.a) };
  if (world.pick) S.pick = { c: world.pick.c, t: r1(world.pick.t) };
  if (world.sky) S.sky = { c: world.sky.cur, w: world.sky.phase === 'warn' ? world.sky.next : -1, gx: r2(world.sky.gx), gy: r2(world.sky.gy) };
  return S;
}
function priv(world, slot) {
  const pl = world.players[slot];
  if (!pl) return {};
  let msg = '';
  if (pl.msgT > 0) msg = pl.msg;
  else if (pl.mag) msg = 'ÍMÃ ' + pl.held.length + '/' + MAG_MAX;
  else if (pl.shield > 0) msg = 'ESCUDO ' + Math.ceil(pl.shield) + 's';
  return {
    status: pl.out ? 'FORA' : pl.pts + ' PTS', bar: pl.out ? 0 : pl.charges / KICK_MAX, axis: SIDES[pl.side].ax ? 'h' : 'v',
    hit: pl.hit, out: pl.out, outText: 'Seu gol fechou!', msg,
    off: { a: pl.out || pl.charges < 1, c: pl.out || pl.cool > 0 },
  };
}

module.exports = {
  levels: LEVELS.map(l => ({ id: l.id, name: l.name, short: l.short, how: l.how })),
  controls, create, step, bot, snapshot, private: priv, makeBot,
  // para os testes
  _: { N, POST, R, DEPTH, SLED_R, HALF, P_MIN, P_MAX, VMAX, VKICK, MIN_COMP, KICK_MAX, MAG_MAX, MAG_HEAT, SIDES, END_CORNER, LEVELS, predict, along, depth, sledXY, fixAngle, addBall },
};
