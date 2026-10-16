// Pogo Pandemonium: tabuleiro 8×8, cada um num pula-pula. Cair numa casa pinta da sua cor.
// O que vale no fim são os pontos guardados: pegar a caixa "!" troca as suas casas por pontos
// (e elas voltam a ficar brancas). No Pogo-a-Gogo não tem caixa: quem fecha um laço pontua.
// Só o servidor roda este arquivo (ver o contrato em shared/bash/engine.js).
'use strict';

const N = 8, CELLS = N * N, ROUND = 90;
const HOP = 0.2, HOP_FAST = 0.13, BOOTS = 6, LOCK = 8, STUN = 1.5;
const MISSILE_SPEED = 10, TNT_FUSE = 3, CRATE_FIRST = 3, CRATE_AGAIN = 2;
const DX = [1, 0, -1, 0], DY = [0, 1, 0, -1];          // 0 direita, 1 baixo, 2 esquerda, 3 cima
const STARTS = [[0, 0], [N - 1, 0], [0, N - 1], [N - 1, N - 1]];

const levels = [
  { id: 'painter', name: 'Pogo Painter', short: 'Pinte casas e pegue a caixa para guardar os pontos.',
    how: ['Pule nas casas para pintar da sua cor.', 'Pegue a caixa ! para trocar suas casas por pontos.', 'Setas pintam a fila inteira. Botas deixam mais rápido.', 'Míssil (A) deixa quem ele acerta tonto.', 'Só os pontos guardados contam no fim.'] },
  { id: 'gogo', name: 'Pogo-a-Gogo', short: 'Sem caixa: feche laços com a sua cor para pontuar.',
    how: ['Pinte um contorno fechado com a sua cor.', 'A borda do tabuleiro vale como parede sua.', 'Prenda 2 casas ou mais: cada uma vale 1 ponto.', 'Depois o laço apaga. Comece outro!', 'O míssil (A) sai para os 4 lados.'] },
  { id: 'loco', name: 'El Pogo Loco', short: 'O Doido joga dinamite. Laço fechado pinta tudo dentro.',
    how: ['Pinte casas e pegue a caixa ! para guardar pontos.', 'Fechou um laço? Tudo dentro vira da sua cor.', 'O Doido pula na borda e joga dinamite.', 'Dinamite explode em 3 s e apaga as casas em volta.', 'No fim ele também atira mísseis!'] },
  { id: 'padlock', name: 'Pogo Padlock', short: 'Pisou na própria cor? Perde tudo. O cadeado protege.',
    how: ['Pinte casas e pegue a caixa ! para guardar pontos.', 'Cuidado: pular na SUA cor apaga todas as suas casas.', 'O cadeado tranca suas casas por 8 s.', 'Míssil (A) acertou? Você ganha as casas da pessoa.'] },
];

const controls = () => ({ stick: 'grid', buttons: [{ id: 'a', label: 'MÍSSIL' }] });

const r2 = v => Math.round(v * 100) / 100;
const idx = (c, r) => r * N + c;
const inside = (c, r) => c >= 0 && r >= 0 && c < N && r < N;

// volta da borda (o Doido pula nela), no sentido horário
const RING = [];
for (let c = 0; c < N; c++) RING.push([c, 0]);
for (let r = 1; r < N; r++) RING.push([N - 1, r]);
for (let c = N - 2; c >= 0; c--) RING.push([c, N - 1]);
for (let r = N - 2; r >= 1; r--) RING.push([0, r]);

function create(entrants, opts) {
  const level = (opts && opts.level) || 'painter';
  const w = {
    level, time: 0, clock: ROUND, fx: [], result: null, seq: 1,
    tiles: new Array(CELLS).fill(-1),
    p: [], crate: null, crateT: level === 'gogo' ? Infinity : CRATE_FIRST,
    items: [], itemT: 3 + Math.random() * 2, missiles: [], tnt: [], npc: null,
  };
  for (const e of entrants) {
    const s = STARTS[e.slot] || STARTS[0];
    const p = { slot: e.slot, bot: !!e.bot, name: e.name, c: s[0], r: s[1], fc: s[0], fr: s[1], tc: s[0], tr: s[1],
      h: -1, dur: HOP, bounce: false, dir: e.slot < 2 ? 1 : 3, stun: 0, boots: 0, lock: 0, mis: false,
      sc: 0, hit: 0, note: '', noteT: 0, ai: null };
    w.p[e.slot] = p;
    w.tiles[idx(p.c, p.r)] = e.slot;
  }
  if (level === 'loco') w.npc = { k: 0, from: 0, to: 0, h: -1, way: 1, wait: 1.5, throwT: 3, shotT: 4 };
  return w;
}

