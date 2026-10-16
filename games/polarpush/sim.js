// Polar Push — simulação (só roda no servidor). Cada pessoa monta um urso polar num bloco de gelo
// cercado de água; quem sobrar no gelo ganha. A estrela é a batida: inércia de gelo, controle firme,
// investida que joga o outro longe e quem estava parado leva o tranco maior.
// Contrato com o motor: shared/bash/engine.js (create/step/bot/snapshot/private).
'use strict';

const TAU = Math.PI * 2;
const CX = 8, CY = 8, ARENA = 16;          // arena 16×16; o gelo fica no meio, o resto é água
const SD_AT = 75, HARD_END = 150;          // 75 s: a borda começa a esfarelar; 150 s: acaba no empate
const SD_RATE = 0.1;                       // u/s que a borda perde no fim
const BASE = { r: 0.55, m: 1, pw: 1, acc: 14, max: 5, ch: 1 };
const FRICTION = 1.2;                      // gelo: a velocidade cai ~1,2 por segundo (exponencial)
const OVER_DRAG = 2.6;                     // acima da velocidade máxima (tranco) freia um pouco mais
const GRIP = 3.2;                          // a parte da velocidade fora da direção do stick some depressa: dá para mirar
const CH_COST = 0.6, CH_REFILL = 1 / 1.6, CH_WIND = 0.1, CH_BURST = 0.22, CH_SPEED = 11;
const E = 0.6, KB = 0.3;                   // restituição da batida e quanto da "força" vira empurrão extra
const HANG_TIME = 1.3, CLIMB_NEED = 4;     // pendurado: 1,3 s para subir com 4 apertos de A (+1 a cada subida, até 8)
const WALL_N = 24, WALL_T = 0.4, WALL_HP = 2;
const TILT_K = 0.02, TILT_MAX = 0.38, TILT_SPRING = 18, TILT_DAMP = 5, TILT_SLIDE = 16;
const POWER_TIME = { raio: 6, peso: 9, inflar: 8, encolher: 8, gelo: 3, neve: 10 };
const POWER_NAME = { raio: 'RAIO', peso: 'PESO', inflar: 'INFLADO', encolher: 'ENCOLHIDO', gelo: 'CONGELADO', neve: 'BOLA DE NEVE' };

const LEVELS = [
  { id: 'polar', name: 'Polar Panic', short: 'Quebre o muro de gelo e empurre todo mundo na água.',
    how: ['Ande com o analógico: o gelo escorrega.', 'A dá uma investida (gasta a barra).', 'O muro em volta racha com as batidas; sem muro, dá para cair.', 'O Disco lá em cima dá poderes: Raio, Peso, Inflar e Encolher.', 'Pendurado na borda? Aperte A várias vezes empurrando para dentro.'] },
  { id: 'tilt', name: 'Tilt Panic', short: 'O gelo inclina para o lado do peso. Fuja da morsa!',
    how: ['O bloco inclina para onde está o peso e todo mundo escorrega.', 'Juntem-se num canto para derrubar os outros de propósito.', 'Apareceu um peixe? Saia de perto: a morsa cai ali.', 'A dá uma investida; pendurado, aperte A várias vezes.'] },
  { id: 'melt', name: 'Melt Panic', short: 'O gelo derrete e a ilha encolhe a cada segundo.',
    how: ['A ilha fica menor com o tempo.', 'A dá uma investida; B joga a bola de neve (dá para curvar).', 'O Disco congela, dá bola de neve ou o Peso.', 'Com o Peso, bata em alguém para passar adiante.'] },
  { id: 'manic', name: 'Manic Panic', short: 'Pegue bombas e derrube os outros do urso.',
    how: ['Pegue a bomba no gelo e jogue com B.', 'A primeira bomba derruba você do urso: a pé, você fica fraco.', 'A segunda bomba, a pé, tira você do jogo.', 'A dá uma investida; pendurado, aperte A várias vezes.'] },
];

const CFG = {
  polar: { shape: 'circle', R0: 6.5, walls: true, powers: ['raio', 'peso', 'inflar', 'encolher'] },
  tilt: { shape: 'square', R0: 5.6, tilt: true, walrus: true, powers: ['inflar', 'encolher', 'peso'] },
  melt: { shape: 'circle', R0: 7, melt: { min: 3.4, rate: 0.065 }, powers: ['gelo', 'neve', 'peso'] },
  manic: { shape: 'circle', R0: 6.5, bombs: true, powers: ['raio', 'inflar', 'encolher'] },
};

const r2 = n => Math.round(n * 100) / 100;
const num = v => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const hyp = Math.hypot;
function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function angDiff(a, b) { let d = b - a; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return d; }

function controls(levelId) {
  const a = { id: 'a', label: 'INVESTIR' };
  if (levelId === 'melt') return { stick: 'free', buttons: [a, { id: 'b', label: 'BOLA' }] };
  if (levelId === 'manic') return { stick: 'free', buttons: [a, { id: 'b', label: 'BOMBA' }] };
  return { stick: 'free', buttons: [a] };
}

// ---------- borda do gelo ----------
// edgeDist > 0: dentro (distância até a borda); < 0: o centro já passou da borda.
function edgeDist(w, x, y) {
  const dx = x - CX, dy = y - CY;
  if (w.cfg.shape === 'square') return w.R - Math.max(Math.abs(dx), Math.abs(dy));
  return w.R - hyp(dx, dy);
}
// Ponto da borda mais perto e a normal para fora.
function edgeAt(w, x, y) {
  const dx = x - CX, dy = y - CY;
  if (w.cfg.shape === 'square') {
    const H = w.R;
    if (Math.abs(dx) >= Math.abs(dy)) { const s = dx >= 0 ? 1 : -1; return { x: CX + s * H, y: CY + clamp(dy, -H, H), nx: s, ny: 0 }; }
    const s = dy >= 0 ? 1 : -1; return { x: CX + clamp(dx, -H, H), y: CY + s * H, nx: 0, ny: s };
  }
  const d = hyp(dx, dy) || 1e-6, nx = dx / d, ny = dy / d;
  return { x: CX + nx * w.R, y: CY + ny * w.R, nx, ny };
}
// cada subida da borda pede um aperto a mais: ninguém fica pendurado para sempre
function need(p) { return Math.min(8, CLIMB_NEED + p.climbs); }
function wallIndex(x, y) { const a = Math.atan2(y - CY, x - CX); return ((Math.floor((a + Math.PI) / TAU * WALL_N) % WALL_N) + WALL_N) % WALL_N; }

