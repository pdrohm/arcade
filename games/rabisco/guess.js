// Rabisco — o juiz dos palpites. Só roda no servidor: o celular nunca sabe a palavra antes de acertar.
//   judge(texto, alvo) → 'hit' (acertou) | 'close' (tá muito perto) | 'miss'
// Compara sem acento, sem maiúscula, sem pontuação e sem artigo no começo ("o rei leão" = "Rei Leão").
// O palpite pode vir no meio de uma frase ("acho que é cachorro"): vale do mesmo jeito,
// e a frase inteira some do chat (senão a resposta vazava para os outros).
'use strict';

const ARTIGOS = new Set(['o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas']);

function norm(s) {
  return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
function tokens(s) {
  const t = norm(s).split(' ').filter(Boolean);
  while (t.length > 1 && ARTIGOS.has(t[0])) t.shift();
  return t;
}
const squash = t => t.join('');

// Distância de edição (Levenshtein) com teto: para cedo quando já passou do limite.
function lev(a, b, max) {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      cur.push(v);
      if (v < best) best = v;
    }
    if (best > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}
// Quantos erros de digitação ainda contam como "perto": palavra curta perdoa menos.
const tolerance = n => (n <= 3 ? 0 : n <= 5 ? 1 : n <= 9 ? 2 : 3);

// Pedaços seguidos do palpite com n palavras (para achar a resposta no meio de uma frase).
function windows(t, n) {
  const out = [];
  for (let i = 0; i + n <= t.length; i++) out.push(t.slice(i, i + n));
  return out;
}

// alvo: { w: 'cachorro', near: ['cão', 'cãozinho'] }
function judge(text, target) {
  const g = tokens(text);
  const w = tokens(target.w);
  if (!g.length || !w.length) return 'miss';
  const ws = squash(w);
  // acerto: a frase inteira, ou um trecho dela, é a palavra (juntando hífen e espaço: "guarda chuva" = "guardachuva")
  if (squash(g) === ws) return 'hit';
  for (let n = 1; n <= Math.min(g.length, w.length + 2); n++) {
    for (const win of windows(g, n)) if (squash(win) === ws) return 'hit';
  }
  // perto: erro de digitação, começo da palavra, ou um parecido da lista (sinônimo, apelido, diminutivo)
  const tol = tolerance(ws.length);
  const near = (target.near || []).map(x => squash(tokens(x))).filter(Boolean);
  for (let n = Math.max(1, w.length - 1); n <= Math.min(g.length, w.length + 1); n++) {
    for (const win of windows(g, n)) {
      const s = squash(win);
      if (tol && lev(s, ws, tol) <= tol) return 'close';
      if (s.length >= Math.max(3, Math.ceil(ws.length * 0.6)) && ws.indexOf(s) === 0) return 'close';
    }
  }
  // resposta de várias palavras: acertar uma delas inteira ("queijo" em "pão de queijo") já é perto
  if (w.length > 1 && g.some(x => x.length >= 4 && w.indexOf(x) >= 0)) return 'close';
  for (let n = 1; n <= g.length; n++) {
    for (const win of windows(g, n)) {
      const s = squash(win);
      if (near.indexOf(s) >= 0) return 'close';
      if (s.length >= 5 && near.some(x => x.length >= 5 && lev(s, x, 1) <= 1)) return 'close';
    }
  }
  return 'miss';
}

// Um trecho da palavra aparece na mensagem? (usado para não deixar quem desenha soprar a resposta)
function mentions(text, word) {
  const g = squash(tokens(text)), ws = squash(tokens(word));
  return ws.length >= 3 && g.indexOf(ws) >= 0;
}

module.exports = { norm, tokens, lev, judge, mentions };
