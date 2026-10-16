// Crate Crush: briga de arena com caixas (estilo "Crate Crush" do Crash Bash).
// Pegue caixas e jogue nos outros; TNT conta 3-2-1 e explode, Nitro explode ao toque,
// caixa de fruta cura. Quem fica de pé por último vence. Só o servidor roda este arquivo.
// Mundo: x para a direita, y para baixo (para a câmera), z para cima. Arena 16×12.
'use strict';

const W = 16, D = 12;
const PR = 0.45;            // raio do boneco
const CR = 0.4;             // meia largura da caixa (caixa de 0,8)
const RUN = 5.5, CARRY = 4.5;
const GRAV = 26, JUMP_T = 0.55, JUMP_V = GRAV * JUMP_T / 2;
const THROW_V = 13, THROW_VZ = 2.5, GC = 18;   // caixa jogada: ~6,4 de alcance
const KICK_V = 10;
const HP = 100, CLOCK = 90;
const FUSE = 3, DROP_T = 0.95, DROP_H = 9;
const DMG = { throw: 22, slide: 12, kick: 8, tnt: 35, nitro: 40, drop: 10, peng: 15, ball: 15, missile: 18, shield: 10 };
const FRUIT = 5;            // cada fruta (a caixa de fruta solta 3)
const TNT_R = 2.4, NITRO_R = 2;

const LEVELS = [
  { id: 'jungle', name: 'Jungle Bash', short: 'Grama, caixas, TNT e Nitro. O clássico.',
    how: ['Pegue uma caixa com A e jogue com A de novo.', 'TNT conta 3-2-1 e explode. Jogue antes!', 'Nitro verde explode ao toque. Não encoste.', 'Caixa com ? solta frutas que curam.', 'O último de pé vence.'] },
  { id: 'space', name: 'Space Bash', short: 'As explosões abrem buracos no chão.',
    how: ['Cada TNT e Nitro abre um buraco no piso.', 'Cair no buraco tira você da rodada na hora.', 'Pule os buracos com B.', 'Empurre os outros para o buraco com caixas.'] },
  { id: 'snow', name: 'Snow Bash', short: 'Gelo liso e um pinguim que gira pela arena.',
    how: ['O gelo escorrega: freie antes.', 'O pinguim acorda e gira pela arena. Saia da frente!', 'Acerte o pinguim com uma caixa para deixar ele tonto.', 'Caixa chutada desliza longe no gelo.'] },
  { id: 'drain', name: 'Drain Bash', short: 'Caixas roxas dão armas especiais.',
    how: ['Pegue a caixa roxa com A para ganhar uma arma.', 'C usa a arma: bola elétrica, míssil em 8 direções ou escudo.', 'Levar um golpe faz você perder a arma.', 'O último de pé vence.'] },
];
const LEVEL_IDS = LEVELS.map(l => l.id);

// pesos das caixas que caem do céu, por arena
const MIX = {
  jungle: { w: 52, t: 20, n: 12, f: 16, i: 0 },
  space: { w: 38, t: 28, n: 22, f: 12, i: 0 },
  snow: { w: 52, t: 20, n: 12, f: 16, i: 0 },
  drain: { w: 44, t: 16, n: 10, f: 12, i: 18 },
};
const FIELD = { jungle: 8, space: 7, snow: 7, drain: 8 };
const ITEMS = ['ball', 'missile', 'shield'];
const ITEM_N = { ball: 3, missile: 2, shield: 1 };
const ITEM_NAME = { ball: 'BOLA ELÉTRICA', missile: 'MÍSSIL', shield: 'ESCUDO' };

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const r2 = v => Math.round(v * 100) / 100;
const hyp = Math.hypot;

