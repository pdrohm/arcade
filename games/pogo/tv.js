'use strict';
// Pogo Pandemonium na TV (Chrome 47: ES5 puro). Tabuleiro 8×8 em 3/4, cada um no seu pula-pula.
// A grade chega como texto ('.' = casa branca, '0'..'3' = dono); a TV compara com o quadro
// anterior para fazer o respingo de tinta sem o servidor mandar um efeito por pulo.
(function () {
  var INK = '#0f0f14', N = 8, HOPZ = 0.45, STICK = 0.32;
  var DX = [1, 0, -1, 0], DY = [0, 1, 0, -1];
  // casas brancas bem claras para as cores das pessoas saltarem aos olhos
  var THEME = {
    painter: { bg: '#2f8f6a', dot: 'rgba(15,15,20,.18)', a: '#fbfaf4', b: '#e9e7dc', side: '#e7b93a', sideDark: '#a8801c' },
    gogo: { bg: '#6a4bbd', dot: 'rgba(255,255,255,.12)', a: '#faf8ff', b: '#e6e1f4', side: '#ff8fc7', sideDark: '#b8538a' },
    loco: { bg: '#d4632b', dot: 'rgba(15,15,20,.16)', a: '#fff9ec', b: '#f1e3c4', side: '#8a5530', sideDark: '#5a341a' },
    padlock: { bg: '#2c628f', dot: 'rgba(255,255,255,.12)', a: '#f6f9fd', b: '#dfe8f2', side: '#a9bccf', sideDark: '#6b8199' },
  };
  var pats = {};
  var st = { g: '', t: -1, flash: [], flashCol: [], flyers: [], ps: {} };
  for (var q = 0; q < N * N; q++) { st.flash.push(0); st.flashCol.push('#fff'); }

  function frac(v) { return v - Math.floor(v); }
  function theme(S) { return THEME[S.lv] || THEME.painter; }
  function pattern(K, th, key) {
    if (pats[key]) return pats[key];
    var cv = document.createElement('canvas'); cv.width = cv.height = 26;
    var g = cv.getContext('2d'); g.fillStyle = th.bg; g.fillRect(0, 0, 26, 26);
    g.fillStyle = th.dot; g.beginPath(); g.arc(6, 6, 2.2, 0, Math.PI * 2); g.arc(19, 19, 2.2, 0, Math.PI * 2); g.fill();
    pats[key] = K.ctx.createPattern(cv, 'repeat');
    return pats[key];
  }
  function cardCenter(K, slot) {
    var W = K.W, H = K.H, cw = W * 0.155, ch = H * 0.12, p = [[0, 0], [1, 0], [0, 1], [1, 1]][slot] || [0, 0];
    return [(p[0] ? W - cw - W * 0.012 : W * 0.008) + cw / 2, (p[1] ? H - ch - H * 0.025 : H * 0.02) + ch / 2];
  }
  function tileXY(K, i) { var c = i % N, r = (i / N) | 0; return [K.X(c + 0.5), K.Y(r + 0.5, 0)]; }

  // ---------- chão ----------
  function drawBoard(K, S, th) {
    var c = K.ctx, s = K.s, t = K.tilt, x0 = K.X(0), y0 = K.Y(0, 0), bw = N * s, bh = N * s * t, depth = s * 0.34, i, r, col;
    c.fillStyle = INK; c.fillRect(x0 + s * 0.16, y0 + s * 0.16, bw, bh + depth);
    c.fillStyle = th.side; c.fillRect(x0, y0 + bh, bw, depth);
    c.fillStyle = th.sideDark;
    for (i = 0; i < N; i++) c.fillRect(x0 + i * s + s * 0.47, y0 + bh + depth * 0.3, s * 0.06, depth * 0.4);
    var g = S.g || '', locked = {};
    for (i = 0; i < S.p.length; i++) if (S.p[i].lk > 0) locked[S.p[i].id] = 1;
    for (r = 0; r < N; r++) for (col = 0; col < N; col++) {
      var k = r * N + col, ch = g.charAt(k), x = x0 + col * s, y = y0 + r * s * t;
      if (ch === '.' || ch === '') { c.fillStyle = (r + col) % 2 ? th.b : th.a; c.fillRect(x, y, s, s * t); }
      else {
        var o = +ch;
        c.fillStyle = K.color(o); c.fillRect(x, y, s, s * t);
        c.fillStyle = 'rgba(15,15,20,.2)'; c.fillRect(x, y + s * t * 0.8, s, s * t * 0.2);
        c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(x + s * 0.12, y + s * t * 0.12, s * 0.22, s * t * 0.12);
        if (locked[o]) { c.lineWidth = Math.max(2, s * 0.05); c.strokeStyle = '#fff'; c.strokeRect(x + s * 0.16, y + s * t * 0.16, s * 0.68, s * t * 0.68); }
      }
      if (st.flash[k] > 0.01) { c.globalAlpha = Math.min(1, st.flash[k]); c.fillStyle = st.flashCol[k]; c.fillRect(x, y, s, s * t); c.globalAlpha = 1; }
    }
    for (i = 0; i < N * N; i++) if (st.flash[i] > 0) st.flash[i] = Math.max(0, st.flash[i] - K.dt * 2.6);
    // grade de tinta grossa
    c.strokeStyle = INK; c.lineWidth = Math.max(2, s * 0.055); c.beginPath();
    for (i = 1; i < N; i++) { c.moveTo(x0 + i * s, y0); c.lineTo(x0 + i * s, y0 + bh); c.moveTo(x0, y0 + i * s * t); c.lineTo(x0 + bw, y0 + i * s * t); }
    c.stroke();
    c.lineWidth = Math.max(3, s * 0.08); c.strokeRect(x0, y0, bw, bh + depth); c.beginPath(); c.moveTo(x0, y0 + bh); c.lineTo(x0 + bw, y0 + bh); c.stroke();
  }
  // compara a grade com a anterior: casa nova pintada = respingo
  function diffGrid(K, S) {
    var g = S.g || '';
    if (S.t < st.t - 0.3 || st.g.length !== g.length) { st.g = g; st.t = S.t; return; }
    st.t = S.t;
    if (g === st.g) return;
    var changed = 0, i;
    for (i = 0; i < g.length; i++) if (g.charAt(i) !== st.g.charAt(i) && g.charAt(i) !== '.') changed++;
    for (i = 0; i < g.length; i++) {
      var ch = g.charAt(i);
      if (ch === st.g.charAt(i) || ch === '.') continue;
      var col = K.color(+ch), cx = i % N + 0.5, cy = ((i / N) | 0) + 0.5;
      st.flash[i] = 0.75; st.flashCol[i] = '#fff';
      K.burst(cx, cy, 0.05, col, changed > 6 ? 2 : 7, 2.2, 0.45, 0.14, 3);
    }
    if (changed) K.sfx('paint');
    st.g = g;
  }

  // ---------- ícones (raio R em pixels, centro já transladado) ----------
  function iconPath(c, kind, R, d) {
    var i;
    c.fillStyle = '#fff'; c.strokeStyle = INK; c.lineWidth = Math.max(1.5, R * 0.13); c.lineJoin = 'round';
    if (kind === 'boots') {
      c.beginPath(); c.moveTo(-0.38 * R, -0.5 * R); c.lineTo(0.08 * R, -0.5 * R); c.lineTo(0.08 * R, 0.05 * R); c.lineTo(0.5 * R, 0.14 * R); c.lineTo(0.5 * R, 0.45 * R); c.lineTo(-0.38 * R, 0.45 * R); c.closePath(); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(-0.62 * R, -0.25 * R); c.lineTo(-0.45 * R, -0.25 * R); c.moveTo(-0.7 * R, 0.05 * R); c.lineTo(-0.45 * R, 0.05 * R); c.stroke();
    } else if (kind === 'missile') {
      c.beginPath(); c.moveTo(-0.45 * R, -0.18 * R); c.lineTo(0.22 * R, -0.18 * R); c.lineTo(0.55 * R, 0); c.lineTo(0.22 * R, 0.18 * R); c.lineTo(-0.45 * R, 0.18 * R); c.closePath(); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(-0.3 * R, -0.18 * R); c.lineTo(-0.55 * R, -0.45 * R); c.lineTo(-0.55 * R, 0.45 * R); c.lineTo(-0.3 * R, 0.18 * R); c.fill(); c.stroke();
    } else if (kind === 'arrow' || kind === 'arrow4') {
      var dirs = kind === 'arrow4' ? [0, 1, 2, 3] : [d], big = kind === 'arrow';
      for (i = 0; i < dirs.length; i++) {
        c.save(); c.rotate(dirs[i] * Math.PI / 2);
        c.beginPath();
        if (big) { c.moveTo(-0.5 * R, -0.13 * R); c.lineTo(0.05 * R, -0.13 * R); c.lineTo(0.05 * R, -0.38 * R); c.lineTo(0.55 * R, 0); c.lineTo(0.05 * R, 0.38 * R); c.lineTo(0.05 * R, 0.13 * R); c.lineTo(-0.5 * R, 0.13 * R); }
        else { c.moveTo(0.2 * R, -0.24 * R); c.lineTo(0.6 * R, 0); c.lineTo(0.2 * R, 0.24 * R); }
        c.closePath(); c.fill(); c.stroke(); c.restore();
      }
      if (!big) { c.beginPath(); c.arc(0, 0, R * 0.16, 0, Math.PI * 2); c.fill(); c.stroke(); }
    } else if (kind === 'lock') {
      c.beginPath(); c.arc(0, -0.08 * R, 0.24 * R, Math.PI, 0); c.lineWidth = Math.max(2, R * 0.16); c.stroke();
      c.lineWidth = Math.max(1.5, R * 0.13); c.fillRect(-0.36 * R, -0.08 * R, 0.72 * R, 0.52 * R); c.strokeRect(-0.36 * R, -0.08 * R, 0.72 * R, 0.52 * R);
      c.fillStyle = INK; c.fillRect(-0.05 * R, 0.08 * R, 0.1 * R, 0.2 * R);
    }
  }
  var BADGE = { boots: '#ffce1f', missile: '#f0443a', arrow: '#35d07f', arrow4: '#35d07f', lock: '#b07cf7' };
  function badge(K, kind, x, y, R, d) {
    var c = K.ctx;
    c.save(); c.translate(x, y);
    c.fillStyle = INK; c.beginPath(); c.arc(R * 0.12, R * 0.12, R, 0, Math.PI * 2); c.fill();
    c.fillStyle = BADGE[kind] || '#fff'; c.beginPath(); c.arc(0, 0, R, 0, Math.PI * 2); c.fill();
    c.lineWidth = Math.max(2, R * 0.12); c.strokeStyle = INK; c.stroke();
    iconPath(c, kind, R * 0.82, d);
    c.restore();
  }
  function star(c, x, y, R) {
    c.beginPath();
    for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? R * 0.45 : R; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    c.closePath(); c.fillStyle = '#ffce1f'; c.fill(); c.lineWidth = 1.5; c.strokeStyle = INK; c.stroke();
  }
  function crown(c, x, y, R) {
    c.beginPath(); c.moveTo(x - R, y + R * 0.5); c.lineTo(x - R, y - R * 0.3); c.lineTo(x - R * 0.5, y + R * 0.1); c.lineTo(x, y - R * 0.6); c.lineTo(x + R * 0.5, y + R * 0.1); c.lineTo(x + R, y - R * 0.3); c.lineTo(x + R, y + R * 0.5); c.closePath();
    c.fillStyle = '#ffce1f'; c.fill(); c.lineWidth = Math.max(1.5, R * 0.18); c.strokeStyle = INK; c.stroke();
  }

  // ---------- pula-pula ----------
  function stick(K, x, y, z, L, color, fast) {
    var c = K.ctx, s = K.s, sx = K.X(x), gy = K.Y(y, z), ty = K.Y(y, z + L), i;
    c.strokeStyle = INK; c.lineCap = 'round';
    c.lineWidth = Math.max(3, s * 0.07); c.beginPath(); c.moveTo(sx, gy); c.lineTo(sx, ty); c.stroke();
    // mola
    c.lineWidth = Math.max(2, s * 0.05); c.strokeStyle = color; c.beginPath();
    var n = 4, top = gy - (gy - ty) * 0.2, bot = gy - (gy - ty) * 0.75;
    for (i = 0; i <= n; i++) { var yy = top + (bot - top) * i / n; c.lineTo(sx + (i % 2 ? s * 0.09 : -s * 0.09), yy); }
    c.stroke();
    c.strokeStyle = INK; c.lineWidth = Math.max(3, s * 0.06);
    c.beginPath(); c.moveTo(sx - s * 0.14, gy - s * 0.12); c.lineTo(sx + s * 0.14, gy - s * 0.12); c.stroke();
    if (fast) {
      c.fillStyle = '#ffce1f'; c.strokeStyle = INK; c.lineWidth = 1.5;
      for (i = -1; i <= 1; i += 2) { c.beginPath(); c.moveTo(sx + i * s * 0.14, gy - s * 0.18); c.lineTo(sx + i * s * 0.34, gy - s * 0.3); c.lineTo(sx + i * s * 0.16, gy - s * 0.04); c.closePath(); c.fill(); c.stroke(); }
    }
    c.lineCap = 'butt';
  }
  function drawPlayer(K, S, p, leader) {
    var c = K.ctx, s = K.s, ps = st.ps[p.id];
    if (!ps) ps = st.ps[p.id] = { bob: 0, air: false };
    var fx = frac(p.x - 0.5), fy = frac(p.y - 0.5), f = 0;
    if (fx > 0.015 && fx < 0.985) f = fx; else if (fy > 0.015 && fy < 0.985) f = fy;
    var z;
    if (f) { z = HOPZ * Math.sin(Math.PI * f); ps.bob = 0; ps.air = true; }
    else if (p.st) { z = 0; ps.bob = 0; }
    else { ps.bob += K.dt; z = 0.13 * Math.abs(Math.sin(ps.bob * Math.PI / 0.42)); }
    var sq = z < 0.12 ? (0.12 - z) * 2.2 : (z > 0.45 ? -0.08 : 0);
    var L = STICK * (1 - Math.max(0, sq) * 1.2), col = K.color(p.id);
    // casa onde vai cair
    if (p.hop) {
      var hx = K.X(p.tx), hy = K.Y(p.ty, 0), pulse = 0.5 + 0.5 * Math.sin(K.time * 18);
      c.lineWidth = Math.max(3, s * (0.08 + pulse * 0.03)); c.strokeStyle = col;
      c.strokeRect(hx + s * 0.08, hy + s * K.tilt * 0.08, s * 0.84, s * K.tilt * 0.84);
    }
    K.shadow(p.x, p.y, 0.3, Math.max(0.1, 0.3 - z * 0.2));
    var wob = p.st ? Math.sin(K.time * 22) * 0.06 : 0;
    stick(K, p.x + wob, p.y, z, L, col, p.bt);
    var size = 2.35, r = 0.36;
    K.char(p.id, p.x + wob, p.y, z + L, { r: r, squash: sq, size: size, flash: p.st && ((K.time * 8) | 0) % 2 === 0 });
    // em cima da cabeça: casas na mão, coroa, míssil, cadeado, estrelas de tonto
    var sx = K.X(p.x), headY = K.Y(p.y, z + L) - size * r * s * (1 - sq) * 0.92;
    var py = headY - s * 0.2;
    if (p.st) for (var k = 0; k < 3; k++) { var a = K.time * 6 + k * 2.1; star(c, sx + Math.cos(a) * s * 0.32, headY - s * 0.05 + Math.sin(a) * s * 0.1, s * 0.11); }
    if (S.lv !== 'gogo' && p.n > 0) {
      var label = String(p.n), fw = s * (0.28 + label.length * 0.17), fh = s * 0.32;
      c.fillStyle = INK; c.fillRect(sx - fw / 2 + 3, py - fh / 2 + 3, fw, fh);
      c.fillStyle = col; c.fillRect(sx - fw / 2, py - fh / 2, fw, fh);
      c.lineWidth = Math.max(2, s * 0.04); c.strokeStyle = INK; c.strokeRect(sx - fw / 2, py - fh / 2, fw, fh);
      K.pix(label, sx, py + 1, s * 0.27, INK);
      if (leader) crown(c, sx, py - fh / 2 - s * 0.14, s * 0.16);
    } else if (leader) crown(c, sx, py, s * 0.16);
    if (p.ms) badge(K, 'missile', sx + s * 0.48, headY + s * 0.1, s * 0.17);
    if (p.lk > 0) {
      badge(K, 'lock', sx - s * 0.48, headY + s * 0.1, s * 0.17);
      K.pix(String(Math.ceil(p.lk)), sx - s * 0.48, headY + s * 0.38, s * 0.2, '#fff', 'center', INK);
    }
  }
  // o Doido: canguru maluco de bandana vermelha que pula na borda
  function drawDoido(K, n) {
    var c = K.ctx, s = K.s, z = n.z;
    if (z < 0.02) z = 0.15 * Math.abs(Math.sin(K.time * 8));
    K.shadow(n.x, n.y, 0.32, 0.3);
    stick(K, n.x, n.y, z, STICK, '#f0443a', false);
    var sx = K.X(n.x), sy = K.Y(n.y, z + STICK), u = s * 0.42, BR = '#b86b2c';
    c.lineWidth = Math.max(2, s * 0.045); c.strokeStyle = INK;
    // rabo
    c.fillStyle = BR; c.beginPath(); c.moveTo(sx - u * 0.3, sy - u * 0.2); c.lineTo(sx - u * 1.1, sy + u * 0.1); c.lineTo(sx - u * 0.35, sy - u * 0.55); c.closePath(); c.fill(); c.stroke();
    // corpo e barriga
    c.fillStyle = BR; K.ell(sx, sy - u * 0.75, u * 0.55, u * 0.78); c.fill(); c.stroke();
    c.fillStyle = '#f3cf9a'; K.ell(sx + u * 0.05, sy - u * 0.62, u * 0.32, u * 0.5); c.fill();
    // orelhas
    var hy = sy - u * 1.75, i;
    for (i = -1; i <= 1; i += 2) { c.fillStyle = BR; c.beginPath(); c.moveTo(sx + i * u * 0.12, hy - u * 0.3); c.lineTo(sx + i * u * 0.42, hy - u * 1.05); c.lineTo(sx + i * u * 0.42, hy - u * 0.22); c.closePath(); c.fill(); c.stroke(); }
    // cabeça
    c.fillStyle = BR; c.beginPath(); c.arc(sx, hy, u * 0.48, 0, Math.PI * 2); c.fill(); c.stroke();
    // bandana
    c.fillStyle = '#f0443a'; c.fillRect(sx - u * 0.48, hy - u * 0.36, u * 0.96, u * 0.2); c.strokeRect(sx - u * 0.48, hy - u * 0.36, u * 0.96, u * 0.2);
    c.beginPath(); c.moveTo(sx + u * 0.45, hy - u * 0.3); c.lineTo(sx + u * 0.85, hy - u * 0.5 + Math.sin(K.time * 12) * u * 0.1); c.lineTo(sx + u * 0.8, hy - u * 0.1); c.closePath(); c.fill(); c.stroke();
    // olhos malucos
    for (i = -1; i <= 1; i += 2) {
      var ex = sx + i * u * 0.2, ey = hy - u * 0.02;
      c.fillStyle = n.aim ? '#ffd0cc' : '#fff'; c.beginPath(); c.arc(ex, ey, u * 0.17, 0, Math.PI * 2); c.fill(); c.stroke();
      var pa = K.time * (i > 0 ? 7 : -5);
      c.fillStyle = INK; c.beginPath(); c.arc(ex + Math.cos(pa) * u * 0.07, ey + Math.sin(pa) * u * 0.07, u * 0.07, 0, Math.PI * 2); c.fill();
    }
    // boca aberta com um dente
    c.fillStyle = INK; c.beginPath(); c.arc(sx, hy + u * 0.24, u * 0.16, 0, Math.PI); c.fill();
    c.fillStyle = '#fff'; c.fillRect(sx - u * 0.06, hy + u * 0.24, u * 0.1, u * 0.08);
  }
  function drawItem(K, it) {
    if (it.ttl < 2 && ((K.time * 8) | 0) % 2) return;
    var z = 0.32 + 0.08 * Math.sin(K.time * 3 + it.id);
    K.shadow(it.x, it.y, 0.24, 0.25);
    badge(K, it.k, K.X(it.x), K.Y(it.y, z), K.s * 0.3, it.d);
  }
  function drawArrowHint(K, it) {
    // trilho tracejado mostrando até onde a seta pinta
    var c = K.ctx, s = K.s, dirs = it.k === 'arrow4' ? [0, 1, 2, 3] : [it.d], i, k;
    c.fillStyle = 'rgba(53,208,127,.55)';
    for (i = 0; i < dirs.length; i++) for (k = 1; k < N; k++) {
      var cx = it.x + DX[dirs[i]] * k, cy = it.y + DY[dirs[i]] * k;
      if (cx < 0 || cy < 0 || cx > N || cy > N) break;
      c.fillRect(K.X(cx) - s * 0.08, K.Y(cy, 0) - s * K.tilt * 0.08, s * 0.16, s * K.tilt * 0.16);
    }
  }
  function drawCrate(K, cr) {
    var c = K.ctx, s = K.s, pulse = frac(K.time * 1.4);
    c.lineWidth = Math.max(2, s * 0.08 * (1 - pulse)); c.strokeStyle = '#ffce1f';
    K.ell(K.X(cr.x), K.Y(cr.y, 0), s * (0.3 + pulse * 0.4), s * (0.3 + pulse * 0.4) * K.tilt); c.stroke();
    K.shadow(cr.x, cr.y, 0.3, 0.3);
    var bob = 0.1 + 0.06 * Math.abs(Math.sin(K.time * 4));
    K.box(cr.x, cr.y - 0.08, bob, 0.56, '#ffce1f', '#f59e0b', '!', INK);
  }
  function drawTntFloor(K, t) {
    if (t.fly || t.t > 1.6 || ((K.time * 10) | 0) % 2) return;
    var c = K.ctx, s = K.s, cx = Math.floor(t.x), cy = Math.floor(t.y);
    var x0 = Math.max(0, cx - 1), y0 = Math.max(0, cy - 1), x1 = Math.min(N, cx + 2), y1 = Math.min(N, cy + 2);
    c.fillStyle = 'rgba(240,68,58,.42)'; c.fillRect(K.X(x0), K.Y(y0, 0), (x1 - x0) * s, (y1 - y0) * s * K.tilt);
  }
  function drawTnt(K, t) {
    var c = K.ctx, s = K.s;
    K.shadow(t.x, t.y, 0.24, 0.3);
    var top = K.box(t.x, t.y - 0.05, t.z, 0.48, '#f0443a', '#b42318', t.fly ? '' : String(Math.max(1, Math.ceil(t.t))), '#fff');
    // pavio aceso
    var sx = K.X(t.x);
    c.strokeStyle = INK; c.lineWidth = 2; c.beginPath(); c.moveTo(sx, top + s * 0.1); c.lineTo(sx + s * 0.08, top - s * 0.12); c.stroke();
    c.fillStyle = ((K.time * 14) | 0) % 2 ? '#ffce1f' : '#fff'; c.beginPath(); c.arc(sx + s * 0.08, top - s * 0.14, s * 0.06, 0, Math.PI * 2); c.fill();
  }
  function drawMissile(K, m) {
    var c = K.ctx, s = K.s, col = m.o >= 0 ? K.color(m.o) : '#f0443a', z = 0.42;
    var sx = K.X(m.x), sy = K.Y(m.y, z), ang = Math.atan2(DY[m.d] * K.tilt, DX[m.d]);
    K.shadow(m.x, m.y, 0.16, 0.25);
    c.save(); c.translate(sx, sy); c.rotate(ang);
    var R = s * 0.34;
    c.fillStyle = '#ffce1f'; c.beginPath(); c.moveTo(-0.5 * R, -0.12 * R); c.lineTo(-(0.8 + Math.random() * 0.3) * R, 0); c.lineTo(-0.5 * R, 0.12 * R); c.fill();
    c.fillStyle = col; c.strokeStyle = INK; c.lineWidth = Math.max(2, s * 0.04);
    c.beginPath(); c.moveTo(-0.5 * R, -0.2 * R); c.lineTo(0.25 * R, -0.2 * R); c.lineTo(0.6 * R, 0); c.lineTo(0.25 * R, 0.2 * R); c.lineTo(-0.5 * R, 0.2 * R); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#fff'; c.beginPath(); c.moveTo(-0.3 * R, -0.2 * R); c.lineTo(-0.55 * R, -0.45 * R); c.lineTo(-0.55 * R, 0.45 * R); c.lineTo(-0.3 * R, 0.2 * R); c.fill(); c.stroke();
    c.restore();
    K.spawn({ kind: 'dot', x: m.x - DX[m.d] * 0.35, y: m.y - DY[m.d] * 0.35, z: z, vx: 0, vy: 0, vz: 0.6, life: 0.35, size: 0.13, color: '#e4e2d9', g: 0 });
  }
  function drawFlyers(K) {
    var c = K.ctx, s = K.s, list = st.flyers, keep = 0;
    for (var i = 0; i < list.length; i++) {
      var f = list[i]; f.t += K.dt;
      if (f.t >= f.dur) continue;
      list[keep++] = f;
      if (f.t < 0) continue;
      var k = f.t / f.dur, e = k * k * (3 - 2 * k), x = f.x0 + (f.x1 - f.x0) * e, y = f.y0 + (f.y1 - f.y0) * e - Math.sin(Math.PI * k) * K.H * 0.12;
      var w = s * 0.5 * (1 - k * 0.55);
      c.save(); c.translate(x, y); c.rotate(k * 5 + i);
      c.fillStyle = f.col; c.fillRect(-w / 2, -w / 2, w, w); c.lineWidth = 2; c.strokeStyle = INK; c.strokeRect(-w / 2, -w / 2, w, w);
      c.restore();
    }
    list.length = keep;
  }
  function flyTiles(K, tl, slot, col) {
    var to = cardCenter(K, slot);
    for (var i = 0; i < tl.length; i++) {
      var p = tileXY(K, tl[i]);
      st.flyers.push({ x0: p[0], y0: p[1], x1: to[0], y1: to[1], t: -i * 0.022, dur: 0.75, col: col });
      st.flash[tl[i]] = 1; st.flashCol[tl[i]] = col;
    }
  }

  var objs = [];
  var JOGO = {
    title: 'Pogo Pandemonium', color: '#ffce1f', bg: '#2f8f6a', tilt: 0.78,
    lerp: ['x', 'y', 'z'], angles: ['dir'], snap: 2.5,
    arena: function () { return { w: N, d: N }; },
    draw: function (K, S) {
      var c = K.ctx, th = theme(S), i;
      c.fillStyle = pattern(K, th, S.lv || 'painter'); c.fillRect(-20, -20, K.W + 40, K.H + 40);
      diffGrid(K, S);
      drawBoard(K, S, th);
      for (i = 0; i < (S.it || []).length; i++) if (S.it[i].k === 'arrow' || S.it[i].k === 'arrow4') drawArrowHint(K, S.it[i]);
      for (i = 0; i < (S.tnt || []).length; i++) drawTntFloor(K, S.tnt[i]);
      // líder: pontos guardados (só quando um está sozinho na frente)
      var top = 0, lead = -1, tie = false;
      for (i = 0; i < S.p.length; i++) { if (S.p[i].sc > top) { top = S.p[i].sc; lead = S.p[i].id; tie = false; } else if (S.p[i].sc === top && top > 0) tie = true; }
      if (tie) lead = -1;
      objs.length = 0;
      for (i = 0; i < S.p.length; i++) objs.push({ y: S.p[i].y + 0.02, k: 'p', o: S.p[i] });
      for (i = 0; i < (S.it || []).length; i++) objs.push({ y: S.it[i].y, k: 'i', o: S.it[i] });
      for (i = 0; i < (S.tnt || []).length; i++) objs.push({ y: S.tnt[i].y, k: 't', o: S.tnt[i] });
      for (i = 0; i < (S.ms || []).length; i++) objs.push({ y: S.ms[i].y + 0.03, k: 'm', o: S.ms[i] });
      if (S.crate) objs.push({ y: S.crate.y, k: 'c', o: S.crate });
      if (S.npc) objs.push({ y: S.npc.y + 0.01, k: 'n', o: S.npc });
      objs.sort(function (a, b) { return a.y - b.y; });
      for (i = 0; i < objs.length; i++) {
        var o = objs[i];
        if (o.k === 'p') drawPlayer(K, S, o.o, o.o.id === lead);
        else if (o.k === 'i') drawItem(K, o.o);
        else if (o.k === 't') drawTnt(K, o.o);
        else if (o.k === 'm') drawMissile(K, o.o);
        else if (o.k === 'c') drawCrate(K, o.o);
        else if (o.k === 'n') drawDoido(K, o.o);
      }
      drawFlyers(K);
    },
    fx: function (K, f) {
      var col = f.s >= 0 ? K.color(f.s) : '#f0443a';
      if (f.k === 'bump') { K.sfx('bump'); K.ring(f.x, f.y, '#fff', 0.5, 0.3); K.burst(f.x, f.y, 0.4, '#fff', 5, 2, 0.3, 0.1, 2); }
      else if (f.k === 'bank') {
        K.sfx('score'); K.sfx('power'); K.shake(f.n > 10 ? 10 : 6);
        K.ring(f.x, f.y, col, 2.2, 0.6); K.burst(f.x, f.y, 0.5, '#ffce1f', 18, 4, 0.7, 0.18, 6);
        K.float(f.x, f.y, 1.6, f.n ? '+' + f.n : '0', col);
        flyTiles(K, f.tl || [], f.s, col);
      } else if (f.k === 'loop') {
        K.sfx('score'); K.sfx('goal'); K.shake(6);
        K.float(f.x, f.y, 1.6, '+' + f.n, col);
        flyTiles(K, f.tl || [], f.s, col);
        for (var i = 0; i < (f.wl || []).length; i++) { var w = f.wl[i]; K.burst(w % N + 0.5, ((w / N) | 0) + 0.5, 0.1, '#e4e2d9', 2, 2, 0.4, 0.12, 2); }
      } else if (f.k === 'fill') {
        K.sfx('power'); K.float(f.x, f.y, 1.6, 'LAÇO!', col);
        for (var j = 0; j < (f.tl || []).length; j++) { st.flash[f.tl[j]] = 1; st.flashCol[f.tl[j]] = '#fff'; }
      } else if (f.k === 'wipe') {
        K.sfx('out'); K.shake(8); K.float(f.x, f.y, 1.6, 'PERDEU!', '#f0443a');
        for (var m = 0; m < (f.tl || []).length; m++) { var t = f.tl[m]; st.flash[t] = 1; st.flashCol[t] = INK; K.burst(t % N + 0.5, ((t / N) | 0) + 0.5, 0.1, '#55555e', 3, 2.5, 0.5, 0.14, 3); }
      } else if (f.k === 'pick') {
        K.sfx(f.it === 'boots' || f.it === 'lock' ? 'power' : f.it === 'missile' ? 'pick' : 'zap');
        K.ring(f.x, f.y, BADGE[f.it] || '#fff', 1, 0.4);
      } else if (f.k === 'fire') { K.sfx('throw'); K.burst(f.x, f.y, 0.4, '#e4e2d9', 6, 2, 0.4, 0.14, 2); }
      else if (f.k === 'hit') {
        K.sfx('hit'); K.shake(7); K.burst(f.x, f.y, 0.8, '#ffce1f', 14, 4, 0.5, 0.15, 5); K.ring(f.x, f.y, '#f0443a', 1, 0.4);
        if (f.steal && f.by >= 0) K.float(f.x, f.y, 1.8, 'ROUBOU ' + f.steal, K.color(f.by));
      } else if (f.k === 'boom') {
        K.sfx('boom'); K.shake(14); K.ring(f.x, f.y, '#f0443a', 2.2, 0.55);
        K.burst(f.x, f.y, 0.3, '#ff8a1f', 22, 5, 0.7, 0.22, 6); K.burst(f.x, f.y, 0.3, INK, 10, 3, 0.8, 0.2, 4);
      } else if (f.k === 'toss') K.sfx('throw');
      else if (f.k === 'crate') { K.sfx('pop'); K.ring(f.x, f.y, '#ffce1f', 1.2, 0.5); }
    },
    hud: function (slot, S) {
      for (var i = 0; i < S.p.length; i++) if (S.p[i].id === slot) return { text: S.p[i].sc + ' PTS' };
      return { text: '0 PTS' };
    },
  };

  function go() { window.BashTV.register('pogo', JOGO); }
  if (window.BashTV) go(); else { var s = document.createElement('script'); s.src = '/shared/bash/tv.js'; s.onload = go; document.head.appendChild(s); }
})();