const players = w => w.p.filter(Boolean);
const ownCount = (w, s) => { let n = 0; for (let i = 0; i < CELLS; i++) if (w.tiles[i] === s) n++; return n; };
// posição contínua (centro da casa = c + .5)
function pos(p) {
  if (p.h < 0) return [p.c + 0.5, p.r + 0.5];
  if (p.bounce) { const k = Math.sin(Math.PI * p.h) * 0.35; return [p.fc + 0.5 + (p.tc - p.fc) * k, p.fr + 0.5 + (p.tr - p.fr) * k]; }
  return [p.fc + 0.5 + (p.tc - p.fc) * p.h, p.fr + 0.5 + (p.tr - p.fr) * p.h];
}
function npcTile(w) { const n = w.npc; if (!n) return null; return RING[n.h >= 0 ? n.to : n.k]; }
// casa ocupada: onde alguém está ou para onde está pulando (o Doido também conta)
function claimed(w, c, r, except) {
  for (const p of players(w)) {
    if (p.slot === except) continue;
    if (p.c === c && p.r === r) return true;
    if (p.h >= 0 && !p.bounce && p.tc === c && p.tr === r) return true;
  }
  const n = w.npc;
  if (n && except !== 'npc') { const a = RING[n.k], b = RING[n.to]; if ((a[0] === c && a[1] === r) || (n.h >= 0 && b[0] === c && b[1] === r)) return true; }
  return false;
}
function note(p, text) { p.note = text; p.noteT = 1.6; }

function dirOf(inp) {
  const x = inp.x || 0, y = inp.y || 0;
  if (Math.max(Math.abs(x), Math.abs(y)) < 0.4) return -1;
  return Math.abs(x) >= Math.abs(y) ? (x > 0 ? 0 : 2) : (y > 0 ? 1 : 3);
}

// ---------- pintura, laços e banco ----------
function paint(w, p, i) {
  const t = w.tiles[i];
  if (t === p.slot) return false;
  if (t >= 0 && w.p[t] && w.p[t].lock > 0) return false;      // cadeado: ninguém repinta
  w.tiles[i] = p.slot;
  return true;
}
// Componentes de casas que não são suas (4 vizinhos). A borda conta como sua.
// Preso = não é o maior pedaço que sobrou e não tem ninguém dentro.
// diag: no Pogo-a-Gogo o contorno tem que ser fechado de verdade (vazamento na diagonal também conta)
function enclosed(w, s, min, diag) {
  const comp = new Array(CELLS).fill(-1), sizes = [], people = [];
  const stand = new Set();
  for (const p of players(w)) { stand.add(idx(p.c, p.r)); if (p.h >= 0 && !p.bounce) stand.add(idx(p.tc, p.tr)); }
  let k = 0;
  for (let i = 0; i < CELLS; i++) {
    if (w.tiles[i] === s || comp[i] >= 0) continue;
    const stack = [i]; comp[i] = k; let size = 0, who = false;
    while (stack.length) {
      const j = stack.pop(); size++; if (stand.has(j)) who = true;
      const c = j % N, r = (j / N) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if ((!dx && !dy) || (!diag && dx && dy)) continue;
        const nc = c + dx, nr = r + dy; if (!inside(nc, nr)) continue;
        const q = idx(nc, nr); if (w.tiles[q] === s || comp[q] >= 0) continue;
        comp[q] = k; stack.push(q);
      }
    }
    sizes.push(size); people.push(who); k++;
  }
  if (k < 2) return [];
  let big = 0; for (let j = 1; j < k; j++) if (sizes[j] > sizes[big]) big = j;
  const out = [];
  for (let i = 0; i < CELLS; i++) { const j = comp[i]; if (j >= 0 && j !== big && !people[j] && sizes[j] >= (min || 1)) out.push(i); }
  return out;
}
function checkLoop(w, p) {
  if (w.level !== 'gogo' && w.level !== 'loco') return;
  // Pogo-a-Gogo: bolso de 1 casa não conta (precisa ser um contorno de verdade)
  const inner = enclosed(w, p.slot, w.level === 'gogo' ? 2 : 1, w.level === 'gogo');
  if (!inner.length) return;
  const [x, y] = pos(p);
  if (w.level === 'gogo') {
    // casas presas viram pontos; o laço em volta (8 vizinhos) apaga
    const set = new Set(inner), wall = [];
    for (let i = 0; i < CELLS; i++) {
      if (w.tiles[i] !== p.slot) continue;
      const c = i % N, r = (i / N) | 0; let near = false;
      for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) if (inside(c + dx, r + dy) && set.has(idx(c + dx, r + dy))) { near = true; break; }
      if (near) wall.push(i);
    }
    for (const i of inner) w.tiles[i] = -1;
    for (const i of wall) w.tiles[i] = -1;
    p.sc += inner.length;
    note(p, 'LAÇO! +' + inner.length);
    w.fx.push({ k: 'loop', s: p.slot, n: inner.length, x: r2(x), y: r2(y), tl: inner, wl: wall });
  } else {
    for (const i of inner) w.tiles[i] = p.slot;
    note(p, 'LAÇO! +' + inner.length + ' CASAS');
    w.fx.push({ k: 'fill', s: p.slot, n: inner.length, x: r2(x), y: r2(y), tl: inner });
  }
}
function bank(w, p) {
  const tl = [];
  for (let i = 0; i < CELLS; i++) if (w.tiles[i] === p.slot) { tl.push(i); w.tiles[i] = -1; }
  p.sc += tl.length;
  note(p, tl.length ? '+' + tl.length + ' PONTOS!' : 'CAIXA VAZIA');
  w.fx.push({ k: 'bank', s: p.slot, n: tl.length, x: w.crate.c + 0.5, y: w.crate.r + 0.5, tl });
  w.crate = null; w.crateT = CRATE_AGAIN;
}
function arrowPaint(w, p, c, r, dirs) {
  let n = 0;
  for (const d of dirs) for (let k = 1; inside(c + DX[d] * k, r + DY[d] * k); k++) if (paint(w, p, idx(c + DX[d] * k, r + DY[d] * k))) n++;
  return n;
}