function rngOf(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function controls() {
  return { stick: 'free', buttons: [{ id: 'a', label: 'PEGAR' }, { id: 'b', label: 'PULAR' }, { id: 'c', label: 'CHUTE' }] };
}

const START = [[3, 2.6], [13, 2.6], [3, 9.4], [13, 9.4]];

function create(entrants, opts) {
  opts = opts || {};
  const level = LEVEL_IDS.includes(opts.level) ? opts.level : 'jungle';
  const seed = opts.seed !== undefined ? opts.seed : Math.floor(Math.random() * 4294967296);
  const w = {
    time: 0, level, cpuLevel: opts.cpuLevel === undefined ? 1 : opts.cpuLevel, rng: rngOf(seed), W, D,
    players: [], crates: [], fruits: [], holes: [], shots: [], penguin: null,
    nextId: 1, clock: CLOCK, spawnT: 0.8, deaths: 0, fx: [], result: null, bots: {},
  };
  entrants.forEach((e, i) => {
    const s = START[i % 4];
    w.players.push({
      slot: e.slot, bot: !!e.bot, x: s[0], y: s[1], z: 0, vz: 0, vx: 0, vy: 0, kx: 0, ky: 0,
      dir: Math.atan2(D / 2 - s[1], W / 2 - s[0]), hp: HP, out: false, why: '', outSeq: 0, fall: 0,
      hold: null, stun: 0, inv: 0, kick: 0, kickCd: 0, flash: 0, hits: 0, item: null, shield: 0, touchCd: 0, pgCd: 0, air: false,
    });
  });
  // primeiras caixas já no chão, longe dos cantos de saída
  const first = ['w', 'w', 'w', 'f', 't', 'w'];
  if (level === 'drain') first[5] = 'i';
  if (level === 'space') first[1] = 'n';
  for (const k of first) {
    const pos = freeSpot(w, 2.2);
    if (pos) w.crates.push(newCrate(w, k, pos[0], pos[1], 'g'));
  }
  if (level === 'snow') w.penguin = { x: W / 2, y: D / 2, vx: 0, vy: 0, dir: Math.PI / 2, st: 'sleep', t: 4.5, ang: 0, sign: 1, run: 0, rad: 0 };
  return w;
}

function newCrate(w, k, x, y, st) {
  return { id: w.nextId++, k, x, y, z: st === 'd' ? DROP_H : 0, vx: 0, vy: 0, vz: 0, st, dropT: st === 'd' ? DROP_T : 0, owner: -1, age: 0, fuse: 0, dead: false };
}

function inHole(w, x, y, pad) {
  for (const h of w.holes) if (hyp(x - h.x, y - h.y) < h.r + (pad || 0)) return h;
  return null;
}

// lugar livre para uma caixa nova (longe de caixas, buracos e, se pedir, dos bonecos)
function freeSpot(w, fromPlayers) {
  for (let i = 0; i < 40; i++) {
    const x = 1.3 + w.rng() * (W - 2.6), y = 1.3 + w.rng() * (D - 2.6);
    if (w.crates.some(c => !c.dead && hyp(c.x - x, c.y - y) < 1.4)) continue;
    if (inHole(w, x, y, 0.8)) continue;
    if (fromPlayers && w.players.some(p => !p.out && hyp(p.x - x, p.y - y) < fromPlayers)) continue;
    if (w.penguin && hyp(w.penguin.x - x, w.penguin.y - y) < 1.6) continue;
    return [x, y];
  }
  return null;
}

function pickKind(w) {
  const mix = MIX[w.level], live = w.crates.filter(c => !c.dead);
  const cnt = k => live.filter(c => c.k === k).length;
  const table = Object.assign({}, mix);
  if (cnt('n') >= 2) table.n = 0;
  if (cnt('t') >= 3) table.t = 0;
  if (cnt('i') >= 2 || w.players.filter(p => p.item).length >= 2) table.i = 0;
  if (cnt('f') >= 2) table.f = 0;
  let sum = 0; for (const k in table) sum += table[k];
  let r = w.rng() * sum;
  for (const k in table) { r -= table[k]; if (r <= 0) return k; }
  return 'w';
}

function fx(w, o) { w.fx.push(o); }

// ---------- dano ----------
function hurt(w, p, dmg, fx0, fy0, kb, kind) {
  if (w.result || p.out) return false;
  if (kind === 'kick' && p.inv > 0) return false;
  if (p.shield > 0) { fx(w, { k: 'block', x: r2(p.x), y: r2(p.y), s: p.slot }); return false; }
  p.hp = Math.max(0, p.hp - dmg); p.hits++; p.flash = 0.25;
  p.stun = Math.max(p.stun, kind === 'kick' ? 0.3 : kind === 'ball' ? 0.7 : 0.42);
  if (kind === 'kick') p.inv = 0.7;
  let dx = p.x - fx0, dy = p.y - fy0, d = hyp(dx, dy);
  if (d < 0.01) { const a = w.rng() * Math.PI * 2; dx = Math.cos(a); dy = Math.sin(a); d = 1; }
  p.kx = dx / d * kb; p.ky = dy / d * kb; p.vx *= 0.2; p.vy *= 0.2;
  if (p.z <= 0.01) p.vz = Math.max(p.vz, kb > 9 ? 5 : 3);
  if (p.hold) dropHeld(w, p);
  if (p.item && kind !== 'shield') { p.item = null; fx(w, { k: 'lose', x: r2(p.x), y: r2(p.y), s: p.slot }); }
  fx(w, { k: 'hit', x: r2(p.x), y: r2(p.y), s: p.slot, d: dmg, big: dmg >= 20 ? 1 : 0 });
  if (p.hp <= 0) eliminate(w, p, 'hp');
  return true;
}

function eliminate(w, p, why) {
  if (p.out) return;
  p.out = true; p.why = why; p.outSeq = ++w.deaths; p.stun = 0; p.shield = 0;
  if (p.hold) dropHeld(w, p);
  p.item = null;
  if (why === 'hole') { p.fall = 1; p.kx = p.ky = p.vx = p.vy = 0; }
  fx(w, { k: why === 'hole' ? 'fall' : 'out', x: r2(p.x), y: r2(p.y), s: p.slot });
}

function crateById(w, id) { for (const c of w.crates) if (c.id === id && !c.dead) return c; return null; }

function dropHeld(w, p) {
  const c = crateById(w, p.hold); p.hold = null;
  if (!c) return;
  c.st = 'g'; c.owner = -1; c.vx = c.vy = 0; c.vz = 0;
  c.x = clamp(p.x + Math.cos(p.dir) * 0.3, CR, W - CR); c.y = clamp(p.y + Math.sin(p.dir) * 0.3, CR, D - CR);
}

// caixa quebra (madeira, fruta, roxa); TNT/Nitro explodem
function smash(w, c, by) {
  if (c.dead) return;
  if (c.k === 't' || c.k === 'n') { explode(w, c); return; }
  c.dead = true;
  if (c.st === 'h') { const h = w.players.find(p => p.hold === c.id); if (h) h.hold = null; }
  fx(w, { k: 'break', x: r2(c.x), y: r2(c.y), z: r2(c.z), c: c.k });
  if (c.k === 'f') {
    for (let i = 0; i < 3; i++) {
      const a = w.rng() * Math.PI * 2, v = 1.5 + w.rng() * 2;
      w.fruits.push({ id: w.nextId++, x: c.x, y: c.y, z: Math.max(0.3, c.z), vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: 4 + w.rng() * 2, life: 9 });
    }
  }
  if (c.k === 'i' && by && !by.out && !by.item) giveItem(w, by);
}

// TNT/Nitro: alguém mexeu (chute, caixa, pulo em cima)
function trigger(w, c, by) {
  if (c.dead) return;
  if (c.k === 'n') explode(w, c);
  else if (c.k === 't') { if (!c.fuse) { c.fuse = FUSE; fx(w, { k: 'lit', x: r2(c.x), y: r2(c.y) }); } }
  else smash(w, c, by);
}

function explode(w, c) {
  if (c.dead) return;
  c.dead = true;
  const nitro = c.k === 'n', R = nitro ? NITRO_R : TNT_R, dmg = nitro ? DMG.nitro : DMG.tnt;
  if (c.st === 'h') { const h = w.players.find(p => p.hold === c.id); if (h) h.hold = null; }
  fx(w, { k: 'boom', x: r2(c.x), y: r2(c.y), r: R, n: nitro ? 1 : 0 });
  for (const p of w.players) {
    if (p.out) continue;
    const d = hyp(p.x - c.x, p.y - c.y, Math.max(0, Math.abs(p.z - c.z) - 1.2) * 0.6);   // quem segura leva tudo
    if (d < R + PR) hurt(w, p, Math.round(dmg * (1 - 0.4 * clamp(d / R, 0, 1))), c.x, c.y, 11, nitro ? 'nitro' : 'tnt');
  }
  for (const o of w.crates) {
    if (o.dead || o === c || o.st === 'd') continue;
    if (hyp(o.x - c.x, o.y - c.y) > R) continue;
    if (o.k === 't' || o.k === 'n') { if (!o.fuse || o.fuse > 0.15) o.fuse = o.k === 'n' ? 0.08 : 0.15; }
    else smash(w, o, null);
  }
  if (w.penguin && hyp(w.penguin.x - c.x, w.penguin.y - c.y) < R + 0.6) dizzy(w, w.penguin);
  if (w.level === 'space' && c.st !== 'h' && c.z < 1.5) {
    const hr = nitro ? 0.85 : 1;
    const x = clamp(c.x, hr + 0.15, W - hr - 0.15), y = clamp(c.y, hr + 0.15, D - hr - 0.15);
    w.holes.push({ id: w.nextId++, x, y, r: hr });
  }
}

function giveItem(w, p) {
  const k = ITEMS[Math.floor(w.rng() * ITEMS.length)];
  p.item = { k, n: ITEM_N[k] };
  fx(w, { k: 'item', x: r2(p.x), y: r2(p.y), s: p.slot, it: k });
}

// ---------- ações ----------
function tryPick(w, p) {
  let best = null, bs = 1e9;
  const fx0 = Math.cos(p.dir), fy0 = Math.sin(p.dir);
  for (const c of w.crates) {
    if (c.dead || c.st !== 'g' || c.z > 0.5 || c.k === 'n') continue;
    const dx = c.x - p.x, dy = c.y - p.y, d = hyp(dx, dy);
    if (d > PR + CR + 0.45) continue;
    const s = d - 0.35 * (dx * fx0 + dy * fy0) / Math.max(0.01, d);
    if (s < bs) { bs = s; best = c; }
  }
  if (!best) return false;
  if (best.k === 'i') {
    best.dead = true; fx(w, { k: 'break', x: r2(best.x), y: r2(best.y), z: 0, c: 'i' });
    if (!p.item) giveItem(w, p);
    return true;
  }
  best.st = 'h'; best.owner = p.slot; p.hold = best.id;
  if (best.k === 't' && !best.fuse) { best.fuse = FUSE; fx(w, { k: 'lit', x: r2(best.x), y: r2(best.y) }); }
  fx(w, { k: 'pick', x: r2(p.x), y: r2(p.y), s: p.slot });
  return true;
}

function throwCrate(w, p, ix, iy, mag) {
  const c = crateById(w, p.hold); p.hold = null;
  if (!c) return;
  const a = mag > 0.3 ? Math.atan2(iy, ix) : p.dir;
  p.dir = a;
  const cx = Math.cos(a), cy = Math.sin(a);
  c.st = 'f'; c.owner = p.slot; c.age = 0;
  c.x = clamp(p.x + cx * 0.45, CR, W - CR); c.y = clamp(p.y + cy * 0.45, CR, D - CR); c.z = p.z + 0.95;
  c.vx = cx * THROW_V + p.vx * 0.25; c.vy = cy * THROW_V + p.vy * 0.25; c.vz = THROW_VZ;
  fx(w, { k: 'throw', x: r2(p.x), y: r2(p.y), s: p.slot });
}

function kick(w, p) {
  p.kick = 0.28; p.kickCd = 0.5;
  fx(w, { k: 'kick', x: r2(p.x), y: r2(p.y), s: p.slot });
  for (const o of w.players) {
    if (o === p || o.out) continue;
    if (hyp(o.x - p.x, o.y - p.y) < 1.3 && Math.abs(o.z - p.z) < 0.9) hurt(w, o, DMG.kick, p.x, p.y, 7, 'kick');
  }
  const fx0 = Math.cos(p.dir), fy0 = Math.sin(p.dir);
  for (const c of w.crates) {
    if (c.dead || c.st !== 'g' || c.z > 0.6) continue;
    const dx = c.x - p.x, dy = c.y - p.y, d = hyp(dx, dy);
    if (d > PR + CR + 0.5) continue;
    if (c.k === 'n') { explode(w, c); continue; }
    if (c.k === 'i') { smash(w, c, p); continue; }
    // na frente: sai na direção do olhar; do lado: sai para longe do boneco
    let ux = dx / Math.max(0.01, d), uy = dy / Math.max(0.01, d);
    if (ux * fx0 + uy * fy0 > 0.35) { ux = fx0; uy = fy0; }
    c.st = 's'; c.owner = p.slot; c.age = 0; c.vx = ux * KICK_V; c.vy = uy * KICK_V;
    if (c.k === 't' && !c.fuse) { c.fuse = FUSE; fx(w, { k: 'lit', x: r2(c.x), y: r2(c.y) }); }
  }
  const pg = w.penguin;
  if (pg && hyp(pg.x - p.x, pg.y - p.y) < 1.4 && (pg.st === 'sleep')) { pg.st = 'wake'; pg.t = 0.6; }
}

function useItem(w, p) {
  const it = p.item; if (!it || p.kickCd > 0) return;
  p.kickCd = 0.4;
  if (it.k === 'ball') {
    w.shots.push({ id: w.nextId++, k: 'b', x: p.x + Math.cos(p.dir) * 0.5, y: p.y + Math.sin(p.dir) * 0.5, z: 0.6, dir: p.dir, v: 8, life: 3, owner: p.slot });
    fx(w, { k: 'zap', x: r2(p.x), y: r2(p.y), s: p.slot });
  } else if (it.k === 'missile') {
    for (let i = 0; i < 8; i++) {
      const a = p.dir + i * Math.PI / 4;
      w.shots.push({ id: w.nextId++, k: 'm', x: p.x + Math.cos(a) * 0.5, y: p.y + Math.sin(a) * 0.5, z: 0.6, dir: a, v: 10, life: 1.2, owner: p.slot });
    }
    fx(w, { k: 'launch', x: r2(p.x), y: r2(p.y), s: p.slot });
  } else if (it.k === 'shield') {
    p.shield = 5;
    fx(w, { k: 'shield', x: r2(p.x), y: r2(p.y), s: p.slot });
  }
  it.n--;
  if (it.n <= 0) p.item = null;
}

// ---------- passo ----------
function step(w, inputs, dt) {
  w.time += dt;
  if (!w.result) w.clock = Math.max(0, w.clock - dt);
  for (const p of w.players) stepPlayer(w, p, (inputs && inputs[p.slot]) || {}, dt);
  playersVsPlayers(w);
  stepCrates(w, dt);
  stepShots(w, dt);
  if (w.penguin) stepPenguin(w, w.penguin, dt);
  stepFruits(w, dt);
  spawner(w, dt);
  w.crates = w.crates.filter(c => !c.dead);
  checkEnd(w);
}

function stepPlayer(w, p, inp, dt) {
  if (p.out) {
    if (p.fall > 0) { p.fall = Math.max(0, p.fall - dt); p.z = -(1 - p.fall) * (1 - p.fall) * 5; }
    return;
  }
  p.stun = Math.max(0, p.stun - dt); p.inv = Math.max(0, p.inv - dt); p.kickCd = Math.max(0, p.kickCd - dt);
  p.kick = Math.max(0, p.kick - dt); p.flash = Math.max(0, p.flash - dt); p.shield = Math.max(0, p.shield - dt);
  p.touchCd = Math.max(0, p.touchCd - dt); p.pgCd = Math.max(0, p.pgCd - dt);
  let ix = +inp.x || 0, iy = +inp.y || 0, mag = hyp(ix, iy);
  if (mag > 1) { ix /= mag; iy /= mag; mag = 1; }
  if (mag < 0.12) { ix = iy = 0; mag = 0; }
  const can = p.stun <= 0;
  if (can && mag > 0.2) p.dir = Math.atan2(iy, ix);
  const sp = p.hold ? CARRY : RUN, ice = w.level === 'snow';
  const tx = can ? ix * sp : 0, ty = can ? iy * sp : 0;
  const acc = ice ? (p.z > 0 ? 1.2 : 3.2) : (p.z > 0 ? 14 : 38);
  const k = Math.min(1, acc * dt);
  p.vx += (tx - p.vx) * k; p.vy += (ty - p.vy) * k;
  const fr = Math.exp(-(ice ? 1.6 : 7) * dt);
  p.kx *= fr; p.ky *= fr;
  if (Math.abs(p.kx) < 0.05) p.kx = 0; if (Math.abs(p.ky) < 0.05) p.ky = 0;
  p.x += (p.vx + p.kx) * dt; p.y += (p.vy + p.ky) * dt;
  // paredes
  if (p.x < PR) { p.x = PR; p.kx = Math.abs(p.kx) * 0.3; if (p.vx < 0 && ice) p.vx *= -0.3; }
  if (p.x > W - PR) { p.x = W - PR; p.kx = -Math.abs(p.kx) * 0.3; if (p.vx > 0 && ice) p.vx *= -0.3; }
  if (p.y < PR) { p.y = PR; p.ky = Math.abs(p.ky) * 0.3; if (p.vy < 0 && ice) p.vy *= -0.3; }
  if (p.y > D - PR) { p.y = D - PR; p.ky = -Math.abs(p.ky) * 0.3; if (p.vy > 0 && ice) p.vy *= -0.3; }
  // pulo
  if (can && inp.bp && p.z <= 0 && p.vz <= 0) { p.vz = JUMP_V; fx(w, { k: 'jump', x: r2(p.x), y: r2(p.y), s: p.slot }); }
  if (p.z > 0 || p.vz > 0) {
    p.vz -= GRAV * dt; p.z += p.vz * dt;
    if (p.z <= 0) { p.z = 0; p.vz = 0; }
  }
  // botões
  if (can && inp.ap) { if (p.hold) throwCrate(w, p, ix, iy, mag); else tryPick(w, p); }
  if (can && inp.cp) { if (p.item) useItem(w, p); else if (!p.hold && p.kickCd <= 0) kick(w, p); }
  // caixas no chão são sólidas; Nitro explode ao toque; pular em cima da TNT acende
  for (const c of w.crates) {
    if (c.dead || c.st !== 'g' || c.z > 0.5) continue;
    const qx = clamp(p.x, c.x - CR, c.x + CR), qy = clamp(p.y, c.y - CR, c.y + CR);
    let dx = p.x - qx, dy = p.y - qy, d = hyp(dx, dy);
    if (d >= PR) continue;
    if (c.k === 'n' && p.z < 1) { explode(w, c); continue; }
    if (p.z >= 0.55) {
      if (p.vz <= 0) { p.vz = JUMP_V * 0.7; if (c.k === 't') trigger(w, c, p); fx(w, { k: 'bounce', x: r2(c.x), y: r2(c.y) }); }
      continue;
    }
    if (d < 0.001) {   // centro dentro da caixa: sai pelo lado mais perto
      const ox = p.x - c.x, oy = p.y - c.y;
      if (Math.abs(ox) > Math.abs(oy)) { dx = Math.sign(ox) || 1; dy = 0; } else { dx = 0; dy = Math.sign(oy) || 1; }
      p.x = c.x + dx * (CR + PR); p.y = c.y + dy * (CR + PR);
    } else { p.x = qx + dx / d * PR; p.y = qy + dy / d * PR; }
  }
  // buraco (Space Bash): de pé com o centro sobre o buraco, cai
  if (p.z <= 0.02 && w.holes.length && inHole(w, p.x, p.y, -0.15)) eliminate(w, p, 'hole');
}

function playersVsPlayers(w) {
  const ps = w.players;
  for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
    const a = ps[i], b = ps[j];
    if (a.out || b.out || Math.abs(a.z - b.z) > 0.9) continue;
    const dx = b.x - a.x, dy = b.y - a.y, d = hyp(dx, dy);
    if (d >= PR * 2 + (a.shield || b.shield ? 0.3 : 0) || d < 0.0001) continue;
    // escudo: quem encosta leva dano
    if (a.shield > 0 && !b.shield && b.touchCd <= 0) { b.touchCd = 0.6; hurt(w, b, DMG.shield, a.x, a.y, 9, 'shield'); }
    if (b.shield > 0 && !a.shield && a.touchCd <= 0) { a.touchCd = 0.6; hurt(w, a, DMG.shield, b.x, b.y, 9, 'shield'); }
    if (d >= PR * 2) continue;
    const push = (PR * 2 - d) / 2, ux = dx / d, uy = dy / d;
    a.x -= ux * push; a.y -= uy * push; b.x += ux * push; b.y += uy * push;
  }
}

