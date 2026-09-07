'use strict';
// Renderizador 2.5D do KART em Canvas 2D: pista, cenário, karts, partículas e HUD, no espírito dos
// jogos de corrida de console dos anos 90. Recebe o estado do jogo e só desenha; não conhece regra.
//
//   estado do jogo → simulação (servidor) → projeção 2.5D (aqui) → Canvas 2D
//
// Roda na TV — inclusive a antiga (Chrome 47) — por isso fica em ES5, sem WebGL e sem alocar
// dentro do laço de quadro (as listas e vetores abaixo são reaproveitados).
(function () {
  var W = window.KartWorld, SP = window.KartSprites;
  var INK = '#1b1035', CREAM = '#fff1c9', YEL = '#ffd23f', COR = '#ff5e5b', MINT = '#45e0a5', SKY = '#4fc3f7', GRAPE = '#7c5cff', LILAC = '#c9b8ff';
  var FONT = '"Arial Rounded MT Bold","Nunito","Varela Round","Segoe UI",system-ui,sans-serif';
  var NEAR = 1.5, FAR = 170, TAU = Math.PI * 2, BASE_RES = 960;
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function angle(a) { return Math.atan2(Math.sin(a), Math.cos(a)); }
  function rng(seed) { var s = seed >>> 0 || 1; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function upper(s) { return String(s == null ? '' : s).toUpperCase(); }
  // ---- quadros do servidor (20 Hz) interpolados 75 ms atrás do mais novo -------------------------
  function SnapshotBuffer() { this.samples = []; }
  SnapshotBuffer.prototype.push = function (world) {
    if (!world || (this.samples.length && this.samples[this.samples.length - 1].world === world)) return;
    this.samples.push({ at: performance.now(), world: world }); if (this.samples.length > 6) this.samples.shift();
  };
  SnapshotBuffer.prototype.read = function (now) {
    if (!this.samples.length) return null;
    var t = now - 75, a = this.samples[0], b = a, i, s;
    for (i = 0; i < this.samples.length; i++) { s = this.samples[i]; if (s.at <= t) a = s; if (s.at >= t) { b = s; break; } b = s; }
    var f = clamp((t - a.at) / Math.max(1, b.at - a.at), 0, 1), out = { world: b.world, karts: [] };
    for (i = 0; i < b.world.karts.length; i++) {
      var k = b.world.karts[i], old = null, j;
      for (j = 0; j < a.world.karts.length; j++) if (a.world.karts[j].pid === k.pid) { old = a.world.karts[j]; break; }
      if (!old || Math.hypot(k.x - old.x, k.z - old.z) > 20) { out.karts.push({ k: k, x: k.x, y: k.y, z: k.z, heading: k.heading, turn: 0 }); continue; }
      var turn = angle(k.heading - old.heading);
      out.karts.push({ k: k, x: lerp(old.x, k.x, f), y: lerp(old.y, k.y, f), z: lerp(old.z, k.z, f), heading: old.heading + turn * f, turn: turn * 20 });
    }
    return out;
  };
  // ---- câmera por jogador ---------------------------------------------------------------------------
  function Camera() { this.x = 0; this.y = 5; this.z = 0; this.h = 0; this.zoom = 1; this.fresh = true; this.shake = 0; }
  Camera.prototype.follow = function (t, dt, boost) {
    var s = Math.sin(t.heading), c = Math.cos(t.heading), drift = t.k && t.k.driftDir ? t.k.driftDir : 0;
    var tx = t.x - s * 12, tz = t.z - c * 12, ty = t.y + 3.9, th = t.heading + drift * .22, zoom = boost ? .9 : 1;
    if (this.fresh || Math.hypot(tx - this.x, tz - this.z) > 40) { this.x = tx; this.y = ty; this.z = tz; this.h = th; this.zoom = zoom; this.fresh = false; return; }
    var k = 1 - Math.exp(-dt * 28), kh = 1 - Math.exp(-dt * 7);
    this.x = lerp(this.x, tx, k); this.z = lerp(this.z, tz, k); this.y = lerp(this.y, ty, 1 - Math.exp(-dt * 5));
    this.h += angle(th - this.h) * kh; this.zoom = lerp(this.zoom, zoom, 1 - Math.exp(-dt * 4));
    this.shake = Math.max(0, this.shake - dt);
  };
  // ---- partículas: pool fixo, quadradinhos e estrelas ------------------------------------------------
  function Particles(n) { this.items = []; this.cursor = 0; for (var i = 0; i < n; i++) this.items.push({ life: 0, max: 1, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, g: 0, size: 1, grow: 0, col: '#fff', star: false }); }
  Particles.prototype.emit = function (x, y, z, o) {
    var p = null, i, c;
    for (i = 0; i < this.items.length; i++) { c = this.items[(this.cursor + i) % this.items.length]; if (c.life <= 0) { p = c; this.cursor = (this.cursor + i + 1) % this.items.length; break; } }
    if (!p) { p = this.items[this.cursor]; this.cursor = (this.cursor + 1) % this.items.length; }
    p.x = x; p.y = y; p.z = z; p.life = p.max = o.life || .5; p.vx = o.vx || 0; p.vy = o.vy || 0; p.vz = o.vz || 0; p.g = o.g || 0; p.size = o.size || .5; p.grow = o.grow || 0; p.col = o.col || '#fff'; p.star = !!o.star;
  };
  Particles.prototype.burst = function (x, y, z, n, o) { for (var i = 0; i < n; i++) { var a = Math.random() * TAU, sp = (o.speed || 6) * (.4 + Math.random() * .6); this.emit(x, y, z, { life: o.life, vx: Math.cos(a) * sp, vz: Math.sin(a) * sp, vy: (o.up || 4) * (.5 + Math.random()), g: o.g, size: (o.size || .5) * (.7 + Math.random() * .6), grow: o.grow, col: o.cols ? o.cols[i % o.cols.length] : o.col, star: o.star }); } };
  Particles.prototype.update = function (dt) { for (var i = 0; i < this.items.length; i++) { var p = this.items[i]; if (p.life <= 0) continue; p.life -= dt; p.vy -= p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; } };
  // ---- o renderizador ---------------------------------------------------------------------------------
  function Renderer(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.buffer = new SnapshotBuffer(); this.cams = {}; this.alive = true;
    this.time = 0; this.last = performance.now(); this.res = BASE_RES; this.cost = 0; this.frames = 0; this.g = null; this.mode = null; this.matchId = null;
    this.particles = new Particles(160); this.seen = {}; this.seenCount = 0; this.kartSprites = {}; this.prev = {}; this.flash = {}; this.attract = 0;
    this.items = []; this.itemCount = 0; this.order = []; this.groundOrder = []; this.scratch = new Float64Array(64); this.clipA = new Float64Array(64); this.clipB = new Float64Array(64);
    this.star = SP.star(); this.checker = SP.checker(); this.itembox = SP.itembox(); this.rocket = SP.rocket(); this.bomb = SP.bomb(); this.mine = SP.mine(); this.pole = SP.pole();
    this.trees = [SP.tree(0), SP.tree(1), SP.tree(2)]; this.bushes = [SP.bush(0), SP.bush(1), SP.bush(2)]; this.gradients = {};
    var self = this; this.loop = function (now) { self.animate(now); }; this.raf = requestAnimationFrame(this.loop);
    this.compare = function (a, b) { return self.items[b].z - self.items[a].z; };
    this.compareGround = function (a, b) { return self.ground[b].zc - self.ground[a].zc; };
  }
  Renderer.prototype.dispose = function () { this.alive = false; cancelAnimationFrame(this.raf); };
  Renderer.prototype.update = function (g) { if (!g) return; if (g.matchId !== this.matchId || g.mode !== this.mode) this.build(g); this.g = g; if (g.world) this.buffer.push(g.world); };
  // ---- montagem do mundo (uma vez por partida): polígonos de chão, cenário e listas fixas -------------
  Renderer.prototype.poly = function (pts, color, alt) {
    var n = pts.length / 3, cx = 0, cy = 0, cz = 0, i, r = 0;
    for (i = 0; i < n; i++) { cx += pts[i * 3]; cy += pts[i * 3 + 1]; cz += pts[i * 3 + 2]; }
    cx /= n; cy /= n; cz /= n;
    for (i = 0; i < n; i++) r = Math.max(r, Math.hypot(pts[i * 3] - cx, pts[i * 3 + 2] - cz));
    return { p: pts, n: n, c: color, alt: alt || null, cx: cx, cy: cy, cz: cz, r: r, zc: 0, seam: true };
  };
  Renderer.prototype.quad = function (a, b, c, d, color, alt) { return this.poly([a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z, d.x, d.y, d.z], color, alt); };
  Renderer.prototype.build = function (g) {
    var map = W.map(g.mode), race = g.mode === 'race', theme = map.theme, r = rng(race ? 11 : 23), i, j, p;
    this.mode = g.mode; this.matchId = g.matchId; this.map = map; this.theme = theme; this.buffer = new SnapshotBuffer(); this.cams = {}; this.seen = {}; this.seenCount = 0; this.prev = {}; this.flash = {}; this.gradients = {};
    this.ground = []; this.walls = []; this.props = []; this.fog = {}; this.banner = null;
    this.panorama = SP.panorama(theme, 1024, 150); this.cloudLayer = SP.clouds(1024, 110);
    var ground = this.ground, walls = this.walls, props = this.props, self = this;
    function box(x, y, z, w, h, d, top, side) {   // caixa: tampa (chão) + quatro lados (verticais, escolhidos por quadro)
      var hw = w / 2, hd = d / 2;
      ground.push(self.poly([x - hw, y + h, z - hd, x + hw, y + h, z - hd, x + hw, y + h, z + hd, x - hw, y + h, z + hd], top));
      walls.push({ p: self.poly([x - hw, y, z - hd, x + hw, y, z - hd, x + hw, y + h, z - hd, x - hw, y + h, z - hd], side), nx: 0, nz: -1 });
      walls.push({ p: self.poly([x + hw, y, z + hd, x - hw, y, z + hd, x - hw, y + h, z + hd, x + hw, y + h, z + hd], side), nx: 0, nz: 1 });
      walls.push({ p: self.poly([x - hw, y, z + hd, x - hw, y, z - hd, x - hw, y + h, z - hd, x - hw, y + h, z + hd], side), nx: -1, nz: 0 });
      walls.push({ p: self.poly([x + hw, y, z - hd, x + hw, y, z + hd, x + hw, y + h, z + hd, x + hw, y + h, z - hd], side), nx: 1, nz: 0 });
    }
    if (race) {
      for (i = 0; i < 96; i++) {
        var t0 = i / 96, t1 = (i + 1) / 96, alt = i % 2;
        // faixas de grama (largas, alternadas: é o que dá sensação de velocidade), asfalto, zebras e a linha do meio
        var cen = W.point(t0), outL = Math.hypot(W.point(t0, -20).x, W.point(t0, -20).z) > Math.hypot(cen.x, cen.z), reachL = outL ? 120 : 30, reachR = outL ? 30 : 120;
        ground.push(this.quad(W.point(t0, -9.6), W.point(t0, -reachL), W.point(t1, -reachL), W.point(t1, -9.6), theme.far[alt]));
        ground.push(this.quad(W.point(t0, 9.6), W.point(t0, reachR), W.point(t1, reachR), W.point(t1, 9.6), theme.far[alt]));
        ground.push(this.quad(W.point(t0, -8), W.point(t0, 8), W.point(t1, 8), W.point(t1, -8), theme.road[alt]));
        ground.push(this.quad(W.point(t0, -9.6), W.point(t0, -8), W.point(t1, -8), W.point(t1, -9.6), theme.rumble[alt]));
        ground.push(this.quad(W.point(t0, 8), W.point(t0, 9.6), W.point(t1, 9.6), W.point(t1, 8), theme.rumble[alt]));
        if (alt === 0 && i > 1) ground.push(this.quad(W.point(t0 + .002, -.22), W.point(t0 + .002, .22), W.point(t1 - .002, .22), W.point(t1 - .002, -.22), theme.line));
      }
      for (i = 0; i < 8; i++) ground.push(this.quad(W.point(0, -8 + i * 2), W.point(0, -6 + i * 2), W.point(.005, -6 + i * 2), W.point(.005, -8 + i * 2), i % 2 ? CREAM : INK));
      for (i = 0; i < 8; i++) ground.push(this.quad(W.point(.005, -8 + i * 2), W.point(.005, -6 + i * 2), W.point(.01, -6 + i * 2), W.point(.01, -8 + i * 2), i % 2 ? INK : CREAM));
      var g0 = W.point(0, -10.6), g1 = W.point(0, 10.6);
      props.push({ spr: this.pole, x: g0.x, y: g0.y, z: g0.z, f: 0 }, { spr: this.pole, x: g1.x, y: g1.y, z: g1.z, f: 0 });
      this.banner = this.poly([g0.x, g0.y + 10.4, g0.z, g1.x, g1.y + 10.4, g1.z, g1.x, g1.y + 12, g1.z, g0.x, g0.y + 12, g0.z], 'checker');
      for (i = 0; i < 110; i++) { var side = r() > .5 ? 1 : -1, tp = r(), off = side * (13 + r() * 26); p = W.point(tp, off); if (off * side > 33 && r() < .5) continue; props.push({ spr: this.trees[i % 3], x: p.x, y: p.y, z: p.z, f: 0 }); }
      for (i = 0; i < 64; i++) { p = W.point(i / 64 + r() * .006, (i % 2 ? 1 : -1) * (11.2 + r() * .8)); props.push({ spr: this.bushes[i % 3], x: p.x, y: p.y, z: p.z, f: 0 }); }
      for (i = 0; i < 18; i++) { var ang = r() * TAU, d = 4 + r() * 16; props.push({ spr: this.trees[i % 3], x: Math.sin(ang) * d, y: W.nearest(Math.sin(ang) * d, Math.cos(ang) * d * .6).y, z: Math.cos(ang) * d * .6, f: 0 }); }
      for (i = 0; i < map.shortcuts.length; i++) { var sc = map.shortcuts[i], sy = W.nearest(sc.x, sc.z).y + .05; ground.push(this.poly([sc.x - sc.width / 2, sy, sc.z - sc.depth / 2, sc.x + sc.width / 2, sy, sc.z - sc.depth / 2, sc.x + sc.width / 2, sy, sc.z + sc.depth / 2, sc.x - sc.width / 2, sy, sc.z + sc.depth / 2], '#e8cf8f')); }
    } else {
      for (i = -5; i <= 5; i++) for (j = -5; j <= 5; j++) ground.push(this.poly([i * 10 - 5, 0, j * 10 - 5, i * 10 + 5, 0, j * 10 - 5, i * 10 + 5, 0, j * 10 + 5, i * 10 - 5, 0, j * 10 + 5], theme.road[(i + j) & 1]));
      for (i = -12; i <= 12; i++) for (j = -12; j <= 12; j++) { if (Math.abs(i) <= 5 && Math.abs(j) <= 5) continue; if (Math.abs(i) > 5 && Math.abs(j) > 5 && (i + j) & 1) continue; ground.push(this.poly([i * 10 - 5, -.02, j * 10 - 5, i * 10 + 5, -.02, j * 10 - 5, i * 10 + 5, -.02, j * 10 + 5, i * 10 - 5, -.02, j * 10 + 5], theme.far[(i + j) & 1])); }
      for (i = 0; i < map.barriers.length; i++) { var b = map.barriers[i], along = b.width >= b.depth, span = along ? b.width : b.depth, pieces = Math.max(1, Math.round(span / 10)), piece = span / pieces;
        for (j = 0; j < pieces; j++) { var off = -span / 2 + piece * (j + .5); box(along ? b.x + off : b.x, b.y || 0, along ? b.z : b.z + off, along ? piece : b.width, b.height, along ? b.depth : piece, '#f2eeff', '#d8d2f2'); } }
      for (i = 0; i < map.hazards.length; i++) { var h = map.hazards[i], pts = [], pts2 = []; for (j = 0; j < 14; j++) { var a = j / 14 * TAU; pts.push(h.x + Math.cos(a) * (h.radius + .8), .03, h.z + Math.sin(a) * (h.radius + .8)); pts2.push(h.x + Math.cos(a) * h.radius, .04, h.z + Math.sin(a) * h.radius); } ground.push(this.poly(pts, '#5b4a7a')); ground.push(this.poly(pts2, '#ff7a3d', '#ffb347')); }
      for (i = 0; i < 40; i++) { var an = r() * TAU, dd = 64 + r() * 40; props.push({ spr: this.trees[i % 3], x: Math.sin(an) * dd, y: 0, z: Math.cos(an) * dd, f: 0 }); }
      for (i = 0; i < 24; i++) { var an2 = r() * TAU, d2 = 60 + r() * 20; props.push({ spr: this.bushes[i % 3], x: Math.sin(an2) * d2, y: 0, z: Math.cos(an2) * d2, f: 0 }); }
    }
    for (i = 0; i < map.platforms.length; i++) { p = map.platforms[i]; var pcs = Math.max(1, Math.round(p.width / 10)), pw = p.width / pcs; for (j = 0; j < pcs; j++) box(p.x - p.width / 2 + pw * (j + .5), 0, p.z, pw, p.y, p.depth, '#d9a066', '#b97d48'); }
    for (i = 0; i < map.ramps.length; i++) {
      var rp = map.ramps[i], s = Math.sin(rp.heading), c = Math.cos(rp.heading), hw = rp.width / 2, hl = rp.length / 2;
      var rpt = function (sx, al, hh) { return { x: rp.x + sx * c + al * s, y: rp.y + hh, z: rp.z - sx * s + al * c }; };
      ground.push(this.quad(rpt(-hw, -hl, 0), rpt(hw, -hl, 0), rpt(hw, hl, rp.height), rpt(-hw, hl, rp.height), '#d9a066'));
      ground.push(this.quad(rpt(-hw * .5, -hl * .9, .03), rpt(hw * .5, -hl * .9, .03), rpt(hw * .5, hl * .9, rp.height + .03), rpt(-hw * .5, hl * .9, rp.height + .03), '#4fc3f7'));
      walls.push({ p: this.quad(rpt(-hw, hl, 0), rpt(hw, hl, 0), rpt(hw, hl, rp.height), rpt(-hw, hl, rp.height), '#b97d48'), nx: s, nz: c });
      walls.push({ p: this.quad(rpt(-hw, -hl, 0), rpt(-hw, hl, 0), rpt(-hw, hl, rp.height), rpt(-hw, -hl, .01), '#b97d48'), nx: -c, nz: s });
      walls.push({ p: this.quad(rpt(hw, -hl, 0), rpt(hw, hl, 0), rpt(hw, hl, rp.height), rpt(hw, -hl, .01), '#b97d48'), nx: c, nz: -s });
    }
    for (i = 0; i < map.boosts.length; i++) { var bp = map.boosts[i], bh = bp.heading || 0, bs = Math.sin(bh), bc = Math.cos(bh); var bpt = function (sx, al) { return { x: bp.x + sx * bc + al * bs, y: bp.y + .04, z: bp.z - sx * bs + al * bc }; };
      ground.push(this.quad(bpt(-2.1, -2.1), bpt(2.1, -2.1), bpt(2.1, 2.1), bpt(-2.1, 2.1), '#37c7e8'));
      ground.push(this.quad(bpt(-1.4, -1.4), bpt(0, .2), bpt(1.4, -1.4), bpt(0, 1.6), '#eafcff')); }
    this.groundOrder = []; for (i = 0; i < ground.length; i++) this.groundOrder.push(i);
    this.items = []; this.order = []; for (i = 0; i < 400; i++) { this.items.push({ z: 0, kind: 0, spr: null, f: 0, x: 0, y: 0, tilt: 0, scale: 1, col: '#fff', poly: null, size: 0, star: false }); this.order.push(i); }
    this.kartSprites = {};
  }
  Renderer.prototype.fogged = function (color, band) {
    var list = this.fog[color];
    if (!list) { list = this.fog[color] = []; for (var i = 0; i < 6; i++) list.push(SP.mix(color, this.theme.horizon, i * .13)); }
    return list[band];
  };
  Renderer.prototype.kartSprite = function (k) {
    var key = k.driver + ':' + k.kart + ':' + k.color, s = this.kartSprites[key];
    if (!s) s = this.kartSprites[key] = SP.kart(k.driver || 0, k.kart || 0, k.color || COR);
    return s;
  };
  // ---- um quadro --------------------------------------------------------------------------------------
  Renderer.prototype.animate = function (now) {
    if (!this.alive) return; this.raf = requestAnimationFrame(this.loop);
    var dt = Math.min(.05, (now - this.last) / 1000); this.last = now; this.time += dt;
    var g = this.g; if (!g || !this.ground) return;
    var cw = this.canvas.clientWidth, ch = this.canvas.clientHeight; if (!cw || !ch) return;
    var res = this.res, h = Math.round(res * ch / cw);
    if (this.canvas.width !== res || this.canvas.height !== h) { this.canvas.width = res; this.canvas.height = h; this.gradients = {}; }
    var ctx = this.ctx; ctx.imageSmoothingEnabled = false;
    var snap = this.buffer.read(now), active = (g.phase === 'countdown' || g.phase === 'playing' || g.phase === 'results') && snap, karts, i;
    if (active) karts = snap.karts;
    else { karts = []; for (i = 0; i < g.roster.length; i++) { var sp = this.map.spawns[i]; karts.push({ k: g.roster[i], x: sp.x, y: sp.y, z: sp.z, heading: sp.heading, turn: 0 }); } }
    this.emitFrame(snap, karts, g, dt);
    this.particles.update(dt);
    var n = karts.length, views = [];
    if (active) {
      for (i = 0; i < n; i++) views.push({ id: karts[i].k.pid, target: karts[i], x: n === 2 ? i * .5 : (i % 2) * .5, y: n > 2 ? Math.floor(i / 2) * .5 : 0, w: n === 1 ? 1 : .5, h: n > 2 ? .5 : 1 });
      if (n === 3) views.push({ id: 'map', map: true, x: .5, y: .5, w: .5, h: .5 });
    } else views.push({ id: 'attract', attract: true, x: 0, y: 0, w: 1, h: 1 });
    for (i = 0; i < views.length; i++) {
      var v = views[i], vx = Math.floor(v.x * res), vy = Math.floor(v.y * h), vw = Math.ceil(v.w * res), vh = Math.ceil(v.h * h);
      ctx.save(); ctx.beginPath(); ctx.rect(vx, vy, vw, vh); ctx.clip(); ctx.translate(vx, vy);
      if (v.map) this.drawMap(vw, vh, karts, g);
      else this.drawView(v, vw, vh, karts, snap, g, dt);
      ctx.restore();
      if (views.length > 1) { ctx.fillStyle = INK; if (v.x > 0) ctx.fillRect(vx - 2, vy, 4, vh); if (v.y > 0) ctx.fillRect(vx, vy - 2, vw, 4); }
    }
    if (g.phase === 'countdown') this.drawCountdown(res, h, g);
    // Custo: se a TV não acompanha, a resolução interna cai (960 → 800 → 640) e volta quando sobra fôlego.
    this.cost += dt; this.frames++;
    if (this.frames >= 120) { var avg = this.cost / this.frames; if (avg > .034 && this.res > 640) this.res -= 160; else if (avg < .014 && this.res < BASE_RES) this.res += 160; this.frames = 0; this.cost = 0; }
  };
  // Efeitos: faíscas de derrapagem, poeira, rastro de turbo e os eventos que o servidor manda (uma vez cada).
  Renderer.prototype.emitFrame = function (snap, karts, g, dt) {
    var i, P = this.particles;
    if (!snap || g.phase !== 'playing') return;
    for (i = 0; i < karts.length; i++) {
      var t = karts[i], k = t.k, sH = Math.sin(t.heading), cH = Math.cos(t.heading), speed = k.speed || 0, drift = k.driftDir || 0;
      if (k.respawn > 0) continue;
      if (drift && speed > 9) { var charged = k.driftCharge >= .65, side = drift; P.emit(t.x + cH * side * 1.3 - sH * 1.2, t.y + .2, t.z - sH * side * 1.3 - cH * 1.2, { life: .25 + Math.random() * .15, size: .35, vx: -sH * 5 + (Math.random() - .5) * 4, vy: 2 + Math.random() * 2, vz: -cH * 5 + (Math.random() - .5) * 4, g: 12, col: charged ? (Math.random() > .5 ? SKY : '#fff') : (Math.random() > .5 ? YEL : COR) }); if (Math.random() < .4) P.emit(t.x - sH * 1.6, t.y + .3, t.z - cH * 1.6, { life: .45, size: .3, grow: 1.4, vy: 1, vx: -sH * 2, vz: -cH * 2, col: '#ffffff' }); }
      var off = this.mode === 'race' && W.nearest(t.x, t.z).distance > W.ROAD_WIDTH / 2 + .5;
      if (off && speed > 4 && Math.random() < .5) P.emit(t.x - sH * 1.4 + (Math.random() - .5), t.y + .2, t.z - cH * 1.4 + (Math.random() - .5), { life: .5, size: .35, grow: 1.2, vy: 1.4, vx: (Math.random() - .5) * 2, vz: (Math.random() - .5) * 2, col: '#d8c39a' });
      if (k.boost > 0 && Math.random() < .7) P.emit(t.x - sH * 2.3, t.y + .7, t.z - cH * 2.3, { life: .25, size: .45, vx: -sH * 12, vz: -cH * 12, col: Math.random() > .5 ? YEL : COR });
      if (k.slip > 0 && Math.random() < .4) P.emit(t.x, t.y + 2.6, t.z, { life: .5, size: .35, vy: 2, vx: (Math.random() - .5) * 3, vz: (Math.random() - .5) * 3, col: YEL, star: true });
      var prev = this.prev[k.pid]; if (prev && prev.respawn > 0 && !(k.respawn > 0)) P.burst(t.x, t.y + 1, t.z, 10, { life: .6, size: .9, grow: 1.3, speed: 5, up: 3, cols: ['#ffffff', LILAC] });
      if (!prev) prev = this.prev[k.pid] = { respawn: 0, lap: k.lap };
      if (k.lap === 2 && prev.lap < 2) this.flash[k.pid] = { until: snap.world.time + 2, text: 'VOLTA FINAL!' };
      prev.respawn = k.respawn || 0; prev.lap = k.lap;
    }
    var fx = snap.world.effects;
    for (i = 0; i < fx.length; i++) {
      var e = fx[i]; if (this.seen[e.id]) continue; this.seen[e.id] = true; this.seenCount++; var y = e.y + .8;
      if (e.type === 'explosion') { P.burst(e.x, y, e.z, 14, { life: .7, size: 1.4, grow: 1.2, speed: 8, up: 6, cols: [COR, YEL, '#fff', INK] }); P.burst(e.x, y, e.z, 8, { life: .7, size: .6, speed: 10, up: 8, g: 14, col: YEL, star: true }); this.shakeNear(karts, e.x, e.z, .35); }
      else if (e.type === 'hit') { P.burst(e.x, y + 1.2, e.z, 7, { life: .5, size: .5, speed: 6, up: 5, g: 12, cols: [YEL, '#fff', COR], star: true }); this.shakeNear(karts, e.x, e.z, .2); }
      else if (e.type === 'boost') P.burst(e.x, y, e.z, 8, { life: .35, size: .5, speed: 9, up: 1, cols: [SKY, '#fff'] });
      else if (e.type === 'pickup') P.burst(e.x, y + 1, e.z, 10, { life: .55, size: .45, speed: 5, up: 6, g: 10, cols: [YEL, '#fff', LILAC], star: true });
      else if (e.type === 'finish') P.burst(e.x, y + 3, e.z, 36, { life: 1.5, size: .45, speed: 7, up: 9, g: 9, cols: [COR, YEL, MINT, SKY, GRAPE] });
    }
    if (this.seenCount > 600) { this.seen = {}; this.seenCount = 0; for (i = 0; i < fx.length; i++) this.seen[fx[i].id] = true; }
  };
  Renderer.prototype.shakeNear = function (karts, x, z, amount) { for (var i = 0; i < karts.length; i++) { var c = this.cams[karts[i].k.pid]; if (c && Math.hypot(karts[i].x - x, karts[i].z - z) < 4) c.shake = Math.max(c.shake, amount); } };
  // ---- uma câmera: céu, fundo, chão, objetos ordenados por profundidade, HUD -----------------------------
  Renderer.prototype.drawView = function (v, vw, vh, karts, snap, g, dt) {
    var ctx = this.ctx, cam = this.cams[v.id] || (this.cams[v.id] = new Camera()), theme = this.theme, i;
    if (v.attract) {
      // Sem partida: a câmera passeia pela pista (ou dá a volta na arena) atrás do cartaz.
      this.attract += dt * .012;
      if (this.mode === 'race') { var pa = W.point(this.attract % 1), pb = W.point((this.attract + .004) % 1); cam.x = pa.x; cam.z = pa.z; cam.y = pa.y + 5; cam.h = Math.atan2(pb.x - pa.x, pb.z - pa.z); }
      else { var aa = this.attract * 4; cam.x = Math.sin(aa) * 62; cam.z = Math.cos(aa) * 62; cam.y = 9; cam.h = Math.atan2(-cam.x, -cam.z); }
      cam.zoom = 1; cam.fresh = false;
    } else cam.follow(v.target, dt, v.target.k.boost > 0);
    var f = vw * .58 * cam.zoom, cx = vw / 2, hy = Math.round(vh * .40), shake = cam.shake > 0 ? (Math.random() - .5) * cam.shake * 18 : 0;
    var sinH = Math.sin(cam.h), cosH = Math.cos(cam.h), camX = cam.x, camY = cam.y, camZ = cam.z;
    hy += shake; cx += shake * .6;
    // céu + panorama (montanhas giram com a câmera; nuvens um pouco menos e vagam devagar)
    var grad = this.gradients[vh]; if (!grad) { grad = ctx.createLinearGradient(0, 0, 0, hy); grad.addColorStop(0, theme.sky[0]); grad.addColorStop(.6, theme.sky[1]); grad.addColorStop(1, theme.sky[2]); this.gradients[vh] = grad; }
    ctx.fillStyle = grad; ctx.fillRect(0, 0, vw, hy + 2);
    var pw = this.panorama.width, ph = this.panorama.height, scale = vw / 960, pwS = pw * scale * 1.5;
    var mx = -((cam.h / TAU) * pwS) % pwS; if (mx > 0) mx -= pwS;
    var cy0 = hy - ph * scale * .95 - 40 * scale, cxo = -((cam.h / TAU) * pwS * .6 + this.time * 6 * scale) % pwS; if (cxo > 0) cxo -= pwS;
    ctx.drawImage(this.cloudLayer, cxo, cy0, pwS, this.cloudLayer.height * scale); ctx.drawImage(this.cloudLayer, cxo + pwS, cy0, pwS, this.cloudLayer.height * scale);
    ctx.drawImage(this.panorama, mx, hy - ph * scale * .85, pwS, ph * scale); ctx.drawImage(this.panorama, mx + pwS, hy - ph * scale * .85, pwS, ph * scale);
    ctx.fillStyle = theme.far[0]; ctx.fillRect(0, hy, vw, vh - hy);
    // chão: polígonos visíveis, do mais longe para o mais perto
    var ground = this.ground, order = this.groundOrder, count = 0, limitX = (vw / 2) / f * 1.3;
    for (i = 0; i < ground.length; i++) {
      var q = ground[i], dx = q.cx - camX, dz = q.cz - camZ, Z = dx * sinH + dz * cosH, X = dx * cosH - dz * sinH;
      if (Z + q.r < NEAR || Z - q.r > FAR || Math.abs(X) - q.r > Z * limitX + 6) continue;
      q.zc = Z; order[count++] = i;
    }
    this.sortRange(order, count, this.compareGround);
    for (i = 0; i < count; i++) { var qq = ground[order[i]]; this.fillPoly(qq, this.fogged(qq.c, Math.min(5, Math.floor(qq.zc / 30))), f, cx, hy, sinH, cosH, camX, camY, camZ, vw); }
    // sombras dos karts no chão
    for (i = 0; i < karts.length; i++) { var kt = karts[i]; if (kt.k.respawn > 0) continue; var gy = W.ground(kt.x, kt.z, this.mode, kt.y + .5), sdx = kt.x - camX, sdz = kt.z - camZ, sZ = sdx * sinH + sdz * cosH; if (sZ < NEAR || sZ > FAR) continue; var sX = sdx * cosH - sdz * sinH, ss = f / sZ, sx = cx + sX * ss, sy = hy - (gy - camY) * ss, lift = clamp((kt.y - gy) / 4, 0, 1); ctx.fillStyle = 'rgba(27,16,53,0.35)'; SP.ellipse(ctx, sx, sy, 1.5 * ss * (1 - lift * .4), .55 * ss * (1 - lift * .4)); ctx.fill(); }
    // objetos ordenados por profundidade: cenário, muros, caixas, karts, projéteis, partículas
    var n = 0, items = this.items, it, props = this.props;
    var push = function () { if (n >= items.length) return null; return items[n++]; };
    for (i = 0; i < props.length; i++) { var pr = props[i]; dx = pr.x - camX; dz = pr.z - camZ; Z = dx * sinH + dz * cosH; if (Z < NEAR || Z > FAR) continue; X = dx * cosH - dz * sinH; if (Math.abs(X) > Z * limitX + 8) continue; it = push(); if (!it) break; it.kind = 1; it.z = Z; it.spr = pr.spr; it.f = pr.f; it.x = X; it.y = pr.y; it.tilt = 0; it.scale = 1; }
    for (i = 0; i < this.walls.length; i++) { var wl = this.walls[i], wp = wl.p; dx = wp.cx - camX; dz = wp.cz - camZ; if (dx * wl.nx + dz * wl.nz > 0) continue; Z = dx * sinH + dz * cosH; if (Z + wp.r < NEAR || Z - wp.r > FAR) continue; it = push(); if (!it) break; it.kind = 2; it.z = Z; it.poly = wp; it.col = this.fogged(wp.c, Math.min(5, Math.floor(Math.max(0, Z) / 30))); }
    if (this.banner) { dx = this.banner.cx - camX; dz = this.banner.cz - camZ; Z = dx * sinH + dz * cosH; if (Z > NEAR && Z < FAR) { it = push(); if (it) { it.kind = 2; it.z = Z; it.poly = this.banner; it.col = 'checker'; } } }
    var world = snap ? snap.world : null, pk = this.map.pickups;
    for (i = 0; i < pk.length; i++) { if (world && world.pickups[i] && world.pickups[i].cooldown > 0) continue; dx = pk[i].x - camX; dz = pk[i].z - camZ; Z = dx * sinH + dz * cosH; if (Z < NEAR || Z > FAR) continue; it = push(); if (!it) break; it.kind = 1; it.z = Z; it.spr = this.itembox; it.f = Math.floor(this.time * 6 + i) % 8; it.x = dx * cosH - dz * sinH; it.y = pk[i].y + 1.2 + Math.sin(this.time * 2.2 + i) * .25; it.tilt = 0; it.scale = 1; }
    for (i = 0; i < karts.length; i++) {
      var kt2 = karts[i], k = kt2.k; if (k.respawn > 0) continue; dx = kt2.x - camX; dz = kt2.z - camZ; Z = dx * sinH + dz * cosH; if (Z < NEAR * .8 || Z > FAR) continue;
      var spr = this.kartSprite(k), rel = angle(kt2.heading - cam.h), drift = k.driftDir || 0, idx = Math.round((-rel - drift * .45) / TAU * SP.DIRS); idx = ((idx % SP.DIRS) + SP.DIRS) % SP.DIRS;
      it = push(); if (!it) break; it.kind = 1; it.z = Z; it.spr = spr; it.f = idx; it.x = dx * cosH - dz * sinH;
      var bounce = (k.speed || 0) > 3 ? Math.sin(this.time * 18 + i * 2) * .035 : 0;
      it.y = kt2.y + bounce; it.tilt = clamp(-kt2.turn * .06, -.22, .22) * (v.target === kt2 ? 1 : .5) - drift * .08 * (v.target === kt2 ? 1 : 0); it.scale = k.boost > 0 ? 1.04 : 1;
      if (k.shield > 0) { it = push(); if (!it) break; it.kind = 4; it.z = Z - .01; it.x = dx * cosH - dz * sinH; it.y = kt2.y + 1.4; it.size = 1.9; it.col = 'rgba(88,200,245,0.35)'; }
      if (k.boost > 0) { it = push(); if (!it) break; it.kind = 4; it.z = Z + .8; it.x = (dx - sinH * 2.1) * cosH - (dz - cosH * 2.1) * sinH; it.y = kt2.y + .6; it.size = .5 + Math.random() * .3; it.col = Math.random() > .5 ? YEL : COR; }
    }
    if (world) for (i = 0; i < world.projectiles.length && i < 48; i++) {
      var pj = world.projectiles[i]; dx = pj.x - camX; dz = pj.z - camZ; Z = dx * sinH + dz * cosH; if (Z < NEAR || Z > FAR) continue; it = push(); if (!it) break; it.z = Z; it.x = dx * cosH - dz * sinH; it.tilt = 0; it.scale = 1;
      if (pj.type === 'oil') { it.kind = 4; it.y = pj.y - .55; it.size = 1.3; it.col = '#2f2a4a'; it.f = 1; }
      else if (pj.type === 'mine') { it.kind = 1; it.spr = this.mine; it.f = 0; it.y = pj.y - .1; }
      else if (pj.type === 'bomb') { it.kind = 1; it.spr = this.bomb; it.f = 0; it.y = pj.y - .5; }
      else { it.kind = 1; it.spr = this.rocket; var ph2 = angle(Math.atan2(pj.vx, pj.vz) - cam.h); it.f = ((Math.round(-ph2 / TAU * SP.DIRS) % SP.DIRS) + SP.DIRS) % SP.DIRS; it.y = pj.y - .5; it.scale = pj.type === 'rapid' ? .7 : 1; }
    }
    var parts = this.particles.items;
    for (i = 0; i < parts.length; i++) { var pp = parts[i]; if (pp.life <= 0) continue; dx = pp.x - camX; dz = pp.z - camZ; Z = dx * sinH + dz * cosH; if (Z < NEAR || Z > FAR) continue; it = push(); if (!it) break; it.kind = pp.star ? 5 : 3; it.z = Z; it.x = dx * cosH - dz * sinH; it.y = pp.y; it.size = pp.size * (1 + pp.grow * (1 - pp.life / pp.max)); it.col = pp.col; it.f = pp.life / pp.max; }
    for (i = 0; i < n; i++) this.order[i] = i;   // a lista de ordem é reaproveitada: recomeça em 0..n-1 a cada quadro
    this.sortRange(this.order, n, this.compare);
    for (i = 0; i < n; i++) {
      it = items[this.order[i]]; var sc = f / it.z, px = cx + it.x * sc, py = hy - (it.y - camY) * sc;
      if (it.kind === 1) { var sp2 = it.spr, wpx = sp2.w / sp2.s * sc * it.scale, hpx = sp2.h / sp2.s * sc * it.scale, foot = 4 / sp2.s * sc; if (px + wpx < 0 || px - wpx > vw) continue;
        if (!sp2.frames[it.f]) { if (!this.warned) { this.warned = true; console.warn('kart sprite frame ausente', it.f, sp2.frames.length, sp2.w, it.z, it.x, it.y); } continue; }
        if (it.tilt) { ctx.save(); ctx.translate(px, py + foot); ctx.rotate(it.tilt); ctx.drawImage(sp2.frames[it.f], -wpx / 2, -hpx, wpx, hpx); ctx.restore(); }
        else ctx.drawImage(sp2.frames[it.f], px - wpx / 2, py + foot - hpx, wpx, hpx); }
      else if (it.kind === 2) { if (it.col === 'checker') { if (!this.checkerPattern) this.checkerPattern = ctx.createPattern(this.checker, 'repeat'); this.fillPoly(it.poly, this.checkerPattern, f, cx, hy, sinH, cosH, camX, camY, camZ, vw); } else this.fillPoly(it.poly, it.col, f, cx, hy, sinH, cosH, camX, camY, camZ, vw); }
      else if (it.kind === 3) { var s3 = Math.max(1.5, it.size * sc); ctx.fillStyle = it.col; ctx.globalAlpha = Math.min(1, it.f * 2); ctx.fillRect(px - s3 / 2, py - s3 / 2, s3, s3); ctx.globalAlpha = 1; }
      else if (it.kind === 4) { ctx.fillStyle = it.col; if (it.f === 1) { SP.ellipse(ctx, px, py, it.size * sc, it.size * sc * .35); ctx.fill(); } else { SP.ellipse(ctx, px, py, it.size * sc, it.size * sc); ctx.fill(); } }
      else if (it.kind === 5) { var s5 = Math.max(4, it.size * sc * 2.2); ctx.globalAlpha = Math.min(1, it.f * 2); ctx.drawImage(this.star, px - s5 / 2, py - s5 / 2, s5, s5); ctx.globalAlpha = 1; }
    }
    if (v.target && (v.target.k.boost > 0)) this.speedLines(vw, vh);
    if (v.target) this.hud(v, vw, vh, snap, g);
  };
  Renderer.prototype.sortRange = function (arr, n, cmp) {
    // ordenação por inserção nos índices ativos: listas curtas e quase ordenadas de um quadro para o outro
    for (var i = 1; i < n; i++) { var x = arr[i], j = i - 1; while (j >= 0 && cmp(arr[j], x) > 0) { arr[j + 1] = arr[j]; j--; } arr[j + 1] = x; }
  };
  // Polígono no chão/parede: leva para a câmera, corta no plano próximo, projeta e pinta.
  Renderer.prototype.fillPoly = function (q, style, f, cx, hy, sinH, cosH, camX, camY, camZ, vw) {
    var ctx = this.ctx, n = q.n, A = this.clipA, i, m = 0, p = q.p;
    for (i = 0; i < n; i++) { var dx = p[i * 3] - camX, dy = p[i * 3 + 1] - camY, dz = p[i * 3 + 2] - camZ; A[i * 3] = dx * cosH - dz * sinH; A[i * 3 + 1] = dy; A[i * 3 + 2] = dx * sinH + dz * cosH; }
    var B = this.clipB;
    for (i = 0; i < n; i++) {
      var j = (i + 1) % n, za = A[i * 3 + 2], zb = A[j * 3 + 2], ina = za >= NEAR, inb = zb >= NEAR;
      if (ina) { B[m * 3] = A[i * 3]; B[m * 3 + 1] = A[i * 3 + 1]; B[m * 3 + 2] = za; m++; }
      if (ina !== inb) { var t = (NEAR - za) / (zb - za); B[m * 3] = A[i * 3] + (A[j * 3] - A[i * 3]) * t; B[m * 3 + 1] = A[i * 3 + 1] + (A[j * 3 + 1] - A[i * 3 + 1]) * t; B[m * 3 + 2] = NEAR; m++; }
      if (m > 18) break;
    }
    if (m < 3) return;
    var minX = Infinity, maxX = -Infinity; ctx.beginPath();
    for (i = 0; i < m; i++) { var s = f / B[i * 3 + 2], sx = cx + B[i * 3] * s, sy = hy - B[i * 3 + 1] * s; if (sx < minX) minX = sx; if (sx > maxX) maxX = sx; if (i) ctx.lineTo(sx, sy); else ctx.moveTo(sx, sy); }
    if (maxX < -2 || minX > vw + 2) return;
    ctx.closePath(); ctx.fillStyle = style; ctx.fill();
    if (q.seam) { ctx.strokeStyle = style; ctx.lineWidth = 1; ctx.stroke(); }
  };
  Renderer.prototype.speedLines = function (vw, vh) { var ctx = this.ctx, i; ctx.strokeStyle = 'rgba(255,241,201,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); for (i = 0; i < 8; i++) { var y = (vh * .2 + Math.random() * vh * .7) | 0, len = 20 + Math.random() * 50, left = i % 2 === 0; ctx.moveTo(left ? 0 : vw, y); ctx.lineTo(left ? len : vw - len, y + (left ? 4 : -4)); } ctx.stroke(); };
  // ---- HUD (desenhado no canvas: nada de DOM durante a corrida) --------------------------------------------
  Renderer.prototype.label = function (x, y, text, size, color, bg, align) {
    var ctx = this.ctx; ctx.font = 'bold ' + size + 'px ' + FONT; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    var w = ctx.measureText(text).width + size * .9, h = size * 1.5; if (align === 'right') x -= w; else if (align === 'center') x -= w / 2;
    if (bg) { ctx.fillStyle = INK; ctx.fillRect(x - 2, y - 2, w + 4, h + 4); ctx.fillStyle = bg; ctx.fillRect(x, y, w, h); }
    ctx.fillStyle = color; ctx.fillText(text, x + size * .45, y + h / 2 + 1);
    return w;
  };
  Renderer.prototype.big = function (x, y, text, size, fill) { var ctx = this.ctx; ctx.font = 'bold ' + size + 'px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(3, size * .14); ctx.strokeText(text, x, y); ctx.fillStyle = fill; ctx.fillText(text, x, y); };
  Renderer.prototype.hud = function (v, vw, vh, snap, g) {
    var ctx = this.ctx, k = v.target.k, u = Math.max(.74, vh / 540), pad = Math.round(10 * u), battle = this.mode === 'battle', world = snap ? snap.world : null, t = world ? world.time : 0, fs;
    // placa do piloto: avatar (o próprio sprite de frente), cor e nome
    fs = Math.round(15 * u); var spr = this.kartSprite(k), ah = Math.round(30 * u);
    ctx.fillStyle = INK; ctx.fillRect(pad, pad, ah + 6, ah + 6); ctx.fillStyle = CREAM; ctx.fillRect(pad + 2, pad + 2, ah + 2, ah + 2);
    ctx.drawImage(spr.frames[8], pad + 3, pad + 3, ah, ah);
    var nw = this.label(pad + ah + 8, pad + Math.round(4 * u), upper(k.name), fs, CREAM, INK), swx = pad + ah + 8 + nw + 6, swy = pad + Math.round(4 * u), swh = fs * 1.5;
    ctx.fillStyle = INK; ctx.fillRect(swx - 2, swy - 2, swh + 4, swh + 4); ctx.fillStyle = k.color; ctx.fillRect(swx, swy, swh, swh);
    // posição (ou KOs na batalha): quadrado amarelo no canto direito
    var bs = Math.round(46 * u), bx = vw - pad - bs, by = pad, posColor = battle ? COR : k.position === 1 ? YEL : k.position === 2 ? LILAC : k.position === 3 ? '#ff9e7a' : CREAM;
    ctx.fillStyle = INK; ctx.fillRect(bx - 3, by - 3, bs + 6, bs + 6); ctx.fillStyle = posColor; ctx.fillRect(bx, by, bs, bs);
    ctx.font = 'bold ' + Math.round(24 * u) + 'px ' + FONT; ctx.fillStyle = battle ? CREAM : INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(battle ? String(k.kills) : k.position + 'º', bx + bs / 2, by + bs / 2 + (battle ? -4 * u : 1));
    if (battle) { ctx.font = 'bold ' + Math.round(10 * u) + 'px ' + FONT; ctx.fillText('KO', bx + bs / 2, by + bs - 8 * u); }
    // canto inferior esquerdo: volta e relógio (corrida) ou vida e relógio (batalha)
    var ly = vh - pad - Math.round(22 * u), lx = pad, clock = battle ? this.clock(120 - t) : this.clock(t);
    if (battle) {
      var hp = Math.max(0, Math.ceil(k.hp)), bw = Math.round(120 * u), bh = Math.round(14 * u), low = 120 - t <= 10;
      var hpw = this.label(lx, ly, '♥', Math.round(14 * u), COR, CREAM);
      ctx.fillStyle = INK; ctx.fillRect(lx + hpw + 2, ly - 2, bw + 8, bh + 12 * u); ctx.fillStyle = '#e9dcc7'; ctx.fillRect(lx + hpw + 5, ly + 2, bw + 2, bh + 5 * u);
      ctx.fillStyle = hp <= 30 ? COR : hp <= 60 ? YEL : MINT; ctx.fillRect(lx + hpw + 6, ly + 3, Math.round(bw * hp / 100), bh + 3 * u);
      var hpn = this.label(lx + hpw + bw + 14, ly, String(hp), Math.round(14 * u), CREAM, INK);
      this.label(lx + hpw + bw + 14 + hpn + 4, ly, clock, Math.round(14 * u), low ? CREAM : YEL, low ? COR : INK);
    } else {
      var lap = Math.min(3, k.lap + 1), lw = this.label(lx, ly, 'VOLTA ' + (k.finished ? 3 : lap) + '/3', Math.round(14 * u), INK, k.lap >= 2 && !k.finished ? YEL : CREAM), i;
      for (i = 0; i < 3; i++) { ctx.fillStyle = INK; ctx.fillRect(lx + lw + 6 + i * 14 * u, ly + 5 * u, 11 * u, 11 * u); ctx.fillStyle = i < k.lap ? MINT : '#e9dcc7'; ctx.fillRect(lx + lw + 8 + i * 14 * u, ly + 7 * u, 7 * u, 7 * u); }
      this.label(lx + lw + 6 + 3 * 14 * u + 6, ly, clock, Math.round(14 * u), YEL, INK);
    }
    // canto inferior direito: velocímetro em segmentos + carga da derrapagem
    var seg = 12, sw = Math.round(10 * u), sh = Math.round(18 * u), gap = Math.round(3 * u), total = seg * (sw + gap), sx0 = vw - pad - total, sy0 = vh - pad - sh - Math.round(12 * u), speed = k.speed || 0, lit = Math.round(clamp(speed / 37, 0, 1) * seg), j;
    ctx.fillStyle = INK; ctx.fillRect(sx0 - 5, sy0 - 5, total + 8, sh + Math.round(12 * u) + 8);
    for (j = 0; j < seg; j++) { var on = j < lit; ctx.fillStyle = on ? (k.boost > 0 ? COR : j < 8 ? MINT : YEL) : '#3a2d63'; ctx.fillRect(sx0 + j * (sw + gap), sy0 + (seg - j) * u * .6, sw, sh - (seg - j) * u * .6); }
    ctx.fillStyle = '#3a2d63'; ctx.fillRect(sx0, sy0 + sh + 3 * u, total - gap, 5 * u); ctx.fillStyle = k.driftCharge >= .65 ? SKY : YEL; ctx.fillRect(sx0, sy0 + sh + 3 * u, Math.round((total - gap) * clamp((k.driftCharge || 0) / 2.5, 0, 1)), 5 * u);
    ctx.font = 'bold ' + Math.round(10 * u) + 'px ' + FONT; ctx.textAlign = 'right'; ctx.fillStyle = CREAM; ctx.fillText(Math.round(speed * 4) + ' KM/H', vw - pad - 2, sy0 - 12 * u);
    if (k.boost > 0 && Math.floor(this.time * 8) % 2 === 0) this.big(vw - pad - total / 2, sy0 - 30 * u, 'TURBO!', Math.round(20 * u), COR);
    // avisos ao centro: largada, volta final, chegada, retorno
    var text = '';
    if (g.phase === 'playing' && t < 1.1) text = 'JÁ!';
    else if (k.finished && g.phase === 'playing' && t - k.finishTime < 2.5) text = 'CHEGOU ' + k.position + 'º';
    else if (this.flash[k.pid] && this.flash[k.pid].until > t) text = this.flash[k.pid].text;
    if (text) this.big(vw / 2, vh * .36, text, Math.round((text.length > 6 ? 40 : 64) * u), YEL);
    if (k.respawn > 0) this.big(vw / 2, vh / 2, 'VOLTANDO…', Math.round(28 * u), CREAM);
  };
  Renderer.prototype.clock = function (t) { t = Math.max(0, Math.floor(t)); var m = Math.floor(t / 60), s = t % 60; return m + ':' + (s < 10 ? '0' : '') + s; };
  Renderer.prototype.drawCountdown = function (w, h, g) {
    var ctx = this.ctx, i; this.big(w / 2, h * .42, String(g.countdown), Math.round(h * .32), YEL);
    var lx = w / 2 - 3 * 22, ly = h * .42 + h * .2; ctx.fillStyle = INK; ctx.fillRect(lx - 12, ly - 14, 3 * 44 + 24, 28); ctx.fillStyle = CREAM; ctx.fillRect(lx - 9, ly - 11, 3 * 44 + 18, 22);
    for (i = 0; i < 3; i++) { ctx.fillStyle = i < 4 - g.countdown ? COR : '#e9dcc7'; SP.ellipse(ctx, lx + 22 + i * 44, ly, 8, 8); ctx.fill(); }
  };
  // Quarto quadrante com três pilotos: mapa da pista com os karts (estilo painel de fliperama).
  Renderer.prototype.drawMap = function (vw, vh, karts, g) {
    var ctx = this.ctx, race = this.mode === 'race', i, u = Math.max(.74, vh / 540);
    ctx.fillStyle = INK; ctx.fillRect(0, 0, vw, vh);
    var span = race ? 170 : 130, s = Math.min(vw, vh) / span, ox = vw / 2, oy = vh / 2 + 10 * u;
    var mx = function (x) { return ox + x * s; }, mz = function (z) { return oy - z * s; };
    if (race) {
      ctx.strokeStyle = '#3a2d63'; ctx.lineWidth = 34 * s; ctx.lineJoin = 'round'; ctx.beginPath(); for (i = 0; i <= 96; i++) { var p = W.TRACK[i % 96]; if (i) ctx.lineTo(mx(p.x), mz(p.z)); else ctx.moveTo(mx(p.x), mz(p.z)); } ctx.stroke();
      ctx.strokeStyle = CREAM; ctx.lineWidth = 19 * s; ctx.stroke(); ctx.strokeStyle = this.theme.road[0]; ctx.lineWidth = 16 * s; ctx.stroke();
      var a = W.point(0, -8), b = W.point(0, 8); ctx.strokeStyle = CREAM; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(mx(a.x), mz(a.z)); ctx.lineTo(mx(b.x), mz(b.z)); ctx.stroke();
    } else {
      ctx.fillStyle = this.theme.road[0]; ctx.fillRect(mx(-55), mz(55), 110 * s, 110 * s); ctx.strokeStyle = '#d8d2f2'; ctx.lineWidth = 3 * s; ctx.strokeRect(mx(-55), mz(55), 110 * s, 110 * s);
      var m = this.map; for (i = 0; i < m.hazards.length; i++) { ctx.fillStyle = '#ff7a3d'; SP.ellipse(ctx, mx(m.hazards[i].x), mz(m.hazards[i].z), m.hazards[i].radius * s, m.hazards[i].radius * s); ctx.fill(); }
      for (i = 0; i < m.platforms.length; i++) { var pf = m.platforms[i]; ctx.fillStyle = '#d9a066'; ctx.fillRect(mx(pf.x - pf.width / 2), mz(pf.z + pf.depth / 2), pf.width * s, pf.depth * s); }
    }
    for (i = 0; i < karts.length; i++) { var kt = karts[i]; ctx.fillStyle = INK; SP.ellipse(ctx, mx(kt.x), mz(kt.z), 7 * u, 7 * u); ctx.fill(); ctx.fillStyle = kt.k.color; SP.ellipse(ctx, mx(kt.x), mz(kt.z), 5 * u, 5 * u); ctx.fill(); ctx.font = 'bold ' + Math.round(9 * u) + 'px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = INK; ctx.fillText(String(kt.k.position || ''), mx(kt.x), mz(kt.z) + .5); }
    this.label(vw / 2, 10 * u, race ? 'CIRCUITO AURORA' : 'FORTE PRISMA', Math.round(13 * u), INK, YEL, 'center');
  };
  window.KartRender = Renderer;
})();
