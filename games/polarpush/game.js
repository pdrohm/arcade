// Polar Push: ursos polares num bloco de gelo; empurre todo mundo na água. Regras em sim.js.
'use strict';
module.exports = require('../../shared/bash/engine')({
  id: 'polarpush', name: 'Polar Push', emoji: '🐻‍❄️', glyph: 'PP',
  tagline: 'Monte no urso polar e empurre todo mundo do gelo.',
  art: 'linear-gradient(135deg,#7dd3fc,#0369a1)',
  howTo: ['Ande com o analógico: o gelo escorrega.', 'A dá uma investida que joga o outro longe.', 'Pendurado na borda? Aperte A várias vezes.', 'O último no gelo ganha a rodada.'],
}, require('./sim'));