function hitPlayers(w, c, z0, z1, ignoreOwner) {
  for (const p of w.players) {
    if (p.out || (ignoreOwner && p.slot === c.owner)) continue;
    if (hyp(p.x - c.x, p.y - c.y) > PR + CR) continue;
    if (z0 > p.z + 1.3 || z1 < p.z + 0.15) continue;
    return p;
  }
  return null;
}

function hitGroundCrate(w, c) {
  for (const o of w.crates) {
    if (o === c || o.dead || o.st !== 'g' || o.z > 0.5) continue;
    if (Math.abs(o.x - c.x) < CR * 2 && Math.abs(o.y - c.y) < CR * 2) return o;
  }
  return null;
}

function stepCrates(w, dt) {
  const ice = w.level === 'snow';
  for (const c of w.crates) {
    if (c.dead) continue;
    c.age += dt;
    if (c.fuse > 0) {
      c.fuse -= dt;
      if (c.fuse <= 0) { c.fuse = 0.0001; explode(w, c); continue; }
    }
    if (c.st === 'd') {
      c.dropT -= dt;
      c.z = DROP_H * Math.pow(Math.max(0, c.dropT) / DROP_T, 2);
      if (c.dropT <= 0) {
        c.z = 0; c.st = 'g';
        fx(w, { k: 'land', x: r2(c.x), y: r2(c.y) });
        if (inHole(w, c.x, c.y, 0)) { c.dead = true; fx(w, { k: 'sink', x: r2(c.x), y: r2(c.y) }); continue; }
        let hitSomeone = false;
        for (const p of w.players) {
          if (p.out || hyp(p.x - c.x, p.y - c.y) > PR + CR || p.z > 1.2) continue;
          hurt(w, p, DMG.drop, c.x, c.y, 6, 'drop'); hitSomeone = true;
        }
        const under = hitGroundCrate(w, c);
        if (hitSomeone || under) {
          if (under) trigger(w, under, null);
          if (c.k === 'n') explode(w, c);
          else if (c.k === 't') trigger(w, c, null);
          else smash(w, c, null);
        }
      }
      continue;
    }
    if (c.st === 'h') {
      const h = w.players.find(p => p.hold === c.id);
      if (!h || h.out) { c.st = 'g'; c.owner = -1; continue; }
      c.x = h.x; c.y = h.y; c.z = h.z + 1.05;
      continue;
    }
    if (c.st === 'f') {
      c.vz -= GC * dt;
      const oz = c.z;
      c.x += c.vx * dt; c.y += c.vy * dt; c.z += c.vz * dt;
      const p = hitPlayers(w, c, Math.min(oz, c.z), Math.max(oz, c.z) + 0.8, true);
      if (p) {
        if (c.k === 't') { explode(w, c); continue; }
        hurt(w, p, DMG.throw, c.x - c.vx * 0.05, c.y - c.vy * 0.05, 10, 'throw');
        smash(w, c, w.players.find(q => q.slot === c.owner)); continue;
      }
      const pg = w.penguin;
      if (pg && c.z < 1.3 && hyp(pg.x - c.x, pg.y - c.y) < 0.6 + CR) { dizzy(w, pg); if (c.k === 't') explode(w, c); else smash(w, c, null); continue; }
      if (c.z < 0.75) {
        const o = hitGroundCrate(w, c);
        if (o) { trigger(w, o, null); if (c.k === 't') explode(w, c); else smash(w, c, null); continue; }
      }
      let wall = false;
      if (c.x < CR) { c.x = CR; c.vx = Math.abs(c.vx) * 0.4; wall = true; }
      if (c.x > W - CR) { c.x = W - CR; c.vx = -Math.abs(c.vx) * 0.4; wall = true; }
      if (c.y < CR) { c.y = CR; c.vy = Math.abs(c.vy) * 0.4; wall = true; }
      if (c.y > D - CR) { c.y = D - CR; c.vy = -Math.abs(c.vy) * 0.4; wall = true; }
      if (wall && c.k !== 't') { smash(w, c, null); continue; }
      if (c.z <= 0) {
        c.z = 0;
        if (inHole(w, c.x, c.y, 0)) { c.dead = true; fx(w, { k: 'sink', x: r2(c.x), y: r2(c.y) }); continue; }
        if (c.k === 't') { c.st = 's'; c.vx *= 0.4; c.vy *= 0.4; c.vz = 0; fx(w, { k: 'land', x: r2(c.x), y: r2(c.y) }); }
        else smash(w, c, null);
      }
      continue;
    }
    if (c.st === 's') {
      c.x += c.vx * dt; c.y += c.vy * dt;
      const f = Math.exp(-(ice ? 0.35 : 1.1) * dt); c.vx *= f; c.vy *= f;
      const p = hitPlayers(w, c, 0, 0.8, c.age < 0.3);
      if (p) {
        if (c.k === 't') { explode(w, c); continue; }
        hurt(w, p, DMG.slide, c.x - c.vx * 0.05, c.y - c.vy * 0.05, 8, 'slide');
        smash(w, c, null); continue;
      }
      const pg = w.penguin;
      if (pg && hyp(pg.x - c.x, pg.y - c.y) < 0.6 + CR) { dizzy(w, pg); if (c.k === 't') explode(w, c); else smash(w, c, null); continue; }
      const o = hitGroundCrate(w, c);
      if (o) { trigger(w, o, null); if (c.k === 't') { c.vx *= -0.4; c.vy *= -0.4; } else { smash(w, c, null); continue; } }
      let wall = false;
      if (c.x < CR) { c.x = CR; c.vx = Math.abs(c.vx) * 0.5; wall = true; }
      if (c.x > W - CR) { c.x = W - CR; c.vx = -Math.abs(c.vx) * 0.5; wall = true; }
      if (c.y < CR) { c.y = CR; c.vy = Math.abs(c.vy) * 0.5; wall = true; }
      if (c.y > D - CR) { c.y = D - CR; c.vy = -Math.abs(c.vy) * 0.5; wall = true; }
      if (wall && c.k !== 't') { smash(w, c, null); continue; }
      if (inHole(w, c.x, c.y, 0)) { c.dead = true; fx(w, { k: 'sink', x: r2(c.x), y: r2(c.y) }); continue; }
      if (hyp(c.vx, c.vy) < 1.2) { c.st = 'g'; c.vx = c.vy = 0; c.owner = -1; }
      continue;
    }
    if (c.st === 'g') {
      if (c.z > 0) { c.vz -= GC * dt; c.z = Math.max(0, c.z + c.vz * dt); if (!c.z) c.vz = 0; }
      if (c.z <= 0 && w.holes.length && inHole(w, c.x, c.y, -0.1)) { c.dead = true; fx(w, { k: 'sink', x: r2(c.x), y: r2(c.y) }); }
    }
  }
}