// ---------- números de cada um (urso, poder, a pé) ----------
function stats(p) {
  const s = Object.assign({}, BASE);
  if (!p.bear) { s.r = 0.42; s.m = 0.6; s.pw = 0.55; s.acc = 12; s.max = 4.2; s.ch = 0.8; }
  if (p.pw === 'inflar') { s.r *= 1.5; s.m *= 2.3; s.pw *= 1.5; s.acc *= 0.8; s.max *= 0.84; }
  else if (p.pw === 'encolher') { s.r *= 0.7; s.m *= 0.55; s.pw *= 0.65; s.acc *= 1.2; s.max *= 1.24; }
  else if (p.pw === 'gelo') { s.r *= 1.1; s.m *= 4; s.acc = 1; s.max = 0.8; s.ch = 0; }
  else if (p.pw === 'peso') { s.m *= 1.5; s.max *= 0.88; }
  return s;
}

function create(entrants, opts) {
  opts = opts || {};
  const level = CFG[opts.level] ? opts.level : 'polar';
  const cfg = CFG[level];
  const rng = mulberry(opts.seed !== undefined ? opts.seed : Math.floor(Math.random() * 4294967296));
  // cantos fixos por vaga: casam com os cartões do placar (0 em cima à esquerda… 3 embaixo à direita)
  const ANG = [-0.75 * Math.PI, -0.25 * Math.PI, 0.75 * Math.PI, 0.25 * Math.PI];
  const spawnD = cfg.shape === 'square' ? cfg.R0 * 0.62 * Math.SQRT2 * 0.8 : cfg.R0 * 0.55;
  const ps = entrants.map(e => {
    const a = ANG[e.slot % 4];
    return {
      slot: e.slot, bot: !!e.bot, name: e.name, color: e.color,
      x: CX + Math.cos(a) * spawnD, y: CY + Math.sin(a) * spawnD, vx: 0, vy: 0, dir: a + Math.PI,
      meter: 1, wind: 0, burst: 0, cdir: 0, tum: 0, stun: 0, hang: 0, climb: 0,
      out: false, outAt: 0, how: '', pw: null, pt: 0, bear: true, bombs: 0, balls: 0, passCd: 0,
      hits: 0, flash: 0, bearAt: -9, climbs: 0,
    };
  });
  const w = {
    level, cfg, rng, time: 0, t: 0, R: cfg.R0, sd: false, ps, order: [], result: null, fx: [],
    walls: cfg.walls ? new Array(WALL_N).fill(WALL_HP) : null,
    tilt: { x: 0, y: 0, vx: 0, vy: 0 },
    disco: { x: CX, y: CY - 1, st: 'idle', k: 0, tg: -1, next: 6 + rng() * 2, pw: null },
    fish: null, walrus: null, fishNext: 7 + rng() * 2,
    picks: [], pickNext: 2.5, shots: [], seq: 1, bots: {}, cpuLevel: opts.cpuLevel === undefined ? 1 : opts.cpuLevel,
  };
  return w;
}

function fx(w, o) { w.fx.push(o); }
function alive(w) { return w.ps.filter(p => !p.out); }

function eliminate(w, p, how) {
  if (p.out) return;
  p.out = true; p.outAt = w.t; p.how = how; p.hang = 0; p.vx = p.vy = 0; p.pw = null; p.pt = 0; p.bombs = 0; p.balls = 0;
  w.order.push(p.slot);
  fx(w, { k: how === 'peso' ? 'sink' : how === 'boom' ? 'blast' : 'splash', x: r2(p.x), y: r2(p.y), s: p.slot });
}

function givePower(w, p, kind) {
  p.pw = kind; p.pt = POWER_TIME[kind];
  if (kind === 'neve') p.balls = 1;
  if (kind === 'gelo') { p.vx *= 0.2; p.vy *= 0.2; p.wind = 0; p.burst = 0; }
  if (kind === 'peso') p.passCd = 0.4;
  fx(w, { k: 'power', s: p.slot, pw: kind, x: r2(p.x), y: r2(p.y) });
}

function endPower(w, p) {
  const kind = p.pw; p.pw = null; p.pt = 0;
  if (kind === 'raio') {
    for (const q of w.ps) if (q !== p && !q.out && !q.hang) { q.stun = 2; q.wind = 0; q.burst = 0; }
    fx(w, { k: 'zap', s: p.slot, x: r2(p.x), y: r2(p.y) });
  } else if (kind === 'peso') {
    eliminate(w, p, 'peso');
  } else if (kind === 'neve') p.balls = 0;
  else fx(w, { k: 'pwend', s: p.slot, pw: kind, x: r2(p.x), y: r2(p.y) });
}

// tranco de fora (explosão, morsa, bola de neve): velocidade na direção (nx, ny)
function knock(w, p, nx, ny, speed, tum) {
  const st = stats(p), k = speed / Math.sqrt(st.m);
  p.vx += nx * k; p.vy += ny * k; p.tum = Math.max(p.tum, tum); p.wind = 0; p.burst = 0; p.hits++; p.flash = 0.2;
}

// ---------- passo ----------
function step(w, inputs, dt) {
  w.time += dt;
  const party = !!w.result;
  if (!party) w.t += dt;
  inputs = inputs || [];

  // borda: derrete (Derretendo) e esfarela no fim (todas)
  if (!party) {
    if (w.cfg.melt) w.R = Math.max(w.cfg.melt.min, w.R - w.cfg.melt.rate * dt);
    if (!w.sd && w.t >= SD_AT) {
      w.sd = true; fx(w, { k: 'sd' });
      if (w.walls) for (let i = 0; i < WALL_N; i++) if (w.walls[i] > 0) { w.walls[i] = 0; fx(w, { k: 'shatter', i }); }
    }
    if (w.sd) w.R = Math.max(w.cfg.shape === 'square' ? 1.6 : 1.8, w.R - SD_RATE * dt);
    disco(w, dt);
    if (w.cfg.walrus) walrus(w, dt);
    if (w.cfg.bombs) pickups(w, dt);
  }
  if (w.cfg.tilt) tiltStep(w, dt);

  for (const p of w.ps) if (!p.out) control(w, p, inputs[p.slot] || {}, dt);
  for (const p of w.ps) if (!p.out && !p.hang) { p.x += p.vx * dt; p.y += p.vy * dt; }
  collide(w);
  if (w.walls) walls(w);
  shots(w, dt);
  for (const p of w.ps) if (!p.out) edge(w, p, inputs[p.slot] || {}, dt);
  if (!party) for (const p of w.ps) if (!p.out && p.pw) { p.pt -= dt; if (p.pt <= 0) endPower(w, p); }
  if (!party) checkEnd(w);
}

