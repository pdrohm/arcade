'use strict';
// Último de Pé — o desenho da arena e os sons. O MESMO arquivo serve a TV e o celular.
// Canvas 2D, sem imagem nenhuma: tudo é pintado na hora. A TV da casa é um Chrome 47 (2016),
// então este arquivo fica em ES5 (var, function) e evita ctx.ellipse, roundRect e afins.
//
// Câmera: de cima, inclinada (o eixo y encolhe para TILT). Ela nunca se mexe nem dá zoom: o
// lugar de cada um na tela é o lugar de cada um na arena, e é isso que a pessoa decora.
//
// O servidor manda o estado (view) e, na execução, um replay já resolvido. Aqui só se desenha:
// nada daqui decide quem caiu. O relógio da fase vem de opts.left() (ms que faltam, já com o
// ajuste de relógio do núcleo), então TV e celulares tocam o replay no mesmo compasso.
(function () {
  // TILT: quanto a câmera "deita" o chão. A TV (larga) usa .58; o celular em pé tem altura de
  // sobra e usa uma câmera quase de cima (.95), que espalha a arena na vertical e deixa mirar fácil.
  // Uma tela só tem um renderizador, então TILT é trocado por quadro (setTilt) e não por chamada.
  var TAU = Math.PI * 2, TILT = 0.58;
  var FONT = "'Arial Black','Helvetica Neue',Impact,Arial,sans-serif";
  var HIDDEN = { aim: 1, ready: 1, lock: 1 };
  var AIMING = { aim: 1, ready: 1 };

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function lerpAngle(a, b, t) { var d = ((b - a) % TAU + TAU * 1.5) % TAU - TAU / 2; return a + d * t; }
  function easeOut(t) { t = clamp(t, 0, 1); return 1 - (1 - t) * (1 - t) * (1 - t); }
  function easeBack(t) { t = clamp(t, 0, 1); var c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }
  function hexRgb(hex) { var h = String(hex || '#888888').replace('#', ''); if (h.length === 3) h = h.replace(/(.)/g, '$1$1'); var n = parseInt(h, 16) || 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function rgba(hex, a) { var c = hexRgb(hex); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
  function shade(hex, k) { var c = hexRgb(hex); var f = function (v) { return Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k); }; return 'rgb(' + f(c[0]) + ',' + f(c[1]) + ',' + f(c[2]) + ')'; }
  function light(hex) { var c = hexRgb(hex); return (c[0] * 299 + c[1] * 587 + c[2] * 114) / 1000 > 133; }
  function seeded(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul ? Math.imul(t ^ (t >>> 15), t | 1) : (t ^ (t >>> 15)) * (t | 1); t ^= t + (Math.imul ? Math.imul(t ^ (t >>> 7), t | 61) : (t ^ (t >>> 7)) * (t | 61)); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function oval(ctx, x, y, rx, ry) { ctx.save(); ctx.translate(x, y); ctx.scale(Math.max(rx, .01), Math.max(ry, .01)); ctx.beginPath(); ctx.arc(0, 0, 1, 0, TAU); ctx.restore(); }
  function rrect(ctx, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r); ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r); ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r); ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r); ctx.closePath(); }
  function now() { return window.performance && performance.now ? performance.now() : Date.now(); }
  function toEdge(ox, oy, dx, dy, radius) { var b = ox * dx + oy * dy, c = ox * ox + oy * oy - radius * radius; return Math.max(0, -b + Math.sqrt(Math.max(0, b * b - c))); }

  // ============================================================================================
  // SOM: sintetizado (WebAudio), sem arquivo. Um contexto só por tela.
  // ============================================================================================
  var Sound = (function () {
    var ac = null, master = null, noiseBuf = null, vol = 1;
    function get() {
      if (ac) return ac;
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try {
        ac = new AC(); master = ac.createGain(); master.gain.value = vol; master.connect(ac.destination);
        noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
        var d = noiseBuf.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      } catch (err) { ac = null; }
      return ac;
    }
    function unlock() { var a = get(); if (a && a.state === 'suspended' && a.resume) { try { a.resume(); } catch (err) {} } }
    function tone(f, dur, type, v, f2, delay) {
      var a = get(); if (!a || a.state === 'suspended') return;
      try {
        var t = a.currentTime + (delay || 0), o = a.createOscillator(), g = a.createGain();
        o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
        if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
      } catch (err) {}
    }
    function noise(dur, v, freq, ftype, f2, delay, q) {
      var a = get(); if (!a || a.state === 'suspended') return;
      try {
        var t = a.currentTime + (delay || 0), src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
        src.buffer = noiseBuf; src.loop = true;
        f.type = ftype || 'lowpass'; f.frequency.setValueAtTime(freq, t); if (f2) f.frequency.exponentialRampToValueAtTime(f2, t + dur); f.Q.value = q || 1;
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        src.connect(f); f.connect(g); g.connect(master); src.start(t, Math.random() * .5); src.stop(t + dur + 0.05);
      } catch (err) {}
    }
    var fx = {
      start: function () { [392, 523, 659, 784].forEach(function (f, i) { tone(f, .16, 'triangle', .22, 0, i * .09); }); },
      round: function () { tone(659, .12, 'triangle', .25); tone(988, .22, 'triangle', .25, 0, .11); },
      tie: function () { tone(220, .5, 'sawtooth', .16, 110); tone(440, .12, 'square', .12, 0, .05); tone(415, .12, 'square', .12, 0, .2); tone(440, .3, 'square', .12, 0, .35); },
      vanish: function () { noise(.55, .22, 2400, 'bandpass', 300, 0, 2); tone(880, .45, 'sine', .14, 200); },
      tick: function (n) { tone(n === 1 ? 1175 : n === 2 ? 988 : 880, .1, 'square', .16); },
      go: function (variant) {
        if (variant === 'shootout') { tone(1568, .12, 'square', .18); tone(784, .3, 'square', .14, 0, .02); }
        else { tone(1319, .28, 'square', .16); tone(1568, .28, 'square', .14); }
      },
      dash: function () { noise(.4, .28, 500, 'highpass', 3200, 0, .8); tone(300, .25, 'sine', .12, 900); },
      shot: function (k) { var d = (k || 0) * .018; noise(.16, .5, 2200, 'bandpass', 700, d, .9); tone(160, .22, 'sine', .38, 45, d); },
      impact: function (s) { s = clamp(s || .5, .2, 1); tone(190, .28, 'sine', .45 * s + .15, 55); noise(.18, .35 * s + .1, 1100, 'lowpass', 200); },
      splash: function () { noise(.7, .35, 1600, 'lowpass', 260); tone(620, .35, 'sine', .22, 140, .03); tone(300, .2, 'sine', .12, 700, .22); },
      down: function () { tone(330, .32, 'square', .12, 110); noise(.25, .25, 900, 'lowpass', 200); },
      ricochet: function () { tone(2600, .22, 'sine', .07, 1100); },
      none: function () { tone(392, .28, 'triangle', .2, 370); tone(349, .5, 'triangle', .2, 311, .3); },
      out: function () { tone(523, .14, 'triangle', .18); tone(392, .14, 'triangle', .18, 0, .12); tone(262, .3, 'triangle', .2, 0, .24); },
      win: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, .2, 'triangle', .24, 0, i * .12); }); tone(1047, .7, 'triangle', .16, 0, .5); tone(1319, .7, 'triangle', .14, 0, .5); tone(1568, .7, 'triangle', .12, 0, .5); },
    };
    return {
      unlock: unlock,
      volume: function (v) { vol = v; if (master) master.gain.value = v; },
      play: function (name, arg) { if (fx[name]) fx[name](arg); },
    };
  })();

  // ============================================================================================
  // RENDERIZADOR
  // ============================================================================================
  function Renderer(canvas, opts) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.opts = opts || {};
    this.kind = this.opts.kind || 'tv';
    // celular em pé: a largura é o limite, então a câmera fica quase de cima e a arena cresce na altura
    this.tilt = this.kind === 'phone' ? (this.opts.tilt || .95) : .58;
    this.charK0 = this.kind === 'phone' ? 1.18 : 1;   // no celular os bonecos crescem um pouco: tela pequena
    this.charK = this.charK0;
    TILT = this.tilt;
    this.G = null; this.dead = false;
    this.parts = []; this.rings = []; this.texts = [];
    this.shake = 0; this.flash = 0; this.dispR = null; this.variant = null;
    this.key = ''; this.tickN = 0; this.goKey = ''; this.seen = null; this.appearAt = 0;
    this.act = null;        // replay em andamento: { key, played: {}, bodies }
    this.lastDown = null;   // pistoleiros derrubados (para continuar no chão no resultado)
    this.bg = null; this.bgKey = '';
    this.W = 0; this.H = 0; this.sc = 20; this.cx = 0; this.cy = 0;
    this.lastT = now(); this.flakes = [];
    var self = this;
    this.onResize = function () { self.resize(); };
    window.addEventListener('resize', this.onResize);
    this.resize();
    var loop = function () { if (self.dead) return; self.frame(); self.raf = window.requestAnimationFrame(loop); };
    this.raf = window.requestAnimationFrame(loop);
  }
  var R = Renderer.prototype;

  R.dispose = function () { this.dead = true; window.cancelAnimationFrame(this.raf); window.removeEventListener('resize', this.onResize); };

  R.resize = function () {
    var c = this.canvas, w = c.clientWidth || 640, h = c.clientHeight || 360;
    var dpr = Math.min(this.kind === 'tv' ? 1 : 2, window.devicePixelRatio || 1);
    if (this.kind === 'tv' && w > 1920) dpr = 1920 / w;   // 4K: desenha em 1080p e o navegador amplia
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
    this.dpr = dpr; this.W = w; this.H = h; this.bgKey = '';
    this.layout();
  };
  // Encaixa a arena (tamanho máximo, R0) na tela com espaço para o HUD em cima e embaixo.
  // No celular a tela inteira é do jogo: em cima fica o HUD, embaixo os controles (opts.insetBottom).
  R.layout = function () {
    TILT = this.tilt;
    var R0 = this.G ? this.G.R0 : 10, phone = this.kind === 'phone';
    var top = phone ? 158 : this.H * .11, bottom = phone ? (this.opts.insetBottom ? this.opts.insetBottom() : 150) : this.H * .07;
    var span = R0 + (phone ? .9 : 1.8);
    var sc = Math.min(this.W * (phone ? .98 : .96) / (2 * span), (this.H - top - bottom) / (2 * span * TILT + 2.4));
    var used = 2 * span * TILT * sc + 2.4 * sc;
    this.sc = sc; this.cx = this.W / 2;
    this.cy = top + Math.max(0, (this.H - top - bottom - used) / 2) + 2.4 * sc + span * TILT * sc;
  };
  R.P = function (x, y, z) { return { x: this.cx + x * this.sc, y: this.cy + y * this.sc * TILT - (z || 0) * this.sc }; };
  R.toWorld = function (sx, sy) { return { x: (sx - this.cx) / this.sc, y: (sy - this.cy) / (this.sc * this.tilt) }; };
  // alcance do dash para uma força (tabela do servidor, interpolada)
  R.reachAt = function (p) {
    var t = this.G && this.G.reachTable;
    if (!t || !t.length) return (this.G && this.G.reach) || 8;
    if (p <= t[0][0]) return t[0][1];
    for (var i = 1; i < t.length; i++) if (p <= t[i][0]) return lerp(t[i - 1][1], t[i][1], (p - t[i - 1][0]) / (t[i][0] - t[i - 1][0]));
    return t[t.length - 1][1];
  };

  R.setState = function (G) {
    var first = !this.G;
    this.G = G;
    if (!G) return;
    // arena maior (muita gente) = tudo menor na tela; os bonecos compensam um pouco para continuar legíveis
    this.charK = this.charK0 * Math.min(1.3, Math.sqrt(G.zoom || 1));
    if (G.variant !== this.variant) { this.variant = G.variant; this.bgKey = ''; this.dispR = null; this.layout(); this.flakes = []; }
    if (first) this.layout();
    if (this.dispR === null || G.phase === 'setup') this.dispR = G.radius;
    this.director(G);
    if (G.bodies && G.bodies.length > 1) this.seen = G.bodies.slice();
  };

  R.nameOf = function (pid) { var r = this.G ? this.G.roster : []; for (var i = 0; i < r.length; i++) if (r[i].pid === pid) return r[i]; return { pid: pid, name: '?', color: '#94a3b8' }; };
  R.youPid = function () { return this.opts.you ? this.opts.you() : null; };
  R.left = function () { var l = this.opts.left ? this.opts.left() : null; return l === null || l === undefined ? 0 : l; };
  R.elapsed = function () { var G = this.G; return G && G.phaseMs ? Math.max(0, G.phaseMs - this.left()) : 0; };
  R.emit = function (name, data) { if (this.opts.onEvent) { try { this.opts.onEvent(name, data || {}); } catch (err) {} } };

  // ---------- transições: sons, efeitos que dependem de mudar de fase ----------
  R.director = function (G) {
    var key = G.matchId + ':' + G.round + ':' + G.phase + ':' + (G.ending ? 1 : 0);
    if (key === this.key) return;
    var prev = this.key; this.key = key;
    var phase = G.phase;
    if (phase === 'intro') Sound.play('start');
    if (phase === 'reveal') {
      Sound.play(G.tiebreak ? 'tie' : 'round');
      this.appearAt = now();
      for (var i = 0; i < G.bodies.length; i++) { var b = G.bodies[i]; this.puff(b.x, b.y, 8, this.variant === 'penguins' ? '#ffffff' : '#e7c08a'); }
      if (G.shrunk && this.variant === 'penguins') this.meltFx(G.radius);
    }
    if (phase === 'aim') {
      Sound.play('vanish');
      var me = this.youPid(), gone = this.seen || [];
      for (var j = 0; j < gone.length; j++) if (gone[j].pid !== me) this.puff(gone[j].x, gone[j].y, 14, this.variant === 'penguins' ? '#e0f2fe' : '#d6b27c', true);
      this.seen = null;
    }
    if ((phase === 'lock' || phase === 'action') && this.goKey !== G.matchId + ':' + G.round) {
      this.goKey = G.matchId + ':' + G.round; this.goAt = now();
      Sound.play('go', this.variant); this.flash = .35; this.emit('go');
    }
    if (phase === 'action' && G.action) {
      this.act = { key: key, round: G.matchId + ':' + G.round, played: {}, bodies: G.bodies.slice(), replay: G.action.replay };
    }
    if (phase === 'result' && G.ending && G.winners.length && !(G.result && (G.result.out.length || G.result.tie))) setTimeout(function () { Sound.play('win'); }, 300);
    else if (phase === 'result' && G.result) {
      if (G.result.none) Sound.play('none');
      else if (G.result.tie) Sound.play('tie');
      if (G.ending && G.winners.length) setTimeout(function () { Sound.play('win'); }, 500);
    }
    if (phase === 'end' && prev.indexOf(':result:1') < 0 && G.winners.length) Sound.play('win');
    if (phase !== 'ready') this.tickN = 0;
  };

  // ---------- partículas ----------
  R.part = function (p) { if (this.parts.length > 260) this.parts.shift(); p.life = p.max = p.max || .6; this.parts.push(p); };
  R.puff = function (x, y, n, color, big) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * TAU, s = (big ? 3.5 : 2) * (.4 + Math.random());
      this.part({ kind: 'smoke', x: x + Math.cos(a) * .3, y: y + Math.sin(a) * .3, z: .6 + Math.random() * .8, vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: Math.random() * 1.5, size: (big ? .55 : .35) + Math.random() * .3, color: color, max: .5 + Math.random() * .35, drag: 3 });
    }
  };
  R.burst = function (x, y, n, colors, speed, grav, size) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * TAU, s = speed * (.35 + Math.random() * .8);
      this.part({ kind: 'dot', x: x, y: y, z: .8 + Math.random() * .6, vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: 2 + Math.random() * 6, g: grav, size: (size || .12) * (.6 + Math.random()), color: colors[i % colors.length], max: .5 + Math.random() * .5, drag: 1.2 });
    }
  };
  R.stars = function (x, y, n, color) {
    for (var i = 0; i < n; i++) {
      var a = i / n * TAU + Math.random() * .4, s = 6 + Math.random() * 5;
      this.part({ kind: 'star', x: x, y: y, z: 1.2, vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: 3 + Math.random() * 3, g: 14, size: .28 + Math.random() * .18, color: color || '#fde047', max: .55, rot: Math.random() * TAU, vr: 8, drag: 2.5 });
    }
  };
  R.ring = function (x, y, color, grow, max, width) { this.rings.push({ x: x, y: y, r: .2, vr: grow, life: max, max: max, color: color, width: width || 3 }); };
  R.say = function (x, y, text, color, size) { this.texts.push({ x: x + (Math.random() - .5) * 1.5, y: y - this.texts.length * 1.2, z: 2.4, text: text, color: color || '#fff', size: size || 1, life: 1.05, max: 1.05, rot: (Math.random() - .5) * .35 }); };
  R.meltFx = function (r) { for (var i = 0; i < 26; i++) { var a = i / 26 * TAU; this.part({ kind: 'drop', x: Math.cos(a) * r, y: Math.sin(a) * r, z: .2, vx: Math.cos(a) * 1.5, vy: Math.sin(a) * 1.5, vz: 3 + Math.random() * 2, g: 16, size: .12, color: '#bae6fd', max: .7 }); } };

  R.stepFx = function (dt) {
    var i, p;
    for (i = this.parts.length - 1; i >= 0; i--) {
      p = this.parts[i]; p.life -= dt;
      if (p.life <= 0) { this.parts.splice(i, 1); continue; }
      var dr = Math.exp(-(p.drag || 0) * dt);
      p.vx *= dr; p.vy *= dr; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.g) { p.vz -= p.g * dt; p.z += p.vz * dt; if (p.z < 0) { p.z = 0; p.vz = -p.vz * .3; } } else p.z += (p.vz || 0) * dt;
      if (p.vr) p.rot += p.vr * dt;
    }
    for (i = this.rings.length - 1; i >= 0; i--) { var r = this.rings[i]; r.life -= dt; r.r += r.vr * dt; if (r.life <= 0) this.rings.splice(i, 1); }
    for (i = this.texts.length - 1; i >= 0; i--) { var t = this.texts[i]; t.life -= dt; t.z += dt * 1.6; if (t.life <= 0) this.texts.splice(i, 1); }
    this.shake *= Math.exp(-9 * dt); this.flash = Math.max(0, this.flash - dt * 1.6);
  };

  // ============================================================================================
  // QUADRO
  // ============================================================================================
  R.frame = function () {
    var t = now(), dt = Math.min(.05, (t - this.lastT) / 1000); this.lastT = t;
    TILT = this.tilt;
    if (this.kind === 'phone' && this.G) this.layout();   // os controles de baixo mudam de altura (fim de partida)
    var ctx = this.ctx, G = this.G;
    if (this.canvas.clientWidth && (Math.abs(this.canvas.clientWidth - this.W) > 1 || Math.abs(this.canvas.clientHeight - this.H) > 1)) this.resize();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    if (!G) { ctx.fillStyle = '#0b0e17'; ctx.fillRect(0, 0, this.W, this.H); return; }
    if (G.phase === 'ready') { var n = Math.ceil(this.left() / 1000); if (n >= 1 && n <= 3 && n !== this.tickN) { this.tickN = n; Sound.play('tick', n); this.emit('tick', { n: n }); } }
    if (this.dispR === null) this.dispR = G.radius;
    this.dispR += (G.radius - this.dispR) * Math.min(1, dt * 2.2);
    this.stepFx(dt);
    var sx = (Math.random() - .5) * this.shake, sy = (Math.random() - .5) * this.shake;
    ctx.save(); ctx.translate(sx, sy);
    this.drawBackground(t);
    if (this.variant === 'penguins') this.drawIce(t); else this.drawRing(t);
    var sprites = this.collect(t);
    this.drawAim(t);
    this.drawFxGround();
    sprites.sort(function (a, b) { return a.y - b.y; });
    for (var i = 0; i < sprites.length; i++) this.drawSprite(sprites[i], t);
    this.drawTracers();
    this.drawFxAir();
    this.drawWeather(t, dt);
    ctx.restore();
    if (this.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + (this.flash * .5).toFixed(3) + ')'; ctx.fillRect(0, 0, this.W, this.H); }
    this.drawHud(t);
  };

  // ---------- fundo (pintado uma vez por tamanho e guardado) ----------
  R.drawBackground = function (t) {
    var ctx = this.ctx, key = this.variant + ':' + this.W + 'x' + this.H;
    if (this.bgKey !== key) { this.bg = this.paintBackground(); this.bgKey = key; }
    ctx.drawImage(this.bg, 0, 0, this.W, this.H);
    if (this.variant === 'penguins') {
      // ondinhas que andam devagar
      ctx.strokeStyle = 'rgba(255,255,255,0.13)'; ctx.lineWidth = Math.max(1, this.sc * .08);
      var rnd = seeded(7);
      for (var i = 0; i < 38; i++) {
        var x = rnd() * this.W, y = rnd() * this.H, w = (18 + rnd() * 30) * this.sc / 20, ph = rnd() * TAU;
        var dx = Math.sin(t / 1400 + ph) * 8;
        ctx.beginPath(); ctx.arc(x + dx, y, w, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
      }
    }
  };
  R.paintBackground = function () {
    var c = document.createElement('canvas'); c.width = Math.max(2, Math.round(this.W)); c.height = Math.max(2, Math.round(this.H));
    var g = c.getContext('2d'), W = c.width, H = c.height, rnd = seeded(11), i, gr;
    if (this.variant === 'penguins') {
      gr = g.createRadialGradient(this.cx, this.cy, this.sc * 4, this.cx, this.cy, Math.max(W, H) * .8);
      gr.addColorStop(0, '#1f8fcf'); gr.addColorStop(.45, '#136aa6'); gr.addColorStop(1, '#0a2d57');
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      // icebergs ao longe e reflexos
      for (i = 0; i < 7; i++) {
        var bx = rnd() * W, by = rnd() * H, bs = (10 + rnd() * 22) * this.sc / 20;
        if (Math.hypot((bx - this.cx) / this.sc, (by - this.cy) / (this.sc * TILT)) < (this.G.R0 + 3)) continue;
        g.fillStyle = 'rgba(8,40,80,0.35)'; oval(g, bx, by + bs * .45, bs * 1.3, bs * .45); g.fill();
        g.fillStyle = '#e0f2fe'; g.beginPath(); g.moveTo(bx - bs, by + bs * .3); g.lineTo(bx - bs * .4, by - bs * .6); g.lineTo(bx + bs * .1, by - bs * .2); g.lineTo(bx + bs * .6, by - bs * .8); g.lineTo(bx + bs, by + bs * .3); g.closePath(); g.fill();
        g.fillStyle = '#93c5fd'; g.beginPath(); g.moveTo(bx + bs * .1, by - bs * .2); g.lineTo(bx + bs * .6, by - bs * .8); g.lineTo(bx + bs, by + bs * .3); g.lineTo(bx + bs * .2, by + bs * .3); g.closePath(); g.fill();
      }
      for (i = 0; i < 60; i++) { g.fillStyle = 'rgba(255,255,255,' + (.04 + rnd() * .06).toFixed(3) + ')'; oval(g, rnd() * W, rnd() * H, 20 + rnd() * 60, 2 + rnd() * 3); g.fill(); }
    } else {
      gr = g.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0, '#f2c27a'); gr.addColorStop(.5, '#e0a55c'); gr.addColorStop(1, '#c47f3c');
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      for (i = 0; i < 14; i++) { g.fillStyle = 'rgba(160,90,30,0.12)'; oval(g, rnd() * W, rnd() * H, 80 + rnd() * 200, 10 + rnd() * 26); g.fill(); }
      for (i = 0; i < 160; i++) { g.fillStyle = rnd() < .5 ? 'rgba(120,70,30,0.28)' : 'rgba(255,240,210,0.35)'; oval(g, rnd() * W, rnd() * H, 1 + rnd() * 3, 1 + rnd() * 2); g.fill(); }
      // cactos e pedras fora da arena
      for (i = 0; i < 10; i++) {
        var x = rnd() * W, y = rnd() * H, s = (.8 + rnd() * .7) * this.sc;
        if (Math.hypot((x - this.cx) / this.sc, (y - this.cy) / (this.sc * TILT)) < this.G.R0 + 2.4) continue;
        if (rnd() < .6) this.cactus(g, x, y, s); else { g.fillStyle = 'rgba(0,0,0,0.18)'; oval(g, x, y + s * .15, s * .8, s * .25); g.fill(); g.fillStyle = '#a8a29e'; oval(g, x, y - s * .1, s * .7, s * .4); g.fill(); g.fillStyle = '#d6d3d1'; oval(g, x - s * .2, y - s * .25, s * .3, s * .15); g.fill(); }
      }
    }
    return c;
  };
  R.cactus = function (g, x, y, s) {
    g.fillStyle = 'rgba(0,0,0,0.2)'; oval(g, x, y, s * .6, s * .2); g.fill();
    g.fillStyle = '#3f8f3a'; g.strokeStyle = '#1f4d1d'; g.lineWidth = Math.max(1, s * .06);
    rrect(g, x - s * .2, y - s * 2, s * .4, s * 2, s * .2); g.fill(); g.stroke();
    rrect(g, x - s * .62, y - s * 1.4, s * .28, s * .75, s * .14); g.fill(); g.stroke();
    rrect(g, x - s * .62, y - s * .9, s * .5, s * .26, s * .13); g.fill();
    rrect(g, x + s * .34, y - s * 1.7, s * .28, s * .8, s * .14); g.fill(); g.stroke();
    rrect(g, x + s * .12, y - s * 1.1, s * .5, s * .26, s * .13); g.fill();
  };

  // ---------- arena ----------
  R.drawIce = function (t) {
    var ctx = this.ctx, r = this.dispR, sc = this.sc, c = this.P(0, 0), rx = r * sc, ry = r * sc * TILT, depth = .75 * sc;
    // espuma e sombra na água
    ctx.fillStyle = 'rgba(4,30,60,0.35)'; oval(ctx, c.x, c.y + depth * 1.3, rx * 1.03, ry * 1.05); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,' + (.25 + .1 * Math.sin(t / 500)).toFixed(3) + ')'; ctx.lineWidth = Math.max(2, sc * .22);
    oval(ctx, c.x, c.y + depth, rx + sc * .35 + Math.sin(t / 700) * sc * .08, ry + sc * .3); ctx.stroke();
    // espessura do bloco de gelo
    var side = ctx.createLinearGradient(0, c.y, 0, c.y + ry + depth);
    side.addColorStop(0, '#7dd3fc'); side.addColorStop(1, '#2b7bb9');
    ctx.fillStyle = side; oval(ctx, c.x, c.y + depth, rx, ry); ctx.fill();
    ctx.fillRect(c.x - rx, c.y, rx * 2, depth);
    // tampo
    var top = ctx.createRadialGradient(c.x - rx * .25, c.y - ry * .35, sc, c.x, c.y, rx);
    top.addColorStop(0, '#ffffff'); top.addColorStop(.6, '#e6f6ff'); top.addColorStop(1, '#b9e3fb');
    ctx.fillStyle = top; oval(ctx, c.x, c.y, rx, ry); ctx.fill();
    // rachaduras e montinhos de neve (mesmos lugares sempre, encolhem com o gelo)
    var rnd = seeded(23), k = r / (this.G.R0 || 10), i;
    ctx.strokeStyle = 'rgba(56,145,200,0.35)'; ctx.lineWidth = Math.max(1, sc * .06);
    for (i = 0; i < 7; i++) {
      var a = rnd() * TAU, d = (.2 + rnd() * .6) * r, px = Math.cos(a) * d, py = Math.sin(a) * d, p = this.P(px, py);
      ctx.beginPath(); ctx.moveTo(p.x, p.y);
      for (var j = 0; j < 3; j++) { px += (rnd() - .5) * 2.2 * k; py += (rnd() - .5) * 2.2 * k; var q = this.P(px, py); ctx.lineTo(q.x, q.y); }
      ctx.stroke();
    }
    for (i = 0; i < 16; i++) {
      var aa = rnd() * TAU, dd = Math.sqrt(rnd()) * r * .92, s = (.25 + rnd() * .45) * sc, pp = this.P(Math.cos(aa) * dd, Math.sin(aa) * dd);
      ctx.fillStyle = 'rgba(148,196,230,0.45)'; oval(ctx, pp.x, pp.y + s * .15, s * 1.1, s * .42); ctx.fill();
      ctx.fillStyle = '#ffffff'; oval(ctx, pp.x, pp.y, s, s * .4); ctx.fill();
    }
    // borda: clara e bem marcada, é o limite do jogo
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(2, sc * .14); oval(ctx, c.x, c.y, rx, ry); ctx.stroke();
    ctx.strokeStyle = 'rgba(14,90,150,0.55)'; ctx.lineWidth = Math.max(1, sc * .06); oval(ctx, c.x, c.y, rx - sc * .5, ry - sc * .5 * TILT); ctx.stroke();
  };
  R.drawRing = function (t) {
    var ctx = this.ctx, r = this.dispR, sc = this.sc, c = this.P(0, 0), rx = r * sc, ry = r * sc * TILT;
    ctx.fillStyle = 'rgba(90,50,20,0.25)'; oval(ctx, c.x, c.y + sc * .25, rx * 1.05, ry * 1.07); ctx.fill();
    var g = ctx.createRadialGradient(c.x, c.y - ry * .2, sc, c.x, c.y, rx);
    g.addColorStop(0, '#f0c98d'); g.addColorStop(.7, '#dcaa66'); g.addColorStop(1, '#c48a47');
    ctx.fillStyle = g; oval(ctx, c.x, c.y, rx, ry); ctx.fill();
    // marca de duelo no centro
    ctx.strokeStyle = 'rgba(120,60,20,0.35)'; ctx.lineWidth = Math.max(2, sc * .12);
    var a = this.P(-1.2, -1.2), b = this.P(1.2, 1.2), e = this.P(-1.2, 1.2), f = this.P(1.2, -1.2);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.moveTo(e.x, e.y); ctx.lineTo(f.x, f.y); ctx.stroke();
    oval(ctx, c.x, c.y, sc * 2.4, sc * 2.4 * TILT); ctx.stroke();
    // cerca: postes de madeira e corda. É o limite da arena.
    var posts = 22, i, tops = [];
    for (i = 0; i < posts; i++) {
      var ang = i / posts * TAU, p = this.P(Math.cos(ang) * r, Math.sin(ang) * r);
      tops.push({ x: p.x, y: p.y - sc * .9, back: Math.sin(ang) < 0 });
    }
    ctx.strokeStyle = '#7c4a1e'; ctx.lineWidth = Math.max(2, sc * .1);
    ctx.beginPath(); for (i = 0; i <= posts; i++) { var q = tops[i % posts]; if (i) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y); } ctx.stroke();
    for (i = 0; i < posts; i++) {
      var pt = tops[i];
      ctx.fillStyle = '#5b3716'; ctx.fillRect(pt.x - sc * .13, pt.y, sc * .26, sc * .9);
      ctx.fillStyle = '#8b5a2b'; ctx.fillRect(pt.x - sc * .13, pt.y, sc * .1, sc * .9);
    }
  };

  // ---------- quem está onde (e em que pose) neste quadro ----------
  R.collect = function (t) {
    var G = this.G, out = [], me = this.youPid(), i, b, info;
    var phase = G.phase, hidden = !!HIDDEN[phase];
    var appear = (t - this.appearAt) / 1000;
    if (phase === 'action' && this.act && G.action) {
      var el = this.elapsed() / 1000, rp = this.act.replay;
      if (rp.kind === 'dash') this.collectDash(out, rp, el, t); else this.collectShot(out, rp, el, t);
      return out;
    }
    var list = phase === 'result' && G.result && G.result.tie ? [] : (G.bodies || []);   // empate: todos caíram
    for (i = 0; i < list.length; i++) {
      b = list[i]; info = this.nameOf(b.pid);
      var face = b.face;
      if (b.pid === me && (AIMING[phase] || phase === 'lock') && this.opts.aim) { var a = this.opts.aim(); if (a !== null && a !== undefined) face = a; }
      var pop = phase === 'reveal' ? easeBack(appear * 3.2 - i * .12) : 1;
      var at = b.pid === me && hidden ? this.ownAt(b) : b;
      if (at !== b) out.push({ pid: b.pid + ':ghost', x: b.x, y: b.y, face: face, color: info.color, name: '', me: false, scale: 1, alpha: .28, hidden: true, ghost: 1 });
      out.push({ pid: b.pid, x: at.x, y: at.y, face: face, color: info.color, name: info.name, me: b.pid === me, scale: Math.max(.01, pop), hidden: hidden });
    }
    if (phase === 'result' && this.variant === 'shootout' && this.act && this.act.round === G.matchId + ':' + G.round && this.act.replay && this.act.replay.hitAt) {
      for (i = 0; i < this.act.bodies.length; i++) {
        b = this.act.bodies[i];
        if (!Object.prototype.hasOwnProperty.call(this.act.replay.hitAt, b.pid)) continue;
        info = this.nameOf(b.pid);
        var mvd = this.act.replay.moves && this.act.replay.moves[b.pid];
        out.push({ pid: b.pid, x: mvd ? mvd[2] : b.x, y: mvd ? mvd[3] : b.y, face: b.face, color: info.color, name: info.name, me: b.pid === me, down: 1, gun: 0, alpha: .75, scale: 1 });
      }
    }
    return out;
  };
  R.collectDash = function (out, rp, el, t) {
    var me = this.youPid(), n = rp.order.length, st = el - rp.lead, fr = rp.frames, fdt = rp.dt, i, k;
    var played = this.act.played;
    if (st >= 0 && !played.dash) { played.dash = 1; Sound.play('dash'); for (k = 0; k < n; k++) { var f0 = fr[0]; this.puff(f0[k * 3], f0[k * 3 + 1], 6, '#ffffff'); } this.shake = Math.max(this.shake, 3); }
    // eventos do replay: batidas e quedas, na hora certa
    for (i = 0; i < rp.hits.length; i++) {
      var h = rp.hits[i];
      if (st >= h.t && !played['h' + i]) {
        played['h' + i] = 1;
        Sound.play('impact', h.s); this.stars(h.x, h.y, 7 + Math.round(h.s * 6), '#fde047'); this.burst(h.x, h.y, 10, ['#ffffff', '#e0f2fe'], 7, 18, .14);
        this.ring(h.x, h.y, 'rgba(255,255,255,0.9)', 9, .35, 4); this.shake = Math.max(this.shake, 6 + h.s * 16);
        this.say(h.x, h.y, h.s > .6 ? 'POW!' : h.s > .3 ? 'TUM!' : 'POF!', '#fde047', .8 + h.s * .6);
        if (h.a === me || h.b === me) this.emit('bump', { s: h.s });
      }
    }
    var idx = clamp(st / fdt, 0, fr.length - 1), i0 = Math.floor(idx), i1 = Math.min(fr.length - 1, i0 + 1), fk = idx - i0;
    for (k = 0; k < n; k++) {
      var pid = rp.order[k], info = this.nameOf(pid);
      var x = lerp(fr[i0][k * 3], fr[i1][k * 3], fk), y = lerp(fr[i0][k * 3 + 1], fr[i1][k * 3 + 1], fk), face = lerpAngle(fr[i0][k * 3 + 2], fr[i1][k * 3 + 2], fk);
      var s = { pid: pid, x: x, y: y, face: face, color: info.color, name: info.name, me: pid === me, scale: 1 };
      if (st < 0) {   // antecipação: agacha, prepara
        var w = clamp(el / rp.lead, 0, 1);
        s.sqx = 1 + .22 * easeOut(w); s.sqy = 1 - .28 * easeOut(w); s.lean = -.25 * w;
        if (Math.random() < .15) this.part({ kind: 'smoke', x: x - Math.cos(face) * .6, y: y - Math.sin(face) * .6, z: .1, vx: -Math.cos(face) * 2, vy: -Math.sin(face) * 2, vz: .6, size: .22, color: '#ffffff', max: .35, drag: 4 });
      } else {
        var p0 = fr[Math.max(0, i0 - 1)], vx = (fr[i1][k * 3] - p0[k * 3]) / (fdt * Math.max(1, i1 - Math.max(0, i0 - 1))), vy = (fr[i1][k * 3 + 1] - p0[k * 3 + 1]) / (fdt * Math.max(1, i1 - Math.max(0, i0 - 1)));
        var sp = Math.hypot(vx, vy);
        s.speed = sp; s.vx = vx; s.vy = vy;
        if (sp > 3) { s.sqx = 1 - Math.min(.18, sp * .01); s.sqy = 1 + Math.min(.16, sp * .01); s.lean = Math.min(.35, sp * .02); }
        s.trail = [];
        for (var tr = 1; tr <= 3; tr++) { var ti = Math.max(0, i0 - tr * 2); if (ti === i0) break; s.trail.push({ x: fr[ti][k * 3], y: fr[ti][k * 3 + 1] }); }
        if (sp > 6 && Math.random() < .5) this.part({ kind: 'dot', x: x - vx / sp * .7, y: y - vy / sp * .7, z: .15, vx: -vx * .15 + (Math.random() - .5) * 2, vy: -vy * .15 + (Math.random() - .5) * 2, vz: 2 + Math.random() * 2, g: 14, size: .1, color: '#ffffff', max: .4 });
        var tf = rp.fall[pid];
        if (tf !== undefined && st >= tf) {
          var e = st - tf;
          if (!played['f' + pid]) {
            played['f' + pid] = 1;
            Sound.play('splash');
            this.ring(x, y, 'rgba(255,255,255,0.85)', 5, .7, 4); this.ring(x, y, 'rgba(186,230,253,0.8)', 3, .9, 3);
            for (var d = 0; d < 18; d++) { var da = Math.random() * TAU, ds = 2 + Math.random() * 4; this.part({ kind: 'drop', x: x, y: y, z: .3, vx: Math.cos(da) * ds, vy: Math.sin(da) * ds, vz: 5 + Math.random() * 6, g: 22, size: .13, color: d % 3 ? '#bae6fd' : '#ffffff', max: .9 }); }
            this.say(x, y, 'TCHIBUM!', '#e0f2fe', 1.05); this.shake = Math.max(this.shake, 7);
            if (pid === me) this.emit('out');
            else Sound.play('out');
          }
          if (e > .75) continue;
          s.z = -e * e * 6; s.scale = Math.max(.01, 1 - e * 1.1); s.alpha = clamp(1 - e * 1.4, 0, 1); s.flail = 1; s.spin = e * 14; s.sink = clamp(e * 1.6, 0, 1);
        }
      }
      out.push(s);
    }
  };
  R.collectShot = function (out, rp, el, t) {
    var me = this.youPid(), st = el - rp.lead, played = this.act.played, i;
    var bodies = this.act.bodies;
    if (st >= 0 && !played.fire) {
      played.fire = 1; this.shake = Math.max(this.shake, 10); this.flash = Math.max(this.flash, .25);
      for (i = 0; i < rp.shots.length; i++) Sound.play('shot', i);
    }
    for (i = 0; i < bodies.length; i++) {
      var b = bodies[i], info = this.nameOf(b.pid), shot = null;
      for (var j = 0; j < rp.shots.length; j++) if (rp.shots[j].pid === b.pid) shot = rp.shots[j];
      var face = shot ? shot.a : b.face;
      // quem trocou de lugar escondido corre até lá antes de sacar a arma
      var mv = rp.moves && rp.moves[b.pid], w0 = rp.moves && Object.keys(rp.moves).length ? (rp.walk || 0) : 0;
      var bx = b.x, by = b.y;
      if (mv) {
        var wk = easeOut(el / (rp.walk || .45)); bx = lerp(mv[0], mv[2], wk); by = lerp(mv[1], mv[3], wk);
        if (wk < 1 && Math.random() < .35) this.part({ kind: 'smoke', x: bx, y: by, z: .1, vx: (Math.random() - .5) * 2, vy: (Math.random() - .5) * 2, vz: .5, size: .28, color: '#e7c08a', max: .4, drag: 3 });
      }
      var s = { pid: b.pid, x: bx, y: by, face: face, color: info.color, name: info.name, me: b.pid === me, scale: 1, gun: clamp((el - w0) / ((rp.lead - w0) * .7), 0, 1) };
      if (st >= 0 && st < .12) s.muzzle = 1 - st / .12;
      if (st >= 0 && st < .2) s.recoil = 1 - st / .2;
      var th = rp.hitAt[b.pid];
      if (th !== undefined && st >= th) {
        if (!played['x' + b.pid]) {
          played['x' + b.pid] = 1;
          Sound.play('down'); this.stars(b.x, b.y, 9, '#fde047'); this.burst(b.x, b.y, 12, ['#fef3c7', '#d6b27c', info.color], 8, 20, .14);
          this.ring(b.x, b.y, 'rgba(255,255,255,0.9)', 8, .35, 4); this.shake = Math.max(this.shake, 12);
          this.part({ kind: 'hat', x: b.x, y: b.y, z: 2.2, vx: (Math.random() - .5) * 5, vy: (Math.random() - .5) * 3, vz: 9, g: 20, size: 1, color: info.color, max: 1.6, rot: 0, vr: (Math.random() < .5 ? -1 : 1) * 9 });
          this.say(b.x, b.y, 'BANG!', '#fde047', 1.1);
          if (b.pid === me) this.emit('out');
        }
        s.down = clamp((st - th) / .35, 0, 1); s.nohat = 1;
      }
      out.push(s);
    }
    // traços dos tiros e poeira de quem errou
    this.tracers = [];
    if (st >= 0) for (i = 0; i < rp.shots.length; i++) {
      var spd = rp.speed || 70, sh = rp.shots[i], head = Math.min(sh.len, st * spd), done = st * spd >= sh.len;
      var fade = done ? clamp(1 - (st - sh.len / spd) / .3, 0, 1) : 1;
      if (fade <= 0) continue;
      this.tracers.push({ x: sh.x, y: sh.y, a: sh.a, head: head, tail: Math.max(0, head - 9), fade: fade, color: this.nameOf(sh.pid).color });
      if (done && !sh.hit && !played['m' + i]) {
        played['m' + i] = 1;
        var ex = sh.x + Math.cos(sh.a) * sh.len, ey = sh.y + Math.sin(sh.a) * sh.len;
        this.puff(ex, ey, 5, '#e7c08a'); Sound.play('ricochet');
      }
    }
  };

  // Tiroteio: onde você escolheu ficar (escondido, só no seu celular). Sem escolha: onde você está.
  R.ownAt = function (b) {
    var m = this.G && this.G.canMove && this.opts.move ? this.opts.move() : null;
    return m && Number.isFinite(m.x) && Number.isFinite(m.y) ? { pid: b.pid, x: m.x, y: m.y, face: b.face } : b;
  };
  // ---------- mira (só a sua, e só no seu celular) ----------
  R.drawAim = function (t) {
    var G = this.G, me = this.youPid();
    if (!me || !G.you || !G.you.alive || !(AIMING[G.phase] || G.phase === 'lock')) return;
    var body = null; for (var i = 0; i < G.bodies.length; i++) if (G.bodies[i].pid === me) body = G.bodies[i];
    if (!body) return;
    var ctx0 = this.ctx;
    if (G.canMove && G.moveMax) {   // até onde dá para andar: círculo tracejado em volta de onde você estava
      var st0 = this.P(body.x, body.y), moving = this.opts.mode && this.opts.mode() === 'move';
      ctx0.strokeStyle = moving ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.35)'; ctx0.lineWidth = Math.max(2, this.sc * (moving ? .14 : .08));
      if (ctx0.setLineDash) ctx0.setLineDash([this.sc * .5, this.sc * .4]);
      oval(ctx0, st0.x, st0.y, G.moveMax * this.sc, G.moveMax * this.sc * TILT); ctx0.stroke();
      var to = this.ownAt(body);
      if (to !== body) { var q0 = this.P(to.x, to.y); ctx0.beginPath(); ctx0.moveTo(st0.x, st0.y); ctx0.lineTo(q0.x, q0.y); ctx0.stroke(); }
      if (ctx0.setLineDash) ctx0.setLineDash([]);
      body = to;
    }
    var a = this.opts.aim ? this.opts.aim() : null; if (a === null || a === undefined) a = body.face;
    var ctx = this.ctx, color = this.nameOf(me).color, dx = Math.cos(a), dy = Math.sin(a), sc = this.sc, len, j;
    var pulse = .6 + .4 * Math.sin(t / 160);
    if (this.variant === 'penguins') {
      // a ponta da seta é onde você para se ninguém estiver no caminho: a força muda o comprimento
      var power = this.opts.power ? this.opts.power() : null;
      len = Math.max(2.4, this.reachAt(power === null || power === undefined ? 1 : power));
      var pw = power === null || power === undefined ? 1 : power;
      ctx.lineCap = 'round';
      var ring0 = this.P(body.x, body.y);
      ctx.strokeStyle = rgba(color, .18 + .5 * pw); ctx.lineWidth = Math.max(3, sc * (.15 + .35 * pw));
      oval(ctx, ring0.x, ring0.y, sc * 1.7, sc * 1.7 * TILT); ctx.stroke();
      // faixa + divisas andando no chão: "é para lá que eu vou"
      var p0 = this.P(body.x + dx * .9, body.y + dy * .9), p1 = this.P(body.x + dx * len, body.y + dy * len);
      ctx.lineCap = 'round';
      ctx.strokeStyle = rgba(color, .22 + .18 * pw); ctx.lineWidth = sc * (.6 + .8 * pw); ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
      var nx = -dy, ny = dx, off = (t / 400) % 1;
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(2, sc * .16);
      for (j = 0; j < 5; j++) {
        var u = 1.4 + (j + off) / 5 * (len - 2.2), c0 = this.P(body.x + dx * u, body.y + dy * u), l0 = this.P(body.x + dx * (u - .45) + nx * .4, body.y + dy * (u - .45) + ny * .4), r0 = this.P(body.x + dx * (u - .45) - nx * .4, body.y + dy * (u - .45) - ny * .4);
        ctx.globalAlpha = .35 + .5 * Math.sin((j + off) / 5 * Math.PI);
        ctx.beginPath(); ctx.moveTo(l0.x, l0.y); ctx.lineTo(c0.x, c0.y); ctx.lineTo(r0.x, r0.y); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      var tip = this.P(body.x + dx * (len + .6), body.y + dy * (len + .6)), bl = this.P(body.x + dx * (len - .5) + nx * .75, body.y + dy * (len - .5) + ny * .75), br = this.P(body.x + dx * (len - .5) - nx * .75, body.y + dy * (len - .5) - ny * .75);
      ctx.fillStyle = color; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(2, sc * .12);
      ctx.beginPath(); ctx.moveTo(tip.x, tip.y); ctx.lineTo(bl.x, bl.y); ctx.lineTo(br.x, br.y); ctx.closePath(); ctx.fill(); ctx.stroke();
      if (power !== null && power !== undefined) {   // força em %, logo depois da ponta
        var lab = this.P(body.x + dx * (len + 1.9), body.y + dy * (len + 1.9));
        this.text(Math.round(pw * 100) + '%', lab.x, lab.y, Math.max(14, sc * .8), pw > .9 ? '#fca5a5' : '#ffffff');
      }
    } else {
      len = toEdge(body.x, body.y, dx, dy, this.dispR + 1.5);
      var o = this.P(body.x + dx * .9, body.y + dy * .9, 1.1), e = this.P(body.x + dx * len, body.y + dy * len, 1.1);
      // cone fino: a largura de um alvo, para ter noção da precisão
      var spread = .09, cl = this.P(body.x + Math.cos(a - spread) * len, body.y + Math.sin(a - spread) * len, 1.1), cr = this.P(body.x + Math.cos(a + spread) * len, body.y + Math.sin(a + spread) * len, 1.1);
      ctx.fillStyle = rgba(color, .13); ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(cl.x, cl.y); ctx.lineTo(cr.x, cr.y); ctx.closePath(); ctx.fill();
      ctx.lineCap = 'round'; ctx.strokeStyle = rgba('#dc2626', .35 + .3 * pulse); ctx.lineWidth = Math.max(2, sc * .16);
      if (ctx.setLineDash) ctx.setLineDash([sc * .6, sc * .45]);
      ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(e.x, e.y); ctx.stroke();
      if (ctx.setLineDash) ctx.setLineDash([]);
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(2, sc * .1);
      oval(ctx, e.x, e.y, sc * .45, sc * .45 * TILT); ctx.stroke();
    }
  };

  // ---------- personagens ----------
  R.drawSprite = function (s, t) {
    var ctx = this.ctx, p = this.P(s.x, s.y, s.z && s.z > 0 ? s.z : 0), sc = this.sc * this.G.body * (s.scale || 1) * this.charK;
    if (sc <= .2) return;
    ctx.save();
    ctx.globalAlpha = s.alpha === undefined ? 1 : s.alpha;
    if (s.trail) for (var i = 0; i < s.trail.length; i++) {
      var q = this.P(s.trail[i].x, s.trail[i].y);
      ctx.fillStyle = rgba(s.color, .22 - i * .06); oval(ctx, q.x, q.y - sc * .9, sc * .85, sc * 1.05); ctx.fill();
    }
    if (s.me && !s.sink && !s.ghost) {   // anel do "você" no chão
      ctx.strokeStyle = rgba(s.color, .9); ctx.lineWidth = Math.max(2, sc * .16);
      oval(ctx, p.x, p.y, sc * (1.35 + .08 * Math.sin(t / 180)), sc * (1.35 + .08 * Math.sin(t / 180)) * TILT); ctx.stroke();
    }
    var sinkY = s.z && s.z < 0 ? -s.z * this.sc : 0;
    if (!s.sink) { ctx.fillStyle = 'rgba(0,0,0,0.25)'; oval(ctx, p.x, p.y, sc * .95, sc * .95 * TILT * .8); ctx.fill(); }
    if (s.sink) {   // afundando: recorta tudo abaixo da linha d'água
      ctx.beginPath(); ctx.rect(p.x - sc * 4, p.y - sc * 6, sc * 8, sc * 6 + sc * .2); ctx.clip();
    }
    ctx.translate(p.x, p.y + sinkY);
    if (this.variant === 'penguins') this.penguin(ctx, sc, s, t); else this.cowboy(ctx, sc, s, t);
    ctx.restore();
    if (s.sink) { ctx.fillStyle = 'rgba(255,255,255,' + (.6 * (1 - s.sink)).toFixed(3) + ')'; oval(ctx, p.x, p.y, sc * 1.2, sc * .45); ctx.fill(); }
    var showName = !s.sink && !s.down && !s.ghost && (!s.hidden || s.me) && this.G.phase !== 'end';
    if (showName) this.tag(p.x, p.y - sc * (this.variant === 'penguins' ? 2.55 : 3.05), s.hidden && s.me ? 'VOCÊ' : s.name, s.color, s.me);
  };
  R.tag = function (x, y, text, color, me) {
    var ctx = this.ctx, fs = Math.max(this.kind === 'tv' ? 11 : 13, this.sc * (this.kind === 'tv' ? .62 : .85));
    ctx.font = '900 ' + fs + 'px ' + FONT;
    var w = ctx.measureText(text).width + fs * .9, h = fs * 1.35;
    ctx.fillStyle = color; rrect(ctx, x - w / 2, y - h, w, h, h / 2); ctx.fill();
    if (me) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(2, fs * .14); ctx.stroke(); }
    ctx.fillStyle = light(color) ? '#111827' : '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y - h / 2 + 1);
  };
  // Pinguim de lado-e-de-cima: corpo, barriga virada para onde olha, bico apontando a direção.
  R.penguin = function (ctx, s, o, t) {
    var fx = Math.cos(o.face), fy = Math.sin(o.face), sqx = o.sqx || 1, sqy = o.sqy || 1;
    if (o.spin) { fx = Math.cos(o.face + o.spin); fy = Math.sin(o.face + o.spin); }
    var lean = o.lean || 0;
    ctx.save();
    ctx.rotate(fx * lean * .5);
    var hy = -s * 1.05 * sqy;   // centro do corpo
    // pés
    ctx.fillStyle = '#f97316';
    oval(ctx, -s * .38 + fx * s * .25, -s * .05, s * .32, s * .16); ctx.fill();
    oval(ctx, s * .38 + fx * s * .25, -s * .05, s * .32, s * .16); ctx.fill();
    var back = fy < -.25;
    var beak = function () {
      var bx = fx * s * .72 * sqx, by = hy - s * .55 + fy * s * .18;
      ctx.fillStyle = '#fb923c'; ctx.strokeStyle = '#9a3412'; ctx.lineWidth = Math.max(1, s * .05);
      ctx.beginPath(); ctx.moveTo(bx - fy * s * .14 - fx * s * .1, by - s * .12); ctx.lineTo(bx + fx * s * .55, by + fy * s * .12); ctx.lineTo(bx + fy * s * .14 - fx * s * .1, by + s * .1); ctx.closePath(); ctx.fill(); ctx.stroke();
    };
    if (back) beak();
    // asinhas (balançam quando cai)
    var flap = o.flail ? Math.sin(t / 40) * .9 : Math.sin(t / 400) * .06;
    ctx.fillStyle = '#111827';
    ctx.save(); ctx.translate(-s * .85 * sqx, hy + s * .1); ctx.rotate(.35 + flap); oval(ctx, 0, s * .35, s * .2, s * .55); ctx.fill(); ctx.restore();
    ctx.save(); ctx.translate(s * .85 * sqx, hy + s * .1); ctx.rotate(-.35 - flap); oval(ctx, 0, s * .35, s * .2, s * .55); ctx.fill(); ctx.restore();
    // corpo
    var g = ctx.createLinearGradient(-s, hy - s, s, hy + s);
    g.addColorStop(0, '#334155'); g.addColorStop(1, '#0f172a');
    ctx.fillStyle = g; oval(ctx, 0, hy, s * .95 * sqx, s * 1.15 * sqy); ctx.fill();
    ctx.strokeStyle = '#020617'; ctx.lineWidth = Math.max(1, s * .07); ctx.stroke();
    // barriga
    var vis = clamp((fy + .7) / 1.4, 0, 1);
    if (vis > .05) { ctx.fillStyle = '#f8fafc'; oval(ctx, fx * s * .3 * sqx, hy + s * .2, s * .6 * sqx * (.3 + .7 * vis), s * .78 * sqy); ctx.fill(); }
    // cachecol na cor do jogador (é por ele que você se acha)
    ctx.strokeStyle = o.color; ctx.lineWidth = s * .3;
    ctx.beginPath(); ctx.save(); ctx.translate(0, hy - s * .12 * sqy); ctx.scale(s * .86 * sqx, s * .26); ctx.arc(0, Math.PI * .05, 1, 0, Math.PI); ctx.restore(); ctx.stroke();
    var tail = Math.sin(t / 150) * .15;
    ctx.fillStyle = o.color; ctx.save(); ctx.translate(-fx * s * .55, hy + s * .05); ctx.rotate(-fx * .4 + tail); ctx.fillRect(-s * .14, 0, s * .28, s * .75); ctx.restore();
    // olhos
    if (!back) {
      var ex = fx * s * .38 * sqx, ey = hy - s * .62 * sqy + fy * s * .08, gap = s * .26 * (.45 + .55 * vis);
      ctx.fillStyle = '#ffffff'; oval(ctx, ex - gap, ey, s * .16, s * .19); ctx.fill(); oval(ctx, ex + gap, ey, s * .16, s * .19); ctx.fill();
      ctx.fillStyle = '#020617';
      if (o.flail) { ctx.lineWidth = s * .06; ctx.strokeStyle = '#020617'; for (var k = -1; k <= 1; k += 2) { ctx.beginPath(); ctx.moveTo(ex + gap * k - s * .08, ey - s * .08); ctx.lineTo(ex + gap * k + s * .08, ey + s * .08); ctx.moveTo(ex + gap * k + s * .08, ey - s * .08); ctx.lineTo(ex + gap * k - s * .08, ey + s * .08); ctx.stroke(); } }
      else { oval(ctx, ex - gap + fx * s * .05, ey + fy * s * .03, s * .08, s * .1); ctx.fill(); oval(ctx, ex + gap + fx * s * .05, ey + fy * s * .03, s * .08, s * .1); ctx.fill(); }
      beak();
    }
    ctx.restore();
  };
  // Pistoleiro: chapéu na cor do jogador, arma apontando a mira.
  R.cowboy = function (ctx, s, o, t) {
    var fx = Math.cos(o.face), fy = Math.sin(o.face), down = o.down || 0;
    ctx.save();
    if (down) { ctx.rotate((fx >= 0 ? -1 : 1) * down * 1.45); ctx.globalAlpha *= 1 - down * .15; }
    var recoil = o.recoil || 0;
    var back = fy < -.2;
    var gunLen = s * (.35 + .95 * (o.gun === undefined ? 1 : o.gun)) * (down ? 0 : 1);
    var shoulderY = -s * 1.45;
    var gun = function () {
      if (gunLen <= 1) return;
      var gx = fx * gunLen * (1 - recoil * .2), gy = shoulderY + fy * gunLen * TILT - recoil * s * .25;
      ctx.strokeStyle = shade(o.color, -.25); ctx.lineWidth = s * .28; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(fx * s * .3, shoulderY); ctx.lineTo(gx, gy); ctx.stroke();
      ctx.strokeStyle = '#1f2937'; ctx.lineWidth = s * .2;
      ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + fx * s * .7, gy + fy * s * .7 * TILT); ctx.stroke();
      if (o.muzzle) {
        var mx = gx + fx * s * 1.05, my = gy + fy * s * 1.05 * TILT, r = s * (.7 + o.muzzle * .9);
        ctx.fillStyle = 'rgba(253,224,71,' + o.muzzle.toFixed(3) + ')';
        ctx.beginPath(); for (var k = 0; k < 10; k++) { var a = k / 10 * TAU + o.face, rr = k % 2 ? r * .45 : r; ctx.lineTo(mx + Math.cos(a) * rr, my + Math.sin(a) * rr * .8); } ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,' + o.muzzle.toFixed(3) + ')'; oval(ctx, mx, my, r * .35, r * .3); ctx.fill();
      }
    };
    if (back) gun();
    // pernas e corpo
    ctx.fillStyle = '#3f3f46'; ctx.fillRect(-s * .42, -s * .75, s * .3, s * .75); ctx.fillRect(s * .12, -s * .75, s * .3, s * .75);
    ctx.fillStyle = '#422006'; oval(ctx, -s * .27, -s * .05, s * .22, s * .1); ctx.fill(); oval(ctx, s * .27, -s * .05, s * .22, s * .1); ctx.fill();
    ctx.fillStyle = shade(o.color, -.15); oval(ctx, 0, -s * 1.25, s * .72, s * .7); ctx.fill();
    ctx.strokeStyle = '#1c1917'; ctx.lineWidth = Math.max(1, s * .06); ctx.stroke();
    ctx.fillStyle = '#78350f'; ctx.fillRect(-s * .7, -s * .88, s * 1.4, s * .16);
    ctx.fillStyle = '#fbbf24'; ctx.fillRect(-s * .1, -s * .9, s * .2, s * .2);
    // cabeça
    var hy = -s * 2.2;
    ctx.fillStyle = '#f2c79a'; oval(ctx, 0, hy, s * .5, s * .5); ctx.fill(); ctx.stroke();
    if (!back) {
      var ex = fx * s * .2, ey = hy + fy * s * .06, gap = s * .17;
      ctx.fillStyle = '#1c1917';
      if (down > .5) { ctx.lineWidth = s * .06; for (var q = -1; q <= 1; q += 2) { ctx.beginPath(); ctx.moveTo(ex + gap * q - s * .07, ey - s * .07); ctx.lineTo(ex + gap * q + s * .07, ey + s * .07); ctx.moveTo(ex + gap * q + s * .07, ey - s * .07); ctx.lineTo(ex + gap * q - s * .07, ey + s * .07); ctx.stroke(); } }
      else { oval(ctx, ex - gap, ey, s * .06, s * .08); ctx.fill(); oval(ctx, ex + gap, ey, s * .06, s * .08); ctx.fill(); }
      ctx.fillStyle = '#7c2d12'; ctx.fillRect(ex - s * .16, ey + s * .17, s * .32, s * .05);
    }
    if (!o.nohat) this.hat(ctx, 0, hy - s * .3, s, o.color);
    if (!back) gun();
    ctx.restore();
  };
  R.hat = function (ctx, x, y, s, color) {
    ctx.fillStyle = shade(color, -.35); oval(ctx, x, y + s * .05, s * .95, s * .26); ctx.fill();
    ctx.fillStyle = color; rrect(ctx, x - s * .45, y - s * .55, s * .9, s * .6, s * .2); ctx.fill();
    ctx.strokeStyle = '#1c1917'; ctx.lineWidth = Math.max(1, s * .06); ctx.stroke();
    ctx.fillStyle = '#1c1917'; ctx.fillRect(x - s * .45, y - s * .12, s * .9, s * .12);
  };

  R.drawTracers = function () {
    if (!this.tracers || !this.G || this.G.phase !== 'action') return;
    var ctx = this.ctx, sc = this.sc;
    ctx.lineCap = 'round';
    for (var i = 0; i < this.tracers.length; i++) {
      var tr = this.tracers[i], dx = Math.cos(tr.a), dy = Math.sin(tr.a);
      var a = this.P(tr.x + dx * tr.tail, tr.y + dy * tr.tail, 1.1), b = this.P(tr.x + dx * tr.head, tr.y + dy * tr.head, 1.1);
      ctx.strokeStyle = rgba(tr.color, .45 * tr.fade); ctx.lineWidth = sc * .55; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,250,210,' + tr.fade.toFixed(3) + ')'; ctx.lineWidth = sc * .18; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
  };
  R.drawFxGround = function () {
    var ctx = this.ctx, sc = this.sc;
    for (var i = 0; i < this.rings.length; i++) {
      var r = this.rings[i], p = this.P(r.x, r.y), k = r.life / r.max;
      ctx.strokeStyle = r.color; ctx.globalAlpha = k; ctx.lineWidth = r.width * (.5 + k);
      oval(ctx, p.x, p.y, r.r * sc, r.r * sc * TILT); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  };
  R.drawFxAir = function () {
    var ctx = this.ctx, sc = this.sc, i;
    for (i = 0; i < this.parts.length; i++) {
      var p = this.parts[i], q = this.P(p.x, p.y, p.z), k = p.life / p.max, sz = p.size * sc;
      ctx.globalAlpha = p.kind === 'smoke' ? k * .7 : clamp(k * 1.5, 0, 1);
      if (p.kind === 'smoke') { ctx.fillStyle = p.color; oval(ctx, q.x, q.y, sz * (1.6 - k * .6), sz * (1.6 - k * .6)); ctx.fill(); }
      else if (p.kind === 'star') {
        ctx.fillStyle = p.color; ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(p.rot);
        ctx.beginPath(); for (var j = 0; j < 10; j++) { var a = j / 10 * TAU, rr = j % 2 ? sz * .45 : sz; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); ctx.restore();
      } else if (p.kind === 'hat') { ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(p.rot); this.hat(ctx, 0, 0, this.sc * this.G.body, p.color); ctx.restore(); }
      else { ctx.fillStyle = p.color; oval(ctx, q.x, q.y, sz, sz); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
    for (i = 0; i < this.texts.length; i++) {
      var t = this.texts[i], tp = this.P(t.x, t.y, t.z), kk = t.life / t.max, pop = easeBack((1 - kk) * 5);
      var fs = Math.max(14, sc * 1.25 * t.size) * pop;
      ctx.save(); ctx.globalAlpha = clamp(kk * 2.2, 0, 1); ctx.translate(tp.x, tp.y); ctx.rotate(t.rot);
      ctx.font = '900 ' + fs + 'px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = fs * .22; ctx.strokeStyle = '#1e1b4b'; ctx.lineJoin = 'round'; ctx.strokeText(t.text, 0, 0);
      ctx.fillStyle = t.color; ctx.fillText(t.text, 0, 0); ctx.restore();
    }
  };
  // neve caindo (pinguins) ou poeira no ar (tiroteio)
  R.drawWeather = function (t, dt) {
    var ctx = this.ctx, W = this.W, H = this.H, n = this.kind === 'tv' ? 70 : 40, i;
    if (!this.flakes.length) for (i = 0; i < n; i++) this.flakes.push({ x: Math.random() * W, y: Math.random() * H, s: .5 + Math.random(), p: Math.random() * TAU });
    var snow = this.variant === 'penguins';
    ctx.fillStyle = snow ? 'rgba(255,255,255,0.85)' : 'rgba(255,237,200,0.35)';
    for (i = 0; i < this.flakes.length; i++) {
      var f = this.flakes[i];
      if (snow) { f.y += (18 + f.s * 26) * dt; f.x += Math.sin(t / 900 + f.p) * 12 * dt; }
      else { f.x += (20 + f.s * 30) * dt; f.y += Math.sin(t / 700 + f.p) * 6 * dt; }
      if (f.y > H + 4) { f.y = -4; f.x = Math.random() * W; }
      if (f.x > W + 4) { f.x = -4; f.y = Math.random() * H; }
      oval(ctx, f.x, f.y, f.s * (snow ? 2.2 : 1.6), f.s * (snow ? 2.2 : 1.6)); ctx.fill();
    }
  };

  // ============================================================================================
  // HUD: rodada, vivos, recado grande da fase, barra de tempo
  // ============================================================================================
  R.text = function (text, x, y, size, color, align, stroke) {
    var ctx = this.ctx;
    ctx.font = '900 ' + Math.round(size) + 'px ' + FONT; ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(3, size * .18); ctx.strokeStyle = stroke || 'rgba(15,23,42,0.92)';
    ctx.strokeText(text, x, y); ctx.fillStyle = color || '#ffffff'; ctx.fillText(text, x, y);
  };
  R.big = function (text, sub, color, age, y, scale) {
    var W = this.W, H = this.H, base = Math.min(W * .13, H * .2) * (scale || 1), k = easeBack(age / 260);
    if (k <= 0) return;
    if (y === undefined) y = H * .46;
    this.text(text, W / 2, y, base * k, color);
    if (sub) this.text(sub, W / 2, y + base * .62 + Math.max(13, base * .3) * .5, Math.max(13, base * .3), '#ffffff');
  };
  // Recado no alto da tela, por cima do mar: nunca tapa a arena quando há algo para ver.
  // No celular em pé: botões flutuantes no canto de cima, a linha do HUD logo abaixo, o recado embaixo dela.
  R.msgY = function () { return this.kind === 'tv' ? this.H * .1 : 126; };
  R.top = function (text, sub, color, age) { this.big(text, sub, color, age, this.msgY(), this.kind === 'tv' ? .5 : .62); };
  R.small = function (text, color) { this.text(text, this.W / 2, this.kind === 'tv' ? this.H * .12 : 126, Math.max(18, Math.min(this.W * .065, this.H * .075)), color || '#ffffff'); };
  R.drawHud = function (t) {
    var G = this.G, W = this.W, H = this.H, ctx = this.ctx;
    if (G.phase === 'setup') return;
    var phone = this.kind === 'phone';
    var fs = phone ? Math.max(15, W * .045) : Math.max(12, Math.min(W * .032, H * .045)), pad = phone ? 12 : fs * .8;
    ctx.save(); if (phone) ctx.translate(0, 64);   // abaixo dos botões flutuantes
    var vars = G.variant === 'penguins';
    // rodada
    if (G.round) this.text((G.tiebreak ? 'DESEMPATE · ' : '') + 'RODADA ' + G.round, pad, pad + fs * .5, fs, G.tiebreak ? '#fca5a5' : '#ffffff', 'left');
    // vivos: bolinhas na cor de cada um
    var alive = G.alive.length, total = G.roster.length, dot = fs * .42, x = W - pad;
    this.text(alive + (alive === 1 ? ' VIVO' : ' VIVOS'), x, pad + fs * .5, fs, '#ffffff', 'right');
    ctx.font = '900 ' + fs + 'px ' + FONT;
    var tw = ctx.measureText(alive + (alive === 1 ? ' VIVO' : ' VIVOS')).width;
    x -= tw + dot * 2;
    for (var i = G.roster.length - 1; i >= 0; i--) {
      var p = G.roster[i], on = G.alive.indexOf(p.pid) >= 0;
      ctx.globalAlpha = on ? 1 : .3; ctx.fillStyle = p.color; oval(ctx, x, pad + fs * .5, dot, dot); ctx.fill();
      ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2; ctx.stroke(); x -= dot * 2.6;
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    if (total && x < 0) { /* muitos jogadores numa tela estreita: as bolinhas saem pela esquerda, o número basta */ }
    // barra de tempo da fase (no celular, logo acima dos controles)
    var left = this.left(), ph = G.phase;
    if ((ph === 'reveal' || ph === 'aim' || ph === 'ready') && G.phaseMs) {
      var bottom = phone && this.opts.insetBottom ? this.opts.insetBottom() : 0;
      var k = clamp(left / G.phaseMs, 0, 1), bw = W * (phone ? .8 : .5), bh = Math.max(8, H * .012), bx = (W - bw) / 2, by = H - bottom - bh - pad * .8;
      ctx.fillStyle = 'rgba(15,23,42,0.6)'; rrect(ctx, bx - 3, by - 3, bw + 6, bh + 6, bh); ctx.fill();
      ctx.fillStyle = ph === 'ready' ? '#ef4444' : ph === 'aim' ? '#facc15' : '#38bdf8'; rrect(ctx, bx, by, Math.max(bh, bw * k), bh, bh / 2); ctx.fill();
    }
    var age = this.elapsed(), me = this.youPid(), you = G.you;
    var goWord = vars ? 'JÁ!' : 'FOGO!';
    if (ph === 'intro') return this.intro(age);
    if (ph === 'reveal' && G.blind && !G.tiebreak) {   // opção "sem espiar": ninguém aparece antes da rodada
      this.top('RODADA ' + G.round, 'Sem espiar: confie na memória', '#c4b5fd', age);
      return;
    }
    if (ph === 'reveal') {
      this.top(G.tiebreak ? 'DESEMPATE!' : 'MEMORIZE!', age < 2200 ? (G.tiebreak ? 'Só entre quem saiu junto' : G.shrunk ? (vars ? 'O gelo derreteu!' : 'A arena fechou!') : 'Decore onde cada um está') : '', G.tiebreak ? '#fca5a5' : '#7dd3fc', age);
      return;
    }
    if (ph === 'aim') {
      var mine = you && you.alive;
      if (age < 1100) this.big(mine ? (vars ? 'MIRE!' : 'MIRE!') : 'SUMIRAM!', mine ? (this.kind === 'phone' ? (G.power ? 'Arraste: direção e força' : G.canMove ? 'Mire ou troque de lugar' : 'Arraste para mirar') : '') : 'Todo mundo escolhendo escondido…', '#facc15', age);
      else this.small(mine ? (G.power ? 'DIREÇÃO E FORÇA' : 'ESCOLHA A DIREÇÃO') : 'ESCOLHENDO ESCONDIDO…', '#facc15');
      if (!mine && this.kind === 'tv') this.hiddenMarks(t);
      return;
    }
    if (ph === 'ready') {
      var n = Math.max(1, Math.ceil(left / 1000)), inSec = 1000 - (left - (n - 1) * 1000);
      this.small('PREPARA…', '#fca5a5');
      this.big(String(n), '', '#ffffff', inSec, H * .5);
      if (this.kind === 'tv') this.hiddenMarks(t);
      return;
    }
    if (ph === 'lock' || ph === 'action') {
      var ga = now() - (this.goAt || 0);
      if (ga < 900) this.big(goWord, '', vars ? '#4ade80' : '#fb923c', ga, H * .45);
      return;
    }
    if (ph === 'result' && G.ending) return this.winner(age, G.winners);
    if (ph === 'result' && G.result) {
      var r = G.result;
      if (r.tie) return this.big('EMPATE!', 'Todo mundo saiu junto. Desempate!', '#fca5a5', age);
      if (r.none) return this.top(vars ? 'NINGUÉM CAIU!' : 'TODO MUNDO ERROU!', '', '#fde68a', age);
      var names = []; for (var j = 0; j < r.out.length; j++) names.push(this.nameOf(r.out[j]).name);
      var meOut = me && r.out.indexOf(me) >= 0;
      this.top(meOut ? (vars ? 'VOCÊ CAIU!' : 'TE PEGARAM!') : (vars ? 'SPLASH!' : 'BANG!'), names.join(', ') + (names.length === 1 ? (vars ? ' caiu' : ' saiu') : (vars ? ' caíram' : ' saíram')), meOut ? '#f87171' : '#fde68a', age);
      return;
    }
    if (ph === 'end') this.winner(Math.max(age, 800), G.winners);
  };
  R.hiddenMarks = function (t) {
    // a TV mostra que tem gente ali, sem dizer onde: só um pulso no centro
    var ctx = this.ctx, c = this.P(0, 0), k = (t / 1400) % 1;
    ctx.strokeStyle = 'rgba(255,255,255,' + (.35 * (1 - k)).toFixed(3) + ')'; ctx.lineWidth = 3;
    oval(ctx, c.x, c.y, this.dispR * this.sc * k, this.dispR * this.sc * TILT * k); ctx.stroke();
  };
  R.intro = function (age) {
    var ctx = this.ctx, W = this.W, H = this.H, vars = this.G.variant === 'penguins';
    var k = easeOut(age / 350), w = Math.min(W * .88, H * 1.25), h = Math.min(H * .7, w * .62), x = (W - w) / 2, y = (H - h) / 2 + (1 - k) * 30;
    ctx.globalAlpha = k * .9; ctx.fillStyle = vars ? '#0c4a6e' : '#7c2d12'; rrect(ctx, x, y, w, h, h * .08); ctx.fill();
    ctx.globalAlpha = k; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(3, h * .012); ctx.stroke();
    var fs = h * .12;
    this.text(vars ? 'PINGUINS' : 'TIROTEIO', W / 2, y + h * .16, fs, vars ? '#7dd3fc' : '#fdba74');
    var lines = vars
      ? ['Decore onde todo mundo está.', 'Escolha sua direção.', 'No JÁ!, todos avançam juntos.', 'Último pinguim no gelo vence.']
      : ['Decore onde todo mundo está.', 'Mire enquanto estão escondidos.', 'No FOGO!, todos atiram juntos.', 'Último de pé vence.'];
    for (var i = 0; i < lines.length; i++) {
      var la = clamp((age - 300 - i * 450) / 300, 0, 1);
      if (la <= 0) continue;
      ctx.globalAlpha = la;
      this.text((i + 1) + '. ' + lines[i], W / 2, y + h * (.38 + i * .15), h * .075, '#ffffff');
    }
    ctx.globalAlpha = 1;
  };
  R.winner = function (age, winners) {
    var W = this.W, H = this.H;
    if (Math.random() < .5) this.confetti();
    if (winners.length === 1) {
      var p = this.nameOf(winners[0]), me = this.youPid() === p.pid;
      this.big(me ? 'VOCÊ VENCEU!' : 'VENCEU!', '', '#fde047', age, H * .3);
      this.text(p.name, W / 2, H * .3 + Math.min(W * .13, H * .2) * .85, Math.min(W * .08, H * .11), p.color);
    } else if (winners.length > 1) {
      var names = []; for (var i = 0; i < winners.length; i++) names.push(this.nameOf(winners[i]).name);
      this.big('EMPATE!', names.join(' · ') + ' dividem a vitória', '#fde047', age, H * .3);
    } else this.big('FIM!', 'Ninguém sobrou', '#fde047', age, H * .3);
  };
  R.confetti = function () {
    var cols = ['#f43f5e', '#facc15', '#22c55e', '#38bdf8', '#a855f7', '#ffffff'];
    var w = this.toWorld(Math.random() * this.W, this.H * .05);
    this.part({ kind: 'dot', x: w.x, y: w.y, z: 0, vx: (Math.random() - .5) * 3, vy: 6 + Math.random() * 6, vz: 0, size: .16 + Math.random() * .1, color: cols[Math.floor(Math.random() * cols.length)], max: 2.4, drag: .6 });
  };

  window.UDPRender = Renderer;
  window.UDPSound = Sound;
})();
