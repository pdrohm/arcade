// Último de Pé — as duas variantes do mesmo jogo. Só roda no servidor.
// Tudo aqui é puro e determinístico: mesmas posições, mesmas miras e mesma semente dão sempre o
// mesmo resultado. O motor de rodadas (game.js) não sabe o que é pinguim nem revólver: ele chama
//   spawn(pids, raio, rnd)            posições do começo (ou do desempate)
//   prepare(corpos, raio, rodada, rnd) ajeita a arena antes de cada rodada
//   resolve(corpos, miras, raio, rnd)  resolve a execução simultânea e devolve { out, final, replay }
// e cuida do resto (fases, tempo, eliminação, desempate, vencedor).
'use strict';
const TAU = Math.PI * 2;
const r2 = n => Math.round(n * 100) / 100;
const r3 = n => Math.round(n * 1000) / 1000;
const norm = a => ((a % TAU) + TAU) % TAU;

// Semente → números "aleatórios" repetíveis (mulberry32).
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function seedOf(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function shuffle(list, rnd) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = out[i]; out[i] = out[j]; out[j] = t; }
  return out;
}

// Todo mundo numa roda, olhando para o centro. A ordem é sorteada: ninguém nasce sempre ao lado do mesmo.
function ring(pids, radius, rnd) {
  const order = shuffle(pids, rnd), n = order.length, off = rnd() * TAU;
  return order.map((pid, i) => {
    const a = off + i / n * TAU + (rnd() - .5) * (TAU / n) * .35;
    const d = radius * (.9 + rnd() * .2);
    const x = Math.cos(a) * d, y = Math.sin(a) * d;
    return { pid, x: r2(x), y: r2(y), face: r3(norm(Math.atan2(-y, -x))) };
  });
}