function control(w, p, inp, dt) {
  const st = stats(p);
  if (p.hang > 0) return;   // pendurado: edge() cuida
  let ix = clamp(num(inp.x), -1, 1), iy = clamp(num(inp.y), -1, 1), mag = hyp(ix, iy);
  if (mag < 0.12) { ix = iy = 0; mag = 0; } else if (mag > 1) { ix /= mag; iy /= mag; mag = 1; }
  p.tum = Math.max(0, p.tum - dt); p.stun = Math.max(0, p.stun - dt); p.passCd = Math.max(0, p.passCd - dt); p.flash = Math.max(0, p.flash - dt);
  let ctrl = p.stun > 0 ? 0 : p.tum > 0 ? 0.15 : 1;

  // investida: agacha 0,1 s (vulnerável) e dispara
  if (inp.ap && ctrl > 0 && st.ch > 0 && p.wind <= 0 && p.burst <= 0 && p.meter >= CH_COST) {
    p.meter -= CH_COST; p.wind = CH_WIND;
    p.cdir = mag > 0.3 ? Math.atan2(iy, ix) : p.dir;
    fx(w, { k: 'wind', s: p.slot });
  }
  if (p.wind > 0) {
    p.wind -= dt; const k = Math.exp(-8 * dt); p.vx *= k; p.vy *= k; ctrl = 0; p.dir = p.cdir;
    if (p.wind <= 0) {
      p.wind = 0; p.burst = CH_BURST;
      const sp = CH_SPEED * st.ch; p.vx = Math.cos(p.cdir) * sp; p.vy = Math.sin(p.cdir) * sp;
      fx(w, { k: 'dash', s: p.slot, x: r2(p.x), y: r2(p.y), d: r2(p.cdir) });
    }
  } else if (p.burst > 0) {
    p.burst = Math.max(0, p.burst - dt); ctrl = 0; p.dir = p.cdir;
  } else p.meter = Math.min(1, p.meter + CH_REFILL * dt);

  // aceleração: só até a velocidade máxima na direção do stick (o tranco não é cortado)
  if (ctrl > 0 && mag > 0) {
    const ux = ix / mag, uy = iy / mag, vin = p.vx * ux + p.vy * uy, target = st.max * mag;
    if (vin < target) { const add = Math.min(st.acc * ctrl * mag * dt, target - vin); p.vx += ux * add; p.vy += uy * add; }
    // pegada: o que escorrega de lado some mais rápido quando a pessoa aponta
    const side = -p.vx * uy + p.vy * ux, keep = Math.exp(-GRIP * ctrl * mag * dt) - 1;
    p.vx += -uy * side * keep; p.vy += ux * side * keep;
  }
  if (p.burst <= 0) {
    const f = Math.exp(-FRICTION * dt); p.vx *= f; p.vy *= f;
    const sp = hyp(p.vx, p.vy);
    if (sp > st.max) { const ns = st.max + (sp - st.max) * Math.exp(-OVER_DRAG * dt); p.vx *= ns / sp; p.vy *= ns / sp; }
  }
  if (w.cfg.tilt) { p.vx += w.tilt.x * TILT_SLIDE * dt; p.vy += w.tilt.y * TILT_SLIDE * dt; }
  if (p.wind <= 0 && p.burst <= 0) {
    const sp = hyp(p.vx, p.vy);
    const want = mag > 0.2 && ctrl > 0 ? Math.atan2(iy, ix) : sp > 0.6 ? Math.atan2(p.vy, p.vx) : p.dir;
    p.dir += angDiff(p.dir, want) * Math.min(1, 12 * dt);
  }

  // B: bomba (Bombas no Gelo) ou bola de neve (Derretendo)
  if (inp.bp && ctrl > 0 && !w.result) {
    const d = mag > 0.3 ? Math.atan2(iy, ix) : p.dir;
    if (p.bombs > 0) {
      p.bombs--;
      const L = 4.6;
      w.shots.push({ id: w.seq++, k: 'bomb', o: p.slot, x0: p.x, y0: p.y, x1: p.x + Math.cos(d) * L, y1: p.y + Math.sin(d) * L, x: p.x, y: p.y, z: 0.8, t: 0, T: 0.75 });
      fx(w, { k: 'throw', s: p.slot });
    } else if (p.balls > 0) {
      p.balls--; if (p.pw === 'neve') { p.pw = null; p.pt = 0; }
      w.shots.push({ id: w.seq++, k: 'ball', o: p.slot, x: p.x + Math.cos(d) * 0.6, y: p.y + Math.sin(d) * 0.6, z: 0.6, vx: Math.cos(d) * 9, vy: Math.sin(d) * 9, t: 0, T: 1.5 });
      fx(w, { k: 'throw', s: p.slot });
    }
  }
}