function stepShots(w, dt) {
  for (const s of w.shots) {
    s.life -= dt;
    if (s.k === 'b') {
      // bola elétrica: persegue o rival mais perto
      let best = null, bd = 1e9;
      for (const p of w.players) { if (p.out || p.slot === s.owner) continue; const d = hyp(p.x - s.x, p.y - s.y); if (d < bd) { bd = d; best = p; } }
      if (best) {
        let da = Math.atan2(best.y - s.y, best.x - s.x) - s.dir;
        while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
        s.dir += clamp(da, -2.6 * dt, 2.6 * dt);
      }
    }
    s.x += Math.cos(s.dir) * s.v * dt; s.y += Math.sin(s.dir) * s.v * dt;
    if (s.x < 0.2 || s.x > W - 0.2 || s.y < 0.2 || s.y > D - 0.2 || s.life <= 0) { s.life = -1; fx(w, { k: 'pfft', x: r2(clamp(s.x, 0, W)), y: r2(clamp(s.y, 0, D)), m: s.k === 'm' ? 1 : 0 }); continue; }
    let hit = false;
    for (const p of w.players) {
      if (p.out || p.slot === s.owner || p.z > 1.1) continue;
      if (hyp(p.x - s.x, p.y - s.y) < PR + 0.3) {
        hurt(w, p, s.k === 'b' ? DMG.ball : DMG.missile, s.x - Math.cos(s.dir), s.y - Math.sin(s.dir), s.k === 'b' ? 5 : 10, s.k === 'b' ? 'ball' : 'missile');
        hit = true; break;
      }
    }
    if (!hit) {
      for (const c of w.crates) {
        if (c.dead || c.st !== 'g' || c.z > 0.5) continue;
        if (Math.abs(c.x - s.x) < CR + 0.2 && Math.abs(c.y - s.y) < CR + 0.2) { trigger(w, c, null); hit = true; break; }
      }
    }
    if (hit) { s.life = -1; fx(w, { k: 'pfft', x: r2(s.x), y: r2(s.y), m: s.k === 'm' ? 1 : 0, big: 1 }); }
  }
  w.shots = w.shots.filter(s => s.life > 0);
}

