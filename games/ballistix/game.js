// BALLISTIX: pong de quatro lados (jogo de arena, motor em shared/bash/engine.js).
module.exports = require('../../shared/bash/engine')({
  id: 'ballistix', name: 'Ballistix', emoji: '🏐', glyph: '◎',
  tagline: 'Pong de 4 lados: defenda o seu gol e mande as bolas nos outros.',
  art: 'linear-gradient(135deg,#ff8a1f 0,#ff8a1f 50%,#2b3a67 50%,#2b3a67 100%)',
  howTo: [
    'Cada um guarda um lado da quadra: o seu gol.',
    'Ande na linha do gol com o analógico e rebata as bolas.',
    'Bola no seu gol tira 1 ponto. Com 0, o seu gol fecha.',
    'A chuta forte, B é turbo. O último com pontos vence.',
  ],
}, require('./sim'));