// Batidas entre ursos: separa, troca impulso (elástico) e soma o empurrão de quem vinha com força.
function collide(w) {
  const list = w.ps;
  for (let i = 0; i < list.length; i++) {
    const a = list[i]; if (a.out) continue;
    for (let j = i + 1; j < list.length; j++) {
      const b = list[j]; if (b.out) continue;
      if (a.hang && b.hang) continue;
      const sa = stats(a), sb = stats(b);
      let dx = b.x - a.x, dy = b.y - a.y, d = hyp(dx, dy);
      const rr = sa.r + sb.r; if (d >= rr) continue;
      if (d < 1e-6) { dx = 1; dy = 0; d = 1e-6; }
      const nx = dx / d, ny = dy / d, over = rr - d;
      if (a.hang || b.hang) { hangHit(w, a.hang ? b : a, a.hang ? a : b, a.hang ? -nx : nx, a.hang ? -ny : ny, over); continue; }
      const ma = sa.m, mb = sb.m;
      a.x -= nx * over * mb / (ma + mb); a.y -= ny * over * mb / (ma + mb);
      b.x += nx * over * ma / (ma + mb); b.y += ny * over * ma / (ma + mb);
      const ua = a.vx * nx + a.vy * ny, ub = b.vx * nx + b.vy * ny, vrel = ua - ub;
      if (vrel <= 0) continue;
      const j0 = (1 + E) * vrel / (1 / ma + 1 / mb);
      a.vx -= nx * j0 / ma; a.vy -= ny * j0 / ma; b.vx += nx * j0 / mb; b.vy += ny * j0 / mb;
      // força de cada um na direção do outro; investida conta 1,6×; quem agachava leva 1,8× (contra-ataque)
      const ca = a.burst > 0, cb = b.burst > 0;
      let Pa = Math.max(0, ua) * sa.pw * (ca ? 1.6 : 1) * (b.wind > 0 ? 1.8 : 1);
      let Pb = Math.max(0, -ub) * sb.pw * (cb ? 1.6 : 1) * (a.wind > 0 ? 1.8 : 1);
      let counter = -1;
      if (ca && cb) {
        // duas investidas de frente: os dois voam para trás
        const back = 3 + Math.min(Pa, Pb) * 0.25;
        a.vx -= nx * back / Math.sqrt(ma); a.vy -= ny * back / Math.sqrt(ma); b.vx += nx * back / Math.sqrt(mb); b.vy += ny * back / Math.sqrt(mb);
        a.tum = b.tum = 0.35; a.burst = b.burst = 0;
      } else {
        if (ca && !cb) Pa *= 1.3;
        if (cb && !ca) Pb *= 1.3;
        if (ca && b.wind > 0) counter = a.slot; if (cb && a.wind > 0) counter = b.slot;
        const net = Pa - Pb;
        if (net > 0) { const k = net * KB / Math.pow(mb, 0.6); b.vx += nx * k; b.vy += ny * k; a.vx -= nx * net * 0.05; a.vy -= ny * net * 0.05; b.tum = Math.max(b.tum, Math.min(0.5, 0.06 + net * 0.02)); b.wind = 0; if (net > 4) { b.hits++; b.flash = 0.2; } }
        else if (net < 0) { const k = -net * KB / Math.pow(ma, 0.6); a.vx -= nx * k; a.vy -= ny * k; b.vx += nx * -net * 0.05; b.vy += ny * -net * 0.05; a.tum = Math.max(a.tum, Math.min(0.5, 0.06 + -net * 0.02)); a.wind = 0; if (net < -4) { a.hits++; a.flash = 0.2; } }
        if (ca) a.burst = 0; if (cb) b.burst = 0;
      }
      // Peso passa adiante na batida
      if (vrel > 0.8) {
        if (a.pw === 'peso' && a.passCd <= 0 && !b.hang) passPeso(w, a, b);
        else if (b.pw === 'peso' && b.passCd <= 0 && !a.hang) passPeso(w, b, a);
      }
      if (vrel > 1.5) fx(w, { k: 'bump', x: r2(a.x + nx * sa.r), y: r2(a.y + ny * sa.r), p: r2(vrel), a: a.slot, b: b.slot, c: counter, dd: ca && cb ? 1 : 0 });
    }
    // morsa: um bloco pesado parado
    if (w.walrus && w.walrus.z <= 0 && !a.hang) {
      const sa = stats(a), wr = w.walrus;
      let dx = a.x - wr.x, dy = a.y - wr.y, d = hyp(dx, dy); const rr = sa.r + 0.95;
      if (d < rr) {
        if (d < 1e-6) { dx = 1; dy = 0; d = 1e-6; }
        const nx = dx / d, ny = dy / d; a.x = wr.x + nx * rr; a.y = wr.y + ny * rr;
        const vn = a.vx * nx + a.vy * ny; if (vn < 0) { a.vx -= nx * vn * 1.8; a.vy -= ny * vn * 1.8; if (vn < -2) fx(w, { k: 'bump', x: r2(a.x - nx * sa.r), y: r2(a.y - ny * sa.r), p: r2(-vn), a: a.slot, b: -1 }); }
      }
    }
  }
}
// Alguém bateu em quem está pendurado: com força para fora, derruba de vez.
function hangHit(w, att, hung, nx, ny, over) {
  const sa = stats(att);
  att.x -= nx * over; att.y -= ny * over;
  const vn = att.vx * nx + att.vy * ny;
  if (vn > 2.2 || att.burst > 0) { eliminate(w, hung, 'water'); att.vx *= 0.3; att.vy *= 0.3; fx(w, { k: 'bump', x: r2(att.x + nx * sa.r), y: r2(att.y + ny * sa.r), p: r2(vn), a: att.slot, b: hung.slot }); }
  else if (vn > 0) { att.vx -= nx * vn * 1.4; att.vy -= ny * vn * 1.4; }
}
function passPeso(w, from, to) {
  to.pw = 'peso'; to.pt = Math.max(from.pt, 2.5); to.passCd = 0.6; to.balls = 0;
  from.pw = null; from.pt = 0;
  fx(w, { k: 'pass', a: from.slot, b: to.slot, x: r2(to.x), y: r2(to.y) });
}

// Muro de gelo (Pânico Polar): segura quem bate e racha; com 0 de vida, quebra e abre a borda.
function walls(w) {
  for (const p of w.ps) {
    if (p.out || p.hang) continue;
    const st = stats(p), dx = p.x - CX, dy = p.y - CY, d = hyp(dx, dy), lim = w.R - WALL_T - st.r;
    if (d <= lim) continue;
    const i = wallIndex(p.x, p.y); if (w.walls[i] <= 0) continue;
    const nx = dx / d, ny = dy / d;
    p.x = CX + nx * lim; p.y = CY + ny * lim;
    const vr = p.vx * nx + p.vy * ny; if (vr <= 0) continue;
    p.vx -= nx * vr * 1.5; p.vy -= ny * vr * 1.5;
    const dmg = vr > 8.5 ? 2 : vr > 5.4 ? 1 : 0;   // andar não racha: só tranco ou investida
    if (p.burst > 0) p.burst = 0;
    if (dmg) {
      w.walls[i] = Math.max(0, w.walls[i] - dmg);
      fx(w, { k: w.walls[i] ? 'crack' : 'shatter', i, x: r2(CX + nx * w.R), y: r2(CY + ny * w.R), p: r2(vr) });
    } else if (vr > 1.5) fx(w, { k: 'thud', x: r2(CX + nx * w.R), y: r2(CY + ny * w.R), p: r2(vr) });
  }
}

