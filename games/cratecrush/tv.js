'use strict';
// TV do Crate Crush (Chrome 47: ES5 puro). O shell (shared/bash/tv.js) cuida de canvas, câmera,
// interpolação, placar e cartazes; aqui só a arena: chão e borda de cada tema (desenhados uma vez
// numa camada guardada), buracos, caixas, bonecos, pinguim, frutas, tiros e os efeitos.
(function () {
  var INK = '#0f0f14';
  var AW = 16, AD = 12, TILT = 0.72;

  var THEME = {
    jungle: { bg: '#1d4a24', deco: '#2c6a33', deco2: '#3f8a3c', floor: '#63bb4a', floor2: '#58ad41', rim: '#b8b29c', rimSide: '#7d7766', inner: '#8e8873', base: '#4b4639' },
    space: { bg: '#130d29', deco: '#2a2152', deco2: '#ffffff', floor: '#5a5590', floor2: '#4d4880', rim: '#7c6fd0', rimSide: '#3a3070', inner: '#2b2459', base: '#1d173d' },
    snow: { bg: '#8fc8ea', deco: '#ffffff', deco2: '#d8eefb', floor: '#e9f6fd', floor2: '#d7edf9', rim: '#ffffff', rimSide: '#9cc9e8', inner: '#b8dcf2', base: '#6fa4cf' },
    drain: { bg: '#1c2621', deco: '#33443a', deco2: '#4f6658', floor: '#7a8873', floor2: '#6d7b67', rim: '#9aa48f', rimSide: '#56604f', inner: '#606a59', base: '#2e3a32', water: '#2f8f84', water2: '#5fc4b3' }
  };

  // ---------- camada fixa (fundo + arena) ----------
  var layer = null, layerKey = '';
  function seeded(n) { var s = n; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

  function drawLeaf(c, x, y, r, a, fill) {
    c.save(); c.translate(x, y); c.rotate(a); c.scale(1, 0.45);
    c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fillStyle = fill; c.fill();
    c.lineWidth = Math.max(2, r * 0.12); c.strokeStyle = INK; c.stroke();
    c.restore();
    c.save(); c.translate(x, y); c.rotate(a);
    c.beginPath(); c.moveTo(-r * 0.9, 0); c.lineTo(r * 0.9, 0); c.lineWidth = Math.max(1.5, r * 0.07); c.strokeStyle = INK; c.stroke();
    c.restore();
  }

  function buildLayer(K, lv) {
    var T = THEME[lv] || THEME.jungle, W = K.W, H = K.H, s = K.s;
    var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    var c = cv.getContext('2d'), rnd = seeded(lv.length * 977 + 13), i, x, y;
    var realCtx = K.ctx; K.ctx = c;   // o Kit desenha nesta camada por enquanto
    c.fillStyle = T.bg; c.fillRect(0, 0, W, H);
    var L = K.X(-0.5), R = K.X(AW + 0.5), TOP = K.Y(-0.5, 0.5), F0 = K.Y(AD + 0.5, 0.5);

    // fundo de cada tema
    if (lv === 'jungle') {
      for (i = 0; i < 70; i++) {
        x = rnd() * W; y = rnd() * H;
        if (x > L - 20 && x < R + 20 && y > TOP - 20 && y < F0 + s) continue;
        drawLeaf(c, x, y, s * (0.5 + rnd() * 0.9), rnd() * Math.PI, rnd() < 0.5 ? T.deco : T.deco2);
      }
    } else if (lv === 'space') {
      for (i = 0; i < 160; i++) { x = rnd() * W; y = rnd() * H; var sz = rnd() < 0.15 ? 3 : 1.5; c.fillStyle = rnd() < 0.2 ? '#ffce1f' : '#ffffff'; c.fillRect(x, y, sz, sz); }
      // planeta com anel no canto
      var px = W * 0.08, py = H * 0.42, pr = s * 1.6;
      c.beginPath(); c.arc(px, py, pr, 0, Math.PI * 2); c.fillStyle = '#f472b6'; c.fill(); c.lineWidth = 3; c.strokeStyle = INK; c.stroke();
      c.fillStyle = '#c84d92'; c.fillRect(px - pr * 0.8, py - pr * 0.15, pr * 1.6, pr * 0.22);
      c.save(); c.translate(px, py); c.rotate(-0.35); c.scale(1, 0.28); c.beginPath(); c.arc(0, 0, pr * 1.7, 0, Math.PI * 2); c.restore(); c.lineWidth = 4; c.strokeStyle = '#ffce1f'; c.stroke();
      c.beginPath(); c.arc(W * 0.93, H * 0.75, s * 0.7, 0, Math.PI * 2); c.fillStyle = '#22d3ee'; c.fill(); c.lineWidth = 3; c.strokeStyle = INK; c.stroke();
    } else if (lv === 'snow') {
      for (i = 0; i < 26; i++) {
        x = rnd() * W; y = H * 0.55 + rnd() * H * 0.5;
        c.beginPath(); c.arc(x, y + s, s * (0.9 + rnd() * 1.4), Math.PI, 0); c.fillStyle = rnd() < 0.5 ? T.deco : T.deco2; c.fill(); c.lineWidth = 3; c.strokeStyle = INK; c.stroke();
      }
      for (i = 0; i < 90; i++) { x = rnd() * W; y = rnd() * H; c.fillStyle = '#ffffff'; c.fillRect(x, y, 3, 3); }
    } else if (lv === 'drain') {
      // canos na parede do fundo
      for (i = 0; i < 4; i++) {
        y = TOP - s * (1.1 + i * 0.75);
        if (y < -s) continue;
        c.fillStyle = i % 2 ? '#4f6658' : '#5d7a66'; c.fillRect(0, y, W, s * 0.5); c.lineWidth = 3; c.strokeStyle = INK; c.strokeRect(-4, y, W + 8, s * 0.5);
        for (x = (i * 37) % 120; x < W; x += s * 3.1) { c.fillStyle = '#8a9a80'; c.fillRect(x, y - 3, s * 0.3, s * 0.5 + 6); c.strokeRect(x, y - 3, s * 0.3, s * 0.5 + 6); }
      }
      // canos que descem dos lados
      for (i = 0; i < 2; i++) {
        x = i ? R + s * 0.9 : L - s * 1.5;
        c.fillStyle = '#5d7a66'; c.fillRect(x, 0, s * 0.6, H); c.lineWidth = 3; c.strokeStyle = INK; c.strokeRect(x, -4, s * 0.6, H + 8);
        for (y = s; y < H; y += s * 2.4) { c.fillStyle = '#8a9a80'; c.fillRect(x - 4, y, s * 0.6 + 8, s * 0.28); c.strokeRect(x - 4, y, s * 0.6 + 8, s * 0.28); }
      }
    }

    // base da arena (plataforma) e frente da borda
    var baseB = K.Y(AD + 0.5, -0.7);
    c.fillStyle = T.base; c.fillRect(L, F0, R - L, baseB - F0); c.lineWidth = Math.max(2, s * 0.06); c.strokeStyle = INK; c.strokeRect(L, F0, R - L, baseB - F0);
    if (lv === 'drain') {
      // canal de água na frente
      var wy = baseB + s * 0.15, wh = s * 0.9;
      c.fillStyle = T.water; c.fillRect(0, wy, W, wh); c.strokeRect(-4, wy, W + 8, wh);
    }
    // tampa da borda (anel em volta)
    c.fillStyle = T.rim; c.fillRect(L, TOP, R - L, F0 - TOP);
    c.strokeRect(L, TOP, R - L, F0 - TOP);
    // blocos da borda
    c.lineWidth = Math.max(1.5, s * 0.035);
    for (x = -0.5; x < AW + 0.5; x += 1) {
      c.beginPath(); c.moveTo(K.X(x), TOP); c.lineTo(K.X(x), K.Y(0, 0.5)); c.stroke();
      c.beginPath(); c.moveTo(K.X(x + 0.5), F0); c.lineTo(K.X(x + 0.5), K.Y(AD + 0.5, -0.7)); c.stroke();
    }
    for (y = 0; y < AD; y += 1) {
      c.beginPath(); c.moveTo(L, K.Y(y, 0.5)); c.lineTo(K.X(0), K.Y(y, 0.5)); c.stroke();
      c.beginPath(); c.moveTo(K.X(AW), K.Y(y, 0.5)); c.lineTo(R, K.Y(y, 0.5)); c.stroke();
    }
    // parede de dentro do fundo (a única que a câmera vê)
    var fx0 = K.X(0), fx1 = K.X(AW), fy0 = K.Y(0, 0), fy1 = K.Y(AD, 0);
    c.fillStyle = T.inner; c.fillRect(fx0, K.Y(0, 0.5), fx1 - fx0, fy0 - K.Y(0, 0.5));
    // chão
    c.fillStyle = T.floor; c.fillRect(fx0, fy0, fx1 - fx0, fy1 - fy0);
    var tile = lv === 'space' || lv === 'drain' ? 2 : 1;
    for (y = 0; y < AD; y += tile) for (x = 0; x < AW; x += tile) {
      if (((x + y) / tile) % 2) { c.fillStyle = T.floor2; c.fillRect(K.X(x), K.Y(y, 0), tile * s, tile * s * K.tilt); }
    }
    if (lv === 'space') {
      c.strokeStyle = 'rgba(15,15,20,.45)'; c.lineWidth = 2;
      for (x = 0; x <= AW; x += 2) { c.beginPath(); c.moveTo(K.X(x), fy0); c.lineTo(K.X(x), fy1); c.stroke(); }
      for (y = 0; y <= AD; y += 2) { c.beginPath(); c.moveTo(fx0, K.Y(y, 0)); c.lineTo(fx1, K.Y(y, 0)); c.stroke(); }
      c.fillStyle = '#9d97d6';
      for (y = 0; y < AD; y += 2) for (x = 0; x < AW; x += 2) {
        c.fillRect(K.X(x + 0.2) - 2, K.Y(y + 0.2, 0) - 2, 4, 4); c.fillRect(K.X(x + 1.8) - 2, K.Y(y + 0.2, 0) - 2, 4, 4);
        c.fillRect(K.X(x + 0.2) - 2, K.Y(y + 1.8, 0) - 2, 4, 4); c.fillRect(K.X(x + 1.8) - 2, K.Y(y + 1.8, 0) - 2, 4, 4);
      }
    } else if (lv === 'jungle') {
      c.strokeStyle = '#3f8a34'; c.lineWidth = Math.max(2, s * 0.05);
      for (i = 0; i < 60; i++) {
        x = K.X(0.4 + rnd() * (AW - 0.8)); y = K.Y(0.4 + rnd() * (AD - 0.8), 0);
        c.beginPath(); c.moveTo(x - s * 0.12, y); c.lineTo(x - s * 0.18, y - s * 0.2); c.moveTo(x, y); c.lineTo(x, y - s * 0.26); c.moveTo(x + s * 0.12, y); c.lineTo(x + s * 0.18, y - s * 0.2); c.stroke();
      }
      // trilha de terra no meio
      c.fillStyle = 'rgba(160,110,50,.35)'; K.ell(K.X(AW / 2), K.Y(AD / 2, 0), s * 3.2, s * 3.2 * K.tilt); c.fill();
    } else if (lv === 'snow') {
      c.strokeStyle = 'rgba(255,255,255,.95)'; c.lineWidth = Math.max(3, s * 0.08);
      for (i = 0; i < 16; i++) {
        x = K.X(1 + rnd() * (AW - 3)); y = K.Y(1 + rnd() * (AD - 2), 0);
        c.beginPath(); c.moveTo(x, y); c.lineTo(x + s * (0.8 + rnd()), y - s * 0.35); c.stroke();
      }
      c.strokeStyle = 'rgba(80,150,200,.35)'; c.lineWidth = 2;
      for (i = 0; i < 10; i++) { x = K.X(1 + rnd() * (AW - 2)); y = K.Y(1 + rnd() * (AD - 2), 0); c.beginPath(); c.moveTo(x, y); c.lineTo(x + s * 0.6, y + s * 0.2); c.lineTo(x + s * 0.9, y - s * 0.1); c.stroke(); }
      // ninho do pinguim no centro
      c.fillStyle = 'rgba(120,180,225,.35)'; K.ell(K.X(AW / 2), K.Y(AD / 2, 0), s * 1.3, s * 1.3 * K.tilt); c.fill();
    } else if (lv === 'drain') {
      c.strokeStyle = 'rgba(15,15,20,.35)'; c.lineWidth = 2;
      for (x = 0; x <= AW; x += 2) { c.beginPath(); c.moveTo(K.X(x), fy0); c.lineTo(K.X(x), fy1); c.stroke(); }
      for (y = 0; y <= AD; y += 2) { c.beginPath(); c.moveTo(fx0, K.Y(y, 0)); c.lineTo(fx1, K.Y(y, 0)); c.stroke(); }
      // limo
      for (i = 0; i < 14; i++) { c.fillStyle = 'rgba(70,120,60,.35)'; K.ell(K.X(1 + rnd() * (AW - 2)), K.Y(1 + rnd() * (AD - 2), 0), s * (0.4 + rnd() * 0.7), s * 0.3 * K.tilt); c.fill(); }
      // ralos
      var grates = [[4, 3], [12, 3], [4, 9], [12, 9], [8, 6]];
      for (i = 0; i < grates.length; i++) {
        var gx = K.X(grates[i][0] - 0.5), gy = K.Y(grates[i][1] - 0.5, 0), gw = s, gh = s * K.tilt;
        c.fillStyle = '#2b332c'; c.fillRect(gx, gy, gw, gh); c.lineWidth = 2; c.strokeStyle = INK; c.strokeRect(gx, gy, gw, gh);
        c.strokeStyle = '#9aa48f'; for (var g = 1; g < 4; g++) { c.beginPath(); c.moveTo(gx + gw * g / 4, gy + 2); c.lineTo(gx + gw * g / 4, gy + gh - 2); c.stroke(); }
      }
    }
    c.lineWidth = Math.max(2, s * 0.06); c.strokeStyle = INK; c.strokeRect(fx0, K.Y(0, 0.5), fx1 - fx0, fy1 - K.Y(0, 0.5));
    c.beginPath(); c.moveTo(fx0, fy0); c.lineTo(fx1, fy0); c.stroke();
    // sombra dura da borda do fundo no chão
    c.fillStyle = 'rgba(15,15,20,.18)'; c.fillRect(fx0, fy0, fx1 - fx0, s * 0.18);
    K.ctx = realCtx;
    return cv;
  }

  // ---------- peças ----------
  var CR8 = {
    w: { top: '#eab468', side: '#c47f35' },
    f: { top: '#eab468', side: '#c47f35' },
    t: { top: '#ff8a5c', side: '#e8382f' },
    n: { top: '#9dffae', side: '#2fcf5a' },
    i: { top: '#c9a2ff', side: '#8b4ef0' }
  };
  var lastDigit = {};

  function crate(K, cr, alpha) {
    var c = K.ctx, s = K.s, sz = 0.8, kind = CR8[cr.k] || CR8.w, z = cr.z, x = cr.x, y = cr.y;
    if (cr.k === 'n' && cr.s === 'g') z += Math.abs(Math.sin(K.time * 9 + cr.id)) * 0.06;
    var side = kind.side, top = kind.top, lit = cr.u > 0;
    if (lit) {
      var rate = cr.u >= 3 ? 3 : cr.u === 2 ? 5 : 9;
      if (Math.floor(K.time * rate * 2) % 2 === 0) { side = '#fff3d6'; top = '#ffffff'; }
    }
    if (alpha !== undefined) c.globalAlpha = alpha;
    if (cr.k === 'n') {
      // brilho verde em volta da Nitro
      c.globalAlpha = (alpha === undefined ? 1 : alpha) * (0.5 + 0.4 * Math.sin(K.time * 6 + cr.id));
      c.strokeStyle = '#7dff9a'; c.lineWidth = Math.max(2, s * 0.08); K.ell(K.X(x), K.Y(y + 0.1, z), s * 0.68, s * 0.68 * K.tilt); c.stroke();
      c.globalAlpha = alpha === undefined ? 1 : alpha;
    }
    var topY = K.box(x, y, z, sz, top, side, null);
    var cx = K.X(x), base = K.Y(y + sz / 2, z), h = sz * s, w = sz * s, td = sz * s * K.tilt;
    c.lineWidth = Math.max(1, s * 0.03); c.strokeStyle = INK;
    if (cr.k === 'w' || cr.k === 'f') {
      // tábuas: moldura e diagonal na frente, frestas na tampa
      c.strokeRect(cx - w * 0.38, base - h * 0.88, w * 0.76, h * 0.76);
      c.beginPath(); c.moveTo(cx - w * 0.38, base - h * 0.12); c.lineTo(cx + w * 0.38, base - h * 0.88); c.stroke();
      c.beginPath(); c.moveTo(cx - w / 2, topY + td * 0.5); c.lineTo(cx + w / 2, topY + td * 0.5); c.stroke();
      if (cr.k === 'f') {
        c.beginPath(); c.arc(cx, base - h * 0.5, h * 0.27, 0, Math.PI * 2); c.fillStyle = '#ffce1f'; c.fill(); c.lineWidth = Math.max(1.5, s * 0.04); c.stroke();
        K.text('?', cx, base - h * 0.48, h * 0.42, INK);
      }
    } else if (cr.k === 't') {
      c.fillStyle = '#ffce1f'; c.fillRect(cx - w / 2, base - h * 0.66, w, h * 0.32); c.strokeRect(cx - w / 2, base - h * 0.66, w, h * 0.32);
      K.text('TNT', cx, base - h * 0.5, h * 0.3, INK);
      if (lit) {
        var bump = 1 + 0.25 * (1 - ((K.time * 2) % 1));
        K.pix(String(cr.u), cx, topY - s * 0.45, s * 0.85 * bump, cr.u === 1 ? '#f0443a' : '#ffce1f', 'center', INK);
      }
    } else if (cr.k === 'n') {
      K.text('N', cx, base - h * 0.48, h * 0.6, '#0f0f14');
      c.strokeRect(cx - w * 0.4, base - h * 0.9, w * 0.8, h * 0.8);
    } else if (cr.k === 'i') {
      c.beginPath(); c.arc(cx, base - h * 0.5, h * 0.27, 0, Math.PI * 2); c.fillStyle = '#fff'; c.fill(); c.lineWidth = Math.max(1.5, s * 0.04); c.stroke();
      K.text('!', cx, base - h * 0.48, h * 0.42, '#8b4ef0');
    }
    c.globalAlpha = 1;
  }

  function stars(K, x, y, z, n, color) {
    var c = K.ctx, s = K.s;
    for (var i = 0; i < n; i++) {
      var a = K.time * 5 + i * Math.PI * 2 / n;
      var sx = K.X(x + Math.cos(a) * 0.4), sy = K.Y(y + Math.sin(a) * 0.4, z);
      c.fillStyle = color || '#ffce1f'; c.strokeStyle = INK; c.lineWidth = 1.5;
      c.beginPath();
      for (var k = 0; k < 10; k++) { var r = k % 2 ? s * 0.06 : s * 0.14, b = k * Math.PI / 5 - Math.PI / 2; if (k) c.lineTo(sx + Math.cos(b) * r, sy + Math.sin(b) * r); else c.moveTo(sx + Math.cos(b) * r, sy + Math.sin(b) * r); }
      c.closePath(); c.fill(); c.stroke();
    }
  }

  function itemIcon(K, kind, x, y, sz) {
    var c = K.ctx;
    c.lineWidth = Math.max(1.5, sz * 0.12); c.strokeStyle = INK;
    if (kind === 'ball') { c.beginPath(); c.arc(x, y, sz * 0.5, 0, Math.PI * 2); c.fillStyle = '#ffe14d'; c.fill(); c.stroke(); c.beginPath(); c.moveTo(x - sz * 0.25, y - sz * 0.2); c.lineTo(x + sz * 0.05, y); c.lineTo(x - sz * 0.1, y + sz * 0.05); c.lineTo(x + sz * 0.25, y + sz * 0.25); c.stroke(); }
    else if (kind === 'missile') { c.fillStyle = '#f0443a'; c.fillRect(x - sz * 0.5, y - sz * 0.2, sz, sz * 0.4); c.strokeRect(x - sz * 0.5, y - sz * 0.2, sz, sz * 0.4); c.fillStyle = '#fff'; c.beginPath(); c.moveTo(x + sz * 0.5, y - sz * 0.2); c.lineTo(x + sz * 0.8, y); c.lineTo(x + sz * 0.5, y + sz * 0.2); c.closePath(); c.fill(); c.stroke(); }
    else if (kind === 'shield') { c.beginPath(); c.moveTo(x - sz * 0.4, y - sz * 0.45); c.lineTo(x + sz * 0.4, y - sz * 0.45); c.lineTo(x + sz * 0.4, y); c.lineTo(x, y + sz * 0.5); c.lineTo(x - sz * 0.4, y); c.closePath(); c.fillStyle = '#3db4f2'; c.fill(); c.stroke(); }
  }

  function player(K, p) {
    var c = K.ctx, s = K.s, slot = p.id;
    var flash = p.fl && Math.floor(K.time * 24) % 2 === 0;
    var sq = p.z > 0.15 ? -0.1 : 0;
    if (p.k > 0) sq = 0.08 * Math.sin(p.k * 40);
    K.facing(slot, p.x, p.y, p.dir, 0.85);
    K.char(slot, p.x, p.y, p.z, { r: 0.45, flash: flash, squash: sq });
    var headY = K.Y(p.y, p.z + 1.2);
    if (p.k > 0) {
      // chute giratório: rodamoinho em volta
      c.save(); c.globalAlpha = Math.min(1, p.k * 5); c.strokeStyle = '#ffffff'; c.lineWidth = Math.max(3, s * 0.1);
      var a0 = K.time * 30;
      for (var i = 0; i < 2; i++) {
        c.save(); c.translate(K.X(p.x), K.Y(p.y, p.z + 0.35)); c.scale(1, K.tilt); c.beginPath(); c.arc(0, 0, s * 1.15, a0 + i * Math.PI, a0 + i * Math.PI + 1.8); c.restore(); c.stroke();
      }
      c.restore();
    }
    if (p.st && !p.fl) stars(K, p.x, p.y, p.z + 1.25, 3);
    if (p.sh > 0 && (p.sh > 1 || Math.floor(K.time * 10) % 2)) {
      c.save(); c.globalAlpha = 0.28; c.fillStyle = '#7fd8ff'; K.ell(K.X(p.x), K.Y(p.y, p.z + 0.55), s * 0.85, s * 0.85); c.fill();
      c.globalAlpha = 0.9; c.lineWidth = Math.max(3, s * 0.08); c.strokeStyle = '#3db4f2'; c.stroke(); c.restore();
    }
    if (p.it) {
      var ix = K.X(p.x) + s * 0.55, iy = headY - s * 0.1;
      itemIcon(K, p.it, ix, iy, s * 0.42);
      if (p.n > 1) K.text('×' + p.n, ix + s * 0.42, iy, s * 0.32, '#fff', 'left', INK);
    }
  }

  function penguin(K, g) {
    var c = K.ctx, s = K.s, x = K.X(g.x), moving = g.s === 'run' || g.s === 'slow';
    var hop = moving ? Math.abs(Math.sin(K.time * 14)) * 0.12 : 0;
    var y = K.Y(g.y, hop), bw = s * 0.55, bh = s * 0.75;
    if (g.s === 'wake') x += Math.sin(K.time * 60) * 2;
    var face = Math.cos(g.dir) >= 0 ? 1 : -1;
    if (moving) face = Math.floor(K.time * 14) % 2 ? 1 : -1;   // gira
    // pés
    c.fillStyle = '#ff9f1c'; c.strokeStyle = INK; c.lineWidth = Math.max(2, s * 0.05);
    K.ell(x - bw * 0.4, y, bw * 0.3, bw * 0.15); c.fill(); c.stroke();
    K.ell(x + bw * 0.4, y, bw * 0.3, bw * 0.15); c.fill(); c.stroke();
    // corpo
    K.ell(x, y - bh, bw, bh); c.fillStyle = '#1f2436'; c.fill(); c.stroke();
    K.ell(x + face * bw * 0.12, y - bh * 0.85, bw * 0.68, bh * 0.75); c.fillStyle = '#ffffff'; c.fill();
    // asas
    c.fillStyle = '#1f2436';
    var flap = moving ? Math.sin(K.time * 28) * 0.5 : 0.1;
    c.save(); c.translate(x - bw * 0.95, y - bh * 1.05); c.rotate(-0.6 - flap); c.fillRect(-bw * 0.12, 0, bw * 0.24, bh * 0.75); c.strokeRect(-bw * 0.12, 0, bw * 0.24, bh * 0.75); c.restore();
    c.save(); c.translate(x + bw * 0.95, y - bh * 1.05); c.rotate(0.6 + flap); c.fillRect(-bw * 0.12, 0, bw * 0.24, bh * 0.75); c.strokeRect(-bw * 0.12, 0, bw * 0.24, bh * 0.75); c.restore();
    // olhos e bico
    var ey = y - bh * 1.45, sleep = g.s === 'sleep';
    c.fillStyle = INK;
    if (sleep) { c.fillRect(x + face * bw * 0.1 - bw * 0.3, ey, bw * 0.22, s * 0.04); c.fillRect(x + face * bw * 0.1 + bw * 0.1, ey, bw * 0.22, s * 0.04); }
    else if (g.s === 'dizzy') { K.text('x', x + face * bw * 0.1 - bw * 0.2, ey, s * 0.3, INK); K.text('x', x + face * bw * 0.1 + bw * 0.22, ey, s * 0.3, INK); }
    else { c.beginPath(); c.arc(x + face * bw * 0.1 - bw * 0.2, ey, s * 0.07, 0, 6.3); c.arc(x + face * bw * 0.1 + bw * 0.22, ey, s * 0.07, 0, 6.3); c.fill(); }
    c.fillStyle = '#ff9f1c'; c.beginPath(); c.moveTo(x + face * bw * 0.1 - bw * 0.18, ey + s * 0.1); c.lineTo(x + face * bw * 0.1 + face * bw * 0.55, ey + s * 0.2); c.lineTo(x + face * bw * 0.1 + bw * 0.18, ey + s * 0.27); c.closePath(); c.fill(); c.stroke();
    if (moving && g.v > 2) {
      // traços de giro
      c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = Math.max(3, s * 0.08);
      for (var i = 0; i < 3; i++) {
        var a = K.time * 18 + i * 2.1;
        c.save(); c.translate(x, y - bh); c.scale(1, 0.4); c.beginPath(); c.arc(0, 0, bw * 1.6, a, a + 1.1); c.restore(); c.stroke();
      }
    }
    if (sleep) { var zz = (K.time * 0.8) % 1; c.globalAlpha = 1 - zz; K.text('Z', x + bw + zz * s * 0.6, y - bh * 2 - zz * s, s * (0.35 + zz * 0.25), '#1f6fb2', 'center', '#fff'); c.globalAlpha = 1; }
    if (g.s === 'dizzy') stars(K, g.x, g.y, 1.75, 3, '#ffce1f');
    if (g.s === 'wake') K.text('!', x, y - bh * 2.5, s * 0.8, '#f0443a', 'center', INK);
  }

  function fruit(K, f) {
    var c = K.ctx, s = K.s, bob = f.z > 0 ? 0 : 0.12 + Math.sin(K.time * 5 + f.id) * 0.06;
    var x = K.X(f.x), y = K.Y(f.y, f.z + bob + 0.2), r = s * 0.22;
    c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = '#ff8a1f'; c.fill(); c.lineWidth = Math.max(1.5, s * 0.045); c.strokeStyle = INK; c.stroke();
    c.fillStyle = '#ffd08a'; c.fillRect(x - r * 0.45, y - r * 0.5, r * 0.35, r * 0.3);
    c.fillStyle = '#35d07f'; c.beginPath(); c.moveTo(x, y - r); c.lineTo(x + r * 0.8, y - r * 1.5); c.lineTo(x + r * 0.2, y - r * 0.8); c.closePath(); c.fill(); c.stroke();
  }

  function shot(K, b) {
    var c = K.ctx, s = K.s, x = K.X(b.x), y = K.Y(b.y, b.z);
    if (b.k === 'b') {
      c.beginPath(); c.arc(x, y, s * 0.26, 0, Math.PI * 2); c.fillStyle = Math.floor(K.time * 20) % 2 ? '#ffe14d' : '#7fd8ff'; c.fill(); c.lineWidth = 2; c.strokeStyle = INK; c.stroke();
      c.strokeStyle = '#ffffff'; c.lineWidth = 2; c.beginPath();
      for (var i = 0; i < 4; i++) { var a = K.time * 13 + i * 1.57; c.moveTo(x + Math.cos(a) * s * 0.28, y + Math.sin(a) * s * 0.28); c.lineTo(x + Math.cos(a + 0.3) * s * 0.45, y + Math.sin(a + 0.3) * s * 0.45); }
      c.stroke();
    } else {
      c.save(); c.translate(x, y); c.rotate(Math.atan2(Math.sin(b.dir) * K.tilt, Math.cos(b.dir)));
      c.fillStyle = Math.floor(K.time * 30) % 2 ? '#ffce1f' : '#ff7a1f'; c.beginPath(); c.moveTo(-s * 0.3, -s * 0.08); c.lineTo(-s * 0.6, 0); c.lineTo(-s * 0.3, s * 0.08); c.closePath(); c.fill();
      c.fillStyle = '#f0443a'; c.fillRect(-s * 0.3, -s * 0.1, s * 0.45, s * 0.2); c.lineWidth = 2; c.strokeStyle = INK; c.strokeRect(-s * 0.3, -s * 0.1, s * 0.45, s * 0.2);
      c.fillStyle = '#fff'; c.beginPath(); c.moveTo(s * 0.15, -s * 0.1); c.lineTo(s * 0.32, 0); c.lineTo(s * 0.15, s * 0.1); c.closePath(); c.fill(); c.stroke();
      c.restore();
    }
  }

  function hole(K, h) {
    var c = K.ctx, s = K.s, x = K.X(h.x), y = K.Y(h.y, 0), rx = h.r * s, ry = h.r * s * K.tilt;
    c.save();
    K.ell(x, y, rx, ry); c.fillStyle = '#2b2459'; c.fill();
    c.clip();
    K.ell(x, y + s * 0.42, rx, ry); c.fillStyle = '#05030d'; c.fill();
    c.fillStyle = '#ffffff';
    for (var i = 0; i < 5; i++) c.fillRect(x + Math.cos(h.id * 3.1 + i * 1.7) * rx * 0.6, y + s * 0.2 + Math.sin(h.id * 2.3 + i * 2.1) * ry * 0.5, 2, 2);
    c.restore();
    c.lineWidth = Math.max(2, s * 0.07); c.strokeStyle = INK; K.ell(x, y, rx, ry); c.stroke();
    c.lineWidth = Math.max(1.5, s * 0.035); c.strokeStyle = '#ffce1f'; K.ell(x, y, rx + s * 0.08, ry + s * 0.08 * K.tilt); c.stroke();
  }

  // ---------- desenho por quadro ----------
  var items = [], booms = [], waveT = 0;
  for (var ii = 0; ii < 80; ii++) items.push({ y: 0, t: 0, o: null, h: 0 });
  var nItems = 0;
  function add(y, t, o, h) {
    if (nItems >= items.length) items.push({ y: 0, t: 0, o: null, h: 0 });
    var it = items[nItems++]; it.y = y; it.t = t; it.o = o; it.h = h || 0;
  }
  function byY(a, b) { return a.y - b.y; }

  function findPlayer(S, slot) { var ps = S.p || []; for (var i = 0; i < ps.length; i++) if (ps[i].id === slot) return ps[i]; return null; }

  var JOGO = {
    title: 'CRATE CRUSH', color: '#e8a33d', bg: THEME.jungle.bg, tilt: TILT,
    lerp: ['x', 'y', 'z'], angles: ['dir'], snap: 3,
    arena: function () { return { w: AW + 1.4, d: AD + 1.2 }; },
    draw: function (K, S, G) {
      var c = K.ctx, s, i, lv = S.lv || 'jungle', T = THEME[lv] || THEME.jungle;
      JOGO.bg = T.bg;
      // centra o mundo 16×12 dentro da área que o shell reservou (sobra para a borda)
      K.ox += 0.7 * K.s; K.oy += 0.45 * K.s * K.tilt;
      s = K.s;
      var key = lv + ':' + K.W + 'x' + K.H + ':' + Math.round(K.s * 100) + ':' + Math.round(K.ox) + ':' + Math.round(K.oy);
      if (key !== layerKey) { layer = buildLayer(K, lv); layerKey = key; }
      c.fillStyle = T.bg; c.fillRect(-40, -40, K.W + 80, K.H + 80);
      c.drawImage(layer, 0, 0);
      if (lv === 'drain') {
        // ondinhas no canal
        waveT += K.dt;
        var wy = K.Y(AD + 0.5, -0.7) + s * 0.6;
        c.strokeStyle = T.water2; c.lineWidth = Math.max(2, s * 0.06);
        for (i = 0; i < 14; i++) {
          var wx = ((i * 137 + waveT * 60) % (K.W + 120)) - 60;
          c.beginPath(); c.moveTo(wx, wy); c.lineTo(wx + s * 0.4, wy - s * 0.12); c.lineTo(wx + s * 0.8, wy); c.stroke();
        }
      }
      var ho = S.ho || [], ps = S.p || [], cs = S.c || [], fr = S.fr || [], sh = S.sh || [];
      for (i = 0; i < ho.length; i++) hole(K, ho[i]);
      // quem está caindo no buraco (atrás de tudo, recortado pelo buraco)
      for (i = 0; i < ps.length; i++) {
        var p = ps[i]; if (!p.fa) continue;
        var hh = null, bd = 99;
        for (var j = 0; j < ho.length; j++) { var dd = Math.abs(ho[j].x - p.x) + Math.abs(ho[j].y - p.y); if (dd < bd) { bd = dd; hh = ho[j]; } }
        if (!hh || p.z < -4) continue;
        c.save(); K.ell(K.X(hh.x), K.Y(hh.y, 0), hh.r * s, hh.r * s * K.tilt); c.clip();
        K.char(p.id, p.x, p.y, p.z, { r: 0.45, ring: false, alpha: Math.max(0, 1 + p.z / 4), squash: 0.1 });
        c.restore();
      }
      // explosões: disco de fogo por baixo das peças
      for (i = booms.length - 1; i >= 0; i--) {
        var b = booms[i], k = (K.time - b.t) / 0.35;
        if (k >= 1) { booms.splice(i, 1); continue; }
        c.globalAlpha = 1 - k;
        c.fillStyle = b.n ? '#7dff9a' : '#ff7a1f'; K.ell(K.X(b.x), K.Y(b.y, 0), b.r * s * (0.5 + k * 0.6), b.r * s * K.tilt * (0.5 + k * 0.6)); c.fill();
        c.fillStyle = '#ffe14d'; K.ell(K.X(b.x), K.Y(b.y, 0), b.r * s * (0.3 + k * 0.4), b.r * s * K.tilt * (0.3 + k * 0.4)); c.fill();
        c.globalAlpha = 1;
      }
      // sombras e avisos de queda
      for (i = 0; i < cs.length; i++) {
        var cr = cs[i];
        if (cr.s === 'd') {
          var k2 = Math.max(0, Math.min(1, 1 - cr.z / 9));
          K.shadow(cr.x, cr.y, 0.2 + 0.35 * k2, 0.15 + 0.3 * k2);
          c.strokeStyle = 'rgba(240,68,58,' + (0.4 + 0.6 * k2) + ')'; c.lineWidth = Math.max(2, s * 0.05);
          K.ell(K.X(cr.x), K.Y(cr.y, 0), s * 0.55, s * 0.55 * K.tilt); c.stroke();
        } else if (cr.z > 0.05) K.shadow(cr.x, cr.y, 0.42, 0.25);
      }
      for (i = 0; i < ps.length; i++) if (!ps[i].o) K.shadow(ps[i].x, ps[i].y, 0.42, ps[i].z > 0.1 ? 0.18 : 0.28);
      for (i = 0; i < fr.length; i++) K.shadow(fr[i].x, fr[i].y, 0.2, 0.22);
      for (i = 0; i < sh.length; i++) K.shadow(sh[i].x, sh[i].y, 0.22, 0.2);
      if (S.pg) K.shadow(S.pg.x, S.pg.y, 0.6, 0.3);
      // peças em ordem de profundidade
      nItems = 0;
      for (i = 0; i < ps.length; i++) if (!ps[i].o) add(ps[i].y, 1, ps[i]);
      for (i = 0; i < cs.length; i++) {
        var q = cs[i];
        if (q.s === 'h') { var hp = null; for (var m = 0; m < ps.length; m++) if (ps[m].h && Math.abs(ps[m].x - q.x) + Math.abs(ps[m].y - q.y) < 0.6) hp = ps[m]; add((hp ? hp.y : q.y) + 0.01, 2, q); }
        else add(q.y + 0.4, 2, q);
      }
      for (i = 0; i < fr.length; i++) add(fr[i].y, 3, fr[i]);
      for (i = 0; i < sh.length; i++) add(sh[i].y, 4, sh[i]);
      if (S.pg) add(S.pg.y, 5, S.pg);
      var list = items.slice(0, nItems).sort(byY);
      for (i = 0; i < list.length; i++) {
        var it = list[i];
        if (it.t === 1) player(K, it.o);
        else if (it.t === 2) {
          crate(K, it.o);
          if (it.o.k === 't' && it.o.u > 0 && lastDigit[it.o.id] !== it.o.u) { lastDigit[it.o.id] = it.o.u; K.sfx('count'); }
        }
        else if (it.t === 3) fruit(K, it.o);
        else if (it.t === 4) shot(K, it.o);
        else if (it.t === 5) penguin(K, it.o);
      }
    },
    fx: function (K, f) {
      var col = f.s !== undefined ? K.color(f.s) : '#fff';
      if (f.k === 'boom') {
        booms.push({ x: f.x, y: f.y, r: f.r, n: f.n, t: K.time });
        K.burst(f.x, f.y, 0.4, f.n ? '#7dff9a' : '#ffce1f', 22, 7, 0.7, 0.32, 7);
        K.burst(f.x, f.y, 0.4, f.n ? '#2fcf5a' : '#ff7a1f', 18, 5, 0.8, 0.4, 5);
        K.burst(f.x, f.y, 0.6, INK, 10, 3, 1, 0.3, 4);
        K.ring(f.x, f.y, '#ffffff', f.r * 1.2, 0.45);
        K.ring(f.x, f.y, f.n ? '#2fcf5a' : '#ff7a1f', f.r * 0.9, 0.6);
        K.shake(f.n ? 22 : 18); K.sfx('boom');
      } else if (f.k === 'hit') {
        K.burst(f.x, f.y, 0.7, col, f.big ? 14 : 8, 4, 0.45, 0.2, 4);
        K.burst(f.x, f.y, 0.7, '#ffffff', 6, 5, 0.3, 0.14, 3);
        K.float(f.x, f.y, 1.7, '-' + f.d, '#f0443a');
        K.shake(f.big ? 9 : 4); K.sfx('hit');
      } else if (f.k === 'break') {
        var a = f.c === 'i' ? '#8b4ef0' : '#c47f35', b2 = f.c === 'i' ? '#c9a2ff' : '#eab468';
        K.burst(f.x, f.y, (f.z || 0) + 0.4, a, 12, 4, 0.6, 0.22, 5);
        K.burst(f.x, f.y, (f.z || 0) + 0.4, b2, 8, 4, 0.6, 0.16, 5);
        K.shake(3); K.sfx('bump');
      } else if (f.k === 'throw') K.sfx('throw');
      else if (f.k === 'pick') K.sfx('pick');
      else if (f.k === 'jump' || f.k === 'bounce') K.sfx('jump');
      else if (f.k === 'kick') { K.sfx('bump'); K.ring(f.x, f.y, '#ffffff', 1.3, 0.25); }
      else if (f.k === 'lit') { K.sfx('pop'); K.burst(f.x, f.y, 0.9, '#ffce1f', 5, 2, 0.4, 0.1, 3); }
      else if (f.k === 'land') K.burst(f.x, f.y, 0.05, 'rgba(255,255,255,.8)', 6, 2.5, 0.35, 0.14, 1);
      else if (f.k === 'fruit') { K.float(f.x, f.y, 1, '+5', '#35d07f'); K.sfx('score'); }
      else if (f.k === 'fall') { K.float(f.x, f.y, 1, 'CAIU!', '#ffffff'); K.sfx('out'); }
      else if (f.k === 'out') { K.burst(f.x, f.y, 0.6, col, 24, 6, 0.9, 0.28, 6); K.float(f.x, f.y, 1.6, 'FORA!', '#ffffff'); K.sfx('out'); K.shake(10); }
      else if (f.k === 'sink') K.burst(f.x, f.y, 0, '#05030d', 6, 2, 0.4, 0.2, 1);
      else if (f.k === 'item') { K.float(f.x, f.y, 1.8, f.it === 'ball' ? 'BOLA!' : f.it === 'missile' ? 'MÍSSIL!' : 'ESCUDO!', '#c9a2ff'); K.sfx('power'); }
      else if (f.k === 'lose') K.float(f.x, f.y, 2.2, 'SEM ARMA', '#c9a2ff');
      else if (f.k === 'zap') K.sfx('zap');
      else if (f.k === 'launch') { K.sfx('throw'); K.ring(f.x, f.y, '#f0443a', 1.2, 0.3); }
      else if (f.k === 'shield') { K.sfx('power'); K.ring(f.x, f.y, '#3db4f2', 1.4, 0.4); }
      else if (f.k === 'block') { K.ring(f.x, f.y, '#7fd8ff', 1.1, 0.3); K.sfx('pop'); }
      else if (f.k === 'pfft') { K.burst(f.x, f.y, 0.5, f.m ? '#ff7a1f' : '#ffe14d', f.big ? 12 : 6, 3, 0.4, 0.18, 3); if (f.big) K.sfx(f.m ? 'bump' : 'zap'); }
      else if (f.k === 'dizzy') { K.float(f.x, f.y, 2, 'TONTO!', '#ffce1f'); K.sfx('hit'); }
      else if (f.k === 'wake') K.sfx('pop');
    },
    hud: function (slot, S) {
      var p = findPlayer(S, slot);
      if (!p) return { text: '' };
      return { text: p.o ? 'FORA' : String(p.hp), bar: p.hp / 100, out: !!p.o };
    }
  };

  function go() { window.BashTV.register('cratecrush', JOGO); }
  if (window.BashTV) go(); else { var sc = document.createElement('script'); sc.src = '/shared/bash/tv.js'; sc.onload = go; document.head.appendChild(sc); }
})();
