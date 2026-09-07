'use strict';
// Sprites do KART, desenhados na hora em canvas pequenos (nada de imagem no servidor).
// Um mini rasterizador ortográfico de "caixas e bolas" gera cada kart, piloto e projétil em 16
// ângulos, com a mesma luz e o mesmo contorno de tinta: é o que dá o ar de console dos anos 90.
// Roda na TV — inclusive a antiga (Chrome 47) — por isso fica em ES5 e sem ctx.ellipse.
(function () {
  var INK = '#1b1035', PITCH = .42, DIRS = 16;
  function make(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function hex(c) { var n = parseInt(c.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function rgb(r, g, b) { return 'rgb(' + Math.round(Math.max(0, Math.min(255, r))) + ',' + Math.round(Math.max(0, Math.min(255, g))) + ',' + Math.round(Math.max(0, Math.min(255, b))) + ')'; }
  // k > 0 clareia, k < 0 escurece (0..1). Sombra puxa para o roxo da tinta, luz para o creme.
  function shade(color, k) { var c = hex(color), t = k < 0 ? hex(INK) : hex('#fff6d6'), a = Math.abs(k); return rgb(c[0] + (t[0] - c[0]) * a, c[1] + (t[1] - c[1]) * a, c[2] + (t[2] - c[2]) * a); }
  function mix(a, b, t) { var x = hex(a), y = hex(b); return rgb(x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t); }
  function ellipse(ctx, x, y, rx, ry) { ctx.save(); ctx.translate(x, y); ctx.scale(rx, Math.max(.01, ry)); ctx.beginPath(); ctx.arc(0, 0, 1, 0, Math.PI * 2); ctx.restore(); }
  // ---- rasterizador ---------------------------------------------------------------------------
  // parts: {t:'ball',x,y,z,r,ry?,rz?,c} ou {t:'box',x,y,z,w,h,d,c,ry?(giro em Y)}. x direita, y cima, z frente.
  // yaw: para onde o modelo aponta em relação à câmera (0 = de costas para nós). Escala s px por unidade.
  function render(parts, yaw, s, w, h, floorY) {
    var c = make(w, h), ctx = c.getContext('2d'), cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(PITCH), sp = Math.sin(PITCH), i, j;
    var ox = w / 2, oy = h - 4 - (floorY || 0) * s, items = [];
    function view(x, y, z) { var X = x * cy - z * sy, Z = -(x * sy + z * cy); return { x: ox + X * s, y: oy - (y * cp) * s + Z * sp * s, d: Z }; }
    for (i = 0; i < parts.length; i++) { var p = parts[i], v = view(p.x, p.y, p.z); items.push({ p: p, v: v, d: v.d }); }
    items.sort(function (a, b) { return a.d - b.d; });
    for (i = 0; i < items.length; i++) {
      var p = items[i].p, v = items[i].v;
      if (p.t === 'ball') {
        var rx = p.r, rz = p.rz || p.r, ry = p.ry || p.r;
        var ex = Math.sqrt(rx * rx * cy * cy + rz * rz * sy * sy), ez = Math.sqrt(rx * rx * sy * sy + rz * rz * cy * cy);
        var ey = Math.sqrt(ry * ry * cp * cp + ez * ez * sp * sp);
        ctx.fillStyle = p.c; ellipse(ctx, v.x, v.y, ex * s, ey * s); ctx.fill();
        if (!p.flat) {
          ctx.save(); ellipse(ctx, v.x, v.y, ex * s, ey * s); ctx.clip();
          ctx.fillStyle = shade(p.c, -.45); ellipse(ctx, v.x + ex * s * .12, v.y + ey * s * .55, ex * s, ey * s * .8); ctx.fill();
          ctx.fillStyle = shade(p.c, .45); ellipse(ctx, v.x - ex * s * .35, v.y - ey * s * .45, ex * s * .35, ey * s * .22); ctx.fill();
          ctx.restore();
        }
      } else {
        var hw = p.w / 2, hh = p.h / 2, hd = p.d / 2, ang = p.ry || 0, ca = Math.cos(ang), sa = Math.sin(ang), pts = [];
        for (j = 0; j < 8; j++) {
          var lx = (j & 1 ? hw : -hw), ly = (j & 2 ? hh : -hh), lz = (j & 4 ? hd : -hd), wx = lx * ca + lz * sa, wz = -lx * sa + lz * ca;
          pts.push(view(p.x + wx, p.y + ly, p.z + wz));
        }
        // faces: [índices], normal local. Desenha as que olham para a câmera, sombreadas pela normal.
        var faces = [[2, 3, 7, 6, 0, 1, 0], [0, 4, 6, 2, -1, 0, 0], [1, 3, 7, 5, 1, 0, 0], [0, 1, 3, 2, 0, 0, -1], [4, 5, 7, 6, 0, 0, 1], [0, 1, 5, 4, 0, -1, 0]];
        for (j = 0; j < faces.length; j++) {
          var f = faces[j], nx0 = f[4], ny = f[5], nz0 = f[6], nx = nx0 * ca + nz0 * sa, nz = -nx0 * sa + nz0 * ca;
          var nX = nx * cy - nz * sy, nZ = -(nx * sy + nz * cy);   // normal na câmera: Z>0 aponta para nós
          var facing = ny * sp + nZ * cp;                          // visível quando aponta para a câmera (câmera acima, à frente)
          if (facing <= 0.02) continue;
          var light = .18 * ny + .28 * nX - .12 * (nZ > 0 ? 0 : 1);
          ctx.fillStyle = shade(p.c, Math.max(-.5, Math.min(.5, light)));
          ctx.beginPath(); ctx.moveTo(pts[f[0]].x, pts[f[0]].y); ctx.lineTo(pts[f[1]].x, pts[f[1]].y); ctx.lineTo(pts[f[2]].x, pts[f[2]].y); ctx.lineTo(pts[f[3]].x, pts[f[3]].y); ctx.closePath(); ctx.fill();
        }
      }
    }
    return outline(c);
  }
  // Contorno de tinta de 1 px em volta da silhueta inteira (o truque que faz parecer pixel art).
  function outline(src) {
    var w = src.width, h = src.height, c = make(w, h), ctx = c.getContext('2d'), k;
    var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (k = 0; k < dirs.length; k++) ctx.drawImage(src, dirs[k][0], dirs[k][1]);
    ctx.globalCompositeOperation = 'source-in'; ctx.fillStyle = INK; ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over'; ctx.drawImage(src, 0, 0);
    return c;
  }
  // ---- karts e pilotos ----------------------------------------------------------------------------
  var SKIN = ['#cfe2ee', '#8de071', '#f7f1e6', '#f4b183', '#b9c4e6', '#7de3b1'];
  function driverParts(i, color) {
    var skin = SKIN[i] || SKIN[3], y0 = 1.25, p = [
      { t: 'ball', x: 0, y: y0 + .35, z: -.3, r: .45, ry: .5, c: color },
      { t: 'box', x: 0, y: y0 + .75, z: .55, w: .9, h: .12, d: .12, c: INK },
    ];
    if (i === 0) { p.push({ t: 'box', x: 0, y: y0 + 1.25, z: -.3, w: 1.05, h: 1.05, d: .95, c: skin }, { t: 'box', x: 0, y: y0 + 1.3, z: .2, w: .8, h: .3, d: .06, c: INK }, { t: 'box', x: -.2, y: y0 + 1.3, z: .25, w: .18, h: .16, d: .04, c: '#58c8f5' }, { t: 'box', x: .2, y: y0 + 1.3, z: .25, w: .18, h: .16, d: .04, c: '#58c8f5' }, { t: 'box', x: 0, y: y0 + 2, z: -.3, w: .08, h: .45, d: .08, c: INK }, { t: 'ball', x: 0, y: y0 + 2.3, z: -.3, r: .16, c: '#ff5e5b' }); }
    else if (i === 1) { p.push({ t: 'ball', x: 0, y: y0 + 1.25, z: -.3, r: .6, ry: .7, c: skin }, { t: 'ball', x: -.24, y: y0 + 1.3, z: .2, r: .17, ry: .26, c: INK }, { t: 'ball', x: .24, y: y0 + 1.3, z: .2, r: .17, ry: .26, c: INK }, { t: 'box', x: -.3, y: y0 + 2.05, z: -.3, w: .06, h: .4, d: .06, c: INK }, { t: 'box', x: .3, y: y0 + 2.05, z: -.3, w: .06, h: .4, d: .06, c: INK }, { t: 'ball', x: -.38, y: y0 + 2.3, z: -.3, r: .13, c: '#ffd23f' }, { t: 'ball', x: .38, y: y0 + 2.3, z: -.3, r: .13, c: '#ffd23f' }); }
    else if (i === 2) { p.push({ t: 'ball', x: 0, y: y0 + 1.25, z: -.3, r: .62, c: skin }, { t: 'ball', x: -.24, y: y0 + 1.3, z: .2, r: .2, c: INK }, { t: 'ball', x: .24, y: y0 + 1.3, z: .2, r: .2, c: INK }, { t: 'box', x: 0, y: y0 + .95, z: .25, w: .45, h: .14, d: .1, c: INK }); }
    else if (i === 3) { p.push({ t: 'ball', x: 0, y: y0 + 1.25, z: -.3, r: .62, c: skin }, { t: 'ball', x: -.24, y: y0 + 1.32, z: .2, r: .15, c: '#fff' }, { t: 'ball', x: .24, y: y0 + 1.32, z: .2, r: .15, c: '#fff' }, { t: 'ball', x: 0, y: y0 + 1.1, z: .3, r: .09, c: '#ff5e5b' }, { t: 'box', x: -.4, y: y0 + 1.9, z: -.3, w: .3, h: .45, d: .2, c: skin }, { t: 'box', x: .4, y: y0 + 1.9, z: -.3, w: .3, h: .45, d: .2, c: skin }); }
    else if (i === 4) { p.push({ t: 'ball', x: 0, y: y0 + 1.25, z: -.3, r: .62, c: '#b9c4e6' }, { t: 'box', x: 0, y: y0 + 1.3, z: .25, w: .9, h: .24, d: .1, c: INK }, { t: 'box', x: 0, y: y0 + 2.15, z: -.4, w: .3, h: .7, d: .3, c: color }); }
    else { p.push({ t: 'ball', x: 0, y: y0 + 1.25, z: -.3, r: .66, ry: .6, c: skin }, { t: 'ball', x: -.24, y: y0 + 1.3, z: .2, r: .15, c: '#fff' }, { t: 'ball', x: .24, y: y0 + 1.3, z: .2, r: .15, c: '#fff' }, { t: 'ball', x: -.22, y: y0 + 1.28, z: .3, r: .07, c: INK }, { t: 'ball', x: .26, y: y0 + 1.28, z: .3, r: .07, c: INK }); }
    return p;
  }
  function kartParts(type, color) {
    var p = [], cream = '#fff1c9', wheels = [[-1.25, -1.05], [1.25, -1.05], [-1.25, 1.15], [1.25, 1.15]], i;
    for (i = 0; i < wheels.length; i++) p.push({ t: 'ball', x: wheels[i][0], y: .62, z: wheels[i][1], r: .62, rz: .62, ry: .62, c: INK });
    if (type === 2) { p.push({ t: 'box', x: 0, y: .95, z: 0, w: 2.4, h: 1, d: 3.5, c: color }, { t: 'box', x: -.9, y: 1.05, z: 1.78, w: .5, h: .35, d: .3, c: cream }, { t: 'box', x: .9, y: 1.05, z: 1.78, w: .5, h: .35, d: .3, c: cream }); }
    else {
      var len = type === 1 ? 2.05 : 1.85;
      p.push({ t: 'ball', x: 0, y: .85, z: 0, r: 1.3, ry: .58, rz: len, c: color }, { t: 'ball', x: 0, y: 1.05, z: len + .1, r: .32, c: cream });
      if (type === 1) p.push({ t: 'box', x: 0, y: 1.75, z: -1.7, w: 3, h: .18, d: .7, c: color }, { t: 'box', x: -1, y: 1.35, z: -1.7, w: .16, h: .7, d: .4, c: INK }, { t: 'box', x: 1, y: 1.35, z: -1.7, w: .16, h: .7, d: .4, c: INK }, { t: 'ball', x: -.55, y: .75, z: -2.2, r: .26, c: '#b9c4e6' }, { t: 'ball', x: .55, y: .75, z: -2.2, r: .26, c: '#b9c4e6' });
      else p.push({ t: 'box', x: 0, y: 1.55, z: -1.55, w: .18, h: .55, d: .9, c: color });
    }
    p.push({ t: 'box', x: 0, y: 1.2, z: -.35, w: 1.5, h: .4, d: 1.4, c: INK }, { t: 'box', x: 0, y: 1.55, z: -1.05, w: 1.3, h: .9, d: .3, c: INK });
    return p;
  }
  var S_KART = 18, KW = 100, KH = 96;   // px por unidade; canvas por quadro
  function kart(driver, type, color) {
    var parts = kartParts(type, color).concat(driverParts(driver, color)), frames = [], i;
    for (i = 0; i < DIRS; i++) frames.push(render(parts, i / DIRS * Math.PI * 2, S_KART, KW, KH, 0));
    return { frames: frames, s: S_KART, w: KW, h: KH };
  }
  // ---- objetos ------------------------------------------------------------------------------------
  function rotating(parts, s, w, h, n) { var frames = [], i; for (i = 0; i < n; i++) frames.push(render(parts, i / n * Math.PI * 2, s, w, h, 0)); return { frames: frames, s: s, w: w, h: h }; }
  function itembox() { return rotating([{ t: 'box', x: 0, y: .85, z: 0, w: 1.6, h: 1.6, d: 1.6, c: '#ffd23f' }, { t: 'box', x: 0, y: .85, z: 0, w: .5, h: 1.05, d: 1.75, c: INK }, { t: 'box', x: 0, y: .85, z: 0, w: 1.75, h: 1.05, d: .5, c: INK }], 22, 56, 56, 8); }
  function rocket() { return rotating([{ t: 'ball', x: 0, y: .5, z: 0, r: .34, rz: .95, c: '#fff1c9' }, { t: 'ball', x: 0, y: .5, z: .95, r: .26, rz: .45, c: '#ff5e5b' }, { t: 'box', x: -.45, y: .5, z: -.5, w: .5, h: .08, d: .5, c: '#ff5e5b' }, { t: 'box', x: .45, y: .5, z: -.5, w: .5, h: .08, d: .5, c: '#ff5e5b' }, { t: 'ball', x: 0, y: .78, z: .2, r: .14, c: '#58c8f5' }], 22, 56, 48, DIRS); }
  function bomb() { return rotating([{ t: 'ball', x: 0, y: .7, z: 0, r: .7, c: '#2a2250' }, { t: 'box', x: .2, y: 1.5, z: 0, w: .1, h: .5, d: .1, c: '#fff1c9' }, { t: 'ball', x: .3, y: 1.8, z: 0, r: .16, c: '#ffd23f' }], 22, 48, 56, 1); }
  function mine() { var p = [{ t: 'ball', x: 0, y: .5, z: 0, r: .7, c: '#ff5e5b' }, { t: 'ball', x: 0, y: 1.15, z: 0, r: .2, c: '#ffd23f' }], i; for (i = 0; i < 6; i++) { var a = i / 6 * Math.PI * 2; p.push({ t: 'box', x: Math.cos(a) * .8, y: .5, z: Math.sin(a) * .8, w: .25, h: .25, d: .25, c: INK }); } return rotating(p, 22, 56, 48, 1); }
  function pole() { return rotating([{ t: 'box', x: 0, y: 6, z: 0, w: .7, h: 12, d: .7, c: '#ff5e5b' }, { t: 'box', x: 0, y: 2, z: 0, w: .75, h: 1, d: .75, c: '#fff1c9' }, { t: 'box', x: 0, y: 4.6, z: 0, w: .75, h: 1, d: .75, c: '#fff1c9' }, { t: 'box', x: 0, y: 7.2, z: 0, w: .75, h: 1, d: .75, c: '#fff1c9' }, { t: 'box', x: 0, y: 9.8, z: 0, w: .75, h: 1, d: .75, c: '#fff1c9' }, { t: 'ball', x: 0, y: 12.4, z: 0, r: .75, c: '#ffd23f' }], 9, 32, 128, 1); }
  // Árvores e arbustos: pixel art direta (sem rasterizador), 3 variações de cada.
  function tree(v) {
    var c = make(56, 80), ctx = c.getContext('2d'), leaf = ['#4fbf5a', '#77d66a', '#2f9d4b'][v % 3], dark = shade(leaf, -.35), light = shade(leaf, .3);
    ctx.fillStyle = '#9b5d3a'; ctx.fillRect(24, 50, 8, 28); ctx.fillStyle = shade('#9b5d3a', -.35); ctx.fillRect(29, 50, 3, 28);
    var blobs = v % 3 === 1 ? [[28, 42, 22, 16], [18, 30, 14, 12], [38, 28, 14, 12], [28, 20, 15, 13]] : [[28, 40, 24, 17], [28, 24, 18, 14], [16, 34, 12, 10], [40, 33, 12, 10]], i;
    for (i = 0; i < blobs.length; i++) { var b = blobs[i]; ctx.fillStyle = leaf; ellipse(ctx, b[0], b[1], b[2], b[3]); ctx.fill(); }
    for (i = 0; i < blobs.length; i++) { var d = blobs[i]; ctx.save(); ellipse(ctx, d[0], d[1], d[2], d[3]); ctx.clip(); ctx.fillStyle = dark; ellipse(ctx, d[0] + 3, d[1] + d[3] * .55, d[2], d[3] * .8); ctx.fill(); ctx.fillStyle = light; ellipse(ctx, d[0] - d[2] * .35, d[1] - d[3] * .4, d[2] * .4, d[3] * .3); ctx.fill(); ctx.restore(); }
    if (v % 3 === 2) { ctx.fillStyle = '#ff9ecb'; ellipse(ctx, 36, 20, 7, 6); ctx.fill(); ctx.fillStyle = '#ffd166'; ellipse(ctx, 16, 36, 5, 4); ctx.fill(); }
    return { frames: [outline(c)], s: 9.5, w: 56, h: 80 };
  }
  function bush(v) {
    var c = make(40, 28), ctx = c.getContext('2d'), leaf = ['#63bd4c', '#4aa848', '#7fd35b'][v % 3];
    ctx.fillStyle = leaf; ellipse(ctx, 20, 17, 18, 10); ctx.fill(); ellipse(ctx, 13, 12, 9, 8); ctx.fill(); ellipse(ctx, 27, 11, 9, 8); ctx.fill();
    ctx.save(); ellipse(ctx, 20, 17, 18, 10); ctx.clip(); ctx.fillStyle = shade(leaf, -.35); ellipse(ctx, 22, 24, 18, 8); ctx.fill(); ctx.restore();
    ctx.fillStyle = shade(leaf, .35); ellipse(ctx, 12, 9, 4, 3); ctx.fill();
    if (v % 3 === 0) { ctx.fillStyle = '#ff9ecb'; ctx.fillRect(26, 6, 3, 3); ctx.fillRect(10, 16, 3, 3); }
    return { frames: [outline(c)], s: 12, w: 40, h: 28 };
  }
  function star() { var c = make(16, 16), ctx = c.getContext('2d'), i; ctx.fillStyle = '#fff'; ctx.beginPath(); for (i = 0; i < 10; i++) { var a = i * Math.PI / 5 - Math.PI / 2, d = i % 2 ? 3 : 7.5; ctx.lineTo(8 + Math.cos(a) * d, 8 + Math.sin(a) * d); } ctx.closePath(); ctx.fill(); return c; }
  // Fundo em camadas: montanhas e nuvens num painel que dá a volta completa (1 largura = 360°).
  function panorama(theme, w, h) {
    var c = make(w, h), ctx = c.getContext('2d'), cols = theme.mountains, i, k, x;
    for (k = 0; k < 3; k++) {
      var base = h - k * (h * .22), amp = h * (.5 - k * .12), n = 7 + k * 4;
      ctx.fillStyle = cols[k]; ctx.beginPath(); ctx.moveTo(0, h);
      for (i = 0; i <= n; i++) { x = i / n * w; var peak = base - amp * (.55 + .45 * Math.sin(i * 2.3 + k * 1.7) * Math.cos(i * .7 + k)); ctx.lineTo(x - w / n * .5, base - amp * .15); ctx.lineTo(x, peak); }
      ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
      ctx.fillStyle = shade(cols[k], .35); for (i = 0; i <= n; i++) { x = i / n * w; var pk = base - amp * (.55 + .45 * Math.sin(i * 2.3 + k * 1.7) * Math.cos(i * .7 + k)); ctx.beginPath(); ctx.moveTo(x, pk); ctx.lineTo(x + 10, pk + 12); ctx.lineTo(x - 6, pk + 14); ctx.closePath(); ctx.fill(); }
    }
    return c;
  }
  function clouds(w, h) {
    var c = make(w, h), ctx = c.getContext('2d'), i, j;
    for (i = 0; i < 9; i++) { var x = (i + .3) / 9 * w + (i % 2) * 40, y = 20 + (i * 37) % (h - 40), s = 14 + (i * 7) % 12; ctx.fillStyle = '#ffffff';
      for (j = 0; j < 4; j++) { ellipse(ctx, x + (j - 1.5) * s * .9, y + (j % 2) * s * .25, s * (j === 1 || j === 2 ? 1.1 : .8), s * (j === 1 || j === 2 ? .8 : .6)); ctx.fill(); }
      ctx.fillStyle = '#dff1ff'; ctx.fillRect(x - s * 2, y + s * .5, s * 4, s * .45); }
    return c;
  }
  function checker() { var c = make(16, 16), ctx = c.getContext('2d'); ctx.fillStyle = '#fff1c9'; ctx.fillRect(0, 0, 16, 16); ctx.fillStyle = INK; ctx.fillRect(0, 0, 8, 8); ctx.fillRect(8, 8, 8, 8); return c; }
  window.KartSprites = { INK: INK, DIRS: DIRS, make: make, shade: shade, mix: mix, ellipse: ellipse, render: render, kart: kart, itembox: itembox, rocket: rocket, bomb: bomb, mine: mine, pole: pole, tree: tree, bush: bush, star: star, panorama: panorama, clouds: clouds, checker: checker };
})();