// Borda: passou o centro, fica pendurado; A várias vezes empurrando para dentro sobe de volta.
function edge(w, p, inp, dt) {
  if (p.hang > 0) {
    const e = edgeAt(w, p.x, p.y);
    p.x = e.x + e.nx * 0.12; p.y = e.y + e.ny * 0.12; p.vx = p.vy = 0;
    p.hang -= dt;
    if (inp.ap) {
      const ix = num(inp.x), iy = num(inp.y), mag = hyp(ix, iy), into = mag > 0.2 ? -(ix * e.nx + iy * e.ny) / mag : 0;
      p.climb += into > 0.3 ? 1 : mag <= 0.2 ? 0.5 : 0;
      fx(w, { k: 'grip', s: p.slot });
    }
    if (p.climb >= need(p)) {
      p.hang = 0; p.climb = 0; p.climbs++; p.x = e.x - e.nx * 0.8; p.y = e.y - e.ny * 0.8; p.vx = -e.nx * 2.5; p.vy = -e.ny * 2.5; p.tum = 0.15;
      fx(w, { k: 'climb', s: p.slot, x: r2(p.x), y: r2(p.y) });
    } else if (p.hang <= 0) eliminate(w, p, 'water');
    return;
  }
  if (edgeDist(w, p.x, p.y) < 0) {
    if (w.result) { eliminate(w, p, 'water'); return; }   // festa: cai direto
    p.hang = HANG_TIME; p.climb = 0; p.wind = 0; p.burst = 0; p.tum = 0; p.stun = 0; p.vx = p.vy = 0;
    if (p.pw === 'gelo') { p.pw = null; p.pt = 0; }
    fx(w, { k: 'hang', s: p.slot, x: r2(p.x), y: r2(p.y) });
  }
}

// ---------- Disco: a máquina que paira e dá um poder para alguém ----------
function disco(w, dt) {
  const D = w.disco, t = w.t;
  if (D.st === 'idle') {
    const tx = CX + 3.2 * Math.cos(t * 0.4), ty = CY - 0.8 + 2.4 * Math.sin(t * 0.53);
    D.x += (tx - D.x) * Math.min(1, 2 * dt); D.y += (ty - D.y) * Math.min(1, 2 * dt);
    if (t >= D.next) {
      const pool = w.ps.filter(p => !p.out && !p.hang && !p.pw);
      if (pool.length >= 1 && alive(w).length >= 2) {
        const p = pool[Math.floor(w.rng() * pool.length)];
        D.st = 'aim'; D.k = 1.1; D.tg = p.slot; D.pw = w.cfg.powers[Math.floor(w.rng() * w.cfg.powers.length)];
        fx(w, { k: 'aim', s: p.slot });
      } else D.next = t + 2;
    }
  } else if (D.st === 'aim') {
    const p = w.ps[D.tg];
    if (!p || p.out) { D.st = 'idle'; D.next = t + 3; D.tg = -1; return; }
    D.x += (p.x - D.x) * Math.min(1, 5 * dt); D.y += (p.y - D.y) * Math.min(1, 5 * dt);
    D.k -= dt;
    if (D.k <= 0) {
      D.st = 'fire'; D.k = 0.45;
      if (!p.hang && !p.pw) givePower(w, p, D.pw);
      fx(w, { k: 'beam', s: p.slot, pw: D.pw });
    }
  } else {
    D.k -= dt;
    if (D.k <= 0) { D.st = 'idle'; D.tg = -1; D.next = t + 9 + w.rng() * 4; }
  }
}

// ---------- Gangorra: inclinação, peixe e morsa ----------
function tiltStep(w, dt) {
  const T = w.tilt;
  let mx = 0, my = 0;
  for (const p of w.ps) { if (p.out || p.hang) continue; const m = stats(p).m; mx += m * (p.x - CX); my += m * (p.y - CY); }
  if (w.walrus && w.walrus.z <= 0) { mx += 3 * (w.walrus.x - CX); my += 3 * (w.walrus.y - CY); }
  let gx = mx * TILT_K, gy = my * TILT_K; const g = hyp(gx, gy);
  if (g > TILT_MAX) { gx *= TILT_MAX / g; gy *= TILT_MAX / g; }
  T.vx += ((gx - T.x) * TILT_SPRING - T.vx * TILT_DAMP) * dt;
  T.vy += ((gy - T.y) * TILT_SPRING - T.vy * TILT_DAMP) * dt;
  T.x += T.vx * dt; T.y += T.vy * dt;
  const t = hyp(T.x, T.y); if (t > TILT_MAX * 1.25) { T.x *= TILT_MAX * 1.25 / t; T.y *= TILT_MAX * 1.25 / t; }
}
function walrus(w, dt) {
  if (w.walrus) {
    const wr = w.walrus;
    if (wr.z > 0) {
      wr.vz -= 30 * dt; wr.z = Math.max(0, wr.z + wr.vz * dt);
      if (wr.z <= 0) {
        // caiu: tranco na gangorra e em quem estava perto
        const dx = wr.x - CX, dy = wr.y - CY, d = hyp(dx, dy) || 1;
        const kick = 1.7 * Math.min(1, d / 3);
        w.tilt.vx += dx / d * kick; w.tilt.vy += dy / d * kick;
        for (const p of w.ps) {
          if (p.out || p.hang) continue;
          let ex = p.x - wr.x, ey = p.y - wr.y; const e = hyp(ex, ey);
          if (e < 2.6) { if (e < 1e-3) { ex = 1; ey = 0; } const L = e || 1; knock(w, p, ex / L, ey / L, Math.max(3, 10 * (1 - e / 3.2)), 0.4); }
        }
        w.fish = null;
        fx(w, { k: 'walrus', x: r2(wr.x), y: r2(wr.y) });
      }
    } else {
      wr.k -= dt;
      if (wr.k <= 0) { fx(w, { k: 'walrusoff', x: r2(wr.x), y: r2(wr.y) }); w.walrus = null; w.fishNext = w.t + 7 + w.rng() * 4; }
    }
    return;
  }
  if (w.fish) {
    w.fish.k -= dt;
    if (w.fish.k <= 0) w.walrus = { id: w.seq++, x: w.fish.x, y: w.fish.y, z: 9, vz: 0, k: 2.6 };
    return;
  }
  if (w.t >= w.fishNext) {
    const H = w.R * 0.75, x = CX + (w.rng() * 2 - 1) * H, y = CY + (w.rng() * 2 - 1) * H;
    w.fish = { id: w.seq++, x, y, k: 2 };
    fx(w, { k: 'fish', x: r2(x), y: r2(y) });
  }
}

