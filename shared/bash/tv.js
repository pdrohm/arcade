'use strict';
// TV dos jogos de arena (shared/bash/engine.js). Roda na TV da sala (Chrome 47): ES5 puro.
// Cada jogo chama BashTV.register(id, jogo) no seu games/<id>/tv.js. O jogo só desenha a arena;
// aqui ficam o canvas, a câmera 3/4, a interpolação entre quadros, partículas, tremor, sons,
// placar nos cantos, 3-2-1, faixa do fim da rodada e os cartazes (preparação e pódio).
//
// Jogo (TV):
//   title, color (cor da capa), arena(S) → { w, d } em unidades do mundo, tilt (0.5–1: achatamento da vista)
//   lerp: ['x','y','z'] campos que andam suave; angles: ['dir'] ângulos; snap: 3 (distância que é teleporte)
//   draw(K, S, G)   desenha a arena; S = estado interpolado; G = visão completa do jogo
//   fx(K, f, S)     efeito novo (explosão, gol…) chegou
//   hud(slot, S)    → { text, bar (0–1), out } para o cartão do canto
(function () {
  var A = window.ARCADE, INK = '#0f0f14', PAPER = '#f1f0ea';
  var DELAY = 0.07;

  // ---------- som (sintetizado; a TV pode não liberar áudio antes de um toque) ----------
  var audio = null;
  function ac() {
    if (audio) return audio;
    var C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    try { audio = new C(); } catch (e) { audio = null; }
    return audio;
  }
  function tone(f0, f1, dur, type, vol, delay) {
    var a = ac(); if (!a) return;
    if (a.state === 'suspended' && a.resume) { try { a.resume(); } catch (e) { /* sem som */ } }
    var t = a.currentTime + (delay || 0), o = a.createOscillator(), g = a.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol || 0.08, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol, cutoff) {
    var a = ac(); if (!a) return;
    var n = Math.floor(a.sampleRate * dur), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    var s = a.createBufferSource(), g = a.createGain(), f = a.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = cutoff || 900; s.buffer = buf; g.gain.value = vol || 0.25;
    s.connect(f); f.connect(g); g.connect(a.destination); s.start();
  }
  var SFX = {
    hit: function () { tone(220, 90, 0.12, 'square', 0.09); noise(0.06, 0.12, 2400); },
    bump: function () { tone(160, 70, 0.14, 'triangle', 0.16); },
    boom: function () { noise(0.55, 0.45, 700); tone(90, 30, 0.45, 'sawtooth', 0.12); },
    pop: function () { tone(520, 880, 0.08, 'square', 0.06); },
    pick: function () { tone(330, 520, 0.07, 'triangle', 0.08); },
    throw: function () { tone(500, 200, 0.12, 'triangle', 0.07); },
    jump: function () { tone(300, 640, 0.1, 'square', 0.05); },
    splash: function () { noise(0.4, 0.3, 1400); tone(400, 120, 0.3, 'sine', 0.08); },
    score: function () { tone(660, 0, 0.09, 'square', 0.07); tone(990, 0, 0.12, 'square', 0.07, 0.08); },
    goal: function () { tone(240, 120, 0.25, 'sawtooth', 0.1); tone(180, 90, 0.3, 'sawtooth', 0.08, 0.12); },
    paint: function () { tone(700 + Math.random() * 300, 0, 0.04, 'sine', 0.035); },
    zap: function () { tone(1200, 200, 0.18, 'sawtooth', 0.06); },
    out: function () { tone(500, 60, 0.6, 'triangle', 0.12); },
    count: function () { tone(440, 0, 0.12, 'square', 0.08); },
    go: function () { tone(880, 0, 0.3, 'square', 0.09); },
    win: function () { tone(523, 0, 0.14, 'square', 0.08); tone(659, 0, 0.14, 'square', 0.08, 0.13); tone(784, 0, 0.14, 'square', 0.08, 0.26); tone(1046, 0, 0.35, 'square', 0.08, 0.39); },
    power: function () { tone(400, 1200, 0.25, 'triangle', 0.07); },
  };
  var lastSfx = {};
  function sfx(name) {
    var t = Date.now(); if (lastSfx[name] && t - lastSfx[name] < 45) return; lastSfx[name] = t;
    if (SFX[name]) { try { SFX[name](); } catch (e) { /* sem som */ } }
  }
  function unlock() { var a = ac(); if (a && a.state === 'suspended' && a.resume) { try { a.resume(); } catch (e) { /* */ } } }
  window.addEventListener('keydown', unlock); window.addEventListener('click', unlock); window.addEventListener('touchstart', unlock);

  // ---------- interpolação ----------
  function lerpAng(a, b, t) { var d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return a + d * t; }
  function mix(a, b, t, game) {
    if (!a || a === b) return b;
    if (b instanceof Array) {
      if (!(a instanceof Array) || !b.length || typeof b[0] !== 'object' || b[0] === null) return b;
      var byId = null, out = [], i;
      if (b[0].id !== undefined) { byId = {}; for (i = 0; i < a.length; i++) if (a[i] && a[i].id !== undefined) byId[a[i].id] = a[i]; }
      for (i = 0; i < b.length; i++) out.push(mix(byId ? byId[b[i].id] : a[i], b[i], t, game));
      return out;
    }
    if (typeof b !== 'object' || b === null || typeof a !== 'object' || a === null) return b;
    var o = {}, k, far = false, L = game.lerp, G = game.angles, snapD = game.snap || 3;
    if (typeof a.x === 'number' && typeof b.x === 'number' && typeof a.y === 'number' && typeof b.y === 'number') far = Math.abs(a.x - b.x) + Math.abs(a.y - b.y) > snapD;
    for (k in b) {
      var v = b[k];
      if (typeof v === 'number' && typeof a[k] === 'number' && !far) {
        if (L.indexOf(k) >= 0) o[k] = a[k] + (v - a[k]) * t;
        else if (G.indexOf(k) >= 0) o[k] = lerpAng(a[k], v, t);
        else o[k] = v;
      } else if (v && typeof v === 'object' && k !== 'fx') o[k] = mix(a[k], v, t, game);
      else o[k] = v;
    }
    return o;
  }

  // ---------- kit de desenho ----------
  function Kit(canvas, game) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.game = game;
    this.W = canvas.width; this.H = canvas.height; this.s = 40; this.ox = 0; this.oy = 0; this.tilt = 0.75;
    this.time = 0; this.dt = 0.016; this.shakeAmt = 0; this.parts = []; this.faces = {}; this.seats = [];
    for (var i = 0; i < 260; i++) this.parts.push({ on: false });
  }
  Kit.prototype.fit = function (w, d, tilt, box) {
    // box: área livre da tela em pixels { x, y, w, h }
    this.tilt = tilt || 0.75; this.aw = w; this.ad = d;
    var s = Math.min(box.w / w, box.h / (d * this.tilt + 1.2));
    this.s = s; this.ox = box.x + (box.w - w * s) / 2; this.oy = box.y + (box.h - d * s * this.tilt) / 2 + s * 0.6;
  };
  Kit.prototype.X = function (x) { return this.ox + x * this.s; };
  Kit.prototype.Y = function (y, z) { return this.oy + y * this.s * this.tilt - (z || 0) * this.s; };
  Kit.prototype.seat = function (slot) { return this.seats[slot] || { name: '?', color: '#94a3b8' }; };
  Kit.prototype.color = function (slot) { return this.seat(slot).color || '#94a3b8'; };
  Kit.prototype.sfx = sfx;
  Kit.prototype.shake = function (px) { this.shakeAmt = Math.max(this.shakeAmt, px); };
  Kit.prototype.ell = function (cx, cy, rx, ry) { var c = this.ctx; c.save(); c.translate(cx, cy); c.scale(1, ry / rx); c.beginPath(); c.arc(0, 0, rx, 0, Math.PI * 2); c.restore(); };
  Kit.prototype.shadow = function (x, y, r, alpha) {
    var c = this.ctx; c.fillStyle = 'rgba(15,15,20,' + (alpha === undefined ? 0.28 : alpha) + ')';
    this.ell(this.X(x), this.Y(y, 0), r * this.s, r * this.s * this.tilt); c.fill();
  };
  // Boneco da pessoa (shared/avatar.js) pintado uma vez num canvas pequeno e reaproveitado.
  Kit.prototype.faceCanvas = function (slot) {
    var st = this.seat(slot), key = slot + ':' + st.color + ':' + (st.av ? st.av.join(',') : '');
    var f = this.faces[slot];
    if (f && f.key === key) return f.cv;
    var cv = document.createElement('canvas'); cv.width = cv.height = 128;
    var g = cv.getContext('2d');
    if (A && A.avatar && A.avatar.draw) { try { A.avatar.draw(g, st.av, st.color, 64, 64, 120); } catch (e) { cv = null; } } else cv = null;
    if (!cv) { cv = document.createElement('canvas'); cv.width = cv.height = 128; g = cv.getContext('2d'); g.fillStyle = st.color; g.strokeStyle = INK; g.lineWidth = 6; g.beginPath(); g.arc(64, 64, 52, 0, Math.PI * 2); g.fill(); g.stroke(); }
    this.faces[slot] = { key: key, cv: cv };
    return cv;
  };
  // Personagem: sombra no chão, anel na cor da pessoa e o boneco por cima (pula com z).
  // o: { r (raio no mundo), squash, flash, alpha, dir, ring:false, size }
  Kit.prototype.char = function (slot, x, y, z, o) {
    o = o || {};
    var c = this.ctx, r = o.r || 0.5, s = this.s, sx = this.X(x), gy = this.Y(y, 0), sy = this.Y(y, z || 0);
    var size = (o.size || 2.5) * r * s, sq = o.squash || 0;
    c.save(); if (o.alpha !== undefined) c.globalAlpha = o.alpha;
    if (o.ring !== false) {
      c.lineWidth = Math.max(2, s * 0.07); c.strokeStyle = this.color(slot);
      this.ell(sx, gy, r * s * 1.05, r * s * 1.05 * this.tilt); c.stroke();
    }
    var w = size * (1 + sq), h = size * (1 - sq);
    c.drawImage(this.faceCanvas(slot), sx - w / 2, sy - h * 0.92, w, h);
    if (o.flash) { c.globalAlpha = 0.55 * (o.alpha === undefined ? 1 : o.alpha); c.fillStyle = '#fff'; this.ell(sx, sy - h * 0.45, w * 0.4, h * 0.45); c.fill(); }
    c.restore();
  };
  // Seta curta no chão mostrando para onde a pessoa olha.
  Kit.prototype.facing = function (slot, x, y, dir, len) {
    var c = this.ctx, s = this.s, L = (len || 0.9);
    var x1 = this.X(x + Math.cos(dir) * L), y1 = this.Y(y + Math.sin(dir) * L, 0);
    var x0 = this.X(x + Math.cos(dir) * (L - 0.35)), y0 = this.Y(y + Math.sin(dir) * (L - 0.35), 0);
    var px = -Math.sin(dir) * 0.18 * s, py = Math.cos(dir) * 0.18 * s * this.tilt;
    c.fillStyle = this.color(slot); c.strokeStyle = INK; c.lineWidth = Math.max(1.5, s * 0.04);
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x0 + px, y0 + py); c.lineTo(x0 - px, y0 - py); c.closePath(); c.fill(); c.stroke();
  };
  // Caixa em 3/4: tampa + frente. size em unidades do mundo; z = altura da base.
  Kit.prototype.box = function (x, y, z, size, top, side, mark, markColor) {
    var c = this.ctx, s = this.s, h = size * s, w = size * s, td = size * s * this.tilt;
    var cx = this.X(x), base = this.Y(y + size / 2, z || 0);
    var lw = Math.max(1.5, s * 0.05);
    c.lineWidth = lw; c.strokeStyle = INK; c.lineJoin = 'round';
    c.fillStyle = side; c.fillRect(cx - w / 2, base - h, w, h); c.strokeRect(cx - w / 2, base - h, w, h);
    c.fillStyle = top; c.fillRect(cx - w / 2, base - h - td, w, td); c.strokeRect(cx - w / 2, base - h - td, w, td);
    if (mark) {
      c.fillStyle = markColor || INK; c.font = '900 ' + Math.round(h * (mark.length > 2 ? 0.34 : 0.55)) + 'px Archivo, sans-serif';
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(mark, cx, base - h / 2 + 1);
    }
    return base - h - td;
  };
  Kit.prototype.text = function (str, x, y, size, fill, align, stroke) {
    var c = this.ctx; c.font = '900 ' + Math.round(size) + 'px Archivo, sans-serif'; c.textAlign = align || 'center'; c.textBaseline = 'middle';
    if (stroke) { c.lineWidth = Math.max(3, size * 0.16); c.strokeStyle = stroke; c.lineJoin = 'round'; c.strokeText(str, x, y); }
    c.fillStyle = fill || INK; c.fillText(str, x, y);
  };
  Kit.prototype.pix = function (str, x, y, size, fill, align, stroke) {
    var c = this.ctx; c.font = '700 ' + Math.round(size) + 'px "Pixelify Sans", monospace'; c.textAlign = align || 'center'; c.textBaseline = 'middle';
    if (stroke) { c.lineWidth = Math.max(3, size * 0.18); c.strokeStyle = stroke; c.lineJoin = 'round'; c.strokeText(str, x, y); }
    c.fillStyle = fill || INK; c.fillText(str, x, y);
  };
  // partículas no espaço do mundo (x, y no chão, z para cima)
  Kit.prototype.spawn = function (o) {
    for (var i = 0; i < this.parts.length; i++) { var p = this.parts[i]; if (!p.on) { for (var k in o) p[k] = o[k]; p.on = true; p.age = 0; return p; } }
    return null;
  };
  Kit.prototype.burst = function (x, y, z, color, n, speed, life, size, up) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, v = speed * (0.4 + Math.random() * 0.8);
      this.spawn({ kind: 'dot', x: x, y: y, z: z || 0, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: (up === undefined ? 4 : up) * (0.5 + Math.random()), life: life * (0.6 + Math.random() * 0.6), size: size * (0.6 + Math.random() * 0.8), color: color, g: 14 });
    }
  };
  Kit.prototype.ring = function (x, y, color, radius, life) { this.spawn({ kind: 'ring', x: x, y: y, z: 0, vx: 0, vy: 0, vz: 0, life: life || 0.45, size: radius, color: color, g: 0 }); };
  Kit.prototype.float = function (x, y, z, text, color) { this.spawn({ kind: 'text', x: x, y: y, z: z || 1, vx: 0, vy: 0, vz: 1.4, life: 1, size: 0, text: text, color: color, g: 0 }); };
  Kit.prototype.drawParts = function () {
    var c = this.ctx, dt = this.dt, s = this.s;
    for (var i = 0; i < this.parts.length; i++) {
      var p = this.parts[i]; if (!p.on) continue;
      p.age += dt; if (p.age >= p.life) { p.on = false; continue; }
      var k = 1 - p.age / p.life;
      p.x += p.vx * dt; p.y += p.vy * dt; p.vz -= p.g * dt; p.z += p.vz * dt; if (p.z < 0 && p.g) { p.z = 0; p.vz *= -0.35; p.vx *= 0.7; p.vy *= 0.7; }
      var X = this.X(p.x), Y = this.Y(p.y, p.z);
      if (p.kind === 'dot') { c.fillStyle = p.color; c.globalAlpha = Math.min(1, k * 1.5); var r = p.size * s * (0.5 + k * 0.5); c.fillRect(X - r / 2, Y - r / 2, r, r); }
      else if (p.kind === 'ring') { c.globalAlpha = k; c.strokeStyle = p.color; c.lineWidth = Math.max(2, s * 0.12 * k); var rr = p.size * (1 - k * 0.8) * s; this.ell(X, Y, rr, rr * this.tilt); c.stroke(); }
      else if (p.kind === 'text') { c.globalAlpha = Math.min(1, k * 2); this.text(p.text, X, Y, s * 0.6, p.color, 'center', INK); }
    }
    c.globalAlpha = 1;
  };
  Kit.prototype.clearParts = function () { for (var i = 0; i < this.parts.length; i++) this.parts[i].on = false; };

  // ---------- desenho geral ----------
  function hudCard(K, slot, G, S, game, x, y, w, h, right) {
    var c = K.ctx, st = K.seat(slot), info = game.hud ? game.hud(slot, S) || {} : {};
    var out = !!info.out, u = h / 10;
    c.save(); c.globalAlpha = out ? 0.55 : 1;
    c.fillStyle = INK; c.fillRect(x + u * 0.6, y + u * 0.6, w, h);
    c.fillStyle = '#fff'; c.fillRect(x, y, w, h);
    c.fillStyle = st.color; c.fillRect(right ? x + w - u * 1.3 : x, y, u * 1.3, h);
    c.lineWidth = Math.max(2, u * 0.35); c.strokeStyle = INK; c.strokeRect(x, y, w, h);
    var fx = right ? x + w - u * 1.3 - h * 0.86 : x + u * 1.3 + u * 0.4;
    c.drawImage(K.faceCanvas(slot), fx, y + h * 0.08, h * 0.84, h * 0.84);
    // área de texto: nome em cima; troféus e número no meio; barra embaixo
    var ax = right ? x + u * 0.8 : fx + h * 0.84 + u * 0.6, aw = (right ? fx - u * 0.6 : x + w - u * 0.8) - ax;
    // o nome encolhe até caber (e, no limite, é cortado)
    var name = st.name || '', fs = u * 2.3;
    c.font = '900 ' + Math.round(fs) + 'px Archivo, sans-serif';
    while (fs > u * 1.5 && c.measureText(name).width > aw) { fs -= u * 0.1; c.font = '900 ' + Math.round(fs) + 'px Archivo, sans-serif'; }
    while (name.length > 3 && c.measureText(name).width > aw) { name = name.slice(0, -2) + '…'; }
    K.text(name, right ? ax + aw : ax, y + h * 0.24, fs, INK, right ? 'right' : 'left');
    var pipR = u * 0.7, nt = G.target || 2;
    for (var i = 0; i < nt; i++) {
      var px = right ? ax + aw - pipR - i * pipR * 2.6 : ax + pipR + i * pipR * 2.6, py = y + h * 0.5;
      c.beginPath(); c.arc(px, py, pipR, 0, Math.PI * 2); c.fillStyle = i < (st.wins || 0) ? '#ffce1f' : '#e4e2d9'; c.fill(); c.lineWidth = Math.max(1.5, u * 0.22); c.strokeStyle = INK; c.stroke();
    }
    var hasBar = info.bar !== undefined;
    if (info.text !== undefined) {
      // números em Archivo: na fonte de pixel o 5 parece um S
      if (hasBar) K.text(String(info.text), right ? ax : ax + aw, y + h * 0.5, u * 2.2, INK, right ? 'left' : 'right');
      else K.text(String(info.text), right ? ax + aw : ax, y + h * 0.79, u * 2.9, INK, right ? 'right' : 'left');
    }
    if (hasBar) {
      var bx = ax, by = y + h * 0.68, bw = aw, bh = u * 1.7, v = Math.max(0, Math.min(1, info.bar));
      c.fillStyle = '#e4e2d9'; c.fillRect(bx, by, bw, bh);
      c.fillStyle = info.barColor || (v > 0.5 ? '#35d07f' : v > 0.25 ? '#ffce1f' : '#f0443a'); c.fillRect(right ? bx + bw * (1 - v) : bx, by, bw * v, bh);
      c.lineWidth = Math.max(1.5, u * 0.22); c.strokeStyle = INK; c.strokeRect(bx, by, bw, bh);
    }
    if (out) { c.globalAlpha = 1; c.strokeStyle = '#f0443a'; c.lineWidth = u * 0.6; c.beginPath(); c.moveTo(x + u, y + u); c.lineTo(x + w - u, y + h - u); c.stroke(); }
    c.restore();
  }
  function banner(K, title, sub, color, k) {
    var c = K.ctx, W = K.W, H = K.H, h = H * 0.2, y = H * 0.4 - h / 2, sc = Math.min(1, k * 4);
    c.save(); c.translate(W / 2, H * 0.4); c.scale(sc, sc); c.translate(-W / 2, -H * 0.4);
    c.fillStyle = INK; c.fillRect(W * 0.17, y + H * 0.012, W * 0.68, h);
    c.fillStyle = color || '#ffce1f'; c.fillRect(W * 0.16, y, W * 0.68, h);
    c.lineWidth = H * 0.006; c.strokeStyle = INK; c.strokeRect(W * 0.16, y, W * 0.68, h);
    K.text(title, W / 2, y + h * (sub ? 0.4 : 0.52), h * 0.42, INK);
    if (sub) K.text(sub, W / 2, y + h * 0.78, h * 0.17, INK);
    c.restore();
  }

  function Renderer(canvas, game) {
    this.canvas = canvas; this.game = game; this.K = new Kit(canvas, game);
    this.buf = []; this.G = null; this.seen = {}; this.dead = false; this.last = 0; this.phaseAt = 0; this.phase = ''; this.lastCount = -1;
    this.base = 0; this.baseAt = 0;
    var self = this;
    this.resize();
    this.onResize = function () { self.resize(); };
    window.addEventListener('resize', this.onResize);
    var raf = window.requestAnimationFrame || window.webkitRequestAnimationFrame || function (f) { return setTimeout(function () { f(Date.now()); }, 16); };
    this.raf = raf;
    // um erro no desenho de um quadro não pode parar a TV: avisa uma vez no console e segue
    function loop() { if (self.dead) return; try { self.draw(); } catch (e) { if (!self.warned && window.console) { self.warned = true; console.error(e); } } raf(loop); }
    raf(loop);
  }
  Renderer.prototype.resize = function () {
    var r = this.canvas.getBoundingClientRect(), w = Math.round(r.width) || 1280, h = Math.round(r.height) || 720;
    var scale = Math.min(1, 1280 / w);
    this.canvas.width = Math.round(w * scale); this.canvas.height = Math.round(h * scale);
    this.K.W = this.canvas.width; this.K.H = this.canvas.height;
  };
  Renderer.prototype.update = function (G) {
    var prevPhase = this.G ? this.G.phase : '';
    this.G = G; this.K.seats = G.seats || [];
    if (G.phase !== prevPhase) { this.phase = G.phase; this.phaseAt = Date.now(); if (G.phase === 'countdown' || G.phase === 'loading') { this.buf = []; this.seen = {}; this.K.clearParts(); } if (G.phase === 'roundEnd') sfx(G.champions && G.champions.length ? 'win' : 'win'); }
    if (G.phase === 'countdown' && G.countdown !== this.lastCount) { this.lastCount = G.countdown; if (G.countdown > 0) sfx('count'); }
    if (G.phase === 'playing' && this.lastCount !== 0) { this.lastCount = 0; sfx('go'); }
    var S = G.world; if (!S) return;
    var last = this.buf[this.buf.length - 1];
    if (last && S.t < last.t - 0.001) { this.buf = []; this.seen = {}; }
    if (last && Math.abs(S.t - last.t) < 0.0001 && last.fx && S.fx && last.fx.length === S.fx.length) return;
    var nowS = Date.now() / 1000;
    if (!this.buf.length) { this.base = S.t; this.baseAt = nowS; }
    else {
      // relógio da TV seguindo o do servidor sem saltos: corrige 10% do erro a cada quadro novo
      var est = this.base + (nowS - this.baseAt), err = S.t - est;
      if (Math.abs(err) > 0.5) { this.base = S.t; this.baseAt = nowS; } else this.base += err * 0.1;
    }
    this.buf.push(S); if (this.buf.length > 12) this.buf.shift();
    var fx = S.fx || [];
    for (var i = 0; i < fx.length; i++) if (!this.seen[fx[i].id]) { this.seen[fx[i].id] = 1; this.pendingFx = this.pendingFx || []; this.pendingFx.push(fx[i]); }
  };
  Renderer.prototype.state = function () {
    var b = this.buf; if (!b.length) return null;
    var t = this.base + (Date.now() / 1000 - this.baseAt) - DELAY;
    if (t <= b[0].t) return b[0];
    for (var i = 1; i < b.length; i++) if (b[i].t >= t) { var a = b[i - 1], k = (t - a.t) / Math.max(0.001, b[i].t - a.t); return mix(a, b[i], Math.max(0, Math.min(1, k)), this.game); }
    return b[b.length - 1];
  };
  Renderer.prototype.draw = function () {
    var K = this.K, c = K.ctx, G = this.G, game = this.game, now = Date.now();
    K.dt = this.last ? Math.min(0.05, (now - this.last) / 1000) : 0.016; this.last = now; K.time += K.dt;
    var W = K.W, H = K.H;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = game.bg || '#1b2a3a'; c.fillRect(0, 0, W, H);
    if (!G) return;
    var S = this.state();
    if (S) {
      var ar = game.arena(S) || { w: 16, d: 16 };
      K.fit(ar.w, ar.d, ar.tilt || game.tilt || 0.75, { x: W * 0.17, y: H * 0.05, w: W * 0.66, h: H * 0.9 });
      if (K.shakeAmt > 0.2) { c.translate((Math.random() - 0.5) * K.shakeAmt, (Math.random() - 0.5) * K.shakeAmt); K.shakeAmt *= Math.pow(0.02, K.dt); } else K.shakeAmt = 0;
      if (this.pendingFx && game.fx) { for (var i = 0; i < this.pendingFx.length; i++) game.fx(K, this.pendingFx[i], S); }
      this.pendingFx = null;
      game.draw(K, S, G);
      K.drawParts();
      c.setTransform(1, 0, 0, 1, 0, 0);
      var seats = G.seats || [], cw = W * 0.155, ch = H * 0.12, pos = game.hudPos || [[0, 0], [1, 0], [0, 1], [1, 1]];
      for (var s = 0; s < seats.length; s++) {
        var p = pos[s] || pos[0];
        hudCard(K, s, G, S, game, p[0] ? W - cw - W * 0.012 : W * 0.008, p[1] ? H - ch - H * 0.025 : H * 0.02, cw, ch, !!p[0]);
      }
      if (S.clock !== undefined && S.clock !== null) {
        var t = Math.max(0, Math.ceil(S.clock)), m = Math.floor(t / 60), ss = t % 60, label = m + ':' + (ss < 10 ? '0' : '') + ss;
        c.fillStyle = INK; c.fillRect(W / 2 - W * 0.05 + 4, H * 0.012 + 4, W * 0.1, H * 0.07);
        c.fillStyle = t <= 10 ? '#f0443a' : '#ffce1f'; c.fillRect(W / 2 - W * 0.05, H * 0.012, W * 0.1, H * 0.07);
        c.lineWidth = 3; c.strokeStyle = INK; c.strokeRect(W / 2 - W * 0.05, H * 0.012, W * 0.1, H * 0.07);
        K.pix(label, W / 2, H * 0.05, H * 0.05, INK);
      }
    }
    var k = (now - this.phaseAt) / 1000;
    if (G.phase === 'results' || G.phase === 'setup') { c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = 'rgba(15,15,20,0.55)'; c.fillRect(0, 0, W, H); }
    if (G.phase === 'countdown') {
      var n = G.countdown || 3;
      c.save(); var sc = 1 + Math.max(0, 0.4 - k % 1) ;
      c.translate(W / 2, H * 0.45); c.scale(sc, sc);
      K.pix(String(n), 0, 0, H * 0.3, '#ffce1f', 'center', INK);
      c.restore();
      if (G.roundNo) K.text('RODADA ' + G.roundNo, W / 2, H * 0.67, H * 0.05, '#fff', 'center', INK);
    } else if (G.phase === 'playing' && k < 0.8) {
      c.save(); c.globalAlpha = Math.max(0, 1 - k / 0.8); K.text('JÁ!', W / 2, H * 0.45, H * 0.25, '#35d07f', 'center', INK); c.restore();
    } else if (G.phase === 'roundEnd') {
      var wn = G.roundWinners || [], names = [];
      for (var w = 0; w < wn.length; w++) names.push((G.seats[wn[w]] || {}).name);
      var champ = G.champions && G.champions.length;
      banner(K, names.length ? names.join(' e ') : 'EMPATE', champ ? 'GANHOU O TROFÉU!' : (names.length ? 'VENCEU A RODADA ' + G.roundNo : 'NINGUÉM PONTUA NESTA RODADA'), names.length ? (G.seats[wn[0]] || {}).color : '#e4e2d9', k);
    } else if (G.phase === 'loading') {
      K.text('PREPARANDO A ARENA…', W / 2, H / 2, H * 0.06, '#fff', 'center', INK);
    }
  };
  Renderer.prototype.dispose = function () { this.dead = true; window.removeEventListener('resize', this.onResize); };

  // ---------- cartazes HTML ----------
  function esc(s) { return A.esc ? A.esc(s) : String(s); }
  function face(av, color, px) { return A.avatar && A.avatar.svg ? '<span class="avatar" style="width:' + px + 'px;height:' + px + 'px">' + A.avatar.svg(av, color, px) + '</span>' : ''; }
  function chip(p, extra) { return '<span class="bt-chip" style="background:' + p.color + '">' + face(p.av, p.color, 44) + '<b>' + esc(p.name) + '</b>' + (extra || '') + '</span>'; }
  function setupHtml(game, G) {
    var lv = G.levels[G.level] || G.levels[0], how = '', i, list = '';
    for (i = 0; i < lv.how.length; i++) how += '<li>' + esc(lv.how[i]) + '</li>';
    for (i = 0; i < G.levels.length; i++) list += '<span class="bt-lv' + (i === G.level ? ' on' : '') + '">' + esc(G.levels[i].name) + '</span>';
    var btns = '', ctl = G.controls || { buttons: [] };
    btns += '<span class="bt-key stick">✥</span><b>' + (ctl.stick === 'grid' ? 'pular de casa em casa' : ctl.stick === 'axis' ? 'andar no seu gol' : 'andar') + '</b>';
    for (i = 0; i < ctl.buttons.length; i++) btns += '<span class="bt-key k' + ctl.buttons[i].id + '">' + ctl.buttons[i].id.toUpperCase() + '</span><b>' + esc(ctl.buttons[i].label.toLowerCase()) + '</b>';
    var chips = '';
    for (i = 0; i < G.roster.length; i++) chips += chip(G.roster[i]);
    var cpus = G.cpu ? Math.max(0, 4 - G.roster.length) : 0;
    for (i = 0; i < cpus; i++) chips += '<span class="bt-chip cpu"><b>CPU</b></span>';
    return '<div class="bt-card">' +
      '<div class="bt-logo" style="background-color:' + game.color + '">' + esc(game.title) + '</div>' +
      '<div class="bt-levels">' + list + '</div>' +
      '<div class="bt-level"><h2>' + esc(lv.name) + '</h2><p>' + esc(lv.short) + '</p><ul>' + how + '</ul></div>' +
      '<div class="bt-keys">' + btns + '</div>' +
      '<div class="bt-chips">' + chips + '</div>' +
      '<div class="bt-hint">' + (G.error ? esc(G.error) : 'Quem ganhar ' + G.target + ' rodada' + (G.target > 1 ? 's' : '') + ' leva o troféu · o primeiro jogador escolhe e começa pelo celular') + '</div>' +
      '</div>';
  }
  function resultsHtml(game, G) {
    var seats = G.seats.slice().sort(function (a, b) { return b.wins - a.wins; }), out = '';
    for (var i = 0; i < seats.length; i++) {
      var p = seats[i], champ = G.champions.indexOf(p.slot) >= 0;
      out += '<div class="bt-pod' + (champ ? ' champ' : '') + '" style="background:' + p.color + '">' + (champ ? '<div class="bt-cup">🏆</div>' : '') + face(p.av, p.color, champ ? 150 : 90) + '<b>' + esc(p.name) + '</b><small>' + p.wins + ' rodada' + (p.wins === 1 ? '' : 's') + '</small></div>';
    }
    return '<div class="bt-results"><div class="bt-logo small" style="background-color:' + game.color + '">' + esc(game.title) + '</div><div class="bt-podium">' + out + '</div><div class="bt-hint">Revanche ou outra arena pelo celular</div></div>';
  }

  function register(id, game) {
    game.lerp = game.lerp || ['x', 'y', 'z']; game.angles = game.angles || ['dir'];
    var renderer = null, overlayKey = '', readyId = null;
    function css() {
      if (document.getElementById('bash-tv-css')) return;
      var l = document.createElement('link'); l.id = 'bash-tv-css'; l.rel = 'stylesheet'; l.href = '/shared/bash/tv.css'; document.head.appendChild(l);
    }
    function stop() { if (renderer) renderer.dispose(); renderer = null; overlayKey = ''; readyId = null; document.body.classList.remove('bash-tv'); }
    function overlay(G) {
      var el = document.getElementById('bash-overlay'); if (!el) return;
      var key = G.phase === 'setup' ? 'setup:' + JSON.stringify([G.level, G.cpu, G.target, G.roster, G.error]) : G.phase === 'results' ? 'res:' + G.matchId : '';
      if (key === overlayKey) return; overlayKey = key;
      el.innerHTML = G.phase === 'setup' ? setupHtml(game, G) : G.phase === 'results' ? resultsHtml(game, G) : '';
    }
    function refresh(c) {
      var G = c.G; if (!G) return;
      if (!renderer) { var cv = document.getElementById('bash-canvas'); if (cv && cv.getContext) renderer = new Renderer(cv, game); }
      if (renderer) renderer.update(G);
      if (G.phase === 'loading' && readyId !== G.matchId && renderer) { readyId = G.matchId; A.send({ t: 'bash-tv-ready', matchId: G.matchId }); }
      overlay(G);
    }
    A.register(id, { tv: {
      mount: function () { stop(); css(); document.body.classList.add('bash-tv'); return '<div id="bash-stage"><canvas id="bash-canvas" width="1280" height="720"></canvas><div id="bash-overlay"></div></div>'; },
      html: function () { return { side: '' }; },
      after: refresh,
      frame: function (c) { if (renderer && c.G) renderer.update(c.G); },
      destroy: stop,
    } });
  }
  window.BashTV = { register: register, Kit: Kit, mix: mix, sfx: sfx };
})();
