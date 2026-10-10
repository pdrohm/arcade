// skate. 3 (fan game em Rust/WebGPU, não é da EA). Roda no site de outra pessoa; o arcade só abre
// pelo proxy e dá o controle ao celular. Ver shared/ext/game.js.
module.exports = require('../../shared/ext/game')({
  id: 'skate3',
  name: 'Skate 3',
  emoji: '🛹',
  tagline: 'Skate 3 no navegador. Seu celular é o controle de Xbox.',
  art: 'linear-gradient(160deg,#0b2a44 0,#1d5f8c 55%,#36b3ff 100%)',
  upstream: 'https://skate.aaddpp.lol',
  needs: 'webgpu',
  pads: 1,
  howTo: [
    'A TV precisa ser um computador com o Chrome atualizado (o jogo usa WebGPU).',
    'Na primeira vez o jogo baixa uns 330 MB. Depois fica guardado no computador.',
    'Analógico da esquerda: andar. Analógico da direita: manobras (puxe e solte).',
    'A: empurrar. Gatilhos: grabs. Start: pausa.',
    'Uma pessoa joga por vez. Para trocar, toque em 👥 no celular.',
  ],
});