// ---------- Bombas no Gelo ----------
function pickups(w, dt) {
  if (w.picks.length < 2 && w.t >= w.pickNext) {
    for (let tries = 0; tries < 12; tries++) {
      const a = w.rng() * TAU, d = Math.sqrt(w.rng()) * w.R * 0.7, x = CX + Math.cos(a) * d, y = CY + Math.sin(a) * d;
      if (w.ps.some(p => !p.out && hyp(p.x - x, p.y - y) < 1.5)) continue;
      w.picks.push({ id: w.seq++, x, y }); break;
    }
    w.pickNext = w.t + 3.5 + w.rng() * 2;
  }
  for (let i = w.picks.length - 1; i >= 0; i--) {
    const b = w.picks[i];
    if (edgeDist(w, b.x, b.y) < 0.2) { w.picks.splice(i, 1); fx(w, { k: 'plop', x: r2(b.x), y: r2(b.y) }); continue; }
    for (const p of w.ps) {
      if (p.out || p.hang || p.bombs > 0) continue;
      if (hyp(p.x - b.x, p.y - b.y) < stats(p).r + 0.45) { p.bombs = 1; w.picks.splice(i, 1); fx(w, { k: 'pick', s: p.slot, x: r2(b.x), y: r2(b.y) }); break; }
    }
  }
}

function shots(w, dt) {
  for (let i = w.shots.length - 1; i >= 0; i--) {
    const s = w.shots[i]; s.t += dt;
    if (s.k === 'bomb') {
      const k = Math.min(1, s.t / s.T);
      s.x = s.x0 + (s.x1 - s.x0) * k; s.y = s.y0 + (s.y1 - s.y0) * k; s.z = 0.8 * (1 - k) + 2.4 * 4 * k * (1 - k) * 0.5;
      if (k >= 1) { w.shots.splice(i, 1); explode(w, s); }
      continue;
    }
    // bola de neve: anda reto e curva um pouco para onde o dono aponta
    const o = w.ps[s.o];
    if (o && !o.out && o.lastIn) {
      const ix = o.lastIn.x, iy = o.lastIn.y;
      if (hyp(ix, iy) > 0.3) {
        const cur = Math.atan2(s.vy, s.vx), want = Math.atan2(iy, ix), turn = clamp(angDiff(cur, want), -1.6 * dt, 1.6 * dt), sp = hyp(s.vx, s.vy);
        s.vx = Math.cos(cur + turn) * sp; s.vy = Math.sin(cur + turn) * sp;
      }
    }
    s.x += s.vx * dt; s.y += s.vy * dt;
    let hit = null;
    for (const p of w.ps) { if (p.out || p.slot === s.o) continue; if (hyp(p.x - s.x, p.y - s.y) < stats(p).r + 0.3) { hit = p; break; } }
    if (hit) {
      const sp = hyp(s.vx, s.vy) || 1;
      if (hit.hang) eliminate(w, hit, 'water');
      else knock(w, hit, s.vx / sp, s.vy / sp, 8.5, 0.45);
      fx(w, { k: 'snow', x: r2(s.x), y: r2(s.y), s: hit.slot });
      w.shots.splice(i, 1); continue;
    }
    if (s.t >= s.T || s.x < -1 || s.y < -1 || s.x > ARENA + 1 || s.y > ARENA + 1) { w.shots.splice(i, 1); fx(w, { k: edgeDist(w, s.x, s.y) < 0 ? 'plop' : 'snow', x: r2(s.x), y: r2(s.y), s: -1 }); }
  }
}
function explode(w, s) {
  if (edgeDist(w, s.x, s.y) < 0) { fx(w, { k: 'plop', x: r2(s.x), y: r2(s.y), big: 1 }); return; }
  fx(w, { k: 'boom', x: r2(s.x), y: r2(s.y) });
  for (const p of w.ps) {
    if (p.out) continue;
    const st = stats(p); let dx = p.x - s.x, dy = p.y - s.y; const d = hyp(dx, dy);
    if (d > 2.4 + st.r) continue;
    if (d < 1e-3) { dx = 1; dy = 0; }
    const L = d || 1;
    if (p.hang) { eliminate(w, p, 'water'); continue; }
    if (d < 1.0 + st.r) {
      if (p.bear) { p.bear = false; p.bearAt = w.t; fx(w, { k: 'bearoff', s: p.slot, x: r2(p.x), y: r2(p.y), d: r2(Math.atan2(dy, dx)) }); }
      else { eliminate(w, p, 'boom'); continue; }
    }
    knock(w, p, dx / L, dy / L, Math.max(4, 10 * (1 - d / 2.8)), 0.5);
  }
}

function checkEnd(w) {
  const n = w.ps.length, live = alive(w);
  if (n >= 2 ? live.length > 1 : live.length > 0) {
    if (w.t < HARD_END) return;
    // tempo esgotado: quem está de pé divide a vitória
    const order = live.map(p => p.slot).concat(w.order.slice().reverse());
    w.result = { winners: live.map(p => p.slot), order };
  } else if (live.length === 1) {
    w.result = { winners: [live[0].slot], order: [live[0].slot].concat(w.order.slice().reverse()) };
  } else {
    w.result = { winners: [], order: w.order.slice().reverse() };   // os últimos caíram juntos: empate
  }
  for (const p of w.ps) { p.pw = null; p.pt = 0; }
  w.shots.length = 0; w.disco.st = 'idle'; w.disco.tg = -1; w.fish = null;
  fx(w, { k: 'end', winners: w.result.winners });
}