// ---------- pulo ----------
function startHop(w, p, d) {
  p.dir = d;
  const tc = p.c + DX[d], tr = p.r + DY[d];
  if (!inside(tc, tr)) return;
  p.fc = p.c; p.fr = p.r; p.tc = tc; p.tr = tr; p.h = 0; p.dur = p.boots > 0 ? HOP_FAST : HOP;
  p.bounce = claimed(w, tc, tr, p.slot);
  if (p.bounce) w.fx.push({ k: 'bump', x: r2(p.c + 0.5 + DX[d] * 0.45), y: r2(p.r + 0.5 + DY[d] * 0.45) });
}
function land(w, p) {
  p.h = -1;
  if (p.bounce) { p.bounce = false; p.tc = p.c; p.tr = p.r; return; }
  p.c = p.tc; p.r = p.tr;
  const i = idx(p.c, p.r);
  // dinamite: pisou, explodiu
  const bomb = w.tnt.find(t => t.c === p.c && t.r === p.r && t.fly <= 0);
  if (bomb) { bomb.t = 0; explodeDue(w); }
  if (w.level === 'padlock' && w.tiles[i] === p.slot && p.lock <= 0) {
    const tl = [];
    for (let j = 0; j < CELLS; j++) if (w.tiles[j] === p.slot) { tl.push(j); w.tiles[j] = -1; }
    p.hit++; note(p, 'PERDEU TUDO!');
    w.fx.push({ k: 'wipe', s: p.slot, n: tl.length, x: p.c + 0.5, y: p.r + 0.5, tl });
  } else paint(w, p, i);
  // item
  const it = w.items.findIndex(t => t.c === p.c && t.r === p.r);
  if (it >= 0) {
    const t = w.items[it]; w.items.splice(it, 1);
    if (t.k === 'boots') { p.boots = BOOTS; note(p, 'BOTAS!'); }
    else if (t.k === 'missile') p.mis = true;
    else if (t.k === 'lock') { p.lock = LOCK; note(p, 'CADEADO!'); }
    else if (t.k === 'arrow') arrowPaint(w, p, p.c, p.r, [t.d]);
    else if (t.k === 'arrow4') arrowPaint(w, p, p.c, p.r, [0, 1, 2, 3]);
    w.fx.push({ k: 'pick', s: p.slot, it: t.k, d: t.d, x: p.c + 0.5, y: p.r + 0.5 });
  }
  if (w.crate && w.crate.c === p.c && w.crate.r === p.r) bank(w, p);
  checkLoop(w, p);
}