// ---------------------------------------------------------------------------------------------
// PINGUINS: todo mundo dá um dash ao mesmo tempo. Gelo escorrega, colisão empurra, quem sai do
// gelo cai na água. A física é exagerada de propósito (o empurrado sai mais rápido do que o
// empurrador chegou), mas sempre na direção da batida: a escolha de cada um decide o resultado.
// ---------------------------------------------------------------------------------------------
const P = {
  R0: 10, RMIN: 5.8, SHRINK: .9,   // raio do gelo: começa em 10 e derrete 10% por rodada
  PER: 1.1,                        // +1,1 de raio por pinguim acima de 4 (8 pinguins: 14,4)
  BODY: .9,                        // raio de um pinguim
  DASH: 15.5,                      // velocidade de saída do dash
  DAMP: 1.55, LIN: 1.6,            // atrito do gelo: exponencial + um pouco linear (para parar de vez)
  E: .86, BONUS: .2,               // restituição e o "exagero" que separa quem bateu
  SPIN: .75,                       // quanto do raspão vira giro
  DT: 1 / 60, EVERY: 2,            // passo da física e de quantos em quantos passos grava um quadro
  MAX_T: 3.4, LEAD: .5, TAIL: 1.15,
  POWER_MIN: .3, POWER_DEF: .8,    // força do dash: o dedo arrasta de 30% a 100%
};
// Até onde um dash sozinho escorrega com esta força (a mesma conta da simulação).
function reachFor(power) { let v = P.DASH * power, d = 0; while (v > 0) { d += v * P.DT; v = Math.max(0, v * Math.exp(-P.DAMP * P.DT) - P.LIN * P.DT); } return r2(d); }
// sem força informada = dash cheio (o motor de rodadas sempre informa; começa em POWER_DEF)
const clampPower = p => (Number.isFinite(p) ? Math.max(P.POWER_MIN, Math.min(1, p)) : 1);
const penguins = {
  id: 'penguins',
  R0: P.R0, BODY: P.BODY,
  power: true, POWER_MIN: P.POWER_MIN, POWER_DEF: P.POWER_DEF, clampPower,
  // alcance do dash por força (a seta do chão mostra até onde você vai): [[força, distância], …]
  reach: reachFor(1),
  reachTable: [.3, .4, .5, .6, .7, .8, .9, 1].map(p => [p, reachFor(p)]),
  // Arena do tamanho da turma: até 4 pinguins o gelo tem raio R0; cada um a mais soma PER.
  base: n => r2(P.R0 + Math.max(0, n - 4) * P.PER),
  radius(round, prev, tiebreak, base) {
    base = base || P.R0;
    if (tiebreak) return Math.max(prev, base * .85);
    return round <= 1 ? base : Math.max(base * P.RMIN / P.R0, r2(prev * P.SHRINK));
  },
  spawn(pids, radius, rnd) { return ring(pids, radius * .56, rnd); },
  // O gelo derreteu: quem ficou fora do novo contorno escorrega de volta para dentro.
  prepare(bodies, radius) {
    const lim = radius - P.BODY * 1.4;
    for (const b of bodies) {
      const d = Math.hypot(b.x, b.y);
      if (d > lim) { b.x = r2(b.x / d * lim); b.y = r2(b.y / d * lim); }
    }
    return bodies;
  },
  resolve(bodies, aims, radius, rnd, powers) {
    const n = bodies.length;
    const s = bodies.map(b => {
      const a = Number.isFinite(aims[b.pid]) ? aims[b.pid] : b.face;
      const v = P.DASH * clampPower(powers ? powers[b.pid] : undefined);
      return { pid: b.pid, x: b.x, y: b.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, face: a, spin: 0, fell: null };
    });
    const frames = [], hits = [], fall = {}, pairAt = {};
    const snap = () => { const f = []; for (const b of s) f.push(r2(b.x), r2(b.y), r3(b.face)); frames.push(f); };
    snap();
    let t = 0, step = 0;
    while (t < P.MAX_T) {
      t += P.DT; step++;
      for (const b of s) {
        b.x += b.vx * P.DT; b.y += b.vy * P.DT;
        const sp = Math.hypot(b.vx, b.vy);
        const next = Math.max(0, sp * Math.exp(-P.DAMP * P.DT) - (b.fell === null ? P.LIN * P.DT : 0));
        if (sp > 0) { b.vx *= next / sp; b.vy *= next / sp; }
        b.face += b.spin * P.DT; b.spin *= Math.exp(-2.6 * P.DT);
      }
      // colisões: só entre quem ainda está no gelo
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
        const a = s[i], b = s[j];
        if (a.fell !== null || b.fell !== null) continue;
        let dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
        if (d >= P.BODY * 2) continue;
        if (d < 1e-6) { const k = rnd() * TAU; dx = Math.cos(k); dy = Math.sin(k); d = 1e-6; }
        const nx = dx / d, ny = dy / d, over = P.BODY * 2 - d;
        a.x -= nx * over / 2; a.y -= ny * over / 2; b.x += nx * over / 2; b.y += ny * over / 2;
        const vrel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
        if (vrel <= 0) continue;
        // um pouco de acaso (semeado) em cada batida: nunca muda a direção, só o tamanho do tranco
        const e = P.E + (rnd() - .5) * .12;
        const imp = (1 + e) / 2 * vrel, push = imp * (1 + P.BONUS);
        a.vx -= nx * push; a.vy -= ny * push; b.vx += nx * push; b.vy += ny * push;
        // raspão vira giro: a parte tangencial da velocidade relativa
        const tx = -ny, ty = nx, vt = (a.vx - b.vx) * tx + (a.vy - b.vy) * ty;
        a.spin += vt * P.SPIN + (rnd() - .5) * 4; b.spin -= vt * P.SPIN + (rnd() - .5) * 4;
        const key = a.pid + '|' + b.pid;
        if (imp > 1.2 && !(pairAt[key] > t - .18)) {
          pairAt[key] = t;
          hits.push({ t: r3(t), x: r2(a.x + nx * P.BODY), y: r2(a.y + ny * P.BODY), s: r2(Math.min(1, imp / 14)), a: a.pid, b: b.pid });
        }
      }
      for (const b of s) if (b.fell === null && Math.hypot(b.x, b.y) > radius) { b.fell = t; fall[b.pid] = r3(t); }
      if (step % P.EVERY === 0) snap();
      const moving = s.some(b => b.fell === null && Math.hypot(b.vx, b.vy) > .05);
      const sinking = s.some(b => b.fell !== null && t - b.fell < .7);
      if (t > .3 && !moving && !sinking) break;
    }
    if (step % P.EVERY !== 0) snap();
    const out = s.filter(b => b.fell !== null).sort((a, b) => a.fell - b.fell).map(b => b.pid);
    const final = s.filter(b => b.fell === null).map(b => ({ pid: b.pid, x: r2(b.x), y: r2(b.y), face: r3(norm(b.face)) }));
    return {
      out, final,
      replay: { kind: 'dash', lead: P.LEAD, dt: r3(P.DT * P.EVERY), order: s.map(b => b.pid), frames, fall, hits, dur: r3(t + P.TAIL) },
    };
  },
};