// ---------- CPU ----------
const SK = {
  think: [0.34, 0.18, 0.08], mag: [0.8, 0.92, 1], aim: [0.4, 0.16, 0.05], mash: [0.3, 0.2, 0.13],
  margin: [0.7, 1.3, 1.7], chargeP: [0.35, 0.7, 1], dodge: [0.1, 0.45, 0.9], reach: [2.2, 2.7, 3.1],
};
function bot(w, slot, skill, dt) {
  skill = clamp(skill | 0, 0, 2);
  const out = { x: 0, y: 0, a: false, b: false, c: false, ap: false, bp: false, cp: false, ar: false, br: false, cr: false };
  const p = w.ps[slot]; if (!p || p.out) return out;
  const m = w.bots[slot] || (w.bots[slot] = { think: 0, mx: 0, my: 0, mash: 0.2, tg: -1, dodge: 0, wantA: false, wantB: false, side: w.rng() < 0.5 ? 1 : -1 });
  const R = w.rng;
  if (p.hang > 0) {
    const e = edgeAt(w, p.x, p.y);
    out.x = -e.nx; out.y = -e.ny;
    m.mash -= dt;
    if (m.mash <= 0) { out.ap = out.a = true; m.mash = SK.mash[skill] * (0.8 + R() * 0.5); }
    return out;
  }
  m.think -= dt; m.dodge -= dt;
  if (m.think <= 0) {
    m.think = SK.think[skill] * (0.7 + R() * 0.6);
    decide(w, p, m, skill);
  }
  const mag = hyp(m.mx, m.my);
  if (mag > 1e-3) { const s = Math.min(1, mag) * SK.mag[skill] / mag; out.x = m.mx * s; out.y = m.my * s; }
  if (m.wantA) { out.ap = out.a = true; m.wantA = false; }
  if (m.wantB) { out.bp = out.b = true; m.wantB = false; }
  return out;
}
function decide(w, p, m, skill) {
  const R = w.rng, st = stats(p), others = w.ps.filter(q => q !== p && !q.out);
  let mx = 0, my = 0;
  const go = (tx, ty, k) => { const dx = tx - p.x, dy = ty - p.y, d = hyp(dx, dy) || 1; mx += dx / d * k; my += dy / d * k; };
  const ed = edgeDist(w, p.x, p.y), e = edgeAt(w, p.x, p.y), vr = p.vx * e.nx + p.vy * e.ny;
  // 1) longe da borda quando está indo para fora rápido
  const danger = ed < SK.margin[skill] + Math.max(0, vr) * 0.35 * (skill + 1) / 2;
  if (danger && vr > -0.5) { mx -= e.nx * 2.5; my -= e.ny * 2.5; m.mx = mx; m.my = my; m.wantA = false; return; }
  // 2) fugir do peixe (a morsa cai ali) e de quem está com o Peso
  if (w.fish && skill >= 0) { const d = hyp(p.x - w.fish.x, p.y - w.fish.y); if (d < 3.3 && R() < 0.5 + skill * 0.25) { go(w.fish.x, w.fish.y, -1.6); go(CX, CY, 0.4); } }
  for (const q of others) if (q.pw === 'peso' && p.pw !== 'peso') { const d = hyp(p.x - q.x, p.y - q.y); if (d < 4) { go(q.x, q.y, -1.2 * (1 - d / 4) - 0.3); go(CX, CY, 0.3); } }
  // 3) investida vindo na minha direção: desvia ou contra-ataca
  if (m.dodge <= 0) {
    for (const q of others) {
      if (q.hang || (q.wind <= 0 && q.burst <= 0)) continue;
      const dx = p.x - q.x, dy = p.y - q.y, d = hyp(dx, dy);
      if (d > 3.6 || Math.abs(angDiff(q.cdir, Math.atan2(dy, dx))) > 0.5) continue;
      if (R() > SK.dodge[skill]) break;
      if (skill >= 2 && q.wind > 0 && p.meter >= CH_COST && d < 2.6) { m.mx = -dx; m.my = -dy; m.wantA = true; m.dodge = 0.4; return; }
      // de lado, para o lado de dentro
      let sx = -dy / d, sy = dx / d; if ((sx * (CX - p.x) + sy * (CY - p.y)) < 0) { sx = -sx; sy = -sy; }
      m.mx = sx * 2; m.my = sy * 2; m.dodge = 0.35; return;
    }
  }
  if (m.dodge > 0) return;   // mantém o desvio
  // 4) Gangorra: segura contra a ladeira
  if (w.cfg.tilt) { const t = hyp(w.tilt.x, w.tilt.y), k = [2, 4, 5][skill]; if (t > 0.1) { mx -= w.tilt.x * k; my -= w.tilt.y * k; } }
  // 5) Bombas: vai buscar se não tem; se tem, joga em quem está a 3,5–5,5
  if (w.cfg.bombs && p.bombs === 0 && w.picks.length) {
    let best = null, bd = 1e9; for (const b of w.picks) { const d = hyp(b.x - p.x, b.y - p.y); if (d < bd) { bd = d; best = b; } }
    if (best && bd < 6) { go(best.x, best.y, 1.2); m.mx = mx; m.my = my; return; }
  }
  // alvo: o mais perto, com bônus para quem está perto da borda (e para quem está pendurado)
  let tg = null, ts = 1e9;
  for (const q of others) {
    const d = hyp(q.x - p.x, q.y - p.y), s = d - (w.R - hyp(q.x - CX, q.y - CY)) * 0.6 - (q.hang ? 2 * skill : 0) + (q.slot === m.tg ? -0.8 : 0);
    if (s < ts) { ts = s; tg = q; }
  }
  if (!tg) { go(CX, CY, 1); m.mx = mx; m.my = my; return; }
  m.tg = tg.slot;
  const noise = (R() - 0.5) * 2 * SK.aim[skill];
  const lead = 0.12 + skill * 0.06, tx = tg.x + tg.vx * lead, ty = tg.y + tg.vy * lead;
  const dx = tx - p.x, dy = ty - p.y, d = hyp(dx, dy) || 1, aim = Math.atan2(dy, dx) + noise;
  // tiros (bomba/bola): mira e solta
  if ((p.bombs > 0 && d > 3.2 && d < 5.8) || (p.balls > 0 && d < 7)) {
    if (R() < 0.3 + skill * 0.3) { m.mx = Math.cos(aim); m.my = Math.sin(aim); m.wantB = true; return; }
  }
  if (p.pw === 'peso') { m.mx = Math.cos(aim); m.my = Math.sin(aim); if (d < SK.reach[skill] && p.meter >= CH_COST && R() < SK.chargeP[skill]) m.wantA = true; return; }
  // chega pelo lado de dentro: o empurrão sai para fora
  const ux0 = tg.x - CX, uy0 = tg.y - CY, ul = hyp(ux0, uy0) || 1, ux = ux0 / ul, uy = uy0 / ul;
  const align = (dx / d) * ux + (dy / d) * uy;   // 1 = estou bem atrás (do lado do centro)
  if (align < 0.55 && skill >= 1 && !tg.hang) {
    const ax = tg.x - ux * 1.8 + -uy * m.side * 0.6, ay = tg.y - uy * 1.8 + ux * m.side * 0.6;
    go(ax, ay, 1.2);
    // não passar por cima do alvo: desvia de lado se ele está no caminho
    if (d < 1.6) go(tg.x, tg.y, -0.8);
  } else {
    mx += Math.cos(aim) * 1.2; my += Math.sin(aim) * 1.2;
    const facing = Math.abs(angDiff(p.dir, aim)) < 0.6 || hyp(p.vx, p.vy) < 1.5;
    if (d < SK.reach[skill] * st.r / 0.55 + (tg.hang ? 0.6 : 0) && p.meter >= CH_COST && facing && R() < SK.chargeP[skill] && st.ch > 0) m.wantA = true;
  }
  if (tg.hang && ed < 1.6) { mx -= e.nx * 0.8; my -= e.ny * 0.8; }
  m.mx = mx; m.my = my;
}
function makeBot(w, slot) { if (w.ps[slot]) w.ps[slot].bot = true; }