// ---------- míssil, dinamite e o Doido ----------
function fire(w, owner, c, r, d) {
  w.missiles.push({ id: w.seq++, o: owner, x: c + 0.5, y: r + 0.5, d, life: N + 1 });
}
function stun(w, p, by) {
  if (p.stun > 0) return false;
  p.stun = STUN; p.hit++; note(p, 'TONTO!');
  return true;
}
function stepMissiles(w, dt) {
  for (let k = w.missiles.length - 1; k >= 0; k--) {
    const m = w.missiles[k], v = MISSILE_SPEED * dt;
    m.x += DX[m.d] * v; m.y += DY[m.d] * v; m.life -= v;
    let gone = m.life <= 0 || m.x < 0 || m.y < 0 || m.x > N || m.y > N;
    if (!gone) for (const p of players(w)) {
      if (p.slot === m.o) continue;
      const [x, y] = pos(p);
      if (Math.abs(x - m.x) < 0.5 && Math.abs(y - m.y) < 0.5) {
        gone = true;
        const fresh = stun(w, p, m.o);
        let steal = 0;
        // Pogo Padlock: quem atira leva todas as casas da vítima (mesmo com cadeado)
        if (w.level === 'padlock' && m.o >= 0 && w.p[m.o]) for (let i = 0; i < CELLS; i++) if (w.tiles[i] === p.slot) { w.tiles[i] = m.o; steal++; }
        if (steal) note(w.p[m.o], 'ROUBOU ' + steal + ' CASAS!');
        if (fresh || steal) w.fx.push({ k: 'hit', s: p.slot, by: m.o, x: r2(x), y: r2(y), steal });
        break;
      }
    }
    if (gone) w.missiles.splice(k, 1);
  }
}
function explodeDue(w) {
  let again = true;
  while (again) {
    again = false;
    for (let k = w.tnt.length - 1; k >= 0; k--) {
      const t = w.tnt[k]; if (t.fly > 0 || t.t > 0) continue;
      w.tnt.splice(k, 1); again = true;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const c = t.c + dx, r = t.r + dy; if (!inside(c, r)) continue;
        w.tiles[idx(c, r)] = -1;
        for (const o of w.tnt) if (o.c === c && o.r === r && o.fly <= 0) o.t = 0;   // reação em cadeia
      }
      for (const p of players(w)) {
        const [x, y] = pos(p);
        if (Math.abs(Math.floor(x) - t.c) <= 1 && Math.abs(Math.floor(y) - t.r) <= 1) stun(w, p, -1);
      }
      w.fx.push({ k: 'boom', x: t.c + 0.5, y: t.r + 0.5 });
    }
  }
}
function freeTile(w, avoidNear) {
  const free = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    if (claimed(w, c, r, null)) continue;
    if (w.crate && w.crate.c === c && w.crate.r === r) continue;
    if (w.items.some(t => t.c === c && t.r === r) || w.tnt.some(t => t.c === c && t.r === r)) continue;
    if (avoidNear && players(w).some(p => Math.abs(p.c - c) + Math.abs(p.r - r) < 2)) continue;
    free.push([c, r]);
  }
  return free.length ? free[(Math.random() * free.length) | 0] : null;
}
function spawnItem(w, kind) {
  const t = freeTile(w, false); if (!t) return;
  const it = { id: w.seq++, k: kind, c: t[0], r: t[1], ttl: 12, d: 0 };
  if (kind === 'arrow') {
    // a seta sempre aponta para o lado com mais casas pela frente
    const room = [N - 1 - t[0], N - 1 - t[1], t[0], t[1]], ok = [0, 1, 2, 3].filter(d => room[d] >= 3);
    it.d = ok.length ? ok[(Math.random() * ok.length) | 0] : room.indexOf(Math.max.apply(null, room));
  }
  w.items.push(it);
}
const ITEM_KINDS = {
  painter: ['boots', 'missile', 'arrow', 'arrow'],
  gogo: ['boots', 'missile', 'arrow', 'arrow4'],
  loco: ['boots', 'missile', 'arrow', 'arrow4'],
  padlock: ['boots', 'missile', 'lock', 'lock'],
};
function stepNpc(w, dt) {
  const n = w.npc; if (!n) return;
  if (n.h >= 0) {
    n.h += dt / 0.3;
    if (n.h >= 1) { n.h = -1; n.k = n.to; n.wait = 0.12 + Math.random() * 0.2; }
  } else if ((n.wait -= dt) <= 0) {
    if (Math.random() < 0.08) n.way = -n.way;
    let to = (n.k + n.way + RING.length) % RING.length;
    if (claimed(w, RING[to][0], RING[to][1], 'npc')) { n.way = -n.way; to = (n.k + n.way + RING.length) % RING.length; }
    if (!claimed(w, RING[to][0], RING[to][1], 'npc')) { n.from = n.k; n.to = to; n.h = 0; } else n.wait = 0.3;
  }
  // joga dinamite (às vezes uma seta de 4 lados)
  if ((n.throwT -= dt) <= 0) {
    n.throwT = 2.2 + Math.random() * 1.2;
    const at = RING[n.k];
    if (Math.random() < 0.22 && w.items.length < 3) { spawnItem(w, 'arrow4'); }
    else {
      const t = freeTile(w, true);
      if (t) { w.tnt.push({ id: w.seq++, c: t[0], r: t[1], t: TNT_FUSE, fly: 0.45, fx: at[0] + 0.5, fy: at[1] + 0.5 }); w.fx.push({ k: 'toss', x: at[0] + 0.5, y: at[1] + 0.5 }); }
    }
  }
  // fim da rodada: mísseis atravessando as filas
  if (w.clock < 30 && (n.shotT -= dt) <= 0 && n.h < 0) {
    n.shotT = 3.2 + Math.random();
    const [c, r] = RING[n.k], opts = [];
    if (r === 0) opts.push(1); if (r === N - 1) opts.push(3); if (c === 0) opts.push(0); if (c === N - 1) opts.push(2);
    const d = opts[(Math.random() * opts.length) | 0];
    fire(w, -1, c, r, d);
    w.fx.push({ k: 'fire', s: -1, x: c + 0.5, y: r + 0.5, d });
  }
}