// ---------- pinguim (Snow Bash) ----------
const PG_R = 0.6, PG_RX = 5.4, PG_RY = 3.5;
function dizzy(w, pg) {
  if (pg.st === 'dizzy') return;
  pg.st = 'dizzy'; pg.t = 3; pg.vx *= 0.3; pg.vy *= 0.3;
  fx(w, { k: 'dizzy', x: r2(pg.x), y: r2(pg.y) });
}
function stepPenguin(w, pg, dt) {
  const cx = W / 2, cy = D / 2;
  pg.t -= dt;
  let tx = pg.x, ty = pg.y;
  if (pg.st === 'sleep') { if (pg.t <= 0) { pg.st = 'wake'; pg.t = 0.9; fx(w, { k: 'wake', x: r2(pg.x), y: r2(pg.y) }); } }
  else if (pg.st === 'wake') {
    if (pg.t <= 0) { pg.st = 'run'; pg.t = 7 + w.rng() * 3; pg.run = 0; pg.ang = Math.atan2(pg.y - cy, pg.x - cx) || w.rng() * 6.28; pg.sign = w.rng() < 0.5 ? 1 : -1; }
  } else if (pg.st === 'run' || pg.st === 'slow') {
    pg.run += dt;
    if (pg.st === 'run') { pg.rad = Math.min(1, pg.rad + dt / 1.2); pg.ang += pg.sign * 1.35 * dt; if (pg.t <= 0) { pg.st = 'slow'; pg.t = 1.8; } }
    else { pg.rad = Math.max(0, pg.rad - dt / 1.8); pg.ang += pg.sign * 1.35 * dt * Math.max(0.3, pg.t / 1.8); if (pg.t <= 0) { pg.st = 'sleep'; pg.t = 3.5 + w.rng() * 2.5; pg.rad = 0; } }
    tx = cx + Math.cos(pg.ang) * PG_RX * pg.rad; ty = cy + Math.sin(pg.ang) * PG_RY * pg.rad;
  } else if (pg.st === 'dizzy') {
    if (pg.t <= 0) { pg.st = 'home'; }
  } else if (pg.st === 'home') {
    const d = hyp(cx - pg.x, cy - pg.y);
    if (d < 0.2) { pg.st = 'sleep'; pg.t = 3 + w.rng() * 2; pg.rad = 0; }
    else { const v = Math.min(d, 3 * dt); tx = pg.x + (cx - pg.x) / d * v; ty = pg.y + (cy - pg.y) / d * v; }
  }
  if (pg.st === 'dizzy') { pg.x += pg.vx * dt; pg.y += pg.vy * dt; pg.vx *= Math.exp(-2 * dt); pg.vy *= Math.exp(-2 * dt); }
  else { pg.vx = (tx - pg.x) / dt; pg.vy = (ty - pg.y) / dt; pg.x = tx; pg.y = ty; }
  pg.x = clamp(pg.x, PG_R, W - PG_R); pg.y = clamp(pg.y, PG_R, D - PG_R);
  if (hyp(pg.vx, pg.vy) > 0.5) pg.dir = Math.atan2(pg.vy, pg.vx);
  const moving = pg.st === 'run' || pg.st === 'slow';
  for (const p of w.players) {
    if (p.out || p.z > 0.9) continue;
    const dx = p.x - pg.x, dy = p.y - pg.y, d = hyp(dx, dy);
    if (d >= PG_R + PR || d < 0.0001) continue;
    if (moving && hyp(pg.vx, pg.vy) > 2 && p.pgCd <= 0) { p.pgCd = 1; hurt(w, p, DMG.peng, pg.x, pg.y, 13, 'peng'); }
    const push = PG_R + PR - d; p.x += dx / d * push; p.y += dy / d * push;
  }
  if (moving) for (const c of w.crates) {
    if (c.dead || c.st !== 'g' || c.z > 0.5) continue;
    if (hyp(c.x - pg.x, c.y - pg.y) < PG_R + CR) trigger(w, c, null);
  }
}

