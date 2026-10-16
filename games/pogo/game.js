// Pogo Pandemonium: pula-pula num tabuleiro, pinte casas e guarde os pontos na caixa.
module.exports = require('../../shared/bash/engine')({
  id: 'pogo',
  name: 'Pogo Pandemonium',
  emoji: '🦘',
  glyph: 'PG',
  tagline: 'Pinte o tabuleiro no pula-pula e guarde os pontos',
  art: 'linear-gradient(135deg,#ffce1f 0 25%,#35d07f 25% 50%,#3db4f2 50% 75%,#f472b6 75%)',
  howTo: [
    'Cada pulo pinta a casa da sua cor.',
    'Pegue a caixa ! para trocar suas casas por pontos.',
    'Os outros podem repintar as suas casas.',
    'Use setas, botas e mísseis (botão A).',
    'Quem tiver mais pontos guardados em 90 s ganha.',
  ],
}, require('./sim'));