// ---------- saídas ----------
function snapshot(w) {
  const D = w.disco;
  return {
    lv: w.level, R: r2(w.R), sd: w.sd ? 1 : 0, clock: w.sd || w.result ? null : Math.max(0, Math.ceil(SD_AT - w.t)),
    tx: r2(w.tilt.x), ty: r2(w.tilt.y),
    ps: w.ps.map(p => ({
      id: p.slot, x: r2(p.x), y: r2(p.y), dir: r2(p.dir), r: r2(stats(p).r), sp: r2(hyp(p.vx, p.vy)),
      out: p.out ? 1 : 0, oa: p.out ? r2(w.t - p.outAt) : 0, how: p.how,
      hg: p.hang > 0 ? r2(p.hang / HANG_TIME) : 0, cl: p.hang > 0 ? r2(Math.min(1, p.climb / need(p))) : 0,
      wd: p.wind > 0 ? 1 : 0, bu: p.burst > 0 ? 1 : 0, tu: p.tum > 0 ? 1 : 0, sn: p.stun > 0 ? 1 : 0, fl: p.flash > 0 ? 1 : 0,
      m: r2(p.meter), pw: p.pw, pt: p.pw ? Math.ceil(p.pt) : 0, bear: p.bear ? 1 : 0, bomb: p.bombs, ball: p.balls,
    })),
    walls: w.walls ? w.walls.slice() : null,
    disco: { x: r2(D.x), y: r2(D.y), st: D.st, tg: D.tg, pw: D.st === 'idle' ? null : D.pw, k: r2(D.k) },
    fish: w.fish ? { id: w.fish.id, x: r2(w.fish.x), y: r2(w.fish.y), k: r2(w.fish.k) } : null,
    walrus: w.walrus ? { id: w.walrus.id, x: r2(w.walrus.x), y: r2(w.walrus.y), z: r2(w.walrus.z), k: r2(w.walrus.k) } : null,
    picks: w.picks.map(b => ({ id: b.id, x: r2(b.x), y: r2(b.y) })),
    shots: w.shots.map(s => ({ id: s.id, k: s.k, x: r2(s.x), y: r2(s.y), z: r2(s.z), o: s.o })),
    alive: alive(w).length,
  };
}

function priv(w, slot) {
  const p = w.ps[slot]; if (!p) return {};
  const live = alive(w).length, s = Math.max(0, Math.ceil(p.pt));
  let status = 'VIVOS ' + live + '/' + w.ps.length, msg = '';
  if (p.pw) status = POWER_NAME[p.pw] + (p.pw === 'neve' ? '' : ' ' + s + 's');
  else if (!p.bear) status = 'A PÉ';
  else if (p.bombs) status = 'BOMBA NA MÃO';
  if (p.hang > 0) msg = 'PENDURADO! APERTE A';
  else if (p.pw === 'peso') msg = 'PESO ' + s + 's — PASSE ADIANTE!';
  else if (p.stun > 0) msg = 'ATORDOADO!';
  else if (p.pw === 'gelo') msg = 'CONGELADO!';
  else if (p.pw === 'raio' && s <= 3) msg = 'RAIO EM ' + s + 's!';
  else if (!p.bear && w.t - p.bearAt < 2) msg = 'SEM URSO!';
  else if (w.sd && w.t - SD_AT < 2.5) msg = 'O GELO ESTÁ QUEBRANDO!';
  return {
    status, bar: r2(p.meter), out: p.out, msg, hit: p.hits,
    outText: p.how === 'peso' ? 'Afundou com o Peso!' : p.how === 'boom' ? 'A bomba te tirou do jogo!' : 'Você caiu na água!',
    off: { a: !p.hang && (p.meter < CH_COST || stats(p).ch <= 0), b: !(p.bombs > 0 || p.balls > 0) },
  };
}

// guarda o último stick de cada um (a bola de neve curva para onde o dono aponta)
const rawStep = step;
function stepWithInputs(w, inputs, dt) {
  for (const p of w.ps) { const i = (inputs || [])[p.slot]; p.lastIn = i ? { x: num(i.x), y: num(i.y) } : null; }
  rawStep(w, inputs, dt);
}

module.exports = {
  levels: LEVELS, controls, create, step: stepWithInputs, bot, snapshot, private: priv, makeBot,
  // para os testes
  _: { stats, edgeDist, edgeAt, collide, CFG, SD_AT, HARD_END, CH_COST, HANG_TIME, CLIMB_NEED, WALL_N },
};