function stepFruits(w, dt) {
  for (const f of w.fruits) {
    f.life -= dt;
    if (f.z > 0 || f.vz > 0) {
      f.vz -= GRAV * dt; f.z += f.vz * dt; f.x += f.vx * dt; f.y += f.vy * dt;
      if (f.z <= 0) { f.z = 0; f.vz = 0; f.vx = f.vy = 0; }
      f.x = clamp(f.x, 0.4, W - 0.4); f.y = clamp(f.y, 0.4, D - 0.4);
    }
    if (f.z <= 0 && inHole(w, f.x, f.y, 0)) { f.life = -1; continue; }
    for (const p of w.players) {
      if (p.out || p.hp >= HP || f.life <= 0) continue;
      if (hyp(p.x - f.x, p.y - f.y) < PR + 0.35 && p.z < 1) {
        p.hp = Math.min(HP, p.hp + FRUIT); f.life = -1;
        fx(w, { k: 'fruit', x: r2(f.x), y: r2(f.y), s: p.slot });
      }
    }
  }
  w.fruits = w.fruits.filter(f => f.life > 0);
}

function spawner(w, dt) {
  if (w.result) return;
  w.spawnT -= dt;
  if (w.spawnT > 0) return;
  w.spawnT = 0.45 + w.rng() * 0.8;
  const live = w.crates.filter(c => !c.dead).length;
  if (live >= FIELD[w.level]) return;
  const pos = freeSpot(w, 0);
  if (!pos) return;
  const c = newCrate(w, pickKind(w), pos[0], pos[1], 'd');
  w.crates.push(c);
  fx(w, { k: 'warn', x: r2(c.x), y: r2(c.y) });
}

function checkEnd(w) {
  if (w.result) return;
  const alive = w.players.filter(p => !p.out);
  const deadOrder = w.players.filter(p => p.out).sort((a, b) => b.outSeq - a.outSeq).map(p => p.slot);
  if ((w.players.length > 1 && alive.length <= 1) || alive.length === 0) {
    w.result = { winners: alive.map(p => p.slot), order: alive.map(p => p.slot).concat(deadOrder) };
    return;
  }
  if (w.clock <= 0) {
    const top = Math.max(...alive.map(p => p.hp));
    const sorted = alive.slice().sort((a, b) => b.hp - a.hp);
    w.result = { winners: alive.filter(p => p.hp === top).map(p => p.slot), order: sorted.map(p => p.slot).concat(deadOrder), time: true };
  }
}

// ---------- CPU ----------
// grade de 0,5 para achar caminho em volta dos buracos (Space Bash)
const NC = 0.5, NX = W / NC, NY = D / NC;
function navGrid(w) {
  if (w._nav && w._nav.n === w.holes.length) return w._nav.g;
  const g = new Uint8Array(NX * NY);
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
    const x = (i + 0.5) * NC, y = (j + 0.5) * NC;
    if (inHole(w, x, y, PR + 0.05)) g[j * NX + i] = 1;
  }
  w._nav = { n: w.holes.length, g };
  return g;
}
const cellOf = (x, y) => clamp(Math.floor(y / NC), 0, NY - 1) * NX + clamp(Math.floor(x / NC), 0, NX - 1);
function navDir(w, p, m, tx, ty) {
  m.navT = (m.navT || 0) - 1 / 60;
  if (m.navT > 0 && m.nav && hyp(m.nav[2] - tx, m.nav[3] - ty) < 0.8 && hyp(m.nav[0] - p.x, m.nav[1] - p.y) > 0.25) {
    const d = hyp(m.nav[0] - p.x, m.nav[1] - p.y); return [(m.nav[0] - p.x) / d, (m.nav[1] - p.y) / d];
  }
  m.navT = 0.25;
  const g = navGrid(w), goal = cellOf(tx, ty), start = cellOf(p.x, p.y);
  const dist = new Int16Array(NX * NY).fill(-1), q = [goal];
  dist[goal] = 0;
  for (let h = 0; h < q.length; h++) {
    const c = q[h], ci = c % NX, cj = (c - ci) / NX;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      if (!di && !dj) continue;
      const ni = ci + di, nj = cj + dj;
      if (ni < 0 || nj < 0 || ni >= NX || nj >= NY) continue;
      const n = nj * NX + ni;
      if (dist[n] >= 0 || (g[n] && n !== start)) continue;
      if (di && dj && (g[cj * NX + ni] || g[nj * NX + ci])) continue;   // não corta quina de buraco
      dist[n] = dist[c] + 1; q.push(n);
    }
  }
  if (dist[start] < 0) { m.nav = null; return null; }
  // segue o caminho alguns passos à frente
  let c = start;
  for (let k = 0; k < 3 && dist[c] > 0; k++) {
    const ci = c % NX, cj = (c - ci) / NX; let best = c;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      const ni = ci + di, nj = cj + dj;
      if (ni < 0 || nj < 0 || ni >= NX || nj >= NY) continue;
      const n = nj * NX + ni;
      if (dist[n] >= 0 && dist[n] < dist[best]) best = n;
    }
    if (best === c) break;
    c = best;
  }
  if (c === start || dist[c] === 0) { m.nav = null; return null; }
  const wx = (c % NX + 0.5) * NC, wy = (Math.floor(c / NX) + 0.5) * NC, d = hyp(wx - p.x, wy - p.y) || 1;
  m.nav = [wx, wy, tx, ty];
  return [(wx - p.x) / d, (wy - p.y) / d];
}

const SK = [
  { react: 0.9, err: 0.45, lead: 0, dodge: 0.15, jump: false, speed: 0.7, think: 1, kick: 0.2, panic: 0.6, idle: 0.3, range: 5, look: 0.5 },
  { react: 0.5, err: 0.22, lead: 0.5, dodge: 0.65, jump: true, speed: 0.88, think: 0.5, kick: 0.45, panic: 1, idle: 0.08, range: 6, look: 0.8 },
  { react: 0.22, err: 0.08, lead: 1, dodge: 0.9, jump: true, speed: 1, think: 0.25, kick: 1, panic: 1.3, idle: 0, range: 6.4, look: 1 },
];

function makeBot(w, slot) {
  const p = w.players.find(q => q.slot === slot);
  if (p) p.bot = true;
  delete w.bots[slot];
}

