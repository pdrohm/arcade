'use strict';
// TV do Polar Push. Roda na TV da sala (Chrome 47): ES5 puro, nada de ellipse/roundRect/filter.
// O shell (shared/bash/tv.js) cuida de canvas, câmera, placar e sons; aqui só a arena:
// água, bloco de gelo (redondo ou a gangorra quadrada), muro, ursos, o Disco, a morsa e as bombas.
(function () {
  var INK = '#0f0f14', TAU = Math.PI * 2, CX = 8, CY = 8;
  var WATER = { polar: '#2b7bbf', tilt: '#2470b0', melt: '#3191cc', manic: '#245f98' };
  var TOP = { polar: '#f2fbff', tilt: '#e6f6fc', melt: '#e3f5fb', manic: '#eef6f9' };
  var SIDE = { polar: '#7cc8e6', tilt: '#73bfe0', melt: '#86d0ea', manic: '#7ab8d6' };
  var PCOL = { raio: '#ffce1f', peso: '#3a3a42', inflar: '#f472b6', encolher: '#35d07f', gelo: '#7dd3fc', neve: '#ffffff' };
  var PNAME = { raio: 'RAIO!', peso: 'PESO!', inflar: 'INFLAR!', encolher: 'ENCOLHER!', gelo: 'CONGELOU!', neve: 'BOLA DE NEVE!' };
  var HUDN = { raio: 'RAIO', peso: 'PESO', inflar: 'GIGA', encolher: 'MINI', gelo: 'GELO', neve: 'NEVE' };

  // ---------- coisas fixas, sorteadas uma vez ----------
  var seed = 7;
  function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  var RIPPLES = [], CRACKS = [], PUDDLES = [], i, j;
  for (i = 0; i < 70; i++) RIPPLES.push({ x: -8 + rnd() * 32, y: -4 + rnd() * 24, p: rnd() * TAU, w: 0.5 + rnd() * 0.7 });
  for (i = 0; i < 16; i++) {
    var a0 = rnd() * TAU, r0 = 0.6 + rnd() * 5.6, pts = [CX + Math.cos(a0) * r0, CY + Math.sin(a0) * r0], ang = rnd() * TAU;
    for (j = 0; j < 3; j++) { ang += (rnd() - 0.5) * 1.4; var L = 0.5 + rnd() * 0.9; pts.push(pts[pts.length - 2] + Math.cos(ang) * L, pts[pts.length - 1] + Math.sin(ang) * L); }
    CRACKS.push(pts);
  }
  for (i = 0; i < 7; i++) { var pa = rnd() * TAU, pr = 1 + rnd() * 4.5; PUDDLES.push({ x: CX + Math.cos(pa) * pr, y: CY + Math.sin(pa) * pr, r: 0.35 + rnd() * 0.5, g: rnd() }); }

  // ---------- estado só da TV (efeitos) ----------
  var V = { sq: [0, 0, 0, 0], ph: [0, 0, 0, 0], sdAt: -9, zapAt: -9, zapFrom: -1, scorch: [], bears: [], items: [], pool: [] };
  function item(y, kind, ref, k) {
    var o = V.pool[V.items.length]; if (!o) { o = {}; V.pool.push(o); }
    o.y = y; o.kind = kind; o.ref = ref; o.k = k; V.items.push(o); return o;
  }
  function byY(a, b) { return a.y - b.y; }

  // altura da superfície (Gangorra: o lado pesado afunda)
  function surf(S, x, y) { return S.lv === 'tilt' ? -((S.tx || 0) * (x - CX) + (S.ty || 0) * (y - CY)) * 0.55 : 0; }
  // elipse girada no chão (raios a, b em unidades do mundo; dir = ângulo no mundo)
  function gell(K, sx, sy, a, b, dir) {
    var c = K.ctx; c.save(); c.translate(sx, sy); c.scale(1, K.tilt); c.rotate(dir || 0); c.scale(1, b / a);
    c.beginPath(); c.arc(0, 0, a * K.s, 0, TAU); c.restore();
  }
  function lw(K, k) { return Math.max(1.5, K.s * (k || 0.06)); }
  function fillStroke(c, fill, w) { c.fillStyle = fill; c.fill(); c.lineWidth = w; c.strokeStyle = INK; c.stroke(); }

  // ---------- água ----------
  function water(K, S) {
    var c = K.ctx, t = K.time;
    c.fillStyle = WATER[S.lv] || WATER.polar; c.fillRect(-40, -40, K.W + 80, K.H + 80);
    c.strokeStyle = 'rgba(255,255,255,0.28)'; c.lineWidth = Math.max(2, K.s * 0.06); c.lineCap = 'round';
    c.beginPath();
    for (var i = 0; i < RIPPLES.length; i++) {
      var r = RIPPLES[i], x = r.x + Math.sin(t * 0.4 + r.p) * 0.3, X = K.X(x), Y = K.Y(r.y, 0), w = r.w * K.s, k = 0.5 + 0.5 * Math.sin(t * 1.3 + r.p);
      c.moveTo(X - w, Y); c.quadraticCurveTo(X - w / 2, Y - w * 0.25 * k, X, Y); c.quadraticCurveTo(X + w / 2, Y + w * 0.25 * k, X + w, Y);
    }
    c.stroke(); c.lineCap = 'butt';
  }

  // ---------- gelo redondo ----------
  function floeRound(K, S) {
    var c = K.ctx, s = K.s, R = S.R, X = K.X(CX), Y = K.Y(CY, 0), T = s * 0.6, t = K.time;
    // espuma em volta
    c.fillStyle = 'rgba(255,255,255,0.45)'; K.ell(X, Y + T * 0.6, (R + 0.35 + Math.sin(t * 2) * 0.06) * s, (R + 0.35) * s * K.tilt); c.fill();
    // lado (espessura) e tampa
    c.fillStyle = '#3f97c2'; K.ell(X, Y + T, R * s, R * s * K.tilt); c.fill(); c.lineWidth = lw(K, 0.07); c.strokeStyle = INK; c.stroke();
    c.fillStyle = SIDE[S.lv]; c.fillRect(X - R * s, Y, R * s * 2, T * 0.55);
    c.fillStyle = SIDE[S.lv]; K.ell(X, Y + T * 0.55, R * s, R * s * K.tilt); c.fill();
    c.beginPath(); c.moveTo(X - R * s, Y); c.lineTo(X - R * s, Y + T); c.moveTo(X + R * s, Y); c.lineTo(X + R * s, Y + T); c.stroke();
    c.fillStyle = TOP[S.lv]; K.ell(X, Y, R * s, R * s * K.tilt); c.fill(); c.stroke();
    // marcas na tampa (rachaduras, poças do degelo, fuligem das bombas) presas ao gelo
    c.save(); K.ell(X, Y, R * s - 2, R * s * K.tilt - 2); c.clip();
    if (S.lv === 'melt') {
      for (var p = 0; p < PUDDLES.length; p++) { var pu = PUDDLES[p], pr = pu.r * (1 + Math.min(1.2, (7 - R) * 0.35)); c.fillStyle = '#a9dff2'; K.ell(K.X(pu.x), K.Y(pu.y, 0), pr * s, pr * s * K.tilt); c.fill(); }
    }
    if (S.lv === 'manic') {
      // marcas de queimado das bombas: miolo escuro e riscos em estrela
      c.fillStyle = 'rgba(15,15,20,0.18)'; c.strokeStyle = 'rgba(15,15,20,0.25)'; c.lineWidth = Math.max(1.5, s * 0.05);
      for (p = 0; p < V.scorch.length; p++) {
        var sc = V.scorch[p], scx = K.X(sc.x), scy = K.Y(sc.y, 0);
        K.ell(scx, scy, 0.45 * s, 0.45 * s * K.tilt); c.fill();
        c.beginPath(); for (var ra = 0; ra < 8; ra++) { var an = ra * TAU / 8 + p; c.moveTo(scx + Math.cos(an) * 0.5 * s, scy + Math.sin(an) * 0.5 * s * K.tilt); c.lineTo(scx + Math.cos(an) * 0.9 * s, scy + Math.sin(an) * 0.9 * s * K.tilt); } c.stroke();
      }
    }
    c.strokeStyle = '#a9d6ea'; c.lineWidth = Math.max(1.5, s * 0.05); c.beginPath();
    for (var i = 0; i < CRACKS.length; i++) { var q = CRACKS[i]; c.moveTo(K.X(q[0]), K.Y(q[1], 0)); for (var k = 2; k < q.length; k += 2) c.lineTo(K.X(q[k]), K.Y(q[k + 1], 0)); }
    c.stroke();
    // brilho chapado no canto de cima
    c.fillStyle = 'rgba(255,255,255,0.7)'; gell(K, K.X(CX - R * 0.45), K.Y(CY - R * 0.5, 0), R * 0.28, R * 0.07, -0.5); c.fill();
    c.restore();
    // borda esfarelando (fim da rodada)
    if (S.sd && Math.random() < 0.5) { var a = Math.random() * TAU; K.burst(CX + Math.cos(a) * R, CY + Math.sin(a) * R, 0, '#dff4fb', 2, 1.5, 0.6, 0.18, 2); }
  }

  // ---------- gangorra quadrada ----------
  var corner = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  function floeSquare(K, S) {
    var c = K.ctx, s = K.s, H = S.R, th = 0.7, i, P = [];
    for (i = 0; i < 4; i++) { var x = CX + corner[i][0] * H, y = CY + corner[i][1] * H; P.push(K.X(x), K.Y(y, surf(S, x, y))); }
    // frente (o lado que a câmera vê)
    c.beginPath(); c.moveTo(P[6], P[7]); c.lineTo(P[4], P[5]); c.lineTo(P[4], P[5] + th * s); c.lineTo(P[6], P[7] + th * s); c.closePath();
    fillStroke(c, SIDE.tilt, lw(K, 0.07));
    // tampa: mais clara quando inclina para a câmera, mais escura quando foge dela
    var sh = Math.max(-1, Math.min(1, ((S.ty || 0) * -1 + (S.tx || 0) * 0.5) * 3)), base = sh >= 0 ? [230 + 20 * sh, 246 + 8 * sh, 252 + 3 * sh] : [230 + 40 * sh, 246 + 30 * sh, 252 + 12 * sh];
    c.beginPath(); c.moveTo(P[0], P[1]); c.lineTo(P[2], P[3]); c.lineTo(P[4], P[5]); c.lineTo(P[6], P[7]); c.closePath();
    fillStroke(c, 'rgb(' + Math.round(base[0]) + ',' + Math.round(base[1]) + ',' + Math.round(base[2]) + ')', lw(K, 0.07));
    // grade: deixa a inclinação fácil de ler
    c.strokeStyle = 'rgba(70,140,180,0.45)'; c.lineWidth = Math.max(1.5, s * 0.04); c.beginPath();
    for (i = 1; i < 6; i++) {
      var f = -H + i * H / 3;
      c.moveTo(K.X(CX + f), K.Y(CY - H, surf(S, CX + f, CY - H))); c.lineTo(K.X(CX + f), K.Y(CY + H, surf(S, CX + f, CY + H)));
      c.moveTo(K.X(CX - H), K.Y(CY + f, surf(S, CX - H, CY + f))); c.lineTo(K.X(CX + H), K.Y(CY + f, surf(S, CX + H, CY + f)));
    }
    c.stroke();
    // seta da ladeira: para onde tudo escorrega
    var tx = S.tx || 0, ty = S.ty || 0, tl = Math.sqrt(tx * tx + ty * ty);
    if (tl > 0.08) {
      var ux = tx / tl, uy = ty / tl, L = Math.min(3, tl * 9), x0 = CX - ux * L / 2, y0 = CY - uy * L / 2, x1 = CX + ux * L / 2, y1 = CY + uy * L / 2;
      c.save(); c.globalAlpha = Math.min(0.5, tl * 2);
      c.strokeStyle = '#2470b0'; c.lineWidth = s * 0.28; c.lineCap = 'round';
      c.beginPath(); c.moveTo(K.X(x0), K.Y(y0, surf(S, x0, y0))); c.lineTo(K.X(x1), K.Y(y1, surf(S, x1, y1)));
      var hx = x1 - ux * 0.8 - uy * 0.7, hy = y1 - uy * 0.8 + ux * 0.7, kx = x1 - ux * 0.8 + uy * 0.7, ky = y1 - uy * 0.8 - ux * 0.7;
      c.moveTo(K.X(hx), K.Y(hy, surf(S, hx, hy))); c.lineTo(K.X(x1), K.Y(y1, surf(S, x1, y1))); c.lineTo(K.X(kx), K.Y(ky, surf(S, kx, ky)));
      c.stroke(); c.lineCap = 'butt'; c.restore();
    }
    if (S.sd && Math.random() < 0.5) { var e = Math.random() * 4 | 0, u = Math.random() * 2 - 1, bx = CX + (e < 2 ? u * H : (e === 2 ? H : -H)), by = CY + (e < 2 ? (e ? H : -H) : u * H); K.burst(bx, by, surf(S, bx, by), '#dff4fb', 2, 1.5, 0.6, 0.18, 2); }
  }

  // ---------- muro de gelo (Pânico Polar) ----------
  function wallSeg(K, S, i, hp) {
    var c = K.ctx, R = S.R, n = S.walls.length, a0 = -Math.PI + i * TAU / n + 0.025, a1 = -Math.PI + (i + 1) * TAU / n - 0.025;
    var ri = R - 0.42, ro = R + 0.02, h = 0.5, mid = (a0 + a1) / 2, front = Math.sin(mid) > 0;
    var top = hp >= 2 ? '#f7fdff' : '#cde9f5', face = hp >= 2 ? '#9ad8f0' : '#6fb6d6', w = lw(K, 0.05);
    // face que a câmera vê: de fora na frente, de dentro atrás
    var rf = front ? ro : ri;
    c.beginPath();
    c.moveTo(K.X(CX + Math.cos(a0) * rf), K.Y(CY + Math.sin(a0) * rf, 0)); c.lineTo(K.X(CX + Math.cos(a1) * rf), K.Y(CY + Math.sin(a1) * rf, 0));
    c.lineTo(K.X(CX + Math.cos(a1) * rf), K.Y(CY + Math.sin(a1) * rf, h)); c.lineTo(K.X(CX + Math.cos(a0) * rf), K.Y(CY + Math.sin(a0) * rf, h)); c.closePath();
    fillStroke(c, face, w);
    c.beginPath();
    c.moveTo(K.X(CX + Math.cos(a0) * ri), K.Y(CY + Math.sin(a0) * ri, h)); c.lineTo(K.X(CX + Math.cos(a0) * ro), K.Y(CY + Math.sin(a0) * ro, h));
    c.lineTo(K.X(CX + Math.cos(a1) * ro), K.Y(CY + Math.sin(a1) * ro, h)); c.lineTo(K.X(CX + Math.cos(a1) * ri), K.Y(CY + Math.sin(a1) * ri, h)); c.closePath();
    fillStroke(c, top, w);
    if (hp < 2) {
      // rachado: um zigue-zague na tampa
      var rm = (ri + ro) / 2;
      c.beginPath(); c.moveTo(K.X(CX + Math.cos(a0 + 0.02) * rm), K.Y(CY + Math.sin(a0 + 0.02) * rm, h));
      c.lineTo(K.X(CX + Math.cos(mid - 0.04) * ri), K.Y(CY + Math.sin(mid - 0.04) * ri, h));
      c.lineTo(K.X(CX + Math.cos(mid + 0.03) * ro), K.Y(CY + Math.sin(mid + 0.03) * ro, h));
      c.lineTo(K.X(CX + Math.cos(a1 - 0.02) * rm), K.Y(CY + Math.sin(a1 - 0.02) * rm, h));
      c.lineWidth = w; c.strokeStyle = INK; c.stroke();
    }
  }

  // ---------- ícones dos poderes ----------
  function icon(K, kind, x, y, r) {
    var c = K.ctx, w = Math.max(1.5, r * 0.18);
    c.lineWidth = w; c.strokeStyle = INK; c.lineJoin = 'round';
    if (kind === 'raio') {
      c.beginPath(); c.moveTo(x + r * 0.25, y - r); c.lineTo(x - r * 0.55, y + r * 0.15); c.lineTo(x - r * 0.02, y + r * 0.15); c.lineTo(x - r * 0.3, y + r); c.lineTo(x + r * 0.6, y - r * 0.2); c.lineTo(x + r * 0.05, y - r * 0.2); c.closePath();
      fillStroke(c, '#ffce1f', w);
    } else if (kind === 'peso') {
      c.beginPath(); c.moveTo(x - r * 0.55, y - r * 0.6); c.lineTo(x + r * 0.55, y - r * 0.6); c.lineTo(x + r * 0.95, y + r * 0.8); c.lineTo(x - r * 0.95, y + r * 0.8); c.closePath();
      fillStroke(c, '#3a3a42', w);
      c.beginPath(); c.arc(x, y - r * 0.75, r * 0.3, Math.PI, TAU); c.stroke();
      K.text('KG', x, y + r * 0.15, r * 0.8, '#fff');
    } else if (kind === 'bomba') {
      c.beginPath(); c.arc(x, y + r * 0.1, r * 0.8, 0, TAU); fillStroke(c, '#26262e', w);
      c.beginPath(); c.moveTo(x + r * 0.45, y - r * 0.55); c.quadraticCurveTo(x + r * 0.7, y - r * 1.1, x + r * 1.0, y - r * 0.9); c.stroke();
      c.fillStyle = (K.time * 8 | 0) % 2 ? '#ffce1f' : '#f97316'; c.beginPath(); c.arc(x + r * 1.0, y - r * 0.95, r * 0.28, 0, TAU); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.6)'; c.beginPath(); c.arc(x - r * 0.3, y - r * 0.2, r * 0.18, 0, TAU); c.fill();
    } else {
      c.beginPath(); c.arc(x, y, r * 0.85, 0, TAU); fillStroke(c, PCOL[kind] || '#fff', w);
      if (kind === 'inflar' || kind === 'encolher') {
        c.lineWidth = r * 0.26; c.beginPath(); c.moveTo(x - r * 0.45, y); c.lineTo(x + r * 0.45, y);
        if (kind === 'inflar') { c.moveTo(x, y - r * 0.45); c.lineTo(x, y + r * 0.45); }
        c.stroke();
      } else if (kind === 'gelo') { c.fillStyle = '#fff'; c.fillRect(x - r * 0.4, y - r * 0.4, r * 0.35, r * 0.35); }
      else if (kind === 'neve') { c.fillStyle = '#cfe8f3'; c.beginPath(); c.arc(x + r * 0.2, y + r * 0.2, r * 0.3, 0, TAU); c.fill(); }
    }
  }
  // o Peso em cima da cabeça, grande, com os segundos escritos nele (vermelho piscando no fim)
  function weight(K, x, y, r, n, warn) {
    var c = K.ctx, w = lw(K, 0.06);
    c.fillStyle = INK; c.beginPath(); c.moveTo(x - r * 0.6 + 3, y - r * 0.7 + 3); c.lineTo(x + r * 0.6 + 3, y - r * 0.7 + 3); c.lineTo(x + r + 3, y + r * 0.75 + 3); c.lineTo(x - r + 3, y + r * 0.75 + 3); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(x - r * 0.6, y - r * 0.7); c.lineTo(x + r * 0.6, y - r * 0.7); c.lineTo(x + r, y + r * 0.75); c.lineTo(x - r, y + r * 0.75); c.closePath();
    fillStroke(c, warn ? '#f0443a' : '#3a3a42', w);
    c.beginPath(); c.arc(x, y - r * 0.85, r * 0.32, Math.PI, TAU); c.lineWidth = w * 1.4; c.stroke();
    K.pix(String(n), x, y + r * 0.08, r * 1.15, '#ffffff');
  }
  // etiqueta em cima da cabeça: ícone + segundos
  function tag(K, kind, n, x, y, warn) {
    var c = K.ctx, s = K.s, h = s * 0.62, w = n ? h * 1.75 : h * 1.05;
    c.fillStyle = INK; c.fillRect(x - w / 2 + 3, y - h / 2 + 3, w, h);
    c.fillStyle = warn ? '#f0443a' : '#fff'; c.fillRect(x - w / 2, y - h / 2, w, h);
    c.lineWidth = lw(K, 0.05); c.strokeStyle = INK; c.strokeRect(x - w / 2, y - h / 2, w, h);
    icon(K, kind, n ? x - w / 2 + h * 0.52 : x, y, h * 0.36);
    if (n) K.pix(String(n), x + w / 2 - h * 0.5, y + 1, h * 0.72, warn ? '#fff' : INK);
  }

  // ---------- urso ----------
  // rider: função que desenha quem monta (entre o corpo e a cabeça, para a cabeça ficar na frente)
  function bear(K, x, y, z, r, dir, ph, sq, color, rider) {
    var c = K.ctx, s = K.s, cd = Math.cos(dir), sd = Math.sin(dir), w = lw(K, 0.05), i;
    var X = function (ax, ac) { return K.X(x + cd * ax * r - sd * ac * r); };
    var Y = function (ax, ac, zz) { return K.Y(y + sd * ax * r + cd * ac * r, z + zz * r); };
    // patas (andam com a velocidade)
    var legs = [[0.6, 0.5], [0.6, -0.5], [-0.6, 0.5], [-0.6, -0.5]];
    for (i = 0; i < 4; i++) {
      var off = Math.sin(ph + (i === 0 || i === 3 ? 0 : Math.PI)) * 0.16;
      gell(K, X(legs[i][0] + off, legs[i][1]), Y(legs[i][0] + off, legs[i][1], 0.1), r * 0.24, r * 0.2, dir); fillStroke(c, '#e9eef1', w);
    }
    var hz = 0.8 - sq * 0.3, headX = X(1.15, 0), headY = Y(1.15, 0, hz), hr = r * 0.5 * s, behind = sd < -0.3;
    var head = function () {
      // orelhas, cabeça, olhos, focinho e nariz: tem que ler "urso" de longe
      var px = -sd * hr * 0.7, py = cd * hr * 0.7 * K.tilt, er = hr * 0.36;
      c.beginPath(); c.arc(headX + px, headY - hr * 0.7 + py, er, 0, TAU); fillStroke(c, '#ffffff', w);
      c.beginPath(); c.arc(headX - px, headY - hr * 0.7 - py, er, 0, TAU); fillStroke(c, '#ffffff', w);
      c.fillStyle = '#f9c6d3'; c.beginPath(); c.arc(headX + px, headY - hr * 0.7 + py, er * 0.45, 0, TAU); c.arc(headX - px, headY - hr * 0.7 - py, er * 0.45, 0, TAU); c.fill();
      c.beginPath(); c.arc(headX, headY, hr, 0, TAU); fillStroke(c, '#ffffff', w);
      if (!behind) {
        var mx = headX + cd * hr * 0.5, my = headY + Math.max(0, sd) * hr * 0.35 + hr * 0.22;
        c.fillStyle = '#e8e4d8'; K.ell(mx, my, hr * 0.5, hr * 0.36); c.fill(); c.lineWidth = w * 0.8; c.stroke();
        c.fillStyle = INK; c.beginPath(); c.arc(mx + cd * hr * 0.25, my - hr * 0.1, hr * 0.17, 0, TAU); c.fill();
        var ex = headX + cd * hr * 0.15, ey = headY - hr * 0.2, eo = hr * 0.38 * Math.max(0.35, Math.abs(sd) + 0.2);
        c.beginPath(); c.arc(ex - eo, ey, hr * 0.12, 0, TAU); c.fill();
        c.beginPath(); c.arc(ex + eo, ey, hr * 0.12, 0, TAU); c.fill();
      }
    };
    if (behind) head();
    // corpo: sombra da barriga sem contorno e o lombo branco por cima
    gell(K, X(0, 0), Y(0, 0, 0.22), r * 1.18 * (1 + sq), r * 0.86 * (1 + sq), dir); c.fillStyle = '#b8c7d1'; c.fill();
    gell(K, X(0, 0), Y(0, 0, 0.5 - sq * 0.25), r * 1.15 * (1 + sq), r * 0.84 * (1 + sq), dir); fillStroke(c, '#ffffff', w);
    // pelo: dois tracinhos no lombo e o rabinho
    c.lineWidth = w * 0.7; c.strokeStyle = '#b8c7d1'; c.beginPath();
    c.moveTo(X(0.35, 0.45), Y(0.35, 0.45, 0.5)); c.lineTo(X(0.1, 0.5), Y(0.1, 0.5, 0.5));
    c.moveTo(X(0.35, -0.45), Y(0.35, -0.45, 0.5)); c.lineTo(X(0.1, -0.5), Y(0.1, -0.5, 0.5)); c.stroke();
    c.beginPath(); c.arc(X(-1.18, 0), Y(-1.18, 0, 0.5), r * 0.17 * s, 0, TAU); fillStroke(c, '#ffffff', w);
    if (rider) rider(x - cd * 0.25 * r, y - sd * 0.25 * r, z + r * (0.62 - sq * 0.3));
    if (!behind) head();
  }

  // ---------- jogador ----------
  // pendurado na borda de trás: o corpo fica atrás do gelo (desenhado antes dele), só a cabeça aparece
  function backHang(S, p) { return !!p.hg && !p.out && (S.lv === 'tilt' ? (p.y < CY && Math.abs(p.y - CY) >= Math.abs(p.x - CX)) : p.y < CY - 0.3); }
  function player(K, S, p, under) {
    var c = K.ctx, s = K.s, slot = p.id, r = p.r || 0.55, z = surf(S, p.x, p.y), color = K.color(slot);
    var sq = V.sq[slot] || 0, x = p.x, y = p.y, alpha = 1;
    if (p.out) {
      if (p.oa > 1.4) return;
      alpha = Math.max(0, 1 - p.oa / 1.4); z -= p.oa * (p.how === 'peso' ? 2.2 : 1.2);
    }
    c.save(); c.globalAlpha = alpha;
    if (p.hg) {
      // pendurado: só o tronco aparece, as patas agarram a borda, balança de aflição
      var wob = Math.sin(K.time * 26 + slot) * 0.06, dx = x - CX, dy = y - CY, dl = Math.sqrt(dx * dx + dy * dy) || 1, ix = -dx / dl, iy = -dy / dl;
      if (S.lv === 'tilt') { if (Math.abs(dx) > Math.abs(dy)) { ix = dx > 0 ? -1 : 1; iy = 0; } else { ix = 0; iy = dy > 0 ? -1 : 1; } }
      var back = backHang(S, p);
      if (under || !back) {
        c.fillStyle = 'rgba(255,255,255,0.6)'; K.ell(K.X(x), K.Y(y, z - 0.3), r * s * 1.2, r * s * 0.5); c.fill();
        K.char(slot, x + wob, y, z - 0.45, { r: r, size: 2.1, ring: false, squash: Math.sin(K.time * 20) * 0.08 });
      }
      if (under) { c.restore(); return; }
      for (var k = -1; k <= 1; k += 2) { c.beginPath(); c.arc(K.X(x + ix * 0.35 - iy * 0.3 * k), K.Y(y + iy * 0.35 + ix * 0.3 * k, z + 0.05), r * s * 0.24, 0, TAU); fillStroke(c, '#ffffff', lw(K, 0.05)); }
      // tempo (anel vermelho) e força para subir (barra verde)
      var bx = K.X(x), by = K.Y(y, z + 1.25), bw = s * 1.3, bh = s * 0.22;
      c.fillStyle = INK; c.fillRect(bx - bw / 2 + 2, by + 2, bw, bh); c.fillStyle = '#fff'; c.fillRect(bx - bw / 2, by, bw, bh);
      c.fillStyle = '#35d07f'; c.fillRect(bx - bw / 2, by, bw * Math.min(1, p.cl || 0), bh);
      c.fillStyle = '#f0443a'; c.fillRect(bx - bw / 2, by + bh * 0.7, bw * (p.hg || 0), bh * 0.3);
      c.lineWidth = lw(K, 0.04); c.strokeStyle = INK; c.strokeRect(bx - bw / 2, by, bw, bh);
      if ((K.time * 6 | 0) % 2) K.text('A! A! A!', bx, by - s * 0.35, s * 0.42, '#ffce1f', 'center', INK);
      c.restore(); return;
    }
    // sombra e anel na cor da pessoa
    c.fillStyle = 'rgba(15,15,20,0.25)'; gell(K, K.X(x), K.Y(y, z), r * 1.15, r * 1.15, 0); c.fill();
    c.lineWidth = Math.max(4, s * 0.15); c.strokeStyle = INK; gell(K, K.X(x), K.Y(y, z), r * 1.2, r * 1.2, 0); c.stroke();
    c.lineWidth = Math.max(2.5, s * 0.09); c.strokeStyle = color; c.stroke();
    // investida: rastro de neve; agachado: treme
    if (p.bu) {
      c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = Math.max(2, s * 0.08); c.beginPath();
      for (var l = -1; l <= 1; l++) {
        var bx0 = x - Math.cos(p.dir) * r * 1.2 - Math.sin(p.dir) * l * r * 0.5, by0 = y - Math.sin(p.dir) * r * 1.2 + Math.cos(p.dir) * l * r * 0.5;
        c.moveTo(K.X(bx0), K.Y(by0, z + 0.3)); c.lineTo(K.X(bx0 - Math.cos(p.dir) * 1.3), K.Y(by0 - Math.sin(p.dir) * 1.3, z + 0.3));
      }
      c.stroke();
    }
    if (p.wd) { x += (Math.random() - 0.5) * 0.08; sq = Math.max(sq, 0.22); }
    var rot = p.tu ? Math.sin(K.time * 30) * 0.18 : 0, top = z;
    if (rot) { c.translate(K.X(x), K.Y(y, z)); c.rotate(rot); c.translate(-K.X(x), -K.Y(y, z)); }
    var size = p.bear ? 1.55 : 2.3, headY = 0;
    var rider = function (rx, ry, rz) { K.char(slot, rx, ry, rz, { r: r * 1.1, size: size, ring: false, squash: sq, flash: p.fl }); headY = K.Y(ry, rz) - size * r * 1.1 * s * 0.92 * (1 - sq); };
    if (p.bear) { bear(K, x, y, z, r * 1.15, p.dir, V.ph[slot] || 0, sq, color, rider); top = z + r * 0.7; }
    else {
      // a pé: dois patins pequenos
      for (var f = -1; f <= 1; f += 2) { gell(K, K.X(x - Math.sin(p.dir) * f * r * 0.35), K.Y(y + Math.cos(p.dir) * f * r * 0.35, z), r * 0.42, r * 0.14, p.dir); fillStroke(c, '#94a3b8', lw(K, 0.04)); }
      rider(x, y, z);
    }
    if (rot) c.setTransform(1, 0, 0, 1, 0, 0);
    // congelado: um cubo de gelo por cima
    if (p.pw === 'gelo') {
      var gw = r * s * 2.4, gh = r * s * 2.6, gx = K.X(x) - gw / 2, gy = K.Y(y, z) - gh + r * s * 0.5;
      c.fillStyle = 'rgba(160,225,250,0.55)'; c.fillRect(gx, gy, gw, gh); c.lineWidth = lw(K, 0.06); c.strokeStyle = INK; c.strokeRect(gx, gy, gw, gh);
      c.fillStyle = 'rgba(255,255,255,0.8)'; c.fillRect(gx + gw * 0.12, gy + gh * 0.1, gw * 0.12, gh * 0.4);
      headY = gy;
    }
    // tonto: estrelinhas girando
    if (p.sn) {
      for (var st = 0; st < 3; st++) { var sa = K.time * 6 + st * TAU / 3; c.fillStyle = '#ffce1f'; c.beginPath(); c.arc(K.X(x) + Math.cos(sa) * r * s * 0.8, headY - s * 0.1 + Math.sin(sa) * r * s * 0.25, s * 0.1, 0, TAU); c.fill(); c.lineWidth = 1.5; c.strokeStyle = INK; c.stroke(); }
    }
    // poder em cima da cabeça
    if (p.pw === 'peso') {
      var bob = Math.sin(K.time * 8) * s * 0.06, warn = p.pt <= 3 && (K.time * 6 | 0) % 2;
      weight(K, K.X(x), headY - s * 0.55 + bob, s * 0.5, p.pt, warn);
    } else if (p.pw) {
      tag(K, p.pw, p.pw === 'neve' ? 0 : p.pt, K.X(x), headY - s * 0.45, p.pw === 'raio' && p.pt <= 2 && (K.time * 6 | 0) % 2);
      if (p.pw === 'raio') { c.strokeStyle = '#ffce1f'; c.lineWidth = Math.max(2, s * 0.06); gell(K, K.X(x), K.Y(y, z), r * (1.45 + Math.sin(K.time * 20) * 0.08), r * 1.45, 0); c.stroke(); }
    } else if (p.bomb) icon(K, 'bomba', K.X(x) + r * s * 0.9, K.Y(y, top + 0.2), s * 0.25);
    c.restore();
  }

  // ---------- o Disco ----------
  function discoDraw(K, S) {
    var D = S.disco; if (!D) return;
    var c = K.ctx, s = K.s, t = K.time, x = D.x, y = D.y, zz = 4.2 + Math.sin(t * 2) * 0.15, X = K.X(x), Y = K.Y(y, zz), w = lw(K, 0.06), i;
    var tg = D.tg >= 0 && S.ps ? S.ps[D.tg] : null;
    if (D.st === 'fire' && tg) {
      // raio do Disco até a pessoa
      var gx = K.X(tg.x), gy = K.Y(tg.y, surf(S, tg.x, tg.y)), col = PCOL[D.pw] || '#ffce1f';
      c.save(); c.globalAlpha = 0.55;
      c.beginPath(); c.moveTo(X - s * 0.35, Y + s * 0.2); c.lineTo(X + s * 0.35, Y + s * 0.2); c.lineTo(gx + s * 0.9, gy); c.lineTo(gx - s * 0.9, gy); c.closePath();
      c.fillStyle = col === '#3a3a42' ? '#9aa0ad' : col; c.fill(); c.restore();
      c.strokeStyle = INK; c.lineWidth = w; c.stroke();
    }
    // corpo: disco amarelo com cúpula e luzinhas
    c.fillStyle = INK; K.ell(X + 4, Y + 4, s * 1.0, s * 0.36); c.fill();
    c.beginPath(); c.arc(X, Y - s * 0.12, s * 0.48, Math.PI, TAU); fillStroke(c, '#9be7ff', w);
    c.fillStyle = 'rgba(255,255,255,0.8)'; c.fillRect(X - s * 0.28, Y - s * 0.42, s * 0.1, s * 0.18);
    K.ell(X, Y, s * 1.0, s * 0.36); fillStroke(c, '#ffce1f', w);
    c.fillStyle = '#f97316'; K.ell(X, Y + s * 0.1, s * 0.7, s * 0.14); c.fill();
    var cols = ['#f0443a', '#35d07f', '#3db4f2', '#f472b6'];
    for (i = 0; i < 6; i++) {
      var a = t * 2 + i * TAU / 6, lx = X + Math.cos(a) * s * 0.82, ly = Y + Math.sin(a) * s * 0.2;
      if (Math.sin(a) < -0.2) continue;
      c.fillStyle = cols[(i + (t * 4 | 0)) % 4]; c.beginPath(); c.arc(lx, ly, s * 0.08, 0, TAU); c.fill(); c.lineWidth = 1.5; c.strokeStyle = INK; c.stroke();
    }
    c.lineWidth = w; c.strokeStyle = INK; c.beginPath(); c.moveTo(X, Y - s * 0.6); c.lineTo(X, Y - s * 0.85); c.stroke();
    c.fillStyle = (t * 3 | 0) % 2 ? '#f0443a' : '#ffce1f'; c.beginPath(); c.arc(X, Y - s * 0.9, s * 0.09, 0, TAU); c.fill(); c.stroke();
    if (D.st === 'aim' && tg && !tg.out) {
      // mira piscando em quem vai ganhar o poder
      var mx = K.X(tg.x), my = K.Y(tg.y, surf(S, tg.x, tg.y)), rr = s * (1.1 + 0.25 * Math.sin(t * 18));
      c.strokeStyle = (t * 8 | 0) % 2 ? '#ffce1f' : '#f0443a'; c.lineWidth = Math.max(3, s * 0.1);
      K.ell(mx, my, rr, rr * K.tilt); c.stroke();
      c.beginPath(); c.moveTo(mx - rr * 1.25, my); c.lineTo(mx - rr * 0.7, my); c.moveTo(mx + rr * 0.7, my); c.lineTo(mx + rr * 1.25, my); c.stroke();
      if (c.setLineDash) c.setLineDash([s * 0.15, s * 0.15]);
      c.lineWidth = 2; c.beginPath(); c.moveTo(X, Y + s * 0.3); c.lineTo(mx, my); c.stroke();
      if (c.setLineDash) c.setLineDash([]);
    }
  }
  function discoShadow(K, S) {
    var D = S.disco; if (!D) return;
    var c = K.ctx; c.fillStyle = 'rgba(15,15,20,0.12)'; gell(K, K.X(D.x), K.Y(D.y, surf(S, D.x, D.y)), 0.65, 0.65, 0); c.fill();
  }

  // ---------- peixe, morsa, bombas ----------
  function fish(K, S, f) {
    var c = K.ctx, s = K.s, z = surf(S, f.x, f.y), X = K.X(f.x), Y = K.Y(f.y, z), k = Math.max(0, f.k || 0), w = lw(K, 0.05);
    // alvo vermelho crescendo: a morsa cai aqui
    var rr = s * (2.4 - k * 0.5);
    c.strokeStyle = (K.time * 8 | 0) % 2 ? '#f0443a' : '#ffffff'; c.lineWidth = Math.max(3, s * 0.1); K.ell(X, Y, rr, rr * K.tilt); c.stroke();
    c.fillStyle = 'rgba(240,68,58,' + (0.12 + (2 - k) * 0.08) + ')'; K.ell(X, Y, rr, rr * K.tilt); c.fill();
    var hop = Math.abs(Math.sin(K.time * 9)) * s * 0.25;
    c.beginPath(); c.moveTo(X - s * 0.45, Y - hop); c.quadraticCurveTo(X, Y - s * 0.32 - hop, X + s * 0.35, Y - hop); c.quadraticCurveTo(X, Y + s * 0.3 - hop, X - s * 0.45, Y - hop); c.closePath();
    fillStroke(c, '#fb923c', w);
    c.beginPath(); c.moveTo(X - s * 0.4, Y - hop); c.lineTo(X - s * 0.7, Y - s * 0.2 - hop); c.lineTo(X - s * 0.7, Y + s * 0.2 - hop); c.closePath(); fillStroke(c, '#fb923c', w);
    c.fillStyle = INK; c.beginPath(); c.arc(X + s * 0.18, Y - s * 0.05 - hop, s * 0.05, 0, TAU); c.fill();
  }
  function walrusDraw(K, S, m) {
    var c = K.ctx, s = K.s, z0 = surf(S, m.x, m.y), X = K.X(m.x), G = K.Y(m.y, z0), Y = K.Y(m.y, z0 + (m.z || 0)), w = lw(K, 0.07);
    c.fillStyle = 'rgba(15,15,20,' + (0.3 - Math.min(0.2, (m.z || 0) * 0.02)) + ')'; K.ell(X, G, s * 1.1, s * 1.1 * K.tilt); c.fill();
    c.beginPath(); K.ell(X, Y - s * 0.55, s * 1.05, s * 0.75); fillStroke(c, '#9a6a45', w);
    c.beginPath(); c.arc(X, Y - s * 1.15, s * 0.55, 0, TAU); fillStroke(c, '#a87850', w);
    // bigode, presas e olhos
    c.fillStyle = '#d9b48c'; K.ell(X - s * 0.2, Y - s * 0.95, s * 0.24, s * 0.18); c.fill(); c.stroke(); K.ell(X + s * 0.2, Y - s * 0.95, s * 0.24, s * 0.18); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(X - s * 0.18, Y - s * 0.82); c.lineTo(X - s * 0.14, Y - s * 0.35); c.lineTo(X - s * 0.06, Y - s * 0.8); c.closePath(); fillStroke(c, '#fff', w * 0.7);
    c.beginPath(); c.moveTo(X + s * 0.18, Y - s * 0.82); c.lineTo(X + s * 0.14, Y - s * 0.35); c.lineTo(X + s * 0.06, Y - s * 0.8); c.closePath(); fillStroke(c, '#fff', w * 0.7);
    c.fillStyle = INK; c.beginPath(); c.arc(X - s * 0.2, Y - s * 1.32, s * 0.07, 0, TAU); c.arc(X + s * 0.2, Y - s * 1.32, s * 0.07, 0, TAU); c.fill();
    // nadadeiras
    c.beginPath(); K.ell(X - s * 0.95, Y - s * 0.2, s * 0.35, s * 0.15); fillStroke(c, '#8a5c3a', w * 0.8);
    c.beginPath(); K.ell(X + s * 0.95, Y - s * 0.2, s * 0.35, s * 0.15); fillStroke(c, '#8a5c3a', w * 0.8);
  }
  function pickDraw(K, S, b) {
    var c = K.ctx, s = K.s, X = K.X(b.x), Y = K.Y(b.y, 0), bob = Math.sin(K.time * 4 + b.id) * s * 0.08;
    c.fillStyle = 'rgba(15,15,20,0.25)'; K.ell(X, Y, s * 0.42, s * 0.42 * K.tilt); c.fill();
    c.strokeStyle = '#f0443a'; c.lineWidth = Math.max(2, s * 0.06); K.ell(X, Y, s * (0.55 + 0.08 * Math.sin(K.time * 6)), s * 0.55 * K.tilt); c.stroke();
    icon(K, 'bomba', X, Y - s * 0.45 + bob, s * 0.38);
  }
  function shotDraw(K, S, b) {
    var c = K.ctx, s = K.s, z0 = surf(S, b.x, b.y), X = K.X(b.x);
    c.fillStyle = 'rgba(15,15,20,0.25)'; K.ell(X, K.Y(b.y, z0), s * 0.3, s * 0.3 * K.tilt); c.fill();
    if (b.k === 'bomb') icon(K, 'bomba', X, K.Y(b.y, z0 + (b.z || 0)), s * 0.36);
    else { c.beginPath(); c.arc(X, K.Y(b.y, z0 + (b.z || 0)), s * 0.28, 0, TAU); fillStroke(c, '#ffffff', lw(K, 0.05)); }
  }

  // urso que voou longe depois da bomba
  function flyBears(K) {
    for (var i = V.bears.length - 1; i >= 0; i--) {
      var b = V.bears[i]; b.t += K.dt;
      if (b.t > 1.3) { V.bears.splice(i, 1); continue; }
      b.x += b.vx * K.dt; b.y += b.vy * K.dt; b.vz -= 18 * K.dt; b.z += b.vz * K.dt;
      var c = K.ctx; c.save(); c.globalAlpha = Math.max(0, 1 - b.t / 1.3);
      bear(K, b.x, b.y, b.z, 0.5, b.t * 9, 0, 0, '#e4e2d9'); c.restore();
    }
  }
  function zapDraw(K, S) {
    var age = K.time - V.zapAt; if (age > 0.45 || !S.ps) return;
    var c = K.ctx, s = K.s;
    c.strokeStyle = (K.time * 30 | 0) % 2 ? '#ffce1f' : '#ffffff'; c.lineWidth = Math.max(3, s * 0.12); c.lineJoin = 'round';
    for (var i = 0; i < S.ps.length; i++) {
      var p = S.ps[i]; if (p.out || p.id === V.zapFrom) continue;
      var X = K.X(p.x), Y = K.Y(p.y, surf(S, p.x, p.y)), y0 = Y - s * 6;
      c.beginPath(); c.moveTo(X, y0);
      for (var k = 1; k <= 6; k++) c.lineTo(X + (Math.random() - 0.5) * s * 0.8, y0 + (Y - y0) * k / 6);
      c.stroke();
    }
  }

  var JOGO = {
    title: 'POLAR PUSH', color: '#7dd3fc', bg: '#2b7bbf', tilt: 0.72,
    lerp: ['x', 'y', 'z', 'R', 'tx', 'ty', 'm', 'k', 'r', 'sp', 'hg', 'cl', 'oa'], angles: ['dir'], snap: 3,
    arena: function () { return { w: 16, d: 16 }; },
    draw: function (K, S) {
      var c = K.ctx, i, ps = S.ps || [];
      // animação das patas e a amassada das batidas
      for (i = 0; i < ps.length; i++) { V.ph[ps[i].id] = (V.ph[ps[i].id] || 0) + (ps[i].sp || 0) * K.dt * 5; V.sq[ps[i].id] = (V.sq[ps[i].id] || 0) * Math.pow(0.002, K.dt); }
      water(K, S);
      for (i = 0; i < ps.length; i++) if (backHang(S, ps[i])) player(K, S, ps[i], true);
      if (S.lv === 'tilt') floeSquare(K, S); else floeRound(K, S);
      discoShadow(K, S);
      if (S.fish) fish(K, S, S.fish);
      for (i = 0; i < (S.picks || []).length; i++) pickDraw(K, S, S.picks[i]);
      // tudo que tem altura, de trás para a frente
      V.items.length = 0;
      if (S.walls) for (i = 0; i < S.walls.length; i++) if (S.walls[i] > 0) item(CY + Math.sin(-Math.PI + (i + 0.5) * TAU / S.walls.length) * S.R, 'w', i, S.walls[i]);
      for (i = 0; i < ps.length; i++) item(ps[i].y + (ps[i].hg ? (ps[i].y < CY ? -0.6 : 0.3) : 0), 'p', ps[i]);
      if (S.walrus) item(S.walrus.y, 'm', S.walrus);
      for (i = 0; i < (S.shots || []).length; i++) item(S.shots[i].y, 's', S.shots[i]);
      V.items.sort(byY);
      for (i = 0; i < V.items.length; i++) {
        var it = V.items[i];
        if (it.kind === 'w') wallSeg(K, S, it.ref, it.k);
        else if (it.kind === 'p') player(K, S, it.ref);
        else if (it.kind === 'm') walrusDraw(K, S, it.ref);
        else shotDraw(K, S, it.ref);
      }
      flyBears(K);
      discoDraw(K, S);
      zapDraw(K, S);
      // aviso do fim: a borda vai esfarelar
      var age = K.time - V.sdAt;
      if (S.sd) {
        var big = age < 2.5, y = big ? K.H * 0.22 : K.H * 0.05, h = big ? K.H * 0.08 : K.H * 0.05;
        c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
        K.text('O GELO ESTÁ QUEBRANDO!', K.W / 2, y, h, (K.time * 4 | 0) % 2 ? '#ffce1f' : '#ffffff', 'center', INK);
        c.restore();
      }
    },
    fx: function (K, f, S) {
      var s = f.s, p = f.p || 0;
      if (f.k === 'bump') {
        K.sfx(p > 8 ? 'hit' : 'bump'); K.shake(Math.min(16, 2 + p * 1.1));
        K.burst(f.x, f.y, 0.4, '#ffffff', Math.min(18, 4 + p | 0), 1.5 + p * 0.25, 0.5, 0.16, 3 + p * 0.2);
        K.burst(f.x, f.y, 0.4, '#9be7ff', Math.min(8, 2 + p * 0.5 | 0), 1 + p * 0.2, 0.45, 0.12, 3);
        var k = Math.min(0.4, 0.08 + p * 0.03);
        if (f.a >= 0) V.sq[f.a] = Math.max(V.sq[f.a] || 0, k); if (f.b >= 0) V.sq[f.b] = Math.max(V.sq[f.b] || 0, k);
        if (p > 9) K.ring(f.x, f.y, '#ffffff', 2.2, 0.35);
        if (f.c >= 0) K.float(f.x, f.y, 1.8, 'CONTRA!', '#ffce1f');
        else if (f.dd) K.float(f.x, f.y, 1.8, 'TOING!', '#ffffff');
        else if (p > 12.5) K.float(f.x, f.y, 1.8, 'POW!', '#ffce1f');
      } else if (f.k === 'crack' || f.k === 'shatter') {
        K.sfx('hit'); K.shake(f.k === 'shatter' ? 9 : 4);
        K.burst(f.x, f.y, 0.4, '#dff4fb', f.k === 'shatter' ? 16 : 6, 3, 0.7, 0.22, 5);
        if (f.k === 'shatter') { K.ring(f.x, f.y, '#ffffff', 1.6, 0.4); K.sfx('pop'); }
      } else if (f.k === 'thud') K.sfx('bump');
      else if (f.k === 'hang') { K.sfx('jump'); K.float(f.x, f.y, 1.6, '!', '#f0443a'); }
      else if (f.k === 'climb') { K.sfx('jump'); K.burst(f.x, f.y, 0.2, '#ffffff', 8, 2, 0.4, 0.14, 4); K.float(f.x, f.y, 1.6, 'UFA!', '#35d07f'); }
      else if (f.k === 'splash' || f.k === 'sink') {
        K.sfx(f.k === 'sink' ? 'out' : 'splash'); K.shake(7);
        K.burst(f.x, f.y, 0, '#ffffff', 16, 2.4, 0.8, 0.2, 8); K.burst(f.x, f.y, 0, '#7dd3fc', 10, 2, 0.8, 0.18, 7);
        K.ring(f.x, f.y, '#ffffff', 1.8, 0.6); K.ring(f.x, f.y, '#bfe9fb', 2.8, 0.9);
        K.float(f.x, f.y, 1.4, f.k === 'sink' ? 'AFUNDOU!' : 'TCHIBUM!', '#ffffff');
      } else if (f.k === 'blast') { K.sfx('out'); K.float(f.x, f.y, 1.4, 'FORA!', '#f0443a'); }
      else if (f.k === 'power') { K.sfx('power'); K.float(f.x, f.y, 2.4, PNAME[f.pw] || '', PCOL[f.pw] === '#3a3a42' ? '#ffffff' : PCOL[f.pw]); }
      else if (f.k === 'pwend') K.sfx('pop');
      else if (f.k === 'aim') K.sfx('pick');
      else if (f.k === 'zap') { K.sfx('zap'); K.shake(10); V.zapAt = K.time; V.zapFrom = s; }
      else if (f.k === 'pass') { K.sfx('pick'); K.float(f.x, f.y, 2.2, 'PESO!', '#ffffff'); }
      else if (f.k === 'dash') { K.sfx('throw'); K.burst(f.x, f.y, 0.1, '#ffffff', 6, 1.5, 0.35, 0.12, 2); }
      else if (f.k === 'fish') K.sfx('pop');
      else if (f.k === 'walrus') { K.sfx('boom'); K.shake(18); K.ring(f.x, f.y, '#ffffff', 3.2, 0.5); K.burst(f.x, f.y, 0.2, '#ffffff', 18, 4, 0.7, 0.2, 6); K.float(f.x, f.y, 2.6, 'MORSA!', '#ffce1f'); }
      else if (f.k === 'walrusoff') { K.sfx('splash'); K.burst(f.x, f.y, 0.2, '#ffffff', 10, 2, 0.6, 0.18, 6); }
      else if (f.k === 'pick') K.sfx('pick');
      else if (f.k === 'throw') K.sfx('throw');
      else if (f.k === 'boom') {
        K.sfx('boom'); K.shake(14); K.ring(f.x, f.y, '#ffce1f', 2.6, 0.4); K.ring(f.x, f.y, '#f97316', 1.8, 0.3);
        K.burst(f.x, f.y, 0.3, '#f97316', 14, 4, 0.6, 0.24, 6); K.burst(f.x, f.y, 0.3, '#26262e', 10, 3, 0.8, 0.22, 5); K.float(f.x, f.y, 1.6, 'BUM!', '#f97316');
        V.scorch.push({ x: f.x, y: f.y }); if (V.scorch.length > 12) V.scorch.shift();
      } else if (f.k === 'plop') { K.sfx('splash'); K.ring(f.x, f.y, '#ffffff', f.big ? 1.6 : 0.9, 0.5); K.burst(f.x, f.y, 0, '#ffffff', 6, 1.5, 0.5, 0.14, 5); }
      else if (f.k === 'snow') { K.sfx('hit'); K.burst(f.x, f.y, 0.5, '#ffffff', 12, 2.5, 0.5, 0.18, 4); if (s >= 0) K.shake(6); }
      else if (f.k === 'bearoff') {
        K.sfx('hit'); K.float(f.x, f.y, 2, 'SEM URSO!', '#ffffff');
        var d = f.d || 0; V.bears.push({ x: f.x, y: f.y, z: 0.3, vx: Math.cos(d) * 4, vy: Math.sin(d) * 4, vz: 7, t: 0 });
      } else if (f.k === 'sd') { K.sfx('goal'); V.sdAt = K.time; K.shake(8); }
      else if (f.k === 'end') { V.scorch.length = 0; }
    },
    hud: function (slot, S) {
      var p = S.ps && S.ps[slot]; if (!p) return {};
      if (p.out) return { text: 'FORA', out: true };
      if (p.hg) return { text: 'BORDA!' };
      if (p.pw) return { text: HUDN[p.pw] + (p.pw === 'neve' ? '' : ' ' + p.pt) };
      if (!p.bear) return { text: 'A PÉ' };
      if (p.bomb) return { text: 'BOMBA' };
      return { bar: p.m };
    },
  };

  function go() { window.BashTV.register('polarpush', JOGO); }
  if (window.BashTV) go(); else { var s = document.createElement('script'); s.src = '/shared/bash/tv.js'; s.onload = go; document.head.appendChild(s); }
})();
