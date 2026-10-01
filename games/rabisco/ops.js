// Quadro de desenho: o celular manda traços em coordenadas 0..DRAW_SIZE; quem assiste redesenha no tamanho dele.
// Só roda no servidor.
'use strict';
const DRAW_SIZE = 640, MAX_OPS = 3000, MAX_BATCH = 40, MAX_PTS = 160;
const isHex = c => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c);
const isInt = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
const isPt = a => Array.isArray(a) && a.length === 2 && isInt(a[0], 0, DRAW_SIZE) && isInt(a[1], 0, DRAW_SIZE);
// Devolve o traço limpo (só os campos esperados, nos limites) ou null.
function cleanOp(op) {
  if (!op || typeof op !== 'object') return null;
  if (op.t === 'u' || op.t === 'y' || op.t === 'c') return { t: op.t };
  if (!isInt(op.id, 0, 1e9) || !isHex(op.c) || !isInt(op.w, 1, 96)) return null;
  if (op.t === 's') {
    if (!Array.isArray(op.p) || op.p.length < 2 || op.p.length > MAX_PTS || op.p.length % 2 || !op.p.every(v => isInt(v, 0, DRAW_SIZE))) return null;
    return { t: 's', id: op.id, c: op.c.toLowerCase(), w: op.w, p: op.p };
  }
  if (op.t === 'f') {
    if (!['l', 'r', 'o'].includes(op.k) || !isPt(op.a) || !isPt(op.b)) return null;
    return { t: 'f', id: op.id, k: op.k, c: op.c.toLowerCase(), w: op.w, a: op.a, b: op.b };
  }
  return null;
}

module.exports = { DRAW_SIZE, MAX_OPS, MAX_BATCH, MAX_PTS, cleanOp };