// ---------- passo ----------
function step(w, inputs, dt) {
  w.time += dt;
  if (w.result) return;
  w.clock = Math.max(0, w.clock - dt);
  for (const p of players(w)) {
    const inp = inputs[p.slot] || {};
    if (p.stun > 0) p.stun = Math.max(0, p.stun - dt);
    if (p.boots > 0) p.boots = Math.max(0, p.boots - dt);
    if (p.lock > 0) p.lock = Math.max(0, p.lock - dt);
    if (p.noteT > 0 && (p.noteT -= dt) <= 0) p.note = '';
    const d = dirOf(inp);
    if (inp.ap && p.mis && p.stun <= 0) {
      const fd = d >= 0 ? d : p.dir; p.dir = fd; p.mis = false;
      const dirs = w.level === 'gogo' ? [0, 1, 2, 3] : [fd];
      for (const k of dirs) fire(w, p.slot, p.c, p.r, k);
      w.fx.push({ k: 'fire', s: p.slot, x: p.c + 0.5, y: p.r + 0.5, d: fd, all: dirs.length > 1 });
    }
    if (p.h >= 0) {
      p.h += dt / p.dur;
      if (p.h >= 1) land(w, p);
    } else if (p.stun <= 0 && d >= 0) startHop(w, p, d);
  }
  stepMissiles(w, dt);
  for (const t of w.tnt) { if (t.fly > 0) t.fly -= dt; else t.t -= dt; }
  explodeDue(w);
  stepNpc(w, dt);
  // caixa
  if (!w.crate && (w.crateT -= dt) <= 0) {
    const t = freeTile(w, true) || freeTile(w, false);
    if (t) { w.crate = { c: t[0], r: t[1] }; w.fx.push({ k: 'crate', x: t[0] + 0.5, y: t[1] + 0.5 }); }
  }
  // itens
  for (let k = w.items.length - 1; k >= 0; k--) if ((w.items[k].ttl -= dt) <= 0) w.items.splice(k, 1);
  if ((w.itemT -= dt) <= 0) {
    w.itemT = 4.5 + Math.random() * 2.5;
    if (w.items.length < 2) { const kinds = ITEM_KINDS[w.level]; spawnItem(w, kinds[(Math.random() * kinds.length) | 0]); }
  }
  if (w.clock <= 0) finish(w);
}
function finish(w) {
  const list = players(w), top = Math.max.apply(null, list.map(p => p.sc));
  const order = list.slice().sort((a, b) => b.sc - a.sc).map(p => p.slot);
  w.result = { winners: top > 0 ? list.filter(p => p.sc === top).map(p => p.slot) : [], order };
  w.fx.push({ k: 'end' });
}

