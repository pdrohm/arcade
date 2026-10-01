// Bonecos: validação (o servidor não confia no celular) e desenho em SVG.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('../shared/avatar.js');

test('boneco válido passa igual; inválido vira um sorteado fixo pelo seed', () => {
  assert.deepEqual(A.clean([1, 2, 3], 'x'), [1, 2, 3]);
  for (const bad of [null, 'oi', [1, 2], [99, 0, 0], [-1, 0, 0], [1.5, 0, 0], ['1', 0, 0], [0, 0, 0, 0]]) {
    const v = A.clean(bad, 'p123');
    assert.equal(v.length, 3);
    v.forEach((n, i) => assert.ok(Number.isInteger(n) && n >= 0 && n < A.N[i]));
    assert.deepEqual(v, A.clean(bad, 'p123'), 'o mesmo seed dá o mesmo boneco');
  }
});

test('sorteio e SVG para toda combinação de cada peça', () => {
  for (let k = 0; k < 50; k++) { const r = A.random(); r.forEach((n, i) => assert.ok(n >= 0 && n < A.N[i])); }
  for (let i = 0; i < 3; i++) for (let v = 0; v < A.N[i]; v++) {
    const av = [0, 0, 0]; av[i] = v;
    const s = A.svg(av, '#a855f7', 40);
    assert.match(s, /^<svg [^>]*width="40"/);
    assert.ok(s.includes('#a855f7'), 'o rosto usa a cor da pessoa');
    assert.ok(!/undefined|NaN/.test(s));
  }
});