function bot(w, slot, skill, dt) {
  const inp = { x: 0, y: 0, a: false, b: false, c: false, ap: false, bp: false, cp: false, ar: false, br: false, cr: false };
  const p = w.players.find(q => q.slot === slot);
  if (!p || p.out || w.result) return inp;
  const S = SK[clamp(skill | 0, 0, 2)];
  const m = w.bots[slot] || (w.bots[slot] = { think: 0, goal: null, aimT: 0, err: 0, dodge: {}, idle: 0, idleT: 2 + w.rng() * 3, wander: null, wanderT: 0 });
  const rnd = w.rng;
  m.think -= dt;
  if (Object.keys(m.dodge).length > 40) m.dodge = {};
  if (p.stun > 0) return inp;
  // CPU fácil às vezes fica parada pensando
  if (S.idle) {
    m.idleT -= dt;
    if (m.idleT <= 0) { m.idle = 0.4 + rnd() * 0.6; m.idleT = 2 + rnd() * 3 / S.idle * 0.3; }
    if (m.idle > 0) { m.idle -= dt; return inp; }
  }
  let gx = 0, gy = 0, ax = 0, ay = 0, gp = null;
  const foes = w.players.filter(q => q !== p && !q.out);
  if (!foes.length) return inp;

  // 1. perigos: caixas voando na minha direção, TNT acesa, Nitro, pinguim, buracos
  for (const c of w.crates) {
    if (c.dead) continue;
    if ((c.st === 'f' || c.st === 's') && c.owner !== slot) {
      const rx = p.x - c.x, ry = p.y - c.y, v2 = c.vx * c.vx + c.vy * c.vy;
      if (v2 < 1) continue;
      const t = clamp((rx * c.vx + ry * c.vy) / v2, 0, 1.2);
      const cx = c.x + c.vx * t - p.x, cy = c.y + c.vy * t - p.y, miss = hyp(cx, cy);
      if (miss > 1.15 || t <= 0 || t > 0.85) continue;
      if (m.dodge[c.id] === undefined) m.dodge[c.id] = rnd() < S.dodge;
      if (!m.dodge[c.id]) continue;
      const zAt = c.st === 's' ? 0 : c.z + c.vz * t - GC * t * t / 2;
      if (S.jump && t < 0.24 && zAt < 0.55 && p.z <= 0) inp.bp = true;
      // sai para o lado (perpendicular ao voo, para o lado em que já estou)
      const vl = Math.sqrt(v2), nx = -c.vy / vl, ny = c.vx / vl, side = (rx * nx + ry * ny) >= 0 ? 1 : -1;
      ax += nx * side * 4; ay += ny * side * 4;
    }
    if (c.k === 't' && c.fuse > 0 && c.st !== 'h') {
      const d = hyp(p.x - c.x, p.y - c.y);
      if (d < TNT_R + 1 && c.fuse < 2.2) { ax += (p.x - c.x) / Math.max(0.3, d) * (TNT_R + 1.2 - d) * 1.6; ay += (p.y - c.y) / Math.max(0.3, d) * (TNT_R + 1.2 - d) * 1.6; }
    }
    if (c.k === 't' && c.fuse > 0 && c.st === 'h' && p.hold !== c.id) {
      const d = hyp(p.x - c.x, p.y - c.y);
      if (d < 3) { ax += (p.x - c.x) / Math.max(0.3, d) * 1.2; ay += (p.y - c.y) / Math.max(0.3, d) * 1.2; }
    }
    if (c.k === 'n') {
      const d = hyp(p.x - c.x, p.y - c.y);
      if (d < 1.7) { ax += (p.x - c.x) / Math.max(0.2, d) * (1.8 - d) * 3; ay += (p.y - c.y) / Math.max(0.2, d) * (1.8 - d) * 3; }
    }
    if (c.st === 'd' && c.dropT < 0.8) {
      const d = hyp(p.x - c.x, p.y - c.y);
      if (d < 1.1) { ax += (p.x - c.x) / Math.max(0.2, d) * 2; ay += (p.y - c.y) / Math.max(0.2, d) * 2; }
    }
  }
  const pg = w.penguin;
  if (pg && (pg.st === 'run' || pg.st === 'slow' || pg.st === 'wake')) {
    const d = hyp(p.x - pg.x, p.y - pg.y);
    if (d < 3.4) {
      const k = (3.6 - d) * 1.6 * S.look;
      ax += (p.x - pg.x) / Math.max(0.3, d) * k; ay += (p.y - pg.y) / Math.max(0.3, d) * k;
      if (S.jump && d < 1.4 && p.z <= 0 && rnd() < 0.15) inp.bp = true;
    }
  }
  for (const s of w.shots) {
    if (s.owner === slot) continue;
    const d = hyp(p.x - s.x, p.y - s.y);
    if (d < 2.5 && rnd() < S.dodge) { const nx = -Math.sin(s.dir), ny = Math.cos(s.dir), side = ((p.x - s.x) * nx + (p.y - s.y) * ny) >= 0 ? 1 : -1; ax += nx * side * 3; ay += ny * side * 3; }
  }

  // 2. objetivo
  const near = foes.slice().sort((a, b) => hyp(a.x - p.x, a.y - p.y) - hyp(b.x - p.x, b.y - p.y));
  let tgt = near[0];
  if (skill >= 2) { const weak = foes.filter(q => hyp(q.x - p.x, q.y - p.y) < 7).sort((a, b) => a.hp - b.hp)[0]; if (weak) tgt = weak; }
  const td = hyp(tgt.x - p.x, tgt.y - p.y);
  if (p.hold) {
    const c = crateById(w, p.hold);
    // mira: na frente do alvo, conforme a habilidade
    const tt = td / THROW_V * S.lead;
    const aimX = tgt.x + (tgt.vx + tgt.kx) * tt, aimY = tgt.y + (tgt.vy + tgt.ky) * tt;
    const ang = Math.atan2(aimY - p.y, aimX - p.x) + m.err;
    const hot = c && c.k === 't' && c.fuse > 0 && c.fuse < S.panic;
    if (td <= S.range || hot) {
      m.aimT += dt;
      // chega um pouco mais perto enquanto mira
      // guarda distância: de perto o outro nem tem como desviar, e a CPU fica justa
      if (td > 4.5) { gx += (tgt.x - p.x) / td * 0.5; gy += (tgt.y - p.y) / td * 0.5; gp = tgt; }
      else if (td < 3.4 && !hot) { gx -= (tgt.x - p.x) / td; gy -= (tgt.y - p.y) / td; if (td < 2.6 && skill >= 1) m.aimT -= dt; }
      if (m.aimT >= S.react || hot) {
        inp.x = Math.cos(ang); inp.y = Math.sin(ang); inp.ap = true; inp.a = true;
        m.aimT = 0; m.err = (rnd() * 2 - 1) * S.err * (0.6 + td / 6);
        return inp;
      }
    } else {
      m.aimT = 0; gx += (tgt.x - p.x) / td; gy += (tgt.y - p.y) / td; gp = tgt;
      // presa atrás de buracos: joga assim mesmo
      if (m.stuck > 1 && td < 9) { inp.x = (tgt.x - p.x) / td; inp.y = (tgt.y - p.y) / td; inp.ap = inp.a = true; m.stuck = 0; return inp; }
    }
  } else if (p.item) {
    const k = p.item.k;
    const want = k === 'ball' ? td < 11 : k === 'missile' ? td < 4.5 : (td < 2.2 || ax * ax + ay * ay > 4);
    if (want && p.kickCd <= 0) {
      m.aimT += dt;
      if (m.aimT >= S.react) { inp.x = (tgt.x - p.x) / td; inp.y = (tgt.y - p.y) / td; inp.cp = true; inp.c = true; m.aimT = 0; return inp; }
    }
    if (k === 'missile' || k === 'shield') { gx += (tgt.x - p.x) / td; gy += (tgt.y - p.y) / td; gp = tgt; }
  } else {
    // fruta se a vida estiver baixa
    let goal = null;
    if (p.hp < 70 && w.fruits.length) {
      let bd = 7; for (const f of w.fruits) { const d = hyp(f.x - p.x, f.y - p.y); if (d < bd) { bd = d; goal = f; } }
    }
    if (!goal) {
      let cg = m.goal ? crateById(w, m.goal) : null;
      if (cg && (cg.st !== 'g' || (cg.k === 't' && cg.fuse > 0 && cg.fuse < 2))) cg = null;
      if (!cg || m.think <= 0) {
        m.think = S.think;
        let best = null, bs = 1e9;
        for (const c of w.crates) {
          if (c.dead || c.st !== 'g' || c.k === 'n') continue;
          if (c.k === 't' && c.fuse > 0 && c.fuse < 2) continue;
          if (inHole(w, c.x, c.y, 0.4)) continue;
          let s = hyp(c.x - p.x, c.y - p.y);
          for (const q of foes) if (hyp(c.x - q.x, c.y - q.y) < s - 1) s += 1.5;   // alguém chega antes
          if (c.k === 'i') s -= 2;
          if (c.k === 't' && !c.fuse) s += skill >= 1 ? 1.5 : 0;   // TNT parada é arriscada
          for (const o of w.crates) if (o.k === 'n' && !o.dead && hyp(o.x - c.x, o.y - c.y) < 1.2) s += 3;
          if (s < bs) { bs = s; best = c; }
        }
        cg = best;
      }
      m.goal = cg ? cg.id : null;
      goal = cg;
    }
    if (goal) {
      const d = hyp(goal.x - p.x, goal.y - p.y);
      if (goal.k !== undefined && d < PR + CR + 0.35) { inp.ap = true; inp.a = true; }
      gx += (goal.x - p.x) / Math.max(0.1, d); gy += (goal.y - p.y) / Math.max(0.1, d); gp = goal;
    } else {
      // nada para pegar: vai atrás de alguém para chutar (ou passeia)
      if (skill >= 1) { gx += (tgt.x - p.x) / td * 0.8; gy += (tgt.y - p.y) / td * 0.8; gp = tgt; }
      else {
        m.wanderT -= dt;
        if (!m.wander || m.wanderT <= 0) { m.wander = [2 + rnd() * (W - 4), 2 + rnd() * (D - 4)]; m.wanderT = 2; }
        const d = hyp(m.wander[0] - p.x, m.wander[1] - p.y); if (d > 0.3) { gx += (m.wander[0] - p.x) / d * 0.6; gy += (m.wander[1] - p.y) / d * 0.6; gp = { x: m.wander[0], y: m.wander[1] }; }
      }
    }
    // chute em quem está colado
    if (td < 1.2 && p.kickCd <= 0 && Math.abs(tgt.z - p.z) < 0.8 && rnd() < S.kick * dt * 1.5) { inp.cp = true; inp.c = true; }
  }

  // 3. buracos (Space): caminho pela grade em volta dos buracos
  if (gp && w.holes.length) {
    const gl = hyp(gx, gy);
    const nd = navDir(w, p, m, gp.x, gp.y);
    if (nd && gl > 0.01) { gx = nd[0] * gl; gy = nd[1] * gl; }
  }
  // preso: anda devagar demais querendo andar
  if (hyp(gx, gy) > 0.3 && hyp(p.vx, p.vy) < 0.6) m.stuck = (m.stuck || 0) + dt; else m.stuck = 0;
  let mx = gx + ax, my = gy + ay;
  for (const h of w.holes) {
    const d = hyp(p.x - h.x, p.y - h.y);
    if (d < h.r + 0.9) { const k = (h.r + 1 - d) * 3; mx += (p.x - h.x) / Math.max(0.2, d) * k; my += (p.y - h.y) / Math.max(0.2, d) * k; }
  }
  // fica longe das paredes quando foge (não se encurrala)
  if (ax || ay) { if (p.x < 1.2) mx += 1; if (p.x > W - 1.2) mx -= 1; if (p.y < 1.2) my += 1; if (p.y > D - 1.2) my -= 1; }
  let ml = hyp(mx, my);
  if (ml < 0.05) return inp;
  mx /= ml; my /= ml;
  // olha o passo à frente: se for buraco, gira até achar chão
  if (w.holes.length && p.z <= 0) {
    const look = 0.35 + 0.4 * S.look;
    let ok = !inHole(w, p.x + mx * look, p.y + my * look, 0.05);
    for (let i = 1; !ok && i <= 6; i++) {
      const a = Math.atan2(my, mx) + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 0.55;
      if (!inHole(w, p.x + Math.cos(a) * look, p.y + Math.sin(a) * look, 0.05)) { mx = Math.cos(a); my = Math.sin(a); ok = true; }
    }
    if (!ok) return inp;
  }
  // no gelo: corrige o deslize para não passar do ponto
  if (w.level === 'snow') { mx -= p.vx / RUN * 0.5; my -= p.vy / RUN * 0.5; ml = hyp(mx, my) || 1; mx /= ml; my /= ml; }
  inp.x = mx * S.speed; inp.y = my * S.speed;
  return inp;
}