// ---------- CPU ----------
// BFS na grade desviando de gente, dinamite e (no Padlock) da própria cor.
function bfs(w, p, block) {
  const dist = new Array(CELLS).fill(-1), first = new Array(CELLS).fill(-1), q = [idx(p.c, p.r)];
  dist[q[0]] = 0;
  for (let h = 0; h < q.length; h++) {
    const i = q[h], c = i % N, r = (i / N) | 0;
    for (let d = 0; d < 4; d++) {
      const nc = c + DX[d], nr = r + DY[d]; if (!inside(nc, nr)) continue;
      const j = idx(nc, nr); if (dist[j] >= 0 || block[j]) continue;
      dist[j] = dist[i] + 1; first[j] = h === 0 ? d : first[i]; q.push(j);
    }
  }
  return { dist, first };
}
// Pogo-a-Gogo: escolhe um retângulo pequeno para cercar (perto da borda sai barato)
function planLoop(w, p, skill) {
  let bestV = -1; const cands = [];
  for (let h = 2; h <= 3; h++) for (let wd = 2; wd <= 3; wd++) for (let r = 0; r + h <= N; r++) for (let c = 0; c + wd <= N; c++) {
    let bad = false; const inner = [];
    for (let y = r; y < r + h && !bad; y++) for (let x = c; x < c + wd; x++) {
      const i = idx(x, y); if (w.tiles[i] === p.slot) { bad = true; break; }
      if (players(w).some(o => (o.c === x && o.r === y))) { bad = true; break; }
      inner.push(i);
    }
    if (bad) continue;
    const wall = [], set = new Set(inner); let need = 0, near = 99;
    for (const i of inner) {
      const x = i % N, y = (i / N) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy; if ((!dx && !dy) || !inside(nx, ny)) continue;
        const j = idx(nx, ny); if (set.has(j) || wall.includes(j)) continue;
        wall.push(j); if (w.tiles[j] !== p.slot) { need++; near = Math.min(near, Math.abs(nx - p.c) + Math.abs(ny - p.r)); }
      }
    }
    const v = inner.length / (need + near * 0.5 + 1);
    cands.push({ v, inner, wall, t: 14 });
    if (v > bestV) bestV = v;
  }
  // só a CPU difícil acha sempre o melhor contorno; as outras escolhem um razoável qualquer
  const ok = cands.filter(x => x.v >= bestV * [0.25, 0.3, 0.9][skill]);
  return ok.length ? ok[(Math.random() * ok.length) | 0] : null;
}
function lineTarget(w, p) {
  // alguém na mesma linha ou coluna, perto o bastante? devolve a direção
  let best = -1, bd = 99;
  for (const o of players(w)) {
    if (o.slot === p.slot || o.stun > 0) continue;
    const [x, y] = pos(o), oc = Math.floor(x), or = Math.floor(y);
    let d = -1, k = 99;
    if (or === p.r && oc !== p.c) { d = oc > p.c ? 0 : 2; k = Math.abs(oc - p.c); }
    else if (oc === p.c && or !== p.r) { d = or > p.r ? 1 : 3; k = Math.abs(or - p.r); }
    if (d >= 0 && k < bd && k <= 6) { bd = k; best = d; }
  }
  return best;
}
function bot(w, slot, skill, dt) {
  const p = w.p[slot], out = { x: 0, y: 0, a: false, b: false, c: false, ap: false, bp: false, cp: false, ar: false, br: false, cr: false };
  if (!p || w.result) return out;
  const ai = p.ai || (p.ai = { t: Math.random() * 0.3, dir: -1, plan: null, aimT: 0 });
  ai.t -= dt;
  // míssil: alinhou com alguém, atira
  if (p.mis && p.stun <= 0) {
    const d = w.level === 'gogo' ? (lineTarget(w, p) >= 0 ? p.dir : -1) : lineTarget(w, p);
    if (d >= 0) { ai.aimT += dt; if (ai.aimT > [0.9, 0.35, 0.08][skill]) { ai.aimT = 0; out.ap = out.a = true; out.x = DX[d]; out.y = DY[d]; return out; } }
    else ai.aimT = 0;
  }
  if (p.h >= 0 || p.stun > 0) { if (ai.dir >= 0) { out.x = DX[ai.dir]; out.y = DY[ai.dir]; } return out; }
  if (ai.t > 0) return out;
  ai.t = [0.32, 0.1, 0.02][skill] + Math.random() * [0.3, 0.08, 0.03][skill];
  ai.dir = think(w, p, skill);
  if (ai.dir >= 0) { out.x = DX[ai.dir]; out.y = DY[ai.dir]; }
  return out;
}
function think(w, p, skill) {
  if (skill === 0 && Math.random() < 0.18) return (Math.random() * 4) | 0;
  const block = new Array(CELLS).fill(false);
  for (const o of players(w)) if (o.slot !== p.slot) { block[idx(o.c, o.r)] = true; if (o.h >= 0) block[idx(o.tc, o.tr)] = true; }
  const nt = npcTile(w); if (nt) block[idx(nt[0], nt[1])] = true;
  if (w.npc) { const a = RING[w.npc.k]; block[idx(a[0], a[1])] = true; }
  for (const t of w.tnt) {
    if (t.fly > 0 && skill === 0) continue;
    block[idx(t.c, t.r)] = true;
    if (skill > 0 && t.t < 1.3) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (inside(t.c + dx, t.r + dy)) block[idx(t.c + dx, t.r + dy)] = true;
  }
  const lockedOwn = w.level === 'padlock' && p.lock <= 0;
  if (lockedOwn) for (let i = 0; i < CELLS; i++) if (w.tiles[i] === p.slot) block[i] = true;
  let inner = null;
  if (w.level === 'gogo') {
    const pl = p.ai.plan;
    if (pl) pl.t -= 0.2;
    if (!pl || pl.t <= 0 || pl.inner.some(i => w.tiles[i] === p.slot) || pl.wall.every(i => w.tiles[i] === p.slot)) p.ai.plan = planLoop(w, p, skill);
    if (p.ai.plan) { inner = new Set(p.ai.plan.inner); for (const i of inner) if (i !== idx(p.c, p.r)) block[i] = true; }
  }
  block[idx(p.c, p.r)] = false;
  const { dist, first } = bfs(w, p, block);
  const mine = ownCount(w, p.slot);
  const noise = skill === 0 ? 0.6 : skill === 1 ? 0.25 : 0.08;
  let best = -1, bestV = 0;
  for (let i = 0; i < CELLS; i++) {
    const d = dist[i]; if (d <= 0) continue;
    const c = i % N, r = (i / N) | 0, t = w.tiles[i];
    let v = 0;
    if (w.level === 'gogo') {
      if (p.ai.plan && p.ai.plan.wall.includes(i) && t !== p.slot) v = 3;
      else if (t >= 0 && t !== p.slot) {
        // casa de outro no meio de um contorno: quebrar o laço dele
        let same = 0;
        for (let k = 0; k < 4; k++) { const nc = c + DX[k], nr = r + DY[k]; if (inside(nc, nr) && w.tiles[idx(nc, nr)] === t) same++; }
        v = same >= 2 ? [0.6, 3, 2.8][skill] : 0.4;
      } else if (t !== p.slot) v = 0.15;
    } else {
      if (t === -1) v = 1; else if (t !== p.slot) v = (w.p[t] && w.p[t].lock > 0) ? 0 : 1.25;
      // pintar em bloco: vizinhos que ainda não são seus
      if (v > 0) for (let k = 0; k < 4; k++) { const nc = c + DX[k], nr = r + DY[k]; if (inside(nc, nr) && w.tiles[idx(nc, nr)] !== p.slot) v += 0.12; }
    }
    if (w.crate && w.crate.c === c && w.crate.r === r) {
      const need = w.clock < 12 ? 1 : [11, 8, 6][skill];
      if (mine >= need) {
        v = mine * 1.4 + 4;
        // alguém chega antes? então vale menos
        for (const o of players(w)) if (o.slot !== p.slot && Math.abs(o.c - c) + Math.abs(o.r - r) < d - 1) { v *= 0.45; break; }
      } else v = Math.max(v, 0.5);
    }
    const it = w.items.find(x => x.c === c && x.r === r);
    if (it) {
      if (it.k === 'boots') v += p.boots > 0 ? 0.5 : 3;
      else if (it.k === 'missile') v += p.mis ? 0.3 : 3.5;
      else if (it.k === 'lock') v += p.lock > 0 ? 0.5 : 3 + mine * 0.25;
      else {
        const dirs = it.k === 'arrow4' ? [0, 1, 2, 3] : [it.d]; let n = 0;
        for (const dd of dirs) for (let k = 1; inside(c + DX[dd] * k, r + DY[dd] * k); k++) if (w.tiles[idx(c + DX[dd] * k, r + DY[dd] * k)] !== p.slot) n++;
        v += n * (w.level === 'gogo' ? 0.35 : 0.8);
      }
    }
    v = v * (1 - noise / 2 + Math.random() * noise) / (1 + d * 0.65);
    if (v > bestV) { bestV = v; best = i; }
  }
  if (best >= 0) return first[best];
  // nada que valha: um passo qualquer que não seja proibido
  const opts = [], last = [];
  for (let d = 0; d < 4; d++) {
    const c = p.c + DX[d], r = p.r + DY[d]; if (!inside(c, r)) continue;
    if (!block[idx(c, r)]) opts.push(d);
    else if (!claimed(w, c, r, p.slot) && !w.tnt.some(t => t.c === c && t.r === r)) last.push(d);
  }
  if (opts.length) return opts[(Math.random() * opts.length) | 0];
  // cercado pela própria cor (Padlock): melhor perder as casas do que ficar parado para sempre
  return last.length ? last[(Math.random() * last.length) | 0] : -1;
}
function makeBot(w, slot) { if (w.p[slot]) { w.p[slot].bot = true; w.p[slot].ai = null; } }