// ---------------------------------------------------------------------------------------------
// TIROTEIO: todo mundo atira no mesmo instante. Um tiro é uma reta; acerta o primeiro corpo no
// caminho (o corpo segura a bala, mesmo que o dono dele também caia). Quem é acertado sai, e o
// próprio tiro dele sai do mesmo jeito: dois que se acertam caem juntos.
// ---------------------------------------------------------------------------------------------
const S = {
  R0: 11, RMIN: 6.6, SHRINK: .92, PER: 1.0,
  MOVE: 4.5, WALK: .45,            // escondido, cada um pode trocar de lugar até MOVE; no FOGO! corre até lá em WALK s
  BODY: 1.0, HIT: 1.08,            // raio do corpo (desenho) e do alvo (um tiquinho de folga)
  BULLET: 70,                      // unidades por segundo: rápido, mas dá para ver o traço
  GAP: 3.8,                        // distância mínima entre dois pistoleiros ao nascer
  LEAD: .6, TAIL: 1.35,
};
function scatter(pids, radius, rnd) {
  const pts = [], lim = radius * .8;
  for (const pid of shuffle(pids, rnd)) {
    let best = null, bestGap = -1;
    for (let k = 0; k < 80; k++) {
      const a = rnd() * TAU, d = Math.sqrt(rnd()) * lim;
      const x = Math.cos(a) * d, y = Math.sin(a) * d;
      const gap = pts.reduce((m, p) => Math.min(m, Math.hypot(p.x - x, p.y - y)), Infinity);
      if (gap >= S.GAP) { best = { x, y }; break; }
      if (gap > bestGap) { bestGap = gap; best = { x, y }; }
    }
    // Olha para um lado qualquer: a mira de verdade é escolhida escondido.
    pts.push({ pid, x: r2(best.x), y: r2(best.y), face: r3(rnd() * TAU) });
  }
  return pts;
}
// Distância, ao longo da reta, até o primeiro toque num círculo (ou null).
function rayCircle(ox, oy, dx, dy, cx, cy, r) {
  const mx = ox - cx, my = oy - cy, b = mx * dx + my * dy, c = mx * mx + my * my - r * r;
  if (c > 0 && b > 0) return null;
  const disc = b * b - c;
  if (disc < 0) return null;
  return Math.max(0, -b - Math.sqrt(disc));
}
function toEdge(ox, oy, dx, dy, radius) {
  const b = ox * dx + oy * dy, c = ox * ox + oy * oy - radius * radius;
  return Math.max(0, -b + Math.sqrt(Math.max(0, b * b - c)));
}
const shootout = {
  id: 'shootout',
  R0: S.R0, BODY: S.BODY, HIT: S.HIT, BULLET: S.BULLET,
  move: true, MOVE: S.MOVE,
  // destino pedido pelo celular → destino válido: no máximo MOVE de onde você estava e dentro da cerca
  clampMove(from, to, radius) {
    let x = Number(to.x), y = Number(to.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    let dx = x - from.x, dy = y - from.y, d = Math.hypot(dx, dy);
    if (d > S.MOVE) { x = from.x + dx / d * S.MOVE; y = from.y + dy / d * S.MOVE; }
    const lim = radius - S.BODY * 1.5, e = Math.hypot(x, y);
    if (e > lim) { x = x / e * lim; y = y / e * lim; }
    return { x: r2(x), y: r2(y) };
  },
  base: n => r2(S.R0 + Math.max(0, n - 4) * S.PER),
  radius(round, prev, tiebreak, base) {
    base = base || S.R0;
    if (tiebreak) return Math.max(prev, base * .85);
    return round <= 1 ? base : Math.max(base * S.RMIN / S.R0, r2(prev * S.SHRINK));
  },
  spawn(pids, radius, rnd) { return scatter(pids, radius, rnd); },
  // Todo round cada um nasce num lugar novo: o que vale é decorar ESTA rodada.
  // Sem MEMORIZE (keep), ninguém muda de lugar: só assim a memória da rodada anterior serve.
  prepare(bodies, radius, round, rnd, keep) {
    if (keep) {
      const lim = radius - S.BODY * 1.5;
      for (const b of bodies) { const d = Math.hypot(b.x, b.y); if (d > lim) { b.x = r2(b.x / d * lim); b.y = r2(b.y / d * lim); } }
      return bodies;
    }
    return scatter(bodies.map(b => b.pid), radius, rnd);
  },
  resolve(bodies0, aims, radius, rnd, powers, moves) {
    // primeiro todo mundo chega ao lugar novo; os tiros saem de lá
    const walk = {};
    const bodies = bodies0.map(b => {
      const m = moves && moves[b.pid];
      if (!m || (m.x === b.x && m.y === b.y)) return b;
      walk[b.pid] = [b.x, b.y, m.x, m.y];
      return Object.assign({}, b, { x: m.x, y: m.y });
    });
    const lead = S.LEAD + (Object.keys(walk).length ? S.WALK : 0);
    const shots = [], hitAt = {};
    for (const me of bodies) {
      const a = Number.isFinite(aims[me.pid]) ? aims[me.pid] : me.face;
      const dx = Math.cos(a), dy = Math.sin(a);
      const ox = me.x + dx * S.BODY * .9, oy = me.y + dy * S.BODY * .9;   // sai do cano, não do peito
      let hit = null, len = toEdge(ox, oy, dx, dy, radius + 4);
      for (const o of bodies) {
        if (o.pid === me.pid) continue;
        const d = rayCircle(ox, oy, dx, dy, o.x, o.y, S.HIT);
        if (d !== null && d < len) { len = d; hit = o.pid; }
      }
      shots.push({ pid: me.pid, x: r2(ox), y: r2(oy), a: r3(norm(a)), len: r2(len), hit });
      if (hit) { const t = r3(len / S.BULLET); if (!(hitAt[hit] <= t)) hitAt[hit] = t; }
    }
    const out = Object.keys(hitAt).sort((a, b) => hitAt[a] - hitAt[b] || (a < b ? -1 : 1));
    const final = bodies.filter(b => !Object.prototype.hasOwnProperty.call(hitAt, b.pid)).map(b => {
      const s = shots.find(x => x.pid === b.pid);
      return { pid: b.pid, x: b.x, y: b.y, face: s ? s.a : b.face };
    });
    const last = shots.reduce((m, s) => Math.max(m, s.len / S.BULLET), 0);
    return { out, final, replay: { kind: 'shot', lead, walk: S.WALK, moves: walk, speed: S.BULLET, shots, hitAt, dur: r3(Math.min(.5, last) + S.TAIL) } };
  },
};

const VARIANTS = { penguins, shootout };
module.exports = { VARIANTS, rng, seedOf, norm, TAU, rayCircle, toEdge };
