'use strict';
// TV do BALLISTIX (shared/bash/tv.js). Roda na TV da sala (Chrome 47): ES5 puro.
// Quadra quadrada vista em 3/4: cada lado é o gol de alguém, com o placar pintado na borda
// atrás do gol. Bolas grandes com contorno, rastro e sombra, para dar para seguir no meio da bagunça.
(function () {
  var INK = '#0f0f14', N = 14, O = 1.6, OT = 2.6, POST = 1.6, R = 0.38, DEPTH = 0.6, HALF = 1.2, SLED_R = 0.35;
  var SIDES = [
    { ox: 0, oy: N, ax: 1, ay: 0, nx: 0, ny: -1 },
    { ox: 0, oy: 0, ax: 1, ay: 0, nx: 0, ny: 1 },
    { ox: 0, oy: 0, ax: 0, ay: 1, nx: 1, ny: 0 },
    { ox: N, oy: 0, ax: 0, ay: 1, nx: -1, ny: 0 }
  ];
  var CORNERS = [[0, 0], [N, 0], [0, N], [N, N]];
  var POSTS = [[0, 0, POST, POST], [N - POST, 0, N, POST], [0, N - POST, POST, N], [N - POST, N - POST, N, N]];
  var TH = {
    quadra: { bg: '#1d2b4f', dot: 'rgba(255,255,255,0.07)', floor: '#3fb68b', floor2: '#38a87f', line: '#e9fff5', rim: '#2b3a67', rimSide: '#1c2647', post: '#ffce1f', postSide: '#c99a0a', ball: '#ff8a1f', band: '#fff4e0' },
    praia: { bg: '#2a9fe0', dot: 'rgba(255,255,255,0.16)', floor: '#f3d58a', floor2: '#ecc874', line: '#fffaf0', rim: '#35d07f', rimSide: '#1f9a5a', post: '#ff6b9a', postSide: '#c9446f', ball: 'beach', band: '#f0443a' },
    canhao: { bg: '#20222e', dot: 'rgba(255,206,31,0.08)', floor: '#9aa3b5', floor2: '#8f98ab', line: '#e6e9f0', rim: '#3a3f52', rimSide: '#25283a', post: '#f0443a', postSide: '#b02a22', ball: '#e8ebf2', band: '#0f0f14' },
    ceu: { bg: '#7fc8f8', dot: 'rgba(255,255,255,0.22)', floor: '#e2c595', floor2: '#d6b682', line: '#fff6e3', rim: '#9b7448', rimSide: '#6e4f2c', post: '#b8c2d2', postSide: '#7d8799', ball: '#ffffff', band: '#3db4f2' }
  };
  var HOT = '#f0443a';
  var trails = {}, trailSweep = 0, smokeT = 0, patterns = {}, shades = {}, items = [];
  for (var ii = 0; ii < 40; ii++) items.push({ y: 0, k: 0, o: null });

  function X(K, x) { return K.X(x + O); }
  function Y(K, y, z) { return K.Y(y + OT, z); }   // borda de cima mais funda: o boneco de cima não cobre o placar
  function th(S) { return TH[S.lv] || TH.quadra; }
  // cor mais escura (lado das caixas), calculada uma vez por cor
  function shade(hex) {
    if (shades[hex]) return shades[hex];
    var n = parseInt(String(hex).replace('#', ''), 16) || 0;
    var r = Math.round((n >> 16 & 255) * 0.68), g = Math.round((n >> 8 & 255) * 0.68), b = Math.round((n & 255) * 0.68);
    shades[hex] = 'rgb(' + r + ',' + g + ',' + b + ')';
    return shades[hex];
  }
  function pattern(K, t) {
    var key = t.bg + t.dot;
    if (patterns[key]) return patterns[key];
    var cv = document.createElement('canvas'); cv.width = cv.height = 18;
    var g = cv.getContext('2d'); g.fillStyle = t.bg; g.fillRect(0, 0, 18, 18); g.fillStyle = t.dot; g.beginPath(); g.arc(9, 9, 2.2, 0, Math.PI * 2); g.fill();
    patterns[key] = K.ctx.createPattern(cv, 'repeat');
    return patterns[key];
  }
  function player(S, slot) { for (var i = 0; i < S.pl.length; i++) if (S.pl[i].slot === slot) return S.pl[i]; return null; }
  function owner(S, side) { for (var i = 0; i < S.pl.length; i++) if (S.pl[i].side === side) return S.pl[i]; return null; }
  function wx(s, a, d) { return s.ox + s.ax * a + s.nx * d; }
  function wy(s, a, d) { return s.oy + s.ay * a + s.ny * d; }

  // caixa alinhada aos eixos em 3/4: tampa em z1 e frente (lado da câmera) de z1 até z0
  function slab(K, x0, y0, x1, y1, z0, z1, top, side) {
    var c = K.ctx, lx = X(K, x0), rx = X(K, x1), ty = Y(K, y0, z1), by = Y(K, y1, z1), fy = Y(K, y1, z0);
    c.fillStyle = side; c.fillRect(lx, by, rx - lx, fy - by); c.strokeRect(lx, by, rx - lx, fy - by);
    c.fillStyle = top; c.fillRect(lx, ty, rx - lx, by - ty); c.strokeRect(lx, ty, rx - lx, by - ty);
  }
  function rectFloor(K, x0, y0, x1, y1, fill, stroke) {
    var c = K.ctx, lx = X(K, x0), ty = Y(K, y0, 0);
    c.fillStyle = fill; c.fillRect(lx, ty, X(K, x1) - lx, Y(K, y1, 0) - ty);
    if (stroke) c.strokeRect(lx, ty, X(K, x1) - lx, Y(K, y1, 0) - ty);
  }

  // ---------- quadra ----------
  function drawBoard(K, S, t) {
    var c = K.ctx, s = K.s;
    c.lineWidth = Math.max(2, s * 0.07); c.strokeStyle = INK; c.lineJoin = 'round';
    // plataforma (borda) com a frente grossa; no Céu ela flutua
    var thick = S.lv === 'ceu' ? 1.1 : 0.55;
    slab(K, -O, -OT, N + O, N + O, -thick, 0, t.rim, t.rimSide);
    // chão com faixas
    rectFloor(K, 0, 0, N, N, t.floor, true);
    c.fillStyle = t.floor2;
    for (var i = 1; i < 7; i += 2) { var lx = X(K, i * 2), ty = Y(K, 0, 0); c.fillRect(lx, ty, 2 * s, Y(K, N, 0) - ty); }
    // linhas: círculo do meio e diagonais até os postes
    c.strokeStyle = t.line; c.lineWidth = Math.max(2, s * 0.08);
    K.ell(X(K, N / 2), Y(K, N / 2, 0), 2.3 * s, 2.3 * s * K.tilt); c.stroke();
    c.beginPath();
    c.moveTo(X(K, POST + 0.4), Y(K, POST + 0.4, 0)); c.lineTo(X(K, N / 2 - 1.7), Y(K, N / 2 - 1.7, 0));
    c.moveTo(X(K, N - POST - 0.4), Y(K, POST + 0.4, 0)); c.lineTo(X(K, N / 2 + 1.7), Y(K, N / 2 - 1.7, 0));
    c.moveTo(X(K, POST + 0.4), Y(K, N - POST - 0.4, 0)); c.lineTo(X(K, N / 2 - 1.7), Y(K, N / 2 + 1.7, 0));
    c.moveTo(X(K, N - POST - 0.4), Y(K, N - POST - 0.4, 0)); c.lineTo(X(K, N / 2 + 1.7), Y(K, N / 2 + 1.7, 0));
    c.stroke();
    c.strokeStyle = INK; c.lineWidth = Math.max(2, s * 0.07);
    rectFloor(K, 0, 0, N, N, 'rgba(0,0,0,0)', true);
    if (S.sky) drawTilt(K, S);
  }
  // Céu: metade baixa do chão escurece e uma seta grande mostra para onde as bolas descem
  function drawTilt(K, S) {
    var c = K.ctx, k = S.sky, m = Math.sqrt(k.gx * k.gx + k.gy * k.gy) / 2.6;
    if (k.c >= 0 && m > 0.05) {
      var lc = CORNERS[k.c], a = CORNERS[k.c ^ 1], b = CORNERS[k.c ^ 2];
      c.fillStyle = 'rgba(15,15,20,' + (0.2 * m).toFixed(3) + ')';
      c.beginPath(); c.moveTo(X(K, a[0]), Y(K, a[1], 0)); c.lineTo(X(K, lc[0]), Y(K, lc[1], 0)); c.lineTo(X(K, b[0]), Y(K, b[1], 0)); c.closePath(); c.fill();
      var ux = k.gx / (m * 2.6), uy = k.gy / (m * 2.6), L = 2.2 + 2.2 * m, px = -uy, py = ux;
      var x0 = N / 2 + ux * 1.6, y0 = N / 2 + uy * 1.6, x1 = N / 2 + ux * (1.6 + L), y1 = N / 2 + uy * (1.6 + L);
      c.save(); c.globalAlpha = 0.5 + 0.25 * Math.sin(K.time * 6);
      c.fillStyle = '#fff'; c.strokeStyle = INK; c.lineWidth = Math.max(2, K.s * 0.07);
      c.beginPath();
      c.moveTo(X(K, x0 + px * 0.35), Y(K, y0 + py * 0.35, 0)); c.lineTo(X(K, x1 - ux * 0.9 + px * 0.35), Y(K, y1 - uy * 0.9 + py * 0.35, 0));
      c.lineTo(X(K, x1 - ux * 0.9 + px * 0.9), Y(K, y1 - uy * 0.9 + py * 0.9, 0)); c.lineTo(X(K, x1), Y(K, y1, 0));
      c.lineTo(X(K, x1 - ux * 0.9 - px * 0.9), Y(K, y1 - uy * 0.9 - py * 0.9, 0)); c.lineTo(X(K, x1 - ux * 0.9 - px * 0.35), Y(K, y1 - uy * 0.9 - py * 0.35, 0));
      c.lineTo(X(K, x0 - px * 0.35), Y(K, y0 - py * 0.35, 0)); c.closePath(); c.fill(); c.stroke();
      c.restore();
    }
  }
  // gols: buraco escuro com a linha na cor da pessoa; gol fechado vira parede listrada
  function drawGoals(K, S, t) {
    var c = K.ctx, s = K.s;
    for (var side = 0; side < 4; side++) {
      var sd = SIDES[side], pl = owner(S, side);
      if (!pl || pl.out) continue;
      var x0 = wx(sd, POST, 0), y0 = wy(sd, POST, 0), x1 = wx(sd, N - POST, -0.45), y1 = wy(sd, N - POST, -0.45);
      var hot = pl.f > 0 && Math.floor(pl.f * 12) % 2 === 0;
      rectFloor(K, Math.min(x0, x1), Math.min(y0, y1), Math.max(x0, x1), Math.max(y0, y1), hot ? '#f0443a' : INK, false);
      // linha do gol
      c.strokeStyle = K.color(pl.slot); c.lineWidth = Math.max(3, s * 0.16);
      c.beginPath(); c.moveTo(X(K, wx(sd, POST, 0.08)), Y(K, wy(sd, POST, 0.08), 0)); c.lineTo(X(K, wx(sd, N - POST, 0.08)), Y(K, wy(sd, N - POST, 0.08), 0)); c.stroke();
      if (pl.sh > 0) drawShield(K, S, pl, sd);
    }
    c.strokeStyle = INK; c.lineWidth = Math.max(2, s * 0.07);
  }
  function drawShield(K, S, pl, sd) {
    var c = K.ctx, s = K.s, col = K.color(pl.slot), blink = pl.sh < 1.5 && Math.floor(K.time * 10) % 2 === 0;
    if (blink) return;
    c.save();
    c.globalAlpha = 0.55 + 0.2 * Math.sin(K.time * 9);
    c.lineWidth = Math.max(4, s * 0.3); c.strokeStyle = '#7ff3ff';
    c.beginPath(); c.moveTo(X(K, wx(sd, POST, 0.1)), Y(K, wy(sd, POST, 0.1), 0.25)); c.lineTo(X(K, wx(sd, N - POST, 0.1)), Y(K, wy(sd, N - POST, 0.1), 0.25)); c.stroke();
    c.globalAlpha = 1; c.lineWidth = Math.max(2, s * 0.08); c.strokeStyle = col;
    for (var a = POST + 0.6; a < N - POST; a += 1.2) {
      var px = X(K, wx(sd, a, 0.1)), py = Y(K, wy(sd, a, 0.1), 0.25);
      c.beginPath(); c.arc(px, py, s * 0.18, 0, Math.PI * 2); c.stroke();
    }
    c.restore();
  }
  // placar pintado na borda atrás de cada gol, na cor da pessoa
  function drawPlates(K, S) {
    var c = K.ctx, s = K.s;
    for (var i = 0; i < S.pl.length; i++) {
      var pl = S.pl[i], sd = SIDES[pl.side], horiz = !!sd.ax;
      var back = pl.side === 1 ? -2.0 : -1.05, cx = wx(sd, N / 2, back), cy = wy(sd, N / 2, back);
      var hw = horiz ? 1.25 : 0.5, hd = horiz ? 0.5 : 1.1;
      var col = pl.out ? '#94a3b8' : K.color(pl.slot);
      c.lineWidth = Math.max(2, s * 0.07); c.strokeStyle = INK;
      c.fillStyle = INK; c.fillRect(X(K, cx - hw) + s * 0.1, Y(K, cy - hd, 0) + s * 0.1, (hw * 2) * s, hd * 2 * s * K.tilt);
      rectFloor(K, cx - hw, cy - hd, cx + hw, cy + hd, col, true);
      var big = pl.f > 0 ? 1 + pl.f * 0.6 : 1;
      if (pl.out) K.text('FORA', X(K, cx), Y(K, cy, 0), s * (horiz ? 0.55 : 0.32), '#fff', 'center', INK);
      else K.text(String(pl.pts), X(K, cx), Y(K, cy, 0), s * (horiz ? 0.8 : 0.62) * big, pl.f > 0 ? '#f0443a' : '#fff', 'center', INK);
    }
  }
  function drawWall(K, S, side, t) {
    var c = K.ctx, sd = SIDES[side], seg = 0.9, n = Math.round((N - 2 * POST) / seg), a, i;
    c.lineWidth = Math.max(2, K.s * 0.06); c.strokeStyle = INK;
    for (i = 0; i < n; i++) {
      a = POST + i * (N - 2 * POST) / n;
      var b = POST + (i + 1) * (N - 2 * POST) / n;
      var xa = wx(sd, a, 0), ya = wy(sd, a, 0), xb = wx(sd, b, -0.35), yb = wy(sd, b, -0.35);
      var col = i % 2 ? INK : '#ffce1f';
      slab(K, Math.min(xa, xb), Math.min(ya, yb), Math.max(xa, xb), Math.max(ya, yb), 0, 0.55, col, i % 2 ? '#2a2a33' : '#c99a0a');
    }
  }
  function drawPost(K, S, i, t) {
    var c = K.ctx, q = POSTS[i], s = K.s, jit = 0;
    var warn = S.sky && S.sky.w === i, dead = S.sky && S.sky.c === i;
    if (warn) jit = Math.sin(K.time * 60) * 0.06;
    c.lineWidth = Math.max(2, s * 0.07); c.strokeStyle = INK;
    slab(K, q[0] + jit, q[1], q[2] + jit, q[3], 0, 0.9, t.post, t.postSide);
    var cx = (q[0] + q[2]) / 2 + jit, cy = (q[1] + q[3]) / 2, top = 0.9;
    if (S.lv === 'ceu') {
      // motor: hélice girando no alto do poste; o que falhou para e solta fumaça
      var spin = dead ? K.time * 1.5 : K.time * 22;
      c.fillStyle = '#3a3f52'; K.ell(X(K, cx), Y(K, cy, top), 0.62 * s, 0.62 * s * K.tilt); c.fill(); c.stroke();
      c.strokeStyle = '#e6e9f0'; c.lineWidth = Math.max(2, s * 0.1);
      for (var bl = 0; bl < 2; bl++) {
        var ang = spin + bl * Math.PI / 2, dx = Math.cos(ang) * 0.55, dy = Math.sin(ang) * 0.55;
        c.beginPath(); c.moveTo(X(K, cx - dx), Y(K, cy - dy, top)); c.lineTo(X(K, cx + dx), Y(K, cy + dy, top)); c.stroke();
      }
      c.strokeStyle = INK;
      var lamp = dead ? '#f0443a' : warn ? (Math.floor(K.time * 8) % 2 ? '#ffce1f' : '#f0443a') : '#35d07f';
      c.fillStyle = lamp; c.beginPath(); c.arc(X(K, cx), Y(K, cy, top + 0.25), s * 0.16, 0, Math.PI * 2); c.fill(); c.stroke();
      if (warn) K.text('MOTOR!', X(K, cx), Y(K, cy, top + 1.1), s * 0.5, '#ffce1f', 'center', INK);
    }
    if (S.pick && S.pick.c === i) {
      // escudo flutuando em cima do poste
      var bob = Math.sin(K.time * 4) * 0.12, show = S.pick.t > 3 || Math.floor(K.time * 8) % 2 === 0;
      if (show) {
        var px = X(K, cx), py = Y(K, cy, top + 0.75 + bob), r = s * 0.42;
        c.fillStyle = '#7ff3ff'; c.lineWidth = Math.max(2, s * 0.08);
        c.beginPath();
        for (var h = 0; h < 6; h++) { var ha = Math.PI / 6 + h * Math.PI / 3; if (h) c.lineTo(px + Math.cos(ha) * r, py + Math.sin(ha) * r); else c.moveTo(px + Math.cos(ha) * r, py + Math.sin(ha) * r); }
        c.closePath(); c.fill(); c.stroke();
        K.text('+', px, py + 1, r * 1.3, INK, 'center');
        c.globalAlpha = 0.5 + 0.3 * Math.sin(K.time * 8); c.strokeStyle = '#7ff3ff'; c.lineWidth = Math.max(2, s * 0.08);
        K.ell(X(K, cx), Y(K, cy, top), 0.95 * s, 0.95 * s * K.tilt); c.stroke(); c.globalAlpha = 1; c.strokeStyle = INK;
      }
    }
  }

  // ---------- meio: lançador ou Canhão ----------
  function drawDispenser(K, S, t) {
    var c = K.ctx, s = K.s, d = S.disp; if (!d) return;
    var px = X(K, N / 2), py = Y(K, N / 2, 0);
    c.lineWidth = Math.max(2, s * 0.07); c.strokeStyle = INK;
    c.fillStyle = INK; K.ell(px, py, 1.15 * s, 1.15 * s * K.tilt); c.fill();
    c.fillStyle = d.w > 0 && Math.floor(K.time * 12) % 2 ? '#ffce1f' : '#3a3f52';
    K.ell(px, py, 0.8 * s, 0.8 * s * K.tilt); c.fill(); c.stroke();
    if (d.w > 0) {
      // seta mostra para onde a próxima bola vai
      var ux = Math.cos(d.a), uy = Math.sin(d.a), L = 1.3 + d.w * 1.8, vx = -uy, vy = ux;
      c.fillStyle = '#ffce1f';
      c.beginPath();
      c.moveTo(X(K, N / 2 + ux * L), Y(K, N / 2 + uy * L, 0));
      c.lineTo(X(K, N / 2 + ux * (L - 0.7) + vx * 0.5), Y(K, N / 2 + uy * (L - 0.7) + vy * 0.5, 0));
      c.lineTo(X(K, N / 2 + ux * (L - 0.7) - vx * 0.5), Y(K, N / 2 + uy * (L - 0.7) - vy * 0.5, 0));
      c.closePath(); c.fill(); c.stroke();
      // a bola subindo do lançador
      drawBallBody(K, S, t, N / 2, N / 2, R * 0.5 + d.w * R * 0.5, 0, 0, 0, false, -1);
    }
  }
  function drawTurret(K, S, t) {
    var c = K.ctx, s = K.s, tu = S.tur; if (!tu) return;
    var px = X(K, N / 2), base = Y(K, N / 2, 0), top = Y(K, N / 2, 0.9), r = 1.0 * s;
    c.lineWidth = Math.max(2, s * 0.07); c.strokeStyle = INK;
    c.fillStyle = 'rgba(15,15,20,0.3)'; K.ell(px + s * 0.15, base + s * 0.1, r * 1.1, r * 1.1 * K.tilt); c.fill();
    c.fillStyle = '#2a2d3b'; c.fillRect(px - r, top, r * 2, base - top);
    K.ell(px, base, r, r * K.tilt); c.fill();
    c.beginPath(); c.moveTo(px - r, top); c.lineTo(px - r, base); c.moveTo(px + r, top); c.lineTo(px + r, base); c.stroke();
    c.beginPath(); c.save(); c.translate(px, base); c.scale(1, K.tilt); c.arc(0, 0, r, 0, Math.PI); c.restore(); c.stroke();
    // faixas de perigo no corpo
    c.fillStyle = '#ffce1f';
    for (var i = 0; i < 4; i++) c.fillRect(px - r + i * r * 0.5 + r * 0.06, top + (base - top) * 0.3, r * 0.22, (base - top) * 0.4);
    var lit = tu.w > 0 && Math.floor(K.time * 14) % 2 === 0;
    c.fillStyle = lit ? '#ffce1f' : '#565d78'; K.ell(px, top, r, r * K.tilt); c.fill(); c.stroke();
    // cano
    var ux = Math.cos(tu.a), uy = Math.sin(tu.a), ex = X(K, N / 2 + ux * 1.55), ey = Y(K, N / 2 + uy * 1.55, 1.05);
    c.lineCap = 'round';
    c.strokeStyle = INK; c.lineWidth = s * 0.62; c.beginPath(); c.moveTo(px, Y(K, N / 2, 1.05)); c.lineTo(ex, ey); c.stroke();
    c.strokeStyle = lit ? '#f0443a' : '#8b94a7'; c.lineWidth = s * 0.44; c.beginPath(); c.moveTo(px, Y(K, N / 2, 1.05)); c.lineTo(ex, ey); c.stroke();
    c.lineCap = 'butt'; c.strokeStyle = INK; c.lineWidth = Math.max(2, s * 0.07);
    c.fillStyle = '#3a3f52'; K.ell(px, Y(K, N / 2, 1.05), r * 0.45, r * 0.45 * K.tilt); c.fill(); c.stroke();
  }

  // ---------- trenó ----------
  function drawSled(K, S, pl) {
    var c = K.ctx, s = K.s, sd = SIDES[pl.side], col = K.color(pl.slot), dark = shade(col);
    var bob = Math.sin(K.time * 5 + pl.slot) * 0.04, z0 = 0.18 + bob, z1 = 0.42 + bob;
    var x0 = wx(sd, pl.p - HALF, DEPTH - SLED_R), y0 = wy(sd, pl.p - HALF, DEPTH - SLED_R), x1 = wx(sd, pl.p + HALF, DEPTH + SLED_R), y1 = wy(sd, pl.p + HALF, DEPTH + SLED_R);
    var lx = Math.min(x0, x1), rx = Math.max(x0, x1), ty = Math.min(y0, y1), by = Math.max(y0, y1);
    var cx = (lx + rx) / 2, cy = (ty + by) / 2;
    // sombra e brilho do motor embaixo
    c.fillStyle = 'rgba(15,15,20,0.3)'; c.fillRect(X(K, lx + 0.12), Y(K, ty + 0.12, 0), (rx - lx) * s, (by - ty) * s * K.tilt);
    c.lineWidth = Math.max(2, s * 0.07); c.strokeStyle = INK;
    slab(K, lx, ty, rx, by, z0, z1, col, dark);
    // para-choque branco na frente (lado da quadra)
    var fa = wx(sd, pl.p - HALF + 0.1, DEPTH + SLED_R - 0.14), fb = wy(sd, pl.p - HALF + 0.1, DEPTH + SLED_R - 0.14);
    var fc = wx(sd, pl.p + HALF - 0.1, DEPTH + SLED_R - 0.02), fd = wy(sd, pl.p + HALF - 0.1, DEPTH + SLED_R - 0.02);
    c.fillStyle = pl.k ? '#ffce1f' : '#fff';
    var bx = X(K, Math.min(fa, fc)), byy = Y(K, Math.min(fb, fd), z1);
    c.fillRect(bx, byy, Math.abs(fc - fa) * s, Math.max(2, Math.abs(fd - fb) * s * K.tilt)); c.strokeRect(bx, byy, Math.abs(fc - fa) * s, Math.max(2, Math.abs(fd - fb) * s * K.tilt));
    // cargas de chute: duas bolinhas na traseira
    for (var i = 0; i < 2; i++) {
      var on = pl.ch >= i + 1, ka = pl.p + (i ? 0.75 : -0.75), kx = wx(sd, ka, DEPTH - SLED_R + 0.12), ky = wy(sd, ka, DEPTH - SLED_R + 0.12);
      c.fillStyle = on ? '#ffce1f' : 'rgba(15,15,20,0.35)';
      c.beginPath(); c.arc(X(K, kx), Y(K, ky, z1), s * 0.11, 0, Math.PI * 2); c.fill(); if (on) c.stroke();
    }
    if (pl.mg) drawMagnet(K, pl, sd, z1);
    if (pl.k) {
      // chute: arco de impacto na frente
      c.save(); c.globalAlpha = 0.85; c.strokeStyle = '#ffce1f'; c.lineWidth = Math.max(3, s * 0.16);
      var ax = X(K, wx(sd, pl.p, DEPTH + SLED_R + 0.3)), ay = Y(K, wy(sd, pl.p, DEPTH + SLED_R + 0.3), z1);
      K.ell(ax, ay, HALF * s * 1.1, HALF * s * 0.5); c.stroke(); c.restore(); c.strokeStyle = INK;
    }
    K.char(pl.slot, cx + O, cy + OT, z1 - 0.02, { r: 0.46, ring: false, flash: pl.f > 0.3 });
  }
  function drawMagnet(K, pl, sd, z) {
    var c = K.ctx, s = K.s, heat = Math.min(1, pl.ht || 0);
    c.save();
    c.strokeStyle = heat > 0.7 && Math.floor(K.time * 12) % 2 ? '#f0443a' : '#ff6b9a';
    c.lineWidth = Math.max(2, s * 0.08);
    for (var i = 0; i < 3; i++) {
      var k = ((K.time * 1.6 + i / 3) % 1), d = DEPTH + SLED_R + 0.3 + (1 - k) * 3.2;
      c.globalAlpha = 0.2 + 0.6 * k;
      var hx = X(K, wx(sd, pl.p, d)), hy = Y(K, wy(sd, pl.p, d), 0.1), w = (0.8 + (1 - k) * 1.8) * s;
      K.ell(hx, hy, w, w * K.tilt * 0.6); c.stroke();
    }
    c.restore();
    // medidor de calor em cima do trenó
    var mx = X(K, wx(sd, pl.p, DEPTH)) - s * 0.6, my = Y(K, wy(sd, pl.p, DEPTH), z + 1.55);
    c.fillStyle = '#fff'; c.fillRect(mx, my, s * 1.2, s * 0.18);
    c.fillStyle = heat > 0.7 ? '#f0443a' : '#ffce1f'; c.fillRect(mx, my, s * 1.2 * heat, s * 0.18);
    c.lineWidth = 2; c.strokeStyle = INK; c.strokeRect(mx, my, s * 1.2, s * 0.18);
  }

  // ---------- bolas ----------
  function trail(id, x, y) {
    var tr = trails[id];
    if (!tr) { tr = trails[id] = { xs: [x, x, x, x, x, x, x], ys: [y, y, y, y, y, y, y], i: 0, seen: 0 }; }
    tr.i = (tr.i + 1) % 7; tr.xs[tr.i] = x; tr.ys[tr.i] = y; tr.seen = trailSweep;
    return tr;
  }
  function drawBallBody(K, S, t, x, y, r, z, sp, hot, outline, id) {
    var c = K.ctx, s = K.s, px = X(K, x), py = Y(K, y, z + r), rr = r * s;
    var fast = hot || sp >= 12;
    if (fast) { c.fillStyle = '#ffce1f'; c.beginPath(); c.arc(px, py, rr + s * 0.13, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = fast ? HOT : (t.ball === 'beach' ? '#fff' : t.ball);
    c.beginPath(); c.arc(px, py, rr, 0, Math.PI * 2); c.fill();
    var spin = (x + y) * 1.4 + id;
    if (t.ball === 'beach' && !fast) {
      // bola de praia: gomos vermelho, azul e amarelo
      var cols = ['#f0443a', '#3db4f2', '#ffce1f'];
      for (var g = 0; g < 3; g++) { c.fillStyle = cols[g]; c.beginPath(); c.moveTo(px, py); c.arc(px, py, rr, spin + g * 2.094, spin + g * 2.094 + 1.05); c.closePath(); c.fill(); }
    } else {
      c.strokeStyle = fast ? '#ffce1f' : t.band; c.lineWidth = Math.max(2, rr * 0.28);
      c.beginPath(); c.arc(px, py, rr * 0.62, spin, spin + 2.2); c.stroke();
    }
    c.fillStyle = 'rgba(255,255,255,0.8)'; c.beginPath(); c.arc(px - rr * 0.35, py - rr * 0.38, rr * 0.2, 0, Math.PI * 2); c.fill();
    c.strokeStyle = INK; c.lineWidth = Math.max(2, s * 0.075);
    c.beginPath(); c.arc(px, py, rr, 0, Math.PI * 2); c.stroke();
  }
  function drawBall(K, S, t, b) {
    var c = K.ctx, s = K.s, fast = b.hot || b.s >= 12;
    // sombra
    c.fillStyle = 'rgba(15,15,20,0.32)'; K.ell(X(K, b.x + 0.1), Y(K, b.y + 0.12, 0), R * s, R * s * K.tilt); c.fill();
    // rastro: mais comprido quando a bola está rápida
    var tr = trail(b.id, b.x, b.y);
    if (b.h < 0 && b.s > 5) {
      c.fillStyle = fast ? HOT : (t.ball === 'beach' ? '#fff' : t.ball);
      for (var k = 1; k < 7; k++) {
        var j = (tr.i - k + 7) % 7, f = 1 - k / 7;
        c.globalAlpha = 0.4 * f;
        c.beginPath(); c.arc(X(K, tr.xs[j]), Y(K, tr.ys[j], R), R * s * (0.45 + 0.5 * f), 0, Math.PI * 2); c.fill();
      }
      c.globalAlpha = 1;
    }
    drawBallBody(K, S, t, b.x, b.y, R, 0, b.s, b.hot, true, b.id);
  }

  function draw(K, S, G) {
    var c = K.ctx, t = th(S), i, n = 0;
    // fundo do jogo (por cima do fundo liso do shell)
    c.fillStyle = pattern(K, t); c.fillRect(-60, -60, K.W + 120, K.H + 120);
    if (S.lv === 'ceu') drawClouds(K);
    drawBoard(K, S, t);
    drawGoals(K, S, t);
    drawPlates(K, S);
    if (S.disp) drawDispenser(K, S, t);
    // tudo o que tem altura vai numa lista e é desenhado de trás para a frente
    var add = function (y, k, o) { var it = items[n] || (items[n] = { y: 0, k: 0, o: null }); it.y = y; it.k = k; it.o = o; n++; };
    for (i = 0; i < 4; i++) add(POSTS[i][3], 1, i);
    for (i = 0; i < 4; i++) { var ow = owner(S, i); if (!ow || ow.out) add(i === 0 ? N + 0.01 : i === 1 ? 0 : N / 2 - 3, 2, i); }
    for (i = 0; i < S.pl.length; i++) if (!S.pl[i].out) add(wy(SIDES[S.pl[i].side], S.pl[i].p, DEPTH), 3, S.pl[i]);
    for (i = 0; i < S.balls.length; i++) add(S.balls[i].y, 4, S.balls[i]);
    if (S.tur) add(N / 2 + 0.5, 5, null);
    var list = items.slice(0, n);
    list.sort(function (a, b) { return a.y - b.y; });
    trailSweep++;
    for (i = 0; i < list.length; i++) {
      var it = list[i];
      if (it.k === 1) drawPost(K, S, it.o, t);
      else if (it.k === 2) drawWall(K, S, it.o, t);
      else if (it.k === 3) drawSled(K, S, it.o);
      else if (it.k === 4) drawBall(K, S, t, it.o);
      else if (it.k === 5) drawTurret(K, S, t);
    }
    // contorno "raio-x": bola escondida atrás de um boneco ou poste continua visível
    c.save(); c.globalAlpha = 0.5; c.strokeStyle = '#fff'; c.lineWidth = Math.max(1.5, K.s * 0.04);
    for (i = 0; i < S.balls.length; i++) { var bb = S.balls[i]; c.beginPath(); c.arc(X(K, bb.x), Y(K, bb.y, R), R * K.s, 0, Math.PI * 2); c.stroke(); }
    c.restore();
    // limpa rastros de bolas que sumiram
    for (var id in trails) if (trails.hasOwnProperty(id) && trails[id].seen !== trailSweep) delete trails[id];
    if (S.sky && S.sky.c >= 0) smoke(K, S);
    if (S.sd > 0 && Math.floor(K.time * 3) % 2 === 0) K.text('MORTE SÚBITA', K.W / 2, K.H * 0.035, K.H * 0.04, '#f0443a', 'center', INK);
  }
  var CLOUDS = [[0.08, 0.2, 1], [0.86, 0.12, 1.3], [0.12, 0.78, 1.1], [0.9, 0.7, 0.9], [0.5, 0.95, 1.4]];
  function drawClouds(K) {
    var c = K.ctx;
    c.fillStyle = 'rgba(255,255,255,0.75)';
    for (var i = 0; i < CLOUDS.length; i++) {
      var q = CLOUDS[i], x = ((q[0] * K.W + K.time * 8 * q[2]) % (K.W + 300)) - 150, y = q[1] * K.H, r = K.H * 0.05 * q[2];
      c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.arc(x + r * 1.1, y - r * 0.3, r * 1.2, 0, Math.PI * 2); c.arc(x + r * 2.2, y, r * 0.9, 0, Math.PI * 2); c.fill();
    }
  }
  function smoke(K, S) {
    smokeT -= K.dt;
    if (smokeT > 0) return;
    smokeT = 0.08;
    var q = POSTS[S.sky.c], cx = (q[0] + q[2]) / 2, cy = (q[1] + q[3]) / 2;
    K.spawn({ kind: 'dot', x: cx + O + (Math.random() - 0.5) * 0.6, y: cy + OT, z: 1.2, vx: (Math.random() - 0.5) * 0.6, vy: 0, vz: 1.6, life: 1.1, size: 0.35, color: Math.random() < 0.5 ? '#55555e' : '#3a3a42', g: 0 });
  }

  function fx(K, f, S) {
    var x = (f.x || 0) + O, y = (f.y || 0) + OT;
    if (f.k === 'goal') {
      K.sfx('goal'); K.shake(12);
      K.burst(x, y, 0.3, '#f0443a', 14, 5, 0.6, 0.22, 5);
      K.burst(x, y, 0.3, K.color(f.slot), 8, 4, 0.5, 0.18, 4);
      K.float(x, y, 1.2, '-1', '#f0443a');
    } else if (f.k === 'out') {
      K.sfx('out'); K.sfx('boom'); K.shake(22);
      var sd = SIDES[f.side];
      for (var a = POST + 0.5; a < N - POST; a += 1.5) K.burst(wx(sd, a, 0) + O, wy(sd, a, 0) + OT, 0.3, K.color(f.slot), 5, 5, 0.8, 0.25, 6);
    } else if (f.k === 'hit') {
      K.sfx('hit'); K.burst(x, y, 0.4, '#fff', 6, 3, 0.3, 0.14, 2);
    } else if (f.k === 'kick') {
      K.sfx('zap'); K.sfx('hit'); K.shake(5); K.ring(x, y, '#ffce1f', 1.6, 0.35); K.burst(x, y, 0.4, '#ffce1f', 10, 6, 0.35, 0.18, 2);
    } else if (f.k === 'bump') {
      K.sfx('bump'); K.burst(x, y, 0.4, '#fff', 4, 2, 0.25, 0.12, 1);
    } else if (f.k === 'spawn') {
      K.sfx('throw'); K.ring(x, y, '#ffce1f', 1.4, 0.4);
    } else if (f.k === 'fire') {
      K.sfx('throw'); K.sfx('bump'); K.shake(4); K.burst(x, y, 1, '#8b94a7', 10, 3, 0.5, 0.25, 2);
    } else if (f.k === 'shield') {
      K.sfx('power'); K.ring(x, y, '#7ff3ff', 2.2, 0.6); K.float(x, y, 1.6, 'ESCUDO!', '#7ff3ff');
    } else if (f.k === 'grab') {
      K.sfx('pick');
    } else if (f.k === 'blast') {
      K.sfx('zap'); K.shake(6); K.ring(x, y, '#ff6b9a', 2.4, 0.4);
    } else if (f.k === 'heat') {
      K.sfx('bump'); K.burst(x, y, 0.6, '#f0443a', 10, 3, 0.5, 0.2, 3); K.float(x, y, 1.6, 'QUENTE!', '#f0443a');
    } else if (f.k === 'engine') {
      K.sfx('boom'); K.shake(9); K.burst(x, y, 1, '#55555e', 16, 4, 0.9, 0.3, 4);
    } else if (f.k === 'sd') {
      K.sfx('power'); K.float(N / 2 + O, N / 2 + OT, 2, 'MAIS BOLAS!', '#ffce1f');
    }
  }

  var JOGO = {
    title: 'Ballistix', color: '#ff8a1f', bg: '#1d2b4f', tilt: 0.8,
    lerp: ['x', 'y', 'p', 'gx', 'gy'], angles: ['a'], snap: 3,
    // placar de cada um no canto mais perto do seu gol: embaixo, em cima, esquerda, direita
    hudPos: [[0, 1], [1, 0], [0, 0], [1, 1]],
    arena: function () { return { w: N + 2 * O, d: N + O + OT }; },
    draw: draw, fx: fx,
    hud: function (slot, S) {
      var pl = S && S.pl ? player(S, slot) : null;
      if (!pl) return {};
      return { text: pl.out ? 'FORA' : pl.pts + ' PTS', bar: pl.out ? 0 : pl.pts / (pl.max || 1), out: pl.out };
    }
  };
  function go() { window.BashTV.register('ballistix', JOGO); }
  if (window.BashTV) go(); else { var s = document.createElement('script'); s.src = '/shared/bash/tv.js'; s.onload = go; document.head.appendChild(s); }
})();