// ---------- o que sai do servidor ----------
function snapshot(w) {
  let g = '';
  for (let i = 0; i < CELLS; i++) g += w.tiles[i] < 0 ? '.' : String(w.tiles[i]);
  const n = w.npc;
  let npc = null;
  if (n) {
    const a = RING[n.h >= 0 ? n.from : n.k], b = RING[n.h >= 0 ? n.to : n.k], k = n.h >= 0 ? n.h : 0;
    npc = { id: 'npc', x: r2(a[0] + 0.5 + (b[0] - a[0]) * k), y: r2(a[1] + 0.5 + (b[1] - a[1]) * k), z: r2(Math.sin(Math.PI * k) * 0.7), dir: r2(b[0] > a[0] ? 0 : b[0] < a[0] ? Math.PI : b[1] > a[1] ? Math.PI / 2 : -Math.PI / 2), aim: w.clock < 30 ? 1 : 0 };
  }
  return {
    lv: w.level, clock: r2(w.clock), g,
    p: players(w).map(p => {
      const [x, y] = pos(p);
      return { id: p.slot, x: r2(x), y: r2(y), d: p.dir, tx: p.h >= 0 ? p.tc : p.c, ty: p.h >= 0 ? p.tr : p.r, hop: p.h >= 0 && !p.bounce ? 1 : 0,
        st: p.stun > 0 ? 1 : 0, bt: p.boots > 0 ? 1 : 0, lk: r2(p.lock), ms: p.mis ? 1 : 0, sc: p.sc, n: ownCount(w, p.slot) };
    }),
    crate: w.crate ? { x: w.crate.c + 0.5, y: w.crate.r + 0.5 } : null,
    it: w.items.map(t => ({ id: t.id, k: t.k, x: t.c + 0.5, y: t.r + 0.5, d: t.d, ttl: r2(t.ttl) })),
    ms: w.missiles.map(m => ({ id: m.id, x: r2(m.x), y: r2(m.y), d: m.d, o: m.o })),
    tnt: w.tnt.map(t => {
      if (t.fly > 0) { const k = 1 - t.fly / 0.45; return { id: t.id, x: r2(t.fx + (t.c + 0.5 - t.fx) * k), y: r2(t.fy + (t.r + 0.5 - t.fy) * k), z: r2(Math.sin(Math.PI * k) * 2.2), t: TNT_FUSE, fly: 1 }; }
      return { id: t.id, x: t.c + 0.5, y: t.r + 0.5, z: 0, t: r2(t.t), fly: 0 };
    }),
    npc,
  };
}
function priv(w, slot) {
  const p = w.p[slot]; if (!p) return {};
  const own = ownCount(w, slot);
  let msg = '';
  if (p.note) msg = p.note;
  else if (p.stun > 0) msg = 'TONTO!';
  else if (p.mis) msg = 'MÍSSIL! APERTE A';
  else if (p.lock > 0) msg = 'CADEADO ' + Math.ceil(p.lock) + 's';
  else if (p.boots > 0) msg = 'BOTAS ' + Math.ceil(p.boots) + 's';
  return { status: p.sc + ' PTS' + (w.level === 'gogo' ? '' : ' · ' + own + ' CASAS'), msg, hit: p.hit, off: { a: !p.mis } };
}

module.exports = { levels, controls, create, step, bot, snapshot, private: priv, makeBot,
  _t: { N, idx, enclosed, pos, claimed, land, startHop, bank, RING, HOP, HOP_FAST, STUN, ROUND, explodeDue } };