// ---------- o que sai ----------
const KIND = { w: 'w', t: 't', n: 'n', f: 'f', i: 'i' };
function snapshot(w) {
  const out = {
    lv: w.level, clock: r2(w.clock),
    p: w.players.map(p => ({
      id: p.slot, x: r2(p.x), y: r2(p.y), z: r2(p.z), dir: r2(p.dir), hp: Math.round(p.hp),
      o: p.out ? 1 : 0, fa: p.fall > 0 || (p.out && p.why === 'hole') ? 1 : 0, fl: p.flash > 0 ? 1 : 0, st: p.stun > 0 ? 1 : 0,
      k: r2(p.kick), it: p.item ? p.item.k : '', n: p.item ? p.item.n : 0, sh: p.shield > 0 ? r2(p.shield) : 0, h: p.hold ? 1 : 0,
    })),
    c: w.crates.filter(c => !c.dead).map(c => ({ id: c.id, k: KIND[c.k], x: r2(c.x), y: r2(c.y), z: r2(c.z), s: c.st, u: c.fuse > 0 ? Math.ceil(c.fuse) : 0 })),
    fr: w.fruits.map(f => ({ id: f.id, x: r2(f.x), y: r2(f.y), z: r2(f.z) })),
    ho: w.holes.map(h => ({ id: h.id, x: r2(h.x), y: r2(h.y), r: h.r })),
    sh: w.shots.map(s => ({ id: s.id, k: s.k, x: r2(s.x), y: r2(s.y), z: s.z, dir: r2(s.dir) })),
  };
  if (w.penguin) { const g = w.penguin; out.pg = { x: r2(g.x), y: r2(g.y), dir: r2(g.dir), s: g.st, v: r2(hyp(g.vx, g.vy)) }; }
  return out;
}

function priv(w, slot) {
  const p = w.players.find(q => q.slot === slot);
  if (!p) return { status: '', out: true };
  if (p.out) return { status: '♥ 0', bar: 0, out: true, outText: p.why === 'hole' ? 'Caiu no buraco!' : 'Sem vida!', hit: p.hits, off: { a: true, b: true, c: true } };
  let msg = '';
  const c = p.hold ? crateById(w, p.hold) : null;
  if (c && c.k === 't') msg = 'SEGURANDO TNT! ' + Math.max(1, Math.ceil(c.fuse));
  else if (p.shield > 0) msg = 'ESCUDO LIGADO!';
  else if (p.item) msg = 'C: ' + ITEM_NAME[p.item.k] + (p.item.n > 1 ? ' ×' + p.item.n : '');
  else if (p.stun > 0) msg = 'AI!';
  return { status: '♥ ' + Math.round(p.hp), bar: p.hp / HP, out: false, msg, hit: p.hits, off: { c: !!p.hold && !p.item } };
}

module.exports = {
  levels: LEVELS, controls, create, step, bot, makeBot, snapshot, private: priv,
  // números para os testes
  _: { W, D, PR, CR, HP, DMG, FUSE, TNT_R, NITRO_R, CLOCK, RUN, CARRY, FRUIT, explode, hurt, kick, newCrate, tryPick },
};
