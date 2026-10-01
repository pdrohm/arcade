// Bonecos da casa: cada pessoa monta o seu (olhos, boca e um enfeite) e a cor é a cor dela.
// Vale em todos os jogos: lobby da TV, listas de jogadores, placares, e dentro dos jogos de canvas.
//   ARCADE.avatar.svg(av, hex, px)              → <svg> pronto (HTML)
//   ARCADE.avatar.draw(ctx, av, hex, x, y, size) → desenha num canvas (centro x,y; size = largura)
//   ARCADE.avatar.clean(av, seed)                → [olhos, boca, enfeite] válido (inválido vira um sorteado pelo seed)
//   ARCADE.avatar.random()                       → um boneco sorteado
// Formato do boneco: [olhos, boca, enfeite] (números). Desenho em 100×100, traço de rabisco.
// Roda também no servidor (require) só para validar. A TV é um Chrome 47 (docs/TV-ANTIGA.md).
'use strict';
(function (root) {
  const INK = '#15151c', WHITE = '#ffffff', RED = '#e11d48', PINK = '#f9a8d4', GOLD = '#facc15';
  // Cada peça: lista de [caminho SVG, preenchimento, espessura do traço]. Preenchimento 'C' = cor da pessoa.
  const BODY = [
    ['M13 101 C14 80 30 71 50 71 C70 71 86 80 87 101 Z', 'C', 4],
    ['M50 12 C69 11 82 26 81 44 C81 63 67 76 50 75 C31 76 18 62 19 44 C18 26 32 12 50 12 Z', 'C', 4],
  ];
  const EYES = [
    [['M34 38 a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0 Z', INK, 0], ['M58 38 a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0 Z', INK, 0]],
    [['M29 39 a9 9 0 1 0 18 0 a9 9 0 1 0 -18 0 Z', WHITE, 3], ['M53 39 a9 9 0 1 0 18 0 a9 9 0 1 0 -18 0 Z', WHITE, 3], ['M36 40 a3.5 3.5 0 1 0 7 0 a3.5 3.5 0 1 0 -7 0 Z', INK, 0], ['M60 40 a3.5 3.5 0 1 0 7 0 a3.5 3.5 0 1 0 -7 0 Z', INK, 0]],
    [['M30 42 Q38 32 46 42', null, 4], ['M54 42 Q62 32 70 42', null, 4]],
    [['M33 41 a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0 Z', INK, 0], ['M59 41 a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0 Z', INK, 0], ['M28 30 L45 36', null, 4], ['M72 30 L55 36', null, 4]],
    [['M29 40 Q38 48 47 40 Z', WHITE, 3], ['M53 40 Q62 48 71 40 Z', WHITE, 3], ['M28 40 L48 40', null, 4], ['M52 40 L72 40', null, 4], ['M36 41.5 a2.5 2.5 0 1 0 5 0 a2.5 2.5 0 1 0 -5 0 Z', INK, 0], ['M59 41.5 a2.5 2.5 0 1 0 5 0 a2.5 2.5 0 1 0 -5 0 Z', INK, 0]],
    [['M27 38 a11 11 0 1 0 22 0 a11 11 0 1 0 -22 0 Z', WHITE, 3], ['M56 40 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0 Z', WHITE, 3], ['M33 34 a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0 Z', INK, 0], ['M61 41 a2.5 2.5 0 1 0 5 0 a2.5 2.5 0 1 0 -5 0 Z', INK, 0]],
    [['M32 33 L44 45 M44 33 L32 45', null, 4], ['M56 33 L68 45 M68 33 L56 45', null, 4]],
    [['M38 46 C30 39 30 33 34 32 C36 31 38 33 38 35 C38 33 40 31 42 32 C46 33 46 39 38 46 Z', RED, 2.5], ['M62 46 C54 39 54 33 58 32 C60 31 62 33 62 35 C62 33 64 31 66 32 C70 33 70 39 62 46 Z', RED, 2.5]],
    [['M32 39 a6 8 0 1 0 12 0 a6 8 0 1 0 -12 0 Z', INK, 0], ['M56 39 a6 8 0 1 0 12 0 a6 8 0 1 0 -12 0 Z', INK, 0], ['M35 35 a2.2 2.2 0 1 0 4.4 0 a2.2 2.2 0 1 0 -4.4 0 Z', WHITE, 0], ['M59 35 a2.2 2.2 0 1 0 4.4 0 a2.2 2.2 0 1 0 -4.4 0 Z', WHITE, 0]],
    [['M30 40 L46 40', null, 4], ['M54 40 L70 40', null, 4], ['M40 41 a2.6 2.6 0 1 0 5.2 0 a2.6 2.6 0 1 0 -5.2 0 Z', INK, 0], ['M64 41 a2.6 2.6 0 1 0 5.2 0 a2.6 2.6 0 1 0 -5.2 0 Z', INK, 0]],
  ];
  const MOUTHS = [
    [['M38 56 Q50 67 62 56', null, 4]],
    [['M35 54 Q50 54 65 54 Q63 70 50 70 Q37 70 35 54 Z', WHITE, 3.5], ['M36 60 L64 60', null, 2.5]],
    [['M45 61 Q46 72 51 72 Q56 72 56 61 Z', RED, 3], ['M37 58 Q50 64 63 58', null, 4]],
    [['M44 61 a6 7 0 1 0 12 0 a6 7 0 1 0 -12 0 Z', INK, 0]],
    [['M39 60 L61 60', null, 4]],
    [['M38 64 Q50 54 62 64', null, 4]],
    [['M37 56 Q50 61 63 56', null, 4], ['M44 57.5 L44 65 L50 65 L50 58.5', WHITE, 2.5], ['M50 58.5 L50 65 L56 65 L56 57.5', WHITE, 2.5]],
    [['M36 61 L41 57 L46 62 L51 57 L56 62 L61 57 L64 60', null, 3.5]],
    [['M39 57 Q44.5 63 50 57 Q55.5 63 61 57', null, 3.5]],
    [['M41 61 Q54 63 62 54', null, 4]],
  ];
  const EXTRAS = [
    [],
    [['M28 31 L72 26', null, 3], ['M27 39 a11 9 0 1 0 22 0 a11 9 0 1 0 -22 0 Z', INK, 0]],
    [['M28 39 a10 10 0 1 0 20 0 a10 10 0 1 0 -20 0 Z', null, 3.5], ['M52 39 a10 10 0 1 0 20 0 a10 10 0 1 0 -20 0 Z', null, 3.5], ['M48 38 L52 38', null, 3]],
    [['M25 33 L47 33 L45 45 Q36 50 27 45 Z', INK, 2], ['M53 33 L75 33 L73 45 Q64 50 55 45 Z', INK, 2], ['M47 35 L53 35', null, 3], ['M30 36 L36 36', WHITE, 2]],
    [['M32 2 L68 2 L66 18 L34 18 Z', INK, 3], ['M22 18 L78 18', null, 5], ['M34 14 L66 14', RED, 4]],
    [['M24 22 Q26 3 50 3 Q74 3 76 22 Z', '#2563eb', 3.5], ['M70 21 L94 25', null, 5], ['M49 3 a3 3 0 1 0 2 0 Z', WHITE, 2]],
    [['M28 18 L31 2 L41 11 L50 0 L59 11 L69 2 L72 18 Z', GOLD, 3], ['M48 10 a2.5 2.5 0 1 0 4 0 a2.5 2.5 0 1 0 -4 0 Z', RED, 0]],
    [['M66 12 L54 5 L56 19 Z', PINK, 3], ['M66 12 L78 5 L76 19 Z', PINK, 3], ['M63 12 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0 Z', RED, 2]],
    [['M50 53 C44 49 36 50 33 56 C38 54 42 56 50 55 C58 56 62 54 67 56 C64 50 56 49 50 53 Z', INK, 2]],
    [['M24 52 a6 4 0 1 0 12 0 a6 4 0 1 0 -12 0 Z', PINK, 0], ['M64 52 a6 4 0 1 0 12 0 a6 4 0 1 0 -12 0 Z', PINK, 0]],
    [['M20 44 Q18 8 50 8 Q82 8 80 44', null, 5], ['M13 38 L23 38 L23 54 L13 54 Z', INK, 2], ['M77 38 L87 38 L87 54 L77 54 Z', INK, 2]],
    [['M38 16 L50 -6 L62 16 Z', '#a855f7', 3], ['M42 9 L58 9 M45 3 L55 3', GOLD, 3], ['M47 -6 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0 Z', GOLD, 2]],
  ];
  const N = [EYES.length, MOUTHS.length, EXTRAS.length];
  const NAMES = ['Olhos', 'Boca', 'Enfeite'];

  function hashOf(s) { let h = 2166136261; s = String(s || ''); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul ? Math.imul(h, 16777619) : (h * 16777619) | 0; } return h >>> 0; }
  function clean(av, seed) {
    if (Array.isArray(av) && av.length === 3 && av.every((v, i) => typeof v === 'number' && v % 1 === 0 && v >= 0 && v < N[i])) return av.slice();
    const h = hashOf(seed);
    return [h % N[0], (h >>> 8) % N[1], (h >>> 16) % N[2]];
  }
  const random = () => [Math.floor(Math.random() * N[0]), Math.floor(Math.random() * N[1]), Math.floor(Math.random() * N[2])];

  // Contorno do corpo: um pouco mais escuro que a cor da pessoa, para não sumir no fundo.
  function darker(hex) {
    const h = String(hex || '#888888').replace('#', '');
    const n = parseInt(h.length === 3 ? h.replace(/(.)/g, '$1$1') : h, 16) || 0;
    const f = v => Math.round(v * 0.78);
    return 'rgb(' + f(n >> 16 & 255) + ',' + f(n >> 8 & 255) + ',' + f(n & 255) + ')';
  }
  function parts(av) { const a = clean(av, ''); return BODY.concat(EYES[a[0]], MOUTHS[a[1]], EXTRAS[a[2]]); }

  function svg(av, hex, px) {
    const col = hex || '#94a3b8';
    let out = '';
    const list = parts(av);
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      const fill = p[1] === 'C' ? (i === 0 ? darker(col) : col) : (p[1] || 'none');
      out += '<path d="' + p[0] + '" fill="' + fill + '"' + (p[2] ? ' stroke="' + INK + '" stroke-width="' + p[2] + '"' : '') + '/>';
    }
    const sz = px ? ' width="' + px + '" height="' + px + '"' : '';
    return '<svg class="avatar-svg" viewBox="0 -8 100 110"' + sz + ' stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + out + '</svg>';
  }

  // Canvas: Path2D lê o mesmo caminho do SVG (Chrome 36+). Sem Path2D, um círculo na cor da pessoa.
  const cache = {};
  function path(d) { return cache[d] || (cache[d] = new root.Path2D(d)); }
  function draw(g, av, hex, x, y, size) {
    const col = hex || '#94a3b8';
    const k = size / 100;
    g.save();
    g.translate(x - size / 2, y - size / 2 + 4 * k);
    g.scale(k, k);
    g.lineCap = 'round'; g.lineJoin = 'round';
    if (!root.Path2D) { g.fillStyle = col; g.beginPath(); g.arc(50, 44, 31, 0, Math.PI * 2); g.fill(); g.restore(); return; }
    const list = parts(av);
    for (let i = 0; i < list.length; i++) {
      const p = list[i], pa = path(p[0]);
      const fill = p[1] === 'C' ? (i === 0 ? darker(col) : col) : p[1];
      if (fill) { g.fillStyle = fill; g.fill(pa); }
      if (p[2]) { g.strokeStyle = INK; g.lineWidth = p[2]; g.stroke(pa); }
    }
    g.restore();
  }

  const api = { N, NAMES, clean, random, svg, draw };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.ARCADE = root.ARCADE || {}; root.ARCADE.avatar = api; }
})(typeof window !== 'undefined' ? window : this);
