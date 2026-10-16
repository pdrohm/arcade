// Crate Crush: arena de caixas (TNT, Nitro, frutas). O motor comum cuida de vagas, rodadas e troféu.
module.exports = require('../../shared/bash/engine')({
  id: 'cratecrush', name: 'Crate Crush', emoji: '📦', glyph: 'TNT',
  tagline: 'Pegue caixas, jogue nos outros e fuja da TNT. O último de pé vence.',
  art: 'linear-gradient(180deg,#2f8f3a 0,#4fb548 55%,#c9853f 55.5%,#a8662a 100%)',
  howTo: [
    'A pega uma caixa. A de novo joga para onde você olha.',
    'B pula. C dá um chute giratório e faz caixas deslizarem.',
    'TNT conta 3-2-1 e explode. Nitro verde explode ao toque.',
    'Caixa com ? solta frutas que devolvem vida.',
    'Quem fica de pé por último vence a rodada.',
  ],
}, require('./sim'));
